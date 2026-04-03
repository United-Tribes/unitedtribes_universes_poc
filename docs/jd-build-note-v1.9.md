# Build Note: v1.9.0 — Apr 2, 2026

## Pull Latest

```bash
cd ~/Desktop/unitedtribes_universes_poc
git pull origin justin/apr-2-pipeline-and-modal-fixes
npm run dev
```

## What's in This Build

### Modal Consistency
- **Songs**: enriched catalog modal with Spotify/YouTube, "by Artist", SONG badge
- **Albums**: harvester full-mode modal (Spotify/YouTube toggle, tracklist, features panel)
- **Films**: enriched catalog modal (poster, trailer, soundtrack, "Directed by")
- **Books**: enriched catalog modal ("Written by", Open Library cover)
- All modal types now have consistent Read Watch & Listen section

### Read Watch & Listen Overhaul
- **Tab labels**: Related, Top Songs, Featured Discovery
- **Gold-accent tab pills** matching the video modal design
- **Unified card style** across all tabs: 160px wide, white card, square thumbnail, gold hover, GoldAdd [+] button
- **Featured Discovery click** opens a new video modal (not inline playback)
- **Smart video badges**: ANALYSIS only for real analysis videos, TMDB videos show FEATURETTE / BTS / TEASER / TRAILER / CLIP / etc.
- **Thin scrollbar** on all scroll panels
- **Film posters** in Related tab from enriched catalog (not hardcoded)
- **Entity filtering**: TRACK/VIDEO/PLAY items removed from Related tab

### My Stuff Wall
- Type-aware tile heights: films (poster), albums (square), videos (landscape), books (tall), people (portrait)
- S/M/L scales proportionally within each type's aspect ratio
- Albums use object-fit: contain (full cover, no cropping)
- **NOTE**: Wall layout needs polish — S/M/L in CSS columns has limitations, may need grid for full control

### Other
- Autoplay disabled globally — except timecode jumps (▶ 00:12 badges) which use autoplay=1 since user explicitly clicked to play from a specific time
- Search normalization (½→1/2, smart quotes, diacritics) — "8 1/2" finds "8½"
- 8½ enriched with correct Nino Rota soundtrack + TMDB videos
- Confess, Fletch removed from filmography
- Build badge: v1.9.0 · a2c6fed · Apr 2, 2026 3:51 PM

---

## Podcast Modal — Data & Assets

JD is building the podcast modal. Here's where everything lives:

### Podcast Registry (metadata)
- **Local file**: `src/data/podcast-registry.json`
- **S3**: `http://unitedtribes-visualizations-1758769416.s3-website-us-east-1.amazonaws.com/media/registry.json`
- **Structure**:
  ```json
  {
    "version": "1.0",
    "base_url": "http://unitedtribes-visualizations-1758769416.s3-website-us-east-1.amazonaws.com",
    "by_universe": {
      "sinners": [ { "title": "...", "channel": "...", "video_id": "slug", "universe": "sinners", "url": "...mp4", "slug": "..." } ],
      "greta-gerwig": [ ... ],
      "pluribus": [ ... ]
    }
  }
  ```
- **Counts**: sinners (8), greta-gerwig (20), pluribus (19) — 47 total

### Podcast Audio/Video Files (S3)
- **Base path**: `s3://unitedtribes-visualizations-1758769416/media/videos/`
- **By universe**:
  - `media/videos/sinners/` — 8 .mp4 files
  - `media/videos/greta-gerwig/` — 20 .mp4 files
  - `media/videos/pluribus/` — 19 .mp4 files
- **Direct URL pattern**: `{base_url}/media/videos/{universe}/{slug}.mp4`
- **Example**: `http://unitedtribes-visualizations-1758769416.s3-website-us-east-1.amazonaws.com/media/videos/sinners/oscar-nominated-cinematographer-autumn-durald-arkapaw-on.mp4`

### Rich Metadata in Video Analysis Index
All 47 podcasts have matching entries in `src/data/all-video-entity-index.json` (matched by title). Each entry has:

| Field | Description | Example |
|-------|-------------|---------|
| `duration` | Episode length | "29:28" |
| `channel` | Show name | "The Business", "Fresh Air" |
| `host` | Host name | "Kim Masters" |
| `content_type` | Format | "podcast", "interview" |
| `synopsis` | Full description | Rich editorial summary |
| `key_quotes` | Timestamped quotes | Array with speaker, text, timestamp |
| `themes` | Topic tags | Array of theme strings |
| `anecdotes` | Story highlights | Array of anecdote objects |
| `entities` | People/works discussed | Array with name, timestamp, type |
| `entity_count` | Number of entities | 33 |
| `quote_count` | Number of quotes | 10 |

**How to access**: Look up the podcast title in `allVideoIndexes._all.videos` or by slug. The video index is loaded at app startup and available in the `allVideoIndexes` state.

**Example lookup**:
```js
const podcastData = Object.values(allVideoIndexes._all?.videos || {})
  .find(v => v.title === podcast.title);
// podcastData.synopsis, podcastData.key_quotes, podcastData.entities, etc.
```

### No Thumbnails Currently
- The S3 media directory only has .mp4 files and registry.json
- No thumbnail images — use channel logos or generate from video analysis data as fallbacks

### How Podcasts Load in App.jsx
- **Line ~24289**: `import("./data/podcast-registry.json")` — loaded as static import
- **Line ~24572**: `podcastsByEntity` lookup built from registry by universe
- **Line ~7649**: `getPopoverMedia()` merges podcast episodes into entity popover
- **State**: `podcastRegistry` (full registry), `podcastsByEntity` (entity→episodes map)
- **Video analysis**: `allVideoIndexes` — contains full metadata for all 47 podcasts

### Registry Entry Fields (podcast-registry.json)
| Field | Description |
|-------|-------------|
| `title` | Episode title |
| `channel` | Podcast show name (e.g., "The Business", "Fresh Air") |
| `video_id` | Slug-based ID (not a YouTube ID) |
| `universe` | sinners / greta-gerwig / pluribus |
| `url` | Full S3 URL to .mp4 file |
| `slug` | URL-safe slug |

**Note**: The registry has basic metadata. The rich metadata (synopsis, quotes, entities, themes) lives in the video analysis index — match by title to get the full picture.
