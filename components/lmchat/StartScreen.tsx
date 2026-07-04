import * as React from "react";
import { Button, Input, Icon, Tooltip } from "@/components/ds";
import { pickDirectory, useIsElectron } from "./electronBridge";

export interface StartScreenProps {
  dir: string;
  setDir: (dir: string) => void;
  onStart: () => void;
}

/** New-session pre-flight: pick a working folder, then start chatting with
    the local Ornith model. */
export function StartScreen({
  dir,
  setDir,
  onStart,
}: StartScreenProps) {
  const [browsing, setBrowsing] = React.useState(false);
  const electron = useIsElectron();

  const handleBrowse = async () => {
    setBrowsing(true);
    try {
      const result = await pickDirectory();
      if (!result) return; // user cancelled, or no picker available at all
      setDir(result.path);
    } finally {
      setBrowsing(false);
    }
  };

  return (
    <div className="lm-pick">
      <div className="lm-pick__head">
        <div className="lm-empty__mark">M2</div>
        <h2 className="lm-pick__h">Start a coding session</h2>
        <p className="lm-pick__p">
          Pick a working folder — every tool the agent runs (reads, edits,
          shell) is scoped inside it automatically for the whole session.
        </p>
      </div>

      <div className="lm-pick__dir">
        <label className="lm-pick__dirlabel">
          <Icon name="folder" size={13} /> Working directory
        </label>
        <div className="lm-pick__dirrow">
          <Input
            mono
            value={dir}
            onChange={(e) => setDir(e.target.value)}
            prefix={<Icon name="terminal" size={15} />}
            placeholder="~/projects/my-repo"
          />
          <Tooltip
            label={
              electron
                ? "Opens a real folder picker"
                : "Opens a folder picker — running in a browser tab, so only the folder's name is usable here, not a full path"
            }
            side="top"
          >
            <Button
              variant="secondary"
              iconLeft={<Icon name="folder-search" size={15} />}
              onClick={handleBrowse}
              disabled={browsing}
            >
              {browsing ? "Browsing…" : "Browse…"}
            </Button>
          </Tooltip>
        </div>
      </div>

      <Button
        variant="primary"
        size="lg"
        disabled={!dir.trim()}
        onClick={() => onStart()}
        iconLeft={<Icon name="sparkles" size={15} />}
      >
        Start session
      </Button>
    </div>
  );
}
