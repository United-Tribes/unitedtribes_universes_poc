# UMG Demo Sprint — 3-Day Build Plan

**Demo:** Tuesday March 17, 2026
**Sprint:** Saturday Mar 14 → Monday Mar 16
**Principle:** "30 seconds to the boom. Straight to the fuck yeah."

---

## Dev Server Setup — Three Ports

| Port | Directory | Branch | Purpose |
|------|-----------|--------|---------|
| **5173** | `~/Desktop/unitedtribes_universes_poc/` | `justin/universe-expansion-mar12` | Justin's version (read-only reference) |
| **5174** | `~/Desktop/unitedtribes-pocv2-jd/` | `jd/design-reskin-v3` | Our current working version (untouched safety net) |
| **5175** | `~/Desktop/unitedtribes-pocv2-merge-test/` | `jd/design-reskin-v3` + merge | Merge test build. If merge looks good, this becomes the new working dev. |

**Why this approach:** J.D. can open 5174 and 5175 side by side in browser tabs, walk through Cast & Creators, artist detail pages, Blue Note lobby, all five universes. Every problem gets flagged before we commit to the merge. If 5175 is a disaster, close the tab — nothing changed on 5174.

**After J.D. approves 5175:** It becomes the new working dev directory. All subsequent work (Phases 2-5) happens there.

---

## Phase 1: Merge Test (Saturday morning, ~1 hour)

### 1.1 Copy working directory
- `cp -r ~/Desktop/unitedtribes-pocv2-jd/ ~/Desktop/unitedtribes-pocv2-merge-test/`
- This is our isolated merge sandbox

### 1.2 Merge Justin's universe-expansion-mar12 in the copy
- `cd ~/Desktop/unitedtribes-pocv2-merge-test/`
- `git merge origin/justin/universe-expansion-mar12`
- **Confirmed: only 2 conflicts** — both are BUILD_VERSION in App.jsx and PluribusComps.jsx (trivial 3-line resolve)
- 12 new data files land in src/data/ (bluenote, gerwig, pattismith, sinners — universe/response/editorial for each)
- ~3,056 new lines in App.jsx (5 universes, Blue Note lobby, artist cards, universal bio system)

### 1.3 Build + run on port 5175
- `npm run build` to verify no build errors
- `npm run dev -- --port 5175` to run the merge test
- Smoke test: all 5 universe tiles load on HomeScreen

### 1.4 J.D. audits 5175 side by side with 5174
Compare in browser tabs:
- [ ] Cast & Creators screens — did Justin's changes break J.D.'s lobby conversations?
- [ ] Creator spotlight per universe — right person anchored?
- [ ] Blue Note lobby — 15 artist cards rendering?
- [ ] Cross-universe contamination — any Pluribus text on Blue Note pages?
- [ ] Warm palette — any cold grays introduced?
- [ ] NowPlayingBar — still working?

### 1.5 Decision point
- **If 5175 looks good:** It becomes the new working dev. All Phase 2+ work happens in `~/Desktop/unitedtribes-pocv2-merge-test/`.
- **If 5175 is broken:** Flag specific issues, fix them in the merge-test directory, re-audit. 5174 stays untouched.

---

## Phase 2A: Fix Embarrassments (Saturday, ~2-3 hours)

These are find-and-fix tasks. No new features — just making the merged build not embarrassing.

### 2A.1 FILM badges on non-film entities (P0)
Monk, Bebop, Hard Bop, Parker, Gillespie all show "FILM" type badge. The `inferType()` fallback returns "FILM" when entity type isn't matched. Fix: add ARTIST/MOVEMENT type detection, change fallback from "FILM" to "ENTITY".

### 2A.2 Cross-universe contamination (P0)
"Exploring the sonic world of Pluribus" appears on Blue Note page. The lobby narrative isn't scoped to `selectedUniverse`. Fix: condition on current universe.

**NOTE: My Stuff is intentionally cross-universe.** Items saved from ANY universe appear in My Stuff regardless of which universe you're browsing. This is correct behavior — DO NOT filter the library by current universe. Beanie Feldstein showing in My Stuff while browsing Blue Note is NOT a bug.

### 2A.3 Headline direction (P0)
"How Hip-hop Shaped Blue Note Records" → "How Blue Note Records Shaped Hip-hop". Likely in broker API prompt or editorial data. May need to override the generated headline for Blue Note.

### 2A.4 Don Was photo (P1)
Add to `PHOTO_OVERRIDES`: `"Don Was": "/jd-universes-poc/images/manual/don-was.webp"`. Source correct image.

### 2A.5 Duplicate influences (P1)
Every influence appears twice. Deduplicate by title in the influence-rendering section.

### 2A.6 Duplicated bio text (P1)
Hero bio and About section show identical text. Skip About section if it matches hero.

### 2A.7 HTML encoding bugs (P1)
`&amp;`, `&#39;` showing as literal text. Add `decodeHTMLEntities()` utility.

### 2A.8 Follow-up chips position (P1)
Move chips above sources in JSX render order.

### 2A.9 Greta Gerwig creator spotlight (P1)
Shows Baumbach instead of Gerwig. Fix creator designation in Gerwig editorial/universe data.

### 2A.10 External ↗ arrows on sources (P2)
Replace with inline playback triggers. Remove all `target="_blank"` external links.

---

## Phase 2B: Dual Playback (Saturday evening, ~2-3 hours)

Port the V1 MediaCallout.jsx pattern into App.jsx. This is what UMG is here to see.

### 2B.1 Inline the MediaCallout pattern
Port `extractYouTubeId()` and `extractSpotifyEmbed()` utilities into App.jsx. Port the dual embed rendering (YouTube 16:9 with timestamp, Spotify 152px fixed height).

### 2B.2 Wire into entity detail
Featured Tracks currently link out to Spotify. Replace with inline dual-playback: YouTube embed + Spotify embed, toggle between them. Use the existing NowPlayingBar toggle pattern.

### 2B.3 Wire into discovery cards
When clicking an album (Kind of Blue, Blue Train) in the RWL strip or discovery groups, open an inline player modal with the Spotify album embed + YouTube full album, same as V1 KG app pattern.

### 2B.4 Kill all external Spotify/YouTube links
Every play button that currently links out → inline embed instead. No external navigation.

**Reference:** `~/Desktop/unitedtribes_universes_poc/src/components/content/MediaCallout.jsx` (81 lines)

---

## Phase 3: API Proxy (Saturday evening, ~30-45 min)

### 3.1 Add Vite proxy config
```js
// vite.config.js
server: {
  port: 5175, // or 5174 depending on which directory becomes working dev
  proxy: {
    '/api/sml': {
      target: 'http://localhost:3006',
      rewrite: (path) => path.replace(/^\/api\/sml/, '/api'),
      changeOrigin: true,
    },
    '/api/yta': {
      target: 'http://localhost:3002',
      rewrite: (path) => path.replace(/^\/api\/yta/, '/api'),
      changeOrigin: true,
    },
  },
}
```

### 3.2 Start SML and YTA, verify proxy
- `cd ~/smart-media-logger && npm run dev` (port 3006)
- `cd ~/youtube-transcript-analysis && npm run dev -- -p 3002`
- Test from browser console: `fetch('/api/sml/search?q=Blue+Train').then(r=>r.json()).then(console.log)`
- Test: `fetch('/api/yta/search?q=Coltrane').then(r=>r.json()).then(console.log)`

---

## Phase 4: Make It Sing (Sunday, full day)

### 4.1 Blue Note Book Viewer (Sunday morning, ~2-3 hours)
This is Act 1 of the demo. Book → Blue Train → Coltrane → discovery.

- Copy `blue-note-cover-art.json` from Fresh to `src/data/`
- Copy 28 `bluenote-*.png` images from Fresh to `public/images/bluenote/`
- Build `BookViewer` component in App.jsx: page-flip navigation, full-bleed images
- Album showcase pages (page 7 = Blue Train) have tappable entity names
- Tapping "John Coltrane" on Blue Train page → triggers entity detail/modal
- Entry point: "The Book" in Blue Note sidebar nav or a hero card in the lobby

### 4.2 Modal Integration (Sunday afternoon, ~3-4 hours)
Port the universal modal from 5179 vanilla JS → React component in App.jsx.

**Port the skeleton first:**
- Three-zone layout: Header → Split Panel (50/50) → Discovery Strip + Ask Bar
- 900px width, 280px player height
- Turndown chevrons (⌄/⌃) on right panel items, NOT play buttons
- Play buttons (▶) ONLY on key moment timestamps inside expanded items
- Gold left border (3px, #f5b800) on active/expanded item
- Toggle dismiss (click same entity = close, different = switch, escape = close)

**Then wire real data:**
- Entity data from bluenote-universe.json for header (photo, name, type, bio)
- Broker API call on modal open for expanded KG description
- Video list from entity's quickViewGroups or YTA search results
- RWL discovery strip from entity's collaborators/related works

**Trigger from entity clicks everywhere:** Cast pages, constellation, response screen, RWL strips, lobby, book viewer. All entity taps → modal.

### 4.3 SML Enrichment (Sunday evening, ~2 hours)
Wire SML API calls for real metadata on modal content:

- `/api/sml/search?q={title}` → real posters for films/albums in RWL strip
- `/api/sml/youtube-trailer?title={t}&year={y}` → quality-scored trailers
- `/api/sml/movie-details?tmdbId={id}` → cast headshots, review scores
- `/api/sml/youtube-playlist?movieTitle={t}&searchType=music` → soundtrack playlists (THE UMG killer feature)

### 4.4 YTA Intelligence (Sunday evening, ~2 hours)
Wire YTA API calls for the analysis layer:

- `/api/yta/search/deep?q={entity}` → "Discussed in N videos" with timestamped mentions
- Works & Discovery Playlists from pre-computed modal-data.json
- `/api/yta/youtube-search?song={s}&artist={a}` → playable YouTube videos per track

---

## Phase 5: Music Across Universes + Polish (Monday)

### 5.1 Sonic/Music areas in all 5 universes (Monday morning, ~2 hours)
- **Pluribus:** 34 needle drops already curated (JD_SONG_DESCS). Verify Sonic Layer plays inline.
- **Sinners:** Ludwig Goransson's score + 29 music moments.
- **Greta Gerwig:** Barbie soundtrack, Lady Bird score.
- **Patti Smith:** Her own music catalog.

### 5.2 Demo path rehearsal (Monday afternoon, ~2 hours)
**Act 1 — The Book** (~3 min): Home → Blue Note tile → "The Book" → flip to Blue Train → tap cover
**Act 2 — Discovery** (~5 min): Coltrane modal with insight, video proof, RWL strip
**Act 3 — Consumption** (~5 min): Works & Playlists → play inline → NowPlayingBar
**Act 4 — The Network** (~3 min): Constellation → Coltrane → Miles → Monk connections
**Act 5 — Cross-Universe** (~2 min): Quick hit of Sinners or Pluribus music

Target: 30 seconds to the "holy shit" moment.

### 5.3 Cache warming + fallbacks (Monday evening, ~1 hour)
### 5.4 Final commit + tag `pre-umg-demo`

---

## Scope Cuts (if behind schedule)

Cut from bottom up:
1. **SML enrichment** (4.3) — demo works with existing entity data, just less rich
2. **Music in non-Blue-Note universes** (5.1) — focus Blue Note only, mention others verbally
3. **Full modal port** (4.2) — use EntityDetailScreen navigation instead of overlay modal
4. **YTA intelligence** (4.4) — static data instead of live API calls

**Never cut:** Merge (1), P0 fixes (2A), Dual playback (2B), API proxy (3), Book viewer (4.1)

---

## Key Files

| File | Purpose |
|------|---------|
| `src/App.jsx` | The monolith — all changes go here |
| `src/PluribusComps.jsx` | Mirror of App.jsx (sync after every change) |
| `vite.config.js` | Add SML + YTA proxy config |
| `src/data/blue-note-cover-art.json` | Book viewer data (copy from Fresh) |
| `public/images/bluenote/*.png` | Book page images (copy from Fresh) |
| `public/images/manual/don-was.webp` | Don Was photo override |
| `docs/universal-modal.html` | Reference for modal port (2,777 lines) |
| `docs/extract-modal-data.cjs` | Extend for Blue Note entities |
| `pocv2-jd-design-reskin-versions.html` | Version tracker (update every commit) |
