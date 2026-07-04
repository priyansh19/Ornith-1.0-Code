import * as React from "react";

export interface TooltipProps {
  label: React.ReactNode;
  side?: "top" | "bottom";
  children: React.ReactNode;
  className?: string;
}

/** Lightweight hover/focus tooltip. Wraps its trigger child. */
export function Tooltip({
  label,
  side = "top",
  children,
  className = "",
}: TooltipProps) {
  return (
    <span className={`lm-tip ${className}`.trim()} tabIndex={-1}>
      {children}
      <span className={`lm-tip__pop lm-tip__pop--${side}`} role="tooltip">
        {label}
      </span>
    </span>
  );
}
