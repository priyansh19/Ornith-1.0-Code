import * as React from "react";

export type CardVariant = "default" | "inset" | "pop" | "ghost";
export type CardAccent = "brand" | "agent";

export interface CardProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "title"> {
  title?: React.ReactNode;
  headerActions?: React.ReactNode;
  variant?: CardVariant;
  accent?: CardAccent;
  pad?: boolean;
  interactive?: boolean;
}

/** Generic surface container. Optional header bar with title + actions. */
export function Card({
  children,
  title,
  headerActions,
  variant = "default",
  accent,
  pad = false,
  interactive = false,
  className = "",
  ...rest
}: CardProps) {
  const cls = [
    "lm-card",
    variant !== "default" ? `lm-card--${variant}` : "",
    accent ? `lm-card--accent-${accent}` : "",
    pad && !title ? "lm-card--pad" : "",
    interactive ? "lm-card--interactive" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");
  return (
    <div className={cls} {...rest}>
      {(title || headerActions) && (
        <div className="lm-card__header">
          {title && <span className="lm-card__title">{title}</span>}
          {headerActions && (
            <span className="lm-card__header-actions">{headerActions}</span>
          )}
        </div>
      )}
      {title ? <div className="lm-card__body">{children}</div> : children}
    </div>
  );
}
