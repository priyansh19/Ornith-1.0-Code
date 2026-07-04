/* LMChat UI kit — app shell.
   Coding-agent chat: choose a working directory + harness before the first prompt,
   watch inline tool activity, and read thinking/critiques in the right sidebar.
   Per-session harness · folders · server harness registry · Ollama provider. */
(function () {
  const DS = window.LMChatDesignSystem_bc9736;
  const { MessageBubble, ToolCall } = DS;
  const K = window.LMKit;
  const { Icon, refreshIcons, harnessById } = K;

  const SUGGEST = [
    'Fix the login race condition in session.py',
    'Add a test for concurrent token refresh',
    'Refactor the scout dispatch loop',
  ];
  const replyFor = (h) => h.agents <= 1
    ? 'Done. The token-refresh path wasn\u2019t mutex-guarded \u2014 I wrapped it in an async lock so late callers await the in-flight refresh instead of starting their own. Auth tests pass.'
    : 'Routed through the harness \u2014 ' + h.agents + ' agents collaborated. Scouts gathered references, the Critic ran L2\u2013L7 across 2 rounds, and the Synthesizer wrote the patch from the approved ledger. Auth tests pass; see the Critiques tab for the open items.';
  const toolItems = (proj) => [
    { kind: 'read', text: 'src/auth/session.py' },
    { kind: 'edit', text: 'src/auth/session.py', diff: [12, 3] },
    { kind: 'run', text: 'pytest tests/auth -q' },
  ];

  const SEED_PROJECTS = { s1: '~/projects/mach2-harness', s2: '~/projects/mach2-harness', s3: '~/work/design-system', s4: '~/projects/mach2-harness', s5: '~/projects/mach2-harness' };
  let uid = 100;

  function App() {
    const [harnesses, setHarnesses] = React.useState(K.HARNESSES.map((h) => ({ ...h })));
    const [folders, setFolders] = React.useState(K.FOLDERS.map((f) => ({ ...f })));
    const [sessions, setSessions] = React.useState(K.SEED_SESSIONS.map((s) => ({ ...s, project: SEED_PROJECTS[s.id], messages: [], insp: { status: 'idle' } })));
    const [activeId, setActiveId] = React.useState('s1');
    const [model, setModel] = React.useState('ornith:9b');
    const [provider, setProvider] = React.useState({ ...K.DEFAULT_PROVIDER });
    const [openFolders, setOpenFolders] = React.useState({});
    const [input, setInput] = React.useState('');
    const [dir, setDir] = React.useState('~/projects/mach2-harness');
    const [loading, setLoading] = React.useState(false);
    const [rightOpen, setRightOpen] = React.useState(true);
    const [rightTab, setRightTab] = React.useState('inspector');
    const [harnessesOpen, setHarnessesOpen] = React.useState(false);
    const [settingsOpen, setSettingsOpen] = React.useState(false);
    const scrollRef = React.useRef(null);

    React.useEffect(() => { refreshIcons(); });
    const active = sessions.find((s) => s.id === activeId) || sessions[0];
    const ready = active && active.harnessId && active.project;
    const harness = ready ? harnessById(harnesses, active.harnessId) : null;
    React.useEffect(() => { if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight; }, [active && active.messages.length, loading]);

    const patchActive = (patch) => setSessions((p) => p.map((s) => s.id === activeId ? { ...s, ...(typeof patch === 'function' ? patch(s) : patch) } : s));

    function newSession() {
      const id = 'n' + (uid++);
      setSessions((p) => [{ id, title: 'New session', harnessId: null, project: null, folderId: null, when: 'now', messages: [], insp: { status: 'idle' } }, ...p]);
      setActiveId(id); setInput(''); setDir('~/projects/mach2-harness');
    }
    function newFolder() { const id = 'd' + (uid++); setFolders((p) => [...p, { id, name: 'New folder' }]); }
    function startSession(hid) { patchActive({ harnessId: hid, project: dir.trim() || '~/projects' }); setRightTab('inspector'); }
    function changeHarness(hid) { patchActive({ harnessId: hid, messages: [], insp: { status: 'idle' } }); }
    function clearSession() { patchActive({ messages: [], insp: { status: 'idle' } }); setInput(''); }
    function toggleFolder(fid) { setOpenFolders((p) => ({ ...p, [fid]: p[fid] === false ? true : false })); }
    function toggleLoad(hid) { setHarnesses((p) => p.map((h) => h.id === hid ? { ...h, loaded: !h.loaded } : h)); }
    function saveUrl(url) { setProvider((p) => ({ ...p, url })); setSettingsOpen(false); }
    function toggleRight() { setRightOpen((o) => { const n = !o; if (n) setRightTab('thinking'); return n; }); }

    function send(text) {
      const body = (text ?? input).trim();
      if (!body || loading || !harness) return;
      const h = harness;
      setInput('');
      patchActive((s) => ({
        title: s.title === 'New session' ? body.slice(0, 38) : s.title,
        messages: [...s.messages, { role: 'user', content: body }, { type: 'tool', running: true }, { role: 'assistant', content: '', pending: true }],
        insp: { status: 'running' },
      }));
      setLoading(true); setRightOpen(true); setRightTab('thinking');
      const reply = replyFor(h);
      setTimeout(() => {
        patchActive((s) => {
          const m = [...s.messages];
          m[m.length - 2] = { type: 'tool', running: false, summary: 'Edited session.py, read a file, ran a tool', items: toolItems(s.project) };
          m[m.length - 1] = { role: 'assistant', content: reply };
          return { messages: m, insp: { status: 'done', session: 'a1b2c3d4…', agents: h.agents, critiques: h.agents > 1 ? K.CRITIQUES.length : 0, elapsed: h.agents > 1 ? '8.4s' : '2.1s' } };
        });
        setLoading(false);
      }, h.agents > 1 ? 1500 : 900);
    }

    const openBlockers = K.CRITIQUES.filter((c) => !c.resolved && (c.severity === 'blocker' || c.severity === 'major')).length;
    const insp = active ? active.insp : { status: 'idle' };

    return (
      <div className="lm-app">
        <K.TopBar session={active} project={active && active.project} harness={harness} harnesses={harnesses} onChangeHarness={changeHarness}
          model={model} setModel={setModel} onOpenHarnesses={() => setHarnessesOpen(true)}
          onClear={clearSession} onToggleRight={toggleRight} rightOpen={rightOpen} openBlockers={openBlockers} serverUp={true} />
        <div className="lm-body">
          <K.Sidebar folders={folders} sessions={sessions} active={activeId} onSelect={setActiveId}
            onNew={newSession} onNewFolder={newFolder} openFolders={openFolders} toggleFolder={toggleFolder}
            onOpenSettings={() => setSettingsOpen(true)} provider={provider} />

          <main className="lm-main">
            {!ready ? (
              <K.HarnessSelectScreen harnesses={harnesses} dir={dir} setDir={setDir} onPick={startSession} onOpenHarnesses={() => setHarnessesOpen(true)} />
            ) : (
              <React.Fragment>
                <div className="lm-chat" ref={scrollRef}>
                  {active.messages.length === 0 ? (
                    <div className="lm-empty">
                      <span className="lm-empty__mark">M2</span>
                      <div className="lm-empty__h">{harness.label} harness ready.</div>
                      <div className="lm-empty__p">Working in <span className="lm-empty__file">{active.project}</span> via <span className="lm-empty__file">{harness.file}</span>. Try:</div>
                      <div className="lm-empty__chips">
                        {SUGGEST.map((s) => <button key={s} className="lm-suggest" onClick={() => send(s)}>{Icon('sparkles', 14)}{s}</button>)}
                      </div>
                    </div>
                  ) : (
                    <div className="lm-chat__list">
                      {active.messages.map((m, i) => (
                        m.type === 'tool'
                          ? <ToolCall key={i} running={m.running} summary={m.running ? 'Working…' : m.summary} items={m.items || []} />
                          : <MessageBubble key={i} role={m.role} loading={m.pending} name={m.role === 'assistant' ? harness.id : undefined}>{m.content}</MessageBubble>
                      ))}
                    </div>
                  )}
                </div>
                <K.Composer value={input} onChange={setInput} onSend={() => send()} loading={loading} harness={harness} />
              </React.Fragment>
            )}
          </main>

          <K.RightPanel open={rightOpen} tab={rightTab} setTab={setRightTab} onClose={() => setRightOpen(false)}
            insp={insp} harness={harness} model={model} provider={provider} project={active && active.project} />
        </div>

        <K.HarnessesPanel open={harnessesOpen} harnesses={harnesses} onToggleLoad={toggleLoad} onClose={() => setHarnessesOpen(false)} />
        <K.SettingsModal open={settingsOpen} provider={provider} models={K.MODELS} onClose={() => setSettingsOpen(false)} onSaveUrl={saveUrl} />
      </div>
    );
  }

  window.LMKit = Object.assign(window.LMKit || {}, { App });
})();
