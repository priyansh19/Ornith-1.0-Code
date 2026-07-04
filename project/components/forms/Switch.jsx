import React from 'react';

function useInjectCSS(id, css) {
  if (typeof document === 'undefined') return;
  if (document.getElementById(id)) return;
  const el = document.createElement('style');
  el.id = id; el.textContent = css;
  document.head.appendChild(el);
}

const CSS = `
.lm-switch { display: inline-flex; align-items: center; gap: var(--space-3); cursor: pointer; user-select: none; }
.lm-switch__track {
  position: relative; width: 36px; height: 20px; flex-shrink: 0;
  background: var(--surface-3); border: 1px solid var(--border-strong);
  border-radius: var(--radius-pill);
  transition: background var(--dur-base) var(--ease-out), border-color var(--dur-base) var(--ease-out);
}
.lm-switch__thumb {
  position: absolute; top: 2px; left: 2px; width: 14px; height: 14px;
  background: var(--text-soft); border-radius: 50%;
  transition: transform var(--dur-base) var(--ease-out), background var(--dur-base) var(--ease-out);
}
.lm-switch input { position: absolute; opacity: 0; width: 0; height: 0; }
.lm-switch input:checked + .lm-switch__track { background: var(--brand); border-color: var(--brand); }
.lm-switch input:checked + .lm-switch__track .lm-switch__thumb { transform: translateX(16px); background: var(--on-brand); }
.lm-switch input:focus-visible + .lm-switch__track { box-shadow: var(--ring); }
.lm-switch--agent input:checked + .lm-switch__track { background: var(--agent); border-color: var(--agent); }
.lm-switch--agent input:checked + .lm-switch__track .lm-switch__thumb { background: #fff; }
.lm-switch__label { font-size: var(--text-sm); color: var(--text); }
.lm-switch--disabled { opacity: 0.45; cursor: not-allowed; }
`;

/** Boolean on/off switch. */
export function Switch({ checked, onChange, label, accent = 'brand', disabled = false, className = '', ...rest }) {
  useInjectCSS('lm-switch-css', CSS);
  const cls = ['lm-switch', accent === 'agent' ? 'lm-switch--agent' : '', disabled ? 'lm-switch--disabled' : '', className].filter(Boolean).join(' ');
  return (
    <label className={cls}>
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange && onChange(e.target.checked)}
        {...rest}
      />
      <span className="lm-switch__track"><span className="lm-switch__thumb" /></span>
      {label && <span className="lm-switch__label">{label}</span>}
    </label>
  );
}
