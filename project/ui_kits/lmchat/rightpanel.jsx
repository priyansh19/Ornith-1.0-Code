/* LMChat UI kit — persistent right sidebar: Inspector · Thinking · Critiques.
   This is the default home for the agent's steps, thought process, and critiques. */
(function () {
  const DS = window.LMChatDesignSystem_bc9736;
  const { IconButton, Tabs, ThinkingStep, CritiqueCard, Badge, Tooltip } = DS;
  const { Icon, refreshIcons } = window.LMKit;

  const TRACE = [
    { kind: 'thought', agent: 'Harness', content: 'User wants the login race condition fixed. Read the auth code before editing.' },
    { kind: 'tool', agent: 'Harness', content: 'read_file({ path: "src/auth/session.py" })' },
    { kind: 'observation', agent: 'Harness', content: 'Token refresh isn\u2019t mutex-guarded \u2014 two requests can refresh in parallel.' },
    { kind: 'thought', agent: 'Harness', content: 'Guard the refresh with an async mutex; late callers await the in-flight promise.' },
    { kind: 'tool', agent: 'Harness', content: 'edit_file({ path: "src/auth/session.py", +12, -3 })' },
    { kind: 'observation', agent: 'Critic \u00b7 L4', content: 'Patch is scoped and consistent. pytest auth suite passes.' },
  ];

  const CRITIQUES = [
    { severity: 'blocker', category: 'fact', id: 'c-017', round: 1, message: 'Recommendation cites a source URL that 404s \u2014 unverifiable.', suggestedAction: 'spawn_scout({ mission: "verify mutex pattern", sources: ["web"] })' },
    { severity: 'major', category: 'gap', id: 'c-042', round: 1, message: 'No test covers two concurrent refreshes racing.', suggestedAction: 'add_test({ name: "test_refresh_race", file: "tests/auth" })' },
    { severity: 'minor', category: 'logic', id: 'c-051', round: 2, message: 'Comment says "lock acquired" but logs before the await.' },
    { severity: 'minor', category: 'efficiency', id: 'c-055', round: 2, message: 'Two reads of session.py \u2014 cache the first.', resolved: true },
    { severity: 'info', category: 'scope', id: 'c-060', round: 2, message: 'Refresh-token rotation out of scope \u2014 noted, not actioned.' },
  ];

  function RightPanel({ open, tab, setTab, onClose, insp, harness, model, provider, project }) {
    refreshIcons();
    const openCount = CRITIQUES.filter((c) => !c.resolved && (c.severity === 'blocker' || c.severity === 'major')).length;
    const InspectorBody = window.LMKit.InspectorBody;
    return (
      <aside className={`lm-right ${open ? 'lm-right--open' : ''}`} aria-hidden={!open}>
        <div className="lm-right__head">
          <span className="lm-right__title">{Icon('panel-right', 15)} Trace</span>
          <Tooltip label="Hide panel" side="bottom">
            <IconButton variant="plain" aria-label="Hide panel" onClick={onClose}>{Icon('panel-right-close', 16)}</IconButton>
          </Tooltip>
        </div>
        <div className="lm-right__tabs">
          <Tabs accent="agent" value={tab} onChange={setTab}
            tabs={[
              { value: 'inspector', label: 'Inspector' },
              { value: 'thinking', label: 'Thinking' },
              { value: 'critiques', label: 'Critiques', count: openCount },
            ]} />
        </div>
        <div className="lm-right__body">
          {tab === 'inspector' && InspectorBody &&
            <InspectorBody state={insp} harness={harness} model={model} provider={provider} project={project} />}

          {tab === 'thinking' && (
            harness ? (
              <div className="lm-trace">
                {TRACE.slice(0, harness.agents <= 1 ? 6 : 6).map((s, i) => <ThinkingStep key={i} {...s} last={i === TRACE.length - 1} />)}
              </div>
            ) : <div className="lm-dim lm-right__empty">Pick a harness to see its reasoning trace.</div>
          )}

          {tab === 'critiques' && (
            harness && harness.agents > 1 ? (
              <div className="lm-critlist">
                <div className="lm-critlist__head">
                  <Badge severity="blocker" /><Badge severity="major" /><Badge severity="minor" />
                  <span className="lm-dim" style={{ marginLeft: 'auto', fontFamily: 'var(--font-mono)', fontSize: 11 }}>L2\u2013L7 \u00b7 2 rounds</span>
                </div>
                {CRITIQUES.map((c, i) => <CritiqueCard key={i} {...c} />)}
              </div>
            ) : <div className="lm-dim lm-right__empty">{harness ? 'This harness runs a single agent \u2014 no critic layers.' : 'Pick a multi-agent harness to see critiques.'}</div>
          )}
        </div>
      </aside>
    );
  }

  window.LMKit = Object.assign(window.LMKit || {}, { RightPanel, TRACE, CRITIQUES });
})();
