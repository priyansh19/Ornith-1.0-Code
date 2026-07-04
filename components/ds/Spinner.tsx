import * as React from "react";

export interface SpinnerProps
  extends React.HTMLAttributes<HTMLSpanElement> {
  size?: number;
  accent?: "brand" | "agent" | "current";
  label?: React.ReactNode;
}

/** Indeterminate spinner. */
export function Spinner({
  size = 14,
  accent = "brand",
  label,
  className = "",
  ...rest
}: SpinnerProps) {
  const border = Math.max(2, Math.round(size / 7));
  const cls = [
    "lm-spinner",
    accent !== "brand" ? `lm-spinner--${accent}` : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");
  const spinner = (
    <span
      className={cls}
      style={{ width: size, height: size, borderWidth: border }}
      {...rest}
    />
  );
  if (!label) return spinner;
  return (
    <span className="lm-loading">
      {spinner}
      {label}
    </span>
  );
}
