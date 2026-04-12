# Spotify Override — Diagnosis for Claude

**Date:** Saturday April 11, 2026, ~5:00 PM
**Repo:** `~/Desktop/unitedtribes-pocv2-jd/` on branch `jd/design-reskin-v3`
**Port:** 5174 (dev) — `localhost:5174/jd-universes-poc/universes-poc/`
**Base commit to read from:** `475a298` (INTERIM: Spotify override system) + uncommitted work on top
**Test entity:** "Moonage Daydream"

---

## 1. The Goal (plain English)

When a user opens an album modal and the Spotify embed on the left is the **wrong album** (the harvester / enriched catalog returned some unrelated record that happens to share a name), the user should be able to click the cog, paste a correct Spotify **album or playlist URL**, click Save & Reload, and have the modal refresh in place with the correct Spotify content on the left side. The override must persist across reopens and propagate to the Full Player (`SoundtrackPlayer.jsx`) when opened from that modal.

**The concrete failing case:**

- "Moonage Daydream" — David Bowie's 1971 song from *The Rise and Fall of Ziggy Stardust*.
- The data pipeline returns "Moonage Daydream (Original Motion Picture Soundtrack)" by **Thomas James White** — an unrelated film score for the Brett Morgen Bowie documentary. Wrong album, wrong artist.
- User wants to paste `https://open.spotify.com/playlist/2APwn5RRRyFC7TUN0IOPtT` (a Bowie playlist) as the override.
- The cog button fires, logs confirm the save reaches localStorage, but the modal's Spotify side never updates.

---

## 2. Architecture (what exists today)

### 2a. Single-file React app
- `src/App.jsx` — ~27,000 lines, React 19, Vite 7. Contains `UniversalModal` (the main entity modal component), `CachePanel` (the cog overlay rendered inside UniversalModal), and ~11 other screens.
- `src/components/SoundtrackPlayer.jsx` — separate component (the "Full Player") for film soundtracks, opens as a fullscreen overlay via `window.__openSoundtrackPlayer(...)`.

### 2b. Multiple modal render paths for the same entity

This is the part I think I've been missing. `UniversalModal`'s main `useEffect` (~line 1957) is a resolution pipeline with **several early-return branches** that each render a different modal flavor. For a given entity, exactly one branch wins:

1. **Direct video / direct podcast** — early returns at ~1962 and ~1973
2. **Enriched catalog intercept** (~line 2026) — if the entity matches an item in `enrichedCatalogContent` with the right type, it calls `setEnrichedModalItem(_ciMatch)` and `return`s. This causes a **separate** enriched-catalog modal to render (rendered outside the main pipeline somewhere). **I never wired my Spotify override into this path.**
3. **Discovery cache hit** (~line 2122) — if `dc[cleanN].spotify` exists, uses cached data and returns
4. **Harvester SONG fast path** (~line 2306) — matched track
5. **Harvester ALBUM fast path** (~line 2348) — matched album. **This is the path I did wire my override into, at ~line 2465.**
6. Simple mode / fallback

### 2c. SoundtrackPlayer override (separate subsystem)

`SoundtrackPlayer.jsx` has its own cog with YouTube and Spotify fields. It reads from:

```
localStorage["soundtrack_overrides_" + title.toLowerCase().replace(/\s+/g, "_")]
```

Format (as of my latest commits):
- `{ score: { type: "playlist", id: "..." }, music: { ... }, score_spotify: "album:XXX" | "playlist:XXX" | "", music_spotify: "..." }`
- Empty string `""` for `score_spotify` = explicit clear sentinel. Key presence = user has made a choice. Key absence = fall through to auto-lookup via `window._utDataClient.getSoundtrack()`.
- Storage format is prefixed: `album:ID` or `playlist:ID`. Legacy bare 22-char values read as album (back-compat).

### 2d. CachePanel override (what I added today)

`CachePanel` is rendered inside `UniversalModal`. Has three sections:
- Type override (PERSON / MUSICIAN / FILM / TV / ALBUM / SONG / BOOK)
- YouTube Override — writes to `ut_yt_overrides[cleanN]`
- **Spotify Override (new)** — writes to `soundtrack_overrides_${cleanN}.score_spotify` using the **same key** `SoundtrackPlayer` reads, with sentinel semantics.

Both Save buttons now call `onReload()` which:
1. Bumps `cacheBustCounter` (state in `UniversalModal`)
2. Sets `showModalCachePanel(false)` to close the cog overlay

`cacheBustCounter` is in the main `mediaData` useEffect deps (line 2683) and is baked into `_fetchKey` (line 1984) to defeat the `fetchingRef.current === _fetchKey` short-circuit guard.

---

## 3. What I implemented (commit 475a298 + uncommitted follow-up)

### 475a298 — "Spotify override system" commit

1. Added Spotify Override field to CachePanel with Save & Reload button
2. Un-gated SoundtrackPlayer cog Spotify fields in album mode
3. Cross-surface sync fix: `__openSoundtrackPlayer` call at line 3465 now passes `title: name` (entity name) instead of `title: mediaData.ytAlbum?.title || name` (harvester's wrong label), so the Full Player and album modal converge on the same localStorage key
4. Playlist URL support (not just albums) — prefixed storage format
5. Sentinel-clear semantics with `"in"` operator
6. **Harvester album fast path (~line 2465) reads the override** and builds the correct embed URL

### Uncommitted follow-up (in response to JD testing)

7. `cacheBustCounter` state added to `UniversalModal` (~line 1582)
8. Added to main `useEffect` deps (line 2683)
9. Added to `_fetchKey` (line 1984) so bumping the counter defeats the `fetchingRef` guard
10. `onReload` function passed from `UniversalModal` to `CachePanel` (both render sites — 2881 and 3500)
11. Both YouTube Save and Spotify Save buttons in CachePanel now call `onReload()` instead of the old in-place text feedback / modal close

---

## 4. The failing symptom

**User clicks Save & Reload. Console confirms the save happened. The modal's Spotify side does not update.**

Here are the relevant logs after pasting `https://open.spotify.com/playlist/2APwn5RRRyFC7TUN0IOPtT?si=QdK4wYW-Rl-S6oYxZrW2Eg` and clicking the green Save & Reload button:

```
App.jsx:1525 [Modal] SPOTIFY OVERRIDE SAVE CLICKED {key: 'soundtrack_overrides_moonage_daydream', raw: 'https://open.spotify.com/playlist/2APwn5RRRyFC7TUN0IOPtT?si=QdK4wYW-Rl-S6oYxZrW2Eg', wasSet: true}
App.jsx:1553 [Modal] SPOTIFY OVERRIDE SAVED: Moonage Daydream {score_spotify: 'playlist:2APwn5RRRyFC7TUN0IOPtT'}
App.jsx:1640 [UTDataClient] Soundtrack lookup for "Moonage Daydream" — client ready: true, catalog: 14425
App.jsx:1643 [UTDataClient] Soundtrack result: Moonage Daydream (Original Motion Picture Soundtrack)
App.jsx:1646 [UTDataClient] Needle drops: 0
App.jsx:1640 [UTDataClient] Soundtrack lookup for "Moonage Daydream" — client ready: true, catalog: 14425
App.jsx:1643 [UTDataClient] Soundtrack result: Moonage Daydream (Original Motion Picture Soundtrack)
App.jsx:1646 [UTDataClient] Needle drops: 0
```

### What the logs prove

✅ The button click handler fires (`SAVE CLICKED`)
✅ `localStorage.setItem` succeeds — the prefixed format `"playlist:2APwn5RRRyFC7TUN0IOPtT"` is correct
✅ Something triggers a re-render because the UTDataClient useEffect (~line 1631) fires twice (strict mode double)

### What's conspicuously missing

❌ **No `[Modal] routing:` log** (line 1993) — this is the first log in the main `mediaData` useEffect body, after the early-return gauntlet. Its absence means **the main resolution pipeline is not running on save.** Either:
  a) The useEffect isn't being triggered on `cacheBustCounter` change despite being in the deps, OR
  b) It IS being triggered but an earlier early-return branch fires first

❌ **No enriched-catalog or harvester album log** — means the harvester ALBUM fast path at ~2465 (which I wired the override into) is **definitely not running on save**, so my override resolution code is dead code for this entity.

❌ **Nothing in the UI updates** — Spotify side still shows the wrong Thomas James White album.

---

## 5. Fresh hypothesis (not yet tested)

**"Moonage Daydream" is being rendered via the enriched catalog intercept at line 2026, not the harvester album fast path.**

Evidence:
- The initial-open logs include `enrichment.js:148 [_safeFetch] URL: /api/sml/youtube-playlist?playlistId=PLzEMkaHCB3WLPuBZTpmOu_jX0YIqwfQdX` — that's `findPlaylist()` from `enrichment.js`, not the harvester album fast path
- `[UTDataClient] Soundtrack result: Moonage Daydream (Original Motion Picture Soundtrack)` confirms the UTDataClient (which reads the **enriched catalog**) has an entry for this title
- The intercept condition at line 2026:
  ```js
  if (!enrichedModalItem && enrichedCatalogContent?.length && !_isAlbumType && !_isPersonType && _interceptAllowed) {
  ```
- `_isAlbumType` requires an explicit `album` type override from `typeHint`/`typeOverride`. Moonage Daydream is probably being clicked without an explicit album type, so `_isAlbumType` is false → the intercept runs.
- The intercept calls `setEnrichedModalItem(_ciMatch)` and `return`s, which causes an entirely **separate** modal render path (`enrichedModalItem` → different render branch) — not the harvester album fast path where my fix lives.

**If this hypothesis is right:**
- My override code at line 2465 has literally never executed for this entity
- Save & Reload bumps the counter, useEffect re-runs, hits the enriched catalog intercept again, calls `setEnrichedModalItem(_ciMatch)` with the **same stale catalog item**, and returns — no override consulted
- The Spotify embed URL in the enriched catalog modal comes from `_ciMatch.spotify.album_id` directly

**What I'd need to do:**
Wire the Spotify override read into whatever code renders the enriched catalog modal's Spotify embed. I need to find that render site (grep for `enrichedModalItem` rendering / `ci.spotify.album_id` / `embed/album/${...}` near enriched catalog).

---

## 6. Alternative hypotheses (less likely but worth considering)

### 6a. Strict mode is double-running everything and the useEffect IS firing, but an earlier branch short-circuits silently without a log

Possible. The early-return branches at 1962, 1973 don't log anything. But `directPlaylistData?.playlistId` and `directVideoId` should both be falsy for an album modal click — unless the enriched catalog click routes through a different prop path I'm not seeing.

### 6b. The useEffect isn't running at all because `cacheBustCounter` bump isn't propagating

If `cacheBustCounter` is bumped via `setCacheBustCounter(n => n + 1)` but React batches it in a way that suppresses the effect — seems unlikely in React 19, but possible. Could test by adding a `console.log("[cacheBust]", cacheBustCounter)` at the top of UniversalModal function body.

### 6c. The `fetchingRef` guard is still winning

I appended `:cb:${cacheBustCounter}` to `_fetchKey`. But if the useEffect body isn't running at all, the ref comparison never happens. This only matters if the effect is running.

---

## 7. Key code locations

- `src/App.jsx` line **1525** — `[Modal] SPOTIFY OVERRIDE SAVE CLICKED` log
- `src/App.jsx` line **1553** — `[Modal] SPOTIFY OVERRIDE SAVED` log
- `src/App.jsx` line **1582** — `cacheBustCounter` useState
- `src/App.jsx` line **1631-1648** — UTDataClient soundtrack lookup useEffect (fires on save per logs)
- `src/App.jsx` line **1957** — main `mediaData` resolution useEffect start
- `src/App.jsx` line **1984** — `_fetchKey` with `:cb:${cacheBustCounter}`
- `src/App.jsx` line **1985** — `fetchingRef.current === _fetchKey` early return
- `src/App.jsx` line **1993** — `[Modal] routing:` log (not firing)
- `src/App.jsx` line **2026** — enriched catalog intercept (`setEnrichedModalItem(_ciMatch); return;`)
- `src/App.jsx` line **2348** — harvester ALBUM fast path start
- `src/App.jsx` line **2465** — **where I wired the Spotify override resolution** (unreachable?)
- `src/App.jsx` line **2683** — main useEffect deps with `cacheBustCounter`
- `src/App.jsx` line **2881 / 3500** — CachePanel render sites with `onReload` prop
- `src/App.jsx` line **3465** — `__openSoundtrackPlayer` call (cross-surface fix)

### CachePanel Spotify override write (what fires in the log):

```jsx
<button onClick={() => {
  console.log("[Modal] SPOTIFY OVERRIDE SAVE CLICKED", { key: _stKey, raw: spotifyOverrideInput, wasSet: spotifyOverrideWasSet });
  if (!_stKey) { setSpotifyOverrideError("No entity name"); return; }
  const raw = spotifyOverrideInput.trim();
  let parsedRef = null;
  let doClear = false;
  if (raw) {
    const albumMatch = raw.match(/open\.spotify\.com\/album\/([a-zA-Z0-9]{22})/);
    const playlistMatch = raw.match(/open\.spotify\.com\/playlist\/([a-zA-Z0-9]{22})/);
    if (albumMatch) parsedRef = `album:${albumMatch[1]}`;
    else if (playlistMatch) parsedRef = `playlist:${playlistMatch[1]}`;
    else if (/^[a-zA-Z0-9]{22}$/.test(raw)) parsedRef = `album:${raw}`;
    if (!parsedRef) { setSpotifyOverrideError("Not a valid Spotify album or playlist URL"); return; }
  } else if (spotifyOverrideWasSet) { doClear = true; }
  else { setSpotifyOverrideError("Paste a Spotify album or playlist URL first"); return; }
  let current = {};
  try { current = JSON.parse(localStorage.getItem(_stKey)) || {}; } catch {}
  if (parsedRef) current.score_spotify = parsedRef;
  else if (doClear) current.score_spotify = "";
  localStorage.setItem(_stKey, JSON.stringify(current));
  try { const _dc3 = JSON.parse(localStorage.getItem("ut_discovery_cache") || "{}"); if (_dc3[cleanN]) { delete _dc3[cleanN]; localStorage.setItem("ut_discovery_cache", JSON.stringify(_dc3)); } } catch {}
  console.log("[Modal] SPOTIFY OVERRIDE SAVED:", cleanN, current);
  if (onReload) onReload();
  else setShowModalCachePanel(false);
}}>Save & Reload</button>
```

### `onReload` (passed to CachePanel from UniversalModal):

```jsx
onReload={() => { setCacheBustCounter(n => n + 1); setShowModalCachePanel(false); }}
```

### Harvester ALBUM fast path Spotify override resolution (line ~2465 — may be unreachable):

```js
const _stKeyAlb = `soundtrack_overrides_${cleanName.toLowerCase().replace(/\s+/g, "_")}`;
let _stOverrideAlb = {};
try { _stOverrideAlb = JSON.parse(localStorage.getItem(_stKeyAlb)) || {}; } catch {}
let _resolvedSpotifyEmbedUrl = null;
let _resolvedSpotifyType = "album";
let _resolvedSpotifyFlatId = null;
if ("score_spotify" in _stOverrideAlb) {
  const ref = _stOverrideAlb.score_spotify || "";
  if (ref) {
    const s = String(ref);
    let type = "album", id = null;
    if (s.startsWith("playlist:")) { type = "playlist"; id = s.slice(9); }
    else if (s.startsWith("album:")) { type = "album"; id = s.slice(6); }
    else { type = "album"; id = s; }
    _resolvedSpotifyEmbedUrl = `https://open.spotify.com/embed/${type}/${id}?utm_source=generator&theme=0`;
    _resolvedSpotifyType = type;
    if (type === "album") _resolvedSpotifyFlatId = id;
  }
} else if (hAlbum.spotify_album_id) {
  _resolvedSpotifyEmbedUrl = `https://open.spotify.com/embed/album/${hAlbum.spotify_album_id}?utm_source=generator&theme=0`;
  _resolvedSpotifyFlatId = hAlbum.spotify_album_id;
}
const _harvAlbumData = {
  _detectedType: "album",
  spotify: _resolvedSpotifyEmbedUrl ? { embedUrl: _resolvedSpotifyEmbedUrl, type: _resolvedSpotifyType } : null,
  album: { title: hAlbum.title, artist: hAlbumArtist.name, spotifyId: _resolvedSpotifyFlatId, albumArtUrl: hAlbum.album_art_url || null },
  // ...
};
```

---

## 8. What I need from Claude

1. **Confirm or disprove the enriched catalog intercept hypothesis.** Is Moonage Daydream actually rendered via the enriched catalog path? How do I verify from the existing logs, or what debug log should I add to know for sure?
2. **If it IS the enriched catalog path**, where is the enriched catalog modal's Spotify embed rendered? I need to find the equivalent of the hard-coded `https://open.spotify.com/embed/album/${ci.spotify.album_id}` and wire the override check there too.
3. **Is there a way to make this override surface apply uniformly across all render paths**, rather than having to patch each one separately? The clean architecture would be a single resolution helper that takes `(entityName, fallbackSpotifyId)` and returns the final embed URL + type, called from every render site. Is that feasible to retrofit here without breaking anything?
4. **Sanity check the `cacheBustCounter` approach** — is there a better idiom in React 19 for forcing a useEffect re-run without changing its natural dependencies? The current approach feels hacky.
5. **JD's workflow rule: ask before writing code.** Don't ship any fixes in the response — I need to bring the plan back to him for approval before touching files.

---

## 9. Non-goals / what's already working

- SoundtrackPlayer cog override (film mode): works end-to-end for all tested films
- Orphan album modal (non-harvested films like 8½): works, reads the same override key
- Cross-surface sync (album modal → Full Player via `title: name` fix): works in principle, but depends on the album modal actually honoring the override in the first place — which for Moonage Daydream it doesn't
- Save & Reload button firing and writing to localStorage: confirmed working per logs
- The YouTube override (above the Spotify override in the same cog panel) has been working fine for a long time and I'm assuming it goes through a different code path that does honor its cache wipe. Worth comparing how YouTube override propagation works to figure out what Spotify is missing.

---

## 10. One more data point

The user previously set a Spotify override via the Full Player cog **before** my cross-surface sync fix. That override was written to the wrong localStorage key (`soundtrack_overrides_moonage_daydream_(original_motion_picture_soundtrack)`) because Full Player was receiving the harvester's wrong title. That orphaned entry is still in localStorage and nothing reads it now. It is **not** the source of the current bug — the new saves go to the correct short key (`soundtrack_overrides_moonage_daydream`), as the logs confirm. But worth knowing there may be stale junk in localStorage from earlier test sessions.
