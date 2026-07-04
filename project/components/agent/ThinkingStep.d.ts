import * as React from 'react';

export interface ThinkingStepProps {
  /** Step type in the ReAct loop. @default 'thought' */
  kind?: 'thought' | 'tool' | 'observation';
  /** Originating agent (Harness, Scout 3, Critic…). */
  agent?: string;
  /** Step content; or pass `children`. */
  content?: React.ReactNode;
  /** Last step in the timeline — hides the connector line. */
  last?: boolean;
  className?: string;
  children?: React.ReactNode;
}

/** One step in the Thinking panel's ReAct trace (thought / tool / observation). */
export function ThinkingStep(props: ThinkingStepProps): React.JSX.Element;
