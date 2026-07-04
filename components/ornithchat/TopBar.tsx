import * as React from "react";
import { Button, IconButton, Tooltip, Icon } from "@/components/ds";
import { isMac } from "./platform";
import { NotificationBell, type NotificationItem } from "./NotificationBell";

export interface TopBarProps {
  onOpenModels: () => void;
  onExport: () => void;
  onClear: () => void;
  onToggleRight: () => void;
  onOpenPalette: () => void;
  onOpenHelp: () => void;
  onToggleNav: () => void;
  onToggleSearch: () => void;
  searchOpen: boolean;
  rightOpen: boolean;
  serverUp: boolean;
  notifications: NotificationItem[];
  onClearNotifications: () => void;
}

export function TopBar({
  onOpenModels,
  onExport,
  onClear,
  onToggleRight,
  onOpenPalette,
  onOpenHelp,
  onToggleNav,
  onToggleSearch,
  searchOpen,
  rightOpen,
  serverUp,
  notifications,
  onClearNotifications,
}: TopBarProps) {
  return (
    <header className="lm-topbar">
      <IconButton
        variant="plain"
        className="lm-topbar__menu"
        aria-label="Toggle sessions"
        onClick={onToggleNav}
      >
        <Icon name="menu" size={18} />
      </IconButton>
      <div className="lm-topbar__brand">
        <span className="lm-mark">OC</span>
        <span className="lm-wordmark">OrnithChat</span>
      </div>

      <div className="lm-topbar__right">
        <button
          className="lm-kchip"
          onClick={onToggleSearch}
          aria-label="Search conversations"
          aria-pressed={searchOpen}
        >
          <Icon name="search" size={13} />
          <span>Search</span>
          <kbd suppressHydrationWarning>{isMac ? "⌘F" : "Ctrl F"}</kbd>
        </button>
        <Tooltip label="Command palette" side="bottom">
          <IconButton
            variant="plain"
            aria-label="Open command palette"
            onClick={onOpenPalette}
          >
            <Icon name="terminal" size={16} />
          </IconButton>
        </Tooltip>

        <Tooltip label="Model library" side="bottom">
          <IconButton variant="plain" aria-label="Models" onClick={onOpenModels}>
            <Icon name="server" size={16} />
          </IconButton>
        </Tooltip>

        <Tooltip
          label={
            serverUp ? "Backend server running · uvicorn :8000" : "Server stopped"
          }
          side="bottom"
        >
          <span className={`lm-server ${serverUp ? "lm-server--up" : ""}`}>
            <span className="lm-server__dot" />
            <span className="lm-server__word">server</span>
            :8000
          </span>
        </Tooltip>

        <Tooltip label="Trace · Inspector · Workspace" side="bottom">
          <Button
            variant={rightOpen ? "agent" : "secondary"}
            size="sm"
            iconLeft={<Icon name="panel-right" size={14} />}
            onClick={onToggleRight}
          >
            Details
          </Button>
        </Tooltip>

        <Tooltip label="Export run" side="bottom">
          <IconButton variant="plain" aria-label="Export run" onClick={onExport}>
            <Icon name="download" size={16} />
          </IconButton>
        </Tooltip>

        <Tooltip label="Help & shortcuts" side="bottom">
          <IconButton variant="plain" aria-label="Help" onClick={onOpenHelp}>
            <Icon name="circle-help" size={16} />
          </IconButton>
        </Tooltip>

        <Tooltip label="Clear session" side="bottom">
          <IconButton variant="plain" aria-label="Clear session" onClick={onClear}>
            <Icon name="eraser" size={16} />
          </IconButton>
        </Tooltip>

        <NotificationBell notifications={notifications} onClear={onClearNotifications} />
      </div>
    </header>
  );
}
