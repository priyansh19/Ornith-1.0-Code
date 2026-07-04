/* LMChat UI kit — seed data + types.
   LMChat is a plain local chat app: pick a working folder, then chat with the
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

export type InspStatus = "idle" | "running" | "waiting" | "done";

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
}

export interface PerfStats {
  ttft: string; // time to first token, e.g. "0.38s"
  tps: number; // decode tokens/sec
  promptTok: number;
  outTok: number;
  model: string; // e.g. "ornith:9b · q4"
  device: "GPU" | "CPU" | "spill";
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  pending?: boolean;
  perf?: PerfStats;
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

export interface ApprovalMessage {
  type: "approval";
  status: "pending" | "approved" | "rejected";
  path: string;
  added: string[];
  removed: string[];
  /** set once a response to /approve has been attempted — surfaces an honest
      failure notice instead of silently no-oping (the endpoint isn't wired
      up server-side yet). */
  networkNotice?: string;
}

export type Message = ChatMessage | ToolMessage | ApprovalMessage;

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
    }
  | {
      type: "tool_result";
      tool: string;
      input: string;
      result: string;
      blocked?: boolean;
      diff?: string;
    }
  | {
      type: "approval_required";
      tool: string;
      input: string;
      diff?: string;
    };

export const isToolMessage = (m: Message): m is ToolMessage =>
  "type" in m && m.type === "tool";
export const isApprovalMessage = (m: Message): m is ApprovalMessage =>
  "type" in m && m.type === "approval";

/** Flattened searchable text for a tool-activity row (summary + item labels +
    step trace) — so search matches step/tool-call content, not just replies. */
function toolSearchText(m: ToolMessage): string {
  const items = (m.items ?? [])
    .map((it) => (typeof it.text === "string" ? it.text : ""))
    .join(" ");
  const steps = (m.steps ?? [])
    .map((st) =>
      st.type === "thought" ? `${st.thought ?? ""} ${st.action ?? ""}` : `${st.tool} ${st.input}`,
    )
    .join(" ");
  return `${m.summary ?? ""} ${items} ${steps}`;
}

/** Every plain-text form a message can match against — reply content, tool
    summary/items/steps, or an approval's file path. */
export function messageSearchText(m: Message): string {
  if (isToolMessage(m)) return toolSearchText(m);
  if (isApprovalMessage(m)) return m.path;
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

// Per-session permission tier (S1)
export type PermTier = "ask" | "auto-read" | "allowlist" | "auto";
export const PERM_TIERS: { value: PermTier; label: string; hint: string }[] = [
  { value: "ask", label: "Ask", hint: "Approve every file write & shell run" },
  { value: "auto-read", label: "Auto-read", hint: "Auto reads; approve writes & shell" },
  { value: "allowlist", label: "Allowlist", hint: "Auto reads + allowlisted shell; approve writes" },
  { value: "auto", label: "Full-auto", hint: "No prompts (use with care)" },
];

export interface CtxFile {
  path: string;
  tokens: number;
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
  permTier: PermTier;
  attached: CtxFile[];
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
  ms: number; // duration for leaves; parents are computed from children
  tokens?: number;
  detail?: string; // thought / observation / llm text
  io?: SpanIO;
  children?: Span[];
}

// ── Model library — only backs the fallback context-window lookup (modelCtx,
// used by ContextMeter); the real model picker/library (ModelsModal) is wired
// to live Ollama data instead (see ollama.ts's listInstalledModelDetails). ──
export interface ModelInfo {
  name: string;
  family: string;
  sizeGB: number;
  quant: string;
  ctx: number;
  params: string;
  vramGB: number;
  caps: { tools: boolean; vision: boolean };
  pulled: boolean;
}
export const MODEL_LIBRARY: ModelInfo[] = [
  { name: "ornith:9b", family: "Ornith", sizeGB: 5.4, quant: "Q4_K_M", ctx: 32768, params: "9B", vramGB: 7.2, caps: { tools: true, vision: false }, pulled: true },
  { name: "gemma4:latest", family: "Gemma", sizeGB: 8.1, quant: "Q4_K_M", ctx: 16384, params: "12B", vramGB: 10.4, caps: { tools: true, vision: true }, pulled: true },
  { name: "qwen3:8b", family: "Qwen", sizeGB: 4.9, quant: "Q4_K_M", ctx: 32768, params: "8B", vramGB: 6.6, caps: { tools: true, vision: false }, pulled: true },
  { name: "nomic-embed-text", family: "Nomic", sizeGB: 0.3, quant: "F16", ctx: 8192, params: "137M", vramGB: 0.5, caps: { tools: false, vision: false }, pulled: true },
  { name: "llama4:70b", family: "Llama", sizeGB: 40, quant: "Q4_K_M", ctx: 131072, params: "70B", vramGB: 44, caps: { tools: true, vision: true }, pulled: false },
  { name: "phi5:mini", family: "Phi", sizeGB: 2.2, quant: "Q4_K_M", ctx: 16384, params: "3.8B", vramGB: 3.1, caps: { tools: false, vision: false }, pulled: false },
];
export const modelInfo = (name: string) => MODEL_LIBRARY.find((m) => m.name === name);
export const modelCtx = (name: string) => modelInfo(name)?.ctx ?? 32768;

// ── Context budget (C1) + @-mention files (C2) ──
export interface CtxZone {
  key: string;
  label: string;
  tokens: number;
  color: string;
}
export function ctxZones(attachedTok: number): { zones: CtxZone[]; used: number } {
  const zones: CtxZone[] = [
    { key: "system", label: "System", tokens: 1200, color: "var(--muted)" },
    { key: "history", label: "History", tokens: 4200, color: "var(--cyan)" },
    { key: "tools", label: "Tool output", tokens: 2600, color: "var(--brand)" },
    { key: "attached", label: "Attached", tokens: attachedTok, color: "var(--agent)" },
    { key: "reserve", label: "Reserve", tokens: 1500, color: "var(--border-strong)" },
  ];
  return { zones, used: zones.reduce((n, z) => n + z.tokens, 0) };
}
export const CONTEXT_FILES: CtxFile[] = [
  { path: "src/auth/session.py", tokens: 820 },
  { path: "src/auth/tokens.py", tokens: 540 },
  { path: "tests/auth/test_session.py", tokens: 610 },
  { path: "README.md", tokens: 1200 },
  { path: "docs/architecture.md", tokens: 2400 },
];

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
    const iv = { t0: start, ms: end - start };
    map[s.id] = iv;
    return iv;
  };
  const r = walk(root);
  return { map, total: r.ms || 1 };
}

// Live run state, tracked PER SESSION so background runs keep going when the
// user switches sessions. "waiting" = approval gate; "streaming" = reply
// tokens landing.
export type SessionRunStatus =
  | "idle"
  | "running"
  | "waiting"
  | "streaming"
  | "done"
  | "stopped";

export interface SessionRun {
  status: SessionRunStatus;
  step: number;
}

export const IDLE_SESSION_RUN: SessionRun = { status: "idle", step: 0 };
