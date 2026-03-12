# Blue Note Universe — Demo Walkthrough Script

> **For:** JD walkthrough of `justin/mar-11-dev` branch
> **Date:** March 11, 2026
> **How to run:** `git checkout justin/mar-11-dev && npm run dev`

---

## Setup

Open `http://localhost:5173/jd-universes-poc/` (or whatever port Vite assigns). You'll land on the Home screen with universe tiles.

---

## Stop 1: Home Screen — Selecting Blue Note

**What to show:** Click the **Blue Note** universe tile.

**What's working:**
- Blue Note tile is fully defined with title, subtitle, gradient, description
- Selecting it loads 51 entities from `bluenote-universe.json` and discovery groups from `bluenote-response.json`
- All nav labels update: "Artists & Legends", "The Sound", "Movements", "Discover"

**What to call out:** The universe selector in the top nav also works — you can switch between Pluribus and Blue Note at any time without losing state in the other universe.

---

## Stop 2: Universe & Map (Constellation) — The Artist Network

**Navigate to:** Click **Universe & Map** in the side nav.

**What's working:**
- The "Artist Network" tab renders a full graph+drawer split layout — same quality as Pluribus "J.D.'s Universe"
- **51 nodes** in the force-directed graph: center node "Blue Note Records", 5 hubs (Cast, Crew, Influences, Music, Themes), and spoke nodes for all artists, label figures, movements, and themes
- **Directory drawer** (400px right panel) with filter tabs: Artists / Label / Movements / Themes
- Each drawer entry has contextual descriptions pulled from `BLUENOTE_ARTIST_PROFILES` and `BLUENOTE_LABEL_PROFILES`
- **6 editorial themes** appear as nodes in the graph with proper colors and cross-connections
- Clicking a node in the graph highlights it and scrolls the drawer
- Clicking a person in the drawer focuses the graph on them
- Filter tabs work — you can view just Artists, just Label figures, just Movements, or just Themes

**What to call out:**
- Node sizing is tiered: "Blue Note Records" is largest (24), key artists are medium (18), everyone else is standard (11-12)
- The "Themes Network" tab also works — shows the same themes in the network view
- No "J.D.'s Universe" tab for Blue Note — that's Pluribus-specific
- Theme nodes were the trickiest part — the graph builder originally only supported `themeVideos` (Pluribus pattern). We added `editorialThemes` as a fallback path in adapters.js

---

## Stop 3: Artists & Legends — Lobby

**Navigate to:** Click **Artists & Legends** in the side nav.

**What's working:**
- Lobby shows Blue Note-specific content: label figures as "creators", key artists as "cast"
- Creator profiles: Alfred Lion, Francis Wolff, Rudy Van Gelder, Reid Miles, Bruce Lundvall, Don Was
- Cast profiles: Art Blakey, John Coltrane, Miles Davis, Herbie Hancock, Thelonious Monk, Wayne Shorter, Horace Silver
- Broker API bio prompts are universe-aware — generates Blue Note context, not Pluribus
- No Vince Gilligan spotlight or Rhea Seehorn dual spotlight (those are gated to Pluribus)

**What we haven't done yet:**
- The lobby layout and structure still follows the Pluribus lobby template fairly closely. We haven't created any Blue Note-specific lobby features (like a label timeline, or a "The Jazz Messengers Family Tree" spotlight equivalent to the Vince/Rhea spotlights)
- No "Explore the Blue Note Universe" path chips (the "Who is [person]?" / "Who is the character?" dual paths are Pluribus-only)

---

## Stop 4: Artists & Legends — Artist Detail Pages

**What to show:** Click on **Art Blakey** from the Artists & Legends grid.

**What's working (Art Blakey — a "core" artist with full data):**
- Hero section with photo, name, genre tags, follow button
- Bio generated from broker API with Blue Note-aware prompts
- Follow-up question chips (generated dynamically, Blue Note-specific)
- **Featured Videos** (red accent) — 3 YouTube video tiles: "Live in Belgium 1958", "The Genius of Art Blakey", "Moanin' Live"
- **Featured Tracks** (green accent) — 3 Spotify tracks: "Moanin'", "Along Came Betty", "Come Rain Or Come Shine" with green Play buttons
- **Discography** (purple accent) — 4 albums with type badges
- **Collaborators** (blue accent) — 8 collaborators in a 2-column grid with photos, clickable to navigate between artists
- **Articles & Press** (green accent) — interviews and articles combined

**Now click on Horace Silver** (navigate back to lobby first, then click Horace).

**What's working (Horace Silver — a "standard" artist, no quickViewGroups media):**
- Hero + Bio + follow-up chips — same as Art Blakey
- **Discography** — Song for My Father, Senor Blues, 6 Pieces of Silver
- **Collaborators** — 8 collaborators with photos
- **Articles & Press** — 6 articles from Pitchfork etc.
- No Featured Videos or Featured Tracks sections (his `quickViewGroups` is empty — sections gracefully don't render)

**Now click on Hard Bop** (or any genre/concept entity from the constellation).

**What's working (concept entity — bio only):**
- Hero + Bio — clean, appropriate for a genre concept
- No content sections (appropriate — movements don't have discographies or collaborators)

**Data coverage across all 51 entities:**

| Tier | Count | What they see | Examples |
|------|-------|---------------|----------|
| Core | 7 | All 5 sections (videos + tracks + works + collabs + articles) | Art Blakey, Miles Davis, John Coltrane |
| Standard | 18 | 3 sections (works + collabs + articles) | Horace Silver, Lee Morgan, Bill Evans |
| Label figures | 6 | 2-3 sections (videos + collabs) | Alfred Lion, Rudy Van Gelder, Reid Miles |
| Concepts | 8 | Bio only | Hard Bop, Modal Jazz, Free Jazz |
| Anchor | 1 | Collabs + articles + videos | Blue Note Records |

**What we haven't done yet:**
- The inline conversation thread on artist pages works but the prompts could be further tuned for Blue Note context (right now they use a general pattern)
- No curated responses for any Blue Note entity (Pluribus has `CURATED_RESPONSES` for some entities)

---

## Stop 5: The Sound (Sonic Layer)

**Navigate to:** Click **The Sound** in the side nav.

**What's working:**
- Blue Note-specific intro copy: "Blue Note's sound is unmistakable..."
- **Eras Timeline** — 6 eras from `BLUENOTE_ERAS` (Founding Era, Bebop Roots, Hard Bop Golden Age, New Thing/Avant-Garde, Fusion & Transition, Revival & Modern Era)
- **Essential Tracks** — 7 tracks from `BLUENOTE_ESSENTIAL_TRACKS` with Spotify links
- **The Architects** — key label figures who shaped the sound (from `BLUENOTE_LABEL_PROFILES`)
- No Pluribus content bleeds through (Dave Porter, Sonic Moments, needle drops are all gated)

**What we haven't done yet:**
- The eras timeline is functional but visually simple — it could benefit from more editorial polish or a more distinctive layout
- Essential Tracks don't have inline playback — they link out to Spotify
- No "Sonic Moments" equivalent for Blue Note (Pluribus has timestamped YouTube moments)

---

## Stop 6: Themes (Discover)

**Navigate to:** Click **Discover** in the side nav (or whatever the Themes nav item is labeled).

**What's working:**
- 6 Blue Note themes organized into 3 pathways:
  - **The Sound** — "The Blue Note Sound", "The Hard Bop Revolution"
  - **The People** — "Mentorship & The Jazz Messengers", "Artistic Freedom", "Visual Identity"
  - **The Legacy** — "Revival & Legacy"
- Each theme has editorial descriptions from `BLUENOTE_THEMES_KEYED`
- Pathway detail drill-down works — click a pathway to see its themes
- Theme detail shows full descriptions
- Related entities listed per theme (from `BLUENOTE_ARTIST_PROFILES` theme connections)

**What we haven't done yet:**
- No theme videos for Blue Note themes (Pluribus themes have YouTube video clips). The theme detail pages show descriptions but no media
- The constellation layout within the Themes screen is hidden for Blue Note (simpler approach — we show the narrow lobby view instead)

---

## Stop 7: Movements (Episodes)

**Navigate to:** Click **Movements** in the side nav.

**What's working:**
- Blue Note-specific intro copy: "From hard bop to free jazz, Blue Note Records defined the sound of a century..."
- Badge shows "6 eras" instead of Pluribus's "9 episodes"
- Stats footer: "7 artists · 6 movements · 80+ years"
- **6 era cards** rendered from `BLUENOTE_ERAS`, each with:
  - Colored accent bar
  - Title + year range (e.g., "Hard Bop Golden Age · 1953–1965")
  - Description paragraph
  - Key artist chips (clickable — navigates to artist detail)

**What we haven't done yet:**
- Era cards don't expand inline like Pluribus episode cards do
- No "Full era detail" drill-down screen (Pluribus has EpisodeDetailScreen)
- Artist chips on era cards could link to entity detail but the navigation may not be wired

---

## Stop 8: Switch Back to Pluribus

**What to show:** Click the universe selector → switch back to **Pluribus**.

**What to verify:**
- All Pluribus screens render exactly as before — no regressions
- J.D.'s Universe tab in constellation works with full drawer
- Cast & Crew shows Vince/Rhea spotlight
- Episodes show 9 episodes in 3 arcs
- Sonic Layer shows Dave Porter, 34 needle drops
- Themes show 10 themes with video clips
- No console errors

---

## Summary: What's Done vs What's Next

### Done (this build)
- Full constellation graph+drawer with 51 entities, editorial themes, universe-aware everything
- Artist detail pages with 5 content sections (videos, tracks, discography, collaborators, articles)
- All 5 side-nav screens gated and showing Blue Note content
- 3 data files (universe, response, editorial) fully populated
- Universe expansion guide documenting the process for future universes
- Zero Pluribus regressions

### Not Yet Done
- **Lobby spotlights** — No Blue Note equivalent to the Vince/Rhea dual spotlight or explore path chips. The lobby is functional but not editorially distinctive.
- **Theme videos** — Blue Note themes have descriptions but no video content (no YouTube clips attached to themes)
- **Era detail drill-down** — Movements screen shows era cards but they don't expand or link to a detail screen like Pluribus episodes do
- **Curated responses** — No pre-written responses for Blue Note entities (all bios are generated live from broker API)
- **Sonic Moments equivalent** — The Sound screen has eras and essential tracks but no timestamped YouTube performance clips
- **Artist page inline playback** — Featured Tracks link out to Spotify rather than playing inline
- **Blue Note-specific editorial features** — Things like a label timeline, "Jazz Messengers family tree", or "The Van Gelder Sound" deep-dive that would make the Blue Note experience feel as editorially rich as Pluribus

### Architecture Notes for Future Development
- Every universe-aware gate follows the pattern `selectedUniverse === "bluenote"` or uses keyed objects like `CONSTELLATION_TABS_BY_UNIVERSE[selectedUniverse]`
- The `DISCOVERY_GROUP_IDS` mapping is the critical bridge between abstract concepts (cast, crew, influences) and each universe's actual data
- Editorial data is injected via `useMemo` on `responseData` — not in the loader callback (survives HMR)
- The full universe expansion guide is at `docs/universe-expansion-guide.md`
