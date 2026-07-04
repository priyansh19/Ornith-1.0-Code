/* localStorage persistence for LMChatApp — sessions, folders, active session,
   and a few global settings. Loaded once on init;
   written back (debounced) whenever the persisted slice of state changes.
   Never throws: corrupt/missing data always falls back to a safe default.
   Sessions saved by older versions may carry extra keys at runtime (e.g. a
   removed per-session config) — harmless on spread; nothing reads them. */
import type { Folder, Provider, Session } from "./data";
import { IDLE_SESSION_RUN, isToolMessage, isApprovalMessage } from "./data";

const LS_KEY = "mach2:lmchat:v1";

export interface PersistedState {
  sessions: Session[];
  folders: Folder[];
  activeId: string;
  model: string;
  provider: Provider;
  density: "comfortable" | "compact";
  reduceMotion: boolean;
  sidebarWidth: number;
  rightWidth: number;
}

/** Loads persisted state from localStorage. Returns null when there's nothing
    usable (missing, corrupt JSON, or wrong shape) so the caller can fall back
    to its own default/seed state — this function never throws. */
export function loadPersistedState(): Partial<PersistedState> | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(LS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    const state = parsed as Partial<PersistedState>;
    if (Array.isArray(state.sessions)) {
      // Self-heal any duplicate ids from before the id-generator fix (or any
      // other future source of a collision) — keep the first occurrence only,
      // since a duplicate id renders in two sidebar groups at once (e.g. a
      // folder AND "Recent") and confuses every id-keyed lookup.
      state.sessions = dedupeById(state.sessions).map(sanitizeReloadedSession);
    }
    return state;
  } catch {
    return null;
  }
}

/** Keeps the first occurrence of each session id, dropping later duplicates. */
function dedupeById(sessions: Session[]): Session[] {
  const seen = new Set<string>();
  const out: Session[] = [];
  for (const s of sessions) {
    if (!s || typeof s.id !== "string" || seen.has(s.id)) continue;
    seen.add(s.id);
    out.push(s);
  }
  return out;
}

/** A reload/re-mount loses every in-flight timer and abort controller, so any
    session persisted mid-run (status running/waiting/streaming, or a
    still-"running" tool row / pending assistant bubble) would otherwise come
    back frozen with a spinner nothing will ever resolve. Snap those back to a
    stopped, non-busy state. */
function sanitizeReloadedSession(s: Session): Session {
  const busy =
    s.run?.status === "running" ||
    s.run?.status === "waiting" ||
    s.run?.status === "streaming";
  if (!busy) return s;
  return {
    ...s,
    run: { ...IDLE_SESSION_RUN },
    // Keep the backend session id (if one was ever minted) even though the
    // run itself is snapped back to idle — losing it here would silently
    // orphan the next turn into a brand-new, context-less backend session
    // (see backendSessionIdsRef rehydration in LMChatApp.tsx).
    insp: s.insp.session ? { status: "idle", session: s.insp.session } : { status: "idle" },
    messages: s.messages.map((m) => {
      if (isToolMessage(m) && m.running)
        return { type: "tool" as const, running: false, summary: "Interrupted — reloaded", items: m.items ?? [], steps: m.steps ?? [] };
      if (!isToolMessage(m) && !isApprovalMessage(m) && m.role === "assistant" && m.pending)
        return { role: "assistant" as const, content: m.content || "— interrupted by reload" };
      return m;
    }),
  };
}

/** Debounced localStorage write so rapid-fire state updates (e.g. streaming
    tokens into a message) don't serialize + write on every tick and jank the
    UI thread. Call on every relevant state change; the last call within the
    window wins. */
let writeTimer: ReturnType<typeof setTimeout> | null = null;
// The most recently requested (but not yet flushed) write — read by the
// pagehide/visibilitychange flush below so a pin/rename/move/delete made in
// the last ~300ms before a reload or tab close still lands in localStorage
// instead of silently reverting to the pre-change state.
let pendingState: PersistedState | null = null;

function writeNow(state: PersistedState): void {
  try {
    window.localStorage.setItem(LS_KEY, JSON.stringify(state));
  } catch {
    // quota exceeded / serialization failure — drop the write, never throw
  }
}

export function savePersistedState(state: PersistedState, delayMs = 300): void {
  if (typeof window === "undefined") return;
  pendingState = state;
  if (writeTimer) clearTimeout(writeTimer);
  writeTimer = setTimeout(() => {
    writeTimer = null;
    pendingState = null;
    writeNow(state);
  }, delayMs);
}

/** Synchronously flushes any pending debounced write. Safe to call with
    nothing pending (no-ops). Registered against pagehide/visibilitychange so
    a reload or tab close within the debounce window doesn't drop the last
    pin/rename/move/delete — see the module-level `pendingState` note above. */
export function flushPersistedState(): void {
  if (typeof window === "undefined" || !pendingState) return;
  if (writeTimer) {
    clearTimeout(writeTimer);
    writeTimer = null;
  }
  const state = pendingState;
  pendingState = null;
  writeNow(state);
}

/** Rehydrates the live-backend session-id map (session id -> backend session
    id) from persisted sessions on load. Without this, a page reload would
    leave backendSessionIdsRef empty in memory and the next turn for a
    pre-existing conversation would silently mint a fresh backend session,
    losing the backend's real conversational context even though the chat
    history in the UI looks unchanged. */
export function backendSessionIdsFromSessions(
  sessions: Session[] | undefined,
): Map<string, string> {
  const map = new Map<string, string>();
  for (const s of sessions ?? []) {
    if (s.insp?.session) map.set(s.id, s.insp.session);
  }
  return map;
}
