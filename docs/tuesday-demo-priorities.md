# Tuesday Demo Priorities — UMG Meeting March 17, 2026

**Living document — add items as they come up. This feeds the version tracker.**

---

## Must Have for Tuesday

### 1. SoundtrackModal Port (from SML)
- Port `SoundtrackModal.tsx` (831 lines) from `~/smart-media-logger/src/components/right-pane/`
- Two-tab player: Original Score / Music From
- Split layout: video player (60%) + scrollable track listing (40%)
- Previous/Next navigation, "Track 2 of 20" indicator
- Heart/favorite per track → My Stuff
- Edit/override playlist URLs for tuning bad matches (small cog icon)
- VEVO/official channel priority in YouTube search scoring
- Add Spotify as third tab option
- YouTube playlist API for full album playback (not single tracks)

### 2. Blue Note Store E-Commerce
- **Level 1 for demo:** Hardcode links to store.bluenote.com product pages for key albums
- Purchase button: "Buy from Blue Note · $39.98 · Tone Poet Vinyl" with Blue Note badge
- **Tone Poet releases are a discovery point** — YTA has analyzed Tone Poet videos, so discovery → Tone Poet vinyl → purchase is a complete loop
- Key albums: Blue Train, Moanin', Genius of Modern Music (Tone Poet series)
- URLs from V1 KG app already exist
- Tells UMG: "we drive commerce to YOUR store"
- Level 2 (post-demo): scrape/API for dynamic pricing & availability
- Level 3 (partnership): affiliate links or direct UMG e-commerce integration

### 3. Tour Dates
- Get live tour/event data into the app
- Show upcoming shows for Blue Note artists
- Purchase/ticket links

### 4. Social Integration
- Social media presence/feeds for Blue Note artists
- Link to official accounts

### 5. Premium Articles & Publications
- The New Yorker profiles (purchasable $0.49–$0.99)
- The New York Times "5 Minutes That Will Make You Love" series (Art Blakey, Sonny Rollins, etc.)
- Feature these as purchasable content in the modal RWL strip with publication badges
- NYT article illustrations (Dante Zaballa) are visually stunning — show them

### 6. Brittany Howard — Cross-Universe Artist
- UMG artist who crosses between Blue Note and Sinners universes
- Must be wired as a cross-universe entity for the demo
- Demonstrates the platform connecting UMG catalog across different content universes

---

## Important But Can Ship After Tuesday

### State Persistence
- Reload snaps back to Pluribus Cast & Creators — demo killer
- Must fix before any live demo where someone might refresh

### Phase 2A Remaining
- 2A.5: Duplicate influences (every influence appears twice)
- 2A.6: Duplicated bio text (hero bio = About section) — partially fixed
- 2A.8: Follow-up chips position
- 2A.9: Greta Gerwig creator spotlight (Baumbach → Gerwig)
- 2A.10: External ↗ arrows on sources → inline playback (deferred to modal)

### Album Modal Polish
- Warm palette (no clinical white)
- Add to My Stuff button matching Pluribus pattern

---

## Ideas to Discuss at UMG Meeting

- Blue Note Store direct integration (Level 3 — affiliate/partnership)
- Tone Poet series as curated discovery path (vinyl → video analysis → purchase)
- Cross-universe music discovery (Brittany Howard: Sinners ↔ Blue Note)
- Premium article partnerships (NYT, New Yorker, Jazzwise)
- Tour/live event ticket integration

---

## Notes
- This is a living document. Add items anytime.
- Version tracker links to this file.
- Each item that gets built should be moved to a "Done" section with commit hash.
