import * as React from "react";
import { IconButton, Icon, Tooltip } from "@/components/ds";
import { relTime } from "./data";

export interface NotificationItem {
  id: number;
  msg: string;
  at: number;
}

export interface NotificationBellProps {
  notifications: NotificationItem[];
  onClear: () => void;
}

/** Replaces the old bottom-centered auto-dismissing toasts with a persistent
    queue behind a bell icon — nothing pops up over the chat anymore, it just
    accumulates until the user chooses to look. */
export function NotificationBell({ notifications, onClear }: NotificationBellProps) {
  const [open, setOpen] = React.useState(false);
  const [seenCount, setSeenCount] = React.useState(0);
  const [now, setNow] = React.useState(0);
  const rootRef = React.useRef<HTMLDivElement>(null);
  const unread = Math.max(0, notifications.length - seenCount);

  React.useEffect(() => {
    const t = setTimeout(() => setNow(Date.now()), 0);
    const id = setInterval(() => setNow(Date.now()), 15000);
    return () => {
      clearTimeout(t);
      clearInterval(id);
    };
  }, []);

  React.useEffect(() => {
    if (!open) return;
    setSeenCount(notifications.length);
    const onPointerDown = (e: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, notifications.length]);

  const ordered = [...notifications].reverse();

  return (
    <div className="lm-notif" ref={rootRef}>
      <Tooltip label="Notifications" side="bottom">
        <IconButton
          variant="plain"
          aria-label={`Notifications${unread > 0 ? ` (${unread} unread)` : ""}`}
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
        >
          <Icon name="bell" size={16} />
        </IconButton>
      </Tooltip>
      {unread > 0 && (
        <span className="lm-notif__badge">{unread > 9 ? "9+" : unread}</span>
      )}
      {open && (
        <div className="lm-notif__panel" role="menu" aria-label="Notifications">
          <div className="lm-notif__head">
            <span>Notifications</span>
            {notifications.length > 0 && (
              <button
                type="button"
                className="lm-notif__clear"
                onClick={() => {
                  onClear();
                  setSeenCount(0);
                }}
              >
                Clear all
              </button>
            )}
          </div>
          {ordered.length === 0 ? (
            <div className="lm-notif__empty">Nothing yet.</div>
          ) : (
            <div className="lm-notif__list">
              {ordered.map((n) => (
                <div className="lm-notif__row" key={n.id}>
                  <span className="lm-notif__msg">{n.msg}</span>
                  <span className="lm-notif__when" suppressHydrationWarning>
                    {now ? relTime(n.at, now) : ""}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
