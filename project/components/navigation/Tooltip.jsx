import React from 'react';

function useInjectCSS(id, css) {
  if (typeof document === 'undefined') return;
  if (document.getElementById(id)) return;
  const el = document.createElement('style');
  el.id = id; el.textContent = css;
  document.head.appendChild(el);
}

const CSS = `
.lm-tip { position: relative; display: inline-flex; }
.lm-tip__pop {
  position: absolute; z-index: 40; pointer-events: none;
  background: var(--surface-2); color: var(--text);
  border: 1px solid var(--border-strong); border-radius: var(--radius-sm);
  box-shadow: var(--shadow-pop);
  font-family: var(--font-mono); font-size: var(--text-micro); line-height: 1.4;
  padding: 5px 8px; white-space: nowrap;
  opacity: 0; transform: translate(-50%, 2px); left: 50%;
  transition: opacity var(--dur-fast) var(--ease-out), transform var(--dur-fast) var(--ease-out);
}
.lm-tip__pop--top { bottom: calc(100% + 7px); }
.lm-tip__pop--bottom { top: calc(100% + 7px); }
.lm-tip:hover .lm-tip__pop, .lm-tip:focus-within .lm-tip__pop { opacity: 1; transform: translate(-50%, 0); }
.lm-tip__pop::after {
  content: ''; position: absolute; left: 50%; transform: translateX(-50%) rotate(45deg);
  width: 7px; height: 7px; background: var(--surface-2); border: 1px solid var(--border-strong);
}
.lm-tip__pop--top::after { bottom: -4px; border-top: none; border-left: none; }
.lm-tip__pop--bottom::after { top: -4px; border-bottom: none; border-right: none; }
`;

/** Lightweight hover/focus tooltip. Wraps its trigger child. */
export function Tooltip({ label, side = 'top', children, className = '' }) {
  useInjectCSS('lm-tip-css', CSS);
  return (
    <span className={`lm-tip ${className}`.trim()} tabIndex={-1}>
      {children}
      <span className={`lm-tip__pop lm-tip__pop--${side}`} role="tooltip">{label}</span>
    </span>
  );
}
