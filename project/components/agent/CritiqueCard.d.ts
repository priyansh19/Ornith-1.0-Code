import * as React from 'react';

export type CritiqueSeverity = 'blocker' | 'major' | 'minor' | 'info';

export interface CritiqueCardProps {
  /** Drives the left accent rail + severity badge. @default 'info' */
  severity?: CritiqueSeverity;
  /** Category chip (fact, gap, logic, scope, efficiency…). */
  category?: string;
  /** Critique round number. */
  round?: number;
  /** Item id (e.g. "c-042"). */
  id?: string;
  /** The critique message; or pass `children`. */
  message?: React.ReactNode;
  /** A suggested action rendered as a mono code line. */
  suggestedAction?: string;
  /** Dim + strike-through when the item is resolved. */
  resolved?: boolean;
  className?: string;
  children?: React.ReactNode;
}

/**
 * A structured critique item from the multi-layer Critic pipeline.
 *
 * @startingPoint section="Agent" subtitle="Critique item with severity + action" viewport="700x180"
 */
export function CritiqueCard(props: CritiqueCardProps): React.JSX.Element;
