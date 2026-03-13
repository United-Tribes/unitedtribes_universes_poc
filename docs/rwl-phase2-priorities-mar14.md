# RWL Split Panel — Phase 2 Priorities (Mar 14, 2026)

## What's Done (Phase 1 — commits `696c4ff` + pending)

- Discovery strip → split panel navigation (toggle on/off, gold border highlight)
- Left panel: real trailer embeds from harvester data (10 verified YouTube IDs via `ITEM_TRAILERS`)
- Right panel: identity → branded platform badges → KG description → Go Deeper
- Platform badges use real brand colors (`PLATFORM_BRANDS` map — Apple TV+ black, Prime Video blue, YouTube red, etc.)
- Broker API fires on modal open for item descriptions (`fetchItemDescriptions`)
- Junk filter on broker responses (catches "structured data" / "creative connections" noise)
- `dc-add` buttons consistent everywhere (CSS selector broadened to `.modal-compact .dc-add`)
- `event.stopPropagation` on all right-panel interactions (prevents modal close)
- Tag items UI added to video edit form (reuses existing add-video tag system)
- Edit form pre-populates existing tags from `discussedIn` references

---

## P1 — External Lookup for Tagging (CRITICAL)

**Problem:** `searchTagItems()` only searches local `buildItemIndex()` from `modal-data.json`. Any work not already in the JSON returns "No matches" — e.g., searching "One Battle After Another" finds nothing.

**Solution:** Integrate Smart Media Logger (`~/smart-media-logger/`) which already has TMDB and other external API integrations. This gives us:
- Film/TV lookup by title (TMDB)
- Book/novel lookup
- Music lookup
- Rich metadata (year, creator, type, poster images)

**Steps:**
1. Audit Smart Media Logger's API layer — find the search/lookup endpoints and how they call TMDB
2. Either: (a) run SML as a local service and call its API from universal-modal.html, or (b) extract the relevant lookup code into a lightweight endpoint
3. Wire `searchTagItems()` to call external lookup when local search returns no results
4. Populate new items with real metadata (title, year, creator, type) from the external source

**Why not just paste a TMDB API key?** The modal runs as a static HTML file on port 5179. Direct browser→TMDB calls would expose the key. SML already handles this server-side.

---

## P2 — Trailer Video ID Quality (Grade: C-minus)

**Problem:** Many trailer IDs in `ITEM_TRAILERS` are wrong or low-quality:
- Some are episode clips, not actual trailers
- Some are reviews/discussions about the work, not the work itself
- Several items have `null` (no trailer found)
- The harvester data (`pluribus-universe.json` → `quickViewGroups[].label === "Trailers"`) was the source, but it's not always accurate

**Steps:**
1. Audit each `ITEM_TRAILERS` entry — verify the YouTube ID actually shows a real trailer for that specific title+year
2. For items with `null`, try Smart Media Logger's YouTube trailer lookup (if available) or manual search
3. For items where the harvester gave wrong IDs, replace with correct ones
4. Consider adding a fallback: if no trailer, show a relevant clip from `discussedIn` instead of a blank poster

**Current entries needing verification:**
- `invasion of the body snatchers-1956` → `pNJB363yql8` (verify: is this the 1956 trailer?)
- `the body snatchers-1955` → same ID as 1956 film (this is the novel — should it have a trailer at all?)
- `childhood's end-1953` → `ouSRDzMFbVE` (Syfy miniseries trailer — right adaptation?)
- `cell-2006` → `BCns4w3GA9A` (2016 film trailer for a 2006 novel — intentional?)
- `third from the sun-1960` → `bYBOIPsoEAw` (labeled "The Unlikely Escape — S1E14" — is this right?)
- `eye of the beholder-1960` → `P8yHuDNPRIc` (labeled "Paramount+ Clip" — not a trailer)
- `the invaders-1961` → `sxmyh-x1MnQ` (labeled "Episode Review" — not a trailer)
- Items with `null`: `the human termites-1929`, `the purple cloud-1901`, `who goes there-1938`, `the midwich cuckoos-1957`, `the puppet masters-1951`

---

## P3 — Broker API Description Quality

**Problem:** Even with the rewritten prompt and junk filter, broker API descriptions are inconsistent:
- Sometimes returns generic "this is a classic work" filler
- Sometimes returns structured data / JSON despite explicit instructions not to
- Prompt asks "Why should someone interested in [entity] check out [item]?" — good framing, but results vary

**Steps:**
1. Test current prompt against all items in Body Snatchers + Twilight Zone entities
2. Log which items get good vs. bad descriptions
3. Iterate on prompt — may need to include more context (e.g., the item's `note` from modal-data.json, the entity's description)
4. Consider a second pass: if first response is junk (caught by filter), retry once with a more explicit prompt
5. Consider caching good descriptions in localStorage so they don't re-fetch every time

---

## P4 — Platform Pricing (Placeholder $1.99 Everywhere)

**Problem:** All platform badges show "$1.99" — this is a placeholder. Real pricing varies by platform and content type.

**Options:**
- Manual pricing per item (labor-intensive, goes stale)
- API lookup (most platforms don't have public pricing APIs)
- Remove prices entirely and just show platform + action ("Rent", "Stream", "Buy")
- Show price ranges ("From $3.99") based on content type

**Recommendation:** Defer until we decide whether commerce is real or illustrative for the POC. If illustrative, remove specific prices and just show actions.

---

## P5 — Unstaged App.jsx Change

There's a separate unstaged change in `src/App.jsx` (SOURCES badge styling tweak) that is NOT part of RWL work. Don't accidentally commit it with RWL changes. Handle separately.

---

## File Reference

- **Universal modal:** `docs/universal-modal.html`
- **Modal data:** `docs/modal-data.json`
- **Harvester data (trailers):** `src/data/pluribus-universe.json` → `quickViewGroups[].label === "Trailers"`
- **Smart Media Logger:** `~/smart-media-logger/`
- **Version tracker:** `pocv2-jd-design-reskin-versions.html`
