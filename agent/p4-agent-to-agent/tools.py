import os, ast, difflib, requests, subprocess
from bs4 import BeautifulSoup
from duckduckgo_search import DDGS
import wikipedia as wiki_lib
from pathlib import Path as _Path
from mcp_client import MCP_SERVERS, list_mcp_tools, call_mcp_tool_sync, _run_async

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

WORKSPACE = os.path.join(os.path.dirname(__file__), "..", "..", "workspace")
os.makedirs(WORKSPACE, exist_ok=True)

def web_search(query: str) -> str:
    with DDGS() as ddgs:
        results = list(ddgs.text(query, max_results=10))
    if not results:
        return "No results found."
    return "\n\n".join(f"{r['title']}\n{r['href']}\n{r['body']}" for r in results)

def wikipedia(query: str) -> str:
    try:
        return wiki_lib.summary(query, sentences=10)
    except Exception as e:
        return f"Wikipedia error: {e}"

def browse_url(url: str) -> str:
    try:
        r = requests.get(url, timeout=10, headers={"User-Agent": "Mozilla/5.0"})
        soup = BeautifulSoup(r.text, "html.parser")
        for tag in soup(["script", "style", "nav", "footer"]):
            tag.decompose()
        return soup.get_text(separator="\n", strip=True)[:3000]
    except Exception as e:
        return f"Error: {e}"

def search_stackoverflow(query: str) -> str:
    url = "https://api.stackexchange.com/2.3/search/advanced"
    params = {"order": "desc", "sort": "relevance", "q": query,
              "site": "stackoverflow", "pagesize": 3}
    r = requests.get(url, params=params, timeout=10).json()
    results = [f"Q: {i['title']}\n{i['link']}" for i in r.get("items", [])]
    return "\n\n".join(results) if results else "No results found."

def calculator(expression: str) -> str:
    try:
        tree = ast.parse(expression, mode="eval")
        result = eval(compile(tree, "<string>", "eval"))
        return str(result)
    except Exception as e:
        return f"Error: {e}"

def python_repl(code: str) -> str:
    try:
        import io, contextlib
        buf = io.StringIO()
        with contextlib.redirect_stdout(buf):
            exec(code, {})
        return buf.getvalue() or "Code ran, no output."
    except Exception as e:
        return f"Error: {e}"

# Consume-once: set by create/edit/append right after they write, read (and
# cleared) by the harness loop immediately after the tool call returns, so a
# diff never leaks into an unrelated later tool_result event.
_LAST_DIFF = {"value": None}

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

def get_last_diff():
    value = _LAST_DIFF["value"]
    _LAST_DIFF["value"] = None
    return value

def create_file(args: dict) -> str:
    path = os.path.join(WORKSPACE, args["filename"])
    old = ""
    if os.path.exists(path):
        with open(path) as f:
            old = f.read()
    with open(path, "w") as f:
        f.write(args["content"])
    _record_diff(args["filename"], old, args["content"])
    return f"Created {args['filename']}"

def read_file(args: dict) -> str:
    path = os.path.join(WORKSPACE, args["filename"])
    if not os.path.exists(path):
        return f"Error: {args['filename']} not found."
    with open(path) as f:
        return f.read()

def edit_file(args: dict) -> str:
    path = os.path.join(WORKSPACE, args["filename"])
    if not os.path.exists(path):
        return f"Error: {args['filename']} not found."
    with open(path) as f:
        old = f.read()
    with open(path, "w") as f:
        f.write(args["content"])
    _record_diff(args["filename"], old, args["content"])
    return f"Updated {args['filename']}"

def edit_section(args: dict) -> str:
    path = os.path.join(WORKSPACE, args["filename"])
    if not os.path.exists(path):
        return f"Error: {args['filename']} not found."
    with open(path, "r") as f:
        content = f.read()
    if args["old_text"] not in content:
        return f"Error: section not found in {args['filename']}."
    new_content = content.replace(args["old_text"], args["new_text"], 1)
    with open(path, "w") as f:
        f.write(new_content)
    _record_diff(args["filename"], content, new_content)
    return f"Section updated in {args['filename']}"

def append_to_file(args: dict) -> str:
    path = os.path.join(WORKSPACE, args["filename"])
    if not os.path.exists(path):
        return f"Error: {args['filename']} not found."
    with open(path, "r") as f:
        old = f.read()
    new_content = old + "\n" + args["content"]
    with open(path, "w") as f:
        f.write(new_content)
    _record_diff(args["filename"], old, new_content)
    return f"Appended to {args['filename']}"

def delete_file(filename: str) -> str:
    path = os.path.join(WORKSPACE, filename)
    if not os.path.exists(path):
        return f"Error: {filename} not found."
    os.remove(path)
    return f"Deleted {filename}"

def list_files(_: str) -> str:
    files = os.listdir(WORKSPACE)
    return "\n".join(files) if files else "Workspace is empty."

_DESTRUCTIVE_PATTERNS = (
    "rm -rf", "rm -fr", "rm -r ", "rd /s", "rmdir /s", "del /s", "del /q",
    "format ", "mkfs", "diskpart", "> /dev/", "shutil.rmtree",
)

def shell(command: str) -> str:
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

def github_search_repos(query: str) -> str:
    url = "https://api.github.com/search/repositories"
    r = requests.get(url, params={"q": query, "per_page": 5}, headers=GH_HEADERS, timeout=10).json()
    items = r.get("items", [])
    if not items:
        return "No repositories found."
    return "\n\n".join(f"{i['full_name']}\n{i['html_url']}\n{i.get('description') or ''}" for i in items)

def github_get_file(args: dict) -> str:
    url = f"https://api.github.com/repos/{args['repo']}/contents/{args['path']}"
    r = requests.get(url, headers=GH_HEADERS, timeout=10)
    if r.status_code != 200:
        return f"Error: {r.status_code} {r.json().get('message', '')}"
    import base64
    data = r.json()
    return base64.b64decode(data["content"]).decode("utf-8", errors="replace")[:5000]

def github_list_issues(repo: str) -> str:
    url = f"https://api.github.com/repos/{repo}/issues"
    r = requests.get(url, params={"state": "open", "per_page": 10}, headers=GH_HEADERS, timeout=10).json()
    if not isinstance(r, list) or not r:
        return "No open issues found."
    return "\n\n".join(f"#{i['number']} {i['title']}\n{i['html_url']}" for i in r if "pull_request" not in i)

def github_create_issue(args: dict) -> str:
    url = f"https://api.github.com/repos/{args['repo']}/issues"
    r = requests.post(url, json={"title": args["title"], "body": args.get("body", "")}, headers=GH_HEADERS, timeout=10)
    if r.status_code != 201:
        return f"Error: {r.status_code} {r.json().get('message', '')}"
    data = r.json()
    return f"Created issue #{data['number']}: {data['html_url']}"

def github_search_code(query: str) -> str:
    url = "https://api.github.com/search/code"
    r = requests.get(url, params={"q": query, "per_page": 5}, headers=GH_HEADERS, timeout=10).json()
    items = r.get("items", [])
    if not items:
        return "No code results found."
    return "\n\n".join(f"{i['repository']['full_name']}: {i['path']}\n{i['html_url']}" for i in items)

TOOLS = {
    "web_search": web_search,
    "wikipedia": wikipedia,
    "browse_url": browse_url,
    "search_stackoverflow": search_stackoverflow,
    "calculator": calculator,
    "python_repl": python_repl,
    "create_file": create_file,
    "read_file": read_file,
    "edit_file": edit_file,
    "edit_section": edit_section,
    "append_to_file": append_to_file,
    "delete_file": delete_file,
    "list_files": list_files,
    "shell": shell,
    "github_search_repos": github_search_repos,
    "github_get_file": github_get_file,
    "github_list_issues": github_list_issues,
    "github_create_issue": github_create_issue,
    "github_search_code": github_search_code,
}

def _make_mcp_wrapper(server_name, tool_name):
    def wrapper(arguments):
        return call_mcp_tool_sync(server_name, tool_name, arguments)
    return wrapper

def _register_mcp_tools():
    for server_name, server_params in MCP_SERVERS.items():
        try:
            discovered = _run_async(list_mcp_tools(server_params))
        except Exception as e:
            print(f"[mcp] could not connect to '{server_name}': {e}")
            continue
        for t in discovered:
            TOOLS[f"mcp_{t['name']}"] = _make_mcp_wrapper(server_name, t["name"])

_register_mcp_tools()
