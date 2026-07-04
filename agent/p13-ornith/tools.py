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
def run_shell(command: str) -> str:
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


def _record_diff(filename: str, old_content: str, new_content: str) -> None:
    if old_content == new_content:
        _LAST_DIFF["value"] = None
        return
    lines = list(difflib.unified_diff(
        old_content.splitlines(keepends=True),
        new_content.splitlines(keepends=True),
        fromfile=f"a/{filename}", tofile=f"b/{filename}",
    ))
    _LAST_DIFF["value"] = "".join(lines) or None


@tool
def edit_section(filename: str, old_text: str, new_text: str) -> str:
    """Replace one exact section of a workspace file with new text (first occurrence only). Preferred over rewriting the whole file for small changes."""
    path = os.path.join(WORKSPACE, filename)
    if not os.path.exists(path):
        return f"Error: {filename} not found."
    with open(path, encoding="utf-8") as f:
        content = f.read()
    if old_text not in content:
        return f"Error: section not found in {filename}."
    new_content = content.replace(old_text, new_text, 1)
    with open(path, "w", encoding="utf-8") as f:
        f.write(new_content)
    _record_diff(filename, content, new_content)
    return f"Section updated in {filename}"


@tool
def append_to_file(filename: str, content: str) -> str:
    """Append content to the end of an existing workspace file."""
    path = os.path.join(WORKSPACE, filename)
    if not os.path.exists(path):
        return f"Error: {filename} not found."
    with open(path, encoding="utf-8") as f:
        old = f.read()
    new_content = old + "\n" + content
    with open(path, "w", encoding="utf-8") as f:
        f.write(new_content)
    _record_diff(filename, old, new_content)
    return f"Appended to {filename}"


@tool
def delete_file(filename: str) -> str:
    """Delete ONE file from the workspace by name (never a directory)."""
    path = os.path.join(WORKSPACE, filename)
    # Confine to the workspace and refuse directories — single-file deletion
    # only; the recursive-delete incident is why nothing here touches trees.
    if not os.path.abspath(path).startswith(os.path.abspath(WORKSPACE)):
        return "Error: path escapes the workspace."
    if not os.path.exists(path):
        return f"Error: {filename} not found."
    if os.path.isdir(path):
        return f"Error: {filename} is a directory — only single files can be deleted."
    os.remove(path)
    return f"Deleted {filename}"


@tool
def browse_url(url: str) -> str:
    """Fetch a webpage and return its readable text content (3000 chars max)."""
    try:
        from bs4 import BeautifulSoup
        r = requests.get(url, timeout=10, headers={"User-Agent": "Mozilla/5.0"})
        soup = BeautifulSoup(r.text, "html.parser")
        for tag in soup(["script", "style", "nav", "footer"]):
            tag.decompose()
        return soup.get_text(separator="\n", strip=True)[:3000]
    except Exception as e:
        return f"Error: {e}"


@tool
def search_stackoverflow(query: str) -> str:
    """Search Stack Overflow and return the top 3 matching questions with links."""
    try:
        r = requests.get(
            "https://api.stackexchange.com/2.3/search/advanced",
            params={"order": "desc", "sort": "relevance", "q": query,
                    "site": "stackoverflow", "pagesize": 3},
            timeout=10,
        ).json()
        results = [f"Q: {i['title']}\n{i['link']}" for i in r.get("items", [])]
        return "\n\n".join(results) if results else "No results found."
    except Exception as e:
        return f"Error: {e}"


# ── GitHub API (token from repo-root .env, same as p4) ──
def _load_env():
    env = _Path(__file__).parent.parent.parent / ".env"
    if env.exists():
        for line in env.read_text().splitlines():
            if "=" in line and not line.startswith("#"):
                k, v = line.split("=", 1)
                os.environ.setdefault(k.strip(), v.strip())

_load_env()
GITHUB_TOKEN = os.environ.get("GITHUB_TOKEN", "")
GH_HEADERS = {"Authorization": f"Bearer {GITHUB_TOKEN}", "Accept": "application/vnd.github+json"}


@tool
def github_search_repos(query: str) -> str:
    """Search GitHub repositories and return the top 5 with URLs and descriptions."""
    try:
        r = requests.get("https://api.github.com/search/repositories",
                         params={"q": query, "per_page": 5}, headers=GH_HEADERS, timeout=10).json()
        items = r.get("items", [])
        if not items:
            return "No repositories found."
        return "\n\n".join(f"{i['full_name']}\n{i['html_url']}\n{i.get('description') or ''}" for i in items)
    except Exception as e:
        return f"Error: {e}"


@tool
def github_get_file(repo: str, path: str) -> str:
    """Read a file from any GitHub repo (repo is "owner/name", path is the file path inside it)."""
    try:
        r = requests.get(f"https://api.github.com/repos/{repo}/contents/{path}",
                         headers=GH_HEADERS, timeout=10)
        if r.status_code != 200:
            return f"Error: {r.status_code} {r.json().get('message', '')}"
        import base64
        return base64.b64decode(r.json()["content"]).decode("utf-8", errors="replace")[:5000]
    except Exception as e:
        return f"Error: {e}"


@tool
def github_list_issues(repo: str) -> str:
    """List open issues on a GitHub repo ("owner/name")."""
    try:
        r = requests.get(f"https://api.github.com/repos/{repo}/issues",
                         params={"state": "open", "per_page": 10}, headers=GH_HEADERS, timeout=10).json()
        if not isinstance(r, list) or not r:
            return "No open issues found."
        return "\n\n".join(f"#{i['number']} {i['title']}\n{i['html_url']}" for i in r if "pull_request" not in i)
    except Exception as e:
        return f"Error: {e}"


@tool
def github_create_issue(repo: str, title: str, body: str = "") -> str:
    """Create a new issue on a GitHub repo ("owner/name")."""
    try:
        r = requests.post(f"https://api.github.com/repos/{repo}/issues",
                          json={"title": title, "body": body}, headers=GH_HEADERS, timeout=10)
        if r.status_code != 201:
            return f"Error: {r.status_code} {r.json().get('message', '')}"
        data = r.json()
        return f"Created issue #{data['number']}: {data['html_url']}"
    except Exception as e:
        return f"Error: {e}"


@tool
def github_search_code(query: str) -> str:
    """Search code across all of GitHub and return the top 5 file matches."""
    try:
        r = requests.get("https://api.github.com/search/code",
                         params={"q": query, "per_page": 5}, headers=GH_HEADERS, timeout=10).json()
        items = r.get("items", [])
        if not items:
            return "No code results found."
        return "\n\n".join(f"{i['repository']['full_name']}: {i['path']}\n{i['html_url']}" for i in items)
    except Exception as e:
        return f"Error: {e}"


# ── MCP filesystem server (Model Context Protocol over stdio, same server
#    p4 used) — capabilities beyond the plain file tools: multi-file reads,
#    recursive trees, name-pattern search, metadata, move/rename. ──
from mcp_client import call_mcp_tool_sync


@tool
def mcp_read_multiple_files(paths: list[str]) -> str:
    """Read several workspace files in one call via the MCP filesystem server (paths relative to the workspace)."""
    try:
        abs_paths = [os.path.join(WORKSPACE, p) for p in paths]
        return call_mcp_tool_sync("filesystem", "read_multiple_files", {"paths": abs_paths})[:6000]
    except Exception as e:
        return f"MCP error: {e}"


@tool
def mcp_directory_tree(path: str = ".") -> str:
    """Recursive JSON tree of a workspace directory via the MCP filesystem server (not just one level)."""
    try:
        return call_mcp_tool_sync("filesystem", "directory_tree", {"path": os.path.join(WORKSPACE, path)})[:6000]
    except Exception as e:
        return f"MCP error: {e}"


@tool
def mcp_search_files(pattern: str, path: str = ".") -> str:
    """Find workspace files by name pattern under a directory via the MCP filesystem server."""
    try:
        return call_mcp_tool_sync("filesystem", "search_files",
                                  {"path": os.path.join(WORKSPACE, path), "pattern": pattern})[:6000]
    except Exception as e:
        return f"MCP error: {e}"


@tool
def mcp_get_file_info(path: str) -> str:
    """Size, created/modified time and permissions of a workspace file via the MCP filesystem server."""
    try:
        return call_mcp_tool_sync("filesystem", "get_file_info", {"path": os.path.join(WORKSPACE, path)})
    except Exception as e:
        return f"MCP error: {e}"


@tool
def mcp_move_file(source: str, destination: str) -> str:
    """Rename or move a workspace file via the MCP filesystem server (both paths relative to the workspace)."""
    try:
        return call_mcp_tool_sync("filesystem", "move_file",
                                  {"source": os.path.join(WORKSPACE, source),
                                   "destination": os.path.join(WORKSPACE, destination)})
    except Exception as e:
        return f"MCP error: {e}"


# The full combined toolset for the main executor — everything every earlier
# harness had, now as natively-typed tool signatures for ornith's native tool
# calling. `spawn_scout` (recursive bounded delegation) is added dynamically
# in agent.py since it needs a reference to run_agent itself.
LC_TOOLS = [
    # workspace + files
    search_workspace, read_file, write_file, edit_section, append_to_file,
    delete_file, list_files, run_shell,
    # research
    web_search, wikipedia, browse_url, search_stackoverflow,
    # memory
    remember, recall, list_memories, forget,
    # GitHub
    github_search_repos, github_get_file, github_list_issues,
    github_create_issue, github_search_code,
    # MCP filesystem
    mcp_read_multiple_files, mcp_directory_tree, mcp_search_files,
    mcp_get_file_info, mcp_move_file,
]
