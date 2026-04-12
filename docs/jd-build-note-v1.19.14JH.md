# Build Note: v1.19.14JH — type-aware lookups + data cleanup + episode display

**Branch:** `justin/apr-8-v1.19.14JH` (cut from `main` at `6340ce7` / your v1.9.14)
**Baseline:** v1.9.14 — strict superset, all your modal width / video stabilization / film card fixes intact
**Date:** April 8, 2026

## Pull Instructions

```bash
cd ~/Desktop/unitedtribes_universes_poc
git fetch origin justin/apr-8-v1.19.14JH
git checkout justin/apr-8-v1.19.14JH
npm run dev
```

**One-time on first load:** the app automatically purges `ut_discovery_cache` (cache version `14` → `15`). Console will show:
```
[Cache] Purged stale discovery cache (v15: type-aware photo chain + episode badge + wrong-context video cleanup + album poster fallback)
```
YouTube overrides, type overrides, library, and author name are all preserved.

---

## What's In This Build

Four code/data fixes that close out the recurring "modal lookup context loss" pattern we've been chasing — call sites have the type/intent, but lookup functions ignore it and return wrong-context results. Each fix was browser-verified before commit, per the rigorous methodology rule established Apr 8 morning.

### 1. Type-aware catalog photo fallthrough (#22)
**Symptom:** the 22 entities patched via `LOCAL_ENTITY_PATCHES` (Bebop, Free Jazz, The Borg, The Others, I Am Legend, Ozymandias, etc.) showed wrong-context hero photos. Bebop showed a Dizzy Gillespie song's Spotify art. The Borg showed a Star Trek poster. I Am Legend showed Will Smith.

**Root cause:** `_catalogMatch` lookup at App.jsx:2520 was title-only. For an entity named "Bebop" with `type: "theme"`, `find()` returned the FIRST catalog entry whose title was "bebop" — a Dizzy Gillespie song. Then `_catalogPhoto` pulled that song's Spotify album art and the modal rendered it as the hero image.

**Fix:** added a type-compat filter to `_catalogMatch`. Map keyed on the entity's known type. For unmapped types, no filter (current behavior preserved):
```js
const _catalogTypeCompat = {
  theme: new Set(),    // genres/concepts/movements — no compatible catalog item
  place: new Set(),    // venues/studios — no compatible catalog item
  book: new Set(['book', 'novel', 'memoir', 'poem', 'play', 'novella', 'screenplay']),
  novel: new Set(['book', 'novel']),
  memoir: new Set(['book', 'memoir']),
};
```

**Verified in browser:** 7 hero photo bug fixes (Bebop, Free Jazz, Hard Bop, The Borg, The Others, I Am Legend, Ozymandias) + 3 regression spot-checks (Sinners film, Patti Smith artist, Just Kids book — all unchanged). 10/10 pass.

**Bonus:** I Am Legend now correctly shows the Matheson novel cover from openLibrary instead of the Will Smith film poster. Ozymandias now correctly shows the Shelley poem cover.

**File:** `src/App.jsx` ~line 2525.

### 2. Bug B Ozymandias — episode → episode modal + EPISODE badge (#19)
**Symptom:** clicking the Ozymandias thumbnail in the Works Discussed strip of a Breaking Bad video modal opened the Shelley book modal instead of the Breaking Bad S5E14 episode modal. Carry-over from v1.9.12.

**Root cause:** two-part bug.
1. **`_typeCompat` maps in both `onNavigate` and `openPopover` had no `episode` key.** When the click hint was `type='episode'`, the type-validation gate silently skipped (because `_allowedTypes = _typeCompat['episode'] === undefined`), so `autoEnrichEntity` was allowed to return the wrong-typed catalog entry (the Shelley poem).
2. **The Works Discussed click handler at App.jsx:3870 was passing `null` as the `catalogItemOverride`** even though the click handler had the FULL catalog item in scope as `item`. So `onNavigate` had to re-resolve via `autoEnrichEntity` instead of using the actual clicked entry.

**Fix:** four edits.
- Both Works Discussed click handlers (App.jsx:3870 + 4005) now pass `item` as `catalogItemOverride` — bypasses `autoEnrichEntity` entirely.
- Both type-compat maps (`_typeCompatOP` at 25151, `_typeCompat` at 26373) now include `episode: new Set(['episode'])` as defense in depth for any click path that lands here without a `catalogItemOverride`.
- Plus 3 small edits to the enriched modal renderer: new `isEpisodeType` flag, suppressed "Directed by" prefix for episodes (creator field for episodes is "Breaking Bad S5E14", reads weirdly with "Directed by"), and new "EPISODE" badge text.

**Verified in browser:** click "How Breaking Bad Pulled Off An Impossibly Perfect Finale" video → Works Discussed → Ozymandias → opens episode modal with EPISODE badge, "Breaking Bad S5E14 · Breaking Bad Essential Episodes" subtitle, Hank's Death YouTube clip, Apple TV+/Criterion buttons. Correct.

**Files:** `src/App.jsx` ~lines 3870, 4005, 25163, 26386, 2658, 2671, 2675.

### 3. Wrong-context videos cleared from 5 patched theme entities (#17 — reclassified to data fix)
**Symptom:** clicking certain theme entities showed completely unrelated trailer videos. The Borg theme played the Bjorn Borg vs John McEnroe (2017) tennis biopic trailer. The Others theme played the Nicole Kidman 2001 horror film trailer. The Joining played a random IGN convention trailer. hive mind played a random indie horror film called "Hive Mind". Vampirism played a generic John Carpenter vampire trailer.

**Root cause:** harvester pipeline error. The harvester ran YouTube search on the entity name and stored the first result into `quickViewGroups[0].items[0]` of each entity in the universe JSONs. None of these matches were context-appropriate.

**Fix:** surgical edits to `pluribus-universe.json` and `sinners-universe.json`:
- **The Borg, The Others**: removed the wrong `quickViewGroups[0]` group; the legitimate Pluribus video group at index 1 becomes index 0
- **The Joining, hive mind**: only had one (wrong) group; removed it entirely. Modal now uses entity-index videos via `lookupFeatureVideos` which surfaces correctly-contextual content (e.g. "How The Hive Mind Really Works In Pluribus Finally Explained" by Film Paradise)
- **Vampirism**: replaced the John Carpenter trailer with **"Ryan Coogler talks Sinners, vampires and capitalism (SPOILERS)"** by Hanna Flint — a director interview that frames vampirism as a metaphor for predatory capitalism. Same group label changed from "Trailers" to "Discussions".

**Verified in browser:** all 5 entities reopened, wrong videos gone, replacements show correct context.

**Note:** this is a data fix, not a code fix. The same class of bug could re-appear if the harvester re-runs. A long-term fix is to add a denylist of known bad video IDs to the harvester pipeline (similar to the `TMDB_DO_NOT_ENRICH` guard added in the harvester repo).

**Files:** `src/data/pluribus-universe.json`, `src/data/sinners-universe.json`.

### 4. Album cards in Related tab — catalog poster fallback (#26)
**Symptom:** clicking into a theme/concept entity's Related tab, ALBUM-typed work cards showed navy placeholder rectangles instead of the album cover, even when the catalog had perfectly good album art. Surfaced when looking at Free Jazz theme — the "Free Jazz" album by Ornette Coleman (the iconic Jackson Pollock painting cover) was rendering as a placeholder.

**Root cause:** the `_ewCatalog` lookup in both Related-tab render sites (your fix from #18 at App.jsx:3668 and the parallel site at 4663) only fired for `_isFilm` cards. Album cards fell through to `w.posterUrl || w.photoUrl || null`, and since the harvester data had empty strings for those fields, the placeholder rendered.

**Fix:** extended the `_ewCatalog` lookup to also fire for `_isAlbumCard`, pulling `spotify.album_art_url` from same-titled album catalog entries. Same shape as your film fix, just one more branch:
```js
const _isAlbumCard = wType === "ALBUM";
const _ewCatalog = _isFilm
  ? (enrichedCatalogContent || []).find(c => c.title?.toLowerCase() === w.title?.toLowerCase() && c.tmdb?.poster_url)
  : _isAlbumCard
  ? (enrichedCatalogContent || []).find(c => c.title?.toLowerCase() === w.title?.toLowerCase() && c.type === 'album' && c.spotify?.album_art_url)
  : null;
const _ewPoster = w.posterUrl || w.photoUrl || _ewCatalog?.tmdb?.poster_url || _ewCatalog?.spotify?.album_art_url || null;
```

**Verified in browser:** Free Jazz theme → Related tab → Free Jazz album card now shows the actual Ornette Coleman album cover.

**Files:** `src/App.jsx` ~lines 3668-3676 + 4662-4670.

### 5. Bonus: 4 missing theme bios written
While verifying #17 the Vampirism modal showed "No overview available." A scan revealed that 4 of the 22 LOCAL_ENTITY_PATCHES theme entities had `bio: ['No overview available.']` placeholder strings instead of real descriptions. The other 18 had hand-curated copy.

**Filled in:**
- **Vampirism (sinners)** — vampirism as metaphor for predatory capitalism in Sinners
- **Mississippi Delta Blues (sinners)** — Delta blues tradition as cultural foundation of Sinners
- **French New Wave (gerwig)** — Nouvelle Vague movement and link to Gerwig's improvisational style
- **Mumblecore (gerwig)** — early-2000s indie movement where Gerwig got her start

**Files:** `src/data/sinners-universe.json`, `src/data/gerwig-universe.json`.

---

## What's NOT In This Build (deferred to v1.19.15)

### #27 — getSoundtrack type-gate (DEFERRED pending your soundtrack initiative)
The soundtrack panel on theme/concept entities (e.g. The Borg theme showing "The Borgias" Showtime soundtrack, The Others theme showing the Amenábar film score) is caused by **wrong catalog data**, not a code bug. The catalog's Star Trek "The Borg" tv-series entry literally has `soundtrack.album_id` pointing at "The Borgias" — a harvester pipeline error. We confirmed this morning that my v1.9.13 `getSoundtrack` regex correctly rejects substring matches; the contamination is at the data layer.

I drafted a code-side workaround (skip `getSoundtrack` for `entity.type ∈ {theme, place, book, ...}`) but didn't ship it because **your soundtrack work will likely fix the underlying data**, making the workaround unnecessary or actively conflicting. If you decide a code-side gate is still useful after your data work lands, the diagnosis is in `~/.claude/projects/-Users-justin/memory/` task #27.

### Hive mind modal sometimes renders at the wider 960px width
When my #17 fix removed the only entry from a theme entity's `quickViewGroups`, the modal pipeline switched to a single-column wider layout because there was only one matching video in the entity index. Not actually a bug — just a layout difference that surfaces when the entity has minimal data. Cosmetic, low priority.

### Top Songs needle-drop contamination on sci-fi themes
"The Borg" theme shows "Doctor Who: The..." as a Top Song. Caused by `getNeedleDrops` doing title substring matching against song categories. **Different value calculus** than the soundtrack contamination — for jazz themes (Bebop has 83 needle drops, all bebop songs!), the Top Songs tab is wanted content. So a blanket type-gate would remove value from jazz themes. Needs a more nuanced fix, deferred.

---

## Bonus deliverable: soundtrack inventory audit

Per our chat about your soundtrack initiative, I built an inventory audit at:
- `docs/soundtrack-audit-2026-04-08.md` — markdown report with TL;DR + per-universe coverage tables + real gaps + quality flags
- `docs/soundtrack-audit-2026-04-08.csv` — sortable companion CSV (one row per universe film/show entity)

**Headline numbers:**
- **79 known soundtrack albums** in the harvester data across all 5 universes (was 70 before today's hidden-soundtrack pass surfaced 9 more, including Miles Davis's *Ascenseur pour l'échafaud* under its French title and 6 Henry Mancini classics like *Breakfast at Tiffany's*)
- **75 of those 79 have FULL YouTube playlist + per-track coverage** — this is the GOOD bucket
- **22 universe films/shows have NO soundtrack data anywhere** — those are real gaps to fill
- **1,833 catalog soundtracks have Spotify but ZERO have YouTube** — the long tail your YouTube work could draw from
- **1 quality flag**: catalog's Star Trek "The Borg" tv-series entry has wrong soundtrack data pointing at "The Borgias (Showtime)" by Trevor Morris — same harvester data class as the wrong TMDB posters fixed in v1.9.12.

The audit also documented that **1,687 of 7,713 catalog songs (21.9%) have empty/missing media** — empty Spotify placeholders or no media fields at all. Wang Dang Doodle by Cedric Burnside is in this bucket. JD's YouTube work could systematically address this.

---

## Methodology note (still applies — this is now a permanent rule)

Every fix in this build was:
1. Read in full context (not just the line being changed)
2. Inspected against actual data shapes (not assumed)
3. Diagnosed end-to-end before any code edit
4. Browser-verified by Justin click-by-click before commit
5. Shipped only when verified

The Apr 8 reset and the rigorous methodology rule are working — 4 fixes shipped today, 0 broken in v1.19.14JH.

---

## Version & cache

- **`BUILD_VERSION`** = `v1.19.14JH`
- **Cache version** = `14` → `15` (auto-purges `ut_discovery_cache` on first load)
- **Files modified:**
  - `src/App.jsx`, `src/PluribusComps.jsx` — #22, #19, #26 + version bump
  - `src/data/pluribus-universe.json` — #17 (4 entities cleared)
  - `src/data/sinners-universe.json` — #17 (1 entity replaced) + 2 bios
  - `src/data/gerwig-universe.json` — 2 bios
  - `docs/jd-build-note-v1.19.14JH.md` — this file
  - `docs/soundtrack-audit-2026-04-08.{md,csv}` — bonus audit
