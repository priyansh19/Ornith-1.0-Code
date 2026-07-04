import * as React from "react";
import { Icon } from "@/components/ds";

export interface MenuItem {
  label: string;
  icon?: string;
  danger?: boolean;
  submenu?: MenuItem[];
  onSelect?: () => void;
}

export interface ContextMenuProps {
  x: number;
  y: number;
  items: MenuItem[];
  onClose: () => void;
}

/**
 * Fixed-position context menu (sessions & folders in the sidebar).
 * Dismissal is handled locally: Escape and pointerdown outside the panel call
 * `onClose`. Selecting an item does NOT auto-close — the item's `onSelect`
 * decides (this lets "Delete" flip to "Confirm delete?" while staying open).
 */
export function ContextMenu({ x, y, items, onClose }: ContextMenuProps) {
  const ref = React.useRef<HTMLDivElement | null>(null);
  const [openSub, setOpenSub] = React.useState<number | null>(null);

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    const onDown = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("pointerdown", onDown);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("pointerdown", onDown);
    };
  }, [onClose]);

  // Clamp into the viewport (only ever rendered client-side, post-interaction).
  const est = { w: 200, h: items.length * 32 + 12 };
  const left =
    typeof window === "undefined"
      ? x
      : Math.max(8, Math.min(x, window.innerWidth - est.w - 8));
  const top =
    typeof window === "undefined"
      ? y
      : Math.max(8, Math.min(y, window.innerHeight - est.h - 8));

  const renderItem = (it: MenuItem, i: number) => {
    if (it.submenu) {
      const open = openSub === i;
      return (
        <div
          key={i}
          className="lm-menu__subwrap"
          onMouseEnter={() => setOpenSub(i)}
          onMouseLeave={() => setOpenSub((s) => (s === i ? null : s))}
        >
          <button
            type="button"
            className="lm-menu__item"
            aria-haspopup="menu"
            aria-expanded={open}
            onClick={() => setOpenSub(i)}
          >
            {it.icon && <Icon name={it.icon} size={13} />}
            <span className="lm-menu__label">{it.label}</span>
            <span className="lm-menu__caret">
              <Icon name="chevron-right" size={12} />
            </span>
          </button>
          {open && (
            <div className="lm-menu lm-menu__sub" role="menu">
              {it.submenu.map((si, j) => (
                <button
                  key={j}
                  type="button"
                  role="menuitem"
                  className={`lm-menu__item ${si.danger ? "lm-menu__item--danger" : ""}`}
                  onClick={() => si.onSelect?.()}
                >
                  {si.icon && <Icon name={si.icon} size={13} />}
                  <span className="lm-menu__label">{si.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      );
    }
    return (
      <button
        key={i}
        type="button"
        role="menuitem"
        className={`lm-menu__item ${it.danger ? "lm-menu__item--danger" : ""}`}
        onClick={() => it.onSelect?.()}
      >
        {it.icon && <Icon name={it.icon} size={13} />}
        <span className="lm-menu__label">{it.label}</span>
      </button>
    );
  };

  return (
    <div
      ref={ref}
      className="lm-menu"
      role="menu"
      style={{ left, top }}
      onContextMenu={(e) => e.preventDefault()}
    >
      {items.map(renderItem)}
    </div>
  );
}
