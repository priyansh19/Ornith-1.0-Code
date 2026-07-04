import * as React from "react";

export type ThinkingKind = "thought" | "tool" | "observation";

export interface ThinkingStepProps {
  kind?: ThinkingKind;
  agent?: React.ReactNode;
  content?: React.ReactNode;
  last?: boolean;
  className?: string;
  children?: React.ReactNode;
}

const GLYPH: Record<ThinkingKind, React.ReactNode> = {
  thought: "…",
  tool: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18v3h3l6.3-6.3a4 4 0 0 0 5.4-5.4l-2.7 2.7-2-2 2.7-2.7Z" />
    </svg>
  ),
  observation: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  ),
};

/** One ReAct trace step: thought → tool call → observation. */
export function ThinkingStep({
  kind = "thought",
  agent,
  content,
  last = false,
  className = "",
  children,
}: ThinkingStepProps) {
  const cls = ["lm-think", `lm-think--${kind}`, className]
    .filter(Boolean)
    .join(" ");
  const kindLabel =
    kind === "tool"
      ? "Tool call"
      : kind === "observation"
        ? "Observation"
        : "Thought";
  return (
    <div className={cls}>
      <div className="lm-think__rail">
        <span className="lm-think__node">{GLYPH[kind]}</span>
        {!last && <span className="lm-think__line" />}
      </div>
      <div className="lm-think__body">
        <div className="lm-think__kind">
          {kindLabel}
          {agent && <span className="lm-think__agent">· {agent}</span>}
        </div>
        <div className="lm-think__content">{content ?? children}</div>
      </div>
    </div>
  );
}
