# Build Note: v1.9.9 — Person Routing Fix (Mapplethorpe / Burroughs)

**Branch:** `justin/apr-7-person-routing-fix` (cut from `justin/apr-6-library-bugfixes` at `0e204c1`)
**Baseline:** v1.9.8 (everything in v1.9.8 is included — this is a strict superset)
**Date:** April 7, 2026

## Pull Instructions

```bash
cd ~/Desktop/unitedtribes_universes_poc   # or wherever your repo lives
git fetch origin justin/apr-7-person-routing-fix
git checkout justin/apr-7-person-routing-fix
npm run dev
```

**One-time on first load:** the app will automatically purge stale entries from your `ut_discovery_cache` (see "Cache version bump" below). You'll see this in console:
```
[Cache] Purged stale discovery cache (v5: person routing fix)
```
No manual action needed. Hard refresh (Cmd+Shift+R) is sufficient — do **not** `localStorage.clear()` (that would wipe `ut_author_name` from yesterday's setup).

---

## What's In This Build

This is a **single-bug surgical build**. Nothing else has changed since v1.9.8. It's the smallest possible diff that fixes a specific class of routing bug we found this morning, so your in-progress design work merges back onto it cleanly.

### The Bug

Clicking a **person** entity in the Patti Smith universe (and likely other universes) was opening an **album or song modal** instead of a person modal. Two reproductions Justin found this morning:

- **Robert Mapplethorpe** → opened as Charli XCX track **"Apple"** from *BRAT*
- **William S. Burroughs** → opened as Herbie Hancock track **"Rough"**

### Root Cause

Two compounding issues in the harvester music lookup pipeline (App.jsx ~1804–1854):

1. **No type-aware guard for persons.** The harvester music lookup ran for every clicked entity regardless of type. Person-typed entities were entering the same code path as song/album entities.

2. **Substring matching false positives.** The track-name search inside `findAlbumInArtist` used a 5-character minimum on `string.includes()`. That's too loose:
   - `"apple"` (5 chars) is a substring of `"m**apple**thorpe"` → matched Charli XCX's track "Apple"
   - `"rough"` (5 chars) is a substring of `"bur**rough**s"` → matched Herbie Hancock's track "Rough"

3. **Bad results were being cached.** Once a false-positive match resolved, it was saved to `ut_discovery_cache` and persisted. After yesterday, both Mapplethorpe and Burroughs had poisoned cache entries that short-circuited the routing logic on every subsequent click — even after a fix would land in code.

### The Fix (3 changes)

1. **Person-without-artist-match guard** (App.jsx:1814). When the entity type hint says `person` AND there's no exact-name match in `artist-albums.json`, skip the substring scan entirely. The entity falls through to "simple mode" which renders a person modal with bio and KG videos.
   - **Important:** persons who *are* legitimate musicians (e.g. Patti Smith, who has an exact match in `artist-albums.json`) still flow through the ARTIST fast-path and render correctly with Spotify embed + albums. The guard only kicks in when there's no exact match.

2. **Word-boundary substring check** (App.jsx:1820–1836). Replaced loose `includes()` with a word-boundary regex check. A track name now has to appear as a **standalone word** in the entity name, not embedded inside a longer word. So `"apple"` can no longer match inside `"mapplethorpe"`. Exact matches (`===`) still work at any length, and prefix/suffix matching (for things like "Horses" vs "Horses (Legacy Edition)") is unchanged. This is defense-in-depth for cases where the type hint is missing.

3. **Cache version bump** (App.jsx:65–74). Existing cache version bumped from `"4"` to `"5"`. The startup purge logic — which already exists — will automatically clear `ut_discovery_cache` for everyone on first load after pulling this branch. No localStorage.clear() needed; the purge is targeted (it only removes `ut_discovery_cache`, not your YouTube/type overrides or author name).

---

## Testing Checklist

### Person routing (the bug we fixed)
- [ ] Patti Smith universe → click **Robert Mapplethorpe** in narrative → person modal renders with photographer bio and KG videos (Mapplethorpe trailer, etc.). PERSON badge visible.
- [ ] Patti Smith universe → click **William S. Burroughs** in narrative → person modal renders with author bio and CBC interview videos. PERSON badge visible.
- [ ] Console shows for both:
  ```
  [Modal] routing: <name> | hint: person | resolved: person
  [Modal] NO HARVESTER MATCH: <name> | type: person → simple mode
  ```

### No regression on legitimate music
- [ ] Patti Smith universe → click **Patti Smith** herself → artist modal with Spotify embed and 11 albums. Console:
  ```
  [Modal] HARVESTER ARTIST: Patti Smith 11 albums
  ```
- [ ] Patti Smith universe → click an album like **Easter** → full album modal with tracklist, YouTube, Spotify. Console:
  ```
  [Modal] HARVESTER ALBUM: Easter by Patti Smith
  ```
- [ ] Click any other person/musician across other universes (e.g. Pluribus cast, Blue Note artist) — verify no false-positive song matches.

### Cache purge fired
- [ ] On first load after pulling, console shows: `[Cache] Purged stale discovery cache (v5: person routing fix)`
- [ ] DevTools → Application → Local Storage → `ut_cache_version` value is `"5"`
- [ ] `ut_yt_overrides`, `ut_type_overrides`, `ut_library`, `ut_author_name` are all preserved (purge is targeted)

---

## Known Issue Found While Testing (Deferred — NOT in this build)

**Cross-artist song/album substring matching is also broken**, in a related but distinct way from the person-routing fix:

- Click Patti Smith's song **"Birdland"** → harvester resolves to **Art Blakey's** album *A Night At Birdland* (because "Birdland" is a word inside "A Night At Birdland"). Wrong artist, wrong universe (Blue Note instead of Patti Smith), wrong album metadata.
- The modal becomes a mosaic — some parts (YouTube embed) resolve to Patti Smith independently, while others (resolved album, Spotify track ID) come from Art Blakey.
- Affects any short song/album title that's a word inside another title: "Birdland", "Light", "Heart", "Storm", "Stone", "Wave", probably "Horses", etc.

**Why we didn't fix it in this build:** the v1.9.9 fix specifically narrows the *person* substring false-positive. The Birdland-class issue is in **search ordering and scoring** inside `findAlbumInArtist` — needs a half-day refactor to add (a) two-pass priority where exact title matches across all artists win before fuzzy matches, (b) universe scoping to prefer the active universe before the merged 161-artist set, and (c) tiebreaker scoring (exact > prefix > word-boundary; track > album-substring). That's too much surface area for a surgical bugfix build, and the regression risk crosses every song and album click in all 5 universes. Captured in `~/.claude/projects/-Users-justin/memory/future-fixes.md` as item #12.

---

## What's Carried Forward From v1.9.8

Everything. v1.9.9 is a strict superset of v1.9.8. All YouTube override, film media mutual exclusion, Lady Bird collision fix, song collapsing threshold, and shared S3 overrides functionality is unchanged.

## Key Files Changed

- `src/App.jsx` — three localized edits (lines ~65–74, ~1804–1854, build badge ~75)
- `src/PluribusComps.jsx` — mirror of App.jsx

## AWS Infrastructure

No changes. Lambda `ut-overrides-handler` and the `/v1/overrides*` API routes from v1.9.8 are still live and unchanged.

---

Justin · April 7, 2026
