import json
import time
import uuid
import requests
from pathlib import Path
from langfuse import Langfuse
from tools import TOOLS


def _new_span_id():
    return uuid.uuid4().hex[:8]


OLLAMA_URL = "http://localhost:11434/api/chat"
MODEL = "ornith:9b"
HARNESS_NAME = "orchestrator"
_BASE_SYSTEM_PROMPT = (Path(__file__).parent.parent.parent / "docs" / "ornith-system-prompt.md").read_text(encoding="utf-8")
# "Orchestrator" — genuinely distinct from p1-agent-base (plain single loop):
# has a `delegate` tool that dispatches a bounded sub-agent call for a
# sub-task, the same recursive-dispatch idea as p4's scouts, kept simpler
# (no separate tool allowlist/budget knobs).
SYSTEM_PROMPT = _BASE_SYSTEM_PROMPT + """

## Delegation (this harness only)

You can call `delegate` with action_input {"task": "<sub-task description>"}
to dispatch a bounded sub-agent that works on just that piece and reports
back a result, instead of doing every step yourself. Useful for breaking a
larger request into independent pieces.
"""
OLLAMA_TIMEOUT = 600  # see identical note in p4-agent-to-agent/agent.py
MAX_DELEGATE_DEPTH = 2

langfuse = Langfuse(
    public_key="pk-lf-df92732e-8905-4eea-a561-4a906b963471",
    secret_key="sk-lf-42a96bc1-2d67-4741-a7c7-598c4a2506a9",
    host="http://localhost:3000",
)


def call_ollama(messages, model=None):
    res = requests.post(
        OLLAMA_URL,
        json={
            "model": model or MODEL, "messages": messages, "stream": False,
            "format": "json", "keep_alive": "6h",
        },
        timeout=OLLAMA_TIMEOUT,
    )
    data = res.json()
    if "error" in data:
        raise RuntimeError(f"Ollama error: {data['error']}")
    return data["message"]["content"], data.get("prompt_eval_count", 0), data.get("eval_count", 0)


def run_agent(messages, on_event=None, max_rounds=10, depth=0, allowed_tools=None, span_id=None, parent_span_id=None, model=None):
    def emit(evt):
        if on_event:
            on_event(evt)

    span_id = span_id or _new_span_id()
    agent_start = time.time()
    emit({"type": "span", "span": {
        "id": span_id, "parent_id": parent_span_id, "type": "agent",
        "label": "orchestrator" if depth == 0 else f"delegate (depth {depth})",
        "agent": "orchestrator" if depth == 0 else "delegate", "ms": 0,
    }})

    available_tools = dict(TOOLS)
    if depth < MAX_DELEGATE_DEPTH:
        available_tools["delegate"] = lambda args: _delegate(args, depth=depth + 1, on_event=on_event, parent_span_id=span_id, model=model)

    with langfuse.start_as_current_observation(
        name="orchestrator" if depth == 0 else f"delegate-depth-{depth}",
        input={"query": messages[-1]["content"]},
        metadata={"model": model or MODEL, "phase": "p2-harness", "depth": depth},
    ) as trace:
        for round_num in range(max_rounds):
            try:
                step_start = time.time()
                raw, input_tokens, output_tokens = call_ollama(messages, model=model)
                step = json.loads(raw)
                thought_ms = int((time.time() - step_start) * 1000)

                with langfuse.start_as_current_observation(
                    name=f"step-{round_num + 1}",
                    input={"thought": step.get("thought"), "action": step.get("action")},
                    usage_details={"input": input_tokens, "output": output_tokens},
                ) as span:
                    emit({"type": "thought", "round": round_num + 1,
                          "thought": step.get("thought"), "action": step.get("action")})
                    emit({"type": "span", "span": {
                        "id": _new_span_id(), "parent_id": span_id, "type": "llm",
                        "label": "thought", "ms": thought_ms, "tokens": output_tokens,
                        "detail": step.get("thought"),
                    }})

                    action = step.get("action")
                    if action == "finish":
                        ai = step.get("action_input")
                        answer = ai.get("answer") if isinstance(ai, dict) else step.get("answer", str(ai))
                        span.update(output=answer)
                        trace.update(output=answer)
                        emit({"type": "span", "span": {
                            "id": span_id, "parent_id": parent_span_id, "type": "agent",
                            "label": "orchestrator" if depth == 0 else f"delegate (depth {depth})",
                            "agent": "orchestrator" if depth == 0 else "delegate",
                            "ms": int((time.time() - agent_start) * 1000),
                        }})
                        langfuse.flush()
                        return answer

                    tool_start = time.time()
                    if action not in available_tools:
                        tool_result = f"Unknown tool '{action}'. Valid tools: {', '.join(available_tools.keys())}"
                    else:
                        tool_result = available_tools[action](step.get("action_input"))
                    tool_ms = int((time.time() - tool_start) * 1000)

                    emit({"type": "tool_result", "tool": action,
                          "input": str(step.get("action_input"))[:300],
                          "result": str(tool_result)[:500]})
                    emit({"type": "span", "span": {
                        "id": _new_span_id(), "parent_id": span_id, "type": "tool",
                        "label": action, "ms": tool_ms, "detail": str(tool_result)[:500],
                    }})

                    messages.append({"role": "assistant", "content": raw})
                    messages.append({"role": "user", "content": f"Tool result: {tool_result}"})
                    span.update(output=str(tool_result))

            except Exception as e:
                emit({"type": "error", "round": round_num + 1, "message": str(e)})
                messages.append({"role": "user", "content": (
                    f"Your last response caused an error: {e}. "
                    'Respond again with valid JSON: {"thought":..., "action":..., "action_input":...}.'
                )})
                continue

        emit({"type": "span", "span": {
            "id": span_id, "parent_id": parent_span_id, "type": "agent",
            "label": "orchestrator" if depth == 0 else f"delegate (depth {depth})",
            "agent": "orchestrator" if depth == 0 else "delegate",
            "ms": int((time.time() - agent_start) * 1000),
        }})
        langfuse.flush()
        return "Agent hit max rounds without finishing."


def _delegate(args, depth=0, on_event=None, parent_span_id=None, model=None):
    task = args.get("task", "") if isinstance(args, dict) else str(args)

    if on_event:
        on_event({"type": "scout_start", "depth": depth, "mission": task})

    with langfuse.start_as_current_observation(
        name="delegate", input={"task": task}, metadata={"depth": depth},
    ) as span:
        sub_messages = [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": task},
        ]
        report = run_agent(
            sub_messages, on_event=on_event, max_rounds=5, depth=depth,
            span_id=_new_span_id(), parent_span_id=parent_span_id, model=model,
        )
        span.update(output=report)

    if on_event:
        on_event({"type": "scout_done", "depth": depth, "report": report})

    return report
