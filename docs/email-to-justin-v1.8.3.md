# Email to Justin — v1.8.3 Pushed to Main

**Subject:** v1.8.3 pushed to main — pull when ready + heads up on force push

**Date:** Monday, March 23, 2026, 7:06 PM PDT

---

Hey Justin,

v1.8.3 is on main. Commit `4a16be1`. Here's everything you need to know.

## ⚠️ IMPORTANT: Force Push to Main

I force-pushed `jd/design-reskin-v3` to main because main had 2 commits ahead that weren't in my branch (from a previous merge at `258c350`). Those commits were overwritten. **If you had anything on main that I don't have, it's gone from main but still in the reflog.** Please check if you had any unmerged work on main that needs to be re-pushed. The old main HEAD was `258c350` — you can recover from there if needed.

## How to Pull

```bash
# If you're on main:
cd ~/Desktop/unitedtribes_universes_poc
git fetch origin
git reset --hard origin/main

# If you want the branch:
git fetch origin
git checkout jd/design-reskin-v3
git pull origin jd/design-reskin-v3

# Start the app:
npm run dev -- --port 5174

# YTA must be running for YouTube search:
cd ~/youtube-transcript-analysis && npm run dev -- -p 3002
```

The app fetches `artist-albums.json` from S3 at runtime now (CORS enabled — thank you), so even if the local static file is stale, it'll get fresh data on load. Auto-refreshes every 2 hours.

## What's New in v1.8.3

### My Stuff — Complete Redesign
- **Wall view:** Masonry collage of album art, movie posters, headshots. Mixed tile sizes — hero/standard/small. No text on tiles by default — title + subtitle on hover only. Click → opens UniversalModal.
- **List view:** Two-column compact layout, 48px thumbnails, category group headers with gold underline, gold hover effect.
- **Filter tabs:** All | Music | Movies & TV | Video & Podcasts | Books & Reading | People | Games
- **Edit mode:** Multi-select removal with gold checkboxes, floating bottom bar. Works in both wall and list views. Individual tile removal via hover ✕.
- **Data model:** `Set<string>` → `Object<string, LibraryItem>` with auto-migration. Rich metadata saved at add time (title, subtitle, category, thumbnail, universe, provenance).
- **Search:** System font, navy text, ✕ clear button, Escape key clears from anywhere. Works on both wall and list.

### Harvester YouTube Integration — Per-Track IDs
This is the big one. Your `youtube_video_id` field on individual tracks in `artist-albums.json` is now the PRIMARY YouTube source. The lookup order is:

1. **YouTube overrides** (localStorage — human corrections, always win)
2. **Discovery cache** (localStorage — previously resolved per-track IDs)
3. **Harvester per-track `youtube_video_id`** (from artist-albums.json)
4. **YTA per-track search** (backup — only for tracks missing from steps 1-3, capped at 20)
5. **Full-album `youtube.video_id`** (last resort — only when nothing else exists)

Clicking track 3 plays a DIFFERENT video than track 1. This works great for Norah Jones (Come Away With Me — all 44 tracks, 11 with per-track IDs from harvester, rest from YTA), Sonny Rollins (Village Vanguard — all 18 from harvester), and most Blue Note albums.

**Your `youtube_playlist` field is also used** — when an override is saved as a playlist, we embed it as `videoseries?list={playlist_id}`.

### YouTube Override Tool
A ⚙️ cog icon in the modal (next to Spotify/YouTube/Full Player buttons). Click it → paste a YouTube playlist URL or video ID → Save. The override is checked FIRST at render time — directly from localStorage, wins over everything. This stops the cycle of debugging wrong YouTube results. I fix it in 10 seconds.

**Miles Ahead (Original Motion Picture Soundtrack) is the test case.** The harvester and YTA both return the 1957 Gil Evans album instead of the 2015 film soundtrack. The override tool fixes it permanently with a manual playlist URL.

### Discovery Cache
- Every successful modal lookup saves to `localStorage("ut_discovery_cache")`. Albums found once work forever without re-querying APIs.
- Admin panel in My Stuff (⚙️): view cache contents, clear individual items, lock/protect items (survive "Clear Cache").
- **Export All:** Downloads JSON with BOTH `discovery_cache` AND `yt_overrides` sections.
- **Export Overrides Only:** Just YouTube overrides as backup.
- **Import:** Reads combined or legacy format, merges with localStorage (local wins).
- **Pre-warm from committed file:** `src/data/discovery-cache.json` is loaded on app startup and merged with localStorage. When I export and commit this file, you get all my cached data + YouTube overrides automatically on pull.

### Song Entity Handling
"The Nearness of You" (a song, not an album) now plays the individual Spotify track and individual YouTube video. Shows parent album art for context but doesn't load the full album tracklist. Song-to-album reverse lookup finds which album contains the track.

### Other
- **Album entity registry:** Your 1,030 album titles from S3 are integrated. Album names in broker narratives are now clickable EntityTags.
- **Rudy Van Gelder:** His 88 engineered albums populate the discovery strip when his modal opens.
- **S3 live refresh:** `artist-albums.json` fetched from S3 at runtime. Auto-refreshes every 2 hours. Manual "Refresh from S3" button in admin panel.
- **Artist-first album matching:** Entity subtitle "Norah Jones" → looks up Norah Jones FIRST in harvester, never accidentally matches Philly Joe Jones.
- **Fuzzy album matching:** "A Night at the Village Vanguard" matches "A Night At The Village Vanguard (The Complete Masters)".

## What You Should Test

1. **My Stuff:** Add some albums/artists to My Stuff via gold [+] buttons. Check wall view (artwork tiles) and list view (compact rows). Try edit mode (select multiple → remove). Try the filter tabs.
2. **Modal Spotify/YouTube:** Open several albums — Come Away With Me, Blue Train, Moanin', A Night at the Village Vanguard. Verify Spotify is the correct album. Click YouTube — each track should be a different video (not the same full-album video).
3. **YouTube override tool:** Open Miles Ahead. Click ⚙️. Paste `https://www.youtube.com/playlist?list=PLD3mRTKBTkySaSJPK6R8Enku5EJ1I1Fqg`. Click Save. Close and reopen — should play the correct playlist.
4. **Cache export:** Go to My Stuff → ⚙️ → "Export All". Open the downloaded file. Verify it has `discovery_cache` and `yt_overrides` sections. The Miles Ahead override should be in `yt_overrides`.
5. **Song entities:** Click "The Nearness of You" (if it appears) — should play one song on Spotify, not the full parent album.

## What's Still Broken / Incomplete

- **Discovery strip:** Still shows generic Blue Note albums instead of the artist's own albums from the harvester. I built this fix twice and lost it twice (once in a revert, once in a rebuild). It's Priority 1 for v1.8.4.
- **Zone 4 (KG sources):** Video analysis data exists on S3 (815 videos, 15,254 quotes, 11,265 entities) but is NOT yet wired into the modal. Only the Blue Note video entity index is loaded locally.
- **Music across all universes:** Only Blue Note has been tested. Pluribus needle drops, Sinners score, Gerwig soundtracks, Patti Smith albums — all need verification.
- **Miles Ahead YouTube:** Requires manual override. Both the harvester's `youtube.video_id` and YTA return the wrong 1957 album. The per-track `youtube_video_id` values are partially correct (11/24 from harvester) but the other 13 get wrong results from YTA.
- **React strict mode:** The ref guard catches most double-fire issues but not all. Occasional wrong data on second album opened per session.
- **Book integration:** Not started. Data and images from Fresh are in the repo but not wired.
- **Features lost in revert:** Discovery strip showing artist's own albums, Spotify/YouTube player stacking fix (never show both simultaneously), artist YouTube video search — all need to be rebuilt.

## What I Need From You

1. **Per-track YouTube coverage:** Is `youtube_video_id` populated for all artists across all universes, or just Blue Note? The per-track IDs are game-changing when they exist — zero API calls, instant correct playback. How complete is the coverage?
2. **`youtube_playlist` coverage:** Same question. How many albums have `youtube_playlist.playlist_id`?
3. **The force push:** Check if you had anything on main at `258c350` that I don't have. If so, let me know and we'll merge it in.
4. **The discovery-cache.json workflow:** When I export from the admin panel and commit `src/data/discovery-cache.json` to the repo, you get all my cached data + YouTube overrides on pull. The app pre-warms from this file on startup. Does this workflow make sense, or do you want something different? Let's figure out how to use it.
5. **Any S3 data updates:** Let me know when you push new data — the app auto-refreshes every 2 hours, but I can also pull manually.

## File Inventory

Key files changed in v1.8.3:
- `src/App.jsx` — main app (~22,800 lines)
- `src/PluribusComps.jsx` — mirror
- `src/components/SoundtrackPlayer.jsx` — library sync fixes
- `src/utils/enrichment.js` — `buildAlbumPlaylist` accepts prebuiltTrackNames
- `src/data/bluenote-artist-albums.json` — fresh from S3 (44 artists, 430 albums, per-track YouTube IDs)
- `src/data/discovery-cache.json` — pre-warm cache (currently empty seed)
- `pocv2-jd-design-reskin-versions.html` — version tracker with full v1.8.3 card

## Harvester Fields We Actually Consume

From each artist:
- `name`, `spotify_artist_id`, `image_url`

From each album:
- `title`, `spotify_album_id`, `album_art_url`, `year`
- `youtube.video_id` (full album — LAST RESORT, often wrong for soundtracks)
- `youtube_playlist.playlist_id` (PREFERRED for YouTube embed)
- `tracks[].name`, `tracks[].duration_ms`, `tracks[].spotify_url`, `tracks[].spotify_track_id`
- `tracks[].youtube_video_id` (CRITICAL — per-track YouTube, the game changer)

Fields we do NOT use yet but could:
- `top_songs[]` — could power "essential tracks" on artist modals
- `genres`, `popularity` — could feed the media model / taste profile
- `album.label` — could help with attribution display

## Smart Fallback Rule for Partial YouTube Coverage

When SOME tracks on an album have `youtube_video_id` and some don't:
- Tracks WITH IDs → play their individual YouTube video
- Tracks WITHOUT IDs → `videoId` set to `null` → Spotify-only for that track
- We do NOT fall back to the full-album `youtube.video_id` for missing tracks

Why: Miles Ahead proved that the full-album video can be the WRONG album (1957 Gil Evans instead of 2015 soundtrack). Spotify-only is better than wrong content. This means partial coverage is fine — 11 out of 24 tracks with per-track IDs is great, the other 13 just play on Spotify.

When ZERO tracks have `youtube_video_id` → THEN we use the full-album `youtube.video_id` as fallback for all tracks (the Blue Train / Moanin' case where the full-album video is correct).

## YTA Per-Track Search (Backup)

When harvester doesn't have `youtube_video_id` for a track, we search YTA:
- Query: artist name + full album title + track name (ALL THREE)
- Parameter: `type=song` (prevents confusion with films/audiobooks/books)
- Preference: VEVO and official artist channels ranked first
- Example: "Don't Know Why Norah Jones Come Away With Me" → returns VEVO video
- Bad example: "Don't Know Why" alone → returns garbage
- Full album title disambiguates: "Miles Ahead Original Motion Picture Soundtrack" vs "Miles Ahead" (the 1957 album)

## What's Coming in v1.8.4 (Affects Your Data)

1. **Discovery strip will show artist's OWN albums** from `artist-albums.json` instead of generic Blue Note albums. Norah Jones modal → her 9 albums, not Blue Train and Giant Steps.

2. **Zone 4 will use `video-entity-index.json`** — the 815 analyzed videos with 15,254 quotes and 11,265 entities. We'll load per-universe indexes from S3. Currently only `blue-note-video-entity-index.json` is loaded locally.

3. **Discovery Playlists from video analysis** will enrich the discovery strip with cross-media connections.

4. **Music across all 5 universes** — need `artist-albums.json` for Pluribus, Sinners, Gerwig, Patti Smith (you said Patti Smith has 33 artists / 315 albums but YouTube backfill was at 0% — what's the status?)

## localStorage Keys (For Debugging)

- `ut_library` — My Stuff items (`Object<string, LibraryItem>`)
- `ut_discovery_cache` — resolved modal data (Spotify URLs, ytPlaylist, album art)
- `ut_yt_overrides` — manual YouTube corrections (playlist URLs, video IDs)
- `ut_session` — universe/screen state persistence
- `ut_s3_last_refresh` — timestamp of last S3 artist-albums.json refresh
- `ut_selected_model` — selected AI model preference
- `ut_tile_overrides` — tile display overrides

— J.D.
