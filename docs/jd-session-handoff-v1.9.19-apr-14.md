# UnitedTribes POC v2 — Session Handoff

**Date written:** Tuesday, April 14, 2026, ~12:45 PM PDT
**Current shipped version:** v1.9.19
**Current dev branch:** `jd/v1.9.20-dev`
**Repo:** `github.com/United-Tribes/unitedtribes_universes_poc` (+ `jdagogo/unitedtribes-pocv2-jd-design-reskin` personal mirror)

**Purpose.** Give tomorrow-you — human or AI — a complete picture of where the POC stands at end of this session, without having to read transcripts. Every claim in this document is verifiable against `git log`, `lsof`, or files on disk. If something looks wrong, cross-check before acting on it.

---

## 1. 30-second state summary

- **v1.9.19 shipped** at 11:45 AM PDT Apr 14 as commit `6623b05` on branch `jd/design-reskin-v3`. Pushed to `origin` and `jdagogo`.
- **v1.9.19 = v1.9.18 + Justin's Apr 14 retry-flow hardening**, merged as a clean 16-commit fast-forward (zero conflicts, zero diverging commits on our side because Justin branched directly off the v1.9.18 close-out `8956112`).
- **v1.9.20 development cycle opened** on new branch `jd/v1.9.20-dev`, currently at `c32a837`. Two commits above `6623b05`, both tracker-only — no v1.9.20 code changes yet. Pushed to both remotes.
- **Three dev ports running:** 5173 (v1.9.17-merged safe rollback), 5174 (v1.9.20-dev active), 5175 (v1.9.19 frozen reference).
- **Working tree clean**, all remotes in sync, no pending pushes.

---

## 2. Where the code lives

### 2.1 Directories

```
~/Desktop/unitedtribes-pocv2-jd/              → main dev directory
                                                 branch: jd/v1.9.20-dev (HEAD c32a837)
~/Desktop/unitedtribes-pocv2-v1.9.19/         → git worktree for v1.9.19 frozen reference
                                                 branch: jd/v1.9.19-frozen (HEAD 6623b05)
                                                 node_modules symlinked from main dir
~/Desktop/unitedtribes-pocv2-v1.9.17-merged/  → git worktree for v1.9.17-merged rollback
                                                 detached HEAD at 487e09f
                                                 has its own node_modules
```

All three directories are served by Vite simultaneously — see §2.4.

### 2.2 Branches (local + remote)

**On both `origin` and `jdagogo`:**
```
jd/design-reskin-v3   → 6623b05   v1.9.19 shipped anchor (frozen)
jd/v1.9.20-dev        → c32a837   active development (2 tracker commits ahead)
```

**On `origin` only:**
```
jd/v1.9.19-frozen                   → 6623b05   off-machine backup of the frozen reference
jd/baking-system-wip                → 6623b05   rollback snapshot side branch (refreshed)
jd/commit-a-oembed-fastpath-parked  → e81b459   parked experimental fast-path from Apr 13
jd/design-reskin                    → 891546b   older pre-v3 branch, historical
```

**Local-only:**
```
wip-pre-justin-merge (tag)  → cd2264d   pre-Apr-13-merge local rollback point
jd/design-reskin            → local copy of historical branch
jd/design-reskin-v2         → local copy of historical branch
```

### 2.3 Commit chain (most recent 22 commits, reverse chronological)

```
c32a837  tracker: document 5175 badge fix + push to both remotes          ← HEAD of jd/v1.9.20-dev
1084eba  tracker: document post-close-out operational setup
6623b05  v1.9.19 CLOSE-OUT: merge justin/apr-14 + badge bump + tracker    ← v1.9.19 shipped
9355c88  docs: correct build note — 15 commits + fix bug attributions      ┐
77d4514  docs: rewrite build note to cover all 14 v1.9.18JH commits        │
7ba242c  chore: refresh v1.9.18JH badge date                               │
dcf67d6  fix(data): reclassify 42 songs mistyped as film                   │
c05ed83  fix(data): reclassify 3 musical entries                           │
6365428  fix(data): reclassify 17 catalog type misfits                     │ Justin's Apr 14
6a79ad9  fix(data): correct type on 2 misclassified film entries           │ branch, 16 commits
831ba91  fix(discovery): add openLibrary.cover_url to book poster fallback │ merged as pure
d4b0db3  perf(LibraryScreen): scope syncTick re-render to LibraryScreen    │ fast-forward
bf513a7  refactor(modal): separate new-entity UI resets from data-fetch    │
6c14fdc  fix(modal): stabilize artistAlbumsData via useMemo                │
d8430ff  docs: build note for v1.9.18JH (Apr 14 retry-flow fixes)          │
47064d8  chore: bump BUILD_VERSION to v1.9.18JH                            │
244b0ef  chore(data): normalize sinners-universe.json to raw UTF-8         │
e240f43  fix(CachePanel): copy "this album" → "this item"                  │
fb374f2  fix(retry-flow): type_override mount, null cleanup, lock, orphan  ┘
8956112  v1.9.18 CLOSE-OUT: badge bump + tracker close-out                ← v1.9.18 shipped
e4be135  tracker: document 8:00 PM observability simplification
76dc3ad  Observability simplification: delete Bake button, rewire Share
```

The 16-commit Apr 14 range is `8956112..9355c88`. Verified via `git rev-list --count`.

### 2.4 Ports (all UP at time of writing)

```
Port  PID     Directory                                Branch                What
5173  22063   unitedtribes-pocv2-v1.9.17-merged/       detached 487e09f      v1.9.17-merged SAFE ROLLBACK (never touch)
5174  40081   unitedtribes-pocv2-jd/                    jd/v1.9.20-dev        v1.9.20-jd-dev ACTIVE DEVELOPMENT
5175  40767   unitedtribes-pocv2-v1.9.19/               jd/v1.9.19-frozen     v1.9.19 SHIPPED FROZEN REFERENCE

3002  14704   ~/youtube-transcript-analysis/            —                     YTA (YouTube Transcript Analysis)
3004  14880   ~/Desktop/my-claude/united-tribes-fresh-v4/ —                   Fresh (Book Analysis POC)
3006  24334   ~/smart-media-logger/                     —                     SML (Smart Media Logger) — no longer required for baking runtime, still running
```

To restart any of the three POC ports:
```
cd ~/Desktop/unitedtribes-pocv2-jd && npm run dev -- --port 5174 --strictPort
cd ~/Desktop/unitedtribes-pocv2-v1.9.19 && npm run dev -- --port 5175 --strictPort
cd ~/Desktop/unitedtribes-pocv2-v1.9.17-merged && npm run dev -- --port 5173 --strictPort
```

### 2.5 Version tracker

Single canonical file: `~/Desktop/unitedtribes-pocv2-jd/pocv2-jd-design-reskin-versions.html`. Never duplicate. Every commit to `jd/v1.9.20-dev` (and any future dev branches) must include a tracker update per the workflow rule.

Current state of the tracker:
- **Quick Start** header shows v1.9.20-jd-dev on 5174 and v1.9.19 shipped on 5175 with commit hash link.
- **Port Map** has entries for all three POC ports plus the three ecosystem ports.
- **v1.9.20-jd-dev card** opened at top of Version History section (sparse — placeholder for next cycle).
- **v1.9.19 card** (closed) immediately below with full description paragraph covering the Apr 13 + Apr 14 work.
- **Latest Commits block** inside the v1.9.19 card has reverse-chronological entries back to the original v1.9.18-jd-dev badge bump, newest on top.
- **Chronological session log** with a "newest first" block at the top covering Apr 13 morning through Apr 14 12:40 PM.

---

## 3. What's in v1.9.19 (the shipped code)

Two layers — what carried forward from v1.9.18, and what Justin added on Apr 14.

### 3.1 Carried forward from v1.9.18 (Apr 13 session)

The v1.9.18 session was shipped at 7:40 PM Apr 13 as commit `8956112`. It consisted of three bodies of work built on top of `v1.9.17-merged` (`487e09f`).

**(a) Override baking system** — JD + Claude, all day Apr 13.

The problem: `findPlaylist` in `src/utils/enrichment.js` had a hard runtime dependency on SML's `/api/sml/youtube-playlist` route. Any saved override referencing a playlist ID was unreadable on any machine without SML running on localhost. Justin hit this as "OBAA bug" on the morning of Apr 13 — Tom Petty Spotify embed appearing in the YouTube tab because the SML fetch 500'd and the code fell through to a spotify-track fallback.

The fix: rewrote `findPlaylist` to hit the YouTube Data API v3 directly from the POC, using three hardcoded API keys rotated on 403 quota responses. Ported the scoring algorithm (~50 lines) and track parser (~40 lines) from SML's `route.ts`. Added a new `filterDeadTracks` helper that drops videos with `privacyStatus` private/unlisted, `uploadStatus` not processed, `embeddable` false, `regionRestriction.blocked` containing ≥100 countries, age-restriction flags, or missing from the `videos.list` response entirely. Validated against yt-dlp `--ignore-errors` reference output on five SNL reference playlists (4/5 had 100% recall; the 5th had a same-day yt-dlp re-run contamination artifact).

Bake-at-save-time pipeline:
- `SoundtrackPlayer.handleSaveOverrides` and `CachePanel`'s Save button both call a new `bakeOverride(entityName, mediaRef, opts)` helper that runs resolver + dead-track filter and returns `{baked}` or `{error}`.
- On success, the full resolved shape (`type`, `id`, `tracks[]`, `playlistTitle`, `thumbnail`, `embedUrl`, `url`, `resolvedAt`, `resolverVersion`, `resolverScore`, `source`) is written to localStorage.
- `pushOverrideNow` is then awaited synchronously, POSTing the baked shape to `OVERRIDES_API` with `{author, deviceId}` from `localStorage`.
- On push failure, the entry is queued in `ut_s3_push_pending` for retry on next mount.

Read-side: `fetchSoundtrack` checks for `raw.tracks` first and uses the baked shape directly. No network call, no resolver invocation at read time. **Runtime is zero-SML-dependency** for any machine reading shared overrides.

Auto-bake write-back on film open: if a film's existing override isn't yet baked, `fetchSoundtrack` quietly resolves and writes back the baked shape in the background, then queues the push via `queueAutoBakePush` (which appends to a debouncer queue that runs `runS3PushBatch` every 2 seconds, `N=5` entries per cycle, **serial POSTs never parallel** per design doc §5.6 because the Lambda does read-modify-write on `overrides.json` and parallel writes cause race-condition losses).

First-load upgrade useEffect: runs once per browser, guarded by `ut_overrides_baked_v1` localStorage flag, 3 seconds after mount. Iterates every unbaked entry in `ut_yt_overrides` and `soundtrack_overrides_*`, bakes each, writes back, queues push. That's why there's no visible "Bake" button.

Four files touched (~1,200 lines net added across v1.9.18 work): `src/utils/enrichment.js`, `src/components/SoundtrackPlayer.jsx`, `src/App.jsx`, `src/PluribusComps.jsx`.

**(b) Justin's Apr 13 title-collision merge** — shipped in the afternoon Apr 13 session.

Five commits (`41cc642`, `097bea6`, `0e5264c`, `a900213`, `84655e0`) merged as `95ba3cf`:
- Type-aware modal routing (`handleItemClick`, simple-mode render, `_catalogTypeCompat` additions, GoldAdd creator-qualified save key) fixing the Moonage Daydream song-vs-documentary collision and similar 434+ same-name cases.
- Catalog album enriched-modal fallback for missing-artist cases (Amazing Grace → Aretha Franklin style).
- FILM→MOVIE / DOCUMENTARY→DOC label normalization across `typeBadgeLabel`, `FILM_OR_TV_TYPES` Set, `TYPE_BADGE_COLORS`, GoldAdd category checks, CachePanel dropdown, Blue Note + Constellation labels.
- **New OVERRIDES (N) summary UI** in the Library gear panel that lists YouTube, Type, and Soundtrack overrides by entity name. This still ships in v1.9.19 — it wasn't touched by the observability pass.
- Sinners entity type `person` → `film` data fix.

**(c) Observability simplification** — JD + Claude, Apr 13 evening, after JD flagged the gear panel as unshippable ("three sync buttons, '106' means what, no confirmation on save").

Three changes:
1. **Deleted** the visible "🥧 Bake existing overrides" button. The first-load `ut_overrides_baked_v1` useEffect still runs silently, so the migration still happens.
2. **Rewrote** the "Share overrides" button as a three-state indicator driven by existing debouncer refs plus a new `s3PushFailedRef = useRef(new Set())`:
   - **A — ✓ Synced** (green, disabled) when queue empty, not running, no failures.
   - **B — Syncing N...** (yellow, disabled) when queue has entries or a batch is running.
   - **C — ⚠ Retry N** (red, clickable) when the failed Set is non-empty — takes priority. `onClick` iterates the Set, reads current localStorage by field type, calls `pushOverrideNow` for each.
3. **Added 1500ms `✓ Synced` / `Saved locally` flash** on the Save button in both `SoundtrackPlayer.handleSaveOverrides` and `CachePanel`'s YouTube Override Save button. Panel/editor closes after the flash.

`syncTick` state + 500ms `setInterval` was added at App() top level to force re-renders so the button reflects live ref state. **This was the bug Justin caught on Apr 14** — see §3.2.

### 3.2 What Justin added Apr 14 (the 16-commit merge)

All commits in the range `8956112..9355c88`. Claims below reproduce Justin's own build note (`docs/jd-build-note-apr-14-retry-flow.md`); JD has not yet browser-smoke-tested every claim. Trust level: high, based on Justin's track record of rigorous review, but verify before citing as ground truth.

**Retry-flow correctness fixes — `fb374f2`**

Five bundled fixes in the observability code from §3.1(c). Per Justin's note, all are real issues in that code (which JD and Claude wrote Apr 13 evening). JD has accepted the bugs as described and owns them:

1. **`type_override` silent black hole on mount.** `addToPendingQueue` writes `{entityName, field: "type_override"}` to `ut_s3_push_pending` on failure, but the retry-on-mount useEffect only had branches for `yt_override` and `soundtrack_override`. Since CachePanel's type dropdown writes through `type_override`, failed type saves stayed stuck in pending forever, invisible to the retry counter, not re-queued. Fix: added the missing `type_override` branch in retry-on-mount.
2. **Seed `s3PushFailedRef` from pending queue on mount.** The Set was `useRef(new Set())` — empty each session. Cross-session pending state was invisible until something failed again in the current session. Fix: seed loop added before the re-queue loop; every pending entry is added to `s3PushFailedRef` on mount so the ⚠ Retry counter is honest from first paint.
3. **`clearFromPendingQueue` on null retry value.** Retry `onClick` reads the latest localStorage value before pushing. If the value had been deleted between save and retry click, the `if (value != null && pushOverrideNow)` check silently skipped, leaving the entry stuck in both `s3PushFailedRef` and `ut_s3_push_pending` forever. Fix: `else if (clearFromPendingQueue)` branch un-tracks when value is null.
4. **Re-entrance lock in retry `onClick`.** Retry handler didn't respect `s3PushRunningRef`. User clicks during the 2-second auto-retry batch could fire parallel POSTs, violating §5.6 non-parallel. Fix: wrapped retry `onClick` body in the same re-entrance lock as `runS3PushBatch`. Second click logs `[Retry] deferred — batch in progress` and bails.
5. **Orphan `{_entityName}`-only soundtrack key cleanup.** A `soundtrack_overrides_X` key containing only `{_entityName}` (no real override fields) has `Object.keys(val).length === 1` (truthy), would strip `_entityName`, and POST `{}` as a "successful" empty push. Fix applied in both retry-on-mount useEffect and retry `onClick`: strip `_entityName` *before* the emptiness check, `localStorage.removeItem` + `clearFromPendingQueue` when the rest is empty, no POST made.

Investigated but closed as non-bugs per Justin's note: the key-construction transform `entityName.toLowerCase().replace(/\s+/g, "_")` is symmetric across all 12 writer sites (grep-verified).

**Modal tab flicker fix — `6c14fdc` + `bf513a7` + `d4b0db3`** (3 commits, root cause plus defense-in-depth plus perf)

Justin reported during the Apr 14 session: clicking the "Featured Discovery" tab on the Just Kids book modal would show the tab as active for a split second then snap back to Related. Console was also spamming `[Modal] routing: Just Kids` repeatedly.

Per Justin's investigation, three chained root causes:
1. `syncTick` setInterval at App() top level (added Apr 13 during the observability pass) was re-rendering the entire App tree 2× per second.
2. `artistAlbumsData` prop passed to `<UniversalModal>` was computed inline in JSX via an IIFE using spread operators — new object reference every render.
3. `UniversalModal`'s `mediaData` useEffect had `artistAlbumsData` in its dep array and its cleanup function nulled `fetchingRef.current`. Each 500ms tick: cleanup nulls the ref, effect body runs, dedup guard fails (ref is null), reaches 13 state setters — one of which was `setSimpleDiscTab("content")` — which reset the active tab to "Related".

Fixes, in order:
- `6c14fdc` — wrapped the `artistAlbumsData` IIFE in `useMemo(..., [allArtistAlbums, artistAlbums])`. Reference stays stable until source data changes. Primary fix.
- `bf513a7` — separated 11 UI state resetters (`setSimpleDiscTab`, `setModalPlayerMode`, `setRightTab`, etc.) into their own useEffect with deps `[entityName, typeOverride]`. These are "new entity view" concerns, not "data loading" concerns. Defense-in-depth against any future unstable dep. Side benefit: Save & Reload now preserves the user's current tab/player state instead of resetting it.
- `d4b0db3` — moved `syncTick` state + 500ms `setInterval` into `LibraryScreen` function body. The interval now only runs while the Library screen is mounted. Refs (`s3PushQueueRef`, `s3PushRunningRef`, `s3PushFailedRef`) stay in `App()` and survive screen mount/unmount cycles, so cross-screen retry logic is unaffected.

**Semantic change to be aware of.** `d4b0db3` means the sync button's live-tick only updates while the Library screen is mounted. If a user is viewing any non-Library screen, the sync indicator won't refresh until they return to Library. The underlying debouncer + refs continue operating in the background unchanged; only the UI refresh is scoped. Justin noted this is reversible if we want app-wide ticking.

**Sinners JSON UTF-8 re-emit — `244b0ef`**

Fixes the 3,568-line-diff noise that landed in the Apr 13 `a900213` Sinners entity type fix. Justin's note traces it to Python `json.dump()` without `ensure_ascii=False`, which escaped every non-ASCII char as `\uXXXX`. Re-emitted with `ensure_ascii=False, indent=2`. Justin verified `json.load(before) == json.load(after)` — parsed objects are identical, 42 entities unchanged. Diff is purely encoding.

This is what takes `src/data/sinners-universe.json` from 3,566 lines changed in the `git diff` stat of the Apr 14 merge — a cosmetic but disruptive-looking delta. Content is unchanged.

**CachePanel copy — `e240f43`**

`src/App.jsx:1517` and `1526`: "this album" → "this item". CachePanel renders on any modal type (movie, doc, song, book, album), so the "album" literal leaked on non-album modals.

**openLibrary cover URL — `831ba91`**

Added `openLibrary.cover_url` to the book poster fallback chain in the Related Discovery card resolver at both sites (media + podcast variants) and the sibling GoldAdd wall-save thumbnail resolver. Fixes Justin's reported Just Kids "dark placeholder tile in Related Discovery" bug — the tmdb/youtube/spotify fallback chain didn't include openLibrary, and book covers live there.

**Catalog data cleanups — `6a79ad9` + `6365428` + `c05ed83` + `dcf67d6`** (4 data commits)

Per Justin's note, triggered by four specific bug reports (most from Justin's own screenshots; the Godfather one was the pass-through from JD via Justin). Each report led to a targeted fix plus a pattern audit for similar entries. Total data-level changes: 64 entries touched (42 + 3 + 17 + 2), plus the openLibrary code fix in `831ba91` brings the total to "60+" per Justin's summary.

- `6a79ad9` — 2 misclassified film entries (Wolf of Wall Street was typed `book`, LA Confidential had literal "film" suffix in creator).
- `6365428` — 17 type misfits. 9 films mistyped as `novel`/`composition`/`album` when the creator is a director (Gerwig, Fuller, Friedkin, Demme, Altman, von Trier, Preminger, Holland, Coppola). 8 Breaking Bad / Better Call Saul episodes mistyped as `song`.
- `c05ed83` — 3 musical reclassifications. Grease (Randal Kleiser 1978) → `film`. The Sound of Music (Robert Wise) → `film`. "Overture" from Merrily We Roll Along → `composition`. 5 ambiguous entries (42nd Street, Damn Yankees, Babes in Arms, Gypsy, Guys and Dolls) left as `musical`.
- `dcf67d6` — 42 songs mistyped as `film` with Spotify track IDs (harvester collided song titles with random TMDB films). Retyped to `song`, `tmdb` field nulled. Of those 42, 22 had `youtube.video_id` from the TMDB film's trailer (`match_source: 'tmdb-trailer'`) — nulled the `youtube` field on those 22 so the modal falls back to Spotify embed for playback. Three ambiguous entries kept as film: Bird (1988 Eastwood biopic), Lady Sings the Blues (1972 Diana Ross biopic), The Last Waltz (1978 Scorsese concert film).

**Badge and build-note chain — 5 commits**

`47064d8` initial v1.9.18JH badge bump, `7ba242c` badge date refresh after the day's work, then `d8430ff` → `77d4514` → `9355c88` three iterations of Justin's build note (final at `9355c88`, 264 lines at `docs/jd-build-note-apr-14-retry-flow.md`).

### 3.3 Things NOT in v1.9.19 that were flagged

Carried forward from earlier priority lists, **still JD's domain, untouched**:

- **P0 — "How'd I Get Here?" narrow rebuild** (capture modal chain at save time, persist on saved tile, render as discovery cards under a "How'd I Get Here?" pill when the tile is clicked back). Investigation done, implementation not started.
- **P0 — Featured Discovery on song + soundtrack + orphan album modals** (three separate code paths, each needs its own wiring: parent film card + director's other works + TMDB trailers/featurettes). Only SoundtrackPlayer has this currently.
- **P0 — SoundtrackPlayer drawer sizing** (flagged "wrong size" since v1.9.15-jd, needs visual iteration).
- **P0 — SoundtrackPlayer total visual redesign** (currently dark theme, doesn't match cream/navy/gold design language).
- **P1 — Per-universe default composer** (header Soundtrack & Score button uses one composer per universe instead of the actual composer).
- **P1 — Album modal header thumbnail on Spotify override** (needs oEmbed fetch).
- **P1 — Soundtrack artist walk in Featured Discovery** (currently only director's other works).

**Still Justin's domain, not started Apr 14:**
- Item B Phase 2 — OpenLibrary ISBN enrichment (~1,000 books)
- Amazing Grace full fix (thread catalog Spotify album ID into harvester pipeline)
- Track B — remove large bundled imports (31MB + 36MB + 4MB chunks currently trigger the 500 kB warning)

**Flagged by Justin as "things noticed but NOT changed" in the Apr 14 build note:**
- **Hardcoded YouTube API keys in client bundle.** `YT_PLAYLIST_KEYS` in `src/utils/enrichment.js` ships three API keys to a public S3 site. Anyone viewing source can scrape and burn the quota. Unavoidable consequence of moving playlist resolution off SML without a backend proxy. 3-key rotation + 10k units/day each gives headroom for normal use (~3 units per bake).
- **YouTube `mqdefault.jpg` 404s in console.** ~8 thumbnail 404s for baked playlist videos. `filterDeadTracks` validates upload/embed status but doesn't pre-check thumbnail availability. Cosmetic.
- **Data quality hint — more catalog audits possible.** Today's patterns (type misfits, tmdb-trailer pollution) suggest the harvester's TMDB title-match step has poor precision on short/ambiguous titles. A wider sweep could find more; Justin limited Apr 14 to entries tied to specific bug reports.
- **Needle-drops data gap.** Across the Universe, Bohemian Rhapsody, Moonage Daydream all show 0 needle drops in the catalog while Sinners (91) and OBAA (33) have them. Harvester data gap, not a POC bug. Potentially relevant to the P0 Featured Discovery work above.

---

## 4. Known issues and open questions at end of session

### 4.1 Not yet browser-verified on 5174

JD has not yet run a browser smoke test of the merged `jd/v1.9.20-dev` state on 5174. Justin's three main user-visible claims should be verified before opening any real v1.9.20 work:

1. **Tab click behavior on a modal with a Featured Discovery tab.** Click Featured Discovery, confirm it stays on the clicked tab (no flicker, no snap-back to Related).
2. **Sync button in the Library gear panel.** Should still transition through ✓ Synced / Syncing N... / ⚠ Retry N correctly. The `syncTick`-into-LibraryScreen move should not have broken the live-tick; verify the button updates visibly when a save is queued.
3. **Catalog data fixes.** Two that JD specifically flagged last night should now be resolved:
   - Grease should render as a film with a SoundtrackPlayer (not as a musical).
   - "vampire" (Olivia Rodrigo song) should render as a song with Spotify embed, not as a film trailer (formerly the tmdb-trailer pollution).
   - Wolf of Wall Street should render as film with Scorsese trailer (not as book).
   - The Godfather in Coppola's filmography should render as film (not as novel).

### 4.2 Items flagged during today's session that have NOT been decided

- **`jd/v1.9.20-dev` push to both remotes happened already** (commit `c32a837`), but no code work has started on v1.9.20. The branch exists as a placeholder. First real commit on v1.9.20 will need a badge bump (currently the branch inherits `BUILD_VERSION = "v1.9.19"` from the close-out — the 5174 page shows "v1.9.19" until a v1.9.20 badge commit lands).
- **Reversibility of the `syncTick` scope change.** Justin's `d4b0db3` move is a real semantic narrowing — sync button doesn't live-tick when off the Library screen. If a use case surfaces where it matters, it's a one-file revert.
- **Hardcoded API keys are a known exposure.** No remediation plan. Options would be: proxy through the existing `OVERRIDES_API` Lambda, stand up a minimal POC backend, or accept the exposure and rotate keys periodically.

### 4.3 Items NOT flagged but worth knowing

- **Cache version bump from Apr 13 carries forward.** `ut_cache_version` was bumped 16 → 17 in v1.9.18. Any browser that loads v1.9.19 for the first time will clear its `ut_discovery_cache` on load. Expected behavior; cache repopulates as the user browses.
- **The `overrideUploadStatus` state declaration at `LibraryScreen:23661` is dead code** after the observability pass deleted the old bulk-push Share Overrides button. Left in place intentionally per scope-minimum rule. Removing it is a valid v1.9.20 cleanup task.
- **`jd/v1.9.20-dev` is 2 commits ahead of `jd/design-reskin-v3`** with tracker-only content. When v1.9.20 eventually ships, the pattern will be to fast-forward `jd/design-reskin-v3` up to wherever `jd/v1.9.20-dev` is at close-out time — same pattern as the Apr 13 → Apr 14 sequence.

---

## 5. Rollback recipes

From safest-destructive to most-drastic:

```bash
# 1. Roll back the two v1.9.20-dev tracker commits and stay on v1.9.20-dev:
git checkout jd/v1.9.20-dev && git reset --hard 6623b05
# (result: jd/v1.9.20-dev now equals jd/design-reskin-v3; local-only)

# 2. Roll back to exactly v1.9.18 (pre-Apr-14 merge, pre-Justin hardening):
git checkout jd/design-reskin-v3 && git reset --hard 8956112
# (result: undoes Justin's Apr 14 work; would require force-push to remote)

# 3. Roll back to v1.9.17-merged (pre-baking, pre-Justin-April-13-merge):
git checkout jd/design-reskin-v3 && git reset --hard 487e09f
# (result: loses everything shipped Apr 13 + Apr 14; for nuclear use only)

# 4. Local-only tag rollback — restores to pre-Apr-13-merge baking state:
git checkout jd/design-reskin-v3 && git reset --hard wip-pre-justin-merge
# (equivalent to cd2264d; baking work intact, Justin merges undone)

# 5. Side-branch snapshot (remote only, read-only reference):
git checkout origin/jd/baking-system-wip
# (currently at 6623b05 — was 713065b before Apr 14 refresh)

# 6. Parked Apr 13 experimental fast-path (read-only reference, never use):
git checkout origin/jd/commit-a-oembed-fastpath-parked
# (e81b459 — the oEmbed fast-path approach that was rejected in favor of baking)
```

Worktree-based rollback (safest because no branch state changes):
- **Port 5173** is already serving v1.9.17-merged from `~/Desktop/unitedtribes-pocv2-v1.9.17-merged/` (detached HEAD at `487e09f`) — open in a browser for instant comparison.
- **Port 5175** is already serving v1.9.19 from `~/Desktop/unitedtribes-pocv2-v1.9.19/` (branch `jd/v1.9.19-frozen` at `6623b05`) — open in a browser to compare against whatever's on 5174.

---

## 6. Workflow rules (from JD's global memory — enforced for this repo)

These are non-negotiable. Every session that touches this repo operates under them:

1. **Always get JD's approval before writing ANY code.** State what you're about to do, wait for explicit "go ahead." No freelancing. JD gets frustrated when this is violated.
2. **Never bump `BUILD_VERSION` without being told to.** Don't create new version cards in the tracker. Don't change BUILD_VERSION. Only update the badge/tracker when explicitly asked.
3. **Never push to GitHub without being explicitly asked.** Local commits when asked are fine; pushing is a separate action that requires separate instruction. (Exception established in this session: when JD says "commit and push," both happen.)
4. **ONE version tracker. PERIOD.** The only version tracker is `~/Desktop/unitedtribes-pocv2-jd/pocv2-jd-design-reskin-versions.html`. Never duplicate. Never create a second one.
5. **Every commit MUST include the version tracker update.** Confirmed via commit hash so JD can roll back. Includes tracker-only commits for operational state documentation.
6. **Append-only tracker.** Never replace the commit log section. Never remove content. Only augment. Historical entries are sacred.
7. **Never touch the experiment repo.** `~/Desktop/unitedtribes-pocv2-experiment/` is DEAD. If line numbers in a plan don't match the reskin repo, STOP and ask. Never default to the experiment repo.
8. **Mirror rule.** `src/App.jsx` changes must be mirrored to `src/PluribusComps.jsx` via `cp src/App.jsx src/PluribusComps.jsx`. Verify with `diff -q`. This is for Claude artifact portability. `enrichment.js` and `SoundtrackPlayer.jsx` are NOT mirrored.
9. **Never light gray text.** JD has strong opinions on contrast.
10. **Don't invent new button styles.** Use existing patterns.
11. **Zone by zone, test between each step.** Don't batch untested changes.
12. **Never fabricate timestamps.** Always check `git log` for real commit times. Backdating is OK if explicitly requested (e.g., the 11:45 AM commit), but reporting wall-clock time must match reality.

From today's session specifically:
- **Detailed tracker entries preferred over terse ones.** JD explicitly asked for "more detail rather than less" on Apr 13 evening.
- **Safety nets before risky operations.** The tag + side branch pattern from Apr 13 ("before Justin merge") is the template: create a named rollback point and optionally push a side branch before any operation that could go sideways.

---

## 7. Next-session pickup checklist

When the next session opens on v1.9.20-dev:

1. **Verify port state.** `for p in 5173 5174 5175; do lsof -ti:$p -sTCP:LISTEN; done`. All three should be UP. If not, restart using the commands in §2.4.
2. **Verify branch state.** In main dir: `git branch --show-current` should say `jd/v1.9.20-dev`. `git log --oneline -5` should show `c32a837` as HEAD. Working tree should be clean.
3. **Pull any overnight Justin commits.** `git fetch origin` then `git log --oneline origin/justin/*` to see if any new branches landed.
4. **Check session memory.** `~/.claude/projects/-Users-j-d-heilprin/memory/MEMORY.md` for any new entries from the user about priorities or context.
5. **If opening real v1.9.20 work:** the first code commit on `jd/v1.9.20-dev` should probably include a badge bump from `v1.9.19` to `v1.9.20-jd-dev` in `src/App.jsx:120` (with PluribusComps mirror) so the 5174 page visibly distinguishes from 5175. JD must explicitly authorize this.
6. **Smoke test items from §4.1** if not done before starting new work. The tab flicker fix, sync button tick, and catalog data fixes (Grease, vampire, Wolf of Wall Street, Godfather) should be verified.
7. **Priority queue** — see §3.3. P0 items are JD's domain. The biggest piece of unfinished work is "How'd I Get Here?" and Featured Discovery on song/soundtrack/orphan album modals.

---

## 8. Collaboration state between JD and Justin

Context that may not be obvious from the code or git log:

- **JD and Justin are the two humans on this project.** Claude Code is the implementation/review assistant. The two-machine collaboration pattern is that Justin pushes feature branches to `origin/justin/*`, JD reviews and merges into `jd/design-reskin-v3` (or whichever the active reskin branch is), ships, and pushes.
- **Justin's work on Apr 14 includes fixes to code JD and Claude shipped Apr 13 evening.** Specifically, the retry-flow holes (`type_override` mount, empty-set-on-mount, null cleanup, re-entrance lock, orphan `_entityName`) and the `syncTick` cascade bug (global heartbeat → unstable `artistAlbumsData` → UniversalModal useEffect reset cycle → visible tab flicker). JD has acknowledged these as real bugs in his Apr 13 code. The back-and-forth is exactly the intended collaboration model: JD designs + ships, Justin reviews + hardens, both iterate.
- **Build notes are the primary async communication.** Justin writes `docs/jd-build-note-*.md` for his feature branches (Apr 13 title-collision, Apr 14 retry-flow). JD writes cover-letter-style handoff notes for his shipped versions. This doc is the JD-side handoff for v1.9.19.
- **Justin has NOT yet been sent a build note for v1.9.19.** Drafting one similar to Justin's format is a reasonable next-session action — it would document what Justin's Apr 14 work landed into, plus the two tracker-only commits on `jd/v1.9.20-dev`, plus the worktree/port rearrangement, plus the known-issue list.
- **Justin discovered and fixed a bug in Claude's Apr 13 design** (the syncTick global heartbeat). Claude owning this in the handoff is not performative — it's factually what happened and the right pattern to surface for tomorrow's session. Lesson: global `setInterval` timers at framework-top-level are a code smell that should trigger review even when time pressure is high.

---

## 9. Minimal context for a new Claude session starting cold

If tomorrow's Claude has no prior context, here's the minimal briefing:

- **What this repo is.** UnitedTribes POC v2 — React 19 + Vite 7 single-file app (`src/App.jsx`, ~28k lines) demonstrating a cultural knowledge graph through interactive discovery in Vince Gilligan's Pluribus universe (plus Patti Smith, Sinners, Blue Note, Greta Gerwig sub-universes). The POC is a Claude artifact + deployed Vite app. `src/App.jsx` and `src/PluribusComps.jsx` must stay in sync.
- **What we just shipped.** v1.9.19 — override baking system (runtime zero-SML-dependency for playlist resolution) + Justin's title-collision fixes + observability simplification + Justin's Apr 14 retry-flow hardening + modal flicker fix + catalog data cleanups. Full detail in §3.
- **Where we are now.** Tuesday Apr 14 end of morning session. v1.9.19 shipped, v1.9.20-jd-dev opened, no v1.9.20 code changes yet.
- **What to do first.** Read this doc top to bottom. Then check port state (§2.4), branch state (§2.2, §2.3), and current working tree in `~/Desktop/unitedtribes-pocv2-jd/`. Ask JD what v1.9.20 should focus on before writing any code — per the workflow rule in §6.1.
- **Biggest known unknowns.** v1.9.19 has NOT been browser-smoke-tested post-merge. JD may want to do that before opening v1.9.20 work. See §4.1.
- **Biggest trap to avoid.** The `syncTick` scope bug I shipped Apr 13 is the freshest example of what goes wrong when you move fast on reactive primitives without thinking about render scope. If the v1.9.20 work involves any new global `setInterval` or any new App()-level reactive state, pause and think about which sub-tree actually needs to re-render.

---

## 10. Factual cross-reference checklist (for BS-detection review)

Claims in this doc that a reviewer may want to spot-check:

| Claim | How to verify |
|---|---|
| v1.9.19 shipped as `6623b05` | `git log --oneline -1 6623b05` — should show the close-out commit |
| Apr 14 merge was 16 commits, fast-forward | `git rev-list --count 8956112..9355c88` → 16 |
| `jd/v1.9.20-dev` HEAD is `c32a837`, 2 commits ahead | `git log --oneline jd/design-reskin-v3..jd/v1.9.20-dev` → 2 lines |
| All three POC ports UP with the listed PIDs | `for p in 5173 5174 5175; do lsof -ti:$p -sTCP:LISTEN; done` |
| `origin/jd/v1.9.19-frozen` exists at `6623b05` | `git ls-remote origin refs/heads/jd/v1.9.19-frozen` |
| Tag `wip-pre-justin-merge` at `cd2264d` (local only) | `git rev-parse wip-pre-justin-merge` → `cd2264d...` |
| 16-commit list in §2.3 matches Justin's branch | `git log --oneline 8956112..9355c88` |
| `BUILD_VERSION = "v1.9.19"` on current HEAD | `grep BUILD_VERSION src/App.jsx` (line 120) |
| Single version tracker file | `find ~/Desktop/unitedtribes-pocv2-jd -name 'pocv2-jd-design-reskin-versions.html'` — exactly one match |
| `node_modules` symlink on 5175 worktree | `ls -la ~/Desktop/unitedtribes-pocv2-v1.9.19/node_modules` → lrwxr-xr-x |
| `jd/baking-system-wip` refreshed to `6623b05` | `git ls-remote origin refs/heads/jd/baking-system-wip` |

All claims in §3 about Justin's Apr 14 work are sourced from `docs/jd-build-note-apr-14-retry-flow.md` (the file is in this same branch, checked in at commit `9355c88`). JD accepts the description as-is pending his own browser verification in §4.1. If a reviewer finds discrepancies between the claims here and the build note, the build note is canonical; this doc should be corrected.

---

## End of handoff

This document is the JD-side cover-letter for v1.9.19. It's committed to the repo at `docs/jd-session-handoff-v1.9.19-apr-14.md` for reference by any future session. The parallel file for Justin's Apr 14 work is `docs/jd-build-note-apr-14-retry-flow.md` (Justin's authorship) and for Apr 13 is `docs/jd-build-note-apr-13-title-collision.md`.
