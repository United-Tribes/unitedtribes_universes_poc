# Universe Expansion Guide — Lessons from Blue Note

> **Created:** March 11, 2026
> **Context:** After wiring Blue Note as the second universe in the UnitedTribes Universes POC, this document captures learnings, gotchas, and a repeatable process for adding future universes (Breaking Bad, Patti Smith, Greta Gerwig, Bob Dylan, Sinners, etc.).

---

## The Big Picture

Adding a universe requires **three layers** of work:

1. **Data Layer** — JSON files that feed the app (universe entities, response/discovery groups, editorial content)
2. **Wiring Layer** — Gating existing screens to show the right data per universe
3. **Content Layer** — Making sure entity detail pages are rich enough to feel complete

Blue Note taught us that **the wiring is the hard part**, not the data. The app was built around Pluribus-specific constants, component names, and assumptions. Each screen has its own set of hardcoded references that need to be made universe-aware.

---

## Required Data Files (3 per universe)

Each universe needs three JSON files in `src/data/`:

### 1. `{universe}-universe.json`
**What:** Keyed object of all entities with full detail (bio, quickViewGroups, completeWorks, collaborators, sonic, interviews, articles, graphNodes, graphEdges).

**Structure:**
```json
{
  "Entity Name": {
    "type": "artist|person|show|movement|concept",
    "emoji": "🎵",
    "badge": "Verified Entity",
    "subtitle": "Music Artist · hard bop, jazz",
    "stats": [...],
    "tags": ["tag1", "tag2"],
    "avatarGradient": "linear-gradient(...)",
    "photoUrl": "https://...",
    "bio": ["Paragraph 1", "Paragraph 2"],
    "quickViewGroups": [
      { "label": "Videos", "items": [{ "title": "...", "video_id": "...", "meta": "...", "thumbnail": "..." }] },
      { "label": "Music", "items": [{ "title": "...", "spotify_url": "https://...", "meta": "..." }] }
    ],
    "completeWorks": [{ "type": "ALBUM", "title": "...", "role": "...", "meta": "...", "icon": "🎵" }],
    "collaborators": [{ "name": "...", "role": "...", "photoUrl": "..." }],
    "sonic": [...],
    "interviews": [...],
    "articles": [...],
    "graphNodes": [...],
    "graphEdges": [...]
  }
}
```

**Gotcha — quickViewGroups is critical:** Entities without `quickViewGroups` (Videos/Music items) will show no featured media on their detail pages. The 7 "core" Blue Note artists had these; the other 18 artists didn't. Make sure at least tier-1 entities have YouTube video IDs and Spotify track URLs in their quickViewGroups.

**Gotcha — collaborators data drives the Collaborators section:** Every Blue Note artist had exactly 8 collaborators, which made the 2-column grid look good. If an entity has 1-2 collaborators, consider whether the section should render differently.

### 2. `{universe}-response.json`
**What:** Discovery groups, actor/character mappings, episode data, song data, theme videos.

**Key structure:**
```json
{
  "discoveryGroups": [
    {
      "id": "artists",           // ← must match DISCOVERY_GROUP_IDS mapping
      "title": "Key Artists",
      "cards": [{ "title": "Art Blakey", "name": "Art Blakey", "type": "KEY ARTIST", ... }]
    },
    {
      "id": "label_figures",     // ← must match DISCOVERY_GROUP_IDS.crew mapping
      "cards": [...]
    },
    {
      "id": "movements",         // ← must match DISCOVERY_GROUP_IDS.influences mapping
      "cards": [...]
    }
  ],
  "actorCharacterMap": {},
  "episodes": [],
  "songs": [],
  "themeVideos": []
}
```

**Critical gotcha — DISCOVERY_GROUP_IDS:** Each universe must have its group IDs registered in the `DISCOVERY_GROUP_IDS` constant (around line 787 of App.jsx). The keys are `cast`, `crew`, `influences`, `music` and the values must match the `id` field of the discovery groups in the response JSON. Getting this wrong causes the constellation drawer to show the wrong data or empty sections.

**Gotcha — actorCharacterMap:** Pluribus maps actors to characters (e.g., "Rhea Seehorn" → "Carol Sturka"). Blue Note has no actor/character concept, so this is empty `{}`. For a show universe like Breaking Bad, this will be critical. When empty, the cast detail view needs to bypass the actorCharMap filtering — see `isBluenoteUniverse ? jdCastCards : [filtered list]` pattern.

### 3. `{universe}-editorial.json`
**What:** Hand-curated editorial content — themes, artist profiles, label profiles, eras, essential tracks.

**This file is optional but highly recommended.** Without it, the Themes screen will be empty and the constellation drawer won't have rich descriptions for people.

**Structure:**
```json
{
  "BLUENOTE_THEMES_DB": [
    {
      "id": "theme-slug",
      "title": "Theme Title",
      "color": "#hex",
      "shortDesc": "One-liner",
      "fullDesc": "Full paragraph...",
      "relatedThemes": ["other-theme-slug"],
      "relatedEntities": ["Entity Name"]
    }
  ],
  "BLUENOTE_ARTIST_PROFILES": {
    "Artist Name": {
      "role": "Drummer & Bandleader",
      "era": "1947–1990",
      "signature": "Quote or tagline",
      "pullQuote": "Full quote from artist"
    }
  },
  "BLUENOTE_LABEL_PROFILES": {
    "Person Name": {
      "role": "Co-Founder & Producer",
      "era": "1939–1967",
      "contribution": "What they did"
    }
  }
}
```

---

## Screen-by-Screen Wiring Checklist

### Screen 1: Constellation / Universe Map (~line 6786)

This is the most complex screen to wire. Key touch points:

| What | Where | What to do |
|------|-------|------------|
| `CONSTELLATION_TABS_BY_UNIVERSE` | ~line 7258 | Add universe-specific tabs (no "J.D.'s Universe" for non-Pluribus) |
| `CONSTELLATION_FILTER_TABS` | ~line 7266 | Add universe-specific filter tabs |
| `DISCOVERY_GROUP_IDS` | ~line 787 | Map `cast`, `crew`, `influences`, `music` to response group IDs |
| `jdConfirmedCast` | ~line 7024 | Bypass actorCharMap for non-actor universes |
| `jdDrawerLeads` / `jdDrawerCast` | ~line 7164 | Gate on entity `type` field (KEY ARTIST vs LEAD) |
| `jdNodeSizeScale` | ~line 7067 | Custom node sizing per universe |
| `jdCastNodeIds` | ~line 7056 | Use cast card names (not actorCharMap keys) for non-actor universes |
| `jdThemeCards` | ~line 6999 | Build from editorial themes if themeVideos is empty |
| `buildPersonEntry` | ~line 7645 | Use universe-specific profiles for descriptions |
| Drawer headers/labels | ~line 7711+ | Gate section labels per universe |
| Universe tab rendering | ~line 8006 | Enable graph+drawer layout for the new universe |
| Drawer close effect | ~line 6811 | Keep drawer open on `universe` tab for the new universe |

**Major gotcha — the "universe" tab vs "jd-universe" tab:** Pluribus uses a dedicated "jd-universe" tab for its rich graph+drawer layout. Blue Note reuses the "universe" tab itself. This required gating the drawer close effect and the tab content rendering. Future universes should follow the Blue Note pattern (reuse "universe" tab).

**Major gotcha — editorial themes injection:** The graph builder in `adapters.js` relies on `responseData.themeVideos` for theme nodes. Blue Note has no themeVideos, so we added `editorialThemes` support in the adapter. This is injected via a `useMemo` that wraps `rawResponseData`. New universes with editorial themes should follow this same pattern.

### Screen 2: CastCrewScreen / Artists & Legends (~line 10401)

| What | Where | What to do |
|------|-------|------------|
| `CREATOR_PROFILES` / `CAST_PROFILES` | ~line 10065 | Add universe-specific profiles or gate |
| Cast detail bio prompts | ~line 11247 | Verify bio prompts are universe-aware |
| Follow-up chip generation | ~line 11270 | `buildDetailFallbackChips` is already universe-aware |
| Dual spotlight (Vince/Rhea) | ~line varies | Gate on `selectedUniverse === "pluribus"` |
| Explore path chips | same | Gate on Pluribus |
| Lobby intro text | ~line 13208 | Add universe-specific intro copy |
| Section headers | various | Gate "The Cast" → universe-specific label |
| Two Paths content | ~line 11854 | Gate on Pluribus (Rhea path / Carol path) |

**Gotcha — cast detail sections are separate from EntityDetailScreen:** The "Artists & Legends" screen renders its own inline detail view (`castDetail` sub-view) which is completely separate from `EntityDetailScreen`. Content sections (videos, tracks, discography, collaborators, articles) must be added to BOTH places. We initially only added them to EntityDetailScreen and wondered why they didn't show up.

### Screen 3: ThemesScreen (~line 8225)

| What | Where | What to do |
|------|-------|------------|
| `THEMES_DB` | ~line 8225 | Add universe-specific themes or gate |
| `PATHWAYS` | same area | Add universe-specific pathways |
| Theme intro text | various | Gate per universe |
| `CHARACTER_THEME_MAP` / `ENTITY_THEME_MAP` | various | Gate on Pluribus, use editorial for others |
| `CONSTELLATION_LAYOUT` | various | Add universe layout or hide for new universe |

### Screen 4: SonicLayerScreen / The Sound (~line 9207)

| What | Where | What to do |
|------|-------|------------|
| Songs data | ~line 9207 | Gate on `songs.length > 0` vs editorial content |
| Dave Porter spotlight | various | Gate on Pluribus |
| Episode grouping | various | Gate on Pluribus |

**Gotcha — empty response data:** Blue Note's `songs[]` and `episodes[]` are empty in its response data. The screen falls back to an empty state without explicit handling. Future universes should render alternative content when these arrays are empty.

### Screen 5: EpisodesScreen / Movements (~line 14639)

| What | Where | What to do |
|------|-------|------------|
| `EPISODE_ARCS` | ~line varies | Gate on Pluribus |
| Episode rendering | various | Show alternative (eras/movements) when episodes is empty |

---

## The `responseData` Injection Pattern

**Problem:** Some data needs to be injected into `responseData` that wasn't in the original JSON (like editorial themes).

**Solution:** Use a `useMemo` wrapper:

```js
const [rawResponseData, setRawResponseData] = useState(null);

const responseData = useMemo(() => {
  if (!rawResponseData) return null;
  if (selectedUniverse === "newuniverse" && EDITORIAL_THEMES) {
    return { ...rawResponseData, editorialThemes: EDITORIAL_THEMES };
  }
  return rawResponseData;
}, [rawResponseData, selectedUniverse]);
```

**Why not inject in the loader callback?** HMR during development reloads component code without re-running useEffects. If you inject data in the loader's `.then()`, the injection is lost on HMR reload. The `useMemo` approach ensures the data is always present.

---

## The `adapters.js` Graph Builder

The graph builder (`buildUniverseGraphFromAssembled`) in `adapters.js` creates the hub-and-spoke network visualization. Key things it needs from response data:

- `discoveryGroups` — creates hub nodes (Cast, Crew, Influences, Music, Themes) and spoke nodes
- `themeVideos` OR `editorialThemes` — creates theme spoke nodes
- Entity data — used for node metadata

**Gotcha — theme nodes require explicit support:** The adapter originally only supported `themeVideos` (Pluribus pattern). We added `editorialThemes` as a fallback path. This pattern (check for rich data first, fall back to editorial) should be used for future content types too.

**Gotcha — THEME_RELATIONS:** The adapter has a hardcoded `THEME_RELATIONS` array connecting Pluribus themes. This is gated with `if (!useEditorialThemes)`. Editorial themes use their own `relatedThemes` field instead.

---

## Entity Detail Page Richness Tiers

Not all entities need the same depth. Based on Blue Note:

| Tier | Count | What they have | Example |
|------|-------|----------------|---------|
| Core (T1) | 7 | Everything: videos, tracks, works, collabs, sonic, interviews, articles | Art Blakey, Miles Davis |
| Standard (T2) | 18 | Works, collabs, sonic, interviews (no videos/tracks in quickViewGroups) | Horace Silver, Lee Morgan |
| Label/Behind (T3) | 6 | Videos, collabs, interviews (no music tracks) | Alfred Lion, Rudy Van Gelder |
| Concept (T4) | 8 | Bio only | Hard Bop, Modal Jazz |
| Anchor (special) | 1 | Unique: collabs, articles, videos but no works/sonic | Blue Note Records |

**Key insight:** The harvester's `quickViewGroups` (YouTube videos + Spotify tracks) are what make entity pages feel "rich." For future universes, prioritize getting YouTube video IDs and Spotify URLs for at least the tier-1 entities during the harvest stage.

**Minimum viable entity:** An entity with only `bio` + `collaborators` (8 items) still renders a reasonable page thanks to the collaborators grid and the broker-generated bio. But it feels sparse. Aim for at least `completeWorks` + `collaborators` + one of (`interviews` or `articles`) for any entity that gets its own page.

---

## Step-by-Step Process for Adding a New Universe

### Phase 1: Data Preparation (Harvester)

1. **Run discovery:** `node discover.mjs {UniverseName}` — generates manifest with tiered entities
2. **Run harvest:** `node harvest.mjs {universe} --tier 1` then `--tier 2` — enriches with TMDB/YouTube/Spotify
3. **Run theme harvest (if applicable):** `node harvest-themes.mjs {universe}`
4. **Run assembly:** `node assemble.mjs {universe} --copy-to-poc` — generates the 3 JSON files
5. **Write editorial data (optional but recommended):** Create `{universe}-editorial.json` with themes, artist profiles, era descriptions
6. **Audit entity richness:** Run the check script (see below) to identify which entities need more data

```bash
# Audit script — check which entities have rich vs sparse pages
node -e '
const d = require("./src/data/{universe}-universe.json");
Object.keys(d).forEach(name => {
  const e = d[name];
  const vids = (e.quickViewGroups||[]).find(g=>g.label==="Videos")?.items?.length || 0;
  const mus = (e.quickViewGroups||[]).find(g=>g.label==="Music")?.items?.length || 0;
  const cw = (e.completeWorks||[]).length;
  const co = (e.collaborators||[]).length;
  const total = vids+mus+cw+co;
  if (total === 0) console.log("BIO ONLY:", name);
  else if (vids === 0 && mus === 0) console.log("NO MEDIA:", name, "works:", cw, "collabs:", co);
});
'
```

### Phase 2: App Wiring

1. **Add data loader** in the `universeLoaders` object (~line 16140):
   ```js
   newuniverse: () => Promise.all([
     import("./data/newuniverse-universe.json").then(m => m.default),
     import("./data/newuniverse-response.json").then(m => m.default),
   ]),
   ```

2. **Add static editorial import** (if editorial data exists):
   ```js
   import NEWUNIVERSE_EDITORIAL from "./data/newuniverse-editorial.json";
   ```

3. **Register in DISCOVERY_GROUP_IDS** (~line 787):
   ```js
   newuniverse: { cast: "cast_group_id", crew: "crew_group_id", influences: "influences_group_id", music: "music_group_id" },
   ```

4. **Add to UNIVERSE_NAV_LABELS** (if nav labels differ from defaults)

5. **Add to UNIVERSE_CONTEXT** (for bio prompt generation)

6. **Add to CONSTELLATION_TABS_BY_UNIVERSE** (~line 7258)

7. **Wire constellation screen:** Follow the Blue Note pattern — gate `jdConfirmedCast`, `jdDrawerLeads`/`jdDrawerCast`, `jdNodeSizeScale`, `jdCastNodeIds`, filter tabs, drawer labels, tab content

8. **Wire other screens:** Use the screen-by-screen checklist above

9. **Inject editorial themes** via `useMemo` if the universe has editorial themes but no `themeVideos`

### Phase 3: Testing

1. `npm run build` — must compile without errors
2. Switch to new universe — verify all 5 screens have content
3. Switch back to Pluribus — verify nothing broke
4. Check entity detail pages for tier-1, tier-2, and concept entities
5. Check console for errors
6. `cp src/App.jsx src/PluribusComps.jsx` — sync mirror

---

## Common Gotchas Summary

| # | Gotcha | Impact | Prevention |
|---|--------|--------|------------|
| 1 | Cast detail view ≠ EntityDetailScreen | Sections added to wrong component, not visible | Always check which component renders the current view |
| 2 | DISCOVERY_GROUP_IDS wrong mapping | Constellation drawer shows wrong/duplicate data | Cross-reference with response JSON group IDs |
| 3 | HMR doesn't re-run useEffect | Injected data lost on hot reload during dev | Use useMemo pattern, not one-shot injection in loader |
| 4 | actorCharacterMap empty | Cast filtering removes all entries | Bypass actorCharMap for non-show universes |
| 5 | Empty themeVideos | Theme nodes missing from graph | Add editorialThemes support in adapter |
| 6 | quickViewGroups empty | Entity pages feel bare | Prioritize video/track enrichment in harvester |
| 7 | Two Paths / Rhea Path / Carol Path | Pluribus-specific deep-dive content renders for other universes | Always gate with `selectedUniverse === "pluribus"` |
| 8 | Node sizing assumptions | Blue Note "center" node is label, not a person | Each universe needs custom jdNodeSizeScale |
| 9 | jdInfluenceCards duplicating cast | influences group mapping pointed to same group as cast | Ensure influences maps to a distinct group |
| 10 | Drawer labels hardcoded | "Lead Cast", "Creators" labels don't make sense for music | Gate all drawer section labels per universe |

---

## Recommended Universe Priority

Based on data readiness (video analysis KG data already on main):

1. **Breaking Bad** — Similar to Pluribus (show with cast/crew/episodes), most code reusable
2. **Patti Smith** — Artist-focused like Blue Note, can reuse Blue Note patterns
3. **Bob Dylan** — Artist-focused, same pattern as Patti Smith
4. **Greta Gerwig** — Film-focused, needs film-specific adaptations
5. **Sinners** — Film-focused, same pattern as Greta Gerwig

Breaking Bad would be the fastest to add since it's a show (like Pluribus) and most of the Pluribus-specific code would work with minimal gating. The artist-focused universes can follow the Blue Note blueprint.
