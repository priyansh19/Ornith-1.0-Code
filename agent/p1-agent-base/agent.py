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
HARNESS_NAME = "agent-base"
SYSTEM_PROMPT = (Path(__file__).parent.parent.parent / "docs" / "ornith-system-prompt.md").read_text(encoding="utf-8")
# Same reliability bar as every other harness: see identical note in
# p4-agent-to-agent/agent.py for why 600s, not a shorter "fail fast" value.
OLLAMA_TIMEOUT = 600

langfuse = Langfuse(
    public_key="pk-lf-f1ff4a91-5511-46d9-b3f2-f3db49112808",
    secret_key="sk-lf-6c61058f-a568-430f-93e6-598415159fd0",
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
        "label": "agent-base", "agent": "agent-base", "ms": 0,
    }})

    with langfuse.start_as_current_observation(
        name="agent-base", input={"query": messages[-1]["content"]},
        metadata={"model": model or MODEL, "phase": "p1-agent-base"},
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
                            "label": "agent-base", "agent": "agent-base",
                            "ms": int((time.time() - agent_start) * 1000),
                        }})
                        langfuse.flush()
                        return answer

                    tool_start = time.time()
                    if action not in TOOLS:
                        tool_result = f"Unknown tool '{action}'. Valid tools: {', '.join(TOOLS.keys())}"
                    else:
                        tool_result = TOOLS[action](step.get("action_input"))
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
            "label": "agent-base", "agent": "agent-base",
            "ms": int((time.time() - agent_start) * 1000),
        }})
        langfuse.flush()
        return "Agent hit max rounds without finishing."
