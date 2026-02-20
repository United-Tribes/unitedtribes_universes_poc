# Pluribus POC — Claude Session Handoff Document
## From v2.8 Design Thread → React Integration Phase
**Date:** February 20, 2026
**Prepared for:** Next Claude session (fresh thread)
**Author:** Previous Claude session working with J.D. (founder/CEO, UnitedTribes AI4Good, Inc.)

---

## 1. What This Project Is

UnitedTribes is building authorized AI-powered cross-media discovery infrastructure. The Pluribus POC demonstrates how a cultural knowledge graph (9,000+ relationships, 4,000+ artists from UMG and HarperCollins partnerships) transforms flat AI text responses about media into visceral, interactive discovery experiences.

**The POC has two parallel tracks:**
- **J.D.'s design prototypes** — High-fidelity HTML/CSS mockups built in Claude chat sessions (v1.0 through v2.8), defining the visual identity, interaction patterns, and user experience
- **Justin's React application** — A functional 7,300-line single-file React app (App.jsx) with live data, API integration, 11 screens, and full navigation

**The goal now:** Merge J.D.'s superior visual design into Justin's functional React codebase.

---

## 2. The Design Bible: v2.8

File: `docs/v2.8.4-design-bible.html` (in this repo)

v2.8 is the definitive design reference. Everything in the React app should aspire to look like this.

### Color Palette (CRITICAL)
```
--bg:       #faf8f5   (warm cream)
--bg2:      #f5f0e8   (warm sand)
--white:    #fff
--navy:     #1a2744   (primary text, dark UI elements)
--navy2:    #2a3a5a   (secondary navy)
--gold:     #f5b800   (primary accent)
--gold2:    #ffce3a   (secondary gold)
--border:   #d8cfc2   (warm border)
--text:     #1a2744   (navy text)
--textmid:  #3d3028   (warm mid-tone)
--link:     #1565c0   (entity links)
--green:    #1db954   (Spotify/music)
--red:      #c62828   (video/watch actions)
--purple:   #651fff   (buy/book actions)
```

### Typography
- System font stack: `-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`
- NOT DM Sans (Justin's choice). J.D.'s design uses system fonts throughout.

### Brand Logo
- "UNITED" in navy `#1a2744`, "TRIBES" in gold `#f5b800`
- Font: system font, weight 900, letter-spacing 1.5px, size 15px

---

## 3. Justin's React App — Current State

**Repo:** `github.com/United-Tribes/unitedtribes_universes_poc`
**Branch:** `dev/colleague` (J.D.'s starting point)

### Architecture
- Single-file React app: `src/App.jsx` (7,322 lines)
- `PluribusComps.jsx` must always be identical copy of `App.jsx`
- React 19, Vite 7, no router, no CSS files — all inline styles
- Data imported from `src/data/pluribus-response.json` and `src/data/pluribus-universe.json`

### 11 Screens (SCREENS enum)
1. HOME, 2. THINKING, 3. RESPONSE, 4. CONSTELLATION, 5. ENTITY_DETAIL,
6. LIBRARY, 7. THEMES, 8. SONIC, 9. CAST_CREW, 10. EPISODES, 11. EPISODE_DETAIL

---

## 4. Critical Design Rules (J.D.'s Non-Negotiables)

### NO Gray or Light Text ANYWHERE
Every instance of `#9ca3af`, `#6b7280`, `#4b5563` must be replaced with readable dark tones. Use `#1a2744` (navy) for primary, `#3d3028` (warm brown) for secondary.

### NO Pastel Colors
Universe tiles should use rich, saturated colors. No muted/washed-out pastels anywhere.

### Warm Everything
Every surface, border, shadow, and hover state must feel warm. Cool grays are banned.

---

## 5. Opening State / Universe Selector Redesign

5 universes:
1. **Pluribus** (Vince Gilligan / Apple TV+)
2. **Blue Note Records** (Jazz / Music heritage)
3. **Patti Smith** (Literary/Music crossover)
4. **Greta Gerwig** (Film universe — Lady Bird, Barbie, Little Women)
5. **Sinners** (Ryan Coogler film — music, costume, cultural analysis)

---

## 6. App Integration Strategy

### Smart Media Logger
- Local path: `~/Desktop/smart-media-logger-archive/v1.9.3-metadata-persistence/`
- Features: media metadata persistence, logging interface

### YouTube Analysis Application
- Local path: `~/youtube-transcript-analysis/`
- Features: transcript analysis, deep search, video playback, entity extraction

### UnitedTribes Fresh (Book & Video Application)
- Local path: `~/Desktop/my-claude/united-tribes-fresh-v4/`
- Features: book analysis interface, book+video combined display

### Blue Note POC
- Features: music playlisting, audio playback, artist discovery

---

## 7. What Needs to Happen Next

### Phase 1: Setup & Fork — COMPLETE
### Phase 2: Design Reskinning — NEXT
### Phase 3: Feature Integration from v2.8
### Phase 4: Cross-App Feature Integration
### Phase 5: Continued Development

---

## 8. Working with J.D. — Important Notes

- J.D. is extremely visual — he needs to see things
- J.D. has strong design opinions — warm palette is non-negotiable
- NO GRAY TEXT — J.D. absolutely hates gray or light-colored text
- NO PASTELS — Bold, rich, saturated colors only
- J.D. prefers "Cast & Creators" not "Cast & Crew"
- v2.8 is the design bible — when in doubt, reference v2.8
- Version trackers are mandatory
- One issue at a time
- Document everything

---

## 9. Version History (HTML Prototypes)

| Version | Key Changes |
|---------|------------|
| v1.0-1.4 | Initial consumer product explorations |
| v1.5 | Hero/opening state established |
| v1.6 | Definitive hero layout |
| v2.0-2.3 | Interactive response engine development |
| v2.4 | Full interactive system (72 entity cards, follow-ups, music, compare drawer) |
| v2.5-2.6 | Layout refinements |
| v2.7 | v1.6 hero + v2.4 response engine merged |
| v2.8 | SideNav added, design language complete |
