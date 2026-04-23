// Standalone derivation prototype for the "Appears in" pill on song modals.
// Pure — no React, no App.jsx imports. Exposed on window via a dev-only
// useEffect in App.jsx (window.getAppearsIn).
//
// AUTHORITATIVE SOURCE: baked soundtrack overrides in localStorage.
// Each `soundtrack_overrides_<slug>` key holds a structured {score, music}
// object with tracks[] (title, artist, videoId, thumbnail, position, ...).
// These are the canonical tracklists that render in the SoundtrackPlayer UI.
//
// Derivation order:
//   Signal A (parentWorks):  override track-index lookup  →  phrase-gated
//                             category scan (tightened)  →  FILM_TO_SCORE_ALBUM
//                             composer fallback
//   Signal B (parentAlbums): override score+music albums → catalog/universe/
//                             specialized catalog (tightened: whole-word match)
//   Signal C (needle drops): override tracklist (if available) → phrase-gated
//                             category scan (loosened once parent confirmed)
//   Signal D (other works):  unchanged — specialized catalog → artistAlbumsData →
//                             catalog songs by creator

// Duplicated from src/App.jsx:128 (FILM_TO_SCORE_ALBUM). Keep in sync.
const FILM_TO_SCORE_ALBUM = {
  "Elevator to the Gallows": { composer: "Miles Davis", albumTitle: "Ascenseur pour l'échafaud" },
  "Barbie":                    { composer: "Mark Ronson", albumTitle: "Barbie (Score from the Original Motion Picture Soundtrack)" },
  "Lady Bird":                 { composer: "Jon Brion", albumTitle: "Lady Bird (Original Motion Picture Soundtrack)" },
  "Little Women":              { composer: "Alexandre Desplat", albumTitle: "Little Women (Original Motion Picture Soundtrack)" },
  "Better Call Saul":          { composer: "Dave Porter", albumTitle: "Better Call Saul, Vol. 1 (Original Score from the TV Series)" },
  "Breaking Bad":              { composer: "Dave Porter", albumTitle: "Breaking Bad: Original Score from the Television Series" },
  "Black Panther":             { composer: "Ludwig Göransson", albumTitle: "Black Panther (Original Score)" },
  "Black Panther: Wakanda Forever": { composer: "Ludwig Goransson", albumTitle: "Black Panther: Wakanda Forever (Original Score)" },
  "Creed":                     { composer: "Ludwig Goransson", albumTitle: "Creed (Original Motion Picture Score)" },
};

// Narrative parent-work types (per JD confirmation). Episodes excluded.
const NARRATIVE_TYPES = new Set([
  "film", "tv-series", "documentary", "musical",
  "tv-miniseries", "tv-special", "short-film", "tv-pilot",
]);

// Soundtrack-signal phrases. Category must match one to be eligible for Signal A.
const PHRASE_GATES = [
  /\bsoundtrack\b/i,
  /\bscore\b/i,
  /\bost\b/i,
  /\bneedle\s*drops?\b/i,
  /\bmusic\s+from\b/i,
  /\bmusic\s+of\b/i,
  /\bsongs\s+from\b/i,
  /\bfeatured\s+in\b/i,
];

// Thematic phrases that LOOK like soundtrack signals but aren't.
// "Music as Survival" / "Mythology of X" / "Canon of Y" — these describe themes.
const THEMATIC_REJECT = [
  /\bmusic\s+as\b/i,
  /\b(?:mythology|canon|tradition|philosophy|aesthetic|ideology|legacy)\b/i,
];

function isPhraseGated(str) {
  if (!str) return false;
  if (!PHRASE_GATES.some(re => re.test(str))) return false;
  if (THEMATIC_REJECT.some(re => re.test(str))) return false;
  return true;
}

// Universe JSON sonic-type match (universe files use UPPERCASE — we case-insensitive)
const UNIVERSE_OST_TYPES = new Set(["ost", "soundtrack", "score"]);

// Slugify the same way App.jsx:108 does: lowercase + spaces → underscores.
function slugify(title) {
  return (title || "").toLowerCase().replace(/\s+/g, "_");
}

// Normalize a track title/artist for fuzzy reverse lookup.
// Strips soundtrack suffixes ("from X (Soundtrack)"), hashtag suffixes (#Vinyl),
// remaster/version markers, parentheticals, brackets, punctuation.
function normalizeTrackKey(title, artist) {
  const norm = (s) => {
    if (!s) return "";
    s = s.toLowerCase();
    // (1) Strip hashtag suffixes: #Vinyl #CD #Digital #Deluxe
    s = s.replace(/\s*#[a-z0-9]+/gi, "");
    // (2) Strip "from <Album/Film> (... Soundtrack/Score/OST ...)" trailing clutter.
    //     Matches " from X (...) " when the paren or trailing word contains a soundtrack marker.
    const fromMatch = s.match(
      /\s+from\s+[^()]*?(?:\([^)]*?(?:soundtrack|score|ost|motion\s+picture)[^)]*?\)|\b(?:soundtrack|score|ost)\b)/i
    );
    if (fromMatch) s = s.slice(0, fromMatch.index);
    // (3) Strip all remaining parentheticals — catches (Remastered), (2013 Remaster),
    //     (Mono), (Stereo), (Digital Remaster), (From The "X" Soundtrack), etc.
    s = s.replace(/\([^)]*\)/g, "");
    // (4) Strip brackets
    s = s.replace(/\[[^\]]*\]/g, "");
    // (5) Strip remaining punctuation
    s = s.replace(/[^\w\s]/g, "");
    // (6) Collapse whitespace
    s = s.replace(/\s+/g, " ").trim();
    return s;
  };
  return `${norm(title)}||${norm(artist)}`;
}

// ---------------------------------------------------------------------------
// Data loader
// ---------------------------------------------------------------------------

export async function loadAppearsInCtx() {
  const [
    catalog,
    aaGerwig, aaSinners, aaPluribus, aaBluenote, aaPattismith,
    uGerwig, uSinners, uPluribus, uBluenote, uPattismith,
    scDavePorter, scGoransson, scBrion, scDesplat,
    catMarkRonson, catSaadiq, catRVG,
  ] = await Promise.all([
    import("../data/enriched-content-catalog.json"),
    import("../data/gerwig-artist-albums.json"),
    import("../data/sinners-artist-albums.json"),
    import("../data/pluribus-artist-albums.json"),
    import("../data/bluenote-artist-albums.json"),
    import("../data/pattismith-artist-albums.json"),
    import("../data/gerwig-universe.json"),
    import("../data/sinners-universe.json"),
    import("../data/pluribus-universe.json"),
    import("../data/bluenote-universe.json"),
    import("../data/pattismith-universe.json"),
    import("../data/pluribus-dave-porter-scores.json"),
    import("../data/sinners-ludwig-goransson-scores.json"),
    import("../data/gerwig-jon-brion-scores.json"),
    import("../data/gerwig-alexandre-desplat-scores.json"),
    import("../data/gerwig-mark-ronson-catalog.json"),
    import("../data/sinners-raphael-saadiq-catalog.json"),
    import("../data/rudy-van-gelder-albums.json"),
  ]);
  const u = (m) => m.default || m;

  // ── Baked soundtrack overrides from localStorage (the authoritative source) ──
  const overrides = {};
  const overrideTrackIndex = new Map(); // normTitle||normArtist → [{slug, entityName, kind, track}]
  const overrideTitleIndex = new Map(); // normTitle → [{...}] — fallback when artist mismatches
  let overrideTrackCount = 0;

  if (typeof localStorage !== "undefined") {
    for (const key of Object.keys(localStorage)) {
      if (!key.startsWith("soundtrack_overrides_")) continue;
      try {
        const data = JSON.parse(localStorage.getItem(key) || "null");
        if (!data) continue;
        const slug = key.slice("soundtrack_overrides_".length);
        const entityName = data._entityName || slug.replace(/_/g, " ");
        const score = (data.score && typeof data.score === "object") ? data.score : null;
        const music = (data.music && typeof data.music === "object") ? data.music : null;
        if (!score && !music) continue;
        overrides[slug] = { entityName, slug, score, music };

        const allTracks = [
          ...((score?.tracks) || []).map(t => ({ ...t, kind: "score" })),
          ...((music?.tracks) || []).map(t => ({ ...t, kind: "music" })),
        ];
        for (const t of allTracks) {
          const title = t.title || t.fullTitle || "";
          const artist = t.artist || "";
          if (!title) continue;
          overrideTrackCount += 1;
          const fullKey = normalizeTrackKey(title, artist);
          const titleOnlyKey = normalizeTrackKey(title, "");
          const rec = { slug, entityName, kind: t.kind, track: t };
          if (!overrideTrackIndex.has(fullKey)) overrideTrackIndex.set(fullKey, []);
          overrideTrackIndex.get(fullKey).push(rec);
          const titleKey = titleOnlyKey.replace(/\|\|$/, "");
          if (!overrideTitleIndex.has(titleKey)) overrideTitleIndex.set(titleKey, []);
          overrideTitleIndex.get(titleKey).push(rec);
        }
      } catch { /* ignore malformed override */ }
    }
  }

  return {
    catalogContent: (u(catalog).content) || [],
    artistAlbumsByUniverse: {
      gerwig: u(aaGerwig), sinners: u(aaSinners), pluribus: u(aaPluribus),
      bluenote: u(aaBluenote), pattismith: u(aaPattismith),
    },
    universes: {
      gerwig: u(uGerwig), sinners: u(uSinners), pluribus: u(uPluribus),
      bluenote: u(uBluenote), pattismith: u(uPattismith),
    },
    scoreCatalogs: {
      "Dave Porter": u(scDavePorter),
      "Ludwig Göransson": u(scGoransson),
      "Ludwig Goransson": u(scGoransson),
      "Jon Brion": u(scBrion),
      "Alexandre Desplat": u(scDesplat),
    },
    specializedArtistCatalogs: {
      "Mark Ronson": u(catMarkRonson),
      "Raphael Saadiq": u(catSaadiq),
      "Rudy Van Gelder": u(catRVG),
    },
    filmToScoreAlbum: FILM_TO_SCORE_ALBUM,
    overrides,
    overrideTrackIndex,
    overrideTitleIndex,
    _stats: { overrideCount: Object.keys(overrides).length, overrideTrackCount },
  };
}

// ---------------------------------------------------------------------------
// Convenience lookup
// ---------------------------------------------------------------------------

export function findSongByTitle(title, ctx, opts = {}) {
  const t = (title || "").toLowerCase();
  const cr = opts.creator ? opts.creator.toLowerCase() : null;
  for (const row of ctx.catalogContent) {
    if ((row.type || "").toLowerCase() !== "song") continue;
    if ((row.title || "").toLowerCase() !== t) continue;
    if (cr && (row.creator || "").toLowerCase() !== cr) continue;
    return row;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

export function getAppearsIn(song, ctx, opts = {}) {
  if (!song) return nullResult("no song provided");
  if (!ctx || !ctx.catalogContent) return nullResult("no ctx / catalog not loaded");

  const debug = { reasons: [], rejected: [], stats: ctx._stats || {} };
  const signals = { A: null, B: null, C: null, D: null };

  const a = deriveParentWorks(song, ctx, debug, opts.forcedParentWorkTitle);
  signals.A = a.source;

  const b = deriveParentAlbums(song, a.works, ctx, debug);
  signals.B = b.source;

  const c = deriveOtherNeedleDrops(song, a.works, b.albums, ctx, debug);
  signals.C = c.source;

  const d = deriveOtherWorksByArtist(song, b.albums, ctx, debug);
  signals.D = d.source;

  return {
    song: { title: song.title, creator: song.creator, type: song.type },
    parentWorks: a.works,
    parentAlbums: b.albums,
    otherNeedleDrops: c.tracks,
    otherWorksByArtist: d.works,
    signals,
    debug,
    pillWouldRender:
      a.works.length > 0 || b.albums.length > 0 || c.tracks.length > 0 || d.works.length > 0,
  };
}

function nullResult(reason) {
  return {
    song: null,
    parentWorks: [], parentAlbums: [], otherNeedleDrops: [], otherWorksByArtist: [],
    signals: {}, debug: { reasons: [reason], rejected: [] }, pillWouldRender: false,
  };
}

// ---------------------------------------------------------------------------
// Signal A — parent works
// ---------------------------------------------------------------------------

function deriveParentWorks(song, ctx, debug, forcedParentWorkTitle) {
  // Narrative title index (case-insensitive title → catalog entity)
  const narrativeByTitle = new Map();
  for (const row of ctx.catalogContent) {
    if (!NARRATIVE_TYPES.has((row.type || "").toLowerCase())) continue;
    const key = (row.title || "").toLowerCase();
    if (!key) continue;
    if (!narrativeByTitle.has(key)) narrativeByTitle.set(key, row);
  }

  // ── PASS 0: forced parent work (provenance-first from wall item sourceFilmTitle) ──
  // When a song was saved with provenance (e.g., from SoundtrackPlayer), the parent
  // work is known exactly. Skip Signal A's heuristic entirely.
  if (forcedParentWorkTitle) {
    const entity = narrativeByTitle.get((forcedParentWorkTitle || "").toLowerCase());
    if (entity) {
      debug.reasons.push(`A forced: provenance "${forcedParentWorkTitle}" → catalog entity (${entity.type})`);
      return {
        works: [{ title: entity.title, type: entity.type, entity, source: "provenance_forced" }],
        source: "provenance_forced",
      };
    }
    debug.rejected.push(`A forced: "${forcedParentWorkTitle}" does not resolve to a catalog narrative entity; falling through to heuristic`);
  }

  const tally = new Map(); // title → { entity, hitCount, source }

  // ── PASS 1: override track-index lookup (highest confidence) ──
  const songTitleKey = normalizeTrackKey(song.title, "").replace(/\|\|$/, "");
  const songFullKey = normalizeTrackKey(song.title, song.creator);
  const fullMatches = ctx.overrideTrackIndex?.get(songFullKey) || [];
  let overrideMatches = fullMatches;
  if (!overrideMatches.length) {
    // Title-only fallback: accept ONLY if all title hits come from the same override.
    // Multiple distinct overrides → ambiguous, reject.
    const titleHits = ctx.overrideTitleIndex?.get(songTitleKey) || [];
    const distinctSlugs = new Set(titleHits.map(h => h.slug));
    if (distinctSlugs.size === 1) {
      overrideMatches = titleHits;
      debug.reasons.push(`A override: title-only match (unique to ${Array.from(distinctSlugs)[0]})`);
    } else if (distinctSlugs.size > 1) {
      debug.rejected.push(`A override: title-only hit ambiguous across ${distinctSlugs.size} overrides — requires artist match`);
    }
  }

  for (const m of overrideMatches) {
    const entity = narrativeByTitle.get((m.entityName || "").toLowerCase());
    if (!entity) {
      debug.rejected.push(`A override: "${m.entityName}" not a narrative entity in catalog`);
      continue;
    }
    const key = entity.title.toLowerCase();
    if (!tally.has(key)) {
      tally.set(key, { entity, hitCount: 0, source: `baked_override (${m.kind})` });
    }
    tally.get(key).hitCount += 1;
    debug.reasons.push(`A override: track in "${m.entityName}" (${m.kind}) — high confidence`);
  }

  if (tally.size > 0) {
    // Cap at 1 per JD spec: take the strongest by hit count.
    const works = Array.from(tally.values())
      .sort((a, b) => b.hitCount - a.hitCount)
      .slice(0, 1)
      .map(rec => ({
        title: rec.entity.title, type: rec.entity.type, entity: rec.entity,
        source: rec.source,
      }));
    return { works, source: `overrides:${works.length}` };
  }

  // ── PASS 2: phrase-gated category scan (medium confidence) ──
  const categories = song.categories || [];
  const sources = song.sources || [];

  function scanAndTally(str, tag) {
    if (!str) return;
    if (!isPhraseGated(str)) {
      debug.rejected.push(`A ${tag}: not phrase-gated — "${str}"`);
      return;
    }
    const s = str.toLowerCase();
    const sorted = Array.from(narrativeByTitle.entries()).sort((a, b) => b[0].length - a[0].length);
    for (const [t, entity] of sorted) {
      if (t.length < 3) continue;
      const idx = s.indexOf(t);
      if (idx === -1) continue;
      const before = idx === 0 ? " " : s[idx - 1];
      const after = idx + t.length === s.length ? " " : s[idx + t.length];
      if (/[a-z0-9]/.test(before) || /[a-z0-9]/.test(after)) {
        debug.rejected.push(`A ${tag}: "${t}" in "${str}" rejected (not word boundary)`);
        continue;
      }
      if (!tally.has(t)) tally.set(t, { entity, hitCount: 0, source: "phrase_gated_category" });
      tally.get(t).hitCount += 1;
      debug.reasons.push(`A ${tag}: matched "${t}" in "${str}"`);
      break;
    }
  }

  for (const c of categories) scanAndTally(c, "category");
  for (const s of sources) scanAndTally(s?.category, "sources.category");

  // Tightening: require ≥2 hits UNLESS FILM_TO_SCORE_ALBUM composer match confirms.
  // Also: only keep candidates where hitCount >= (max_hits * 0.4), discarding weak tail.
  const creator = (song.creator || "").trim();
  const composerFallbackFilms = new Set();
  if (creator) {
    for (const [filmTitle, { composer }] of Object.entries(ctx.filmToScoreAlbum)) {
      if (composer.toLowerCase() === creator.toLowerCase()) {
        composerFallbackFilms.add(filmTitle.toLowerCase());
      }
    }
  }

  if (tally.size > 0) {
    const ranked = Array.from(tally.values()).sort((a, b) => b.hitCount - a.hitCount);
    const maxHits = ranked[0]?.hitCount || 0;
    const threshold = Math.max(2, Math.ceil(maxHits * 0.4));
    const kept = ranked.filter(rec => {
      if (composerFallbackFilms.has(rec.entity.title.toLowerCase())) return true;
      return rec.hitCount >= threshold;
    });
    for (const rec of ranked) {
      if (!kept.includes(rec)) debug.rejected.push(`A: dropped "${rec.entity.title}" — ${rec.hitCount} hits < threshold ${threshold}`);
    }
    if (kept.length) {
      // Cap at 1 per JD spec.
      const top = kept[0];
      const works = [{
        title: top.entity.title, type: top.entity.type, entity: top.entity,
        source: `${top.source} (${top.hitCount} hits)`,
      }];
      return { works, source: `phrase_gated:${works.length}` };
    }
  }

  // ── PASS 3: FILM_TO_SCORE_ALBUM composer-only fallback ──
  if (composerFallbackFilms.size) {
    // Cap at 1 per JD spec (take first narrative match).
    for (const filmTitleL of composerFallbackFilms) {
      const entity = narrativeByTitle.get(filmTitleL);
      if (!entity) continue;
      debug.reasons.push(`A: FILM_TO_SCORE_ALBUM composer fallback → "${entity.title}"`);
      return {
        works: [{ title: entity.title, type: entity.type, entity, source: "FILM_TO_SCORE_ALBUM_composer_fallback" }],
        source: "composer_fallback",
      };
    }
  }

  debug.reasons.push("A: no parent work found");
  return { works: [], source: null };
}

// ---------------------------------------------------------------------------
// Signal B — parent albums (plural)
// ---------------------------------------------------------------------------

function classifyAlbumKind(titleLower, explicit) {
  if (explicit) return explicit;
  if (/\bscore\b/.test(titleLower) || /\boriginal\s+score\b/.test(titleLower)) return "score";
  if (/\bsoundtrack\b/.test(titleLower) || /\bost\b/.test(titleLower) || /\boriginal\s+motion\s+picture\b/.test(titleLower)) return "soundtrack";
  if (/\bgreatest\s+hits\b/.test(titleLower) || /\bbest\s+of\b/.test(titleLower) || /\bcompilation\b/.test(titleLower) || /\banthology\b/.test(titleLower)) return "compilation";
  return "unknown";
}

function deriveParentAlbums(song, parentWorks, ctx, debug) {
  if (!parentWorks.length) { debug.reasons.push("B: skipped (no parent works)"); return { albums: [], source: null }; }

  const found = new Map();
  // Dedup by (parentWork, albumKind) — this collapses "Barbie (Original Score)"
  // (override) and "Barbie (Score from the Original Motion Picture Soundtrack)"
  // (FILM_TO_SCORE_ALBUM) into one entry. Source order (override first) wins.
  const dedupKey = (a) => {
    const pw = (a.parentWork || "").toLowerCase() || "__no_parent__";
    const kind = a.albumKind || "unknown";
    return `${pw}|${kind}`;
  };
  const add = (album) => {
    const k = dedupKey(album);
    if (!found.has(k)) found.set(k, album);
  };

  // Track-based lookup: artist album containing this song (artist_album parent like Birth of the Cool)
  const creator = (song.creator || "").trim();
  const songTitleL = (song.title || "").toLowerCase();
  if (creator) {
    for (const [universe, aa] of Object.entries(ctx.artistAlbumsByUniverse)) {
      const artist = aa?.artists?.[creator];
      for (const album of artist?.albums || []) {
        const contains = (album?.tracks || []).some(t => (t.name || t.title || "").toLowerCase() === songTitleL);
        if (contains) {
          const t = (album.title || "").toLowerCase();
          const kindGuess = classifyAlbumKind(t, null);
          add({
            title: album.title, type: "album",
            spotifyAlbumId: album.spotify_album_id || null,
            tracks: album.tracks || null,
            albumKind: kindGuess === "unknown" ? "artist_album" : kindGuess,
            universe,
            source: "artistAlbumsData_track_match",
          });
          debug.reasons.push(`B: artist_album via track match → "${album.title}" (${universe})`);
        }
      }
    }
  }

  for (const pw of parentWorks) {
    const pwTitleL = (pw.title || "").toLowerCase();
    const pwSlug = slugify(pw.title);

    // ── (1) Baked override: authoritative. Returns score + music as two distinct albums. ──
    const ov = ctx.overrides?.[pwSlug];
    if (ov) {
      if (ov.score) {
        add({
          title: `${pw.title} (Original Score)`, type: "album",
          albumKind: "score",
          tracklist: ov.score.tracks || [],
          playlistId: ov.score.id || null,
          trackCount: (ov.score.tracks || []).length,
          parentWork: pw.title,
          source: "baked_override",
        });
        debug.reasons.push(`B: baked override score (${pw.title}) → ${(ov.score.tracks || []).length} tracks`);
      }
      if (ov.music) {
        add({
          title: `${pw.title} Soundtrack`, type: "album",
          albumKind: "soundtrack",
          tracklist: ov.music.tracks || [],
          playlistId: ov.music.id || null,
          trackCount: (ov.music.tracks || []).length,
          parentWork: pw.title,
          source: "baked_override",
        });
        debug.reasons.push(`B: baked override music (${pw.title}) → ${(ov.music.tracks || []).length} tracks`);
      }
    }

    // ── (2) FILM_TO_SCORE_ALBUM (authoritative score album if mapped) ──
    const mapEntry = ctx.filmToScoreAlbum[pw.title];
    if (mapEntry) {
      const info = lookupAlbumByTitle(mapEntry.composer, mapEntry.albumTitle, ctx);
      add({
        title: mapEntry.albumTitle, type: "album",
        spotifyAlbumId: info?.spotify_album_id || null,
        tracks: info?.tracks || null,
        albumKind: "score",
        composer: mapEntry.composer,
        parentWork: pw.title,
        source: "FILM_TO_SCORE_ALBUM",
      });
      debug.reasons.push(`B: FILM_TO_SCORE_ALBUM (${pw.title}) → "${mapEntry.albumTitle}"`);
    }

    // ── (3) Catalog type=album, tightened: whole-word OR complete-prefix match ──
    for (const row of ctx.catalogContent) {
      if ((row.type || "").toLowerCase() !== "album") continue;
      const t = (row.title || "").toLowerCase();
      if (!t) continue;
      const idx = t.indexOf(pwTitleL);
      if (idx === -1) continue;
      const before = idx === 0 ? " " : t[idx - 1];
      const after = idx + pwTitleL.length === t.length ? " " : t[idx + pwTitleL.length];
      const wholeWord = !/[a-z0-9]/.test(before) && !/[a-z0-9]/.test(after);
      const completePrefix = idx === 0 && (t === pwTitleL || !/[a-z0-9]/.test(after));
      if (!wholeWord && !completePrefix) {
        debug.rejected.push(`B: catalog album "${row.title}" rejected (not whole-word / prefix match for "${pw.title}")`);
        continue;
      }
      add({
        title: row.title, type: "album",
        creator: row.creator,
        spotifyAlbumId: row.spotify?.album_id || null,
        tracks: null,
        albumKind: classifyAlbumKind(t, null),
        parentWork: pw.title,
        source: "catalog_album",
      });
      debug.reasons.push(`B: catalog album → "${row.title}"`);
    }

    // ── (4) Universe sonic entries ──
    for (const [universe, uni] of Object.entries(ctx.universes)) {
      walkForSonicMatches(uni, pw.title, (entry, pathTag) => {
        const typeL = (entry.type || "").toLowerCase();
        if (!UNIVERSE_OST_TYPES.has(typeL)) return;
        add({
          title: entry.title || entry.name || `(${typeL} for ${pw.title})`, type: "album",
          spotifyAlbumId: entry.spotify_album_id || entry.album_id || null,
          tracks: null,
          albumKind: typeL === "score" ? "score" : "soundtrack",
          universe,
          parentWork: pw.title,
          source: `universe_sonic:${universe}`,
        });
        debug.reasons.push(`B: universe sonic (${universe}) → "${entry.title || entry.name}" [${typeL}]`);
      });
    }

    // ── (5) Specialized score catalogs ──
    for (const [composer, sc] of Object.entries(ctx.scoreCatalogs)) {
      for (const a of sc?.albums || []) {
        const at = (a.title || a.album_title || "").toLowerCase();
        if (!at) continue;
        const idx = at.indexOf(pwTitleL);
        if (idx === -1) continue;
        const before = idx === 0 ? " " : at[idx - 1];
        const after = idx + pwTitleL.length === at.length ? " " : at[idx + pwTitleL.length];
        if (/[a-z0-9]/.test(before) || /[a-z0-9]/.test(after)) continue;
        add({
          title: a.title || a.album_title, type: "album",
          spotifyAlbumId: a.spotify_album_id || null,
          tracks: a.tracks || null,
          albumKind: "score",
          composer,
          parentWork: pw.title,
          source: `score_catalog:${composer}`,
        });
        debug.reasons.push(`B: score catalog (${composer}) → "${a.title || a.album_title}"`);
      }
    }
  }

  // Cap at 2 per JD spec. Insertion order reflects source priority (override first),
  // so slice(0, 2) naturally keeps the most authoritative hits.
  const albums = Array.from(found.values()).slice(0, 2);
  return { albums, source: albums.length ? `${albums.length}_albums` : null };
}

function lookupAlbumByTitle(composer, albumTitle, ctx) {
  const key = (albumTitle || "").toLowerCase().slice(0, 24);
  if (!key) return null;
  const spec = ctx.specializedArtistCatalogs[composer];
  if (spec) {
    const albums = Array.isArray(spec) ? spec : (spec.albums || []);
    for (const a of albums) {
      const t = (a?.title || a?.album_title || "").toLowerCase();
      if (t && t.includes(key)) return a;
    }
  }
  for (const aa of Object.values(ctx.artistAlbumsByUniverse)) {
    const artist = aa?.artists?.[composer];
    for (const a of artist?.albums || []) {
      if ((a?.title || "").toLowerCase().includes(key)) return a;
    }
  }
  const sc = ctx.scoreCatalogs[composer];
  for (const a of sc?.albums || []) {
    if ((a?.title || a?.album_title || "").toLowerCase().includes(key)) return a;
  }
  return null;
}

function walkForSonicMatches(node, parentTitle, emit, path = "") {
  const pL = parentTitle.toLowerCase();
  if (Array.isArray(node)) {
    node.forEach((v, i) => walkForSonicMatches(v, parentTitle, emit, `${path}[${i}]`));
  } else if (node && typeof node === "object") {
    const typeL = (node.type || "").toLowerCase();
    if (UNIVERSE_OST_TYPES.has(typeL)) {
      const hay = [node.title, node.name, node.work, node.film, node.show, node.parent_work]
        .filter(Boolean).join(" | ").toLowerCase();
      if (hay.includes(pL)) emit(node, path);
    }
    for (const [k, v] of Object.entries(node)) {
      walkForSonicMatches(v, parentTitle, emit, `${path}.${k}`);
    }
  }
}

// ---------------------------------------------------------------------------
// Signal C — other needle drops
// ---------------------------------------------------------------------------

function deriveOtherNeedleDrops(song, parentWorks, parentAlbums, ctx, debug) {
  if (!parentWorks.length) { debug.reasons.push("C: skipped (no parent works)"); return { tracks: [], source: null }; }

  const dedup = new Map();
  const mineKey = normalizeTrackKey(song.title, song.creator);
  const mineTitleL = (song.title || "").toLowerCase();

  // ── PASS 1: override tracklists (authoritative, returns full structured tracks) ──
  for (const album of parentAlbums) {
    if (album.source !== "baked_override") continue;
    for (const t of album.tracklist || []) {
      const title = t.title || t.fullTitle || "";
      const artist = t.artist || "";
      if (!title) continue;
      const key = normalizeTrackKey(title, artist);
      if (key === mineKey) continue;
      if (title.toLowerCase() === mineTitleL && !artist) continue;
      if (!dedup.has(key)) {
        dedup.set(key, {
          title, creator: artist,
          videoId: t.videoId || null,
          thumbnail: t.thumbnail || null,
          position: t.position || null,
          parentWork: album.parentWork,
          albumKind: album.albumKind,
          source: "baked_override",
        });
      }
    }
  }
  if (dedup.size > 0) {
    const tracks = Array.from(dedup.values()).slice(0, 10);
    debug.reasons.push(`C: baked override tracklists → ${tracks.length} tracks across ${parentAlbums.filter(a => a.source === "baked_override").length} album(s)`);
    return { tracks, source: `baked_override:${tracks.length}` };
  }

  // ── PASS 2: catalog scan (loosened — parent work is already confirmed) ──
  const pwTitlesL = parentWorks.map(w => (w.title || "").toLowerCase()).filter(Boolean);

  // 2a. phrase-gated + parent-work-name (strict) → high confidence
  // 2b. parent-work-name anywhere in categories (loose) → "likely related"
  const strict = [];
  const loose = [];
  for (const row of ctx.catalogContent) {
    if ((row.type || "").toLowerCase() !== "song") continue;
    const key = normalizeTrackKey(row.title || "", row.creator || "");
    if (key === mineKey) continue;
    const cats = row.categories || [];
    let strictHit = false, looseHit = false;
    for (const c of cats) {
      const cL = (c || "").toLowerCase();
      const hasPw = pwTitlesL.some(t => wordBoundaryContains(cL, t));
      if (!hasPw) continue;
      looseHit = true;
      if (isPhraseGated(c)) { strictHit = true; break; }
    }
    if (strictHit) strict.push({ title: row.title, creator: row.creator, type: row.type, confidence: "strict", source: "category_phrase_gated" });
    else if (looseHit) loose.push({ title: row.title, creator: row.creator, type: row.type, confidence: "loose", source: "category_any" });
  }

  const combined = [...strict, ...loose];
  for (const t of combined) {
    const k = normalizeTrackKey(t.title, t.creator);
    if (!dedup.has(k)) dedup.set(k, t);
  }
  const tracks = Array.from(dedup.values()).slice(0, 10);
  debug.reasons.push(`C: category scan → ${strict.length} strict + ${loose.length} loose (returning ${tracks.length})`);
  return { tracks, source: tracks.length ? `category_scan:${tracks.length}` : null };
}

function wordBoundaryContains(haystack, needle) {
  if (!needle) return false;
  const idx = haystack.indexOf(needle);
  if (idx === -1) return false;
  const before = idx === 0 ? " " : haystack[idx - 1];
  const after = idx + needle.length === haystack.length ? " " : haystack[idx + needle.length];
  return !/[a-z0-9]/.test(before) && !/[a-z0-9]/.test(after);
}

// ---------------------------------------------------------------------------
// Signal D — other works by artist — unchanged
// ---------------------------------------------------------------------------

function deriveOtherWorksByArtist(song, parentAlbums, ctx, debug) {
  const creator = (song.creator || "").trim();
  if (!creator) { debug.reasons.push("D: no creator"); return { works: [], source: null }; }

  const parentTitles = new Set(parentAlbums.map(a => (a.title || "").toLowerCase()));

  const spec = ctx.specializedArtistCatalogs[creator];
  if (spec) {
    const albums = Array.isArray(spec) ? spec : (spec.albums || []);
    const filtered = albums
      .filter(a => a && (a.title || a.album_title))
      .filter(a => !parentTitles.has(((a.title || a.album_title) || "").toLowerCase()))
      .slice(0, 6)
      .map(a => ({
        title: a.title || a.album_title, type: "album",
        spotifyAlbumId: a.spotify_album_id || null,
        source: "specialized_catalog",
      }));
    if (filtered.length) {
      debug.reasons.push(`D: specialized catalog for ${creator} (${filtered.length} albums)`);
      return { works: filtered, source: "specialized_catalog" };
    }
  }

  const albumsFound = [];
  for (const [universe, aa] of Object.entries(ctx.artistAlbumsByUniverse)) {
    const artist = aa?.artists?.[creator];
    for (const a of artist?.albums || []) {
      if (!a?.title) continue;
      if (parentTitles.has(a.title.toLowerCase())) continue;
      albumsFound.push({
        title: a.title, type: "album", universe,
        spotifyAlbumId: a.spotify_album_id || null,
        source: "artistAlbumsData",
      });
    }
  }
  if (albumsFound.length) {
    debug.reasons.push(`D: artistAlbumsData (${albumsFound.length} albums across universes)`);
    return { works: albumsFound.slice(0, 6), source: "artistAlbumsData" };
  }

  const songs = [];
  for (const row of ctx.catalogContent) {
    if ((row.type || "").toLowerCase() !== "song") continue;
    if ((row.creator || "") !== creator) continue;
    if (row.title === song.title) continue;
    songs.push({
      title: row.title, type: "song", creator: row.creator,
      firstCategory: (row.categories || [])[0] || null,
      source: "catalog_songs",
    });
    if (songs.length >= 6) break;
  }
  if (songs.length) {
    debug.reasons.push(`D: catalog songs by ${creator} (${songs.length} songs)`);
    return { works: songs, source: "catalog_songs" };
  }

  debug.reasons.push(`D: no works found for ${creator}`);
  return { works: [], source: null };
}
