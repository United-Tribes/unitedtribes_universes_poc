# SML + YTA + Books Integration — Revised Architecture

**Date:** Sunday, March 15, 2026
**Revised after J.D. review — original conclusions were wrong.**

---

## What Changed From the First Review

The first review dismissed SML as "not needed" — that was wrong. It evaluated SML only against Blue Note jazz artists and missed the entire film/TV surface:

- Blue Note alone has hundreds of film connections: every Spike Lee/Blanchard collaboration, every documentary, every film that licensed Blue Note music, every biopic
- Sinners has 16 Oscar nominations and a massive film apparatus
- Greta Gerwig IS film (Lady Bird, Little Women, Barbie)
- Pluribus is Apple TV+ with connections to Breaking Bad, Better Call Saul, X-Files
- The curated responses we built yesterday name specific films, documentaries, and people that ALL need TMDB data

**The real insight is caching, not elimination.** Call the API once, cache the result, build a growing local database. Same pattern as YTA's YouTube cache. Same pattern as Justin's Harvester. The database grows as you use the app.

---

## The Three External APIs

| API | What It Provides | Key Required? | For Which Entities? |
|-----|-----------------|---------------|-------------------|
| **TMDB** (via SML logic) | Film posters, cast headshots, crew, trailers, review scores, images | Yes (TMDB_API_KEY) | Films, documentaries, TV shows, actors, directors — hundreds across all universes |
| **YouTube Data API** (via YTA) | Video search, playlist/soundtrack search, entity-aware music lookup | Yes (15 keys in YTA) | Albums, tracks, interviews, performances, trailers — everything playable |
| **Google Books API** | Cover images, ISBNs, descriptions, purchase links, publisher info | No (basic search is free) | Books, memoirs, biographies — 40+ in Blue Note alone, more across universes |

---

## Architecture: One Cache, Multiple Data Sources

```
┌──────────────────────────────────────────────────────┐
│ POC (port 5174)                                       │
│                                                       │
│ src/utils/tmdb.js (~300-400 lines)                    │
│   searchFilm(title, year) → poster, cast, scores     │
│   getMovieDetails(tmdbId) → full metadata             │
│   getPersonDetails(name) → headshot, filmography      │
│   getMovieImages(tmdbId) → stills, backdrops          │
│   All functions: check cache first → API fallback     │
│                  → save result to cache                │
│                                                       │
│ src/utils/books.js (~150-200 lines)                   │
│   searchBook(title, author) → cover, ISBN, desc       │
│   All functions: check cache first → API fallback     │
│                  → save result to cache                │
│                                                       │
│ src/data/enrichment-cache.json (grows over time)      │
│   { "tmdb": { "round-midnight-1986": {...} },         │
│     "books": { "blue-note-biography-cook": {...} },   │
│     "youtube": { ... } }                              │
│   Pre-warmed before demo, grows during use            │
│                                                       │
│ Vite proxy to YTA:                                    │
│   /api/yta/* → localhost:3002/*                       │
│                                                       │
│ .env:                                                 │
│   TMDB_API_KEY=...                                    │
│   (YouTube keys managed by YTA)                       │
│   (Google Books needs no key)                         │
├──────────────────────────────────────────────────────┤
│ YTA (port 3002) — ONE external service                │
│                                                       │
│ Existing:                                             │
│   YouTube entity-aware search (15 keys, rotation)     │
│   YouTube cache with manual override                  │
│   Deep search across 836 analyzed videos              │
│   Entity resolution with alias expansion              │
│   API key quota management + status                   │
│                                                       │
│ New (ported from SML):                                │
│   YouTube playlist/soundtrack search                  │
│   (uses YTA's 15-key rotation instead of SML's 3)    │
└──────────────────────────────────────────────────────┘
```

**Result: Two terminals. One cache. Three APIs. Growing database.**

---

## SML Routes — What Gets Ported Where

| SML Route | Lines | Port To | Why |
|-----------|-------|---------|-----|
| `/api/search` (TMDB+OMDB) | ~200 | POC `src/utils/tmdb.js` | Film/TV search across all universes |
| `/api/movie-details` (TMDB+OMDB+IMDb) | ~300 | POC `src/utils/tmdb.js` | Cast, crew, scores, full metadata |
| `/api/movie-images` (TMDB) | ~150 | POC `src/utils/tmdb.js` | Posters, stills, backdrops |
| `/api/person-search` (TMDB) | ~80 | POC `src/utils/tmdb.js` | Actor/director headshots, filmography |
| `/api/youtube-trailer` | ~100 | YTA (new route) | Quality-scored trailer search, uses YTA's keys |
| `/api/youtube-playlist` | ~200 | YTA (new route) | Soundtrack/score playlist search, uses YTA's keys |
| `/api/critic-scores` | ~150 | POC `src/utils/tmdb.js` | RT/Metacritic scores (scraping) |
| `/api/youtube-metadata` | ~80 | YTA (already has this capability) | Video metadata |
| `/api/tv-soundtrack` | ~200 | Defer | Episode-specific soundtracks, nice-to-have |
| `/api/extract-entities` | ~100 | Not needed | Claude AI entity extraction, broker API handles this |
| `/api/followup` | ~50 | Not needed | Follow-up questions, already in POC |
| `/api/media` | ~80 | Not needed | Local DB operations for SML's own logging |
| `/api/imdb-refresh` | ~100 | Defer | IMDb scraping, movie-details already covers this |
| `/api/imdb-awards` | ~80 | Defer | Award data, nice-to-have |
| `/api/metacritic-refresh` | ~100 | Merged into critic-scores | Redundant with critic-scores |
| `/api/rt-refresh` | ~100 | Merged into critic-scores | Redundant with critic-scores |

**SML eliminated as a running service. Its capabilities live on in the POC and YTA.**

---

## The Cache Layer — One System, Three Sources

### Design

```javascript
// src/utils/enrichment-cache.js

// Cache lives in localStorage (browser) + optional JSON file for pre-warming
// Key format: "{source}:{type}:{normalized-title}"
// Examples:
//   "tmdb:film:round-midnight-1986"
//   "tmdb:person:dexter-gordon"
//   "books:title:blue-note-biography"
//   "youtube:playlist:blue-train-soundtrack"

const CACHE_KEY = "ut_enrichment_cache";

function getCached(source, type, key) { ... }
function setCache(source, type, key, data) { ... }
function preWarmFromJSON(jsonData) { ... }  // Load pre-warmed data on app start
```

### Cache Behavior
- **Check cache first** — every lookup hits local cache before any API call
- **Cache on success** — every successful API result is cached immediately
- **Pre-warm before demo** — run a script that looks up every entity in the curated responses and saves results to `enrichment-cache.json`
- **Growing database** — as people use the app, new entities get cached automatically
- **Manual override** — bad results can be corrected (same pattern as YTA's YouTube cache)
- **No expiration during demo week** — cache entries persist until manually cleared

### Pre-Warm Entities (Blue Note curated responses alone)

**Films needing TMDB data (from film/TV curated response + broader Blue Note):**
- 'Round Midnight (1986) — Dexter Gordon, Herbie Hancock
- Les Liaisons Dangereuses (1960) — Art Blakey
- Blue Note Records: Beyond the Notes (2018)
- It Must Schwing! The Blue Note Story (2018)
- I Called Him Morgan (2016) — Netflix
- Confess, Fletch (2022)
- Straight, No Chaser (1988) — Monk documentary
- Blue Note: A Story of Modern Jazz (1997)
- Malcolm X (1992) — Blanchard/Spike Lee
- Clockers (1995)
- 25th Hour (2002)
- Inside Man (2006)
- BlacKkKlansman (2018)
- Da 5 Bloods (2020)
- When the Levees Broke (2006)
- My Blueberry Nights (2007) — Norah Jones
- Fargo Season 4 (Blakey's "Moanin'" licensed)
- Sex Education Season 3 (Blakey's "Moanin'" licensed)
- Coup de Chance (2023) — Hancock's "Cantaloupe Island"
- ...and every film that surfaces as users explore

**People needing TMDB data:**
- Dexter Gordon, Herbie Hancock, Terence Blanchard, Art Blakey, Norah Jones, Lee Morgan, Francis Wolff
- Spike Lee, Bertrand Tavernier, Sophie Huber, Kasper Collin, Greg Mottola, Wim Wenders
- Every actor/director connected to Blue Note films
- Across other universes: Ryan Coogler, Michael B. Jordan, Greta Gerwig, Vince Gilligan, Rhea Seehorn...

**Books needing Google Books data (from books curated response):**
- Blue Note Records: The Biography — Richard Cook
- Blue Note: Uncompromising Expression — Richard Havers
- The Cover Art of Blue Note Records — Graham Marsh & Glyn Callingham
- Thelonious Monk: The Life and Times — Robin D.G. Kelley
- John Coltrane: His Life and Music — Lewis Porter
- Coltrane: The Story of a Sound — Ben Ratliff
- A Love Supreme — Ashley Kahn
- Saxophone Colossus — Aidan Levy
- Miles: The Autobiography — Miles Davis
- Kind of Blue — Ashley Kahn
- Possibilities — Herbie Hancock
- Sophisticated Giant — Maxine Gordon
- Footprints — Michelle Mercer
- Wail: The Life of Bud Powell — Peter Pullman
- Let's Get to the Nitty Gritty — Horace Silver
- 3 Shades of Blue — James Kaplan
- ...40+ total from the bookshelf data

---

## What YTA Provides That Cannot Be Static

1. **YouTube search with 15-key rotation** — Live API, can't be pre-computed for every possible query
2. **YouTube cache with manual override** — Fix bad results before demo, corrections persist
3. **API key quota management** — Real-time tracking across 15 keys
4. **Deep search across 836 analyzed videos** — "Discussed in 47 videos" with timestamps (indexes are 298 MB + 111 MB, too large for browser)

**CAN be pre-extracted as static JSON for the POC:**
- Entity aliases (4.8 KB — already tiny)
- Blue Note-specific video analyses (extract just the Blue Note-related analyses from the 836)
- Works & Discovery Playlists from analysis.md files (the expansion ratio data)

---

## Build Sequence

### Step 1: Vite Proxy for YTA (~15 min)
Wire `/api/yta/*` → `localhost:3002/*` in vite.config.js. Start YTA in one terminal. Verify from browser console.

### Step 2: TMDB Utility Module (~2 hours)
Port SML's TMDB functions into `src/utils/tmdb.js`:
- `searchFilm(title, year)` — search + basic metadata
- `getMovieDetails(tmdbId)` — full cast, crew, scores, videos
- `getPersonDetails(name)` — headshot, known-for credits
- `getMovieImages(tmdbId)` — posters, stills, backdrops
- All with cache-first pattern using `enrichment-cache.json`

### Step 3: Google Books Utility (~1 hour)
Build `src/utils/books.js`:
- `searchBook(title, author)` — cover image, ISBN, description, page count, publisher
- Same cache-first pattern, same `enrichment-cache.json`
- Google Books API is free for basic search, no key needed

### Step 4: Port YouTube Playlist to YTA (~1 hour)
Move SML's `/api/youtube-playlist` logic into YTA as a new route, using YTA's 15-key rotation instead of SML's 3 hardcoded keys.

### Step 5: Pre-Warm Cache (~1 hour)
Build a script that:
- Reads all films from the curated responses filmography data
- Reads all books from the bookshelf data
- Reads all people from keyFigures data
- Calls TMDB and Google Books for each
- Saves everything to `enrichment-cache.json`
- By demo day, every entity in the curated responses loads instantly from cache

### Step 6: Wire Into Modal (~3-4 hours)
When an entity is clicked in the modal/RWL strip:
- Films → check cache → TMDB fallback → show poster, cast, trailer, scores, purchase options
- Books → check cache → Google Books fallback → show cover, description, purchase options
- Music → check cache → YTA youtube-search fallback → show playable video
- Articles (NYT, etc.) → show as purchasable item with publication badge

---

## The Result

- **Two terminals:** POC (5174) + YTA (3002)
- **Three external APIs:** TMDB (in POC), Google Books (in POC), YouTube (in YTA)
- **One growing cache:** `enrichment-cache.json` + YTA's `youtube-url-cache.json`
- **Pre-warmed for demo:** Every entity in the curated responses cached before Tuesday
- **Graceful degradation:** If YTA is down, static data works. If TMDB is slow, cache serves. Live APIs are for discovery, not the primary path.
- **SML eliminated as a service** — its guts live in `src/utils/tmdb.js` inside the POC

---

## Entities to Pre-Warm (Blue Note Only — Other Universes Add More)

### Films (~20+ to start, grows)
'Round Midnight, Les Liaisons Dangereuses, Beyond the Notes, It Must Schwing!, I Called Him Morgan, Confess Fletch, Straight No Chaser, Blue Note: A Story of Modern Jazz, Malcolm X, Clockers, 25th Hour, Inside Man, BlacKkKlansman, Da 5 Bloods, When the Levees Broke, My Blueberry Nights, Fargo S4, Ken Burns Jazz

### People (~30+ to start)
Dexter Gordon, Herbie Hancock, Terence Blanchard, Art Blakey, Norah Jones, Lee Morgan, Francis Wolff, Spike Lee, Bertrand Tavernier, Sophie Huber, Kasper Collin, Greg Mottola, Wim Wenders, Don Was, Alfred Lion, Reid Miles, Bruce Lundvall, Rudy Van Gelder, John Coltrane, Miles Davis, Thelonious Monk, Wayne Shorter, Horace Silver, Freddie Hubbard, Bobby Timmons, Cedar Walton, Curtis Fuller, Robert Glasper, Madlib, DJ Premier

### Books (~40+ to start)
All titles from the bookshelf data in the curated books response

### Albums (~118 already in blueNoteAlbums.json)
Spotify IDs already cached. YouTube playlists need YTA search.
