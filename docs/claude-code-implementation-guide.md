# Pluribus POC — Claude Code Implementation Guide
## Design Reskinning & Feature Integration
**Date:** February 20, 2026
**Context:** J.D. (CEO, UnitedTribes) is directing the visual redesign of Justin's React app to match the v2.8 design prototype. This document provides the complete technical specification for implementation.

---

## 1. Setup

```bash
git clone https://github.com/United-Tribes/unitedtribes_universes_poc.git
cd unitedtribes_universes_poc
git checkout dev/colleague
npm install
npm run dev
# App runs at http://localhost:5173
```

**Read `CLAUDE.md` in repo root first** — it has the full architecture guide (11 screens, data model, all components).

**Critical rules:**
- Edit ONLY `src/App.jsx`
- After every edit session: `cp src/App.jsx src/PluribusComps.jsx`
- All styles are inline (no CSS files) — this is intentional
- Commit often with descriptive messages
- Push to `dev/colleague` branch

---

## 2. The Mission: Transform Justin's Cold Palette → J.D.'s Warm Palette

The app currently uses a clinical white/gray design. J.D.'s approved design uses warm cream, sand, and gold tones. The visual redesign must not break any existing functionality.

### 2.1 Theme Object T — Complete Replacement

**Current (Justin's — lines ~31-54 of App.jsx):**
```js
const T = {
  bg: "#ffffff",
  bgCard: "#ffffff",
  bgElevated: "#f3f4f6",
  bgHover: "#e5e7eb",
  border: "#e5e7eb",
  borderLight: "#d1d5db",
  text: "#1a2744",
  textMuted: "#4b5563",
  textDim: "#9ca3af",
  blue: "#2563eb",
  blueDark: "#1d4ed8",
  blueLight: "rgba(37,99,235,0.12)",
  blueBorder: "rgba(37,99,235,0.2)",
  gold: "#f5b800",
  goldBg: "rgba(245,184,0,0.14)",
  goldBorder: "rgba(245,184,0,0.3)",
  green: "#16803c",
  greenBg: "rgba(22,128,60,0.12)",
  greenBorder: "rgba(22,128,60,0.22)",
  queryBg: "#1a2744",
  shadow: "0 1px 3px rgba(0,0,0,0.04), 0 4px 14px rgba(0,0,0,0.03)",
  shadowHover: "0 2px 8px rgba(0,0,0,0.06), 0 10px 28px rgba(0,0,0,0.05)",
};
```

**Target (J.D.'s warm palette):**
```js
const T = {
  bg: "#faf8f5",              // Warm cream (was: white)
  bg2: "#f5f0e8",             // Warm sand (NEW)
  bgCard: "#ffffff",          // Cards stay white for contrast
  bgElevated: "#f5f0e8",     // Warm sand (was: cool gray-50)
  bgHover: "#ebe4d8",         // Warm hover (was: cool gray-200)
  border: "#d8cfc2",          // Warm border (was: cool gray-200)
  borderLight: "#e0d8cc",     // Warm light border (was: cool gray-300)
  text: "#1a2744",            // Navy — UNCHANGED
  textMuted: "#3d3028",       // Warm brown-gray (was: cool gray-600)
  textDim: "#5a4a3a",            // Warm dim (was: cool gray-400 #9ca3af — NO GRAY TEXT)
  navy: "#1a2744",            // Explicit navy reference (NEW)
  navy2: "#2a3a5a",           // Secondary navy (NEW)
  link: "#1565c0",            // Entity link blue (was: #2563eb)
  blue: "#2563eb",            // Keep for compatibility where needed
  blueDark: "#1d4ed8",
  blueLight: "rgba(37,99,235,0.12)",
  blueBorder: "rgba(37,99,235,0.2)",
  gold: "#f5b800",            // UNCHANGED
  gold2: "#ffce3a",           // Secondary gold (NEW)
  goldBg: "rgba(245,184,0,0.14)",
  goldBorder: "rgba(245,184,0,0.3)",
  green: "#1db954",           // Spotify green (was: #16803c)
  greenBg: "rgba(29,185,84,0.12)",
  greenBorder: "rgba(29,185,84,0.22)",
  red: "#c62828",             // Video/watch red (NEW)
  purple: "#651fff",          // Buy/book purple (NEW)
  queryBg: "#1a2744",         // UNCHANGED
  shadow: "0 4px 20px rgba(44,24,16,0.08)",        // Warm shadow
  shadowHover: "0 6px 24px rgba(44,24,16,0.12)",   // Warm shadow hover
};
```

### 2.2 Body/Page Background

Justin currently sets white backgrounds everywhere. Change the outermost container to:
```js
background: "linear-gradient(165deg, #faf8f5 0%, #f5f0e8 50%, #ebe4d8 100%)"
```

### 2.3 Active/Hover States — Gold Instead of Blue

Throughout the app, Justin uses blue for active states (`T.blueLight` background, `T.blue` text). J.D.'s design uses gold:

**Active state pattern:**
```js
// BEFORE (Justin)
background: isActive ? T.blueLight : "transparent"
color: isActive ? T.blue : T.textMuted

// AFTER (J.D.)
background: isActive ? "linear-gradient(135deg, #fffdf5, #fff8e8)" : "transparent"
color: isActive ? T.text : T.textMuted
```

**Hover state pattern:**
```js
// BEFORE
":hover": { background: T.bgHover }

// AFTER
":hover": { background: "#f5f0e8", borderColor: T.gold }
```

---

## 3. SideNav Redesign

### Current State (lines ~151-231)
- 68px wide, Unicode character icons, blue active states
- Order: Explore, Themes, Sonic Layer, Cast & Crew, Episodes, Universe, Library

### Target State
- 72px wide, SVG icons, gold active states with left-bar indicator
- Order: Explore, Universe & Map, Cast & Creators, Music & Sonic, Episodes, Themes, Library
- Dual-line labels

### Complete Replacement SideNav

Replace the entire `SideNav` function with:

```jsx
function SideNav({ active, onNavigate, libraryCount = 0 }) {
  const items = [
    { id: "explore", label: "Explore", screen: SCREENS.RESPONSE,
      icon: <svg viewBox="0 0 24 24"><circle cx="10.5" cy="10.5" r="7.5"/><path d="M21 21l-4.35-4.35"/></svg> },
    { id: "universe", label: "Universe\n& Map", screen: SCREENS.CONSTELLATION,
      icon: <svg viewBox="0 0 24 24"><circle cx="12" cy="5" r="2"/><circle cx="5" cy="19" r="2"/><circle cx="19" cy="19" r="2"/><path d="M12 7v4M7.5 17.5L10.5 13M16.5 17.5L13.5 13"/></svg> },
    { id: "cast", label: "Cast &\nCreators", screen: SCREENS.CAST_CREW,
      icon: <svg viewBox="0 0 24 24"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg> },
    { id: "sonic", label: "Music &\nSonic", screen: SCREENS.SONIC,
      icon: <svg viewBox="0 0 24 24"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg> },
    { id: "episodes", label: "Episodes", screen: SCREENS.EPISODES,
      icon: <svg viewBox="0 0 24 24"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg> },
    { id: "themes", label: "Themes", screen: SCREENS.THEMES,
      icon: <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 3a4.5 4.5 0 0 0 0 9a4.5 4.5 0 0 1 0 9"/><circle cx="12" cy="7.5" r=".5" fill="currentColor"/><circle cx="12" cy="16.5" r=".5" fill="currentColor"/></svg> },
    { id: "library", label: "Library", screen: SCREENS.LIBRARY,
      icon: <svg viewBox="0 0 24 24"><path d="M19 21l-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg> },
  ];

  return (
    <nav style={{
      width: 72, minHeight: "100%", background: "#fff",
      borderRight: `1px solid ${T.border}`,
      display: "flex", flexDirection: "column", alignItems: "center",
      paddingTop: 14, gap: 2, flexShrink: 0,
    }}>
      {items.map((item) => {
        const isActive = active === item.id;
        return (
          <button key={item.id} onClick={() => onNavigate(item.screen)}
            style={{
              width: 62, padding: "8px 0", border: "none", borderRadius: 8,
              background: isActive ? "linear-gradient(135deg, #fffdf5, #fff8e8)" : "transparent",
              display: "flex", flexDirection: "column", alignItems: "center",
              gap: 3, cursor: "pointer", transition: "all 0.2s",
              position: "relative", fontFamily: "inherit",
            }}>
            {/* Gold left-bar active indicator */}
            {isActive && <div style={{
              position: "absolute", left: 0, top: 8, bottom: 8,
              width: 3, background: T.gold, borderRadius: "0 2px 2px 0",
            }}/>}
            {/* SVG Icon */}
            <div style={{ width: 20, height: 20, color: isActive ? T.gold : "#2a3a5a" }}>
              {React.cloneElement(item.icon, {
                style: { width: 20, height: 20, strokeWidth: 2.2, fill: "none", stroke: "currentColor" }
              })}
            </div>
            {/* Label */}
            <span style={{
              fontSize: 8.5, fontWeight: isActive ? 700 : 600,
              color: isActive ? T.text : "#3d3028",
              textAlign: "center", lineHeight: 1.25, letterSpacing: "0.02em",
              whiteSpace: "pre-line",
            }}>
              {item.label}
            </span>
            {/* Library badge */}
            {item.id === "library" && libraryCount > 0 && (
              <div style={{
                position: "absolute", top: 4, right: 6,
                minWidth: 14, height: 14, borderRadius: 7,
                background: T.gold, color: T.text,
                fontSize: 8, fontWeight: 800,
                display: "flex", alignItems: "center", justifyContent: "center",
                padding: "0 3px",
              }}>
                {libraryCount}
              </div>
            )}
          </button>
        );
      })}
    </nav>
  );
}
```

**Notes on the SideNav:**
- The label "Cast & Creators" is REQUIRED (not "Cast & Crew" or "Cast & Characters"). J.D. is specific about this.
- The yin-yang Themes icon is a placeholder. Justin needs to create a proper heart+dagger SVG.
- Library badge uses gold background (not blue).

---

## 4. Screen-by-Screen Reskinning Priorities

### Priority 1: Global Changes
1. Theme object T replacement
2. Body background gradient
3. SideNav redesign
4. Logo component (confirm navy/gold, system font)
5. All borders from cool gray to warm `#d8cfc2`

### Priority 2: HomeScreen
- Background: warm cream gradient
- Universe tiles: maintain existing but warm up borders/shadows
- Input area: navy border (2px), gold focus state, system font

### Priority 3: ResponseScreen
- Entity tags: `#1565c0` blue with warm hover backgrounds
- Discovery cards: warm borders, warm shadows
- AI response prose: warm text colors
- Compare panel: gold accents

### Priority 4: Remaining Screens
- Apply warm palette consistently across all 11 screens
- ThemePills can keep their individual colors (they provide needed contrast)
- NowPlayingBar: keep dark navy, but ensure gold accents match

---

## 5. Specific Design Patterns from v2.8

### Card Hover Pattern
```js
{
  border: `1.5px solid ${T.border}`,
  borderRadius: 10,
  transition: "all 0.2s",
  // on hover:
  transform: "translateY(-3px)",
  boxShadow: "0 6px 20px rgba(44,24,16,0.1)",
  borderColor: "#c0b5a8",
}
```

### Gold Accent Bar (Section Headers)
```js
// Left accent bar before section titles
{
  content: "",
  width: 3,
  height: 18,
  background: "linear-gradient(180deg, #f5b800, #ffce3a)",
  borderRadius: 2,
}
```

### Button Patterns
```js
// Primary button (send/submit)
{
  background: "linear-gradient(135deg, #1a2744, #2a3a5a)",
  color: "#ffce3a",
  border: "none",
  borderRadius: 12,
}

// Pathway/category button
{
  border: `2px solid ${T.border}`,
  background: "#fff",
  borderRadius: 24,
  // on hover:
  borderColor: T.gold,
  background: "linear-gradient(180deg, #fffdf5, #fff8e8)",
  transform: "translateY(-2px)",
  boxShadow: "0 6px 20px rgba(245,184,0,0.2)",
}

// Active state
{
  borderColor: T.gold,
  background: "linear-gradient(180deg, #fffdf5, #fff8e8)",
  boxShadow: "0 4px 16px rgba(245,184,0,0.2)",
}
```

### Entity Link Styling
```js
{
  color: "#1565c0",
  textDecoration: "none",
  fontWeight: 600,
  borderBottom: "1.5px solid rgba(21,101,192,0.25)",
  // on hover:
  borderBottomColor: "#1565c0",
  background: "rgba(21,101,192,0.06)",
  borderRadius: 2,
}
```

### Music Card Pattern
```js
{
  background: "#fff",
  border: `1.5px solid ${T.border}`,
  borderRadius: 8,
  width: "calc(33.333% - 6px)",
  // on hover:
  borderColor: "#1db954",  // Spotify green
  transform: "translateY(-1px)",
  boxShadow: "0 3px 12px rgba(29,185,84,0.12)",
}
// Playing state:
{
  borderColor: "#1db954",
  background: "linear-gradient(180deg, #f0fef5, #e8fdf0)",
}
```

---

## 6. Features to Port from v2.8 (After Reskinning)

### 6.1 In-Card Follow-Up System
Entity cards in v2.8 have an embedded input field. Users can ask follow-up questions about specific entities without leaving the response context. The response appears inside the same card with a gold accent header.

### 6.2 Contextual Starter Chips
On the hero/home screen, after selecting a pathway button, contextual question starters appear.

### 6.3 Scene Context for Music Cards
Each music card connects to a scene description showing what's happening in the show when the song plays.

---

## 7. Critical Design Rules

### NO Gray or Light Text — ANYWHERE
Every instance of gray text must be eliminated. Search the entire App.jsx for:
- `#9ca3af` → replace with `#3d3028` (warm muted) or `T.text` for important items
- `#6b7280` → replace with `#3d3028`
- `#4b5563` → replace with `#3d3028`
- `T.textDim` usage → make it `#3d3028` not `#9ca3af`
- `T.textMuted` usage → make it `#3d3028` not `#4b5563`
- Any `opacity` tricks that fade text too light → remove or increase opacity

### NO Pastel Colors
Replace with rich, bold, saturated colors. No washed-out anything.

---

## 8. HomeScreen Universe Selector Redesign

The app needs **5 universes** (not 4):

1. **Pluribus** — Vince Gilligan's Apple TV+ show
2. **Blue Note Records** — Jazz heritage and music discovery
3. **Patti Smith** — Literary and music crossover
4. **Greta Gerwig** — Film universe (Lady Bird, Barbie, Little Women)
5. **Sinners** — Ryan Coogler film (music, costume, cultural analysis)

---

## 9. Things NOT to Change

- Do NOT alter Pluribus show facts
- Do NOT modify `THEMES_DB` data without explicit instruction
- Do NOT change the single-file architecture
- Do NOT add CSS files (all styles inline)
- Do NOT change the data import structure (JSON files)
- Do NOT modify the harvester pipeline
- Do NOT change API endpoints
- Do NOT remove the model selector

---

## 10. Testing Checklist After Reskinning

- [ ] All 11 screens render without errors
- [ ] NO gray text anywhere
- [ ] NO pastel colors
- [ ] SideNav navigation works for all items
- [ ] Active states show gold highlight (not blue)
- [ ] Warm cream/sand background visible everywhere
- [ ] Borders are warm brown-gray (#d8cfc2) not cool gray
- [ ] Logo reads UNITED (navy) TRIBES (gold)
- [ ] NowPlayingBar functions
- [ ] VideoModal opens and plays
- [ ] ReadingModal opens
- [ ] Library save/remove works
- [ ] Spoiler-free toggle works
- [ ] Model selector dropdown works
- [ ] Entity detail navigation works
- [ ] Theme pills display correctly
- [ ] Episode arc groupings display correctly
- [ ] PluribusComps.jsx is identical to App.jsx

---

## 11. Reference Color Mapping (Quick Lookup)

| Element | Justin's Current | J.D.'s Target |
|---------|-----------------|---------------|
| Page background | `#ffffff` | `#faf8f5` gradient |
| Card background | `#ffffff` | `#ffffff` (keep) |
| Elevated/hover bg | `#f3f4f6` / `#e5e7eb` | `#f5f0e8` / `#ebe4d8` |
| Default border | `#e5e7eb` | `#d8cfc2` |
| Primary text | `#1a2744` | `#1a2744` (same) |
| Muted text | `#4b5563` | `#3d3028` |
| Dim/placeholder text | `#9ca3af` | `#5a4a3a` (NO GRAY) |
| Primary accent | `#2563eb` (blue) | `#f5b800` (gold) |
| Link color | `#2563eb` | `#1565c0` |
| Active bg | `rgba(37,99,235,0.12)` | `linear-gradient(135deg, #fffdf5, #fff8e8)` |
| Music green | `#16803c` | `#1db954` |
| Shadow tone | `rgba(0,0,0,...)` | `rgba(44,24,16,...)` |
| SideNav width | 68px | 72px |
| SideNav icons | Unicode chars | SVG paths |
| SideNav active | Blue highlight | Gold left-bar + warm bg |
| Library badge | Blue dot | Gold dot |
