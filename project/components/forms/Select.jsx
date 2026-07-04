import React from 'react';

function useInjectCSS(id, css) {
  if (typeof document === 'undefined') return;
  if (document.getElementById(id)) return;
  const el = document.createElement('style');
  el.id = id; el.textContent = css;
  document.head.appendChild(el);
}

const CSS = `
.lm-select__wrap { position: relative; display: inline-flex; width: 100%; }
.lm-select {
  appearance: none; -webkit-appearance: none;
  width: 100%; height: var(--control-md);
  background: var(--bg-inset);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  color: var(--text);
  font-family: var(--font-sans); font-size: var(--text-sm);
  padding: 0 32px 0 12px;
  cursor: pointer; outline: none;
  transition: border-color var(--dur-fast) var(--ease-out), box-shadow var(--dur-fast) var(--ease-out);
}
.lm-select:hover { border-color: var(--border-strong); }
.lm-select:focus { border-color: var(--brand); box-shadow: 0 0 0 3px rgba(224,108,58,0.16); }
.lm-select:disabled { opacity: 0.5; cursor: not-allowed; }
.lm-select--mono { font-family: var(--font-mono); }
.lm-select__chevron {
  position: absolute; right: 11px; top: 50%; transform: translateY(-50%);
  pointer-events: none; color: var(--muted);
}
.lm-select__chevron svg { width: 15px; height: 15px; display: block; }
`;

const Chevron = () => (
  <span className="lm-select__chevron" aria-hidden="true">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m6 9 6 6 6-6" />
    </svg>
  </span>
);

/** Native select, styled to the dark token system with a custom chevron. */
export function Select({ options = [], value, onChange, mono = false, className = '', children, ...rest }) {
  useInjectCSS('lm-select-css', CSS);
  const cls = ['lm-select', mono ? 'lm-select--mono' : '', className].filter(Boolean).join(' ');
  return (
    <span className="lm-select__wrap">
      <select className={cls} value={value} onChange={(e) => onChange && onChange(e.target.value)} {...rest}>
        {children || options.map((opt) => {
          const v = typeof opt === 'string' ? opt : opt.value;
          const label = typeof opt === 'string' ? opt : opt.label;
          return <option key={v} value={v}>{label}</option>;
        })}
      </select>
      <Chevron />
    </span>
  );
}
