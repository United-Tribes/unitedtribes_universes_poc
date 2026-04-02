# Email to Justin — v1.8.7 Build

**Subject:** v1.8.7 on jd/design-reskin-v3 — search, data fixes, bugs to discuss

---

Hey Justin,

Pushed v1.8.7 to `jd/design-reskin-v3` (not main — main still has v1.8.6 patched). Big day of fixes and new features. Need your help on a few data issues.

## How to Pull

```bash
cd ~/Desktop/unitedtribes_universes_poc
git fetch origin
git checkout jd/design-reskin-v3
git pull origin jd/design-reskin-v3
npm install
npm run dev
```

The enriched-content-catalog.json (24MB) and all-video-entity-index.json (38MB) are in the repo now.

## What's New in v1.8.7

### Discover & Add Search in My Stuff
The My Stuff search bar now searches across ALL three data sources:
- **822 videos** from all-video-entity-index (all 5 universes + unassigned)
- **14,427 content items** from enriched content catalog (films, songs, albums, TV, docs, books, poems, etc.)
- **1,148 albums** from artist-albums across all 5 universes

Results show as grid cards in three labeled sections: Videos, Content, Albums. Each card has thumbnail, type badge, [+] to add to library. No result limits — all matches shown. Sorted by relevance (exact title match first, then videoCount descending).

**Your wall items show first** when searching — "My Collection" header at top, then "Discover & Add" below. Search works even with an empty collection.

### Discovery Card Artwork Fix
Discovery chevron cards (Works Discussed / Related Discovery) now use your data explorer's same-title sibling approach for artwork. If "2001: A Space Odyssey" the novel has no poster, it borrows the film's TMDB poster. Matches your data explorer logic exactly.

### Artist Image Fallback
Artists & Legends page now falls back to `artist-albums.json` `image_url` when `universe.json` doesn't have a photo. Gregory Porter, Julian Lage, Gerald Clayton, etc. now show Spotify artist images.

### Spotify Embed Fix
Added `utm_source=generator` to all Spotify embed URLs (was missing from artist, track, and album embeds). Added one-time cache purge on startup to clear stale cached URLs.

### Modal Flicker Fix
Modal stack now saves `enrichedModalItem` alongside `universalModal`. When popping back to a parent modal, both are restored atomically — no intermediate null-frame render that caused YouTube iframes to unmount/remount.

### S3 Data Pipeline
- `pull-data.sh` expanded to pull all ~39 files (added poc-artists, score files, catalog files, enrichment overlays)
- Cron working at 8AM/12PM/7PM (Full Disk Access enabled)
- **Refresh button in My Stuff now fetches directly from S3** via browser `fetch()` — no longer reimports stale local files
- S3 data guide committed at `docs/s3-data-guide-march-31-2026.md`

### Other Fixes
- `inferCategory` moved to App scope (was only in LibraryScreen — caused white screen on any [+] click from modals)
- Film GoldAdd now saves with thumbnail, videoId, category, director — cover art shows on wall
- FILM badge changed to MOVIE throughout
- InputDock hidden on My Stuff screen
- LOCAL_ENTITY_OVERRIDES for Hotel Chelsea (see below)

## Issues to Discuss

### 1. Hotel Chelsea Missing from Patti Smith Universe
"The Hotel Chelsea" entity was in the older `pattismith-universe.json` but is missing from the current S3 version. Was this intentional? We added a code-level override (LOCAL_ENTITY_OVERRIDES) so it survives S3 pulls, but this is a stopgap. The entity page works on v1.8.6 (port 5173) but was blank on v1.8.7 until we patched it.

### 2. Spotify Artist Embeds Not Playing
Artist embeds (`/embed/artist/{id}`) show up but return 403 from Spotify's `connect-state/v1/player/command` when clicking play. Album and track embeds work fine. Same artist embed URLs play perfectly when opened directly in a browser tab — only fails in our iframe. We tried `utm_source=generator`, cache purge, server restart. Some artists play, most don't. Inconsistent.

J.D.'s preference: switch artist modals from Spotify artist embeds to YouTube content (official videos, performances). The artist-albums data has YouTube playlist IDs we could use. Want to discuss approach.

### 3. Soundtrack/Score Data
The enriched catalog has soundtracks and scores but they're not cleanly linked to their parent films. Labeling is inconsistent ("Original Score" vs "Original Motion Picture Soundtrack"). Would be great to have structured fields on film items: `soundtrack_album_id`, `score_album_id`.

### 4. S3 Data Drift
When the cron pulls fresh data from S3, entities that were in older versions can disappear (like Hotel Chelsea). Do you have a changelog or versioning for the S3 data? Would help us detect when entities are added/removed.

### 5. Discovery Strip Film Modals
Film cards in the discovery strip (e.g. "Elevator to the Gallows" from Bitches Brew) still open inside the parent modal instead of spawning the enriched catalog modal. Working on a clean solution.

## Known Bugs (v1.8.7)
- P0: Modal size regression on non-simple modals (Blue Note albums, entity modals affected by simple modal shrink)
- Modal flicker still occasionally occurs (improved but not fully eliminated)
- Search vs wall filter — broad metadata search sometimes surfaces related items user didn't expect
- Some items added from Discover & Add search may not appear on wall immediately

—J.D.
