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

// Points at the FastAPI agent server. Override with NEXT_PUBLIC_BACKEND_URL
// (e.g. in .env.local) when the backend runs on a non-default port — Next
// inlines NEXT_PUBLIC_* at build time, so this resolves in the browser.
export const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:8000";

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
  /** structured tool I/O (read path/lines, shell cmd+exit, edit diff) — the
      backend now populates this on tool spans so TraceTree's IOView renders. */
  io?: Span["io"];
  /** tool call failed (nonzero shell exit, or an Error result) */
  isError?: boolean;
  /** why the model's turn ended (Ollama done_reason: stop/length/load) */
  doneReason?: string;
}

export type LiveEvent =
  | { type: "thought"; round: number; thought?: string; action?: string; depth?: number }
  // incremental answer tokens (depth 0) streamed from the model as it generates
  | { type: "token"; round: number; text: string; depth?: number }
  // incremental native-reasoning (<think>) tokens streamed from the model
  | { type: "reasoning"; round: number; text: string; depth?: number }
  // real per-round token usage → context meter (used vs num_ctx / 262144)
  | { type: "context"; round: number; used: number; max: number; modelMax?: number; compacted?: number; depth?: number }
  | { type: "tool_result"; tool: string; input: string; result: string; diff?: string; isError?: boolean; depth?: number }
  | { type: "span"; span: LiveSpanEvent }
  // nested sub-agent (spawn_scout) delegation boundaries
  | { type: "scout_start"; depth: number; mission: string }
  | { type: "scout_done"; depth: number; report: string }
  // a backend/model error mid-run (the run still ends with `done`)
  | { type: "error"; round: number; message: string }
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
    // Deliberately no inactivity timeout here: a single slow round on
    // CPU-only hardware emits zero SSE bytes until the model call returns,
    // and there is no upper bound on how long the model is allowed to run.
    // The Stop button (abort signal) is the only way to cut a turn short;
    // a dead backend process still closes the connection, which surfaces
    // below as `done` without a `done` event ("Connection lost").
    while (true) {
      const { done, value } = await reader.read();

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
    // On any throw (e.g. abort) the reader is left mid-read; cancelling
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
      io: n.io,
      isError: n.isError,
      doneReason: n.doneReason,
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
