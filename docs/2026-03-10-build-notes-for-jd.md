# Build Notes for JD — March 10, 2026

## What's New

### 1. Podcast Audio Playback (S3 Registry Integration)

Shanan uploaded 47 audio podcasts to S3 with a registry file. 19 are Pluribus-specific: 9 full official podcast episodes (one per episode), 8 bonus cast/crew interviews, and 2 standalone interviews (Rhea Seehorn on Fresh Air, Vince Gilligan on The Business).

**Where you'll see it:**

- **Entity Popovers** — Click on an entity that has a matching podcast (e.g., Miriam Shor, Rhea Seehorn, Vince Gilligan) and you'll see a new gold **podcast card** below any existing YouTube videos. The card has a waveform icon and "PODCAST" badge.

- **Audio Modal** — Click a podcast card and a new audio modal opens with an HTML5 audio player. It's narrower than the video modal (no video frame needed) with a gold waveform visualization. Audio plays directly from S3.

- **Source Citations** — When you ask a question about someone who has a matching podcast (e.g., "Tell me about Miriam Shor"), the podcast appears in the Sources section below the response with a gold "Podcast" badge. Click the play icon to open the audio modal.

- **Source Popover** — Click a podcast citation link and the source popover shows podcast artwork (waveform bars) + a gold "Listen to Podcast" button instead of "Watch on YouTube".

**Entity-to-podcast matching works automatically:**
- Bonus episodes: parsed from title (e.g., "S1E3Bonus:Miriam Shor" → matches "Miriam Shor" entity)
- Standalone interviews: fuzzy matched against entity names (e.g., "Star Of 'Pluribus' Rhea Seehorn" → matches "Rhea Seehorn")
- Full episodes: mapped to episode numbers for future episode detail integration

**Pluribus podcast entries (19 total):**
| Type | Count | Examples |
|------|-------|---------|
| Full podcast episodes | 9 | S1E1Full:We Is Us through S1E9Full:La Chica o El Mundo |
| Bonus interviews | 8 | Nito Larioza, Marshall Adams, Miriam Shor, Zetna Fuentes, Mark Hansen, Jennifer Bryan, Paul Donachie, The Sound Team |
| Standalone interviews | 2 | Rhea Seehorn (Fresh Air), Vince Gilligan (The Business) |

**Design details:**
- Gold accent color (`#f5b800`) for all podcast UI elements — consistent with brand
- Waveform bar visualization (navy background) instead of YouTube thumbnail
- "PODCAST" badge in gold vs "Video" badge in green
- Audio player uses CSS filter for dark-mode appearance on navy background

### 2. Video Analysis Pipeline — 582 Videos Across 7 Universes

Processed JD's full video analysis library (820 source directories) through the harvester pipeline, separated by universe. This is the correct pipeline flow: source files (analysis.md + metadata.json) → harvester → KG-compatible relationship JSONs.

**Output:** `harvester/data/video-analysis-kg-by-universe/`

| Universe | Videos Processed | Relationships Generated |
|----------|-----------------|------------------------|
| Pluribus | 131 | 8,435 |
| Sinners | 184 | 10,898 |
| Greta Gerwig | 107 | 5,976 |
| Blue Note | 96 | 4,770 |
| Patti Smith | 36 | 1,689 |
| Bob Dylan | 18 | 1,176 |
| Breaking Bad | 10 | 749 |
| **Total** | **582** | **~33,700** |

137 directories were excluded (Beatles, Tupac, Amy Winehouse, AC/DC, Joe Rogan, Baz Luhrmann, etc. — same exclusions Shanan applied). 101 previously-harvested baseline directories were also excluded (already in KG from January).

**KG Sync triggered:** `POST /v2/sync-harvester` — 21 new relationships added (41,643 total in KG). The video analysis JSONs for non-Pluribus universes are on main and ready for Shanan's multi-universe ingestion pipeline.

### 3. Data Refresh

Updated `pluribus-universe.json` and `pluribus-response.json` with latest assembled data.

## File Changes

**POC repo (`unitedtribes_universes_poc`):**
- `src/App.jsx` / `src/PluribusComps.jsx` — Podcast registry integration (~270 new lines)
- `src/data/podcast-registry.json` — New file, 47 podcast entries from S3 registry
- `src/data/pluribus-universe.json` — Data refresh
- `src/data/pluribus-response.json` — Data refresh

**Harvester repo (`united-tribes-lean-back`):**
- `harvester/data/video-analysis-kg-by-universe/` — 582 new JSON files across 7 universe subdirectories

## How to Test

1. `npm run dev` in the POC repo
2. Navigate to Pluribus universe
3. Click on **Miriam Shor** → popover shows her YouTube videos + a gold podcast card for "S1E3Bonus:Miriam Shor"
4. Click the podcast card → audio modal opens, plays the bonus interview from S3
5. Click on **Rhea Seehorn** → shows Fresh Air interview podcast + any bonus episodes
6. Click on **Vince Gilligan** → shows The Business interview podcast
7. Ask "Tell me about Miriam Shor" → Sources section should include the podcast with a gold badge and play button
8. Verify YouTube videos still work normally in popovers (Jenny McCarthy, Meredith Vieira videos for Miriam Shor should still appear)

## What's Next

- Shanan to ingest the multi-universe video analysis JSONs (`harvester/data/video-analysis-kg-by-universe/`) for Sinners, Greta Gerwig, Blue Note, Patti Smith, Bob Dylan, and Breaking Bad
- Episode Detail screen could show the full podcast episode + bonus interview for each episode (data is mapped via `podcastsByEpisode`)
- Deploy POC to S3 (`bash deploy.sh`)
