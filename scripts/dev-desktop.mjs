/* Desktop-first dev workflow: starts the Next dev server, waits for it to
   respond, then launches the real Electron shell pointed at it — one command
   instead of juggling two terminals. Port 3000 is skipped by default since
   it's commonly occupied by other local dev infra (Docker Desktop/WSL, etc.);
   override with DEV_PORT if needed. */
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const port = process.env.DEV_PORT || "3010";
const url = `http://localhost:${port}`;

const children = [];
function run(cmd, args, opts = {}) {
  const child = spawn(cmd, args, { stdio: "inherit", shell: true, cwd: root, ...opts });
  children.push(child);
  return child;
}

async function waitForServer(target, timeoutMs = 60_000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(target);
      if (res.ok || res.status < 500) return true;
    } catch {
      /* not up yet */
    }
    await new Promise((r) => setTimeout(r, 400));
  }
  throw new Error(`Dev server at ${target} never came up within ${timeoutMs}ms`);
}

function shutdown() {
  for (const c of children) c.kill();
  process.exit(0);
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

console.log(`[dev-desktop] starting Next dev server on :${port}...`);
run("npx", ["next", "dev", "-p", port]);

await waitForServer(url);
console.log(`[dev-desktop] dev server up at ${url} — launching Electron...`);

const electron = run("npx", ["electron", "."], {
  env: { ...process.env, ELECTRON_DEV_URL: url },
});
electron.on("exit", shutdown);
