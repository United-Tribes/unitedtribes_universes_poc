# Pluribus POC — Architecture Guide for Claude Code

> **Last updated:** Feb 12, 2026
> **Repo:** github.com/United-Tribes/unitedtribes_universes_poc
> **Branch:** `phase2-data-extraction` (active dev), `main` (rollback)
> **Main file:** src/App.jsx (4,313 lines — imports data from JSON)
> **Stack:** React 19, Vite 7, DM Sans/DM Mono, no external UI libs
> **Deploy:** AWS S3 static via deploy.sh

---

## What This Is

Pluribus is a POC for United Tribes — a cultural knowledge graph infrastructure company. The app demonstrates AI-powered cross-media discovery through an interactive interface that explores the universe of Vince Gilligan's Apple TV+ show "Pluribus." It shows how verified knowledge graph data (9,000+ relationships, 4,000+ artists from UMG and Harper Collins partnerships) can enhance AI responses with actionable, cross-media discovery.

The POC has two versions:
- **App.jsx** — The primary Vite app. Imports entity and response data from JSON files in `src/data/`. This is the version under active development.
- **PluribusComps.jsx** — A self-contained single-file version for Claude chat artifacts. Contains all data inline. NOT kept in sync with App.jsx — it serves as an independent artifact copy.

---

## Tech Stack & File Structure

```
unitedtribes_universes_poc/
├── src/
│   ├── App.jsx              ← Main app (4,313 lines, imports from JSON)
│   ├── PluribusComps.jsx    ← Self-contained artifact version (independent)
│   ├── main.jsx             ← Entry point, imports App
│   └── data/
│       ├── pluribus-universe.json   ← 6 entities, 18 sections each (97 KB)
│       └── pluribus-response.json   ← Songs, discovery groups, compare panel (10 KB)
├── CLAUDE_CODE.md            ← This file
├── deploy.sh                 ← AWS S3 deployment
├── index.html                ← Loads DM Sans/DM Mono fonts
├── package.json              ← React 19, Vite 7, @vitejs/plugin-react
└── vite.config.js
```

**Imports:** `useState`, `useEffect`, `useRef`, `useMemo` from React, plus `ENTITIES` from `./data/pluribus-universe.json` and `RESPONSE_DATA` from `./data/pluribus-response.json`. No router, no CSS files, no external UI libraries. All styles are inline objects.

### Data Architecture (Phase 2 Extraction)

Entity and response data has been extracted from App.jsx into JSON files:

- **`pluribus-universe.json`** — The `ENTITIES` object containing all 6 entities (Vince Gilligan, Breaking Bad, Body Snatchers, Carol Sturka, Zosia, Manousos Oviedo). Each entity has: type, emoji, badge, subtitle, stats, tags, avatarGradient, bio, quickViewGroups, completeWorks, inspirations, collaborators, themes, interviews, articles, sonic, graphNodes, graphEdges.

- **`pluribus-response.json`** — Response screen data: query text, discovery count, 8 songs (Episode 7 "The Gap"), songsSectionTitle/Description, 3 discovery groups (Inspirations: 6 cards, Universe: 4 cards, Literary: 5 cards), and comparePanel (raw vs enhanced response + enhancement summary stats).

App.jsx imports these at the top:
```js
import ENTITIES from "./data/pluribus-universe.json";
import RESPONSE_DATA from "./data/pluribus-response.json";
```

Discovery groups on the Response screen are now rendered data-driven:
```jsx
{RESPONSE_DATA.discoveryGroups.filter(g => g.id !== "literary").map((group) => (
  <DiscoveryGroup key={group.id} ...>
    {group.cards.map((card, ci) => <DiscoveryCard key={ci} {...card} />)}
  </DiscoveryGroup>
))}
```

---

## Navigation Architecture

```
SCREENS enum: HOME | THINKING | RESPONSE | CONSTELLATION | ENTITY_DETAIL | LIBRARY

Flow:
  HOME → THINKING (animated) → RESPONSE ↔ CONSTELLATION
                                    ↓              ↓
                              ENTITY_DETAIL   ENTITY_DETAIL
                                    ↓
                                LIBRARY
```

State lives in `App()`:
- `screen` — current SCREENS enum value
- `selectedEntity` — string key into ENTITIES object
- `spoilerFree` — boolean, blur S1 spoiler content
- `library` — `Set<string>` of saved item titles

Bottom dev nav bar provides direct access to all 6 screens.

---

## Design System — Theme Object `T`

```js
const T = {
  bg: "#ffffff",           // Page background (clean white)
  bgCard: "#ffffff",       // Card/panel background
  bgElevated: "#f3f4f6",  // Hover/elevated surfaces (neutral gray-50)
  bgHover: "#e5e7eb",     // Active hover state (neutral gray-200)
  border: "#e5e7eb",       // Default borders (neutral gray-200)
  borderLight: "#d1d5db",  // Lighter variant (neutral gray-300)
  text: "#1a2744",         // Primary text (navy — matched to colleague's palette)
  textMuted: "#4b5563",    // Secondary text (neutral gray-600)
  textDim: "#9ca3af",      // Tertiary/placeholder (neutral gray-400)
  blue: "#2563eb",         // Primary accent (links, active states)
  gold: "#f5b800",         // Badges, awards, prices (matched to colleague's palette)
  green: "#16803c",        // Media content badges, success
  queryBg: "#1a2744",      // Dark card/bubble backgrounds (navy)
  shadow / shadowHover     // Box shadow tokens
};
```

**CRITICAL:** The palette is neutral white/gray with navy text and bright gold accents — NO warm cream/brown tints. Colors aligned to colleague's site palette on Feb 11. All pages including the constellation use `#ffffff` background.

### Brand Colors (from colleague's site)
- **Navy:** `#1a2744` — primary text, dark backgrounds, Logo "UNITED"
- **Gold:** `#f5b800` — badges, awards, Logo "TRIBES"
- Logo uses system font stack (`-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto`), weight 800, letter-spacing 1px

### Type Badge Color System

Badges on DiscoveryCards follow this mapping:
- **Green** `#16803c` — Film, TV, books, episodes, career, writer, novel, dystopia — all media content
- **Purple** `#7c3aed` — Music scores, OST, ambient
- **Purple** `#8a3ab9` — Podcasts, audio
- **Gold** `#f5b800` — Awards (16 EMMYS), events, playlists, price tags
- **Dark red** `#991b1b` — Video essays, analysis content
- **Warm red** `#c0392b` — Character DNA/inspirations, PIVOTAL episodes
- **Blue** `#2563eb` — Interviews
- **Gray** `#555` — Generic, archive, profile, panel
- **Dark gray** `#4b5563` — TZ (Twilight Zone)

### Typography
- Primary: `'DM Sans', sans-serif` — all UI text
- Monospace: `'DM Mono', monospace` — labels, badges, code-like elements
- Logo: `-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif` — wordmark only
- Loaded via Google Fonts in index.html

---

## Component Hierarchy (23 components)

### Layout
- **`Logo({ size })`** — UNITED**TRIBES** wordmark (navy + gold, system font, weight 800)
- **`SideNav({ active, onNavigate, libraryCount })`** — 68px wide, 7 icon buttons, library badge counter

### Shared UI
- **`Chip({ children, active, onClick, variant })`** — Rounded pill button
- **`EntityTag({ children, onClick })`** — Inline blue link in prose, clickable → QuickView
- **`LibraryCounter({ count })`** — Blue dot + count badge
- **`ModelSelector()`** — "Claude · Enhanced" dropdown
- **`EnhancedBadge({ count })`** — Gold "Enhanced Discovery" + "✦ N DISCOVERIES" header

### Content Cards
- **`DiscoveryCard({ type, typeBadgeColor, title, meta, context, platform, platformColor, price, icon, spoiler, spoilerFree, library, toggleLibrary, onCardClick })`** — Primary content unit. Dark background card with type badge, emoji icon area, title, meta, italic context, platform pill, price pill, save button. Spoiler lock overlay when `spoilerFree && spoiler`. **`onCardClick`** routes to video or reading modal based on content type.
- **`DiscoveryGroup({ accentColor, title, description, children })`** — Section wrapper with left accent bar, title, description, horizontal scroll container for cards
- **`CollaboratorRow({ name, role, projects, projectCount })`** — Bar visualization of collaborator frequency
- **`ThemeCard({ title, description, works })`** — Thematic through-line with associated works

### Section Headers
- **`AICuratedHeader()`** — "AI-Curated Discovery" with left red accent bar + "POWERED BY UNITED**TRIBES**" badge (navy/gold split)

### Media Playback
- **`SongTile({ title, artist, isPlaying, onPlay, artColor })`** — Compact music tile with colored album art, play indicator, green play button. Selected state flips to dark background. Displayed in 3-column CSS grid.
- **`NowPlayingBar({ song, artist, context, timestamp, onClose, onNext, onPrev, onWatchVideo })`** — Fixed bottom bar with:
  - Green animated scrub bar (clickable to seek, simulated progress)
  - Skip/play controls (prev, pause/play, next)
  - Song title (white) + artist (blue)
  - "How it's used" (expandable) + "Watch Video" buttons + "via UMG"
  - **Expanded state:** "IN THE EPISODE" section with scene description + green timestamp link (launches video modal)

**NOTE:** All media players are entirely simulated — no real audio/video streaming. The scrub bar, skip controls, and play states are UI-only. Real playback (Spotify + YouTube integration) is on the roadmap.

### Modals
- **`VideoModal({ title, subtitle, onClose })`** — Dark overlay, 560px wide, 16:9 black video area with centered play button, "Official video · via UMG / Vevo" footer. Closes on backdrop click or x.
- **`ReadingModal({ title, meta, context, platform, platformColor, price, icon, onClose })`** — White modal for books/articles. Book cover or article icon, title/meta, platform+price badges, "WHY THIS BOOK MATTERS" section, "CONNECTION TO PLURIBUS" box, UnitedTribes attribution, footer with "Buy" or "Open on {platform}" button.

### Panels
- **`EntityQuickView({ entity, onClose, onNavigate, onViewDetail, library, toggleLibrary })`** — Right slide-in panel showing entity preview with grouped items

---

## Screen Details

### 1. HomeScreen
Layout: SideNav | Universe tiles + Explore panel

4 universe tiles: Pluribus (green), Breaking Bad (dark), Patti Smith (dark blue), Greta Gerwig (gold). Each has gradient, emoji, suggested query chips. Explore panel has search input, spoiler-free toggle.

### 2. ThinkingScreen
Layout: SideNav | 6-step animated pipeline

Steps: Entity Identification → Graph Mapping → Cross-media Analysis → Source Verification → Response Generation → Link Compilation.

### 3. ResponseScreen
Layout: SideNav | Main scroll column | Optional right panel (Compare or QuickView)

Header: Logo | "⟷ Compare Response" toggle | ModelSelector

Main content flow:
1. Query bubble (dark navy, right-aligned): "Who created Pluribus and what inspired it?"
2. Spoiler-free banner (if enabled)
3. "Enhanced Discovery" header with gold dot + "✦ 16 DISCOVERIES IN THIS RESPONSE" badge
4. Prose response with EntityTags (clickable → QuickView)
5. **AI-Curated Discovery** section header with "POWERED BY UNITEDTRIBES"
6. **Gilligan's Inspirations** group (6 cards)
7. **The Gilligan Universe** group (4 cards)
8. **Episode 7 — "The Gap"** music section (8 SongTiles in 3-column CSS grid, "Play All" button)
9. **Literary Roots** group (5 cards)
10. Follow-up input

**Card Click Routing (`handleCardClick`):**
- Video types (ANALYSIS, VIDEO, FILM, TV, TZ, SCORE, CAREER, EPISODE, 16 EMMYS, platform includes "Watch") → VideoModal
- Reading types (NOVEL, BOOK, DYSTOPIA, PROFILE, ACADEMIC, ESSAY, ARTICLE, or book/article icons) → ReadingModal

**Right panels:**
- Compare Response: Raw Claude vs UnitedTribes Enhanced + Enhancement Summary stats
- Entity Quick View: Opens when clicking EntityTags in prose

**NowPlayingBar:** Appears fixed at bottom when song selected. Scrub bar, skip controls, expandable episode context, video modal launch.

### 4. ConstellationScreen
Layout: SideNav | SVG pathways canvas | Optional Guide panel

White background. Hub node "PLURIBUS UNIVERSE" centered.

3 pathways:
- **The Auteur Path** (green `#2a9d5c`) — Gilligan Universe: Breaking Bad, Better Call Saul, X-Files
- **The Sci-Fi Path** (blue `#2563eb`) — The Hive Mind: Body Snatchers, The Thing, The Borg
- **The Character Path** (red `#c0392b`) — Carol Sturka: Carol Sturka, Zosia, Manousos

Navigable leaf nodes: Breaking Bad, Body Snatchers, Carol Sturka, Zosia, Manousos Oviedo → click navigates to ENTITY_DETAIL.

### 5. EntityDetailScreen
Layout: SideNav | Full-width scrollable detail page

11 sections: Hero, Bio, Complete Works, Inspirations, Collaborators (bar viz), Themes, Interviews, Articles, Sonic/Music, Mini Constellation (SVG), Source Footer.

**Card Click Routing:** Same `handleCardClick` — all DiscoveryCards open VideoModal or ReadingModal.

### 6. LibraryScreen
Groups: TV & Film, Music, Books, Articles & Interviews.

---

## Entity Data Model

6 entities in `ENTITIES` object:

| Entity | Type | Avatar Gradient |
|--------|------|-----------------|
| Vince Gilligan | person | blue `#3b6fa0→#4a82b8` |
| Breaking Bad | show | green `#2a7a4a→#35905a` |
| Invasion of the Body Snatchers | film | blue `#1e40af→#3b82f6` |
| Carol Sturka | character | red `#b91c1c→#dc2626` |
| Zosia | character | purple `#7c3aed→#a855f7` |
| Manousos Oviedo | character | green `#16803c→#22c55e` |

### Entity Schema
```
{
  type: "person" | "show" | "film" | "character",
  emoji, badge, subtitle, stats[], tags[], avatarGradient,
  bio: string[],
  quickViewGroups[],
  completeWorks[], inspirations[], collaborators[], themes[],
  interviews[], articles[], sonic[],
  graphNodes[], graphEdges[]
}
```

---

## Episode 7 "The Gap" Song Data

| Song | Artist | artColor | Context | Timestamp |
|------|--------|----------|---------|-----------|
| It's the End of the World | R.E.M. | blue | Carol drives through empty streets | 0:45 |
| Tarzan Boy | Baltimora | green | Others dance in rebuilt mall | 8:12 |
| I Will Survive | Gloria Gaynor | purple | Carol's ringtone, Helen's name | 14:30 |
| Born to Be Wild | Steppenwolf | red | Manousos drives across the Chaco | 17:55 |
| Georgia on My Mind | Ray Charles | green | Carol at jukebox, first grief | 28:40 |
| Hot in Herre | Nelly | purple | Others throw Carol a party | 33:15 |
| I'm Alright | Kenny Loggins | blue | End credits over black | 48:20 |
| Aquarius / Sunshine In | MARO & NASAYA | green | Others sing in every language | 38:50 |

---

## Pluribus Show Facts (Real Data — Do Not Alter)

- **Apple TV+**, premiered **Nov 7, 2025**, created by **Vince Gilligan**
- Premise: Alien virus creates hive mind ("the Joining"), 13 people immune
- **Carol Sturka** (Rhea Seehorn): Protagonist, Albuquerque romantasy novelist
- **Helen L. Umstead** (Miriam Shor): Carol's wife, dies post-infection
- **Zosia** (Karolina Wydra): Others' liaison to Carol
- **Manousos Oviedo** (Carlos-Manuel Vesga): Paraguayan immune
- S1: 9 episodes (We Is Us, Pirate Lady, Grenade, Please Carol, Got Milk, HDP, The Gap, Charm Offensive, La Chica o El Mundo)
- S1 ends: Carol requests an atom bomb
- 98% RT, 87 Metacritic, Seehorn won Golden Globe + Critics' Choice
- Correct spelling: Carol Stur**ka** (not Sturks)

---

## Key Patterns & Conventions

### Inline Styles
All styles are inline objects — intentional for artifact portability. No CSS files.

### Fade-in Animation
```js
const [loaded, setLoaded] = useState(false);
useEffect(() => { setTimeout(() => setLoaded(true), 100); }, []);
// opacity: loaded ? 1 : 0, transition: "opacity 0.5s"
```

### Library System
`Set<string>` of titles. `toggleLibrary(title)` adds/removes. `library.has(title)` checks.

### Spoiler-Free Mode
Cards with `spoiler="S1"` get lock overlay when `spoilerFree` is true.

### Song Grid Layout
SongTiles use CSS grid `repeat(3, 1fr)` — all tiles maintain equal width regardless of row count.

### Card Click → Modal Routing
Both ResponseScreen and EntityDetailScreen implement `handleCardClick(card)` to route clicks to VideoModal or ReadingModal based on content type.

### Mini Constellation Mapping
Per-entity graph nodes use `left: \`${(node.x - 120) / 600 * 55 + 10}%\`` for left-biased layout.

---

## What's Next (Planned)

### Completed
- ~~Phase 1: Data extraction~~ — Entity data and response data extracted into JSON files (Feb 12, 2026)

### Phase 2: Universe Data Provider + API Integration
1. Build universe data provider (swap JSON → API calls per universe)
2. Broker API integration for Response screen (`POST /v2/broker`)
3. Music section from API (real song/episode data)
4. Influence catalog from broker API

### Phase 3: Multi-Universe
5. Additional universes (Blue Note Records, Patti Smith, Greta Gerwig)
6. Universe-specific data files or API-driven content

### Future
7. Missing SideNav screens (Characters, Episodes, Sonic, Themes)
8. Mobile responsiveness
9. Real search (AI-powered)
10. Authentication/persistence
11. Real media playback — Spotify + YouTube integration (scrub bar and skip controls are ready)
12. Inline entity cards (designed but deferred)

---

## Git History (Key Commits, newest first)

```
1bf61a7 Extract hardcoded data into JSON files for Phase 2 API integration  ← phase2-data-extraction branch
92c00d5 Align palette to colleague's site: navy #1a2744, gold #f5b800, fix song grid
c58bf3b Restore Compare panel, add video + reading modals to all cards
df7767e Make timestamp link launch video modal
bcec5c8 Expandable audio player: scrub bar, skip, episode context, video modal
ce5699b Remove InlineEntityCard from Response screen
f732259 Match constellation background to global white
f79c575 Add AI-Curated Discovery header, episode music grid, now playing bar
fa92955 Match colleague's color palette: warm→neutral, badge colors aligned
2edcacd Add comprehensive CLAUDE_CODE.md architecture guide
64abd2b Add Zosia + Manousos entities, rewire constellation
bd3cd7c Replace hallucinated Carol Sturks with real Carol Sturka data
b350fed Add Body Snatchers + Rhea Seehorn entities, wire constellation
8971a4a Rebuild Constellation as narrative Pathways View
c97830c Library landing page + SideNav badge counter
d143999 Add to Library feature across all content surfaces
6af425e Add spoiler-free mode for Pluribus universe
```

---

## Session Notes for Claude Code

When making changes:
1. Work on the `phase2-data-extraction` branch (or successor branches)
2. Edit `src/App.jsx` for the Vite app — **do NOT update PluribusComps.jsx** (it's a separate artifact version)
3. Entity/response data changes go in `src/data/*.json` files, not inline in App.jsx
4. Git commit with descriptive message
5. Bundle with `git bundle create` for user download if needed
6. Check brace/paren/bracket balance before committing
7. Push to github.com/United-Tribes/unitedtribes_universes_poc each session
8. `main` branch is preserved as rollback — do not force-push or rebase it

Justin is the founder of UnitedTribes. His colleague has strong opinions on the color palette — always match the navy (#1a2744) / gold (#f5b800) / neutral white system. Justin uses Claude Code for implementation and iterates with immediate visual feedback in the browser.

### API Integration Notes (from Phase 1 Audit)
- **Knowledge Graph API**: `https://166ws8jk15.execute-api.us-east-1.amazonaws.com/prod`
- Entity relationships cap at 100 per page — pagination works but `relationship_type` filter is broken
- Character entities (Carol, Zosia, Manousos) have thin data — need curation JSON supplement
- Broker API (`POST /v2/broker`) returns rich structured data including influence catalog (~10 sec)
- Hybrid approach recommended: API for dynamic relationships + curation JSON for static presentation data
