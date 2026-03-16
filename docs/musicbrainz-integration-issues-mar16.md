# MusicBrainz Integration — Issues, Fixes & Lessons Learned

**Date:** March 16, 2026
**Sprint:** 9:00 AM – 3:30 PM PDT (6.5 hours)
**Goal:** Full album playback via MusicBrainz track listings + YTA track-by-track YouTube search
**Status:** Partially working. Core architecture proven. Multiple artist resolution bugs remain.

---

## What We Built

### MusicBrainz → YTA Track-by-Track Pipeline
The core idea works: MusicBrainz provides track listings for any album ever released. We search YTA for each track individually. YTA returns the correct YouTube video from Topic channels. We assemble these into a navigable playlist rendered in a split-view player (video 60% / track listing 40%).

**Proven working for:**
- Moanin' (Art Blakey) — 6 tracks, correct Blue Note pressing
- A Night at Birdland (Art Blakey) — 8 tracks, all correct
- Free for All (Art Blakey) — correct tracks
- Blue Train (John Coltrane) — correct tracks
- Palo Alto (Thelonious Monk) — correct tracks
- Along Came Betty (song) — direct YTA call, correct video
- OK Computer (Radiohead) — verified via CLI, not in app
- GNX (Kendrick Lamar) — verified via CLI, not in app
- Pluribus Vol. 1 score (Dave Porter) — verified via CLI, 23 tracks

### SoundtrackPlayer Integration
- Added `prebuiltTracks` prop to SoundtrackPlayer component
- "Full Player" button in modal opens SoundtrackPlayer overlay with pre-built track data
- No additional API calls — tracks already fetched
- Modal pauses all embeds when Full Player opens (no simultaneous audio)

### Spotify Album Covers via oEmbed
- `SpotifyAlbumCover` component fetches album art from Spotify's oEmbed endpoint
- No auth needed, no API key, cached per session
- Used in discovery strip cards and modal header for albums
- Each album shows its own unique cover art

### Discovery Strip Clickability
- Album, artist, film cards are clickable → open new modal via `onNavigate`
- Book cards log to console (deferred)
- `onNavigate` prop wired from App → UniversalModal → `setUniversalModal`

### `identifyMedia()` — Album vs Song Classification
- Searches MusicBrainz for a release matching title + artist
- **Artist match filter**: if MusicBrainz artist matches entity artist → album → build playlist
- If no artist match → song → direct YTA call (one video)
- Empty artist → trust MusicBrainz completely
- Caches results to avoid repeat lookups

---

## Problems Encountered (In Chronological Order)

### 1. YouTube Returning Single Videos Instead of Playlists
**Problem:** YTA's `youtube-search` endpoint returns individual videos, not playlists. Every album got one song.
**Root cause:** We were calling YTA expecting playlist results from a single-video endpoint.
**Fix:** MusicBrainz track-by-track approach — get track list, search YTA for each track individually, assemble into playlist.
**Status:** FIXED.

### 2. Wrong MusicBrainz Pressings
**Problem:** Searching for "Moanin'" returned a different pressing with completely different tracks (Slide's Delight, Blues For Eros instead of Moanin', Are You Real, Along Came Betty).
**Root cause:** MusicBrainz has hundreds of pressings. Default search returns whatever scores highest.
**Fix:** Added `label:Blue Note` to MusicBrainz queries to prefer original Blue Note pressings. Falls back to without label for non-Blue-Note albums (A Love Supreme on Impulse!, Kind of Blue on Columbia).
**Status:** FIXED, but adds an extra API call for non-Blue-Note albums.

### 3. Fuzzy Album Match Poisoning (THE BIG ONE)
**Problem:** "Genius of Modern Music Vol. 2" fuzzy-matched to Sonny Rollins' "Volume 2" album in blueNoteAlbums.json. This poisoned the artist name to "Sonny Rollins", which then caused MusicBrainz to reject its own correct result (Thelonious Monk) because the artist didn't match.
**Root cause:** The `fuzzyAlbum` search used `includes()` on normalized titles. `norm("Genius of Modern Music Vol. 2")` = `"genius of modern music vol 2"` which includes `norm("Volume 2")` = `"vol 2"`. Any album with "Vol" or "Volume" in the title could cross-contaminate.
**Fix (multiple attempts):**
1. First attempt: Added artist verification to fuzzy match — but `entityArtist` was often empty, so the check was skipped
2. Second attempt: Made artist check mandatory (`entityArtist &&` required) — if no artist known, fuzzy returns null, MusicBrainz handles it
3. Third attempt: Tried to delete fuzzy matching entirely — but `replace_all` on the variable name broke all references throughout the file
4. Fourth attempt: Set `const fuzzyAlbum = null` — but missed references on other lines, causing silent crashes
5. **Current state:** Fuzzy matching restored with MANDATORY artist check. If entity has no subtitle (no artist), fuzzy match is skipped entirely. MusicBrainz handles unknown entities.
**Status:** Believed fixed but needs more testing. The fuzzy match remains a risk for any entity with a generic title.

### 4. Artist Resolution — Wrong Artist From Page Context
**Problem:** "Giant Steps" clicked from Thelonious Monk's page → artist resolved as "Thelonious Monk" → MusicBrainz searched for "Giant Steps by Thelonious Monk" → found "Various Artists" compilation → rejected → treated as song instead of album.
**Root cause:** The artist resolution chain had 6+ fallbacks: `parentArtistName || albumObj?.artist || ent.subtitle || ent._workArtist || cleanName`. `parentArtistName` came from quickViewGroups search which found the parent page entity (Monk), not the album's own artist.
**Fix:** Simplified to `ent.subtitle || ent._workArtist || ""`. Entity knows its own artist. If it doesn't, leave empty and let MusicBrainz figure it out.
**Status:** FIXED in latest build. Needs testing.

### 5. Spotify Embedding Wrong Album
**Problem:** "Moanin'" embedded as a single Spotify track instead of the full album. The quickViewGroups search found "Moanin'" as a track in Art Blakey's Music section and grabbed the track's `spotify_url` before the blueNoteAlbums album lookup could run.
**Root cause:** Track match ran before album match. "Moanin'" is both an album title AND a song title.
**Fix:** Added `isKnownAlbum` check — if the title matches an album in blueNoteAlbums.json, skip the quickViewGroups track match. Album embed takes priority.
**Status:** FIXED.

### 6. Spotify Missing for Non-blueNoteAlbums Albums
**Problem:** Albums not in blueNoteAlbums.json (Bitches Brew, Palo Alto, Schizophrenia) had no Spotify embed. The Spotify lookup chain only checked: entity's `spotify_url`/`_workSpotifyUrl` → quickViewGroups → blueNoteAlbums.
**Fix:** Added Spotify URL extraction from MusicBrainz URL relations. When MusicBrainz finds a release, it also returns external URLs including Spotify. Used `inc=url-rels` in the API call.
**Status:** PARTIALLY FIXED. Not all MusicBrainz releases have Spotify URLs in their relations. Some albums still show no Spotify.

### 7. Genius of Modern Music Vol. 1 & 2 Combined Entity
**Problem:** "Genius of Modern Music Vol. 1 & 2" was a single entity combining two separate albums. MusicBrainz couldn't find it. YouTube couldn't find it.
**Fix:** Split into two separate entities in `bluenote-editorial.json`. Each volume is its own clickable entity. `COMPANION_ALBUMS` map shows the other volume in the discovery strip.
**Status:** FIXED in editorial data.

### 8. React Strict Mode Double-Firing useEffect
**Problem:** Every modal open triggered the media fetch useEffect TWICE, doubling all API calls. MusicBrainz + YTA calls for 6-track album = 14 API calls instead of 7.
**Root cause:** React strict mode in development runs effects twice to catch side effects.
**Fix:** Added `fetchingRef` guard — if the current entity is already being fetched, skip.
**Status:** FIXED, but the ref guard approach means the cleanup function resets the ref, allowing the second render to proceed. May still double-fire in some cases.

### 9. YouTube Track Searches Returning Wrong Album Versions
**Problem:** Searching YTA for "Moanin'" by "Art Blakey" returned a live version from a different album, not the studio track from the Moanin' album.
**Root cause:** YouTube search returns the most popular/relevant result, not necessarily the specific album version.
**Fix:** Include album title in the YTA artist parameter: `artist=Art Blakey Moanin'`. YouTube Topic channels name tracks like "Moanin' (Moanin')" so the album name in the query helps match the right version.
**Status:** FIXED, but not 100% reliable. Some tracks still return wrong versions.

### 10. MusicBrainz Alternate Takes Inflating Track Lists
**Problem:** Reissues include bonus tracks — "Genius of Modern Music Vol. 1" returned 15 tracks including "(alternate take)" versions.
**Fix:** Filter out tracks matching `(alternate|alt take|bonus|remix)` pattern, cap at 12 tracks max.
**Status:** FIXED.

### 11. API Key Burn Rate
**Problem:** Every album open fires N parallel YTA calls (one per track). Opening 10 albums = 60-80 YTA API calls. Combined with MusicBrainz calls, the 15 YouTube API keys (150K units/day) were being consumed rapidly.
**Mitigations applied:**
- `buildAlbumPlaylist` caches full playlist results — second open of same album = 0 API calls
- `getAlbumInfo` caches MusicBrainz results
- `identifyMedia` caches classification results
- React double-fire guard reduces duplicate calls
**Status:** Better but not fully solved. Cache is in-memory only (lost on refresh). Pre-warming would help.

### 12. `replace_all` Disaster
**Problem:** Used `replace_all: true` on the string "fuzzyAlbum" to replace with "false" — this replaced EVERY occurrence including inside log strings and object references, breaking the entire file.
**Root cause:** `replace_all` is a blunt instrument. Should have declared `const fuzzyAlbum = null` instead of trying to eliminate the variable.
**Lesson:** Never use `replace_all` on variable names. Declare the variable as null/empty instead.
**Status:** FIXED after stash/pop cycle.

---

## Architecture Decisions

### What Works
1. **MusicBrainz as track source** — free, no API key, has every album. Blue Note label preference query works well.
2. **YTA track-by-track search** — returns correct Topic channel videos for individual songs. Including album name in search query improves accuracy.
3. **Spotify oEmbed for album covers** — free, no auth, perfect cover art for discovery strip.
4. **identifyMedia() classification** — album vs song determination via MusicBrainz release search + artist match filter.
5. **SoundtrackPlayer prebuiltTracks** — clean prop-based integration, no additional API calls.

### What Doesn't Work
1. **Fuzzy album matching** — any `includes()` on normalized titles is a landmine. "Volume 2" matches everything with "Vol".
2. **Artist resolution from page context** — the entity's parent page is NOT the entity's artist. A Coltrane album on Monk's page is still Coltrane's.
3. **Multiple fallback chains** — 6+ sources for artist name means the wrong one gets picked. Simpler is better.
4. **Modifying working code** — "Along Came Betty" worked with a direct YTA call. Adding identifyMedia broke it. Don't fix what works.

### Rules Established
1. Use entity name as-is for MusicBrainz. No fuzzy matching, no albumObj substitution.
2. Use `entity.subtitle` or `entity._workArtist` for artist. If empty, leave empty. Don't chain fallbacks.
3. Don't add complexity to things that work.
4. Cache everything. Check cache before any API call.
5. Guard every useEffect with a ref.
6. Search MusicBrainz with `label:Blue Note` first, fall back without label. Two calls max.
7. Empty entityArtist = trust MusicBrainz. Non-empty = verify against MusicBrainz.

---

## Files Changed

| File | Changes |
|------|---------|
| `src/utils/enrichment.js` | Added MusicBrainz integration (`getAlbumInfo`, `identifyMedia`, `buildAlbumPlaylist`), Blue Note label preference, alternate take filter, playlist caching |
| `src/App.jsx` | UniversalModal: artist resolution fix, fuzzy match with mandatory artist check, SpotifyAlbumCover component, discovery strip clickability, Full Player button, React double-fire guard |
| `src/components/SoundtrackPlayer.jsx` | Added `prebuiltTracks` prop, skip internal fetch when provided |
| `src/data/bluenote-editorial.json` | Split "Genius of Modern Music Vol. 1 & 2" into separate Vol. 1 and Vol. 2 entities |
| `src/data/blueNoteAlbums.json` | Added 5 albums: Free for All, Mosaic, Ascension, A Night at Birdland Vol 1, A Night in Tunisia |

---

## What's Next (Not Done)

1. **Spotify for all albums** — MusicBrainz URL relations don't always have Spotify links. Need a fallback (Spotify search API or pre-warm cache).
2. **Film entity handling** — Straight, No Chaser is a film, should show trailer + soundtrack. Currently shows as generic entity.
3. **Scroll indicator on discovery strip** — fade/blur on right edge to hint at more content.
4. **Blue Note Store purchase links** — "Buy Vinyl" button in modal. URL pattern: `https://store.bluenote.com/products/{album-slug}`
5. **Autoplay between tracks** — when one track ends, auto-advance to next.
6. **Persistent cache** — write MusicBrainz/YTA results to enrichment-cache.json so they survive page refresh.
7. **Wrong artist attribution in entity data** — Schizophrenia and Search for the New Land are attributed to Herbie Hancock but are actually Wayne Shorter and Lee Morgan albums respectively. Entity data needs correction.

---

## Commits (March 16, 2026)

- `a496212` (11:24 AM) — MusicBrainz integration: album identification, track-by-track YouTube playlists, Spotify URL relations
- `8216383` (11:25 AM) — Version tracker update with commit hash
- `c123832` (1:32 PM) — SoundtrackPlayer integration + MusicBrainz fixes + playback guardrails
- `013ab00` (1:33 PM) — Version tracker update with commit hash
- `PENDING` (3:30 PM) — Artist resolution fix, fuzzy match guard, Full Player always visible, discovery strip fixes, this documentation
