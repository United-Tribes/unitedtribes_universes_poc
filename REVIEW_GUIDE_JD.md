# Phase 2b: Enriched Entity Data — Review Guide for JD

> **Branch:** `phase2-data-extraction`
> **Date:** Feb 26, 2026
> **What's new:** 102 fully enriched entities with images, bios, videos, music, stats, and relationships — all available as structured JSON for any feature to consume

---

## Quick Start

```bash
# If you already have the repo:
cd unitedtribes_universes_poc
git fetch origin
git checkout phase2-data-extraction
git pull origin phase2-data-extraction
npm install
npm run dev

# Fresh clone:
git clone https://github.com/United-Tribes/unitedtribes_universes_poc.git
cd unitedtribes_universes_poc
git checkout phase2-data-extraction
npm install
npm run dev
```

**See the visualization demo:** `http://localhost:5173/universes-poc/?test=visualization` (Universe Network tab)

This is a test page showing the data in a force-directed graph. Click any node to see a detail panel previewing the entity data. The real value is the data itself — described below.

---

## The Data: What's Available

Two JSON files in `src/data/` contain all the enriched data, ready for any component to import:

### `pluribus-universe.json` — Entity Detail Data

A flat object keyed by entity name. **102 entities** across 6 types:

| Type | Count | Examples | Data Sources |
|------|-------|----------|-------------|
| **Cast** (person) | 24 actors | Rhea Seehorn, Katt Williams, Jason Bateman | TMDB bio + photo, YouTube interviews, KG relationships |
| **Creators** (person) | 7 crew | Vince Gilligan, Dave Porter, Gordon Smith | TMDB bio + photo, YouTube clips, manual overrides |
| **Influences** (film) | 14 films/shows | The Thing, Twilight Zone episodes, The Borg | TMDB poster + overview + ratings, YouTube trailers, KG analysis videos |
| **Music** (artist) | 35 artists | Khruangbin, Miles Davis, Sade, DakhaBrakha | Spotify artist image + genres + tracks, YouTube music videos |
| **Characters** (character) | 5 | Davis Taffler, Zosia, Koumba Diabaté | Character profile, actor's photo, actor interview clips |
| **Themes** (theme) | 11 | Isolation, Grief, Identity, Collective | YouTube analysis videos, character moment quotes |

### `pluribus-response.json` — Discovery & Browsing Data

Pre-organized content for browsing screens:

- `discoveryGroups` (4 groups, 63 cards) — Key Influences, The Cast, Behind the Scenes, Featured Music
- `songs` (34) — every needle drop with title, artist, context, episode, `spotify_url`, `video_id`
- `episodes` (9) — title, director, writer, themes, key moment, cast
- `themeVideos` — 20 themes with YouTube analysis videos + character moment quotes
- `actorCharacterMap` — 30 actor→character name mappings

---

## Entity Schema — Fields Available Per Type

Every entity in `pluribus-universe.json` follows this shape:

```javascript
{
  // === IDENTITY ===
  type: "person" | "film" | "artist" | "character" | "theme" | "show",
  emoji: "👤",              // Type icon
  badge: "Verified Entity",  // Or "Theme"
  subtitle: "Actor",         // Human-readable role/type description

  // === DISPLAY ===
  photoUrl: "https://...",   // Headshot (TMDB or Spotify) — null if unavailable
  posterUrl: "https://...",  // Movie/show poster (TMDB) — null for non-films
  avatarGradient: "linear-gradient(...)",  // Fallback gradient when no image

  // === CONTENT ===
  bio: ["Paragraph 1...", "Paragraph 2..."],  // Biography or description
  stats: [                   // Key facts (varies by type)
    { value: "53", label: "Age" },
    { value: "Norfolk", label: "From" },
  ],
  tags: ["Horror", "Mystery"],  // Genre tags, birth info, etc.

  // === MEDIA ===
  quickViewGroups: [         // Videos, trailers, music tracks
    {
      label: "Videos" | "Trailers" | "Analysis" | "Music",
      items: [{
        title: "The Thing (1982) Trailer",
        meta: "horrorfan",                    // Channel name
        platform: "YouTube" | "Spotify",
        platformColor: "#ff0000",
        video_id: "5ftmr17M-a4",             // YouTube video ID (for embeds)
        thumbnail: "https://i.ytimg.com/...", // Thumbnail URL
        spotify_url: "https://open.spotify.com/track/...",  // Spotify track link
      }],
      total: 3,
    }
  ],

  // === RELATIONSHIPS ===
  collaborators: [{          // People this entity has worked with
    name: "Vince Gilligan",
    relationship: "Creator of Pluribus",
    sharedWorks: ["Pluribus", "Breaking Bad"],
  }],
  completeWorks: [{          // Career highlights / filmography
    type: "CAREER",
    title: "Better Call Saul (2015-2022)",
    meta: "Kim Wexler",
    icon: "📺",
  }],

  // === THEMES (cast/characters only) ===
  themes: [{
    title: "Identity",
    description: "Carol's journey of self-discovery...",
    works: ["Pluribus"],
  }],

  // === MUSIC (artist type only) ===
  sonic: [{                  // Spotify tracks
    title: "Texas Sun",
    meta: "Khruangbin",
    platform: "Spotify",
    spotify_url: "https://open.spotify.com/track/...",
  }],

  // === GRAPH (for visualization, optional) ===
  graphNodes: [...],
  graphEdges: [...],
}
```

### What Each Entity Type Typically Has

| Field | Cast | Creator | Film | Music | Character | Theme |
|-------|------|---------|------|-------|-----------|-------|
| `photoUrl` | TMDB headshot | TMDB or manual | — | Spotify image | Actor's photo | — |
| `posterUrl` | — | — | TMDB poster | — | — | — |
| `bio` | TMDB biography | TMDB or manual bio | TMDB overview | Evidence from KG | Character description | Generated summary |
| `stats` | Age, From, Known For | Known For | Year, Runtime, TMDB/IMDb rating | Popularity, Genre | — | Video count, Character count |
| `quickViewGroups` | Videos (interviews) | Videos (clips) | Trailers + Analysis | Videos + Music | Videos (actor clips) | Videos (analysis) |
| `collaborators` | Co-stars, directors | Collaborators | — | — | — | — |
| `completeWorks` | Filmography | Career highlights | — | Song placements | Character facts | — |
| `sonic` | — | — | — | Spotify tracks | — | — |
| `themes` | Character themes | — | — | — | Character themes | Character moments |

---

## How To Use This Data In Your Features

### Import the data

```javascript
// Static import (bundled at build time — current approach)
import universeData from "../../data/pluribus-universe.json";
import responseData from "../../data/pluribus-response.json";

// Access any entity by name
const rhea = universeData["Rhea Seehorn"];
console.log(rhea.photoUrl);    // TMDB headshot URL
console.log(rhea.bio[0]);      // First paragraph of biography
console.log(rhea.stats);       // [{ value: "53", label: "Age" }, ...]

// Get all music artists
const musicArtists = Object.entries(universeData)
  .filter(([_, e]) => e.type === "artist");

// Get all songs with Spotify links
const songs = responseData.songs
  .filter(s => s.spotify_url);
```

### Common data access patterns

```javascript
// Get entity image (photo for people, poster for films)
function getEntityImage(entity) {
  return entity.photoUrl || entity.posterUrl || null;
}

// Get YouTube videos for an entity
function getEntityVideos(entity) {
  return (entity.quickViewGroups || [])
    .filter(g => ["Videos", "Trailers", "Analysis"].includes(g.label))
    .flatMap(g => g.items || []);
}

// Get Spotify tracks for an entity
function getEntityTracks(entity) {
  return (entity.quickViewGroups || [])
    .filter(g => g.label === "Music")
    .flatMap(g => g.items || []);
}

// Get character→actor mapping
const characterName = "Davis Taffler";
const character = universeData[characterName];
const actorName = character?.subtitle?.match(/Played by (.+)/)?.[1];
const actor = actorName ? universeData[actorName] : null;

// Embed a YouTube video
function YouTubeEmbed({ videoId }) {
  return (
    <iframe
      src={`https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1`}
      width="100%" height="315"
      allow="accelerometer; autoplay; clipboard-write; encrypted-media"
      allowFullScreen
    />
  );
}

// Get all entities by type
const byType = {};
for (const [name, entity] of Object.entries(universeData)) {
  const t = entity.type || "unknown";
  byType[t] = byType[t] || [];
  byType[t].push({ name, ...entity });
}
// byType.person → 31 entries (cast + crew)
// byType.artist → 35 entries (music)
// byType.film   → 14 entries (influences)
// byType.character → 5 entries
// byType.theme  → 11 entries
// byType.show   → 1 entry (Pluribus itself)
```

---

## Where The Data Comes From — The Harvester Pipeline

The JSON files are produced by a 4-stage Node.js pipeline (lives in the `harvester/` directory of the parent repo `united-tribes-lean-back`). You don't need to run this — the output is already committed. But understanding where data comes from helps when building features:

```
Stage 1: discover.mjs    → manifest.json        (3,799 entities from KG API, categorized + tiered)
Stage 2: harvest.mjs     → enriched.json        (external API enrichment: TMDB, YouTube, Spotify)
Stage 3: harvest-themes.mjs → theme-videos.json  (theme↔video mappings from KG)
Stage 4: assemble.mjs    → pluribus-universe.json + pluribus-response.json (display-ready)
```

### Data sources per field

| Field | Source | API |
|-------|--------|-----|
| `photoUrl` (people) | TMDB person search | `api.themoviedb.org` |
| `photoUrl` (music) | Spotify artist search | `api.spotify.com` |
| `posterUrl` (films) | TMDB movie/TV search | `api.themoviedb.org` |
| `bio` (people) | TMDB person details | `api.themoviedb.org` |
| `bio` (films) | TMDB movie details (overview) | `api.themoviedb.org` |
| `stats` (films) | TMDB + OMDB (ratings) | `api.themoviedb.org` + `omdbapi.com` |
| YouTube videos | YouTube Data API search | `googleapis.com/youtube/v3` |
| Spotify tracks | Spotify Web API | `api.spotify.com` |
| Relationships | UnitedTribes Knowledge Graph | `166ws8jk15.execute-api...` |
| Character profiles | KG entity relationships | Same KG API |
| Theme videos | KG + manual curation | KG API + `theme-videos.json` |
| Manual overrides | `manual-overrides.json` | Hand-curated (Dave Porter bio, corrected images, etc.) |

### Tier system (determines which entities get enriched)

- **Tier 1** (13): Anchor show, main cast, creators — full enrichment from all APIs
- **Tier 2** (44): Recurring cast, composers, characters, key influences — moderate enrichment
- **Tier 3** (35 included): Featured music artists — Spotify + YouTube enrichment
- **Tier 3** (1,859 excluded): Press articles, content, minor references — cataloged but not assembled
- **Tier 4** (1,848): Noise — not processed

---

## Visualization Demo — What To Look At

The test page at `?test=visualization` shows the data rendered as an interactive graph. This is a proof-of-concept for one way to use the data — not the final UI.

**Universe Network tab:**
- Force-directed graph with 102 nodes in hub-and-spoke clusters
- Click any node → detail panel showing that entity's full data
- Good entities to click: **Rhea Seehorn** (rich cast data), **Khruangbin** (music with Spotify + YouTube), **The Thing** (film with trailer + analysis), **Isolation** (theme with videos + character moments), **Dave Porter** (creator with manual bio)

---

## Feedback Welcome

1. **Data completeness** — Is there enough content per entity for your features?
2. **Missing fields** — Anything you'd want that isn't here? (e.g., social media links, awards)
3. **Schema questions** — Anything unclear about how to access the data?
4. **Visual direction** — Does the graph demo suggest ideas for how to present this data?
