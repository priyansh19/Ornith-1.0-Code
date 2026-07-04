import os
import ast
import json
import time
import subprocess
import requests
from pathlib import Path as _Path
from langchain_core.tools import tool
from duckduckgo_search import DDGS
import wikipedia as wiki_lib

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


# Two distinct toolsets — the supervisor routes to whichever agent's role
# fits the current need, not just an arbitrary split of one shared list.
SHARED_TOOLS = [remember, recall, list_memories, forget]
RESEARCH_TOOLS = SHARED_TOOLS + [web_search, wikipedia, calculator]
CODE_TOOLS = SHARED_TOOLS + [read_file, write_file, list_files, shell, calculator]
