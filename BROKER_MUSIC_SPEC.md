# Broker API — Music Extraction Spec

**Status**: Proposed
**Author**: Justin
**Date**: 2026-02-24

## Problem

When users ask about music in a show/movie, the broker API (`POST /v2/broker`) returns `direct_connections` (people) and `influence_networks` (influences) — but no songs.

The knowledge graph already has structured, typed relationships for music (`music_featured_in`, `composer`, `music_supervisor`). The broker's entity extraction pipeline ignores these relationship types.

## KG Data Already Available

These relationship types exist on the Pluribus entity right now:

| Relationship Type | Count | What It Contains |
|---|---|---|
| `music_featured_in` | 35 | Needle drops — song title, artist, episode, context |
| `composer` | 3 | Dave Porter (original score) |
| `music_supervisor` | 1 | Thomas Golubic |

**This is not Pluribus-specific.** Any show/movie entity with needle drops will have these same relationship types. The extraction logic should be universal.

## Relationship Object Structure

From `GET /entities/{name}`, each music relationship looks like:

```json
{
  "source_entity": "MARO & NASAYA",
  "target_entity": "Pluribus",
  "relationship_type": "music_featured_in",
  "confidence": 0.98,
  "evidence": "'Aquarius / Let the Sunshine In' (2025) by MARO & NASAYA featured in Pluribus Episode 7 'The Gap'..."
}
```

Key fields:
- `relationship_type` — the filter key (`music_featured_in`, `composer`, `music_supervisor`)
- `evidence` — contains parseable song title, artist, episode number, and episode title
- `confidence` — pass through to the response

## Proposed Response Schema

Add `featured_music` and `music_crew` to the `connections` object in the broker response:

```json
{
  "connections": {
    "direct_connections": [...],
    "influence_networks": [...],
    "featured_music": [
      {
        "title": "Aquarius / Let the Sunshine In",
        "artist": "MARO & NASAYA",
        "episode": "S1E7",
        "episode_title": "The Gap",
        "context": "Portuguese cover plays over end credits...",
        "relationship_type": "music_featured_in",
        "confidence": 0.98
      }
    ],
    "music_crew": [
      {
        "entity": "Dave Porter",
        "role": "composer",
        "evidence": "Original score composer for Pluribus"
      },
      {
        "entity": "Thomas Golubic",
        "role": "music_supervisor",
        "evidence": "Music supervisor for Pluribus"
      }
    ]
  }
}
```

### Field definitions

**`featured_music[]`** — Songs featured in the show/movie:
- `title` — Song title, parsed from evidence string
- `artist` — Artist/band name, parsed from evidence string
- `episode` — Episode code (e.g. `S1E7`), parsed from evidence string
- `episode_title` — Episode title (e.g. `"The Gap"`), parsed from evidence string
- `context` — How the song is used (from evidence, after episode info)
- `relationship_type` — Always `"music_featured_in"`
- `confidence` — Pass through from KG relationship

**`music_crew[]`** — Composers, music supervisors, etc.:
- `entity` — Person name
- `role` — `"composer"` or `"music_supervisor"`
- `evidence` — Pass through from KG relationship

## Extraction Logic

This should be universal — not hardcoded to Pluribus.

### Step 1: Query KG relationships

When resolving the source entity, also fetch its relationships filtered by music types:

```
relationship_type IN ('music_featured_in', 'composer', 'music_supervisor')
```

### Step 2: Parse evidence strings

For `music_featured_in` relationships, extract structured fields from the evidence string:

```
Regex: '(.+?)' (?:\(.+?\) )?by (.+?) featured in .+ Episode (\d+) '(.+?)'
```

This gives you:
- Group 1: Song title
- Group 2: Artist name
- Group 3: Episode number (convert to `S1E{n}` format)
- Group 4: Episode title

For `composer` and `music_supervisor`, pass the evidence string through as-is.

### Step 3: Group results

- `music_featured_in` relationships → `featured_music` array
- `composer` + `music_supervisor` relationships → `music_crew` array

### Step 4: Episode filtering

For episode-specific queries (e.g. "songs in episode 7"), filter `featured_music` by matching the episode code in the evidence string. `music_crew` is always included in full.

### Step 5: Always include

Include `featured_music` and `music_crew` for ALL queries against an entity that has them — not just music-intent queries. The frontend handles prioritization via its own `classifyQueryIntent()` function. Returning the data always means:
- Music queries get songs front and center
- Non-music queries still have the data available if the UI wants to show a "Music" tab

## Test Cases

| Query | Expected `featured_music` | Expected `music_crew` |
|---|---|---|
| "What music is in Pluribus?" | 35 songs | Dave Porter, Thomas Golubic |
| "Songs in Episode 7?" | ~10 songs (S1E7 only) | Dave Porter, Thomas Golubic |
| "Who created Pluribus?" | 35 songs (included, not prioritized) | Dave Porter, Thomas Golubic |
| "Music in Breaking Bad?" | BB songs (same extraction, different entity) | BB composer/supervisor |

## Why This Is Universal

- `music_featured_in` is a KG-wide relationship type, not Pluribus-specific
- Any show/movie entity with needle drops will have these relationships
- Blue Note universe (next to be added) is music-first — this extraction becomes critical there
- The frontend's `classifyQueryIntent()` already detects music queries across any universe
- No show-specific logic needed; the KG structure is consistent

## Verification

After implementation:
1. Test `POST /v2/broker` with `"What music is in Pluribus?"` — verify `featured_music` has 35 entries
2. Test with `"Songs in Episode 7?"` — verify episode filtering works
3. Test with `"Who created Pluribus?"` — verify `featured_music` is still present (not filtered by intent)
4. Test with a non-music entity — verify `featured_music` is empty array, not an error
