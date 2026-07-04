import os
import ast
import json
import math
import time
import difflib
import subprocess
import requests
from pathlib import Path as _Path
from langchain_core.tools import tool
from duckduckgo_search import DDGS
import wikipedia as wiki_lib

WORKSPACE = os.path.join(os.path.dirname(__file__), "..", "..", "workspace")
os.makedirs(WORKSPACE, exist_ok=True)

# Shared with every other memory-capable harness (p5/p7/p8/p9/p10/p11) —
# facts written by any of them are visible to all of them.
MEMORY_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "workspace", ".memory")
os.makedirs(MEMORY_DIR, exist_ok=True)
MEMORY_FILE = os.path.join(MEMORY_DIR, "facts.json")

EMBED_MODEL = "nomic-embed-text"
EMBED_URL = "http://localhost:11434/api/embeddings"
_INDEXABLE_EXT = {".py", ".ts", ".tsx", ".js", ".jsx", ".md", ".txt", ".json", ".css", ".html"}
_SKIP_DIRS = {".git", "node_modules", "__pycache__", ".sessions", ".memory"}
_CHUNK_CHARS = 800

# Consume-once diff slot — same pattern as p4/p7 (see agent/HARNESS_CHECKLIST.md).
_LAST_DIFF = {"value": None}


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


def recall_sync(query: str = "") -> str:
    """Plain-function version (no @tool wrapper) so the harness graph can
    call it directly for automatic context-priming before planning, not just
    when the model decides to call it as a tool."""
    facts = _load_memory()
    if not facts:
        return "No memories stored yet."
    matches = facts if not query else [f for f in facts if query.lower() in f["fact"].lower()]
    if not matches:
        return f"No memories matching '{query}'."
    return "\n".join(f"- {m['fact']}" for m in matches[-20:])


@tool
def remember(fact: str) -> str:
    """Store a fact in persistent long-term memory, shared across every harness and session."""
    if not fact:
        return "Error: no fact provided."
    facts = _load_memory()
    facts.append({"fact": fact, "ts": time.time()})
    _save_memory(facts)
    return f"Remembered: {fact}"


@tool
def recall(query: str = "") -> str:
    """Search persistent memory for facts matching a keyword query."""
    return recall_sync(query)


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
    """Semantic search over workspace files (real embeddings via nomic-embed-text). Returns the most relevant chunks with their source file."""
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
def web_search(query: str) -> str:
    """Search the web and return the top results (title, url, snippet)."""
    try:
        with DDGS() as ddgs:
            results = list(ddgs.text(query, max_results=5))
        if not results:
            return "No results found."
        return "\n\n".join(f"{r['title']}\n{r['href']}\n{r['body']}" for r in results)
    except Exception as e:
        return f"Error: {e}"


@tool
def wikipedia(query: str) -> str:
    """Look up a topic on Wikipedia and return a short summary."""
    try:
        return wiki_lib.summary(query, sentences=6)
    except Exception as e:
        return f"Wikipedia error: {e}"


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


def get_last_diff():
    value = _LAST_DIFF["value"]
    _LAST_DIFF["value"] = None
    return value


@tool
def write_file(filename: str, content: str) -> str:
    """Create or overwrite a file in the shared workspace directory."""
    path = os.path.join(WORKSPACE, filename)
    old = ""
    if os.path.exists(path):
        with open(path, encoding="utf-8") as f:
            old = f.read()
    with open(path, "w", encoding="utf-8") as f:
        f.write(content)
    if old != content:
        lines = list(difflib.unified_diff(
            old.splitlines(keepends=True), content.splitlines(keepends=True),
            fromfile=f"a/{filename}", tofile=f"b/{filename}",
        ))
        _LAST_DIFF["value"] = "".join(lines) or None
    return f"Wrote {filename}"


@tool
def list_files() -> str:
    """List every file currently in the shared workspace directory."""
    files = os.listdir(WORKSPACE)
    return "\n".join(files) if files else "Workspace is empty."


# Confirmed incident: during an unsupervised long-horizon task (build an app
# + its own test suite with "reset state between test runs" logic), the model
# ran a recursive-delete shell command that wiped the ENTIRE workspace/ tree
# (including .memory/ and .sessions/ — not just its own test fixtures),
# because this tool had no cwd confinement (it ran wherever the server
# process happened to be) and no guard against destructive commands at all.
# Two independent mitigations, neither a full sandbox but both closing this
# specific hole: (1) always run inside WORKSPACE so relative paths can't
# reach outside it, (2) refuse recognizably destructive patterns outright —
# a coding-agent test loop essentially never legitimately needs to
# recursively delete a directory tree; deleting individual files via
# write_file's own overwrite path covers real cases.
_DESTRUCTIVE_PATTERNS = (
    "rm -rf", "rm -fr", "rm -r ", "rd /s", "rmdir /s", "del /s", "del /q",
    "format ", "mkfs", "diskpart", "> /dev/", "shutil.rmtree",
)

@tool
def shell(command: str) -> str:
    """Run a shell command inside the workspace directory and return its stdout/stderr (15s timeout)."""
    lowered = command.lower()
    if any(p in lowered for p in _DESTRUCTIVE_PATTERNS):
        return (
            "Refused: this command matches a recursive-delete/destructive pattern "
            "that isn't permitted (this tool has no confirmation step, and a prior "
            "run used exactly this kind of command to wipe the whole workspace). "
            "Delete individual files by overwriting them via write_file instead."
        )
    try:
        result = subprocess.run(
            command, shell=True, capture_output=True, text=True, timeout=15, cwd=WORKSPACE,
        )
        return result.stdout or result.stderr or "No output."
    except Exception as e:
        return f"Error: {e}"


# The full combined toolset for the main executor. `spawn_scout` (recursive
# bounded delegation, a2a-style) is added dynamically in agent.py since it
# needs a reference to run_agent itself.
LC_TOOLS = [
    search_workspace, web_search, wikipedia, calculator,
    read_file, write_file, list_files, shell,
    remember, recall, list_memories, forget,
]
