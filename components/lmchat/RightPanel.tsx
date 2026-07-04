import * as React from "react";
import { IconButton, Tabs, Tooltip, Icon } from "@/components/ds";
import { InspectorBody } from "./InspectorBody";
import { TraceTree } from "./TraceTree";
import { WorkspacePanel } from "./WorkspacePanel";
import {
  formatRunDuration,
  type Insp,
  type Provider,
  type SessionRun,
} from "./data";

/** Live wall-clock readout for the current run — ticks every second while the
    run is in flight (real elapsed time from the run's own start timestamp,
    not a counter that can drift), then freezes into "Completed in X" once the
    backend's done/failure lands and `runTotalMs` is set. */
function RunTimer({ insp, inFlight }: { insp: Insp; inFlight: boolean }) {
  const [now, setNow] = React.useState(() => Date.now());
  React.useEffect(() => {
    if (!inFlight) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [inFlight]);

  if (inFlight && insp.runStartedAt) {
    return (
      <div className="lm-runtimer lm-runtimer--live" role="timer">
        <span className="lm-runtimer__pulse" />
        Running — {formatRunDuration(Math.max(0, now - insp.runStartedAt))}
      </div>
    );
  }
  if (insp.runTotalMs !== undefined) {
    return (
      <div className="lm-runtimer">
        Completed in {formatRunDuration(insp.runTotalMs)}
      </div>
    );
  }
  return null;
}

export type RightTab = "trace" | "inspector" | "workspace";

export interface RightPanelProps {
  open: boolean;
  tab: RightTab;
  setTab: (tab: RightTab) => void;
  onClose: () => void;
  insp: Insp;
  model: string;
  provider: Provider;
  project: string | null;
  run: SessionRun; // the ACTIVE session's live run
  focusSpan?: string;
  /** User-adjustable width in px (drag handle in LMChatApp) — falls back to
      the CSS default (350px) when omitted. */
  width?: number;
}

/** Persistent right sidebar: the unified run Trace (assembled live from the
    backend's span events), the session Inspector, and the Workspace browser. */
export function RightPanel({
  open,
  tab,
  setTab,
  onClose,
  insp,
  model,
  provider,
  project,
  run,
  focusSpan,
  width,
}: RightPanelProps) {
  const inFlight =
    run.status === "running" ||
    run.status === "streaming" ||
    insp.status === "running";

  return (
    <aside
      className={`lm-right ${open ? "lm-right--open" : ""}`}
      aria-hidden={!open}
      style={open && width ? { width, maxWidth: "none" } : undefined}
    >
      <div className="lm-right__head">
        <span className="lm-right__title">
          <Icon name="panel-right" size={15} /> Run details
        </span>
        <Tooltip label="Hide panel" side="bottom">
          <IconButton variant="plain" aria-label="Hide panel" onClick={onClose}>
            <Icon name="panel-right-close" size={16} />
          </IconButton>
        </Tooltip>
      </div>
      <div className="lm-right__tabs">
        <Tabs
          accent="agent"
          value={tab}
          idBase="rp"
          onChange={(v) => setTab(v as RightTab)}
          tabs={[
            { value: "trace", label: "Trace" },
            { value: "inspector", label: "Inspector" },
            { value: "workspace", label: "Workspace" },
          ]}
        />
      </div>
      <div className="lm-right__body">
        {/* All tabpanels stay mounted (toggled via `hidden`, not `&&`)
            so switching tabs never re-triggers a fetch/reload flash — only
            the currently-selected one is visible/interactive. */}
        <div
          role="tabpanel"
          id="rp-panel-trace"
          aria-labelledby="rp-tab-trace"
          hidden={tab !== "trace"}
        >
          {insp.liveSpanRoot ? (
            <>
              <RunTimer insp={insp} inFlight={inFlight} />
              {/* Real span tree assembled live from the backend's SSE `span`
                  events (see liveBackend.ts buildSpanTree) — renders while the
                  run is still in flight (the tree just keeps growing) and
                  stays put after it finishes. */}
              <TraceTree key={insp.liveSpanRoot.id} spans={insp.liveSpanRoot} focus={focusSpan} />
            </>
          ) : (
            <>
              <RunTimer insp={insp} inFlight={inFlight} />
              <div className="lm-dim lm-right__empty">
                {inFlight
                  ? "Run in progress — the trace fills in as span events arrive."
                  : "Send a message to capture a trace."}
              </div>
            </>
          )}
        </div>

        <div
          role="tabpanel"
          id="rp-panel-inspector"
          aria-labelledby="rp-tab-inspector"
          hidden={tab !== "inspector"}
        >
          <InspectorBody
            state={insp}
            model={model}
            provider={provider}
            project={project}
          />
        </div>

        <div
          role="tabpanel"
          id="rp-panel-workspace"
          aria-labelledby="rp-tab-workspace"
          hidden={tab !== "workspace"}
        >
          <WorkspacePanel />
        </div>
      </div>
    </aside>
  );
}
