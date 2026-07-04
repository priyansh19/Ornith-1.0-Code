import * as React from "react";

export type ToolItemKind = "edit" | "read" | "run" | "tool" | "search";

export interface ToolItem {
  kind: ToolItemKind;
  text: React.ReactNode;
  diff?: [number, number];
}

export interface ToolCallProps extends React.HTMLAttributes<HTMLDivElement> {
  summary?: React.ReactNode;
  items?: ToolItem[];
  running?: boolean;
  defaultOpen?: boolean;
}

const GLYPH: Record<ToolItemKind, React.ReactNode> = {
  edit: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4Z" />
    </svg>
  ),
  read: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
      <path d="M14 2v6h6" />
    </svg>
  ),
  run: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m4 17 6-6-6-6" />
      <path d="M12 19h8" />
    </svg>
  ),
  tool: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18v3h3l6.3-6.3a4 4 0 0 0 5.4-5.4l-2.7 2.7-2-2 2.7-2.7Z" />
    </svg>
  ),
  search: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="7" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  ),
};
const KIND_COLOR: Record<ToolItemKind, string> = {
  edit: "var(--brand)",
  read: "var(--cyan)",
  run: "var(--green)",
  tool: "var(--agent-hover)",
  search: "var(--amber)",
};

const Chevron = () => (
  <span className="lm-tool__chev">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m9 18 6-6-6-6" />
    </svg>
  </span>
);

/**
 * Collapsible agent tool-activity row — the "Edited a file, used a tool ›"
 * disclosure shown inline in a coding-agent conversation.
 */
export function ToolCall({
  summary,
  items = [],
  running = false,
  defaultOpen = false,
  className = "",
  ...rest
}: ToolCallProps) {
  const [open, setOpen] = React.useState(defaultOpen);
  const cls = ["lm-tool", open ? "lm-tool--open" : "", className]
    .filter(Boolean)
    .join(" ");
  return (
    <div className={cls} {...rest}>
      <button
        className="lm-tool__sum"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
      >
        <span className="lm-tool__lead">
          {running ? <span className="lm-tool__spin" /> : GLYPH.tool}
        </span>
        <span className="lm-tool__label">
          {summary}
          {items.length > 0 && (
            <span className="lm-tool__count">
              {"  "}· {items.length} step{items.length > 1 ? "s" : ""}
            </span>
          )}
        </span>
        {items.length > 0 && <Chevron />}
      </button>
      {open && items.length > 0 && (
        <div className="lm-tool__items">
          {items.map((it, i) => (
            <div className="lm-tool__item" key={i}>
              <span
                className="lm-tool__icon"
                style={{ color: KIND_COLOR[it.kind] || "var(--muted)" }}
              >
                {GLYPH[it.kind] || GLYPH.tool}
              </span>
              <span className="lm-tool__path">{it.text}</span>
              {it.diff && (
                <span className="lm-tool__diff">
                  <span className="add">+{it.diff[0]}</span>{" "}
                  <span className="del">−{it.diff[1]}</span>
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
