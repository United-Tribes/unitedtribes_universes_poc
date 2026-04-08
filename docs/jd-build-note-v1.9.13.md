# Build Note: v1.9.13 — v1.9.12 follow-ups + Sonny Rollins data

**Branch:** `justin/apr-8-v1.9.13` (cut from `justin/apr-7-routing-fix-v3` / v1.9.12)
**Baseline:** v1.9.12 — strict superset
**Date:** April 8, 2026

## Pull Instructions

```bash
cd ~/Desktop/unitedtribes_universes_poc
git fetch origin justin/apr-8-v1.9.13
git checkout justin/apr-8-v1.9.13
npm run dev
```

**One-time on first load:** the app automatically purges `ut_discovery_cache` (cache version `13` → `14`). Console will show:
```
[Cache] Purged stale discovery cache (v14: getSoundtrack startsWith fix, John Cena scoping, TMDB poster cleanup)
```
YouTube overrides, type overrides, library, and author name are preserved.

---

## What's In This Build

A short, conservative build. Four real bug fixes plus one data win on Sonny Rollins. This was a methodology reset day on my side — I started over with strict one-fix-at-a-time browser verification after a first attempt got too aggressive. Everything below was tested in the browser before being committed. Items I couldn't finish carefully are explicitly listed in **What's NOT In This Build** so you know what's still on the queue.

### Bugs fixed

#### 1. John Cena leaking into Blue Note / Gerwig / Sinners / Patti Smith universes
**Symptom:** John Cena (and a few other Pluribus-only cast/crew extras) were appearing in cast grids for non-Pluribus universes. Visible on artist/film modals where the cast strip should have been empty or universe-scoped.

**Root cause:** three sites in `App.jsx` were applying the Pluribus-only `KG_CAST_EXTRAS` / `PROMOTED_LEADS` extras lists without checking `selectedUniverse`. The Pluribus-scoped versions further up the file (`JD_KG_CAST_EXTRAS` / `JD_PROMOTED_LEADS`) were already correct from v1.9.12; these were three additional sites I missed in that pass.

**Fix:** wrapped all three sites in `selectedUniverse === "pluribus"` guards. Verified in the browser by clicking through Blue Note, Gerwig, and Sinners cast/film entries — no Cena.

**Files:** `App.jsx` lines ~20180, ~20613, ~20623 (mirror in `PluribusComps.jsx`).

#### 2. Wrong soundtrack pulled by substring match
**Symptom:** clicking a film/album in any universe could resolve to a soundtrack album from a totally different film if the other film's title happened to *contain* the clicked title. E.g., clicking "Volume 2" pulled "Pluribus: Volume 2 (Apple Original Series Score)". Clicking the Sonny Rollins "Volume 2" album body showed Pluribus soundtrack content.

**Root cause:** `UTDataClient.getSoundtrack()` was using a plain `includes()` substring check against catalog album titles. Any album whose title *contained* the search string would match.

**Fix:** changed to a startsWith-at-word-boundary regex. The album title must start with the searched film title at a word boundary, not just contain it anywhere. Same idea as a `\bfoo\b` anchor at the start of the string.

```js
const filmTitleStartRe = new RegExp(`^${escapedTitle}(\\b|$)`);
if (filmTitleStartRe.test(albumTitle) && /soundtrack|score|original motion picture/.test(albumTitle)) { ... }
```

**Verified in browser** with: Sonny Rollins (no false hit), Sinners (correct hit), Pluribus (correct hit), Lady Bird (correct hit), Volume 2 (no false hit on Pluribus Volume 2).

**File:** `src/lib/ut-data-client.js` `getSoundtrack()`.

#### 3. Sonny Rollins Volume 1 + Volume 2 — added to harvester data
**Symptom:** Sonny Rollins's "A Night at the Village Vanguard" Vol 1 and Vol 2 (the two canonical Blue Note volumes) were missing from `artist-albums.json` on S3, so clicking either album from any Sonny Rollins context fell through to a generic empty modal.

**Background:** these albums failed Spotify search lookup in the harvester pipeline because the search returns a different (non-canonical) version first. They needed direct Spotify ID lookups.

**Fix (data + harvester):**
- Extended the harvester `harvest-artist-albums.mjs` to support an object-form override for albums: `{title, spotify_id, youtube_playlist_id}`. When present, the harvester fetches by ID directly instead of running a search.
- Added the two volumes' Spotify IDs (`0eySuZQb7ZGcE5qOAXvRlO`, `0d6KMLpOq8ynOCcWVtO13F`) and YouTube playlist IDs to `data/universes/bluenote/poc-artists.json` Sonny Rollins entry.
- Per-track YouTube videoIds were scraped manually from the playlist HTML (no YouTube API quota used).
- Re-ran the harvester for Sonny Rollins only and uploaded the updated `artist-albums.json` to S3 (`bluenote: 44 artists, 433 albums` — was 431).
- All 9 existing Sonny Rollins albums kept their existing YouTube data via a patch script (no regression).

**Verified in browser:** Blue Note → Cover Art → page 10 → click Volume 2 → modal renders with Spotify embed, full tracklist, YouTube playlist with per-track switching. Same for Vol 1.

**Files:** harvester repo only (data uploaded to S3). No POC code change.

#### 4. Wrong TMDB poster images on 12 of the 22 v1.9.12 patched entities (partial)
**Symptom:** v1.9.12's `LOCAL_ENTITY_PATCHES` map fixed the *type* and *badge* on 22 entities (Hip-hop, Bebop, Hard Bop, hive mind, etc.) but the hero photo was still a wrong-context TMDB film still — e.g., Hip-hop showing some random movie poster.

**Fix (data, partial):** went into the four universe JSONs (`bluenote`, `pluribus`, `sinners`, `gerwig`) and cleared `photoUrl` and `posterUrl` on 12 entities where I could verify the wrong image was coming from the universe data itself.

**What this does NOT fix:** the remaining 6 entities still show wrong-context images because the photo lookup chain at `App.jsx:2515` falls through past the universe entity's `photoUrl` to a separate `_catalogPhoto` lookup, which has its own catalog scan that pulls Spotify song art for same-named tracks (e.g., Bebop → Spotify art for a song called "Bebop"). That requires an architectural fix to make the catalog lookup type-aware. **That fix is the #1 priority for v1.9.14** (see below).

**Files:** `src/data/{bluenote,pluribus,sinners,gerwig}-universe.json`. 24-line surgical diff.

---

## What's NOT In This Build (deferred to v1.9.14)

I was strict about only shipping things I had tested in the browser. The following items are still on the queue and will be in v1.9.14. None of these are introducing new symptoms that weren't already present in v1.9.12.

### Type-aware catalog photo fallthrough — **HIGH PRIORITY FOR v1.9.14**
The architectural fix at `App.jsx:2515` that resolves the 6 remaining wrong-context posters from item #4 above. This is a real fix to the photo lookup chain that needs careful tracing of all 10+ fallthrough links — too risky to batch into this build under time pressure. **Affected entities (cosmetic only, type/badge correct):** Bebop, Free Jazz, Hard Bop, I Am Legend, The Borg, The Others.

### Bug B — Ozymandias episode → book modal
Clicking the Ozymandias thumbnail in the Works Discussed strip of the Breaking Bad finale video opens the Shelley poem book modal instead of the Breaking Bad S5E14 episode modal. This is the same v1.9.12 carry-over bug — I confirmed it still reproduces this morning, and I have a clean diagnosis (it's an early-bailout race in `App.jsx:1907` between `autoEnrichEntity` and the click-site type hint). The fix is in the queue for v1.9.14.

### `lookupFeatureVideos` word-boundary
Same class of substring-match bug as `getSoundtrack` (item #2 above), in a different function. Lower priority because it doesn't manifest as visibly. Queued for v1.9.14.

### Thomas Crown / Miami Vice missing posters in person modal
Person modal shows missing posters for Thomas Crown / Miami Vice. My first attempt at this in the v1.9.13 morning session was wrong (I assumed catalog posters were at top-level `posterUrl`; they're actually nested at `tmdb.poster_url`, and the `type` field case differs between sources — `'FILM'` vs `'film'`). I rolled it back and want to redo it carefully against actual data shapes. Queued for v1.9.14.

### Per-track YouTube click sync when album lacks per-track videoIds
Workaround needed for albums where the harvester doesn't have per-track videoIds — track clicks keep the override video playing. Same as v1.9.12 carry-over. Workaround would be extending `LOCAL_ALBUM_PATCHES` to allow manual per-track lists.

### Harvester-side TMDB do-not-enrich guard
Source-side fix for the 22-entity poster problem. The deny-list is added to `harvester/lib/enrichers.mjs` (uncommitted in the harvester repo) — verified the code, will re-run harvest + upload as a separate ship.

---

## Methodology note (skip if you don't care about process)

This build is shorter than I'd planned. Yesterday I attempted a much larger v1.9.13 in a single morning push and it produced 4 broken fixes — I batched changes, made data-shape assumptions, and grepped for variable names instead of literal values. Justin called for a full reset and I restarted the morning with strict one-fix-at-a-time browser verification.

The trade-off: fewer fixes shipped today, but every fix in this build was verified in your actual click paths before commit. The deferred items above are real and will be in v1.9.14 — they're not silently broken in this build, they were never touched.

---

## Version & cache

- **`BUILD_VERSION`** = `v1.9.13`
- **Cache version** = `13` → `14` (auto-purges `ut_discovery_cache` on first load)
- **Files modified:** `src/App.jsx`, `src/PluribusComps.jsx`, `src/lib/ut-data-client.js`, `src/data/{bluenote,pluribus,sinners,gerwig}-universe.json`, `docs/jd-build-note-v1.9.13.md`
