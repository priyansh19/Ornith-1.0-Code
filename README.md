# Ornith 1.0 Code

A fully local, Ornith-native coding assistant: a Next.js + Electron desktop
chat app driving the self-scaffolding **ornith:9b** model through a thin
FastAPI agent loop — native tool calls, visible thinking traces, persistent
memory, real diffs, zero cloud.

Everything in the UI is wired to real data: live SSE traces, a per-run
wall-clock timer, real Ollama model load/unload management, a real workspace
file tree. (Anything that couldn't be backed by the real backend was removed
on purpose — see `previous_plan.md` for that history.)

## Prerequisites

- **Ollama** running locally (`ollama serve`, default `:11434`) with the
  models pulled: `ollama pull ornith:9b` and `ollama pull nomic-embed-text`
  (the latter powers semantic workspace search).
- **Python 3.12+** and **Node 20+**.
- Optional: a local Langfuse at `:3000` for traces (the agent runs fine
  without it), and a `GITHUB_TOKEN` in `.env` at the repo root for the
  GitHub tools.

## Run it

**1. Backend (FastAPI agent server on :8000):**

```bash
pip install -r requirements.txt
cd server
python -m uvicorn main:app --host 0.0.0.0 --port 8000
```

**2. Desktop app:**

```bash
npm install
npm run dev:desktop   # starts Next on :3010 and opens the Electron window
```

Browser-only alternative: `npm run dev` and open `http://localhost:3010`.

## What's inside

| Path | What it is |
| --- | --- |
| `agent/p13-ornith/` | The agent: thin native-tool-call loop (`agent.py`), 26 tools + bounded `spawn_scout` delegation (`tools.py`), MCP filesystem client (`mcp_client.py`) |
| `server/main.py` | FastAPI server: `/chat-stream` (SSE), `/chat`, `/harnesses`, `/health`, `/workspace/files`, session persistence under `workspace/.sessions/` |
| `components/lmchat/` | The whole UI (sessions/folders, live step trace, Trace/Inspector/Workspace panel, Ollama model manager) |
| `electron/` | Desktop shell + native folder-picker IPC bridge |
| `workspace/` | The agent's sandbox (gitignored): files it writes, `.memory/facts.json` persistent memory |

## Why the loop is this thin

Ornith 1.0 is RL-trained with *self-scaffolding* — it plans, retries, and
re-plans internally, emits native XML tool calls, and starts every response
with a thinking block. External plan→execute→critic orchestration measurably
slowed it down 3.5× in this project's testing, so the harness does exactly
one thing per round: send history + tools, execute whatever it calls, feed
results back. Details and sources: `docs/` in the parent project and
`previous_plan.md` here.

The agent's tool surface: files (read/write/section-edit/append/delete with
real unified diffs), `run_shell` (workspace-confined, destructive commands
refused), semantic search (real embeddings), web/Wikipedia/StackOverflow/
GitHub research, persistent memory shared across sessions, and MCP
filesystem tools (multi-file reads, trees, moves) over stdio.
