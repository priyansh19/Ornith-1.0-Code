import React from 'react';

function useInjectCSS(id, css) {
  if (typeof document === 'undefined') return;
  if (document.getElementById(id)) return;
  const el = document.createElement('style');
  el.id = id; el.textContent = css;
  document.head.appendChild(el);
}

const CSS = `
.lm-seg {
  display: inline-flex;
  padding: 3px;
  gap: 2px;
  background: var(--bg-inset);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
}
.lm-seg__opt {
  display: inline-flex; align-items: center; gap: var(--space-2);
  border: none; background: transparent;
  color: var(--muted);
  font-family: var(--font-sans); font-size: var(--text-caption); font-weight: var(--fw-medium);
  padding: 5px 13px; border-radius: var(--radius-sm);
  cursor: pointer;
  transition: background var(--dur-fast) var(--ease-out), color var(--dur-fast) var(--ease-out);
}
.lm-seg__opt:hover:not(.lm-seg__opt--active) { color: var(--text); }
.lm-seg__opt:focus-visible { outline: none; box-shadow: var(--ring-inset); }
.lm-seg__opt--active { background: var(--surface-3); color: var(--text); }
.lm-seg--brand .lm-seg__opt--active { background: var(--brand); color: var(--on-brand); }
.lm-seg--agent .lm-seg__opt--active { background: var(--agent); color: #fff; }
.lm-seg__opt svg { width: 14px; height: 14px; }
.lm-seg__dot { width: 6px; height: 6px; border-radius: 50%; background: currentColor; }
`;

/**
 * Segmented single-select toggle. The LMChat mode switch
 * (Direct / Harness) is the canonical use.
 */
export function SegmentedToggle({ options, value, onChange, accent = 'neutral', className = '' }) {
  useInjectCSS('lm-seg-css', CSS);
  const cls = ['lm-seg', accent !== 'neutral' ? `lm-seg--${accent}` : '', className].filter(Boolean).join(' ');
  return (
    <div className={cls} role="tablist">
      {options.map((opt) => {
        const v = typeof opt === 'string' ? opt : opt.value;
        const label = typeof opt === 'string' ? opt : opt.label;
        const icon = typeof opt === 'string' ? null : opt.icon;
        const active = v === value;
        return (
          <button
            key={v}
            role="tab"
            aria-selected={active}
            className={`lm-seg__opt ${active ? 'lm-seg__opt--active' : ''}`}
            onClick={() => onChange && onChange(v)}
          >
            {icon}
            {label}
          </button>
        );
      })}
    </div>
  );
}
