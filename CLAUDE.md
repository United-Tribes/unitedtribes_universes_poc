# Pluribus POC — Architecture Guide for Claude Code

> **Last updated:** Feb 19, 2026
> **Repo:** github.com/United-Tribes/unitedtribes_universes_poc
> **File:** src/App.jsx (~7,300 lines — single-file React app)
> **Stack:** React 19, Vite 7, DM Sans/DM Mono, no external UI libs
> **Deploy:** AWS S3 static via deploy.sh

---

## What This Is

Pluribus is a POC for UnitedTribes — a cultural knowledge graph infrastructure company. The app demonstrates AI-powered cross-media discovery through an interactive interface that explores the universe of Vince Gilligan's Apple TV+ show "Pluribus." It shows how verified knowledge graph data (9,000+ relationships, 4,000+ artists from UMG and Harper Collins partnerships) can enhance AI responses with actionable, cross-media discovery.

The POC is a **single-file React component** (App.jsx) that runs as a Claude chat artifact AND as a deployed Vite app. PluribusComps.jsx is an identical mirror copy used for Claude chat artifacts. **Both must always be kept in sync** — after editing App.jsx, always copy it to PluribusComps.jsx.

---

## Getting Started

```bash
git clone https://github.com/United-Tribes/unitedtribes_universes_poc.git
cd unitedtribes_universes_poc
npm install
npm run dev        # Dev server at http://localhost:5173
npm run build      # Production build to dist/
```

**Branches:**
- `main` — stable, production-ready code
- `dev/colleague` — branch for colleague development (kept in sync with main)
- `phase2-data-extraction` — Justin's active development branch

**Workflow:** Create feature branches from `dev/colleague`. When ready, PR into `main`.

---

## Tech Stack & File Structure

```
unitedtribes_universes_poc/
├── src/
│   ├── App.jsx              ← THE app (~7,300 lines, single file, ALL components)
│   ├── PluribusComps.jsx    ← Mirror copy for Claude artifacts (keep identical to App.jsx)
│   ├── main.jsx             ← Entry point, imports App
│   └── data/
│       ├── pluribus-response.json   ← Pre-enriched response data (songs, episodes, cast, crew, themes)
│       └── pluribus-universe.json   ← 56 entities from knowledge graph (full entity detail)
├── public/
│   └── images/manual/       ← Manually sourced headshot images
├── CLAUDE.md                ← This file
├── deploy.sh                ← AWS S3 deployment
├── index.html               ← Loads DM Sans/DM Mono fonts from Google Fonts
├── package.json             ← React 19, Vite 7, @vitejs/plugin-react
└── vite.config.js
```

**Imports:** `useState`, `useEffect`, `useRef`, `useMemo` from React. No router, no CSS files, no external UI libraries. All styles are inline objects.

---

## Navigation Architecture

```
SCREENS enum:
  HOME | THINKING | RESPONSE | CONSTELLATION | ENTITY_DETAIL | LIBRARY
  THEMES | SONIC_LAYER | CAST_CREW | EPISODES | EPISODE_DETAIL

SideNav (left, 68px):
  Explore (HOME) | Themes | Sonic Layer | Cast & Crew | Episodes | Universe (CONSTELLATION) | Library
```

### Screen Flow
```
HOME → THINKING (animated) → RESPONSE ↔ CONSTELLATION (Pathways View)
                                ↓              ↓
                          ENTITY_DETAIL   ENTITY_DETAIL
                                ↓
                            LIBRARY

THEMES → (pathway detail drill-down, inline)
SONIC_LAYER → (composer detail, inline sub-view)
CAST_CREW → (cast detail / crew detail, inline sub-views)
EPISODES → EPISODE_DETAIL (full screen)
```

### Key App State (lives in `App()`)
- `screen` — current SCREENS enum value
- `selectedEntity` — string key into entities object
- `spoilerFree` — boolean, blur S1 spoiler content
- `library` — `Set<string>` of saved item titles
- `playingSong` / `playingSongIndex` — NowPlayingBar state
- `selectedEpisode` — episode object for EPISODE_DETAIL screen

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
  text: "#1a2744",         // Primary text (navy)
  textMuted: "#4b5563",    // Secondary text (neutral gray-600)
  textDim: "#9ca3af",      // Tertiary/placeholder (neutral gray-400)
  blue: "#2563eb",         // Primary accent (links, active states)
  gold: "#f5b800",         // Badges, awards, editorial callouts
  green: "#16803c",        // Media content badges, success
  queryBg: "#1a2744",      // Dark card/bubble backgrounds (navy)
  shadow / shadowHover     // Box shadow tokens
};
```

**CRITICAL:** The palette is neutral white/gray with navy text and bright gold accents — NO warm cream/brown tints.

### Brand Colors
- **Navy:** `#1a2744` — primary text, dark backgrounds, Logo "UNITED"
- **Gold:** `#f5b800` — badges, awards, editorial callouts, Logo "TRIBES"

### Theme Colors (shared across screens)
These are used for theme pills on Episodes, Episode Detail, Cast Detail, and Sonic screens:
```js
const THEME_COLORS = {
  collective: "#2563eb",   // Collective Consciousness
  psychology: "#6366f1",   // Psychology
  immunity: "#0891b2",     // Immunity
  grief: "#dc2626",        // Grief
  trauma: "#ea580c",       // Trauma
  relationships: "#be185d", // Relationships
  morality: "#9f1239",     // Morality
  identity: "#7c3aed",     // Identity
  resistance: "#8b5cf6",   // Resistance
  isolation: "#a78bfa",    // Isolation
};
```

### Typography
- Primary: `'DM Sans', sans-serif` — all UI text
- Monospace: `'DM Mono', monospace` — labels, badges, code-like elements
- Logo: `-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif` — wordmark only

---

## Data Architecture

### pluribus-response.json
Pre-enriched response data loaded at app startup. Contains:
- `songs` (34) — all needle drops with title, artist, context, spotify_url, video_id
- `episodes` (9) — each with title, number, description, director, writer, themes[], keyMoment, watchFor
- `discoveryGroups` (4) — Key Influences (14), The Cast (29), Behind the Scenes (8 crew), Featured Music (12)
- `themeVideos` — character moments with timecodes and YouTube video IDs
- `actorCharacterMap` — 30 actor→character name mappings

### pluribus-universe.json
56 entities from the UnitedTribes Knowledge Graph. Each entity has:
- Basic: title, subtitle, description, entity_type, image_url
- Relationships: collaborators[], completeWorks[], relatedThemes[]
- Character profiles: character_profile with portrayed_by, traits, themes

### Manual Images
`public/images/manual/` contains headshots for cast/crew not available via TMDB:
- dave-porter.webp, gordon-smith.webp, jenn-carroll.webp
- lucius-baston.jpg, elena-ester.jpg, manousos-oviedo.webp, ricky-cook.jpeg

### API Integration
- **Production API Base URL**: `https://166ws8jk15.execute-api.us-east-1.amazonaws.com/prod`
- **Broker API**: `POST /v2/broker` with `{"query": "..."}` — used for dynamic bio generation on Cast & Crew screens
- **Entity lookup**: `GET /entities/{name}` — URL-encoded entity names

---

## Screen Details (11 screens)

### Original Screens (1–6)

#### 1. HomeScreen
4 universe tiles: Pluribus (green), Breaking Bad (dark), Patti Smith (dark blue), Greta Gerwig (gold). Search input, spoiler-free toggle.

#### 2. ThinkingScreen
6-step animated pipeline: Entity Identification → Graph Mapping → Cross-media Analysis → Source Verification → Response Generation → Link Compilation.

#### 3. ResponseScreen
AI response with EntityTags, discovery groups (Gilligan's Inspirations, The Gilligan Universe, Episode 7 music, Literary Roots), Compare panel, QuickView panel. NowPlayingBar with real Spotify + YouTube playback.

#### 4. ConstellationScreen (Pathways View)
SVG pathways canvas with hub node "PLURIBUS UNIVERSE". 3 pathways:
- **The Auteur Path** (green) — Gilligan Universe
- **The Sci-Fi Path** (blue) — The Hive Mind
- **The Character Path** (red) — Carol Sturka

#### 5. EntityDetailScreen
Full entity page: Hero, Bio, Complete Works, Inspirations, Collaborators, Themes, Interviews, Articles, Sonic/Music, Mini Constellation.

#### 6. LibraryScreen
Saved items grouped by: TV & Film, Music, Books, Articles & Interviews.

### New Screens (7–11) — Added Feb 19, 2026

#### 7. ThemesScreen
10 themes organized into 3 pathways (Sci-Fi Premise, Emotional Toll, Internal Struggle). Each theme has color, description, theme videos with YouTube embeds. Lobby + pathway detail drill-down.

**IMPORTANT:** The Themes screen has its own `THEMES_DB` with full theme data. Do not modify this screen without explicit instruction.

#### 8. SonicLayerScreen
Sub-views: lobby / composerDetail

**Lobby:**
- Score vs. Needle Drops split panel (score side shows "Dave Porter", needle drops side shows count)
- Stats line: "Original score by Dave Porter · 34 needle drops across 9 episodes"
- Sonic Moments — music-related scenes from themeVideos with inline YouTube embeds
- The Composers — Dave Porter spotlight (BTR1 and Ricky Cook are filtered out via EXCLUDE_COMPOSERS)
- Full Tracklist — all 34 songs grouped by episode

**Composer Detail:** Hero, approach text, score cues section, creative lineage

**Data note:** No individual Dave Porter score cues exist in the data — the harvester only captured the `composer` relationship. All 34 songs are needle drops.

#### 9. CastCrewScreen
Sub-views: lobby / castDetail / crewDetail

**Lobby:**
- Creator Spotlight (Vince Gilligan) with creative timeline strip: X-Files → Breaking Bad → Better Call Saul → El Camino → Pluribus
- Cast grid (29 actors) with character names, "REP" badge for Gilligan Repertory members
- Key Crew list (excludes Vince Gilligan, BTR1, Ricky Cook)

**Cast Detail:** Hero with actor/character info, character bio, character themes, dynamic bio from broker API, previous work

**Crew Detail:** Hero, approach text (broker API bio), creative lineage

**Gilligan Repertory:** `isRepertory()` checks if person has connections to Breaking Bad, Better Call Saul, El Camino, or X-Files.

#### 10. EpisodesScreen
Episodes grouped by narrative arcs:
- **First Contact** (Episodes 1–3): "Carol's world ends. A new one begins."
- **The Fracture** (Episodes 4–6): "Alliances form. Trust breaks. The rules change."
- **The Choice** (Episodes 7–9): "Everyone picks a side. Carol picks something else."

Each EpisodeCard: still placeholder (gradient), title, director/writer, theme pills, cast count, track count. Expandable inline detail with synopsis, gold "Key Moment" callout, cast chips, Sonic Layer link. Click "Full episode detail" → EPISODE_DETAIL screen.

#### 11. EpisodeDetailScreen
Full episode deep-dive:
- Hero with theme pills, credits (director, writer)
- "What to Watch For" (gold-accented editorial section)
- Cast in This Episode (chips with actor→character mapping)
- Music in This Episode (song tiles with NowPlayingBar integration)
- Connected Influences (INFLUENCE/REFERENCE type connections)
- Source Material (theme videos with "GRAPH SOURCE" badge)
- Prev/Next episode navigation

---

## Key Patterns & Conventions

### Single-File Architecture
All components live in App.jsx. This is intentional for Claude artifact portability. Always mirror to PluribusComps.jsx after changes.

### Inline Styles
All styles are inline objects — no CSS files. This is intentional.

### Sub-View Pattern
Screens with drill-down views (Sonic, Cast & Crew, Themes) use internal `view` state:
```js
const [view, setView] = useState("lobby"); // "lobby" | "castDetail" | "crewDetail"
```
With breadcrumb navigation back to lobby.

### NowPlayingBar Integration
Songs played from any screen use the shared NowPlayingBar at the bottom. Set `playingSong` and `playingSongIndex` from App state. The bar supports Spotify iframe embed + YouTube embed toggle.

### ThemePill Component
Shared component for theme display across Episodes, Episode Detail, Cast Detail:
```js
<ThemePill themeId="grief" onClick={() => navigateToTheme("grief")} />
```

### Fade-in Animation
```js
const [loaded, setLoaded] = useState(false);
useEffect(() => { setTimeout(() => setLoaded(true), 100); }, []);
// opacity: loaded ? 1 : 0, transition: "opacity 0.5s"
```

### Episode Arc Constants
```js
const EPISODE_ARCS = [
  { label: "First Contact", range: [1, 3], description: "Carol's world ends..." },
  { label: "The Fracture", range: [4, 6], description: "Alliances form..." },
  { label: "The Choice", range: [7, 9], description: "Everyone picks a side..." },
];
```

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

## Important Rules

### No Graph Infrastructure in UI
The knowledge graph powers everything but stays invisible to users. No "graph links," "connection counts," or "graph connections" visible in the UI. The only exception is the "GRAPH SOURCE" badge on source material videos (provenance indicator).

### Editorial Content
Items marked as "editorial" or "curatorial" (arc labels, "What to Watch For", intro text) are handwritten — not derived from the graph. Use the existing placeholder text as-is or improve with the same tone.

### Color Palette
Always match the navy (#1a2744) / gold (#f5b800) / neutral white system. The colleague has strong opinions on this — never drift toward warm cream/brown tints.

### Naming
The company name is **UnitedTribes** — one word, no space.

---

## Session Workflow for Claude Code

1. Always edit `src/App.jsx`
2. Copy to `src/PluribusComps.jsx` (keep identical): `cp src/App.jsx src/PluribusComps.jsx`
3. Build: `npm run build`
4. Test in browser: `npm run dev`
5. Git commit with descriptive message
6. Push to GitHub

---

## What's Next (Planned)

1. **Broker API Integration** — Dynamic Response screen powered by live API calls
2. **Blue Note Universe** — Second universe alongside Pluribus
3. **Episode stills** — TMDB episode stills to replace gradient placeholders
4. **Scene timeline** — Timestamped scene cards on Episode Detail (needs data extraction)
5. **Theme prominence bars** — Horizontal bars on Episode Detail and Cast Detail
6. **File decomposition** — Break single-file into modules when ready
7. **Mobile responsiveness**
8. **Real search** — AI-powered search via broker API
