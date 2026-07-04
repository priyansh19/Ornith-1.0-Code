/* LMChat UI kit — full-panel + modal screens:
   - HarnessSelectScreen: shown first when a new session has no harness yet.
   - HarnessesPanel: server registry; load/unload harnesses.
   - SettingsModal: configure the Ollama provider URL. */
(function () {
  const DS = window.LMChatDesignSystem_bc9736;
  const { Button, IconButton, Badge, Tag, Switch, Input, Spinner } = DS;
  const { Icon, refreshIcons, HARNESS_DOT } = window.LMKit;

  // ── New-session harness picker (main panel) ──────────────
  function HarnessSelectScreen({ harnesses, dir, setDir, onPick, onOpenHarnesses }) {
    refreshIcons();
    const loaded = harnesses.filter((h) => h.loaded);
    return (
      <div className="lm-pick">
        <div className="lm-pick__head">
          <div className="lm-empty__mark">M2</div>
          <h2 className="lm-pick__h">Start a coding session</h2>
          <p className="lm-pick__p">Pick a working directory and an agent harness. The harness reads &amp; writes code in this directory for the whole session — chosen once, before your first prompt.</p>
        </div>

        <div className="lm-pick__dir">
          <label className="lm-pick__dirlabel">{Icon('folder', 13)} Working directory</label>
          <div className="lm-pick__dirrow">
            <Input mono value={dir} onChange={(e) => setDir(e.target.value)} prefix={Icon('terminal', 15)} placeholder="~/projects/my-repo" />
            <Button variant="secondary" iconLeft={Icon('folder-search', 15)} onClick={() => setDir('~/projects/mach2-harness')}>Browse…</Button>
          </div>
        </div>

        <div className="lm-pick__sub">Choose a harness <span className="lm-dim">· {loaded.length} loaded on server</span></div>
        <div className="lm-pick__grid">
          {loaded.map((h) => (
            <button key={h.id} className="lm-hcard" disabled={!dir.trim()} onClick={() => onPick(h.id)}>
              <div className="lm-hcard__top">
                <span className="lm-hcard__dot" style={{ background: HARNESS_DOT[h.id] }} />
                <span className="lm-hcard__name">{h.label}</span>
                {h.isDefault && <Badge tone="brand">default</Badge>}
              </div>
              <div className="lm-hcard__desc">{h.desc}</div>
              <div className="lm-hcard__foot">
                <span className="lm-hcard__file">{h.file}</span>
                <span className="lm-hcard__agents">{Icon('users', 12)}{h.agents} agent{h.agents > 1 ? 's' : ''}</span>
              </div>
            </button>
          ))}
          <button className="lm-hcard lm-hcard--more" onClick={onOpenHarnesses}>
            {Icon('layers', 20)}
            <span className="lm-hcard__name">Browse all harnesses</span>
            <span className="lm-hcard__desc">Load more from the server registry</span>
          </button>
        </div>
      </div>
    );
  }

  // ── Harnesses panel (modal) — server registry ────────────
  function HarnessesPanel({ open, harnesses, onToggleLoad, onUse, onClose }) {
    refreshIcons();
    if (!open) return null;
    return (
      <div className="lm-modal" onClick={onClose}>
        <div className="lm-modal__card" onClick={(e) => e.stopPropagation()}>
          <div className="lm-modal__head">
            <div className="lm-modal__title">{Icon('layers', 17)}<span>Harnesses on server</span></div>
            <Badge tone="success" dot>:8000 online</Badge>
            <IconButton variant="plain" aria-label="Close" onClick={onClose} className="lm-modal__x">{Icon('x', 17)}</IconButton>
          </div>
          <div className="lm-modal__sub">Python harness modules discovered on the server. Load one into memory to use it in a session.</div>
          <div className="lm-modal__body">
            {harnesses.map((h) => (
              <div key={h.id} className={`lm-hrow ${h.loaded ? 'lm-hrow--loaded' : ''}`}>
                <span className="lm-hrow__dot" style={{ background: HARNESS_DOT[h.id] }} />
                <div className="lm-hrow__main">
                  <div className="lm-hrow__name">{h.label}{h.isDefault && <Badge tone="brand">default</Badge>}</div>
                  <div className="lm-hrow__meta"><span className="lm-hrow__file">{h.file}</span> · {h.agents} agent{h.agents > 1 ? 's' : ''}</div>
                </div>
                {h.loaded
                  ? <Badge tone="success" dot>loaded</Badge>
                  : <span className="lm-hrow__avail">available</span>}
                <Switch checked={h.loaded} accent="agent" onChange={() => onToggleLoad(h.id)} />
              </div>
            ))}
          </div>
          <div className="lm-modal__foot">
            <span className="lm-dim" style={{ fontFamily: 'var(--font-mono)', fontSize: 11 }}>{harnesses.filter((h) => h.loaded).length} of {harnesses.length} loaded</span>
            <Button variant="secondary" size="sm" onClick={onClose}>Done</Button>
          </div>
        </div>
      </div>
    );
  }

  // ── Settings modal — Ollama provider ─────────────────────
  function SettingsModal({ open, provider, models, onClose, onSaveUrl }) {
    const [url, setUrl] = React.useState(provider.url);
    React.useEffect(() => { if (open) setUrl(provider.url); }, [open, provider.url]);
    refreshIcons();
    if (!open) return null;
    return (
      <div className="lm-modal" onClick={onClose}>
        <div className="lm-modal__card" onClick={(e) => e.stopPropagation()}>
          <div className="lm-modal__head">
            <div className="lm-modal__title">{Icon('settings', 17)}<span>Model provider</span></div>
            <IconButton variant="plain" aria-label="Close" onClick={onClose} className="lm-modal__x">{Icon('x', 17)}</IconButton>
          </div>
          <div className="lm-modal__sub">LMChat runs open-source models through Ollama. The default provider stays loaded; point it at any reachable Ollama URL.</div>
          <div className="lm-modal__body">
            <div className="lm-provider">
              <div className="lm-provider__row">
                <span className="lm-provider__name">{Icon('server', 14)} Ollama (local)</span>
                <Badge tone={provider.connected ? 'success' : 'danger'} dot>{provider.connected ? 'connected' : 'offline'}</Badge>
                <Badge tone="brand">default</Badge>
              </div>
              <label className="lm-provider__label">Base URL</label>
              <div className="lm-provider__url">
                <Input mono value={url} onChange={(e) => setUrl(e.target.value)} prefix={Icon('link', 15)} />
                <Button variant="primary" size="md" onClick={() => onSaveUrl(url)}>Save</Button>
              </div>
              <div className="lm-provider__models">
                <span className="lm-provider__mlabel">Models available at this URL</span>
                <div className="lm-provider__tags">
                  {models.map((m) => <Tag key={m} icon={Icon('cpu', 12)}>{m}</Tag>)}
                </div>
              </div>
            </div>
          </div>
          <div className="lm-modal__foot">
            <span className="lm-dim" style={{ fontFamily: 'var(--font-mono)', fontSize: 11 }}>+ add another provider URL</span>
            <Button variant="secondary" size="sm" onClick={onClose}>Done</Button>
          </div>
        </div>
      </div>
    );
  }

  window.LMKit = Object.assign(window.LMKit || {}, { HarnessSelectScreen, HarnessesPanel, SettingsModal });
})();
