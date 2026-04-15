# JD Follow-up — April 14, 2026 (afternoon)

**Branch:** `justin/apr-14-retry-flow-fixes` (2 new commits on top of what you merged into v1.9.19)
**Status:** Two small data follow-ups — ready to cherry-pick into `v1.9.20-dev` whenever convenient

---

## Two commits

| Commit | Scope |
|---|---|
| `1b1e0ed` | Remove 141 zero-enrichment junk-title catalog entries + 2 Godfather retypes |
| `cbd7bdb` | Enrich Godfather Part III with TMDB id 242 + trailer |

Both are data-only (`src/data/enriched-content-catalog.json`). Single-line diffs (minified JSON). Zero code changes. Catalog count 13,856 → 13,715.

---

## What `1b1e0ed` does

Broader audit after the Godfather-cluster cleanup. Found a new misfit pattern: catalog entries with **zero enrichment** (no tmdb/youtube/spotify/openLibrary) whose titles contain junk markers — "Official Trailer", "Opening Credits", "Behind the Scenes", "Scenes", "Teaser", "Clip". They render as empty dark placeholder tiles because there's nothing to display.

141 entries matched the pattern:
- 80 "Official Trailer" (Godfather, Matrix, Wolf of Wall Street, Arrival, Eternal Sunshine, etc.)
- 36 "Trailer" (mostly Criterion/Janus restorations — Charulata, Belle de Jour, Grand Illusion)
- 13 "Opening Credits" (Sopranos, The Wire, Watchmen title sequences)
- 11 "Scenes" / "Behind the Scenes"
- 1 "Opening Scene"

Removed all 141. Opening Credits entries ARE distinct creative works (Saul Bass lineage) — noting in case you want to re-enrich them in a harvester pass with actual video data.

Also fixed 2 remaining Godfather type misfits:
- The Godfather Part III (Coppola) → `song` to `film`
- The Godfather Waltz (Nino Rota) → `film` to `composition`

Godfather cluster now clean: 5 entries (was 8). Part I, II, III all film; Black Godfather documentary; Waltz composition.

## What `cbd7bdb` does

Part III was retyped to `film` in the previous commit but had no enrichment, so the modal rendered thin. Manually enriched via TMDB:
- `tmdb.id` 242, `poster_url`, `overview`
- `tmdb.videos` (Featurette + Trailer)
- **Top-level `youtube`** pointing at the trailer — needed for the modal's main video window. The hero video slot reads `youtube.video_id` directly; `tmdb.videos[*]` only feeds Featured Discovery. So without the top-level `youtube`, the trailer would only appear in the Featured Discovery row, not the hero player.

Matches the shape of Part II's enrichment for consistency.

---

## Bigger picture (not in this push)

There are ~2,311 other zero-enrichment catalog entries (17% of the catalog). A full harvester re-run could pick most of them up (TMDB/Spotify/OpenLibrary per type). Not something I'm going to tackle without deciding the scope — flagging as follow-up.

---

## Cherry-pick

```
git fetch origin
git cherry-pick 1b1e0ed cbd7bdb
```

Fast-forward merge works too if you want both:
```
git merge origin/justin/apr-14-retry-flow-fixes
```

Branch is clean off `9355c88` (the v1.9.19 merge point).
