import * as React from "react";

export type Tab =
  | string
  | {
      value: string;
      label: React.ReactNode;
      count?: number;
      icon?: React.ReactNode;
    };

export interface TabsProps {
  tabs?: Tab[];
  value?: string;
  onChange?: (value: string) => void;
  accent?: "brand" | "agent";
  className?: string;
  /** id prefix used to wire aria-controls/id between each tab and its panel
      (panel ids are expected to be `${idBase}-panel-${value}`) */
  idBase?: string;
}

/** Underline tab bar for switching panel views (e.g. Thinking / Critiques).
    Implements the full ARIA tablist/tab pattern: roving tabindex (only the
    active tab is in the tab order; Left/Right/Home/End move focus + selection
    per the WAI-ARIA authoring practices), and id/aria-controls links to the
    corresponding tabpanel when `idBase` is supplied. */
export function Tabs({
  tabs = [],
  value,
  onChange,
  accent = "brand",
  className = "",
  idBase,
}: TabsProps) {
  const cls = ["lm-tabs", accent === "agent" ? "lm-tabs--agent" : "", className]
    .filter(Boolean)
    .join(" ");
  const values = tabs.map((t) => (typeof t === "string" ? t : t.value));

  const focusAndSelect = (i: number) => {
    const v = values[(i + values.length) % values.length];
    onChange?.(v);
    // move DOM focus to the newly-active tab on the next tick (after re-render)
    requestAnimationFrame(() => {
      const el = document.getElementById(idBase ? `${idBase}-tab-${v}` : "");
      el?.focus();
    });
  };

  return (
    <div className={cls} role="tablist">
      {tabs.map((t, i) => {
        const v = typeof t === "string" ? t : t.value;
        const label = typeof t === "string" ? t : t.label;
        const count = typeof t === "string" ? undefined : t.count;
        const icon = typeof t === "string" ? null : t.icon;
        const active = v === value;
        return (
          <button
            key={v}
            role="tab"
            id={idBase ? `${idBase}-tab-${v}` : undefined}
            aria-controls={idBase ? `${idBase}-panel-${v}` : undefined}
            aria-selected={active}
            tabIndex={active ? 0 : -1}
            className={`lm-tabs__tab ${active ? "lm-tabs__tab--active" : ""}`}
            onClick={() => onChange && onChange(v)}
            onKeyDown={(e) => {
              if (e.key === "ArrowRight") {
                e.preventDefault();
                focusAndSelect(i + 1);
              } else if (e.key === "ArrowLeft") {
                e.preventDefault();
                focusAndSelect(i - 1);
              } else if (e.key === "Home") {
                e.preventDefault();
                focusAndSelect(0);
              } else if (e.key === "End") {
                e.preventDefault();
                focusAndSelect(values.length - 1);
              }
            }}
          >
            {icon}
            {label}
            {count != null && <span className="lm-tabs__count">{count}</span>}
          </button>
        );
      })}
    </div>
  );
}
