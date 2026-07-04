import * as React from "react";

export type SegmentedOption =
  | string
  | { value: string; label: React.ReactNode; icon?: React.ReactNode };

export interface SegmentedToggleProps {
  options: SegmentedOption[];
  value?: string;
  onChange?: (value: string) => void;
  accent?: "neutral" | "brand" | "agent";
  className?: string;
}

/**
 * Segmented single-select toggle. The Settings density switch
 * (comfortable / compact) is the canonical use.
 */
export function SegmentedToggle({
  options,
  value,
  onChange,
  accent = "neutral",
  className = "",
}: SegmentedToggleProps) {
  const cls = [
    "lm-seg",
    accent !== "neutral" ? `lm-seg--${accent}` : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");
  return (
    <div className={cls} role="tablist">
      {options.map((opt) => {
        const v = typeof opt === "string" ? opt : opt.value;
        const label = typeof opt === "string" ? opt : opt.label;
        const icon = typeof opt === "string" ? null : opt.icon;
        const active = v === value;
        return (
          <button
            key={v}
            role="tab"
            aria-selected={active}
            className={`lm-seg__opt ${active ? "lm-seg__opt--active" : ""}`}
            onClick={() => onChange && onChange(v)}
          >
            {icon}
            {label}
          </button>
        );
      })}
    </div>
  );
}
