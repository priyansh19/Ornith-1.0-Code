import React from 'react';

function useInjectCSS(id, css) {
  if (typeof document === 'undefined') return;
  if (document.getElementById(id)) return;
  const el = document.createElement('style');
  el.id = id; el.textContent = css;
  document.head.appendChild(el);
}

const CSS = `
.lm-sev {
  display: inline-flex; align-items: center; gap: 6px;
  font-family: var(--font-mono); font-size: var(--text-micro); font-weight: var(--fw-semibold);
  text-transform: uppercase; letter-spacing: var(--tracking-wide);
  padding: 3px 8px 3px 7px; border-radius: var(--radius-xs);
  border: 1px solid transparent; line-height: 1;
}
.lm-sev__dot { width: 7px; height: 7px; border-radius: 2px; background: currentColor; flex-shrink: 0; }
.lm-sev--blocker { color: var(--red); background: var(--red-soft); border-color: color-mix(in srgb, var(--red) 38%, transparent); }
.lm-sev--major   { color: var(--amber); background: var(--amber-soft); border-color: color-mix(in srgb, var(--amber) 32%, transparent); }
.lm-sev--minor   { color: var(--cyan); background: var(--cyan-soft); border-color: color-mix(in srgb, var(--cyan) 30%, transparent); }
.lm-sev--info    { color: var(--muted); background: var(--surface-3); border-color: var(--border-strong); }
`;

/** Severity chip for the critique pipeline (blocker / major / minor / info). */
export function SeverityBadge({ level = 'info', className = '', ...rest }) {
  useInjectCSS('lm-sev-css', CSS);
  const cls = ['lm-sev', `lm-sev--${level}`, className].filter(Boolean).join(' ');
  return (
    <span className={cls} {...rest}>
      <span className="lm-sev__dot" />
      {level}
    </span>
  );
}
