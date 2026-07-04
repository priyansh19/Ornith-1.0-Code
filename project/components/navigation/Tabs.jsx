import React from 'react';

function useInjectCSS(id, css) {
  if (typeof document === 'undefined') return;
  if (document.getElementById(id)) return;
  const el = document.createElement('style');
  el.id = id; el.textContent = css;
  document.head.appendChild(el);
}

const CSS = `
.lm-tabs { display: flex; gap: 2px; border-bottom: 1px solid var(--border); }
.lm-tabs__tab {
  position: relative; border: none; background: transparent;
  color: var(--muted); font-family: var(--font-sans); font-size: var(--text-sm); font-weight: var(--fw-medium);
  padding: 9px 13px; cursor: pointer; display: inline-flex; align-items: center; gap: var(--space-2);
  transition: color var(--dur-fast) var(--ease-out);
}
.lm-tabs__tab:hover { color: var(--text); }
.lm-tabs__tab:focus-visible { outline: none; box-shadow: var(--ring-inset); border-radius: var(--radius-sm); }
.lm-tabs__tab--active { color: var(--text); }
.lm-tabs__tab--active::after {
  content: ''; position: absolute; left: 8px; right: 8px; bottom: -1px; height: 2px;
  background: var(--brand); border-radius: var(--radius-pill);
}
.lm-tabs--agent .lm-tabs__tab--active::after { background: var(--agent); }
.lm-tabs__count {
  font-family: var(--font-mono); font-size: var(--text-micro); color: var(--muted);
  background: var(--surface-3); border-radius: var(--radius-pill); padding: 1px 6px; line-height: 1.4;
}
.lm-tabs__tab--active .lm-tabs__count { color: var(--text); }
`;

/** Underline tab bar for switching panel views (e.g. Thinking / Critiques). */
export function Tabs({ tabs = [], value, onChange, accent = 'brand', className = '' }) {
  useInjectCSS('lm-tabs-css', CSS);
  const cls = ['lm-tabs', accent === 'agent' ? 'lm-tabs--agent' : '', className].filter(Boolean).join(' ');
  return (
    <div className={cls} role="tablist">
      {tabs.map((t) => {
        const v = typeof t === 'string' ? t : t.value;
        const label = typeof t === 'string' ? t : t.label;
        const count = typeof t === 'string' ? undefined : t.count;
        const icon = typeof t === 'string' ? null : t.icon;
        const active = v === value;
        return (
          <button
            key={v} role="tab" aria-selected={active}
            className={`lm-tabs__tab ${active ? 'lm-tabs__tab--active' : ''}`}
            onClick={() => onChange && onChange(v)}
          >
            {icon}{label}
            {count != null && <span className="lm-tabs__count">{count}</span>}
          </button>
        );
      })}
    </div>
  );
}
