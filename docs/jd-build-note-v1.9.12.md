# Build Note: v1.9.12 — v1.9.10 follow-ups from your QA pass

**Branch:** `justin/apr-7-routing-fix-v3` (cut from your `jd/design-reskin-v3` baseline at `eacc005`)
**Baseline:** v1.9.11 — strict superset, all your backdrop-close work intact
**Date:** April 7, 2026

## Pull Instructions

```bash
cd ~/Desktop/unitedtribes_universes_poc
git fetch origin justin/apr-7-routing-fix-v3
git checkout justin/apr-7-routing-fix-v3
npm run dev
```

**One-time on first load:** the app automatically purges stale entries from `ut_discovery_cache` (cache version bumped from `8` → `13`). Console will show:
```
[Cache] Purged stale discovery cache (v13: per-track videoIds preserved when override active)
```
No manual action needed. YouTube overrides, type overrides, library, and author name are all preserved (the purge is targeted to the discovery cache only).

---

## What's In This Build

This build is everything from your QA pass on v1.9.10/v1.9.11. Five real bugs you reported, plus the broader audit work that fell out of diagnosing them. Every fix is in `App.jsx` and the mirror is kept in sync. No data files changed, no S3 uploads, no architectural restructuring.

### Bugs fixed (in your reported order)

#### 1. Thelonious Monk + Coltrane → wrong solo album
**Symptom:** clicking the joint album resolved to Monk's solo "Thelonious Monk" album. Modal showed wrong artist context, wrong tracks.

**Root cause:** the harvester data has the joint album as `"Thelonious Monk with John Coltrane (OJC Remaster)"`. The fuzzy album matcher in `findAlbumInArtist` Pass 2 was hitting on Monk's much shorter "Thelonious Monk" album via prefix and word-boundary substring matching, returning the wrong result before the actual joint album was even checked.

**Fix:** added a length-ratio guard to `findAlbumInArtist`. When one string is significantly longer than the other (>1.3x), the fuzzy match is only accepted if the trailing portion is a known release-variant suffix (`Remaster`, `Deluxe`, `Edition`, `OJC`, `Live`, year, etc.). Same guard also applied to the track-name lookup branch (separate code path with the same class of false positive). PRIORITY 1 (specific-artist lookup) was also extended to do exact-first-then-fuzzy two-pass like PRIORITY 2 already does.

**Plus:** while validating this fix, I found three downstream issues that broke the demo flow for albums missing from `artist-albums.json`:

- **YouTube override didn't apply in simple mode.** The override was only injected into `mediaData` in the discovery-cache-hit branch — anything that fell through to `NO HARVESTER MATCH → simple mode` silently dropped it. Fixed: simple-mode setup now also injects the override `ytAlbum` and drops the `_simpleMode` flag when an override is present, so the full-mode video player renders.

- **Override save parser preferred video over playlist when both `?v=` and `?list=` were in the URL.** Standard YouTube watch URLs always include `v=`, so playlist URLs always got saved as single videos. Fixed: playlist wins when both are present.

- **Saving an override wiped `ytPlaylist` from cache,** which made the right-side tracks panel disappear. Fixed: only `ytAlbum` (the embed URL) is wiped now. Track metadata survives.

- **Track clicks didn't update the player when an override was active.** The override branch was building `finalPlaylist` with `videoId: null` for every track, throwing away the harvester's per-track videoIds. Fixed: per-track videoIds are preserved. Track-click handler also now sets `modalVideo` to the track's videoId instead of null, so the iframe switches to the per-track video on click. The override remains the default state when the modal first opens.

#### 2. Discovery card "Works Discussed" click handler bypass
**Symptom:** clicking film/song/episode cards in the Works Discussed tab inside a video modal could open the wrong modal type (e.g., Giant Steps). Sometimes it opened nothing at all.

**Root cause:** the click handler was calling `onNavigate?.(item.title)` and then immediately calling `setEnrichedModalItem?.(item)` out-of-band. Two state updates raced, the routing useEffect hit `enrichedModalItem already set` and bailed early, and the modal rendered whichever item won the race.

**Fix:** rewrote the click handler to make a single call: `onNavigate?.(item.title, null, null, null, item.type || null)`. The type hint flows through cleanly, the catalog item is found via `autoEnrichEntity` with type validation, and there's no race. Affects both occurrences of the worksDiscussed render block (App.jsx ~3716 and ~3851).

#### 3. Genre / book / concept entities opening as film
**Symptom:** clicking entities like Hip-hop, Bebop, Hard Bop, Modal Jazz, Fusion, hive mind, The Joining, The Borg, Ozymandias (the Shelley poem), Van Gelder Studio, etc. opened as film modals. Some even resolved to unrelated harvester music matches via fuzzy substring.

**Root cause:** the harvester ran TMDB title search on these entity names and got back movie posters. It then stamped the entities with `type: "film"` in the universe data. The routing system was correctly honoring the data — but the data was wrong. 22 entities total across all 5 universes.

**Plus a second bug surfaced during diagnosis:** the **enriched catalog intercept** at the top of the modal pipeline only had `album` and `person` in its skip list. Theme/character/place clicks fell through and got hijacked by same-named songs in the catalog. Bebop with type=theme was matching a Dizzy Gillespie track called "Be-Bop" in the catalog and opening as a song. Fixed by gating the intercept to only run for explicit film/song/book types or untyped clicks.

**Fix (data side):** added `LOCAL_ENTITY_PATCHES` map alongside the existing `LOCAL_ENTITY_OVERRIDES`. Same loader pattern, but `PATCHES` does shallow-merge over existing entities (overrides individual fields). The merge step lives in the universe loader effect. Currently patches 22 entities:

- **bluenote (8):** Bebop, Free Jazz, Fusion, Hard Bop, Hip-hop, Modal Jazz, Post-Bop → `theme`. Van Gelder Studio → `place`.
- **pluribus (10):** A Raisin in the Sun, I Am Legend, Leaves of Grass, Ozymandias, The Age of Miracles → `book`. The Best of Both Worlds, The Borg, hive mind, The Joining, The Others → `theme` (the last three also get a subtitle override to strip the misleading "Film · " prefix).
- **sinners (2):** Mississippi Delta Blues, Vampirism → `theme`.
- **gerwig (2):** French New Wave, Mumblecore → `theme`.

The patch only touches `type` (and `subtitle` for the three Pluribus ones with `Film · Concept` subtitles). Posters and other fields are left alone. The wrong TMDB poster will still show on some hero images — that's a known cosmetic issue I'm leaving alone for v1.9.12. The badge, routing, and modal layout are now all correct.

**Real fix is at the harvester layer:** add a "do-not-TMDB-enrich" guard for known genre/book/concept names so the harvester doesn't stamp them as film in the first place. The 22-entry patch list IS that guard list — could be exported back to the harvester pipeline later. Captured in `future-fixes.md`.

#### 4. Read/Watch/Listen tab badge counts inflated
**Symptom:** "Top Songs (188)" showed 20 cards. "Featured Discovery (12)" showed 5 cards. Badge counts didn't match the actual rendered content.

**Root cause:** the badge counted the full source array (`utNeedleDrops.length`, `_simpleAnalyzed.length`) but the render path applied a hard `.slice(0, 20)` / `.slice(0, 30)` cap that the badge didn't know about. Featured Discovery also dropped cards with no thumbnail at render time, another silent gap.

**Fix:** computed the displayed slice **once** at the top of each panel and used `.length` of that slice for both the badge and the render. Featured Discovery's slice also pre-filters by thumbnail availability (`.filter(fv => ytThumbUrl(fv.video_id))`) so the count reflects only renderable cards. Three panels fixed: simple-mode RWL, full-mode RWL, and the enriched-modal RWL panel.

#### 5. Bonus: cross-bio "Blues" pollution
**Symptom:** clicking the word "blues" in the Hip-hop query response narrative was opening Jimi Hendrix's "Blues" album modal.

**Root cause:** the bio rendering helper `linkEntitiesWithBioQuotes` was scanning bio text for quoted strings (4+ chars) and creating synthetic `_work:<title>` entities with hardcoded `type: "album"` for every match. Once "Blues" was created from a Hendrix bio earlier in the session, the synthetic entity polluted the global `entities` object — and any later click on "blues" anywhere routed through it.

**Fix:** raised the min length from 4 → 6 in the quote regex (drops short common words like "Blues", "Lady", "Apple"); added a `COMMON_WORD_BLOCKLIST` for single-word common nouns even if they slip past the length filter; changed the synthetic type from `album` → `song` so when a multi-word legitimate quote is clicked, it routes through the much more precise song path instead of the harvester's fuzzy album scan.

The global mutation itself is still in place (de-mutating fully would require teaching `openPopover` to handle synthetic `_work:` keys without needing them in global state — too big a refactor for this build). Captured as a follow-up.

---

## What ships as a known limitation (not fixed in v1.9.12)

### Per-track YouTube click sync when album resolves via override
When an album resolves via the YouTube override mechanism AND the harvester data has per-track videoIds, clicking a track on the right side now updates the player to that track's video — works perfectly (this is one of the v1.9.12 fixes). **But** if the harvester data doesn't have per-track videoIds for a given album (not all albums do), clicking a track keeps the original override video playing. The right panel still shows the track names/durations, the user just can't jump to specific tracks.

**Workaround:** the playlist embed (when override is a playlist URL with `list=`) has its own playlist navigation arrows inside the YouTube player. Users can navigate the album linearly that way.

**Real fix:** populate per-track videoIds in the harvester pipeline for all albums, OR extend `LOCAL_ALBUM_PATCHES` to allow manual per-track video lists. Captured in `future-fixes.md`.

### Ozymandias episode → film modal (Bug B from your QA list)
**Status:** deferred to v1.9.13.

There are three "Ozymandias" entries in the data: the Shelley poem entity in `pluribus-universe.json` (now patched to `book`), a "poem"-typed entry in the enriched content catalog, and the Breaking Bad S5E14 episode in the enriched content catalog. When you click the Breaking Bad episode card from a video modal's worksDiscussed tab, `autoEnrichEntity` finds the poem entry first (no type validation for `episode` in the compatibility table) and the modal renders the wrong content.

**Why deferred:** fixing this requires (a) adding `episode` to the type compatibility table, AND (b) changing how `autoEnrichEntity` ranks multiple matches by type compatibility — a pipeline change with non-trivial regression risk. Out of scope for this surgical build.

**Workaround:** clicking Ozymandias from the BB episode worksDiscussed card may open the poem modal instead of the episode. The user can use the gear icon's type override to force `episode` if they need the episode content.

### Wrong TMDB poster images for genre/book entities
The 22 patched entities still have their wrong-TMDB poster URLs. The badge and routing are correct, but the hero image may show a movie poster for, e.g., Hip-hop or hive mind. Cosmetic only — captured for the harvester fix.

### `linkEntitiesWithBioQuotes` global state mutation
The function still mutates the global `entities` object when creating `_work:` synthetic entities. v1.9.12 raises the bar with length + blocklist + safer routing, but a session-long state issue is still possible if a quoted string slips through. Captured for a future refactor.

---

## Cache state

This build bumps `ut_cache_version` from 8 → 13. The startup purge clears `ut_discovery_cache` once on first load and writes the new version marker. All other localStorage keys (`ut_yt_overrides`, `ut_type_overrides`, `ut_library`, `ut_author_name`, `ut_session`) are preserved.

You'll see in console:
```
[Cache] Purged stale discovery cache (v13: per-track videoIds preserved when override active)
```

---

## Testing checklist

### Bug fixes (must pass)
- [ ] Thelonious Monk with John Coltrane → opens correct joint album, tracks visible on right, playlist embed plays the album
- [ ] Track click in the right panel → player switches to the track's individual video
- [ ] Hip-hop / Bebop / Hard Bop / Modal Jazz / Fusion → all open as theme/concept modals (no song/film hijack)
- [ ] Van Gelder Studio → opens as place modal (if you can find a click path to it; otherwise trust the patch)
- [ ] Pluribus universe: hive mind / The Borg / The Joining / The Others → open as theme modals (badge says THEME, subtitle says "Concept")
- [ ] Pluribus books (Ozymandias the poem, A Raisin in the Sun, I Am Legend, Leaves of Grass, The Age of Miracles) → open as book modals
- [ ] Sinners universe: Mississippi Delta Blues / Vampirism → theme modals
- [ ] Gerwig universe: French New Wave / Mumblecore → theme modals
- [ ] WSB modal "Top Songs" tab → badge count matches rendered card count
- [ ] Click "blues" in any narrative → does NOT open Hendrix album

### Regression checks (v1.9.10 baseline)
- [ ] Robert Mapplethorpe → person modal
- [ ] Patti Smith herself → artist modal with Spotify embed + 11 albums
- [ ] Birdland (free-text in Patti Smith narrative) → Patti Smith track, NOT Art Blakey
- [ ] Better Call Saul → TV modal
- [ ] WSB modal "Related" tab → fewer cards than before, no orphans

### v1.9.11 baseline
- [ ] Backdrop click on any modal → closes the entire modal stack

---

## Files changed

- `src/App.jsx` — all fixes
- `src/PluribusComps.jsx` — mirror of App.jsx
- `docs/jd-build-note-v1.9.12.md` — this file

## What's carried forward

- Everything from v1.9.11 (your backdrop-close addition)
- Everything from v1.9.10 (the comprehensive routing fixes + orphan filter)
- Everything from v1.9.9 (person routing fix)
- Everything from v1.9.8 (YouTube override infrastructure, song collapsing, S3 overrides)
- All localStorage state preserved

## AWS infrastructure

No changes. Lambda `ut-overrides-handler` and the `/v1/overrides*` API routes from v1.9.8 are still live and unchanged.

---

Justin · April 7, 2026
