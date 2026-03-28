# v1.8.5 Comprehensive Handoff Document

**Date:** Saturday, March 28, 2026
**Author:** J.D. Heilprin, CEO — UnitedTribes AI4Good
**Branch:** `jd/design-reskin-v3`
**Latest commit:** `d735065` (pushed to `origin` and `jdagogo`)
**Version:** v1.8.5 IN DEVELOPMENT

---

## 1. WHAT IS UNITEDTRIBES

UnitedTribes is a cultural knowledge graph infrastructure company. We demonstrate AI-powered cross-media discovery through an interactive interface that connects music, film, TV, books, people, and places across verified relationships — 9,000+ relationships, 4,000+ artists from partnerships with UMG (Universal Music Group) and HarperCollins.

The core thesis: **Discovery → Engage → Consume → Transact.** A user discovers John Coltrane through a video about Blue Note Records, engages with his discography and interviews, consumes music via Spotify and YouTube, and transacts by adding items to their collection. The Knowledge Graph powers every step — no hallucination, grounded in verified data.

### The Five Universes

The POC demonstrates this across five curated universes:

1. **Blue Note Records** — Jazz label universe. 123 albums in `blueNoteAlbums.json`, 17 artists with full Spotify/YouTube discographies. The most developed universe with dual Spotify/YouTube playback, album covers, tracklists, artist profiles, editorial content.

2. **Pluribus** (Apple TV+, Vince Gilligan) — TV show universe. 56 entities from the KG, 29 cast members, 9 episodes, 34 needle drops, thematic analysis. Rhea Seehorn as Carol Sturka. Full cast/crew pages, episode detail, sonic layer.

3. **Sinners** (Ryan Coogler) — Film universe. Cast, crew, soundtrack with Ludwig Goransson score. Michael B. Jordan. Rich video analysis across 40+ analyzed videos.

4. **Patti Smith** — Artist/literary universe. Just Kids memoir, Robert Mapplethorpe, The Hotel Chelsea, CBGB, Beat Generation connections. 33 artists, 315 albums in artist-albums data. Rich cross-media connections spanning punk, poetry, photography.

5. **Greta Gerwig** — Filmmaker universe. Lady Bird, Barbie, Little Women. Saoirse Ronan, Timothee Chalamet. Film-centric discovery.

---

## 2. THE ECOSYSTEM — ALL PROJECTS AND HOW THEY CONNECT

### Active Repositories

| Port | Repo | Branch | Purpose |
|------|------|--------|---------|
| **5174** | `~/Desktop/unitedtribes-pocv2-jd/` | `jd/design-reskin-v3` | **THE ACTIVE BUILD.** J.D.'s design reskin, v1.8.5 in development. All work happens here. |
| **5173** | `~/Desktop/unitedtribes_universes_poc/` | `justin/mar-11-dev` | Justin's baseline build (v1.8.4). Reference for comparison. Blue Note albums work perfectly here. |
| **3002** | `~/youtube-transcript-analysis/` | `v3.3.4-internal-playback` | **YouTube Transcript Analysis (YTA).** 840 analyzed videos. Deep search, entity extraction, analysis framework. v3.3.6. |
| **3006** | `~/smart-media-logger/` | `v1.9.5-unified-preview` | **Smart Media Logger (SML).** TMDB search, trailers, critic scores, person search. 16 API routes. |
| **3004** | `~/Desktop/my-claude/united-tribes-fresh-v4/` | `v4.5.1-development` | **UnitedTribes Fresh.** Book-as-discovery-surface POC. 18 interactive literary pages. YouTube search integration. |

### Data Infrastructure

| System | Location | What It Contains |
|--------|----------|-----------------|
| **S3 Data Lake** | `unitedtribes-visualizations-*.s3-website-us-east-1.amazonaws.com/universe-data/` | Video entity indexes, artist-albums catalogs, album entity registry |
| **Video Entity Indexes** | `src/data/{universe}-video-entity-index.json` | 815 videos, 15,254 quotes, 11,265 entities with 24,749 timestamped references. Loaded at startup. |
| **Artist Album Catalogs** | S3 `{universe}/artist-albums.json` | Full discographies per universe. Bluenote: 17 artists, 177 albums. Pattismith: 33 artists, 315 albums. |
| **Universe JSONs** | `src/data/{universe}-universe.json` | KG entity data per universe. Entities with bio, collaborators, completeWorks, quickViewGroups, aliases. |
| **BLUENOTE_ALBUMS** | `src/data/blueNoteAlbums.json` | 123 Blue Note albums with Spotify IDs, cover art, personnel, years. |
| **YTA Analysis Files** | `~/Desktop/my-claude/podcast-test/youtube-analysis-viewer/data/videos/` | 840 folders, each with metadata.json, transcript, analysis markdown. |
| **Podcast Registry** | `src/data/podcast-registry.json` | Podcast metadata, bundled locally (S3 has no CORS). |

### API Integration Map

| API | Endpoint | What It Does | Used In |
|-----|----------|-------------|---------|
| **Broker API** | `POST https://166ws8jk15.execute-api.us-east-1.amazonaws.com/prod/v2/broker` | LLM-powered responses grounded in KG data. 5 model options. | ThinkingScreen, Ask bars, bio generation |
| **KG Entity Lookup** | `GET /entities/{name}` | Entity data from the Knowledge Graph | Entity detail, relationship fetching |
| **YTA Search** | `GET localhost:3002/api/search?q=` | Full-text search across 840 videos | Modal video discovery |
| **YTA Deep Search** | `GET localhost:3002/api/search/deep?q=` | Transcript + analysis search with match counts | Modal video discovery (richer) |
| **YTA Video Detail** | `GET localhost:3002/api/video/{folder}` | Full analysis markdown for a specific video | Turndown content in modals |
| **YTA Videos List** | `GET localhost:3002/api/videos` | All 840 video folders with metadata | Video lookup |
| **SML TMDB Search** | `GET localhost:3006/api/search?q=` | Movie/TV search with posters | Film enrichment (not yet wired) |
| **SML Movie Details** | `GET localhost:3006/api/movie-details?id=` | Full TMDB details (cast, crew, runtime) | Film enrichment (not yet wired) |
| **SML Trailers** | `GET localhost:3006/api/youtube-trailer?title=&year=` | Quality-scored trailer search | Film enrichment (not yet wired) |
| **SML Person Search** | `GET localhost:3006/api/person-search?name=` | TMDB person with filmography | Person enrichment (not yet wired) |

**Vite proxy configuration** (in `vite.config.js`):
- `/api/yta/*` → `localhost:3002/api/*`

SML proxy is NOT configured yet. The enrichment functions exist in `src/utils/enrichment.js` (searchFilm, enrichPerson, getMovieDetails, findTrailer) but are not called from the modal.

### The Harvester Pipeline

Justin's harvester produces the universe JSON files. It lives outside this repo at `/Users/justin/bscrape/united-tribes-lean-back/harvester/`. Four stages:

1. `discover.mjs` → `manifest.json` (3,799 entities, categorized + tiered)
2. `harvest.mjs` → `enriched.json` (API-enriched data for ~57 entities)
3. `harvest-themes.mjs` → `theme-videos.json` (theme-to-video mappings)
4. `assemble.mjs` → universe JSON + response JSON (copied to this repo's `src/data/`)

**Tier system:** Tier 1 (13 entities, full enrichment) → Tier 2 (44, moderate) → Tier 3 (1,894, light) → Tier 4 (1,848, cataloged only).

---

## 3. THE APPLICATION ARCHITECTURE

### Single-File React App

`src/App.jsx` is ~24,000 lines. ALL components are inline. This is intentional for Claude artifact portability. `src/PluribusComps.jsx` is an identical mirror copy — both must always be kept in sync (`cp src/App.jsx src/PluribusComps.jsx` after every edit).

**Stack:** React 19, Vite 7, DM Sans/DM Mono fonts, no external UI libraries. All styles are inline objects.

### Navigation

```
SCREENS enum:
  HOME | THINKING | RESPONSE | CONSTELLATION | ENTITY_DETAIL | LIBRARY
  THEMES | SONIC_LAYER | CAST_CREW | EPISODES | EPISODE_DETAIL | COVER_ART

SideNav (left, 68px): Explore | Universe & Map | Artists & Circle | The Music | Eras & Works | Discover | My Stuff
```

### Key State (App level)

- `selectedUniverse` — which universe is active (bluenote, pluribus, sinners, pattismith, gerwig)
- `entities` — current universe's entity data (loaded via dynamic import on universe switch)
- `universalModal` — entity name string or `{ name, artist }` or `{ name, artist, videoId }`
- `modalStack` — array for modal navigation (push parent when opening child)
- `library` — object of saved items (persisted to localStorage)
- `allVideoIndexes` — all 5 universe video entity indexes (loaded at startup)
- `artistAlbums` — all 5 universe artist-album catalogs (loaded from S3)
- `crossUniverseImages` — entity thumbnails from all universes (for My Stuff wall)

### The UniversalModal

The central component (~1,500 lines within App.jsx). Handles ALL entity display across ALL universes.

**Two modes:**
1. **Full mode** (music entities) — Spotify embed, YouTube embed, tracklist, features tab, discovery strip with album cards. The existing Blue Note album experience.
2. **Simple mode** (non-music entities) — Split panel with video player left, video list right. Turndown chevrons with analysis content. YTA deep search integration. Ask bar.

**The `isMusicEntity` gate** determines which mode:
```javascript
const isMusicEntity = _isMusician || _hasAlbumMatch || _hasTrackData;
```
- `true` → full music pipeline (Spotify/YouTube/tracks)
- `false` → detectEntityType → simple mode with video panel + YTA

**This gate is the source of the current Blue Note regression.** See Section 5.

---

## 4. VERSION HISTORY

### v1.8.4 (STABLE — pushed to main March 26, 2026)
Commit `70ee4af`. This is the safe rollback point.

**What it added:**
- Wall removal fixes (remove-only `setLibrary`, orphan track scan)
- Multi-category system (`category` string → `categories[]` array with auto-detection)
- Cross-universe album collapsing (`allArtistAlbums` merged data)
- Direct video modal (click a video → plays in UniversalModal)
- Discovery strip improvements
- SideNav library badge on all screens
- Patti Smith clusters merged from Justin's branches

### v1.8.5 (IN DEVELOPMENT — current state)

**What's been built (Thursday-Friday, March 26-27):**

1. **UniversalModal routes ALL entities across ALL universes.** The old `openPopover()` bluenote gate is removed. Every entity click goes to `setUniversalModal()`.

2. **Entity-type detection** (`detectEntityType()`) — data-driven classification using `artistAlbumsData` as musician signal, subtitle parsing for places, type field for films/books/TV.

3. **`isMusicEntity` gate** — separates music entities (Spotify pipeline) from non-music entities (video panel). Correct concept, broken execution for edition-suffix albums.

4. **Video entity index integration** — all 5 universe indexes loaded at startup. When entity's `quickViewGroups` is empty, falls back to video entity index with alias resolution.

5. **YTA deep search integration** — live API call for all simple mode entities. Merges with entity index results. Deduplicates by YouTube ID. Sorts by match count.

6. **Split-panel layout for simple mode** — video player left (55%, 352px), scrollable video list right (45%). Expand/collapse button. Gold hover/active styling. Matches Blue Note layout exactly.

7. **Turndown chevrons with analysis content** — tier 1: entity index `key_quotes` (instant, in memory). Tier 2: YTA full analysis via `parseYtaAnalysis.js` markdown parser.

8. **`parseYtaAnalysis.js`** — new utility that parses YTA analysis markdown into `{ quotes, themes, discoveryPlaylists, entities, worksDiscussed, synopsis }`.

9. **`fuzzyAlbumMatch()`** — strips edition suffixes, case-insensitive, partial matching. Used in 6 places throughout the codebase.

10. **Modal stacking** — `modalStack` state. Discovery card clicks push parent, X pops back.

11. **Miscellaneous fixes** — Verified Entity pill deleted, Hotel Chelsea image/badge fixed, Ask bar styling, Zone 3 discovery strip guarded, Blue Note fallback killed for non-Blue Note universes.

---

## 5. THE CURRENT REGRESSION: BLUE NOTE ALBUMS

### What's Broken

~50% of Blue Note album modals show UNKNOWN badge, no Spotify, no tracks. Albums with clean titles that exactly match `BLUENOTE_ALBUMS` keys still work. Albums with Spotify edition suffixes fail.

**Broken examples:**
- "Kind Of Blue" vs "Kind of Blue" (case)
- "Moanin' (Expanded Edition)" vs "Moanin'" (suffix)
- "Birth Of The Cool" vs "Birth of the Cool" (case)
- "A Night At Birdland" vs "A Night at Birdland Volume 1" (different name)
- Songs: "Along Came Betty" — SONG badge, no playback

**Root cause:** The `isMusicEntity` gate blocks these from the Spotify pipeline. `_hasAlbumMatch` uses `fuzzyAlbumMatch()` but still misses some. More fundamentally, **v1.8.4 has NO gate** — the pipeline handles everything.

The gate exists to prevent non-music entities (Rhea Seehorn, Hotel Chelsea) from getting garbage Spotify results. We cannot remove it.

### Failed Approaches (All Reverted)

1. **Remove `if(!useFullMode)` return** — broke albums via `detectEntityType`
2. **`useFullMode = true` → skip `detectEntityType`** — Rhea Seehorn got Wayne Shorter (she passes `useFullMode` via `_hasVideoAnalysis`)
3. **`isMusicEntity` + `fuzzyAlbumMatch`** — partially working, current state
4. **`selectedUniverse === "bluenote"` skip gate** — broke ALL other universes

### The Constraint

- Cannot remove the gate → actors get Spotify
- Cannot use `useFullMode` as the gate → video-analyzed entities get Spotify
- Need: "this is music content" signal that catches edition-suffix albums AND songs by known artists, excluding actors/places in the video entity index

### Key Insight

The harvester `artistAlbumsData` has **431 albums under 44 artists**. `BLUENOTE_ALBUMS` only has **123 albums**. The `isMusicEntity` gate only checks `BLUENOTE_ALBUMS`. If it searched the full harvester catalog, it would catch far more albums. The data is already loaded in memory.

Songs have an `artistHint` prop (e.g., "Along Came Betty" → `artistHint: "Art Blakey"`). The gate could check if `artistHint` is a known musician. This is partially wired but not working.

---

## 6. WHAT'S WORKING ACROSS UNIVERSES

### Cross-Universe Person Modals
- **Rhea Seehorn** (Pluribus) — 36 analyzed videos, split panel, no garbage Spotify
- **Vince Gilligan** (Pluribus) — 34 videos
- **Michael B. Jordan** (Sinners) — 41 videos
- **Ryan Coogler** (Sinners) — rich video analysis

### Cross-Universe Place/Film Modals
- **Hotel Chelsea** (Patti Smith) — 15+ videos from entity index + YTA. PLACE badge. 6 discovery playlists with 29 items from Architectural Digest analysis alone. 11 quotable moments. The showcase entity.
- **Lady Bird** (Gerwig) — FILM badge, A24 trailer content

### The Video Analysis Pipeline
Two data sources, merged and deduplicated:
1. **Video entity index** (pre-computed, on S3) — structured `key_quotes`, entities, timestamps. 815 videos. Loaded at startup, instant access.
2. **YTA deep search** (live API) — catches newer videos not yet in the index. 840+ videos. Returns match counts for relevance sorting.

### The YTA Analysis Parser
`src/utils/parseYtaAnalysis.js` parses the raw markdown analysis files into structured data. Every video J.D. analyzes in YTA flows through this parser to the modal. Sections parsed:
- `## QUOTABLE MOMENTS` → quotes with attribution and editorial context (THE GOLD)
- `## THEMATIC OVERVIEW` → editorial analysis sections (the turndown headings)
- `## DISCOVERY PLAYLIST` → themed cross-media groups (29 items for Hotel Chelsea alone)
- `## ENTITY EXTRACTION` → timestamped entity references (supplementary, not primary)
- `## WORKS DISCUSSED IN THIS VIDEO` → literal works mentioned

---

## 7. WHAT'S STILL BROKEN (beyond the album regression)

| Issue | Status | Priority |
|-------|--------|----------|
| Blue Note album modals (~50%) | BROKEN — `isMusicEntity` gate | **P0** |
| Songs (Along Came Betty) | BROKEN — no playback | **P0** |
| Discovery strip | Empty/wrong for most entities. Discovery playlists from analysis exist but not wired in. | P1 |
| Category chips | All 8 show on every entity instead of relevant ones | P2 |
| [+] indicator | Doesn't match library state (key mismatch) | P2 |
| Turndown content quality | Showing synopses/timestamps instead of best quotes and themes | P2 |
| Wall duplicates | Lady Bird score tracks not collapsing | P2 |
| Content bleeding | Extra content below modal boundary | P3 |
| Ask bar | Should be in two places (bottom + inside KG section) | P3 |

---

## 8. THE VISION — WHERE THIS IS GOING

### The Hotel Chelsea Demo

The Hotel Chelsea modal, powered by the Architectural Digest analysis, would be the single most compelling thing in the entire POC. One Architectural Digest video yielded:
- 6 themed discovery playlists (29 cross-media items: books, albums, songs, films, documentaries, novels, plays)
- 37 timestamped entities (Patti Smith, Bob Dylan, Leonard Cohen, Janis Joplin, Andy Warhol, Sid Vicious, Dylan Thomas)
- 11 quotable moments with editorial context ("The Hotel Chelsea is combination of the Plaza Hotel and a Greyhound bus station", "Some generations beckon in the next", "I fear that I'm the extent of my own haunting now")
- 5 thematic overview sections (Archaeological Dig, Benton's Oklahoma Story, Barter System, Generational Transmission, Parallel Universe)

This is what turns a modal from "here's a Wikipedia bio and some random videos" into an experience that makes someone stay for an hour.

### SML + YTA Integration

Not yet wired but the functions exist in `src/utils/enrichment.js`:
- `searchFilm()`, `enrichFilm()`, `getMovieDetails()`, `findTrailer()` — TMDB data for films
- `enrichPerson()`, `searchPerson()` — TMDB person data with filmography
- `searchBook()`, `enrichBook()` — Google Books data

When wired: film modals get posters, trailers, cast with headshots, critic scores. Person modals get filmography, profile photos. The enrichment data + YTA analysis + video entity index = complete entity profiles.

### The UMG Story

UMG (Universal Music Group) wants: discovery → engagement → consumption → transactions for **catalog and deep catalog** content. Blue Note Records IS UMG. The demo: user discovers Coltrane through a book about Blue Note covers → watches contextual interview footage → sees related works → builds a playlist → plays music inline. The KG connects everything.

The same infrastructure powers film soundtrack discovery (Sinners, Coogler) and literary discovery (Patti Smith, Just Kids, Hotel Chelsea). Cross-media, cross-universe, all grounded in verified KG data.

---

## 9. KEY FILES AND CODE LOCATIONS

### Main Application
- `src/App.jsx` — ~24,000 lines, ALL components
- `src/PluribusComps.jsx` — mirror copy (must match App.jsx)

### New Files (v1.8.5)
- `src/utils/parseYtaAnalysis.js` — YTA markdown parser
- `src/data/patti-smith-video-entity-index.json` — 1.3MB
- `src/data/sinners-video-entity-index.json` — 11MB
- `src/data/pluribus-video-entity-index.json` — 6MB
- `src/data/greta-gerwig-video-entity-index.json` — 5.7MB

### Key Functions (grep for these, line numbers shift)
```bash
grep -n "fuzzyAlbumMatch" src/App.jsx
grep -n "isMusicEntity" src/App.jsx
grep -n "detectEntityType" src/App.jsx
grep -n "_simpleMode" src/App.jsx
grep -n "useFullMode" src/App.jsx
grep -n "fetchYtaSearch" src/App.jsx
grep -n "buildEntityAliases" src/App.jsx
grep -n "parseYtaAnalysis" src/App.jsx
```

### Version Tracker
- **ONE tracker:** `pocv2-jd-design-reskin-versions.html`
- Full commit log with timestamps, failed approaches documented
- Justin handoff doc linked: `docs/v185-justin-handoff-mar27.md`

### Design Reference
- `docs/universal-modal.html` — 5179 design target (870 lines, Body Snatchers example)

---

## 10. WORKFLOW RULES

1. **ASK → CONFIRM → EXECUTE.** Tell J.D. what you're about to do, wait for approval. No exceptions.
2. **ONE version tracker.** `pocv2-jd-design-reskin-versions.html`. Never create a second one.
3. **Every commit updates the version tracker** with hash and time.
4. **Mirror after every edit.** `cp src/App.jsx src/PluribusComps.jsx`
5. **Build and test after every change.** `npm run build`
6. **Never bump version number** without J.D. telling you to.
7. **Never push** without being explicitly asked.
8. **If cross-universe modals break, REVERT.** Do not fix forward.
9. **Test with canaries:** Rhea Seehorn (Pluribus), Hotel Chelsea (Patti Smith), Michael B. Jordan (Sinners), Blue Train (Blue Note).
10. **Plan mode for 3+ step tasks.** Subagents for research/parallel work.

---

## 11. CREDENTIALS AND KEYS

- **Spotify API:** Client ID + secret in `src/utils/enrichment.js` (see `memory/reference_spotify_credentials.md`)
- **YouTube API:** 15 keys in YTA's `.env.local` (150K units/day)
- **TMDB API:** Key hardcoded in SML (`2dca580c2a14b55200e784d157207b4d`)
- **Broker API:** No auth required, `POST /v2/broker`

---

## 12. COMMIT LOG (v1.8.5)

### Friday, March 27, 2026
- `d735065` — 11:11 PM — END OF DAY: Pushed to origin + jdagogo. Cross-universe modals working. Blue Note album regression unresolved.
- `93e68e3` — 5:08 PM — Fuzzy album matching for BLUENOTE_ALBUMS. Some albums fixed, music/songs still broken.
- `0c132f9` — 2:59 PM — REVERTED failed album path fix. Hotel Chelsea + Sinners working.
- `bbb76de` — 1:10 PM — Fix 3 (WIP): Turndown chevrons, YTA markdown parser, bigger chevrons, Pluribus filter.
- `849cadd` — 10:45 AM — Fix 2: Split-panel layout matching Blue Note exactly.
- `96cd2de` — 10:19 AM — Fix 0 + Fix 1: Kill Verified Entity pill, sort videos by relevance.
- `410c676` — 10:03 AM — Interim: Steps 1-3 + modal stacking + video entity index + YTA deep search.

### Thursday, March 26, 2026
- Development begins on v1.8.5.
