# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Students, museum/exhibition visitors, and personal reel audiences who open a full-screen cinematic reconstruction to grasp the Chicxulub impact in one sitting. Context is often a dim room, shared screen, or short visit — they may not read long copy. Job to be done: feel the scale of the event and leave with a clearer scientific picture of what happened 66 Ma.

## Product Purpose

A single-file Three.js cinematic simulation of the late-Cretaceous asteroid impact at Yucatán. It reconstructs approach, contact, ejecta, and global dust winter without requiring an app install or multi-page site. Success looks like: start → watch → understand sequence and magnitude; replay and camera modes support teaching and presentation.

## Positioning

A no-install, single-file cinematic simulation — a self-contained HTML/Three.js reconstruction that runs in any browser with no app, account, or download. Its treatment is telemetry/documentary-toned (phase readouts, measured numbers, restrained narration copy) rather than the dramatized "impact!" spectacle that most Chicxulub/K-Pg content (documentaries, museum apps, textbook animations) leans on instead.

## Operating Context

Viewed solo or in a small informal group, self-guided — no narrator or facilitator walks the audience through it. The visitor presses Start and reads the on-screen phase captions and telemetry themselves to follow the story. Visits are often short and unscheduled (someone arrives mid-thought and may leave after one pass).

## Capabilities and Constraints

- Ships as a single HTML file (Three.js via CDN, no build step, no backend) — the durable constraint the "One file, one frame" design principle exists to protect.
- No login, install, or network dependency beyond loading the page and its CDN scripts/fonts.
- Numeric figures (10 km diameter, 20 km/s, 66.043 Ma, Yucatán/Chicxulub site, ~10⁸ Mt energy) are approximate public-knowledge figures, not tied to a specific cited paper. Future work should not present them as precisely sourced or invent citations for them.

## Brand Personality

cinematic · scientific · solemn

Voice is documentary, not hype. Type and framing evoke a film title sequence and field telemetry, not a consumer game HUD. Emotion goals: wonder grounded in academic seriousness.

## Anti-references

- Mobile game UIs and arcade “impact!” juice
- NASA-mission control dashboards full of panels and widgets
- Loud YouTube-thumbnail energy (neon gradients, explosion stickers, shouty badges)
- Generic SaaS cream cards or chrome-heavy scientific software chrome

## Evidence on Hand

None. Figures are general public-knowledge approximations (see Capabilities and Constraints); no specific research citation, dataset, or external asset backs them. Do not fabricate sources or attribute the numbers to a particular study.

## Design Principles

1. **Cinema first** — Letterbox, grain, and timed phases carry the story; chrome stays secondary.
2. **Science without dashboard sprawl** — Telemetry earns its place when it clarifies phase, energy, or dust; never compete with the globe.
3. **Wonder with restraint** — Flash and fire sell scale once; no perpetual particle carnival.
4. **One file, one frame** — Everything ships in a single HTML experience that opens cleanly for demos and exhibitions.
5. **Accessible seriousness** — Prefer reduced-motion paths, readable type contrast, and operable controls for public visitors.

## Product Principles

1. **Accuracy-toned over dramatized** — the piece competes on measured, documentary credibility, not spectacle, against other Chicxulub/extinction content.
2. **Zero friction to open** — stays a single shareable file; any dependency that breaks "open and it just runs" undermines the reason the product exists.
3. **Self-guided reading, not narrated** — on-screen captions and telemetry must carry the story alone, since no facilitator is assumed.
4. **Short, unscheduled visits** — design for someone who may arrive mid-thought and leave after one pass, not a seated long-form audience.

## Accessibility & Inclusion

Serious commitment: respect `prefers-reduced-motion` for camera shake, letterbox opens, and non-essential FX; keep body and UI text contrast ≥ WCAG AA; keyboard-operable Start / Replay / camera / pane controls; avoid conveying critical state by color alone; grain and flash should not rely on rapid flicker as the only cue.
