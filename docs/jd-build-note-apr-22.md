# Build note — Apr 22, 2026

**Branch**: `justin/apr-21-fixes` (extended from yesterday; not yet pushed at time of writing)
**Badge**: `v1.9.20JH · d1fbfb6 · Apr 22, 2026 9:32 AM`

**Commits today** (on top of yesterday's `d463a38` + `d628d84`):
```
ac2dda9 chore: backfill d1fbfb6 hash into badge constants
d1fbfb6 fix(data): add missing trailer for 'It Must Schwing!' documentary
8b567a7 chore: backfill 26703a5 hash into badge constants
26703a5 fix(data): Acknowledgement yt_id to match Psalm/Pursuance Topic channel
4cd8962 chore: backfill 8e0b45e hash into badge constants
8e0b45e fix(data): Acknowledgement spotify.album_art_url pointed to wrong album
5f4ae6a chore: backfill 47da30b hash into badge constants
47da30b fix(modal+data): song thumbnail fallback via catalog spotify/yt art + delete 'sheets of sound' junk row
89da2c7 chore(data): sync bundled enriched-content-catalog with S3 (Apr 22 fixes)
afdad58 chore: backfill 0521bd6 hash into badge constants
0521bd6 fix(modal): exact-match film catalog lookup in Related tab — Bird→LadyBird regression
```

## Fixes

### 1. `0521bd6` — Bird card opened Lady Bird modal (code fix)
In a full-mode artist modal's **Related** tab, clicking a film card like "Bird" (1988 Eastwood) opened the Lady Bird (Gerwig) modal. Root cause at `App.jsx:5293` — the lookup that picks a catalog row to pass as `catalogItemOverride` was using `.title.toLowerCase().includes(f.title.toLowerCase())`. For short titles, this substring-matched longer titles first: "Lady Bird" matched before "Bird", "Birdman" before "Bird", etc.

Fix: change `.includes()` → exact-match `===`. Matches the pattern already used on line 5289 for poster lookup in the same iteration. Fallback path (onNavigate without override → autoEnrichEntity) still covers cases where bundled `f.title` doesn't exactly match a catalog row title.

**Sibling `.includes()` patterns flagged but not fixed**: lines 15310, 22302, 28102 — same pattern, different code paths, not reproduced yet.

### 2. `47da30b` — Song thumbnails blank on Coltrane Related tab (code + data)
The `entityWorks` card builder at `App.jsx:5332` only ran its catalog lookup for films and albums — songs/compositions fell to `_ewCatalog = null`, so `_ewPoster` had no fallback and the thumbnail slot rendered empty. Added a third branch `_isSongLike` that matches on `song`/`composition`/`track` types and prefers `spotify.album_art_url` or `youtube.thumbnail`.

Same commit also deletes the `sheets of sound` composition row — that's Coltrane's technique name, not a work. Its `spotify.track_id` (5cAwEKmadsW4nCYe9QUvgU) had been mis-linked to "Naima - Mono", so clicking the card opened a song modal playing Naima. Removed from catalog.

**Sibling block at `App.jsx:4303`** (simpler modal variant) has the same film/album-only gap — same fix pattern applies, left for future ship.

### 3. `8e0b45e` — Acknowledgement showed wrong album cover (data)
Harvester mis-matched Coltrane's "Acknowledgement" (A Love Supreme Pt. I) to an `album_art_url` from a different Coltrane album ("John Coltrane and Johnny Hartman" cover). Psalm and Pursuance — also on A Love Supreme — had the correct cover URL. Patched Acknowledgement to match.

### 4. `26703a5` — Acknowledgement video from wrong channel (data)
Psalm/Pursuance pull from "John Coltrane - Topic" (canonical). Acknowledgement was on a user channel (djbuddylovecooljazz). Switched to `vMCHDC2Lurk` ("A Love Supreme, Pt. I – Acknowledgement" on the same Topic channel) so all three sides play from a consistent source.

### 5. `d1fbfb6` — "It Must Schwing!" missing trailer (data)
Documentary modal rendered "No trailer available". TMDB had zero videos for this title. Added `Wz4ZQZWFFqg` (MIFF-hosted trailer) to the catalog row's `youtube` block.

## S3 catalog state
Multiple uploads throughout the session. Current state (14,413 items, down from yesterday's 14,414 after the `sheets of sound` delete):

| Fix | Rows affected |
|---|---|
| Bird film TMDB + YouTube (1988 Eastwood) | 1 |
| Greenwood creator spelling — "Jonny" | 30 |
| Lady Bird song Spotify cleared | 1 |
| `sheets of sound` deleted | 1 |
| Acknowledgement album_art_url corrected | 1 |
| Acknowledgement yt_id → Topic channel | 1 |
| It Must Schwing! trailer added | 1 |

Also: shared overrides API — deleted stray `Bird` soundtrack_override (random "No Fibz by SV" playlist).

## Methodology note — song-row oEmbed audit (morning scan)
Ran a new audit on 1,845 song rows with YouTube video IDs (extended yesterday's film-only scan). Results:
- 645 verified OK
- 250 ambiguous (VEVO/label/soundtrack — multi-artist hosts)
- **22 flagged mismatches**: 3 likely genuine wrong-video bugs (Clair de Lune / We Insist! / Dance of the Infidels — NOT fixed this ship, need per-row verification); 8 name-variant non-issues; 11 composer-vs-performer legit-cover cases
- **928 unavailable videos (50%!)** — deleted/blocked/region-restricted. Separate initiative needed.

Raw audit output: `harvester/data/audit-2026-04-22/song-mismatches.json` + `song-audit-summary.json`.

## Carried forward (still open)
- 3 flagged songs from oEmbed audit awaiting manual verification
- ~928 unavailable-video songs (broad cleanup initiative)
- Sibling `.includes()` patterns at App.jsx 15310/22302/28102
- Sibling entityWorks block at App.jsx:4303 (same film/album-only catalog lookup gap for songs)
- `(title, type)` composite keying refactor (architectural; covers Bird/LadyBird and many cross-type collision classes at root)
- 80 non-creator "Johnny Greenwood" references in `categories`/`sources` text (minor display; scoped out this ship)
- 11 junk "historical-documentation" song rows flagged for future delete (e.g. "1942 marriage records and photos" / creator="Katherine Morgan wedding documentation")
- Bird catalog row `sources`/`categories` still attached to Sinners/Coogler universe (harvester artifact, not visible)
- Broader "song album-art vs actual album" audit — Acknowledgement was surfaced manually; likely more wrong-album mis-matches exist in catalog

## Rollback recipes
- **Catalog revert**: `aws s3 cp harvester/data/audit-2026-04-22/enriched-live.json s3://unitedtribes-visualizations-1758769416/universe-data/enriched-content-catalog.json`
- **Bird override restore**: POST `/v1/overrides` with `entityName=Bird`, `field=soundtrack_override`, `newValue=<old_value from API response body>` (logged)
- **Code fix revert**: `git revert <commit-range>`

## Files modified
```
src/App.jsx                             (5 line changes: Related tab lookup + badge + song thumbnail branch)
src/PluribusComps.jsx                   (mirror)
src/data/enriched-content-catalog.json  (34 row edits + 1 delete)
docs/jd-build-note-apr-22.md            (this file)
```
