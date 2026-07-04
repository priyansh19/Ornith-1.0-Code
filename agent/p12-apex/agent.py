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
from pydantic import BaseModel, Field, ValidationError

from tools import LC_TOOLS, recall_sync


def _new_span_id():
    return uuid.uuid4().hex[:8]


MODEL = "ornith:9b"
HARNESS_NAME = "apex"
_BASE_SYSTEM_PROMPT = (Path(__file__).parent.parent.parent / "docs" / "ornith-system-prompt.md").read_text(encoding="utf-8")
# Apex — the "best of all" combined harness: real LangGraph structure (p7),
# a plan -> execute -> critic -> replan loop (p8 + p6 combined, not either
# alone), scout-style bounded recursive delegation available as a tool (p4/
# p2), persistent memory auto-recalled before planning (p5), real embedding
# RAG (p10), and an explicit Pydantic-validated structured summary as the
# final step (p11's proven pattern — automatic response_format middleware
# didn't reliably work with this model, so this uses the same explicit
# second-call approach that DID work).
EXECUTOR_PROMPT = (
    "You are the EXECUTOR. You've been given ONE step of a larger plan — "
    "carry out exactly that step using the tools available (workspace "
    "search/files/shell, web/wiki research, calculator, persistent memory, "
    "and `spawn_scout` for delegating an independent bounded sub-task to a "
    "fresh agent if this step is itself complex). Report your result "
    "concisely in plain text when done."
)
# Required by server/main.py's load_session() to seed the persisted session
# history's first message — every harness module needs this attribute even
# though Apex's own run_agent doesn't read the system role out of `messages`
# (each internal node has its own purpose-built prompt instead).
SYSTEM_PROMPT = _BASE_SYSTEM_PROMPT + """

## Apex harness

This is the combined "best of all" harness — planning, execution with a
full tool set (research, workspace RAG, files, shell, persistent memory,
bounded scout delegation), critique/revision, and a final validated
structured summary all run automatically as part of one turn.
"""
OLLAMA_TIMEOUT = 600  # see identical note in p4-agent-to-agent/agent.py
MAX_STEP_ATTEMPTS = 2
MAX_SCOUT_DEPTH = 2

PLANNER_PROMPT = (
    "Break the user's request into 2-5 concrete, ordered steps needed to "
    "fully answer it, using any relevant prior context given. Respond ONLY "
    'with JSON: {"steps": ["step 1", "step 2", ...]}. Trivial requests get '
    "a single-step plan."
)
CRITIC_PROMPT = (
    "You are a strict critic reviewing whether a step's result actually "
    "satisfies that step's goal. Respond ONLY with JSON: "
    '{"approved": true} if it does, or {"approved": false, "feedback": '
    '"<specific, actionable revision request>"} if not. Don\'t nitpick — '
    "approve reasonable results."
)
REPLAN_PROMPT = (
    "Given the original request and everything completed so far, decide: "
    'if fully answered, respond ONLY with JSON: {"done": true, "answer": '
    '"<final answer>"}. Otherwise respond ONLY with JSON: {"done": false, '
    '"steps": ["remaining step 1", ...]} — remaining steps still needed '
    "(don't repeat completed work)."
)
STRUCTURE_PROMPT = (
    'Convert the draft answer below into JSON matching EXACTLY this shape: '
    '{"answer": "<the direct answer>", "confidence": "high"|"medium"|"low", '
    '"sources_used": ["<tool name>", ...]}. Respond with ONLY the JSON object.'
)


class StructuredAnswer(BaseModel):
    answer: str = Field(description="The direct final answer to the user's request")
    confidence: str = Field(description='"high", "medium", or "low"')
    sources_used: list[str] = Field(default_factory=list)


langfuse = Langfuse(
    public_key="pk-lf-df92732e-8905-4eea-a561-4a906b963471",
    secret_key="sk-lf-42a96bc1-2d67-4741-a7c7-598c4a2506a9",
    host="http://localhost:3000",
)

_cache = {}

def _for_model(model: str):
    if model not in _cache:
        json_llm = ChatOllama(model=model, keep_alive="6h", format="json", client_kwargs={"timeout": OLLAMA_TIMEOUT})
        exec_llm = ChatOllama(model=model, keep_alive="6h", client_kwargs={"timeout": OLLAMA_TIMEOUT})
        _cache[model] = {"json_llm": json_llm, "exec_llm": exec_llm, "executors": {}}
    return _cache[model]


def _parse_json(raw: str) -> dict:
    try:
        return json.loads(raw)
    except Exception:
        return {}


class ApexState(TypedDict):
    input: str
    memory_context: str
    plan: List[str]
    history: Annotated[List[str], lambda a, b: a + b]
    step_attempts: int
    critic_feedback: str
    approved: bool
    response: str
    done: bool


def run_agent(messages, on_event=None, max_rounds=10, depth=0, allowed_tools=None, span_id=None, parent_span_id=None, model=None):
    def emit(evt):
        if on_event:
            on_event(evt)

    span_id = span_id or _new_span_id()
    agent_start = time.time()
    emit({"type": "span", "span": {
        "id": span_id, "parent_id": parent_span_id, "type": "agent",
        "label": "apex-agent" if depth == 0 else f"scout (depth {depth})",
        "agent": "apex" if depth == 0 else "scout", "ms": 0,
    }})

    cache = _for_model(model or MODEL)
    json_llm, exec_llm = cache["json_llm"], cache["exec_llm"]
    user_task = messages[-1]["content"]
    round_counter = [0]

    def get_executor():
        # Built lazily (needs `emit`/`span_id` from this closure for
        # spawn_scout's nested tracing) and cached per model — cheap either
        # way since no network I/O happens at construction time.
        key = (depth, id(emit))
        if key not in cache["executors"]:
            tools = list(LC_TOOLS)
            if depth < MAX_SCOUT_DEPTH:
                def spawn_scout(mission: str) -> str:
                    """Delegate an independent, bounded sub-task to a fresh nested agent and return its report."""
                    return _spawn_scout(mission, depth=depth + 1, on_event=on_event, parent_span_id=span_id, model=model)
                spawn_scout.__name__ = "spawn_scout"
                from langchain_core.tools import tool as _tool_dec
                tools.append(_tool_dec(spawn_scout))
            cache["executors"][key] = create_react_agent(exec_llm, tools=tools, prompt=EXECUTOR_PROMPT)
        return cache["executors"][key]

    def run_executor(step: str, feedback: str = "") -> Tuple[str, float]:
        t0 = time.time()
        task = step if not feedback else f"{step}\n\nPrevious attempt's critic feedback to address: {feedback}"
        executor = get_executor()
        seen = 0
        last_answer = ""
        for sub_state in executor.stream({"messages": [HumanMessage(content=task)]}, stream_mode="values"):
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
                    from tools import get_last_diff
                    diff = get_last_diff() if tool_name == "write_file" else None
                    tool_event = {"type": "tool_result", "tool": tool_name, "input": "", "result": result_text[:500]}
                    if diff:
                        tool_event["diff"] = diff
                    emit(tool_event)
                    emit({"type": "span", "span": {
                        "id": _new_span_id(), "parent_id": span_id, "type": "tool",
                        "label": tool_name, "ms": 0, "detail": result_text[:500],
                    }})
        return last_answer, time.time() - t0

    def planner_node(state: ApexState):
        round_counter[0] += 1
        t0 = time.time()
        raw = json_llm.invoke([
            SystemMessage(content=PLANNER_PROMPT),
            HumanMessage(content=f"Request: {state['input']}\n\nRelevant prior memory:\n{state['memory_context']}"),
        ]).content
        plan = _parse_json(raw).get("steps") or [state["input"]]
        emit({"type": "thought", "round": round_counter[0], "thought": f"Plan: {'; '.join(plan)}", "action": "plan"})
        emit({"type": "span", "span": {
            "id": _new_span_id(), "parent_id": span_id, "type": "llm",
            "label": "planner", "ms": int((time.time() - t0) * 1000), "detail": raw[:500],
        }})
        return {"plan": plan}

    def executor_node(state: ApexState):
        round_counter[0] += 1
        step = state["plan"][0]
        result, elapsed = run_executor(step, state.get("critic_feedback", ""))
        emit({"type": "thought", "round": round_counter[0],
              "thought": f"Step: {step} -> {result[:200]}", "action": "execute"})
        emit({"type": "span", "span": {
            "id": _new_span_id(), "parent_id": span_id, "type": "llm",
            "label": "executor", "ms": int(elapsed * 1000), "detail": result[:500],
        }})
        return {"history": [f"{step}: {result}"], "critic_feedback": ""}

    def critic_node(state: ApexState):
        round_counter[0] += 1
        t0 = time.time()
        last_entry = state["history"][-1] if state["history"] else ""
        raw = json_llm.invoke([
            SystemMessage(content=CRITIC_PROMPT),
            HumanMessage(content=f"Step goal: {state['plan'][0] if state['plan'] else ''}\n\nResult: {last_entry}"),
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
        attempts = state["step_attempts"] + (0 if approved else 1)
        return {"approved": approved or attempts >= MAX_STEP_ATTEMPTS, "critic_feedback": feedback, "step_attempts": attempts}

    def replan_node(state: ApexState):
        round_counter[0] += 1
        t0 = time.time()
        remaining_plan = state["plan"][1:]
        history_text = "\n".join(state["history"]) or "(nothing done yet)"
        if remaining_plan:
            # More steps already known — just advance, no need to ask the
            # model again (saves a full round-trip on this hardware).
            emit({"type": "thought", "round": round_counter[0],
                  "thought": f"Step approved. {len(remaining_plan)} step(s) remaining.", "action": "advance"})
            return {"plan": remaining_plan, "step_attempts": 0}
        raw = json_llm.invoke([
            SystemMessage(content=REPLAN_PROMPT),
            HumanMessage(content=f"Original request: {state['input']}\n\nCompleted:\n{history_text}"),
        ]).content
        parsed = _parse_json(raw)
        emit({"type": "span", "span": {
            "id": _new_span_id(), "parent_id": span_id, "type": "llm",
            "label": "replanner", "ms": int((time.time() - t0) * 1000), "detail": raw[:500],
        }})
        if parsed.get("done", True):
            answer = parsed.get("answer", history_text)
            emit({"type": "thought", "round": round_counter[0], "thought": "Plan complete.", "action": "finish"})
            return {"done": True, "response": answer}
        new_steps = parsed.get("steps") or []
        emit({"type": "thought", "round": round_counter[0],
              "thought": f"Replanned: {'; '.join(new_steps)}", "action": "replan"})
        return {"plan": new_steps, "step_attempts": 0}

    def route_after_critic(state: ApexState):
        return "replan" if state.get("approved") else "execute"

    def route_after_replan(state: ApexState):
        return END if state.get("done") else "execute"

    graph = StateGraph(ApexState)
    graph.add_node("plan", planner_node)
    graph.add_node("execute", executor_node)
    graph.add_node("critic", critic_node)
    graph.add_node("replan", replan_node)
    graph.set_entry_point("plan")
    graph.add_edge("plan", "execute")
    graph.add_edge("execute", "critic")
    graph.add_conditional_edges("critic", route_after_critic, {"replan": "replan", "execute": "execute"})
    graph.add_conditional_edges("replan", route_after_replan, {"execute": "execute", END: END})
    compiled = graph.compile()

    with langfuse.start_as_current_observation(
        name="apex-agent" if depth == 0 else f"scout-agent-depth-{depth}",
        input={"query": user_task},
        metadata={"model": model or MODEL, "phase": "p12-apex", "depth": depth},
    ) as trace:
        answer = "Agent hit max rounds without finishing."
        try:
            memory_context = recall_sync(user_task[:60])
            final_state = compiled.invoke(
                {
                    "input": user_task, "memory_context": memory_context, "plan": [],
                    "history": [], "step_attempts": 0, "critic_feedback": "",
                    "approved": False, "response": "", "done": False,
                },
                {"recursion_limit": max_rounds * 6 + 6},
            )
            draft = final_state.get("response") or answer

            # Final explicit structuring pass (p11's proven pattern) — a
            # real, separate Pydantic-validated call, not automatic
            # middleware (which didn't reliably work with this model).
            t0 = time.time()
            raw = json_llm.invoke([
                SystemMessage(content=STRUCTURE_PROMPT),
                HumanMessage(content=f"Draft answer: {draft}"),
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
            except (json.JSONDecodeError, ValidationError):
                answer = draft

        except Exception as e:
            emit({"type": "error", "round": round_counter[0], "message": str(e)})
            answer = f"Agent error: {e}"

        trace.update(output=answer)
        emit({"type": "span", "span": {
            "id": span_id, "parent_id": parent_span_id, "type": "agent",
            "label": "apex-agent" if depth == 0 else f"scout (depth {depth})",
            "agent": "apex" if depth == 0 else "scout",
            "ms": int((time.time() - agent_start) * 1000),
        }})
        langfuse.flush()
        return answer


def _spawn_scout(mission: str, depth: int, on_event, parent_span_id: str, model: str) -> str:
    if on_event:
        on_event({"type": "scout_start", "depth": depth, "mission": mission})
    report = run_agent(
        [{"role": "system", "content": _BASE_SYSTEM_PROMPT}, {"role": "user", "content": mission}],
        on_event=on_event, max_rounds=5, depth=depth,
        span_id=_new_span_id(), parent_span_id=parent_span_id, model=model,
    )
    if on_event:
        on_event({"type": "scout_done", "depth": depth, "report": report})
    return report
