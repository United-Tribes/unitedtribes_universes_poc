# Build Note: v1.9.1 — Apr 3, 2026

## Pull Latest

```bash
cd ~/Desktop/unitedtribes_universes_poc
git pull origin justin/apr-2-pipeline-and-modal-fixes
npm run dev
```

## What's New Since v1.9.0

### Thumbnail Fixes
- **Podcast artwork** now shows in My Stuff wall and Discover search for all 47 podcast entries
- **Discover video search** uses podcast artwork for audio-only items instead of broken YouTube slug URLs
- Items saved to My Stuff now save correct thumbnails (podcast art or null, not broken YouTube URLs)
- **Film thumbnails** (Lady Bird, Little Women) no longer incorrectly pick up podcast artwork
- 🎙 microphone fallback icon for items with no available thumbnail

### Video Badges
- Smart `videoBadge()` helper: ANALYSIS only for real analysis videos, TMDB videos show FEATURETTE / BTS / TEASER / TRAILER / CLIP
- Redundant subtitle text removed from video tiles

### Entity Filtering
- TRACK/VIDEO/PLAY types filtered from Related tab
- `typeBadgeLabel`: TRACK→SONG, PLAY→ALBUM
- Removed Confess, Fletch from filmography

### Other
- 8½ enriched with correct Nino Rota soundtrack
- Search normalization: ½→1/2, smart quotes, diacritics
- Tab labels: Related, Top Songs, Featured Discovery
- Timecode playback fixed (autoplay=1 on timestamp jumps)

---

## Podcast Modal — Complete Data Guide

JD is building the podcast modal. Here's everything and where to find it.

### Overview

47 podcast episodes across 3 universes. Each has:
- Audio/video file on S3
- Artwork from Apple Podcasts
- Rich editorial metadata (synopsis, quotes, entities, themes) from video analysis
- Transcript

### 1. Podcast Registry (index of all 47 episodes)

**File:** `src/data/podcast-registry.json`

**Structure:**
```json
{
  "by_universe": {
    "sinners": [8 items],
    "greta-gerwig": [20 items],
    "pluribus": [19 items]
  }
}
```

**Each entry has:**
| Field | Description | Example |
|-------|-------------|---------|
| `title` | Episode title | "S1E3Full:Grenade" |
| `channel` | Show name | "Pluribus: The Official Podcast" |
| `slug` | URL-safe slug | "s1e3full-grenade" |
| `video_id` | Slug-based ID (NOT a YouTube ID) | "s1e3fullgrenade" |
| `url` | S3 mp4 URL | `http://unitedtribes-...s3.../media/videos/pluribus/s1e3full-grenade.mp4` |
| `artwork_url` | Apple Podcasts CDN image | `https://content.production.cdn.art19.com/...` |
| `duration` | Episode length | "45:12" |
| `description` | Synopsis (first 200 chars) | "Carol's world narrows as..." |
| `publish_date` | When published | "2025-12-15" |

**How it loads in the app:**
- Line ~24289: `import("./data/podcast-registry.json")`
- State: `podcastRegistry`
- Passed to LibraryScreen as prop

### 2. Audio/Video Files (S3)

**Base path:** `s3://unitedtribes-visualizations-1758769416/media/videos/`

| Universe | Files | Path |
|----------|-------|------|
| sinners | 8 .mp4 | `media/videos/sinners/{slug}.mp4` |
| greta-gerwig | 20 .mp4 | `media/videos/greta-gerwig/{slug}.mp4` |
| pluribus | 19 .mp4 | `media/videos/pluribus/{slug}.mp4` |

**Direct URL pattern:**
```
http://unitedtribes-visualizations-1758769416.s3-website-us-east-1.amazonaws.com/media/videos/{universe}/{slug}.mp4
```

### 3. Rich Metadata (Video Analysis Index)

**File:** `src/data/all-video-entity-index.json`

All 47 podcasts have matching entries. Match by title:
```js
const podcastMeta = Object.values(allVideoIndexes._all?.videos || {})
  .find(v => v.title?.toLowerCase() === podcast.title.toLowerCase());
```

**Each entry has:**
| Field | Description |
|-------|-------------|
| `title` | Episode title |
| `channel` | Show name |
| `host` | Host name (e.g., "Kim Masters") |
| `duration` | Episode length |
| `content_type` | "podcast", "interview" |
| `synopsis` | Full editorial description (rich, multi-paragraph) |
| `key_quotes` | Array of `{ quote, attribution, timestamp, timestamp_seconds }` |
| `themes` | Array of theme strings |
| `anecdotes` | Array of story highlights |
| `entities` | Array of `{ name, timestamp, description }` — people/works discussed |
| `entity_count` | Number of entities |
| `quote_count` | Number of quotes |

### 4. Transcripts

**Location:** Each podcast's analysis folder has `transcript.txt`

**Path:** `/Users/justin/bscrape/united-tribes-lean-back/data/video-analysis/all/{folder}/transcript.txt`

To find the folder for a podcast, match by slug:
```bash
ls data/video-analysis/all/ | grep -i "grenade"
# → s1e3full_grenade/ or similar
```

Each folder contains:
- `transcript.txt` — full transcript
- `analysis.md` — editorial analysis (themes, quotes, entities)
- `metadata.json` — episode metadata (artwork_url, duration, etc.)

**Note:** Transcripts are NOT on S3 or in the POC data files. They're in the local harvester repo only. If you need them in the POC, they'd need to be bundled or uploaded to S3.

### 5. Artwork

All 47 podcasts have `artwork_url` in the podcast registry. These are show-level artwork (not episode-specific):

| Show | Artwork Source |
|------|---------------|
| Pluribus: The Official Podcast | Apple TV+ / Art19 CDN |
| Fresh Air | NPR CDN |
| The Business (KCRW) | Apple Podcasts CDN |
| WTF with Marc Maron | Apple Podcasts CDN |
| The Big Picture (The Ringer) | Megaphone CDN |
| IndieWire's Filmmaker Toolkit | Apple Podcasts CDN |
| Various others | Apple Podcasts / Megaphone CDN |

The artwork URLs are in `podcast-registry.json` under `artwork_url` for each entry.

### 6. How Podcasts Currently Work in the App

**Entity popover integration:**
- Line ~24572: `podcastsByEntity` map built from registry by universe
- Line ~7649: `getPopoverMedia()` merges podcast episodes into entity popover
- Clicking a podcast currently opens the UniversalModal with the slug as videoId — **this doesn't play** because there's no YouTube video at that ID

**What the podcast modal needs to do:**
1. Detect that the item is a podcast (slug-based videoId, or matched in registry)
2. Use an `<audio>` or `<video>` element pointing to the S3 mp4 URL instead of a YouTube embed
3. Display the artwork, synopsis, quotes, entities from the video analysis index
4. Show transcript if available

### 7. Quick Reference: Finding Data for Any Podcast

Given a podcast title like "S1E3Full:Grenade":

```js
// 1. Registry entry (artwork, S3 URL, duration)
const regEntry = podcastRegistry.by_universe.pluribus
  .find(p => p.title === "S1E3Full:Grenade");
// → regEntry.url (S3 mp4), regEntry.artwork_url, regEntry.duration

// 2. Rich metadata (synopsis, quotes, entities, themes)
const meta = Object.values(allVideoIndexes._all.videos)
  .find(v => v.title === "S1E3Full:Grenade");
// → meta.synopsis, meta.key_quotes, meta.entities, meta.themes

// 3. Transcript (local only)
// data/video-analysis/all/*grenade*/transcript.txt
```

### 8. Known Issues

- **Console 404s for podcast thumbnails in My Stuff**: Items saved before the artwork fix have bad YouTube URLs in localStorage. The display is correct (podcast artwork shows), but stale `item.thumbnail` URLs still 404 in the console. Fix: re-add the item or clear localStorage for that entry.
- **Podcast playback doesn't work**: Clicking a podcast opens the UniversalModal which tries to embed a YouTube video using the slug — fails. Needs the podcast modal with S3 mp4 player.
- **Transcripts not in POC**: Only in local harvester repo. Need to be uploaded to S3 or bundled if the modal wants to display them.
