# SESSION HANDOFF — v1.9.22 SHIPPED — May 17, 2026

**Repo:** `~/Desktop/unitedtribes-pocv2-jd/`
**Branch (local):** `jd/v1.9.22-dev` @ `19503ce`
**Ship date:** Sunday May 17, 2026 · 5:50 PM PDT
**Ship commit:** [`8f7dd57`](https://github.com/United-Tribes/unitedtribes_universes_poc/commit/8f7dd57)
**Tracker tip:** [`19503ce`](https://github.com/United-Tribes/unitedtribes_universes_poc/commit/19503ce)
**Badge on 5174:** `v1.9.23 · 8f7dd57 · Sun May 17, 2026 5:50 PM PDT`

---

## 1. TL;DR — read this first

v1.9.22 shipped today after a long session focused on making the new `audio_article` and `social_video` content types first-class in the POC. The cherry-picks from Justin's `justin/may-14-thumbnail-url-support` branch landed earlier this session (six feature commits up to [`f92fcd5`](https://github.com/United-Tribes/unitedtribes_universes_poc/commit/f92fcd5)), then we did a `pull-data.sh` to bring in the May 13-15 catalog tranche, then we did the code work on top.

**Three substantive things shipped on top of Justin's branch:**

1. **Routing infrastructure** — Edits 1-5 + Path A entry-gate guard at line 3229 route `audio_article` and `social_video` types through Path B (the simpler render path) instead of Path A (the rich enrichedModalItem render). This sets up the new content types to render correctly.
2. **Edit 6 IIFE** — new media slot in Path B at line 4753 that renders `<audio>` for audio_article and `<video>` for social_video by looking up the catalog row via `directVideoId`. Mutually exclusive with the podcast registry section (Empire of Auteurs path unchanged).
3. **Wall save/reopen end-to-end** — Part 1 (defensive recovery in `handleItemClick` for legacy "ALBUM"-corrupted records) + Part 2 (fix the in-modal [+] save site at line 3861 to read catalog row fields instead of defaulting to `type: "ALBUM"` / `category: "Music"` / `universe: "bluenote"`).

Plus: timestamp seek works on the new types (Step 1 — `podcastVideoRef` attached to IIFE's media elements, chevron click handler at line 5041 seeks the ref before falling back to YouTube iframe reload).

**Where we are now:** v1.9.22 pushed to `origin/main` + `origin/jd/design-reskin-v3` + `jdagogo/jd/design-reskin-v3`. `jd/v1.9.22-dev` stays local per standing rule. v1.9.23 dev opens; first task next session is to cut `jd/v1.9.23-dev` from `8f7dd57` and start on the per-category Discovery Playlist truncation investigation (JD's top priority — see Section 5).

---

## 2. Commit chain shipped today

Local `jd/v1.9.22-dev` tip moved from `f92fcd5` (Justin's branch tip, last cherry-pick) to `19503ce` via five commits:

| # | Hash | Type | Purpose |
|---|---|---|---|
| 1 | [`f93bebd`](https://github.com/United-Tribes/unitedtribes_universes_poc/commit/f93bebd) | data | Catalog + video-entity-index refresh from `pull-data.sh` (Justin's May 13-15 social_video + audio_article tranches) |
| 2 | [`8f7dd57`](https://github.com/United-Tribes/unitedtribes_universes_poc/commit/8f7dd57) | fix | Wall save/reopen for audio_article + social_video (Part 1 + Part 2 + Step 1 timestamp ref + Edit 6 IIFE + Edits 1-5 + Fix 3a/3c + Bug 1 fix) — **this is the v1.9.22 ship commit** |
| 3 | [`855d623`](https://github.com/United-Tribes/unitedtribes_universes_poc/commit/855d623) | chore | Tracker — ship v1.9.22 + open v1.9.23 + badge bump to v1.9.23 |
| 4 | [`45947c3`](https://github.com/United-Tribes/unitedtribes_universes_poc/commit/45947c3) | chore | Tracker — close out v1.9.22 ACTIVE DEV + add direct commit links throughout |
| 5 | [`19503ce`](https://github.com/United-Tribes/unitedtribes_universes_poc/commit/19503ce) | chore | Tracker — add v1.9.23 ACTIVE DEV card + v1.9.22 SHIPPED banner inside card + Port Map update (the earlier two chore commits only touched the Quick Start summary section; missed the actual rendered version cards in the page body) |

**Push state:** `origin/main` `f3aea29 → 19503ce`. `origin/jd/design-reskin-v3` `312c8ef → 19503ce`. `jdagogo/jd/design-reskin-v3` `312c8ef → 19503ce`. All clean fast-forwards.

GitHub flagged `src/data/all-video-entity-index.json` at 66.55 MB (above the 50 MB recommended) on the data-touching pushes (#1 and #3). Pushes accepted; warning was pre-existing on prior data pushes. Worth considering Git LFS for that file in a future cycle but no action required for the ship.

---

## 3. Code architecture — what changed in App.jsx today

The work is distributed across nine logical "edits" applied at the following lines (current line numbers as of `8f7dd57`). All changes are mirrored byte-identical from `src/App.jsx` to `src/PluribusComps.jsx` per standing rule.

### Edit 1 — Path A entry gate (line 3229)

```js
if (enrichedModalItem && !isPodcast
    && enrichedModalItem.type !== 'audio_article'
    && enrichedModalItem.type !== 'social_video') {
```

Path A renders `enrichedModalItem`-style modals (rich films, songs, books, etc.). For audio_article and social_video, we skip Path A entirely and fall through to Path B. This is the foundation — every other edit assumes audio_article/social_video flow through Path B.

### Edits 2-5 — five click-site routing guards

Each setUniversalModal/setEnrichedModalItem call site that opens a modal got the audio_article/social_video guard pattern: clear `enrichedModalItem`, set `videoId` from `sources[0].video_id` (the catalog row's slug), set `type` from the catalog row.

| Edit | Line | Surface |
|---|---|---|
| Edit 2 | 25911 | Catalog Results tile click (search Discover & Add → Content section) |
| Edit 3 | 25021 | `LibraryScreen.handleItemClick` (wall tile reopen) |
| Edit 4 | 27415 | `openPopover` / autoEnrich path (entity-link clicks) |
| Edit 5 | 28675 | Top-level `onNavigate` (cross-modal navigation, navigation from response screen, etc.) |

### Bug 1 fix — Video Results tile click (line 25845)

Same guard pattern applied to the Video Results tile click handler in search results. This was a fifth missed site discovered post-Edits 2-5 when Obsession was still routing through Path A despite the new guards.

### Edit 6 IIFE — Path B media slot (line 4753)

When `isDirectVideo` AND `typeHint === 'audio_article' || typeHint === 'social_video'`, run an IIFE that looks up the catalog row by `directVideoId` and renders:

- `<audio ref={podcastVideoRef} controls src={_row.audio_url}>` for audio_article (with thumbnail backdrop above)
- `<video ref={podcastVideoRef} controls src={_row.video_url}>` for social_video (with vertical / horizontal aspect handling)

The existing YouTube iframe branch immediately after (line 4785) gates `typeHint !== 'audio_article' && typeHint !== 'social_video'` so it doesn't double-render.

**Critical:** `podcastVideoRef` attached to both elements. Same ref the podcast registry section uses (line 4957). Wallet over to next item.

### Step 1 — Timestamp seek (line 5041)

The chevron carousel's timestamp pill click handler was YouTube-only — `iframe.src = ".../embed/...&start=N"`. For audio_article/social_video, no YouTube iframe exists, so click did nothing. Patched to seek `podcastVideoRef.current.currentTime` first, fall through to iframe reload if no media element is mounted. Same code path Empire of Auteurs's podcast chevron already used.

### Fix 3a — toggleLibrary slug persistence (line 25940)

The Catalog Results [+] save button at line 25940 used `videoId: item.youtube?.video_id || null`. For audio_article rows (no `item.youtube.video_id`), this saved `null` — losing the slug. Changed to:

```js
videoId: item.youtube?.video_id || item.sources?.[0]?.video_id || null,
```

So future audio_article + social_video saves carry the slug, which `handleItemClick`'s wall-reopen handler needs to resolve back to the right modal.

### Fix 3c — _hiTypeCompat extension (line 24993)

Added entries to the type-mismatch fallback map in `LibraryScreen.handleItemClick`:

```js
audio_article: new Set(['audio_article']),
social_video: new Set(['social_video']),
```

Before this, `_hiAllowed` was `undefined` for these types, so the existing type-mismatch re-search at lines 25017-25023 didn't fire. Now it does, but in practice this is rarely the active path because Part 1 (below) short-circuits it.

### Part 1 — Defensive recovery (line 25017)

Inserted before the type-mismatch re-search:

```js
const _slugAlignsAudioSocial = _candidate &&
  (_candidate.type === 'audio_article' || _candidate.type === 'social_video') &&
  item.videoId &&
  _candidate.sources?.[0]?.video_id === item.videoId;
if (_candidate && _hiAllowed && !_hiAllowed.has(_candidate.type) && !_slugAlignsAudioSocial) {
  // existing re-search logic unchanged
}
```

When `autoEnrich` finds an audio_article/social_video catalog row AND the saved `item.videoId` matches that row's `sources[0].video_id`, trust the catalog match regardless of saved `type`. This is what recovers the legacy "ALBUM"-corrupted wall records (Obsession, Jarmusch, Coens) without manual delete-and-re-save.

### Part 2 — In-modal [+] save site (line 3861)

> **Important for next session:** Path B's in-modal [+] save button IS at line 3861 and now persists correct fields after Part 2. The next session should NOT try to add a "new" save button to Path B — the existing one was already there and is now correct. Earlier in v1.9.22 we briefly mis-framed Path B as having no in-modal save button at all; that was wrong and the doc reflects the corrected understanding.

The Path B header [+] save button (originally line 3861, now around 3865 after Part 2's insertion) was building `albumMeta` with `type: entity?.type || "ALBUM"`. For audio_article/social_video, `entity?.type` was `undefined` → fallback to `"ALBUM"`. Plus `category: "Music"`, `universe: "bluenote"`, empty subtitle, null thumbnail. **This was the root cause of the corrupted wall records.**

Patched to branch on `typeHint`:

```js
const _audioSocialRow = (typeHint === 'audio_article' || typeHint === 'social_video')
  ? (enrichedCatalogContent || []).find(c =>
      (c.type === 'audio_article' || c.type === 'social_video') &&
      c.sources?.[0]?.video_id === directVideoId
    )
  : null;
const albumMeta = _audioSocialRow ? {
  title: name,
  subtitle: _audioSocialRow.uploader_display_name || _audioSocialRow.publisher || _audioSocialRow.creator || "",
  category: "Video & Podcasts",
  type: _audioSocialRow.type,
  thumbnail: _audioSocialRow.thumbnail_url || null,
  videoId: directVideoId,
  addedFrom: `Modal · ${name}`,
  dateAdded: Date.now(),
} : { /* existing album-default behavior unchanged */ };
```

For audio_article/social_video, persists the catalog row's actual fields. For other types (the existing path), unchanged.

---

## 4. What's working end-to-end (verified by JD in browser)

**Audio articles:**
- A24's Empire of Auteurs (`a24s_empire_of_auteurs`) — routes via podcast registry, dark navy wrapper, 202×202 artwork, audio player, chevron Discoveries with 178 entries (clean match against MD), timestamps seek correctly.
- A Hundred Years of David Attenborough (`david_attenborough_turns_100`) — routes via Edit 6 IIFE, audio player, chevron with 84 entries (6 short of MD's 90), timestamps seek.
- The 26-Year-Old Behind Obsession (`the_twenty-six-year-old_behind_obsession_...`) — routes via Edit 6 IIFE, audio player, chevron with 60 entries (46 short of MD's 106), timestamps seek.

**Social videos** (all verified rendering via Edit 6 IIFE with correct portrait/landscape sizing):
- bonniesink — Euphoria S3E4 (TikTok, vertical 9:16) — 21 chevron entries vs MD's 85 (encoding split issue, see Section 5).
- Jim Jarmusch on Point Blank (Instagram Reel, vertical) — 83 chevron entries (still TBD vs MD).
- The Coens × Megan Abbott (Instagram Reel, vertical).
- KLOV3R (TikTok, vertical) — two separate videos.
- BBC Radio 6 Rosalía LUX (Instagram, vertical).
- "Analysis for: #ROSALÍA discutiendo en #EUPHORIA" (TikTok, vertical) — works but the row itself is upstream-broken: 0 chevron entries because the MD was ingested with only the framework template stub, no actual analysis content.

**Wall save + reopen flow:**
- Fresh save via in-modal [+] persists correct shape (`type: "audio_article"` or `"social_video"`, `category: "Video & Podcasts"`, slug as `videoId`, real thumbnail, real subtitle).
- Legacy corrupted records (saved earlier today before Part 2 landed, with `type: "ALBUM"` / `category: "Music"` / `universe: "bluenote"`) auto-recover on wall reopen via Part 1's defensive resolution. **Verified:** Obsession, Jarmusch, Coens wall reopens all render correctly despite the corrupted localStorage shape.
- Empire of Auteurs wall reopen unchanged (routes through podcast registry auto-augmentation in `setUniversalModalSafe`).
- Regular film, song, album, podcast wall save + reopen unaffected.

**Cog Type Override** expanded 7→16 types (Justin's `f0321f8`) — Oliver! → musical reclass works.

**Search:** curly-quote normalization works (Justin's `1497ba1` — "A24's" with both straight and curly apostrophes match the same catalog row).

---

## 5. Open issues — v1.9.23 priority queue

In JD's stated priority order:

### [TOP PRIORITY] Per-category Discovery Playlist + Works Discussed truncation

**This is the dominant concern.** Every newly ingested audio_article and social_video JD spot-checks comes up short against its source MD on at least one Discovery Playlist category, often dramatically. Hard data gathered during v1.9.22:

| Video | MD total | Modal | Δ | Specific category-level gaps |
|---|---|---|---|---|
| Empire of Auteurs | 178 | 178 | 0 | clean |
| Attenborough | 90 | 84 | -6 | TBD per-category |
| Obsession | 106 | 60 | **-46** | "Foundational Figure — Jordan Peele" renders 1 of 7 (Get Out only; missing Us, Nope, Key & Peele, Twilight Zone, Candyman, Wendell & Wild) |
| bonniesink Euphoria | 85 | 21 | **-64** | partial cause: catalog encoding split (~62 entries in `byVideo[bare-id]` bucket) — see byVideo normalization item below |
| Jarmusch Reel | ~135 | 83 | -~52 | "Jim Jarmusch's Own Filmography" category renders **0 of 8**; category title doesn't appear in chevron at all |

**Investigation needed:** for each affected row, do row-by-row MD-vs-catalog comparison to determine whether the loss is:
- (a) Client-side aggregation — entries exist in catalog but byVideo build drops them (the bonniesink case)
- (b) Catalog-write loss — entries in MD but never made it into catalog rows
- (c) MD-authoring gaps — entries we think are in MD but actually aren't

Surface row-by-row delta before any fix. Don't escalate to Justin until we've ruled out client-side aggregation. JD has stated: "It's the easiest thing on earth to find things missing, and that has to be really clearly a part of the next set of fixes."

**Files to look at:**
- byVideo build at `src/App.jsx:27659` (S3 refresh path) and `src/App.jsx:27819` (initial load path)
- Catalog: `src/data/enriched-content-catalog.json` (`content[].sources[].video_id` + `.section` + `.category` + `.category_order` + `.category_item_order`)
- Source MDs: lives in JD's YTA folder structure, JD will paste relevant ones

### byVideo bare-ID normalization

Three social_video rows currently have entries split across two byVideo buckets due to a catalog encoding inconsistency: some `sources[].video_id` values use the full prefixed slug (`tiktok_<channel>_<numeric-id>`), others use just the bare numeric ID.

| Slug (canonical) | Prefixed count | Bare-ID count |
|---|---|---|
| `tiktok_bonnieslink_7636086953330494742` | 24 | 62 |
| `tiktok_klov3r_7633938833087810847` | 47 | 47 |
| `tiktok_klov3r_7624189470664936718` | 40 | 38 |

The chevron looks up `byVideo[<prefixed-slug>]` only, so the bare-ID bucket's entries are orphaned. Fix: at byVideo build time, normalize bare-numeric IDs to their prefixed counterpart before bucketing. Both byVideo build sites (line 27659 and line 27819) need the same patch.

Proposed diff (drafted but NOT executed in v1.9.22):

```js
// Build a bare-numeric → prefixed-slug map first
const _bareToPrefixed = {};
(catalog.content || []).forEach(item => {
  (item.sources || []).forEach(src => {
    const vid = src.video_id;
    if (vid && /^(tiktok_|instagram_)/.test(vid)) {
      const m = vid.match(/_(\d{15,})$/);
      if (m) _bareToPrefixed[m[1]] = vid;
    }
  });
});

// Then in the byVideo build, normalize bare-numeric IDs:
let vid = src.video_id;
if (/^\d{15,}$/.test(vid) && _bareToPrefixed[vid]) vid = _bareToPrefixed[vid];
// ... continue existing byVideo bucketing on the normalized vid
```

Plus a dedupe via `Set` so a row with both prefixed and bare sources doesn't get pushed twice.

**Audio_articles are NOT affected** by bare-ID normalization — audit confirmed the 3 audio_article rows have no shadow encodings. Their gaps are likely (b) or (c) from the priority item above.

### Three unguarded modal-open click sites

Edits 1-5 caught five click sites that fire `setUniversalModal` and/or `setEnrichedModalItem`. Three more were identified in audit but NOT patched in v1.9.22:

| Line | Surface | Pattern | Symptom |
|---|---|---|---|
| 5103 | Chevron carousel "Works Discussed" sub-tile click | `onNavigate?.(item.title); setEnrichedModalItem?.(item);` | Race-condition override: onNavigate sets enrichedModalItem to null (correct for audio_article/social_video), then the local `setEnrichedModalItem(item)` immediately overrides. For film sub-tiles from inside an audio_article's chevron, lands wrong-shape data into Path A → broken modal. |
| 5260 | Chevron carousel "Related Discovery" sub-tile click | same pattern as 5103 | same symptom |
| 28727 | SoundtrackPlayer `onOpenEntity` | `setEnrichedModalItem(_ci || null); setUniversalModalSafe(videoId ? {...} : {name, type: type \|\| _ci?.type \|\| "film"})` | No type guard for audio_article/social_video on cross-modal navigation from soundtrack player |

Fix: apply the same `_pathBSlug` routing-guard pattern from Edits 2-5. Defer per JD's scope decision in v1.9.22.

### Catalog-vs-entity-index title divergence

Same `video_id` keyed in two different data files with different display titles. Confirmed for Attenborough:

- `src/data/enriched-content-catalog.json` — title: `"A Hundred Years of David Attenborough"`
- `src/data/all-video-entity-index.json` — title: `"David Attenborough Turns 100"`, channel: `"The New Yorker"`

Causes a save-state mismatch in the search results UI: clicking [+] on the "Videos" section tile (which reads from entity-index, saves with title="David Attenborough Turns 100") vs the "Content" section tile (which reads from catalog, saves with title="A Hundred Years...") results in two different saved wall keys for what is the same underlying content. The [+] save-state indicator doesn't recognize that the other surface has already saved it.

Possible fixes:
- Upstream (Justin): align the title field between catalog and entity-index for the same video_id
- Client-side: reconcile by video_id at search-render time, dedupe across surfaces
- UX: show a "Same content also saved as <other title>" hint

Worth a quick check with Justin on which side this should live.

### Books artwork

Raised by JD at the end of v1.9.22 ship session: in the chevron Discovery carousel and on the book modal itself, book cover artwork isn't surfacing reliably. Investigation steps:

- Check which book rows in `enriched-content-catalog.json` carry artwork (`openLibrary.cover_url`, `thumbnail_url`, or other fields)
- Trace the render path for book tiles in chevron + book modal — find where the artwork URL is read and where it's being dropped
- Cross-check against book modal renders that ARE working (if any) to identify the divergence
- Surface findings before proposing a fix

Could be upstream (artwork field not populated for some book types) or client-side (render path picking wrong field). Need to investigate before deciding.

### Email Justin

Draft prepared in v1.9.22 session, includes: ship notice, pull instructions, what's working, the missing-entries findings (with the hard counts from the priority item above), what we're investigating on our side, request to align catalog/entity-index titles, books artwork flag. JD will send. The draft lives in the v1.9.22 ship session log (Claude conversation history).

### Carried-forward from v1.9.22 OPENED card (still open, lower priority)

Per the original v1.9.22 ACTIVE DEV card from May 2:
- Person modal videos rendering wrong
- Greta Gerwig universe fixes
- Book modal fixes (overlaps with the books artwork item above)
- Pass 2A save-time provenance leak (~6-10 toggleLibrary/GoldAdd sites not writing sourceFilmTitle/sourceFilmTab/sourceUniverse)
- AHS type=film → should be tv-series
- 19 trailer-cleanup stubs needing TMDB enrichment
- Modal stacking
- Format B orphan trailers
- Sibling `.includes()` patterns at App.jsx:15310 / 22302 / 28102
- `entityWorks` film/album-only gap at App.jsx:4303
- 218 unmatched MD entities + 485 stub catalog rows (harvester-side per `docs/harvester-fixes-needed.md`)

---

## 6. Resume checklist — start of next session

1. **Read this handoff doc first.** Then check what JD wants to tackle first (probably top-priority DP truncation).
2. **Cut new dev branch:**
   ```
   cd ~/Desktop/unitedtribes-pocv2-jd
   git checkout 8f7dd57  # or 19503ce if you want the tracker fixups on the new branch base
   git checkout -b jd/v1.9.23-dev
   ```
3. **Start 5174:**
   ```
   npm run dev -- --port 5174
   ```
4. **Verify baseline still works** by re-running the v1.9.22 end-to-end check:
   - Open Attenborough audio_article modal → audio plays, chevron renders, timestamps seek
   - Open bonniesink social_video modal → video plays, chevron renders, timestamps seek
   - Save Obsession to wall via [+] → close → click wall tile → modal reopens correctly
5. **Start on top priority:** per-category DP/WD truncation investigation. Pick one row (suggest Obsession since we already have hard MD count) and do row-by-row MD-vs-catalog delta. Surface raw data before proposing any fix.
6. **Workflow reminder:** JD's standing rule is ASK → CONFIRM → EXECUTE. Surface proposed fixes as diffs for JD review before any code change. No commits without explicit go. No version bumps without explicit go. Mirror App.jsx ↔ PluribusComps.jsx byte-identical after every edit. Update the tracker on every code commit.

---

## 7. Workflow rules tested / reinforced today

These came up explicitly during the v1.9.22 session and are worth flagging for next session:

- **Augment-only tracker rule** — when shipping a version, the existing ACTIVE DEV card body never changes. A new SHIPPED banner gets added at the TOP of the card. The previous CURRENT STATE blocks demote to "EARLIER SNAPSHOT" labels but their bodies stay verbatim. New version card opens ABOVE the previous version card.
- **The actual rendered cards are at lines 592+, not the Quick Start summary at the top.** When updating the tracker for a ship, BOTH sections need updates. Easy to miss the version-card section if you only edit the Quick Start. Today's session made this mistake initially (commits 855d623 + 45947c3 only touched Quick Start) and had to follow up with 19503ce to fix the actual version cards.
- **Don't take initiative on changes** — JD repeatedly corrected the assistant for proposing fixes beyond what was asked. Always surface findings, propose specific diffs, wait for explicit go.
- **When JD pushes back on a conclusion, trust the pushback.** Today's session had three cases where the assistant's initial diagnostic framing was wrong (the blank-screen ReferenceError, the "bonniesink is upstream" misframing, the "Path B has no [+] button" misframing). In each case, JD's instinct that the simpler explanation or the in-scope investigation was right turned out to be right.
- **Verify before declaring something out of scope.** Calling bug 2 "upstream / Justin's harvester" was wrong — it was a client-side encoding issue once the catalog data was actually inspected. The pattern: don't close off investigation prematurely.
- **For UI/state bugs, ask for DevTools console output before guessing.** Two of today's bugs were diagnosed in seconds once the user pasted the actual console error message and the iframe URL.

---

## 8. File / port / branch reference

**Working directory:** `~/Desktop/unitedtribes-pocv2-jd/`
**Local branch:** `jd/v1.9.22-dev` @ `19503ce` (will be checked out as `jd/v1.9.23-dev` from `8f7dd57` next session)
**Frozen reference (v1.9.21):** worktree at `~/Desktop/unitedtribes-pocv2-v1.9.21-shipped/`, detached HEAD `712c3ee`, served on port 5175

**Ports:**
- 5174 — v1.9.23 dev (after next session opens it) on this repo
- 5175 — v1.9.21 frozen reference (separate worktree)
- 5177 — constellation experimental track (parallel branch `jd/constellation-demo`, local-only by design)
- 5173 — v1.8.6 baseline (different repo) or v1.9.17-merged rollback
- 5179 — Universal Modal experimental page (different surface, dead repo per memory rule)

**Key files (in this repo):**
- `src/App.jsx` — the entire app (~29K lines, single-file React component). All today's edits land here.
- `src/PluribusComps.jsx` — byte-identical mirror of App.jsx. Maintained after every edit via `cp src/App.jsx src/PluribusComps.jsx`.
- `src/data/enriched-content-catalog.json` — Justin's catalog, 19,245 rows. Top-level shape: `{metadata, content: [...]}`. Each item has `title`, `type`, `sources[]`, plus type-specific fields (`audio_url`, `video_url`, `thumbnail_url`, `tmdb`, `youtube`, `spotify`, `openLibrary`, etc.).
- `src/data/all-video-entity-index.json` — entity-index, 66.55 MB, GitHub flags this on push.
- `src/data/general-video-entity-index.json` — same for general universe.
- `src/data/podcast-registry.json` — podcast metadata, used by `setUniversalModalSafe` for auto-augmentation when videoId matches a registry entry.
- `pocv2-jd-design-reskin-versions.html` — THE tracker. ONE tracker per JD's standing rule, lives here, never duplicated elsewhere.

**Remotes:**
- `origin` — https://github.com/United-Tribes/unitedtribes_universes_poc.git
- `jdagogo` — https://github.com/jdagogo/unitedtribes-pocv2-jd-design-reskin.git

**Push targets used on ship (per standing rule):**
- `git push origin <local>:main`
- `git push origin <local>:jd/design-reskin-v3`
- `git push jdagogo <local>:jd/design-reskin-v3`

`-dev` branches stay local per JD's "never push -dev branches" rule.

**Build / dev commands:**
```bash
# Start dev server on 5174
cd ~/Desktop/unitedtribes-pocv2-jd && npm run dev -- --port 5174

# Build (verify no errors after edits)
npm run build

# Mirror App.jsx → PluribusComps.jsx
cp src/App.jsx src/PluribusComps.jsx && diff -q src/App.jsx src/PluribusComps.jsx
```

**Data refresh:**
```bash
# Pulls Justin's latest catalog + entity indexes from S3, runs section-7 patcher
bash pull-data.sh
```
~85s cold / ~10s warm. No cron exists per Justin's May 4 confirmation. Manual only.

---

## 9. Key state to know about

- **localStorage on JD's browser** has five wall items as of ship time, three of them in legacy "ALBUM"-corrupted shape but auto-recovering via Part 1. No cleanup needed but cleanup-on-resave will gradually replace them with correct shape.
- **Empire of Auteurs special case:** it's in `podcast-registry.json` with `video_id: "a24s_empire_of_auteurs"` and a Dropbox MP4 URL. `setUniversalModalSafe` (line 27566) auto-augments any modal payload with `videoId === <registry key>` to include `podcastUrl`. That's why Empire of Auteurs renders the dark navy wrapper + 202×202 artwork (the podcast section at line 4930) instead of Edit 6's IIFE. Other audio_articles (Attenborough, Obsession) are NOT in the registry, so they render through the IIFE. Both paths now work end-to-end but their visual treatment differs — the IIFE is the "thin" variant. Worth thinking about whether to align them in v1.9.23 if it becomes a UX issue.
- **`"Analysis for: #ROSALÍA discutiendo en #EUPHORIA"` row** (`tiktok_chicaqdicesssss_7635917080105258242`) is an upstream-broken row: 0 chevron entries, description is the framework template stub text, title has "Analysis for:" prefix. Renders technically correctly but has no content. Probably needs JD to re-author the MD on the YTA side. Tracking this for v1.9.23 books artwork investigation or as a separate item.
- **JD's spot-checks repeatedly outperformed aggregate audits during this session.** Three times, the assistant's framing was wrong and JD's instinct was right (the blank-screen ReferenceError vs the "diagnose more" framing; the "bonniesink is upstream" misframing vs the bare-ID encoding split; the "Path B has no save button" misframing vs the in-modal [+] at line 3861 being the actual corruptor). Surface raw data for JD to validate before drafting any summary or memo. Don't close off investigation prematurely on aggregate-counts evidence alone.
- **Two pre-existing issues flagged in passing today** but not investigated:
  - GitHub's 50MB file warning on `all-video-entity-index.json` — Git LFS migration would address this
  - Constellation experimental track on 5177 (parallel branch `jd/constellation-demo`) is local-only by design and paused. Not in scope for v1.9.23 unless JD explicitly reopens it.

---

## 10. Email to Justin — status

Drafted in v1.9.22 ship session. Sections:
- v1.9.22 shipped to main, pull instructions
- Direct links: main, ship commit, data refresh commit, full tracker on GitHub
- What's working end-to-end (audio_article modals + social_video modals + cog type-override + curly-quote search + Spotify fallback + wall save/reopen)
- What we're seeing on the new content (the missing-entries table — Obsession 60/106, Attenborough 84/90, bonniesink 21/85, Jarmusch 83/~135, Empire of Auteurs 178/178 clean)
- Specific category-level gaps (Obsession Jordan Peele 1 of 7, Jarmusch Filmography 0 of 8, bonniesink partial-encoding-split explanation)
- Other open items (three unguarded click sites, title divergence, books artwork)
- Note that v1.9.23 dev opens with these queued

JD will edit + send. **The draft lives in the architect Claude session log (the web Claude conversation), NOT in the Claude Code session log.** A fresh Claude Code session has no way to retrieve it — JD will need to paste the draft back into a new session if redrafting is needed. Not committed to repo.

---

## End

Push state as of this doc:
- `origin/main` @ `19503ce`
- `origin/jd/design-reskin-v3` @ `19503ce`
- `jdagogo/jd/design-reskin-v3` @ `19503ce`
- `jd/v1.9.22-dev` (local) @ `19503ce`

Next session: cut `jd/v1.9.23-dev` from `8f7dd57`, start on per-category DP/WD truncation investigation.

— Drafted Sun May 17, 2026 by Claude in the v1.9.22 ship session.
