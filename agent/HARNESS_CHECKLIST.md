# New-harness checklist

Every harness under `agent/pN-*/` gets loaded in isolation by
`server/main.py`'s `_load_harness()` and called the same way:
`run_agent(messages, on_event=None, max_rounds=10, model=None, ...)`. This
checklist captures the reliability pattern that took real debugging to get
right across the first 10 harnesses — skip these and you'll hit the exact
bugs already found and fixed once.

## Required in every `agent.py`

- **`OLLAMA_TIMEOUT = 600`**, not something shorter. Measured on this
  hardware (CPU-only, no GPU): a single round with a real system prompt
  can take 3-6+ minutes. A short timeout doesn't fail fast — it discards the
  in-progress generation and retries from scratch with an even LONGER
  prompt (the corrective message gets appended), guaranteeing a losing
  cascade toward `max_rounds`. Generous beats tight here.
- **`keep_alive: "6h"`** on every Ollama call (or via `ChatOllama(keep_alive="6h")`).
  Without it the model gets silently evicted between calls.
- **`model=None` parameter on `run_agent`**, defaulting to the harness's own
  `MODEL` constant only when not provided (`model or MODEL`). The UI sends
  a `model` field on every request — a harness that ignores it silently
  breaks the model picker (confirmed: this was completely missing until
  fixed, and every harness looked like it "wasn't switching models" as a
  result).
- **Check `"error" in data`** before indexing `data["message"]` on any raw
  `requests.post(...).json()` call to Ollama's `/api/chat` /`/api/generate`.
  Ollama returns 200 OK with an `{"error": "..."}` body for real failures
  (e.g. a model whose context length needs more KV-cache RAM than is free) —
  blindly indexing raises a bare, unhelpful `KeyError`.
- **Try/except around each round**, emitting an `{"type": "error", ...}`
  event and feeding a corrective message back to the model rather than
  crashing the whole request on one malformed response.
- **The `on_event` streaming contract** — emit these event shapes so the
  existing frontend (`liveBackend.ts`) renders them with zero UI changes:
  - `{"type": "thought", "round": N, "thought": str, "action": str}`
  - `{"type": "tool_result", "tool": str, "input": str, "result": str}`
  - `{"type": "span", "span": {"id", "parent_id", "type", "label", "agent"?, "ms", "tokens"?, "detail"?}}`
  - `{"type": "error", "round": N, "message": str}`
  (the final `{"type": "done", ...}` event is emitted by `server/main.py`
  itself, not the harness)
- **Real span timing.** If using `langgraph`'s `.stream(..., stream_mode="values")`,
  time the gap *between successive yields*, not the message after it's
  already in hand — the actual LLM/tool work happens entirely before the
  yield arrives, so timing after the fact always measures ~0ms (a real bug
  found and fixed in `p7-langgraph`).
- **Declare every LangGraph state key you read via `route()`/conditional
  edges in the `TypedDict` schema.** A key returned from a node but absent
  from the schema is silently dropped — the routing decision looks like it
  fired (any `emit()` calls still happen) but the conditional edge reads
  back `None` and goes straight to `END` regardless. This exact bug shipped
  in `p9-supervisor`'s first version (an undeclared `_next` key).
- **Don't assume a framework's automatic structuring/middleware works with
  this model.** `p11-structured`'s first attempt used
  `langchain.agents.create_agent`'s `response_format=` for automatic
  Pydantic structuring — the shared base system prompt's strong JSON-ReAct
  habit interfered with it and `structured_response` never populated. Fixed
  by making structuring an explicit, separate call instead of relying on an
  automatic pathway, and Pydantic-validating the result directly.

## Registration steps (once `agent.py`/`tools.py` are ready)

1. `server/main.py`'s `HARNESSES` dict: `"my-id": _load_harness("pN-my-harness")`.
2. `ui/components/lmchat/data.ts`'s `HARNESSES` array: add an entry with
   `loaded: true, live: true` and a real `desc` describing what's actually
   different about this harness's architecture (not just "another ReAct loop").
3. `HARNESS_DOT` needs a color for the new id too (cosmetic, but `tsc` won't
   catch a missing one — check the picker renders correctly).
4. **Always do a clean kill-and-restart of the backend, never trust
   `--reload` alone** — confirmed multiple times this session that uvicorn's
   Windows reloader can leave an orphaned worker process (spawned via
   `multiprocessing`) still serving stale code after a "successful" reload.
   Verify via a full process-tree check (`Get-CimInstance Win32_Process`
   with parent/child PIDs), not just a `/health` 200.
5. **Live-test with a real message before calling it done.** Every bug in
   this checklist was found by actually sending a request through
   `/chat-stream` and reading the raw SSE events, not by code review alone.

## Real diffs for file-editing tools

`Step.tool_result.diff` (frontend, `data.ts`) is real, wired, and rendered
by `DiffView` — it was just never populated server-side until now. Pattern:
have the file-writing tool capture old content before overwriting, compute a
unified diff via `difflib.unified_diff`, and stash it in a module-level
consume-once slot (`_LAST_DIFF = {"value": None}`, cleared by a
`get_last_diff()` getter) since the tool itself only returns a plain string
result. The harness loop calls `get_last_diff()` right after invoking a
diff-producing tool and attaches it to the emitted `tool_result` event as
`"diff"` (only if truthy — don't add the key at all otherwise).

Reference implementations: `p4-agent-to-agent` (dict-style tools —
`create_file`/`edit_file`/`edit_section`/`append_to_file`) and
`p7-langgraph` (LangChain `@tool`-style — `write_file`). Both verified with
a direct unit test of the diff computation (no LLM needed — `tools.py`'s
functions are plain Python, testable standalone). The other 8 harnesses'
file-writing tools don't have this yet — same pattern, same two files to
touch (`tools.py`'s writer function + `agent.py`'s tool-result emission site).

## Known environment gotcha (not a harness bug, but will look like one)

An orphaned `llama-server.exe` process can end up holding several GB of RAM
that Ollama's own `/api/ps` no longer tracks — `ollama ps` shows nothing
resident, but the process is very much alive and the memory is unavailable
to anything else, including loading a fresh model. Symptom: every model
load/generate call fails or hangs, and restarting Ollama's own service
*doesn't* fix it if the zombie survives the restart. Check
`Get-Process -Name llama-server` directly and kill any instance not
accounted for by `ollama ps` before assuming a code bug.
