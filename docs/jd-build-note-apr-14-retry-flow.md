# JD Build Note — April 14, 2026 (v1.9.18JH)

**Branch:** `justin/apr-14-retry-flow-fixes`
**Base:** `8956112` (your v1.9.18 close-out)
**Head:** `7ba242c`
**Commits:** 14 total (8 added since the morning push)
**Badge:** `v1.9.18JH · 897c82b · Apr 14, 2026 9:36 AM`
**Status:** Ready for review — all of today's work consolidated

---

## Summary

Full day of work on top of your v1.9.18. Four themes:

1. **Retry-flow correctness fixes** (the review you explicitly asked for in your v1.9.18 note)
2. **Modal tab flicker bug** (JD-reported: "Featured Discovery" tab snapping back to Related) — traced back to `syncTick` re-rendering the entire App tree 2x/sec
3. **Catalog data quality** — systematic audit of type misclassifications and wrong-TMDB matches
4. **Small cosmetic fixes** — CachePanel copy, sinners JSON encoding normalization

| Commit | Category | Scope |
|---|---|---|
| `7ba242c` | Chore | Refresh v1.9.18JH badge date after all today's work |
| `dcf67d6` | Data | Reclassify 42 songs mistyped as film, null 22 tainted youtube IDs |
| `c05ed83` | Data | Reclassify 3 musical entries (Grease, Sound of Music, Overture) |
| `6365428` | Data | Reclassify 17 catalog type misfits (novels-as-films, episodes-as-songs) |
| `6a79ad9` | Data | Correct 2 misclassified film entries (Wolf of Wall Street, LA Confidential) |
| `831ba91` | Fix | Add openLibrary.cover_url to book poster fallback chain |
| `d4b0db3` | Perf | Scope syncTick re-render to LibraryScreen (eliminates App-tree 2Hz heartbeat) |
| `bf513a7` | Refactor | Separate new-entity UI resets from data-fetch useEffect |
| `6c14fdc` | Fix | Stabilize artistAlbumsData via useMemo (fixes tab flicker) |
| `d8430ff` | Docs | Earlier build note (superseded by this one) |
| `47064d8` | Chore | Initial v1.9.18JH badge bump (superseded by `7ba242c` refresh) |
| `244b0ef` | Data | Normalize sinners-universe.json encoding to raw UTF-8 |
| `e240f43` | Fix | CachePanel copy "this album" → "this item" for non-album modals |
| `fb374f2` | Fix | Retry-flow correctness (5 bundled retry-flow fixes you asked to review) |

---

## Part A — Retry-flow review findings (`fb374f2`)

You asked for a second set of eyes on the State C onClick handler in the gear-panel sync button. Review surfaced 5 issues across both the click handler and the retry-on-mount useEffect. All fixed in this commit.

### 1. type_override silent black hole on mount

`addToPendingQueue` writes `{entityName, field: "type_override"}` to `ut_s3_push_pending` on failure. But the retry-on-mount useEffect at App.jsx:25942 only had branches for `yt_override` and `soundtrack_override`. A `type_override` entry that failed yesterday:

- Wasn't re-queued on next mount (auto-retry chain skipped it)
- Wasn't in `s3PushFailedRef` (Set starts empty, only populates from current-session failures)
- Was invisible to the ⚠ Retry button
- Stayed in `ut_s3_push_pending` forever

Since your CachePanel dropdown now uses MOVIE/DOC labels, every override through that path is a `type_override`. Fix: added the missing branch, mirroring the yt_override shape but reading `ut_type_overrides[entityName]`.

### 2. Seed s3PushFailedRef from pending queue on mount

`s3PushFailedRef` is `useRef(new Set())` — empty each session. The retry-on-mount loop re-queued entries via `queueAutoBakePush` (through the 2-sec debouncer), but the ⚠ Retry counter stayed at 0 until the first in-session re-failure. Cross-session pending state was invisible until something failed again.

Fix: added a seed loop before the re-queue loop. Every pending entry is added to `s3PushFailedRef` on mount. Successful retries clear via `clearFromPendingQueue` in `runS3PushBatch`'s success path. Counter is now honest from the first second.

### 3. clearFromPendingQueue on null retry value

Retry onClick reads the latest localStorage value before pushing. If the value was deleted between save attempt and retry click, the inner check `if (value != null && pushOverrideNow)` silently skipped — entry stuck in both `s3PushFailedRef` and `ut_s3_push_pending` forever.

Fix: added `else if (clearFromPendingQueue)` branch — when value is null, un-track via `clearFromPendingQueue(entityName, field)`. Helper plumbed into LibraryScreen props.

### 4. Re-entrance lock in retry onClick

Retry handler didn't respect `s3PushRunningRef`. A user click during the 2-sec auto-retry batch drain would fire parallel POSTs — violating design doc v3 §5.6 ("POSTs are NEVER parallel" because the Lambda does read-modify-write on overrides.json).

Fix: wrapped retry onClick body in the same re-entrance lock as `runS3PushBatch`. Second click during a batch logs `[Retry] deferred — batch in progress` and bails. Tested with 8 rapid clicks; all but first bail cleanly.

### 5. Orphan `{_entityName}`-only soundtrack key cleanup (both paths)

Discovered while testing #3. A `soundtrack_overrides_X` localStorage key containing only `{_entityName: "X"}` (no real override fields) is meaningless. The retry-on-mount useEffect's check `if (val && Object.keys(val).length > 0)` treated this as truthy (the `_entityName` key counts as length 1), stripped `_entityName` out, and POST'd `{}` to S3 as a "successful" empty push. Counter went to ✓ Synced, orphan localStorage key remained, and empty payloads polluted shared state.

Fix: in both the retry onClick and retry-on-mount useEffect:
- Strip `_entityName` *before* the emptiness check so `Object.keys(pushBody).length` is the real signal
- When empty: `localStorage.removeItem(key)` + `clearFromPendingQueue` to un-track
- No POST made

## Investigated but NOT a bug — Bug #4

Worried that the retry handler's key-construction transform (`entityName.toLowerCase().replace(/\s+/g, "_")`) might diverge from writer sites' transforms. Grepped all 12 forward-construction sites across App.jsx + SoundtrackPlayer.jsx — **all 12 use the identical transform**. Symmetric. Closed as non-bug.

---

## Part B — CachePanel copy fix (`e240f43`)

Justin sent a screenshot of Moonage Daydream's cog showing "No cached data. Close and reopen this **album** to fetch fresh." and "Clear cache for this **album**" button. CachePanel renders on any modal type (movie, doc, song, book, album), so "album" leaked when the modal wasn't an album.

Both literals at App.jsx:1517 + 1526 changed to "this **item**". Pure copy. No behavior change.

---

## Part C — Sinners JSON UTF-8 normalization (`244b0ef`)

You flagged this in your v1.9.18 note: "your sinners-universe.json commit is a 3,568-line diff because your tooling appears to have run a pretty-print reformat over the whole file." Investigated.

**Root cause:** the Apr 13 a900213 commit was made via a Python `json.dump()` call without `ensure_ascii=False`. Default Python escapes every non-ASCII char as `\uXXXX`. The other 4 universe JSONs are raw UTF-8, so Sinners drifted.

**Fix:** re-emitted sinners-universe.json with `json.dump(data, f, ensure_ascii=False, indent=2)`. Verified `json.load(before) == json.load(after)` — parsed objects identical, 42 entities. Diff is purely encoding (1,783 lines on each side).

**Recurrence prevention:** permanent rule added to my session memory — never use Python `json.dump` without `ensure_ascii=False` on universe JSONs. Future edits via the Edit tool preserve raw UTF-8 bytes natively.

---

## Part D — Modal tab flicker bug (`6c14fdc` + `bf513a7` + `d4b0db3`)

JD reported: clicking "Featured Discovery" on the Just Kids book modal would show the tab as active for a split second, then snap back to Related. The console was also spamming `[Modal] routing: Just Kids` + `[Modal] Early bailout — enrichedModalItem already set` dozens of times.

### Investigation (three chained root causes)

1. **App tree was re-rendering at 2 Hz.** Your v1.9.18 observability pass introduced `syncTick` — a `setInterval` at App.jsx top level that bumps a state counter every 500ms to force the gear-panel sync button to re-evaluate. But setState in App() re-renders the entire tree, not just LibraryScreen.

2. **`artistAlbumsData` prop was a new object reference each App render.** The JSX at line 27758 had an inline IIFE that used spread operators to merge artist-albums data — `{ ...artistAlbums, artists: { ...allArtistAlbums.artists, ...artistAlbums.artists } }`. Different reference every call.

3. **UniversalModal's mediaData useEffect had `artistAlbumsData` in its dep array,** and its cleanup function nulled `fetchingRef.current`. Each 500ms tick:
   - Cleanup nulls the ref
   - Effect body runs → dedup guard fails (ref is null) → reaches the 13 state setters at line 2348
   - One of those is `setSimpleDiscTab("content")` → tab snaps back to Related
   - Tile render logs `[Modal] routing` + `Early bailout` → console spam

Click `setSimpleDiscTab("analyzed")` → next syncTick → reset → visible as a 500ms flicker.

### Fixes

Three layered fixes, each tested individually in browser before the next:

**`6c14fdc` — Stabilize `artistAlbumsData` via useMemo.** Wrapped the IIFE in `useMemo(..., [allArtistAlbums, artistAlbums])`. Primary symptom fix: reference stays stable until source data legitimately changes. Also kills the `[Modal] routing` console spam.

**`bf513a7` — Separate new-entity UI resets from data-fetch useEffect.** Moved 11 UI state resets (setSimpleDiscTab, setModalPlayerMode, setRightTab, etc.) into their own useEffect with deps `[entityName, typeOverride]`. These are "open new entity" resets, not "data loading" primitives. `setMediaData(null)` and `setMediaLoading(true)` stayed in the data-fetch effect. Defense-in-depth against any future unstable dep. **Behavior improvement:** Save & Reload (cacheBustCounter bump) now preserves the user's current tab/player state instead of resetting.

**`d4b0db3` — Move syncTick into LibraryScreen.** The interval was the re-render heartbeat and it ran globally, forever, even when the user was not on the Library screen. Moved state + setInterval into LibraryScreen. Refs (`s3PushQueueRef`/`s3PushRunningRef`/`s3PushFailedRef`) stayed in App() and survive LibraryScreen mount/unmount cycles. Result:

- 500ms interval only runs while Library screen is mounted
- App re-renders on real state changes only, not on a global heartbeat
- UniversalModal stops re-rendering 2x/sec entirely
- Render-time logs fire only on legitimate events

### Verification done

- `[Modal] routing` logs go from 100+/modal-open to 1-2 (React strict-mode dev double-invoke only)
- Patti Smith modal's `[Modal] Filtered 4 orphan cards` render log went from 100+ per 10s idle to ~6 (only fires on actual render-causing events)
- Just Kids tab click — tab stays on Featured Discovery indefinitely
- Sync button still transitions ✓ Synced / Syncing N... / ⚠ Retry N correctly

---

## Part E — Catalog data cleanups (5 commits)

Triggered by 4 separate JD bug reports against the enriched catalog. Each report led to either a targeted fix plus a pattern audit for similar entries.

### `831ba91` — openLibrary.cover_url in book poster fallback chain

JD screenshot: Just Kids showed with cover in Works Discussed but as a dark placeholder tile in Related Discovery (same video, same modal, two panels). Root cause: the Related Discovery poster-resolution chain checked tmdb/youtube/spotify but not openLibrary. Book covers live at `openLibrary.cover_url`.

Fix: added `openLibrary.cover_url` to both Related Discovery sites (media + podcast variants) + the sibling GoldAdd wall-save thumbnail resolver (wall tiles had the same latent bug).

### `6a79ad9` — 2 misclassified film entries (Wolf of Wall Street + LA Confidential)

JD screenshot: Wolf of Wall Street modal played Scorsese's trailer but the badge read BOOK. Audit of the catalog:

- "The Wolf of Wall Street" (creator: Martin Scorsese) typed as book, had TMDB film data, no openLibrary → fixed to film
- "L.A. Confidential" (creator: "Curtis Hanson film" — literal "film" suffix in creator!) same pattern → fixed to film, stripped stray "film" suffix

### `6365428` — Broader type-misfit audit (17 fixes)

JD screenshot: Godfather showed as novel in Coppola's Late Career panel. Instead of fixing one entry, audited for the same class of bug across the whole catalog. Two patterns found:

- **9 films mistyped as novel/composition/album** — creator is a director (Gerwig, Fuller, Friedkin, Demme, Altman, von Trier, Preminger, Holland, Coppola). Retyped to film (or tv-series for Hannibal).
- **8 BB/BCS episodes mistyped as song** — creator is "Better Call Saul S1E6" or similar (episode descriptors). Retyped to episode.

No other misfit patterns found (type=film with openLibrary, type=film with spotify-only, etc. all zero).

### `c05ed83` — 3 musical misclassifications

JD screenshot: Grease showed MUSICAL badge but is a 1978 film. Audited all 20 `type=musical` entries:

- Most are legitimate stage musicals (Sondheim shows, Hamilton, Hadestown, Pippin, etc.) — left alone
- 3 misclassified: Grease (Randal Kleiser), The Sound of Music (Robert Wise) → film; Overture from Merrily We Roll Along → composition
- 5 ambiguous (42nd Street, Damn Yankees, Babes in Arms, Gypsy, Guys and Dolls — composer-creator, multiple stage+film versions) left as musical

### `dcf67d6` — 42 songs mistyped as film + 22 tainted youtube IDs

JD screenshot: "vampire" in a Billie Eilish podcast's Related Discovery showed MOVIE badge (it's Olivia Rodrigo's song). Pattern scan found 45 type=film entries with Spotify track_id — harvester had collided song titles with random TMDB films.

- 42 of 45 are clearly songs by musicians. Reclassified to song + nulled tmdb field (which pointed at wrong films).
- 3 ambiguous kept as film: Bird (1988 Eastwood biopic), Lady Sings the Blues (1972 Diana Ross biopic), The Last Waltz (1978 Scorsese concert film) — all have real films and the TMDB matches are probably valid.

Then the vampire modal still played the film trailer despite the fix. Root cause: `youtube.video_id` came from the TMDB film's trailer (`match_source: 'tmdb-trailer'`). Second-pass fix: nulled `youtube` field on all 22 songs where `match_source === 'tmdb-trailer'`. Modal falls back to Spotify embed for playback.

---

## Testing done

Per `feedback_rigorous_code_analysis.md`, every code-change task was executed with read-then-plan-then-edit-then-test cycles. No batched untested fixes.

- ✅ Each retry-flow fix tested individually with DevTools localStorage seeds (type_override mount, null cleanup, lock, orphan cleanup, seed failed set)
- ✅ Each modal-flicker fix tested individually (tab click behavior, console log spam, Save & Reload preservation, sync button tick correctness after syncTick move)
- ✅ Every catalog data fix smoke-tested by reloading and opening the reported modal
- ✅ Yesterday's Apr 13 fixes still work post-merge into v1.9.18 (Moonage Daydream documentary, Sinners film modal, MOVIE label) — spot-checked at session start
- ✅ No regressions on actual books (Just Kids), Sondheim stage musicals (Company, Into the Woods), etc.

---

## Things noticed but NOT changed

Surfaced during the investigations; flagged for your consideration:

### Hardcoded YouTube API keys in client bundle
`YT_PLAYLIST_KEYS` in `src/utils/enrichment.js` ships three API keys to a public S3 site. Anyone viewing source can scrape and burn the quota. SML kept these server-side; your baking system necessarily moved them client-side because the POC has no backend. 3-key rotation + 10k-units/day each gives plenty of headroom for normal use. Worth knowing.

### YouTube mqdefault.jpg 404s in console
~8 thumbnail 404s for baked playlist videos. `filterDeadTracks` validates upload/embed status but doesn't pre-check thumbnail availability. Mostly videos that passed the filter when baked but had thumbnails removed since. Cosmetic.

### Data quality hint — more catalog audits possible
The patterns we caught today (type misfits, tmdb-trailer pollution) suggest the harvester's TMDB title-match step has poor precision on short/ambiguous titles. A wider sweep could find more — I limited today to what tied to specific bug reports.

### Needle-drops data gap
Across the Universe, Bohemian Rhapsody, Moonage Daydream all show 0 needle drops in the catalog, while Sinners (91) and OBAA (33) have them. Harvester data gap, not a POC bug. Flagging in case it's relevant to your "Featured Discovery on song+soundtrack modals" P0.

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

All commits are independent enough to cherry-pick selectively, though they naturally group into the 4 themes above. If you want to stage uptake:

- **Safest first**: the data-only commits (`6a79ad9`, `6365428`, `c05ed83`, `dcf67d6`, `831ba91`, `244b0ef`). Pure JSON changes + one small code fallback chain. Tiny risk.
- **Retry-flow**: `fb374f2` alone is the complete set of 5 fixes. Designed to land together (internal dependencies — the seed in #2 makes the counter "clickable" during auto-retry, which the lock in #4 makes safe).
- **Modal-flicker fix set**: `6c14fdc` → `bf513a7` → `d4b0db3` in that order. First commit alone fixes the user-visible bug. Second adds defense-in-depth. Third is the perf win (stops App-tree 2Hz heartbeat) that also eliminates the console log spam. You could take just `6c14fdc` + `d4b0db3` if the refactor in `bf513a7` concerns you, but they compose cleanly.
- **Badge + copy + sinners normalization**: `47064d8` → `7ba242c` → `e240f43` → `244b0ef`. Low-risk cosmetic/chore set.

If you take all 14: fast-forwards cleanly onto current `jd/design-reskin-v3` HEAD (`8956112`), no conflicts expected.

---

## Questions / issues / comments

The `[Retry] deferred — batch in progress` log line is intentional debug output. If you want it suppressed in production, one-line change.

The `syncTick` move in `d4b0db3` is the biggest behavior change of the day — the sync button only ticks when LibraryScreen is mounted. If you want the interval to run app-wide (e.g., to keep pushing retries while the user is on another screen), let me know and I'll reverse it. But the refs (not the tick) persist in App() either way, so cross-screen retry logic is unaffected.

The `bf513a7` refactor is the one to review most carefully since it changes what triggers UI state resets. Reviewed the call-site semantics (the 11 moved setters are all "new entity view" concerns, not "data loading" concerns), but if any feel wrong to you, easy to move back.
