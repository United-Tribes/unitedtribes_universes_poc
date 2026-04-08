# Claude Code Session Handoff — April 2, 2026

## Overview

J.D. Heilprin is developing the UnitedTribes POC — an AI-powered cross-media discovery platform demonstrating connections between music, film, TV, books, people, and places across 5 universes (Blue Note, Pluribus, Sinners, Patti Smith, Greta Gerwig). The app is a single-file React application (`src/App.jsx`, ~25K+ lines) with all inline styles, running on Vite.

There are currently **6 applications running on different ports**, plus a **cron job** refreshing S3 data 3x daily. Three of these ports (5173, 5174, 5175) are different versions of the same UnitedTribes POC for comparison testing.

---

## Where Everything Lives

### Key Documents
| Document | Location |
|----------|----------|
| **This handoff** | `~/Desktop/unitedtribes-pocv2-jd/docs/handoff-april2-2026.md` |
| **Version tracker** (THE single source of truth) | `~/Desktop/unitedtribes-pocv2-jd/pocv2-jd-design-reskin-versions.html` |
| **S3 data guide** | `~/Desktop/unitedtribes-pocv2-jd/docs/s3-data-guide-march-31-2026.md` |
| **S3 data drift report** | `~/Desktop/unitedtribes-pocv2-jd/docs/s3-data-drift-april1-2026.md` |
| **v1.8.6 release notes** | `~/Desktop/unitedtribes-pocv2-jd/release-notes-v1.8.6-march-30-2026.md` |
| **Justin's v1.8.7 email** | `~/Desktop/unitedtribes-pocv2-jd/email-justin-v187-march-31-2026.md` |
| **Justin's session report (14 commits)** | `~/Desktop/unitedtribes-pocv2-jd/email-justin-v187-march-31-2026.md` (also in Justin's email Apr 1) |
| **Justin's v1.8.6 patch email** | `~/Desktop/unitedtribes-pocv2-jd/email-justin-v186-patch-march-30-2026.md` |
| **S3 Data Guide (full schemas)** | `~/Desktop/unitedtribes-pocv2-jd/docs/s3-data-guide-march-31-2026.md` — complete file map, data dictionaries, content item schema, entity index schema, lookup patterns |
| **CLAUDE.md** | `~/Desktop/unitedtribes-pocv2-jd/CLAUDE.md` — architecture guide, screen details, data architecture, conventions |
| **Claude Code memory** | `~/.claude/projects/-Users-j-d-heilprin/memory/MEMORY.md` — index of all memory files |

### GitHub Repositories
| Remote | URL | Notes |
|--------|-----|-------|
| `origin` | `https://github.com/United-Tribes/unitedtribes_universes_poc.git` | Main org repo |
| `jdagogo` | `https://github.com/jdagogo/unitedtribes-pocv2-jd-design-reskin.git` | J.D.'s personal backup |

### Branches on GitHub
| Branch | What | Status |
|--------|------|--------|
| `main` | v1.8.6 patched | Stable baseline on 5173 |
| `jd/design-reskin-v3` | v1.8.8.1 | Pushed Apr 1 — J.D.'s dev branch |
| `justin/data-client-integration` | v1.8.7 + 14 commits | Justin's feature branch, testing on 5175 |

---

## Port Map — All Running Applications

### Port 3002 — YouTube Transcript Analysis (YTA)
- **Repo:** `~/youtube-transcript-analysis/`
- **Branch:** `v3.3.4-internal-playback`
- **Version:** v3.3.6 (commit `66e9d86`)
- **Remote:** `jdagogo/youtube-transcript-analysis`
- **What it is:** Video analysis tool — ingests YouTube videos, transcribes via Whisper, extracts entities, builds a data lake of 840+ video analyses. These analyses are the SOURCE DATA for the UnitedTribes enriched content catalog. Every item in the enriched catalog traces back to a YTA analysis.
- **Start:** `cd ~/youtube-transcript-analysis && npm run dev -- -p 3002`
- **15 YouTube API keys** (150K units/day), `.env.local` NOT in git
- **Key features:** Deep Search, universal embedded player, ingestion pipeline, Whisper transcription, entity extraction, data lake
- **Data location:** `~/Desktop/my-claude/podcast-test/youtube-analysis-viewer/data/videos/` (772 folders)
- **Version tracker:** `version-control.html` in repo root

### Port 3004 — UnitedTribes Fresh (Book Analysis POC)
- **Repo:** `~/Desktop/my-claude/united-tribes-fresh-v4/`
- **Branch:** `v4.5.1-development`
- **Version:** v4.5.1 (commit `3e8f4e8`, Dec 1, 2025)
- **Remote:** `jdagogo/unitedtribes-book-analysis-poc`
- **What it is:** Interactive literary pages (Blue Note covers, Patti Smith "Just Kids", Merle Haggard), AI-enhanced discovery modals, YouTube search integration, HarperCollins book integration, playlist player. 18 interactive literary pages.
- **Stack:** React 18 + TypeScript + Tailwind + Express + Vite + SQLite
- **Start:** `cd ~/Desktop/my-claude/united-tribes-fresh-v4 && npm run dev` (PORT=3004 is already set in package.json dev script)
- **Stable rollback:** v4.5 at `v4.5-STABLE-ROLLBACK` tag
- **Version tracker:** `version-control.html`
- **Also at:** `~/Desktop/my-claude/united-tribes-fresh/` (older `main` branch clone)

### Port 3006 — Smart Media Logger (SML)
- **Repo:** `~/smart-media-logger/`
- **Branch:** `v1.9.5-unified-preview`
- **Version:** v1.9.5-alpha (commit `6f3b2c8`, Feb 11, 2026)
- **Remote:** `jdagogo/smart-media-logger`
- **What it is:** Media logging tool with search, preview, 6-step logging workflow, queue, library, music/soundtrack browser. Demonstrates UnitedTribes' consumption transaction model — the "add to library" and "rent/purchase" paradigm that the POC's transaction badges reference.
- **Relevance to POC:** SML proves the rendering patterns that the catalog modal uses. The `getMovieDetails()` function in SML's enrichment.js returns cast with headshots, crew, runtime, genres, ratings — data we want in the catalog modal's "More from the Knowledge Graph" section.

### Port 5173 — UnitedTribes POC v1.8.6 (Main Baseline)
- **Repo:** `~/Desktop/unitedtribes_universes_poc/`
- **Branch:** `main` at `39203ab`
- **Version:** v1.8.6 patched (shipped Mar 30, 2026, patched 2:52 AM with video discovery search)
- **What it is:** The STABLE BASELINE. Everything that works here is the gold standard. When something is broken on 5174 or 5175, check 5173 first — if it works there, we have a regression.
- **Start:** Already running. If needed: `cd ~/Desktop/unitedtribes_universes_poc && npm run dev -- --port 5173`
- **What works here that's broken on 5174:** Pluribus episodes (9), Hotel Chelsea entity detail, all universe queries complete without hanging, correct modal sizes (960px for full mode), discovery strip film cards open correctly
- **What 5174 has that 5173 doesn't:** Discover & Add search, enriched catalog modal, discovery chevron, artist image fallback, S3 refresh button, enriched catalog at startup

### Port 5174 — UnitedTribes POC v1.8.8.1 (J.D.'s Development Branch)
- **Repo:** `~/Desktop/unitedtribes-pocv2-jd/`
- **Branch:** `jd/design-reskin-v3` — local HEAD at `fee1eec` (includes version tracker update after push)
- **Version:** v1.8.8.1 — pushed to `origin/jd/design-reskin-v3` + `jdagogo` at `cd961fc` (Apr 1, 10:05 PM). Local has additional commits after push (version tracker, S3 pull).
- **What it is:** J.D.'s active development build. Has v1.8.6 features + v1.8.7 new features + v1.8.8 regression fixes. Many improvements but also regressions being actively fixed.
- **Start:** Already running. If needed: `cd ~/Desktop/unitedtribes-pocv2-jd && npm run dev -- --port 5174`
- **NOT pushed to main** — main still has v1.8.6
- **Version tracker:** `pocv2-jd-design-reskin-versions.html` (THE single source of truth — NEVER create a second one)
- **Key files to know about:**
  - `src/App.jsx` — THE application (~25K lines, single file, all components, all inline styles)
  - `src/PluribusComps.jsx` — MUST be identical mirror of App.jsx (for Claude chat artifacts)
  - `pull-data.sh` — S3 data pull script (~39 files)
  - `src/data/` — all JSON data files from S3
  - `docs/` — handoff docs, S3 guides, data drift reports, release notes

### Port 5175 — Justin's Feature Branch (Testing)
- **Repo:** `~/Desktop/unitedtribes-justin-compare/`
- **Branch:** `justin/data-client-integration` (14 commits on top of v1.8.7)
- **Version:** v1.8.7+justin
- **What it is:** Justin's modal routing overhaul and data enrichment fixes. Cloned fresh from GitHub on Apr 1. Being tested against 5174 before any merge decision.
- **Start:** `cd ~/Desktop/unitedtribes-justin-compare && node node_modules/vite/bin/vite.js --port 5175`
- **IMPORTANT: Stub files were created** because Justin's branch imports components not pushed to GitHub:
  - `src/components/content/TestPage.jsx` (empty stub)
  - `src/components/content/index.jsx` (exports ResponseHeader, NarrativeSection as null)
  - `src/components/visualization/TestPage.jsx` (empty stub)
  - `src/components/visualization/index.jsx` (exports UniverseNetwork, ThemesNetwork, NetworkGraph, fetchQueryGraph as null/noop)
  - `src/components/visualization/adapters.jsx` (exports MOCK_NODES, MOCK_EDGES as empty arrays)
  - `src/components/visualization/constants.jsx` (exports UNIVERSE_TYPES, REL_COLORS as empty objects)
  - `src/components/SoundtrackPlayer.jsx` (empty stub)
- **These stubs mean:** Any features that depend on these components will render as nothing. The core App.jsx functionality should work.

---

## S3 Data Architecture — Complete Reference

### Base URL
```
http://unitedtribes-visualizations-1758769416.s3-website-us-east-1.amazonaws.com/universe-data/
```
Public read, no credentials needed. Browser `fetch()` works directly (no CORS issues).

### Data Explorer (Justin's browser-based tool)
```
http://unitedtribes-visualizations-1758769416.s3-website-us-east-1.amazonaws.com/data-explorer/index.html
```
Use this to verify what's actually on S3. It searches differently than our app — notably, it uses same-title sibling search for artwork (if "Just Kids" the book has no image, it borrows from "Just Kids" the film).

### Complete File Map (~39 files pulled by pull-data.sh)

**Global Data Files:**
| File | Size | Items | Description |
|------|------|-------|-------------|
| `enriched-content-catalog.json` | ~24MB | **~14,427** (fluctuates — was 16,267 on Mar 29, 16,018 on Mar 30, 14,427 on Apr 1. This is a moving target as Justin runs cleanup/dedup/enrichment passes.) | Every content item from 822 video analyses with YouTube/TMDB/Spotify/OpenLibrary enrichment |
| `all-video-entity-index.json` | ~38MB | 822 videos, 11,377 entities | Reverse-lookup: entity→videos or video→entities with timestamps, key quotes, synopses |
| `album-entity-registry.json` | ~240KB | — | Album title → artist mapping for entity linking |
| `venue-entity-registry.json` | ~15KB | — | Venue name → entity data |

**Per-Universe Core Files (×5 universes: bluenote, gerwig, pattismith, pluribus, sinners):**
| File | Description |
|------|-------------|
| `{universe}-universe.json` | Entity cards — all entities with type, subtitle, poster, stats, media links, collaborators, graph data |
| `{universe}-response.json` | Discovery groups, songs, episodes, editorial themes |
| `artist-albums.json` | Spotify-verified albums with tracks, YouTube playlists, cover art (1,148 albums total, 1,126 unique) |
| `poc-artists.json` | Curated artist list for this universe |

**Per-Universe Additional Files:**
| File | Universe | Description |
|------|----------|-------------|
| `ludwig-goransson-scores.json` | sinners | Film score track listings |
| `raphael-saadiq-catalog.json` | sinners | Raphael Saadiq discography |
| `dave-porter-scores.json` | pluribus | Dave Porter score tracks |
| `thomas-golubic-supervised.json` | pluribus | Music supervisor selections |
| `theme-enrichment.json` | pluribus | Theme-to-video mappings |
| `mark-ronson-catalog.json` | gerwig | Mark Ronson discography |
| `jon-brion-scores.json` | gerwig | Jon Brion score tracks |
| `alexandre-desplat-scores.json` | gerwig | Alexandre Desplat score tracks |
| `rudy-van-gelder-albums.json` | bluenote | 88 Rudy Van Gelder albums |
| `curated-enrichment.json` | pattismith | Manual enrichment overlay |

**Per-Universe Video Indexes:**
| File | Videos |
|------|--------|
| `video-indexes/blue-note-video-entity-index.json` | 96 |
| `video-indexes/pluribus-video-entity-index.json` | 131 |
| `video-indexes/sinners-video-entity-index.json` | 184 |
| `video-indexes/patti-smith-video-entity-index.json` | 36 |
| `video-indexes/greta-gerwig-video-entity-index.json` | 107 |

### Key Schemas

**enriched-content-catalog.json — Content Item:**
```
title, creator, type, videoCount, sources[],
spotify{track_id, album_id, url, album_art_url},
youtube{video_id, title, channel, thumbnail},
tmdb{id, poster_url, overview, year, videos[]},
openLibrary{cover_url} ← NEW: 667 books have covers
```
- `sources[].video_id` → join key to all-video-entity-index
- `sources[].section` → "works_discussed" or "discovery_playlist"
- Content types: song, film, album, tv-series, documentary, book, episode, play, podcast, composition, poem, musical, novel

**all-video-entity-index.json — Dual Lookup:**
- `videos[video_id]` → title, channel, synopsis, key_quotes[], themes[], entities[], entity_count
- `entities["Entity Name"]` → total_videos, videos[] with appearances[], related_quotes[], synopsis

**artist-albums.json:**
- `artists["artist-slug"]` → name, spotify_id, spotify_artist_id, image_url, albums[]
- Each album: title, spotify_album_id, album_art_url, youtube{video_id}, youtube_playlist{playlist_id}, tracks[]
- Each track: name, track_number, spotify_track_id, youtube_video_id, duration_ms
- **IMPORTANT:** `spotify_artist_id` and `image_url` on each artist — these are used as fallbacks when universe.json doesn't have them

### Data Lookup Patterns
- **Entity → all videos mentioning them:** `allVideoIndex.entities[entityName]`
- **Video → all content from it:** filter enriched catalog where `sources[].video_id === vid`
- **Content item → all JD videos discussing it:** read item's `sources[]`, look up each `video_id` in index
- **Most-discussed content:** sort enriched catalog by `videoCount` descending
- **Artwork fallback chain (matches Justin's data explorer):** `tmdb.poster_url` → `openLibrary.cover_url` → `youtube.thumbnail` → `spotify.album_art_url` → then search same-title siblings

### pull-data.sh
Located at `~/Desktop/unitedtribes-pocv2-jd/pull-data.sh`. Run manually: `bash pull-data.sh` from repo root.

### Cron — DISABLED (Apr 2, 2026)
The cron has been **removed entirely** (`crontab -r`). There is no automated S3 pulling.

**Previous cron configuration (for reference if re-enabling):**
```
0 8 * * * cd /Users/j.d.heilprin/Desktop/unitedtribes-pocv2-jd && bash pull-data.sh >> /tmp/ut-pull-data.log 2>&1
0 12 * * * cd /Users/j.d.heilprin/Desktop/unitedtribes-pocv2-jd && bash pull-data.sh >> /tmp/ut-pull-data.log 2>&1
0 19 * * * cd /Users/j.d.heilprin/Desktop/unitedtribes-pocv2-jd && bash pull-data.sh >> /tmp/ut-pull-data.log 2>&1
```
- Required macOS Full Disk Access for `/usr/sbin/cron` (was enabled by J.D. on Mar 31)
- Log was at `/tmp/ut-pull-data.log`
- **Reliability was poor:** Only the noon run on Apr 1 confirmed working. 7PM run did NOT fire (likely machine sleep). macOS cron does not run missed jobs on wake.

### Manual S3 Pull (the ONLY way to update data now)
```bash
cd ~/Desktop/unitedtribes-pocv2-jd && bash pull-data.sh
```
This pulls all ~39 files from S3. Takes about 45 seconds. Output goes to stdout.

**⚠️ Before pulling, consider:**
- Will this overwrite local patches? (e.g., Pluribus episodes were patched from 5173 and overwritten)
- Has Justin pushed new data that might change entity keys, remove entities, or empty arrays?
- Back up critical files first if unsure: `cp src/data/pluribus-response.json src/data/pluribus-response.json.bak`

**After pulling:**
- Restart the dev server (or hard refresh) to pick up new data
- Check for regressions: episodes count, entity lookups, query functionality
- The in-app "Refresh from S3" button in My Stuff also fetches from S3 via browser `fetch()` — this updates React state without touching files on disk

**⚠️ CRITICAL WARNING: The cron is an automated way to break the app 3x daily.** Every S3 data update has broken something:
- **Pluribus episodes:** Went from 9 to 0 — hand-curated editorial data (titles, directors, writers, themes, key moments) wiped by a pipeline re-run
- **Hotel Chelsea:** Entity disappeared from pattismith-universe.json, then was restored days later by Justin
- **Sinners anchor casing:** Changed from `"Sinners"` to `"sinners"`, breaking ALL queries for the Sinners universe
- **Enrichment counts swinging wildly:** YouTube enrichment dropped by 1,500 between pulls (6,545 → 6,107). Spotify dropped by 900. Total items dropped from 16,267 to 14,427 across a few days of pulls.
- **Local patches overwritten:** We patched Pluribus episodes from 5173 working data. The next S3 pull overwrote the patch with the broken (empty) data.

**Why it was disabled:** The cron was removed on Apr 2 because it was actively breaking the app. Before re-enabling, Justin needs to stabilize the S3 data pipeline. At minimum, the app also needs defensive measures:
- Case-insensitive entity lookups everywhere (not just anchor checks)
- `LOCAL_ENTITY_OVERRIDES` and `LOCAL_RESPONSE_OVERRIDES` patterns for critical data that must survive pulls
- Episode preservation logic that refuses to overwrite non-empty episodes with empty arrays
- A pre-pull snapshot/backup so data can be rolled back if a pull breaks things
- A manifest/changelog on S3 listing what changed in each data update

### Refresh Button
"Refresh from S3" in My Stuff cog. Fetches directly from S3 via browser `fetch()` — enriched catalog, video indexes, artist-albums for all universes. Updates React state only (not files on disk). This is fast but doesn't persist across page refreshes.

---

## Complete Problem Log — Every Bug We've Hit

### PROBLEM 1: Modal Size Regression (P0) — OPEN
**Status:** Open on 5174. Works on 5173.
**What:** Non-simple modals (Blue Note albums, entity modals) render at 748px instead of 960px.
**Root cause:** Line 1889: `const isSimpleLayout = isDirectVideo || mediaData?._simpleMode || (!_showFullMode && !mediaLoading)`. The third condition `(!_showFullMode && !mediaLoading)` evaluates to true during a gap when media data hasn't loaded yet but loading hasn't started either. During that frame, the modal renders at 748px (simple width) instead of 960px (full width).
**Where:** `src/App.jsx` line 1889 (isSimpleLayout), line 2093 (width conditional)
**Fix needed:** Tighten the `isSimpleLayout` gate. Possibly default to 960px and only shrink to 748px when explicitly in simple/direct-video mode.

### PROBLEM 2: Pluribus Episodes Missing — NEEDS RE-PATCH
**Status:** 0 episodes on 5174. We patched from 5173 (commit `bfb9722`, Apr 1 3:19 PM) but the patch was overwritten by a subsequent S3 pull at 10:05 PM. The cron is now disabled (Apr 2) so further overwrites won't happen. **The episodes need to be re-patched from 5173.** Works on 5173 (9 episodes).
**What:** Pluribus Episodes page shows "0 episodes".
**Root cause:** `pluribus-response.json` on S3 has `"episodes": []`. Justin's pipeline dropped them. The editorial episode data (titles, directors, writers, themes, key moments) was hand-curated — losing it is destructive.
**To re-patch now:**
```python
python3 -c "
import json
old = json.load(open('/Users/j.d.heilprin/Desktop/unitedtribes_universes_poc/src/data/pluribus-response.json'))
cur = json.load(open('src/data/pluribus-response.json'))
cur['episodes'] = old['episodes']
json.dump(cur, open('src/data/pluribus-response.json', 'w'), indent=2)
print(f'Restored {len(old[\"episodes\"])} episodes')
"
```
**Permanent fix options:** (1) Justin restores episodes on S3, (2) LOCAL_RESPONSE_OVERRIDES pattern like we did for Hotel Chelsea, (3) Justin's feature branch may include the episodes, (4) Pre-pull backup script that preserves non-empty arrays
**Where:** `src/data/pluribus-response.json`

### PROBLEM 3: Query Hang on Universe Switch — DIAGNOSED, CURRENTLY WORKING
**Status:** Diagnosed. The latest S3 pull (Apr 1 10PM) restored "Sinners" capitalized, so queries currently work. Cron is now disabled, so the on-disk data won't change unless a manual pull is done. However, the underlying vulnerability remains — the code does a case-sensitive lookup that will break again if S3 data changes casing.
**What:** Submitting a query in Sinners (and potentially other universes) hangs at "Mapping cross-media connections" and never completes.
**Root cause:** ThinkingScreen at line 5941 waits for `entities[UNIVERSE_ANCHORS[selectedUniverse]]`. The anchor for sinners is `"Sinners"` but the S3 data had it as `"sinners"` (lowercase). The lookup fails, the API never fires.
**Debug logging:** Added at lines 5942-5943. Console shows `[QUERY-DEBUG] BLOCKED — waiting for entities. anchorName: Sinners`.
**Fix needed:** Make anchor lookup case-insensitive: `entities[anchorName] || entities[anchorName.toLowerCase()]`
**Justin's fix:** His `findEntity()` function does case-insensitive lookup — would fix this.
**Where:** `src/App.jsx` lines 5941-5943 (ThinkingScreen), line 24030 (handleQuerySubmit)
**Detailed report:** `docs/s3-data-drift-april1-2026.md`

### PROBLEM 4: Hotel Chelsea Blank Screen — FIXED (with workaround)
**Status:** Fixed via LOCAL_ENTITY_OVERRIDES + Justin restored on S3.
**What:** Clicking "The Hotel Chelsea" on Patti Smith Artists & The Circle page gave a blank screen.
**Root cause:** Entity was missing from `pattismith-universe.json` on S3. The entity detail screen received null data and rendered blank.
**Fix applied:** (1) `LOCAL_ENTITY_OVERRIDES` in App.jsx — hardcoded entity data merged into entities after S3 load, survives S3 pulls. (2) Justin restored it on S3 with type="place", aliases=["Hotel Chelsea", "Chelsea Hotel", "The Chelsea"].
**Where:** `src/App.jsx` line ~8336 (LOCAL_ENTITY_OVERRIDES), line ~23523 (merge logic)

### PROBLEM 5: Spotify Artist Embeds Don't Play — OPEN
**Status:** Open. Workaround discussed but not implemented.
**What:** Spotify artist embeds (`/embed/artist/{id}`) show the player UI but clicking play returns 403 from Spotify's `connect-state/v1/player/command` endpoint. Album and track embeds work fine.
**What we tried:** Added `utm_source=generator` to all embed URLs. Cleared discovery cache. Restarted server. Cache purge on startup (version flag). Some artists play after fix, most still don't. Inconsistent.
**Key finding:** Same embed URLs play perfectly when opened directly in a browser tab — only fails in our iframe.
**J.D.'s preference:** Switch artist modals from Spotify to YouTube content.
**Justin's approach:** His branch defaults all modals to YouTube player mode.
**Where:** Lines 1483, 1495, 1694 (embed URL construction). Lines 2918, 3186 (iframe rendering). Discovery cache in `localStorage` key `ut_discovery_cache`.

### PROBLEM 6: Discovery Strip Films Open Inside Parent Modal — OPEN
**Status:** Open. Multiple fix attempts reverted.
**What:** Film cards in the "Read Watch & Listen" discovery strip (e.g., "Elevator to the Gallows" from Bitches Brew modal) open the trailer inside the current modal instead of spawning a new enriched catalog modal.
**Attempted fixes:**
  - Changed `onClick` from `setModalVideo(trailer.videoId)` to `onNavigate(f.title)` — opened wrong modal type (generic, no video, wrong size, duplicate ask bar)
  - Built synthetic enrichedModalItem and called `setEnrichedModalItem` — race condition with `onNavigate` clearing it
  - Created `openCatalogItem` prop that bypasses onNavigate — broke discovery strip entirely, had to revert
**Justin's fix:** His `autoEnrichEntity()` handles this — auto-routes films to enriched catalog modal from any click source.
**Where:** Lines 3312-3335 (discovery strip film card click handler), lines 24578-24592 (onClose/onNavigate handlers)

### PROBLEM 7: Modal Flicker After Stack Pop — IMPROVED, NOT FIXED
**Status:** Improved but not eliminated.
**What:** Open a modal → click a discovery card → child modal opens → close child → scroll → YouTube iframe flickers/reloads.
**Root cause diagnosed:** When child modal closes, `setEnrichedModalItem(null)` fires. For one render frame, the catalog modal's early return doesn't fire, regular modal briefly renders, then parent state takes over. The full unmount/remount kills the YouTube iframe.
**Fix applied:** Modal stack now saves `{ modal: universalModal, catalogItem: enrichedModalItem }` on push, restores both on pop. `enrichedModalItem` only cleared on full close (empty stack).
**Still flickering because:** The three state changes (`setEnrichedModalItem`, `setModalStack`, `setUniversalModal`) may still cause intermediate renders even with batching.
**Where:** Lines 24578-24592 (onClose handler), lines 24588-24592 (onNavigate handler)

### PROBLEM 8: Search Replaced Wall Filter — PARTIALLY FIXED
**Status:** Wall items now show first, but search behavior is different from before.
**What:** Adding the Discover & Add search to My Stuff changed the search bar behavior. Previously it filtered only wall items. Now it searches all 3 data sources (videos, catalog, albums) alongside wall items.
**Current state:** Wall items show first under "My Collection" header when searching. Discovery results show below. But the search is broad — metadata fields (context, addedFrom) match, so items tangentially related to the query appear.
**Where:** LibraryScreen search IIFE (~line 22470), wall view gate (~line 22635), list view gate (~line 22870)

### PROBLEM 9: Thin Scrollbar — OPEN (3 failed attempts)
**Status:** Open. Claude Code has broken thumbnail sizes 3 times attempting this.
**What:** Horizontal scroll containers in modals use the thick default browser scrollbar instead of the thin 4px rounded scrollbar used elsewhere (`data-dc-row` pattern).
**Why it keeps failing:** Using `replace_all` changed ALL scroll containers across the entire app. Wrapping in parent divs altered flex layouts. Any change to the scroll container's attributes risks changing its rendering dimensions.
**Fix approach:** Must change ONLY the `data-dc-row` attribute and `scrollbarWidth: "thin"` on individual scroll containers, one at a time, testing after each. Do NOT use `replace_all`.

### PROBLEM 10: Right-Edge Fade Indicator — OPEN
**Status:** Open. One failed attempt.
**What:** Horizontal scroll rows need a gradient fade on the right edge to visually indicate more content is available.
**Why it failed:** Adding a wrapper div with the gradient overlay changed the flex layout, altering thumbnail sizes.
**Fix approach:** Use a CSS pseudo-element or an absolutely-positioned overlay div that's a sibling (not parent) of the scroll container.

### PROBLEM 11: Gold [+] Buttons Hard to See — OPEN
**Status:** Open. Not attempted yet.
**What:** The add-to-library gold [+] buttons throughout the app are too small and lack contrast. Hard to see, small hit target.

### PROBLEM 12: inferCategory Crash — FIXED
**Status:** Fixed in v1.8.8.
**What:** Clicking [+] on any film card in the discovery strip caused a white screen crash.
**Root cause:** `inferCategory()` was defined inside `LibraryScreen` but called from `toggleLibrary()` inside `App`. ReferenceError: inferCategory is not defined.
**Fix:** Moved `inferCategory()` to App scope (line ~23700).

### PROBLEM 13: Film GoldAdd Missing Meta — FIXED
**Status:** Fixed in v1.8.8.
**What:** Films added from discovery strip had no thumbnail, no category, no videoId — didn't show on wall correctly.
**Fix:** Added full meta to GoldAdd: `{ title, subtitle: director, category: "Movies & TV", type: "film", thumbnail: trailer.thumbnail, videoId: trailer.videoId }`.

### PROBLEM 14: Artist Images Missing on Artists & Legends — FIXED
**Status:** Fixed in v1.8.7.
**What:** Gregory Porter, Julian Lage, Gerald Clayton, Ambrose Akinmusire, Kandace Springs, Jose James, Bill Charlap showed initials instead of photos.
**Root cause:** CastCrewScreen only looked in `universe.json` for photos. These artists aren't in universe.json but ARE in `artist-albums.json` with Spotify `image_url`.
**Fix:** Passed `artistAlbumsData` to CastCrewScreen, added fallback: `albumArtist?.image_url` after `entityData?.photoUrl || entityData?.posterUrl`.

### PROBLEM 15: Discovery Card Artwork Missing — FIXED
**Status:** Fixed in v1.8.7.
**What:** Discovery chevron cards showed navy placeholders for items like "2001: A Space Odyssey" (novel) even when the film version had a TMDB poster.
**Root cause:** The card only checked the matched item's own fields. Justin's data explorer searches all items with the same title and borrows artwork from siblings.
**Fix:** Implemented same-title sibling search matching Justin's data explorer approach: `const sameTitle = (enrichedCatalogContent || []).filter(c => c.title === item.title)`.

### PROBLEM 16: Enriched Catalog Not Loading — FIXED
**Status:** Fixed in v1.8.7.
**What:** My Stuff search showed no catalog results because enrichedCatalogContent was null.
**Root cause:** Catalog only loaded lazily when a modal opened. If user went straight to My Stuff without opening a modal, catalog was never loaded.
**Fix:** Added `useEffect(() => { loadEnrichedCatalog(); }, [])` to load catalog at App startup.

### PROBLEM 17: S3 Data Drift — ONGOING
**Status:** Ongoing. Documented in `docs/s3-data-drift-april1-2026.md`.
**What:** S3 data changes break the app silently. Entity key casing changes, entities disappear, episodes drop to 0, enrichment numbers fluctuate.
**Examples:** "Sinners" → "sinners" broke query pipeline. Hotel Chelsea removed then restored. Pluribus episodes went from 9 to 0. YouTube enrichment dropped by 1,500 between pulls.
**Mitigation:** `LOCAL_ENTITY_OVERRIDES` pattern for critical entities. Debug logging for anchor lookups. S3 data drift report for Justin.

### PROBLEM 18: Cron 7PM Not Firing — INTERMITTENT
**Status:** Intermittent. 8AM and 12PM work.
**What:** The 7PM cron run didn't execute on Apr 1.
**Likely cause:** Machine was asleep at 7PM. macOS cron doesn't run missed jobs on wake.
**Alternative:** Consider `launchd` which can run on wake if it missed its scheduled time.

---

## What v1.8.6 Shipped (on main/5173)

- Justin's harvester gate fix merged (-438 lines)
- Enriched content catalog integration (16K items, lazy load)
- Discovery chevron (Works Discussed + Related Discovery tabs)
- Enriched catalog modal (split panel 70/25, transaction badges, KG turndown)
- Modal category chips overhaul
- Library logic unified (inLib prefix matching, inferCategory fallback)
- Simple modal 748px, music stays 960
- Wall tile S/M/L sizing
- pull-data.sh + cron 3x daily
- Video discovery search in My Stuff (patched)
- Full release notes: `release-notes-v1.8.6-march-30-2026.md`

## What v1.8.7 Added (on 5174, built into v1.8.8)

- Discover & Add search in My Stuff (3 data sources: 822 videos, ~14K+ content items, 1,148 albums)
- Wall items show first in search ("My Collection" header)
- Grid card layout for search results with type badges
- Artist image fallback from artist-albums.json
- Discovery card artwork sibling search
- Spotify embed utm_source=generator + cache purge
- Modal flicker fix (stack saves enrichedModalItem)
- LOCAL_ENTITY_OVERRIDES for Hotel Chelsea
- S3 refresh button fetches from S3 via browser fetch()
- pull-data.sh expanded to ~39 files
- Enriched catalog loads at startup
- inferCategory moved to App scope
- Film GoldAdd with full meta
- FILM→MOVIE badge labels
- InputDock hidden on My Stuff screen

## What Justin's 14 Commits Add (on 5175)

- `autoEnrichEntity()` — auto-routes films/docs to enriched catalog modal from ANY click source
- `findEntity()` case-insensitive — fixes anchor casing bug
- Fuzzy title matching (strips years, normalizes quotes)
- YouTube default player mode (all modals)
- Film entities skip harvester song/album search
- Read Watch & Listen tabs (Content/Songs/Analyzed Videos) in all modal types
- 85 items reclassified (interviews/podcasts no longer "SONG")
- 72 entity subtitles fixed (Ginsberg "Actor"→"Poet", etc.)
- 667 book covers via Open Library (`openLibrary.cover_url` in poster fallback)
- `safeBrokerFetch()` 12s timeout
- Wall click routing via autoEnrichEntity
- Discovery cache v4
- Les Liaisons Dangereuses 1959 added
- Broken image fallback (navy placeholder with title)

### What Justin's branch does NOT have (from our v1.8.8 work):
- Discover & Add search in My Stuff
- S3 refresh button that fetches from S3 via browser fetch()
- pull-data.sh expanded to ~39 files
- Enriched catalog loading at app startup
- LOCAL_ENTITY_OVERRIDES pattern
- Modal stack saving enrichedModalItem (flicker fix)

---

## Global Workflow Rules

- **ALWAYS get J.D.'s approval before writing ANY code.** Tell him what you're about to do, wait for "go ahead." No exceptions. He has said this repeatedly.
- **NEVER bump the version number without J.D. telling you to.**
- **NEVER push to GitHub without being explicitly asked.** Local commits fine when asked. Pushing is separate.
- **ONE VERSION TRACKER.** `pocv2-jd-design-reskin-versions.html` — NEVER create a second one.
- **Every commit MUST include the version tracker update** with commit hash and timestamp.
- **NEVER change styles that weren't asked to change.** This has been a critical, repeated problem. If asked to change width, change ONLY width. Don't touch padding, gap, alignItems, height, or anything else.
- **When restoring code, use `git show` to get the exact committed version.** Don't reconstruct from memory.
- **Commit after each approved change before starting the next one.** Never batch multiple changes without intermediate commits.
- **Do NOT use `replace_all` for scrollbar or style changes** — it has broken layouts 3 times.
- **Mirror App.jsx to PluribusComps.jsx** after every change: `cp src/App.jsx src/PluribusComps.jsx`
- **Do NOT spin investigating when stuck.** Give J.D. a clear description of the problem with context and let him consult Claude.
- **Do NOT fabricate data or claim things are true without verifying.** Check the actual files. Multiple times Claude Code claimed data didn't exist when it did.

---

## Immediate Priorities

1. **Compare 5175 (Justin) vs 5174 (ours) vs 5173 (baseline)** — J.D. is actively testing Justin's branch. Decide what to merge.
2. **Fix Pluribus episodes** — re-patch or wait for Justin's fix
3. **Fix query hang** — merge Justin's `findEntity()` or add case-insensitive anchor lookup
4. **Fix modal sizes** — tighten `isSimpleLayout` gate
5. **Decide on Spotify vs YouTube for artist modals** — Justin defaults to YouTube
6. **Integrate Open Library book covers** — 667 books waiting, need `openLibrary.cover_url` in poster fallback
