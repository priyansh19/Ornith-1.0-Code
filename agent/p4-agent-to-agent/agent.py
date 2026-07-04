import json
import time
import uuid
import requests
from pathlib import Path
from langfuse import Langfuse
from tools import TOOLS, get_last_diff

_DIFF_TOOLS = {"create_file", "edit_file", "edit_section", "append_to_file"}

def _new_span_id():
    return uuid.uuid4().hex[:8]

OLLAMA_URL = "http://localhost:11434/api/chat"
MODEL = "ornith:9b"
SYSTEM_PROMPT = (Path(__file__).parent.parent.parent / "docs" / "ornith-system-prompt.md").read_text(encoding="utf-8")
# Measured on this machine (no GPU, ornith:9b, CPU-only inference): a single
# trivial round-trip already takes ~170s, and the real system prompt is ~44x
# larger than that test's — a round with real conversation history routinely
# exceeds 180s. A timeout here throws away the in-progress generation and
# retries from scratch with an even LONGER prompt (the corrective message gets
# appended), so a short timeout doesn't fail fast, it guarantees a losing
# cascade toward max_rounds. Generous is strictly better than tight here.
OLLAMA_TIMEOUT = 600

langfuse = Langfuse(
    public_key="pk-lf-df92732e-8905-4eea-a561-4a906b963471",
    secret_key="sk-lf-42a96bc1-2d67-4741-a7c7-598c4a2506a9",
    host="http://localhost:3000"
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
        # Ollama returns 200 OK with an {"error": "..."} body for real
        # failures too (confirmed: a model whose configured context length
        # needs more KV-cache RAM than is free crashes its own llama-server
        # worker this way) — data["message"] would otherwise raise a bare,
        # confusing KeyError instead of surfacing what Ollama actually said.
        raise RuntimeError(f"Ollama error: {data['error']}")
    return data["message"]["content"], data.get("prompt_eval_count", 0), data.get("eval_count", 0)

MAX_SCOUT_DEPTH = 2
def run_agent(messages, on_event=None, max_rounds=10, depth=0, allowed_tools=None, span_id=None, parent_span_id=None, model=None):
    def emit(evt):
        if on_event:
            on_event(evt)

    span_id = span_id or _new_span_id()
    agent_start = time.time()
    emit({"type": "span", "span": {
        "id": span_id, "parent_id": parent_span_id, "type": "agent",
        "label": "react-agent" if depth == 0 else f"scout (depth {depth})",
        "agent": "harness" if depth == 0 else "scout", "ms": 0,
    }})

    available_tools = dict(TOOLS)
    if allowed_tools is not None:
        available_tools = {k: v for k, v in available_tools.items() if k in allowed_tools}
    if depth < MAX_SCOUT_DEPTH:
        available_tools["spawn_scout"] = lambda args: spawn_scout(args, depth=depth + 1, on_event=on_event, parent_span_id=span_id, model=model)

    with langfuse.start_as_current_observation(
        name="react-agent" if depth == 0 else f"scout-agent-depth-{depth}",
        input={"query": messages[-1]["content"]},
        metadata={"model": model or MODEL, "phase": "p4-agent-to-agent", "depth": depth}
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
                    usage_details={"input": input_tokens, "output": output_tokens}
                ) as span:
                    print(f"\n[thought] {step.get('thought')}")
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
                            "label": "react-agent" if depth == 0 else f"scout (depth {depth})",
                            "agent": "harness" if depth == 0 else "scout",
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

                    print(f"[tool:{action}] {str(tool_result)[:200]}")
                    diff = get_last_diff() if action in _DIFF_TOOLS else None
                    tool_event = {"type": "tool_result", "tool": action,
                                  "input": str(step.get("action_input"))[:300],
                                  "result": str(tool_result)[:500]}
                    if diff:
                        tool_event["diff"] = diff
                    emit(tool_event)
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
            "label": "react-agent" if depth == 0 else f"scout (depth {depth})",
            "agent": "harness" if depth == 0 else "scout",
            "ms": int((time.time() - agent_start) * 1000),
        }})
        langfuse.flush()
        return "Agent hit max rounds without finishing."


def spawn_scout(args, depth=0, on_event=None, parent_span_id=None, model=None):
    mission = args.get("mission", "") if isinstance(args, dict) else str(args)
    allowed = args.get("tools") if isinstance(args, dict) else None
    budget = args.get("budget", 5) if isinstance(args, dict) else 5

    if on_event:
        on_event({"type": "scout_start", "depth": depth, "mission": mission})

    with langfuse.start_as_current_observation(
        name="spawn_scout",
        input={"mission": mission, "tools": allowed, "budget": budget},
        metadata={"depth": depth}
    ) as scout_span:
        scout_messages = [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": mission},
        ]
        report = run_agent(
            scout_messages, on_event=on_event, max_rounds=budget, depth=depth,
            allowed_tools=allowed, span_id=_new_span_id(), parent_span_id=parent_span_id, model=model,
        )
        scout_span.update(output=report)
    
    if on_event:
        on_event({"type": "scout_done", "depth": depth, "report": report})

    return report
