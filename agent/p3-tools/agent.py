import json
import requests
from pathlib import Path
from langfuse import Langfuse
from tools import TOOLS

OLLAMA_URL = "http://localhost:11434/api/chat"
MODEL = "ornith:9b"

SYSTEM_PROMPT = (Path(__file__).parent.parent.parent / "docs" / "ornith-system-prompt.md").read_text(encoding="utf-8")

langfuse = Langfuse(
    public_key="pk-lf-df92732e-8905-4eea-a561-4a906b963471",
    secret_key="sk-lf-42a96bc1-2d67-4741-a7c7-598c4a2506a9",
    host="http://localhost:3000"
)

def call_ollama(messages):
    res = requests.post(OLLAMA_URL, json={"model": MODEL, "messages": messages, "stream": False, "format": "json"})
    data = res.json()
    return data["message"]["content"], data.get("prompt_eval_count", 0), data.get("eval_count", 0)

def run_agent(messages, on_event=None):
    def emit(evt):
        if on_event:
            on_event(evt)

    with langfuse.start_as_current_observation(
        name="react-agent",
        input={"query": messages[-1]["content"]},
        metadata={"model": MODEL, "phase": "p3-tools"}
    ) as trace:

        for round_num in range(10):
            raw, input_tokens, output_tokens = call_ollama(messages)
            step = json.loads(raw)

            with langfuse.start_as_current_observation(
                name=f"step-{round_num + 1}",
                input={"thought": step.get("thought"), "action": step.get("action")},
                usage_details={"input": input_tokens, "output": output_tokens}
            ) as span:
                print(f"\n[thought] {step['thought']}")
                emit({"type": "thought", "round": round_num + 1,
                      "thought": step.get("thought"), "action": step.get("action")})

                if step["action"] == "finish":
                    ai = step.get("action_input")
                    answer = ai.get("answer") if isinstance(ai, dict) else step.get("answer", str(ai))
                    span.update(output=answer)
                    trace.update(output=answer)
                    langfuse.flush()
                    return answer

                if step["action"] not in TOOLS:
                    tool_result = f"Unknown tool '{step['action']}'. Valid tools: {', '.join(TOOLS.keys())}"
                else:
                    tool_result = TOOLS[step["action"]](step["action_input"])
                
                print(f"[tool:{step['action']}] {str(tool_result)[:200]}")
                emit({"type": "tool_result", "tool": step["action"],
                      "input": str(step["action_input"])[:300],
                      "result": str(tool_result)[:500]})

                messages.append({"role": "assistant", "content": raw})
                messages.append({"role": "user", "content": f"Tool result: {tool_result}"})
                span.update(output=str(tool_result))

        langfuse.flush()
        return "Agent hit max rounds without finishing."
