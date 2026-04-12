# Build Note — April 12, 2026 (Saturday) — UPDATED

**Version:** `v1.9.16JH · 811b5eb · Apr 12, 2026 1:15 PM`
**Branch:** `justin/apr-12-track-d-full` (POC repo, 8 commits)
**Branch:** `justin/apr-12-harvester-fixes` (harvester repo, 3 commits)
**Base:** `main` (v1.9.16, after your Apr 11 merge)

### Update (1:15 PM): Carol Sturka fictional books restored

The 16 Carol Sturka in-show novels (Bitter Chrysalis, Winds of Wycaro, etc.) were removed in the catalog cleanup pass but have been added back. They're intentional Pluribus content — the KG knows about them and users may search for them. The harvester deny list was also updated to not block them on future catalog rebuilds.

### Legacy override shape — confirmed harmless

Your 6 soundtrack overrides in the old bare-string shape (`"PLxxxxx"` instead of `{type: "playlist", id: "PLxxxxx"}`) will upload as-is during the migration. No normalization happens. This is fine — `resolveSpotifyEmbed()` and SoundtrackPlayer both handle legacy bare strings via back-compat readers. S3 will have both shapes; all readers handle both.

### Pre-merge cleanup (your 3 DevTools commands)

Your analysis was spot-on. Run these before loading the merged code:

```js
// 1. Delete stale long-key Moonage Daydream
localStorage.removeItem('soundtrack_overrides_david_bowie_-_moonage_daydream:_a_brett_morgen_film')

// 2. Delete combining-character Miles Ahead garbage
Object.keys(localStorage).filter(k => k.startsWith('soundtrack_overrides_mil')).forEach(k => { if (k.length > 40) localStorage.removeItem(k) })

// 3. Clear Palo Alto discovery cache (prep for title-collision fix)
const cache = JSON.parse(localStorage.getItem('ut_discovery_cache') || '{}');
delete cache['Palo Alto'];
localStorage.setItem('ut_discovery_cache', JSON.stringify(cache));
```

Then merge and load. Migration will fire, console shows `[Migration] Pushing N local overrides to S3...`.

---

## HEADLINE: Your Spotify Overrides Will Sync to S3

**Action required on first load:** When you pull this branch and load the app, a one-time migration will automatically push all your localStorage overrides (YouTube, type, AND soundtrack/Spotify) to S3. This includes every `soundtrack_overrides_*` entry — your Moonage Daydream fix, any other Spotify album corrections you've made. After this runs, both machines share the same corrections.

**What this means:**
- Your Spotify overrides survive browser clears and machine switches
- The "Share overrides" button now includes soundtrack overrides in the count and upload
- The startup fetch pulls soundtrack overrides from S3 into localStorage on every load
- New saves automatically include `_entityName` metadata for clean round-trip sync

**This answers your P1 #10** ("S3 persistence for user data — open architectural question"). Track D Full IS the answer.

---

## What's in this build (POC repo — 4 commits)

### 1. Track D Full — S3 Overrides Infrastructure

Five new features in the Library gear panel and CachePanel:

**a. Author name input**
- Text input in the Library gear panel toolbar (next to Share overrides button)
- Reads/writes `ut_author_name` localStorage on every keystroke
- Your name appears in the S3 audit log on every override upload and revert

**b. Sync button**
- "Sync" button re-fetches overrides from S3 without page reload
- Shows status: Syncing → Synced (3s) → reset

**c. Override History + Revert UI**
- New collapsible "Override History" section at the bottom of CachePanel (gear icon on any entity modal)
- Click to expand — lazy-loads from S3 log API for that specific entity
- Shows timestamped entries with author, field, old → new value diffs
- "Revert" button on each entry — posts the old value back to S3 AND updates localStorage

**d. One-time migration shim**
- On first load after pulling this branch, pushes all local overrides to S3
- Runs AFTER the S3 → local merge (so you don't re-upload what you just received)
- Guarded by `ut_overrides_migrated` localStorage flag — only runs once
- Serialized POSTs (not parallel) to prevent Lambda read-modify-write race conditions

**e. Soundtrack override S3 sync**
- `_entityName` metadata added to CachePanel Spotify save and SoundtrackPlayer save
- Share button collects all `soundtrack_overrides_*` keys and includes them in upload
- `mergeS3Overrides()` handles `soundtrack_override` field from S3
- History revert supports `soundtrack_override` field

**Infrastructure changes:**
- `OVERRIDES_API` const promoted to module scope (was inside LibraryScreen closure)
- `mergeS3Overrides()` extracted to module-level function (used by startup + Sync button)
- POSTs serialized everywhere (Share button + migration) to prevent data loss from Lambda race conditions

### 2. autoEnrichEntity phantom guard (#10)

Defense-in-depth: the phantom-entity detector from `openPopover` (Apr 9 Sinners fix) is now mirrored in `autoEnrichEntity`. Entities with `type: "person"` + placeholder bio + generic subtitle bypass the person-skip guard and fall through to catalog matching, finding the correct type.

### 3. Catalog data quality cleanup (#14) — 163 fixes

- **16 Carol Sturka fictional entries removed** (Bitter Chrysalis, Winds of Wycaro, etc.)
- **144 description-as-creator fields cleaned** (e.g. `"The Beatles- Paul's song..."` → `"The Beatles"`)
- **2 type fixes**: Baba O'Riley + Won't Get Fooled Again: play → song
- **1 creator fix**: The Godfather: Francis Ford Coppola → Mario Puzo

### 4. Deeper catalog scan (#12) — 555 removals

- **536 no-creator single-source junk entries removed** (LLM video analysis hallucinations)
- **7 same-type film duplicates resolved** (kept higher-source entry)
- **12 garbled person-as-content entries removed** (person names catalogued as songs)
- **1 type fix**: Hey Jude (Compilation Album): song → album
- Catalog: 14,416 → 13,845 items

---

## What's in this build (Harvester repo — 2 commits)

### 5. Sonic data poisoning fix + content catalog deny list

**Sonic fix (entity.mjs):**
- **Removed the anchor OST fallback** that stamped the anchor's soundtrack on ALL entities with no sonic data. This was poisoning 82 entities: 41 sinners (Buddy Guy, Delroy Lindo, Hailee Steinfeld, etc. all had "Sinners (Original Score)") and 41 pattismith (Herman Melville, Charlie Parker had "Outside Society").
- **Tightened the first OST check** to only apply to film/TV entities or the anchor itself. Actors and novelists no longer receive soundtrack data.
- JD's SoundtrackPlayer handles soundtrack lookup at runtime — the assembler fallback was both redundant and harmful.
- **Your Fruitvale Station fix is preserved.** This is the systematic fix for the 40 remaining entities you flagged.

**Content catalog deny list (build-content-catalog.mjs):**
- New `CONTENT_DENY_LIST` with `isDenied()` check in `addContentItem()`
- Blocks known false positives before they enter the master catalog
- Initial entries: Rod Wave "Sinners", Wunmi Mosaku, all Carol Sturka, Patti Smith garbage
- Extensible — add entries as new false positives are discovered

### 6. Place entity handler + Sinners casing + Hotel Chelsea

- **New `place` entity type handler** in assembler — places now get `type=place`, emoji, subtitle from genres, bio from overview. Previously fell through to film handler.
- **Sinners anchor name casing fixed**: `"sinners"` → `"Sinners"` in manifest
- **The Hotel Chelsea restored**: renamed from `"Chelsea Hotel"` (manifest) to match S3/manual-overrides key. Promoted from T3 → T2. Type is now `place` with subtitle "Place · Setting, Landmark".
- **Both sinners + pattismith re-assembled and uploaded to S3**

---

## S3 state after this build

**Overrides (overrides.json):** 6 clean entries — Invasion of the Body Snatchers, Thelonious Monk with John Coltrane, Lady Bird, hive mind, The Times They Are a Changin', Giant Steps. Corrupted "Rolling Stone" entry removed, Lady Bird restored from log.

**Sinners universe:** 42 entities, 0 fallback OST (was 41). Anchor "Sinners" correctly cased.

**Pattismith universe:** 72 entities, 0 fallback OST (was 41). The Hotel Chelsea present as type=place.

---

## Merge notes

- POC branch is off `main` (v1.9.16, your merge). Your v1.9.17-jd-dev work on `jd/design-reskin-v3` is in soundtrack/player/drawer — different code surfaces. Low conflict risk.
- Only shared touch point: `SoundtrackPlayer.jsx` line 349 — 1 line added (`overrides._entityName = title`). If you restructured `handleSaveOverrides`, trivial to resolve.
- CachePanel changes append at the end (Override History section) — your Spotify override section is untouched.

---

## Key files changed

**POC repo:**
| File | What |
|------|------|
| `src/App.jsx` | Track D Full (5 features) + phantom guard + catalog data in enriched-content-catalog.json |
| `src/PluribusComps.jsx` | Mirror of App.jsx |
| `src/components/SoundtrackPlayer.jsx` | 1 line: `_entityName` metadata in save handler |
| `src/data/enriched-content-catalog.json` | 14,416 → 13,845 items (two cleanup passes) |

**Harvester repo:**
| File | What |
|------|------|
| `harvester/lib/assemblers/entity.mjs` | Sonic fix + place handler |
| `harvester/scripts/build-content-catalog.mjs` | Content deny list |
| `data/universes/sinners/manifest.json` | Anchor name casing |
| `data/universes/pattismith/manifest.json` | Hotel Chelsea promote |
| `data/universes/pattismith/enriched.json` | Hotel Chelsea key rename |
| `data/universes/pattismith/overrides.json` | Hotel Chelsea promote |
| `data/universes/pattismith/manual-overrides.json` | Hotel Chelsea type/subtitle |
