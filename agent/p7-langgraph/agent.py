import time
import uuid
from pathlib import Path

from langchain_core.messages import AIMessage, HumanMessage, SystemMessage
from langchain_ollama import ChatOllama
from langgraph.prebuilt import create_react_agent
from langfuse import Langfuse

from tools import LC_TOOLS, get_last_diff


def _new_span_id():
    return uuid.uuid4().hex[:8]


MODEL = "ornith:9b"
HARNESS_NAME = "langgraph-react"
_BASE_SYSTEM_PROMPT = (Path(__file__).parent.parent.parent / "docs" / "ornith-system-prompt.md").read_text(encoding="utf-8")
# create_react_agent handles the think/act/observe loop itself via LangGraph's
# StateGraph (agent node <-> tools node, routed by whether the model's
# response carries tool_calls) — this harness doesn't hand-parse JSON the way
# p4/p5 do. The model uses Ollama's native structured tool-calling instead.
SYSTEM_PROMPT = _BASE_SYSTEM_PROMPT + """

## Native tool calling (this harness only)

This harness calls tools through structured tool-calling, not hand-written
JSON — just call the tool directly. Briefly explain your reasoning in plain
text, then call a tool if you need one. Once you have the final answer,
respond in plain text with no tool call. Memories you store with `remember`
are shared with every other harness in this app, not private to this one.
"""
# Measured on this machine (no GPU): a single real round can take minutes.
# See identical timeout note in p4-agent-to-agent/agent.py.
OLLAMA_TIMEOUT = 600

langfuse = Langfuse(
    public_key="pk-lf-df92732e-8905-4eea-a561-4a906b963471",
    secret_key="sk-lf-42a96bc1-2d67-4741-a7c7-598c4a2506a9",
    host="http://localhost:3000",
)

_graph_cache = {}

def _graph_for(model: str):
    # Building a ChatOllama/compiled graph does no network I/O — it's cheap
    # to construct per request. Cached per model name so switching back to a
    # model already used this process doesn't even pay that small cost twice.
    if model not in _graph_cache:
        llm = ChatOllama(model=model, keep_alive="6h", client_kwargs={"timeout": OLLAMA_TIMEOUT})
        _graph_cache[model] = create_react_agent(llm, tools=LC_TOOLS, prompt=SYSTEM_PROMPT)
    return _graph_cache[model]


def _to_lc_message(m):
    role = m["role"]
    if role == "system":
        return SystemMessage(content=m["content"])
    if role == "assistant":
        return AIMessage(content=m["content"])
    return HumanMessage(content=m["content"])


def run_agent(messages, on_event=None, max_rounds=10, depth=0, allowed_tools=None, span_id=None, parent_span_id=None, model=None):
    def emit(evt):
        if on_event:
            on_event(evt)

    span_id = span_id or _new_span_id()
    agent_start = time.time()
    emit({"type": "span", "span": {
        "id": span_id, "parent_id": parent_span_id, "type": "agent",
        "label": "langgraph-agent", "agent": "langgraph", "ms": 0,
    }})

    graph = _graph_for(model or MODEL)

    # System prompt is baked into the compiled graph's `prompt`, so only the
    # actual conversation turns need translating here.
    lc_messages = [_to_lc_message(m) for m in messages if m["role"] != "system"]

    with langfuse.start_as_current_observation(
        name="langgraph-agent",
        input={"query": messages[-1]["content"]},
        metadata={"model": model or MODEL, "phase": "p7-langgraph"},
    ) as trace:
        round_num = 0
        answer = None
        try:
            seen = 0
            # stream_mode="values" yields once per graph node execution (agent
            # node, then tools node, then agent node again, ...) — the time
            # between successive yields IS that node's real wall-clock
            # duration. Timing a message only after it's already in hand (the
            # earlier approach) always measured ~0ms, since the actual LLM/
            # tool work happens entirely before the yield arrives here.
            last_yield = time.time()
            for state in graph.stream(
                {"messages": lc_messages},
                {"recursion_limit": max_rounds * 2 + 2},
                stream_mode="values",
            ):
                now = time.time()
                step_ms = int((now - last_yield) * 1000)
                last_yield = now

                all_msgs = state["messages"]
                new_msgs = all_msgs[seen:]
                seen = len(all_msgs)

                for msg in new_msgs:
                    if isinstance(msg, AIMessage):
                        round_num += 1
                        text = msg.content if isinstance(msg.content, str) else str(msg.content)
                        tool_calls = getattr(msg, "tool_calls", None) or []
                        action = tool_calls[0]["name"] if tool_calls else "finish"
                        tokens = 0
                        if getattr(msg, "usage_metadata", None):
                            tokens = msg.usage_metadata.get("output_tokens", 0)

                        emit({"type": "thought", "round": round_num, "thought": text, "action": action})
                        emit({"type": "span", "span": {
                            "id": _new_span_id(), "parent_id": span_id, "type": "llm",
                            "label": "thought", "ms": step_ms,
                            "tokens": tokens, "detail": text,
                        }})
                        if not tool_calls:
                            answer = text

                    elif type(msg).__name__ == "ToolMessage":
                        tool_name = getattr(msg, "name", "tool")
                        result_text = msg.content if isinstance(msg.content, str) else str(msg.content)
                        diff = get_last_diff() if tool_name == "write_file" else None
                        tool_event = {"type": "tool_result", "tool": tool_name,
                                      "input": "", "result": result_text[:500]}
                        if diff:
                            tool_event["diff"] = diff
                        emit(tool_event)
                        emit({"type": "span", "span": {
                            "id": _new_span_id(), "parent_id": span_id, "type": "tool",
                            "label": tool_name, "ms": step_ms, "detail": result_text[:500],
                        }})

            if answer is None:
                answer = "Agent hit max rounds without finishing."

        except Exception as e:
            emit({"type": "error", "round": round_num + 1, "message": str(e)})
            answer = f"Agent error: {e}"

        trace.update(output=answer)
        emit({"type": "span", "span": {
            "id": span_id, "parent_id": parent_span_id, "type": "agent",
            "label": "langgraph-agent", "agent": "langgraph",
            "ms": int((time.time() - agent_start) * 1000),
        }})
        langfuse.flush()
        return answer
