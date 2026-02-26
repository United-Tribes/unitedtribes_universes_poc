# UnitedTribes POC v2 — Active TODO

## P0 — Critical

- [x] **~~Tile switch clips top of selected card~~** — Fixed in v1.0.2. Replaced `scrollIntoView` with calculated scroll for non-Pluribus tiles (`grid.offsetTop + 30`). Pluribus keeps original `scrollIntoView`. Non-selected tiles: `scale(0.84)`, `opacity: 0.4`. Selected tiles: no scale, elevated shadow. No compounding on tile switches.

- [ ] **🔴 Homepage bounce on first tile selection** — When clicking a non-Pluribus tile for the first time (from fresh load or after Pluribus), there's a slight bounce in the scroll animation. Caused by `paddingTop: selected ? 40 : 0` animating from 0→40 during the same timeframe as the scroll. Subsequent tile switches are smooth (paddingTop stays at 40). Need to either decouple the paddingTop transition from the scroll timing, or find an alternative approach.

- [ ] **🔴 Homepage tile grid left-right centering** — The tile grid is not properly centered horizontally within the viewport (accounting for the 72px sidenav offset). Tiles appear shifted left.

- [x] **Settings Edit Tool (v1.0)** — ~~Build a hidden UI tool~~ Built as `TileSettingsModal` — gear icon near version badge opens a modal editor for tile titles, subtitles, chips, and Pluribus pathway labels/emojis/chips. Saves to localStorage (`ut_tile_overrides`). Includes live preview strip. Still needs polish (see remaining items below).

- [ ] **🔴 Settings tool: Restore/change Pluribus pathway emojis** — The emojis on Pluribus pathway buttons (🎬 ⭐ 🔮) need to be reviewed and potentially changed. High priority.

- [ ] **Settings tool: Remaining polish** — The settings editor (TileSettingsModal) works but needs:
  - Further testing of save/reset/cancel flows
  - Verify all override paths work end-to-end (title, subtitle, chips, pathway labels, pathway emojis, pathway chips)
  - UX polish pass on the modal layout

- [ ] **Raw/unenhanced compare responses**: The Compare panel ("Without UnitedTribes") must show truly vanilla responses — what an average user would get going directly to ChatGPT, Claude, Perplexity, Gemini, etc. with no history and no KG enhancement. Current broker endpoints (`/v2/broker-*`) likely inject KG context server-side. Need to either:
  - Add a `raw: true` flag to the broker API (ask Justin)
  - Create passthrough endpoints that hit models directly with bare query
  - Or call model APIs directly from client (needs API keys / proxy)
  - **Perplexity and Gemini have no broker endpoints yet** — need new endpoints or direct API integration
- [ ] **🔴 TOMORROW: SideNav navigation must preserve response state** — clicking any SideNav item (Themes, Sonic Layer, Cast & Crew, Episodes, etc.) on ResponseScreen currently destroys all query/response/discovery/thread state. User must be able to browse other screens and return to their active search with everything intact — query, brokerResponse, followUpResponses, responseThread, compare panel, discovery cards. Likely requires persisting response state separately from screen navigation so switching screens doesn't blow it away.
- [ ] UnitedTribes logo/header font doesn't match v2.8 bible
- [ ] Discovery card sizing inconsistency between filter states (All vs TV)

## P1 — Important

- [ ] **Entity animations in ThinkingScreen + InlineThinkingIndicator**: The entity pills/names shown during thinking animations (both the full-page ThinkingScreen interstitial and the inline pill used during model switching) should display real entities from the knowledge graph rather than hardcoded names. Currently the 14 entity pills on ThinkingScreen and 12 entity exploration messages in the inline pill are static placeholders. Wire them to actual entity data relevant to the query/universe.

- [ ] **Preload raw compare responses in background**: After the main enhanced response arrives, immediately fire the raw/unenhanced API call in the background so the Compare panel is instant when opened. See full reasoning and implementation notes in `tasks/notes-compare-preload.md`. (Discuss with Justin — needs raw endpoint.)
- [ ] **🔴 TOMORROW: Entity click should toggle QuickView drawer** — on ResponseScreen, clicking an entity name opens the QuickView drawer, but clicking the same entity again should close it (toggle behavior). Currently you have to use a close button. Also review the overall entity click actions — the QuickView drawer shares space with the Compare panel, so need to make sure these interactions feel right together.
- [ ] Compare panel container colors: verify warm cream for active model, model-dot tints for others look correct in browser
- [ ] Compare panel auto-refresh: when user submits new query or follow-up on main screen, re-fetch all active compare models with new query

## P2 — Nice to Have

- [ ] **ThinkingScreen redesign**: Current compact layout (v0.9.1) works but isn't ideal — spacing was reduced across the board to fit content within the viewport. Consider a more thoughtful redesign of the ThinkingScreen layout (e.g., two-column layout, horizontal entity pill flow, or collapsing sections) rather than just shrinking everything uniformly.

- [ ] **White bar at bottom of pages**: HomeScreen uses `height: calc(100vh - 49px)` but has no TopNav, leaving a 49px gap where the body's cream gradient (`#faf8f5`) shows as a white bar. Fix: change to `100vh` on HomeScreen, and ensure App root div has a matching background so no bleed-through on any screen. (Lines ~947 and ~7957)

- [ ] Version tracker update for all changes this session (universe context, bubbles, compare panel)
- [ ] Commit and push all stable work
