import * as React from "react";
import { Markdown } from "./Markdown";

export type MessageRole = "user" | "assistant";

const THINKING_WORDS = [
  "Pondering", "Percolating", "Noodling", "Munching", "Marinating",
  "Ruminating", "Simmering", "Cogitating", "Puzzling", "Contemplating",
  "Mulling", "Brewing", "Synthesizing", "Wrangling", "Divining", "Conjuring",
  "Tinkering", "Vibing", "Musing", "Deliberating",
];

/** Pulsing-glyph "the model is working" label — elapsed time ticks up and the
    verb rotates every couple seconds, mirroring Claude Code's own CLI status
    line rather than a plain spinner + static "Processing…". */
function ThinkingLabel() {
  const [elapsed, setElapsed] = React.useState(0);
  const [word, setWord] = React.useState(
    () => THINKING_WORDS[Math.floor(Math.random() * THINKING_WORDS.length)],
  );

  React.useEffect(() => {
    const start = Date.now();
    const tick = setInterval(() => {
      setElapsed(Math.floor((Date.now() - start) / 1000));
    }, 1000);
    const cycle = setInterval(() => {
      setWord((prev) => {
        let next = prev;
        while (next === prev) {
          next = THINKING_WORDS[Math.floor(Math.random() * THINKING_WORDS.length)];
        }
        return next;
      });
    }, 2200);
    return () => {
      clearInterval(tick);
      clearInterval(cycle);
    };
  }, []);

  return (
    <span className="lm-bubble__loading">
      <span className="lm-bubble__glyph" aria-hidden>
        ✻
      </span>
      <span className="lm-bubble__elapsed">{elapsed}s</span>
      <span aria-hidden>·</span>
      {word}…
    </span>
  );
}

export interface MessageBubbleProps
  extends React.HTMLAttributes<HTMLDivElement> {
  role?: MessageRole;
  name?: React.ReactNode;
  time?: React.ReactNode;
  loading?: boolean;
  /** finished but with no content — shows the "No response received" fallback */
  empty?: boolean;
  /** the turn errored — tints the bubble border red */
  error?: boolean;
  /** the turn was aborted mid-stream by the user */
  stopped?: boolean;
}

/** Chat message bubble — user (right, cyan) or assistant (left, green). */
export function MessageBubble({
  role = "assistant",
  name,
  time,
  loading = false,
  empty = false,
  error = false,
  stopped = false,
  children,
  className = "",
  ...rest
}: MessageBubbleProps) {
  const cls = [
    "lm-bubble",
    `lm-bubble--${role}`,
    error ? "lm-bubble--errored" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");
  const defaultName = role === "user" ? "You" : "ornith";
  return (
    <div className={cls} {...rest}>
      <span className="lm-bubble__label">
        {name || defaultName}
        {time && <span className="lm-bubble__time">{time}</span>}
      </span>
      {loading ? (
        <ThinkingLabel />
      ) : (
        <div className="lm-bubble__text">
          {empty ? (
            <span className="lm-bubble__empty">
              No response received — the model may have stopped without answering.
            </span>
          ) : (
            <>
              {role === "assistant" && typeof children === "string" ? (
                <Markdown>{children}</Markdown>
              ) : (
                children
              )}
              {stopped && <span className="lm-bubble__stopped">stopped by user</span>}
            </>
          )}
        </div>
      )}
    </div>
  );
}
