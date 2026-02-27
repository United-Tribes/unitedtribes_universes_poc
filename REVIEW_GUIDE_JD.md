# Universe Network Visualization — Review Guide for JD

> **Branch:** `phase2-data-extraction`
> **Date:** Feb 26, 2026
> **What's new:** Interactive force-directed graph of the Pluribus universe with rich entity detail panels

---

## Quick Start

```bash
# 1. Clone (or pull if you already have the repo)
git clone https://github.com/United-Tribes/unitedtribes_universes_poc.git
cd unitedtribes_universes_poc

# If you already have the repo:
cd unitedtribes_universes_poc
git fetch origin
git checkout phase2-data-extraction
git pull origin phase2-data-extraction

# 2. Install dependencies
npm install

# 3. Start dev server
npm run dev
```

**Open in browser:** `http://localhost:5173/universes-poc/?test=visualization`

The `?test=visualization` query param routes to the new visualization test page.

---

## What You're Looking At

### Universe Network Tab (main feature)

A D3.js force-directed graph showing 102 entities organized into **hub-and-spoke clusters**:

| Cluster | Hub Label | Count | What's in it |
|---------|-----------|-------|-------------|
| **Cast** | Cast of Pluribus | 19 actors | Rhea Seehorn, Miriam Shor, Katt Williams, etc. |
| **Creators** | Creators of Pluribus | 8 crew | Vince Gilligan, Dave Porter, Gordon Smith, etc. |
| **Influences** | Influences on Pluribus | 14 films/shows | Twilight Zone, The Thing, Invasion of the Body Snatchers, etc. |
| **Music** | Music from Pluribus | 35 artists | Khruangbin, Miles Davis, Sade, DakhaBrakha, etc. |
| **Themes** | Themes of Pluribus | 11 themes | Isolation, Grief, Identity, Collective, etc. |
| **Characters** | (in Cast cluster) | 5 characters | Davis Taffler, Zosia, Koumba Diabaté, etc. |

### Interactions
- **Click any node** → slide-out detail panel with image, bio, stats, videos, music
- **Drag nodes** to rearrange
- **Scroll to zoom**, drag background to pan
- **Legend** at bottom-left filters by entity type

### What to look for in detail panels

**Cast members** (e.g., Rhea Seehorn):
- TMDB headshot, bio, filmography stats
- YouTube interview clips
- Spotify tracks (if they have music credits)

**Music artists** (e.g., Khruangbin, Sade):
- Spotify artist photo
- Genre tags, popularity score
- Top tracks with Spotify links
- YouTube music videos

**Films/episodes** (e.g., The Twilight Zone episodes, The Thing):
- TMDB poster
- Plot overview
- YouTube trailer

**Themes** (e.g., Isolation, Grief):
- YouTube analysis videos
- Character moments with quotes

**Creators** (e.g., Vince Gilligan, Dave Porter):
- Bio, filmography
- YouTube clips

### Other Tabs
- **Static (Mock Data)** — hardcoded test graph (ignore)
- **Themes Network** — theme-only subgraph (secondary)

---

## Data Pipeline

All data is pre-assembled — no API keys needed to run. The JSON files in `src/data/` were produced by the harvester pipeline:

```
discover → harvest (TMDB, YouTube, Spotify APIs) → harvest-themes → assemble → copy to POC
```

102 entities with:
- 91 enriched entities (cast, crew, influences, music artists, characters)
- 11 theme entities (constructed from theme-video analysis data)

---

## Known Limitations / In Progress

- **MARO & NASAYA** — no YouTube video (too niche for YouTube search to match)
- **Some characters** have limited video content (pulls actor interviews as fallback)
- **Node sizing** — hub nodes are larger; spoke nodes are uniform size
- **Mobile** — not optimized for mobile yet, best on desktop
- **No search** — click nodes directly or use legend to filter

---

## File Structure (new files)

```
src/components/visualization/
├── adapters.js          ← Transforms assembled JSON → D3 graph nodes/edges
├── NetworkGraph.jsx     ← D3 force simulation + SVG rendering
├── DetailPanel.jsx      ← Slide-out panel when node is clicked
├── UniverseNetwork.jsx  ← Main universe graph (the feature)
├── ThemesNetwork.jsx    ← Theme-only subgraph
├── TestPage.jsx         ← Tab container for test pages
├── Legend.jsx           ← Color-coded legend with filtering
├── constants.js         ← Colors, type configs
├── index.js             ← Exports
└── HANDOFF.md           ← Technical integration notes
```

---

## Feedback Welcome

Things to evaluate:
1. **Layout** — Do the clusters feel balanced? Right number of nodes?
2. **Detail panels** — Is the data rich enough? Anything missing?
3. **Colors/styling** — Does it fit the design direction?
4. **Interaction** — Does click-to-detail feel natural?
5. **Performance** — Any lag with 102 nodes on your machine?
