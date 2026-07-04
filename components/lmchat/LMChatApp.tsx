"use client";

import * as React from "react";
import { MessageBubble, ToolCall, Button, Icon, Tooltip } from "@/components/ds";
import { TopBar } from "./TopBar";
import type { NotificationItem } from "./NotificationBell";
import { Composer, attachmentsToPrefix, type Attachment } from "./Composer";
import { Sidebar } from "./Sidebar";
import { StartScreen } from "./StartScreen";
import { SettingsModal } from "./SettingsModal";
import { ModelsModal } from "./ModelsModal";
import { HelpModal } from "./HelpModal";
import { CommandPalette, type Command } from "./CommandPalette";
import { RightPanel, type RightTab } from "./RightPanel";
import { StepTrace } from "./StepTrace";
import { DiffView } from "./DiffView";
import { GlobalSearchResults } from "./GlobalSearchResults";
import {
  FOLDERS,
  DEFAULT_PROVIDER,
  MODELS,
  SUGGEST,
  formatRunDuration,
  isToolMessage,
  isApprovalMessage,
  messageMatchesQuery,
  searchSessions,
  CONTEXT_FILES,
  IDLE_SESSION_RUN,
  type ApprovalMessage,
  type CtxFile,
  type Folder,
  type Insp,
  type PerfStats,
  type PermTier,
  type Provider,
  type SearchHit,
  type Session,
  type Step,
} from "./data";
import {
  checkServerHealth,
  newBackendSessionId,
  runLiveChat,
  buildSpanTree,
  type LiveSpanEvent,
} from "./liveBackend";
import { switchResidentModel, listInstalledModelDetails, recycleModel, RECYCLE_AFTER_MS, type InstalledModelDetail } from "./ollama";
import {
  backendSessionIdsFromSessions,
  flushPersistedState,
  loadPersistedState,
  savePersistedState,
} from "./storage";

/** The user-facing name of the local model/agent every chat turn runs on. */
const AGENT_LABEL = "Ornith";

const APPROVE_URL = "http://localhost:8000/approve";

const NEAR_BOTTOM_PX = 120;

/** Desktop notification for a finished turn — only fires if the tab/window is
    hidden or unfocused, matching normal chat-app etiquette of not notifying
    about something the user is already looking at. Never throws: unsupported
    browsers / denied permission both silently no-op. */
function notifyIfHidden(title: string, body: string) {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (document.visibilityState !== "hidden" && document.hasFocus()) return;
  if (Notification.permission !== "granted") return;
  try {
    new Notification(title, { body });
  } catch {
    /* ignore */
  }
}

function PerfStrip({ perf }: { perf: PerfStats }) {
  return (
    <div className="lm-perf" aria-label="response performance">
      <span className="lm-perf__item">
        <span className="lm-perf__k">TTFT</span> {perf.ttft}
      </span>
      <span className="lm-perf__sep">·</span>
      <span className="lm-perf__item">
        <b>{perf.tps}</b> tok/s
      </span>
      <span className="lm-perf__sep">·</span>
      <span className="lm-perf__item">
        {perf.promptTok}↑ / {perf.outTok}↓
      </span>
      <span className="lm-perf__sep">·</span>
      <span className="lm-perf__item">{perf.model}</span>
      <span className={`lm-perf__dev lm-perf__dev--${perf.device}`}>
        {perf.device}
      </span>
    </div>
  );
}

/** Renders the proposed edit as a unified diff so it flows through the same
    DiffView the trace uses (square markers, Added/Removed summary, etc). */
function unifiedDiffFor(msg: ApprovalMessage): string {
  const lines = [
    `--- a/${msg.path}`,
    `+++ b/${msg.path}`,
    "@@",
    ...msg.removed.map((l) => `-${l}`),
    ...msg.added.map((l) => `+${l}`),
  ];
  return lines.join("\n") + "\n";
}

function ApprovalCard({
  msg,
  onApprove,
  onReject,
}: {
  msg: ApprovalMessage;
  onApprove: () => void;
  onReject: () => void;
}) {
  const pending = msg.status === "pending";
  return (
    <div className={`lm-appr lm-appr--${msg.status}`}>
      <div className="lm-appr__head">
        <span className="lm-appr__title">
          <Icon name="file-pen" size={14} /> Proposed edit
        </span>
        <span className="lm-appr__path">{msg.path}</span>
        {!pending && (
          <span className={`lm-appr__badge lm-appr__badge--${msg.status}`}>
            {msg.status}
          </span>
        )}
      </div>
      <DiffView diff={unifiedDiffFor(msg)} />
      {pending && (
        <div className="lm-appr__actions">
          <Button
            variant="primary"
            size="sm"
            iconLeft={<Icon name="check" size={14} />}
            onClick={onApprove}
          >
            Approve &amp; write
          </Button>
          <Button
            variant="danger"
            size="sm"
            iconLeft={<Icon name="x" size={14} />}
            onClick={onReject}
          >
            Reject
          </Button>
        </div>
      )}
      {pending && (
        <p className="lm-appr__note">
          Backend approval gating isn&rsquo;t wired up yet — this UI is ready
          for it. Approve/Deny currently no-ops until the agent loop supports
          pausing for confirmation.
        </p>
      )}
      {msg.networkNotice && (
        <p className="lm-appr__notice">
          <Icon name="circle-help" size={13} /> {msg.networkNotice}
        </p>
      )}
    </div>
  );
}

type Patch = Partial<Session> | ((s: Session) => Partial<Session>);

/**
 * LMChat app shell — agentic coding chat.
 * Choose a working directory before the first prompt, watch inline
 * tool activity, and read the trace in the right sidebar.
 * Folders · sessions · Ollama provider.
 */
/** A genuinely fresh install (no persisted data at all) used to seed 5
    fabricated demo conversations, which reads as fake data planted in real
    chat history now that every turn is live. One real, genuinely-empty
    session (the exact shape `newSession()` creates) instead — the app still
    needs at least one session to exist (`active` is derived unconditionally
    elsewhere), so this isn't "no seed," it's "an honest one." */
function seedSessions(): Session[] {
  return [
    {
      id: "fresh1",
      title: "New session",
      project: null,
      folderId: null,
      when: "now",
      lastActiveAt: Date.now(),
      messages: [],
      insp: { status: "idle" },
      permTier: "ask",
      attached: [],
      run: { ...IDLE_SESSION_RUN },
    },
  ];
}

// Ids the old fake-seed bootstrap used (s1-s5) — still referenced here only
// to purge them from ALREADY-persisted localStorage on load (see below).
// Never delete a seed-id session that has real messages in it; a user could
// have actually chatted inside one before this was fixed.
const LEGACY_SEED_IDS = new Set(["s1", "s2", "s3", "s4", "s5"]);
function purgeUntouchedLegacySeeds(sessions: Session[]): Session[] {
  const cleaned = sessions.filter((s) => !(LEGACY_SEED_IDS.has(s.id) && s.messages.length === 0));
  return cleaned.length > 0 ? cleaned : seedSessions();
}

interface ResizeHandleProps {
  /** Which side of the dragged panel this handle sits on — determines the
      sign of the width delta (dragging right grows a left-docked panel but
      shrinks a right-docked one). */
  side: "left" | "right";
  width: number;
  setWidth: (w: number) => void;
  min: number;
  max: number;
}

/** Thin draggable strip between a fixed-position panel and the main content —
    turns the sidebar/right-panel's CSS width into a user-adjustable one.
    Plain pointer capture drag, no external dep; width is clamped and handed
    back to the caller to persist. */
function ResizeHandle({ side, width, setWidth, min, max }: ResizeHandleProps) {
  const dragRef = React.useRef<{ startX: number; startWidth: number } | null>(null);

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    dragRef.current = { startX: e.clientX, startWidth: width };
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current) return;
    const delta = e.clientX - dragRef.current.startX;
    const signed = side === "left" ? delta : -delta;
    setWidth(Math.min(max, Math.max(min, dragRef.current.startWidth + signed)));
  };
  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    dragRef.current = null;
    e.currentTarget.releasePointerCapture(e.pointerId);
  };

  return (
    <div
      className="lm-resize-handle"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onDoubleClick={() => setWidth(side === "left" ? 280 : 350)}
      role="separator"
      aria-orientation="vertical"
      aria-label={side === "left" ? "Resize sidebar" : "Resize run details panel"}
    />
  );
}

export function LMChatApp() {
  // Loaded once per mount — corrupt/missing localStorage falls back to null,
  // and every field below independently falls back to its seed/default value.
  const persisted = React.useRef(loadPersistedState()).current;

  const [folders, setFolders] = React.useState<Folder[]>(
    () => persisted?.folders ?? FOLDERS.map((f) => ({ ...f })),
  );
  const [sessions, setSessions] = React.useState<Session[]>(() =>
    persisted?.sessions ? purgeUntouchedLegacySeeds(persisted.sessions) : seedSessions(),
  );
  const [activeId, setActiveId] = React.useState(() => {
    const wanted = persisted?.activeId;
    const stillThere = wanted && sessions.some((s) => s.id === wanted);
    return stillThere ? wanted : (sessions[0]?.id ?? "");
  });
  const [model, setModel] = React.useState(() => persisted?.model ?? "ornith:9b");
  // True while a real Ollama load/unload swap is in flight — the app
  // shouldn't be treated as ready to run against the new model until this
  // settles, since Ollama is still swapping which weights are resident.
  const [modelLoading, setModelLoading] = React.useState(false);
  // Ollama's API reports real byte-progress for PULLING a model but no
  // granular progress for LOADING an already-downloaded one into memory —
  // it's a single opaque step with no partial-percent signal to show. An
  // elapsed-seconds counter is the honest alternative to a fabricated
  // progress bar (this app has been actively removing invented numbers all
  // session — this would be the same mistake in a new spot).
  const [modelLoadingElapsedS, setModelLoadingElapsedS] = React.useState(0);
  // The model actually being loaded right now — distinct from `model` (the
  // last CONFIRMED-active one), which only updates once the swap succeeds.
  // Without this, the tooltip/label kept showing the OLD model name for the
  // entire loading window (confirmed bug: selecting gemma while ornith was
  // active showed "Loading ornith…" the whole time, since it read `model`).
  const [pendingModel, setPendingModel] = React.useState<string | null>(null);
  // Real, observed swap phase (not a fabricated percentage) — which of the
  // two actual API calls is in flight right now, and what it's acting on.
  const [modelSwapPhase, setModelSwapPhase] = React.useState<{ phase: "unloading" | "loading"; detail: string } | null>(null);
  React.useEffect(() => {
    if (!modelLoading) return;
    setModelLoadingElapsedS(0);
    const start = Date.now();
    const id = setInterval(() => setModelLoadingElapsedS(Math.floor((Date.now() - start) / 1000)), 1000);
    return () => clearInterval(id);
  }, [modelLoading]);
  // When the current model was last (re)loaded — drives the 6h recycle
  // check below. Only meaningful for the lifetime of this tab; a page
  // reload resets it (a real fix that survives app restarts would need the
  // backend itself to manage this, not the browser tab).
  const modelLoadedAtRef = React.useRef(Date.now());
  // Real models actually pulled in Ollama — single source of truth shared by
  // the composer's dropdown and the command palette's "Switch model" list, so
  // neither ever offers a model that isn't really there. Falls back to the
  // static MODELS list until the fetch resolves (or if it fails).
  const [installedModels, setInstalledModels] = React.useState<string[]>(MODELS);
  // Real per-model specs (size/quant/params) — lets the composer's model
  // dropdown show more than a bare name, same data ModelsModal already uses.
  const [installedModelDetails, setInstalledModelDetails] = React.useState<InstalledModelDetail[]>([]);
  const [provider, setProvider] = React.useState<Provider>(
    () => persisted?.provider ?? { ...DEFAULT_PROVIDER },
  );
  // Same call doubles as the "is Ollama actually reachable" probe —
  // provider.connected used to be a hardcoded `true` from DEFAULT_PROVIDER
  // that never reflected reality. Polled on the same 8s cadence as the
  // backend's serverUp check below.
  React.useEffect(() => {
    let cancelled = false;
    const poll = () => {
      listInstalledModelDetails()
        .then((details) => {
          if (cancelled) return;
          if (details.length > 0) {
            setInstalledModelDetails(details);
            setInstalledModels(details.map((d) => d.name));
          }
          setProvider((p) => (p.connected ? p : { ...p, connected: true }));
        })
        .catch(() => {
          if (!cancelled) setProvider((p) => (p.connected ? { ...p, connected: false } : p));
        });
    };
    poll();
    const t = setInterval(poll, 8000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, []);
  const [openFolders, setOpenFolders] = React.useState<Record<string, boolean>>(
    {},
  );
  const [sidebarQuery, setSidebarQuery] = React.useState("");
  // Search (Ctrl+F) — matches message text AND step/tool-call content.
  // "chat" scope filters the active session's messages inline; "all" scope
  // searches every session and shows GlobalSearchResults instead of the chat.
  const [search, setSearch] = React.useState("");
  const [searchOpen, setSearchOpen] = React.useState(false);
  const [searchScope, setSearchScope] = React.useState<"chat" | "all">("chat");
  const searchInputRef = React.useRef<HTMLInputElement | null>(null);
  const [input, setInput] = React.useState("");
  // Real file attachments (composer drag-drop / file-picker) — distinct from
  // the @-mention "context files" pulled from the repo (`attached` on Session).
  // Their content is prefixed onto the outgoing message text in `send`.
  const [files, setFiles] = React.useState<Attachment[]>([]);
  const addFiles = React.useCallback((incoming: Attachment[]) => {
    setFiles((p) => [...p, ...incoming]);
  }, []);
  const removeFile = React.useCallback((id: string) => {
    setFiles((p) => p.filter((f) => f.id !== id));
  }, []);
  const [dir, setDir] = React.useState("~/projects/mach2");
  // Defaults open (matches SSR) but collapses on first mount if the window
  // is already narrow, so the chat gets full width on small screens instead
  // of the run-details panel eating the layout before anyone touches it.
  const [rightOpen, setRightOpen] = React.useState(true);
  React.useEffect(() => {
    if (typeof window !== "undefined" && window.innerWidth <= 940) setRightOpen(false);
  }, []);
  // Ask once, like a normal browser permission prompt — never re-prompt if
  // the user already granted/denied it in a prior session.
  React.useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);
  const [rightTab, setRightTab] = React.useState<RightTab>("inspector");
  const [settingsOpen, setSettingsOpen] = React.useState(false);
  const [settingsInitialTab, setSettingsInitialTab] = React.useState("provider");
  const openSettings = (tab: string = "provider") => {
    setSettingsInitialTab(tab);
    setSettingsOpen(true);
  };
  const [modelsOpen, setModelsOpen] = React.useState(false);
  const [paletteOpen, setPaletteOpen] = React.useState(false);
  const [helpOpen, setHelpOpen] = React.useState(false);
  const [navOpen, setNavOpen] = React.useState(false);
  const [density, setDensity] = React.useState<"comfortable" | "compact">(
    () => persisted?.density ?? "comfortable",
  );
  const [reduceMotion, setReduceMotion] = React.useState(
    () => persisted?.reduceMotion ?? false,
  );
  const [sidebarWidth, setSidebarWidth] = React.useState(
    () => persisted?.sidebarWidth ?? 280,
  );
  const [rightWidth, setRightWidth] = React.useState(
    () => persisted?.rightWidth ?? 350,
  );
  // Persistent notification queue (bell icon in TopBar) — replaces the old
  // bottom-centered auto-dismissing toasts, which interrupted the chat view.
  // Capped so a long session doesn't grow this unboundedly.
  const [toasts, setToasts] = React.useState<NotificationItem[]>([]);
  const MAX_NOTIFICATIONS = 50;
  // Kept as pass-through wiring for TraceTree's focus highlight; nothing
  // sets it since the critique "jump to span" flow was removed.
  const [focusSpan] = React.useState<string | undefined>(undefined);
  const scrollRef = React.useRef<HTMLDivElement | null>(null);
  // Auto-scroll only fires when the user was already near the bottom — doesn't
  // yank the view down if they scrolled up to read history mid-stream.
  const nearBottomRef = React.useRef(true);
  // Mirrors `activeBusy` (computed later in this component) for the global
  // keydown handler below — declared as a ref up here so the handler doesn't
  // reference a `const` before its own declaration further down the file.
  const activeBusyRef = React.useRef(false);
  // Monotonic, reload-safe id suffix. A plain-counter ref restarting at a
  // fixed number on every mount would mint the SAME id (e.g. "n100") as a
  // session already sitting in persisted state from a prior tab session —
  // two distinct objects sharing one id breaks the sidebar's folder/pinned/
  // recent partition (a session can render in two groups at once, since each
  // group filters independently and both copies match by id) and confuses
  // every id-keyed lookup (find/map/delete). Seeding from Date.now() plus a
  // per-mount counter keeps ids unique across reloads without needing to
  // scan persisted state.
  const uid = React.useRef(Date.now());
  const toastId = React.useRef(1);

  // ── Live backend bridge (agent/p13-ornith via server/main.py) ──
  // Never left empty — an empty session_id would mint a fresh, context-less
  // backend session on every turn (the same bug fixed in the legacy ui).
  // Seeded from persisted sessions' insp.session on mount so a page reload
  // doesn't silently orphan an existing conversation into a brand-new
  // backend session (in-memory Maps don't survive reload on their own).
  const backendSessionIdsRef = React.useRef(
    backendSessionIdsFromSessions(persisted?.sessions),
  );
  const liveControllersRef = React.useRef(new Map<string, AbortController>());
  const [serverUp, setServerUp] = React.useState(false);

  const backendSessionId = React.useCallback((sid: string): string => {
    let id = backendSessionIdsRef.current.get(sid);
    if (!id) {
      id = newBackendSessionId();
      backendSessionIdsRef.current.set(sid, id);
    }
    return id;
  }, []);

  React.useEffect(() => {
    let cancelled = false;
    let inFlight: AbortController | null = null;
    const poll = () => {
      inFlight?.abort(); // never let two health checks overlap
      const controller = new AbortController();
      inFlight = controller;
      checkServerHealth(controller.signal).then((up) => {
        if (!cancelled && inFlight === controller) setServerUp(up);
      });
    };
    poll();
    const t = setInterval(poll, 8000);
    return () => {
      cancelled = true;
      inFlight?.abort();
      clearInterval(t);
    };
  }, []);

  const notify = React.useCallback((msg: string) => {
    const id = toastId.current++;
    setToasts((t) => [...t, { id, msg, at: Date.now() }].slice(-MAX_NOTIFICATIONS));
  }, []);

  // Recycle check: a model loaded continuously for 6+ hours gets unloaded,
  // rests for a 10-minute cooldown, then reloads fresh — a periodic check
  // (every 15 min) rather than one long-lived timer, so it's still correct
  // even if this tab was suspended/throttled in the background for a while.
  React.useEffect(() => {
    let recycling = false;
    const check = async () => {
      if (recycling || modelLoading) return;
      if (Date.now() - modelLoadedAtRef.current < RECYCLE_AFTER_MS) return;
      recycling = true;
      const current = model;
      notify(`${current} has been loaded 6h+ — recycling (10 min cooldown)…`);
      try {
        await recycleModel(current);
        modelLoadedAtRef.current = Date.now();
        notify(`${current} reloaded after cooldown`);
      } catch {
        /* next periodic check will retry */
      } finally {
        recycling = false;
      }
    };
    const t = setInterval(check, 15 * 60_000);
    return () => clearInterval(t);
  }, [model, modelLoading, notify]);

  // Persist to localStorage whenever any saved slice changes. The write
  // itself is debounced inside savePersistedState, so fast-changing state
  // (e.g. tokens streaming into a message) doesn't thrash the UI thread.
  React.useEffect(() => {
    savePersistedState({
      sessions,
      folders,
      activeId,
      model,
      provider,
      density,
      reduceMotion,
      sidebarWidth,
      rightWidth,
    });
  }, [sessions, folders, activeId, model, provider, density, reduceMotion, sidebarWidth, rightWidth]);

  // Flush any still-debounced write immediately on reload/tab-close/tab-hide.
  // Without this, a pin/rename/move/delete made within the ~300ms debounce
  // window of a reload is silently lost — the setTimeout in
  // savePersistedState never fires because the page is gone before it does.
  // `pagehide` covers reload/navigation/close; `visibilitychange` also covers
  // switching away to another tab/app without fully closing this one.
  React.useEffect(() => {
    const flush = () => flushPersistedState();
    window.addEventListener("pagehide", flush);
    document.addEventListener("visibilitychange", flush);
    return () => {
      window.removeEventListener("pagehide", flush);
      document.removeEventListener("visibilitychange", flush);
    };
  }, []);

  // Abort every session's in-flight live request on unmount.
  React.useEffect(() => {
    const liveControllers = liveControllersRef.current;
    return () => {
      for (const c of liveControllers.values()) c.abort();
      liveControllers.clear();
    };
  }, []);

  const toggleRight = React.useCallback(() => {
    setRightOpen((o) => {
      const n = !o;
      if (n) setRightTab("trace");
      return n;
    });
  }, []);

  const overlayOpen =
    paletteOpen ||
    settingsOpen ||
    modelsOpen ||
    helpOpen;

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((o) => !o);
        return;
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "f") {
        if (overlayOpen) return;
        e.preventDefault();
        setSearchOpen((o) => !o);
        return;
      }
      if (e.key === "Escape" && activeBusyRef.current) {
        // Stopping a live run takes priority over closing search — matches
        // the checklist's "Esc stops an in-flight request or closes an open
        // overlay/search" ordering.
        stopSessionRun(activeId);
        return;
      }
      if (e.key === "Escape" && searchOpen) {
        setSearchOpen(false);
        setSearch("");
        return;
      }
      if (e.key !== "[" && e.key !== "]") return;
      const t = e.target;
      const typing =
        t instanceof HTMLElement &&
        (t.tagName === "INPUT" ||
          t.tagName === "TEXTAREA" ||
          t.tagName === "SELECT" ||
          t.isContentEditable);
      if (overlayOpen || typing) return;
      e.preventDefault();
      if (e.key === "[") setNavOpen((o) => !o);
      else toggleRight();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [overlayOpen, toggleRight, searchOpen, activeId]);

  React.useEffect(() => {
    if (searchOpen) searchInputRef.current?.focus();
  }, [searchOpen]);

  // Global (all-chats) search — only computed while the global-search view is
  // actually open, so it never re-runs on every streamed token in the active
  // chat (search bar closed or scoped to "chat" both skip this entirely).
  const globalHits: SearchHit[] = React.useMemo(
    () => (searchScope === "all" && searchOpen && search ? searchSessions(sessions, search) : []),
    [searchScope, searchOpen, search, sessions],
  );

  const clearSearchFilter = React.useCallback(() => {
    setSearch("");
    setSearchOpen(false);
  }, []);

  // The query that actually filters the active chat's messages — only live
  // when scoped to "this chat" (an "all chats" query doesn't touch the chat
  // view at all; that's what GlobalSearchResults renders instead).
  const chatSearchQuery = searchScope === "chat" ? search : "";

  const jumpToSessionSearchHit = React.useCallback(
    (sessionId: string) => {
      selectSession(sessionId);
      setSearchOpen(false);
      setSearchScope("chat");
      // `search` is intentionally left set — landing in "chat" scope with the
      // query still active is what filters the chat to the matching message(s)
      // instead of dropping the user into an unfiltered conversation.
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const active = sessions.find((s) => s.id === activeId) || sessions[0];
  // The "session started" gate — the start screen shows until a working
  // folder is picked; after that, every send goes straight to the backend.
  const started = !!(active && active.project);
  const pendingApproval =
    !!active &&
    active.messages.some((m) => isApprovalMessage(m) && m.status === "pending");

  const activeRun = active ? active.run : IDLE_SESSION_RUN;
  const activeBusy =
    activeRun.status === "running" || activeRun.status === "streaming";
  React.useEffect(() => {
    activeBusyRef.current = activeBusy;
  }, [activeBusy]);

  React.useEffect(() => {
    const el = scrollRef.current;
    if (el && nearBottomRef.current) el.scrollTop = el.scrollHeight;
  }, [active?.messages]);

  // Switching sessions always resets to "near bottom" so the new session's
  // chat opens scrolled to the latest turn instead of wherever it was left.
  React.useEffect(() => {
    nearBottomRef.current = true;
  }, [activeId]);

  const handleChatScroll = React.useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const distance = el.scrollHeight - el.scrollTop - el.clientHeight;
    nearBottomRef.current = distance < NEAR_BOTTOM_PX;
  }, []);

  const patchSession = React.useCallback(
    (id: string, patch: Patch) =>
      setSessions((p) =>
        p.map((s) =>
          s.id === id
            ? { ...s, ...(typeof patch === "function" ? patch(s) : patch) }
            : s,
        ),
      ),
    [],
  );

  const patchActive = (patch: Patch) => patchSession(activeId, patch);

  function newSession() {
    const id = "n" + uid.current++;
    setSessions((p) => [
      {
        id,
        title: "New session",
        project: null,
        folderId: null,
        when: "now",
        lastActiveAt: Date.now(),
        messages: [],
        insp: { status: "idle" },
        permTier: "ask",
        attached: [],
        run: { ...IDLE_SESSION_RUN },
      },
      ...p,
    ]);
    setActiveId(id);
    setInput("");
    setFiles([]);
    setDir("~/projects/mach2");
  }

  function createFolder(): string {
    const id = "d" + uid.current++;
    setFolders((p) => [...p, { id, name: "New folder" }]);
    return id;
  }

  function newFolder() {
    createFolder();
  }

  function renameSession(id: string, title: string) {
    setSessions((p) => p.map((s) => (s.id === id ? { ...s, title } : s)));
  }

  function deleteSession(id: string) {
    // a deleted session's in-flight run must not keep streaming
    liveControllersRef.current.get(id)?.abort();
    liveControllersRef.current.delete(id);
    backendSessionIdsRef.current.delete(id);
    // Functional updater (not a snapshot of the `sessions` closure) so this
    // never clobbers a concurrent state update — e.g. a background run's
    // patchSession tick for a different session landing in the same batch.
    setSessions((prev) => {
      const remaining = prev.filter((s) => s.id !== id);
      if (id === activeId) {
        if (remaining.length > 0) setActiveId(remaining[0].id);
        else newSession();
      }
      return remaining;
    });
    notify("Session deleted");
  }

  function moveSession(id: string, folderId: string | null) {
    setSessions((p) => p.map((s) => (s.id === id ? { ...s, folderId } : s)));
  }

  function renameFolder(id: string, name: string) {
    setFolders((p) => p.map((f) => (f.id === id ? { ...f, name } : f)));
  }

  function deleteFolder(id: string) {
    setFolders((p) => p.filter((f) => f.id !== id));
    setSessions((p) =>
      p.map((s) => (s.folderId === id ? { ...s, folderId: null } : s)),
    );
    notify("Folder removed — sessions kept");
  }

  // Picking a folder is the whole affordance now — every tool call the agent
  // makes is scoped to `project` automatically, with no separate visible
  // "lock" step or cross-session contention UI. This app has exactly one
  // user; the earlier acquire/take-over flow was solving a
  // multi-session-conflict problem nobody actually has here.
  function startSession() {
    const project = dir.trim() || "~/projects";
    patchActive({ project });
    setRightTab("inspector");
  }

  function moveFolder(newDir: string) {
    if (!active || !newDir) return;
    patchActive({ project: newDir });
    notify(`Workspace moved to ${newDir}`);
  }

  function setPermTier(t: PermTier) {
    patchActive({ permTier: t });
  }

  function attachContext(f: CtxFile) {
    patchActive((s) =>
      s.attached.some((a) => a.path === f.path)
        ? {}
        : { attached: [...s.attached, f] },
    );
  }

  function detachContext(path: string) {
    patchActive((s) => ({ attached: s.attached.filter((a) => a.path !== path) }));
  }

  function clearSession() {
    liveControllersRef.current.get(activeId)?.abort();
    liveControllersRef.current.delete(activeId);
    // Dropped, not reset to "" — a lazily-regenerated fresh id next send()
    // avoids ever handing the backend an empty session_id (see liveBackend.ts).
    backendSessionIdsRef.current.delete(activeId);
    patchActive({
      messages: [],
      insp: { status: "idle" },
      run: { ...IDLE_SESSION_RUN },
    });
    setInput("");
    setFiles([]);
    notify("Session cleared");
  }

  function selectSession(id: string) {
    // Background runs keep going — switching sessions never kills a run.
    setActiveId(id);
    setNavOpen(false);
  }

  function toggleFolder(fid: string) {
    setOpenFolders((p) => ({ ...p, [fid]: p[fid] === false ? true : false }));
  }

  function togglePin(id: string) {
    setSessions((p) =>
      p.map((s) => (s.id === id ? { ...s, pinned: !s.pinned } : s)),
    );
  }

  function saveUrl(url: string) {
    setProvider((p) => ({ ...p, url }));
    setSettingsOpen(false);
    notify("Provider URL saved");
  }

  async function switchModel(m: string) {
    if (m === model || modelLoading) return;
    setModelLoading(true);
    setPendingModel(m);
    setModelSwapPhase(null);
    notify(`Loading ${m}…`);
    try {
      // Ollama has its own residency lifecycle, separate from the agent
      // backend — this actually loads the new model's weights into memory
      // and unloads whatever else was resident, rather than just relabeling
      // a dropdown. Real load time on this (GPU-less) box can be tens of
      // seconds for a several-GB model.
      await switchResidentModel(m, undefined, (phase, detail) => setModelSwapPhase({ phase, detail }));
      setModel(m);
      modelLoadedAtRef.current = Date.now();
      notify(`${m} loaded — now the active model`);
    } catch (err) {
      notify(`Couldn't load ${m}: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setModelLoading(false);
      setPendingModel(null);
      setModelSwapPhase(null);
    }
  }

  function exportRun() {
    if (!active) return;
    const data = {
      exportedFrom: "LMChat",
      session: {
        id: active.id,
        title: active.title,
        project: active.project,
        model,
        provider: provider.url,
        permTier: active.permTier,
      },
      attached: active.attached,
      messages: active.messages,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${active.id}-run.json`;
    a.click();
    URL.revokeObjectURL(url);
    notify("Run exported as JSON");
  }

  function send(text?: string) {
    const typed = (text ?? input).trim();
    // Attachment content is prefixed onto the real outgoing text, but the
    // visible user bubble only ever shows what was actually typed.
    const body = (attachmentsToPrefix(files) + typed).trim();
    if (!body || activeBusy || !started || pendingApproval) return;
    const sid = activeId; // captured — background runs patch THIS session
    setInput("");
    setFiles([]);
    patchSession(sid, (s) => ({
      title: s.title === "New session" ? (typed || body).slice(0, 38) : s.title,
      lastActiveAt: Date.now(),
      messages: [
        ...s.messages,
        { role: "user", content: typed || body },
        { type: "tool", running: true },
        { role: "assistant", content: "", pending: true },
      ],
      insp: { status: "running" },
      run: { status: "running", step: 0 },
    }));
    setRightOpen(true);
    setRightTab("inspector");
    sendLive(sid, body);
  }

  /** Stream one real turn from the backend agent loop straight into the
      chat — the message, inline tool-activity row, and span trace are all
      real backend data. */
  function sendLive(sid: string, prompt: string) {
    const controller = new AbortController();
    liveControllersRef.current.set(sid, controller);
    const sid_backend = backendSessionId(sid);
    // Built up locally (not just derived from state) so each new event closes
    // out the previous thought's real elapsed time before appending the next
    // bullet — gives "Thought for Ns" a genuine per-round duration.
    const steps: Step[] = [];
    // Flat, id-keyed accumulator for the backend's span events — rebuilt into
    // a tree (buildSpanTree) each time a new one arrives, feeding the Trace
    // tab. Scoped to this one call, so a fresh run starts with an empty tree.
    const spanNodes = new Map<string, LiveSpanEvent>();
    // Wall-clock start of this run — feeds the Trace tab's live timer and
    // the "Done in Xm Ys" summary when the run lands.
    const runStartedAt = Date.now();
    patchSession(sid, (s) => ({
      insp: { ...s.insp, runStartedAt, runTotalMs: undefined },
    }));

    const applySteps = (running: boolean) =>
      patchSession(sid, (s) => ({
        messages: s.messages.map((m) =>
          isToolMessage(m) && m.running
            ? { type: "tool" as const, running, summary: m.summary, items: m.items, steps: [...steps] }
            : m,
        ),
      }));

    runLiveChat(
      prompt,
      sid_backend,
      model,
      (evt) => {
        if (evt.type === "thought") {
          const last = steps[steps.length - 1];
          if (last && last.type === "thought") {
            // Consecutive thinking (no tool call between) collapses into ONE
            // bullet instead of a stack of "Thought for Xs" rows — the text
            // accumulates and the duration keeps running from the FIRST
            // thought's start, so the final "Thought for Ns" is the true sum.
            last.thought = [last.thought, evt.thought].filter(Boolean).join("\n\n");
            last.action = evt.action ?? last.action;
            last.round = evt.round;
          } else {
            steps.push({
              type: "thought",
              round: evt.round,
              thought: evt.thought,
              action: evt.action,
              startedAt: Date.now(),
            });
          }
          patchSession(sid, (s) => ({
            insp: {
              ...s.insp,
              status: "running",
              session: sid_backend,
              liveRound: evt.round,
              liveAction: evt.action,
            },
          }));
          applySteps(true);
        } else if (evt.type === "tool_result") {
          const prevThought = [...steps].reverse().find((st) => st.type === "thought");
          if (prevThought && prevThought.type === "thought" && prevThought.durationMs === undefined) {
            prevThought.durationMs = Date.now() - prevThought.startedAt;
          }
          steps.push({
            type: "tool_result",
            tool: evt.tool,
            input: evt.input,
            result: evt.result,
            diff: evt.diff,
          });
          applySteps(true);
        } else if (evt.type === "span") {
          spanNodes.set(evt.span.id, evt.span);
          const root = buildSpanTree(spanNodes);
          patchSession(sid, (s) => ({
            insp: { ...s.insp, liveSpanRoot: root ?? undefined },
          }));
        } else if (evt.type === "done") {
          const prevThought = [...steps].reverse().find((st) => st.type === "thought");
          if (prevThought && prevThought.type === "thought" && prevThought.durationMs === undefined) {
            prevThought.durationMs = Date.now() - prevThought.startedAt;
          }
          const totalMs = Date.now() - runStartedAt;
          patchSession(sid, (s) => ({
            messages: s.messages.map((m) => {
              if (isToolMessage(m) && m.running)
                return { type: "tool" as const, running: false, summary: `Done in ${formatRunDuration(totalMs)}`, items: m.items ?? [], steps: [...steps] };
              if (!isToolMessage(m) && !isApprovalMessage(m) && m.role === "assistant" && m.pending)
                return { role: "assistant" as const, content: evt.answer };
              return m;
            }),
            run: { status: "done", step: 0 },
            insp: { ...s.insp, status: "idle", session: sid_backend, runTotalMs: totalMs },
          }));
          notifyIfHidden(`${AGENT_LABEL} — response ready`, evt.answer.slice(0, 100));
        }
      },
      controller.signal,
    )
      .catch((err) => {
        if (controller.signal.aborted) return; // stopSessionRun already finalized the messages
        const message = err instanceof Error ? err.message : String(err);
        patchSession(sid, (s) => ({
          messages: s.messages.map((m) => {
            if (isToolMessage(m) && m.running)
              return { type: "tool" as const, running: false, summary: `Failed after ${formatRunDuration(Date.now() - runStartedAt)}`, items: m.items ?? [], steps: [...steps] };
            if (!isToolMessage(m) && !isApprovalMessage(m) && m.role === "assistant" && m.pending)
              return {
                role: "assistant" as const,
                content: `⚠️ ${message}`,
                error: true,
              };
            return m;
          }),
          run: { status: "stopped", step: 0 },
          insp: { ...s.insp, status: "idle", runTotalMs: Date.now() - runStartedAt },
        }));
        notify(`${AGENT_LABEL}: ${message}`);
      })
      .finally(() => {
        // Only clear the map entry if it's still THIS run's controller — if
        // the user stopped this run and immediately sent a new one in the
        // same session, a fresh controller is already stored under `sid`;
        // this stale cleanup must not delete it (that would silently strand
        // the new run with no way to stop it).
        if (liveControllersRef.current.get(sid) === controller) {
          liveControllersRef.current.delete(sid);
        }
      });
  }

  /** Stop an in-flight run (Stop button / Escape in the composer). */
  function stopSessionRun(sid: string) {
    const target = sessions.find((x) => x.id === sid);
    if (
      !target ||
      (target.run.status !== "running" && target.run.status !== "streaming")
    )
      return;
    const liveController = liveControllersRef.current.get(sid);
    if (liveController) {
      liveController.abort();
      liveControllersRef.current.delete(sid);
    }
    patchSession(sid, (s) => ({
      messages: s.messages.map((m) => {
        if (isToolMessage(m) && m.running)
          return {
            type: "tool" as const,
            running: false,
            summary: "Stopped by user",
            items: m.items ?? [],
            steps: m.steps ?? [],
          };
        if (
          !isToolMessage(m) &&
          !isApprovalMessage(m) &&
          m.role === "assistant" &&
          m.pending
        )
          return {
            role: "assistant" as const,
            content: m.content,
            pending: false,
            stopped: true,
          };
        return m;
      }),
      run: { ...s.run, status: "stopped" as const },
      insp: { status: "idle" },
    }));
    notify("Run stopped");
  }

  /** Last user message's text in the active session — the prompt Retry redoes. */
  function lastUserPrompt(): string | undefined {
    if (!active) return undefined;
    for (let i = active.messages.length - 1; i >= 0; i--) {
      const m = active.messages[i];
      if (!isToolMessage(m) && !isApprovalMessage(m) && m.role === "user")
        return m.content;
    }
    return undefined;
  }

  /** Retry — redo the exact same request (drops the failed/empty turn first). */
  function retryLast() {
    if (!active || activeBusy) return;
    const prompt = lastUserPrompt();
    if (!prompt) return;
    // Drop the trailing user turn + its tool/assistant messages so `send`
    // re-appends a fresh copy instead of duplicating history.
    const idx = active.messages
      .map((m, i) => ({ m, i }))
      .reverse()
      .find(({ m }) => !isToolMessage(m) && !isApprovalMessage(m) && m.role === "user")?.i;
    if (idx === undefined) return;
    patchActive((s) => ({ messages: s.messages.slice(0, idx) }));
    send(prompt);
  }

  /** Retry from a specific user message — drops everything from that turn
      onward and resends it (per-message hover action, not just the latest). */
  function retryFrom(index: number) {
    if (!active || activeBusy) return;
    const target = active.messages[index];
    if (isToolMessage(target) || isApprovalMessage(target) || target.role !== "user")
      return;
    const prompt = target.content;
    patchActive((s) => ({ messages: s.messages.slice(0, index) }));
    send(prompt);
  }

  /** Continue — nudge the agent to pick up where it left off, as a new turn. */
  function continueRun() {
    if (activeBusy) return;
    send("Please continue from where you left off.");
  }

  /** Attempts the (not-yet-implemented) /approve endpoint so the failure path
      is real, not simulated. The backend currently declares no such route,
      so this always 404s — the honest notice below reflects that instead of
      failing silently (mirrors the legacy ui's respondToApproval). */
  async function notifyApproveEndpoint(sid: string, approved: boolean) {
    let notice: string | undefined;
    try {
      const resp = await fetch(APPROVE_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: backendSessionId(sid), approved }),
      });
      if (!resp.ok) throw new Error(`Approve endpoint ${resp.status}`);
    } catch {
      notice = "Approval not recorded — backend endpoint isn't wired up yet.";
    }
    if (notice) {
      patchSession(sid, (s) => {
        const idx = s.messages.findIndex(
          (x) => isApprovalMessage(x) && x.status !== "pending",
        );
        if (idx < 0) return {};
        const m = [...s.messages];
        m[idx] = { ...(m[idx] as ApprovalMessage), networkNotice: notice };
        return { messages: m };
      });
    }
  }

  /** Mark a pending approval approved. The backend approval gate isn't wired
      up yet (see notifyApproveEndpoint) — this only records the decision. */
  function approveEdit() {
    const sid = activeId;
    patchSession(sid, (s) => {
      const idx = s.messages.findIndex(
        (x) => isApprovalMessage(x) && x.status === "pending",
      );
      if (idx < 0) return {};
      const m = [...s.messages];
      m[idx] = { ...(m[idx] as ApprovalMessage), status: "approved" };
      return {
        messages: m,
        insp: { status: "idle" },
        run: { ...IDLE_SESSION_RUN },
      };
    });
    void notifyApproveEndpoint(sid, true);
  }

  function rejectEdit() {
    const sid = activeId;
    patchActive((s) => {
      const idx = s.messages.findIndex(
        (x) => isApprovalMessage(x) && x.status === "pending",
      );
      if (idx < 0) return {};
      const m = [...s.messages];
      m[idx] = { ...(m[idx] as ApprovalMessage), status: "rejected" };
      m.push({
        role: "assistant",
        content: "Left the file unchanged — nothing was written.",
      });
      return {
        messages: m,
        insp: { status: "idle" },
        run: { ...IDLE_SESSION_RUN },
      };
    });
    void notifyApproveEndpoint(sid, false);
  }

  const insp: Insp = active ? active.insp : { status: "idle" };

  const commands: Command[] = [
    { id: "new", group: "Actions", label: "New session", run: newSession },
    { id: "newfolder", group: "Actions", label: "New folder", run: newFolder },
    { id: "export", group: "Actions", label: "Export run", run: exportRun },
    { id: "panel", group: "Actions", label: "Toggle right panel", run: toggleRight },
    { id: "models", group: "Actions", label: "Model library", run: () => setModelsOpen(true) },
    { id: "settings", group: "Actions", label: "Settings", run: () => openSettings() },
    ...installedModels.filter((m) => !m.includes("embed")).map((m) => ({
      id: "m-" + m,
      group: "Switch model",
      label: m,
      run: () => switchModel(m),
    })),
    ...sessions.map((s) => ({
      id: "s-" + s.id,
      group: "Go to session",
      label: s.title,
      hint: s.when,
      run: () => selectSession(s.id),
    })),
  ];

  return (
    <div
      className="lm-app"
      data-density={density}
      data-motion={reduceMotion ? "reduced" : undefined}
    >
      <TopBar
        onOpenModels={() => setModelsOpen(true)}
        onExport={exportRun}
        onClear={clearSession}
        onToggleRight={toggleRight}
        onOpenPalette={() => setPaletteOpen(true)}
        onOpenHelp={() => setHelpOpen(true)}
        onToggleNav={() => setNavOpen((o) => !o)}
        onToggleSearch={() => setSearchOpen((o) => !o)}
        searchOpen={searchOpen}
        rightOpen={rightOpen}
        serverUp={serverUp}
        notifications={toasts}
        onClearNotifications={() => setToasts([])}
      />
      <div className="lm-body">
        <Sidebar
          folders={folders}
          sessions={sessions}
          active={activeId}
          onSelect={selectSession}
          onNew={newSession}
          openFolders={openFolders}
          toggleFolder={toggleFolder}
          onOpenSettings={() => openSettings()}
          provider={provider}
          query={sidebarQuery}
          setQuery={setSidebarQuery}
          onTogglePin={togglePin}
          onRenameSession={renameSession}
          onDeleteSession={deleteSession}
          onMoveSession={moveSession}
          onRenameFolder={renameFolder}
          onDeleteFolder={deleteFolder}
          onCreateFolder={createFolder}
          mobileOpen={navOpen}
          width={sidebarWidth}
        />
        <ResizeHandle side="left" width={sidebarWidth} setWidth={setSidebarWidth} min={200} max={480} />
        {navOpen && (
          <div
            className="lm-navscrim"
            aria-hidden
            onClick={() => setNavOpen(false)}
          />
        )}

        <main className="lm-main">
          {!started ? (
            <StartScreen
              dir={dir}
              setDir={setDir}
              onStart={startSession}
            />
          ) : (
            <>
              {!searchOpen && searchScope === "chat" && search && (
                <div className="lm-filter-banner">
                  Showing only messages matching <b>&ldquo;{search}&rdquo;</b>
                  <button className="lm-filter-banner__clear" onClick={clearSearchFilter}>
                    <Icon name="x" size={12} /> Clear filter
                  </button>
                </div>
              )}
              {searchOpen && (
                <div className="lm-search-bar">
                  <div className="lm-search-bar__field">
                    <Icon name="search" size={14} />
                    <input
                      ref={searchInputRef}
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Escape") {
                          setSearchOpen(false);
                          setSearch("");
                        }
                      }}
                      placeholder={
                        searchScope === "chat"
                          ? "Search this conversation… (Esc to close)"
                          : "Search all sessions… (Esc to close)"
                      }
                      aria-label="Search"
                    />
                  </div>
                  <div className="lm-search-scope">
                    <button
                      type="button"
                      className="lm-search-scope__opt"
                      aria-pressed={searchScope === "chat"}
                      onClick={() => setSearchScope("chat")}
                    >
                      This chat
                    </button>
                    <button
                      type="button"
                      className="lm-search-scope__opt"
                      aria-pressed={searchScope === "all"}
                      onClick={() => setSearchScope("all")}
                    >
                      All chats
                    </button>
                  </div>
                  <button
                    className="lm-search-bar__close"
                    aria-label="Close search"
                    onClick={() => {
                      setSearchOpen(false);
                      setSearch("");
                    }}
                  >
                    <Icon name="x" size={14} />
                  </button>
                </div>
              )}
              {searchScope === "all" && searchOpen && search ? (
                <GlobalSearchResults
                  hits={globalHits}
                  query={search}
                  onJump={jumpToSessionSearchHit}
                />
              ) : (
              <div className="lm-chat" ref={scrollRef} onScroll={handleChatScroll}>
                {active.messages.length === 0 ? (
                  <div className="lm-empty">
                    <span className="lm-empty__mark">M2</span>
                    <div className="lm-empty__h">{AGENT_LABEL} is ready.</div>
                    <div className="lm-empty__p">
                      Working in{" "}
                      <span className="lm-empty__file">{active.project}</span>. Try:
                    </div>
                    <div className="lm-empty__chips">
                      {SUGGEST.map((s) => (
                        <button
                          key={s}
                          className="lm-suggest"
                          onClick={() => send(s)}
                        >
                          <Icon name="sparkles" size={14} />
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : chatSearchQuery &&
                  !active.messages.some((m) => messageMatchesQuery(m, chatSearchQuery)) ? (
                  <p className="lm-empty" style={{ marginTop: "8vh" }}>
                    No messages match &ldquo;{chatSearchQuery}&rdquo;.
                  </p>
                ) : (
                  <div className="lm-chat__list">
                    {active.messages.map((m, i) => {
                      if (chatSearchQuery && !messageMatchesQuery(m, chatSearchQuery)) return null;
                      const isLastMsg = i === active.messages.length - 1;
                      const isRunning = activeBusy && isLastMsg;
                      if (isToolMessage(m)) {
                        // Live turns carry a real step-trace feed — show it
                        // as a flowing feed of bullets, visible by default
                        // (not one collapsed disclosure). Older persisted
                        // turns without `steps` keep the summary card.
                        if (m.steps && m.steps.length > 0) {
                          return (
                            <StepTrace key={i} steps={m.steps} running={m.running} />
                          );
                        }
                        return (
                          <ToolCall
                            key={i}
                            running={m.running}
                            summary={m.running ? "Working…" : m.summary}
                            items={m.items || []}
                          />
                        );
                      }
                      if (isApprovalMessage(m)) {
                        return (
                          <ApprovalCard
                            key={i}
                            msg={m}
                            onApprove={approveEdit}
                            onReject={rejectEdit}
                          />
                        );
                      }
                      const next = active.messages[i + 1];
                      // A user turn immediately followed by a failed/empty reply
                      // already carries Retry/Continue — its own retry-from
                      // link would be redundant right above them.
                      const redundantWithRetry =
                        m.role === "user" &&
                        next &&
                        !isToolMessage(next) &&
                        !isApprovalMessage(next) &&
                        next.error;
                      const emptyFinished =
                        m.role === "assistant" &&
                        !m.content &&
                        !isRunning &&
                        !m.error &&
                        !m.stopped;
                      const showRecoveryActions = (m.error || emptyFinished) && !activeBusy;
                      const bubble = (
                        <MessageBubble
                          role={m.role}
                          loading={!!m.pending && !m.content && isRunning}
                          empty={emptyFinished}
                          error={!!m.error}
                          stopped={!!m.stopped}
                          name={
                            m.role === "assistant" ? "ornith" : undefined
                          }
                        >
                          {m.content}
                        </MessageBubble>
                      );
                      return (
                        <div className="lm-turn" key={i}>
                          {showRecoveryActions ? (
                            <div className="lm-turn__row">
                              {bubble}
                              <div className="lm-bubble__actions">
                                <Tooltip label="Retry" side="top">
                                  <button
                                    className="lm-bubble__retry"
                                    aria-label="Retry"
                                    onClick={retryLast}
                                  >
                                    <Icon name="rotate-ccw" size={13} />
                                  </button>
                                </Tooltip>
                                <Tooltip label="Continue" side="top">
                                  <button
                                    className="lm-bubble__continue"
                                    aria-label="Continue"
                                    onClick={continueRun}
                                  >
                                    <Icon name="play" size={13} />
                                  </button>
                                </Tooltip>
                              </div>
                            </div>
                          ) : (
                            bubble
                          )}
                          {m.role === "assistant" && m.perf && (
                            <PerfStrip perf={m.perf} />
                          )}
                          {m.role === "user" && !activeBusy && !redundantWithRetry && (
                            <button
                              className="lm-bubble__retryfrom"
                              onClick={() => retryFrom(i)}
                              title="Retry from this message"
                            >
                              <Icon name="rotate-ccw" size={11} /> Retry from here
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
              )}
              <Composer
                value={input}
                onChange={setInput}
                onSend={() => send()}
                onStop={() => stopSessionRun(activeId)}
                loading={activeBusy}
                blocked={pendingApproval}
                model={model}
                onChangeModel={switchModel}
                modelLoading={modelLoading}
                modelLoadingElapsedS={modelLoadingElapsedS}
                pendingModel={pendingModel}
                installedModels={installedModels}
                installedModelDetails={installedModelDetails}
                permTier={active.permTier}
                onChangePerm={setPermTier}
                attached={active.attached}
                contextFiles={CONTEXT_FILES}
                onAttach={attachContext}
                onDetach={detachContext}
                files={files}
                onAddFiles={addFiles}
                onRemoveFile={removeFile}
                workspace={
                  active.project
                    ? { dir: active.project, onMove: moveFolder }
                    : undefined
                }
              />
            </>
          )}
        </main>

        {rightOpen && (
          <ResizeHandle side="right" width={rightWidth} setWidth={setRightWidth} min={280} max={640} />
        )}
        <RightPanel
          open={rightOpen}
          tab={rightTab}
          setTab={setRightTab}
          onClose={() => setRightOpen(false)}
          insp={insp}
          model={model}
          provider={provider}
          project={active ? active.project : null}
          attached={active ? active.attached : []}
          run={activeRun}
          focusSpan={focusSpan}
          width={rightWidth}
        />
      </div>

      {settingsOpen && (
        <SettingsModal
          provider={provider}
          models={installedModels}
          density={density}
          setDensity={(d) => {
            setDensity(d);
            notify(`Density: ${d}`);
          }}
          reduceMotion={reduceMotion}
          setReduceMotion={(v) => {
            setReduceMotion(v);
            notify(v ? "Reduce motion: on" : "Reduce motion: off");
          }}
          onClose={() => setSettingsOpen(false)}
          onSaveUrl={saveUrl}
          initialTab={settingsInitialTab}
        />
      )}
      {modelsOpen && (
        <ModelsModal
          model={model}
          setModel={switchModel}
          modelLoading={modelLoading}
          pendingModel={pendingModel}
          modelSwapPhase={modelSwapPhase}
          modelLoadingElapsedS={modelLoadingElapsedS}
          onClose={() => setModelsOpen(false)}
        />
      )}
      {paletteOpen && (
        <CommandPalette
          commands={commands}
          onClose={() => setPaletteOpen(false)}
        />
      )}
      {helpOpen && <HelpModal onClose={() => setHelpOpen(false)} />}
    </div>
  );
}
