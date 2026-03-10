# Entity Linking — How-To Guide for Claude Code

> **Last updated:** Mar 10, 2026
> **File:** `src/App.jsx` (all functions live in the single file)

---

## What Entity Linking Does

Entity linking automatically detects entity names in plain text and turns them into interactive blue links. When the user clicks a linked entity, a popover card appears with the entity's type badge, description, photo, and an "Ask about..." button.

It handles three types of linkable items:
- **Entities** (87 total) — people, films, shows, books, concepts, places, characters
- **Episode titles** — link to Episode Detail screen via `_ep:` prefix
- **Song titles + artists** — link to inline playback popover via `_song:` prefix

---

## The Two Functions You Need

### 1. `linkEntities(text, entities, sortedEntityNames, onEntityClick, keyPrefix, entityAliases)`

Splits a plain text string into an array of strings and `<EntityTag>` JSX elements.

| Param | Type | What it is |
|-------|------|-----------|
| `text` | `string` | The plain text to scan for entity names |
| `entities` | `object` | The full entities object (from `pluribus-universe.json`) |
| `sortedEntityNames` | `string[]` | Entity names sorted longest-first (from `useMemo` in App) |
| `onEntityClick` | `function` | Click handler — use `onEntityPopover` (which is `openPopover` from App) |
| `keyPrefix` | `string` | Unique prefix for React keys (e.g. `"para-3-"`) — prevents key collisions |
| `entityAliases` | `object` | Short name → full entity key map (from `useMemo` in App) |

**Returns:** `Array<string | JSX.Element>` — can be rendered directly inside a `<p>` or `<span>`.

### 2. `linkCitations(fragments, sources, onOpenSource)`

Post-processes the output of `linkEntities` to handle citation markers and source title linking. Two passes:
- **Pass 1:** Resolves `[N]` citation markers to blue CitationLink badges. Drops orphaned citations silently.
- **Pass 2:** Matches source titles (≥10 chars) in text and makes them clickable underlined links.

| Param | Type | What it is |
|-------|------|-----------|
| `fragments` | `Array<string\|JSX>` | Output from `linkEntities()` (or plain text array) |
| `sources` | `Array<{title, url, channel?}>` | Source objects from broker response `_kgSources` |
| `onOpenSource` | `function` | Click handler for source links — use `onOpenSource` prop |

**Returns:** `Array<string | JSX.Element>`

---

## Basic Usage Pattern

The standard way to render linked text anywhere in the app:

```jsx
// Inside any screen component that receives these props:
// entities, sortedEntityNames, entityAliases, onEntityPopover, onOpenSource

// For plain narrative text (no citations):
<p>
  {linkEntities(
    "Vince Gilligan drew heavily from Village of the Damned and The Twilight Zone",
    entities,
    sortedEntityNames,
    onEntityPopover,
    "my-section-",      // unique key prefix
    entityAliases
  )}
</p>

// For broker response text WITH citations:
<p>
  {linkCitations(
    linkEntities(paragraphText, entities, sortedEntityNames, onEntityPopover, `para-${i}-`, entityAliases),
    response._kgSources,
    onOpenSource
  )}
</p>
```

**Always chain `linkEntities` first, then `linkCitations`** — the citation function expects an array of fragments (strings + JSX), which is what `linkEntities` returns.

---

## Full Real-World Example

Here's how follow-up responses render linked text (from ResponseScreen, ~line 5428):

```jsx
{fu.response.narrative.split(/\n\n+/).filter(p => p.trim()).map((para, i) => (
  <p key={i} style={{ margin: "0 0 14px" }}>
    {linkCitations(
      linkEntities(para, entities, sortedEntityNames, onEntityPopover, `fu-${fi}-${i}-`, entityAliases),
      fu.response?._kgSources,
      onOpenSource
    )}
  </p>
))}
```

Pattern: split narrative into paragraphs → map each → chain `linkEntities` + `linkCitations`.

---

## What Props Your Screen Needs

If you're building a new section or screen that should have entity linking, make sure it receives these props from App:

```jsx
// In the App() render section where screens are switched:
{screen === SCREENS.MY_SCREEN && <MyScreen
  entities={entities}                           // Full entity data object
  sortedEntityNames={sortedEntityNames}         // Longest-first name list
  entityAliases={entityAliases}                 // Short name → full key map
  onEntityPopover={openPopover}                 // Click handler for entity links
  onOpenSource={openSourcePopover}              // Click handler for source title links
  // ... other props
/>}
```

The popover itself is rendered at the App level (`<EntityPopover>` at ~line 11483) — you don't need to render it in your screen component. Just call `onEntityPopover(entityKey, clickEvent)` and the App-level popover handles the rest.

---

## How the Alias System Works

Entity names in `pluribus-universe.json` are exact keys like `"The Twilight Zone: The Monsters Are Due on Maple Street (S1E22)"`. Nobody types that in prose. The alias system creates short names that map to the full key:

| Pattern | Example | Alias created |
|---------|---------|--------------|
| **Colon-based** `Series: Title (code)` | `The Twilight Zone: Eye of the Beholder (S2E6)` | `Eye of the Beholder` → full key |
| **Year-based** `Title (Year)` | `Invasion of the Body Snatchers (1956)` | `Invasion of the Body Snatchers` → full key |
| **Comma-based** `Name, Qualifier` | `Albuquerque, New Mexico` | `Albuquerque` → full key |
| **Episode titles** | Episode "We Is Us" | `We Is Us` → `_ep:S1E1` |
| **Song titles** | Song "Crystal" by Fleetwood Mac | `Crystal` → `_song:5` |

The alias builder runs in a `useMemo` at ~line 10946 and only creates aliases when:
- Short name is ≥4 characters
- Short name isn't already a direct entity key
- Short name isn't in `COMMON_WORD_EXCLUDE` set

Matching is **case-insensitive** (`"gi"` regex flag) with **word boundaries** to prevent partial matches inside longer words.

---

## Guard Rails

### `ENTITY_LINK_EXCLUDE` (line ~10929)
Entities that should NEVER be linked, even if they exist in the data:
```js
const ENTITY_LINK_EXCLUDE = new Set(["BTR1", "Ricky Cook"]);
```

### `COMMON_WORD_EXCLUDE` (line ~10931)
Common English words that happen to match entity or song names. Prevents false positives like "her" linking to the film "Her":
```js
const COMMON_WORD_EXCLUDE = new Set(["her", "him", "his", "he", "she", ...]);
```

If you find a new false positive (a common word that keeps linking incorrectly), add it to `COMMON_WORD_EXCLUDE`.

### Longest-first matching
`sortedEntityNames` is sorted by string length descending. This ensures "The Twilight Zone: Eye of the Beholder" matches before "The Twilight Zone" — preventing partial matches from consuming the longer name.

---

## Special Entity Types

### Episode links (`_ep:` prefix)
When the user clicks an episode title link, `openPopover` (line ~11028) intercepts the `_ep:` prefix and navigates to `SCREENS.EPISODE_DETAIL` instead of showing a popover.

### Song links (`_song:` prefix)
Song entities have synthetic entity entries with `_songTitle`, `_songArtist`, `_videoId`, `_spotifyUrl` fields. The `EntityPopover` renders these as inline playback cards with YouTube/Spotify embeds.

### Concept entities (Hive Mind, The Joining, The Others)
These have type `"film"` in the type system (mapped via TYPE_MAP) but their descriptions are Pluribus-specific, hand-written in `manual-overrides.json`. They have no poster images — the popover shows the type badge + description only.

---

## Testing Entity Linking

1. **Dev server:** `npm run dev`
2. **Quick check:** Navigate to any screen with narrative text. Entity names should appear as blue underlined text.
3. **Click test:** Click a linked entity → popover should appear anchored to the clicked text.
4. **Alias test:** Type a query mentioning "Albuquerque" or "Village of the Damned" — should link even though the full entity key is longer.
5. **False positive check:** Common words like "her", "him", "the" should NOT be linked.
6. **Console debug:** `linkEntities` returns an array — you can `console.log()` it to see what it produces:
   ```js
   const result = linkEntities("Carol Sturka lives in Albuquerque", entities, sortedEntityNames, null, "", entityAliases);
   console.log(result);
   // → ["", <EntityTag>Carol Sturka</EntityTag>, " lives in ", <EntityTag>Albuquerque</EntityTag>, ""]
   ```

---

## Adding Entity Linking to a New Section — Checklist

1. Ensure your component receives: `entities`, `sortedEntityNames`, `entityAliases`, `onEntityPopover` (and `onOpenSource` if you have citations)
2. For any text string that might mention entities, wrap it:
   ```jsx
   {linkEntities(myText, entities, sortedEntityNames, onEntityPopover, "unique-prefix-", entityAliases)}
   ```
3. Use a **unique `keyPrefix`** per render location to avoid React key collisions (e.g. `"bio-"`, `"crew-detail-"`, `"theme-desc-3-"`)
4. If rendering broker API response text, chain with `linkCitations`:
   ```jsx
   {linkCitations(linkEntities(text, ...), sources, onOpenSource)}
   ```
5. The popover renders itself at App level — no extra component needed in your screen
6. Test by verifying entity names appear as blue links and clicking them opens the popover
