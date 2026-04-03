# Session Report: April 1-2, 2026

## Summary

Two days of pipeline hardening, data quality fixes, and modal consistency work. The key theme: **making the data pipeline resilient so S3 updates don't break the POC**. Several issues JD flagged (Sinners query hanging, episodes disappearing, wrong entity images) have been fixed at the root cause level.

---

## 🚨 S3 Data Stability — Addressing the Cron Problem

JD's automated S3 pull cron was breaking the app because upstream data changes introduced regressions. Here's what we fixed to stabilize S3 data:

### Problem 1: Sinners/Pluribus queries hang forever
**Root cause:** The assembler was outputting anchor keys in lowercase (`"sinners"`, `"pluribus"`) but `UNIVERSE_ANCHORS` in App.jsx expects capitalized (`"Sinners"`, `"Pluribus"`). ThinkingScreen waited for `entities["Sinners"]` which never existed.

**Fix (data + code):**
- Fixed manifest anchors and entity names → re-assembled → re-uploaded to S3
- Added `findEntityByName()` helper in App.jsx (line ~4098) that does case-insensitive entity lookup as a safety net
- **The code fix means future casing mismatches won't hang** — the app is now resilient to this class of problem

**Files changed:**
- `src/App.jsx` — `findEntityByName()` helper, used in ThinkingScreen guard and `handleQuerySubmit` data-ready check
- S3: `sinners-universe.json`, `pluribus-universe.json` — anchor keys now capitalized

### Problem 2: Episodes disappear on re-assembly
**Root cause:** `buildEpisodes()` in the assembler required KG `episode_of` relationships that were manually seeded. Re-harvesting the Pluribus anchor wiped them. The assembler then produced `episodes: []`.

**Fix (assembler):**
- `buildEpisodes()` now falls back to building episodes from `tmdb-episodes.json` when KG rels are missing
- Hardcoded episode titles (TMDB doesn't have them for Pluribus): We Is Us, Pirate Lady, Grenade, etc.
- **Episodes now survive any re-harvest or re-assembly**

**Files changed:**
- `harvester/lib/assemblers/response.mjs` — TMDB fallback in `buildEpisodes()`
- S3: `pluribus-response.json` — now has all 9 episodes with directors, stills, cast

### Problem 3: Entity data regressions on re-assembly
**Several assembler improvements prevent data loss:**
- Entity alias resolution (`data/entity-aliases.json`) — canonical name mapping for duplicates (Lenny Kay→Kaye, William Burroughs→William S. Burroughs)
- Enhanced `cleanEntityName()` — strips more KG suffix patterns
- Composite entity noise filter — removes long KG relationship chain artifacts (e.g. "Vince Gilligan tv-series - Breaking Bad - ...")
- `personSubtitle()` rewrite — uses manifest category instead of defaulting everyone to "Actor"

### Recommendation for JD's cron
The S3 data is now more stable. The specific issues that were breaking the app (casing, episodes) have been fixed at the assembler/code level. **The cron can stay enabled** as long as:
1. It pulls both `-universe.json` and `-response.json` together (not one without the other)
2. The app uses `findEntityByName()` for anchor lookups (already in place)
3. JD doesn't need to worry about episode data — it's now self-healing

If further issues arise, the `findEntityByName` pattern can be extended to other lookups.

---

## 📊 Data Quality Fixes (Enriched Catalog)

### File: `src/data/enriched-content-catalog.json`
This is the master content catalog (14,427 items). It lives on S3 and is loaded by the POC via both static import and `UTDataClient` S3 fetch.

**Spotify artist validation:**
- Added `artistMatches()` function to the enricher — validates that Spotify search results match the item's creator
- Batch-validated all 6,820 existing Spotify track matches against the Spotify API
- **Stripped 2,393 wrong matches** (e.g., Gloria by Patti Smith was showing Sam Smith's album art)
- Re-enriched 810 items with correct, validated Spotify data
- The validation is now permanent — future enrichment runs will never match wrong artists

**Specific entity fixes:**
- **EPiC**: Was mapped to Disney's animated film "Epic" (2013). Now correctly mapped to Baz Luhrmann's "Elvis Presley in Concert" (2026). TMDB ID 1445363, correct poster, trailers, overview, year. Added `TMDB_ID_OVERRIDES` mechanism in the harvester to prevent re-match.
- **Gloria by Patti Smith**: Sam Smith album data stripped, replaced with correct Spotify track (Horses album, track ID `40P5fjk0H3Zo7yBW9zQbBR`)
- **Entity type classifications**: EPiC changed from "tv-series" to "film" in type override files

**Content catalog dedup:**
- Updated `makeContentKey()` to strip years anywhere in titles (not just trailing) and noise suffixes (trailer, analysis, scene, etc.)
- 45 duplicate groups will auto-merge on next catalog rebuild
- Affects: `harvester/scripts/build-content-catalog.mjs` and `enrich-content-catalog.mjs`

---

## 🎵 Modal Consistency (App.jsx)

### The Problem
Songs, albums, and books were launching different modals depending on where you clicked them. Some opened the enriched catalog modal (correct), others opened the UniversalModal with KG data (wrong layout, no playback).

### What Changed in App.jsx

**Enriched catalog modal is now type-aware (lines ~2098-2402):**
- **Type badge** in header: SONG (green), FILM (purple), BOOK (blue), ALBUM (green)
- **Creator attribution**: "by" for songs/albums, "Written by" for books, "Directed by" for films
- **Left panel**: YouTube first when available (all types), Spotify embed fallback for songs/albums without video
- **Transaction badges** (Apple TV+, Criterion): hidden for non-film types
- **Description fallback**: TMDB overview → Open Library description → category label
- **Poster image**: removed `height: 100%` that caused thin border line below album art

**Routing fixes to ensure all content types reach the enriched modal:**
- `ENRICHED_MODAL_TYPES` expanded: now includes `song`, `composition`, `album`, `book`, `novel`, `memoir`, `poem`, `play` (was film/TV only)
- `autoEnrichEntity()` gate fixed: was rejecting items without TMDB/YouTube data. Now accepts Spotify track/album IDs and Open Library covers
- `onNavigate()` accepts `catalogItemOverride` parameter — song click handlers pass the catalog item directly so it can't be lost by `autoEnrichEntity` re-lookup
- **Enriched catalog intercept** in the UniversalModal useEffect (line ~1485): before the harvester pipeline runs, checks if the entity is a song/album/book in the enriched catalog. If found, sets `enrichedModalItem` and returns early. This catches ALL entry points.
- Edition suffix stripping in `autoEnrichEntity` — "Sketches Of Spain 50th Anniversary (Legacy Edition)" now matches "Sketches of Spain" in the catalog

**3 song click handlers updated** (lines ~2333, ~2950, ~3740): all now use `onNavigate(title, null, catalogItem)` pattern instead of setting `enrichedModalItem` separately

### What This Means for JD
- Songs in any universe (Sinners, Patti Smith, Pluribus, Blue Note) now consistently open the enriched catalog modal with Spotify embed and/or YouTube video
- Films still look exactly the same as before
- Albums route to the enriched catalog modal instead of the harvester full-mode player
- The UniversalModal's KG-based layout is now only used for person/artist/place entities — not for content items

---

## 📁 Files Changed (POC Repo)

### Code
| File | Changes |
|------|---------|
| `src/App.jsx` | `findEntityByName` helper, modal consistency (type-aware enriched modal, routing fixes, `ENRICHED_MODAL_TYPES`, `autoEnrichEntity` gate, enriched catalog intercept, song click handlers, poster image fix) |
| `src/PluribusComps.jsx` | Mirror of App.jsx |

### Data (updated on S3 and in `src/data/`)
| File | Changes |
|------|---------|
| `src/data/sinners-universe.json` | Anchor key "Sinners" (was "sinners") |
| `src/data/sinners-response.json` | Re-assembled |
| `src/data/pluribus-universe.json` | Anchor key "Pluribus" (was "pluribus"), composite entities removed |
| `src/data/pluribus-response.json` | 9 episodes restored via TMDB fallback |
| `src/data/enriched-content-catalog.json` | 2,393 bad Spotify matches stripped, EPiC fixed, Gloria fixed |
| `src/data/all-video-entity-index.json` | EPiC entity type fixed |

---

## 📁 Files Changed (Harvester Repo)

### Enrichment Pipeline
| File | Changes |
|------|---------|
| `harvester/scripts/enrich-content-catalog.mjs` | `artistMatches()` validation in Spotify phase, `BLOCKED_YOUTUBE_IDS`, broader soundtrack search (5-7 queries), dedup key improvements |
| `harvester/scripts/build-content-catalog.mjs` | `makeContentKey()` strips years anywhere + noise suffixes |
| `harvester/lib/enrichers.mjs` | `TMDB_ID_OVERRIDES` map (EPiC → correct TMDB ID) |

### Assembler
| File | Changes |
|------|---------|
| `harvester/assemble.mjs` | Entity alias resolution from `entity-aliases.json`, enhanced `cleanEntityName`, composite entity noise filter, `deduplicateEntities` improvements |
| `harvester/lib/assemblers/entity.mjs` | `personSubtitle()` rewrite — category-first, not TMDB "Actor" default |
| `harvester/lib/assemblers/response.mjs` | `buildEpisodes()` TMDB fallback with hardcoded episode titles |

### Data
| File | Changes |
|------|---------|
| `data/entity-aliases.json` | NEW — canonical name mappings (Lenny Kay→Kaye, Hotel Chelsea variants, etc.) |
| `data/universes/sinners/manifest.json` | Anchor "Sinners", entity name casing |
| `data/universes/pluribus/manifest.json` | Anchor "Pluribus", entity name casing |
| `data/universes/gerwig/manifest.json` | EPiC added as T2 influence |
| `data/universes/gerwig/enriched.json` | EPiC full TMDB enrichment (ratings, runtime, genres) |

---

## 🔜 In Progress / Next Up

### Soundtrack Track Linking (started)
- Building `link-soundtrack-tracks.mjs` — cross-references film soundtrack album IDs with artist-albums.json to get per-track YouTube video IDs
- Then fetches Spotify album tracks for soundtracks missing track data
- Goal: every film modal shows a playable soundtrack with YouTube buttons per track

### Known Issues (not yet fixed)
- **Song-to-content mismatches**: "Sly" by Herbie Hancock shows wrong YouTube video and Sly Stone content in Songs tab. Entity name matching is too broad — needs artist-scoping.
- **KG response entity links**: Partial title matches (e.g., clicking "The Jazz Messengers in Concert" opens "In Concert" by Janis Joplin). Entity link extraction needs full-title matching.
- **1,175 items with stale piggybacked Spotify data**: Items enriched via YouTube search that had Spotify data added before artist validation. Need batch re-validation.
- **Songs without YouTube**: Some songs (Gloria, Dancing Barefoot) only have Spotify — YouTube data was lost during cleanup. Lower priority since Spotify fallback works.

---

## Git Branches

Both repos: `justin/apr-2-pipeline-and-modal-fixes`
- Harvester: 1 commit (pipeline + assembler + data)
- POC: 1 commit (modal consistency + data files)
