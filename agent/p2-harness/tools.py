import os
import ast
import subprocess

WORKSPACE = os.path.join(os.path.dirname(__file__), "..", "..", "workspace")
os.makedirs(WORKSPACE, exist_ok=True)


def calculator(expression: str) -> str:
    try:
        tree = ast.parse(expression, mode="eval")
        return str(eval(compile(tree, "<string>", "eval")))
    except Exception as e:
        return f"Error: {e}"


def read_file(args: dict) -> str:
    path = os.path.join(WORKSPACE, args["filename"])
    if not os.path.exists(path):
        return f"Error: {args['filename']} not found."
    with open(path, encoding="utf-8") as f:
        return f.read()


def create_file(args: dict) -> str:
    path = os.path.join(WORKSPACE, args["filename"])
    with open(path, "w", encoding="utf-8") as f:
        f.write(args["content"])
    return f"Created {args['filename']}"


def edit_file(args: dict) -> str:
    path = os.path.join(WORKSPACE, args["filename"])
    if not os.path.exists(path):
        return f"Error: {args['filename']} not found."
    with open(path, "w", encoding="utf-8") as f:
        f.write(args["content"])
    return f"Updated {args['filename']}"


def list_files(_) -> str:
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


TOOLS = {
    "calculator": calculator,
    "read_file": read_file,
    "create_file": create_file,
    "edit_file": edit_file,
    "list_files": list_files,
    "shell": shell,
}
