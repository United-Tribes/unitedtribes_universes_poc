# Build Note: v1.9.10 — Comprehensive Routing Fixes + Orphan Card Filter

**Branch:** `justin/apr-7-routing-fix-v2` (cut from v1.9.8 baseline `0e204c1`, includes everything from v1.9.9)
**Baseline:** v1.9.8 — strict superset, no v1.9.9 needed
**Date:** April 7, 2026

## Pull Instructions

```bash
cd ~/Desktop/unitedtribes_universes_poc   # or wherever your repo lives
git fetch origin justin/apr-7-routing-fix-v2
git checkout justin/apr-7-routing-fix-v2
npm run dev
```

**One-time on first load:** the app automatically purges stale entries from `ut_discovery_cache` (cache version bumped to `"7"`). Console will show:
```
[Cache] Purged stale discovery cache (v7: discovery card type-hint fix)
```
No manual action needed. Your YouTube overrides, type overrides, library, and author name are preserved (the purge is targeted to the discovery cache only).

---

## What's In This Build

This is a single-day surgical pass that fixes a whole class of routing bugs we found while testing the v1.9.9 person-routing fix from this morning. Every fix is in `App.jsx` in the modal routing region (~lines 1600–4400). No data files changed, no S3 uploads, no architectural restructuring.

### The Problem We Were Solving

Yesterday evening you saw Robert Mapplethorpe's modal open as a Charlie XCX song ("Apple"). v1.9.9 fixed that specific bug. While validating v1.9.9 this morning, we found ~10 more cases of the same general bug class — entities of one type opening modals for unrelated entities of a different type. Each case had a slightly different root cause but they all fall into one of two patterns:

1. **Substring/fuzzy false positives** — short names matching against unrelated catalog entries
2. **Type-blind routing** — click handlers losing the entity's type, then catalog lookups picking the first title match regardless of type

v1.9.10 plugs every leak we found. The fixes layer together: caller passes type → modal pipeline respects type at every checkpoint → wrong-type catalog matches get rejected → cards that lead to empty modals get filtered out before they're even shown.

### Specific Fixes (in routing pipeline order)

#### 1. Discovery card click handlers now pass type
Click handlers in the "Read, Watch & Listen" sections (films, books, songs, related works, collaborators, artist hero, otherAlbums, entityWorks — both simple-mode and full-mode) were dropping `type` when calling `onNavigate`. The receiving modal then fell back to `detectEntityType` which often returned `unknown`, opening the door for downstream substring scans to misroute the click.

**Fixed:** all 7 discovery card click handlers now pass the card's type as the 5th arg of `onNavigate`. Free-text entity tags in narrative text (which use `openPopover`) were already passing type — this only affected discovery strip clicks.

**Symptom you saw:** clicking "Robert E. Fulton III Edit of Burroughs: The Movie" from the WSB modal opened a Rod Wave song modal because the click came in with `hint: none` and the harvester substring scan matched "the movie" → "Better" inside Rod Wave's track listing.

#### 2. `autoEnrichEntity` is now type-validated at the call site
Both `openPopover` and `onNavigate` call `autoEnrichEntity` to find a catalog match before opening the modal. The catalog lookup is type-blind — it returns the first title match with usable IDs. So clicking Patti Smith's album "Dream of Life" was returning the 2008 Steven Sebring documentary of the same name.

**Fixed:** when the caller specifies a type, the catalog match is now validated against a type compatibility table. If the caller said "this is an album" and `autoEnrichEntity` returns a documentary, the result is rejected and the click flows through normally.

**Also added a bypass list:** for `album/person/musician/artist/theme/character` clicks, `autoEnrichEntity` doesn't even run — these types have their own modal paths (harvester, simple mode) and shouldn't be hijacked by same-named films/docs in the catalog.

**Symptom you saw:** Patti Smith's "Dream of Life" album opening as the Sebring documentary; clicking a film card "Lady" opening a D'Angelo song.

#### 3. Inline catalog intercept is now type-mutex
There's a second catalog intercept inside the modal pipeline itself (App.jsx ~1765) that runs *after* `autoEnrichEntity` is set. It was building its content-types match set as a **union** of song/book types AND film types — so even when the click was for a film, it would still match a same-named song. This was the second hijack point that made my first Lady fix incomplete.

**Fixed:** the intercept now picks **mutually exclusive** type sets based on the caller's `_isFilmType` / `_isSongBookType` flags. Film clicks only match film/doc/tv types. Song/book clicks only match song/book types. Untyped clicks fall back to the original union behavior.

#### 4. Two-pass priority in `findAlbumInArtist` (the Birdland fix)
Was already in v1.9.9 but worth restating here. PRIORITY 2 used to iterate all 161 artists and return the first substring match — which meant Patti Smith's exact "Birdland" track was losing to Art Blakey's "A Night At Birdland" album (substring match) because Art Blakey iterates first in the merged Blue-Note-first artist set.

**Fixed:** two passes. Pass 1 looks for **exact title matches** (track or album, `===`) across all 161 artists. If any found, take it. Pass 2 (only if Pass 1 found nothing) does the fuzzy/word-boundary substring matching. Patti Smith's exact "Birdland" track now wins regardless of iteration order.

#### 5. `NON_MUSIC_DETECTED` extended to cover all raw types
The set used to gate the harvester music substring scan. v1.9.9 only had `["film", "tv_series", "book", "place"]` — missed `theme`, `character`, `show`, raw aliases like `documentary`, `tv-series` (with hyphen, not underscore), `movie`, `novel`, `memoir`, etc.

**Fixed:** the set now lists all raw universe-data types comprehensively. Click a theme/character/show entity and the harvester music scan is bypassed. Hoisted to the outer modal pipeline scope so the discovery cache check (below) can also reference it.

**Symptoms this fixed:** clicking "Pluribus" the show, "Carol Sturka" the character, "Romance" the theme — none of these can fall into the harvester music scan now.

#### 6. `_hasAnalyzedVideo` upstream gate is now word-boundary checked
This is the gate that decides whether the modal goes into full-mode (with media pipeline) or simple-mode (bio + KG only). It was doing bidirectional unbounded `.includes()` matching of the entity name against video titles in the index. Names like "Carol" matched every video with "carol" anywhere, including "Caroline".

**Fixed:** word-boundary regex check, 5-char minimum. Same pattern as the v1.9.9 `findAlbumInArtist` substring fix.

#### 7. Discovery cache type-mismatch invalidation
When you clicked "Better Call Saul" earlier, the harvester ran in parallel with `autoEnrichEntity` and saved a poisoned cache entry (Rod Wave "Better") even though the visible modal was correct (TV from `enrichedModalItem`). On the next click of the same entity, the cache hit fired *before* the routing logic and returned the poisoned data.

**Fixed:** the discovery cache check now inspects the cached entry's shape. If it contains music data (`spotify`/`ytAlbum`/`album`/`isArtist`/`isSong`) but the current click's type is in `NON_MUSIC_DETECTED`, the cache entry is invalidated on the fly and the entity re-resolves cleanly. Self-healing for any future stale cache mismatch — no more cache version bumps needed for this class.

#### 8. Early-bailout in harvester pipeline when `enrichedModalItem` is set
Same root issue as #7 — the harvester was running even when `autoEnrichEntity` had already resolved the entity, causing duplicate work and the cache poisoning that #7 cleans up.

**Fixed:** one-line guard at the top of the harvester async block: `if (enrichedModalItem) return;`. Stops the harvester from doing redundant work.

#### 9. Type-aware orphan card filter (the big behavioral change you'll notice)
The "Read, Watch & Listen → Related" tab in every modal now filters out cards whose entity has **no content in any compatible data layer**. A film card whose only catalog match is a same-named song gets hidden. A "completeWorks" entry that doesn't exist anywhere in `entities`, `enriched-content-catalog`, `artist-albums`, or any video index gets hidden.

**Symptom this fixed:** the WSB modal used to show 12+ "Related" cards that opened empty modals when clicked ("This Is Buzz", "William S. Burroughs: The Possessed", "Robert E. Fulton III Edit of Burroughs: The Movie", etc.). Now those cards are filtered out before render.

**What stays:** people, themes, characters with bios in universe data; films/books with TMDB enrichment; music entities in artist-albums; anything with video coverage in the analyzed-video index.

**Tab badge counts** are updated to reflect the filtered count. If "Related" ends up empty after filtering, the tab is hidden (auto-switches to Top Songs or Featured Discovery).

You'll see new console logs like:
```
[Modal] Filtered 12 orphan cards from Related (simple mode) for "William S. Burroughs"
[Modal] Filtered 4 orphan cards from Related (full mode) for "Robert Mapplethorpe"
```

This is intentional and a good signal that the filter is working.

---

## Testing Checklist

### Routing fixes (must pass)
- [ ] **Robert Mapplethorpe** (Patti Smith universe) → person modal with bio, no song hijack
- [ ] **William S. Burroughs** (Patti Smith universe) → person modal
- [ ] **Patti Smith** herself → artist modal with Spotify embed and 11 albums
- [ ] **Easter** (Patti Smith album) → album modal with tracklist
- [ ] **Birdland** (free-text click) → Patti Smith's track, NOT Art Blakey's album
- [ ] **Dream of Life** (Patti Smith album) → album modal with Spotify, NOT the 2008 Sebring documentary
- [ ] **Better Call Saul** → TV modal via enriched catalog, no Rod Wave junk
- [ ] **Pluribus** (the show) → TV modal
- [ ] Click any film card from a person modal — opens as the right film type, no song hijack

### Orphan filter behavior (visible UI change)
- [ ] WSB modal "Related" tab shows fewer cards than before; console shows `Filtered N orphan cards` log
- [ ] Mapplethorpe modal: "Lady" film card no longer appears (had no real film content)
- [ ] Patti Smith modal: discovery cards are still useful — only orphans were removed
- [ ] If a modal has no Related cards at all, the Related tab disappears entirely (auto-switches to Top Songs / Featured Discovery)

### Cache state
- [ ] On first load: console shows `[Cache] Purged stale discovery cache (v7: discovery card type-hint fix)`
- [ ] DevTools → Application → Local Storage → `ut_cache_version` is `"7"`
- [ ] `ut_yt_overrides`, `ut_type_overrides`, `ut_library`, `ut_author_name` all preserved

---

## Known Issues (NOT Fixed in v1.9.10)

These are documented in `~/.claude/projects/-Users-justin/memory/future-fixes.md` (Justin's local notes). All are deferred for safety / scope reasons.

### #12 — Birdland-class song/album cross-artist matching
The two-pass priority in `findAlbumInArtist` fixes the most demo-relevant case (exact-title-first), but the underlying matching system still has architectural issues:
- No universe scoping — the artist iteration loop walks all 161 artists across all 5 universes in Blue-Note-first order
- No scoring/tiebreaker between multiple fuzzy matches
- Cache key is universe-agnostic — same name in two universes shares one cache entry

**Status:** captured as item #12 in `future-fixes.md`. Half-day refactor of `findAlbumInArtist` priority + scoring + universe scoping needed. Defer until after this build merges.

### #13(A) — `UTDataClient.getSoundtrack()` does fuzzy/prefix matching
**Symptom you saw:** clicking "Lady" film opens with 95 needle drops from Lady Bird soundtrack. Clicking Charlie Parker's "Lady Bird" song opens with the Lady Bird movie soundtrack pollution.

**Why:** `getSoundtrack()` does prefix matching on soundtrack titles instead of exact matching. A song title that's a prefix or exact match of a soundtrack name pulls in the entire soundtrack's needle drops.

**Fix needed:** require exact title match between the clicked entity and the soundtrack's film name; better, require the entity to be a known track on the soundtrack.

**Status:** captured as item #13(A). Deferred — the helper runs on every modal and fixing it carries regression risk.

### #13(B) — `lookupFeatureVideos` title-includes
**Symptom:** when an entity like "Lady" or "Carol" is clicked, the Featured Discovery sidebar fills with unrelated videos whose titles happen to contain that substring.

**Why:** App.jsx ~line 1517 does raw `.includes()` with a 4-char minimum. No word boundary.

**Fix needed:** apply the same word-boundary check we use in `findAlbumInArtist` and `_hasAnalyzedVideo`. Could be hoisted into a single shared helper.

**Status:** captured as item #13(B). Same deferral reason as #13(A).

### Wrong YouTube videos in enriched catalog (data side)
Some songs in the enriched catalog have YouTube video IDs that don't match the actual song. Example: Charlie Parker's "Lady Bird" had Nils Frahm's "Says (Live on KEXP)" as its assigned video.

**Why:** the harvester pipeline did unscoped YouTube searches and saved whatever the first result was. Documented in `future-fixes.md` items #1, #6, #10 (Norah Jones, Aaliyah, Oklou — same pattern).

**Heuristic count:** ~155 likely-wrong videos by my crude detection (channel name doesn't mention creator), but the heuristic produces many false positives because soundtracks are correctly published under label channels. Real wrong count is probably 50–200 across the 1,856 songs with YouTube enrichment. **Cannot be enumerated automatically.**

**Workaround:** the YouTube override mechanism shipped in v1.9.8 handles this perfectly. When you encounter a wrong video, click ⚙️ in the modal, paste the correct YouTube URL or video ID, save. Override is also synced to S3 via the Share Overrides button so it persists across machines.

**Pre-demo recommendation:** before showing JD any specific demo path, click through the entities he'll click, fix any wrong YouTube videos with overrides, share overrides to S3.

**Status:** systemic data issue. Real fix is in the harvester pipeline (artist-scoped YouTube re-enrichment). Out of scope for this client-side build.

### Override visibility / list view (UX gap)
**Symptom:** there's no way to see which YouTube/type overrides you've saved without inspecting `localStorage` in DevTools. The Library gear panel shows the count and the Share Overrides button but no list view.

**Workaround:** in browser console, run:
```js
JSON.parse(localStorage.getItem("ut_yt_overrides"))
JSON.parse(localStorage.getItem("ut_type_overrides"))
```

**Status:** new finding from this session. Worth adding a list view to the Library gear panel in a follow-up build. Captured as a TODO below.

---

## TODO Items for Next Sessions

In rough priority order:

1. **Pre-demo YouTube override pass** — pick the top ~30 entities JD will click in his demo, manually verify each YouTube video, override + share for any wrong ones. Gets the demo path clean without touching the data pipeline.
2. **Override list view in Library gear panel** — add a small expandable section that shows current YouTube + type overrides with their values. Helps with debugging and demoability of the Share feature.
3. **future-fixes.md #12** — `findAlbumInArtist` priority/scoring rewrite. Half day. Universe scoping, exact-first two-pass with proper scoring, tiebreaker rules.
4. **future-fixes.md #13(A)** — `UTDataClient.getSoundtrack()` exact-match-only.
5. **future-fixes.md #13(B)** — `lookupFeatureVideos` word-boundary check.
6. **Track B (large bundled imports → S3 fetch)** — was the original priority for today before the bug-fix work took over. Still queued for after JD's next merge.
7. **Harvester pipeline fix for wrong YouTube videos** — artist-scoped re-enrichment. Owner: needs Shanan / harvester team conversation.

---

## Key Files Changed

- `src/App.jsx` — all 9 fixes, in the routing region (~lines 1600–4400)
- `src/PluribusComps.jsx` — mirror of App.jsx
- `docs/jd-build-note-v1.9.10.md` — this file

## What's Carried Forward From Earlier Builds

- Everything from v1.9.8 (YouTube override infrastructure, film media mutual exclusion, song collapsing threshold, shared S3 overrides Track A + Track D lightweight)
- Everything from v1.9.9 (person-routing fix for Mapplethorpe/Burroughs)
- All localStorage state preserved (overrides, library, author name, type overrides)

## AWS Infrastructure

No changes. Lambda `ut-overrides-handler` and the `/v1/overrides*` API routes from v1.9.8 are still live and unchanged.

---

Justin · April 7, 2026
