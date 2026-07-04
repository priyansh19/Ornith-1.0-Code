import * as React from 'react';

export type ToolKind = 'edit' | 'read' | 'run' | 'tool' | 'search';

export interface ToolItem {
  /** Determines the leading glyph + color. */
  kind: ToolKind;
  /** The line text (path, command, query). */
  text: string;
  /** Optional [added, removed] line counts for edits. */
  diff?: [number, number];
}

export interface ToolCallProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Summary line, e.g. "Edited a file, used a tool". JSX allowed (use <b> for emphasis). */
  summary: React.ReactNode;
  /** Detail steps revealed on expand. */
  items?: ToolItem[];
  /** Show a spinner instead of the tool glyph (in-flight). */
  running?: boolean;
  /** Start expanded. */
  defaultOpen?: boolean;
}

/**
 * Collapsible agent tool-activity disclosure shown inline in the conversation
 * (file edits, reads, shell runs, tool calls).
 *
 * @startingPoint section="Agent" subtitle="Inline tool-activity row" viewport="700x150"
 */
export function ToolCall(props: ToolCallProps): React.JSX.Element;
