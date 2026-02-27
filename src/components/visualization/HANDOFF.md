# Visualization Module — Integration Guide for JD

## Quick Start

```bash
# Test standalone
npm run dev
# Open: http://localhost:5173/universes-poc/?test=visualization
```

## How to Integrate

### Replace ConstellationScreen

In `App.jsx`, import and swap the component:

```jsx
import { UniverseNetwork } from "./components/visualization";

// In the CONSTELLATION screen render:
<UniverseNetwork
  entityName={selectedUniverse === "pluribus" ? "Pluribus" : entityName}
  onEntityTap={(name) => {
    setSelectedEntity(name);
    setScreen(SCREENS.ENTITY_DETAIL);
  }}
  assembledData={entities}
  theme={{
    // Override with your warm palette if needed:
    // bg: "#f5f0e8",
    // dotGrid: "#d8cfc2",
  }}
/>
```

### Replace ThemesScreen

```jsx
import { ThemesNetwork } from "./components/visualization";

<ThemesNetwork
  entityName="Pluribus"
  themesDB={THEMES_DB}
  themeVideos={responseData?.themeVideos}
  onThemeTap={(themeId) => { /* navigate to theme detail */ }}
  onEntityTap={(name) => {
    setSelectedEntity(name);
    setScreen(SCREENS.ENTITY_DETAIL);
  }}
  theme={{
    // Override with your warm palette if needed
  }}
/>
```

## Props Reference

### UniverseNetwork
| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `entityName` | string | Yes | Entity to center the graph on |
| `onEntityTap` | (name) => void | No | Called when user clicks a node |
| `assembledData` | object | No | `entities` from pluribus-universe.json — used as fallback + enrichment |
| `theme` | object | No | Override DEFAULT_THEME tokens |

### ThemesNetwork
| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `entityName` | string | Yes | Anchor entity name |
| `themesDB` | object | Yes | THEMES_DB from App.jsx |
| `themeVideos` | object | No | responseData.themeVideos |
| `onThemeTap` | (themeId) => void | No | Called when user clicks a theme node |
| `onEntityTap` | (name) => void | No | Called when user clicks a non-theme node |
| `theme` | object | No | Override DEFAULT_THEME tokens |

### Theme Tokens (override any subset)
```js
{
  bg: "#f9fafb",           // Graph area background
  dotGrid: "#d1d5db",      // Dot grid color
  panelBg: "rgba(255,255,255,0.98)",
  panelBorder: "#e5e7eb",
  panelShadow: "-4px 0 32px rgba(0,0,0,0.06)",
  tooltipBg: "rgba(255,255,255,0.96)",
  text: "#1a2744",
  textMuted: "#6b7280",
  textDim: "#9ca3af",
  labelColor: "#1a2744",
}
```

## Files
```
src/components/visualization/
├── index.js              # Barrel export — import from here
├── NetworkGraph.jsx      # Core D3 force-directed engine
├── UniverseNetwork.jsx   # Entity graph wrapper (replaces ConstellationScreen)
├── ThemesNetwork.jsx     # Theme graph wrapper (replaces ThemesScreen)
├── DetailPanel.jsx       # Slide-in detail panel (32% width)
├── Legend.jsx             # Interactive type legend with toggle filtering
├── adapters.js           # KG API → D3 data transformers
├── constants.js          # Types, colors, force params, design tokens
├── TestPage.jsx          # Dev test page (?test=visualization)
└── HANDOFF.md            # This file
```

## Dependencies
- `d3` (added to package.json)

## Data Flow
1. **UniverseNetwork** calls KG API `GET /entities/{name}` (paginated)
2. **adapters.js** transforms relationships into nodes + edges
3. Falls back to `assembledData` (pluribus-universe.json) if API is down
4. **ThemesNetwork** uses `THEMES_DB` + `themeVideos` to build theme graph
5. Both pass data to **NetworkGraph** which handles all D3 rendering

## Notes
- The graph uses `useRef` + `useEffect` for D3 rendering — React owns lifecycle, D3 owns SVG
- Panel open/close compresses the graph area with CSS transition
- Legend filtering updates D3 opacity via `useEffect` on `activeTypes`
- All styles are inline (no CSS files) to match project convention
- Mock data included in adapters.js for offline development
