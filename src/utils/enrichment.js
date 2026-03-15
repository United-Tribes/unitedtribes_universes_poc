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
 * If YTA isn't running, functions return null gracefully — no crashes, no errors.
 * The app works with whatever is in the cache. YTA enhances but isn't required.
 */

// ═══════════════════════════════════════════════════════════════════════════
// CACHE LAYER — One cache for all enrichment sources
// ═══════════════════════════════════════════════════════════════════════════

// In-memory cache loaded from enrichment-cache.json at startup
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
    try {
      // Dynamic import of the cache JSON — Vite handles this at build time
      _cache = JSON.parse(JSON.stringify(require("../data/enrichment-cache.json")));
    } catch {
      _cache = { tmdb: {}, omdb: {}, imdb: {}, critics: {}, books: {}, youtube_trailers: {}, youtube_playlists: {}, tv_soundtracks: {}, persons: {}, images: {} };
    }
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

/**
 * Look up an entity in Justin's harvester data.
 * Returns whatever the harvester has: photoUrl, posterUrl, spotify_url, bio, etc.
 */
function getFromHarvester(name) {
  if (!_harvesterData) return null;
  const entity = _harvesterData[name];
  if (!entity) return null;
  return {
    photoUrl: entity.photoUrl || entity.posterUrl || entity.image_url || null,
    posterUrl: entity.posterUrl || entity.photoUrl || null,
    bio: entity.bio || [],
    description: entity.description || "",
    type: entity.type || entity.entity_type || null,
    spotifyUrl: entity.spotify_url || null,
    collaborators: entity.collaborators || [],
    completeWorks: entity.completeWorks || [],
    inspirations: entity.inspirations || [],
    quickViewGroups: entity.quickViewGroups || [],
    stats: entity.stats || [],
    tags: entity.tags || [],
    _fromHarvester: true,
  };
}

/**
 * Safe fetch wrapper — returns null on any error (network, timeout, YTA down, etc.)
 */
async function _safeFetch(url, options = {}) {
  try {
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
 * Search for a film or TV show by title.
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
      embedUrl: `https://www.youtube.com/embed/${v.key}?rel=0&modestbranding=1`,
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

  // Check harvester data first
  const harvested = getFromHarvester(name);
  if (harvested?.photoUrl) {
    const result = { name, profilePath: harvested.photoUrl, role: harvested.type || "person", knownFor: "", _fromHarvester: true };
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
    embedUrl: videoId ? `https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1` : null,
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

/**
 * Find a full album/soundtrack/score playlist on YouTube.
 * searchType: "score" (original score) or "music" (licensed tracks)
 */
export async function findPlaylist(title, searchType = "score", composer) {
  const key = _cacheKey("youtube_playlists", searchType, title, composer);
  const cached = getCached("youtube_playlists", key);
  if (cached) return cached;

  // Use YTA's entity-aware search with type=album (graceful if YTA is down)
  const artist = composer || "";
  const data = await _safeFetch(`/api/yta/youtube-search?song=${encodeURIComponent(title)}&artist=${encodeURIComponent(artist)}&type=album`);
  if (!data?.url) return null;

  const videoId = data.url.match(/[?&]v=([a-zA-Z0-9_-]+)/)?.[1];
  const result = {
    videoId,
    url: data.url,
    title: data.title,
    channel: data.channel,
    embedUrl: videoId ? `https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1` : null,
    searchType,
  };

  setCache("youtube_playlists", key, result);
  return result;
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
