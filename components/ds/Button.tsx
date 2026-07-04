import * as React from "react";

export type ButtonVariant =
  | "primary"
  | "agent"
  | "secondary"
  | "ghost"
  | "danger";
export type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  block?: boolean;
  loading?: boolean;
  iconLeft?: React.ReactNode;
  iconRight?: React.ReactNode;
}

/**
 * OrnithChat primary button. Warm-orange brand fill by default; `agent` variant
 * uses the violet agent accent.
 */
export function Button({
  children,
  variant = "primary",
  size = "md",
  block = false,
  loading = false,
  disabled = false,
  iconLeft = null,
  iconRight = null,
  className = "",
  ...rest
}: ButtonProps) {
  const cls = [
    "lm-btn",
    `lm-btn--${variant}`,
    size !== "md" ? `lm-btn--${size}` : "",
    block ? "lm-btn--block" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button className={cls} disabled={disabled || loading} {...rest}>
      {loading ? <span className="lm-btn__spinner" /> : iconLeft}
      {children}
      {iconRight}
    </button>
  );
}
