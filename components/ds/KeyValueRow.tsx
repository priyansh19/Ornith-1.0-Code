import * as React from "react";

export type KeyValueTone = "default" | "brand" | "agent" | "muted";

export interface KeyValueRowProps {
  label: React.ReactNode;
  value?: React.ReactNode;
  tone?: KeyValueTone;
  divided?: boolean;
  className?: string;
  children?: React.ReactNode;
}

/** Aligned label → value row for inspector panels and metadata lists. */
export function KeyValueRow({
  label,
  value,
  tone = "default",
  divided = false,
  className = "",
  children,
}: KeyValueRowProps) {
  const cls = ["lm-kv", divided ? "lm-kv--divided" : "", className]
    .filter(Boolean)
    .join(" ");
  const valCls = [
    "lm-kv__value",
    tone !== "default" ? `lm-kv__value--${tone}` : "",
  ]
    .filter(Boolean)
    .join(" ");
  return (
    <div className={cls}>
      <span className="lm-kv__label">{label}</span>
      <span className={valCls}>{children ?? value}</span>
    </div>
  );
}
