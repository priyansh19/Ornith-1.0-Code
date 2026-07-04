/* LMChat UI kit — left nav: chat sessions organized into folders. */
(function () {
  const DS = window.LMChatDesignSystem_bc9736;
  const { Button, IconButton, Tooltip, Avatar } = DS;
  const { Icon, refreshIcons, HARNESS_DOT } = window.LMKit;

  function SessionRow({ s, active, onSelect }) {
    return (
      <button className={`lm-ses ${active ? 'lm-ses--active' : ''}`} onClick={() => onSelect(s.id)}>
        <span className="lm-ses__dot" style={{ background: s.harnessId ? HARNESS_DOT[s.harnessId] : 'var(--faint)' }} />
        <span className="lm-ses__title">{s.title}</span>
        <span className="lm-ses__when">{s.when}</span>
      </button>
    );
  }

  function Sidebar({ folders, sessions, active, onSelect, onNew, onNewFolder, openFolders, toggleFolder, onOpenSettings, provider }) {
    refreshIcons();
    const loose = sessions.filter((s) => !s.folderId);
    return (
      <nav className="lm-sidebar">
        <div className="lm-sidebar__top">
          <Button variant="primary" block iconLeft={Icon('plus', 15)} onClick={onNew}>New session</Button>
          <Tooltip label="New folder" side="bottom">
            <IconButton variant="outlined" aria-label="New folder" onClick={onNewFolder}>{Icon('folder-plus', 16)}</IconButton>
          </Tooltip>
        </div>

        <div className="lm-sidebar__list">
          {folders.map((f) => {
            const items = sessions.filter((s) => s.folderId === f.id);
            const open = openFolders[f.id] !== false;
            return (
              <div className="lm-folder" key={f.id}>
                <button className="lm-folder__head" onClick={() => toggleFolder(f.id)}>
                  <span className={`lm-folder__chev ${open ? 'lm-folder__chev--open' : ''}`}>{Icon('chevron-right', 13)}</span>
                  {Icon(open ? 'folder-open' : 'folder', 14)}
                  <span className="lm-folder__name">{f.name}</span>
                  <span className="lm-folder__count">{items.length}</span>
                </button>
                {open && (
                  <div className="lm-folder__items">
                    {items.length === 0
                      ? <div className="lm-folder__empty">No chats</div>
                      : items.map((s) => <SessionRow key={s.id} s={s} active={active === s.id} onSelect={onSelect} />)}
                  </div>
                )}
              </div>
            );
          })}

          {loose.length > 0 && (
            <div className="lm-sesgroup">
              <div className="lm-sesgroup__label">Recent</div>
              {loose.map((s) => <SessionRow key={s.id} s={s} active={active === s.id} onSelect={onSelect} />)}
            </div>
          )}
        </div>

        <div className="lm-sidebar__foot">
          <Avatar role="user" size="sm" />
          <div className="lm-sidebar__user">
            <span className="lm-sidebar__name">priyansh</span>
            <span className="lm-sidebar__host">{provider.connected ? 'ollama · connected' : 'ollama · offline'}</span>
          </div>
          <Tooltip label="Settings · model provider" side="top">
            <IconButton variant="plain" aria-label="Settings" onClick={onOpenSettings}>{Icon('settings', 16)}</IconButton>
          </Tooltip>
        </div>
      </nav>
    );
  }

  window.LMKit = Object.assign(window.LMKit || {}, { Sidebar });
})();
