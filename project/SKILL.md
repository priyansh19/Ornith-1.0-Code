---
name: lmchat-design
description: Use this skill to generate well-branded interfaces and assets for LMChat, either for production or throwaway prototypes/mocks/etc. Contains essential design guidelines, colors, type, fonts, assets, and UI kit components for prototyping a dark, terminal-grade multi-model / multi-agent chat product.
user-invocable: true
---

Read the `readme.md` file within this skill, and explore the other available files.

LMChat is a dark developer-tool chat product: call different models through different harnesses (Direct mode = one model; Harness mode = a multi-agent ReAct pipeline). The brand is near-black canvas, monospace data, warm-orange (`--brand`) primary, violet (`--agent`) for the agent/harness layer.

Where things live:
- `styles.css` — link this one file to get all tokens + fonts + reset.
- `tokens/` — colors, typography, spacing, effects (CSS custom properties).
- `components/{forms,data,agent,navigation}/` — React primitives (`.jsx` + `.d.ts` + `.prompt.md`). Read the `.prompt.md` files for usage.
- `ui_kits/lmchat/` — a full interactive app recreation to copy patterns from.
- `guidelines/foundations/` — visual specimen cards.
- `assets/` — the M2 brand mark + wordmark.

If creating visual artifacts (slides, mocks, throwaway prototypes, etc.), copy assets out and create static HTML files for the user to view. If working on production code, copy assets and read the rules here to become an expert in designing with this brand.

If the user invokes this skill without any other guidance, ask them what they want to build or design, ask some questions, and act as an expert designer who outputs HTML artifacts _or_ production code, depending on the need.

Voice when writing copy: dense, technical, lowercase-leaning, zero filler. No emoji. Monospace for data/IDs/metadata. One sentence per idea.
