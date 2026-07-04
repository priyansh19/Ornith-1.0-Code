import * as React from "react";

export type CritiqueSeverity = "blocker" | "major" | "minor" | "info";

export interface CritiqueCardProps {
  severity?: CritiqueSeverity;
  category?: React.ReactNode;
  round?: number;
  id?: React.ReactNode;
  message?: React.ReactNode;
  suggestedAction?: React.ReactNode;
  resolved?: boolean;
  score?: React.ReactNode; // rubric score, e.g. "2/5"
  criterion?: React.ReactNode; // rubric criterion name
  rationale?: React.ReactNode; // why the critic flagged it
  actions?: React.ReactNode; // action row (e.g. Address button)
  active?: boolean; // highlighted (anchored) state
  onClick?: () => void;
  className?: string;
  children?: React.ReactNode;
}

const SEV_COLOR: Record<CritiqueSeverity, string> = {
  blocker: "var(--red)",
  major: "var(--amber)",
  minor: "var(--cyan)",
  info: "var(--muted)",
};

/** A structured critique item from the Critic pipeline. */
export function CritiqueCard({
  severity = "info",
  category,
  round,
  id,
  message,
  suggestedAction,
  resolved = false,
  score,
  criterion,
  rationale,
  actions,
  active = false,
  onClick,
  className = "",
  children,
}: CritiqueCardProps) {
  const cls = [
    "lm-crit",
    resolved ? "lm-crit--resolved" : "",
    active ? "lm-crit--active" : "",
    onClick ? "lm-crit--clickable" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");
  return (
    <div
      className={cls}
      style={{ "--_sev": SEV_COLOR[severity] } as React.CSSProperties}
      onClick={onClick}
    >
      <div className="lm-crit__top">
        {/* severity badge rendered inline to keep this component self-contained */}
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            fontFamily: "var(--font-mono)",
            fontSize: "var(--text-micro)",
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: "var(--tracking-wide)",
            color: SEV_COLOR[severity],
            padding: "3px 8px 3px 7px",
            borderRadius: "var(--radius-xs)",
            border: `1px solid color-mix(in srgb, ${SEV_COLOR[severity]} 35%, transparent)`,
            background:
              "color-mix(in srgb, " + SEV_COLOR[severity] + " 12%, transparent)",
          }}
        >
          <span
            style={{
              width: 7,
              height: 7,
              borderRadius: 2,
              background: "currentColor",
            }}
          />
          {severity}
        </span>
        {category && <span className="lm-crit__cat">{category}</span>}
        {id && <span className="lm-crit__id">{id}</span>}
        {round != null && <span className="lm-crit__round">round {round}</span>}
      </div>
      {(criterion || score != null) && (
        <div className="lm-crit__rubric">
          {criterion && <span className="lm-crit__crit">{criterion}</span>}
          {score != null && <span className="lm-crit__score">{score}</span>}
        </div>
      )}
      <div className="lm-crit__msg">{message ?? children}</div>
      {rationale && <div className="lm-crit__why">{rationale}</div>}
      {suggestedAction && (
        <code className="lm-crit__action">
          <span className="lm-crit__action-label">→</span>
          {suggestedAction}
        </code>
      )}
      {actions && <div className="lm-crit__actions">{actions}</div>}
    </div>
  );
}
