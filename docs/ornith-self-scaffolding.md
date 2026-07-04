# Ornith 1.0 — Self-Scaffolding Integration Notes

> Compiled 2026-07-04 from ornith.site (/,/how-to-run, /faq), the Ollama library
> page, the HF model card (deepreinforce-ai/Ornith-1.0-9B), and
> `ollama show ornith:9b --modelfile` on this machine. This is the canonical
> reference for how Mach2 harnesses SHOULD drive ornith — several things our
> existing harnesses do actively fight the model's training (see "What we were
> doing wrong" at the bottom).

## What Ornith actually is

- Family of MIT-licensed models by DeepReinforce (released 2026-06-25):
  9B dense, 31B dense, 35B MoE, 397B MoE. We run **Ornith-1.0-9B @ Q4_K_M**
  (qwen3.5 architecture, 5.6 GB, fits 8-16 GB RAM class hardware).
- **262,144-token context window** — vastly larger than we've been assuming.
- SOTA-for-size on Terminal-Bench 2.1, SWE-Bench, NL2Repo, OpenClaw.
- Works out of the box with Claude Code, OpenHands, OpenClaw, Hermes Agent —
  i.e. it is *already trained against real agent-harness message formats*.

## Self-scaffolding — the core idea

During RL training the scaffold (task plan, tool-call sequencing, error
recovery, re-planning) **co-evolves with the model's policy**. Ornith learns
to generate its own task decomposition, retries, and recovery strategies.

> Implication, straight from the FAQ: **let the model drive orchestration**
> rather than imposing external plan→execute→critic loops. The model learned
> its own decomposition patterns; a human-designed harness that force-feeds it
> one micro-step at a time works *against* the policy it was trained with.

The right harness shape for ornith is therefore a **thin executor loop**:
give it the task + tools, execute the tool calls it emits, feed results back,
repeat until it finishes. Planning, criticism, retries and re-planning happen
*inside the model*, not in graph nodes around it.

## Native capabilities (confirmed locally via `ollama show ornith:9b`)

```
Capabilities: completion, tools, thinking
RENDERER ornith    PARSER ornith          <- built into Ollama >= 0.30.11
PARAMETER stop <|im_end|>
PARAMETER temperature 0.6, top_k 20, top_p 0.95
SYSTEM (built-in): "You are Ornith, an open-source agentic coding assistant.
  Think step by step in a reasoning block, then act. Use the provided tools
  when they help. Be concise, correct, and direct..."
```

- **Native tool calling.** The model emits well-formed XML tool calls
  (qwen3-style); Ollama's built-in `ornith` parser converts them into
  structured `tool_calls` in the chat API response. No JSON-in-text parsing,
  no regex, no "respond ONLY with raw JSON" prompting needed — that
  instruction actively conflicts with its training.
- **Native thinking.** Every response starts with a `<think>...</think>`
  reasoning block. Ollama parses this out into the separate `thinking` field
  (`think: true` on /api/chat; `reasoning=True` on ChatOllama). Display it as
  the thought trace; don't ask the model to put reasoning in a JSON field.
- **Sampling:** temperature 0.6 / top_p 0.95 / top_k 20 are the model-card
  recommended values AND already baked into the Modelfile — don't override.

## What we were doing wrong (audit of Mach2 harnesses, 2026-07-04)

1. **`docs/ornith-system-prompt.md` forces raw-JSON ReAct output** ("a single,
   valid JSON object. No surrounding text.") — directly contradicts the
   model's trained behavior of starting every response with a thinking block
   and emitting native XML tool calls. The hand-rolled JSON-ReAct harnesses
   (p1/p2/p4/p5/p6) fight the parser AND the policy.
2. **Apex (p12) imposes an external plan→execute→critic→replan StateGraph** —
   exactly the human-designed scaffold self-scaffolding replaces. Four+ LLM
   round-trips per plan step (planner, executor, critic, replanner — 27-71s
   EACH on this CPU-only box) where ornith natively does the whole loop in
   one call per action. This is the primary source of the multi-minute
   latencies and timeout-driven "failed runs".
3. **JSON-mode (`format="json"`) side-calls for planner/critic/replanner/
   structurer** suppress the thinking block the model was trained to always
   produce, degrading output quality on top of the latency cost.
4. **Overriding the built-in SYSTEM prompt** with a 300-line conflicting one.
   Keep harness prompts to a short role/task addendum on top of the built-in.
5. **Long-horizon test was run on gemma4:latest** (base instruct model, no
   agentic tuning, no self-scaffolding) — the harness's reliability was being
   judged on the wrong model entirely.
6. **UI "Thought for Xs" spam** is the visible symptom of (1)+(2): every
   micro-step re-triggers a fresh thinking block, so external orchestration
   multiplies thought entries that native self-scaffolding would have merged
   into one coherent trace.

## The ornith-native harness contract

- One `/api/chat` (or ChatOllama) loop. `tools=[...bind natively...]`,
  `think=true`, stream on.
- Keep the built-in system prompt; append only a short Mach2 context note
  (workspace path, tool safety rules, budget).
- Per round: send full message history -> model returns `thinking` +
  either `tool_calls` or final content. Execute tool calls, append
  `role:"tool"` results, loop. That's the whole harness.
- Emit `thinking` -> `thought` SSE events; `tool_calls`/results -> `tool_result`
  events; keep spans per round. Everything else (plan display, critique UI)
  reads what the model narrates, not separate LLM calls.
- Budget = max rounds + wall-clock cap, enforced by the loop, not the prompt.
- Multi-turn: the model card gives no explicit guidance on stripping prior
  reasoning; Qwen3-family convention (and Ollama's default) is thinking from
  prior turns is NOT fed back — follow that.

Sources: https://ornith.site/ · https://ornith.site/how-to-run ·
https://ornith.site/faq · https://ollama.com/library/ornith ·
https://huggingface.co/deepreinforce-ai/Ornith-1.0-9B
