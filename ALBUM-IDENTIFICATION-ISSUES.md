# Album Identification & Discovery Pipeline — Issues & Fixes

**Date:** March 17, 2026
**Branch:** `jd/design-reskin-v3`
**Commit:** `075e4e8`
**Context:** Blue Note Cover Art book integration for UMG demo

---

## The Problem

The modal's album identification pipeline fails silently for many albums. Users click "Discover" on a Blue Note album and get: no Spotify embed, no YouTube playback, no relevant Features, or wrong content entirely. The pipeline has multiple stages, and failure at any stage means a broken experience.

---

## Pipeline Architecture (Current)

```
User clicks album name
        │
        ▼
1. BLUENOTE_ALBUMS lookup (blueNoteAlbums.json)
   ├── exact match by title → spotifyId + youtubeUrl (instant, reliable)
   ├── partial match fallback (startsWith)
   └── NOT FOUND → fall through
        │
        ▼
2. getSpotifyEmbed() — checks harvester data + blueNoteAlbums
   └── Usually returns null for non-Pluribus entities
        │
        ▼
3. identifyMedia() → MusicBrainz API
   ├── Finds release (title + artist + label:Blue Note)
   ├── Gets tracks (recordings)
   ├── Gets Spotify URL from url-rels ← THIS IS UNRELIABLE
   └── Returns { type: "album"|"song", albumInfo, spotifyUrl }
        │
        ▼
4. buildAlbumPlaylist() → YTA track-by-track YouTube search
   ├── Searches each track: "artist album official"
   ├── Returns playlist of videoIds ← OFTEN WRONG TRACKS
   └── Also returns spotifyUrl fallback from MusicBrainz
        │
        ▼
5. YTA fallback search (if nothing above worked)
   └── Direct search: "albumName artist official"
        │
        ▼
6. setMediaData() → renders Spotify embed + YouTube player + Tracks + Features
```

---

## Issue 1: MusicBrainz → Spotify Bridge Is Unreliable

### What happens
MusicBrainz correctly identifies the album (title, artist, full track listing) but the release has **no Spotify URL in its `url-rels`**. This means `albumInfo.spotifyUrl` comes back `null`, and the Spotify embed never loads.

### Evidence
- **"A Caddy for Daddy" by Hank Mobley** — 6 releases in MusicBrainz (1966, 1990, 2009, 2023, 2024), **zero** have a Spotify URL linked
- **"Like Someone in Love" by Art Blakey** — same situation, zero Spotify links
- Both albums are on Spotify (IDs: `1YhqCshhUkaBZvRA1l1tcS` and `50nRFfP7eymMb2rfSffMr9`)

### Why it fails
MusicBrainz url-rels are community-maintained. Someone has to manually link the Spotify URL to the MusicBrainz release. Many classic jazz albums haven't been linked.

### Current workaround
Hardcode spotifyId in `blueNoteAlbums.json`. Works for known albums but doesn't scale.

### Real fix
**Add Spotify Web API search.** When MusicBrainz returns an album but no Spotify URL:
1. Call `https://api.spotify.com/v1/search?q=album:{title}+artist:{artist}&type=album&limit=1`
2. Extract album ID from result
3. Use for embed

**Requires:** Spotify Developer credentials (`client_id` + `client_secret`). Currently **none are configured** anywhere in this project or in YTA (port 3002).

**Setup steps:**
1. Go to https://developer.spotify.com/dashboard
2. Create an app → get client_id and client_secret
3. Add to `.env.local` or YTA's env
4. Add a `/api/spotify-search` endpoint (client credentials flow, no user auth needed)
5. Call from enrichment.js when MusicBrainz has no Spotify URL

---

## Issue 2: YouTube Track Matching Returns Wrong Content

### What happens
`buildAlbumPlaylist()` searches YTA track-by-track with queries like:
```
song=Blue Train&artist=John Coltrane Blue Train official&type=song
```
YouTube returns wrong versions: live performances, covers, remixes, compilations, dance remixes of "A Love Supreme", etc.

### Why it fails
- YouTube search is keyword-based, not identity-based
- No channel verification (should prefer artist's official channel or VEVO)
- No content verification (returned video might be a 3-minute song when the original is 10 minutes)
- "official" keyword helps but isn't sufficient

### Current workaround
`youtubeUrl` field in `blueNoteAlbums.json` provides guaranteed-correct full album playback for known albums. These are the YouTube IDs from the Fresh app (port 3004) that were hardcoded and verified:

| Album | Artist | YouTube ID |
|-------|--------|-----------|
| Blue Train | John Coltrane | `HT_Zs5FKDZE` |
| Go! | Dexter Gordon | `9u9XBnDZ8TA` |
| Genius of Modern Music Vol 1 | Thelonious Monk | `V_h5P2meI5I` |
| Like Someone in Love | Art Blakey | `6unIPgt_fCw` |
| A Caddy for Daddy | Hank Mobley | `MJQjQIoq7u8` |
| Volume 2 | Sonny Rollins | `m2daCTUm2dU` |

### Real fix options
1. **Channel verification** — After YouTube search, verify the channel name contains the artist name or is a known music channel (VEVO, official artist channel, Topic channel)
2. **Duration verification** — Compare returned video duration to MusicBrainz track duration (reject if off by >30%)
3. **Curated cache** — Pre-verify and cache correct video IDs for important albums (what Fresh already did manually)
4. **YouTube Music API** — Use YouTube Music's search which is better at matching specific recordings

---

## Issue 3: Features Tab Quality Varies Wildly

### What happens
The Features tab pulls from the Blue Note Video Entity Index (60 analyzed videos, 1,230 extracted entities). Some artists have rich data with timestamps and quotes. Others have almost nothing.

### Current lookup logic
```javascript
// Try album name first
const vidByWork = vidIndex[cleanName] || vidIndex[`"${cleanName}"`] || ...;
// Then try artist name
const vidByArtist = vidIndex[artist] || vidIndex[`"${artist}"`] || ...;
// Combine both, deduplicate by video_id
const featureVideos = [...workVideos, ...artistVids.filter(v => !workVideoIds.has(v.video_id))];
```

### Coverage gaps
The entity index only contains entities extracted from the 60 videos that have been analyzed. If an artist or album wasn't mentioned in those videos, there's nothing to show.

### J.D.'s standard
> "Every album page must have relevant timestamps and quotes, not just random videos. You can't just throw videos in there."

### Real fix
1. **Audit coverage** — Check what the entity index returns for each Cover Art album artist
2. **Ingest more videos** — Use YTA to analyze additional videos about underrepresented artists (Hank Mobley, Art Blakey, Sonny Rollins)
3. **Quality filter** — Only show Feature entries that have actual timestamps and meaningful evidence text, not just "mentioned at 3:45"

---

## Issue 4: No Spotify API Credentials Configured

### Current state
The entire Spotify data pipeline relies on:
1. Hardcoded IDs in `blueNoteAlbums.json` (87 albums, 46 with spotifyIds)
2. MusicBrainz `url-rels` (unreliable — see Issue 1)
3. Harvester data (Pluribus universe only, not Blue Note)

There is **no Spotify Web API integration** anywhere:
- No `SPOTIFY_CLIENT_ID` in any `.env` file
- No `SPOTIFY_CLIENT_SECRET` in any `.env` file
- No Spotify search endpoint in YTA (port 3002)
- No Spotify search in the POC's enrichment.js

### Impact
Any album not hardcoded in `blueNoteAlbums.json` and not linked in MusicBrainz has **zero path to Spotify**. This is the single biggest gap in the pipeline.

### Fix priority
**This is the #1 infrastructure fix.** A single Spotify search endpoint would:
- Automatically find Spotify embeds for any album MusicBrainz identifies
- Eliminate the need to manually hardcode spotifyIds
- Work for all 5 universes, not just Blue Note

---

## Issue 5: identifyMedia Artist Mismatch Silently Downgrades

### What happens
`identifyMedia()` checks if the MusicBrainz artist matches the entity's artist. If they don't match, it silently treats the album as a "song" instead:

```javascript
if (albumInfo && !artistMatches) {
    console.log("[identifyMedia]", title, "→ MusicBrainz found release by",
        albumInfo.artist, "but entity says", artist, "— treating as SONG");
}
```

### Why this matters
- "Like Someone in Love" entity says artist is "Art Blakey and the Jazz Messengers"
- MusicBrainz may return artist as "Art Blakey & The Jazz Messengers" (ampersand vs "and")
- The artist matching logic does `.toLowerCase().split(/\s*[&,]\s*/)[0].trim()` which should handle this, but edge cases slip through
- When treated as a song, it gets a single YouTube search instead of a full album playlist

### Fix
More robust artist matching: normalize "and" ↔ "&", strip "The", use fuzzy string comparison.

---

## What's Working Well

Despite the issues above, the pipeline works correctly for albums that are in `blueNoteAlbums.json` with both `spotifyId` and `youtubeUrl`:

- **Spotify:** Loads instantly from spotifyId (no API call)
- **YouTube:** Loads instantly from youtubeUrl (no API call)
- **Features:** Dual lookup (album + artist) provides good coverage for well-represented artists
- **Films:** 9 jazz films with trailers rotate through every Blue Note modal
- **Entity chips:** Open UniversalModal with artist hint for correct navigation
- **Cover Art book:** Full page viewer with discovery strips on every page

The fix pattern is clear: **for critical demo content, hardcode verified IDs; for scale, add Spotify search API.**

---

## Files Changed in This Commit

| File | Change |
|------|--------|
| `src/App.jsx` | CoverArtScreen component, YouTube instant load from youtubeUrl, removed !exactAlbum block, Features dual lookup |
| `src/PluribusComps.jsx` | Mirror of App.jsx |
| `src/data/blueNoteAlbums.json` | Added A Caddy for Daddy + Like Someone in Love with spotifyId + youtubeUrl |
| `src/data/blue-note-cover-art.json` | 11 pages, album metadata, entity chips, discovery_entities |
| `src/data/blue-note-article.json` | New Yorker article data (Francis Wolff photography) |
| `public/bluenote-*.png` | 28 page images + thumbnails |
| `pocv2-jd-design-reskin-versions.html` | Version tracker entry at 9:45 AM Mar 17 |
