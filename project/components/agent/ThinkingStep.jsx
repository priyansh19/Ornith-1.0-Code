import React from 'react';

function useInjectCSS(id, css) {
  if (typeof document === 'undefined') return;
  if (document.getElementById(id)) return;
  const el = document.createElement('style');
  el.id = id; el.textContent = css;
  document.head.appendChild(el);
}

const CSS = `
.lm-think { display: flex; gap: var(--space-3); padding: 2px 0; }
.lm-think__rail { display: flex; flex-direction: column; align-items: center; flex-shrink: 0; }
.lm-think__node {
  width: 22px; height: 22px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  border: 1px solid var(--border-strong); background: var(--surface-2);
  color: var(--muted); font-family: var(--font-mono); font-size: 10px;
}
.lm-think__node svg { width: 12px; height: 12px; }
.lm-think__line { width: 1px; flex: 1; background: var(--border); margin: 2px 0; min-height: 8px; }
.lm-think--thought .lm-think__node { color: var(--text-soft); }
.lm-think--tool .lm-think__node { color: var(--agent-hover); border-color: color-mix(in srgb, var(--agent) 45%, transparent); }
.lm-think--observation .lm-think__node { color: var(--green); border-color: color-mix(in srgb, var(--green) 40%, transparent); }
.lm-think__body { padding-bottom: var(--space-3); min-width: 0; flex: 1; }
.lm-think__kind {
  font-family: var(--font-mono); font-size: var(--text-micro); text-transform: uppercase;
  letter-spacing: var(--tracking-caps); color: var(--muted); margin-bottom: 3px;
  display: flex; align-items: center; gap: var(--space-2);
}
.lm-think__agent { color: var(--text-soft); }
.lm-think__content { font-size: var(--text-sm); line-height: var(--lh-body); color: var(--text-soft); }
.lm-think--tool .lm-think__content { font-family: var(--font-mono); font-size: var(--text-caption); color: var(--text); background: var(--bg-inset); border: 1px solid var(--border); border-radius: var(--radius-sm); padding: 6px 9px; }
`;

const GLYPH = {
  thought: '…',
  tool: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18v3h3l6.3-6.3a4 4 0 0 0 5.4-5.4l-2.7 2.7-2-2 2.7-2.7Z"/></svg>),
  observation: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>),
};

/** One ReAct trace step: thought → tool call → observation. */
export function ThinkingStep({ kind = 'thought', agent, content, last = false, className = '', children }) {
  useInjectCSS('lm-think-css', CSS);
  const cls = ['lm-think', `lm-think--${kind}`, className].filter(Boolean).join(' ');
  const kindLabel = kind === 'tool' ? 'Tool call' : kind === 'observation' ? 'Observation' : 'Thought';
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
