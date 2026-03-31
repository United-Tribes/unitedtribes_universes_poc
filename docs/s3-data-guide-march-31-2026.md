# S3 Data Files for the UnitedTribes POC

## Base URL

All files live at:
```
http://unitedtribes-visualizations-1758769416.s3-website-us-east-1.amazonaws.com/universe-data/
```

You can fetch any file by appending its path to this base URL.

## How to Pull Files

### Recommended: `fetch()` from the browser

All files are publicly readable. No authentication needed.

```javascript
const S3_BASE = 'http://unitedtribes-visualizations-1758769416.s3-website-us-east-1.amazonaws.com/universe-data';

// Fetch a universe file
const response = await fetch(`${S3_BASE}/sinners/sinners-universe.json`);
const data = await response.json();

// Fetch the enriched content catalog
const catalog = await fetch(`${S3_BASE}/enriched-content-catalog.json`).then(r => r.json());
```

### From the command line (using AWS CLI)

```bash
# Pull a single file
aws s3 cp s3://unitedtribes-visualizations-1758769416/universe-data/sinners/sinners-universe.json ./data/

# Pull all files for a universe
aws s3 sync s3://unitedtribes-visualizations-1758769416/universe-data/sinners/ ./data/sinners/

# Pull everything
aws s3 sync s3://unitedtribes-visualizations-1758769416/universe-data/ ./data/universe-data/
```

### From the command line (using curl, no AWS CLI needed)

```bash
curl -o sinners-universe.json "http://unitedtribes-visualizations-1758769416.s3-website-us-east-1.amazonaws.com/universe-data/sinners/sinners-universe.json"
```

---

## File Reference

### Per-Universe Files (what the POC currently uses)

Each universe has these core files in `universe-data/{universe}/`:

| File | What it is | Used for |
|------|-----------|----------|
| `{universe}-universe.json` | Entity cards — all entities with type, subtitle, poster, stats, media links, collaborators, graph data | Main discovery UI, entity cards, graph visualization |
| `{universe}-response.json` | Discovery groups, songs, episodes, editorial themes | Discovery strip, song player, episode detail |
| `artist-albums.json` | Spotify-verified albums with tracks, YouTube playlists, cover art | Album player, tracklist, YouTube playlist player |
| `poc-artists.json` | Curated artist list for this universe | Artist selector |

**Universes:** `bluenote`, `gerwig`, `pattismith`, `pluribus`, `sinners`

**Example URLs:**
- `{S3_BASE}/sinners/sinners-universe.json`
- `{S3_BASE}/sinners/sinners-response.json`
- `{S3_BASE}/sinners/artist-albums.json`
- `{S3_BASE}/pluribus/pluribus-universe.json`

### Additional Per-Universe Files

| File | Universe(s) | What it is |
|------|------------|-----------|
| `ludwig-goransson-scores.json` | sinners | Film score track listings |
| `raphael-saadiq-catalog.json` | sinners | Raphael Saadiq discography |
| `dave-porter-scores.json` | pluribus | Dave Porter score tracks |
| `thomas-golubic-supervised.json` | pluribus | Music supervisor selections |
| `theme-enrichment.json` | pluribus | Theme-to-video mappings |
| `mark-ronson-catalog.json` | gerwig | Mark Ronson discography |
| `jon-brion-scores.json` | gerwig | Jon Brion score tracks |
| `alexandre-desplat-scores.json` | gerwig | Alexandre Desplat score tracks |
| `rudy-van-gelder-albums.json` | bluenote | 88 Rudy Van Gelder albums |
| `curated-enrichment.json` | pattismith | Manual enrichment overlay |

### Global Data Files (cross-universe content)

These are at `universe-data/` (top level, not inside a universe folder):

| File | Size | What it is | What's in it |
|------|------|-----------|-------------|
| **`enriched-content-catalog.json`** | ~24 MB | All content items from 828 video analyses, enriched with Spotify/TMDB/YouTube | 14,381 items: songs, films, albums, books, TV shows, documentaries, etc. Each has title, creator, type, videoCount, Spotify links, YouTube links, TMDB posters, and source video references. |
| **`all-video-entity-index.json`** | ~38 MB | Entity index — every person, place, work, organization mentioned across all videos | 11,377 entities across 822 videos. For each entity: which videos mention it, timestamps, key quotes, synopses. Two lookup modes: by entity name or by video ID. |
| `master-content-catalog.json` | ~21 MB | Pre-enrichment content catalog (same items, no Spotify/TMDB/YouTube data) | Used by the build pipeline. The enriched version is what you want for display. |
| `album-entity-registry.json` | ~240 KB | Album title → artist mapping for entity linking | Maps album names to artist info for EntityTag click-through in broker narratives. |
| `venue-entity-registry.json` | ~15 KB | Venue name → entity data | Maps venue names for display. |

### Data Explorer

A browser-based tool for reviewing all the data:
```
http://unitedtribes-visualizations-1758769416.s3-website-us-east-1.amazonaws.com/data-explorer/index.html
```

---

## What to Use for What

**"I want to show entity cards for a universe"**
→ `{universe}-universe.json`

**"I want discovery groups, songs, episodes"**
→ `{universe}-response.json`

**"I want album tracklists with Spotify/YouTube"**
→ `artist-albums.json`

**"I want to search all content across all universes"**
→ `enriched-content-catalog.json`

**"I want to find all videos that mention an entity"**
→ `all-video-entity-index.json`

**"I want Spotify links for a song"**
→ `enriched-content-catalog.json` — search by title, get `spotify.url`

**"I want a movie poster"**
→ `enriched-content-catalog.json` — search by title, get `tmdb.poster_url`

**"I want a YouTube trailer for a film"**
→ `enriched-content-catalog.json` — search by title, get `youtube.video_id`

---

## Data Dictionaries

### enriched-content-catalog.json

**Content item fields:**

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `title` | string | Name of the work | "Gloria" |
| `creator` | string or null | Artist, director, or author | "Patti Smith" |
| `type` | string | Content type | "song", "film", "album", "book", "tv-series", "documentary", "novel", "episode", "play", "podcast", "composition", "poem", "musical" |
| `videoCount` | number | How many of JD's videos reference this item | 21 |
| `sources` | array | Which videos this item was extracted from | See below |
| `spotify` | object or null | Spotify enrichment data | See below |
| `youtube` | object or null | YouTube video/trailer data | See below |
| `tmdb` | object or null | TMDB film/TV metadata | See below |

**`sources[]` fields:** `video_id`, `video_title`, `slug`, `channel`, `section` ("discovery_playlist" or "works_discussed"), `category`

**`spotify` fields:** `track_id`, `album_id`, `url`, `album_art_url`

**`youtube` fields:** `video_id`, `title`, `channel`, `thumbnail`

**`tmdb` fields:** `id`, `poster_url`, `overview`, `year`, `videos[]` (array of trailers/featurettes with `video_id`, `type`, `name`, `official`)

### all-video-entity-index.json

**Dual lookup:** `videos[videoId]` for video→entities, `entities["Name"]` for entity→videos

**Entity object:** `total_videos`, `videos[]` with `video_id`, `video_title`, `channel`, `youtube_url`, `duration`, `synopsis`, `appearances[]`, `related_quotes[]`, `total_moments`

**Video object:** `video_id`, `title`, `channel`, `youtube_url`, `slug`, `duration`, `content_type`, `synopsis`, `key_quotes[]`, `themes[]`, `entities[]`, `entity_count`, `quote_count`
