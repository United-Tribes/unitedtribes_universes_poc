# Session Handoff — April 11, 2026 (Saturday)

**Session duration:** ~3:00 PM to ~11:15 PM (8+ hours)
**Repo:** `~/Desktop/unitedtribes-pocv2-jd/` on branch `jd/design-reskin-v3`
**Starting version:** v1.9.15-jd (on top of v1.9.14, which was Justin's v1.9.13 merged with J.D.'s v1.9.12 modal work)
**Ending version:** v1.9.17-jd-dev (development branch on top of v1.9.16 merge)
**Port:** 5174

---

## Version chain produced today (chronological, oldest first)

| Version | Hash | Time | Status | What |
|---------|------|------|--------|------|
| v1.9.15-jd | `76e3470` | 10:28 AM today | Interim | Cog-override race condition fix |
| v1.9.15-jd | `5ba6ca9` | 11:28 AM today | Interim | Save key fixes + Save Soundtrack button + single-video overrides |
| v1.9.15-jd | `5850edd` | 1:10 PM today | Interim | Wall round-trip routing + song modal discovery cards |
| v1.9.15-jd | `fb4fb64` | 3:15 PM today | Interim | Orphan album modal + Spotify auto-lookup |
| v1.9.15-jd | `475a298` | 4:18 PM | Interim | Spotify override system — cog, playlist URLs, sentinel semantics |
| v1.9.15-jd | `78706ed` | 5:13 PM | Interim | Render-time Spotify resolution — fixes Moonage Daydream |
| v1.9.15-jd | `95a684b` | 8:54 PM | Interim | Fruitvale Station fix + ci.title bug + How'd I Get Here? revert + debug button removal |
| v1.9.15-jd | `7d01489` | 10:15 PM | Interim | Featured Discovery on SoundtrackPlayer |
| v1.9.15-jd closed | `e287ea8` | 10:33 PM | Shipped | Badge + version tracker close. Pushed to origin + jdagogo |
| **v1.9.16** | **`770dd8f`** | **10:56 PM** | **On main** | **Merge: Justin v1.19.14JH + J.D. v1.9.15-jd** |
| v1.9.17-jd-dev | `4c164be` | 11:00 PM | Dev branch | Badge bump for tomorrow's development |
| v1.9.17-jd-dev | `37c0fc2` | 11:01 PM | Dev branch | Badge hash patch |
| v1.9.17-jd-dev | `857279b` | 11:05 PM | Dev branch (HEAD) | Version tracker: move Featured Discovery drawer sizing to P0 |

---

## What we built today — detailed

### 1. Spotify Override System (commits `475a298`, `78706ed`)

**Problem:** The harvester catalog sometimes returns the wrong Spotify album for an entity. Moonage Daydream returned Thomas James White's unrelated "Brett Morgen Film" score instead of anything by David Bowie. There was no user-facing way to fix it.

**What was built:**

#### a. Spotify Override field in the album modal cog (CachePanel in App.jsx)

- New input field directly below the existing YouTube Override field in CachePanel
- Accepts three input formats: Spotify album URLs (`/album/22chars`), Spotify playlist URLs (`/playlist/22chars`), or bare 22-character Spotify IDs
- Parses input via regex, validates, shows error messages for invalid input
- Writes to `localStorage["soundtrack_overrides_${entityName.toLowerCase().replace(/\s+/g, '_')}"]` under the key `score_spotify`
- Storage format is a prefixed string: `album:ID` or `playlist:ID`
- Green "Save & Reload" button — on click: parses input, writes to localStorage, wipes entire `ut_discovery_cache[cleanN]` entry, calls `onReload()` which bumps `cacheBustCounter` and closes cog panel
- Pre-fill: when cog opens, reads stored value and rehydrates it into a full `open.spotify.com` URL

#### b. Spotify Override field in the Full Player cog (SoundtrackPlayer.jsx)

- Score Spotify field always visible (previously hidden in album mode — backwards, since albums are where the wrong-album problem lives)
- Album mode shows one Spotify field (score slot). Film mode shows both (score + music).
- Uses `extractSpotifyRef()` parser (renamed from `extractSpotifyAlbumId`) returning prefixed strings
- Same sentinel-clear semantics, same merge-don't-clobber save pattern
- `wasSet` tracking distinguishes "user cleared a previously-set field" from "user never touched the field"

#### c. `resolveSpotifyEmbed()` helper — single source of truth

- **Location:** Module scope in App.jsx, above `UniversalModal` declaration (~line 1566)
- **Signature:** `resolveSpotifyEmbed(entityName, fallbackAlbumId, slot = "score_spotify")`
- **Returns:** `{ embedUrl, type, id }` or `null`
- **Logic:**
  1. If `entityName` is falsy, use fallback if available, else return null
  2. Read `localStorage["soundtrack_overrides_${entityName}"]`
  3. If `slot` key is present in stored object (using `"key" in obj` — NOT truthy check):
     - Empty string → return null (explicit clear sentinel — hides Spotify)
     - Non-empty → parse prefix (`album:`, `playlist:`, or bare = album), build embed URL
  4. If `slot` key is absent → no override → use `fallbackAlbumId` if available
  5. If no fallback → return null

#### d. Render-time resolution at the shared read site

- **The fix that finally made Moonage Daydream work.** Two earlier attempts wired the override into code paths that Moonage Daydream's modal didn't actually use (see "What did NOT work" section below).
- Found that ALL non-enriched-catalog render paths feed into a single shared computation at ~line 2783 that builds `spotifyEmbedUrl`. Rewrote it to call `resolveSpotifyEmbed()` at render time. Fresh localStorage read every render — no stale state.
- `_overrideEntityName = directPlaylistData?.filmTitle || name` — critical for key unification across surfaces

#### e. Cross-surface sync

- Album modal's Full Player button at ~line 3465 changed from `title: mediaData.ytAlbum?.title || name` to `title: name` (entity name). Both surfaces now converge on the same localStorage key.

#### f. cacheBustCounter

- State in UniversalModal, included in main mediaData useEffect deps AND in `_fetchKey` AND in orphan album useEffect deps (line ~2008)
- Bumped by Save & Reload to force YouTube re-fetch
- Spotify doesn't need it (render-time resolution is sufficient) but YouTube does

### 2. Fruitvale Station Composer Leak (commit `95a684b`)

**Problem:** Clicking Soundtrack & Score on Fruitvale Station loaded Sinners' OST.

**Root cause:** `sinners-universe.json` has a harvester join bug — Sinners' entire OST entry was stamped onto 41 entities connected to Sinners.

**Fix:** Removed bogus `sonic` field from `entities["Fruitvale Station"]` only. J.D. requested only Fruitvale Station be fixed.

**40 remaining poisoned entities:** Buddy Guy, Delroy Lindo, Hailee Steinfeld, Jack O'Connell, Ludwig Göransson, Michael B. Jordan, Miles Caton, Ryan Coogler, Wunmi Mosaku, Angel Heart, Autumn Durald Arkapaw, Black Panther, Black Panther: Wakanda Forever, Bram Stoker's Dracula, Creed, Eve's Bayou, Get Out, Hannah Beachler, Interview with the Vampire, Jayme Lawson, Li Jun Li, Lola Kirke, Michael P. Shawver, Midnight Mass, Mississippi Delta Blues, Muddy Waters, Near Dark, Nosferatu, Omar Benson Miller, Peter Dreimanis, Raphael Saadiq, Robert Johnson, Ruth E. Carter, Saul Williams, Sev Ohanian, Son House, The Color Purple, Vampirism, Yao, Zinzi Coogler.

**Also fixed:** `ci.title` → `name` at App.jsx line ~4053. Copy-paste bug — `ci` only exists in the enriched catalog branch but was referenced in the simple mode branch.

### 3. Featured Discovery on SoundtrackPlayer (commit `7d01489`)

**What was built:** "Featured Discovery" pill at the bottom of SoundtrackPlayer showing discovery cards for the parent film + director's other works + TMDB trailers/featurettes.

**Content for 8½ specifically (verified from actual catalog data):**
- 8½ (parent film, gold border, TMDB poster)
- 5 other Fellini films from catalog: Amarcord, Nights of Cabiria, And the Ship Sails On, La Dolce Vita (all type: film with TMDB posters). La Strada is also in the catalog under creator "Federico Fellini" but typed as "song" (data bug).
- 9 TMDB videos (exact titles from `parentFilm.tmdb.videos`):
  1. "35mm Trailer [Subtitled]" (Trailer)
  2. "Mark Kermode reviews 8½ (1963) | BFI Player" (Featurette)
  3. "Marcello Mastroianni's guide to being cool | BFI" (Featurette)
  4. "Federico Fellini - 8 1/2 (New Trailer) - In UK cinemas 1 May 2015 | BFI Release" (Trailer)
  5. "8 and a Half Trailer HD" (Trailer)
  6. "8 1/2 and Cleopatra Win Costume Design: 1964 Oscars" (Featurette)
  7. "Federico Fellini accepting Best Foreign Language Film for '8 1/2': 1964 Oscars" (Featurette)
  8. "Allan Arkush on 8 1/2" (Featurette)
  9. "8 1/2 Trailer (1963) - The Criterion Collection" (Trailer)

**Architecture:**
- `enrichedCatalogContent` prop from App.jsx
- Resolver: `enrichedCatalogContent.filter(ci => ci.creator === parentFilm.creator && ci.title !== parentFilm.title && ci.tmdb?.poster_url)`
- Cards: 120x160 poster, inline GoldAdd (+) button (duplicated from UniversalModal since GoldAdd is inside UniversalModal's closure), type badge. Dark theme adaptation.
- `onOpenEntity` prop for click routing: closes SoundtrackPlayer → `autoEnrichEntity(name)` → `setEnrichedModalItem(_ci || null)` → `setUniversalModalSafe({ name, type, videoId })`. The `autoEnrichEntity` + `setEnrichedModalItem` clearing is critical — without it every click opens the wrong entity.
- Drawer: absolute-positioned at bottom of modal. Player never moves. Pill toggles open/close. `useEffect` resets `rwlTab` on title/isOpen change.

### 4. How'd I Get Here? — Built, Found Too Broad, Fully Reverted (commit `95a684b`)

**What was built (and reverted):** A global navigation-chain tracking system that pushed every modal open onto an App-level chain and rendered it as a pill on every RWL row.

**Why it was reverted:**
- Too broad — tracked every modal open including background activity and auto-opens
- Produced noisy chains (7+ items on a fresh modal)
- Appeared on every modal that had an RWL row, even cold-opens with no history
- J.D.'s actual intent: only on tiles saved from SoundtrackPlayer, captured at save time

**What was stripped:** All state (`navigationChain`, `suppressPushRef`), all helpers (`pushToNavChain`, `withSuppressedPush`, `setEnrichedModalItemSafe`, `openSoundtrackPlayerSafe`, `openFromBreadcrumb`), all renderers (`renderJourneyPill`, `renderJourneyContent`, `buildJourneyCards`), all gate widenings, all prop wiring, SoundtrackPlayer's RWL row.

### 5. Featured Discovery — wrong iterations before correct version

**Iteration 1:** Rendered as a permanent always-visible banner ABOVE the Score/Music tabs. Pushed the player into a tiny strip. Wrong position, wrong behavior (should be a pill, should be below the player).

**Iteration 2:** Moved below the player as a flex child. Still pushed the player up when expanded because the modal container was `height: 80vh` with `overflow: hidden` — the drawer took space FROM the player.

**Iteration 3 (current):** Absolute-positioned drawer overlay at the bottom. Player never moves. But J.D. flagged the drawer as "wrong size" — needs visual iteration tomorrow.

**Also fixed during this sequence:**
- Card clicks all fired `onClose?.()` which just closed SoundtrackPlayer without opening anything → fixed with `onOpenEntity` prop
- Card clicks all opened the wrong entity because `enrichedModalItem` wasn't cleared → fixed with `autoEnrichEntity` + `setEnrichedModalItem` clearing
- Cards had no GoldAdd (+) buttons, inconsistent image sizes, wrong badge styling → fixed by copying exact JSX from UniversalModal's Related tab

### 6. Other changes

- **Debug button removal:** "Debug: dump library to console" gold button removed from My Stuff wall header
- **Diagnostic documents committed:** `docs/spotify-override-diagnosis.md` and `docs/spotify-override-diagnosis-v2.md`

### 7. Justin's v1.19.14JH merged (commit `770dd8f`)

All items from Justin's Apr 8 + Apr 9 work merged cleanly into v1.9.16:
- **Type-aware catalog photo fallthrough** — 22 patched entities in the `LOCAL_ENTITY_PATCHES` universe; of those, 7 had verified hero photo fixes (Bebop, Free Jazz, Hard Bop, The Borg, The Others, I Am Legend, Ozymandias) + 3 regression spot-checks passed
- **Ozymandias episode modal** + EPISODE badge
- **Wrong-context theme videos cleared** — 5 specific entities (The Borg, The Others, The Joining, hive mind, Vampirism)
- **Album card poster fallback** in Related tab
- **4 missing theme bios** (Vampirism, Mississippi Delta Blues, French New Wave, Mumblecore)
- **Sinners phantom-entity guard** (critical) — detects mistyped person entities with placeholder bios
- **Canonical `TYPE_BADGE_COLORS`** at module scope — replaces 4+ inline switches across 8 render sites
- **Catalog cleanup** — 8 bad entries removed/merged (Rod Wave, Wunmi Mosaku phantom, Pluribus phantom, Patti Smith garbage, Wool Gathering/Woolgathering merge, 5 duplicate Sinners soundtrack entries merged to 1)
- **OBAA video cleanup** — 4 OBAA videos removed (1 from bluenote, 3 from sinners); 32 entities in bluenote and 127 entities in sinners had their video references cleaned up (159 entities total)
- **Book Amazon URLs Phase 1** — `amazon_url` field added to all 1,104 books; 62 with verified English-edition URLs

**Documentation files from Justin's merge now in repo:**
- `docs/jd-build-note-v1.19.14JH.md` — Apr 8 standalone build note
- `docs/jd-build-note-v1.19.14JH-extended.md` — combined Apr 8 + Apr 9 build note
- `docs/soundtrack-audit-2026-04-08.csv` — 137-entity, 5-universe soundtrack audit
- `docs/soundtrack-audit-2026-04-08.md` — score & soundtrack excavation report

One conflict: badge constants only. All data files auto-merged cleanly.

---

## What did NOT work — failures and wrong turns

### 1. Spotify override wired into wrong code paths (2 failed attempts before success)

**Attempt 1 (commit `475a298`):** Wired into harvester album fast path (~line 2465) and orphan album useEffect (~line 1795). Both wrote `mediaData.spotify` into state — stale by design. Moonage Daydream renders through a DIFFERENT path. Code was unreachable for this entity.

**Attempt 2 (between `475a298` and `78706ed`):** Added `cacheBustCounter` to force useEffect re-run. Fixed the `fetchingRef` guard, but the underlying stale-state-in-useEffect architecture remained.

**Attempt 3 (commit `78706ed`, success):** Found the single shared `spotifyEmbedUrl` computation block at ~line 2783. Rewrote it to call `resolveSpotifyEmbed()` at render time. This is the only site that reaches ALL modal render paths.

**Lesson:** The modal resolution pipeline has at least 5 different code paths (enriched catalog intercept, harvester album fast path, harvester song fast path, orphan album useEffect, discovery cache hit). Wiring a feature into one path doesn't guarantee it reaches the entity you're testing. The render-time helper at the shared computation block is the only universal site.

### 2. Save & Reload button — 3 failed iterations

**Iteration 1:** No feedback — just "Save" that wrote silently. User couldn't tell if it fired.

**Iteration 2:** "Save & Reload" called `onClose()` which closed the entire modal. User had to reopen manually, and the override still didn't apply because `fetchingRef` short-circuited.

**Iteration 3:** `cacheBustCounter` + `onReload` (bumps counter + closes cog panel). Counter was in main useEffect deps and `_fetchKey`, AND in orphan album useEffect deps. Both YouTube paths re-fetch correctly. Spotify doesn't need the counter because render-time resolution reads fresh localStorage on every render.

### 3. How'd I Get Here? — wrong scope, wrong surface, wrong render

- Built as a global navigation tracker instead of capture-at-save
- Appeared on every modal instead of only saved-from-soundtrack tiles
- First version rendered as horizontal pills with arrows — J.D. wanted standard discovery cards
- Second version used discovery cards but was still globally tracked
- Both fully reverted

### 4. Featured Discovery — wrong position, wrong sizing, wrong card pattern

- First iteration rendered as permanent banner above tabs — pushed player into tiny strip
- Second iteration as flex child at bottom — still pushed player because modal height was fixed
- Third iteration as absolute overlay — player stays full size but drawer is "wrong size"
- Cards initially had no GoldAdd, inconsistent image sizes, wrong badge styling
- Card clicks initially fired `onClose?.()` (did nothing useful) then opened wrong entity (stale `enrichedModalItem`)

### 5. Featured Discovery — wrong data source investigation

Spent time searching for "discovery playlists" as a TYPE in the catalog (zero results), then tried the `sources` field on catalog items (found analyzed videos but J.D. didn't want those — "videos that mention the entity, not videos a user would discover from"). The right source was much simpler: `parentFilm.tmdb.videos` for trailers/featurettes + `enrichedCatalogContent.filter(ci => ci.creator === parentFilm.creator)` for the director's other works.

---

## Priorities for tomorrow (v1.9.17-jd-dev)

### P0 — Must Fix

1. **How'd I Get Here? — narrow rebuild**
   - Capture the modal chain at save time from inside SoundtrackPlayer ONLY
   - Three save handlers: `handleToggleSave` (SoundtrackPlayer.jsx line 370), Save Score/Soundtrack inline onClick (line 627), Album heart inline onClick (line 557)
   - All call `toggleLibrary(key, meta)`. Add `discoveryChain: getDiscoveryChain()` to the meta object.
   - `getDiscoveryChain()` is a new function prop from App.jsx that reads `modalStack + universalModal` and returns `[{ type, name }, ...]`
   - Persist on the saved tile's localStorage metadata
   - When tile reopened from wall via `handleItemClick` (App.jsx ~line 23880), read `item.discoveryChain` and pass to the reopened modal
   - Render as discovery cards under a "How'd I Get Here?" pill
   - Only on tiles saved from SoundtrackPlayer — nowhere else. Old saves (pre-this-commit) have no chain → no pill.
   - Investigation is COMPLETE. Implementation not yet started.

2. **Featured Discovery on song + soundtrack modals**
   - Currently only on SoundtrackPlayer
   - Needs to appear on reopened song tiles (SONG type from wall) and soundtrack tiles (SOUNDTRACK type from wall)
   - Same content: parent film card + director's other works + TMDB trailers
   - Orphan album modal also needs it
   - Same resolver, same card pattern, same `onOpenEntity` routing

3. **Dead/hidden YouTube tracks filtering**
   - Fruitvale Station's first 5 tracks (both score and music playlists) are hidden/unavailable on YouTube
   - Affects other films too — any playlist with deleted/private videos
   - User sees "Video not found" placeholder instead of playable content
   - Options: (a) filter at SML level using YouTube `videos.list` API to cross-reference video status before returning tracks, (b) filter in `findPlaylist` in `enrichment.js` after SML returns, (c) filter at render time in SoundtrackPlayer (skip tracks with no valid videoId or check video availability)
   - Option (a) is most thorough but requires SML changes. Option (c) is quickest but doesn't reduce the track count badge. Option (b) is the middle ground.

4. **SoundtrackPlayer Featured Discovery drawer sizing**
   - J.D. flagged as "wrong size" during testing
   - Needs visual iteration — height, padding, how the overlay interacts with the player area
   - The absolute-positioned drawer approach is correct (player never moves) but the drawer itself needs sizing work

5. **Palo Alto / Thelonious Monk title-collision bug**
   - **Symptom:** On Autumn Durald Arkapaw's person modal (she's the cinematographer on Sinners), her filmography lists Palo Alto (the 2013 Gia Coppola film she shot). Clicking that filmography entry opens Thelonious Monk's "Palo Alto" album modal instead of the Palo Alto film modal.
   - **Root cause:** Title collision — a film and an album share the same name "Palo Alto". The lookup picks the album because `_catalogTypeCompat` (Justin's Apr 8 fix) doesn't include `film` as a key, so film-typed clicks aren't filtered against album-typed catalog matches.
   - **Fix needed:** Add `film`/`documentary`/`tv-series`/`movie` to `_catalogTypeCompat` with a Set that excludes `album`/`song`/`book`. Same fix class as Justin's Apr 8 type-aware work — just extending the map to cover the film → album collision case.
   - **NOT about soundtracks.** This is a filmography click on a person's modal opening the wrong entity type. Different entry point from the Fruitvale Station bug.

6. **"film" vs "movie" terminology drift**
   - Multiple places in the codebase use inconsistent type strings — sometimes `"film"`, sometimes `"movie"`, sometimes both in the same gate. Example: `_isFilmOrTV` gates check `entityType === "film" || entityType === "movie"` but some data has `type: "film"` while other data has `type: "movie"`.
   - Needs a systematic pass to normalize. Not blocking but causes subtle bugs when a gate checks one string and the data has the other.

7. **SoundtrackPlayer total redesign**
   - J.D. wants SoundtrackPlayer redesigned to match the cream/navy/gold design language of the other modals (currently it's all dark/black)
   - This is the visual unification that was mentioned as motivation for adding the RWL row to SoundtrackPlayer in the first place
   - The Featured Discovery drawer, the card styling, the pill position — all of these need to look like they belong in the same design system as UniversalModal's RWL section

### P1 — Should Fix

8. **Sinners sonic data poisoning (40 remaining entities)** — Justin's harvester needs the sonic join scoped to the anchor film only

9. **Soundtrack artist walk in Featured Discovery** — currently only shows director's other works. Should also walk soundtrack composer via `UTDataClient.getSoundtrack(title).artist`. For 8½: Nino Rota → other Rota works in catalog (only 1 exists: "The Godfather Waltz", mistyped as "film").

10. **S3 persistence for user data** — open architectural question sent to Justin. Currently cog overrides, the saved wall (My Stuff), and the discovery cache are all in localStorage only. If the user clears their browser or switches machines, everything is lost. Justin recommended Option D (S3 overrides) but no decision has been made. See `memory/project_data_architecture_apr4.md` for the full writeup.

### P2 — Nice to Have

11. **Header Soundtrack & Score button per-universe default composer** — line ~3587, every film in Sinners universe gets `composer: "Ludwig Göransson"` regardless of actual composer
12. **Album modal header thumbnail on Spotify override** — needs Spotify oEmbed fetch
13. **Sinners entity mistyped as person** — phantom-entity guard works around it but data should be corrected

---

## Key files and line numbers (as of v1.9.17-jd-dev)

| What | File | Line(s) |
|------|------|---------|
| `resolveSpotifyEmbed()` helper | `src/App.jsx` | ~1566 |
| CachePanel (album modal cog) | `src/App.jsx` | ~1359 |
| `cacheBustCounter` state | `src/App.jsx` | ~1667 |
| Orphan album useEffect (with cacheBustCounter in deps) | `src/App.jsx` | ~1795, deps at ~2008 |
| Main mediaData useEffect | `src/App.jsx` | ~1957, deps at ~2718 |
| `_fetchKey` with cacheBust | `src/App.jsx` | ~2038 |
| Enriched catalog intercept | `src/App.jsx` | ~2026 |
| Shared `spotifyEmbedUrl` render-time computation | `src/App.jsx` | ~2783 |
| Enriched catalog Spotify render (`_resolvedCiSpotify`) | `src/App.jsx` | ~2903 |
| Harvester album fast path Spotify | `src/App.jsx` | ~2465 |
| `ci.title` → `name` fix | `src/App.jsx` | ~4053 |
| UniversalModal Full Player button (`title: name` fix) | `src/App.jsx` | ~3465 |
| Header Soundtrack & Score button (per-universe composer) | `src/App.jsx` | ~3587 |
| `handleItemClick` in LibraryScreen | `src/App.jsx` | ~23880 |
| SOUNDTRACK route in handleItemClick | `src/App.jsx` | ~23889 |
| SONG route in handleItemClick | `src/App.jsx` | ~23935 |
| `setUniversalModalSafe` | `src/App.jsx` | ~25741 |
| `window.__openSoundtrackPlayer` | `src/App.jsx` | ~25130 |
| SoundtrackPlayer save handlers | `src/components/SoundtrackPlayer.jsx` | 370, 557, 627 |
| SoundtrackPlayer Featured Discovery drawer | `src/components/SoundtrackPlayer.jsx` | ~706 |
| `FILM_TO_SCORE_ALBUM` | `src/App.jsx` | ~91 |
| `findPlaylist` (SML proxy) | `src/utils/enrichment.js` | ~148 |

---

## Reference documents in the repo

| Document | Path | What |
|----------|------|------|
| Justin's Apr 8 build note | `docs/jd-build-note-v1.19.14JH.md` | Standalone Apr 8 note |
| Justin's Apr 8+9 combined note | `docs/jd-build-note-v1.19.14JH-extended.md` | Full build note for both days |
| Soundtrack audit | `docs/soundtrack-audit-2026-04-08.csv` | 137-entity, 5-universe audit |
| Soundtrack excavation report | `docs/soundtrack-audit-2026-04-08.md` | Full Player component audit, SML analysis |
| Spotify override diagnosis v1 | `docs/spotify-override-diagnosis.md` | Wrong hypothesis (enriched catalog path) |
| Spotify override diagnosis v2 | `docs/spotify-override-diagnosis-v2.md` | Correct diagnosis (orphan album path) |
| S3 data guide | `docs/s3-data-guide-march-31-2026.md` | S3 file map, schemas, join keys |
| Version tracker | `pocv2-jd-design-reskin-versions.html` | Full version history with launch links |

---

## Ports and directories

| Port | Directory | Branch | Version | Notes |
|------|-----------|--------|---------|-------|
| 5174 | `~/Desktop/unitedtribes-pocv2-jd/` | `jd/design-reskin-v3` | v1.9.17-jd-dev | Active development |
| 5173 | `~/Desktop/unitedtribes_universes_poc/` | `main` | v1.8.6 (patched) | Old baseline from March 30, NOT updated to v1.9.16. Do not use for comparison against current work without pulling. |

---

## GitHub state

| Remote | Branch | HEAD | Version |
|--------|--------|------|---------|
| `origin` (United-Tribes) | `main` | `05fd7f1` | v1.9.16 + tracker |
| `origin` (United-Tribes) | `jd/design-reskin-v3` | `857279b` | v1.9.17-jd-dev |
| `jdagogo` (personal) | `jd/design-reskin-v3` | `857279b` | v1.9.17-jd-dev |

---

## Rollback points

| Target | Command |
|--------|---------|
| v1.9.17-jd-dev (current HEAD) | `git checkout jd/design-reskin-v3` |
| v1.9.16 (on main, merged build) | `git reset --hard 770dd8f` |
| v1.9.15-jd (J.D.'s work only, pre-merge) | `git reset --hard e287ea8` |
| v1.9.14 (pre-soundtrack work) | `git reset --hard v1.9.12-pre-v1.9.13-merge` |

---

## Workflow rules

- ALWAYS get J.D.'s approval before writing ANY code
- When you have questions, STOP and ask — do not freelance, do not start writing code while waiting for an answer, do not "investigate further" as cover for continuing to work
- NEVER bump the version number without being told
- NEVER push to GitHub without being explicitly asked
- ONE version tracker (`pocv2-jd-design-reskin-versions.html`)
- Every commit MUST include the version tracker update
- Plan mode for 3+ step tasks
- ASK → CONFIRM → EXECUTE
- Build, mirror (`cp src/App.jsx src/PluribusComps.jsx`), verify between changes
- Simplicity first, minimal impact

---

## Credentials and keys

- Spotify API credentials stored in Claude's memory system (`~/.claude/projects/.../memory/reference_spotify_credentials.md`) — NOT in the repo, NOT committed, NOT at risk
- 15 YouTube API keys in `.env.local` (NOT in git, gitignored)
- SML on port 3006 for YouTube playlist resolution
- YTA on port 3002 for YouTube transcript analysis
