import * as React from "react";

export type SeverityLevel = "blocker" | "major" | "minor" | "info";

export interface SeverityBadgeProps
  extends React.HTMLAttributes<HTMLSpanElement> {
  level?: SeverityLevel;
}

/** Severity chip for the critique pipeline (blocker / major / minor / info). */
export function SeverityBadge({
  level = "info",
  className = "",
  ...rest
}: SeverityBadgeProps) {
  const cls = ["lm-sev", `lm-sev--${level}`, className]
    .filter(Boolean)
    .join(" ");
  return (
    <span className={cls} {...rest}>
      <span className="lm-sev__dot" />
      {level}
    </span>
  );
}
