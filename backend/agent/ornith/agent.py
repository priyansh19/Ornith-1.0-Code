"""p13-ornith — the ornith-native harness.

Ornith 1.0 is RL-trained with SELF-SCAFFOLDING: the model learned to build
its own task plans, tool-call sequences, error recovery and re-planning
strategies during training (see docs/ornith-self-scaffolding.md). The right
harness for it is therefore a THIN EXECUTOR LOOP — hand it the task and the
tools, execute the tool calls it emits natively, feed results back, repeat.

No external planner/critic/replanner LLM calls (that's Apex/p12's design —
4+ round-trips per step of scaffolding the model already does internally in
one), no JSON-ReAct text parsing (ornith emits real tool_calls via Ollama's
built-in `ornith` parser), no format="json" side-calls (forcing JSON
suppresses the thinking block the model was trained to always produce).

This loop drives Ornith through the levers the model actually exposes:
  * token + reasoning STREAMING (.stream(), not a blocking .invoke()),
  * Ornith's recommended sampling recipe (temp 0.6 / top_p 0.95 / top_k 20),
  * a large, env-tunable context window (num_ctx, up to the model's 262144),
  * REAL per-round token counts from Ollama's response metadata
    (prompt_eval_count / eval_count) that drive the UI's context meter,
  * safe partial-parallel tool execution (independent read/research tools
    run concurrently; stateful file/shell tools stay serial),
  * intra-run history compaction so a long agentic run doesn't silently blow
    past the context window.
Every knob is overridable by an ORNITH_* env var so the defaults stay safe on
modest hardware while the full capability is one variable away.
"""
import os
import time
import uuid
from concurrent.futures import ThreadPoolExecutor

from langchain_core.messages import AIMessage, HumanMessage, SystemMessage, ToolMessage
from langchain_core.tools import tool as _tool_dec
from langchain_ollama import ChatOllama
from langfuse import Langfuse

from tools import LC_TOOLS, get_last_diff, get_last_shell


def _new_span_id():
    return uuid.uuid4().hex[:8]


def _env_int(name, default):
    try:
        return int(os.environ.get(name, default))
    except (TypeError, ValueError):
        return default


def _env_float(name, default):
    try:
        return float(os.environ.get(name, default))
    except (TypeError, ValueError):
        return default


MODEL = "ornith:9b"
HARNESS_NAME = "ornith"
MAX_SCOUT_DEPTH = 2

# ── Ornith runtime config (all env-overridable) ────────────────────────────
# The model's true window is 262,144. num_ctx is env-tunable so a beefy box
# can open it all the way up; the default stays modest so a low-RAM machine
# doesn't OOM on the KV cache. The context meter now makes usage visible, so
# raising this is an informed choice, not a shot in the dark.
NUM_CTX = _env_int("ORNITH_NUM_CTX", 32768)
MODEL_MAX_CTX = 262144  # Ornith 1.0's real context ceiling — reported to the UI meter
# Ornith's recommended REAL-USE sampling profile (1.0 is only for reproducing
# benchmarks). Left unset, Ollama would apply temperature 0.8, which measurably
# degrades Ornith's output quality.
TEMPERATURE = _env_float("ORNITH_TEMPERATURE", 0.6)
TOP_P = _env_float("ORNITH_TOP_P", 0.95)
TOP_K = _env_int("ORNITH_TOP_K", 20)
# Per-turn output ceiling. -1 = unlimited (Ollama's "infinite"), which honors
# the "no caps" stance and preserves prior behavior; set a positive value to
# arm a runaway-generation backstop now that there is no HTTP timeout.
NUM_PREDICT = _env_int("ORNITH_NUM_PREDICT", -1)
# Reproducible runs for debugging / eval. Unset = nondeterministic sampling.
SEED = os.environ.get("ORNITH_SEED")
# Token streaming on by default; set ORNITH_STREAM=0 to fall back to a single
# blocking .invoke() per round (escape hatch if a given Ollama build streams
# tool calls poorly).
STREAM = os.environ.get("ORNITH_STREAM", "1") != "0"
# No per-round HTTP ceiling: a slow CPU-only round can legitimately take
# longer than any fixed budget, and the model is allowed to run as long as it
# needs. None disables httpx timeouts entirely; the UI's Stop button aborts
# the SSE request when a human decides it's been long enough. Arm NUM_PREDICT
# instead if you want a bound on a single runaway generation.
OLLAMA_TIMEOUT = None
# Compact intra-run history once the last round's prompt crosses this fraction
# of num_ctx — truncates the OLDEST tool outputs (the usual context hog: big
# file reads / shell dumps) while preserving message structure and
# tool_call/result pairing, so a long agentic run degrades gracefully instead
# of silently overflowing the window.
COMPACT_AT = _env_float("ORNITH_COMPACT_AT", 0.85)
COMPACT_KEEP_RECENT_TOOLS = _env_int("ORNITH_COMPACT_KEEP", 6)

# Tools that are pure reads / stateless lookups — safe to run CONCURRENTLY
# within a single turn. Everything else (file writes/edits, run_shell,
# memory mutations, moves, spawn_scout) touches shared state (workspace files,
# the process-global last-diff / last-shell capture slots) and MUST stay
# serial to avoid races.
READONLY_TOOLS = {
    "read_file", "search_workspace", "list_files", "list_memories", "recall",
    "web_search", "wikipedia", "browse_url", "search_stackoverflow",
    "github_search_repos", "github_get_file", "github_list_issues",
    "github_search_code", "mcp_read_multiple_files", "mcp_directory_tree",
    "mcp_search_files", "mcp_get_file_info",
}

# Deliberately SHORT. Ornith ships a built-in agentic system prompt in its
# Modelfile; a long override fights its training (the old 300-line JSON-ReAct
# prompt demanded "raw JSON only", directly contradicting the model's native
# thinking-block + XML-tool-call format). This adds only the OrnithChat-specific
# context the built-in prompt can't know.
SYSTEM_PROMPT = (
    "You are Ornith, an open-source agentic coding assistant. Think step by "
    "step in a reasoning block, then act. Use the provided tools when they "
    "help. Be concise, correct, and direct: write working code and explain "
    "only what is non-obvious.\n\n"
    "Context: you are running inside the OrnithChat harness. File tools operate "
    "on a shared workspace directory; run_shell runs inside that same "
    "directory (recursive-delete commands are refused) — use it for any "
    "computation, scripting, or terminal work. You also have persistent "
    "memory tools (remember/recall) whose facts survive across sessions, "
    "semantic workspace search, web/wikipedia/GitHub research tools, and "
    "MCP filesystem tools for multi-file reads, trees, and moves. For a "
    "large sub-investigation you can delegate to a fresh sub-agent with "
    "spawn_scout. When several independent lookups would help, emit them as "
    "parallel tool calls in one turn — the harness runs read-only tools "
    "concurrently. Work autonomously until the task is done, then give your "
    "final answer."
)

# Langfuse credentials come from the environment; the literals are a
# local-dev fallback so an unconfigured checkout still traces to a local
# Langfuse without leaking anything new that wasn't already in git history.
langfuse = Langfuse(
    public_key=os.environ.get("LANGFUSE_PUBLIC_KEY", "pk-lf-df92732e-8905-4eea-a561-4a906b963471"),
    secret_key=os.environ.get("LANGFUSE_SECRET_KEY", "sk-lf-42a96bc1-2d67-4741-a7c7-598c4a2506a9"),
    host=os.environ.get("LANGFUSE_HOST", "http://localhost:3000"),
)

_llm_cache = {}


def _llm_for(model: str) -> ChatOllama:
    if model not in _llm_cache:
        opts = dict(
            model=model,
            keep_alive="6h",
            reasoning=True,  # surface the native <think> block as separate reasoning content
            num_ctx=NUM_CTX,
            temperature=TEMPERATURE,
            top_p=TOP_P,
            top_k=TOP_K,
            num_predict=NUM_PREDICT,
            client_kwargs={"timeout": OLLAMA_TIMEOUT},
        )
        if SEED is not None:
            try:
                opts["seed"] = int(SEED)
            except ValueError:
                pass
        _llm_cache[model] = ChatOllama(**opts)
    return _llm_cache[model]


def _to_lc_messages(messages):
    out = []
    for m in messages:
        role, content = m.get("role"), m.get("content", "")
        if role == "system":
            out.append(SystemMessage(content=content))
        elif role == "assistant":
            out.append(AIMessage(content=content))
        else:
            out.append(HumanMessage(content=content))
    return out


def _extract_thinking(msg) -> str:
    ak = getattr(msg, "additional_kwargs", {}) or {}
    val = ak.get("reasoning_content") or ak.get("thinking") or ""
    return val if isinstance(val, str) else str(val)


def _token_usage(msg):
    """Pull Ollama's real per-round token counts out of the (possibly
    streamed-and-accumulated) message. Returns (input_tokens, output_tokens)
    or (None, None) if the metadata isn't present."""
    usage = getattr(msg, "usage_metadata", None) or {}
    meta = getattr(msg, "response_metadata", {}) or {}
    inp = usage.get("input_tokens") or meta.get("prompt_eval_count")
    out = usage.get("output_tokens") or meta.get("eval_count")
    return inp, out


EDIT_TOOLS = {"write_file", "edit_section", "append_to_file"}


def _tool_io(name, args, raw_diff, raw_shell):
    """Build the structured SpanIO the Trace tree's IOView renders — file
    path/lines for reads, cmd+stdout+exit for run_shell, add/remove diff for
    edits. Pure function: the raw diff/shell are captured once at execution
    time (see run_one) and passed in, so this never touches the consume-once
    global slots and can't race under parallel tool execution."""
    try:
        if name in ("read_file", "mcp_get_file_info"):
            path = args.get("filename") or args.get("path")
            return {"kind": "read", "path": path} if path else None
        if name == "run_shell" and raw_shell:
            out_lines = (raw_shell.get("stdout") or "").splitlines()
            err_lines = (raw_shell.get("stderr") or "").splitlines()
            merged = out_lines + ([""] + err_lines if err_lines else [])
            return {"kind": "run", "shell": {
                "cmd": raw_shell.get("cmd", ""),
                "out": merged[:60],
                "exit": raw_shell.get("exit", 0),
            }}
        if name in EDIT_TOOLS:
            path = args.get("filename")
            added, removed = [], []
            for line in (raw_diff or "").splitlines():
                if line.startswith("+++") or line.startswith("---"):
                    continue
                if line.startswith("+"):
                    added.append(line[1:])
                elif line.startswith("-"):
                    removed.append(line[1:])
            return {"kind": "edit", "path": path,
                    "diff": {"added": added, "removed": removed}} if path else None
    except Exception:
        return None
    return None


def _compact_history(lc_messages):
    """Truncate the content of OLDER ToolMessages (big file reads / shell
    dumps are the usual context hog) while keeping the most recent ones and
    preserving every tool_call/tool_result pairing. Returns how many were
    truncated. Safe because it shortens content strings in place — it never
    removes a message, so the AIMessage(tool_calls) / ToolMessage structure
    stays intact."""
    tool_idxs = [i for i, m in enumerate(lc_messages) if isinstance(m, ToolMessage)]
    if len(tool_idxs) <= COMPACT_KEEP_RECENT_TOOLS:
        return 0
    n = 0
    for i in tool_idxs[:-COMPACT_KEEP_RECENT_TOOLS]:
        m = lc_messages[i]
        if isinstance(m.content, str) and len(m.content) > 240:
            lc_messages[i] = ToolMessage(
                content=m.content[:240] + " …[older tool output truncated to fit context]",
                tool_call_id=m.tool_call_id, name=m.name,
            )
            n += 1
    return n


def _call_model(llm_tools, lc_messages, round_no, depth, emit):
    """One model round. Streams token + reasoning deltas when STREAM is on and
    returns the accumulated AIMessage(Chunk); falls back to a blocking invoke
    otherwise (or if a stream yields nothing)."""
    if not STREAM:
        return llm_tools.invoke(lc_messages)
    acc = None
    for chunk in llm_tools.stream(lc_messages):
        acc = chunk if acc is None else acc + chunk
        # Answer tokens (only depth 0 streams into the reply bubble; a scout's
        # tokens are surfaced as its own reasoning, not the top-level answer).
        piece = chunk.content if isinstance(chunk.content, str) else ""
        if piece:
            emit({"type": "token", "round": round_no, "depth": depth, "text": piece})
        # Reasoning tokens (Ornith's native <think> channel), when the build
        # streams them incrementally.
        rc = _extract_thinking(chunk)
        if rc:
            emit({"type": "reasoning", "round": round_no, "depth": depth, "text": rc})
    if acc is None:  # nothing streamed — fall back so the round still produces a message
        return llm_tools.invoke(lc_messages)
    return acc


def run_agent(messages, on_event=None, max_rounds=None, depth=0, allowed_tools=None,
              span_id=None, parent_span_id=None, model=None):
    # max_rounds=None (the top-level default) means UNBOUNDED: the loop keeps
    # running as long as the model still has work left (keeps emitting tool
    # calls) and exits only when it returns a final answer with no tool calls,
    # errors out, or the user stops the turn. The model is local and free —
    # there is deliberately no round or time cap. Scouts still pass an explicit
    # bound: a delegated sub-task is supposed to come back with a report.
    def emit(evt):
        if on_event:
            on_event(evt)

    span_id = span_id or _new_span_id()
    agent_start = time.time()
    label = "ornith-agent" if depth == 0 else f"scout (depth {depth})"
    emit({"type": "span", "span": {
        "id": span_id, "parent_id": parent_span_id, "type": "agent",
        "label": label, "agent": HARNESS_NAME if depth == 0 else "scout", "ms": 0,
    }})

    resolved_model = model or MODEL
    llm = _llm_for(resolved_model)

    tools = list(LC_TOOLS)
    if allowed_tools is not None:
        tools = [t for t in tools if t.name in allowed_tools]
    if depth < MAX_SCOUT_DEPTH:
        def spawn_scout(mission: str) -> str:
            """Delegate an independent, bounded sub-task to a fresh nested agent and return its report. The scout has no memory of this conversation — write the mission as a complete, standalone instruction."""
            emit({"type": "scout_start", "depth": depth + 1, "mission": mission})
            report = run_agent(
                [{"role": "system", "content": SYSTEM_PROMPT},
                 {"role": "user", "content": mission}],
                on_event=on_event, max_rounds=15, depth=depth + 1,
                span_id=_new_span_id(), parent_span_id=span_id, model=resolved_model,
            )
            emit({"type": "scout_done", "depth": depth + 1, "report": report[:500]})
            return report
        spawn_scout.__name__ = "spawn_scout"
        tools.append(_tool_dec(spawn_scout))
    tools_by_name = {t.name: t for t in tools}
    llm_tools = llm.bind_tools(tools)

    lc_messages = _to_lc_messages(messages)
    user_task = messages[-1].get("content", "")

    with langfuse.start_as_current_observation(
        name=label,
        input={"query": user_task},
        metadata={"model": resolved_model, "phase": "p13-ornith", "depth": depth},
    ) as trace:
        answer = "Agent hit max rounds without finishing — partial progress is in the trace."
        nudges = 0
        round_no = 0
        try:
            # Never-ending while the agent has work left; only a bounded scout
            # (max_rounds set) can run out of rounds.
            while max_rounds is None or round_no < max_rounds:
                round_no += 1
                t0 = time.time()
                try:
                    ai = _call_model(llm_tools, lc_messages, round_no, depth, emit)
                except Exception as e:
                    emit({"type": "error", "round": round_no, "message": str(e)})
                    answer = f"Agent error talking to the model: {e}"
                    break
                elapsed_ms = int((time.time() - t0) * 1000)

                thinking = _extract_thinking(ai)
                if thinking:
                    # Post-hoc thought carries the full reasoning; if reasoning
                    # already streamed as deltas the UI dedupes by round.
                    emit({"type": "thought", "round": round_no, "depth": depth,
                          "thought": thinking, "action": "think"})

                # Real token counts from Ollama's response metadata → span
                # badge + context meter. input_tokens ≈ how full the window is.
                inp_tok, out_tok = _token_usage(ai)
                if inp_tok is not None or out_tok is not None:
                    emit({"type": "context", "round": round_no, "depth": depth,
                          "used": (inp_tok or 0) + (out_tok or 0),
                          "max": NUM_CTX, "modelMax": MODEL_MAX_CTX})

                content = ai.content if isinstance(ai.content, str) else str(ai.content)
                tool_calls = getattr(ai, "tool_calls", None) or []
                done_reason = (getattr(ai, "response_metadata", {}) or {}).get("done_reason")
                llm_span = {
                    "id": _new_span_id(), "parent_id": span_id, "type": "llm",
                    "label": f"round {round_no}", "ms": elapsed_ms,
                    "detail": (", ".join(tc["name"] for tc in tool_calls) if tool_calls else content)[:500],
                }
                if out_tok is not None:
                    llm_span["tokens"] = out_tok
                if done_reason:
                    llm_span["doneReason"] = done_reason
                emit({"type": "span", "span": llm_span})

                if not tool_calls:
                    # Format-slip guard: a response that leaks renderer channel
                    # markers or narrates an "Action:" it never took is a failed
                    # tool call, not a final answer (observed live under long
                    # context). Nudge once per occurrence, bounded so a
                    # persistently confused model still exits.
                    slipped = ("<channel|" in content or "<|channel|" in content
                               or content.strip().lower().startswith("action:")
                               or "\naction:" in content.lower())
                    if slipped and nudges < 2:
                        nudges += 1
                        lc_messages.append(ai)
                        lc_messages.append(HumanMessage(content=(
                            "You described an action as text instead of actually "
                            "calling the tool. Do not narrate tool use — emit the "
                            "real tool call now, or give your final answer with no "
                            "action markers."
                        )))
                        emit({"type": "thought", "round": round_no, "depth": depth,
                              "thought": "Model narrated an action instead of calling a tool — nudging it to emit the real call.",
                              "action": "retry"})
                        continue
                    # No tool calls -> this IS the final answer. Strip any leaked
                    # channel markers rather than showing them raw.
                    answer = (content or answer).replace("<channel|>", "").replace("<|channel|>", "").strip()
                    break

                lc_messages.append(ai)

                # Compact BEFORE appending this round's tool results if the last
                # prompt is crowding the window — keeps a long agentic run from
                # silently overflowing num_ctx.
                if inp_tok and inp_tok > COMPACT_AT * NUM_CTX:
                    trimmed = _compact_history(lc_messages)
                    if trimmed:
                        emit({"type": "context", "round": round_no, "depth": depth,
                              "used": inp_tok, "max": NUM_CTX, "modelMax": MODEL_MAX_CTX,
                              "compacted": trimmed})

                # Execute tool calls — read-only/independent ones concurrently,
                # stateful ones (writes/shell/memory/moves/scout) serially so
                # they don't race on shared files or the global capture slots.
                results = _execute_tools(tool_calls, tools_by_name, span_id, depth, emit)
                for call_id, tool_msg in results:
                    lc_messages.append(tool_msg)
        except Exception as e:
            emit({"type": "error", "round": 0, "message": str(e)})
            answer = f"Agent error: {e}"

        trace.update(output=answer)
        emit({"type": "span", "span": {
            "id": span_id, "parent_id": parent_span_id, "type": "agent",
            "label": label, "agent": HARNESS_NAME if depth == 0 else "scout",
            "ms": int((time.time() - agent_start) * 1000),
        }})
        langfuse.flush()
        return answer


def _execute_tools(tool_calls, tools_by_name, span_id, depth, emit):
    """Run this round's tool calls and return [(call_id, ToolMessage)] in the
    SAME order the model emitted them. Read-only tools run concurrently; every
    other tool runs serially (shared-state safety). All events are emitted in
    original order afterwards so the trace reads deterministically."""

    def run_one(tc):
        name = tc["name"]
        args = tc.get("args") or {}
        call_id = tc.get("id", "")
        tt0 = time.time()
        tool_fn = tools_by_name.get(name)
        if tool_fn is None:
            result = f"Error: unknown tool '{name}'."
        else:
            try:
                result = tool_fn.invoke(args)
            except Exception as e:
                result = f"Error running {name}: {e}"
        result = result if isinstance(result, str) else str(result)
        ms = int((time.time() - tt0) * 1000)
        # Capture the consume-once diff/shell slots IMMEDIATELY, in the same
        # (serial) context that produced them, so the raw values are preserved
        # for both the trace diff string and the structured io without a second
        # global read that could race or return None.
        raw_diff = get_last_diff() if name in EDIT_TOOLS else None
        raw_shell = get_last_shell() if name == "run_shell" else None
        return name, args, call_id, result, ms, raw_diff, raw_shell

    n = len(tool_calls)
    computed = [None] * n
    parallel = [(i, tc) for i, tc in enumerate(tool_calls) if tc["name"] in READONLY_TOOLS]
    serial = [(i, tc) for i, tc in enumerate(tool_calls) if tc["name"] not in READONLY_TOOLS]

    # Serial first: stateful tools (writes/shell/memory/moves/scout) touch
    # shared files and the process-global diff/shell slots, so they must not
    # overlap with each other.
    for i, tc in serial:
        computed[i] = run_one(tc)

    # Read-only/independent tools run concurrently — a real speedup for a turn
    # that fires several reads/lookups at once, safe because none of them
    # mutate shared state or the capture slots.
    if parallel:
        with ThreadPoolExecutor(max_workers=min(8, len(parallel))) as ex:
            for (i, _tc), out in zip(parallel, ex.map(lambda p: run_one(p[1]), parallel)):
                computed[i] = out

    ordered = []
    for name, args, call_id, result, ms, raw_diff, raw_shell in computed:
        io = _tool_io(name, args, raw_diff, raw_shell)
        is_error = result.startswith("Error") or (
            isinstance(io, dict) and io.get("kind") == "run" and io.get("shell", {}).get("exit", 0) != 0
        )
        tool_event = {"type": "tool_result", "tool": name, "depth": depth,
                      "input": str(args)[:200], "result": result[:500], "isError": is_error}
        if raw_diff:
            # Keep the original unified-diff string for StepTrace's DiffView;
            # TraceTree's IOView renders the structured io.diff separately.
            tool_event["diff"] = raw_diff
        emit(tool_event)
        tool_span = {
            "id": _new_span_id(), "parent_id": span_id, "type": "tool",
            "label": name, "ms": ms, "detail": result[:500], "isError": is_error,
        }
        if io:
            tool_span["io"] = io
        emit({"type": "span", "span": tool_span})
        ordered.append((call_id, ToolMessage(content=result, tool_call_id=call_id, name=name)))
    return ordered
