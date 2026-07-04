import os
import ast
import json
import time
import math
import subprocess
import requests
from pathlib import Path as _Path
from langchain_core.tools import tool

EMBED_MODEL = "nomic-embed-text"
EMBED_URL = "http://localhost:11434/api/embeddings"
# Real text files only — binary/lockfile/noise extensions would just waste
# embedding calls on content that's never useful to retrieve as "context".
_INDEXABLE_EXT = {".py", ".ts", ".tsx", ".js", ".jsx", ".md", ".txt", ".json", ".css", ".html"}
_SKIP_DIRS = {".git", "node_modules", "__pycache__", ".sessions", ".memory"}
_CHUNK_CHARS = 800

WORKSPACE = os.path.join(os.path.dirname(__file__), "..", "..", "workspace")
os.makedirs(WORKSPACE, exist_ok=True)

# Shared with agent/p5-memory — memories written by either harness are
# visible to the other. This is the "persistent memory store ... for
# everything" the app-wide goal calls for, not a per-harness silo.
MEMORY_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "workspace", ".memory")
os.makedirs(MEMORY_DIR, exist_ok=True)
MEMORY_FILE = os.path.join(MEMORY_DIR, "facts.json")


def _load_memory() -> list:
    if not os.path.exists(MEMORY_FILE):
        return []
    try:
        with open(MEMORY_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return []


def _save_memory(facts: list) -> None:
    with open(MEMORY_FILE, "w", encoding="utf-8") as f:
        json.dump(facts, f, indent=2)


def _embed(text: str) -> list:
    r = requests.post(EMBED_URL, json={"model": EMBED_MODEL, "prompt": text}, timeout=60)
    data = r.json()
    if "error" in data:
        raise RuntimeError(f"Embedding error: {data['error']}")
    return data["embedding"]


def _cosine(a: list, b: list) -> float:
    dot = sum(x * y for x, y in zip(a, b))
    na = math.sqrt(sum(x * x for x in a))
    nb = math.sqrt(sum(y * y for y in b))
    return dot / (na * nb) if na and nb else 0.0


def _chunk_text(text: str, size: int = _CHUNK_CHARS) -> list:
    return [text[i:i + size] for i in range(0, len(text), size) if text[i:i + size].strip()]


# Built lazily on first search, once per process — rebuilding on every call
# would re-embed the whole workspace every time, which is real (if fast)
# Ollama work, not free. A stale index just means new files show up after
# the next harness restart, an acceptable tradeoff for a local single-user tool.
_INDEX = None

def _build_index() -> list:
    chunks = []
    for root, dirs, files in os.walk(WORKSPACE):
        dirs[:] = [d for d in dirs if d not in _SKIP_DIRS]
        for name in files:
            if os.path.splitext(name)[1].lower() not in _INDEXABLE_EXT:
                continue
            path = os.path.join(root, name)
            rel = os.path.relpath(path, WORKSPACE)
            try:
                with open(path, encoding="utf-8", errors="ignore") as f:
                    text = f.read()
            except OSError:
                continue
            for chunk in _chunk_text(text):
                try:
                    vec = _embed(chunk)
                except Exception:
                    continue
                chunks.append({"path": rel, "text": chunk, "vec": vec})
    return chunks


@tool
def search_workspace(query: str) -> str:
    """Semantic search over workspace files (real embeddings via nomic-embed-text, not keyword match). Returns the most relevant chunks with their source file."""
    global _INDEX
    if _INDEX is None:
        _INDEX = _build_index()
    if not _INDEX:
        return "Workspace has no indexable text files yet."
    try:
        qvec = _embed(query)
    except Exception as e:
        return f"Error embedding query: {e}"
    ranked = sorted(_INDEX, key=lambda c: _cosine(qvec, c["vec"]), reverse=True)[:3]
    return "\n\n".join(f"[{c['path']}]\n{c['text'][:400]}" for c in ranked)


@tool
def calculator(expression: str) -> str:
    """Evaluate a Python arithmetic expression and return the result."""
    try:
        tree = ast.parse(expression, mode="eval")
        return str(eval(compile(tree, "<string>", "eval")))
    except Exception as e:
        return f"Error: {e}"


@tool
def read_file(filename: str) -> str:
    """Read a file from the shared workspace directory by name."""
    path = os.path.join(WORKSPACE, filename)
    if not os.path.exists(path):
        return f"Error: {filename} not found."
    with open(path, encoding="utf-8") as f:
        return f.read()


@tool
def write_file(filename: str, content: str) -> str:
    """Create or overwrite a file in the shared workspace directory."""
    path = os.path.join(WORKSPACE, filename)
    with open(path, "w", encoding="utf-8") as f:
        f.write(content)
    return f"Wrote {filename}"


@tool
def list_files() -> str:
    """List every file currently in the shared workspace directory."""
    files = os.listdir(WORKSPACE)
    return "\n".join(files) if files else "Workspace is empty."


_DESTRUCTIVE_PATTERNS = (
    "rm -rf", "rm -fr", "rm -r ", "rd /s", "rmdir /s", "del /s", "del /q",
    "format ", "mkfs", "diskpart", "> /dev/", "shutil.rmtree",
)
@tool
def shell(command: str) -> str:
    """Run a shell command and return its stdout/stderr (15s timeout)."""
    lowered = command.lower()
    if any(p in lowered for p in _DESTRUCTIVE_PATTERNS):
        return (
            "Refused: this command matches a recursive-delete/destructive pattern "
            "that isn't permitted (this tool has no confirmation step, and a prior "
            "run used exactly this kind of command to wipe an entire workspace). "
            "Delete individual files by overwriting them via write_file instead."
        )
    try:
        result = subprocess.run(
            command, shell=True, capture_output=True, text=True, timeout=15, cwd=WORKSPACE,
        )
        return result.stdout or result.stderr or "No output."
    except Exception as e:
        return f"Error: {e}"


@tool
def remember(fact: str) -> str:
    """Store a fact in persistent long-term memory, shared across harnesses and sessions."""
    if not fact:
        return "Error: no fact provided."
    facts = _load_memory()
    facts.append({"fact": fact, "ts": time.time()})
    _save_memory(facts)
    return f"Remembered: {fact}"


@tool
def recall(query: str = "") -> str:
    """Search persistent memory for facts matching a keyword query."""
    facts = _load_memory()
    if not facts:
        return "No memories stored yet."
    matches = facts if not query else [f for f in facts if query.lower() in f["fact"].lower()]
    if not matches:
        return f"No memories matching '{query}'."
    return "\n".join(f"- {m['fact']}" for m in matches[-20:])


@tool
def list_memories() -> str:
    """List every fact currently stored in persistent memory."""
    facts = _load_memory()
    return "\n".join(f"- {f['fact']}" for f in facts) if facts else "No memories stored yet."


@tool
def forget(fact: str) -> str:
    """Remove a fact from persistent memory by its exact text."""
    facts = _load_memory()
    remaining = [f for f in facts if f["fact"] != fact]
    if len(remaining) == len(facts):
        return f"No exact match found for '{fact}'."
    _save_memory(remaining)
    return f"Forgot: {fact}"


LC_TOOLS = [search_workspace, calculator, read_file, write_file, list_files, shell, remember, recall, list_memories, forget]
