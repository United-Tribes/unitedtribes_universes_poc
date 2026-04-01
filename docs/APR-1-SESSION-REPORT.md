# April 1, 2026 — Modal Fixes & Data Enrichment Session Report

## Summary
Comprehensive modal routing overhaul addressing issues from JD's review. 14 commits on `justin/data-client-integration`. All changes are on Justin's feature branch — JD's branch is untouched.

## How to Retrieve

```bash
cd unitedtribes_universes_poc
git fetch origin
git checkout justin/data-client-integration
git pull
npm run dev
```

Clear browser cache after loading:
```js
localStorage.clear()
```
Then Cmd+Shift+R (hard refresh).

## How to Test

### Film Modals
1. **Sinners universe → click "Sinners"** — enriched film modal with trailer, poster, soundtrack, Read Watch & Listen tabs (Content/Songs/Videos)
2. **Click "Black Panther: Wakanda Forever"** — same enriched film modal, official trailer (not soundtrack audio)
3. **Click any film from Content tab** — opens film modal (not inline play)
4. **Blue Note → 'Round Midnight, Les Liaisons Dangereuses** — opens enriched film modal with correct posters

### Person/Artist Modals
5. **Click "Ryan Coogler"** — person modal with Content/Songs/Analyzed Videos tabs, 152+ videos
6. **Click "Patti Smith"** — artist modal with YouTube default, Content/Songs/Analyzed Videos tabs, books visible
7. **Click "Arthur Rimbaud"** — person modal with book covers (A Season in Hell, Illuminations, etc.)

### Song Modals
8. **From Songs tab, click "Because the Night"** — SONG badge, YouTube music video, Read Watch & Listen

### Album Modals
9. **Click "A Love Supreme"** — full album modal with player, tracklist, tabs
10. **Click "Genius Of Modern Music"** — ALBUM badge (was UNKNOWN), harvester album data

### Wall
11. **Add Sinners to wall** → shows as film with movie poster (not soundtrack album)
12. **Click Sinners from wall** → opens correct enriched film modal

### Search (My Stuff)
13. **Search "invas"** → click "Invasion of the Body Snatchers 1978" → opens enriched film modal (fuzzy title match)

## What Changed

### Modal Routing (App.jsx)
- **autoEnrichEntity()** — auto-routes films/documentaries to enriched catalog modal from ANY click source (openPopover, onNavigate, wall, search)
- **Fuzzy title matching** — strips trailing years ("Title 1978" → "Title"), normalizes quotes/apostrophes
- **detectEntityType reordered** — entity.type first, enriched catalog fallback, harvester last
- **findEntity()** case-insensitive lookup in UniversalModal (fixes "sinners" vs "Sinners")
- **fuzzyAlbumMatch** — removed aggressive startsWith substring match (was causing films to match album names)
- **Film entities skip harvester song/album search** — prevents "Black Panther" matching soundtrack tracks
- **YouTube default player mode** — all modals default to YouTube, not Spotify
- **Discovery cache v4** — invalidates stale type detections
- **Wall click routing** — uses autoEnrichEntity + findEntity, skips song-to-album collapsing for non-music items

### Read, Watch & Listen Tabs
- **Content/Songs/Analyzed Videos** tabs added to simple mode, full mode (artist/album), AND enriched catalog modals
- **Songs tab** — needle drops moved from standalone section into tabs, click opens song modal
- **Analyzed Videos** — merged TMDB videos + entity index videos + KG videos into single tab
- **Video title scan** — lookupFeatureVideos now also scans video titles (not just entity index), finding 40-60% more videos
- **RWL uses mediaData.featureVideos** — includes KG-merged videos (was using separate lookup that missed them)

### Data Quality
- **85 items reclassified** — interviews, podcasts, trailers no longer labeled "SONG"
- **72 entity subtitles fixed** — across all 5 universes (Ginsberg "Actor"→"Poet", Rimbaud "Crew"→"Poet", etc.)
- **typeBadgeLabel()** — "FILM"→"MOVIE", "TV-SERIES"→"TV" standardization
- **ytThumbUrl()** — validates YouTube IDs, prevents 404s from podcast slug IDs
- **Book covers added** — M Train, A Book of Days, Babel, Wool Gathering, Witt, Bread of Angels, Just Kids
- **Just Kids** — fixed TMDB film poster → Open Library book cover
- **Hotel Chelsea** — fixed on S3: renamed to "The Hotel Chelsea", type→place, aliases added
- **Les Liaisons Dangereuses** — added 1959 Roger Vadim film (TMDB 43102) with correct poster + trailer
- **Broken image fallback** — navy placeholder with title text instead of broken icon
- **Unavailable YouTube videos** — hidden via onLoad size check

### Performance
- **safeBrokerFetch()** — 12s timeout wrapper for broker API calls
- **KG timing logs** — `[KG-rel] Fetched N relationships for X (Nms)` in console
- **KG timeout** — increased 6s → 8s

### New Files
- `scripts/enrich-universe-data.mjs` — reusable script to enrich all 5 universe files from enriched catalog
- `public/images/manual/witt-patti-smith.jpg`
- `public/images/manual/bread-of-angels-patti-smith.jpg`
- `public/images/manual/les-liaisons-dangereuses-1959.jpg`

## Open Items for JD

1. **"FROM THE KNOWLEDGE GRAPH" section** — KG YouTube videos are now merged into the Analyzed Videos tab, making the standalone KG section partially redundant. JD's call on whether to remove/collapse it.
2. **Search results page thumbnail 404s** — slug IDs from podcast-registry.json rendered as YouTube thumbnail URLs. Need ytThumbUrl() validation applied to search/discover page too.
3. **Episode modal** — JD fixing. Episodes can be restored from v1.8.5 tag: `git show v1.8.5:src/data/pluribus-response.json` and merge the episodes array.
4. **"film" vs "movie" label** — we standardized to "MOVIE" in badges. If JD prefers "FILM" anywhere, the `typeBadgeLabel()` function is the single place to change it.

## Open Items for Justin (Pipeline/Data)

1. **Spotify artist validation** — strip wrong matches (Gloria→Sam Smith, Because the Night→karaoke)
2. **Soundtrack gap filling** — Invasion of the Body Snatchers (1978) and others missing soundtracks
3. **Soundtrack YouTube enrichment** — per-track YouTube video IDs for in-modal playback
4. **Entity alias/merge system** — Hotel Chelsea problem at scale. Assembler needs canonical name resolution
5. **Entity name mismatches** — Lenny Kaye/Kay, Tom Verlaine duplicates, anchor case (Pluribus/pluribus)
6. **Content catalog dedup** — "Invasion of the Body Snatchers" vs "Invasion of the Body Snatchers 1978" duplicates
7. **Wrong subtitle root cause** — assembler pulls "Actor" from TMDB for everyone. Need post-assembly correction
8. **Age-restricted YouTube videos** — 'Round Midnight trailer blocked. Need detection/replacement mechanism
9. **Missing images** — 1,707 items across universes (mostly songs/albums, lower priority)
10. **TMDB wrong matches on books** — type-aware TMDB matching to prevent film posters on book entities
11. **YouTube video validation** — periodic check for private/deleted videos in enriched catalog
12. **Song modal wrong images** — Spotify album art mismatches from wrong artist matches

## Commits (14 total)

1. `24e95e5` — Modal routing + data enrichment from JD review
2. `f80f5e4` — Modal consistency: unified film modal experience
3. `8ce702a` — Artist modal tabs + video title matching
4. `993f6f2` — Fix 72 wrong entity subtitles + broken image fallbacks
5. `252020e` — Wall item click → correct modal + wall display fixes
6. `7a961d4` — Song clicks open modal instead of linking to Spotify
7. `fa6cb19` — Song modal: correct type badge, YouTube video, catalog-based detection
8. `f017f28` — Merge KG video sources into Analyzed Videos tab
9. `ad529a8` — Search results → enriched film modal + fuzzy title matching
10. `5feec15` — Album modal + RWL video source + cache fixes
11. `c3d12ac` — Film click routing + Les Liaisons Dangereuses + quote normalization

Branch: `justin/data-client-integration`
Remote: pushed to `origin`
