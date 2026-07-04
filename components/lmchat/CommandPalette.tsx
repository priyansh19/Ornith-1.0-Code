import * as React from "react";
import { Icon } from "@/components/ds";

export interface Command {
  id: string;
  label: string;
  group: string;
  hint?: string;
  run: () => void;
}

export interface CommandPaletteProps {
  commands: Command[];
  onClose: () => void;
}

const rowId = (c: Command) => `lm-cmd-opt-${c.id}`;

/** Cmd/Ctrl-K command palette: run actions, switch model, and jump to
    any session (global search) — keyboard-first (P1 + P2). Mounted only while
    open, so the query resets each time. Arrow keys move a roving highlight
    through the flat filtered list; Enter runs the highlighted command. */
export function CommandPalette({ commands, onClose }: CommandPaletteProps) {
  const [q, setQ] = React.useState("");
  const [activeIdx, setActiveIdx] = React.useState(0);

  const needle = q.trim().toLowerCase();
  const filtered = needle
    ? commands.filter((c) =>
        `${c.label} ${c.group} ${c.hint ?? ""}`.toLowerCase().includes(needle),
      )
    : commands;

  // Clamp in case the option set shrank underneath the highlight.
  const active = Math.min(activeIdx, Math.max(filtered.length - 1, 0));

  const groups: string[] = [];
  filtered.forEach((c) => {
    if (!groups.includes(c.group)) groups.push(c.group);
  });

  const runAt = (idx: number) => {
    const cmd = filtered[idx];
    if (cmd) {
      cmd.run();
      onClose();
    }
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const n = filtered.length;
    let next: number | null = null;
    if (e.key === "ArrowDown") next = n === 0 ? 0 : (active + 1) % n;
    else if (e.key === "ArrowUp") next = n === 0 ? 0 : (active - 1 + n) % n;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = Math.max(n - 1, 0);
    if (next !== null) {
      e.preventDefault();
      setActiveIdx(next);
      const cmd = filtered[next];
      if (cmd)
        document
          .getElementById(rowId(cmd))
          ?.scrollIntoView({ block: "nearest" });
      return;
    }
    if (e.key === "Enter") runAt(active);
    if (e.key === "Escape") onClose();
  };

  const activeCmd = filtered[active];

  return (
    <div className="lm-cmd" onClick={onClose}>
      <div className="lm-cmd__box" onClick={(e) => e.stopPropagation()}>
        <div className="lm-cmd__search">
          <Icon name="chevron-right" size={14} />
          <input
            className="lm-cmd__input"
            autoFocus
            placeholder="Run a command, switch model, or find a session…"
            value={q}
            aria-controls="lm-cmd-listbox"
            aria-activedescendant={activeCmd ? rowId(activeCmd) : undefined}
            onChange={(e) => {
              setQ(e.target.value);
              setActiveIdx(0);
            }}
            onKeyDown={onKeyDown}
          />
          <span className="lm-cmd__kbd">esc</span>
        </div>
        <div className="lm-cmd__list" role="listbox" id="lm-cmd-listbox">
          {filtered.length === 0 ? (
            <div className="lm-cmd__empty">No matches.</div>
          ) : (
            groups.map((g) => (
              <div key={g} className="lm-cmd__group">
                <div className="lm-cmd__grouplabel">{g}</div>
                {filtered
                  .filter((c) => c.group === g)
                  .map((c) => {
                    const idx = filtered.indexOf(c);
                    const isActive = idx === active;
                    return (
                      <button
                        key={c.id}
                        id={rowId(c)}
                        role="option"
                        aria-selected={isActive}
                        className={`lm-cmd__row${isActive ? " is-active" : ""}`}
                        onClick={() => {
                          c.run();
                          onClose();
                        }}
                      >
                        <span className="lm-cmd__label">{c.label}</span>
                        {c.hint && <span className="lm-cmd__hint">{c.hint}</span>}
                      </button>
                    );
                  })}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
