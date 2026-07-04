# LMChat Design System

A dark, terminal-grade design system for **LMChat** — an agentic **coding** chat that drives your **local model through pluggable agent harnesses**. You choose a working directory and a harness once, up front; the harness then reads &amp; writes code in that directory while you chat, showing inline tool activity and an opt-in thinking/critique trace. Each harness is a Python module (under `agent/`); harnesses are loaded on a server and chosen per session. They range from a single ReAct loop to a full multi-agent pipeline (Research → Critic → Synthesizer).

The aesthetic is a developer tool, not a marketing site: near-black canvas, monospace data, a warm-orange brand accent from the M2 mark, and a violet accent that signifies the agent/harness layer.

---

## Product context

LMChat is the productized surface of the **Mach2 multi-agent harness**. The core ideas, carried directly into this system:

- **Harnesses, not a raw model.** There is no direct/raw-model mode — every conversation runs *through* a selected agent harness (a Python module under `agent/`: ReAct Agent, Orchestrator, Agent-to-Agent, Research+Critic, Memory). A FastAPI/uvicorn harness server (`:8000`) drives the local model (Ollama) behind it.
- **Pick your harness, per session.** A new session opens on a pre-flight: choose the working directory and the harness (a default is pre-selected). Different sessions can run different harnesses; sessions are organized into user folders in the left nav.
- **Inline tool activity.** As the harness works it streams collapsible tool-call rows (`Edited a file, used a tool ›`) inline in the conversation; the right sidebar holds the step-by-step thinking and the critique ledger.
- **Local models via Ollama.** Open-source models are served through Ollama; the provider URL is configurable in Settings and a default provider stays loaded.
- **The agents.** Research Agent (a nested scouting harness that fans out dynamic scouts), a multi-layer Critic pipeline (L2 Fact → L3 Gap → L4 Logic → L5 Efficiency → L7 Sign-off), and a Synthesizer that writes the user-facing answer from an approved critique ledger.
- **Opt-in reasoning.** The chat stays clean and shows the final answer; the ReAct trace and critique ledger live in an opt-in **Thinking & Critique** panel.
- **Severity language.** Critique items are graded `blocker | major | minor | info` — the backbone of the system's semantic colors.

### Sources (provided; reader may not have access — recorded for reference)
- **Codebase:** `Mach-2-Agent-Harness/` (mounted, read-only). Key reads:
  - `README.md`, `docs/ARCHITECTURE.md` — harness architecture, layer map, scout + critic design.
  - `ui/src/` — the real product UI: `tokens.css`, `App.tsx/.css`, `components/ChatPanel.*`, `components/Inspector.*`, `hooks/useChat.ts`. **This is the ground truth for the UI kit.**
  - `docs/ornith-system-prompt.md` — agent voice + copy conventions (see Content Fundamentals).
  - `docs/logos/` — the M2 mark + MACH2 wordmark (copied into `assets/`).
- **Reference doc:** `docs/claude-design-template.md` — an Anthropic *marketing* brand analysis present in the repo. Used **only** as background; LMChat is intentionally its own dark product brand and does **not** reuse Anthropic's cream/coral marketing identity.
- A second mount `claude-design-ui/` was attached but resolved **empty** — see Caveats.

---

## Content fundamentals

The voice is taken from the harness system prompt: **dense, technical, lowercase-leaning, zero filler.** Write like an engineer who respects the reader's time.

- **Tone:** direct and confident. State the thing; don't preface it. "Reading session.py first." not "I will now proceed to read the file."
- **Casing:** Sentence case for UI labels and headings. Lowercase for mode names in body (`direct`, `harness`), model IDs (`ornith:9b`), agent/tool names (`spawn_scout`), and metadata. UPPERCASE only for tiny mono eyebrows/badges (`HARNESS`, `BLOCKER`).
- **Person:** Address the user as *you*; the product/agent rarely says *I*. Prefer imperatives ("Pick Harness for the pipeline").
- **Length:** match the question. One sentence per idea. No bullet lists under three parallel items. Never summarize what was just done; never "I hope this helps."
- **Numbers & data:** monospace, exact, with units (`3.2s`, `8b · q4`, `c-042`, `round 2`). Don't invent stats.
- **Emoji:** none. The terminal aesthetic uses mono glyphs and Lucide icons instead. The one ornamental glyph allowed is the `M2` mark.
- **Examples**
  - Empty state: *"Call your model through any harness."*
  - Composer hint: *"agent/p4-specialization → local model"*
  - Critique: *"No dark-mode contrast guidance for data tables in the scout report."* → suggested action as a mono `spawn_scout({…})` line.

---

## Visual foundations

**Atmosphere.** Near-black canvas (`--bg #0d0d0f`) with layered dark surfaces (`--surface`, `--surface-2`, `--surface-3`). Depth comes from *surface contrast + 1px hairline borders*, not heavy shadows. Shadows appear only on floating layers (drawer, popovers, tooltips).

**Color.**
- **Brand orange** (`--brand #e06c3a`, from the M2 logo) — the primary CTA and brand voltage. Used scarcely: one primary button per view, the brand mark, focus rings. Hover lightens, press darkens.
- **Agent violet** (`--agent #7c6af7`, from the running harness UI) — signifies the agent/harness layer: the harness selector, agent identity, the trace drawer, harness module paths. Never mixed with brand orange in the same role.
- **Terminal semantics** — green (success/assistant), cyan (info/user), amber (warning), red (error). These double as **severity**: blocker=red, major=amber, minor=cyan, info=muted.
- Text ramps warm-neutral: `--text` → `--text-soft` → `--muted` → `--faint`.

**Type.** Three families, strict split:
- **Space Grotesk** (display) — headings, wordmark, big numerals. Weight 400–600, tracking −0.02em.
- **IBM Plex Sans** (UI/body) — labels, paragraphs, buttons. 400 body / 500 labels.
- **JetBrains Mono** (mono) — code, terminal, inspector data, model IDs, all badges/eyebrows. Uppercase mono with wide tracking is the system's signature label treatment.

**Spacing & shape.** 4px base, compact dev-tool rhythm. Radii are hierarchical: `xs 3` (chips/badges) · `sm 5` · `md 8` (buttons/inputs/cards) · `lg 12` (panels/drawer) · `xl 16` (hero marks) · `pill`. Controls are 34px tall by default — dense, not airy.

**Backgrounds.** Flat color blocks. No gradients, no photographic imagery, no illustration. The only "texture" is monospace code on recessed `--bg-inset` wells. Scrollbars are thin and dark to match.

**Motion.** Quick and functional. `--dur-fast 120ms` for hovers, `--dur-base 180ms` for toggles, `--dur-slow 320ms` for the drawer slide. Easing `--ease-out` (cubic-bezier(.22,1,.36,1)). The only looping animation is the loading spinner. All motion respects `prefers-reduced-motion`.

**States.**
- *Hover:* surfaces lighten one step (`surface-2/3`); brand/agent fills lighten; ghost buttons gain a fill.
- *Press:* a 0.5px nudge down; brand/agent darken.
- *Focus:* 2px brand ring offset from the canvas (`--ring`), or an inset ring on segmented controls.
- *Disabled:* 0.45 opacity, `not-allowed`.

**Cards.** Dark `--surface` fill, 1px `--border`, `--radius-lg`. Optional mono uppercase header eyebrow. Variants: `inset` (recessed well), `pop` (elevated + shadow), `ghost`. Accent borders (`brand`/`agent`) for selected/featured items. No colored-left-border-only cards; accents wrap the whole hairline.

---

## Iconography

- **Primary set: [Lucide](https://lucide.dev)** (loaded from CDN — `unpkg.com/lucide`). Clean 2px-stroke outline icons that match the terminal/developer feel. **This is a substitution, flagged:** the source codebase shipped no icon set — it used a handful of Unicode glyphs (`↵`, `✕`, `──`, `⚠️`). Lucide is the closest stroke-weight match for a richer product UI. Swap freely if you adopt a licensed set.
- **Usage:** 14–18px, `currentColor` so icons inherit text/accent color. Pair icon-only buttons with `aria-label`. Inline trace glyphs (tool/observation nodes) are tiny inline SVGs baked into `ThinkingStep`.
- **Brand mark:** the `M2` logo (`assets/logo-1-flat-m2-a.png`) and MACH2 wordmark (`assets/logo-7-mach2-minimal.png`). In-product the mark is reproduced as a CSS chip (orange square, mono `M2`) so it scales crisply at any size.
- **Emoji:** not used. **Unicode glyphs:** only `→` and `·` as inline separators in mono contexts.

---

## What's in here (index)

**Foundations**
- `styles.css` — the single entry point consumers link. Imports the token + font closure and the base reset.
- `tokens/` — `colors.css`, `typography.css`, `spacing.css`, `effects.css` (borders/shadow/motion/focus), `fonts.css` (Google Fonts), `base.css` (reset).
- `guidelines/foundations/*.card.html` — specimen cards (Colors, Type, Spacing, Brand) shown on the Design System tab.

**Components** (`window.LMChatDesignSystem_bc9736.*`) — each has `.jsx` + `.d.ts` + `.prompt.md`, with one `@dsCard` per directory:
- `components/forms/` — `Button`, `IconButton`, `Input`, `Textarea`, `Select`, `Switch`, `SegmentedToggle`.
- `components/data/` — `Badge`, `Tag`, `Avatar`, `Card`, `KeyValueRow`, `Spinner`.
- `components/agent/` — `MessageBubble`, `ToolCall` (inline tool-activity row), `ThinkingStep`, `CritiqueCard`, `SeverityBadge`.
- `components/navigation/` — `Tabs`, `Tooltip`.

**UI kit**
- `ui_kits/lmchat/` — interactive recreation of the LMChat coding-agent app: folder nav, new-session pre-flight (directory + harness), inline tool activity, a persistent right sidebar (Inspector / Thinking / Critiques), a server Harnesses panel, and Ollama provider settings. See its `README.md`.

**Assets**
- `assets/` — M2 mark + MACH2 wordmark.

**Skill**
- `SKILL.md` — makes this folder usable as a portable Agent Skill.

---

## Caveats
- **Empty mount:** the `claude-design-ui/` folder attached at the top level resolved empty (the only `claude-design-ui` content was a nested empty dir inside the harness repo). If there was meant to be a component library there, re-attach it.
- **Brand decision (please confirm):** the running UI used a violet primary (`#7c6af7`) while the logos are warm orange. I made **orange the brand/primary** (it's the logo, the strongest brand signal) and kept **violet as the agent/harness accent**. If you'd rather keep violet as the single primary, that's a quick swap.
- **Harness-only (confirmed by you):** there is no direct/raw-model mode — the UI kit's selector switches between agent harnesses, all routing to the local model. The 5 harnesses map to the repo's `agent/p1`–`p5` modules.
- **Fonts substituted:** Space Grotesk / IBM Plex Sans / JetBrains Mono (Google Fonts) stand in for the repo's generic `SF Mono` stack — there were no licensed font files to ship. Send real font files if LMChat has them.
- **Icons substituted:** Lucide stands in for an icon set the codebase didn't define (it used Unicode glyphs).
- **Logos are raster PNGs** (and look AI-generated). For crisp scaling, supply an SVG mark and I'll wire it in place of the CSS `M2` chip.
