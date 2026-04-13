# JD Build Note — April 13, 2026

**Branch:** `justin/apr-13-title-collision-fix` (pushed to origin)
**Commits:** 4 (rebase-friendly, cherry-pick-safe)
**Status:** Ready for merge or cherry-pick

---

## Summary

Four commits addressing title-collision bugs, label normalization, and data quality. All changes tested in browser. No build badge update in this branch — version label decision is yours.

| Commit | Category | Scope |
|--------|----------|-------|
| `41cc642` | Fix + Data | Title-collision type filtering + 5 catalog cleanups |
| `097bea6` | Fix | Catalog album enriched modal fallback |
| `0e5264c` | Refactor + Feature | Film→Movie/Doc label normalization + override summary UI |
| `a900213` | Data | Sinners entity type person→film |

---

## What was fixed

### 1. Title-collision bug (JD's P0 #5) — `41cc642`

**Problem:** `autoEnrichEntity` returns the first catalog match by title with no type filtering. When two entries share a title (e.g. "Moonage Daydream" as David Bowie song AND Brett Morgen documentary), the wrong one wins depending on array order.

**Repro path that was broken:** Search "Moonage Daydream" → click documentary card → save to wall → click saved tile → opens as Bowie song modal instead of Brett Morgen documentary.

**Fix sites:**
- **`handleItemClick`** (App.jsx:24128) — Uses saved item's type to reject mismatched `autoEnrichEntity` results, re-searches for a compatible match.
- **Simple-mode works render** (App.jsx:3377) — `onNavigate(w.title)` → `onNavigate(w.title, null, null, null, w.type)`. Same pattern as full-mode at 4179.
- **`_catalogTypeCompat`** (App.jsx:2896) — Added `film`, `documentary`, `tv-series`, `movie`, `song`, `composition`, `album` entries for the photo/entityType fallback chain.
- **GoldAdd enriched modal header** (App.jsx:3080) — Saves with creator-qualified key (`"Title — Creator"`) instead of bare title. Prevents checkmark bleed across same-title items.

**Data fixes:**
- Renamed catalog entry "Palo Alto Concert" → "Palo Alto (Live)" to match harvester/Spotify album name.
- Removed 3 song/composition duplicates (Beatles "Across the Universe", "Can't Buy Me Love", "I Should Have Known Better").
- Removed 2 junk Amazing Grace entries (wrong TMDB match + no-creator song that caused Ani DiFranco mismatch).

**Coverage:** 434 title collisions exist in the catalog. All practical code paths are now protected.

**Investigated but NOT fixing:** `openPopover` cross-universe type filtering. Traced all callers — every path through `linkEntities` guarantees type context via the `entities` object (real entities have type in data; synthetic `_work:`, `_song:`, `_ep:` entities are created with explicit types). The null-type fallback is theoretical, not a practical bug.

### 2. Catalog album fallback — `097bea6`

**Problem:** When a catalog album has a Spotify album ID but the artist isn't in the harvester's artist-albums data (e.g. Aretha Franklin's "Amazing Grace"), the modal pipeline falls through to loose title matching and finds the wrong album (Ani DiFranco track).

**Fix:** Catalog search click for album-type items with a Spotify album ID now routes through the enriched modal instead of the harvester pipeline. Sets `enrichedModalItem` to the catalog item directly.

**Trade-off:** Correct album with Spotify embed, but no tracklist or YouTube toggle (the harvester can't provide those without artist-albums data). Better than showing the wrong album entirely.

**Not fully fixed:** The "full album modal" experience for these missing-artist cases would require threading the catalog's Spotify album ID through the harvester pipeline. Larger change — deferred.

### 3. Film→Movie/Doc label normalization (JD's P0 #6) — `0e5264c`

**Problem:** Your handoff flagged inconsistent `"film"` vs `"movie"` terminology. Data is consistently `"film"`, but user-facing badges said "FILM" in some places and the UX preference is "MOVIE"/"DOC".

**Code fixes:**
- `typeBadgeLabel()`: FILM→MOVIE, DOCUMENTARY→DOC, kept TV for series variants.
- `FILM_OR_TV_TYPES` Set defined once, replaces 4 inline OR chains in UniversalModal render section (previously repeated 11-condition comparisons inline).
- `TYPE_BADGE_COLORS`: Added DOC entry (same red as MOVIE/TV).
- GoldAdd category checks: Updated to match new labels — `wType === "MOVIE" || wType === "TV" || wType === "DOC" || wType === "DOCUSERIES"` → "Movies & TV".
- CachePanel type override dropdown: FILM→MOVIE.
- Blue Note info cards: documentaries→DOC badge, films→MOVIE badge.
- Constellation card labels: Film→Movie, added Documentary label.

**New feature — Override summary UI:**
Gear panel (My Stuff → ⚙️) now shows an "OVERRIDES (N)" section listing YouTube, Type, and Soundtrack overrides by entity name. Makes it easy to see what's been saved/shared at a glance. Separate from the Share button count.

### 4. Sinners entity data fix (JD's P1 #13) — `a900213`

**Problem:** `entities["Sinners"]` in sinners-universe.json was mistyped as `type: "person"` with `subtitle: "Person"` and placeholder bio since universe creation (commit `a4f134b`). Previous work added a phantom-entity guard in `openPopover` and `autoEnrichEntity` to work around it, but a clean data fix is better.

**Fix:** Set `type: "film"`, `subtitle: "Ryan Coogler · 2025"`, and a real bio from the TMDB overview. The phantom guard still exists as defense-in-depth for any similarly-mistyped entities, but no longer needs to fire for Sinners.

---

## Testing done

- ✅ Moonage Daydream: search → save → wall click → opens documentary (verified)
- ✅ Moonage Daydream: checkmark bleed — only saved item shows check (verified)
- ✅ Palo Alto (film vs Monk album): both open correct modal (verified)
- ✅ Amazing Grace album → enriched modal with Aretha Franklin Spotify (verified)
- ✅ Film badge says "MOVIE", documentary badge says "DOC" (verified)
- ✅ Sinners entity clicks route to film modal (verified, phantom guard not firing)
- ✅ Override summary lists saved overrides in gear panel (verified)

---

## Known limitations

1. **Amazing Grace** in enriched modal shows Spotify embed only — no tracklist/YouTube toggle. Fix would require threading catalog Spotify album ID into harvester pipeline. Acceptable for now.

2. **Palo Alto search results** show two cards (Gia Coppola film + Monk album). Both work correctly but dedup would reduce noise. Not urgent.

3. **`openPopover` cross-universe type filter** — investigated, determined to be theoretical, not fixed. Documented in `apr-13-session.md` so it doesn't resurface as an open item.

---

## What's NOT included

Items from your handoff and our task queue that weren't touched:

- **P0 #1 How'd I Get Here? narrow rebuild** — your domain
- **P0 #2 Featured Discovery on song+soundtrack modals** — your domain
- **P0 #3 Dead YouTube tracks filtering** — not addressed
- **P0 #4 SoundtrackPlayer drawer sizing** — your domain
- **P0 #7 SoundtrackPlayer redesign** — your domain
- **P1 #8 Sinners sonic poisoning** — already shipped in Apr 12 harvester fixes
- **P1 #9 Soundtrack artist walk** — your domain
- **P1 #10 S3 persistence** — already shipped in Track D Full
- **P1 #11 Per-universe default composer** — your domain
- **P1 #12 Album modal header thumbnail on Spotify override** — your domain
- **Item B Phase 2** (OpenLibrary ISBN enrichment) — not started
- **Track B** (remove large bundled imports) — not urgent

---

## Cherry-pick guidance

If you want to pick individual commits:

- **Must-have**: `41cc642` (title-collision fix) + `a900213` (Sinners data)
- **Nice-to-have**: `0e5264c` (label normalization — user-facing improvement)
- **Optional**: `097bea6` (Amazing Grace workaround — useful for any catalog album with missing harvester artist)

All commits touch `src/App.jsx` + `src/PluribusComps.jsx` mirror. Commit `41cc642` also modifies `src/data/enriched-content-catalog.json`. Commit `a900213` modifies `src/data/sinners-universe.json`.
