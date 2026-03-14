# Email to JD — Blue Note Universe Build (March 11, 2026)

---

**Subject:** Blue Note Universe is live on feature branch — full screen wiring + universe expansion guide

---

Hey JD,

I've got a feature build ready for Blue Note that takes it from "data loads + nav labels work" to "fully functional second universe." Everything is on `justin/mar-11-dev` and there's a PR up against main. Here's the breakdown.

---

## What's in the build

### 1. Constellation / Artist Network — Full graph+drawer layout

Blue Note's "Artist Network" tab now has the same graph+drawer split layout as the Pluribus "J.D.'s Universe" tab. All 51 entities render in the force-directed graph with proper hub-and-spoke structure:

- **Center node**: "Blue Note Records" (size 24)
- **Key Artists hub**: Art Blakey, Miles Davis, John Coltrane, Herbie Hancock, Thelonious Monk, Wayne Shorter, Charlie Parker (size 18)
- **Other artists**: 18 artists at size 11 (Horace Silver, Lee Morgan, Cannonball Adderley, etc.)
- **Label figures**: Alfred Lion, Francis Wolff, Rudy Van Gelder, Reid Miles, Bruce Lundvall, Don Was (size 11)
- **Movements**: 7 jazz movements (Hard Bop, Bebop, Free Jazz, etc.) at size 12
- **Themes**: 6 editorial themes at size 12

The drawer directory has filter tabs (Artists / Label / Movements / Themes) with universe-aware labels — "Blue Note Directory" instead of "Pluribus Directory", "Key Artists" instead of "Lead Cast", "Behind the Label" instead of "Creators & Key Crew", etc.

The theme nodes come from editorial data (not themeVideos like Pluribus) — I added an `editorialThemes` fallback path in `adapters.js` so the graph builder handles this cleanly.

### 2. Artist detail pages — 5 new content sections

Previously, clicking an artist from Artists & Legends only showed the hero + bio + follow-up chips. Now every artist page renders up to 5 additional sections depending on what data they have:

- **Featured Videos** (red accent) — YouTube video tiles from quickViewGroups, opens in video modal
- **Featured Tracks** (green accent) — Spotify track cards with play buttons that open Spotify
- **Discography** (purple accent) — Albums/recordings from completeWorks
- **Collaborators** (blue accent) — 2-column grid with photos, clickable to navigate between artists
- **Articles & Press** (green accent) — Interviews and articles combined

The 7 core artists (Art Blakey, Miles Davis, etc.) get all 5 sections. The 18 standard artists (Horace Silver, Lee Morgan, etc.) get discography + collaborators + articles. The 6 label figures get videos + collaborators. Genre/concept entities (Hard Bop, Modal Jazz) show bio only, which is appropriate.

### 3. Editorial themes in the visualization

6 Blue Note themes render as nodes in the graph with proper colors and cross-connections via `relatedThemes`. These are injected from `bluenote-editorial.json` through a `useMemo` pattern that wraps the raw response data — this ensures the data survives HMR reloads during development (a gotcha I ran into where one-shot injection in the loader callback was lost on hot reload).

### 4. No Pluribus regressions

Every single change is gated on `selectedUniverse === "bluenote"` or `isBluenoteUniverse`. Switching back to Pluribus shows everything exactly as before. Zero changes to Pluribus behavior.

---

## How to pull it down and check it out

```bash
cd unitedtribes_universes_poc
git fetch origin
git checkout justin/mar-11-dev
npm install   # shouldn't need it, but just in case
npm run dev
```

Then in the browser:
1. Click the universe selector (top nav) → switch to **Blue Note**
2. Go to **Universe & Map** → you should see the full graph with 51 nodes + the directory drawer
3. Go to **Artists & Legends** → click **Art Blakey** → you should see videos, tracks, discography, collaborators, articles
4. Click **Horace Silver** → discography, collaborators, articles (no videos/tracks — his quickViewGroups is empty)
5. Click **Hard Bop** → bio only (genre concept)
6. Switch back to **Pluribus** → everything unchanged

The build also compiles clean: `npm run build` passes with no errors.

---

## Universe Expansion Guide

I wrote a comprehensive guide at **`docs/universe-expansion-guide.md`** that documents everything we learned wiring Blue Note. It covers:

- **Required data files** — the 3 JSON files each universe needs, their exact structure, and what happens when fields are missing
- **Screen-by-screen wiring checklist** — every touchpoint in every screen with line numbers and what to gate
- **The responseData injection pattern** — why useMemo beats one-shot injection, with code examples
- **Entity richness tiers** — what makes pages feel "rich" vs "sparse" and the minimum viable entity
- **10 documented gotchas** with prevention strategies (things like cast detail view ≠ EntityDetailScreen, HMR losing injected data, actorCharacterMap being empty for non-show universes)
- **Step-by-step process** for adding the next universe
- **Recommended priority order** — Patti Smith first (follows Blue Note blueprint), then Lady Bird and Sinners (film-focused, establish single-film patterns)

This should save significant time when we tackle the next universe.

---

## Things that will help with universal interface functions

Here are the key patterns and abstractions that came out of this work that are relevant for building universe-agnostic components:

### Pattern 1: Universe-aware constants via keyed objects

The cleanest pattern we found is a keyed object by universe ID:

```js
const CONSTELLATION_TABS_BY_UNIVERSE = {
  pluribus: [
    { id: "universe", label: "Universe Network" },
    { id: "jd-universe", label: "J.D.'s Universe" },
    { id: "themes", label: "Themes Network" },
  ],
  bluenote: [
    { id: "universe", label: "Artist Network" },
    { id: "themes", label: "Themes Network" },
  ],
};
const activeTabs = CONSTELLATION_TABS_BY_UNIVERSE[selectedUniverse] || defaultTabs;
```

This pattern is used for: tab lists, filter tabs, drawer section labels, nav labels, discovery group ID mappings, node sizing scales. It's much cleaner than `if/else` chains and scales naturally to more universes.

### Pattern 2: DISCOVERY_GROUP_IDS — the mapping layer

```js
const DISCOVERY_GROUP_IDS = {
  pluribus:  { cast: "cast", crew: "key_crew", influences: "key_influences", music: "featured_music" },
  bluenote:  { cast: "artists", crew: "label_figures", influences: "movements", music: "movements" },
};
```

This is the critical bridge between the abstract concept ("cast", "crew", "influences") and each universe's actual discovery group IDs in the response JSON. If you're building a universal component that needs to pull "the cast" or "the crew" for the current universe, it should reference this mapping rather than hardcoding group IDs.

### Pattern 3: Type-based gating (not name-based)

Pluribus distinguishes leads from supporting cast using names (`JD_PROMOTED_LEADS` array) and the actorCharacterMap. Blue Note has no actor→character concept — all artists are just artists. The universal pattern:

```js
// Instead of checking names against a hardcoded list:
const isLead = p.type === "KEY ARTIST" || p.type === "LEAD" || p.role === "Lead";
```

Entity `type` and `role` fields are more portable than name-based checks. If a universal function needs to determine "is this entity a lead/featured entity", it should look at `type` first.

### Pattern 4: Fallback chains for content sections

Not every universe has the same data shape. Blue Note has no `songs[]`, no `episodes[]`, no `themeVideos[]`, no `actorCharacterMap`. A universal rendering function should check for data existence before rendering:

```js
// Content that exists → render section
// Content that doesn't exist → don't render (not "show empty state")
{data.completeWorks?.length > 0 && <DiscographySection works={data.completeWorks} />}
{data.collaborators?.length > 0 && <CollaboratorsSection collabs={data.collaborators} />}
```

The sections we added to the cast detail view all follow this pattern — they only render when data exists, and they're completely self-contained (each is an IIFE that reads from `entities?.[selectedPerson]`).

### Pattern 5: The cast detail view vs EntityDetailScreen distinction

This is the biggest architectural thing to be aware of: **there are two completely separate places where entity detail content renders.**

1. **CastCrewScreen's inline `castDetail` sub-view** (~line 11700) — what you see when clicking a person from the Artists & Legends grid. Has its own hero, bio, follow-up chips, conversation thread, and now the 5 new content sections.

2. **EntityDetailScreen** (~line 15597) — a separate full screen (`SCREENS.ENTITY_DETAIL`). Has its own hero, bio, and full suite of sections (completeWorks, collaborators, themes, interviews, articles, sonic, mini constellation).

If you're building universal entity detail functions, they need to work in both contexts. The data is the same (`entities[name]`), but the render context is different — CastCrewScreen uses `F` and `C` for font/color variables, EntityDetailScreen uses `T` for theme.

### Pattern 6: Editorial data injection

Show/film universes (Pluribus, Lady Bird, Sinners) will have `themeVideos`, `episodes`/scenes, `songs` in their response data. Artist universes (Blue Note, Patti Smith) won't — they need editorial data injected separately. The pattern:

```js
const responseData = useMemo(() => {
  if (!rawResponseData) return null;
  if (selectedUniverse === "bluenote" && EDITORIAL_DATA) {
    return { ...rawResponseData, editorialThemes: EDITORIAL_DATA.themes };
  }
  return rawResponseData;
}, [rawResponseData, selectedUniverse]);
```

Any universal function that reads from `responseData` should handle both paths: rich show data AND editorial injections.

### Key data shape differences between universe types

| Data field | Show/Film (Pluribus, Lady Bird, Sinners) | Artist/Label (Blue Note, Patti Smith) |
|-----------|------------------------------------------|--------------------------------------|
| `episodes` | Episodes or scenes with themes, cast, music | Empty `[]` |
| `songs` | Needle drops / soundtrack by episode/scene | Empty `[]` |
| `themeVideos` | Character moments with timecodes | Empty `[]` (uses editorialThemes) |
| `actorCharacterMap` | Actor→character mappings | Empty `{}` |
| `discoveryGroups` | cast, key_crew, key_influences, featured_music | artists, label_figures, movements |
| Entity `type` values | LEAD, SUPPORTING, CREATOR, INFLUENCE | KEY ARTIST, Label Figure, MOVEMENT |

Building universal functions that work across these shapes means checking for data existence rather than assuming a shape, and using the `DISCOVERY_GROUP_IDS` mapping to find the right groups.

---

## What's next

The three universes we're enabling next are **Patti Smith**, **Lady Bird**, and **Sinners**.

**Patti Smith** is the natural next step — it's artist-focused like Blue Note, so the Blue Note blueprint applies directly. Same editorial data shape, same patterns for themes/eras/artist profiles, same empty `episodes`/`songs` handling.

**Lady Bird** and **Sinners** are film-focused, which means they'll have `actorCharacterMap` (actors playing characters) like Pluribus, but structured as single films rather than multi-episode series. The `episodes[]` array will be empty — we may want a "Scenes" or "Chapters" adaptation for the Movements screen. Most of the Pluribus cast/crew patterns will be reusable.

Shanan still needs to ingest the video analysis KG data for the non-Pluribus universes (582 JSONs on main in `harvester/data/video-analysis-kg-by-universe/`). That data feeds the entity relationships that make the graph visualization meaningful.

Let me know if you want to jump on a call to walk through any of this, or if you hit anything pulling it down.

— Justin
