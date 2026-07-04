# LIVE_TEST_RUNBOOK.md — run LMChat against the real Ornith model

This is the step-by-step for driving the **whole stack end-to-end on your own
machine** against the real `ornith:9b` model — the thing that can't be run in a
cloud container (no GPU/Ollama, no model weights, no backend). Follow it top to
bottom the first time; after that, `npm run preflight` + `npm run smoke:live`
is your 30-second "is it alive?" check.

> Scope note: this repo is the **frontend** (LMChat). The agent backend
> (`server/main.py` + `agent/p13-ornith`) lives in the separate
> **`Mach-2-Agent-Harness`** repo. This runbook tells you how to stand all
> three processes up together and confirm they talk.

---

## The three processes

```
┌─────────────────────┐   HTTP :11434    ┌──────────────────────────┐
│  Ollama             │◄─────────────────│  Mach-2 backend (FastAPI)│
│  serves ornith:9b   │  /api/generate   │  agent/p13-ornith loop   │
│  :11434             │  /api/tags /ps   │  :8000  /chat-stream     │
└─────────▲───────────┘                  └───────────▲──────────────┘
          │ /api/tags /ps /generate                  │ SSE: thought /
          │ (model lifecycle, direct)                │ tool_result / span /
          │                                          │ error / done
┌─────────┴──────────────────────────────────────────┴──────────────┐
│  LMChat frontend (Next.js / Electron)  :3000 (web) or :3010 (desktop)│
│  components/lmchat/liveBackend.ts  → :8000                            │
│  components/lmchat/ollama.ts       → :11434                           │
└──────────────────────────────────────────────────────────────────────┘
```

The frontend talks to **two** backends: the agent loop on `:8000` for chat, and
Ollama on `:11434` **directly** for model load/unload/swap (the Models modal).

---

## Prerequisites

- **Node ≥ 20** (Next 16 requires it) — `node -v`
- **Ollama** installed and runnable — https://ollama.com — `ollama -v`
- **Python + the `Mach-2-Agent-Harness` repo** cloned (for the `:8000` backend)
- **~8 GB free RAM** for the Q4_K_M 9B at `num_ctx=32768`; a GPU is optional but
  turns are **much** slower without one (see timing below)

---

## Timing expectations (read this before you think it's hung)

On **CPU-only** hardware this is measured, not hypothetical:

| Phase | Typical |
| --- | --- |
| Cold model load (first turn) | 25–40 s |
| One agent round (think + tool) | 170–345 s |
| A simple end-to-end turn | ~1–6 min |

The frontend's silent-stream backstop is **11 minutes** (`liveBackend.ts`
`INACTIVITY_TIMEOUT_MS`), deliberately above the backend's **600 s** per-round
Ollama ceiling. So "nothing on screen for two minutes" is normal, not a failure.

---

## Step 1 — Ollama + the model

```bash
# start the daemon (leave it running in its own terminal)
ollama serve

# get the weights. Preferred, if the Ollama library has the tag:
ollama pull ornith:9b

# …or build the exact tag the UI defaults to, from the official GGUF,
# with num_ctx / sampling baked in (see scripts/Modelfile.ornith):
ollama create ornith:9b -f scripts/Modelfile.ornith

# verify it's really there
ollama list | grep ornith
```

**Model-name gotcha:** the UI defaults to the tag **`ornith:9b`**
(`LMChatApp.tsx`). The chat request sends whatever model the app currently
holds, and the Models modal only lists what Ollama *actually* has installed
(`/api/tags`). So either name your tag `ornith:9b`, **or** pick your real tag in
the Models modal before sending. If they don't match, the backend gets a model
name Ollama can't resolve and the turn errors.

## Step 2 — the Mach-2 backend (`:8000`)

From your **`Mach-2-Agent-Harness`** checkout, start the FastAPI server. The
exact command is in that repo's README; it's the process that serves
`POST /chat-stream` and `GET /health` on port 8000 (typically
`uvicorn server.main:app --port 8000`, or a provided `run`/`make` target).

Confirm it's up:

```bash
curl -s http://localhost:8000/health        # -> {"status":"ok"}
```

The backend runs the model with `num_ctx=32768` and a per-round 600 s Ollama
timeout — both intentional (see the format-slip note in Troubleshooting).

## Step 3 — the LMChat frontend

```bash
npm install

# browser (http://localhost:3000):
npm run dev

# …or the real desktop shell (Electron, http://localhost:3010):
npm run dev:desktop
```

Use `dev:desktop` if you want the **native folder picker** (Electron exposes a
real path; browsers only expose a folder *name*, by design).

---

## Step 4 — preflight (fail fast, before you wait on inference)

```bash
npm run preflight
```

Checks Node, that Ollama is up **and has `ornith:9b`**, and that the backend
`/health` responds — then prints `READY` / `NOT READY` with a fix for each ✗.
Override targets with env vars:

```bash
MODEL=ornith:9b BACKEND_URL=http://localhost:8000 OLLAMA_URL=http://localhost:11434 \
  npm run preflight
```

## Step 5 — headless live smoke test (the automated "does the model work")

This reproduces exactly one UI turn (same `/chat-stream` request body as
`liveBackend.ts`) with **no browser**, parses the SSE stream, and asserts a
well-formed `done` with a non-empty answer — printing thoughts/tools/timing as
they arrive:

```bash
npm run smoke:live
# custom prompt:
node scripts/smoke-live.mjs "write a python function that reverses a string"
# see span events too:
VERBOSE=1 node scripts/smoke-live.mjs
```

A green `PASS` means the model + backend + SSE contract are all healthy. It also
**flags the format-slip failure mode** (see Troubleshooting) and any contract
drift (e.g. a `span` missing `parent_id`) as warnings.

## Step 6 — drive the real UI (manual acceptance checklist)

Open the app (Step 3), then:

1. **New session** → on the Start screen, **pick a working folder**.
2. Type a prompt in the composer and press **Enter**.
3. Watch for, in order:
   - an inline **tool-call row** streaming live round/thought text;
   - **"Thought for N s"** bullets with *real* per-round durations (consecutive
     thoughts consolidate into one bullet summing their time);
   - **tool rows** with real unified **diffs** for file-writing tools;
   - the right panel **Trace** tab building a span tree, with a **live run
     timer** ticking every second;
   - on finish, a **"Done in Xm Ys"** summary and the assistant's answer.
4. **Stop** mid-run → the turn cancels cleanly (no late answer lands).
5. **Models modal** (top bar) → switch models → observe real
   **"Unloading X… → Loading Y…"** phases with an elapsed counter.
6. **Reload the page** mid-session → sessions/folders/widths persist; an
   in-flight session restores to idle (not stuck "running").

If all six behave, the app is live-verified end-to-end.

## Step 7 — (optional) browser live e2e

`playwright.live.config.ts` (baseURL `127.0.0.1:3005`, no managed webServer) is
wired for `npm run test:e2e:live`. **Caveat:** the current spec under
`e2e-live/` predates the Ornith-native pivot — it drives the deleted harness
picker (`.lm-hcard`, "Agent-to-Agent", "harness ready.") and will fail against
today's harness-free UI. Treat `smoke:live` (Step 5) as the real automated live
check until that spec is refreshed. To use the config as-is you'd run the
frontend on 3005: `npx next dev -p 3005`.

---

## Troubleshooting (mapped to the hard-won lessons)

| Symptom | Cause | Fix |
| --- | --- | --- |
| Raw `<channel\|>` markers or narrated **"Action:"** text in the reply | Model's native tool-call format collapsed — usually a too-small context window truncating the prompt front | Ensure the backend runs the model at **`num_ctx=32768`** (baked into `scripts/Modelfile.ornith`). `smoke:live` flags this automatically. |
| **"No response from the agent in 11 minutes"** | Stuck retrying a failing tool, or the backend worker crashed mid-loop | Check the backend terminal; the stream went silent with the HTTP socket still open. |
| **"Connection lost — the server stopped responding without finishing"** | Backend died mid-turn without sending `done` | Look for a crash/traceback in the backend terminal. |
| Model swap hangs; `ollama ps` shows a model stuck in **"Stopping…"** | Ollama's async teardown raced the next load (GPU-less memory pressure) | Only killing and relaunching the **Ollama process** recovers it (`ollama stop` won't). The UI surfaces this after a 2-min timeout. |
| Frontend won't start — **port 3000 in use** | Something else owns 3000 | Use `npm run dev:desktop` (3010) or `DEV_PORT=3xxx npm run dev:desktop` / `npx next dev -p 3xxx`. |
| Turn errors immediately with a model-not-found style error | The tag the UI sent isn't installed in Ollama | Match tags (Step 1's gotcha): pull/alias `ornith:9b`, or select your real tag in the Models modal. |
| Tools seem to edit files **outside** your picked folder | Known gap at split time: the picked working folder isn't threaded into the backend's tool workspace yet | Backend tools currently operate on the Mach-2 repo's own `workspace/`. Tracked as a follow-up. |

---

## Appendix — contract & knobs

**Backend (`:8000`)** — from `components/lmchat/liveBackend.ts`:
- `POST /chat-stream` `{ message, session_id, harness: "ornith", model }` → SSE
  `data:` lines: `thought {round, thought?, action?}` ·
  `tool_result {tool, input, result, diff?}` ·
  `span {span:{id, parent_id, type, label, agent?, ms, tokens?, detail?}}` ·
  `error {round, message}` · `done {answer, session_id}`
- `GET /health` → `{status:"ok"}`
- `GET /harnesses`, `GET /workspace-files`

**Ollama (`:11434`)** — from `components/lmchat/ollama.ts`:
- `/api/tags` (installed) · `/api/ps` (resident) ·
  `/api/generate` (keep-alive lifecycle) · `/api/embeddings`

**Script env vars:**

| Var | Default | Used by |
| --- | --- | --- |
| `BACKEND_URL` | `http://localhost:8000` | preflight, smoke |
| `OLLAMA_URL` | `http://localhost:11434` | preflight, smoke |
| `MODEL` | `ornith:9b` | preflight, smoke |
| `INACTIVITY_MS` | `660000` (11 min) | smoke |
| `FRONTEND_URL` | *(unset; checked if provided)* | preflight |
| `VERBOSE` | *(unset)* | smoke (log span events) |
| `NO_COLOR` | *(unset)* | both (plain output) |
