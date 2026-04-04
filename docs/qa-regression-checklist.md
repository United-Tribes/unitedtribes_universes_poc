# UnitedTribes POC — QA Regression Checklist

> Run before every push. Add new tests when bugs are fixed.
> Last updated: Apr 4, 2026 (v1.9.7.3)

## How to use
1. Clear discovery cache: `localStorage.removeItem("ut_discovery_cache")` in console
2. Hard refresh: Cmd+Shift+R
3. Run through each section below
4. Mark pass/fail. If something fails, note the version and screenshot.

---

## 1. Headline Direction

| Test | Universe | Query | Expected Headline | Fixed in |
|------|----------|-------|-------------------|----------|
| 1.1 | Blue Note | "Which Blue Note albums influenced hip-hop?" | "How Blue Note Records Influenced Hip-hop" (NOT "How Hip-hop Shaped Blue Note Records") | e5783c8 |
| 1.2 | Patti Smith | "How did Patti Smith influence punk?" | Should NOT say "How punk Shaped Patti Smith" | e5783c8 |
| 1.3 | Blue Note | "How did Thelonious Monk influence Blue Note?" | "How Thelonious Monk Shaped Blue Note Records" (inbound influence, should NOT be flipped) | 45b4c37 |

## 2. Modal Routing — Person Entities

| Test | Universe | Action | Expected | Fixed in |
|------|----------|--------|----------|----------|
| 2.1 | Gerwig | Click "Saoirse Ronan" entity link in response | Person modal (simple mode, KG data, videos). NOT film modal. | e5783c8 |
| 2.2 | Gerwig | Click "Greta Gerwig" entity link | Person modal. NOT documentary modal. | e5783c8 |
| 2.3 | Pluribus | Click "Rhea Seehorn" entity link | Person/cast modal | e5783c8 |
| 2.4 | Pluribus | Click "Vince Gilligan" entity link | Person/creator modal | e5783c8 |

## 3. Modal Routing — Films & Books (should still work)

| Test | Universe | Action | Expected | Fixed in |
|------|----------|--------|----------|----------|
| 3.1 | Pluribus | Click "Invasion of the Body Snatchers" | Film modal with trailer + poster | — |
| 3.2 | Patti Smith | Click "Just Kids" | Book modal with cover | — |
| 3.3 | Gerwig | Click "Little Women" | Film modal | — |

## 4. Modal Routing — Albums & Soundtracks

| Test | Universe | Action | Expected | Fixed in |
|------|----------|--------|----------|----------|
| 4.1 | Sinners | Click Ludwig Goransson score album from Discover | Album modal with Spotify/tracklist. NOT film modal. | 9bb8a2b |
| 4.2 | Pluribus | Search "Pluribus" in Discover → click soundtrack album | Album modal. NOT TV series modal. (Note: header may briefly show TV series before harvester loads — known structural issue) | e5783c8 |
| 4.3 | Blue Note | Click any Blue Note album | Album modal with Spotify player + tracklist | — |

## 5. Search & Discover

| Test | Universe | Action | Expected | Fixed in |
|------|----------|--------|----------|----------|
| 5.1 | Any | Search "lady bird" | Results show. No duplicate "Ladybird"/"Lady Bird" by same creator. | Catalog dedup pending |
| 5.2 | Any | Search "the sopranos" | Results show with thumbnails (some may 404 — known issue) | — |
| 5.3 | Any | Search for an album that exists in artist-albums | Should open album modal with Spotify, not simple mode | 9bb8a2b |

## 6. Library / My Stuff

| Test | Universe | Action | Expected | Fixed in |
|------|----------|--------|----------|----------|
| 6.1 | Any | Click [+] on one "Lady Bird" card in Discover | Only that card should check. Other same-titled cards should NOT auto-check. | Structural fix pending |
| 6.2 | Any | Save an item → go to My Stuff wall | Thumbnail matches the item you saved, not a same-titled item | Structural fix pending |
| 6.3 | Any | Save a song → go to My Stuff | Song appears with correct artist and category | — |

## 7. Podcast Routing

| Test | Universe | Action | Expected | Fixed in |
|------|----------|--------|----------|----------|
| 7.1 | Any | Click a podcast in Discover video results | Podcast modal with artwork, NOT film modal | 9bb8a2b |
| 7.2 | Any | Podcast in enriched catalog discovery section | Shows podcast artwork, plays audio | 56f14c0 |

## 8. Follow-up Questions

| Test | Universe | Action | Expected | Fixed in |
|------|----------|--------|----------|----------|
| 8.1 | Any | Click a follow-up chip below AI response | Chip text populates inline ask input + focuses it | 1804830 |
| 8.2 | Any | Type in inline ask bar → click Ask button | Question submits and response appears | 1804830 |

## 9. Data Display

| Test | Universe | Action | Expected | Fixed in |
|------|----------|--------|----------|----------|
| 9.1 | Blue Note | Ask any question | Response shows with entity links, citations | — |
| 9.2 | Pluribus | Go to Episodes screen | 9 episodes display with correct titles/themes | bfb9722 |
| 9.3 | Any | Check version badge (bottom of response or settings) | Shows current version number | — |

---

## Known Issues (not yet fixed)

| Issue | Description | Status |
|-------|-------------|--------|
| Podcast thumbnail in Discover cards | Some podcast cards show wrong thumbnail | Open — needs JD discussion |
| Library key collisions | Same-titled items share library key (e.g. "Lady Bird" x3) | Structural refactor planned |
| Modal type guessing | Modal receives string name, guesses type via detectEntityType | Structural refactor planned |
| Catalog spacing duplicates | "Ladybird" vs "Lady Bird", "Cast Away" vs "Castaway" — 52 groups | Catalog dedup fix pending |
| YTA proxy 500 errors | localhost YTA search returns 500 repeatedly, no backoff | Open |
| Build script hang | build-content-catalog.mjs hangs processing 830 video folders | Needs investigation |

---

## Adding New Tests

When you fix a bug:
1. Add a test row to the relevant section above
2. Include the commit hash in "Fixed in"
3. Describe the expected behavior precisely enough that someone else can verify
