/**
 * Dynamic Enrichment Pipeline
 *
 * Ported from Smart Media Logger (SML) + new Google Books integration.
 * One module, one cache (src/data/enrichment-cache.json), committed to GitHub.
 *
 * Sources: TMDB, OMDB, IMDb (scrape), Rotten Tomatoes (scrape),
 *          Metacritic (scrape), Google Books, YouTube trailer scoring,
 *          YouTube playlist/soundtrack, TV soundtrack (Soundtracki/NME/DuckDuckGo)
 *
 * Lookup chain (for every request):
 *   1. Check enrichment-cache.json (our growing cache)
 *   2. Check Justin's harvester data (JSON files in src/data/)
 *   3. Hit external APIs as fallback
 *   4. Cache the result for next time
 *
 * Cache is a growing shared dataset committed to GitHub.
 * Justin's batch harvesting and dynamic enrichment feed the same pipeline.
 *
 * YouTube search (entity-aware, 15-key rotation) stays in YTA on port 3002.
 *
 * NOTE: BLUENOTE_ALBUMS lookup requires setAlbumData() to be called at app startup.
 * If YTA isn't running, functions return null gracefully — no crashes, no errors.
 * The app works with whatever is in the cache. YTA enhances but isn't required.
 */

// ═══════════════════════════════════════════════════════════════════════════
// CACHE LAYER — One cache for all enrichment sources
// ═══════════════════════════════════════════════════════════════════════════

// Load pre-warmed cache at startup via Vite import
import _prewarmedCache from "../data/enrichment-cache.json";
console.log("[enrichment] Module loaded. _prewarmedCache type:", typeof _prewarmedCache, "keys:", _prewarmedCache ? Object.keys(_prewarmedCache).join(",") : "NULL", "tmdb entries:", _prewarmedCache?.tmdb ? Object.keys(_prewarmedCache.tmdb).length : 0);

// In-memory cache seeded from enrichment-cache.json
let _cache = null;

function _normalizeKey(str) {
  return (str || "").toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function _cacheKey(source, type, title, extra) {
  const parts = [source, type, _normalizeKey(title)];
  if (extra) parts.push(_normalizeKey(extra));
  return parts.join(":");
}

export function getCache() {
  if (!_cache) {
    // Seed from pre-warmed cache file (imported at build time by Vite)
    _cache = JSON.parse(JSON.stringify(_prewarmedCache || {}));
    // Ensure all sections exist
    if (!_cache.tmdb) _cache.tmdb = {};
    if (!_cache.omdb) _cache.omdb = {};
    if (!_cache.imdb) _cache.imdb = {};
    if (!_cache.critics) _cache.critics = {};
    if (!_cache.books) _cache.books = {};
    if (!_cache.youtube_trailers) _cache.youtube_trailers = {};
    if (!_cache.youtube_playlists) _cache.youtube_playlists = {};
    if (!_cache.tv_soundtracks) _cache.tv_soundtracks = {};
    if (!_cache.persons) _cache.persons = {};
    if (!_cache.images) _cache.images = {};
    console.log(`[enrichment] Cache loaded: ${Object.keys(_cache.tmdb).length} TMDB, ${Object.keys(_cache.books).length} books, ${Object.keys(_cache.persons).length} persons`);
  }
  return _cache;
}

function getCached(source, key) {
  const cache = getCache();
  return cache[source]?.[key] || null;
}

function setCache(source, key, data) {
  const cache = getCache();
  if (!cache[source]) cache[source] = {};
  cache[source][key] = { ...data, _cachedAt: new Date().toISOString() };
}

/**
 * Export the current in-memory cache as a JSON string.
 * Call this to get data for saving back to enrichment-cache.json.
 */
export function exportCache() {
  return JSON.stringify(getCache(), null, 2);
}

// ═══════════════════════════════════════════════════════════════════════════
// LOCAL HARVESTER DATA — Check Justin's JSON files before hitting APIs
// ═══════════════════════════════════════════════════════════════════════════

let _harvesterData = null;

/**
 * Load all harvester universe data into a flat lookup.
 * Call once at startup with the loaded entities from App.jsx.
 */
export function setHarvesterData(entities) {
  _harvesterData = entities;
}

let _albumData = null;
export function setAlbumData(albums) {
  _albumData = {};
  (albums || []).forEach(a => { _albumData[a.title] = a; });
}
const BLUENOTE_ALBUMS = new Proxy({}, { get: (_, prop) => _albumData?.[prop] });

/**
 * Look up an entity in Justin's harvester data.
 * Returns whatever the harvester has: photoUrl, posterUrl, spotify_url, bio, etc.
 */
function getFromHarvester(name) {
  if (!_harvesterData) return null;
  const entity = _harvesterData[name];
  if (!entity) return null;
  // Extract genre/era tags
  const tags = entity.tags || [];
  const genres = tags.filter(t => typeof t === "string" && !t.includes("Blue Note") && !t.includes("Verified"));
  // Count albums from completeWorks
  const albums = (entity.completeWorks || []).filter(w => w.type === "ALBUM" || w.role === "Album");
  return {
    photoUrl: entity.photoUrl || entity.posterUrl || entity.image_url || null,
    posterUrl: entity.posterUrl || entity.photoUrl || null,
    bio: entity.bio || [],
    description: entity.description || "",
    subtitle: entity.subtitle || "",
    type: entity.type || entity.entity_type || null,
    spotifyUrl: entity.spotify_url || null,
    collaborators: entity.collaborators || [],
    completeWorks: entity.completeWorks || [],
    albums,
    albumCount: albums.length,
    inspirations: entity.inspirations || [],
    quickViewGroups: entity.quickViewGroups || [],
    stats: entity.stats || [],
    tags,
    genres,
    badge: entity.badge || null,
    _fromHarvester: true,
  };
}

/**
 * Safe fetch wrapper — returns null on any error (network, timeout, YTA down, etc.)
 */
async function _safeFetch(url, options = {}) {
  try {
    console.log("[_safeFetch] URL:", url);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000); // 8s timeout
    const res = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(timeout);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null; // YTA down, network error, timeout — all return null gracefully
  }
}


// ═══════════════════════════════════════════════════════════════════════════
// MUSICBRAINZ — Free track listings for any album ever released
// No API key needed. Rate limit: 1 req/sec (we use _safeFetch with timeout)
// ═══════════════════════════════════════════════════════════════════════════

const MB_BASE = "https://musicbrainz.org/ws/2";
const MB_HEADERS = { "User-Agent": "UnitedTribes/1.0 (contact@unitedtribes.com)" };

/**
 * Get album info from MusicBrainz: tracks, Spotify URL, and correct artist credit.
 * Returns { tracks: [...], spotifyUrl, artist, title } or null.
 */
export async function getAlbumInfo(albumTitle, artist) {
  const key = _cacheKey("musicbrainz_album", "info", albumTitle, artist);
  const cached = getCached("musicbrainz_album", key);
  if (cached) return cached;

  try {
    // Step 1: Find the release — try Blue Note first, fall back to any label
    let release = null;
    for (const labelQuery of [`${albumTitle} artist:${artist} label:Blue Note`, `${albumTitle} artist:${artist}`]) {
      const searchRes = await fetch(`${MB_BASE}/release?query=${encodeURIComponent(labelQuery)}&fmt=json&limit=1`, { headers: MB_HEADERS });
      if (!searchRes.ok) continue;
      const searchData = await searchRes.json();
      release = searchData.releases?.[0];
      if (release?.id) break;
    }
    if (!release?.id) return null;

    const mbArtist = release["artist-credit"]?.[0]?.name || artist;
    console.log("[MusicBrainz] Found:", release.title, "by", mbArtist, "| ID:", release.id);

    // Step 2: Get tracks + URL relations (inc=recordings+url-rels) for Spotify link
    const detailRes = await fetch(`${MB_BASE}/release/${release.id}?inc=recordings+url-rels&fmt=json`, { headers: MB_HEADERS });
    if (!detailRes.ok) return null;
    const detail = await detailRes.json();
    const tracks = detail.media?.[0]?.tracks || [];

    // Extract Spotify URL from relations
    let spotifyUrl = null;
    for (const rel of (detail.relations || [])) {
      if (rel.url?.resource?.includes("open.spotify.com")) {
        spotifyUrl = rel.url.resource;
        console.log("[MusicBrainz] Spotify URL:", spotifyUrl);
        break;
      }
    }

    const result = {
      title: release.title,
      artist: mbArtist,
      spotifyUrl,
      tracks: tracks.map((t, i) => ({
        title: t.title,
        position: i + 1,
        durationMs: t.length || 0,
        duration: t.length ? `${Math.floor(t.length / 1000 / 60)}:${String(Math.floor(t.length / 1000 % 60)).padStart(2, "0")}` : "",
      })),
    };

    setCache("musicbrainz_album", key, result);
    return result;
  } catch (e) {
    console.warn("[MusicBrainz] Error:", e.message);
    return null;
  }
}

// Backward compat — getAlbumTracks returns just the tracks array
export async function getAlbumTracks(albumTitle, artist) {
  const info = await getAlbumInfo(albumTitle, artist);
  return info?.tracks || null;
}

/**
 * Identify what something is via MusicBrainz and return playable data.
 * Searches for release (album) first, then recording (song).
 * Returns { type: "album"|"song", albumInfo, songInfo, parentAlbum } or null.
 */
export async function identifyMedia(title, artist) {
  const key = _cacheKey("musicbrainz_identify", "media", title, artist);
  const cached = getCached("musicbrainz_identify", key);
  if (cached) return cached;

  // Step 1: Try as a release (album) — ONLY if the MusicBrainz artist MATCHES the entity artist
  const albumInfo = await getAlbumInfo(title, artist);
  const artistLower = artist.toLowerCase().split(/\s*[&,]\s*/)[0].trim();
  const mbArtistLower = (albumInfo?.artist || "").toLowerCase();
  // Empty artist = trust MusicBrainz completely. Non-empty = verify.
  const artistMatches = albumInfo && (!artistLower || mbArtistLower.includes(artistLower) || artistLower.includes(mbArtistLower.split(/\s*[&,]\s*/)[0]));

  if (albumInfo && albumInfo.tracks?.length > 0 && artistMatches) {
    const result = { type: "album", albumInfo, songInfo: null, parentAlbum: null };
    setCache("musicbrainz_identify", key, result);
    console.log("[identifyMedia]", title, "→ ALBUM by", albumInfo.artist, "(artist param:", artist || "EMPTY — trusting MB", ") |", albumInfo.tracks.length, "tracks");
    return result;
  }

  if (albumInfo && !artistMatches) {
    console.log("[identifyMedia]", title, "→ MusicBrainz found release by", albumInfo.artist, "but entity says", artist, "— treating as SONG");
  }

  // Step 2: It's a song — just return song type with Spotify from albumInfo if available
  const result = {
    type: "song",
    songInfo: { title, artist },
    albumInfo: artistMatches ? albumInfo : null, // only pass album if artist matched
    spotifyUrl: albumInfo?.spotifyUrl || null,
  };
  setCache("musicbrainz_identify", key, result);
  console.log("[identifyMedia]", title, "→ SONG by", artist);
  return result;
}

/**
 * Build a full YouTube playlist for an album by searching YTA track-by-track.
 * Also returns Spotify URL and correct artist from MusicBrainz.
 * Returns { playlist: [...], spotifyUrl, mbArtist, mbTitle } or { playlist: [] }.
 */
export async function buildAlbumPlaylist(albumTitle, artist, prebuiltTrackNames) {
  // Check playlist cache first — avoid re-hitting YTA for every track
  const plKey = _cacheKey("album_playlist", "built", albumTitle, artist);
  const plCached = getCached("album_playlist", plKey);
  if (plCached) { console.log("[buildAlbumPlaylist] CACHED:", albumTitle); return plCached; }

  let tracks, mbArtist, mbTitle, spotifyUrl;

  if (prebuiltTrackNames && prebuiltTrackNames.length > 0) {
    // Skip MusicBrainz — use pre-built track names from harvester
    tracks = prebuiltTrackNames.map((name, i) => ({ title: name, position: i + 1, duration: "" }));
    mbArtist = artist;
    mbTitle = albumTitle;
    spotifyUrl = null;
    console.log("[buildAlbumPlaylist] Using", tracks.length, "pre-built tracks for", albumTitle, "(skipping MusicBrainz)");
  } else {
    // Get full album info from MusicBrainz — tracks + Spotify URL + correct artist
    const albumInfo = await getAlbumInfo(albumTitle, artist);
    tracks = albumInfo?.tracks;
    mbArtist = albumInfo?.artist || artist;
    mbTitle = albumInfo?.title || albumTitle;
    spotifyUrl = albumInfo?.spotifyUrl || null;
  }

  if (!tracks || tracks.length === 0) {
    console.log("[buildAlbumPlaylist] No tracks found for", albumTitle, "by", artist);
    return { playlist: [], spotifyUrl, mbArtist, mbTitle };
  }

  // Strip alternate takes and bonus tracks, cap at 12
  const altPattern = /\(alternate|alt\s*take|bonus|remix\)/i;
  const cleanTracks = tracks.filter(t => !altPattern.test(t.title)).slice(0, 12);
  console.log("[buildAlbumPlaylist]", mbTitle, "by", mbArtist, "—", cleanTracks.length, "tracks (filtered from", tracks.length, "). Searching YTA...");

  // Search YTA for each track in parallel — use MusicBrainz artist, not entity artist
  const results = await Promise.all(
    cleanTracks.map(async (track) => {
      try {
        const data = await _safeFetch(`/api/yta/youtube-search?song=${encodeURIComponent(track.title)}&artist=${encodeURIComponent(mbArtist + " " + mbTitle + " official")}&type=song`);
        if (data?.url) {
          const videoId = data.url.match(/[?&]v=([a-zA-Z0-9_-]+)/)?.[1];
          if (videoId) {
            return {
              title: track.title,
              artist,
              videoId,
              thumbnail: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
              duration: track.duration,
              position: track.position,
              channel: data.channel || "",
            };
          }
        }
        return null;
      } catch {
        return null;
      }
    })
  );

  const playlist = results.filter(Boolean);
  console.log("[buildAlbumPlaylist]", mbTitle, "— got", playlist.length, "/", cleanTracks.length, "tracks from YouTube");
  const result = { playlist, spotifyUrl, mbArtist, mbTitle };
  if (playlist.length > 0) setCache("album_playlist", plKey, result);
  return result;
}


// ═══════════════════════════════════════════════════════════════════════════
// TMDB — Film/TV search, details, cast, crew
// Ported from SML /api/search, /api/movie-details
// ═══════════════════════════════════════════════════════════════════════════

const TMDB_BASE = "https://api.themoviedb.org/3";
const TMDB_IMG = "https://image.tmdb.org/t/p";
const TMDB_KEY = import.meta.env?.VITE_TMDB_API_KEY || "2dca580c2a14b55200e784d157207b4d";

async function _tmdbFetch(path, params = {}) {
  if (!TMDB_KEY) { console.warn("[enrichment] No TMDB_API_KEY"); return null; }
  const url = new URL(`${TMDB_BASE}${path}`);
  url.searchParams.set("api_key", TMDB_KEY);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  try {
    const res = await fetch(url.toString());
    if (!res.ok) return null;
    return await res.json();
  } catch (e) {
    console.warn("[enrichment] TMDB fetch failed:", e.message);
    return null;
  }
}

/**
 * Search for films/TV — returns top 5 candidates for selection UI.
 * Each result has: tmdbId, title, year, overview, posterUrl, type, director
 */
export async function searchFilmCandidates(title, year, type = "movie") {
  const params = { query: title };
  if (year) params.year = year;
  // Search both movie and multi to catch documentaries filed under different types
  const [movieData, multiData] = await Promise.all([
    _tmdbFetch(`/search/movie`, params),
    _tmdbFetch(`/search/multi`, { query: title }),
  ]);
  const seen = new Set();
  const results = [];
  const addResults = (items, mediaType) => {
    for (const r of (items || [])) {
      if (r.media_type === "person") continue; // skip person results from multi
      const id = r.id;
      if (seen.has(id)) continue;
      seen.add(id);
      results.push({
        tmdbId: id,
        title: r.title || r.name,
        year: (r.release_date || r.first_air_date || "").slice(0, 4),
        overview: (r.overview || "").slice(0, 200),
        posterUrl: r.poster_path ? `${TMDB_IMG}/w154${r.poster_path}` : null,
        type: r.media_type || mediaType,
        voteAverage: r.vote_average,
        popularity: r.popularity,
      });
    }
  };
  addResults(movieData?.results, "movie");
  addResults(multiData?.results, type);
  // Sort: exact year match first, then by popularity
  results.sort((a, b) => {
    if (year) {
      const aMatch = a.year === String(year) ? 1 : 0;
      const bMatch = b.year === String(year) ? 1 : 0;
      if (aMatch !== bMatch) return bMatch - aMatch;
    }
    return (b.popularity || 0) - (a.popularity || 0);
  });
  return results.slice(0, 5);
}

/**
 * Search for books — returns top 5 candidates for selection UI.
 */
export async function searchBookCandidates(title, author) {
  const q = author ? `${title} inauthor:${author}` : title;
  try {
    const res = await fetch(`https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(q)}&maxResults=5&printType=books`);
    if (!res.ok) return [];
    const data = await res.json();
    return (data.items || []).map(item => {
      const v = item.volumeInfo;
      return {
        googleId: item.id,
        title: v.title,
        subtitle: v.subtitle,
        authors: v.authors || [],
        publishedDate: v.publishedDate,
        pageCount: v.pageCount,
        publisher: v.publisher,
        coverUrl: v.imageLinks?.thumbnail?.replace("http:", "https:") || null,
        description: (v.description || "").slice(0, 200),
      };
    });
  } catch { return []; }
}

/**
 * Search for persons — returns top 5 candidates for selection UI.
 * HARVESTER DATA IS THE PRIMARY IDENTITY. TMDB supplements, never overrides.
 * Miles Davis is a musician, not an actor. Blue Note artists are musicians first.
 */
export async function searchPersonCandidates(name) {
  const results = [];

  // Check harvester FIRST — this is the primary identity for Blue Note entities
  const harvested = getFromHarvester(name);
  if (harvested) {
    results.push({
      name,
      profilePath: harvested.photoUrl,
      role: harvested.type || "artist",
      subtitle: harvested.subtitle || "",
      genres: harvested.genres || [],
      albumCount: harvested.albumCount || 0,
      spotifyUrl: harvested.spotifyUrl,
      bio: (harvested.bio || [])[0]?.slice(0, 150) || "",
      badge: harvested.badge,
      source: "harvester",
      _fromHarvester: true,
      _isPrimary: true,
    });
  }

  // Also check harvester for fuzzy name matches (last name, first name)
  if (_harvesterData) {
    const nameLower = name.toLowerCase();
    const lastName = name.split(" ").pop().toLowerCase();
    Object.entries(_harvesterData).forEach(([key, entity]) => {
      if (key === name) return; // already added exact match above
      if (key.startsWith("_work:") || key.startsWith("_ep:")) return; // skip works and episodes — these are not persons
      const keyLower = key.toLowerCase();
      if (keyLower.includes(nameLower) || nameLower.includes(keyLower) ||
          (lastName.length > 3 && keyLower.includes(lastName))) {
        const h = getFromHarvester(key);
        if (h?.photoUrl && !results.find(r => r.name === key)) {
          results.push({
            name: key,
            profilePath: h.photoUrl,
            role: h.type || "artist",
            subtitle: h.subtitle || "",
            genres: h.genres || [],
            albumCount: h.albumCount || 0,
            source: "harvester",
            _fromHarvester: true,
          });
        }
      }
    });
  }

  // TMDB as FALLBACK only — for people NOT in the harvester (directors, filmmakers, etc.)
  if (!harvested) {
    const data = await _tmdbFetch("/search/person", { query: name });
    if (data?.results) {
      for (const p of data.results.slice(0, 5)) {
        const dept = p.known_for_department || "";
        const role = dept === "Acting" ? "actor" : dept === "Directing" ? "director" : dept === "Writing" ? "writer" : dept.toLowerCase();
        const knownFor = (p.known_for || []).slice(0, 3).map(k => k.title || k.name).join(", ");
        results.push({
          tmdbId: p.id,
          name: p.name,
          role,
          profilePath: p.profile_path ? `${TMDB_IMG}/w185${p.profile_path}` : null,
          knownFor,
          popularity: p.popularity,
          source: "tmdb",
        });
      }
    }
  }

  return results.slice(0, 8);
}

/**
 * Search for a film or TV show by title — takes first result (use searchFilmCandidates for selection UI).
 * Returns: { tmdbId, title, year, overview, posterUrl, type }
 */
export async function searchFilm(title, year, type = "movie") {
  const key = _cacheKey("tmdb", "search", title, year);
  const cached = getCached("tmdb", key);
  if (cached) return cached;

  const params = { query: title };
  if (year) params.year = year;
  const data = await _tmdbFetch(`/search/${type === "tv" ? "tv" : "movie"}`, params);
  if (!data?.results?.length) return null;

  const best = data.results[0];
  const result = {
    tmdbId: best.id,
    title: best.title || best.name,
    year: (best.release_date || best.first_air_date || "").slice(0, 4),
    overview: best.overview,
    posterUrl: best.poster_path ? `${TMDB_IMG}/w500${best.poster_path}` : null,
    backdropUrl: best.backdrop_path ? `${TMDB_IMG}/w1280${best.backdrop_path}` : null,
    type: type,
    voteAverage: best.vote_average,
  };
  setCache("tmdb", key, result);
  return result;
}

/**
 * Get full movie/TV details: cast, crew, videos, scores.
 * Ported from SML /api/movie-details (TMDB + OMDB + IMDb fusion).
 */
export async function getMovieDetails(tmdbId, type = "movie") {
  const key = _cacheKey("tmdb", "details", String(tmdbId));
  const cached = getCached("tmdb", key);
  if (cached) return cached;

  const endpoint = type === "tv" ? `/tv/${tmdbId}` : `/movie/${tmdbId}`;
  const [details, credits, videos] = await Promise.all([
    _tmdbFetch(endpoint),
    _tmdbFetch(`${endpoint}/credits`),
    _tmdbFetch(`${endpoint}/videos`),
  ]);

  if (!details) return null;

  // Extract crew roles
  const crew = credits?.crew || [];
  const findCrew = (job) => crew.filter(c => c.job === job).map(c => c.name);
  const directors = findCrew("Director");
  const cinematographers = findCrew("Director of Photography");
  const composers = findCrew("Original Music Composer");
  const writers = crew.filter(c => c.department === "Writing").map(c => c.name);
  const producers = findCrew("Producer");
  const editors = findCrew("Editor");

  // Extract cast (top 15)
  const cast = (credits?.cast || []).slice(0, 15).map(c => ({
    name: c.name,
    character: c.character,
    profilePath: c.profile_path ? `${TMDB_IMG}/w185${c.profile_path}` : null,
  }));

  // Extract videos (trailers, clips, etc.)
  const videoList = (videos?.results || [])
    .filter(v => v.site === "YouTube")
    .map(v => ({
      key: v.key,
      name: v.name,
      type: v.type, // Trailer, Clip, Featurette, etc.
      embedUrl: `https://www.youtube.com/embed/${v.key}?rel=0&modestbranding=1&enablejsapi=1`,
    }));

  const result = {
    tmdbId,
    title: details.title || details.name,
    year: (details.release_date || details.first_air_date || "").slice(0, 4),
    overview: details.overview,
    posterUrl: details.poster_path ? `${TMDB_IMG}/w500${details.poster_path}` : null,
    backdropUrl: details.backdrop_path ? `${TMDB_IMG}/w1280${details.backdrop_path}` : null,
    runtime: details.runtime,
    genres: (details.genres || []).map(g => g.name),
    voteAverage: details.vote_average,
    voteCount: details.vote_count,
    tagline: details.tagline,
    imdbId: details.imdb_id,
    directors,
    cinematographers,
    composers,
    writers,
    producers,
    editors,
    cast,
    videos: videoList,
    starring: cast.slice(0, 5).map(c => c.name),
    type,
  };

  setCache("tmdb", key, result);
  return result;
}

/**
 * Get movie images: backdrops, posters, stills.
 * Ported from SML /api/movie-images.
 */
export async function getMovieImages(tmdbId, type = "movie") {
  const key = _cacheKey("images", "movie", String(tmdbId));
  const cached = getCached("images", key);
  if (cached) return cached;

  const endpoint = type === "tv" ? `/tv/${tmdbId}/images` : `/movie/${tmdbId}/images`;
  const data = await _tmdbFetch(endpoint);
  if (!data) return null;

  const backdrops = (data.backdrops || [])
    .sort((a, b) => (b.vote_count || 0) - (a.vote_count || 0))
    .slice(0, 20)
    .map(img => ({
      url: `${TMDB_IMG}/w1280${img.file_path}`,
      width: img.width,
      height: img.height,
      aspectRatio: img.aspect_ratio,
    }));

  const posters = (data.posters || [])
    .sort((a, b) => (b.vote_count || 0) - (a.vote_count || 0))
    .slice(0, 5)
    .map(img => ({
      url: `${TMDB_IMG}/w500${img.file_path}`,
      width: img.width,
      height: img.height,
    }));

  const result = { tmdbId, backdrops, posters };
  setCache("images", key, result);
  return result;
}

/**
 * Search for a person (actor, director, etc.) by name.
 * Ported from SML /api/person-search.
 */
export async function searchPerson(name) {
  const key = _cacheKey("persons", "search", name);
  const cached = getCached("persons", key);
  if (cached) return cached;

  // Check harvester data FIRST — primary identity for Blue Note entities
  const harvested = getFromHarvester(name);
  if (harvested) {
    const result = {
      name,
      profilePath: harvested.photoUrl,
      role: harvested.type || "artist",
      subtitle: harvested.subtitle || "",
      genres: harvested.genres || [],
      albumCount: harvested.albumCount || 0,
      spotifyUrl: harvested.spotifyUrl,
      knownFor: (harvested.completeWorks || []).slice(0, 3).map(w => w.title).join(", "),
      _fromHarvester: true,
    };
    setCache("persons", key, result);
    return result;
  }

  const data = await _tmdbFetch("/search/person", { query: name });
  if (!data?.results?.length) return null;

  const best = data.results[0];
  const knownFor = (best.known_for || []).slice(0, 3).map(k => k.title || k.name).join(", ");
  const dept = best.known_for_department || "";
  const role = dept === "Acting" ? "actor" : dept === "Directing" ? "director" : dept === "Writing" ? "writer" : dept.toLowerCase();

  const result = {
    tmdbId: best.id,
    name: best.name,
    role,
    department: dept,
    profilePath: best.profile_path ? `${TMDB_IMG}/w185${best.profile_path}` : null,
    knownFor,
    popularity: best.popularity,
  };

  setCache("persons", key, result);
  return result;
}


// ═══════════════════════════════════════════════════════════════════════════
// OMDB — Additional metadata (scores, awards, box office)
// Ported from SML /api/movie-details OMDB integration
// ═══════════════════════════════════════════════════════════════════════════

const OMDB_KEY = import.meta.env?.VITE_OMDB_API_KEY || "a053b065";

/**
 * Fetch OMDB data by IMDb ID or title.
 */
export async function getOMDBData(imdbId, title, year) {
  const cacheId = imdbId || `${title}-${year}`;
  const key = _cacheKey("omdb", "details", cacheId);
  const cached = getCached("omdb", key);
  if (cached) return cached;

  if (!OMDB_KEY) return null;
  const params = new URLSearchParams({ apikey: OMDB_KEY, plot: "full" });
  if (imdbId) params.set("i", imdbId);
  else { params.set("t", title); if (year) params.set("y", year); }

  try {
    const res = await fetch(`https://www.omdbapi.com/?${params}`);
    const data = await res.json();
    if (data.Response === "False") return null;

    const result = {
      imdbRating: data.imdbRating,
      imdbVotes: data.imdbVotes,
      metacriticScore: data.Metascore !== "N/A" ? parseInt(data.Metascore) : null,
      rottenTomatoesScore: (() => {
        const rt = (data.Ratings || []).find(r => r.Source === "Rotten Tomatoes");
        return rt ? parseInt(rt.Value) : null;
      })(),
      rated: data.Rated,
      awards: data.Awards,
      boxOffice: data.BoxOffice,
      plot: data.Plot,
      country: data.Country,
      language: data.Language,
    };

    setCache("omdb", key, result);
    return result;
  } catch (e) {
    console.warn("[enrichment] OMDB failed:", e.message);
    return null;
  }
}


// ═══════════════════════════════════════════════════════════════════════════
// CRITIC SCORES — Rotten Tomatoes + Metacritic (scrapers)
// Ported from SML /api/critic-scores, /api/rt-refresh, /api/metacritic-refresh
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Fetch Rotten Tomatoes score by scraping.
 */
export async function getRottenTomatoesScore(title, year) {
  const key = _cacheKey("critics", "rt", title, year);
  const cached = getCached("critics", key);
  if (cached) return cached;

  const slug = _normalizeKey(title);
  const urls = [
    `https://www.rottentomatoes.com/m/${slug}`,
    year ? `https://www.rottentomatoes.com/m/${slug}_${year}` : null,
  ].filter(Boolean);

  for (const url of urls) {
    try {
      const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36" } });
      if (!res.ok) continue;
      const html = await res.text();

      // Try JSON-LD extraction
      const jsonLdMatch = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
      if (jsonLdMatch) {
        try {
          const ld = JSON.parse(jsonLdMatch[1]);
          if (ld.aggregateRating?.ratingValue) {
            const score = Math.round(parseFloat(ld.aggregateRating.ratingValue) * 10);
            const result = { tomatometer: score, url, source: "json-ld" };
            setCache("critics", key, result);
            return result;
          }
        } catch {}
      }

      // Try scoreboard pattern
      const scoreMatch = html.match(/data-audiencescore="(\d+)"/);
      const tomatometerMatch = html.match(/data-tomatometer="(\d+)"/);
      if (tomatometerMatch) {
        const result = {
          tomatometer: parseInt(tomatometerMatch[1]),
          audienceScore: scoreMatch ? parseInt(scoreMatch[1]) : null,
          url,
          source: "data-attribute",
        };
        setCache("critics", key, result);
        return result;
      }
    } catch {}
  }
  return null;
}

/**
 * Fetch Metacritic score by scraping.
 */
export async function getMetacriticScore(title, year) {
  const key = _cacheKey("critics", "mc", title, year);
  const cached = getCached("critics", key);
  if (cached) return cached;

  const slug = _normalizeKey(title);
  const urls = [
    `https://www.metacritic.com/movie/${slug}`,
    year ? `https://www.metacritic.com/movie/${slug}-${year}` : null,
  ].filter(Boolean);

  for (const url of urls) {
    try {
      const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36" } });
      if (!res.ok) continue;
      const html = await res.text();

      // Try __NUXT__ data
      const nuxtMatch = html.match(/window\.__NUXT__\s*=\s*(\{[\s\S]*?\});?\s*<\/script>/);
      if (nuxtMatch) {
        try {
          const scoreMatch = nuxtMatch[1].match(/"score"\s*:\s*(\d+)/);
          if (scoreMatch) {
            const result = { metacriticScore: parseInt(scoreMatch[1]), url, source: "nuxt-data" };
            setCache("critics", key, result);
            return result;
          }
        } catch {}
      }

      // Try JSON-LD
      const jsonLdMatch = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
      if (jsonLdMatch) {
        try {
          const ld = JSON.parse(jsonLdMatch[1]);
          if (ld.aggregateRating?.ratingValue) {
            const result = { metacriticScore: Math.round(parseFloat(ld.aggregateRating.ratingValue)), url, source: "json-ld" };
            setCache("critics", key, result);
            return result;
          }
        } catch {}
      }

      // Try HTML pattern
      const htmlScore = html.match(/metascore_w[^>]*>(\d+)</);
      if (htmlScore) {
        const result = { metacriticScore: parseInt(htmlScore[1]), url, source: "html-pattern" };
        setCache("critics", key, result);
        return result;
      }
    } catch {}
  }
  return null;
}


// ═══════════════════════════════════════════════════════════════════════════
// IMDb — Ratings, box office, awards (scraper)
// Ported from SML /api/imdb-refresh
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Fetch IMDb data by scraping the title page.
 */
export async function getIMDbData(imdbId) {
  if (!imdbId) return null;
  const key = _cacheKey("imdb", "details", imdbId);
  const cached = getCached("imdb", key);
  if (cached) return cached;

  try {
    const res = await fetch(`https://www.imdb.com/title/${imdbId}/`, {
      headers: { "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36" },
    });
    if (!res.ok) return null;
    const html = await res.text();

    // Extract from __NEXT_DATA__
    const nextDataMatch = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/);
    if (!nextDataMatch) return null;

    const nextData = JSON.parse(nextDataMatch[1]);
    const title = nextData?.props?.pageProps?.aboveTheFoldData;
    if (!title) return null;

    const result = {
      imdbId,
      imdbRating: title.ratingsSummary?.aggregateRating?.toString(),
      voteCount: title.ratingsSummary?.voteCount,
      budget: title.productionBudget?.budget?.amount
        ? `$${title.productionBudget.budget.amount.toLocaleString()}`
        : null,
    };

    setCache("imdb", key, result);
    return result;
  } catch (e) {
    console.warn("[enrichment] IMDb scrape failed:", e.message);
    return null;
  }
}


// ═══════════════════════════════════════════════════════════════════════════
// GOOGLE BOOKS — Cover images, ISBNs, descriptions, purchase links
// NEW — not ported from SML. Free API, no key needed.
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Search Google Books for a book by title and optional author.
 * Returns: { title, authors, description, coverUrl, isbn, pageCount, publisher, publishedDate, infoLink, previewLink }
 */
export async function searchBook(title, author) {
  const key = _cacheKey("books", "search", title, author);
  const cached = getCached("books", key);
  if (cached) return cached;

  const q = author ? `${title} inauthor:${author}` : title;
  try {
    const res = await fetch(`https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(q)}&maxResults=3&printType=books`);
    if (!res.ok) return null;
    const data = await res.json();
    if (!data.items?.length) return null;

    const best = data.items[0].volumeInfo;
    const isbn13 = (best.industryIdentifiers || []).find(i => i.type === "ISBN_13")?.identifier;
    const isbn10 = (best.industryIdentifiers || []).find(i => i.type === "ISBN_10")?.identifier;

    const result = {
      title: best.title,
      subtitle: best.subtitle,
      authors: best.authors || [],
      description: best.description || "",
      coverUrl: best.imageLinks?.thumbnail?.replace("http:", "https:") || null,
      coverUrlLarge: best.imageLinks?.large?.replace("http:", "https:")
        || best.imageLinks?.medium?.replace("http:", "https:")
        || best.imageLinks?.thumbnail?.replace("http:", "https:")?.replace("zoom=1", "zoom=2") || null,
      isbn: isbn13 || isbn10 || null,
      pageCount: best.pageCount,
      publisher: best.publisher,
      publishedDate: best.publishedDate,
      categories: best.categories || [],
      infoLink: best.infoLink,
      previewLink: best.previewLink,
      buyLink: isbn13 ? `https://www.amazon.com/dp/${isbn10 || isbn13}` : best.infoLink,
    };

    setCache("books", key, result);
    return result;
  } catch (e) {
    console.warn("[enrichment] Google Books failed:", e.message);
    return null;
  }
}


// ═══════════════════════════════════════════════════════════════════════════
// YOUTUBE TRAILER — Quality-scored trailer search
// Ported from SML /api/youtube-trailer
// NOTE: Uses YTA proxy for YouTube API calls (15-key rotation)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Find the best official trailer for a film/show.
 * Routes through YTA's YouTube search for key rotation.
 */
export async function findTrailer(title, year) {
  const key = _cacheKey("youtube_trailers", "trailer", title, year);
  const cached = getCached("youtube_trailers", key);
  if (cached) return cached;

  // Use YTA's entity-aware search with type=film (graceful if YTA is down)
  const searchQuery = year ? `${title} (${year})` : title;
  const data = await _safeFetch(`/api/yta/youtube-search?song=${encodeURIComponent(searchQuery)}&artist=&type=film`);
  if (!data?.url) return null;

  const videoId = data.url.match(/[?&]v=([a-zA-Z0-9_-]+)/)?.[1];
  const result = {
    videoId,
    url: data.url,
    title: data.title,
    channel: data.channel,
    embedUrl: videoId ? `https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1&enablejsapi=1` : null,
    cached: data.cached,
  };

  setCache("youtube_trailers", key, result);
  return result;
}


// ═══════════════════════════════════════════════════════════════════════════
// YOUTUBE PLAYLIST — Soundtrack/score playlist search
// Ported from SML /api/youtube-playlist
// NOTE: Uses YTA proxy for YouTube API calls (15-key rotation)
// ═══════════════════════════════════════════════════════════════════════════

// Manual playlist overrides — same pattern as SML, for titles where auto-search fails
const PLAYLIST_OVERRIDES = {
  "american hustle": "PLdDuA6zKmNDNkQOJhYugEL2BfxqL6So-t",
  "marty supreme:music": "PLcAZ6vjRR64Qkm4YK5jBuoJaDlpPTHBqF",
};

// YouTube API key for direct playlist searches (from SML — uses YTA's keys are for video search)
const YT_PLAYLIST_KEY = "AIzaSyAcAPLUflo9lDlsexKFzr5FHvvgGvF0xb8";

async function _ytApiFetch(endpoint, params) {
  const url = new URL(`https://www.googleapis.com/youtube/v3/${endpoint}`);
  url.searchParams.set("key", YT_PLAYLIST_KEY);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, String(v)));
  try {
    const res = await fetch(url.toString());
    if (!res.ok) return null;
    return await res.json();
  } catch { return null; }
}

/**
 * Find a full playlist on YouTube — albums, soundtracks, scores.
 * Ported from SML /api/youtube-playlist — full scoring algorithm.
 * VEVO and official Topic channels prioritized.
 * searchType: "score" (original score), "music" (licensed tracks), or "album" (full album)
 */
export async function findPlaylist(title, searchType = "score", composer) {
  const key = _cacheKey("youtube_playlists", searchType, title, composer);
  const cached = getCached("youtube_playlists", key);
  if (cached) return cached;

  const normalizedTitle = title.toLowerCase().trim();

  // Check manual overrides first
  const overrideKey = searchType === "music" ? `${normalizedTitle}:music` : normalizedTitle;
  let targetPlaylistId = PLAYLIST_OVERRIDES[overrideKey] || PLAYLIST_OVERRIDES[normalizedTitle] || null;

  if (!targetPlaylistId) {
    // Call SML's resolver on port 3006 — full YouTube API scoring, key rotation, track parsing
    const smlParams = new URLSearchParams({ movieTitle: title, searchType: searchType === "album" ? "score" : searchType });
    if (composer) smlParams.set("composer", composer);
    console.log("[findPlaylist] Calling SML resolver:", `/api/sml/youtube-playlist?${smlParams}`);
    const smlData = await _safeFetch(`/api/sml/youtube-playlist?${smlParams}`);
    if (smlData?.tracks?.length) {
      const result = {
        playlistId: smlData.playlistId,
        playlistTitle: smlData.playlistTitle || title,
        playlistDescription: smlData.playlistDescription,
        channelTitle: smlData.channelTitle,
        trackCount: smlData.trackCount || smlData.tracks.length,
        thumbnail: smlData.thumbnail,
        embedUrl: smlData.playlistId ? `https://www.youtube.com/embed/videoseries?list=${smlData.playlistId}&rel=0&enablejsapi=1` : null,
        url: smlData.playlistId ? `https://www.youtube.com/playlist?list=${smlData.playlistId}` : null,
        tracks: smlData.tracks,
        searchType,
      };
      setCache("youtube_playlists", key, result);
      return result;
    }
    return null;
  }

  // If we have a targetPlaylistId from PLAYLIST_OVERRIDES, fetch via SML with that ID
  const smlData = await _safeFetch(`/api/sml/youtube-playlist?playlistId=${targetPlaylistId}`);
  if (smlData?.tracks?.length) {
    const result = {
      playlistId: targetPlaylistId,
      playlistTitle: smlData.playlistTitle || title,
      playlistDescription: smlData.playlistDescription,
      channelTitle: smlData.channelTitle,
      trackCount: smlData.trackCount || smlData.tracks.length,
      thumbnail: smlData.thumbnail,
      embedUrl: `https://www.youtube.com/embed/videoseries?list=${targetPlaylistId}&rel=0&enablejsapi=1`,
      url: `https://www.youtube.com/playlist?list=${targetPlaylistId}`,
      tracks: smlData.tracks,
      searchType,
    };
    setCache("youtube_playlists", key, result);
    return result;
  }
  return null;
}


// ═══════════════════════════════════════════════════════════════════════════
// YOUTUBE ARTIST SEARCH — Find performances, interviews, VEVO videos
// Routes through YTA proxy for 15-key rotation
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Search YouTube for an artist's content — VEVO music videos, live performances, interviews.
 * Returns multiple results for display in the modal.
 */
export async function searchArtistVideos(artistName) {
  const key = _cacheKey("youtube_trailers", "artist-videos", artistName);
  const cached = getCached("youtube_trailers", key);
  if (cached) return cached;

  // Search for VEVO/official music first, then performances, then interviews
  const searches = [
    { query: `${artistName} VEVO`, type: "song", label: "Official Music" },
    { query: `${artistName} live performance`, type: "song", label: "Live Performance" },
    { query: `${artistName} interview`, type: "related", label: "Interview" },
    { query: `${artistName} documentary`, type: "film", label: "Documentary" },
  ];

  const results = [];
  for (const s of searches) {
    const data = await _safeFetch(`/api/yta/youtube-search?song=${encodeURIComponent(s.query)}&artist=${encodeURIComponent(artistName)}&type=${s.type}`);
    if (data?.url) {
      const videoId = data.url.match(/[?&]v=([a-zA-Z0-9_-]+)/)?.[1];
      if (videoId) {
        results.push({
          videoId,
          url: data.url,
          title: data.title,
          channel: data.channel,
          label: s.label,
          embedUrl: `https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1&enablejsapi=1`,
          thumbnail: `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`,
        });
      }
    }
  }

  if (results.length > 0) {
    setCache("youtube_trailers", key, { videos: results, artistName });
  }
  return results;
}


// ═══════════════════════════════════════════════════════════════════════════
// YTA DEEP SEARCH — "Discussed in N of 836 analyzed videos" with timestamps
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Search across 836 analyzed videos for mentions of an entity.
 * Returns video count, total matches, and top results with timestamps.
 */
export async function deepSearch(query) {
  const key = _cacheKey("youtube_trailers", "deep", query);
  const cached = getCached("youtube_trailers", key);
  if (cached) return cached;

  const data = await _safeFetch(`/api/yta/search/deep?q=${encodeURIComponent(query)}&limit=10`);
  if (!data) return null;

  // Filter and rank results — prioritize videos where the query is in the title
  // or where the video is clearly about the queried entity (not incidental mentions)
  const queryLower = query.toLowerCase();
  const queryWords = queryLower.split(/\s+/).filter(w => w.length > 2);
  const rawResults = (data.results || []).map(r => {
    let relevance = r.totalMatches || 1;
    const titleLower = (r.title || "").toLowerCase();
    // Boost: query appears in video title
    if (queryWords.every(w => titleLower.includes(w))) relevance *= 10;
    else if (queryWords.some(w => titleLower.includes(w))) relevance *= 3;
    // Boost: channel suggests relevance (jazz, blue note, music)
    const channelLower = (r.channel || "").toLowerCase();
    if (channelLower.includes("jazz") || channelLower.includes("blue note") || channelLower.includes("music")) relevance *= 2;
    // Penalize: clearly unrelated podcasts/shows
    if (titleLower.includes("pluribus") && !queryLower.includes("pluribus")) relevance *= 0.1;
    if (titleLower.includes("barbie") && !queryLower.includes("barbie")) relevance *= 0.1;
    if (titleLower.includes("sinners") && !queryLower.includes("sinners")) relevance *= 0.1;
    return { ...r, _relevance: relevance };
  }).sort((a, b) => b._relevance - a._relevance);

  const result = {
    query,
    totalVideos: data.totalVideos || 0,
    totalMatches: data.totalMatches || 0,
    results: rawResults.slice(0, 10).map(r => ({
      videoId: r.video_id,
      youtubeId: r.youtube_id,
      title: r.title,
      channel: r.channel,
      source: r.source,
      totalMatches: r.totalMatches,
      relevance: r._relevance,
      matches: (r.matches || []).slice(0, 3).map(m => ({
        timestamp: m.timestamp,
        timestampFormatted: m.timestampFormatted,
        context: m.context,
        type: m.type,
      })),
    })),
  };

  setCache("youtube_trailers", key, result);
  return result;
}


// ═══════════════════════════════════════════════════════════════════════════
// SPOTIFY EMBEDS — Artist and album embeds (no API key needed)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Get Spotify embed URL for an artist or album.
 * Checks harvester data first for spotify_url.
 */
export function getSpotifyEmbed(name) {
  // Check harvester for Spotify URL
  const harvested = getFromHarvester(name);
  if (harvested?.spotifyUrl) {
    const match = harvested.spotifyUrl.match(/open\.spotify\.com\/(artist|album|track)\/([a-zA-Z0-9]+)/);
    if (match) return { type: match[1], embedUrl: `https://open.spotify.com/embed/${match[1]}/${match[2]}?utm_source=generator&theme=0`, spotifyUrl: harvested.spotifyUrl };
  }
  // Check blueNoteAlbums for album Spotify IDs
  const album = BLUENOTE_ALBUMS?.[name];
  if (album?.spotifyId) {
    return { type: "album", embedUrl: `https://open.spotify.com/embed/album/${album.spotifyId}?utm_source=generator&theme=0`, spotifyUrl: `https://open.spotify.com/album/${album.spotifyId}` };
  }
  return null;
}


// ═══════════════════════════════════════════════════════════════════════════
// TV SOUNDTRACK — Episode-specific soundtrack scraping
// Ported from SML /api/tv-soundtrack
// Sources: Soundtracki.com → NME → DuckDuckGo fallback
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Find songs used in a TV episode.
 */
export async function getTVSoundtrack(show, season, episode) {
  const key = _cacheKey("tv_soundtracks", "episode", `${show}-s${season}e${episode}`);
  const cached = getCached("tv_soundtracks", key);
  if (cached) return cached;

  const showSlug = _normalizeKey(show);

  // Source 1: Soundtracki.com
  try {
    const url = season && episode
      ? `https://soundtracki.com/tv-shows/${showSlug}/season-${season}/episode-${episode}`
      : `https://soundtracki.com/tv-shows/${showSlug}`;
    const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
    if (res.ok) {
      const html = await res.text();
      const songs = [];
      // Parse numbered song entries: "1. Song Title – Artist Name [timestamp] scene"
      const songPattern = /(\d+)\.\s+(.+?)\s+[–—-]\s+(.+?)(?:\s+\[([^\]]+)\])?(?:\s+(.+))?$/gm;
      let match;
      while ((match = songPattern.exec(html)) !== null && songs.length < 15) {
        songs.push({
          position: parseInt(match[1]),
          title: match[2].trim(),
          artist: match[3].trim(),
          timestamp: match[4] || null,
          scene: match[5] || null,
        });
      }
      if (songs.length > 0) {
        const result = { show, season, episode, songs, source: "soundtracki.com", sourceUrl: url };
        setCache("tv_soundtracks", key, result);
        return result;
      }
    }
  } catch {}

  // Source 2: NME
  try {
    const nmeUrl = `https://www.nme.com/features/${showSlug}-season-${season}-episode-${episode}-soundtrack`;
    const res = await fetch(nmeUrl, { headers: { "User-Agent": "Mozilla/5.0" } });
    if (res.ok) {
      const html = await res.text();
      const songs = [];
      // NME uses: Artist – 'Song Title' or Artist – "Song Title"
      const nmePattern = /([A-Z][^–—-]+?)\s+[–—-]\s+['"'""](.+?)['"'""]/g;
      let match;
      while ((match = nmePattern.exec(html)) !== null && songs.length < 20) {
        songs.push({ title: match[2].trim(), artist: match[1].trim() });
      }
      if (songs.length > 0) {
        const result = { show, season, episode, songs, source: "nme.com", sourceUrl: nmeUrl };
        setCache("tv_soundtracks", key, result);
        return result;
      }
    }
  } catch {}

  return null;
}


// ═══════════════════════════════════════════════════════════════════════════
// COMBINED ENRICHMENT — High-level functions for the modal
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Enrich a film entity: TMDB details + OMDB scores + trailer.
 * Returns everything needed for the RWL strip film panel.
 */
export async function enrichFilm(title, year) {
  const search = await searchFilm(title, year);
  if (!search) return { title, year, notFound: true };

  const [details, omdb, trailer] = await Promise.all([
    getMovieDetails(search.tmdbId),
    search.tmdbId ? getOMDBData(null, title, year) : null,
    findTrailer(title, year),
  ]);

  return {
    ...search,
    ...(details || {}),
    omdb: omdb || {},
    trailer: trailer || null,
    metacriticScore: omdb?.metacriticScore || details?.voteAverage,
    rottenTomatoesScore: omdb?.rottenTomatoesScore || null,
    imdbRating: omdb?.imdbRating || null,
  };
}

/**
 * Enrich a book entity: Google Books data.
 * Returns everything needed for the RWL strip book panel.
 */
export async function enrichBook(title, author) {
  const book = await searchBook(title, author);
  if (!book) return { title, author, notFound: true };
  return book;
}

/**
 * Enrich a person: TMDB person data.
 * Returns headshot, role, filmography summary.
 */
export async function enrichPerson(name) {
  return await searchPerson(name);
}

/**
 * Pre-warm cache for a list of entities.
 * Call this before the demo with the curated response data.
 */
export async function preWarmCache(films = [], books = [], persons = []) {
  const results = { films: 0, books: 0, persons: 0, errors: 0 };

  for (const f of films) {
    try {
      await enrichFilm(f.title, f.year);
      results.films++;
    } catch { results.errors++; }
  }

  for (const b of books) {
    try {
      const [bookTitle, author] = b.split(" — ");
      await enrichBook(bookTitle?.trim(), author?.trim());
      results.books++;
    } catch { results.errors++; }
  }

  for (const p of persons) {
    try {
      await enrichPerson(p);
      results.persons++;
    } catch { results.errors++; }
  }

  return results;
}
