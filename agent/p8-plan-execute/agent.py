import json
import operator
import time
import uuid
from pathlib import Path
from typing import Annotated, List, Tuple, TypedDict

from langchain_core.messages import AIMessage, HumanMessage, SystemMessage
from langchain_ollama import ChatOllama
from langgraph.graph import END, StateGraph
from langgraph.prebuilt import create_react_agent
from langfuse import Langfuse

from tools import LC_TOOLS


def _new_span_id():
    return uuid.uuid4().hex[:8]


MODEL = "ornith:9b"
HARNESS_NAME = "plan-execute"
_BASE_SYSTEM_PROMPT = (Path(__file__).parent.parent.parent / "docs" / "ornith-system-prompt.md").read_text(encoding="utf-8")
# Distinct graph shape from p7-langgraph: instead of one flat ReAct loop, a
# planner node breaks the task into steps, an executor node (itself a small
# ReAct sub-agent) carries out ONE step at a time, and a replanner node
# decides after each step whether to revise the remaining plan or finish.
# This is the standard LangGraph "plan-and-execute" pattern — a real,
# structurally different graph, not a relabeled clone of p7.
SYSTEM_PROMPT = _BASE_SYSTEM_PROMPT + """

## Plan-Execute harness (this harness only)

Your work is broken into: a PLAN (ordered steps), then EXECUTION of one step
at a time using tools, then REPLANNING after each step. You will only ever
see one step at a time as the executor — focus on completing exactly that
step with the tools available, then report your result plainly.
"""
OLLAMA_TIMEOUT = 600  # see identical note in p4-agent-to-agent/agent.py

langfuse = Langfuse(
    public_key="pk-lf-df92732e-8905-4eea-a561-4a906b963471",
    secret_key="sk-lf-42a96bc1-2d67-4741-a7c7-598c4a2506a9",
    host="http://localhost:3000",
)

PLANNER_PROMPT = (
    "Break the user's request into 2-5 concrete, ordered steps needed to fully "
    'answer it. Respond ONLY with JSON: {"steps": ["step 1", "step 2", ...]}. '
    "If the request is trivial (answerable directly), respond with a single-step plan."
)
REPLANNER_PROMPT = (
    "You are revising a plan given what's been done so far. If the original "
    "request has now been fully answered, respond ONLY with JSON: "
    '{"done": true, "answer": "<final answer to the user>"}. Otherwise respond '
    'ONLY with JSON: {"done": false, "steps": ["remaining step 1", ...]} — the '
    "remaining steps still needed (do not repeat completed work)."
)
EXECUTOR_PROMPT = (
    "You are executing exactly ONE step of a larger plan. Use tools as needed "
    "to complete this specific step, then give a concise plain-text result. "
    "Do not attempt other steps."
)

# Separate model instances: the planner/replanner need strict JSON output,
# the executor needs native tool-calling (mutually exclusive Ollama modes).
# Built per requested model (cheap — no network I/O at construction time) and
# cached, so the UI's model picker actually takes effect instead of every
# harness silently ignoring it in favor of a hardcoded constant.
_llm_cache = {}

def _llms_for(model: str):
    if model not in _llm_cache:
        plan_llm = ChatOllama(model=model, keep_alive="6h", format="json", client_kwargs={"timeout": OLLAMA_TIMEOUT})
        exec_llm = ChatOllama(model=model, keep_alive="6h", client_kwargs={"timeout": OLLAMA_TIMEOUT})
        executor_graph = create_react_agent(exec_llm, tools=LC_TOOLS, prompt=EXECUTOR_PROMPT)
        _llm_cache[model] = (plan_llm, executor_graph)
    return _llm_cache[model]


class PlanState(TypedDict):
    input: str
    plan: List[str]
    past_steps: Annotated[List[Tuple[str, str]], operator.add]
    response: str


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
        "label": "plan-execute-agent", "agent": "plan-execute", "ms": 0,
    }})

    plan_llm, executor_graph = _llms_for(model or MODEL)
    user_task = messages[-1]["content"]
    round_counter = [0]

    def planner_node(state: PlanState):
        round_counter[0] += 1
        t0 = time.time()
        raw = plan_llm.invoke([
            SystemMessage(content=PLANNER_PROMPT),
            HumanMessage(content=state["input"]),
        ]).content
        plan = _parse_json(raw).get("steps") or [state["input"]]
        emit({"type": "thought", "round": round_counter[0],
              "thought": f"Plan: {'; '.join(plan)}", "action": "plan"})
        emit({"type": "span", "span": {
            "id": _new_span_id(), "parent_id": span_id, "type": "llm",
            "label": "planner", "ms": int((time.time() - t0) * 1000), "detail": raw[:500],
        }})
        return {"plan": plan}

    def executor_node(state: PlanState):
        round_counter[0] += 1
        step = state["plan"][0]
        t0 = time.time()
        seen = 0
        last_answer = ""
        for sub_state in executor_graph.stream({"messages": [HumanMessage(content=step)]}, stream_mode="values"):
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
              "thought": f"Step done: {step} -> {last_answer[:200]}", "action": "execute"})
        emit({"type": "span", "span": {
            "id": _new_span_id(), "parent_id": span_id, "type": "llm",
            "label": "executor", "ms": int((time.time() - t0) * 1000), "detail": last_answer[:500],
        }})
        return {"past_steps": [(step, last_answer)], "plan": state["plan"][1:]}

    def replanner_node(state: PlanState):
        round_counter[0] += 1
        t0 = time.time()
        history = "\n".join(f"- {s}: {r}" for s, r in state["past_steps"])
        raw = plan_llm.invoke([
            SystemMessage(content=REPLANNER_PROMPT),
            HumanMessage(content=f"Original request: {state['input']}\n\nCompleted so far:\n{history}\n\nRemaining planned steps: {state['plan']}"),
        ]).content
        parsed = _parse_json(raw)
        emit({"type": "span", "span": {
            "id": _new_span_id(), "parent_id": span_id, "type": "llm",
            "label": "replanner", "ms": int((time.time() - t0) * 1000), "detail": raw[:500],
        }})
        if parsed.get("done"):
            answer = parsed.get("answer", history)
            emit({"type": "thought", "round": round_counter[0], "thought": "Plan complete.", "action": "finish"})
            return {"response": answer}
        return {"plan": parsed.get("steps") or []}

    def should_continue(state: PlanState):
        return END if state.get("response") else "executor"

    graph = StateGraph(PlanState)
    graph.add_node("planner", planner_node)
    graph.add_node("executor", executor_node)
    graph.add_node("replanner", replanner_node)
    graph.set_entry_point("planner")
    graph.add_edge("planner", "executor")
    graph.add_edge("executor", "replanner")
    graph.add_conditional_edges("replanner", should_continue, {"executor": "executor", END: END})
    compiled = graph.compile()

    with langfuse.start_as_current_observation(
        name="plan-execute-agent", input={"query": user_task},
        metadata={"model": model or MODEL, "phase": "p8-plan-execute"},
    ) as trace:
        answer = "Agent hit max rounds without finishing."
        try:
            final_state = compiled.invoke(
                {"input": user_task, "plan": [], "past_steps": [], "response": ""},
                {"recursion_limit": max_rounds * 3 + 3},
            )
            answer = final_state.get("response") or answer
        except Exception as e:
            emit({"type": "error", "round": round_counter[0], "message": str(e)})
            answer = f"Agent error: {e}"

        trace.update(output=answer)
        emit({"type": "span", "span": {
            "id": span_id, "parent_id": parent_span_id, "type": "agent",
            "label": "plan-execute-agent", "agent": "plan-execute",
            "ms": int((time.time() - agent_start) * 1000),
        }})
        langfuse.flush()
        return answer
