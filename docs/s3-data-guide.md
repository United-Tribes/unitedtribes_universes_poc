# UnitedTribes S3 Data Guide

> **For: JD (Frontend)**
> **Last updated:** March 20, 2026
> **Author:** Justin

This guide covers everything you need to work with the data files that power the UnitedTribes Universes POC. All data lives on S3 — you pull it down locally and develop against it. No git coordination needed.

---

## Quick Start

### Pull latest data (30 seconds)

From the POC repo root:

```bash
bash pull-data.sh
```

This downloads the latest universe + response JSON for all 5 universes into `src/data/`. Restart your dev server to pick up changes.

### What it does

`pull-data.sh` fetches 10 files (2 per universe) from S3 via `curl`:

```
src/data/gerwig-universe.json      # Entity database
src/data/gerwig-response.json      # Discovery groups + UI data
src/data/sinners-universe.json
src/data/sinners-response.json
src/data/pluribus-universe.json
src/data/pluribus-response.json
src/data/bluenote-universe.json
src/data/bluenote-response.json
src/data/pattismith-universe.json
src/data/pattismith-response.json
```

No AWS credentials needed — the S3 bucket has public read access.

---

## Where the Data Lives

### S3 Bucket

**Bucket:** `unitedtribes-visualizations-1758769416`
**Region:** us-east-1
**Base URL:** `http://unitedtribes-visualizations-1758769416.s3-website-us-east-1.amazonaws.com/universe-data/`

### Directory structure on S3

```
universe-data/
  gerwig/
    gerwig-universe.json          # 33 entities
    gerwig-response.json          # Discovery groups, songs, themes
  sinners/
    sinners-universe.json         # 42 entities
    sinners-response.json
  pluribus/
    pluribus-universe.json        # 74 entities
    pluribus-response.json
    theme-enrichment.json         # Theme-to-video mappings (Pluribus only)
  bluenote/
    bluenote-universe.json        # 75 entities
    bluenote-response.json
  pattismith/
    pattismith-universe.json      # 77 entities
    pattismith-response.json
  video-analysis-kg/              # Knowledge graph relationship files (770 files)
    _manifest.json                # Index of all KG files
    *.json                        # Individual video analysis → KG triples
  all-video-entity-index.json     # Cross-universe video content index
```

### Direct URLs (browser-accessible)

You can view any file directly:

```
http://unitedtribes-visualizations-1758769416.s3-website-us-east-1.amazonaws.com/universe-data/gerwig/gerwig-universe.json
http://unitedtribes-visualizations-1758769416.s3-website-us-east-1.amazonaws.com/universe-data/sinners/sinners-response.json
http://unitedtribes-visualizations-1758769416.s3-website-us-east-1.amazonaws.com/universe-data/all-video-entity-index.json
```

**Note:** S3 static hosting does not set CORS headers. Use `curl` or `pull-data.sh` to download — don't `fetch()` these URLs from browser JavaScript.

---

## The Two Data Files Per Universe

Every universe has exactly two files that the frontend consumes. Here's what's in each.

### 1. `{universe}-universe.json` — Entity Database

This is a flat object keyed by entity name. Each entity has everything needed to render an Entity Detail screen.

```json
{
  "Greta Gerwig": {
    "type": "person",
    "emoji": "🎬",
    "badge": "Verified Entity",
    "subtitle": "Director, Writer, Actor",
    "photoUrl": "https://image.tmdb.org/t/p/w500/...",
    "posterUrl": "https://image.tmdb.org/t/p/w500/...",
    "avatarGradient": "linear-gradient(135deg, #2a7a4a, #35905a)",
    "bio": [
      "First paragraph of bio...",
      "Second paragraph..."
    ],
    "stats": [
      { "value": "Sacramento, CA", "label": "From" },
      { "value": "Aug 4, 1983", "label": "Born" },
      { "value": "Acting, Directing", "label": "Known For" }
    ],
    "tags": ["Born: Aug 4, 1983", "Sacramento, California", "Acting"],
    "quickViewGroups": [
      {
        "label": "Videos",
        "items": [
          {
            "title": "Lady Bird Trailer",
            "meta": "A24",
            "platform": "YouTube",
            "platformColor": "#ff0000",
            "video_id": "cNi_HC839Wo",
            "thumbnail": "https://i.ytimg.com/vi/cNi_HC839Wo/hqdefault.jpg"
          }
        ],
        "total": 3
      }
    ],
    "completeWorks": [
      {
        "type": "FILM",
        "typeBadgeColor": "#16803c",
        "title": "Lady Bird",
        "role": "Director, Writer",
        "year": 2017,
        "meta": "Directed, Wrote",
        "relatedThemes": ["Coming of Age", "Sacramento"]
      }
    ],
    "collaborators": [
      {
        "title": "Noah Baumbach",
        "type": "person",
        "subtitle": "Director, Writer",
        "connection": "Frequent collaborator — co-wrote Barbie"
      }
    ],
    "relatedThemes": ["Coming of Age", "Female Directors"]
  }
}
```

**Key fields for the frontend:**

| Field | What it is | Used for |
|-------|-----------|----------|
| `type` | Entity type: `person`, `film`, `tv_series`, `album`, `song`, `book`, `band`, `venue`, `movement`, `concept` | Icon/badge selection, filtering |
| `photoUrl` | TMDB profile photo (people) | Avatar/hero images |
| `posterUrl` | TMDB poster (films/shows) | Card thumbnails |
| `bio` | Array of paragraph strings | Entity Detail bio section |
| `quickViewGroups` | YouTube videos, Spotify albums, articles | QuickView panel, media embeds |
| `completeWorks` | Filmography, discography, bibliography | Entity Detail works section |
| `collaborators` | Connected people/entities | Entity Detail collaborators section |
| `relatedThemes` | Theme tags | Theme pills, filtering |

**Entity counts by universe:**

| Universe | Entities | Notable anchors |
|----------|----------|----------------|
| Pluribus | 74 | Vince Gilligan, Rhea Seehorn, Dave Porter |
| Blue Note | 75 | John Coltrane, Miles Davis, Art Blakey |
| Patti Smith | 77 | Patti Smith, Robert Mapplethorpe, Sam Shepard |
| Sinners | 42 | Ryan Coogler, Michael B. Jordan |
| Gerwig | 33 | Greta Gerwig, Noah Baumbach, Saoirse Ronan |

### 2. `{universe}-response.json` — Discovery Groups + UI Data

This is the pre-rendered AI response that powers the Response screen and discovery cards.

```json
{
  "query": "Who created Greta Gerwig and what inspired it?",
  "discoveryCount": 33,
  "discoveryGroups": [
    {
      "id": "inspirations",
      "accentColor": "#c0392b",
      "title": "Key Influences",
      "description": "The films, books, and people that shaped this universe.",
      "cards": [
        {
          "type": "FILM",
          "typeBadgeColor": "#16803c",
          "title": "Frances Ha",
          "meta": "2012 · 7.4/10",
          "context": "A defining collaboration between Gerwig and Baumbach...",
          "icon": "🎬",
          "posterUrl": "https://image.tmdb.org/t/p/w500/...",
          "photoUrl": "https://...",
          "video_id": "YouTubeTrailerId",
          "platform": "Watch Trailer",
          "platformColor": "#ff0000"
        }
      ]
    }
  ],
  "songs": [
    {
      "title": "Song Title",
      "artist": "Artist Name",
      "context": "Scene description",
      "spotify_url": "https://open.spotify.com/track/...",
      "video_id": "YouTubeId"
    }
  ],
  "episodes": [
    {
      "number": 1,
      "title": "Episode Title",
      "description": "Synopsis...",
      "director": "Director Name",
      "writer": "Writer Name",
      "themes": ["Theme1", "Theme2"],
      "keyMoment": "The key moment of this episode...",
      "watchFor": "What to watch for..."
    }
  ],
  "themeVideos": [
    {
      "themeId": "theme-slug",
      "title": "Scene/Moment Title",
      "description": "What happens in this moment",
      "videoId": "YouTubeId",
      "timestamp": "12:34",
      "type": "SCENE",
      "contexts": ["Context string 1"]
    }
  ],
  "actorCharacterMap": {
    "Saoirse Ronan": "Lady Bird McPherson"
  }
}
```

**Key sections:**

| Section | What it is | Used for |
|---------|-----------|----------|
| `discoveryGroups` | Grouped discovery cards (influences, cast, crew, music) | Response screen card grid |
| `songs` | Needle drops / featured music with Spotify + YouTube | NowPlayingBar, music sections |
| `episodes` | Per-episode metadata | Episodes screen, Episode Detail |
| `themeVideos` | Timestamped video moments tagged to themes | Themes screen, Sonic Layer |
| `actorCharacterMap` | Actor name → character name | Cast & Crew screen, Episode Detail |

---

## What Produces This Data

Two separate pipelines generate data that ends up on S3:

### Pipeline 1: The Harvester (universe data)

The harvester is a 4-stage Node.js pipeline that builds universe + response JSON files. Justin runs it manually.

```
discover.mjs   →  Find all entities connected to the anchor (e.g., "Greta Gerwig")
harvest.mjs    →  Enrich entities via TMDB, YouTube, Spotify, Wikipedia APIs
harvest-themes →  Extract theme-to-video mappings
assemble.mjs   →  Build final universe.json + response.json → deploy to S3
```

**What the harvester adds to each entity:**
- TMDB photos and bios (people, films, shows)
- Wikipedia bios (for entities TMDB doesn't cover — venues, books, movements)
- YouTube trailers and interview clips
- Spotify album/track links
- Knowledge Graph relationships (collaborators, works, influences)
- Avatar gradient colors (auto-generated from photos)

**When data gets updated:** Justin runs the harvester when new entities are added, relationships change, or enrichment data needs refreshing. After assembling, data is deployed to S3. Run `pull-data.sh` to get the latest.

### Pipeline 2: Video Analysis (video entity index + KG files)

The video analysis pipeline processes YouTube videos and podcasts about each universe, extracting structured editorial content.

```
Source: ~/Desktop/JDsVideos-by-universe/{universe}/   (analysis markdown files)
   ↓
process-video-analysis.mjs   →  Parse markdown → structured JSON
   ↓
build-video-entity-index.py  →  Build cross-video entity lookup index
   ↓
Deploy to S3: video-analysis-kg/*.json + entity indices
```

**What video analysis produces:**

1. **Video Analysis KG files** (`video-analysis-kg/*.json`) — Knowledge graph relationship triples extracted from each analyzed video. Each file contains:
   - Source info (YouTube URL, channel, title)
   - Relationships array (entity A → entity B, with relationship type, confidence score, evidence text, and source attribution)
   - Used by Shanan for KG ingestion — enriches the knowledge graph with video-sourced relationships

2. **Video Entity Index** (`all-video-entity-index.json`) — A cross-universe lookup index with two access patterns:
   - **By entity name** → get all videos mentioning that entity, with synopses, quotes, and timestamped moments
   - **By video ID** → get full editorial content for a specific video (synopsis, themes, key quotes, entities referenced)

**Current coverage:**
- 193 analyzed videos across all universes
- 2,924 unique entity references
- 129 key quotes with timestamps
- 770 KG relationship files

**Note:** The video entity index is not yet integrated into the POC frontend — it's available for future features like "Videos about this entity" or quote attribution. The KG files flow to Shanan's ingestion pipeline to strengthen the knowledge graph.

---

## How to Pull Data Manually

### Option 1: Use pull-data.sh (recommended)

```bash
cd unitedtribes_universes_poc
bash pull-data.sh
```

Output:
```
Pulling latest universe data from S3...

  gerwig       OK
  sinners      OK
  pluribus     OK
  bluenote     OK
  pattismith   OK

Done. Restart your dev server to pick up changes.
```

### Option 2: curl individual files

```bash
# Pull just one universe
curl -sf -o src/data/gerwig-universe.json \
  "http://unitedtribes-visualizations-1758769416.s3-website-us-east-1.amazonaws.com/universe-data/gerwig/gerwig-universe.json"

curl -sf -o src/data/gerwig-response.json \
  "http://unitedtribes-visualizations-1758769416.s3-website-us-east-1.amazonaws.com/universe-data/gerwig/gerwig-response.json"
```

### Option 3: Pull video entity index

```bash
# Cross-universe video content index (4.7 MB)
curl -sf -o src/data/all-video-entity-index.json \
  "http://unitedtribes-visualizations-1758769416.s3-website-us-east-1.amazonaws.com/universe-data/all-video-entity-index.json"
```

---

## Developing Against the Data

### Importing universe data

```jsx
import universeData from './data/gerwig-universe.json';
import responseData from './data/gerwig-response.json';

// Entity lookup
const entity = universeData["Greta Gerwig"];
console.log(entity.bio);          // ["First paragraph...", "Second paragraph..."]
console.log(entity.photoUrl);     // "https://image.tmdb.org/t/p/w500/..."
console.log(entity.collaborators); // [{title: "Noah Baumbach", ...}]

// Discovery groups
const groups = responseData.discoveryGroups;
groups.forEach(g => {
  console.log(g.title, g.cards.length); // "Key Influences" 14
});

// Songs
const songs = responseData.songs;
// Each has: title, artist, context, spotify_url, video_id

// Actor → Character mapping
const charName = responseData.actorCharacterMap["Saoirse Ronan"];
// "Lady Bird McPherson"
```

### Common patterns

**Get all entity names for a universe:**
```js
const entityNames = Object.keys(universeData);
// ["Greta Gerwig", "Noah Baumbach", "Saoirse Ronan", ...]
```

**Filter entities by type:**
```js
const people = Object.entries(universeData)
  .filter(([_, e]) => e.type === 'person');
const films = Object.entries(universeData)
  .filter(([_, e]) => e.type === 'film');
```

**Get YouTube videos for an entity:**
```js
const videos = entity.quickViewGroups
  ?.find(g => g.label === 'Videos')
  ?.items?.filter(i => i.video_id) || [];
```

**Get Spotify content for an entity:**
```js
const music = entity.quickViewGroups
  ?.find(g => g.label === 'Music' || g.label === 'Albums')
  ?.items?.filter(i => i.spotify_url || i.album_id) || [];
```

### Entity types you'll encounter

| Type | Examples | Has photoUrl | Has posterUrl |
|------|---------|:---:|:---:|
| `person` | Greta Gerwig, John Coltrane | Yes | No |
| `film` | Lady Bird, Frances Ha | Sometimes | Yes |
| `tv_series` | Pluribus, Breaking Bad | Sometimes | Yes |
| `album` | Blue Train, A Love Supreme | No | Yes |
| `song` | Round Midnight, So What | No | No |
| `book` | Just Kids, Little Women | No | Yes |
| `band` | Jazz Messengers, Sonic Youth | Sometimes | No |
| `venue` | Blue Note Jazz Club, CBGB | Sometimes | No |
| `movement` | Bebop, Beat Generation | No | No |
| `concept` | Method Acting, Auteur Theory | No | No |

### Image handling

- **photoUrl**: TMDB profile photo — always `https://image.tmdb.org/t/p/w500/...`
- **posterUrl**: TMDB poster — same format
- **thumbnails**: YouTube thumbnails — `https://i.ytimg.com/vi/{videoId}/hqdefault.jpg`
- **avatarGradient**: CSS gradient string for fallback when no photo — use as `background` property

```jsx
// Photo with gradient fallback
<div style={{
  background: entity.photoUrl
    ? `url(${entity.photoUrl}) center/cover`
    : entity.avatarGradient || '#1a2744'
}}>
```

---

## When Data Gets Updated

1. **Justin runs the harvester** — adds/updates entities, enriches with new API data
2. **Justin assembles** — builds final JSON files from enriched data + manual overrides
3. **Justin deploys to S3** — uploads assembled files to the S3 bucket
4. **You run `pull-data.sh`** — downloads latest files into your local `src/data/`
5. **Restart dev server** — Vite picks up the new JSON imports

Justin will let you know in Slack when new data is deployed. You can also run `pull-data.sh` anytime — if nothing changed, you'll get the same files.

---

## Glossary

| Term | Definition |
|------|-----------|
| **Universe** | A curated collection of entities centered around one anchor (e.g., "Greta Gerwig" or "Pluribus") |
| **Entity** | Any person, film, album, book, venue, or concept in the knowledge graph |
| **Anchor** | The central entity of a universe (e.g., Greta Gerwig, Vince Gilligan) |
| **Discovery Group** | A themed grouping of cards on the Response screen (e.g., "Key Influences", "The Cast") |
| **Harvester** | The Node.js pipeline that discovers, enriches, and assembles entity data |
| **Enrichment** | The process of adding photos, bios, videos, and music links from TMDB/YouTube/Spotify/Wikipedia APIs |
| **Assembly** | The final stage that transforms enriched data into display-ready JSON |
| **Manual Overrides** | Hand-curated fixes that survive re-enrichment (e.g., corrected photos, added bios) |
| **Video Analysis** | Pipeline that extracts structured editorial content from YouTube video transcripts/analysis |
| **KG (Knowledge Graph)** | The UnitedTribes relationship database (9,000+ entities, 4,000+ relationships) |
| **Tier** | Entity importance level: T1 (main cast/creators), T2 (supporting), T3 (referenced), T4 (noise) |
| **Video Entity Index** | Cross-universe lookup: entity name → videos mentioning them, with quotes and timestamps |
| **Video Analysis KG** | Relationship triples extracted from analyzed videos — feeds back into the knowledge graph |

---

## Troubleshooting

**`pull-data.sh` shows a red X for a universe:**
The file doesn't exist on S3 yet. Ask Justin if that universe has been assembled and deployed.

**Data looks stale after pulling:**
Make sure you restart your dev server (`npm run dev`). Vite caches JSON imports.

**Images look wrong or AI-generated:**
Report to Justin. Some TMDB photos are low quality — we fix these with manual overrides that persist through re-enrichment.

**Entity is missing from universe.json:**
The entity might be Tier 3 or 4 (not enriched). Ask Justin to promote it via overrides.json.

**CORS errors when fetching from S3:**
Don't `fetch()` from S3 URLs in browser code. Import JSON files directly (`import data from './data/...'`). The S3 bucket doesn't set CORS headers.

**Need an entity that doesn't exist yet:**
Ask Justin to add it to the universe's overrides.json and re-run the pipeline.
