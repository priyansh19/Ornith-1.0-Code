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
  `GITHUB_TOKEN` in `backend/.env` for the GitHub tools.

## Run it

```bash
# 1. Backend (FastAPI agent server, :8000)
cd backend
pip install -r requirements.txt
python -m uvicorn server.main:app --host 0.0.0.0 --port 8000

# 2. Desktop app (Next on :3010 + Electron window), from the repo root
npm install
npm run dev:desktop
```

Browser-only alternative: `npm run dev` → http://localhost:3010.

## Layout

```
app/                 Next.js routes + global styles
components/
  ds/                design system (self-contained UI primitives)
  ornithchat/        the app: chat, live trace, inspector, model manager
electron/            desktop shell + native folder-picker IPC bridge
scripts/             dev-desktop launcher, icon generator
backend/             the Python sidecar (FastAPI + the Ornith agent)
  server/main.py     SSE / chat / workspace / health endpoints
  agent/ornith/      the thin self-scaffolding loop + 26 tools
  requirements.txt
  workspace/         the agent's sandbox (gitignored runtime data)
docs/                design notes + project history
```

The Next.js app and the Python backend are fully decoupled — the UI talks to
the backend only over HTTP (`:8000`), so each half runs, builds, and ships
independently.

## Configuration (Ornith runtime knobs)

The agent reads these from the environment; the defaults are safe on modest
hardware, and each capability is one variable away.

| Env var | Default | What it does |
| --- | --- | --- |
| `ORNITH_NUM_CTX` | `32768` | Context window. Ornith supports up to **262144**; raise it on a box with the RAM (the Inspector's context meter shows real usage so you can tell). |
| `ORNITH_TEMPERATURE` / `ORNITH_TOP_P` / `ORNITH_TOP_K` | `0.6` / `0.95` / `20` | Ornith's recommended real-use sampling recipe (left unset, Ollama would apply temp 0.8). |
| `ORNITH_NUM_PREDICT` | `-1` | Per-turn output cap (`-1` = unlimited). Set a positive value to arm a runaway-generation backstop now that there's no HTTP timeout. |
| `ORNITH_STREAM` | `1` | Token + reasoning streaming. Set `0` to fall back to a single blocking call per round. |
| `ORNITH_SEED` | *(unset)* | Fix for reproducible runs / trace replay. |
| `ORNITH_COMPACT_AT` / `ORNITH_COMPACT_KEEP` | `0.85` / `6` | Intra-run history compaction: once a round's prompt crosses this fraction of `num_ctx`, the oldest tool outputs are truncated (recent ones kept) so a long agentic run degrades gracefully instead of overflowing. |
| `LANGFUSE_PUBLIC_KEY` / `LANGFUSE_SECRET_KEY` / `LANGFUSE_HOST` | *(local-dev fallback)* | Langfuse tracing credentials. |

## UI features

**Chat**
- Live token-by-token streaming of the agent's actual work: the reply fills
  in as the model generates it, ornith's native reasoning streams into
  "Thought for Ns" bullets (with true durations), tool calls show
  inputs/results, and every file edit shows a real unified diff. Nested
  `spawn_scout` sub-agents are surfaced as indented, depth-labelled steps with
  their mission and returned report; failed tool calls are flagged.
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
  (agent → per-round LLM calls → tool executions with durations, real token
  counts, structured tool I/O — file paths, shell cmd+exit, diffs — and
  nested scout sub-trees), plus a live ticking run timer that freezes into
  "Completed in X".
- **Inspector** — session id, model, provider, working state, and a live
  **context-window meter** (real token usage from Ollama's response metadata
  vs the configured `num_ctx`, with Ornith's 262144 ceiling shown).
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

## The agent (`backend/agent/ornith` — what the UI drives)

A deliberately thin loop built for ornith's self-scaffolding training (the
model plans/retries/re-plans internally; external plan-execute-critic
orchestration measured 3.5× slower). Per round it streams one native
tool-calling generation (token + reasoning deltas), records real token usage,
and feeds results back. It drives ornith through the levers the model
actually exposes: `.stream()` (not a blocking call), the recommended sampling
recipe, an env-tunable context window, safe partial-parallel tool execution
(independent reads run concurrently; stateful file/shell tools stay serial),
and intra-run history compaction. A format-slip guard retries narrated
"actions" instead of accepting them as answers. There is no round or
per-round time cap — the loop runs until the model finishes or the user hits
Stop (arm `ORNITH_NUM_PREDICT` for a single-generation backstop).

**26 tools + `spawn_scout`:**

| Group | Tools |
| --- | --- |
| Files | `read_file`, `write_file`, `edit_section`, `append_to_file`, `delete_file` (single-file only), `list_files` — all edits emit real unified diffs |
| Terminal | `run_shell` — workspace-confined cwd, recursive-delete/destructive patterns refused |
| Search | `search_workspace` — semantic, real embeddings (nomic-embed-text) |
| Research | `web_search`, `wikipedia` (REST API), `browse_url`, `search_stackoverflow` |
| GitHub | `github_search_repos`, `github_get_file`, `github_list_issues`, `github_create_issue`, `github_search_code` |
| MCP | `mcp_read_multiple_files`, `mcp_directory_tree`, `mcp_search_files`, `mcp_get_file_info`, `mcp_move_file` — real Model Context Protocol filesystem server over stdio |
| Memory | `remember`, `recall`, `list_memories`, `forget` — persists to `backend/workspace/.memory/facts.json`, shared across sessions |
| Delegation | `spawn_scout` — bounded recursive sub-agent for self-contained sub-tasks |

## API

- `POST /chat-stream` `{message, session_id, harness, model}` → SSE:
  `token` (answer delta) / `reasoning` (think delta) / `thought` /
  `context` (`{used, max, modelMax}`) / `tool_result` (+`diff`, `isError`) /
  `span` (flat, parent-linked; carries `io`, `tokens`, `doneReason`) /
  `scout_start` / `scout_done` / `error` / `done {answer, session_id}`.
  Events carry `depth` for nested-scout attribution.
- `POST /chat` — same, non-streaming · `GET /harnesses` · `GET /health` ·
  `GET /workspace/files` · sessions persist under `backend/workspace/.sessions/`

## Known limitations (honest list)

- The UI's picked working folder is display-only — agent tools operate on
  the repo's `workspace/` sandbox regardless (top wiring gap).
- Context compaction is truncation-based, not summarization: past the
  `ORNITH_COMPACT_AT` threshold the oldest tool outputs are shortened (recent
  ones kept intact), which bounds bloat but still loses old detail on a very
  long run. Raising `ORNITH_NUM_CTX` toward 262144 is the real headroom.
- No approval gating: the agent never pauses to ask before acting
  (destructive shell patterns are refused outright instead).
- 9B on CPU ≈ tens of seconds per round; expect minutes per multi-tool
  turn. `ornith:35b` on GPU hardware changes this class entirely.
