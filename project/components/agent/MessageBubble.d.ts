import * as React from 'react';

export interface MessageBubbleProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Side + identity. @default 'assistant' */
  role?: 'user' | 'assistant';
  /** Override the sender label (default "You" / "ornith"). */
  name?: string;
  /** Timestamp shown next to the label. */
  time?: string;
  /** Show the "Processing…" spinner state instead of children. */
  loading?: boolean;
}

/**
 * A single chat message bubble.
 *
 * @startingPoint section="Agent" subtitle="User + assistant chat bubbles" viewport="700x150"
 */
export function MessageBubble(props: MessageBubbleProps): React.JSX.Element;
