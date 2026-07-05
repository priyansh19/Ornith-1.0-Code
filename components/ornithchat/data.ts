/* OrnithChat UI kit — seed data + types.
   OrnithChat is a plain local chat app: pick a working folder, then chat with the
   local Ornith model. Every turn streams live from the backend agent loop on
   :8000 (see liveBackend.ts); the model itself runs in Ollama. */
import type { ToolItem } from "@/components/ds";

// ── Types ──────────────────────────────────────────────────
export interface Provider {
  id: string;
  name: string;
  url: string;
  isDefault?: boolean;
  connected: boolean;
}

export interface Folder {
  id: string;
  name: string;
}

export type InspStatus = "idle" | "running" | "done";

export interface Insp {
  status: InspStatus;
  session?: string;
  /** current ReAct round while a live run is in flight — real backend data
      (see liveBackend.ts `thought` events), not a fabricated counter. */
  liveRound?: number;
  /** the action the live round is taking (tool name or "answering") */
  liveAction?: string;
  /** real span tree assembled from the backend's span events (see
      liveBackend.ts `buildSpanTree`) — grows as the run progresses. */
  liveSpanRoot?: Span;
  /** wall-clock start of the current/most recent live run (Date.now()) —
      drives the Trace tab's live ticking timer. */
  runStartedAt?: number;
  /** total wall-clock time of the last completed live run, set exactly once
      when the run's `done` (or failure/stop) lands. */
  runTotalMs?: number;
  /** live context-window usage — real token counts from Ollama's response
      metadata (prompt_eval_count + eval_count), updated each round. `ctxUsed`
      is tokens in play last round; `ctxMax` is the configured num_ctx; and
      `ctxModelMax` is Ornith's hard 262,144 ceiling. Drives the Inspector
      context meter. */
  ctxUsed?: number;
  ctxMax?: number;
  ctxModelMax?: number;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  pending?: boolean;
  /** the turn failed (e.g. the backend errored) — shows Retry/Continue */
  error?: boolean;
  /** the turn was aborted mid-stream by the user (Stop / Escape) */
  stopped?: boolean;
}

export interface ToolMessage {
  type: "tool";
  running: boolean;
  summary?: string;
  items?: ToolItem[];
  /** live step-trace feed (real ReAct rounds streamed from the backend) */
  steps?: Step[];
}

export type Message = ChatMessage | ToolMessage;

// ── Step trace (live ReAct feed) ──────────────────────────
// Tool kinds that write or execute — get the amber "writes/executes" badge.
export const DESTRUCTIVE_TOOLS = new Set([
  "shell",
  "delete_file",
  "edit_file",
  "edit_section",
  "create_file",
  "append_to_file",
  "github_create_issue",
  "python_repl",
  "calculator",
]);

// Git read tools get their own distinct visual treatment — not lumped in
// with generic read-only tools (regression fixed in the legacy UI).
export const GIT_TOOLS = new Set(["git_status", "git_diff", "git_log"]);

export type Step =
  | {
      type: "thought";
      round: number;
      thought?: string;
      action?: string;
      /** epoch ms this round's thinking started — used to compute durationMs
          once the round completes (real per-round timing, not fake). */
      startedAt: number;
      durationMs?: number;
      /** agent nesting depth (0 = top-level; >0 = a spawn_scout sub-agent) —
          drives indentation so a scout's steps are visually distinct. */
      depth?: number;
    }
  | {
      type: "tool_result";
      tool: string;
      input: string;
      result: string;
      diff?: string;
      /** the tool call failed (nonzero shell exit or an Error result). */
      isError?: boolean;
      depth?: number;
    }
  | {
      /** a nested sub-agent (spawn_scout) delegation: the mission handed off,
          then the report it returned. */
      type: "scout";
      depth: number;
      mission: string;
      report?: string;
    };

export const isToolMessage = (m: Message): m is ToolMessage =>
  "type" in m && m.type === "tool";

/** Flattened searchable text for a tool-activity row (summary + item labels +
    step trace) — so search matches step/tool-call content, not just replies. */
function toolSearchText(m: ToolMessage): string {
  const items = (m.items ?? [])
    .map((it) => (typeof it.text === "string" ? it.text : ""))
    .join(" ");
  const steps = (m.steps ?? [])
    .map((st) =>
      st.type === "thought"
        ? `${st.thought ?? ""} ${st.action ?? ""}`
        : st.type === "scout"
          ? `${st.mission} ${st.report ?? ""}`
          : `${st.tool} ${st.input}`,
    )
    .join(" ");
  return `${m.summary ?? ""} ${items} ${steps}`;
}

/** Every plain-text form a message can match against — reply content, or a
    tool row's summary/items/steps. */
export function messageSearchText(m: Message): string {
  if (isToolMessage(m)) return toolSearchText(m);
  return m.content;
}

export function messageMatchesQuery(m: Message, query: string): boolean {
  if (!query) return true;
  return messageSearchText(m).toLowerCase().includes(query.toLowerCase());
}

// ── Search (in-chat + global-across-sessions) ─────────────
export type SearchHit = {
  sessionId: string;
  title: string;
  snippet: string;
  matchCount: number;
};

/** Global search across all sessions — one hit per session with a match,
    carrying the first match's snippet plus a total match count so the UI can
    show "+N more matches". Mirrors the legacy ui's searchConversations. */
export function searchSessions(sessions: Session[], query: string): SearchHit[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const hits: SearchHit[] = [];
  for (const s of sessions) {
    const matches = s.messages.filter((m) => messageMatchesQuery(m, q));
    if (matches.length === 0) continue;
    const text = messageSearchText(matches[0]);
    const idx = text.toLowerCase().indexOf(q);
    const start = Math.max(0, idx - 30);
    const end = Math.min(text.length, idx + q.length + 30);
    const snippet =
      (start > 0 ? "…" : "") + text.slice(start, end) + (end < text.length ? "…" : "");
    hits.push({ sessionId: s.id, title: s.title, snippet, matchCount: matches.length });
  }
  return hits;
}

export interface Session {
  id: string;
  title: string;
  folderId: string | null;
  when: string;
  lastActiveAt?: number; // epoch ms; when set, the sidebar renders a live relative time
  project: string | null;
  messages: Message[];
  insp: Insp;
  run: SessionRun;
  pinned?: boolean;
}

/** "47s" / "5m 12s" / "1h 03m" — for run wall-clock durations. */
export function formatRunDuration(ms: number): string {
  const s = Math.max(0, Math.round(ms / 1000));
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ${String(s % 60).padStart(2, "0")}s`;
  const h = Math.floor(m / 60);
  return `${h}h ${String(m % 60).padStart(2, "0")}m`;
}

// ── Model providers (Ollama; URL configurable in Settings) ──
export const DEFAULT_PROVIDER: Provider = {
  id: "ollama-local",
  name: "Ollama (local)",
  url: "http://localhost:11434",
  isDefault: true,
  connected: true,
};
export const MODELS = ["ornith:9b", "gemma4:latest", "qwen3:8b", "nomic-embed-text"];

// ── Folders + sessions (left nav) ──
export const FOLDERS: Folder[] = [
  { id: "f1", name: "Auth bugs" },
  { id: "f2", name: "Design research" },
];

/** Compact relative-time label: <60s "now", <60m "Nm", <24h "Nh",
    <7d short weekday, else "Mon D". */
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
export function relTime(ts: number, now: number): string {
  const diff = Math.max(0, now - ts);
  if (diff < 60_000) return "now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h`;
  const d = new Date(ts);
  if (diff < 7 * 86_400_000) return WEEKDAYS[d.getDay()];
  return `${MONTHS[d.getMonth()]} ${d.getDate()}`;
}

export const SUGGEST = [
  "Fix the login race condition in session.py",
  "Add a test for concurrent token refresh",
  "Refactor the scout dispatch loop",
];

// ── Run trace (span tree) — powers the unified Trace view + waterfall ──
export type SpanType = "agent" | "llm" | "tool" | "thought" | "observation";

export interface SpanIO {
  kind: "edit" | "read" | "run";
  path?: string;
  lines?: string; // e.g. "1–48"
  diff?: { added: string[]; removed: string[] };
  shell?: { cmd: string; out: string[]; exit: number };
}

export interface Span {
  id: string;
  type: SpanType;
  label: string;
  agent?: string;
  ms: number; // duration for leaves; parents are max(children span, own emitted ms)
  tokens?: number;
  detail?: string; // thought / observation / llm text
  io?: SpanIO;
  /** the tool call failed (nonzero shell exit or an Error result) */
  isError?: boolean;
  /** why the model's turn ended (Ollama done_reason) — shown on llm spans */
  doneReason?: string;
  children?: Span[];
}

export interface Interval {
  t0: number;
  ms: number;
}

/** Assigns each span a [t0, ms] interval (leaves consumed sequentially; parents
    wrap their children) for the waterfall. Returns the map + total duration. */
export function computeIntervals(root: Span): {
  map: Record<string, Interval>;
  total: number;
} {
  const map: Record<string, Interval> = {};
  let cursor = 0;
  const walk = (s: Span): Interval => {
    if (!s.children || s.children.length === 0) {
      const iv = { t0: cursor, ms: s.ms };
      cursor += s.ms;
      map[s.id] = iv;
      return iv;
    }
    const start = cursor;
    let end = cursor;
    for (const c of s.children) {
      const iv = walk(c);
      end = Math.max(end, iv.t0 + iv.ms);
    }
    // A parent's duration is the greater of (its children's span) and its own
    // backend-emitted wall-clock ms — the agent span carries a real elapsed
    // time (agent.py) that INCLUDES inter-span gaps (tool marshaling, queue
    // latency) the summed children miss, so honoring it keeps the waterfall
    // total in step with the RunTimer instead of under-reporting.
    const iv = { t0: start, ms: Math.max(end - start, s.ms || 0) };
    map[s.id] = iv;
    return iv;
  };
  const r = walk(root);
  return { map, total: r.ms || 1 };
}

// Live run state, tracked PER SESSION so background runs keep going when the
// user switches sessions. "streaming" = reply tokens landing.
export type SessionRunStatus =
  | "idle"
  | "running"
  | "streaming"
  | "done"
  | "stopped";

export interface SessionRun {
  status: SessionRunStatus;
  step: number;
}

export const IDLE_SESSION_RUN: SessionRun = { status: "idle", step: 0 };
