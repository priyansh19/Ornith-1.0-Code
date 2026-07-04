import React from 'react';

function useInjectCSS(id, css) {
  if (typeof document === 'undefined') return;
  if (document.getElementById(id)) return;
  const el = document.createElement('style');
  el.id = id; el.textContent = css;
  document.head.appendChild(el);
}

const CSS = `
.lm-bubble { display: flex; flex-direction: column; gap: 4px; max-width: 90%; }
.lm-bubble--user { align-self: flex-end; align-items: flex-end; }
.lm-bubble--assistant { align-self: flex-start; align-items: flex-start; }
.lm-bubble__label {
  font-family: var(--font-mono); font-size: var(--text-micro);
  text-transform: uppercase; letter-spacing: var(--tracking-caps);
  color: var(--muted); display: inline-flex; gap: 7px; align-items: center;
}
.lm-bubble--user .lm-bubble__label { color: var(--cyan); }
.lm-bubble--assistant .lm-bubble__label { color: var(--green); }
.lm-bubble__time { color: var(--faint); letter-spacing: 0; }
.lm-bubble__text {
  background: var(--surface); border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: 9px 13px; line-height: var(--lh-body); font-size: var(--text-sm);
  color: var(--text); white-space: pre-wrap; word-break: break-word;
}
.lm-bubble--user .lm-bubble__text { background: var(--agent-soft); border-color: color-mix(in srgb, var(--agent) 50%, transparent); }
.lm-bubble__loading { display: inline-flex; align-items: center; gap: var(--space-2); color: var(--muted); font-style: italic; }
.lm-bubble__spinner { width: 13px; height: 13px; border-radius: 50%; border: 2px solid var(--border-strong); border-top-color: var(--green); animation: lm-spin .7s linear infinite; }
`;

/** Chat message bubble — user (right, cyan) or assistant (left, green). */
export function MessageBubble({ role = 'assistant', name, time, loading = false, children, className = '', ...rest }) {
  useInjectCSS('lm-bubble-css', CSS);
  const cls = ['lm-bubble', `lm-bubble--${role}`, className].filter(Boolean).join(' ');
  const defaultName = role === 'user' ? 'You' : 'ornith';
  return (
    <div className={cls} {...rest}>
      <span className="lm-bubble__label">
        {name || defaultName}
        {time && <span className="lm-bubble__time">{time}</span>}
      </span>
      <div className="lm-bubble__text">
        {loading
          ? <span className="lm-bubble__loading"><span className="lm-bubble__spinner" />Processing…</span>
          : children}
      </div>
    </div>
  );
}
