# Score and Soundtrack — Excavation and Audit

**Date:** Thursday April 9, 2026  
**Branch:** `jd/design-reskin-v3` at commit `6340ce7`  
**Mode:** Read-only investigation. No code edits.

---

## Section 1 — Full Player as it exists in the POC today

### Component Location

- **File:** `src/components/SoundtrackPlayer.jsx` (399 lines)
- **Import:** `src/App.jsx:16` — `import SoundtrackPlayer from "./components/SoundtrackPlayer.jsx";`
- **Render site:** `src/App.jsx:26395` — renders inside `App()` as a portal to `document.body`
- **State:** `src/App.jsx:24645` — `const [soundtrackPlayer, setSoundtrackPlayer] = useState(null);`
- **Global callback:** `src/App.jsx:24687` — `window.__openSoundtrackPlayer = (data) => setSoundtrackPlayer(data);`

### Component Name

Called `SoundtrackPlayer` in code. Labeled "Full Player" in UI buttons. The prompt's "Score and Soundtrack" label is the planned UI rename — no code rename needed.

### Prop Signature

```javascript
function SoundtrackPlayer({
  isOpen,           // boolean — controls portal visibility
  onClose,          // () => void — sets soundtrackPlayer to null
  title,            // string — album or film title
  year,             // string|number — release year (optional)
  composer,         // string — composer name (optional, triggers film mode)
  artist,           // string — artist name (optional, triggers album mode)
  mode: modeProp,   // "film" | "album" — explicit mode override
  scorePlaylistId,  // string — YouTube playlist ID for original score
  musicPlaylistId,  // string — YouTube playlist ID for "Music From"
  spotifyAlbumId,   // string — Spotify album ID for embed
  prebuiltTracks,   // [{title, artist, videoId, thumbnail, duration}] — skip resolver
  library,          // object — My Stuff data (keys are save strings)
  toggleLibrary,    // (key, meta?) => void — add/remove from library
})
```

**Mode auto-detection** (line 36): if `spotifyAlbumId` is set and no `composer`, mode = "album". Otherwise mode = "film".

### Call Sites (grep-verified)

| Line | Trigger | Context |
|------|---------|---------|
| `App.jsx:3228–3234` | Settings bar "🎧 Full Player" button | Inside UniversalModal, gated by `albumId && !mediaData?._simpleMode` — only shows on **album modals in full-mode** |
| `App.jsx:26955` | "🎬 Full Player" button | Inside `EnrichmentTestPanel` (Ctrl+Shift+E debug tool — **not user-facing**) |
| `App.jsx:27125` | "🎬 Full Player" button | Inside `EnrichmentTestPanel` selected-entity detail — **not user-facing** |

**Bottom line: Full Player is currently surfaced ONLY from album modals (and a debug panel). It does not appear on film, TV, composer, person, or episode modals.**

### Track-list Data Shape

The component accepts `prebuiltTracks` (used when called from album modals with cached data) OR calls `findPlaylist()` from `src/utils/enrichment.js:1046` to resolve tracks on demand.

Shape of `prebuiltTracks` (from `App.jsx:3231`):
```javascript
[{
  title: "So What",           // string — track name
  artist: "Miles Davis",      // string — artist name  
  videoId: "zqNTltOGh5c",     // string — YouTube video ID
  thumbnail: "https://...",   // string — thumbnail URL
  duration: "9:22",           // string — duration (optional)
  channel: "Miles Davis"      // string — channel name (optional)
}]
```

Shape returned by `findPlaylist()` (enrichment.js:1201):
```javascript
{
  playlistId: "PLxyz...",
  playlistTitle: "Kind of Blue (Full Album)",
  playlistDescription: "...",
  channelTitle: "Miles Davis - Topic",
  trackCount: 5,
  thumbnail: "https://...",
  embedUrl: "https://www.youtube.com/embed/videoseries?list=PLxyz...",
  url: "https://www.youtube.com/playlist?list=PLxyz...",
  tracks: [{ position, videoId, title, artist, fullTitle, thumbnail, channelTitle }],
  searchType: "score" | "music" | "album"
}
```

### Spotify Tab

- **Render:** `SoundtrackPlayer.jsx:286–315`
- **Spotify embed URL:** `https://open.spotify.com/embed/album/${spotifyAlbumId}?utm_source=generator&theme=0` (line 71)
- **"Add to My Stuff" bar:** Lines 291–308. Heart button (line 294) and text button (line 304) both call `toggleLibrary(albumSaveKey)` where `albumSaveKey = "${title} — ${artist || composer || ""}"`.
- **BUG:** Neither call passes a `meta` object. See Section 2.

### YouTube Tab

- **Render:** `SoundtrackPlayer.jsx:324–392`
- **70/30 split layout:** Video player left, track list right
- **Per-track heart:** Line 378 — `handleToggleSave(track)` which calls `toggleLibrary("${track.title} — ${track.artist || artist || ""}")`. **No meta passed.**
- **"+ Add All" button:** Line 358 — iterates `soundtrack.tracks`, toggles each via `toggleLibrary("${t.title} — ${t.artist || artist || ""}")`. **No meta passed.**
- **Track N of M:** Line 205–206 — header badge `Track {currentTrackIndex + 1} of {soundtrack.tracks.length}`
- **Prev/Next controls:** Lines 340–344 — `playPrevious()` and `playNext()` adjust `currentTrackIndex`

### Gear/Override

- **Button:** Line 202 — gear icon toggles `isEditing` state
- **Edit panel:** Lines 214–232 — two rows (Tab 1 / Tab 2), each with a name field and a playlist URL/ID field
- **Save handler:** `handleSaveOverrides` at line 151 — extracts playlist ID from URL, saves to localStorage at key `soundtrack_overrides_${title.toLowerCase().replace(/\s+/g, "_")}`
- **Persistence:** localStorage only. The override is a JSON object: `{ score?: string, music?: string, scoreName?: string, musicName?: string }`

### Media Pausing

There is **no explicit mechanism** to pause underlying media when SoundtrackPlayer opens. The SoundtrackPlayer renders as a portal at z-index 9999 (line 187), covering everything. The underlying YouTube iframe in UniversalModal keeps playing behind the overlay. When SoundtrackPlayer opens from an album modal, the album's YouTube iframe is still live — it's just visually obscured. This will need to be addressed when opening from film modals (where a trailer might be playing).

---

## Section 2 — The Heart-to-Wall Flow, End to End, with a QA Pass

### toggleLibrary definition

**Location:** `App.jsx:25684`

```javascript
const toggleLibrary = (key, meta) => {
  setLibrary((prev) => {
    const next = { ...prev };
    if (next[key]) {
      delete next[key];
    } else {
      const title = key.includes(" — ") ? key.split(" — ")[0] : key;
      const entry = { key, title, dateAdded: Date.now(), ...(meta || {}) };
      const baseCat = entry.category || inferCategory(entry.type) || "Other";
      const categories = [baseCat];
      // ... soundtrack/score detection from title keywords ...
      entry.categories = categories;
      delete entry.category;
      next[key] = entry;
    }
    try { localStorage.setItem("ut_library", JSON.stringify(next)); } catch {}
    return next;
  });
};
```

### Flow (a): Heart an album from the Spotify tab

1. **Click:** `SoundtrackPlayer.jsx:294` — `onClick={() => toggleLibrary?.(albumSaveKey)}`
2. **Save key:** `"Kind of Blue — Miles Davis"`
3. **Meta:** `undefined` — **NO meta passed**
4. **toggleLibrary:** Creates `{ key: "Kind of Blue — Miles Davis", title: "Kind of Blue", dateAdded: 1744..., categories: ["Other"] }`
5. **Category:** `inferCategory(undefined)` → `"Other"` (App.jsx:23072: `if (!type) return "Other"`)
6. **Wall render:** Item lands in "Other" section. No thumbnail, no spotifyUrl, no videoId.
7. **Round-trip:** Clicking the wall tile calls the general card click handler which tries to open a modal. With no `videoId`, `spotifyUrl`, or `type`, the routing is ambiguous.

**VERDICT: BROKEN.** Item lands in "Other" instead of "Music". No round-trip possible.

### Flow (b): "+ Add Album to My Stuff" button on the Spotify tab

1. **Click:** `SoundtrackPlayer.jsx:304` — `onClick={() => toggleLibrary?.(albumSaveKey)}`
2. Same flow as (a). Same bug. Same result.

### Flow (c): Heart an individual track from the YouTube tab

1. **Click:** `SoundtrackPlayer.jsx:378` — `handleToggleSave(track)`
2. **handleToggleSave** (line 168): `toggleLibrary("${track.title} — ${track.artist || artist || ""}")`
3. **Meta:** `undefined` — **NO meta passed**
4. **toggleLibrary:** Creates `{ key: "So What — Miles Davis", title: "So What", dateAdded: ..., categories: ["Other"] }`
5. **Wall render:** Item lands in "Other". No thumbnail, no videoId, no spotifyUrl.

**VERDICT: BROKEN.** Same issue — no metadata.

### Flow (d): "+ Add All" button on the YouTube tab

1. **Click:** `SoundtrackPlayer.jsx:358` — iterates all tracks, calls `toggleLibrary("${t.title} — ${t.artist || artist || ""}")` for each
2. Same flow as (c), repeated N times. All land in "Other".

**VERDICT: BROKEN.** Same issue, multiplied.

### Diagnosis

**The bug is in `SoundtrackPlayer.jsx`, not in `toggleLibrary`.** Every other save path in the app passes rich metadata:

- NowPlayingBar (App.jsx:8077): `{ title, subtitle, category: "Music", addedFrom: "Discovery · Music Badge" }`
- DiscoveryCard (App.jsx:9324): `{ title, subtitle, context, type, platform, platformColor, videoId, spotifyUrl, addedFrom }`
- VideoTile (App.jsx:13649): `{ title, category: "Video & Podcasts", videoId, thumbnail, addedFrom: "Video Tile" }`

SoundtrackPlayer passes **nothing**. The fix is to pass `meta` on every `toggleLibrary` call inside SoundtrackPlayer, with at minimum: `{ category: "Music", type: "SONG", videoId: track.videoId, thumbnail: track.thumbnail, subtitle: track.artist, addedFrom: "Full Player" }`. For albums: `{ category: "Music", type: "ALBUM", spotifyAlbumId, subtitle: artist, addedFrom: "Full Player" }`.

### Provenance

**No provenance tracking exists.** When a song is saved from inside a film modal's soundtrack panel, the resulting wall tile has no record of which film it was discovered from. The `addedFrom` field (e.g. `"Discovery · Music Badge"`) records the UI surface, not the content context.

**Minimum schema addition for provenance:**
```javascript
{
  discoveredIn: "Lady Bird",          // film/show/album title
  discoveredInUniverse: "gerwig",     // universe slug
}
```

These two fields on the library entry would let the wall tile show "From Lady Bird" and enable the round-trip click to open the Lady Bird modal.

---

## Section 3 — Where Full Player is Surfaced and Where It Isn't

### Currently Has Full Player

| Modal Type | Entry Point | Notes |
|---|---|---|
| Album modals (full-mode) | Settings bar "🎧 Full Player" button, App.jsx:3234 | Only when `albumId` exists and modal is in full mode |
| EnrichmentTestPanel | Debug buttons at App.jsx:26955 and 27125 | Not user-facing (Ctrl+Shift+E) |

### Does NOT Have Full Player — Would Benefit from "Score and Soundtrack"

| Modal Type | Universe(s) | Has Cached Data | Notes |
|---|---|---|---|
| Film modals | All 5 | Varies — see below | Primary target. Films are where people find great songs. |
| TV show modals | pluribus | Pluribus has Dave Porter score Spotify ID | Breaking Bad, Better Call Saul, Pluribus, X-Files |
| TV episode modals | pluribus | Some episodes have sonic data | SML has Soundtracki.com resolver for episode-level songs |
| Composer modals | pluribus, sinners, gerwig | Yes — score files exist on S3 | Dave Porter (11 albums), Göransson (28), Desplat (11), Brion (6), Ronson (7), Saadiq (28) |
| Director modals | sinners, gerwig | Via linked composers | Ryan Coogler ↔ Göransson, Greta Gerwig ↔ Brion/Desplat/Ronson |
| Music supervisor modals | pluribus | Thomas Golubic supervised file exists | `pluribus-thomas-golubic-supervised.json` |

### Cached Data Readiness Per Universe

**bluenote:** 36 artists with full album catalogs (Spotify + YouTube + per-track IDs). 1 film (Elevator to the Gallows) — no soundtrack data. Album modals already have Full Player.

**pluribus:** Dave Porter has 11 score albums with Spotify IDs and YouTube playlists. Thomas Golubic has supervised-songs data. But the 18 influence films (The Thing, The Shining, etc.) and 7 TV shows (Breaking Bad, Better Call Saul, etc.) have **zero** cached soundtrack IDs. These would all need the resolver.

**sinners:** Göransson score file has 28 albums (Spotify + YouTube). Saadiq catalog has 28 albums. The 12 films (Black Panther, Creed, etc.) have `sonic` entries but no direct playlist IDs — they'd need linking through the composer's catalog.

**gerwig:** Desplat, Brion, Ronson score files exist with Spotify + YouTube data. The 3 films (Barbie, Lady Bird, Little Women) have **no** cached soundtrack data on the film entities themselves — they'd need linking through the composers' catalogs, or the resolver.

**pattismith:** 33 artists with full catalogs. 8 entities typed as "film" are actually mistyped people/books/albums. No actual films to surface soundtracks for.

---

## Section 4 — How SML Resolves Soundtracks and Scores on Demand

### The Resolver: `/api/youtube-playlist/route.ts`

**File:** `~/smart-media-logger/src/app/api/youtube-playlist/route.ts` (237 lines)  
**Type:** Next.js API route (GET handler)

**How it's triggered:** SML's `SoundtrackModal.tsx:254` calls `fetch('/api/youtube-playlist?${params}')` where params include `movieTitle`, `searchType` ("score" or "music"), and optional `composer` or `playlistId`.

**What it does:**

1. Checks manual `PLAYLIST_OVERRIDES` (hardcoded map, currently has 2 entries: American Hustle and Marty Supreme)
2. If no override, builds a YouTube search query:
   - Score: `"${composer} ${title} original score"` or `"${title} original score soundtrack"`
   - Music: `"${title} music from songs playlist"`
3. Calls `googleapis.com/youtube/v3/search` with `type=playlist, maxResults=5`
4. Scores results using a weighted algorithm (VEVO +25, Topic +20, official +15, title match +15, score/music keyword matching, penalties for covers/remixes/karaoke)
5. Takes best-scoring playlist, fetches `playlistItems` (up to 50 tracks)
6. Parses each track title into `{ artist, songTitle }` using "Artist - Title" and "Artist | Title" patterns
7. Cleans suffixes like "(Official Video)", "[Lyrics]", etc.
8. Returns the full track list

**External calls:**
- `googleapis.com/youtube/v3/search` — playlist search
- `googleapis.com/youtube/v3/playlists` — playlist details
- `googleapis.com/youtube/v3/playlistItems` — track listing

**API keys:** 3 keys hardcoded in the route file, with rotation on 403 quota errors.

**Caching:** **None.** Every call hits the YouTube API fresh. The SML version tracker was correct. The POC's `findPlaylist` in `enrichment.js` does have an in-memory cache (`getCached`/`setCache` at line 1047–1048) which is better, but it's session-only — lost on page refresh.

### Score vs Music Tab Split

**Two separate calls with different search queries.** When the user clicks the "Original Score" tab, SML searches with `searchType=score` (query: `"${composer} ${title} original score"`). When the user clicks "Music From", it searches with `searchType=music` (query: `"${title} music from songs playlist"`). Each tab caches its result in separate state (`scoreSoundtrack` / `musicSoundtrack`).

### TV Episode Soundtrack: `/api/tv-soundtrack/route.ts`

**File:** `~/smart-media-logger/src/app/api/tv-soundtrack/route.ts` (614 lines)  
**Type:** Next.js API route (GET handler)  
**Params:** `show`, `season`, `episode`

**Three-source waterfall:**
1. **Soundtracki.com** — scrapes `soundtracki.com/shows/{slug}-season-{N}-soundtrack`, parses HTML for numbered song entries with timestamps and scene descriptions
2. **NME.com** — fallback, scrapes NME soundtrack articles for "Artist – 'Title'" patterns
3. **DuckDuckGo web search** — last resort, searches for `"${show} season ${N} episode ${N} soundtrack songs list"` and parses snippets

**Returns:**
```typescript
{
  show: string,
  season: number,
  episode: number,
  episodeTitle?: string,
  songs: [{ position, title, artist, timestamp, scene, youtubeSearchUrl }],
  source: "soundtracki.com" | "nme.com" | "web search",
  sourceUrl: string
}
```

**Note:** This returns YouTube *search URLs*, not resolved video IDs. Each song would still need a per-track YouTube resolve.

### SML's SoundtrackModal Props (for comparison)

**File:** `~/smart-media-logger/src/components/right-pane/SoundtrackModal.tsx` (832 lines)

Key difference from POC: SML's `onSaveTrack` callback passes **provenance**:
```typescript
onSaveTrack({
  title: track.title,
  artist: track.artist,
  videoId: track.videoId,
  thumbnail: track.thumbnail,
  fromMovie: movieTitle,      // ← PROVENANCE
  fromMovieYear: movieYear,   // ← PROVENANCE
})
```

SML also uses `videoId` as the save/unsave key (not `"title — artist"`), making dedup reliable.

### Override Path

SML uses the identical localStorage pattern as the POC:
- Key: `soundtrack_overrides_${movieTitle.toLowerCase().replace(/\s+/g, '_')}`
- Value: `{ score?: playlistId, music?: playlistId, scoreName?: string, musicName?: string }`

Both SML and POC share this schema — overrides created in one app would be readable by the other if they shared a domain.

### What We'd Lift

The POC already has `findPlaylist()` in `enrichment.js` (ported from SML). The main things SML has that the POC doesn't:

1. **TV episode soundtrack resolver** (`tv-soundtrack/route.ts`) — Soundtracki.com + NME + DuckDuckGo waterfall. Not needed for v1 since we're focused on films.
2. **Provenance on save** — `fromMovie` and `fromMovieYear` fields. Needs adding to POC's `handleToggleSave`.
3. **No-metadata bug doesn't exist in SML** — SML uses a proper `onSaveTrack` callback with full track data instead of the POC's bare `toggleLibrary(key)`.

The resolver itself (`findPlaylist`) is already lifted. The POC's version even has improvements over SML (YTA proxy with 15-key rotation instead of 3 hardcoded keys, in-memory caching). **The gap is not the resolver — it's the entry points and the save metadata.**

---

## Section 5 — S3 Caching Destination

### Current S3 Overrides Infrastructure

**API endpoint:** `https://166ws8jk15.execute-api.us-east-1.amazonaws.com/prod/v1/overrides`  
**Lambda:** `ut-overrides-handler`  
**Client code:** `App.jsx:24611` (GET on startup to merge S3 overrides into localStorage)

### Current Request/Response Shapes

**GET /v1/overrides** — returns a flat object:
```javascript
{
  "Entity Name": {
    "yt_override": { "videoId": "abc123", "title": "...", "url": "..." },
    "type_override": "film"
  },
  "_meta": { ... }
}
```

**POST /v1/overrides** — shape inferred from App.jsx share button code (line ~23789):
```javascript
{
  entity: "Entity Name",
  yt_override: { videoId, title, url },
  // or type_override: "film"
}
```

**GET /v1/overrides-log** — audit log of all override submissions.

### What It Currently Accepts

Only two override types:
1. **YouTube video ID overrides** (`yt_override`) — when the gear panel in a modal replaces a bad auto-detected video with a correct one
2. **Entity type overrides** (`type_override`) — when an entity is mistyped (e.g. "film" → "theme")

### What It Would Need for Resolved Soundtracks

**(a) Resolved soundtrack for a film entity:**
```javascript
{
  entity: "Lady Bird",
  universe: "gerwig",
  soundtrack_override: {
    score: {
      playlistId: "PLxyz...",
      playlistTitle: "Lady Bird (Original Score)",
      composer: "Jon Brion",
      tracks: [
        { position: 1, videoId: "abc", title: "Lady Bird Theme", artist: "Jon Brion", thumbnail: "..." },
        // ...
      ],
      resolvedAt: "2026-04-09T...",
      resolvedBy: "findPlaylist"
    },
    music: {
      playlistId: "PLabc...",
      playlistTitle: "Lady Bird - Music From",
      tracks: [...],
      resolvedAt: "...",
      resolvedBy: "findPlaylist"
    },
    spotifyAlbumId: "6jdfKgPpi6wchdjDSkH7...",
  }
}
```

**(b) Liked song with provenance:**
```javascript
{
  entity: "So What",
  liked_song: {
    title: "So What",
    artist: "Miles Davis",
    videoId: "zqNTltOGh5c",
    thumbnail: "...",
    spotifyTrackId: "...",
    discoveredIn: "Kind of Blue",
    discoveredInUniverse: "bluenote",
    likedAt: "2026-04-09T...",
  }
}
```

### Architectural Commitment

Future resolver work writes to S3 via this Lambda **before** falling back to localStorage. localStorage is a read-only fast-path, never the write destination. A successful resolution should never need to repeat on any client.

---

## Section 6 — Open Questions and Observations

1. **SoundtrackPlayer's `findPlaylist` calls require a running YTA server (port 3002).** The function at `enrichment.js:1072` hits `/api/yta/youtube-search` — if YTA is down, the primary resolution path fails and falls through to direct YouTube API calls (which use the POC's own quota, not YTA's 15-key rotation). Is this acceptable, or should the POC have its own key rotation?

2. **The SoundtrackPlayer has no Spotify tab in film mode.** The Spotify embed only renders when `spotifyAlbumId` is provided (line 286 gate: `playerType === "spotify" && spotifyEmbed`). Film modals don't currently pass `spotifyAlbumId`. Even if they did, the Spotify embed shows a single album — but a film might have both a score album and a licensed-songs album. Need J.D.'s call on whether Spotify embed is needed for film soundtracks or YouTube-only is fine.

3. **Underlying media pausing.** When Full Player opens from a film modal, the film's trailer/YouTube iframe will keep playing behind the overlay. Need a mechanism to pause it — either by removing the iframe src, posting a YouTube API pause command, or setting the iframe's visibility to collapse. This is a small but important detail.

4. **The `prebuiltTracks` path bypasses `findPlaylist` entirely.** When the album modal opens Full Player with pre-cached tracks, it never hits the YouTube API. But the film modal path would need to call `findPlaylist` on demand. This means the first time a user opens a film's soundtrack, there's a loading delay while the resolver runs. Subsequent opens use in-memory cache (lost on refresh). S3 caching would make this a one-time cost.

5. **SML has 3 hardcoded YouTube API keys.** The POC routes through YTA (15-key rotation). If we're lifting SML's `tv-soundtrack` route (which calls YouTube API directly), we need to either route it through YTA too or add key rotation. Not urgent since TV episode soundtracks are out of scope for v1.

6. **`PLAYLIST_OVERRIDES` in `enrichment.js` — how many?** I didn't count them all but they exist at the top of the file. These are the equivalent of SML's `PLAYLIST_OVERRIDES` (SML has 2). These are also S3 migration candidates.

7. **Unrelated bug noticed:** The enrichment.js `findPlaylist` function at line 1072 builds a YTA search URL with `type=album` regardless of whether it's searching for a score, music, or album. The `searchQuery` variable at line 1060–1067 is built correctly per search type, but the actual `_safeFetch` call uses `type=album` hardcoded. This may cause the YTA proxy to return album-biased results even when searching for scores. Not blocking, but worth investigating.

8. **The Spotify "Add to My Stuff" bar (SoundtrackPlayer.jsx:291–308) checks `albumSaved` using a broad match** — `Object.keys(library).some(k => k.startsWith("${title} — "))`. This means if you save "Kind of Blue — Miles Davis" from one place, the Spotify tab will show the heart as filled even though the saved item has no metadata. The visual feedback is misleading — it looks saved but the wall entry is broken.

9. **`findPlaylist` has a duplicate YTA call.** Lines 1072 and 1151 both call the same YTA endpoint with identical parameters. The first call is the primary resolution; the second is labeled "fallback" but does the same thing. If the first failed, the second will too. Dead code.
