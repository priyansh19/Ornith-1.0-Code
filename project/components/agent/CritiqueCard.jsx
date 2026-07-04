import React from 'react';

function useInjectCSS(id, css) {
  if (typeof document === 'undefined') return;
  if (document.getElementById(id)) return;
  const el = document.createElement('style');
  el.id = id; el.textContent = css;
  document.head.appendChild(el);
}

const SEV_COLOR = { blocker: 'var(--red)', major: 'var(--amber)', minor: 'var(--cyan)', info: 'var(--muted)' };

const CSS = `
.lm-crit {
  position: relative;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: var(--space-3) var(--space-4) var(--space-3) calc(var(--space-4) + 3px);
  overflow: hidden;
}
.lm-crit::before {
  content: ''; position: absolute; left: 0; top: 0; bottom: 0; width: 3px;
  background: var(--_sev, var(--muted));
}
.lm-crit__top { display: flex; align-items: center; gap: var(--space-2); margin-bottom: 6px; }
.lm-crit__cat {
  font-family: var(--font-mono); font-size: var(--text-micro); text-transform: uppercase;
  letter-spacing: var(--tracking-wide); color: var(--muted);
  background: var(--surface-3); border: 1px solid var(--border); border-radius: var(--radius-xs);
  padding: 2px 6px;
}
.lm-crit__round { margin-left: auto; font-family: var(--font-mono); font-size: var(--text-micro); color: var(--faint); }
.lm-crit__id { font-family: var(--font-mono); font-size: var(--text-micro); color: var(--faint); }
.lm-crit__msg { font-size: var(--text-sm); line-height: var(--lh-body); color: var(--text); }
.lm-crit__action {
  margin-top: 8px; display: block; font-family: var(--font-mono); font-size: var(--text-caption);
  color: var(--agent-hover); background: var(--bg-inset);
  border: 1px solid var(--border); border-radius: var(--radius-sm);
  padding: 6px 9px; word-break: break-word;
}
.lm-crit__action-label { color: var(--muted); margin-right: 6px; }
.lm-crit--resolved { opacity: 0.55; }
.lm-crit--resolved .lm-crit__msg { text-decoration: line-through; text-decoration-color: var(--faint); }
`;

/** A structured critique item from the Critic pipeline. */
export function CritiqueCard({
  severity = 'info', category, round, id, message, suggestedAction,
  resolved = false, className = '', children,
}) {
  useInjectCSS('lm-crit-css', CSS);
  const cls = ['lm-crit', resolved ? 'lm-crit--resolved' : '', className].filter(Boolean).join(' ');
  return (
    <div className={cls} style={{ '--_sev': SEV_COLOR[severity] }}>
      <div className="lm-crit__top">
        {/* severity badge rendered inline to keep this component self-contained */}
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          fontFamily: 'var(--font-mono)', fontSize: 'var(--text-micro)', fontWeight: 600,
          textTransform: 'uppercase', letterSpacing: 'var(--tracking-wide)',
          color: SEV_COLOR[severity], padding: '3px 8px 3px 7px', borderRadius: 'var(--radius-xs)',
          border: `1px solid color-mix(in srgb, ${SEV_COLOR[severity]} 35%, transparent)`,
          background: 'color-mix(in srgb, ' + SEV_COLOR[severity] + ' 12%, transparent)',
        }}>
          <span style={{ width: 7, height: 7, borderRadius: 2, background: 'currentColor' }} />
          {severity}
        </span>
        {category && <span className="lm-crit__cat">{category}</span>}
        {id && <span className="lm-crit__id">{id}</span>}
        {round != null && <span className="lm-crit__round">round {round}</span>}
      </div>
      <div className="lm-crit__msg">{message ?? children}</div>
      {suggestedAction && (
        <code className="lm-crit__action">
          <span className="lm-crit__action-label">→</span>{suggestedAction}
        </code>
      )}
    </div>
  );
}
