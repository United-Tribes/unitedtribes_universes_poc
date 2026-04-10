# v1.19.14JH (extended) — Combined build note for Apr 8 + Apr 9 work

> **You're pulling two days of work in one merge.** This branch was originally cut and pushed on Apr 8 evening as v1.19.14JH (commit `86b2f84`), then extended on Apr 9 with another full day of fixes. You haven't pulled either day yet — this single pull gives you everything from both days. The badge still reads `v1.19.14JH` to keep the version label stable since this is one continuous iteration.

> **Branch**: `justin/apr-8-v1.19.14JH`
> **Built on**: v1.9.14 (`6340ce7` on `main`) — strict superset, all your modal width / video stabilization / film card fixes intact
> **Apr 8 commits**: `86b2f84` (main) + `4d889fb` (badge hash)
> **Apr 9 commits**: `7067c36` (main) + `87afeb9` (badge hash) → and the badge-version follow-up that produced this note
> **Cache version**: 14 → 16 (auto-purges localStorage discovery cache on first load)

## Pull Instructions

```bash
cd ~/Desktop/unitedtribes_universes_poc
git fetch origin justin/apr-8-v1.19.14JH
git checkout justin/apr-8-v1.19.14JH
git pull
npm run dev
```

**One-time on first load**: the app automatically purges `ut_discovery_cache` (cache version `14` → `16`). Console will show:
```
[Cache] Purged stale discovery cache (v16: phantom-entity guard for Sinners modal + catalog cleanup + OBAA video cleanup + canonical TYPE_BADGE_COLORS + book amazon_url schema)
```
YouTube overrides, type overrides, library, and author name are all preserved.

---

# Section 1 — Apr 8 work (originally shipped as v1.19.14JH)

Four code/data fixes that closed out the recurring "modal lookup context loss" pattern — call sites have type/intent, but lookup functions ignore it and return wrong-context results.

## 1. Type-aware catalog photo fallthrough (#22)
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

## 2. Bug B Ozymandias — episode → episode modal + EPISODE badge (#19)
**Symptom:** clicking the Ozymandias thumbnail in the Works Discussed strip of a Breaking Bad video modal opened the Shelley book modal instead of the Breaking Bad S5E14 episode modal. Carry-over from v1.9.12.

**Root cause:** two-part bug.
1. **`_typeCompat` maps in both `onNavigate` and `openPopover` had no `episode` key.** When the click hint was `type='episode'`, the type-validation gate silently skipped (because `_allowedTypes = _typeCompat['episode'] === undefined`), so `autoEnrichEntity` was allowed to return the wrong-typed catalog entry (the Shelley poem).
2. **The Works Discussed click handler at App.jsx:3870 was passing `null` as the `catalogItemOverride`** even though the click handler had the FULL catalog item in scope as `item`. So `onNavigate` had to re-resolve via `autoEnrichEntity` instead of using the actual clicked entry.

**Fix:** four edits.
- Both Works Discussed click handlers (App.jsx:3870 + 4005) now pass `item` as `catalogItemOverride` — bypasses `autoEnrichEntity` entirely.
- Both type-compat maps (`_typeCompatOP` at 25151, `_typeCompat` at 26373) now include `episode: new Set(['episode'])` as defense in depth for any click path that lands here without a `catalogItemOverride`.
- Plus 3 small edits to the enriched modal renderer: new `isEpisodeType` flag, suppressed "Directed by" prefix for episodes (creator field for episodes is "Breaking Bad S5E14", reads weirdly with "Directed by"), and new "EPISODE" badge text.

**Verified in browser:** click "How Breaking Bad Pulled Off An Impossibly Perfect Finale" video → Works Discussed → Ozymandias → opens episode modal with EPISODE badge, "Breaking Bad S5E14 · Breaking Bad Essential Episodes" subtitle, Hank's Death YouTube clip, Apple TV+/Criterion buttons. Correct.

## 3. Wrong-context videos cleared from 5 patched theme entities (#17 — reclassified to data fix)
**Symptom:** clicking certain theme entities showed completely unrelated trailer videos. The Borg theme played the Bjorn Borg vs John McEnroe (2017) tennis biopic trailer. The Others theme played the Nicole Kidman 2001 horror film trailer. The Joining played a random IGN convention trailer. hive mind played a random indie horror film called "Hive Mind". Vampirism played a generic John Carpenter vampire trailer.

**Root cause:** harvester pipeline error. The harvester ran YouTube search on the entity name and stored the first result into `quickViewGroups[0].items[0]` of each entity in the universe JSONs. None of these matches were context-appropriate.

**Fix:** surgical edits to `pluribus-universe.json` and `sinners-universe.json`:
- **The Borg, The Others**: removed the wrong `quickViewGroups[0]` group; the legitimate Pluribus video group at index 1 becomes index 0
- **The Joining, hive mind**: only had one (wrong) group; removed it entirely. Modal now uses entity-index videos via `lookupFeatureVideos` which surfaces correctly-contextual content
- **Vampirism**: replaced the John Carpenter trailer with **"Ryan Coogler talks Sinners, vampires and capitalism (SPOILERS)"** by Hanna Flint — a director interview that frames vampirism as a metaphor for predatory capitalism. Same group label changed from "Trailers" to "Discussions".

## 4. Album cards in Related tab — catalog poster fallback (#26)
**Symptom:** clicking into a theme/concept entity's Related tab, ALBUM-typed work cards showed navy placeholder rectangles instead of the album cover, even when the catalog had perfectly good album art. Surfaced when looking at Free Jazz theme — the "Free Jazz" album by Ornette Coleman (the iconic Jackson Pollock painting cover) was rendering as a placeholder.

**Root cause:** the `_ewCatalog` lookup in both Related-tab render sites only fired for `_isFilm` cards. Album cards fell through to `w.posterUrl || w.photoUrl || null`, and since the harvester data had empty strings for those fields, the placeholder rendered.

**Fix:** extended the `_ewCatalog` lookup to also fire for `_isAlbumCard`, pulling `spotify.album_art_url` from same-titled album catalog entries. Same shape as your film fix #18, just one more branch.

**Verified in browser:** Free Jazz theme → Related tab → Free Jazz album card now shows the actual Ornette Coleman album cover.

## 5. Bonus: 4 missing theme bios written
While verifying #17 the Vampirism modal showed "No overview available." A scan revealed that 4 of the 22 LOCAL_ENTITY_PATCHES theme entities had `bio: ['No overview available.']` placeholder strings instead of real descriptions. The other 18 had hand-curated copy.

**Filled in:** Vampirism (sinners), Mississippi Delta Blues (sinners), French New Wave (gerwig), Mumblecore (gerwig).

---

# Section 2 — Apr 9 work (added on top of Apr 8)

A critical bug fix, three data-quality cleanup passes, an architectural improvement, and the start of the book Amazon URL initiative for your book modal interface work.

## 6. Sinners → film modal phantom-entity guard 🚨 critical fix

### What was broken
Clicking "Sinners" from a natural language response opened a person modal instead of the Ryan Coogler film modal. The user saw an empty avatar circle with "Person" subtitle and "No biography available."

### Root cause
Two-layer bug:

1. **The data has been wrong since `a4f134b` (universe expansion commit)**: `entities["Sinners"]` in `sinners-universe.json` is typed as `'person'` with placeholder bio `["No biography available."]` and subtitle `'Person'`. The harvester's KG entity classification mistyped the universe's anchor film when the universe was first created.

2. **The bug was masked until Apr 5**: before commit `6c8a4e54` (your "Pass type when known — modal trusts it" change), `openPopover` called `setUniversalModalSafe(entityKey)` with just the string. The downstream modal would call `detectEntityType("Sinners")` which uses heuristics (catalog match, title pattern) and returned `'film'` correctly. After the Apr 5 change, the modal trusts `entities['Sinners'].type = 'person'` and skips the heuristic — so the latent data bug became visible.

### The fix
Added a **phantom-entity detector** in `openPopover` (App.jsx ~line 25160):

```js
const _bio0OP = (_ent?.bio || [])[0];
const _isPhantomEntOP = _entType === 'person'
  && _bio0OP === 'No biography available.'
  && _ent?.subtitle === 'Person';
const _effectiveTypeOP = _isPhantomEntOP ? null : _entType;
```

When all three conditions match, the modal treats the entity as untyped and falls through to `detectEntityType`, which finds the catalog film entry correctly. Real persons (Patti Smith, Greta Gerwig, Vince Gilligan) have populated bios + meaningful subtitles, so the detector returns false for them — no regressions.

Verified: Sinners → film, Patti Smith → person, Dream of Life album → album modal (not 2008 doc), Ozymandias → episode modal.

### Note for your awareness
A parallel "skip if known person entity" guard exists in `autoEnrichEntity` (App.jsx:25072) with the same shape. The Sinners fix only patched `openPopover`'s local bypass; the modal pipeline still resolves correctly via downstream `detectEntityType`, but ideally the phantom detector should be applied to `autoEnrichEntity` too. Filed as a small follow-up — defense-in-depth, not blocking.

## 7. Item C — entity label canonical color map

### What was wrong
At least **4 different sources of truth** for badge colors across 8+ render sites:
- Local inline switches (sites 1, 7) — BOOK was BLUE
- Your `TYPE_BADGE_COLORS` constant scoped to one IIFE (sites 10–13) — BOOK was PURPLE
- entityWorks switch (site 14) — BOOK was PURPLE, no ALBUM case at all
- Hardcoded `#E53935` regardless of type (sites 4, 8) — BOOK badges showed RED

Plus 2 sites had **no badge at all** (Catalog Item Discovery → Related Discovery tab, both modes).

### The fix
Promoted `TYPE_BADGE_COLORS` to **module scope** at App.jsx ~line 1229, expanded to cover all labels produced by `typeBadgeLabel()`, used your existing values as canonical (BOOK = purple `#7c3aed`):

```js
const TYPE_BADGE_COLORS = {
  // Film / TV — red
  MOVIE: "#dc2626", FILM: "#dc2626", TV: "#dc2626",
  DOCUMENTARY: "#dc2626", DOCUSERIES: "#dc2626",
  // Music — green
  ALBUM: "#16803c", SONG: "#16803c",
  // Books / Reading — purple
  BOOK: "#7c3aed", NOVEL: "#7c3aed", MEMOIR: "#7c3aed",
  POEM: "#7c3aed", PLAY: "#7c3aed", NOVELLA: "#7c3aed", SCREENPLAY: "#7c3aed",
  // People — blue
  ARTIST: "#2563eb", PERSON: "#2563eb", MUSICIAN: "#2563eb",
  // Episodes — gold
  EPISODE: "#f5b800",
  // Other — neutral
  "VIDEO ESSAY": "#4b5563", PODCAST: "#4b5563",
  _fallback: "#4b5563",
};
```

All 8 render sites now use this map. The 2 missing-badge sites now render badges. Local IIFE constant deleted.

Verified: BOOK purple, ALBUM green, FILM red consistently across all modal contexts.

## 8. Catalog cleanup (8 bad entries removed/merged)

The harvester catalog has multiple known data quality issues. This pass removes the most visible ones:

### Removed entries (5 deletions, 2 merges)

1. **`"Sinners"` (song) by Rod Wave** — harvester YouTube-searched for "Sinners" while building soundtrack lists, found Rod Wave's unrelated song, mis-tagged it as a Sinners soundtrack track. **Removed.**

2. **`"Sinners"` (album) by Wunmi Mosaku** — phantom Spotify match. Wunmi Mosaku is the **actress** in Sinners, not a musician. There's no "Sinners" album by her. **Removed.**

3. **`"Pluribus"` (album) with no creator** — 41-source phantom album. **Removed.**

4. **`"Patti Smith"` (song) with garbage creator** — `"Nobel Prize Ceremony Performance- 'Very moving' performance Thomas appreciated"` — a video performance miscatalogued as a song titled "Patti Smith". **Removed.**

5. **`"Wool Gathering"` / `"Woolgathering"`** — duplicate of the same Patti Smith 1992 work, harvester catalogued under both spellings. **Merged**: `"Woolgathering"` (canonical, has openLibrary metadata) is kept, source from `"Wool Gathering"` grafted in, video count bumped to 2.

6. **5 Sinners album entries** (Original Score / Original Motion Picture Soundtrack / Original Motion Picture Score / Original Soundtrack) all sharing Spotify ID `6PQXsiHd4AjrAqhWLd5HyT` plus a "Various Artists" phantom — same album catalogued 5 times due to harvester deduping by exact title string instead of `spotify_album_id`. **Merged into 1 canonical**: `"Sinners (Original Score)"` by `"Ludwig Göransson and Raphael Saadiq"` (109 unique source videos after merge, was 60).

### Items NOT cleaned in this build (filed for future)

- Pluribus FICTIONAL in-show books catalogued as real: `"Bitter Chrysalis"` and `"Winds of Wycaro"` by `"Carol Sturka"` (Carol is the show's protagonist, not a real author)
- SONGS miscatalogued as books: `"Baba O'Riley"`, `"Won't Get Fooled Again"` by The Who
- Garbage creator fields: `"Count Basie autobiography"`, `"Kansas City jazz history"`
- Wrong creator attribution: `"The Godfather"` attributed to Francis Ford Coppola instead of Mario Puzo

These need either harvester-side filtering or more catalog edits. Not blocking.

## 9. OBAA video cleanup

Found 4 "One Battle After Another" videos incorrectly tagged to wrong universe video indexes via the harvester's video analysis cross-references:

| Removed from | Video |
|---|---|
| **bluenote** | `6582PHiJ7Js` — "'One Battle After Another' Is Great. It's Also Hot." |
| **sinners** | `cLVHHZZbo70` — "Leonardo DiCaprio on his favourite films and OBAA" (BBC) |
| **sinners** | `Us0mySGpH4w` — "Paul Thomas Anderson, Leonardo DiCaprio, Teyana Taylor on OBAA" (Lincoln Center) |
| **sinners** | `AOhHIK4Emtg` — "OBAA Is a Modern Masterpiece" (Ringer Movies) |

These are pure OBAA content with no real Bluenote/Sinners connection — they were tagged via cross-reference matching. **Kept**: 2 videos that legitimately discuss Sinners (Autumn Durald Arkapaw cinematography Q&A, "Top 10 Reasons Sinners Deserves Best Picture") even though they cross-reference OBAA.

Cleanup also cascaded through entity references — 32 entities in bluenote and 127 entities in sinners had video references cleaned up.

## 10. Book Amazon URLs (Item B Phase 1) — for your book modal interface work

This is the **start** of the Amazon URL initiative for the book modal interface. Phase 1 focused on infrastructure and a high-impact seed set:

### Schema
Every book entry in `enriched-content-catalog.json` now has an `amazon_url` field. Either a real URL or `null`. Consume in your display code as:
```jsx
{book.amazon_url && <a href={book.amazon_url} target="_blank" rel="noopener">Buy on Amazon</a>}
```

### Coverage
**62 of 1,104 books** have real verified English-edition Amazon URLs spanning **all 5 universes**:
- **Sinners** (~18): The Warmth of Other Suns, Blues People, Deep Blues, Just Kids, Beloved, Mules and Men, Their Eyes Were Watching God, etc.
- **Gerwig** (~15): Little Women, Slouching Towards Bethlehem, A Room of One's Own, Jo's Boys, Little Men, August: Osage County, etc.
- **Pluribus** (~14): Childhood's End, 1984, Brave New World, The Three-Body Problem, The Left Hand of Darkness, Ender's Game, Tender Is the Flesh, etc.
- **Patti Smith** (~25): All available Patti-authored works (Just Kids, M Train, Devotion, Year of the Monkey, Bread of Angels, The Coral Sea, Witt, Woolgathering) + her literary influences (Naked Lunch, Illuminations, Mrs. Dalloway, In Cold Blood, Milton, Peter Pan, etc.)
- **Bluenote** (~8): Vineland, Coltrane Book, Things Fall Apart, Gravity's Rainbow, etc.

### Verification
Every ISBN was verified against OpenLibrary's `/api/books?bibkeys=ISBN:X` endpoint. **13 wrong-language ISBNs caught and fixed during verification**, including the 1939 racist title variant of "And Then There Were None" — replaced with the modern William Morrow English edition. All ISBNs use the English language group code (ISBN-10 starting with 0 or 1).

6 books hand-corrected during verification (1984, Three-Body Problem, The Godfather, A Doll's House Part 2, One Time One Place Mississippi, Tender Is the Flesh).

### What's NOT in this phase
- Books with no openLibrary block (~438 books)
- Books that resolved to non-English editions and don't have an obvious English fix
- The fictional in-show books, miscatalogued songs, and garbage creator entries

These are queued for **Item B Phase 2** — a deeper enrichment pass that requires a harvester-side script extension.

---

# Combined files manifest

| File | Apr 8 changes | Apr 9 changes |
|---|---|---|
| `src/App.jsx` | Type-aware `_catalogTypeCompat`, `episode:` keys in both `_typeCompat` maps, Works Discussed click handlers pass `catalogItemOverride`, isEpisodeType flag + EPISODE badge in enriched modal renderer, `_isAlbumCard` branch in `_ewCatalog` | Phantom-entity guard in `openPopover`, canonical `TYPE_BADGE_COLORS` at module scope (replaces 4+ inline switches), badge added to 2 missing-badge sites, hardcoded `#E53935` replaced at 2 sites, build badge bump |
| `src/PluribusComps.jsx` | Mirror | Mirror |
| `src/data/pluribus-universe.json` | 4 wrong-context theme entities cleared | (untouched) |
| `src/data/sinners-universe.json` | Vampirism wrong-trailer replaced + 2 bios filled in | (untouched) |
| `src/data/gerwig-universe.json` | 2 bios filled in | (untouched) |
| `src/data/enriched-content-catalog.json` | (untouched) | 8 bad entries removed/merged + amazon_url field added to all 1,104 books (62 with real URLs) |
| `src/data/blue-note-video-entity-index.json` | (untouched) | 1 OBAA video removed + 32 entity refs cleaned |
| `src/data/sinners-video-entity-index.json` | (untouched) | 3 OBAA videos removed + 127 entity refs cleaned |
| `docs/jd-build-note-v1.19.14JH.md` | Original Apr 8 standalone note | (left in place as historical record) |
| `docs/jd-build-note-v1.19.14JH-extended.md` | (didn't exist) | This file — combined Apr 8 + Apr 9 notes |

---

# Companion harvester PR (separate repo, also shipped Apr 9)

PR #4 against `United-Tribes/united-tribes-collaborative`: **harvester: TMDB deny guard + YouTube data preservation**

Three improvements to the harvester that share one theme: stop the harvester from clobbering known-good data.

1. **TMDB do-not-enrich deny guard** — 22 entities (jazz movements, Star Trek concepts, books, places) whose names collide with film titles in TMDB's search index now short-circuit before the TMDB call. Source-of-truth pointer in the comment ties the deny set to the POC's `LOCAL_ENTITY_PATCHES`.

2. **Skip-already-complete YouTube guard** — when re-harvesting an album that already has `youtube_playlist_id` and at least one track with `youtube_video_id`, copy the existing YouTube fields and skip the YouTube fetching block. Saves significant quota — without this, the default `--youtube` mode burns 10K+ quota units per run on already-good data.

3. **Preserve-existing YouTube guard** — defense-in-depth for albums the skip-complete guard didn't skip. Walks freshly-regenerated artists, looks up existing albums by `spotify_album_id`, grafts back any `youtube` / `youtube_playlist` / per-track `youtube_video_id` values that the new run is missing.

Plus **Sonny Rollins Vol 1 + Vol 2** added (previously in `_stats.albums_missed`) using a new object-form override in `poc-artists.json`. Per-track YouTube IDs HTML-scraped (zero API quota cost) and merged in.

Independent of this POC commit; affects future cron-driven re-harvests. Recommend merging before next bluenote re-harvest cycle.

---

# Version & cache

- **`BUILD_VERSION`** = `v1.19.14JH` (extended; same version label as Apr 8 since this is one continuous iteration)
- **Cache version** = `14` → `16` (auto-purges `ut_discovery_cache` on first load — combined skip from Apr 8's v15 and Apr 9's v16)

---

# Methodology note (unchanged from Apr 8)

Every fix in this build was:
1. Read in full context (not just the line being changed)
2. Inspected against actual data shapes (not assumed)
3. Diagnosed end-to-end before any code edit
4. Browser-verified click-by-click before commit
5. Shipped only when verified

The Apr 8 reset and the rigorous methodology rule continue to work — 4 fixes shipped Apr 8 + 5 more on Apr 9, 0 broken in either day.

---

# How to test (combined)

After pulling, hard refresh and verify:

### Apr 8 fixes
1. Click "Bebop" or "Free Jazz" theme → hero photo is correct (not a song's Spotify art)
2. Click "I Am Legend" → shows the Matheson novel cover, not the Will Smith poster
3. Open a Breaking Bad video modal → Works Discussed → Ozymandias → opens episode modal with EPISODE badge
4. Click "Vampirism" theme → "Discussions" group with the Coogler interview, not the Carpenter trailer
5. Click "Free Jazz" theme → Related tab → Free Jazz album shows the Ornette Coleman cover

### Apr 9 fixes
6. Click "Sinners" from any natural language response → opens as the Ryan Coogler **film** modal
7. Open any Catalog Item modal → BOOK badges purple, ALBUM badges green, FILM badges red across all sections
8. Open any Sinners-context video modal, check Discovery section → only 1 Sinners album card (not 5 lookalikes), no Rod Wave / Wunmi Mosaku duplicates
9. (Once your book modal is wired) Open a book entry like "Just Kids" — `book.amazon_url` is populated and the link resolves to the correct English edition on Amazon
