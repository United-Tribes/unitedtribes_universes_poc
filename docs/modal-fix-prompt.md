# UniversalModal — Media Playback Broken, Need Help

## The Problem

The UniversalModal in `src/App.jsx` (line ~1168) had three working playback modes — Spotify, YouTube, and Full Player. After integrating Justin's new `artist-albums.json` data as a first-priority lookup, all three modes are broken. The modal either hangs on "Loading media..." or loads with no playable embeds.

**Last working commit:** `0f01eb3` (v1.8.2)
**Current broken commit:** `46d7736` (v1.8.3 INTERIM #2)
**Repo:** `~/Desktop/unitedtribes-pocv2-jd/` on port 5174

## What Was Working at `0f01eb3`

The modal's `useEffect` async flow:
1. Check entity's `spotify_url` → Spotify embed
2. Fall back to `BLUENOTE_ALBUMS` static JSON → Spotify embed + YouTube URL
3. `identifyMedia(title, artist)` → MusicBrainz lookup → Spotify album ID
4. `buildAlbumPlaylist(title, artist)` → builds `ytPlaylist` array with `{ title, videoId, duration, artist }` per track
5. `fetchEntityKGRelationships(cleanName)` → KG source data
6. `searchArtistVideos` + `deepSearch` for artist entities
7. `setMediaData({ spotify, album, artistAlbums, artistVideos, ytAlbum, ytPlaylist, startTrackIdx, deepSearch, isArtist, kgSources, featureVideos })`

All three modes rendered correctly. The Spotify iframe played. YouTube iframe played. Full Player (SoundtrackPlayer) opened with prebuilt tracks.

## What Changed

I added `artistAlbumsData` prop to UniversalModal — this is `artist-albums.json` loaded from `src/data/bluenote-artist-albums.json` (downloaded from S3, no CORS). It contains full discographies for 44 Blue Note artists with correct Spotify album IDs, album art, YouTube full-album videos, and track listings.

I added a harvester lookup block at the TOP of the async function that runs BEFORE the existing lookups. The intent: harvester data is first priority, old pipeline is fallback.

## What I've Tried (All Failed)

**Attempt 1:** Harvester supplements, old pipeline still runs. Merged at the end: `ytAlbum: harvesterYouTube || ytAlbum`. Result: `identifyMedia` and `buildAlbumPlaylist` hang on MusicBrainz for album names with edition suffixes like "Go! (The Rudy Van Gelder Edition)". Modal stuck on "Loading media..." forever.

**Attempt 2:** `harvesterResolved` flag skips old pipeline entirely. Result: Modal loads instantly but NO media plays. The harvester playlist items have `{ title, artist, spotify_url }` but no `videoId` — YouTube mode requires `videoId` per track.

**Attempt 3:** Fast-path `return` when harvester has Spotify data. Build mediaData directly, skip all API calls. Fire KG in background. Result: Still broken — modal loads but embeds don't render.

**Attempt 4:** Added 8-second timeouts to all API calls. Result: Modal eventually loads after timeouts but still no playable media.

## The Renderer Expects These Shapes

```js
// Spotify (lines ~1576-1581)
spotifyEmbedUrl = mediaData.spotify.embedUrl;
spotifyHeight = mediaData.spotify.type === "artist" ? 200 : 352;
// fallback when no spotify:
spotifyEmbedUrl = `https://open.spotify.com/embed/album/${mediaData.album.spotifyId}?theme=0`;

// YouTube (lines ~1806-1810)
const playlist = mediaData.ytPlaylist || [];
const track = playlist[currentTrackIndex] || playlist[0];
videoSrc = track?.videoId
  ? `https://www.youtube.com/embed/${track.videoId}?rel=0&modestbranding=1&autoplay=1`
  : mediaData.ytAlbum?.embedUrl;

// Track list (lines ~1880-1894)
playlist.map((t, idx) => (
  <div onClick={() => { setCurrentTrackIndex(idx); setModalPlayerMode("youtube"); }}>
    {t.title} {t.duration}
  </div>
));

// Full Player button (line ~1746)
window.__openSoundtrackPlayer({
  title: mediaData.ytAlbum?.title || name,
  artist: mediaData.ytPlaylist?.[0]?.artist || name,
  spotifyAlbumId: albumId,
  mode: "album",
  prebuiltTracks: mediaData.ytPlaylist
});
```

## Harvester Data Shape (artist-albums.json)

Per album:
```json
{
  "title": "Blue Train",
  "spotify_album_id": "5PzlTnVafjgt5RtjTdIKoC",
  "spotify_url": "https://open.spotify.com/album/5PzlTnVafjgt5RtjTdIKoC",
  "album_art_url": "https://i.scdn.co/image/...",
  "youtube": { "video_id": "dN3GbF9Bv6E", "title": "Blue Train Full Album" },
  "tracks": [
    { "name": "Blue Train", "track_number": 1, "duration_ms": 643600, "spotify_track_id": "...", "spotify_url": "..." },
    { "name": "Moment's Notice", "track_number": 2, "duration_ms": 550189, "spotify_track_id": "...", "spotify_url": "..." }
  ]
}
```

Per artist:
```json
{
  "name": "John Coltrane",
  "spotify_artist_id": "2hGh5VOeeqimQFxqXvfCUf",
  "image_url": "https://i.scdn.co/image/...",
  "albums": [/* array of album objects above */],
  "top_songs": [{ "name": "...", "spotify_url": "..." }]
}
```

**Key gap:** Harvester tracks have `spotify_url` per track but NO individual `videoId`. The harvester has ONE `youtube.video_id` per album (full album video), not per track. 79% of Blue Note albums have YouTube coverage.

## The Data Update From Justin (reference)

Three S3 data systems now available:

1. **Video Analysis Content** — per-universe JSON indexes at `universe-data/video-indexes/`. Entity name → timestamped video clips. 815 videos, 15,254 quotes, 11,265 entities.

2. **Album Tracklists in Entity Cards** — album entities in universe JSON now have `tracks[]` with Spotify playback URLs and `highlighted: true` for KG-mentioned songs. Also in `quickViewGroups` with label "Tracklist".

3. **Artist Album Catalogs** — `artist-albums.json` per universe. Full discographies with Spotify album IDs, album art, YouTube full-album videos, track listings. Blue Note: 44 artists, 448 albums. Patti Smith: 33 artists, 315 albums. All 5 universes covered.

S3 base: `http://unitedtribes-visualizations-1758769416.s3-website-us-east-1.amazonaws.com/universe-data/`

Files are downloaded locally to `src/data/` (S3 has no CORS headers). Loaded via dynamic `import()`.

**Connecting the dots:** Entity name → video index (clips) → entity card (tracklist) → artist catalog (full discography with art + playback).

## What I Need

A clean implementation that:
1. Looks up harvester data FIRST — `artist-albums.json` has correct Spotify IDs (the old `BLUENOTE_ALBUMS` and MusicBrainz often return wrong results, e.g. Norah Jones resolving to Philly Joe Jones)
2. When harvester has data: sets `mediaData` immediately with the correct shape, no hanging API calls
3. When harvester doesn't have data: falls through to the old pipeline (identifyMedia, buildAlbumPlaylist, etc.)
4. Preserves all three playback modes:
   - **Spotify:** embed URL from `spotify_album_id` or `spotify_artist_id`
   - **YouTube:** `ytAlbum.embedUrl` from `youtube.video_id` (full album), `ytPlaylist` falls back to `ytAlbum` when no per-track videoIds
   - **Full Player:** SoundtrackPlayer with `prebuiltTracks` from harvester `tracks[]`
5. Formats `ytPlaylist` items as `{ title, videoId: null, duration, artist, spotify_url }` — renderer handles null videoId by falling back to `ytAlbum.embedUrl`
6. Never hangs — API calls need timeouts

The file is `src/App.jsx`, UniversalModal starts at line ~1168, the async media loading `useEffect` starts at line ~1200.
