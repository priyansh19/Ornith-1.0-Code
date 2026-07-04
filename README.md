# LMChat

Local agentic coding chat — pick an **agent harness** (a Python module you write/import under `agent/`), then message your **local Ollama models** through it. Each chat session keeps its own harness; the right sidebar surfaces the agent's thinking trace and the critic ledger; sessions are organized into folders.

This is a faithful implementation of the **LMChat** design (exported from Claude Design) as a **Next.js (App Router) + TypeScript** app. The UI and click-through interactions are real; the model/harness backends are **mocked** (seed data + simulated replies) — no Ollama or harness server is required to run it.

## Quickstart

```bash
npm install
npm run dev
# open http://localhost:3000
```

| Script | What it does |
| --- | --- |
| `npm run dev` | Start the dev server (http://localhost:3000) |
| `npm run build` | Production build |
| `npm run start` | Serve the production build |
| `npm run lint` | Lint |
| `npm run test:e2e` | Run the Playwright end-to-end suite |
| `npm run test:e2e:ui` | Run the E2E suite in Playwright's UI mode |

## What's in the UI

- **Folder nav** — chat sessions grouped into collapsible folders (+ a Recent group); new-session / new-folder actions.
- **New-session pre-flight** — choose a working directory and an agent harness before the first prompt; a default harness is pre-selected.
- **Per-session harness** — each session binds to its own harness; switching sessions loads its harness + directory.
- **Harnesses server panel** — the registry of Python harness modules (`agent/p1`–`p5`), with load/unload toggles (`:8000` online).
- **Ollama provider settings** — configure the base URL; the default provider stays loaded.
- **Inline tool activity** — assistant turns stream a collapsible tool-call row (file edits / reads / shell runs).
- **Right sidebar** — persistent **Inspector / Thinking / Critiques** tabs (session metadata, the ReAct trace, and the L2–L7 critique ledger).

## Testing

End-to-end tests live in [`e2e/`](e2e/) and run with **Playwright** (`playwright.config.ts`). The suite drives the real app in Chromium against a production build and covers the full surface:

- initial render (chrome, folder nav, ready chat, inspector)
- conversation flow — send via suggestion + Enter, the inline tool row expanding to its steps, the assistant reply, the auto-switch to the Thinking trace, and clearing a session
- right panel — the Critiques ledger for multi-agent harnesses, the "no critic layers" state for single-agent ones, and hide/reopen
- sessions & folders — per-session harness binding, folder collapse/expand, creating a folder
- the new-session pre-flight (directory + harness pick)
- the harnesses server panel (load/unload)
- Ollama provider settings (save URL → reflected in the inspector; reset on reopen)

```bash
npm run test:e2e
```

Playwright manages the web server itself (`next build` + `next start`). Chromium is expected to be available locally; if it isn't, run `npx playwright install chromium` once.

## Project structure

```
app/
  layout.tsx          root layout (loads webfonts + global CSS)
  page.tsx            renders <LMChatApp/>
  globals.css         imports the token + component + layout CSS closure
  styles/
    tokens/           colors · typography · spacing · effects · base (ported verbatim)
    components.css    all design-system component CSS
    lmchat.css        the LMChat shell/layout CSS
components/
  ds/                 20 design-system primitives (Button, Card, MessageBubble,
                      ToolCall, ThinkingStep, CritiqueCard, Tabs, …) + Icon
  lmchat/             the product kit (TopBar, Composer, Sidebar, RightPanel,
                      HarnessSelectScreen, HarnessesPanel, SettingsModal,
                      InspectorBody, LMChatApp) + data.ts (seed/faked data)
```

## Implementation notes

- **Design tokens** (`app/styles/tokens/*`) are ported verbatim from `project/tokens/*` — exact colors, type scale, spacing, radii, and motion. The dark near-black canvas, warm-orange brand, and violet agent/harness accent all come straight from the design.
- **Icons** use `lucide-react` (the same icon set the prototype loaded from the Lucide CDN), wrapped by `components/ds/Icon.tsx`.
- **Webfonts** (Space Grotesk / IBM Plex Sans / JetBrains Mono) load from Google Fonts via a `<link>` in `app/layout.tsx`; if offline, the token fallbacks (`system-ui`, `ui-monospace`) apply.
- **Faked data** lives in `components/lmchat/data.ts` (harness registry, providers, folders, sessions, trace, critiques). To make it real, wire the Ollama provider URL to a real Ollama instance and the harnesses panel to a real harness server, then replace the simulated reply in `LMChatApp.send()` with a streamed call.

The design source this was built from lives in [`project/`](project/) (tokens, components, the `ui_kits/lmchat` prototype) and the design conversation is in [`chats/`](chats/).

---

# CODING AGENTS: READ THIS FIRST

This is a **handoff bundle** from Claude Design (claude.ai/design).

A user mocked up designs in HTML/CSS/JS using an AI design tool, then exported this bundle so a coding agent can implement the designs for real.

## What you should do — IMPORTANT

**Read the chat transcripts first.** There are 1 chat transcript(s) in `chats/`. The transcripts show the full back-and-forth between the user and the design assistant — they tell you **what the user actually wants** and **where they landed** after iterating. Don't skip them. The final HTML files are the output, but the chat is where the intent lives.

**Read `project/ui_kits/lmchat/index.html` in full.** The user had this file open when they triggered the handoff, so it's almost certainly the primary design they want built. Read it top to bottom — don't skim. Then **follow its imports**: open every file it pulls in (shared components, CSS, scripts) so you understand how the pieces fit together before you start implementing.

**If anything is ambiguous, ask the user to confirm before you start implementing.** It's much cheaper to clarify scope up front than to build the wrong thing.

## About the design files

The design medium is **HTML/CSS/JS** — these are prototypes, not production code. Your job is to **recreate them pixel-perfectly** in whatever technology makes sense for the target codebase (React, Vue, native, whatever fits). Match the visual output; don't copy the prototype's internal structure unless it happens to fit.

**Don't render these files in a browser or take screenshots unless the user asks you to.** Everything you need — dimensions, colors, layout rules — is spelled out in the source. Read the HTML and CSS directly; a screenshot won't tell you anything they don't.

## Bundle contents

- `README.md` — this file
- `chats/` — conversation transcripts (read these!)
- `project/` — the `LMChat Design System` project files (HTML prototypes, assets, components)
