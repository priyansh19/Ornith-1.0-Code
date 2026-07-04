import * as React from "react";

export type BadgeTone =
  | "neutral"
  | "brand"
  | "agent"
  | "success"
  | "info"
  | "warning"
  | "danger";
export type Severity = "blocker" | "major" | "minor" | "info" | "approved";

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone;
  severity?: Severity;
  solid?: boolean;
  dot?: boolean;
}

const SEVERITY_TONE: Record<Severity, BadgeTone> = {
  blocker: "danger",
  major: "warning",
  minor: "info",
  info: "neutral",
  approved: "success",
};

/** Compact status / metadata badge. Pass `severity` to map a critique level to a tone. */
export function Badge({
  children,
  tone = "neutral",
  severity,
  solid = false,
  dot = false,
  className = "",
  ...rest
}: BadgeProps) {
  const resolved = severity ? SEVERITY_TONE[severity] || "neutral" : tone;
  const cls = [
    "lm-badge",
    `lm-badge--${resolved}`,
    solid ? "lm-badge--solid" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");
  return (
    <span className={cls} {...rest}>
      {dot && <span className="lm-badge__dot" />}
      {children || severity}
    </span>
  );
}
