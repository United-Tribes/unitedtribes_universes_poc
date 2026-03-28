# v1.8.5 pushed to jd/design-reskin-v3 — Blue Note album regression handoff

**To:** Justin
**From:** J.D.
**Date:** Friday, March 27, 2026 11:30 PM PDT
**Branch:** `jd/design-reskin-v3`
**Latest commit:** `d735065`
**Pushed to:** `origin` (United-Tribes) and `jdagogo`

---

**YOUR FOCUS:** The Blue Note album regression. The cross-universe modal system (Sinners, Pluribus, Gerwig, Patti Smith) is working and should not be touched. The regression is isolated to Blue Note albums and songs that fail the `isMusicEntity` gate.

---

## HOW TO RUN IT

```bash
cd ~/Desktop/unitedtribes-pocv2-jd   # or pull the branch fresh
git checkout jd/design-reskin-v3
git pull origin jd/design-reskin-v3
npm install
npm run dev -- --port 5174
```

Run alongside your 5173 build (v1.8.4) so you can compare side by side. YTA needs to be running on port 3002 for the video analysis features to work (the Vite proxy at `/api/yta/*` forwards to `localhost:3002`).

---

## WHAT v1.8.5 DOES THAT v1.8.4 (5173) DOESN'T

The big change: UniversalModal now handles ALL entity clicks across ALL 5 universes, not just Blue Note albums. When you click Rhea Seehorn in Pluribus, Michael B. Jordan in Sinners, Hotel Chelsea in Patti Smith, or Lady Bird in Gerwig — they all open in UniversalModal with a split-panel video layout instead of the old EntityPopover.

Specifically:

1. **Entity-type detection** (`detectEntityType()` ~line 1170) — classifies entities as musician, album, film, tv_series, book, place, song. Uses `artistAlbumsData` as the musician signal, subtitle parsing for places (catches Hotel Chelsea whose `type` field incorrectly says "film").

2. **`isMusicEntity` gate** (~line 1351) — determines whether an entity enters the Spotify/YouTube music pipeline or the simple mode video panel. `isMusicEntity = _isMusician || _hasAlbumMatch || _hasTrackData`. Non-music entities (persons, films, places) skip Spotify entirely.

3. **Video entity index loaded for all 5 universes** — `allVideoIndexes` state loads all 5 JSON files at startup via dynamic import. 815 videos with key_quotes, entities, timestamps.

4. **YTA deep search integration** — for simple mode entities, fires `/api/yta/search/deep?q={entityName}` with alias resolution (The/no-The, entity `.aliases` array). Results merged with entity index data, deduplicated by YouTube ID, sorted by match count. Hotel Chelsea gets 15+ videos from both sources.

5. **Split-panel layout for simple mode** — same 55/45 split as Blue Note albums. Video player left (352px, expand button), scrollable video list right with turndown chevrons. Matches the existing Blue Note layout CSS.

6. **Turndown chevrons with analysis content** — when expanded, shows synopsis + KEY MOMENTS from the video entity index (`key_quotes`) or from YTA via `parseYtaAnalysis.js` (markdown parser that extracts quotes, themes, discovery playlists from analysis files).

7. **`parseYtaAnalysis.js`** (new file in `src/utils/`) — parses YTA analysis markdown into structured data. Handles the `**[timestamp]** ## SECTION` format. Returns `{ quotes, themes, discoveryPlaylists, entities, worksDiscussed, synopsis }`.

8. **Modal stacking** — `modalStack` state at App level. Clicking a discovery card pushes the current modal onto the stack, opens the new entity. X button pops the stack and restores the parent. Implemented but may need polish.

9. **`fuzzyAlbumMatch()`** (~line 1202) — strips parenthetical suffixes like "(Expanded Edition)", "(Remastered 2024)", "(Rudy Van Gelder Edition)". Case-insensitive. Partial matching. Used in `_hasAlbumMatch`, `albumMatch` badge display, harvester lookup, and `handleSelectEntity`.

10. **Miscellaneous** — Verified Entity pill deleted system-wide. Hotel Chelsea image via PHOTO_OVERRIDES (Wikimedia URL was 404). Place detection before film in `detectEntityType`. Ask bar styling matches KG section. Blue Note fallback killed for non-Blue Note universes. Zone 3 discovery strip guarded behind `!_simpleMode`.

---

## THE PROBLEM: BLUE NOTE ALBUM REGRESSION

About 50% of Blue Note album modals are broken. They show UNKNOWN badge, no Spotify embed, no tracks, no features — just the video split panel. Albums with clean titles that exactly match `BLUENOTE_ALBUMS` keys still work (Blue Train, Moanin'). Albums with Spotify edition suffixes fail.

**Examples of broken albums:**
- "Kind Of Blue" — `BLUENOTE_ALBUMS` key is "Kind of Blue" (case mismatch)
- "Moanin' (Expanded Edition)" — key is "Moanin'" (suffix)
- "Caravan (Remastered 2024)" — key is "Caravan" (suffix)
- "Free For All (Remastered / Rudy Van Gelder Edition)" — key is "Free for All" (case + suffix)
- "A Night At Birdland" — key is "A Night at Birdland Volume 1" (completely different)
- "Birth Of The Cool" — key is "Birth of the Cool" (case)

**Songs are also broken.** "Along Came Betty" shows SONG badge but no Spotify playback. On v1.8.4 (5173) it plays fine. Note: songs are opened with an `artistHint` prop (e.g., "Along Came Betty" opens with `artistHint: "Art Blakey"`). The gate could check if the `artistHint` is a known musician in `artistAlbumsData`. This is partially wired but not working.

**Root cause:** The `isMusicEntity` gate at ~line 1351 blocks these albums from entering the Spotify pipeline. `_hasAlbumMatch` uses `fuzzyAlbumMatch()` which handles most suffix/case issues, but some albums still fail. More importantly, **v1.8.4 has NO gate at all** — every entity enters the pipeline and the pipeline itself resolves them. The harvester lookup, Spotify search, and YouTube search handle albums correctly without needing a pre-filter.

The gate exists because without it, non-music entities in other universes (Rhea Seehorn, Hotel Chelsea) get sent through the Spotify pipeline and return garbage results (Wayne Shorter for an actress, Jon Brion for a hotel).

---

## THE CORE DIFFERENCE BETWEEN v1.8.4 (5173) AND v1.8.5 (5174)

In v1.8.4, the media pipeline useEffect has NO early branching:

```
entityName → cleanName → ent → straight into harvester/Spotify/YouTube pipeline
```

In v1.8.5, there's a gate before the pipeline:

```
entityName → cleanName → ent → isMusicEntity check
  → true: run music pipeline (Spotify/YouTube/tracks)
  → false: run detectEntityType → simple mode (video panel + YTA)
```

The gate is the right concept — actors shouldn't get Spotify. But the gate's matching is too strict and blocks legitimate albums.

**Key variables that don't exist in v1.8.4:**
- `useFullMode` (~line 1278) — complex gate with 6 conditions
- `isMusicEntity` (~line 1351) — the pipeline gate
- `detectEntityType()` (~line 1170) — entity classifier
- `fuzzyAlbumMatch()` (~line 1202) — edition suffix stripper
- `_simpleMode` flag on `mediaData` — triggers simple mode render

**Key lines to compare:**
- v1.8.5 line ~1351: `const isMusicEntity = _isMusician || _hasAlbumMatch || _hasTrackData`
- v1.8.5 line ~1356: `if (!isMusicEntity) { ... simple mode ... return; }` — this early return is what blocks albums
- v1.8.5 line ~1269: `const _hasAlbumMatch = !!fuzzyAlbumMatch(_cleanNameCheck, BLUENOTE_ALBUMS);`
- v1.8.5 line ~1954: `const albumMatch = fuzzyAlbumMatch(name, BLUENOTE_ALBUMS);` — badge display

---

## APPROACHES WE TRIED AND REVERTED

1. **Remove the early `if(!useFullMode)` return** — forced all entities through `detectEntityType`, which choked on edition suffixes. Albums got classified wrong. Reverted.

2. **`useFullMode = true` → skip `detectEntityType` entirely** — sent ALL `useFullMode` entities straight to Spotify. Broke cross-universe modals because Rhea Seehorn passes `useFullMode` via `_hasVideoAnalysis` (she's in the video entity index). Wayne Shorter showed up on an actress. Reverted.

3. **`isMusicEntity` gate with `fuzzyAlbumMatch`** — correct concept, but fuzzy matching still misses some albums. Songs fail entirely because song titles aren't in `artistAlbumsData` or `BLUENOTE_ALBUMS`. This is the current state — partially working.

4. **`selectedUniverse === "bluenote"` → skip gate** — broke ALL other universes completely. Every entity in Sinners/Pluribus/Gerwig/Patti Smith went through the Spotify pipeline. Reverted immediately.

**The constraint:** We cannot remove the gate (actors get Spotify) AND we cannot make `useFullMode` the gate (video analysis entities get Spotify). We need a signal that says "this is music content" that works for albums with edition suffixes AND songs by known artists, while excluding actors and places that happen to be in the video entity index.

---

## OTHER BROKEN THINGS (lower priority than the album regression)

- Discovery strip empty or wrong for most entities. Discovery playlists from video analysis exist in the parsed data but aren't wired into the strip.
- Category chips show all 8 labels on every entity instead of only relevant ones.
- [+] indicator doesn't match library state (key mismatch between save and check).
- Wall duplicates — Lady Bird score tracks not collapsing.
- Content bleeding below modal boundary.
- None of this should block your focus. The P0 is fixing the Blue Note album regression.

---

## IMPORTANT NOTE ON VIDEO ANALYSIS AND DISCOVERY

The video analysis content showing in turndowns across all universes is NOT perfected. The parser extracts content but it's showing mediocre material — synopses and entity timestamps rather than the best quotable moments and thematic overviews. The gold is in QUOTABLE MOMENTS (real quotes with attribution and editorial context) and THEMATIC OVERVIEW sections (editorial analysis with section titles that are themselves key moments). The parser can extract these but the rendering doesn't prioritize them yet.

The Read, Watch & Listen discovery strip is mostly empty or wrong for non-Blue-Note entities. The themed discovery playlists from video analysis (like "The Works Born at the Hotel Chelsea" with 29 cross-media items including books, albums, songs, films, documentaries, and novels) exist in the parsed data but are completely untapped — not wired into the discovery strip at all.

None of this content work should block the album fix. It's separate work we'll do after the albums are restored.

---

## SUGGESTED APPROACH

You know the harvester data better than anyone. My suggestion: compare how v1.8.4's pipeline resolves "Kind Of Blue", "Moanin' (Expanded Edition)", and "Along Came Betty" (check the console logs — `[Modal] HARVESTER ALBUM:`, `[Modal] DISCOVERY CACHE HIT`). Then look at where v1.8.5's gate blocks them. The fix might be:

- Making `fuzzyAlbumMatch` smarter (handle "A Night At Birdland" → "A Night at Birdland Volume 1")
- Searching the full harvester album catalog (431 albums under 44 artists in `artistAlbumsData`) instead of just `BLUENOTE_ALBUMS` (123 albums)
- Adding the artist-hint check to `isMusicEntity` (songs by known artists should pass — "Along Came Betty" has `artistHint` "Art Blakey" which IS in `artistAlbumsData`)
- Or a completely different gating strategy that you see from comparing the two pipelines

The cross-universe modal code (simple mode, video panel, YTA integration) is working and should not need changes. The fix should be isolated to the `isMusicEntity` gate and how it determines what's music.

**KEY INSIGHT:** The harvester (`artistAlbumsData`) has 431 albums under 44 artists. `BLUENOTE_ALBUMS` only has 123. The `isMusicEntity` gate currently only checks `BLUENOTE_ALBUMS` for album matches. If it searched the full harvester catalog, it would catch far more albums. The data is already loaded in memory.

Whatever fix you make, test these four cross-universe canaries AFTER — they must still work:
- **Rhea Seehorn** (Pluribus) — split panel with 36 videos, NO Spotify
- **Vince Gilligan** (Pluribus) — split panel with 34 videos, NO Spotify
- **Michael B. Jordan** (Sinners) — split panel with 41 videos, NO Spotify
- **Hotel Chelsea** (Patti Smith) — split panel with 15+ videos, NO Spotify

If any of these show Spotify results, the gate is broken in the other direction.

---

## FILES TO LOOK AT

**NOTE:** Line numbers are approximate and will shift as you edit. Grep for the function/variable names instead:

```bash
grep -n "isMusicEntity" src/App.jsx
grep -n "fuzzyAlbumMatch" src/App.jsx
grep -n "detectEntityType" src/App.jsx
grep -n "_simpleMode" src/App.jsx
```

- `src/App.jsx` — everything (~24K lines, single file)
  - `fuzzyAlbumMatch()`: ~line 1202
  - `useFullMode` gate: ~line 1278
  - `isMusicEntity` gate: ~line 1351
  - `detectEntityType()`: ~line 1170
  - Simple mode render: ~line 2235
  - Split panel video layout: ~line 2306
- `src/utils/parseYtaAnalysis.js` — YTA markdown parser (new)
- `src/data/patti-smith-video-entity-index.json` — new, 1.3MB
- `src/data/sinners-video-entity-index.json` — new, 11MB
- `src/data/pluribus-video-entity-index.json` — new, 6MB
- `src/data/greta-gerwig-video-entity-index.json` — new, 5.7MB
- `pocv2-jd-design-reskin-versions.html` — full commit log with failed approaches documented
