import React from 'react';

function useInjectCSS(id, css) {
  if (typeof document === 'undefined') return;
  if (document.getElementById(id)) return;
  const el = document.createElement('style');
  el.id = id; el.textContent = css;
  document.head.appendChild(el);
}

const CSS = `
.lm-iconbtn {
  display: inline-flex; align-items: center; justify-content: center;
  width: var(--control-md); height: var(--control-md);
  border-radius: var(--radius-md);
  border: 1px solid transparent;
  background: transparent;
  color: var(--text-soft);
  cursor: pointer;
  transition: background var(--dur-fast) var(--ease-out), color var(--dur-fast) var(--ease-out), border-color var(--dur-fast) var(--ease-out);
}
.lm-iconbtn:hover:not(:disabled) { background: var(--surface-3); color: var(--text); }
.lm-iconbtn:focus-visible { outline: none; box-shadow: var(--ring); }
.lm-iconbtn:active:not(:disabled) { transform: translateY(0.5px); }
.lm-iconbtn:disabled { opacity: 0.4; cursor: not-allowed; }
.lm-iconbtn--sm { width: var(--control-sm); height: var(--control-sm); }
.lm-iconbtn--lg { width: var(--control-lg); height: var(--control-lg); }
.lm-iconbtn--outlined { border-color: var(--border-strong); background: var(--surface-2); }
.lm-iconbtn--outlined:hover:not(:disabled) { border-color: var(--faint); background: var(--surface-3); }
.lm-iconbtn--solid { background: var(--brand); color: var(--on-brand); }
.lm-iconbtn--solid:hover:not(:disabled) { background: var(--brand-hover); }
.lm-iconbtn--danger:hover:not(:disabled) { background: var(--red-soft); color: var(--red); }
.lm-iconbtn svg { width: 17px; height: 17px; display: block; }
.lm-iconbtn--sm svg { width: 15px; height: 15px; }
`;

/** Square icon-only button. Pair every instance with an `aria-label`. */
export function IconButton({ children, variant = 'plain', size = 'md', className = '', ...rest }) {
  useInjectCSS('lm-iconbtn-css', CSS);
  const cls = [
    'lm-iconbtn',
    variant !== 'plain' ? `lm-iconbtn--${variant}` : '',
    size !== 'md' ? `lm-iconbtn--${size}` : '',
    className,
  ].filter(Boolean).join(' ');
  return <button className={cls} {...rest}>{children}</button>;
}
