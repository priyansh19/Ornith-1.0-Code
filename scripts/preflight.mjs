#!/usr/bin/env node
/*
 * preflight.mjs — a doctor for the LMChat live-test stack.
 *
 * Before you spend several minutes on a CPU-only 9B inference run, this checks
 * the three moving parts the app needs and tells you exactly what's missing:
 *
 *   1. Node        — new enough to build/run the Next 16 frontend
 *   2. Ollama      — reachable on :11434, and the target model is installed
 *   3. Backend     — the FastAPI agent loop is up on :8000 (GET /health)
 *
 * No dependencies (uses Node's built-in global fetch, Node >= 18).
 *
 *   node scripts/preflight.mjs
 *   MODEL=ornith:9b BACKEND_URL=http://localhost:8000 node scripts/preflight.mjs
 *
 * Exit code is non-zero if any REQUIRED check fails, so CI / a runbook step can
 * gate on it. Warnings (e.g. "model not resident yet") don't fail the run.
 */

const OLLAMA_URL = (process.env.OLLAMA_URL || "http://localhost:11434").replace(/\/$/, "");
const BACKEND_URL = (process.env.BACKEND_URL || "http://localhost:8000").replace(/\/$/, "");
const FRONTEND_URL = process.env.FRONTEND_URL || ""; // optional, checked only if set
const MODEL = process.env.MODEL || "ornith:9b";
const MIN_NODE_MAJOR = 20; // Next 16 requires Node >= 20.9

// ── tiny ANSI helpers (honor NO_COLOR) ────────────────────────────────────
const useColor = !process.env.NO_COLOR && process.stdout.isTTY;
const c = (n) => (s) => (useColor ? `\x1b[${n}m${s}\x1b[0m` : `${s}`);
const bold = c("1");
const dim = c("2");
const red = c("31");
const green = c("32");
const yellow = c("33");
const cyan = c("36");

const OK = green("✓");
const BAD = red("✗");
const WARN = yellow("!");

const results = []; // { level: "ok"|"warn"|"fail", name, detail, hint }
function ok(name, detail) { results.push({ level: "ok", name, detail }); }
function warn(name, detail, hint) { results.push({ level: "warn", name, detail, hint }); }
function fail(name, detail, hint) { results.push({ level: "fail", name, detail, hint }); }

async function fetchWithTimeout(url, opts = {}, ms = 4000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, { ...opts, signal: ctrl.signal });
  } finally {
    clearTimeout(t);
  }
}

// ── checks ────────────────────────────────────────────────────────────────
function checkNode() {
  const major = Number(process.versions.node.split(".")[0]);
  if (major >= MIN_NODE_MAJOR) {
    ok("Node.js", `v${process.versions.node}`);
  } else {
    fail(
      "Node.js",
      `v${process.versions.node} is too old`,
      `Install Node >= ${MIN_NODE_MAJOR} (Next 16 needs it). See https://nodejs.org`,
    );
  }
}

async function checkOllama() {
  let tags;
  try {
    const r = await fetchWithTimeout(`${OLLAMA_URL}/api/tags`);
    if (!r.ok) {
      fail("Ollama", `GET /api/tags returned ${r.status}`, `Is Ollama running? Try: ollama serve`);
      return;
    }
    tags = await r.json();
  } catch (e) {
    fail(
      "Ollama",
      `unreachable at ${OLLAMA_URL} (${e.cause?.code || e.code || e.name})`,
      `Start it with: ollama serve   (or install from https://ollama.com)`,
    );
    return;
  }

  const names = Array.isArray(tags?.models) ? tags.models.map((m) => m.name) : [];
  ok("Ollama", `up at ${OLLAMA_URL} — ${names.length} model(s) installed`);

  if (names.includes(MODEL)) {
    ok(`Model "${MODEL}"`, "installed");
  } else {
    // Look for a near-match the user probably meant.
    const base = MODEL.split(":")[0].toLowerCase();
    const near = names.filter((n) => n.toLowerCase().includes(base));
    const hint = near.length
      ? `Found similar: ${near.join(", ")}. Either alias one to "${MODEL}" ` +
        `(ollama create ${MODEL} -f scripts/Modelfile.ornith) or pick it in the Models modal.`
      : `Pull it:  ollama pull ${MODEL}   — or build the tag:  ` +
        `ollama create ${MODEL} -f scripts/Modelfile.ornith`;
    fail(`Model "${MODEL}"`, "not installed", hint);
  }

  // Resident model info is advisory only.
  try {
    const r = await fetchWithTimeout(`${OLLAMA_URL}/api/ps`);
    if (r.ok) {
      const ps = await r.json();
      const running = Array.isArray(ps?.models) ? ps.models.map((m) => m.name) : [];
      if (running.length) ok("Resident models", running.join(", "));
      else warn("Resident models", "none loaded yet", `First turn will cold-load ${MODEL} (~25-40s on CPU).`);
    }
  } catch {
    /* /api/ps is optional intel */
  }
}

async function checkBackend() {
  try {
    const r = await fetchWithTimeout(`${BACKEND_URL}/health`);
    if (!r.ok) {
      fail("Agent backend", `GET /health returned ${r.status}`, `Check the FastAPI server terminal.`);
      return;
    }
    let body = {};
    try { body = await r.json(); } catch { /* health may be text */ }
    const status = body?.status ?? "ok";
    ok("Agent backend", `up at ${BACKEND_URL} (status: ${status})`);
  } catch (e) {
    fail(
      "Agent backend",
      `unreachable at ${BACKEND_URL} (${e.cause?.code || e.code || e.name})`,
      `Start the Mach-2 FastAPI server (uvicorn server.main:app --port 8000) from the backend repo.`,
    );
  }
}

async function checkFrontend() {
  if (!FRONTEND_URL) return;
  try {
    const r = await fetchWithTimeout(FRONTEND_URL);
    if (r.ok || r.status < 500) ok("Frontend", `responding at ${FRONTEND_URL}`);
    else warn("Frontend", `${FRONTEND_URL} returned ${r.status}`);
  } catch (e) {
    warn("Frontend", `not up at ${FRONTEND_URL} (${e.cause?.code || e.code || e.name})`, `Start it: npm run dev`);
  }
}

// ── run + report ──────────────────────────────────────────────────────────
async function main() {
  console.log(bold(cyan("\n  LMChat live-test preflight\n")));
  console.log(dim(`  Ollama:   ${OLLAMA_URL}`));
  console.log(dim(`  Backend:  ${BACKEND_URL}`));
  console.log(dim(`  Model:    ${MODEL}\n`));

  checkNode();
  await checkOllama();
  await checkBackend();
  await checkFrontend();

  for (const r of results) {
    const mark = r.level === "ok" ? OK : r.level === "warn" ? WARN : BAD;
    console.log(`  ${mark} ${bold(r.name)} ${dim("— " + r.detail)}`);
    if (r.hint) console.log(`      ${dim("→ " + r.hint)}`);
  }

  const fails = results.filter((r) => r.level === "fail").length;
  const warns = results.filter((r) => r.level === "warn").length;
  console.log("");
  if (fails === 0) {
    console.log(`  ${green(bold("READY"))} — all required checks passed${warns ? dim(` (${warns} warning(s))`) : ""}.`);
    console.log(dim(`  Next: node scripts/smoke-live.mjs\n`));
    process.exit(0);
  } else {
    console.log(`  ${red(bold("NOT READY"))} — ${fails} required check(s) failed. Fix the ${BAD} items above.\n`);
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(red(`preflight crashed: ${e?.stack || e}`));
  process.exit(2);
});
