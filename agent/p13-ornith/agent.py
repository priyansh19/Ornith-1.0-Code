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
"""
import time
import uuid

from langchain_core.messages import AIMessage, HumanMessage, SystemMessage, ToolMessage
from langchain_core.tools import tool as _tool_dec
from langchain_ollama import ChatOllama
from langfuse import Langfuse

from tools import LC_TOOLS, get_last_diff


def _new_span_id():
    return uuid.uuid4().hex[:8]


MODEL = "ornith:9b"
HARNESS_NAME = "ornith"
# No per-round HTTP ceiling: a slow CPU-only round can legitimately take
# longer than any fixed budget, and the model is allowed to run as long as
# it needs. None disables httpx timeouts entirely; the UI's Stop button
# aborts the SSE request when a human decides it's been long enough.
OLLAMA_TIMEOUT = None
MAX_SCOUT_DEPTH = 2

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
    "spawn_scout. Work autonomously until the task is done, then give "
    "your final answer."
)

langfuse = Langfuse(
    public_key="pk-lf-df92732e-8905-4eea-a561-4a906b963471",
    secret_key="sk-lf-42a96bc1-2d67-4741-a7c7-598c4a2506a9",
    host="http://localhost:3000",
)

_llm_cache = {}


def _llm_for(model: str) -> ChatOllama:
    if model not in _llm_cache:
        _llm_cache[model] = ChatOllama(
            model=model,
            keep_alive="6h",
            reasoning=True,  # surface the native <think> block as separate reasoning content
            # Ollama's runtime default context (~4K) is far below the model's
            # 262K max — on long tasks the prompt front (system + tool-format
            # conditioning) gets silently truncated, and the model degrades
            # into NARRATING actions with raw <channel|> markers leaking into
            # text instead of emitting parsed tool calls (observed live).
            # 32K fits this machine's RAM; raise if long-horizon runs still
            # truncate.
            num_ctx=32768,
            client_kwargs={"timeout": OLLAMA_TIMEOUT},
        )
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


def _extract_thinking(msg: AIMessage) -> str:
    ak = getattr(msg, "additional_kwargs", {}) or {}
    return ak.get("reasoning_content") or ak.get("thinking") or ""


def run_agent(messages, on_event=None, max_rounds=None, depth=0, allowed_tools=None,
              span_id=None, parent_span_id=None, model=None):
    # max_rounds=None (the top-level default) means UNBOUNDED: the loop
    # keeps running as long as the model still has work left (keeps
    # emitting tool calls) and exits only when it returns a final answer
    # with no tool calls, errors out, or the user stops the turn. The
    # model is local and free — there is deliberately no round or time
    # cap. Scouts still pass an explicit bound: a delegated sub-task is
    # supposed to come back with a report, not run forever.
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
            # Never-ending while the agent has work left; only a bounded
            # scout (max_rounds set) can run out of rounds.
            while max_rounds is None or round_no < max_rounds:
                round_no += 1
                t0 = time.time()
                try:
                    ai = llm_tools.invoke(lc_messages)
                except Exception as e:
                    emit({"type": "error", "round": round_no, "message": str(e)})
                    answer = f"Agent error talking to the model: {e}"
                    break
                elapsed_ms = int((time.time() - t0) * 1000)

                thinking = _extract_thinking(ai)
                if thinking:
                    emit({"type": "thought", "round": round_no,
                          "thought": thinking, "action": "think"})
                content = ai.content if isinstance(ai.content, str) else str(ai.content)
                tool_calls = getattr(ai, "tool_calls", None) or []
                emit({"type": "span", "span": {
                    "id": _new_span_id(), "parent_id": span_id, "type": "llm",
                    "label": f"round {round_no}", "ms": elapsed_ms,
                    "detail": (", ".join(tc["name"] for tc in tool_calls) if tool_calls else content)[:500],
                }})

                if not tool_calls:
                    # Format-slip guard: a response that leaks renderer
                    # channel markers or narrates an "Action:" it never took
                    # is a failed tool call, not a final answer (observed
                    # live under long context). Nudge once per occurrence,
                    # bounded so a persistently confused model still exits.
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
                        emit({"type": "thought", "round": round_no,
                              "thought": "Model narrated an action instead of calling a tool — nudging it to emit the real call.",
                              "action": "retry"})
                        continue
                    # No tool calls -> this IS the final answer. Strip any
                    # leaked channel markers rather than showing them raw.
                    answer = (content or answer).replace("<channel|>", "").replace("<|channel|>", "").strip()
                    break

                lc_messages.append(ai)
                for tc in tool_calls:
                    name, args, call_id = tc["name"], tc.get("args") or {}, tc.get("id", "")
                    tool_fn = tools_by_name.get(name)
                    tt0 = time.time()
                    if tool_fn is None:
                        result = f"Error: unknown tool '{name}'."
                    else:
                        try:
                            result = tool_fn.invoke(args)
                        except Exception as e:
                            result = f"Error running {name}: {e}"
                    result = result if isinstance(result, str) else str(result)
                    tool_event = {"type": "tool_result", "tool": name,
                                  "input": str(args)[:200], "result": result[:500]}
                    diff = get_last_diff() if name in ("write_file", "edit_section", "append_to_file") else None
                    if diff:
                        tool_event["diff"] = diff
                    emit(tool_event)
                    emit({"type": "span", "span": {
                        "id": _new_span_id(), "parent_id": span_id, "type": "tool",
                        "label": name, "ms": int((time.time() - tt0) * 1000),
                        "detail": result[:500],
                    }})
                    lc_messages.append(ToolMessage(content=result, tool_call_id=call_id, name=name))
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
