import sys
import importlib
from pathlib import Path

AGENT_ROOT = Path(__file__).parent.parent / "agent"

def _load_harness(dir_name: str):
    """Import a harness directory's agent.py as an isolated module.

    Every harness dir defines files literally named agent.py/tools.py/
    mcp_client.py, so importing two of them via a shared sys.path would have
    the second harness's `import tools` silently resolve to the first
    harness's already-cached `tools` module. Popping the bare names from
    sys.modules before each import (and putting only this harness's dir at
    the front of sys.path for the duration of the import) forces a clean,
    isolated re-import every time, so `agent.py`'s own `from tools import
    TOOLS` / `from mcp_client import ...` resolve to ITS sibling files.
    """
    base = str(AGENT_ROOT / dir_name)
    for bare in ("tools", "mcp_client", "agent"):
        sys.modules.pop(bare, None)
    sys.path.insert(0, base)
    try:
        mod = importlib.import_module("agent")
        mod.WORKSPACE = sys.modules["tools"].WORKSPACE
        return mod
    finally:
        sys.path.remove(base)

# Standalone build: this repo ships ONLY the ornith-native loop (the UI has
# no harness concept). The 12 learning-phase harnesses live in the
# Mach-2-Agent-Harness repo; the registry shape is kept so the two servers
# stay drop-in compatible.
HARNESSES = {
    "ornith": _load_harness("p13-ornith"),
}
DEFAULT_HARNESS_ID = "ornith"

def get_harness(harness_id: str):
    return HARNESSES.get(harness_id, HARNESSES[DEFAULT_HARNESS_ID])

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uuid, queue, threading, json
from fastapi.responses import StreamingResponse

class ChatRequest(BaseModel):
    message: str
    session_id: str = ""
    harness: str = DEFAULT_HARNESS_ID
    # "" means "use this harness's own default" (each agent.py's own MODEL
    # constant) — previously every harness ignored this field entirely and
    # always used its hardcoded constant, so switching models in the UI had
    # no effect once you actually sent a message (confirmed: it would keep
    # reloading the hardcoded model in Ollama regardless of what was picked).
    model: str = ""

class DirectRequest(BaseModel):
    messages: list[dict]
    model: str = "ornith:9b"


app = FastAPI()
app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_methods=["*"],
        allow_headers=["*"]
    )

sessions =  {}

# Persistent, write-through session store — `sessions` above is still the
# in-memory hot copy every request reads/mutates directly, but each session
# is also mirrored to disk so a server crash, a `--reload` restart (which
# happens on every backend code change), or a manual restart doesn't wipe an
# in-progress conversation and strand "Continue" with zero memory of it.
SESSIONS_DIR = Path(__file__).parent.parent / "workspace" / ".sessions"
SESSIONS_DIR.mkdir(parents=True, exist_ok=True)

def _session_path(sid: str) -> Path:
    return SESSIONS_DIR / f"{sid}.json"

def load_session(sid: str, harness_mod) -> list[dict]:
    if sid in sessions:
        return sessions[sid]
    path = _session_path(sid)
    if path.exists():
        try:
            sessions[sid] = json.loads(path.read_text(encoding="utf-8"))
            return sessions[sid]
        except Exception:
            pass  # corrupted file on disk — fall through to a fresh session
    sessions[sid] = [{"role": "system", "content": harness_mod.SYSTEM_PROMPT}]
    return sessions[sid]

def save_session(sid: str):
    # SESSIONS_DIR.mkdir() at import time only protects a fresh process start —
    # if the directory is removed mid-run (confirmed happening: an agent's own
    # shell tool call deleted the whole workspace/ tree during a long-horizon
    # test), every subsequent save threw an uncaught FileNotFoundError, 500'd
    # /chat-stream, and killed the SSE connection with no terminal event for
    # the frontend to react to — surfacing as an inexplicable multi-minute
    # stall instead of a clear error. Recreating it here makes a save
    # resilient to that regardless of why the directory went missing.
    SESSIONS_DIR.mkdir(parents=True, exist_ok=True)
    _session_path(sid).write_text(json.dumps(sessions[sid]), encoding="utf-8")

# Directories a workspace file browser has no business descending into —
# noise at best (version control internals), enormous at worst (installed
# packages), neither is something a user is browsing their own work in.
_TREE_SKIP_DIRS = {".git", "node_modules", "__pycache__", ".sessions", ".memory"}
_TREE_MAX_DEPTH = 6

def _build_tree(path: Path, depth: int = 0) -> list[dict]:
    if depth >= _TREE_MAX_DEPTH:
        return []
    entries = []
    try:
        children = sorted(path.iterdir(), key=lambda p: (p.is_file(), p.name.lower()))
    except OSError:
        return []
    for child in children:
        if child.name in _TREE_SKIP_DIRS:
            continue
        if child.is_dir():
            entries.append({"name": child.name, "type": "dir", "children": _build_tree(child, depth + 1)})
        else:
            entries.append({"name": child.name, "type": "file"})
    return entries

@app.get("/workspace/files")
def workspace_files():
    root = Path(HARNESSES[DEFAULT_HARNESS_ID].WORKSPACE)
    # `files` (flat, top-level names) is kept for existing callers; `tree`
    # is the new nested structure a real file browser needs.
    return {
        "files": [p.name for p in root.iterdir()],
        "tree": _build_tree(root),
    }

@app.get("/harnesses")
def list_harnesses():
    return {"harnesses": list(HARNESSES.keys()), "default": DEFAULT_HARNESS_ID}

@app.get("/health")
def health():
    return {"status": "ok"}

@app.post("/chat")
def chat(req: ChatRequest):
    harness_mod = get_harness(req.harness)
    sid = req.session_id or str(uuid.uuid4())
    history = load_session(sid, harness_mod)
    history.append({"role": "user", "content": req.message})
    save_session(sid)
    answer = harness_mod.run_agent(history, model=req.model or None)
    history.append({"role": "assistant", "content": answer})
    save_session(sid)
    return {"answer": answer, "session_id": sid}

@app.post("/chat-stream")
def chat_stream(req: ChatRequest):
    harness_mod = get_harness(req.harness)
    sid = req.session_id or str(uuid.uuid4())
    history = load_session(sid, harness_mod)
    history.append({"role": "user", "content": req.message})
    save_session(sid)
    q = queue.Queue()
    def run():
        answer = harness_mod.run_agent(history, on_event=lambda e: q.put(e), model=req.model or None)
        history.append({"role": "assistant", "content": answer})
        save_session(sid)
        q.put({"type": "done", "answer": answer, "session_id": sid})
        q.put(None)

    threading.Thread(target=run, daemon=True).start()
    def stream():
        while True:
            evt = q.get()
            if evt is None:
                break
            yield f"data: {json.dumps(evt)}\n\n"

    return StreamingResponse(stream(), media_type="text/event-stream",
                             headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})

@app.post("/direct")
def direct(req: DirectRequest):
    import ollama as ollama_lib
    langfuse = HARNESSES[DEFAULT_HARNESS_ID].langfuse
    with langfuse.start_as_current_observation(
        name="ui-direct",
        input=req.messages[-1]["content"],
        metadata={"model": req.model, "mode": "direct"}
    ) as trace:
        resp = ollama_lib.chat(model=req.model, messages=req.messages)
        answer = resp["message"]["content"]
        trace.update(output=answer)
    langfuse.flush()
    return {"answer": answer}
