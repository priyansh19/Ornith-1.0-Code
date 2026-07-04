import json
import time
import uuid
from pathlib import Path
from typing import Annotated, List, TypedDict

from langchain_core.messages import AIMessage, HumanMessage, SystemMessage
from langchain_ollama import ChatOllama
from langgraph.graph import END, StateGraph
from langgraph.prebuilt import create_react_agent
from langfuse import Langfuse

from tools import RESEARCH_TOOLS, CODE_TOOLS


def _new_span_id():
    return uuid.uuid4().hex[:8]


MODEL = "ornith:9b"
HARNESS_NAME = "supervisor"
_BASE_SYSTEM_PROMPT = (Path(__file__).parent.parent.parent / "docs" / "ornith-system-prompt.md").read_text(encoding="utf-8")
# Distinct from both p7 (single ReAct loop) and p8 (fixed plan): a supervisor
# node dynamically decides, after EVERY sub-agent turn, which specialized
# agent should act next (or whether to finish) — the classic LangGraph
# multi-agent supervisor pattern, real routing rather than a hand-rolled
# dispatcher.
SYSTEM_PROMPT = _BASE_SYSTEM_PROMPT + """

## Supervisor harness (this harness only)

You are one of two specialist agents working under a supervisor: "researcher"
(web search, Wikipedia, memory) or "coder" (workspace files, shell, memory).
You'll only ever be invoked for the part of the task that matches your role —
do that part, then report your result plainly. Don't attempt the other
agent's job.
"""
OLLAMA_TIMEOUT = 600  # see identical note in p4-agent-to-agent/agent.py

langfuse = Langfuse(
    public_key="pk-lf-df92732e-8905-4eea-a561-4a906b963471",
    secret_key="sk-lf-42a96bc1-2d67-4741-a7c7-598c4a2506a9",
    host="http://localhost:3000",
)

SUPERVISOR_PROMPT = (
    "You route a task between two agents: \"researcher\" (web search, "
    "Wikipedia lookups, memory) and \"coder\" (workspace files, shell "
    "commands, memory). Given the task and what's been done so far, "
    'respond ONLY with JSON: {"next": "researcher"} or {"next": "coder"} or, '
    'once the task is fully answered, {"next": "finish", "answer": "<final answer>"}. '
    "Never route to the same idle work twice — if an agent already answered "
    "the relevant part, finish."
)
RESEARCHER_PROMPT = (
    "You are the RESEARCHER agent. Use web_search/wikipedia/memory tools to "
    "find the information needed for your assigned part of the task, then "
    "report your findings concisely in plain text."
)
CODER_PROMPT = (
    "You are the CODER agent. Use workspace file/shell/memory tools to carry "
    "out your assigned part of the task, then report the result concisely "
    "in plain text."
)

_cache = {}

def _for_model(model: str):
    if model not in _cache:
        sup_llm = ChatOllama(model=model, keep_alive="6h", format="json", client_kwargs={"timeout": OLLAMA_TIMEOUT})
        researcher_llm = ChatOllama(model=model, keep_alive="6h", client_kwargs={"timeout": OLLAMA_TIMEOUT})
        coder_llm = ChatOllama(model=model, keep_alive="6h", client_kwargs={"timeout": OLLAMA_TIMEOUT})
        researcher = create_react_agent(researcher_llm, tools=RESEARCH_TOOLS, prompt=RESEARCHER_PROMPT)
        coder = create_react_agent(coder_llm, tools=CODE_TOOLS, prompt=CODER_PROMPT)
        _cache[model] = (sup_llm, researcher, coder)
    return _cache[model]


class SupervisorState(TypedDict):
    input: str
    history: Annotated[List[str], lambda a, b: a + b]
    answer: str
    # Must be declared here to actually persist across nodes — a key
    # returned from a node but absent from the state schema is silently
    # dropped by LangGraph, which is exactly what made routing look decided
    # (the "Route -> researcher" thought fired) but never actually happen
    # (the conditional edge read back None and went straight to END).
    next_agent: str


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
        "label": "supervisor-agent", "agent": "supervisor", "ms": 0,
    }})

    sup_llm, researcher, coder = _for_model(model or MODEL)
    user_task = messages[-1]["content"]
    round_counter = [0]

    def run_subagent(role: str, graph, task: str, t0: float):
        seen = 0
        last_answer = ""
        for sub_state in graph.stream({"messages": [HumanMessage(content=task)]}, stream_mode="values"):
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
                    emit({"type": "tool_result", "tool": f"{role}:{tool_name}", "input": "", "result": result_text[:500]})
                    emit({"type": "span", "span": {
                        "id": _new_span_id(), "parent_id": span_id, "type": "tool",
                        "label": tool_name, "ms": 0, "detail": result_text[:500],
                    }})
        emit({"type": "span", "span": {
            "id": _new_span_id(), "parent_id": span_id, "type": "llm",
            "label": role, "ms": int((time.time() - t0) * 1000), "detail": last_answer[:500],
        }})
        return last_answer

    def supervisor_node(state: SupervisorState):
        round_counter[0] += 1
        t0 = time.time()
        history = "\n".join(state["history"]) or "(nothing done yet)"
        raw = sup_llm.invoke([
            SystemMessage(content=SUPERVISOR_PROMPT),
            HumanMessage(content=f"Task: {state['input']}\n\nDone so far:\n{history}"),
        ]).content
        parsed = _parse_json(raw)
        emit({"type": "span", "span": {
            "id": _new_span_id(), "parent_id": span_id, "type": "llm",
            "label": "supervisor", "ms": int((time.time() - t0) * 1000), "detail": raw[:500],
        }})
        nxt = parsed.get("next", "finish")
        emit({"type": "thought", "round": round_counter[0],
              "thought": f"Route -> {nxt}", "action": nxt})
        if nxt == "finish":
            return {"answer": parsed.get("answer", history), "next_agent": "finish"}
        return {"answer": "", "next_agent": nxt}

    def researcher_node(state: SupervisorState):
        round_counter[0] += 1
        t0 = time.time()
        result = run_subagent("researcher", researcher, state["input"], t0)
        emit({"type": "thought", "round": round_counter[0],
              "thought": f"Researcher: {result[:200]}", "action": "researcher"})
        return {"history": [f"researcher: {result}"]}

    def coder_node(state: SupervisorState):
        round_counter[0] += 1
        t0 = time.time()
        result = run_subagent("coder", coder, state["input"], t0)
        emit({"type": "thought", "round": round_counter[0],
              "thought": f"Coder: {result[:200]}", "action": "coder"})
        return {"history": [f"coder: {result}"]}

    def route(state: SupervisorState):
        nxt = state.get("next_agent")
        if nxt in ("researcher", "coder"):
            return nxt
        return END

    graph = StateGraph(SupervisorState)
    graph.add_node("supervisor", supervisor_node)
    graph.add_node("researcher", researcher_node)
    graph.add_node("coder", coder_node)
    graph.set_entry_point("supervisor")
    graph.add_conditional_edges("supervisor", route, {"researcher": "researcher", "coder": "coder", END: END})
    graph.add_edge("researcher", "supervisor")
    graph.add_edge("coder", "supervisor")
    compiled = graph.compile()

    with langfuse.start_as_current_observation(
        name="supervisor-agent", input={"query": user_task},
        metadata={"model": model or MODEL, "phase": "p9-supervisor"},
    ) as trace:
        answer = "Agent hit max rounds without finishing."
        try:
            final_state = compiled.invoke(
                {"input": user_task, "history": [], "answer": "", "next_agent": ""},
                {"recursion_limit": max_rounds * 3 + 3},
            )
            answer = final_state.get("answer") or answer
        except Exception as e:
            emit({"type": "error", "round": round_counter[0], "message": str(e)})
            answer = f"Agent error: {e}"

        trace.update(output=answer)
        emit({"type": "span", "span": {
            "id": span_id, "parent_id": parent_span_id, "type": "agent",
            "label": "supervisor-agent", "agent": "supervisor",
            "ms": int((time.time() - agent_start) * 1000),
        }})
        langfuse.flush()
        return answer
