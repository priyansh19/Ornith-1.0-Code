# LMChat — UI kit

Interactive recreation of the LMChat product: pick an **agent harness** (a Python module under `agent/`) and message your local model through it. No direct/raw-model mode. Composes the design-system primitives from the compiled bundle (`window.LMChatDesignSystem_bc9736`).

## Run / preview
Open `index.html`. It loads React + Babel + Lucide + `_ds_bundle.js`, then mounts the app from the JSX parts.

## Files
- `index.html` — shell layout CSS + script loader + mount. Tagged `@dsCard` (LMChat App) and `@startingPoint`.
- `parts.jsx` — data (harness registry, providers, folders, sessions) + `TopBar`, `Composer`, `InspectorBody`.
- `sidebar.jsx` — left nav: chat sessions in collapsible folders + a Recent group.
- `screens.jsx` — `HarnessSelectScreen` (new-session pre-flight: directory + harness), `HarnessesPanel` (server registry, load/unload), `SettingsModal` (Ollama provider URL).
- `rightpanel.jsx` — persistent right sidebar with Inspector / Thinking / Critiques tabs + seed trace & critique ledger.
- `app.jsx` — `App` shell: per-session state, pre-flight, faked replies + inline tool activity, panel wiring.

## What it demonstrates (interactive)
- **Folder nav** — sessions grouped into collapsible folders (+ a Recent group); new session / new folder actions.
- **New-session pre-flight** — choose a working directory and an agent harness before the first prompt; a default harness is pre-selected.
- **Inline tool activity** — assistant turns stream a collapsible `ToolCall` row (file edits / reads / shell runs).
- **Right sidebar** — persistent Inspector / Thinking / Critiques tabs; the default home for steps, thought process, and critiques.
- **Harnesses panel** — the server registry; toggle harnesses loaded/available (`agent/p1`–`p5`).
- **Settings** — configure the Ollama provider URL; the default provider stays loaded.
- Per-session harness binding; simple harnesses run one ReAct loop, complex ones fan out agents.

## Surfaces faithful to the source
Top bar, mode toggle, model picker, chat panel, composer, inspector, and the Phase-6 Thinking & Critique panel described in the repo docs. No invented product areas.
