import * as React from "react";
import type { SearchHit } from "./data";

export interface GlobalSearchResultsProps {
  hits: SearchHit[];
  query: string;
  onJump: (sessionId: string) => void;
}

/** All-chats search results — one row per session with a hit, showing the
    session title, a text snippet around the first match, and a "+N more
    matches" pill when a session has multiple hits. Clicking a row jumps to
    that session filtered to its matching message(s) (see LMChatApp). */
export function GlobalSearchResults({ hits, query, onJump }: GlobalSearchResultsProps) {
  return (
    <div className="lm-globalsearch">
      {hits.length === 0 ? (
        <p className="lm-empty" style={{ marginTop: "8vh" }}>
          No matches for &ldquo;{query}&rdquo; across any session.
        </p>
      ) : (
        hits.map((h) => (
          <button
            key={h.sessionId}
            className="lm-globalhit"
            onClick={() => onJump(h.sessionId)}
          >
            <span className="lm-globalhit__title">
              {h.title}
              {h.matchCount > 1 && (
                <span className="lm-globalhit__count">
                  {" "}
                  · +{h.matchCount - 1} more match{h.matchCount - 1 === 1 ? "" : "es"}
                </span>
              )}
            </span>
            <span className="lm-globalhit__snippet">{h.snippet}</span>
          </button>
        ))
      )}
    </div>
  );
}
