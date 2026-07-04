import * as React from "react";
import { Button, IconButton, Icon } from "@/components/ds";
import { useDialog } from "./useDialog";
import { isMac } from "./platform";

export interface HelpModalProps {
  onClose: () => void;
}

const SHORTCUTS: Array<[string, string[]]> = [
  ["Open command palette", [isMac ? "⌘" : "Ctrl", "K"]],
  ["Search (this chat / all chats)", [isMac ? "⌘" : "Ctrl", "F"]],
  ["Send message", ["Enter"]],
  ["New line", ["Shift", "Enter"]],
  ["Close dialogs", ["Esc"]],
  ["Toggle sessions", ["["]],
  ["Toggle details panel", ["]"]],
];

/** Quickstart + keyboard shortcuts — the app's one-stop onboarding surface. */
export function HelpModal({ onClose }: HelpModalProps) {
  const cardRef = React.useRef<HTMLDivElement | null>(null);
  useDialog(cardRef, onClose);
  return (
    <div className="lm-modal" onClick={onClose}>
      <div
        className="lm-modal__card"
        ref={cardRef}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="lm-modal__head">
          <div className="lm-modal__title">
            <Icon name="circle-help" size={17} />
            <span>Help &amp; shortcuts</span>
          </div>
          <IconButton
            variant="plain"
            aria-label="Close"
            onClick={onClose}
            className="lm-modal__x"
          >
            <Icon name="x" size={17} />
          </IconButton>
        </div>

        <div className="lm-modal__body">
          <div className="lm-mdl__section">How LMChat works</div>
          <ol className="lm-help__steps">
            <li>
              <b>Pick a working folder</b> when you start a session — every
              tool the agent runs (reads, edits, shell) is scoped inside it
              automatically for the whole session. The folder chip lives next
              to the composer.
            </li>
            <li>
              <b>Send a prompt</b> and watch the run live in the right panel —
              the step-by-step <b>Trace</b>, the session <b>Inspector</b>, and
              the <b>Workspace</b> browser.
            </li>
            <li>
              <b>Approve file writes</b> — proposed edits show as a diff you
              approve or reject (change the tier next to the composer).
            </li>
            <li>
              <b>Tune anything</b>: models, attached context files, and the
              Ollama URL in Settings.
            </li>
          </ol>

          <div className="lm-mdl__section" style={{ marginTop: 16 }}>
            Keyboard shortcuts
          </div>
          <div className="lm-help__grid">
            {SHORTCUTS.map(([label, keys]) => (
              <div key={label} className="lm-help__row">
                <span>{label}</span>
                <span className="lm-help__keys">
                  {keys.map((k) => (
                    <kbd key={k} suppressHydrationWarning>
                      {k}
                    </kbd>
                  ))}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="lm-modal__foot">
          <span
            className="lm-dim"
            style={{ fontFamily: "var(--font-mono)", fontSize: 11 }}
          >
            LMChat · local models over Ollama
          </span>
          <Button variant="secondary" size="sm" onClick={onClose}>
            Done
          </Button>
        </div>
      </div>
    </div>
  );
}
