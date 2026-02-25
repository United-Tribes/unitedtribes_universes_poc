# Frontend Integration Notes — Broker API → UI Components

**Date**: 2026-02-25
**For**: Frontend colleague (paste this into Claude for context)
**Branch**: `dev/colleague`

---

## What's Ready

### 1. Content Rendering Components (`src/components/content/`)

Seven pre-built React components that render the broker API's `content` object. These are tested and ready to drop into the ResponseScreen.

| Component | Renders | Props |
|---|---|---|
| **ContentRenderer** | Orchestrator — reads `apiResponse.content.sections` and dispatches to child components | `apiResponse`, `onFollowUp`, `onEntityTap` |
| **ResponseHeader** | `content.headline` + `content.summary` | `headline`, `summary` |
| **NarrativeSection** | Paragraph text blocks | `text` |
| **MediaCallout** | YouTube embeds (with timestamp support), Spotify embeds, article links | `media_type`, `url`, `title`, `context`, `timestamp` |
| **ConnectionHighlight** | Tappable entity cards with relationship text | `entity`, `relationship`, `follow_up_query`, `image_url`, `onTap` |
| **NextQuestions** | Follow-up question pills | `questions[]`, `onSelect` |

**Usage:**
```jsx
import { ContentRenderer } from './components/content';

<ContentRenderer
  apiResponse={brokerResponse}
  onFollowUp={(query) => handleFollowUp(query)}
  onEntityTap={(entity) => navigateToEntity(entity)}
/>
```

**Test page:** Add `?test=content` to the dev server URL to see all components rendering with mock data.

### 2. Broker API Music Data (`connections.featured_music` + `connections.music_crew`)

The broker API now returns structured music data. See `BROKER_MUSIC_SPEC.md` for the full spec.

---

## Integration Plan — Two Separate Pipelines

The broker API response has two distinct data areas. They go to different parts of the UI:

```
POST /v2/broker response
├── content (narrative)          → ContentRenderer components (new)
│   ├── headline, summary        → ResponseHeader
│   ├── sections[]               → NarrativeSection / MediaCallout / ConnectionHighlight
│   └── next_questions[]         → NextQuestions
│
└── connections (structured)     → Existing App.jsx UI (wire in)
    ├── direct_connections[]     → Existing entity cards
    ├── influence_networks[]     → Existing influence display
    ├── featured_music[]         → Existing song tiles + NowPlayingBar
    └── music_crew[]             → Existing Sonic Layer composer section
```

### Pipeline 1: `content` → ContentRenderer (drop-in)

The `ContentRenderer` component consumes the entire `apiResponse` object. It reads `apiResponse.content` and falls back to `apiResponse.narrative` if `content` is missing.

**Where to integrate:** ResponseScreen, where the AI narrative currently renders. Replace the raw narrative text rendering with:

```jsx
<ContentRenderer
  apiResponse={brokerResponse}
  onFollowUp={(query) => handleQuerySubmit(query)}
  onEntityTap={(entityOrQuery) => {
    // Either navigate to entity detail or fire a follow-up query
  }}
/>
```

**Section types the API returns:**

| Type | Frequency | What It Looks Like |
|---|---|---|
| `narrative` | Every query (3-4 per response) | Paragraphs of AI-written text |
| `connection_highlight` | Every query (3-5 per response) | Entity name + relationship summary + follow-up query |
| `media_callout` | Some queries (0-5 per response) | YouTube video embeds with optional timestamps |

**Real example — "Tell me about Rhea Seehorn in Pluribus"** returns:
- 4 narrative sections
- 5 media_callout sections (YouTube interview clips)
- 5 connection_highlight sections (Emmy, Golden Globe, Vince Gilligan, etc.)

### Pipeline 2: `connections.featured_music` → Song Tiles (mapping required)

The existing app renders songs from static data in `pluribus-response.json`. The static song shape is:

```json
{
  "title": "Cogito",
  "artist": "Akusmi",
  "artColor": "linear-gradient(135deg, #2563eb, #1e40af)",
  "context": "Pluribus S1E3",
  "timestamp": "",
  "spotify_url": "https://open.spotify.com/track/2oWlkegK5DSCZBC5WJI2Wc",
  "video_id": "eud7a_TcnhI"
}
```

The API's `featured_music` shape is:

```json
{
  "title": "Cogito",
  "artist": "Akusmi",
  "episode": "S1E3",
  "episode_title": "",
  "context": "",
  "relationship_type": "music_featured_in",
  "confidence": 0.95
}
```

**Mapping:**

| Static field | API field | Notes |
|---|---|---|
| `title` | `title` | Direct match. **Caveat:** Some titles are truncated in the API — e.g. `"I"` instead of `"I'm Alright"` (Kenny Loggins), `"Nice "` instead of `"Nice 'n' Easy"` (Peggy Lee). Evidence parsing issue on API side. |
| `artist` | `artist` | Direct match |
| `context` | `episode` | Static uses `"Pluribus S1E3"`, API uses `"S1E3"`. Prepend show name if needed. |
| `artColor` | — | Not in API. Generate from artist name hash or assign per-episode gradient. |
| `spotify_url` | — | Not in API. The static data has these. Options: keep static as lookup table, or add to API later. |
| `video_id` | — | Not in API. Same as above. |
| — | `episode_title` | New field. Only populated on 1/35 songs currently (MARO & NASAYA → "The Gap"). |
| — | `confidence` | New field. Can use for sort ordering. |

**Recommendation:** For now, use the static `pluribus-response.json` songs as the primary source (they have `spotify_url` and `video_id` for playback). Use `featured_music` from the API to:
- Validate the song list matches
- Pick up any new songs not in static data
- Get `episode_title` when available
- Eventually replace static data once the API includes playback URLs

### Pipeline 3: `connections.music_crew` → Sonic Layer (mapping required)

The API returns:

```json
{
  "entity": "Dave Porter",
  "role": "composer",
  "evidence": "Original score composer for Pluribus, continuing collaboration from Breaking Bad and Better Call Saul",
  "confidence": 0.95
}
```

The Sonic Layer screen already shows Dave Porter as the composer. Wire `music_crew` in to:
- Confirm the composer/supervisor data dynamically
- Show the `evidence` text as a bio blurb

**Note:** The API currently returns BTR1 and Ricky Cook in `music_crew`. These are unresolved entities — filter them out on the frontend (the app already does this via `EXCLUDE_COMPOSERS`). API-side fix is pending.

---

## What the API Returns — Field-by-Field

Tested against 4 real queries on 2026-02-25:

```
Top-level keys:
  query            — echo of the input query
  status           — "completed"
  timestamp        — ISO datetime
  domain           — "music" | "television" | "technology" (auto-classified)
  narrative        — plain text narrative (fallback if content is empty)
  content          — structured content object (see below)
  connections      — structured relationship data (see below)
  recommendations  — suggested explorations
  insights         — processing metadata
  ai_analysis      — model info and intent classification
  metadata         — service version, processing time
```

### `content` object (→ ContentRenderer)

```
content.headline        — string, short title
content.summary         — string, 1-2 sentence summary
content.sections[]      — array of typed section objects:
  { type: "narrative", text: string }
  { type: "media_callout", media_type: "youtube"|"spotify"|"article", url: string, title: string, context: string, timestamp: number|null }
  { type: "connection_highlight", entity: string, relationship: string, follow_up_query: string }
content.next_questions[] — array of { text: string, reason: string }
```

### `connections` object (→ existing UI)

```
connections.direct_connections[]     — entity cards with top_connections
connections.influence_networks[]     — influence relationships
connections.collaborative_clusters[] — (usually empty)
connections.thematic_connections[]   — (usually empty)
connections.temporal_patterns[]      — (usually empty)
connections.featured_music[]         — 35 songs (when entity has music)
connections.music_crew[]             — composers + music supervisors
```

---

## Known Issues (as of 2026-02-25)

1. **Song title truncation** — Some `featured_music` titles are cut short by the evidence parser: `"I"` (Kenny Loggins), `"Nice "` (Peggy Lee), `"People Are Strange (from "` (Kit Sebastian), `"You"` (Judas Priest), `"It"` (R.E.M.). API-side fix needed.

2. **`episode_title` mostly empty** — Only 1/35 songs has `episode_title` populated. Evidence parsing regex needs tuning.

3. **`context` mostly empty** — Same issue. Only the MARO & NASAYA entry has context text.

4. **Dave Porter appears 3x in `music_crew`** — Once for Pluribus, once for Breaking Bad, once for Better Call Saul. Needs dedup or scoping to queried entity.

5. **BTR1 + Ricky Cook in `music_crew`** — Unresolved entities. Filter out on frontend via `EXCLUDE_COMPOSERS` (already in place for static data).

6. **No `spotify_url` or `video_id` in `featured_music`** — The API doesn't return playback URLs. Use static data for playback until this is added.

7. **Episode-only queries fail** — "Songs in Episode 7?" doesn't resolve to Pluribus without the show name in the query. Entity extraction limitation. Works fine with "Songs in Pluribus Episode 7?"

---

## File Locations

```
src/components/content/
├── index.js                 ← Barrel export (import { ContentRenderer } from './components/content')
├── ContentRenderer.jsx      ← Main orchestrator
├── ResponseHeader.jsx       ← Headline + summary
├── NarrativeSection.jsx     ← Text paragraphs
├── MediaCallout.jsx         ← YouTube/Spotify/article embeds
├── ConnectionHighlight.jsx  ← Entity cards
├── NextQuestions.jsx         ← Follow-up question pills
├── mockData.js              ← 4 mock responses for testing
└── TestPage.jsx             ← Dev test page (?test=content)

src/data/
├── pluribus-response.json   ← Static song data (34 songs with spotify_url + video_id)
└── pluribus-universe.json   ← Static entity data (56 entities)

BROKER_MUSIC_SPEC.md         ← API-side music extraction spec (implemented)
```
