# Ornith 1.0 Code

A fully local, Ornith-native coding assistant: a Next.js + Electron desktop
chat app driving the self-scaffolding **ornith:9b** model through a thin
FastAPI agent loop — native tool calls, visible thinking traces, persistent
memory, real diffs, zero cloud.

Everything in the UI is wired to real data; anything that couldn't be backed
by the real backend was deliberately removed (`previous_plan.md` records that
history and the lessons behind it).

## Prerequisites

- **Ollama** running locally (`:11434`) with `ollama pull ornith:9b` and
  `ollama pull nomic-embed-text` (powers semantic workspace search).
- **Python 3.12+**, **Node 20+**.
- Optional: local Langfuse at `:3000` for traces (agent runs fine without),
  `GITHUB_TOKEN` in a root `.env` for the GitHub tools.

## Run it

```bash
# 1. Backend (FastAPI agent server, :8000)
pip install -r requirements.txt
cd server && python -m uvicorn main:app --host 0.0.0.0 --port 8000

# 2. Desktop app (Next on :3010 + Electron window)
npm install
npm run dev:desktop
```

Browser-only alternative: `npm run dev` → http://localhost:3010.

## UI features

**Chat**
- Live SSE streaming of the agent's actual work: thinking blocks (ornith's
  native reasoning, consolidated into single "Thought for Ns" bullets with
  true summed durations), tool calls with inputs/results, and real unified
  diffs for every file edit.
- Run summary with real wall-clock ("Done in 5m 32s" / "Failed after X").
- Markdown rendering, file attachments (content genuinely inlined into the
  prompt), suggestion chips, desktop notifications when a turn finishes
  while the window is hidden.

**Sessions & persistence**
- Sessions organized into folders: create/rename/move/pin/delete + search.
- Everything persists across restarts (localStorage, debounced writes with a
  close-time flush); backend conversation context is rehydrated too, so a
  restart never orphans a session's memory of the chat.
- Multi-session: separate conversations run against separate backend
  sessions; per-session runs can be stopped independently.

**Run details panel** (resizable, drag the edge; double-click resets)
- **Trace** — live span tree built from the backend's real span events
  (agent → per-round LLM calls → tool executions with durations), plus a
  live ticking run timer that freezes into "Completed in X".
- **Inspector** — session id, model, provider, working state.
- **Workspace** — real file tree of the agent's sandbox, refreshed on
  demand.

**Model management** (real Ollama lifecycle control, not a label)
- Installed-model library with true specs from Ollama (params/quant/size);
  resident-model tray with keep-alive expiry.
- "Use" genuinely swaps weights in memory (one resident model at a time),
  showing the real observed phases — "Unloading X…" → "Loading Y…" — with
  elapsed time (deliberately no fake progress %: Ollama reports none).
  Bounded unload-polling avoids Ollama's swap-race wedge; 2-min hard
  timeout surfaces a stuck swap instead of hanging.
- Per-model keep-alive override; 6h auto-recycle of long-resident models.

**Desktop shell**
- Native OS folder picker via a context-isolated IPC bridge; packaged mode
  serves the static export from an in-process HTTP server.

## The agent (`agent/p13-ornith` — what the UI drives)

A deliberately thin loop built for ornith's self-scaffolding training (the
model plans/retries/re-plans internally; external plan-execute-critic
orchestration measured 3.5× slower). One LLM call per action, native tool
calling, `num_ctx=32768`, a format-slip guard that retries narrated
"actions" instead of accepting them as answers, and 10-min per-round
timeouts for CPU-only hardware.

**26 tools + `spawn_scout`:**

| Group | Tools |
| --- | --- |
| Files | `read_file`, `write_file`, `edit_section`, `append_to_file`, `delete_file` (single-file only), `list_files` — all edits emit real unified diffs |
| Terminal | `run_shell` — workspace-confined cwd, recursive-delete/destructive patterns refused |
| Search | `search_workspace` — semantic, real embeddings (nomic-embed-text) |
| Research | `web_search`, `wikipedia` (REST API), `browse_url`, `search_stackoverflow` |
| GitHub | `github_search_repos`, `github_get_file`, `github_list_issues`, `github_create_issue`, `github_search_code` |
| MCP | `mcp_read_multiple_files`, `mcp_directory_tree`, `mcp_search_files`, `mcp_get_file_info`, `mcp_move_file` — real Model Context Protocol filesystem server over stdio |
| Memory | `remember`, `recall`, `list_memories`, `forget` — persists to `workspace/.memory/facts.json`, shared across sessions and harnesses |
| Delegation | `spawn_scout` — bounded recursive sub-agent for self-contained sub-tasks |

## Registered harnesses (all reachable via the API)

The server registers every harness built across the project. The desktop UI
always drives `ornith` (the default); the rest are available to any API
client via the `harness` field on `/chat` and `/chat-stream`, e.g. for
benchmarking orchestration styles against the same model and tools:

| id | Module | Architecture |
| --- | --- | --- |
| `ornith` | p13 | **Default.** Thin self-scaffolding-native loop (above) |
| `apex` | p12 | LangGraph plan → execute → critic → replan + scout delegation + structured output |
| `structured` | p11 | ReAct + Pydantic-validated structured final answer |
| `rag` | p10 | Embedding RAG over workspace files |
| `supervisor` | p9 | Supervisor routing between researcher/coder sub-agents |
| `plan-execute` | p8 | LangGraph plan → execute → replan |
| `langgraph` | p7 | LangGraph ReAct with native tool-calling |
| `research` | p6 | Draft → critic → revise loop |
| `memory` | p5 | ReAct + persistent memory store |
| `a2a` | p4 | Agents calling agents as tools (scout dispatch) |
| `harness` | p2 | Orchestrator with bounded `delegate` |
| `agent-base` | p1 | Single hand-rolled ReAct loop |

(p3 is a tools library, not a runnable harness.)

## API

- `POST /chat-stream` `{message, session_id, harness, model}` → SSE:
  `thought` / `tool_result` (+`diff`) / `span` (flat, parent-linked) /
  `error` / `done {answer, session_id}`
- `POST /chat` — same, non-streaming · `GET /harnesses` · `GET /health` ·
  `GET /workspace/files` · sessions persist under `workspace/.sessions/`

## Known limitations (honest list)

- The UI's picked working folder is display-only — agent tools operate on
  the repo's `workspace/` sandbox regardless (top wiring gap).
- No context compaction: past ~32K tokens of conversation the window
  truncates rather than summarizes — long-horizon endurance is bounded.
- No approval gating: the agent never pauses to ask before acting
  (destructive shell patterns are refused outright instead).
- 9B on CPU ≈ tens of seconds per round; expect minutes per multi-tool
  turn. `ornith:35b` on GPU hardware changes this class entirely.
