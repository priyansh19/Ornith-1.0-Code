# previous_plan.md — How this UI got here

> Distilled record of the design decisions, features, bugs, and pivots that
> produced this app, written at the moment it was split out of the
> `Mach-2-Agent-Harness` monorepo (2026-07-04). The backend it talks to
> (FastAPI `:8000` + Ollama `:11434`) still lives in that repo.

## What this app is

A local-first, Ornith-native coding assistant desktop app: Next.js UI wrapped
in Electron, talking to a FastAPI agent backend over SSE and to Ollama
directly for model lifecycle management. Everything renders real data — a
recurring theme below is the deliberate removal of every fabricated number,
fake seed, and mock path the UI ever had.

## Evolution timeline

1. **Phase 1-3 (monorepo era):** ornith:9b ReAct agent + Langfuse tracing on
   the backend; the UI was a basic Vite React chat (chat panel + inspector +
   SSE streaming). That basic UI is what the monorepo got back when this app
   moved out.
2. **LMChat rebuild:** the Vite app was replaced with this Next.js/Electron
   app ("LMChat") with a full design system (`components/ds`), sessions +
   folders in a left nav, a right "Run details" panel, command palette,
   global search, settings/models/help modals.
3. **Multi-harness era:** the backend grew 11 isolated harness modules
   (ReAct base, orchestrator, research+critic, agent-to-agent, memory,
   LangGraph, plan-execute, supervisor, RAG, structured output, then "Apex"
   combining all of them). The UI had a harness registry, per-session
   harness selector, a Graph tab visualizing each harness's agent topology,
   and a Critiques tab for critic-loop harnesses.
4. **Ornith-native pivot (final):** Ornith 1.0's documentation revealed the
   model is RL-trained with *self-scaffolding* — it builds its own plans,
   retries, and re-planning, emits native tool calls and `<think>` blocks.
   External plan→execute→critic orchestration and JSON-ReAct prompts were
   fighting the model's training (measured: the thin native loop was 3.5×
   faster than the best orchestrated harness on an identical task, 98.8s vs
   343.5s). The backend gained `p13-ornith` (thin native loop, 26 tools +
   spawn_scout, `num_ctx=32768`, format-slip guard); the UI was rebuilt to
   have **no harness concept at all** — plain chat, `harness: "ornith"`
   hardcoded in `liveBackend.ts` as an invisible backend-contract detail.
5. **Split:** this repo, with per-path git history preserved via
   `git filter-repo`.

## Final feature list

**Chat & sessions**
- Sessions + folders (create/rename/move/pin/delete), sidebar search.
- Start screen: pick a working folder (real native picker in Electron via
  IPC bridge; File System Access API fallback in browsers — browsers only
  expose the folder *name*, not a path, by design).
- Live SSE chat: `thought` / `tool_result` / `span` / `error` / `done`
  events streamed into the conversation as it runs.
- Step trace bullets: collapsible "Thought for Ns" rows with REAL per-round
  durations; **consecutive thoughts consolidate into one bullet whose
  duration is the true sum** (no stacked near-identical rows).
- Tool rows show real unified diffs (DiffView) for file-writing tools;
  destructive/git tools get badges.
- Run summary prints total wall-clock: "Done in 5m 32s" / "Failed after X".
- Approval cards (UI complete; backend pause-for-approval not wired yet).
- @-mentions of workspace files, file attachments, permission tier select.
- Desktop notifications when a turn finishes while the window is hidden.

**Run details panel (right side)**
- Trace tab: span tree assembled live from flat parent-id-linked span events
  (`buildSpanTree`), plus a **live run timer** (ticks every second from the
  run's real start timestamp, freezes into "Completed in X").
- Inspector tab: session/model/provider/folder + honest context meter.
- Workspace tab: real nested file tree from the backend (`tree` endpoint).
- Panel widths are drag-resizable (pointer-capture handles, double-click to
  reset) and persisted; tab bar scrolls horizontally instead of clipping.

**Model management (real Ollama control, not cosmetic)**
- Models modal lists installed models with real specs (`/api/tags`) and
  resident models (`/api/ps`); "Use" actually swaps which weights are in
  memory (one-resident-at-a-time policy for GPU-less machines).
- Swap shows real observed phases ("Unloading X…" → "Loading Y…") with an
  elapsed-seconds counter and an indeterminate bar — deliberately **not** a
  fake percentage (Ollama exposes no load progress for local models).
- Bounded polling between unload and load (Ollama's async teardown races the
  next load and can wedge a model in "Stopping…" — confirmed on hardware);
  2-minute hard timeout so a stuck swap surfaces an error instead of
  hanging; per-model keep-alive override in Settings; 6h auto-recycle.

**Persistence & resilience**
- Everything (sessions, folders, widths, model, provider, density) persists
  to localStorage under `mach2:lmchat:v1`: debounced writes + a
  `pagehide`/`visibilitychange` flush so the last action before closing
  isn't lost; sessions persisted mid-run are sanitized back to idle on load.
- Backend session ids are rehydrated so reloading doesn't orphan the
  backend's conversational context.
- Frontend inactivity timeout (11 min) deliberately sits ABOVE the backend's
  per-round Ollama timeout (600s) — the earlier 5-min value falsely failed
  runs that were still legitimately thinking on CPU.

## Hard-won lessons (bugs that shaped the design)

- **No invented data, ever.** Fake seed conversations, fabricated progress
  percentages, mock harness graphs, scripted critiques — each was removed
  after it misled someone. If a number can't be measured, show elapsed time
  or nothing.
- **SSR hydration:** `isElectron()` called during render returns false on
  the server and true in the Electron client — a guaranteed hydration
  mismatch that can silently kill event handlers. Use the `useIsElectron()`
  hook (false on first client render, flips after mount).
- **Folder locks were deleted on purpose:** the acquire/take-over lock flow
  solved a multi-user contention problem a single-user app doesn't have; a
  hidden auto-scope (pick folder → tools scoped) replaced it.
- **Model-format integrity on long runs:** raw `<channel|>` markers or
  narrated "Action: …" text in chat means the model's tool-call format
  collapsed — root cause was Ollama's small default context window silently
  truncating the prompt front. Fixed backend-side (`num_ctx=32768` + a
  format-slip guard that nudges instead of accepting narration as an
  answer).
- **Windows dev honesty:** uvicorn `--reload` can leave an orphaned worker
  serving stale code; the Electron/Next dev pair runs via
  `scripts/dev-desktop.mjs` (default port 3010; 3000 is usually taken).

## Known gaps at split time

- Approval gating: UI ready, backend never pauses for confirmation.
- The picked working folder is not actually threaded into the backend's
  tool workspace (backend tools operate on the monorepo's `workspace/`).
- Pulling new models from the Ollama registry isn't wired (use
  `ollama pull` in a terminal).
- The e2e specs under `e2e/` and `e2e-live/` largely predate the
  harness-free rebuild and drive UI that no longer exists — stale, kept for
  reference.

## Backend contract (unchanged by the split)

- `POST /chat-stream` `{message, session_id, harness: "ornith", model}` →
  SSE `data:` lines of `thought` / `tool_result` (optional `diff`) / `span`
  (flat, parent-id-linked) / `error` / `done {answer, session_id}`.
- `GET /health`, `GET /harnesses`, `GET /workspace-files` (flat + tree).
- Ollama direct: `/api/tags`, `/api/ps`, `/api/generate` (keep_alive
  lifecycle control), `/api/embeddings` (used server-side for RAG).
