#!/usr/bin/env node
/*
 * smoke-live.mjs — a headless live test of the REAL Ornith stack.
 *
 * It reproduces exactly what the LMChat UI does for one turn (see
 * components/lmchat/liveBackend.ts) without a browser, so you can confirm the
 * model + backend actually work — and that the SSE contract the UI depends on
 * still holds — in one command, with clean pass/fail output and timing.
 *
 * What it does:
 *   1. Confirms the target model is installed in Ollama.
 *   2. POSTs to  /chat-stream { message, session_id, harness:"ornith", model }
 *   3. Parses the SSE stream, logging thoughts/tools/spans as they arrive.
 *   4. Asserts a well-formed `done` event with a non-empty answer.
 *   5. Flags the known "format-slip" failure mode (stray <channel|> markers or
 *      narrated "Action:" text leaking into the answer — see previous_plan.md).
 *
 * No dependencies (Node >= 18 global fetch + web streams).
 *
 *   node scripts/smoke-live.mjs
 *   node scripts/smoke-live.mjs "write a python function that reverses a string"
 *   MODEL=ornith:9b BACKEND_URL=http://localhost:8000 node scripts/smoke-live.mjs
 *
 * Env: BACKEND_URL (:8000), OLLAMA_URL (:11434), MODEL (ornith:9b),
 *      INACTIVITY_MS (how long a silent stream may hang; default 11 min, the
 *      same backstop the UI uses).
 */

const BACKEND_URL = (process.env.BACKEND_URL || "http://localhost:8000").replace(/\/$/, "");
const OLLAMA_URL = (process.env.OLLAMA_URL || "http://localhost:11434").replace(/\/$/, "");
const MODEL = process.env.MODEL || "ornith:9b";
const INACTIVITY_MS = Number(process.env.INACTIVITY_MS || 11 * 60_000);
const PROMPT = process.argv.slice(2).join(" ").trim() ||
  "Reply with exactly the single word: pong. No tools, no explanation.";

const useColor = !process.env.NO_COLOR && process.stdout.isTTY;
const col = (n) => (s) => (useColor ? `\x1b[${n}m${s}\x1b[0m` : `${s}`);
const bold = col("1"); const dim = col("2"); const red = col("31");
const green = col("32"); const yellow = col("33"); const cyan = col("36"); const mag = col("35");

function fmtMs(ms) {
  if (ms < 1000) return `${ms}ms`;
  const s = ms / 1000;
  if (s < 60) return `${s.toFixed(1)}s`;
  const m = Math.floor(s / 60);
  return `${m}m ${Math.round(s - m * 60)}s`;
}

function die(msg, code = 1) {
  console.error(`\n  ${red(bold("FAIL"))} ${msg}\n`);
  process.exit(code);
}

// UUID for the session id, mirroring liveBackend.newBackendSessionId().
function sessionId() {
  if (globalThis.crypto?.randomUUID) return crypto.randomUUID();
  return `smoke-${Date.now().toString(36)}`;
}

async function preCheckModel() {
  try {
    const r = await fetch(`${OLLAMA_URL}/api/tags`, { signal: AbortSignal.timeout(4000) });
    if (!r.ok) return; // non-fatal; backend may proxy a differently-named model
    const data = await r.json();
    const names = Array.isArray(data?.models) ? data.models.map((m) => m.name) : [];
    if (names.length && !names.includes(MODEL)) {
      console.log(
        yellow(`  ! Model "${MODEL}" is not in Ollama's installed list ` +
          `(${names.join(", ") || "none"}). The backend may still resolve it, but if the run ` +
          `errors, pull/alias it first (see scripts/Modelfile.ornith).`),
      );
    }
  } catch {
    console.log(dim(`  (couldn't reach Ollama at ${OLLAMA_URL} for a pre-check — continuing)`));
  }
}

async function main() {
  console.log(bold(cyan("\n  LMChat live smoke test\n")));
  console.log(dim(`  Backend:  ${BACKEND_URL}/chat-stream`));
  console.log(dim(`  Model:    ${MODEL}`));
  console.log(dim(`  Prompt:   ${JSON.stringify(PROMPT)}\n`));

  // Health gate — fail fast with a clear message instead of a socket error.
  try {
    const h = await fetch(`${BACKEND_URL}/health`, { signal: AbortSignal.timeout(4000) });
    if (!h.ok) die(`backend /health returned ${h.status}. Is the FastAPI server up on ${BACKEND_URL}?`);
  } catch (e) {
    die(`backend unreachable at ${BACKEND_URL} (${e.cause?.code || e.code || e.name}). Start the Mach-2 server, then retry.`);
  }
  await preCheckModel();

  const sid = sessionId();
  const started = Date.now();
  const counts = { thought: 0, tool_result: 0, span: 0, error: 0, done: 0, unknown: 0 };
  const tools = [];
  const errors = [];
  let answer = null;
  let doneSessionId = null;
  let sawDone = false;

  let resp;
  try {
    resp = await fetch(`${BACKEND_URL}/chat-stream`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      // Exactly the body shape from liveBackend.runLiveChat().
      body: JSON.stringify({ message: PROMPT, session_id: sid, harness: "ornith", model: MODEL }),
    });
  } catch (e) {
    die(`POST /chat-stream failed to connect (${e.cause?.code || e.code || e.name}).`);
  }
  if (!resp.ok || !resp.body) die(`POST /chat-stream returned ${resp.status}.`);

  console.log(dim(`  streaming (session ${sid.slice(0, 8)}…) — CPU-only 9B turns can take minutes:\n`));

  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  const contractIssues = [];
  function validate(evt) {
    // Light contract checks against liveBackend.ts's declared event shapes.
    switch (evt.type) {
      case "thought":
        if (typeof evt.round !== "number") contractIssues.push("thought without numeric `round`");
        break;
      case "tool_result":
        if (typeof evt.tool !== "string") contractIssues.push("tool_result without `tool`");
        break;
      case "span":
        if (!evt.span || typeof evt.span.id !== "string")
          contractIssues.push("span without `span.id`");
        else if (!("parent_id" in evt.span))
          contractIssues.push("span without `parent_id` (needed to build the trace tree)");
        break;
      case "done":
        if (typeof evt.answer !== "string") contractIssues.push("done without string `answer`");
        break;
    }
  }

  while (true) {
    let timeoutId;
    const race = await Promise.race([
      reader.read(),
      new Promise((_, reject) => {
        timeoutId = setTimeout(
          () => reject(new Error(`no stream activity for ${fmtMs(INACTIVITY_MS)}`)),
          INACTIVITY_MS,
        );
      }),
    ]).catch((e) => ({ __err: e })).finally(() => clearTimeout(timeoutId));

    if (race?.__err) {
      await reader.cancel().catch(() => {});
      die(`${race.__err.message} — the model may be stuck retrying a tool, or the server crashed mid-turn.`);
    }
    const { done, value } = race;
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      let evt;
      try {
        evt = JSON.parse(line.slice(6));
      } catch {
        continue; // skip malformed line, exactly like the UI
      }
      const type = evt.type in counts ? evt.type : "unknown";
      counts[type]++;
      validate(evt);

      const t = dim(`+${fmtMs(Date.now() - started)}`);
      if (evt.type === "thought") {
        const txt = (evt.thought || evt.action || "").replace(/\s+/g, " ").slice(0, 100);
        console.log(`  ${t} ${mag("thought")} ${dim(`r${evt.round}`)} ${txt}`);
      } else if (evt.type === "tool_result") {
        tools.push(evt.tool);
        const inp = String(evt.input ?? "").replace(/\s+/g, " ").slice(0, 60);
        console.log(`  ${t} ${cyan("tool")}    ${bold(evt.tool)} ${dim(inp)}`);
      } else if (evt.type === "span") {
        // spans are high-volume; keep them quiet unless verbose
        if (process.env.VERBOSE) console.log(`  ${t} ${dim("span    " + (evt.span?.label ?? ""))}`);
      } else if (evt.type === "error") {
        errors.push(evt.message ?? "(no message)");
        console.log(`  ${t} ${red("error")}   ${evt.message ?? ""}`);
      } else if (evt.type === "done") {
        sawDone = true;
        answer = evt.answer ?? "";
        doneSessionId = evt.session_id ?? null;
      } else {
        console.log(`  ${t} ${yellow("unknown")} type=${JSON.stringify(evt.type)}`);
      }
    }
  }
  await reader.cancel().catch(() => {});

  const elapsed = Date.now() - started;

  // ── verdict ───────────────────────────────────────────────────────────
  console.log(bold("\n  ── summary ──"));
  console.log(`  elapsed        ${bold(fmtMs(elapsed))}`);
  console.log(`  events         thought=${counts.thought} tool=${counts.tool_result} ` +
    `span=${counts.span} error=${counts.error} done=${counts.done}`);
  if (tools.length) console.log(`  tools used     ${tools.join(", ")}`);
  if (doneSessionId) console.log(`  session_id     ${doneSessionId}`);

  if (!sawDone) {
    die("stream ended WITHOUT a `done` event — the UI would show 'Connection lost'. Check the server terminal.");
  }

  const trimmed = (answer || "").trim();
  console.log(`\n  ${bold("answer")} ${dim(`(${trimmed.length} chars)`)}:`);
  console.log(`  ${trimmed.slice(0, 500)}${trimmed.length > 500 ? dim(" …") : ""}\n`);

  // Known failure mode: the native tool-call format collapsing into narration.
  const slip = /<channel\|?>|<\|?channel|^\s*Action\s*:/im.test(answer || "");
  if (slip) {
    console.log(yellow(`  ! format-slip detected: the answer contains raw <channel|> markers or narrated ` +
      `"Action:" text. Root cause is usually too-small num_ctx truncating the prompt — ` +
      `confirm the backend runs the model with num_ctx=32768 (see scripts/Modelfile.ornith).`));
  }
  if (contractIssues.length) {
    const uniq = [...new Set(contractIssues)];
    console.log(yellow(`  ! contract warnings: ${uniq.join("; ")}`));
  }

  if (!trimmed) die("`done` arrived but the answer was EMPTY.");
  if (errors.length && !trimmed) die(`run produced errors and no answer: ${errors.join(" | ")}`);

  const warnCount = (slip ? 1 : 0) + contractIssues.length;
  console.log(`  ${green(bold("PASS"))} — live turn completed in ${fmtMs(elapsed)}` +
    `${warnCount ? yellow(` with ${warnCount} warning(s)`) : ""}.\n`);
  process.exit(0);
}

main().catch((e) => {
  console.error(red(`\n  smoke-live crashed: ${e?.stack || e}\n`));
  process.exit(2);
});
