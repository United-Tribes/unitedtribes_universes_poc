# Citation & Source System — Restoration Notes

> **Date:** March 11, 2026
> **Branch:** `justin/mar-11-dev` (based on JD's `jd/design-reskin-v3` v1.5.7)
> **Commits:** `d074280`, `db21d40`
> **Context:** JD's selective merge from main into his design-reskin branch dropped several citation, source, and podcast features. These two commits restore them.

---

## What Was Restored

### 1. Source Generation in `prefetchKGRelationships()` (~line 9492)

The function that builds `_kgSources` (the structured source array that powers citations, the Sources panel, and SourcePopover) was significantly stripped down in JD's branch. Restored:

**Anchor entity always-include:** "Pluribus" is excluded from `sortedEntityNames` (to avoid hyperlinking every mention in text), but it has 150+ URL-bearing KG relationships that are the primary source of citable content. The original code always includes it when the query mentions "pluribus". Without this, most queries returned zero sources.

**Intent-based fallback:** When no entity names match the query at all (e.g. "what are the themes?"), the original code classifies the query intent using `QUERY_INTENTS` and injects topically relevant entities:
- MUSIC intent → Dave Porter, Thomas Golubic
- CREW intent → Vince Gilligan
- CAST intent → Rhea Seehorn
- Then "Pluribus" as general fallback

Without this, any query that doesn't contain a literal entity name produces zero sources.

**Editorial priority sorting:** Sources are sorted so analysis/discussion content appears first (and gets lower citation numbers), music listings last. Priority order: `quoted_in` → `analyzed_in` → `discussed_in` → `discusses` → `references` → `has_youtube_video` → `featured_in` → `connected_to` → `influenced` → `collaborated_with`.

**URL deduplication:** Two passes — once during collection (per-entity, capped at 15 unique URLs), once after all entities are processed. This ensures citation numbers `[1]`, `[2]`, `[3]` map cleanly to source items with no gaps.

**YouTube videos as sources:** JD's branch added `has_youtube_video` to the noise filter, removing all YouTube videos from sources. Restored: YouTube videos are valid sources (they're often the most useful — interviews, analysis videos, behind-the-scenes content).

### 2. SourcesSection Rendering in ResponseScreen (~line 6263, 6298)

JD's branch had `{/* Sources are now cited inline via [N] superscripts — no separate panel */}` — the SourcesSection component existed but was never rendered. Restored:

**After main narrative:**
```jsx
{useLive && <SourcesSection sources={brokerResponse?._kgSources} onPodcastPlay={onPodcastPlay} />}
```

**After each follow-up response:**
```jsx
{!fu.pending && !fu.error && <SourcesSection sources={fu.response?._kgSources} onPodcastPlay={onPodcastPlay} />}
```

### 3. onPodcastPlay Prop Wiring

`SourcesSection` accepts an `onPodcastPlay` callback for podcast sources. This was restored in:

- **SourcesSection function signature** (~line 5853): `function SourcesSection({ sources, onPodcastPlay })`
- **Source item rendering** (~line 5921): Conditional `<div>` (podcast, with onClick) vs `<a>` (link, with href) — podcast sources get gold badges and a play icon
- **ResponseScreen signature** (~line 5999): `onPodcastPlay` prop added
- **App() render of ResponseScreen** (~line 16352): `onPodcastPlay` callback that opens `setPodcastModal`

### 4. Podcast Registry Data File

`src/data/podcast-registry.json` (40KB) was missing from JD's selective merge. This is the registry of 47 S3-hosted audio files (19 Pluribus-specific). All the podcast UI code (PopoverPodcastCard, VideoModal audio mode, SourcePopover podcast detection) was already on JD's branch — it just had no data to work with.

---

## How It All Connects — Data Flow

```
User submits query
    ↓
ThinkingScreen calls prefetchKGRelationships(query, ...)
    ↓
Matches entity names in query → fetches KG relationships for each
    ↓
Builds sources array: { entityName, type, evidence, title, url, timestamp, channel }
    ↓
Attaches as _kgSources to broker response: { ...apiData, _kgSources }
    ↓
handleBrokerComplete() → augmentSourcesWithPodcasts() → setBrokerResponse()
    ↓
ResponseScreen receives brokerResponse._kgSources
    ↓
Three consumers:
  1. NarrativeSection/ResponseHeader: linkCitationsFn converts [N] → CitationLink badges
  2. SourcesSection: renders the source panel below narrative
  3. SourcePopover: detailed popover when user clicks a citation or source item
```

### Citation Flow Specifically

1. **LLM generates `[N]` markers** in its narrative text (because `buildKGContext()` includes numbered sources in the prompt)
2. **`linkCitations()`** (two-pass algorithm, ~line 5782):
   - Pass 1: splits text on `[N]` patterns, replaces with `<CitationLink>` if `sources[N-1]` exists, drops if not
   - Pass 2: finds source titles mentioned in text, makes them clickable links
3. **`CitationLink`** renders as a blue superscript badge — clicking opens `SourcePopover`
4. **Guard condition:** `NarrativeSection` and `ResponseHeader` only call `linkCitationsFn` when `kgSources?.length > 0`. If sources are empty, `[N]` stays as plain text (this is why the anchor-entity fix was critical)

### Podcast Flow Specifically

1. **Registry loaded** on mount via dynamic import (~line 15920)
2. **`podcastsByEntity`** (useMemo, ~line 15924): maps entity names → matching podcast entries
   - Bonus episodes: parsed from title pattern `S1E3Bonus:Miriam Shor` → "Miriam Shor"
   - Standalone interviews: matches `sortedEntityNames` against title text
3. **`podcastsByEpisode`** (useMemo, ~line 15950): maps episode numbers → `{ full, bonus }` entries
4. **EntityPopover** receives `podcasts={podcastsByEntity[popoverEntity]}` → `getPopoverMedia()` includes them → renders `PopoverPodcastCard`
5. **Clicking a podcast** → `onPodcastPlay` → `setPodcastModal` → `VideoModal` with `podcastUrl` → HTML5 `<audio>` player
6. **`augmentSourcesWithPodcasts()`** (~line 16157): after broker response, injects matching podcast entries into `_kgSources` so they appear in SourcesSection

---

## How to Test

### Citations
1. Run `npm run dev` → open browser
2. Submit query: **"tell me about pluribus"**
3. **Expected:** Narrative text contains blue superscript citation badges like [1] [2] [3]
4. **Click a citation badge** → SourcePopover opens with source details (title, evidence, type badge)
5. **Console check:** Look for `[KG-rel] Pre-fetching for N entities:` and `[KG-rel] Result: N formatted contexts, N unique sources`

### Sources Panel
1. After query loads, **scroll below the narrative text**
2. **Expected:** "Sources" section with grouped source items (entity name headers, source cards with type badges)
3. Each source card shows: citation number, type badge (e.g. "quoted_in", "has_youtube_video"), title, evidence snippet
4. Clicking a non-podcast source → opens in new tab
5. Clicking a podcast source → opens audio modal

### Source Title Links in Text
1. If the LLM mentions a source title that's >= 10 characters AND matches a source in `_kgSources`, it becomes a clickable link in the narrative
2. These render as underlined text (not superscript badges)

### Follow-up Citations
1. After initial response, type a follow-up question
2. **Expected:** Follow-up response also has citation badges and its own Sources panel
3. Follow-up sources come from a fresh `prefetchKGRelationships()` call for the follow-up query

### Podcasts in Popovers
1. Click on entity **"Miriam Shor"** → popover should show a podcast card (waveform icon, "PODCAST" badge, gold accent)
2. Click on entity **"Rhea Seehorn"** → popover should show Fresh Air interview podcast card
3. Click the podcast card → audio modal opens with HTML5 player, plays .mp4 from S3
4. **Note:** Carol Sturka is a character, not a real person — no podcast expected

### Podcasts in Sources
1. Submit a query that mentions a cast member with podcast content
2. Sources panel may include podcast entries with gold badges and "▶" play icon
3. Clicking → opens audio modal (not external link)

### Edge Cases
- Query with no entity names (e.g. "what are the themes?") → should still get sources via intent fallback
- Query mentioning "pluribus" → should always get sources from anchor entity
- Empty/failed KG fetch → citations degrade gracefully (unresolved `[N]` markers are dropped, no Sources panel shown)

---

## How to Develop With This

### Adding New Source Types
To add a new source type (e.g. articles, books):
1. Ensure the KG relationship has a URL (check `getSourceUrl()` at ~line 9460)
2. The type will appear automatically in SourcesSection with a type badge
3. For special rendering (like podcasts), add detection logic in `SourcePopover` (~line 5638) and `SourcesSection` (~line 5921)

### Modifying Source Priority
Edit `SOURCE_PRIORITY` array in `prefetchKGRelationships()` (~line 9536). Items earlier in the array get lower citation numbers and appear first in the Sources panel.

### Controlling Source Count
- Per-entity cap: `seenUrls.size >= 15` (~line 9549)
- After dedup: no additional cap (all unique URLs kept)
- SourcesSection groups by entity, no display limit

### Adding Podcast Content
1. Upload .mp4 audio files to S3: `s3://unitedtribes-visualizations-1758769416/media/videos/{universe}/`
2. Update `src/data/podcast-registry.json` — add entries to `videos` object and `by_universe.{universe}` array
3. Entity matching is automatic via `podcastsByEntity` useMemo:
   - Bonus episodes: title must match `S1E{N}Bonus:{Guest Name}`
   - Standalone: entity name (from `sortedEntityNames`) must appear in title
   - Full episodes: mapped by episode number via slug pattern `s1e{N}full`

### NarrativeSection / ResponseHeader Components
These live in `src/components/content/` (not in App.jsx). They accept:
- `linkCitationsFn` — the `linkCitations` function
- `kgSources` — the `_kgSources` array
- Both guard with `kgSources?.length` before calling `linkCitationsFn`

If you're adding a new content rendering path, make sure to pass both props. Without `kgSources`, citations render as plain text.

### Key Functions Reference
| Function | Location | Purpose |
|----------|----------|---------|
| `prefetchKGRelationships()` | ~line 9475 | Fetches KG data, builds sources array |
| `buildKGContext()` | ~line 9583 | Injects sources into LLM prompt (numbered) |
| `linkCitations()` | ~line 5782 | Converts `[N]` markers → CitationLink components |
| `CitationLink` | ~line 5770 | Blue superscript badge component |
| `SourcesSection` | ~line 5853 | Source panel below narrative |
| `SourcePopover` | ~line 5601 | Detailed source popover on citation click |
| `getSourceUrl()` | ~line 9460 | Extracts URL from KG relationship |
| `augmentSourcesWithPodcasts()` | ~line 16157 | Injects podcast entries into sources |
| `getPopoverMedia()` | ~line 3851 | Collects videos + podcasts for entity popover |
| `VideoModal` | ~line 3673 | YouTube iframe OR HTML5 audio player |
| `PopoverPodcastCard` | ~line 3918 | Podcast card in entity popover |

### Debugging
- **No citations appearing:** Check browser console for `[KG-rel]` logs. If "0 unique sources" → entity matching or KG fetch failed.
- **Citations as plain text `[5]`:** `_kgSources` is empty or not attached to `brokerResponse`. Check `handleBrokerComplete` and that `apiResponseRef.current` includes `_kgSources`.
- **No Sources panel:** `SourcesSection` returns null when `sources?.length` is falsy. Verify `brokerResponse?._kgSources` in React DevTools.
- **Podcast not matching entity:** Check `podcastsByEntity` in React DevTools. Verify entity name appears in podcast title and is in `sortedEntityNames`.
