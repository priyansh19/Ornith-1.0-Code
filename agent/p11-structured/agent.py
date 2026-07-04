import json
import time
import uuid
from pathlib import Path
from typing import Literal

from langchain_core.messages import AIMessage, HumanMessage, SystemMessage
from langchain_ollama import ChatOllama
from langgraph.prebuilt import create_react_agent
from langfuse import Langfuse
from pydantic import BaseModel, Field, ValidationError

from tools import LC_TOOLS


def _new_span_id():
    return uuid.uuid4().hex[:8]


MODEL = "ornith:9b"
HARNESS_NAME = "structured"
_BASE_SYSTEM_PROMPT = (Path(__file__).parent.parent.parent / "docs" / "ornith-system-prompt.md").read_text(encoding="utf-8")
# The one capability none of the other 9 harnesses have: schema-VALIDATED
# structured output, not just free text. First attempt used
# langchain.agents.create_agent's automatic response_format middleware, but
# ornith:9b's strong JSON-ReAct habit (baked into the shared base system
# prompt every harness inherits) interfered with it — the model emitted
# JSON-shaped TEXT instead of engaging the structuring pathway, and
# structured_response never got populated (confirmed via a real failed live
# test). Fixed by making the structuring step an explicit, separate call
# instead of an automatic one: a normal ReAct loop (langgraph.prebuilt,
# the same proven-reliable pattern as p7/p8/p9/p10) produces a plain-text
# answer, then ONE more constrained-JSON call converts and Pydantic-validates
# it into the schema. Still genuinely schema-validated output — just built
# on the reliable primitive instead of a framework feature that didn't
# actually work with this model.
SYSTEM_PROMPT = _BASE_SYSTEM_PROMPT + """

## Structured-output harness (this harness only)

Answer the user's question using tools as needed, then give your final
answer in plain text. It will be converted into a structured record
(answer, confidence, sources used) as a separate step after you're done —
just answer normally.
"""
OLLAMA_TIMEOUT = 600  # see identical note in p4-agent-to-agent/agent.py

STRUCTURE_PROMPT = (
    'Convert the draft answer below into JSON matching EXACTLY this shape: '
    '{"answer": "<the direct answer>", "confidence": "high"|"medium"|"low", '
    '"sources_used": ["<tool name>", ...]} — sources_used should list which '
    "tools (if any) were used to produce the answer, from the trace given. "
    "Respond with ONLY the JSON object, nothing else."
)


class StructuredAnswer(BaseModel):
    """The final validated response shape for this harness."""

    answer: str = Field(description="The direct answer to the user's question")
    confidence: Literal["high", "medium", "low"] = Field(
        description="How confident the answer is, given what tools/knowledge were available"
    )
    sources_used: list[str] = Field(
        default_factory=list, description="Names of tools actually used while answering (empty if none)"
    )


langfuse = Langfuse(
    public_key="pk-lf-df92732e-8905-4eea-a561-4a906b963471",
    secret_key="sk-lf-42a96bc1-2d67-4741-a7c7-598c4a2506a9",
    host="http://localhost:3000",
)

_cache = {}

def _for_model(model: str):
    if model not in _cache:
        react_llm = ChatOllama(model=model, keep_alive="6h", client_kwargs={"timeout": OLLAMA_TIMEOUT})
        structure_llm = ChatOllama(model=model, keep_alive="6h", format="json", client_kwargs={"timeout": OLLAMA_TIMEOUT})
        graph = create_react_agent(react_llm, tools=LC_TOOLS, prompt=SYSTEM_PROMPT)
        _cache[model] = (graph, structure_llm)
    return _cache[model]


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
        "label": "structured-agent", "agent": "structured", "ms": 0,
    }})

    graph, structure_llm = _for_model(model or MODEL)
    lc_messages = [_to_lc_message(m) for m in messages if m["role"] != "system"]
    round_num = 0
    tools_used = []

    with langfuse.start_as_current_observation(
        name="structured-agent", input={"query": messages[-1]["content"]},
        metadata={"model": model or MODEL, "phase": "p11-structured"},
    ) as trace:
        answer = None
        try:
            seen = 0
            last_yield = time.time()
            draft = ""
            for state in graph.stream({"messages": lc_messages}, {"recursion_limit": max_rounds * 2 + 2}, stream_mode="values"):
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
                        emit({"type": "thought", "round": round_num, "thought": text, "action": action})
                        emit({"type": "span", "span": {
                            "id": _new_span_id(), "parent_id": span_id, "type": "llm",
                            "label": "thought", "ms": step_ms, "detail": text,
                        }})
                        if not tool_calls and text:
                            draft = text
                    elif type(msg).__name__ == "ToolMessage":
                        tool_name = getattr(msg, "name", "tool")
                        tools_used.append(tool_name)
                        result_text = msg.content if isinstance(msg.content, str) else str(msg.content)
                        emit({"type": "tool_result", "tool": tool_name, "input": "", "result": result_text[:500]})
                        emit({"type": "span", "span": {
                            "id": _new_span_id(), "parent_id": span_id, "type": "tool",
                            "label": tool_name, "ms": step_ms, "detail": result_text[:500],
                        }})

            # Explicit structuring pass — a real, separate constrained-JSON
            # call, Pydantic-validated before it's ever trusted as the answer.
            t0 = time.time()
            raw = structure_llm.invoke([
                SystemMessage(content=STRUCTURE_PROMPT),
                HumanMessage(content=f"Draft answer: {draft}\n\nTools used: {tools_used or 'none'}"),
            ]).content
            emit({"type": "span", "span": {
                "id": _new_span_id(), "parent_id": span_id, "type": "llm",
                "label": "structure", "ms": int((time.time() - t0) * 1000), "detail": raw[:500],
            }})
            try:
                structured = StructuredAnswer.model_validate(json.loads(raw))
                answer = (
                    f"{structured.answer}\n\n(confidence: {structured.confidence}"
                    + (f", sources: {', '.join(structured.sources_used)}" if structured.sources_used else "")
                    + ")"
                )
            except (json.JSONDecodeError, ValidationError) as ve:
                emit({"type": "error", "round": round_num + 1, "message": f"Structuring validation failed: {ve}"})
                answer = draft or "Agent hit max rounds without finishing."

        except Exception as e:
            emit({"type": "error", "round": round_num + 1, "message": str(e)})
            answer = f"Agent error: {e}"

        trace.update(output=answer)
        emit({"type": "span", "span": {
            "id": span_id, "parent_id": parent_span_id, "type": "agent",
            "label": "structured-agent", "agent": "structured",
            "ms": int((time.time() - agent_start) * 1000),
        }})
        langfuse.flush()
        return answer
