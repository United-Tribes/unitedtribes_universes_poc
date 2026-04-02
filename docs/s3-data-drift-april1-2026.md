# S3 Data Drift Report — April 1, 2026

## Summary

Multiple regressions in v1.8.7/v1.8.8 traced to S3 data changes breaking assumptions the app code relies on. The app depends on specific entity key casing, entity presence, and field structures in the S3 data. When the harvester pipeline changes these, the app breaks silently.

---

## Issue 1: Entity Key Casing Changed (BLOCKING)

**Impact:** All queries to Sinners, and potentially other universes, hang at "Mapping cross-media connections" and never complete.

**Root cause:** The app uses `UNIVERSE_ANCHORS` to check if universe data is loaded:
```javascript
const UNIVERSE_ANCHORS = {
  pluribus: "Pluribus",
  bluenote: "Blue Note Records",
  sinners: "Sinners",
  pattismith: "Patti Smith",
  gerwig: "Greta Gerwig"
};
```

ThinkingScreen waits for `entities["Sinners"]` to exist before firing the broker API call:
```javascript
const anchorName = UNIVERSE_ANCHORS[selectedUniverse] || "Pluribus";
if (!entities || !entities[anchorName]) return; // BLOCKED HERE
```

**What changed on S3:** `sinners-universe.json` now has `"sinners"` (lowercase) as the anchor entity key. Previously it was `"Sinners"` (capitalized). The check `entities["Sinners"]` returns undefined because the key is now `"sinners"`.

**Evidence:**
```
5173 (working): entities["Sinners"] → exists
5174 (broken):  entities["Sinners"] → undefined
                entities["sinners"] → exists
```

**Fix needed (Justin):** Either:
1. Keep entity key casing consistent across harvester runs — `"Sinners"` not `"sinners"`
2. Or confirm this is intentional and we'll make the app case-insensitive

**Fix needed (app):** Make anchor lookup case-insensitive as a defensive measure:
```javascript
if (!entities || (!entities[anchorName] && !entities[anchorName.toLowerCase()])) return;
```

**Check ALL universes** — are other anchor entities also changing case?

---

## Issue 2: Hotel Chelsea Dropped and Restored

**Impact:** Clicking "The Hotel Chelsea" on Patti Smith Artists & The Circle gave a blank screen.

**Root cause:** `pattismith-universe.json` on S3 was missing "The Hotel Chelsea" entity entirely. It existed in the v1.8.6 data on 5173.

**Resolution:** Justin restored it on Apr 1 with `type: "place"`, aliases `["Hotel Chelsea", "Chelsea Hotel", "The Chelsea"]`. Our S3 pull picked it up. We also have a code-level LOCAL_ENTITY_OVERRIDES fallback that would catch this.

**Question for Justin:** Was the removal intentional, or did a harvester re-run drop it? If the latter, what prevents it from happening again to other entities?

---

## Issue 3: Pluribus Episodes Dropped

**Impact:** Pluribus Episodes page shows "0 episodes" instead of 9.

**Root cause:** `pluribus-response.json` on S3 has `"episodes": []` (empty array). The working v1.8.6 data on 5173 has all 9 episodes.

**Fix applied:** Copied episodes array from 5173's data. This is a data patch — it will be overwritten on next S3 pull if the S3 data still has empty episodes.

**Question for Justin:** Were episodes intentionally removed from pluribus-response.json? The editorial episode data (titles, directors, writers, themes, key moments) was hand-curated — losing it would be significant.

---

## Issue 4: Enrichment Numbers Fluctuating

Each S3 pull shows different enrichment counts:

| Date | Total | YouTube | TMDB | Spotify | Unenriched |
|------|-------|---------|------|---------|------------|
| Mar 29 | 16,267 | 6,337 | 3,709 | 9,846 | 2,353 |
| Mar 30 | 16,018 | 7,580 | 3,571 | 9,873 | 1,301 |
| Mar 31 | 14,427 | 6,545 | 3,379 | 9,012 | 1,054 |
| Apr 1 | 14,427 | 6,107 | 3,378 | 8,912 | 1,091 |

YouTube enrichment dropped by ~1,500 between Mar 30 and Apr 1. Spotify dropped by ~900. Total items dropped by 1,840. Is this cleanup/dedup, or are items being lost?

---

## Recommendations

1. **Entity key casing must be stable.** If `"Sinners"` changes to `"sinners"`, the app breaks. Either enforce consistent casing in the harvester, or add a casing normalization step.

2. **Don't remove entities without notice.** Hotel Chelsea disappearing broke a hardcoded UI element. The app has featured entity cards (Patti Smith, Robert Mapplethorpe, Hotel Chelsea) that depend on specific entities existing.

3. **Don't empty episodes.** The episode data is editorial — it was hand-curated, not auto-generated. Losing it in a pipeline run is destructive.

4. **Consider a manifest/changelog.** A small JSON file on S3 listing what changed in each data update would help us detect regressions before they hit users.
