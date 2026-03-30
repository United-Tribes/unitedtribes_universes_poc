# UnitedTribes POC v1.8.6 — Release Notes
**Shipped: Sunday, March 30, 2026 at 12:15 AM PDT**
**Branch:** `jd/design-reskin-v3`
**Previous version:** v1.8.5 at `31f26c1`

---

## How to See What's New

**Go to the Ryan Coogler Criterion Closet video.** This is our test video for the new enriched catalog modal approach. From there you can see:
- The discovery chevron below the video with Works Discussed and Related Discovery tabs
- Click any film card (e.g. Do the Right Thing, Malcolm X, Fruitvale Station) to open the new enriched catalog modal
- The split panel (trailer + poster), transaction badges, KG turndown with ask bar, and video thumbnail cards

This is currently confirmed working from the Criterion Closet video. Other discovery chevron contexts have not yet been fully tested and may not trigger the catalog modal correctly — that's a v1.8.7 fix.

---

## Summary

Major build integrating the enriched content catalog (16,267 items across music, film, TV, books, and more) into the modal system, adding a discovery chevron with real cross-media content, building a completely new enriched catalog modal for films, merging Justin's harvester gate fix, unifying library logic, overhauling modal category chips, building wall tile sizing with S/M/L controls, and setting up automated scheduled data refreshes from S3.

---

## What Shipped

### 1. Justin's Harvester Gate Fix (Merged)
Merged Justin's 4-commit fix (60ca0a6, cbb439b, c7c2f35, b4887d9) removing the `isMusicEntity` gate — the harvester now decides music vs non-music. Fixes approximately 50% of broken Blue Note albums, songs, fuzzy matching false positives, data-loading race conditions, rendering gates, and blank album covers in the discovery strip. Net -438 lines of code. Cross-universe canaries preserved.

### 2. Enriched Content Catalog Integration
- Loaded the full enriched content catalog (30MB, 16,267 content items with YouTube, TMDB, and Spotify data) lazy on first modal open
- Built a `video_id` lookup map so discovery content can be queried instantly per video
- Video synopsis from the entity index now replaces generic knowledge graph text in the modal Zone 1 header — synopsis wins over broker API when available
- Re-pulled enriched catalog with Justin's dedup fix

### 3. Automated S3 Data Refresh
- Created `pull-data.sh` script for automated S3 data pulls — downloads video entity indexes and the enriched content catalog from S3
- **Cron scheduled 3x daily** at 8AM, 12PM, and 7PM Pacific to keep local data fresh with Justin's latest harvester output
- No AWS credentials needed — public read bucket

### 4. Discovery Chevron
New expandable section below the video player in simple and direct video modals:
- Two tabs: **Works Discussed** (poster cards with timestamp badges) and **Related Discovery** (grouped playlists from the video's discovery analysis)
- Chevron reads "Discoveries related to [video title]"
- Cards include gold [+] add-to-library buttons
- **Criterion and HBO Max badges** — placeholder badges, appropriate for the Ryan Coogler Criterion Closet test video context
- FILM label renamed to MOVIE throughout
- Fixed chevron direction (opens down, closes up)
- Fixed chevron text
- Removed duplicate Read Watch & Listen strip — added `!isDirectVideo` gate to Zone 3 to prevent the strip from showing when the discovery chevron is already present

### 5. Discovery Card Sizing
- Works Discussed and Related Discovery cards unified to identical dimensions: 120x160 poster, 12px title, 11px creator, 20px gold [+]
- Cards are now consistent across both tabs

### 6. Enriched Catalog Modal
Completely new, isolated render path for content clicked from the discovery chevron. Uses separate `enrichedModalItem` state at the App level — completely separate from the existing modal pipeline with no contamination of normal modals. Click order fix: `onNavigate` fires first (clears enrichedModalItem), then `setEnrichedModalItem` sets it back — React batches both.

**Split panel layout:** 70% trailer / 25% poster (the "Do the Right Thing" proportions, confirmed correct). Expand/collapse button locks the container height via ref so the video fills the poster space without any layout shift.

**Below the split panel:**
- **Transaction badges** — Apple TV+ and Criterion at $0.99 with "Added to your list" click feedback (demo/placeholder for future transaction integration and rentals/purchases on the wall)
- **Description** with inline "More from the Knowledge Graph" turndown — matches the exact existing modal pattern (blue text, `⌄` chevron, inline conversation thread, ask bar with gold sparkle `✦`). Expands inline, pushes all content down. Wired to the real `handleModalAsk` function.
- **Video thumbnail cards** — 156px wide with 2-line labels, thin rounded scrollbar (data-dc-row), all TMDB featurettes, clips, and behind-the-scenes content playable by clicking the thumbnail
- "Discussed in X videos" count from the enriched catalog
- "Show less" collapse button matching existing pattern

### 7. Modal Category Chips Overhaul
- Chips now match My Stuff wall tabs exactly: Music, Movies & TV, Video & Podcasts, Books & Reading, People, Places, Games
- Removed old Soundtrack/Score/Film/Video/Book/Person/Place labels
- Chips are manual tags — user decides where items live on their wall

### 8. Library Logic Unified
- **inLib() unified** — three separate inline exact-match checks (lines 6350, 11811, 11897) replaced with prefix-matching fallback matching the main inLib(). Items saved as "Song — Artist" now correctly show as checked when the modal checks "Song"
- **inferCategory() fallback** in toggleLibrary — saves with no category now auto-detect from entity type. No more blank chips on the wall.

### 9. Simple Modal Resize
- Simple modal shrunk to 748px (was 960px). Music mode stays at 960px.
- YouTube embed at 88% width, centered — breathing room around video for discovery content below

### 10. Wall Tile Sizing
- S/M/L sizing system with poster proportions for Movies & TV
- Small wall tile fixed to 240px (3:4 ratio matching modal card proportions at 180px column width)
- Wall poster heights: S=270, M=320, L=400
- S/M/L toggle buttons at modal bottom-right with grid icon
- Wall sizing still needs polish (carried to v1.8.7)

---

## Known Issues (Carrying to v1.8.7)

- **P0: Modal size regression** — non-simple modals (Blue Note albums, entity modals) affected by the simple modal shrink to 748px. The `isSimpleLayout` gate needs fixing to restore 960px for all non-simple modals.
- **Catalog modal not working everywhere** — confirmed working from the Ryan Coogler Criterion Closet video but not rendering or triggering correctly from many other discovery chevron contexts. Needs audit across all universes and video types.
- **Thick scrollbar on modal horizontal scrolls** — needs the thin 4px rounded scrollbar used elsewhere in the app. Claude Code attempted this fix three times and broke thumbnail sizes every time, requiring reverts.
- **Right-edge fade indicator** — horizontal scroll rows need a gradient fade on the right edge to indicate scrollable content. Claude Code also broke layouts attempting this.
- **Gold [+] buttons too hard to see** — the add-to-library buttons throughout the app lack contrast and visibility. Need a redesign for better affordance and larger hit target.
- **Wall tile sizing** still needs polish

---

## Data Requests for Justin

### Soundtrack / Score Data Audit
Soundtracks and scores DO exist in the enriched catalog — Claude Code initially and incorrectly claimed there were zero. A subsequent search found at least 126 items with "soundtrack" or "score" in the title (113 with Spotify, 29 with YouTube). **J.D. believes the actual count is significantly higher than 126 and that Claude Code's analysis is unreliable — many soundtrack and score items may not have those words in their title.**

Key problems that need fixing:
1. Soundtracks and scores are not clearly distinguished from each other
2. They are not linked back to their parent film in any structured way
3. Labeling is wildly inconsistent ("Original Score" vs "Original Motion Picture Soundtrack" vs "Score from the Original Motion Picture Soundtrack")
4. There are likely many more that don't have "soundtrack" or "score" in the title

**Need:** A proper audit and cleanup. Each film should have structured fields linking to its soundtrack and score separately, with both Spotify and YouTube IDs.

### Additional Modal Metadata
The enriched catalog has `tmdb.id` for 3,709 items but no detail beyond poster, overview, and videos. Need to discuss whether to pre-enrich the catalog or call TMDB API live for:
- Cast with headshots
- Key crew (director, cinematographer, composer)
- Runtime, genres
- Ratings (Metacritic, IMDB, Rotten Tomatoes)

This data would populate the "More from the Knowledge Graph" expanded section in the catalog modal.

---

## Full Commit Log (March 28-30, 2026)

| Hash | Time | Description |
|------|------|-------------|
| `c227c56` | Sat 11:40 AM | Version bump to v1.8.6, badge + version tracker created |
| `571e111` | Sat 12:01 PM | Merge Justin's harvester gate fix (4 commits, -438 lines) |
| `2cac568` | Sun 12:35 PM | Fix modal category chips to match wall tabs |
| `f1b2109` | Sun 12:57 PM | Unify inLib() + inferCategory() fallback |
| `b8eb42d` | Sun 1:22 PM | Shrink simple modal to 748px, 88% centered video |
| `4ecd216` | Sun 2:32 PM | Load enriched catalog, video synopsis, pull-data.sh created |
| `753f80c` | Sun 4:30 PM | Discovery chevron, two tabs, !isDirectVideo gate, cron 3x daily, re-pull catalog with dedup fix |
| `9a11f6c` | Sun 5:45 PM | INTERIM: Discovery card polish, Criterion/HBOMax badges, FILM→MOVIE, remove duplicate RWL strip, chevron direction + text fix |
| `2d62a90` | Sun 8:23 PM | Unify discovery card sizes (120x160), S/M/L wall buttons, wall poster heights |
| `b33092e` | Sun 8:40 PM | Small wall tile 240px (3:4 ratio) |
| `124a1c2` | Sun 10:05 PM | Enriched catalog modal — isolated render path, split panel 70/25, click order fix |
| `3c8aee6` | Sun 10:58 PM | Restore correct 70/25 "Do the Right Thing" proportions |
| `a9f4064` | Sun 11:15 PM | Expand/collapse button with height lock via ref |
| `f91248a` | Sun 11:50 PM | Catalog modal content rows — transactions, KG turndown with ask bar, video thumbnails 156px |

Version tracker update commits: `fbf248b`, `9810988`, `c9cf972`, `6172790`, `1f904b0`, `187f210`, `d23441e`, `511b429`, `8faab70`, `2eec533`

---

## Rollback Points

- **Pre-merge:** `c227c56` (v1.8.6 badge only, before any code changes)
- **Pre-catalog-modal:** `b33092e` (wall tile fix, everything before the enriched modal work)
- **v1.8.5 stable:** `31f26c1` (available on port 5173 for comparison)
