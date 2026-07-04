import json
import time
import uuid
from pathlib import Path
from typing import Annotated, List, Tuple, TypedDict

from langchain_core.messages import AIMessage, HumanMessage, SystemMessage
from langchain_ollama import ChatOllama
from langgraph.graph import END, StateGraph
from langgraph.prebuilt import create_react_agent
from langfuse import Langfuse

from tools import RESEARCH_TOOLS


def _new_span_id():
    return uuid.uuid4().hex[:8]


MODEL = "ornith:9b"
HARNESS_NAME = "research-critic"
_BASE_SYSTEM_PROMPT = (Path(__file__).parent.parent.parent / "docs" / "ornith-system-prompt.md").read_text(encoding="utf-8")
# "Research + Critic" — a genuine generate -> critique -> revise loop
# (bounded rounds), distinct from every other harness's graph shape.
# Simplified from the original phase-4 design doc's multi-layer critic
# pipeline (Fact/Gap/Logic/Efficiency/Sign-off + parallel scouts) to a single
# critic pass per round — still a real, working revision loop, not a
# rebranded ReAct clone, and buildable/testable within this session's scope.
SYSTEM_PROMPT = _BASE_SYSTEM_PROMPT + """

## Research + Critic harness (this harness only)

You are the RESEARCHER. Use web_search/wikipedia/memory tools to answer the
user's question thoroughly, then give your best draft answer. A critic will
review it; if it requests changes, revise using its feedback.
"""
OLLAMA_TIMEOUT = 600  # see identical note in p4-agent-to-agent/agent.py
MAX_CRITIC_ROUNDS = 3

langfuse = Langfuse(
    public_key="pk-lf-df92732e-8905-4eea-a561-4a906b963471",
    secret_key="sk-lf-42a96bc1-2d67-4741-a7c7-598c4a2506a9",
    host="http://localhost:3000",
)

CRITIC_PROMPT = (
    "You are a strict critic reviewing a draft answer against the ORIGINAL "
    "question. Check: does it actually answer the question, is it factually "
    "plausible, is it appropriately concise. Respond ONLY with JSON: "
    '{"approved": true} if the draft is good enough to send, or '
    '{"approved": false, "feedback": "<specific, actionable revision request>"} '
    "if not. Don't nitpick — approve reasonable answers."
)

_cache = {}

def _for_model(model: str):
    if model not in _cache:
        gen_llm = ChatOllama(model=model, keep_alive="6h", client_kwargs={"timeout": OLLAMA_TIMEOUT})
        critic_llm = ChatOllama(model=model, keep_alive="6h", format="json", client_kwargs={"timeout": OLLAMA_TIMEOUT})
        generator = create_react_agent(gen_llm, tools=RESEARCH_TOOLS, prompt=SYSTEM_PROMPT)
        _cache[model] = (generator, critic_llm)
    return _cache[model]


class CriticState(TypedDict):
    input: str
    draft: str
    rounds: Annotated[List[Tuple[str, str]], lambda a, b: a + b]  # (draft, feedback)
    approved: bool


def _parse_json(raw: str) -> dict:
    try:
        return json.loads(raw)
    except Exception:
        return {}


def run_agent(messages, on_event=None, max_rounds=10, depth=0, allowed_tools=None, span_id=None, parent_span_id=None, model=None):
    def emit(evt):
        if on_event:
            on_event(evt)

    span_id = span_id or _new_span_id()
    agent_start = time.time()
    emit({"type": "span", "span": {
        "id": span_id, "parent_id": parent_span_id, "type": "agent",
        "label": "research-critic-agent", "agent": "research-critic", "ms": 0,
    }})

    generator, critic_llm = _for_model(model or MODEL)
    user_task = messages[-1]["content"]
    round_counter = [0]

    def draft_node(state: CriticState):
        round_counter[0] += 1
        t0 = time.time()
        prior_feedback = state["rounds"][-1][1] if state["rounds"] else None
        prompt = state["input"] if not prior_feedback else (
            f"Original question: {state['input']}\n\n"
            f"Your previous draft: {state['draft']}\n\n"
            f"Critic feedback to address: {prior_feedback}\n\n"
            "Revise your answer accordingly."
        )
        seen = 0
        last_answer = ""
        for sub_state in generator.stream({"messages": [HumanMessage(content=prompt)]}, stream_mode="values"):
            all_msgs = sub_state["messages"]
            new_msgs = all_msgs[seen:]
            seen = len(all_msgs)
            for msg in new_msgs:
                if isinstance(msg, AIMessage):
                    text = msg.content if isinstance(msg.content, str) else str(msg.content)
                    tool_calls = getattr(msg, "tool_calls", None) or []
                    if not tool_calls and text:
                        last_answer = text
                elif type(msg).__name__ == "ToolMessage":
                    tool_name = getattr(msg, "name", "tool")
                    result_text = msg.content if isinstance(msg.content, str) else str(msg.content)
                    emit({"type": "tool_result", "tool": tool_name, "input": "", "result": result_text[:500]})
                    emit({"type": "span", "span": {
                        "id": _new_span_id(), "parent_id": span_id, "type": "tool",
                        "label": tool_name, "ms": 0, "detail": result_text[:500],
                    }})
        emit({"type": "thought", "round": round_counter[0],
              "thought": f"Draft: {last_answer[:200]}", "action": "draft"})
        emit({"type": "span", "span": {
            "id": _new_span_id(), "parent_id": span_id, "type": "llm",
            "label": "researcher", "ms": int((time.time() - t0) * 1000), "detail": last_answer[:500],
        }})
        return {"draft": last_answer}

    def critic_node(state: CriticState):
        round_counter[0] += 1
        t0 = time.time()
        raw = critic_llm.invoke([
            SystemMessage(content=CRITIC_PROMPT),
            HumanMessage(content=f"Original question: {state['input']}\n\nDraft answer: {state['draft']}"),
        ]).content
        parsed = _parse_json(raw)
        approved = bool(parsed.get("approved"))
        feedback = parsed.get("feedback", "")
        emit({"type": "thought", "round": round_counter[0],
              "thought": f"Critic: {'approved' if approved else feedback}", "action": "critic"})
        emit({"type": "span", "span": {
            "id": _new_span_id(), "parent_id": span_id, "type": "llm",
            "label": "critic", "ms": int((time.time() - t0) * 1000), "detail": raw[:500],
        }})
        return {"approved": approved, "rounds": [(state["draft"], feedback)]}

    def route(state: CriticState):
        if state.get("approved") or len(state["rounds"]) >= MAX_CRITIC_ROUNDS:
            return END
        return "draft"

    graph = StateGraph(CriticState)
    graph.add_node("draft", draft_node)
    graph.add_node("critic", critic_node)
    graph.set_entry_point("draft")
    graph.add_edge("draft", "critic")
    graph.add_conditional_edges("critic", route, {"draft": "draft", END: END})
    compiled = graph.compile()

    with langfuse.start_as_current_observation(
        name="research-critic-agent", input={"query": user_task},
        metadata={"model": model or MODEL, "phase": "p6-specialization"},
    ) as trace:
        answer = "Agent hit max rounds without finishing."
        try:
            final_state = compiled.invoke(
                {"input": user_task, "draft": "", "rounds": [], "approved": False},
                {"recursion_limit": MAX_CRITIC_ROUNDS * 4 + 4},
            )
            answer = final_state.get("draft") or answer
        except Exception as e:
            emit({"type": "error", "round": round_counter[0], "message": str(e)})
            answer = f"Agent error: {e}"

        trace.update(output=answer)
        emit({"type": "span", "span": {
            "id": span_id, "parent_id": parent_span_id, "type": "agent",
            "label": "research-critic-agent", "agent": "research-critic",
            "ms": int((time.time() - agent_start) * 1000),
        }})
        langfuse.flush()
        return answer
