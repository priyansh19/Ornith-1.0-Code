import * as React from "react";
import { IconButton, Input, Tooltip, Avatar, Icon } from "@/components/ds";
import { relTime, type Folder, type Provider, type Session } from "./data";
import { ContextMenu, type MenuItem } from "./ContextMenu";

/** Inline-rename input: Enter commits (trimmed; empty cancels), Esc cancels, blur commits. */
function RenameInput({
  value,
  onCommit,
  onCancel,
}: {
  value: string;
  onCommit: (v: string) => void;
  onCancel: () => void;
}) {
  const done = React.useRef(false);
  return (
    <input
      className="lm-rename"
      defaultValue={value}
      autoFocus
      onFocus={(e) => e.currentTarget.select()}
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          done.current = true;
          onCommit(e.currentTarget.value);
        } else if (e.key === "Escape") {
          done.current = true;
          onCancel();
        }
      }}
      onBlur={(e) => {
        if (!done.current) onCommit(e.currentTarget.value);
      }}
    />
  );
}

function SessionRow({
  s,
  now,
  active,
  editing,
  onSelect,
  onTogglePin,
  onMenu,
  onCommitRename,
  onCancelRename,
}: {
  s: Session;
  now: number;
  active: boolean;
  editing: boolean;
  onSelect: (id: string) => void;
  onTogglePin: (id: string) => void;
  onMenu: (id: string, x: number, y: number) => void;
  onCommitRename: (v: string) => void;
  onCancelRename: () => void;
}) {
  // "waiting" = paused on an approval gate — the single state that most
  // needs a glanceable, distinct-from-idle affordance in the sidebar, since
  // it means the session needs the user to come back and act.
  const needsAttention = s.run.status === "waiting";
  const live = s.run.status === "running" || s.run.status === "streaming";
  return (
    <div
      className={`lm-ses ${active ? "lm-ses--active" : ""}`}
      onContextMenu={(e) => {
        e.preventDefault();
        onMenu(s.id, e.clientX, e.clientY);
      }}
    >
      {editing ? (
        <div className="lm-ses__hit lm-ses__hit--edit">
          <RenameInput value={s.title} onCommit={onCommitRename} onCancel={onCancelRename} />
        </div>
      ) : (
        <button className="lm-ses__hit" onClick={() => onSelect(s.id)} title={s.title}>
          <span className="lm-ses__title">{s.title}</span>
          {needsAttention && (
            <span className="lm-ses__attn" aria-label="waiting for your approval" title="Waiting for your approval">
              <Icon name="circle-alert" size={12} />
            </span>
          )}
          {live && (
            <span className="lm-ses__live" aria-label="run in progress" title="Run in progress" />
          )}
          <span className="lm-ses__when" suppressHydrationWarning>
            {s.lastActiveAt && now ? relTime(s.lastActiveAt, now) : s.when}
          </span>
        </button>
      )}
      <button
        className={`lm-ses__pin ${s.pinned ? "is-pinned" : ""}`}
        aria-label={s.pinned ? "Unpin" : "Pin"}
        onClick={() => onTogglePin(s.id)}
      >
        <Icon name="pin" size={13} />
      </button>
      <button
        className="lm-ses__kebab"
        aria-label="Session menu"
        onClick={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          onMenu(s.id, r.left, r.bottom + 4);
        }}
      >
        <Icon name="more-horizontal" size={13} />
      </button>
    </div>
  );
}

type MenuTarget = { kind: "session" | "folder"; id: string; x: number; y: number };
type EditTarget = { kind: "session" | "folder"; id: string };

export interface SidebarProps {
  folders: Folder[];
  sessions: Session[];
  active: string;
  onSelect: (id: string) => void;
  onNew: () => void;
  openFolders: Record<string, boolean>;
  toggleFolder: (id: string) => void;
  onOpenSettings: () => void;
  provider: Provider;
  query: string;
  setQuery: (q: string) => void;
  onTogglePin: (id: string) => void;
  onRenameSession: (id: string, title: string) => void;
  onDeleteSession: (id: string) => void;
  onMoveSession: (id: string, folderId: string | null) => void;
  onRenameFolder: (id: string, name: string) => void;
  onDeleteFolder: (id: string) => void;
  onCreateFolder: () => string;
  mobileOpen?: boolean;
  /** User-adjustable width in px (drag handle in LMChatApp) — falls back to
      the CSS default (280px) when omitted. */
  width?: number;
}

export function Sidebar({
  folders,
  sessions,
  active,
  onSelect,
  onNew,
  openFolders,
  toggleFolder,
  onOpenSettings,
  provider,
  query,
  setQuery,
  onTogglePin,
  onRenameSession,
  onDeleteSession,
  onMoveSession,
  onRenameFolder,
  onDeleteFolder,
  onCreateFolder,
  mobileOpen = false,
  width,
}: SidebarProps) {
  // Clock tick for live "when" labels. Starts at 0 so SSR + first client
  // render agree (falls back to the frozen s.when); the setTimeout(…, 0)
  // gives an immediate post-mount tick without a synchronous setState.
  const [now, setNow] = React.useState(0);
  React.useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30000);
    const t = setTimeout(() => setNow(Date.now()), 0);
    return () => {
      clearInterval(id);
      clearTimeout(t);
    };
  }, []);
  const needle = query.trim().toLowerCase();
  const match = (s: Session) => !needle || s.title.toLowerCase().includes(needle);
  const shown = sessions.filter(match);
  const pinned = shown.filter((s) => s.pinned);
  const loose = shown.filter((s) => !s.folderId && !s.pinned);

  // Context-menu + inline-rename state (which target, where)
  const [menu, setMenu] = React.useState<MenuTarget | null>(null);
  const [confirmDel, setConfirmDel] = React.useState(false);
  const [editing, setEditing] = React.useState<EditTarget | null>(null);

  const closeMenu = React.useCallback(() => {
    setMenu(null);
    setConfirmDel(false);
  }, []);

  const openSessionMenu = (id: string, x: number, y: number) => {
    setConfirmDel(false);
    setMenu({ kind: "session", id, x, y });
  };
  const openFolderMenu = (id: string, x: number, y: number) => {
    setConfirmDel(false);
    setMenu({ kind: "folder", id, x, y });
  };

  const commitRename = (v: string) => {
    if (editing) {
      const t = v.trim();
      if (t) {
        if (editing.kind === "session") onRenameSession(editing.id, t);
        else onRenameFolder(editing.id, t);
      }
    }
    setEditing(null);
  };
  const cancelRename = () => setEditing(null);

  const newFolderFlow = () => {
    const id = onCreateFolder();
    setEditing({ kind: "folder", id });
  };

  const menuItems = (): MenuItem[] => {
    if (!menu) return [];
    if (menu.kind === "session") {
      const s = sessions.find((x) => x.id === menu.id);
      if (!s) return [];
      return [
        {
          label: "Rename",
          icon: "pencil",
          onSelect: () => {
            setEditing({ kind: "session", id: s.id });
            closeMenu();
          },
        },
        {
          label: "Move to folder",
          icon: "folder-input",
          submenu: [
            ...folders.map((f) => ({
              label: f.name,
              icon: "folder",
              onSelect: () => {
                onMoveSession(s.id, f.id);
                closeMenu();
              },
            })),
            ...(s.folderId
              ? [
                  {
                    label: "Remove from folder",
                    icon: "x",
                    onSelect: () => {
                      onMoveSession(s.id, null);
                      closeMenu();
                    },
                  },
                ]
              : []),
            {
              label: "New folder…",
              icon: "folder-plus",
              onSelect: () => {
                const fid = onCreateFolder();
                onMoveSession(s.id, fid);
                setEditing({ kind: "folder", id: fid });
                closeMenu();
              },
            },
          ],
        },
        {
          label: s.pinned ? "Unpin" : "Pin",
          icon: "pin",
          onSelect: () => {
            onTogglePin(s.id);
            closeMenu();
          },
        },
        {
          label: confirmDel ? "Confirm delete?" : "Delete",
          icon: "trash",
          danger: true,
          onSelect: () => {
            if (!confirmDel) {
              setConfirmDel(true);
            } else {
              onDeleteSession(s.id);
              closeMenu();
            }
          },
        },
      ];
    }
    const f = folders.find((x) => x.id === menu.id);
    if (!f) return [];
    return [
      {
        label: "Rename",
        icon: "pencil",
        onSelect: () => {
          setEditing({ kind: "folder", id: f.id });
          closeMenu();
        },
      },
      {
        label: confirmDel ? "Confirm delete?" : "Delete folder",
        icon: "trash",
        danger: true,
        onSelect: () => {
          if (!confirmDel) {
            setConfirmDel(true);
          } else {
            onDeleteFolder(f.id);
            closeMenu();
          }
        },
      },
    ];
  };

  const sessionRow = (s: Session) => (
    <SessionRow
      key={s.id}
      s={s}
      now={now}
      active={active === s.id}
      editing={editing?.kind === "session" && editing.id === s.id}
      onSelect={onSelect}
      onTogglePin={onTogglePin}
      onMenu={openSessionMenu}
      onCommitRename={commitRename}
      onCancelRename={cancelRename}
    />
  );

  return (
    <nav
      className={`lm-sidebar ${mobileOpen ? "lm-sidebar--open" : ""}`}
      style={width ? { width } : undefined}
    >
      <div className="lm-sidebar__top">
        <button className="lm-navrow" onClick={onNew}>
          <Icon name="plus" size={15} />
          <span>New session</span>
        </button>
        <button className="lm-navrow" onClick={newFolderFlow}>
          <Icon name="folder-plus" size={15} />
          <span>New folder</span>
        </button>
      </div>

      <div className="lm-sidebar__filters">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          prefix={<Icon name="search" size={14} />}
          placeholder="Search sessions…"
        />
      </div>

      <div className="lm-sidebar__list">
        {pinned.length > 0 && (
          <div className="lm-sesgroup">
            <div className="lm-sesgroup__label">
              <Icon name="pin" size={10} />
              Pinned
              <span className="lm-sesgroup__count">{pinned.length}</span>
            </div>
            {pinned.map(sessionRow)}
          </div>
        )}

        {folders.map((f) => {
          const items = shown.filter((s) => s.folderId === f.id && !s.pinned);
          const open = openFolders[f.id] !== false;
          const isEditing = editing?.kind === "folder" && editing.id === f.id;
          if (needle && items.length === 0 && !isEditing) return null;
          // A collapsed folder hides its rows entirely — without this, landing
          // on (or having a background run in) a session inside a closed
          // folder leaves no trace of where it is in the sidebar at all.
          const containsActive = !open && items.some((s) => s.id === active);
          return (
            <div className="lm-folder" key={f.id}>
              <div
                className={`lm-folder__row ${containsActive ? "lm-folder__row--active" : ""}`}
                onContextMenu={(e) => {
                  e.preventDefault();
                  openFolderMenu(f.id, e.clientX, e.clientY);
                }}
              >
                {isEditing ? (
                  <div className="lm-folder__head lm-folder__head--edit">
                    <span className={`lm-folder__chev ${open ? "lm-folder__chev--open" : ""}`}>
                      <Icon name="chevron-right" size={13} />
                    </span>
                    <Icon name={open ? "folder-open" : "folder"} size={14} />
                    <RenameInput value={f.name} onCommit={commitRename} onCancel={cancelRename} />
                  </div>
                ) : (
                  <button
                    className="lm-folder__head"
                    onClick={() => toggleFolder(f.id)}
                    title={containsActive ? "Contains your current session" : undefined}
                  >
                    <span className={`lm-folder__chev ${open ? "lm-folder__chev--open" : ""}`}>
                      <Icon name="chevron-right" size={13} />
                    </span>
                    <Icon name={open ? "folder-open" : "folder"} size={14} />
                    <span className="lm-folder__name">{f.name}</span>
                    {containsActive && <span className="lm-folder__activedot" aria-hidden />}
                    <span className="lm-folder__count">{items.length}</span>
                  </button>
                )}
                <button
                  className="lm-folder__kebab"
                  aria-label="Folder menu"
                  onClick={(e) => {
                    const r = e.currentTarget.getBoundingClientRect();
                    openFolderMenu(f.id, r.left, r.bottom + 4);
                  }}
                >
                  <Icon name="more-horizontal" size={13} />
                </button>
              </div>
              {open && (
                <div className="lm-folder__items">
                  {items.length === 0 ? (
                    <div className="lm-folder__empty">No chats</div>
                  ) : (
                    items.map(sessionRow)
                  )}
                </div>
              )}
            </div>
          );
        })}

        {loose.length > 0 && (
          <div className="lm-sesgroup">
            <div className="lm-sesgroup__label">
              Ungrouped
              <span className="lm-sesgroup__count">{loose.length}</span>
            </div>
            {loose.map(sessionRow)}
          </div>
        )}

        {shown.length === 0 && (
          <div className="lm-folder__empty" style={{ padding: "12px 9px" }}>
            No sessions match.
          </div>
        )}
      </div>

      <div className="lm-sidebar__foot">
        <Avatar role="user" size="sm" />
        <div className="lm-sidebar__user">
          <span className="lm-sidebar__name">priyansh</span>
          <span className="lm-sidebar__host">
            {provider.connected ? "ollama · connected" : "ollama · offline"}
          </span>
        </div>
        <Tooltip label="Settings · model provider" side="top">
          <IconButton variant="plain" aria-label="Settings" onClick={onOpenSettings}>
            <Icon name="settings" size={16} />
          </IconButton>
        </Tooltip>
      </div>

      {menu && <ContextMenu x={menu.x} y={menu.y} items={menuItems()} onClose={closeMenu} />}
    </nav>
  );
}
