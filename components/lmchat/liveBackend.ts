/* Real backend bridge — every chat turn streams from the single Ornith-native
   backend loop (agent/p13-ornith, a thin native-tool-call loop the model
   drives itself), routed via server/main.py on :8000. The request body's
   `harness: "ornith"` field is a backend-contract detail (main.py still keys
   its module registry by that name) — it is not a user-facing concept.

   Contract (see server/main.py + agent/p13-ornith/agent.py):
   - POST /chat-stream { message, session_id, harness, model } -> SSE stream of
       {type:"thought", round, thought, action}
       {type:"tool_result", tool, input, result}
       {type:"span", span:{...}}
       {type:"error", round, message}
       {type:"done", answer, session_id}
     There is no plan/approval_required/diff/blocked event yet, and no
     trace_id/context_used/context_max — the real agent loop doesn't emit them.
   - GET /health -> {status:"ok"} when the FastAPI process is up. */

import type { Span } from "./data";

export const BACKEND_URL = "http://localhost:8000";

// Must stay comfortably ABOVE the backend's own per-round ceiling
// (OLLAMA_TIMEOUT = 600s in agent.py) or this fires on every genuinely slow
// round before the backend ever gets a chance to finish or fail on its own —
// confirmed happening in practice on this CPU-only hardware (no GPU): a
// single round measured at 170-345s total, and this used to be set to 5
// minutes (300s), which is BELOW that backend ceiling. This is a "the stream
// went silent forever" backstop, not a per-round budget. A single round
// retrying a failing tool call in a loop, or an unhandled exception killing
// the backend's worker thread mid-loop, both look identical from here: the
// HTTP connection stays open but no more `data:` lines ever arrive, so
// `reader.read()` would otherwise hang forever with no way to tell the
// difference from "still legitimately thinking".
const INACTIVITY_TIMEOUT_MS = 11 * 60_000;

/** One flat node from the backend's span stream — parented by id, not nested.
    The UI assembles these into the nested `Span` tree shape TraceTree
    renders (see data.ts). A node may arrive more than once
    (e.g. an "agent" span is emitted once at start with ms:0, then again with
    its real duration once it finishes) — later arrivals with the same `id`
    replace earlier ones rather than duplicating. */
export interface LiveSpanEvent {
  id: string;
  parent_id: string | null;
  type: Span["type"];
  label: string;
  agent?: string;
  ms: number;
  tokens?: number;
  detail?: string;
}

export type LiveEvent =
  | { type: "thought"; round: number; thought?: string; action?: string }
  | { type: "tool_result"; tool: string; input: string; result: string; diff?: string }
  | { type: "span"; span: LiveSpanEvent }
  | { type: "done"; answer: string; session_id: string };

export async function checkServerHealth(signal?: AbortSignal): Promise<boolean> {
  try {
    const r = await fetch(`${BACKEND_URL}/health`, { signal });
    return r.ok;
  } catch {
    return false;
  }
}

/** Streams one turn from the backend agent loop. Resolves once the backend
    sends `done`; throws if the connection drops without one (mirrors the
    legacy ui's `receivedDone` stream-disconnect check) or if aborted. */
export async function runLiveChat(
  message: string,
  sessionId: string,
  model: string,
  onEvent: (evt: LiveEvent) => void,
  signal: AbortSignal,
): Promise<void> {
  // The `harness: "ornith"` field is part of the backend request contract
  // (main.py routes /chat-stream by that registry key) — hardcoded here as an
  // invisible implementation detail; nothing user-facing selects it. The
  // UI's model picker does something real independent of this — see
  // ollama.ts, which actually loads/unloads models in Ollama directly.
  const resp = await fetch(`${BACKEND_URL}/chat-stream`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, session_id: sessionId, harness: "ornith", model }),
    signal,
  });
  if (!resp.ok || !resp.body) throw new Error(`Backend responded ${resp.status}`);

  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let receivedDone = false;

  try {
    while (true) {
      let timeoutId: ReturnType<typeof setTimeout> | undefined;
      const { done, value } = await Promise.race([
        reader.read(),
        new Promise<never>((_, reject) => {
          timeoutId = setTimeout(() => {
            const mins = Math.round(INACTIVITY_TIMEOUT_MS / 60_000);
            reject(
              new Error(
                `No response from the agent in ${mins} minutes — it may be stuck retrying a failing tool call, or the server crashed mid-turn. Check the server terminal.`,
              ),
            );
          }, INACTIVITY_TIMEOUT_MS);
        }),
      ]).finally(() => clearTimeout(timeoutId));

      // A chunk already read before abort() still resolves here — stop applying
      // events the instant the caller cancelled, even mid-buffer, so a stray
      // `done` can't land after the caller has already finalized this as stopped.
      if (signal.aborted) return;
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) {
        if (signal.aborted) return;
        if (!line.startsWith("data: ")) continue;
        try {
          const evt = JSON.parse(line.slice(6)) as LiveEvent;
          if (evt.type === "done") receivedDone = true;
          onEvent(evt);
        } catch {
          /* skip malformed event */
        }
      }
    }
  } finally {
    // On timeout (or any other throw) the reader is left mid-read; cancelling
    // releases the underlying connection instead of leaking it.
    reader.cancel().catch(() => {});
  }

  if (!receivedDone) {
    throw new Error(
      "Connection lost — the server stopped responding without finishing. Check the server terminal for a crash.",
    );
  }
}

/** Assembles the backend's flat, parent-id-linked span events into the
    nested `Span` tree shape TraceTree renders.
    Safe to call repeatedly as more events arrive — later map entries with
    the same id (an "agent" span updated with its real duration) just replace
    the placeholder that was there before. */
export function buildSpanTree(nodes: Map<string, LiveSpanEvent>): Span | null {
  const bySpanId = new Map<string, Span>();
  for (const n of nodes.values()) {
    bySpanId.set(n.id, {
      id: n.id,
      type: n.type,
      label: n.label,
      agent: n.agent,
      ms: n.ms,
      tokens: n.tokens,
      detail: n.detail,
    });
  }

  let root: Span | null = null;
  const childrenOf = new Map<string, Span[]>();
  for (const n of nodes.values()) {
    const node = bySpanId.get(n.id);
    if (!node) continue;
    if (n.parent_id === null) {
      root = node;
    } else {
      const list = childrenOf.get(n.parent_id) ?? [];
      list.push(node);
      childrenOf.set(n.parent_id, list);
    }
  }

  const attach = (span: Span) => {
    const kids = childrenOf.get(span.id);
    if (kids && kids.length) {
      span.children = kids;
      kids.forEach(attach);
    }
  };
  if (root) attach(root);
  return root;
}

export function newBackendSessionId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}
