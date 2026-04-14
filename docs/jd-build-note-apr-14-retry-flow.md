# JD Build Note — April 14, 2026 (v1.9.18JH)

**Branch:** `justin/apr-14-retry-flow-fixes` (push pending)
**Base:** `8956112` (your v1.9.18 close-out)
**Commits:** 4 (badge bump + 3 fix commits)
**Badge:** `v1.9.18JH · 29c77c5 · Apr 14, 2026 7:20 AM`
**Status:** Ready for review — extends your v1.9.18 with retry-flow correctness fixes you asked for review on, plus a copy fix and one data normalization

---

## Summary

Five retry-flow correctness fixes responding to your "could use a second set of eyes on the retry flow" ask, plus a CachePanel copy fix Justin spotted via screenshot, plus a one-time normalization of `sinners-universe.json` you flagged as having a noisy 3,500-line diff.

| Commit | Category | Scope |
|--------|----------|-------|
| `fb374f2` | Fix (5 bundled) | Retry-flow correctness — type_override mount, null cleanup, lock, orphan cleanup |
| `e240f43` | Fix | CachePanel copy "this album" → "this item" for non-album modals |
| `244b0ef` | Chore (data) | Normalize sinners-universe.json encoding to raw UTF-8 |
| `47064d8` | Chore | Bump BUILD_VERSION to v1.9.18JH |

---

## Retry-flow review findings (`fb374f2`)

You asked for a second set of eyes on the State C onClick handler. The review surfaced 5 issues across both the click handler and the retry-on-mount useEffect. All are now fixed in this commit.

### 1. type_override silent black hole on mount

**Problem:** `addToPendingQueue` writes `{entityName, field: "type_override"}` to `ut_s3_push_pending` on failure (e.g. when a CachePanel MOVIE/DOC dropdown save can't reach Lambda). But the retry-on-mount useEffect at App.jsx:25942 only had branches for `yt_override` and `soundtrack_override`. A `type_override` entry that failed yesterday:

- Was not re-queued on next mount (the auto-retry chain skipped it silently)
- Was not in `s3PushFailedRef` (the Set starts empty and only populates from current-session failures)
- Therefore was invisible to the ⚠ Retry button
- Stayed in `ut_s3_push_pending` forever

Since your CachePanel dropdown now uses MOVIE/DOC labels, every override through that path is a `type_override`. Over weeks this would silently drift S3 state.

**Fix:** Added the missing `else if (p.field === "type_override")` branch to the retry-on-mount useEffect, mirroring the `yt_override` shape but reading `ut_type_overrides[entityName]`.

### 2. Failed set didn't reflect prior-session failures on mount

**Problem:** Same useEffect — `s3PushFailedRef` is `useRef(new Set())` and starts empty. The retry-on-mount loop re-queued entries via `queueAutoBakePush` (going through the 2-second debouncer), but the ⚠ Retry counter showed `✓ Synced` until the first re-failure. Cross-session pending state was invisible until something failed *again* this session.

**Fix:** Added a seed loop before the existing re-queue loop. Every entry in `ut_s3_push_pending` is added to `s3PushFailedRef` on mount. Successful retries clear via `clearFromPendingQueue` in `runS3PushBatch`'s success path. Re-failures stay put via `addToPendingQueue`. Counter is now honest from the first second.

### 3. Stuck entries when local value is null (click handler)

**Problem:** Retry onClick reads the latest localStorage value before pushing. If the value was deleted between save attempt and retry click (user cleared override, or some other state change), the inner check `if (value != null && pushOverrideNow)` skips silently and the entry stays in `s3PushFailedRef` and `ut_s3_push_pending` forever. Counter never decrements; clicking again does nothing.

**Fix:** Added `else if (clearFromPendingQueue)` branch — when value is null, call `clearFromPendingQueue(entityName, field)` to un-track in both places. Helper plumbed into LibraryScreen props (one new prop, three sites: signature line, render call, use site).

### 4. Concurrency race — retry onClick vs. runS3PushBatch

**Problem:** The retry onClick didn't respect `s3PushRunningRef`. If a user clicked ⚠ Retry while the 2-second debouncer was draining a batch, both code paths POST'd in parallel — violating design doc v3 §5.6 ("POSTs are NEVER parallel" because the Lambda does read-modify-write on overrides.json).

The Bug #2 fix made this more likely to surface because seeded prior-session entries flow through the debouncer; user could click during that drain.

**Fix:** Wrapped the retry onClick body in the same re-entrance lock as `runS3PushBatch`:

```js
if (s3PushRunningRef.current) {
  console.log("[Retry] deferred — batch in progress");
  return;
}
s3PushRunningRef.current = true;
try { /* existing loop */ }
finally { s3PushRunningRef.current = false; }
```

Tested with 8 rapid clicks during a batch — first click takes the lock, all subsequent clicks log `[Retry] deferred — batch in progress` and bail cleanly.

### 5. Orphan `{_entityName}`-only soundtrack key cleanup (both paths)

**Problem:** Discovered while testing #3. A `soundtrack_overrides_X` localStorage key containing only `{_entityName: "X"}` (no real `score`/`music`/`*_spotify` fields) is meaningless data. The retry-on-mount useEffect's check `if (val && Object.keys(val).length > 0)` evaluated this as truthy (the `_entityName` key counts as length 1), so it stripped `_entityName` and pushed `pushBody = {}` to S3 as a "successful" empty push. Counter went to ✓ Synced, but the orphan localStorage key remained AND empty payloads polluted shared state.

**Fix:** In both the retry onClick and the retry-on-mount useEffect:
- Strip `_entityName` *before* the emptiness check so `Object.keys(pushBody).length` is the real signal
- When empty: `localStorage.removeItem(key)` to clear the orphan AND `clearFromPendingQueue` to stop tracking
- No POST is made

Result: `s3PushFailedRef` and `ut_s3_push_pending` and `localStorage` all converge to the same truth ("no override exists for this entity").

---

## Investigated but NOT a bug

**Bug #4 — soundtrack_override key normalization fragility.** I worried that the retry handler's transform (`entityName.toLowerCase().replace(/\s+/g, "_")`) might diverge from the writer sites' transforms, causing the retry to read the wrong key. Grepped all 12 forward-construction sites across App.jsx + SoundtrackPlayer.jsx — **all 12 use the identical transform**. Symmetric, not a bug. Closed without action.

There IS a related minor concern: two reverse-transform sites (App.jsx:25459 and :25803) do `k.slice(21).replace(/_/g, " ")` to recover the entity name from a key, which is lossy (loses original casing). Only fires when `val._entityName` metadata is absent. Not a retry-flow bug, but worth knowing if you ever see drift in auto-bake `entityName` casing.

---

## CachePanel copy fix (`e240f43`)

Justin sent a screenshot of Moonage Daydream's cog showing "No cached data. Close and reopen this **album** to fetch fresh." and "Clear cache for this **album**" button. CachePanel renders on any modal type (movie, doc, song, book, album), so "album" leaked when the modal wasn't an album.

Both literals at App.jsx:1517 + 1526 changed to "this **item**". Pure copy. No behavior change.

---

## Sinners JSON normalization (`244b0ef`)

You flagged this in your v1.9.18 note: "your sinners-universe.json commit is a 3,568-line diff because your tooling appears to have run a pretty-print reformat over the whole file." I investigated.

**Root cause:** The Apr 13 a900213 commit was made via a Python `json.dump()` call that didn't pass `ensure_ascii=False`. Default Python behavior escapes every non-ASCII char as `\uXXXX`:
- `—` → `\u2014`
- `👤` → `\ud83d\udc64`
- `ö` → `\u00f6`
- `🎵` → `\ud83c\udfb5`

The other 4 universe JSONs (bluenote, gerwig, pattismith, pluribus) are all stored as raw UTF-8 (zero escape sequences). Sinners drifted as the only outlier.

**Fix:** Re-emitted sinners-universe.json with `json.dump(data, f, ensure_ascii=False, indent=2)`. Verified with `json.load(before) == json.load(after)` — the parsed objects are identical, entity count unchanged at 42. The diff is purely encoding (1,783 lines on each side) — no semantic content changed.

**Recurrence prevention:** Added a permanent rule to my own session memory: never use Python `json.dump` without `ensure_ascii=False` on universe JSONs. Future edits via the Edit tool preserve raw UTF-8 bytes natively.

---

## Things I noticed but did NOT change

These are observations from the review you might want to consider separately:

### Hardcoded YouTube API keys in client bundle

`YT_PLAYLIST_KEYS` in `src/utils/enrichment.js` ships three API keys to a public S3 site. Anyone viewing source can scrape and burn the quota. SML kept these server-side; your baking system necessarily moved them client-side because the POC has no backend. The 3-key rotation + 10k-units/day each gives plenty of headroom for normal use, but the keys are public and a determined actor could exhaust them. Worth knowing — not necessarily worth fixing if you're comfortable with the trade-off.

### YouTube `mqdefault.jpg` 404s in console

Smoke testing showed ~8 thumbnail 404s for baked playlist videos. `filterDeadTracks` validates upload status, embed status, region restrictions, etc., but doesn't pre-check thumbnail availability. Most likely cause: videos that passed the filter when baked but had thumbnails removed since. Cosmetic (broken-image icon shows for those tiles). Could add a thumbnail-availability check to the filter, or could trigger a re-bake when a thumbnail 404 is detected at render time.

### `[Modal] routing` console spam

Per-modal-open the console shows 30-100 `[Modal] routing: X | hint: Y | resolved: Y` + `Early bailout — enrichedModalItem already set` log lines. Every UniversalModal re-render hits this path; all but the first take the early-bailout. Not a functional bug, but a lot of noise. Consider gating these behind a dev flag or `if (process.env.NODE_ENV !== "production")` check.

### Needle-drops data gap (catalog, not POC)

Sinners (91 needle drops) and OBAA (33) have data; Across the Universe, Bohemian Rhapsody, Moonage Daydream all show `Needle drops: 0` in the UTDataClient log. That's a harvester data gap, not a POC bug — flagging in case it's relevant to your "Featured Discovery on song+soundtrack modals" P0.

---

## Testing done

Each fix was tested individually in the browser with localStorage seed scripts before moving to the next (per `feedback_rigorous_code_analysis.md` rule — no batched untested fixes).

- ✅ Bug #1 type_override mount branch — seeded a `type_override` pending entry, reloaded, observed `[S3 retry] queuing 1 pending pushes`, counter showed ⚠ Retry 1 then auto-retry resolved it
- ✅ Bug #2 null-value cleanup — seeded a stuck entry with no localStorage value, clicked Retry, counter went to ✓ Synced and pending queue verified empty
- ✅ Bug #3 re-entrance lock — seeded 8 pending entries, clicked ⚠ Retry rapidly during the auto-retry batch, console showed 8 `[Retry] deferred — batch in progress` messages, no double-POSTs
- ✅ Bug #5 orphan cleanup — seeded `{_entityName: "OrphanTest"}` only key, reloaded, verified key was silently removed from localStorage AND pending queue cleared, no POST made
- ✅ Bug #4 verification — 12-site grep audit, all use identical transform, closed as non-bug
- ✅ Copy fix — Moonage Daydream cog now reads "this item" in both places
- ✅ Sinners normalization — `json.load(before) == json.load(after)` programmatically verified
- ✅ Yesterday's Apr 13 fixes still work post-merge into v1.9.18 (Moonage Daydream documentary path, Sinners film modal, MOVIE label) — spot-checked at start and end of session, no regression

---

## What's NOT in this branch

Carried forward from your v1.9.18 priorities (still your domain):

- P0 How'd I Get Here? narrow rebuild
- P0 Featured Discovery on song + soundtrack + orphan album modals
- P0 SoundtrackPlayer drawer sizing
- P0 SoundtrackPlayer total visual redesign
- P1 Per-universe default composer
- P1 Album modal header thumbnail on Spotify override
- P1 Soundtrack artist walk in Featured Discovery

And from my own backlog (not started today):

- Item B Phase 2 — OpenLibrary ISBN enrichment (~1,000 books)
- Amazing Grace full fix (thread catalog Spotify album ID into harvester)
- Track B — remove large bundled imports (31MB + 36MB + 4MB)

---

## Cherry-pick guidance

All 4 commits are independent enough to cherry-pick selectively, though they're designed to land as a set:

- **Must-have if any:** `fb374f2` (the 5 retry-flow fixes — they form a coherent fix-set with internal dependencies; landing some without others creates small race windows)
- **Standalone:** `e240f43` (CachePanel copy) — pure cosmetic, safe to cherry-pick alone or skip
- **Standalone:** `244b0ef` (sinners JSON normalization) — pure data, large diff but semantically identical, safe to cherry-pick alone or skip; if you skip you keep the noisy escaped format
- **Last:** `47064d8` (badge bump) — only meaningful if you're taking the work; skip if you're just cherry-picking individual fixes

If you take all 4: branch merges cleanly onto current `jd/design-reskin-v3` HEAD (`8956112`), no expected conflicts.

---

## Questions / issues / comments

The `[Retry] deferred — batch in progress` log line is intentional debug output for now. If you want it suppressed in production, easy follow-up. The lock itself is invisible to the user — the button's three-state UI (✓ Synced / Syncing N... / ⚠ Retry N) just behaves correctly across all the edge cases now.

If you want to reverse-engineer my logic or push back on any of these fixes, ping back. The retry subsystem is yours and I deferred to your design throughout — just patched the gaps.
