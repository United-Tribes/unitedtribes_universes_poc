# Universe Expansion v1.6.0 — Build Notes for JD

> **Branch:** `justin/universe-expansion-mar12`
> **Commit:** `a4f134b`
> **Date:** Mar 12, 2026
> **13 files changed, 60,959 insertions**

---

## What's New

The app now has **5 active universes** (up from 2). Three new universes — **Sinners**, **Patti Smith**, and **Greta Gerwig** — are fully wired with data, editorial content, and screen-level gating. All three can be launched from the home screen tiles and navigated through every screen.

### Data Summary

| Universe | Entities | Discovery Groups | Themes | Songs | Actor-Character Map |
|----------|----------|-----------------|--------|-------|-------------------|
| **Sinners** | 38 | 4 (Influences 13, Cast 10, Crew 8, Music 5) | 7 | — | 10 entries |
| **Patti Smith** | 63 | 5 (Artists 29, Collaborators 7, Movements 6, Music 8, Influences 32) | 6 | 30 | — (artist universe) |
| **Greta Gerwig** | 29 | 4 (Films 7, Cast 11, Crew 9, Soundtracks 2) | 6 | 20 | 11 entries |

**130 new entities** across the three universes, each with bios, images, videos, collaborators, and related themes sourced from the KG + TMDB + YouTube.

---

## How to Pull It Down

```bash
cd unitedtribes_universes_poc
git fetch origin
git checkout justin/universe-expansion-mar12
npm install
npm run dev
```

Then open `http://localhost:5173/jd-universes-poc/` and click any of the 5 universe tiles.

---

## New Files

```
src/data/sinners-universe.json      ← 38 enriched entities
src/data/sinners-response.json      ← discovery groups, actor-character map, songs
src/data/sinners-editorial.json     ← 7 themes, cast/crew profiles, Ryan Coogler creator profile
src/data/pattismith-universe.json   ← 63 enriched entities (incl. Chelsea Hotel)
src/data/pattismith-response.json   ← discovery groups, 30 songs
src/data/pattismith-editorial.json  ← 6 themes, 12 artist profiles, 4 detailed eras
src/data/gerwig-universe.json       ← 29 enriched entities
src/data/gerwig-response.json       ← discovery groups, actor-character map, 20 songs
src/data/gerwig-editorial.json      ← 6 themes, cast/crew profiles
public/images/manual/chelsea-hotel.jpg  ← Chelsea Hotel exterior photo
```

---

## Modified Files

### `src/App.jsx` (+ `PluribusComps.jsx` mirror)

~1,600 lines of changes across these areas:

1. **UNIVERSE_CONTEXT** — New entries for `pattismith`, `gerwig`, `sinners` with scoped descriptions, keywords, and suggested queries. The old `ladybird` ID was renamed to `gerwig` everywhere.

2. **Data loaders** — Dynamic imports for all 3 universe JSON pairs (universe + response).

3. **Editorial imports** — Static imports for all 3 editorial JSON files with destructured constants.

4. **UNIVERSE_NAV_LABELS** — Per-universe sidebar button labels:
   - Sinners: "Cast & Crew" / "The Soundtrack" / "Themes & Motifs"
   - Patti Smith: "Artists & Circle" / "The Music" / "Eras & Works"
   - Gerwig: "Cast & Crew" / "The Soundtrack" / "Films & Themes"

5. **UniverseSwitcher** — All 3 set to `available: true` with universe-specific dot colors.

6. **Screen gating** — Every screen has per-universe logic:
   - **ConstellationScreen**: Artist-scoped hub labels for Patti Smith ("Circle" / "Collaborators" instead of "Cast" / "Crew"). New `isArtistScoped` detection in `adapters.js`.
   - **CastCrewScreen**: Triple spotlight layout for Patti Smith (Patti Smith + Mapplethorpe + Chelsea Hotel). Label gating ("Key Collaborators" not "Key Crew", "Explore Collaborators / Influences" not "Explore Creators / Cast").
   - **SonicLayerScreen**: "The Discography / Key Tracks" for Patti Smith (not "Original Score / Needle Drops"). Non-clickable Discography card (no score/drops split).
   - **EpisodesScreen (Eras & Works)**: Enriched era cards with clickable Key Works and Key Figures pills. Pills navigate to entity detail pages via `onSelectEntity + onNavigate`.
   - **ThemesScreen**: Editorial themes injected per universe.

### `src/components/visualization/adapters.js`

New `isArtistScoped` logic for constellation graph labels. Detects artist-focused universes (Patti Smith, Bob Dylan) and uses appropriate terminology:
- Hub labels: "Circle" / "Collaborators" (not "Cast" / "Creators")
- Hub subtitles: "Artists & collaborators" / "Producers, labels & key crew"
- Edge labels: "COLLABORATED_WITH" (not "STARRED_IN")

---

## Universe-Specific Design Decisions

### Sinners (Film — Pluribus-like pattern)
- Uses `actorCharacterMap` like Pluribus (actors playing characters)
- Ryan Coogler creator profile in editorial JSON (timeline: Fruitvale Station → Creed → Black Panther → Wakanda Forever → Sinners)
- 7 editorial themes: Blues Origins, Vampirism as Metaphor, Black Identity in the Delta, Brotherhood, Music as Power, Violence & Redemption, Coogler's Filmmaking
- Cast: Michael B. Jordan, Miles Caton, Hailee Steinfeld, Wunmi Mosaku, Jack O'Connell

### Patti Smith (Artist — Blue Note-like pattern)
- **No actorCharacterMap** — this is an artist universe, not a film/show
- Triple spotlight lobby: Patti Smith (anchor) + Robert Mapplethorpe (soulmate) + Chelsea Hotel (residence)
- Chelsea Hotel is a fully enriched entity with photo, bio, 5 videos, 9 notable residents, 7 collaborator links
- All label language adapted: "Influences" not "Cast", "Collaborators" not "Crew"
- 4 detailed eras with clickable pills: Early NYC (1967–73), CBGB & Punk Era (1974–79), Detroit Years (1980–94), Return & Legacy (1995–present)
- 30 songs across the full discography (Horses through Banga)
- 12 artist profiles (Mapplethorpe, Lenny Kaye, Fred Smith, Tom Verlaine, Ginsberg, Shepard, Cale, Kral, Sohl, Springsteen, Rimbaud, Dylan)

### Greta Gerwig (Filmmaker — hybrid pattern)
- Uses `actorCharacterMap` (cast across multiple films)
- Renamed from `ladybird` to `gerwig` — multi-film scope covering Lady Bird, Little Women, Barbie, Frances Ha
- 6 editorial themes: Coming of Age, The Female Gaze, Literary Adaptation, Comedy & Pathos, Sacramento & Place, Creative Collaboration
- Cast: Saoirse Ronan, Florence Pugh, Margot Robbie, Timothée Chalamet, etc.
- 20 soundtrack tracks across her films

---

## Tips for Developing Against This

### Universe Type Detection

There are now three "kinds" of universe, and most screen gating checks for them:

```
Film/Show universe:  Pluribus, Sinners, Gerwig → has actorCharacterMap, uses "Cast"/"Crew" labels
Artist universe:     Patti Smith, Blue Note    → no actorCharacterMap, uses "Artists"/"Collaborators" labels
```

The main gating pattern in App.jsx is:
```js
const isBluenote = selectedUniverse === "bluenote";
const isPattismith = selectedUniverse === "pattismith";
const isSinners = selectedUniverse === "sinners";
const isGerwig = selectedUniverse === "gerwig";
```

For constellation graph labels, `adapters.js` uses regex: `isArtistScoped = /patti smith|bob dylan/i.test(entityName)`

### Adding Content to a Universe

**Entity detail pages**: Any entity in `{universe}-universe.json` gets a full detail page automatically. Add entities there (with bio, videos, collaborators, etc.) and they become navigable.

**Editorial themes**: Add themes to `{universe}-editorial.json` under `{UNIVERSE}_THEMES_DB`. They appear on the Themes screen automatically.

**Discovery groups**: These are in `{universe}-response.json` under `discoveryGroups`. Each group has a `groupId`, `title`, and array of entity `cards`.

**Songs**: Add to the `songs` array in `{universe}-response.json`. They appear on the Sonic Layer screen.

### Screen-Level Overrides

Each screen has gating logic that determines what renders per universe. To customize a screen for a specific universe:

1. Find the screen component in App.jsx (search for `Screen` — e.g., `CastCrewScreen`, `SonicLayerScreen`)
2. Look for existing gating patterns like `selectedUniverse === "pattismith" ?` or `isBluenote ?`
3. Add your own conditional using the same pattern

### Key Line Numbers (approximate — will shift with edits)

| Section | ~Line |
|---------|-------|
| BUILD_VERSION | 55 |
| UNIVERSE_CONTEXT | 82 |
| UNIVERSE_NAV_LABELS | 959 |
| UniverseSwitcher UNIVERSES array | 1531 |
| ConstellationScreen | 7100 |
| ThemesScreen | 8225 |
| SonicLayerScreen | 9207 |
| CastCrewScreen | 10401 |
| EpisodesScreen (Eras & Works) | 14639 |
| CastCrew lobby explore buttons | 15045 |
| Editorial theme injection (useMemo) | 17568 |
| Data loaders | 17901 |

### Testing a Universe

1. Click the universe tile on the home screen
2. Check all 5 sidebar screens have content (not blank)
3. Click into 2-3 entity detail pages — verify bio, works, videos
4. Open constellation graph — verify nodes render and drawer populates
5. Switch back to Pluribus — verify no stale state leaks
6. Check browser console for errors

### Known Gaps / TODO

- **Sinners Coogler Creator Spotlight**: The editorial data for Coogler exists but the CastCrewScreen lobby doesn't have a custom spotlight section for him yet (like Gilligan has for Pluribus). Next step is to wire that up.
- **Gerwig "episodes" as films**: The EpisodesScreen could present Gerwig's films as "chapters" (Lady Bird, Little Women, Barbie) instead of the current themes layout. Not wired yet.
- **Entity linking in editorial text**: Era descriptions in Patti Smith's Eras & Works screen mention entity names but the text itself isn't entity-linked (only the pills are clickable). The universal entity linking mechanism works on broker API responses, not static editorial text.
- **Image gaps**: Some entities may have missing or placeholder images from the TMDB enrichment. Chelsea Hotel has a real photo; others rely on TMDB headshots.
- **Broker API bios**: Dynamic bios via `POST /v2/broker` work for all universes since the API routes through the KG. Entity detail pages will generate bios on demand when clicked.

---

## Build Version

```
BUILD_VERSION = "v1.6.0"
BUILD_DATE = "Mar 12, 2026"
```

Pluribus and Blue Note are unchanged — all existing functionality is preserved.
