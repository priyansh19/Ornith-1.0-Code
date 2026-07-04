/* LMChat UI kit — seed data + top bar / composer / inspector.
   LMChat is harness-only: every session is driven by an agent harness (a Python
   module under agent/) that talks to a local model via Ollama. Each session keeps
   its own harness; harnesses are loaded on the server, then chosen per session. */
(function () {
  const DS = window.LMChatDesignSystem_bc9736;
  const { Button, IconButton, Select, KeyValueRow, Card, Badge, Tag, Spinner, Avatar, Tooltip } = DS;

  const Icon = (name, size = 16) => React.createElement('i', { 'data-lucide': name, style: { width: size, height: size } });
  function refreshIcons() { requestAnimationFrame(() => window.lucide && window.lucide.createIcons()); }

  // ── Harness registry (what the server knows about) ──
  // loaded: in memory on the harness server (:8000) and selectable for a session.
  const HARNESSES = [
    { id: 'agent-base', label: 'ReAct Agent',    file: 'agent/p1-agent-base',      desc: 'Single ReAct loop — think → tool → observe', agents: 1, loaded: true, isDefault: true },
    { id: 'harness',    label: 'Orchestrator',   file: 'agent/p2-harness',         desc: 'Central harness routes between agents',       agents: 3, loaded: true },
    { id: 'research',   label: 'Research + Critic', file: 'agent/p4-specialization', desc: 'Scouts → L2–L7 critic → synthesizer',        agents: 6, loaded: true },
    { id: 'a2a',        label: 'Agent-to-Agent', file: 'agent/p3-agent-to-agent',  desc: 'Agents call other agents as tools',           agents: 4, loaded: false },
    { id: 'memory',     label: 'Memory Harness', file: 'agent/p5-memory',          desc: 'Shared + per-agent memory layers',            agents: 6, loaded: false },
  ];
  const HARNESS_DOT = { 'agent-base': 'var(--cyan)', harness: 'var(--brand)', a2a: 'var(--amber)', research: 'var(--agent)', memory: 'var(--green)' };
  const harnessById = (list, id) => (list || HARNESSES).find((h) => h.id === id) || null;

  // ── Model providers (Ollama; URL configurable in Settings) ──
  const DEFAULT_PROVIDER = { id: 'ollama-local', name: 'Ollama (local)', url: 'http://localhost:11434', isDefault: true, connected: true };
  const MODELS = ['ornith:9b', 'gemma4:latest', 'qwen3:8b', 'nomic-embed-text'];

  // ── Folders + sessions (left nav) ──
  const FOLDERS = [
    { id: 'f1', name: 'Auth bugs' },
    { id: 'f2', name: 'Design research' },
  ];
  const SEED_SESSIONS = [
    { id: 's1', title: 'Login race condition fix', harnessId: 'research',  folderId: 'f1', when: '2m' },
    { id: 's2', title: 'Session token refresh',    harnessId: 'harness',   folderId: 'f1', when: '1h' },
    { id: 's3', title: 'Dark-mode dashboard',      harnessId: 'research',  folderId: 'f2', when: '3h' },
    { id: 's4', title: 'Scout dispatch refactor',  harnessId: 'harness',   folderId: null, when: 'Tue' },
    { id: 's5', title: 'Critique ledger explained', harnessId: 'agent-base', folderId: null, when: 'Mon' },
  ];

  // ── Top bar ──────────────────────────────────────────────
  function TopBar({ session, project, harness, harnesses, onChangeHarness, model, setModel, onOpenHarnesses, onClear, onToggleRight, rightOpen, openBlockers, serverUp }) {
    refreshIcons();
    const loaded = harnesses.filter((h) => h.loaded);
    return (
      <header className="lm-topbar">
        <div className="lm-topbar__brand">
          <span className="lm-mark">M2</span>
          <span className="lm-wordmark">LMChat</span>
        </div>

        <div className="lm-picker">
          <span className="lm-picker__label">{Icon('git-branch', 13)} harness</span>
          <div className="lm-picker__select lm-picker__select--harness">
            {harness ? (
              <Select value={harness.id} onChange={onChangeHarness}
                options={loaded.map((h) => ({ value: h.id, label: h.label }))} />
            ) : (
              <div className="lm-picker__empty">Not selected</div>
            )}
          </div>
          <Tooltip label="Browse harnesses on server" side="bottom">
            <IconButton variant="outlined" aria-label="Harnesses" onClick={onOpenHarnesses}>{Icon('layers', 16)}</IconButton>
          </Tooltip>
        </div>

        <div className="lm-topbar__right">
          <div className="lm-picker">
            <span className="lm-picker__label">{Icon('cpu', 13)} model</span>
            <div className="lm-picker__select">
              <Select mono value={model} onChange={setModel} options={MODELS.filter((m) => !m.includes('embed')).map((m) => ({ value: m, label: m }))} />
            </div>
          </div>

          <Tooltip label={serverUp ? 'Harness server running · uvicorn :8000' : 'Server stopped'} side="bottom">
            <span className={`lm-server ${serverUp ? 'lm-server--up' : ''}`}><span className="lm-server__dot" />:8000</span>
          </Tooltip>

          <Button variant={rightOpen ? 'agent' : 'secondary'} size="sm" iconLeft={Icon('panel-right', 14)} onClick={onToggleRight}>
            Thinking &amp; Critiques{openBlockers > 0 && <span className="lm-trigger__count">{openBlockers}</span>}
          </Button>

          <Tooltip label="Clear session" side="bottom">
            <IconButton variant="plain" aria-label="Clear session" onClick={onClear}>{Icon('eraser', 16)}</IconButton>
          </Tooltip>
        </div>
      </header>
    );
  }

  // ── Composer ─────────────────────────────────────────────
  function Composer({ value, onChange, onSend, loading, harness }) {
    refreshIcons();
    const placeholder = loading ? 'Harness is working…' : `Message the ${harness.label} harness — press Enter to send…`;
    return (
      <div className="lm-composer">
        <div className="lm-composer__shell">
          <Tooltip label="Attach file"><IconButton variant="plain" aria-label="Attach">{Icon('paperclip', 17)}</IconButton></Tooltip>
          <textarea className="lm-composer__input" rows={1} value={value} disabled={loading} placeholder={placeholder}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onSend(); } }} />
          <div className="lm-composer__send">
            <Button variant="primary" size="sm" disabled={loading || !value.trim()} onClick={onSend} iconRight={loading ? null : Icon('arrow-up', 15)}>
              {loading ? <Spinner size={14} accent="current" /> : 'Send'}
            </Button>
          </div>
        </div>
        <div className="lm-composer__hint">
          <span>{harness.file} <span className="lm-arrow">→</span> local model</span>
          <span className="lm-kbd">⏎ send &nbsp;·&nbsp; ⇧⏎ newline</span>
        </div>
      </div>
    );
  }

  // ── Inspector ────────────────────────────────────────────
  function InspectorBody({ state, harness, model, provider, project }) {
    return (
      <div className="lm-insp">
        <Card title="Session" headerActions={<Badge tone="agent" dot>{harness ? harness.id : 'none'}</Badge>}>
          {project && <KeyValueRow label="Directory" value={project} tone="muted" />}
          {harness ? <KeyValueRow label="Harness"><Tag>{harness.label}</Tag></KeyValueRow> : <KeyValueRow label="Harness" value="— pick one —" tone="muted" />}
          {harness && <KeyValueRow label="Module" value={harness.file} tone="agent" />}
          <KeyValueRow label="Model"><Tag>{model}</Tag></KeyValueRow>
          <KeyValueRow label="Provider" value={provider.url} tone="muted" />
          {state.status === 'idle' && <div className="lm-dim" style={{ marginTop: 10 }}>Waiting for input…</div>}
          {state.status === 'running' && <div className="lm-dim" style={{ marginTop: 10, display: 'flex', gap: 8, alignItems: 'center' }}><Spinner size={13} accent="agent" />Running {harness.label}…</div>}
          {state.status === 'done' && (
            <React.Fragment>
              <div style={{ height: 8 }} />
              <KeyValueRow label="Session id" value={state.session} divided />
              <KeyValueRow label="Agents" value={state.agents} />
              <KeyValueRow label="Critiques" value={state.critiques} />
              <KeyValueRow label="Time" value={state.elapsed} />
              <div className="lm-dim" style={{ marginTop: 10 }}>Full trace → localhost:3000</div>
            </React.Fragment>
          )}
        </Card>

        {state.status === 'done' && harness && harness.agents > 1 && (
          <Card title="Agents" style={{ marginTop: 14 }}>
            <div className="lm-agentlist">
              {[['harness', 'Harness', 'online'], ['research', 'Research · 3 scouts', 'online'], ['critic', 'Critic · L2–L7', 'busy'], ['synth', 'Synthesizer', 'off']]
                .slice(0, harness.agents >= 6 ? 4 : harness.agents).map(([role, label, st]) => (
                <div className="lm-agentlist__row" key={role}><Avatar role={role} size="sm" status={st} /><span className="lm-agentlist__name">{label}</span></div>
              ))}
            </div>
          </Card>
        )}
      </div>
    );
  }

  window.LMKit = Object.assign(window.LMKit || {}, {
    Icon, refreshIcons, HARNESSES, HARNESS_DOT, harnessById, MODELS, DEFAULT_PROVIDER, FOLDERS, SEED_SESSIONS,
    TopBar, Composer, InspectorBody,
  });
})();
