/* Direct Ollama control — separate from the agent backend (:8000). Ollama
   exposes its own local API (:11434) for managing which model(s) are resident
   in memory. This lets the UI actually load/unload models instead of just
   passing a model NAME string around cosmetically. */

const OLLAMA_URL = "http://localhost:11434";

export interface RunningModel {
  name: string;
  size: number;
  expires_at: string;
}

/** Currently resident (loaded) models, per Ollama's own bookkeeping. */
export async function listRunningModels(signal?: AbortSignal): Promise<RunningModel[]> {
  const r = await fetch(`${OLLAMA_URL}/api/ps`, { signal });
  if (!r.ok) throw new Error(`Ollama /api/ps responded ${r.status}`);
  const data = await r.json();
  return Array.isArray(data?.models) ? data.models : [];
}

/** Every model actually pulled/installed locally — real data from Ollama
    instead of a hardcoded guess list, so the picker can never offer a model
    that isn't really there. */
export async function listInstalledModels(signal?: AbortSignal): Promise<string[]> {
  const r = await fetch(`${OLLAMA_URL}/api/tags`, { signal });
  if (!r.ok) throw new Error(`Ollama /api/tags responded ${r.status}`);
  const data = await r.json();
  const models = Array.isArray(data?.models) ? data.models : [];
  return models.map((m: { name: string }) => m.name).filter((n: string) => !n.includes("embed"));
}

export interface InstalledModelDetail {
  name: string;
  sizeGB: number;
  params: string;
  quant: string;
  family: string;
}

/** Same source as listInstalledModels but with the real per-model specs
    Ollama already reports (size, parameter count, quantization) — replaces
    the ModelsModal's previously hand-invented MODEL_LIBRARY entirely. There
    is no "not yet pulled" library here: /api/tags only ever lists models
    that ARE installed, so a pull-a-new-model flow would need a separate,
    not-yet-built integration with Ollama's remote model registry. */
export async function listInstalledModelDetails(signal?: AbortSignal): Promise<InstalledModelDetail[]> {
  const r = await fetch(`${OLLAMA_URL}/api/tags`, { signal });
  if (!r.ok) throw new Error(`Ollama /api/tags responded ${r.status}`);
  const data = await r.json();
  const models = Array.isArray(data?.models) ? data.models : [];
  return models
    .filter((m: { name: string }) => !m.name.includes("embed"))
    .map((m: { name: string; size: number; details?: { parameter_size?: string; quantization_level?: string; family?: string } }) => ({
      name: m.name,
      sizeGB: m.size / 1e9,
      params: m.details?.parameter_size ?? "?",
      quant: m.details?.quantization_level ?? "?",
      family: m.details?.family ?? "",
    }));
}

// Ollama's load-into-memory step has no upper bound of its own — confirmed on
// this machine that a model swap under CPU/memory pressure can leave the
// PREVIOUS model's runner wedged in a "Stopping..." state that never clears
// (`ollama ps` shows it stuck; even `ollama stop <model>` from a terminal
// doesn't recover it — only killing and relaunching the Ollama process does).
// Without a client-side timeout, that hang was surfacing as "Loading X…"
// staying on screen forever with zero feedback and no way out. 2 minutes is
// generous relative to the ~25-40s cold-load times actually measured on this
// hardware; past that, something is genuinely stuck, not just slow.
const MODEL_OP_TIMEOUT_MS = 2 * 60_000;

/** Loads a model into memory (an empty-prompt /api/generate call triggers a
    load without running real inference), or unloads one immediately via
    keep_alive: 0. Both are the same endpoint — Ollama's documented pattern
    for explicit lifecycle control outside of a real chat turn. */
async function setModelResidency(model: string, keepAlive: string | number, signal?: AbortSignal): Promise<void> {
  const controller = new AbortController();
  const onAbort = () => controller.abort();
  signal?.addEventListener("abort", onAbort);
  const timeoutId = setTimeout(() => controller.abort(), MODEL_OP_TIMEOUT_MS);
  try {
    const r = await fetch(`${OLLAMA_URL}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model, keep_alive: keepAlive }),
      signal: controller.signal,
    });
    if (!r.ok) throw new Error(`Ollama /api/generate responded ${r.status}`);
    // Drain the (empty, since there's no prompt) response body so the
    // connection closes cleanly instead of leaking an open stream.
    await r.body?.cancel();
  } catch (err) {
    if (controller.signal.aborted && !signal?.aborted) {
      throw new Error(
        `Ollama didn't respond within ${MODEL_OP_TIMEOUT_MS / 1000}s — it may be stuck mid-swap. ` +
          "Try again; if it keeps happening, Ollama's own process likely needs a restart.",
      );
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
    signal?.removeEventListener("abort", onAbort);
  }
}

// Long, not indefinite: a model should stay resident across ordinary
// back-and-forth use (no reload penalty between messages a few minutes
// apart), but this alone doesn't fully deliver that — see the caveat on
// RECYCLE_AFTER_MS below.
const DEFAULT_KEEP_ALIVE = "6h";

export const loadModel = (model: string, signal?: AbortSignal) =>
  setModelResidency(model, DEFAULT_KEEP_ALIVE, signal);

export const unloadModel = (model: string, signal?: AbortSignal) =>
  setModelResidency(model, 0, signal);

/** Re-issues residency for an ALREADY-loaded model with a custom keep-alive
    duration (e.g. "30m", "2h") instead of the app-wide 6h default — the
    per-model override the Settings panel exposes. Ollama accepts either a
    Go duration string or a number of seconds for keep_alive. */
export const setModelKeepAlive = (model: string, keepAlive: string, signal?: AbortSignal) =>
  setModelResidency(model, keepAlive, signal);

// A model continuously resident for very long stretches is worth recycling
// periodically (clears any slow memory fragmentation/growth in the Ollama
// runtime) rather than treated as sacred — 6h loaded, then a 10-minute
// unloaded "cooldown" before reloading fresh.
export const RECYCLE_AFTER_MS = 6 * 60 * 60_000;
export const RECYCLE_COOLDOWN_MS = 10 * 60_000;

export type ModelSwapPhase = "unloading" | "loading";

/** Loads `model` and unloads every OTHER currently-resident model, enforcing
    a "only one model loaded at a time" policy — this machine has no GPU, so
    keeping multiple 5-10GB models simultaneously resident isn't practical.
    `onPhase` reports real, observed transitions (not a fabricated progress
    percentage — Ollama's load-into-memory step exposes no partial-progress
    signal) so the UI can show "Unloading X…" then "Loading Y…" instead of a
    single opaque "Loading…" for the whole swap. */
export async function switchResidentModel(
  model: string,
  signal?: AbortSignal,
  onPhase?: (phase: ModelSwapPhase, detail: string) => void,
): Promise<void> {
  const running = await listRunningModels(signal).catch(() => [] as RunningModel[]);
  const others = running.filter((m) => m.name !== model && m.name.split(":")[0] !== model.split(":")[0]);
  if (others.length > 0) onPhase?.("unloading", others.map((m) => m.name).join(", "));
  await Promise.all(others.map((m) => unloadModel(m.name, signal).catch(() => {})));

  // The unload response returning doesn't mean the old runner has actually
  // torn down yet — that happens async on Ollama's side. Firing the new
  // load immediately races that teardown, and under memory pressure on this
  // (GPU-less) hardware that race is exactly what left a model wedged in a
  // permanent "Stopping..." state (confirmed directly against the Ollama API
  // during this session). Polling /api/ps for the old model(s) to actually
  // clear — bounded, so a genuinely stuck teardown doesn't block forever —
  // gives Ollama a real chance to finish before the new load competes with it.
  if (others.length > 0) {
    const deadline = Date.now() + 20_000;
    while (Date.now() < deadline) {
      const stillThere = await listRunningModels(signal).catch(() => [] as RunningModel[]);
      if (!others.some((o) => stillThere.some((s) => s.name === o.name))) break;
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }

  onPhase?.("loading", model);
  await loadModel(model, signal);
}

/** Unloads `model`, waits out the cooldown window, then reloads it — call
    this once `loadedSince` shows the model has been continuously resident
    past RECYCLE_AFTER_MS. Meant to be driven by a periodic check (see
    OrnithChatApp.tsx), not called on every render. */
export async function recycleModel(model: string): Promise<void> {
  await unloadModel(model).catch(() => {});
  await new Promise((resolve) => setTimeout(resolve, RECYCLE_COOLDOWN_MS));
  await loadModel(model);
}
