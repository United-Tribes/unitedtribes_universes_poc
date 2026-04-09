# v1.19.15 — Build Note for JD

> **Branch**: `justin/apr-8-v1.19.14JH` (extended; consider renaming branch when merging)
> **Date**: April 9, 2026
> **Cache version**: 15 → 16 (auto-purges localStorage discovery cache on first load)
> **Built on**: v1.9.14 (`6340ce7` on `main`) + v1.19.14JH (`86b2f84`) — v1.19.15 is the next iteration on top of yesterday's afternoon ship

## Summary

Single-day build with a critical bug fix, three data-quality cleanup passes, an architectural improvement, and the start of the book Amazon URL initiative for your book modal interface work.

| Item | Type | What you see |
|---|---|---|
| **Sinners → film modal phantom guard** | Code (openPopover) | Clicking "Sinners" from a natural language response now opens the **film** modal (Ryan Coogler) instead of the broken person modal. |
| **Item C — entity label canonical color map** | Code (TYPE_BADGE_COLORS) | Badge colors are now consistent across every render site. BOOKs are purple everywhere. ALBUMs are green. Films are red. No more drift. |
| **Catalog cleanup (8 bad entries)** | Data (catalog) | Removed 4 phantom Sinners/Pluribus/Patti Smith entries, merged Wool Gathering/Woolgathering duplicate, merged 5 Sinners album entries → 1 canonical. |
| **OBAA video cleanup** | Data (universe video indexes) | Removed 4 "One Battle After Another" videos that were incorrectly tagged to bluenote/sinners universes. |
| **Book Amazon URLs (Item B Phase 1)** | Data (catalog) | All 1,104 book entries now have an `amazon_url` field. 62 high-impact books have real verified English-edition Amazon URLs spanning all 5 universes. |

## Critical bug fix: Sinners → film modal

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

Mirrored to `PluribusComps.jsx`. Verified: Sinners → film, Patti Smith → person, Dream of Life album → album modal (not 2008 doc), Ozymandias → episode modal.

### Follow-up filed (Task #10)
A parallel "skip if known person entity" guard exists in `autoEnrichEntity` (App.jsx:25072). The Sinners fix only patched `openPopover`'s local bypass; the modal pipeline still resolves correctly via downstream `detectEntityType`, but ideally the phantom detector should be applied to `autoEnrichEntity` too. Defense-in-depth, not blocking.

## Item C — entity label canonical color map

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

Mirrored to `PluribusComps.jsx`. Verified: BOOK purple, ALBUM green, FILM red consistently across all modal contexts.

## Catalog cleanup (8 bad entries)

The harvester catalogue has multiple known data quality issues. This build removes the most visible ones:

### Removed entries (5 deletions, 2 merges)

1. **`"Sinners"` (song) by Rod Wave** — harvester YouTube-searched for "Sinners" while building soundtrack lists, found Rod Wave's unrelated song, mis-tagged it as a Sinners soundtrack track. **Removed.**

2. **`"Sinners"` (album) by Wunmi Mosaku** — phantom Spotify match. Wunmi Mosaku is the **actress** in Sinners, not a musician. There's no "Sinners" album by her. **Removed.**

3. **`"Pluribus"` (album) with no creator** — 41-source phantom album. **Removed.**

4. **`"Patti Smith"` (song) with garbage creator** — `"Nobel Prize Ceremony Performance- 'Very moving' performance Thomas appreciated"` — a video performance miscatalogued as a song titled "Patti Smith". **Removed.**

5. **`"Wool Gathering"` / `"Woolgathering"`** — duplicate of the same Patti Smith 1992 work, harvester catalogued under both spellings. **Merged**: `"Woolgathering"` (canonical, has openLibrary metadata) is kept, source from `"Wool Gathering"` grafted in, video count bumped to 2.

6. **5 Sinners album entries (Original Score / Original Motion Picture Soundtrack / Original Motion Picture Score / Original Soundtrack)** all sharing Spotify ID `6PQXsiHd4AjrAqhWLd5HyT` plus a "Various Artists" phantom — same album catalogued 5 times due to harvester deduping by exact title string instead of `spotify_album_id`. **Merged into 1 canonical**: `"Sinners (Original Score)"` by `"Ludwig Göransson and Raphael Saadiq"` (109 unique source videos after merge, was 60).

### Items NOT cleaned in this build (filed for follow-up — Task #14)

- Pluribus FICTIONAL in-show books catalogued as real: `"Bitter Chrysalis"` and `"Winds of Wycaro"` by `"Carol Sturka"` (Carol is the show's protagonist, not a real author)
- SONGS miscatalogued as books: `"Baba O'Riley"`, `"Won't Get Fooled Again"` by The Who
- Garbage creator fields: `"Count Basie autobiography"`, `"Kansas City jazz history"`
- Wrong creator attribution: `"The Godfather"` attributed to Francis Ford Coppola (the director) instead of Mario Puzo (the author)

These need either harvester-side filtering or more catalog edits. Not blocking for this build.

## OBAA video cleanup

Found 4 "One Battle After Another" videos incorrectly tagged to wrong universe video indexes via the harvester's video analysis cross-references:

| Removed from | Video |
|---|---|
| **bluenote** | `6582PHiJ7Js` — "'One Battle After Another' Is Great. It's Also Hot." |
| **sinners** | `cLVHHZZbo70` — "Leonardo DiCaprio on his favourite films and OBAA" (BBC) |
| **sinners** | `Us0mySGpH4w` — "Paul Thomas Anderson, Leonardo DiCaprio, Teyana Taylor on OBAA" (Lincoln Center) |
| **sinners** | `AOhHIK4Emtg` — "OBAA Is a Modern Masterpiece" (Ringer Movies) |

These are pure OBAA content with no real Bluenote/Sinners connection — they were tagged via cross-reference matching (e.g., on Leonardo DiCaprio or Paul Thomas Anderson). **Kept**: 2 videos that legitimately discuss Sinners (Autumn Durald Arkapaw cinematography Q&A, "Top 10 Reasons Sinners Deserves Best Picture") even though they cross-reference OBAA.

Cleanup also cascaded through entity references — 32 entities in bluenote and 127 entities in sinners had video references cleaned up.

## Book Amazon URLs — Phase 1 for your book modal

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
- **Bluenote** (~8): Real Book — wait, dropped — Vineland, Coltrane Book, Things Fall Apart, Gravity's Rainbow, etc.

### Verification
Every ISBN was verified against OpenLibrary's `/api/books?bibkeys=ISBN:X` endpoint. **13 wrong-language ISBNs caught and fixed during verification**, including the 1939 racist title variant of "And Then There Were None" — replaced with the modern William Morrow English edition.

All ISBNs use the English language group code (ISBN-10 starting with 0 or 1).

### Hand-corrected during verification
The OpenLibrary search API returned wrong results for 6 books that I hand-fixed using known canonical English ISBNs:
- 1984 → Signet Classics edition
- The Three-Body Problem → Tor English first edition (the search was returning the sequel)
- The Godfather → Mario Puzo Signet edition (the catalog wrongly attributes to Coppola)
- A Doll's House Part 2 → TCG 2018 edition
- One Time, One Place — Eudora Welty 1996 edition
- Tender Is the Flesh → Scribner 2020 English

### What's NOT in this phase
- Books with no openLibrary block (~438 books) — would need a fresh OpenLibrary search step
- Books that resolved to non-English editions and don't have an obvious English fix
- The fictional in-show books, miscatalogued songs, and garbage creator entries (Task #14)

These are all queued for **Item B Phase 2 (v1.19.16)** — a deeper enrichment pass that requires a harvester-side script extension.

## Files touched

- `src/App.jsx` (and mirror `src/PluribusComps.jsx`) — phantom-entity guard in openPopover, canonical TYPE_BADGE_COLORS, build badge updates, cache version bump 15→16
- `src/data/enriched-content-catalog.json` — 8 bad entries removed/merged + amazon_url field added to all 1,104 book entries (62 with real URLs)
- `src/data/blue-note-video-entity-index.json` — 1 OBAA video removed + 32 entity refs cleaned
- `src/data/sinners-video-entity-index.json` — 3 OBAA videos removed + 127 entity refs cleaned
- `docs/jd-build-note-v1.19.15.md` — this file

## Outside this build (paired harvester work)

A separate harvester PR was opened earlier today: [`harvester: TMDB deny guard + YouTube data preservation`](https://github.com/United-Tribes/united-tribes-collaborative/pull/4) — adds the TMDB do-not-enrich guard for 22 entities + skip-already-complete + preserve-existing YouTube guards. Independent of the POC; affects future cron-driven re-harvests. Recommend merging before next bluenote re-harvest cycle.

## Tasks filed for v1.19.16+

- **#10** — `autoEnrichEntity` parallel phantom guard (defense-in-depth for Sinners-class bugs)
- **#11** — Harvester catalog deny list for same-name false positives (root-cause fix complementing the surgical data fixes in this build)
- **#12** — Deeper catalog scan for non-anchor same-name false positives
- **#14** — Catalog data quality cleanup (fictional in-show books, songs miscatalogued as books, garbage creators)
- **Item B Phase 2** — Full openLibrary ISBN enrichment for the remaining ~1,000 books (would need harvester-side script extension)
- **Track D Full** — S3 overrides infrastructure: gear panel author input, sync button, history+revert UI, migration shim
- **Item A** — KG broker latency: handoff memo for Shanan recommending response caching + Lambda warming

## How to test

1. **Hard refresh** (Cmd+Shift+R) — cache version bump auto-purges discovery cache on first load
2. **Sinners modal**: search "Sinners" or click it from any natural language response → should open as the Ryan Coogler **film** modal
3. **Sinners album**: open any Sinners-context video modal, check Discovery section → should see **1** Sinners (Original Score) card, not 5 lookalikes
4. **Entity labels**: open any Catalog Item modal → BOOK badges purple, ALBUM badges green, FILM badges red across all sections
5. **Book amazon_url**: open browser console: `(await import("./data/enriched-content-catalog.json")).default.content.find(c => c.title === "Just Kids")?.amazon_url` → should return `"https://www.amazon.com/dp/0747568766"`. Or wait until you wire up the display code.
