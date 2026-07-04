import * as React from "react";
import { Icon } from "@/components/ds";
import { DESTRUCTIVE_TOOLS, GIT_TOOLS, type Step } from "./data";
import { DiffView } from "./DiffView";

function formatDuration(ms?: number): string {
  if (ms === undefined) return "";
  const s = ms / 1000;
  return s < 1 ? "<1s" : `${Math.round(s)}s`;
}

function ThoughtBullet({
  step,
  isLive,
}: {
  step: Extract<Step, { type: "thought" }>;
  isLive: boolean;
}) {
  const [open, setOpen] = React.useState(false);
  return (
    <div className="lm-step">
      <span className="lm-step__dot lm-step__dot--thought" />
      <div className="lm-step__body">
        <button
          type="button"
          className="lm-step__summary"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
        >
          {isLive ? (
            <span className="lm-step__live">
              <span className="lm-step__spin" />
              Thinking…
            </span>
          ) : (
            `Thought for ${formatDuration(step.durationMs)}`
          )}
          <span className={`lm-step__chev ${open ? "lm-step__chev--open" : ""}`}>
            <Icon name="chevron-right" size={12} />
          </span>
        </button>
        {open && (
          <div className="lm-step__detail">
            {step.thought && <p className="lm-step__thought">{step.thought}</p>}
            {step.action && <p className="lm-step__action">→ {step.action}</p>}
          </div>
        )}
      </div>
    </div>
  );
}

/** A finished tool call: the header row (tool name + input) stays visible,
    the output itself is minimized behind it — click the row to expand the
    subtle output box (or the diff, for file-writing tools). */
function ToolBullet({ step }: { step: Extract<Step, { type: "tool_result" }> }) {
  const [open, setOpen] = React.useState(false);
  const destructive = DESTRUCTIVE_TOOLS.has(step.tool);
  const isGit = GIT_TOOLS.has(step.tool);
  const dotClass = destructive
    ? "lm-step__dot--destructive"
    : isGit
      ? "lm-step__dot--git"
      : "lm-step__dot--tool";
  return (
    <div className="lm-step">
      <span className={`lm-step__dot ${dotClass}`} />
      <div className="lm-step__body">
        <button
          type="button"
          className="lm-step__summary lm-step__summary--tool"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
        >
          <strong>{step.tool}</strong>
          <span className="lm-step__input">{step.input}</span>
          {destructive && (
            <span className="lm-step__badge lm-step__badge--destructive">
              writes/executes
            </span>
          )}
          <span className={`lm-step__chev ${open ? "lm-step__chev--open" : ""}`}>
            <Icon name="chevron-right" size={12} />
          </span>
        </button>
        {open &&
          (step.diff ? (
            <DiffView diff={step.diff} />
          ) : (
            <div className="lm-step__output">
              <p className={`lm-step__result ${isGit ? "lm-step__result--git" : ""}`}>
                {step.result}
              </p>
            </div>
          ))}
      </div>
    </div>
  );
}

export interface StepTraceProps {
  steps: Step[];
  /** true while the turn is still in flight — only the last thought
      bullet shows the live "Thinking…" state. */
  running: boolean;
}

/** Flowing feed of reasoning bullets for one agent turn — one row per
    thought / tool call. Rows are always visible; each row's detail
    (thought text, tool output) is collapsed until clicked. */
export function StepTrace({ steps, running }: StepTraceProps) {
  if (steps.length === 0) return null;
  return (
    <div className="lm-steps">
      {steps.map((s, i) => {
        const isLast = i === steps.length - 1;
        if (s.type === "thought")
          return <ThoughtBullet key={i} step={s} isLive={running && isLast} />;
        if (s.type === "tool_result") return <ToolBullet key={i} step={s} />;
        return null;
      })}
    </div>
  );
}
