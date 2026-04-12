# Spotify Override — Diagnosis v2 (previous hypothesis was wrong)

**Date:** Saturday April 11, 2026, ~5:15 PM
**Repo:** `~/Desktop/unitedtribes-pocv2-jd/` on branch `jd/design-reskin-v3`
**Test entity:** "Moonage Daydream"
**Status:** Save & Reload still does nothing visible. User is frustrated and wants to move on.

---

## TL;DR

The `resolveSpotifyEmbed` helper is correctly wired into three call sites (enriched catalog render branch, harvester album fast path, orphan album useEffect). For Moonage Daydream, the logs prove **none of those three paths are the one producing the wrong Spotify embed**. The entity is rendering via a **fourth path** I haven't identified yet.

---

## What the latest logs prove

**Initial open of Moonage Daydream:**
```
[UTDataClient] Soundtrack lookup for "Moonage Daydream" — client ready: true, catalog: 14425
[UTDataClient] Soundtrack result: Moonage Daydream (Original Motion Picture Soundtrack)
[UTDataClient] Needle drops: 0
enrichment.js:148 [_safeFetch] URL: /api/sml/youtube-playlist?playlistId=PLzEMkaHCB3WLPuBZTpmOu_jX0YIqwfQdX
[UTDataClient] Soundtrack lookup for "Moonage Daydream" — (strict mode second run)
enrichment.js:148 [_safeFetch] URL: /api/sml/youtube-playlist?playlistId=PLzEMkaHCB3WLPuBZTpmOu_jX0YIqwfQdX
```

**After Save & Reload:**
```
[Modal] SPOTIFY OVERRIDE SAVE CLICKED {key: 'soundtrack_overrides_moonage_daydream', raw: 'https://open.spotify.com/playlist/2APwn5RRRyFC7TUN0IOPtT?si=HX8h7oUmSCq6DQw6rz3Suw', wasSet: true}
[Modal] SPOTIFY OVERRIDE SAVED: Moonage Daydream {score_spotify: 'playlist:2APwn5RRRyFC7TUN0IOPtT'}
```

**What's still missing after save:** `[Modal] routing:` (the main mediaData useEffect body log). No `_safeFetch` re-run. No `[UTDataClient]` re-run. No visible change in the Spotify side.

---

## The critical new evidence

The log `enrichment.js:148 [_safeFetch] URL: /api/sml/youtube-playlist?playlistId=PLzEMkaHCB3WLPuBZTpmOu_jX0YIqwfQdX` on initial open is a call to `findPlaylist()` from `enrichment.js`, passing an explicit `playlistId`. In the codebase, `findPlaylist` with an explicit `playlistId` arg is called from exactly two places:

1. **Orphan album useEffect in UniversalModal** (around line 1920): `findPlaylist(filmTitle, searchType, composer, directPlaylistData.playlistId)` — only runs when `directPlaylistData?.playlistId` is truthy
2. **SoundtrackPlayer.jsx** `fetchSoundtrack` — only runs when Full Player is open

The user is not opening the Full Player for this test. So the call is coming from the orphan album useEffect. Which means `directPlaylistData.playlistId` IS set for this modal open of Moonage Daydream.

**But the orphan album useEffect HAS my resolveSpotifyEmbed helper wired in.** So the resolution should work on first open — and it should show the Bowie playlist override on re-open if the override was saved... but it doesn't.

Wait — re-reading the logs more carefully: the `_safeFetch` happens only on **initial open**, NOT after Save & Reload. That's the key. The orphan album useEffect runs once when the modal opens, builds `mediaData.spotify` from the helper's return value, and caches it in state. After Save & Reload:
- `cacheBustCounter` bumps
- The main mediaData useEffect re-runs (because `cacheBustCounter` is in its deps)
- BUT the **orphan album useEffect does NOT re-run** — its deps are `[directPlaylistData?.playlistId, directPlaylistData?.playlistType, directPlaylistData?.filmTitle, directPlaylistData?.filmTab]` (no cacheBustCounter)
- `mediaData.spotify` stays stale with whatever the helper resolved on initial open
- The render uses the stale `mediaData.spotify` → Spotify side never changes

---

## The wrinkle

But wait — on **initial open**, the helper should already have resolved the override to the Bowie playlist (assuming a prior save was in localStorage). So the first render should already show Bowie. The user says it shows Thomas James White. Which means either:

a) The helper IS returning the correct override on initial open, but something else downstream is using `mediaData.album.spotifyId` (the bare fallback ID) instead of `mediaData.spotify.embedUrl`. The orphan useEffect sets `album.spotifyId` to the bare album ID only for album-type overrides, null for playlists. If the render branch constructs its own embed URL from `album.spotifyId`, it would skip the helper's result entirely.

b) The helper is NOT being called because the orphan album useEffect isn't firing at all on this modal open. The `_safeFetch` in the log might be coming from somewhere else (maybe a fifth code path I haven't found).

c) The orphan album useEffect IS firing but the user's override is NOT in localStorage under `soundtrack_overrides_moonage_daydream` — maybe it's under a different key variant and I'm looking in the wrong place.

---

## What I need

**One diagnostic log** at the top of the orphan album useEffect, logging whatever `directPlaylistData` contains:

```js
useEffect(() => {
  if (!directPlaylistData?.playlistId) return;
  console.log("[orphan album] useEffect firing", {
    filmTitle: directPlaylistData.filmTitle,
    playlistId: directPlaylistData.playlistId,
    filmTab: directPlaylistData.filmTab,
    localStorageKey: `soundtrack_overrides_${directPlaylistData.filmTitle.toLowerCase().replace(/\s+/g, "_")}`,
    localStorageValue: localStorage.getItem(`soundtrack_overrides_${directPlaylistData.filmTitle.toLowerCase().replace(/\s+/g, "_")}`),
  });
  // ... rest of useEffect
}, [...]);
```

**One diagnostic log** inside `resolveSpotifyEmbed`:

```js
function resolveSpotifyEmbed(entityName, fallbackAlbumId, slot = "score_spotify") {
  const key = `soundtrack_overrides_${entityName.toLowerCase().replace(/\s+/g, "_")}`;
  const raw = localStorage.getItem(key);
  console.log("[resolveSpotifyEmbed]", { entityName, key, raw, slot, fallbackAlbumId });
  // ... rest
}
```

These two logs will answer:

1. Is the orphan album useEffect actually running for this modal open? (The `_safeFetch` implies yes, but the `[orphan album] useEffect firing` log will confirm)
2. What key is the orphan album useEffect looking up? Is it `soundtrack_overrides_moonage_daydream`, or is `filmTitle` something different like `"Moonage Daydream (Original Motion Picture Soundtrack)"` or `"moonage daydream - original score"` due to suffix mangling?
3. What value is in localStorage under that key? If the log shows `null` or a different key, the key mismatch theory is confirmed.
4. Does the helper return the correct override object?

---

## Secondary fix needed regardless

Even if the diagnostic logs reveal a key mismatch, the orphan album useEffect still has a separate problem: **its deps don't include `cacheBustCounter`**, so Save & Reload never re-runs it. After the user saves an override, the useEffect needs to re-fire to rebuild mediaData with the fresh override. Otherwise mediaData.spotify stays stale until the modal is closed and reopened.

The fix is one line: add `cacheBustCounter` to the useEffect deps array at the end of the orphan album useEffect (~line 1954). But this requires threading cacheBustCounter into that useEffect's scope — it's declared in UniversalModal's function body which already has access, so it should just work.

---

## Question for Claude

Given:
1. Moonage Daydream is hitting the orphan album useEffect (evidenced by `_safeFetch` to SML)
2. The orphan album useEffect already calls `resolveSpotifyEmbed` (just wired in)
3. After Save & Reload, the orphan album useEffect does NOT re-run (cacheBustCounter not in deps)
4. But ALSO on initial open, the Spotify side shows the wrong album — implying the helper resolution is not reaching the render

**What should the single next debugging action be?**

Option A — Add the two console.log diagnostics above and retest, then come back with the results.

Option B — Skip diagnostics, just ship both fixes in one commit:
- Add `cacheBustCounter` to orphan album useEffect deps
- Move the Spotify resolution OUT of the orphan album useEffect and into a render-time computation (similar to what worked in the enriched catalog branch). This means `mediaData.spotify` no longer holds the final embed URL — the render JSX calls `resolveSpotifyEmbed` at render time, using whatever fallback is appropriate for that render branch.

Option C — Something else. Maybe the orphan album modal render branch (wherever it is) has its own hard-coded `${id}?utm_source=generator` embed URL construction that bypasses `mediaData.spotify.embedUrl` entirely. Grep for `embed/album/${` and `embed/playlist/${` inside the render branches for orphan album mode to find any stragglers.

Recommendation wanted: which option, and what specific code changes?

---

## Relevant code locations

- `src/App.jsx` line ~1566 — `resolveSpotifyEmbed` helper definition (module scope)
- `src/App.jsx` line ~1795 — orphan album useEffect (has helper wired in, missing cacheBustCounter in deps)
- `src/App.jsx` line ~1954 — orphan album useEffect deps array
- `src/App.jsx` line ~2465 — harvester album fast path (has helper wired in)
- `src/App.jsx` line ~2903 — enriched catalog `const _resolvedCiSpotify = resolveSpotifyEmbed(cleanName, ci.spotify?.album_id)`
- `src/App.jsx` line ~2929 — enriched catalog render with `_resolvedCiSpotify.embedUrl`

## What the current helper looks like

```js
function resolveSpotifyEmbed(entityName, fallbackAlbumId, slot = "score_spotify") {
  if (!entityName) {
    if (fallbackAlbumId) {
      return { embedUrl: `https://open.spotify.com/embed/album/${fallbackAlbumId}?utm_source=generator&theme=0`, type: "album", id: fallbackAlbumId };
    }
    return null;
  }
  const key = `soundtrack_overrides_${entityName.toLowerCase().replace(/\s+/g, "_")}`;
  let overrides = {};
  try { overrides = JSON.parse(localStorage.getItem(key)) || {}; } catch {}
  if (slot in overrides) {
    const ref = overrides[slot];
    if (!ref) return null;
    const s = String(ref);
    let type = "album", id = null;
    if (s.startsWith("playlist:")) { type = "playlist"; id = s.slice(9); }
    else if (s.startsWith("album:")) { type = "album"; id = s.slice(6); }
    else { type = "album"; id = s; }
    return { embedUrl: `https://open.spotify.com/embed/${type}/${id}?utm_source=generator&theme=0`, type, id };
  }
  if (fallbackAlbumId) {
    return { embedUrl: `https://open.spotify.com/embed/album/${fallbackAlbumId}?utm_source=generator&theme=0`, type: "album", id: fallbackAlbumId };
  }
  return null;
}
```

## JD context

- User is testing Moonage Daydream by opening it from somewhere (possibly the wall, possibly a song modal, possibly direct entity link — not confirmed)
- Full Player (SoundtrackPlayer.jsx) is NOT open during this test
- User has pasted `https://open.spotify.com/playlist/2APwn5RRRyFC7TUN0IOPtT?si=...` in the cog panel and clicked Save & Reload
- localStorage key `soundtrack_overrides_moonage_daydream` DOES get written (log confirms it)
- Modal's Spotify side still shows Thomas James White's wrong album, not the Bowie playlist
- JD wants to move on to other work and needs this fixed or deferred with a clear recovery path
