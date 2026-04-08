/**
 * UnitedTribes Data Client
 *
 * Single entry point for accessing all enriched data from S3.
 * Handles fetching, caching, and cross-referencing across:
 *   - enriched-content-catalog.json (14K+ content items with Spotify/TMDB/YouTube/OpenLibrary)
 *   - all-video-entity-index.json (11K entities across 822 videos)
 *   - artist-albums.json per universe (tracklists with Spotify IDs)
 *
 * Usage:
 *   const ut = new UTDataClient();
 *   await ut.init();
 *   const film = await ut.getFilm('Sinners');
 *   const soundtrack = await ut.getSoundtrack('Sinners');
 *   const artist = await ut.getArtist('Patti Smith');
 */

const S3_BASE = 'http://unitedtribes-visualizations-1758769416.s3-website-us-east-1.amazonaws.com/universe-data';
const UNIVERSES = ['bluenote', 'gerwig', 'pattismith', 'pluribus', 'sinners'];

class UTDataClient {
  constructor() {
    this.catalog = null;       // enriched content catalog items
    this.catalogByTitle = {};  // title (lower) → [items]
    this.catalogByCreator = {};// creator (lower) → [items]
    this.entities = null;      // entity index
    this.videos = null;        // video index
    this.artistAlbums = {};    // universe → artist-albums data
    this._loading = null;
  }

  async init() {
    if (this.catalog) return;
    if (this._loading) return this._loading;

    this._loading = (async () => {
      const [catalogRes, entityRes] = await Promise.all([
        fetch(`${S3_BASE}/enriched-content-catalog.json`),
        fetch(`${S3_BASE}/all-video-entity-index.json`),
      ]);

      const catalogJson = await catalogRes.json();
      this.catalog = catalogJson.content || catalogJson;

      const entityJson = await entityRes.json();
      this.entities = entityJson.entities || {};
      this.videos = entityJson.videos || {};

      // Build indexes
      for (const item of this.catalog) {
        const tl = (item.title || '').toLowerCase();
        if (!this.catalogByTitle[tl]) this.catalogByTitle[tl] = [];
        this.catalogByTitle[tl].push(item);

        const cl = (item.creator || '').toLowerCase();
        if (cl) {
          if (!this.catalogByCreator[cl]) this.catalogByCreator[cl] = [];
          this.catalogByCreator[cl].push(item);
        }
      }

      // Load artist-albums for all universes in parallel
      await Promise.allSettled(
        UNIVERSES.map(async u => {
          try {
            const res = await fetch(`${S3_BASE}/${u}/artist-albums.json`);
            this.artistAlbums[u] = await res.json();
          } catch { /* skip failed universe */ }
        })
      );
    })();

    return this._loading;
  }

  // ─── Film/TV/Documentary ─────────────────────────────────────────────

  /**
   * Get complete film data: TMDB poster, overview, trailer, soundtrack, needle drops, source videos.
   */
  getFilm(title, creator = null) {
    const items = this._findByTitle(title, ['film', 'tv-series', 'documentary', 'episode']);
    if (items.length === 0) return null;

    // Pick best match — prefer one with TMDB, or highest videoCount
    const item = creator
      ? items.find(i => (i.creator || '').toLowerCase().includes(creator.toLowerCase())) || items[0]
      : items.sort((a, b) => (b.tmdb ? 1 : 0) - (a.tmdb ? 1 : 0) || (b.videoCount || 0) - (a.videoCount || 0))[0];

    return {
      title: item.title,
      creator: item.creator,
      type: item.type,
      videoCount: item.videoCount,

      // TMDB
      poster: item.tmdb?.poster_url || null,
      year: item.tmdb?.year || null,
      overview: item.tmdb?.overview || null,
      tmdbId: item.tmdb?.id || null,

      // YouTube trailer
      trailer: item.youtube ? {
        videoId: item.youtube.video_id,
        title: item.youtube.title,
        thumbnail: item.youtube.thumbnail,
        embedUrl: `https://www.youtube.com/embed/${item.youtube.video_id}?rel=0&modestbranding=1`,
      } : null,

      // Soundtrack (from enrichment)
      soundtrack: item.soundtrack ? {
        albumId: item.soundtrack.album_id,
        albumTitle: item.soundtrack.album_title,
        albumUrl: item.soundtrack.album_url,
        albumArt: item.soundtrack.album_art_url,
        artist: item.soundtrack.artist,
        trackCount: item.soundtrack.track_count,
        tracks: (item.soundtrack.tracks || []).map(t => ({
          name: t.name,
          spotifyId: t.spotify_id,
          duration: t.duration,
          trackNumber: t.track_number,
          embedUrl: `https://open.spotify.com/embed/track/${t.spotify_id}?utm_source=generator&theme=0`,
        })),
        embedUrl: `https://open.spotify.com/embed/album/${item.soundtrack.album_id}?utm_source=generator&theme=0`,
      } : null,

      // Needle drops (songs mentioned in this film's categories)
      needleDrops: this._findNeedleDrops(item.title),

      // Source videos (JD's analyses that discuss this film)
      sourceVideos: (item.sources || []).map(s => ({
        videoId: s.video_id,
        title: s.video_title,
        channel: s.channel,
        section: s.section,
        category: s.category,
        watchUrl: s.video_id ? `https://youtube.com/watch?v=${s.video_id}` : null,
      })),

      // Entity index data (video appearances with timestamps and quotes)
      entityData: this._getEntityData(item.title),

      // Raw enrichment for anything we missed
      _raw: item,
    };
  }

  // ─── Songs ───────────────────────────────────────────────────────────

  /**
   * Get song data: Spotify track, album art, source videos, video appearances.
   */
  getSong(title, creator = null) {
    const items = this._findByTitle(title, ['song', 'composition']);
    if (items.length === 0) return null;

    const item = creator
      ? items.find(i => (i.creator || '').toLowerCase().includes(creator.toLowerCase())) || items[0]
      : items[0];

    return {
      title: item.title,
      creator: item.creator,
      type: item.type,
      videoCount: item.videoCount,

      spotify: item.spotify ? {
        trackId: item.spotify.track_id,
        url: item.spotify.url,
        albumArt: item.spotify.album_art_url,
        embedUrl: `https://open.spotify.com/embed/track/${item.spotify.track_id}?utm_source=generator&theme=0`,
      } : null,

      youtube: item.youtube ? {
        videoId: item.youtube.video_id,
        title: item.youtube.title,
        thumbnail: item.youtube.thumbnail,
        embedUrl: `https://www.youtube.com/embed/${item.youtube.video_id}?rel=0&modestbranding=1`,
      } : null,

      categories: item.categories || [],
      sourceVideos: (item.sources || []).slice(0, 10).map(s => ({
        videoId: s.video_id,
        title: s.video_title,
        section: s.section,
        category: s.category,
      })),
      entityData: this._getEntityData(item.title),
      _raw: item,
    };
  }

  // ─── Albums ──────────────────────────────────────────────────────────

  /**
   * Get album data: Spotify album, full tracklist, YouTube playlist.
   * Checks both enriched catalog and artist-albums.json for the richest data.
   */
  getAlbum(title, creator = null) {
    const items = this._findByTitle(title, ['album']);
    const catalogItem = items[0] || null;

    // Also search artist-albums.json for detailed tracklist
    let detailedAlbum = null;
    const titleLower = title.toLowerCase();
    for (const u of UNIVERSES) {
      const data = this.artistAlbums[u];
      if (!data?.artists) continue;
      for (const [key, artist] of Object.entries(data.artists)) {
        for (const album of (artist.albums || [])) {
          if ((album.title || '').toLowerCase().includes(titleLower) ||
              (album.search_title || '').toLowerCase().includes(titleLower)) {
            detailedAlbum = { ...album, artistName: artist.name || key, universe: u };
            break;
          }
        }
        if (detailedAlbum) break;
      }
      if (detailedAlbum) break;
    }

    return {
      title: catalogItem?.title || detailedAlbum?.title || title,
      creator: catalogItem?.creator || detailedAlbum?.artistName || null,
      type: 'album',
      videoCount: catalogItem?.videoCount || 0,

      spotify: {
        albumId: detailedAlbum?.spotify_id || catalogItem?.spotify?.album_id || null,
        url: detailedAlbum?.spotify_url || catalogItem?.spotify?.url || null,
        albumArt: detailedAlbum?.cover_url || catalogItem?.spotify?.album_art_url || null,
        embedUrl: (detailedAlbum?.spotify_id || catalogItem?.spotify?.album_id)
          ? `https://open.spotify.com/embed/album/${detailedAlbum?.spotify_id || catalogItem?.spotify?.album_id}?utm_source=generator&theme=0`
          : null,
      },

      youtube: catalogItem?.youtube ? {
        videoId: catalogItem.youtube.video_id,
        title: catalogItem.youtube.title,
        embedUrl: `https://www.youtube.com/embed/${catalogItem.youtube.video_id}?rel=0&modestbranding=1`,
      } : null,

      youtubePlaylistId: detailedAlbum?.youtube_playlist_id || catalogItem?.youtube_playlist_id || null,

      tracks: (detailedAlbum?.tracks || []).map(t => ({
        name: t.name,
        spotifyId: t.spotify_id,
        spotifyUrl: t.spotify_url,
        duration: t.duration,
        trackNumber: t.track_number,
        youtubeId: t.youtube_video_id,
      })),

      releaseDate: detailedAlbum?.release_date || null,
      totalTracks: detailedAlbum?.total_tracks || detailedAlbum?.tracks?.length || 0,
      sourceVideos: (catalogItem?.sources || []).slice(0, 10),
      entityData: this._getEntityData(title),
      _raw: { catalog: catalogItem, detailed: detailedAlbum },
    };
  }

  // ─── Artists/People ──────────────────────────────────────────────────

  /**
   * Get artist/person data: discography, video appearances, works.
   */
  getArtist(name) {
    const entity = this.entities?.[name] || this.entities?.[name.toLowerCase()] || null;
    const works = this.catalogByCreator[name.toLowerCase()] || [];

    // Find in artist-albums for discography
    let discography = null;
    let artistImage = null;
    let spotifyArtistId = null;
    for (const u of UNIVERSES) {
      const data = this.artistAlbums[u];
      if (!data?.artists) continue;
      const artist = data.artists[name] || Object.values(data.artists).find(a => (a.name || '').toLowerCase() === name.toLowerCase());
      if (artist) {
        discography = {
          universe: u,
          artistName: artist.name,
          albums: (artist.albums || []).map(a => ({
            title: a.title,
            spotifyId: a.spotify_id,
            spotifyUrl: a.spotify_url,
            coverUrl: a.cover_url,
            releaseDate: a.release_date,
            trackCount: a.tracks?.length || 0,
            youtubePlaylistId: a.youtube_playlist_id,
            embedUrl: a.spotify_id ? `https://open.spotify.com/embed/album/${a.spotify_id}?utm_source=generator&theme=0` : null,
          })),
        };
        artistImage = artist.image_url || null;
        spotifyArtistId = artist.spotify_artist_id || null;
        break;
      }
    }

    // Group works by type
    const worksByType = {};
    for (const w of works) {
      if (!worksByType[w.type]) worksByType[w.type] = [];
      worksByType[w.type].push({
        title: w.title,
        type: w.type,
        videoCount: w.videoCount,
        spotify: w.spotify,
        youtube: w.youtube,
        tmdb: w.tmdb,
        openLibrary: w.openLibrary,
        soundtrack: w.soundtrack,
      });
    }

    return {
      name,
      totalVideos: entity?.total_videos || 0,
      image: artistImage,
      spotifyArtistId,

      discography: discography?.albums || [],

      works: worksByType,
      totalWorks: works.length,

      videoAppearances: (entity?.videos || []).slice(0, 20).map(v => ({
        videoId: v.video_id,
        title: v.video_title,
        channel: v.channel,
        watchUrl: v.youtube_url,
        moments: v.total_moments,
        quotes: (v.related_quotes || []).slice(0, 2).map(q => ({
          quote: q.quote || q,
          attribution: q.attribution,
        })),
      })),

      _raw: { entity, works, discography },
    };
  }

  // ─── Books ───────────────────────────────────────────────────────────

  /**
   * Get book data: Open Library cover, author, year, source videos.
   */
  getBook(title, creator = null) {
    const items = this._findByTitle(title, ['book', 'novel', 'memoir', 'poem', 'play', 'essay', 'novella']);
    if (items.length === 0) return null;

    const item = creator
      ? items.find(i => (i.creator || '').toLowerCase().includes(creator.toLowerCase())) || items[0]
      : items[0];

    return {
      title: item.title,
      creator: item.creator,
      type: item.type,
      videoCount: item.videoCount,

      cover: item.openLibrary?.cover_url || null,
      author: item.openLibrary?.author || item.creator,
      year: item.openLibrary?.year || null,

      sourceVideos: (item.sources || []).slice(0, 10).map(s => ({
        videoId: s.video_id,
        title: s.video_title,
        section: s.section,
        category: s.category,
      })),
      entityData: this._getEntityData(item.title),
      _raw: item,
    };
  }

  // ─── Soundtracks ─────────────────────────────────────────────────────

  /**
   * Get soundtrack for a film. Checks enriched catalog first, then artist-albums.
   */
  getSoundtrack(filmTitle) {
    // Check enriched catalog
    const films = this._findByTitle(filmTitle, ['film', 'tv-series', 'documentary']);
    for (const film of films) {
      if (film.soundtrack) {
        return {
          source: 'enriched-catalog',
          albumId: film.soundtrack.album_id,
          albumTitle: film.soundtrack.album_title,
          albumUrl: film.soundtrack.album_url,
          albumArt: film.soundtrack.album_art_url,
          artist: film.soundtrack.artist,
          trackCount: film.soundtrack.track_count,
          tracks: (film.soundtrack.tracks || []).map(t => ({
            name: t.name,
            spotifyId: t.spotify_id,
            duration: t.duration,
            embedUrl: `https://open.spotify.com/embed/track/${t.spotify_id}?utm_source=generator&theme=0`,
          })),
          embedUrl: `https://open.spotify.com/embed/album/${film.soundtrack.album_id}?utm_source=generator&theme=0`,
        };
      }
    }

    // Check artist-albums for score/soundtrack albums.
    // The album title must START WITH the film title at a word boundary — not just contain it.
    // The previous includes() check matched "Pluribus: Volume 2 (Apple Original Series Score)"
    // when looking up "Volume 2", because the album title contained that substring AND matched
    // the soundtrack regex. Stricter starts-with-boundary matching falls through to null
    // cleanly on miss (modal shows no soundtrack), preventing cross-contamination across
    // unrelated entities. Same class of fix as findAlbumInArtist length-ratio guard (v1.9.12).
    const titleLower = filmTitle.toLowerCase();
    const titleEsc = titleLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const filmTitleStartRe = new RegExp(`^${titleEsc}(\\b|$)`);
    for (const u of UNIVERSES) {
      const data = this.artistAlbums[u];
      if (!data?.artists) continue;
      for (const [key, artist] of Object.entries(data.artists)) {
        for (const album of (artist.albums || [])) {
          const at = (album.title || '').toLowerCase();
          if (filmTitleStartRe.test(at) && /soundtrack|score|original motion picture/.test(at)) {
            return {
              source: 'artist-albums',
              albumId: album.spotify_id,
              albumTitle: album.title,
              albumUrl: album.spotify_url,
              albumArt: album.cover_url,
              artist: artist.name || key,
              trackCount: album.tracks?.length || 0,
              tracks: (album.tracks || []).map(t => ({
                name: t.name,
                spotifyId: t.spotify_id,
                duration: t.duration,
                embedUrl: t.spotify_id ? `https://open.spotify.com/embed/track/${t.spotify_id}?utm_source=generator&theme=0` : null,
              })),
              embedUrl: album.spotify_id ? `https://open.spotify.com/embed/album/${album.spotify_id}?utm_source=generator&theme=0` : null,
            };
          }
        }
      }
    }

    return null;
  }

  /**
   * Get needle drop songs for a film (songs used in scenes, not score).
   */
  getNeedleDrops(filmTitle) {
    return this._findNeedleDrops(filmTitle);
  }

  // ─── Search ──────────────────────────────────────────────────────────

  /**
   * Search across all data: content, entities, videos.
   */
  search(query, limit = 50) {
    const q = query.toLowerCase();
    const results = { content: [], entities: [], videos: [] };

    // Content catalog
    for (const item of this.catalog) {
      if ((item.title || '').toLowerCase().includes(q) ||
          (item.creator || '').toLowerCase().includes(q)) {
        results.content.push(item);
        if (results.content.length >= limit) break;
      }
    }

    // Entities
    for (const [name, e] of Object.entries(this.entities)) {
      if (name.toLowerCase().includes(q)) {
        results.entities.push({ name, ...e });
        if (results.entities.length >= limit) break;
      }
    }

    // Videos
    for (const [id, v] of Object.entries(this.videos)) {
      if ((v.title || '').toLowerCase().includes(q) ||
          (v.channel || '').toLowerCase().includes(q)) {
        results.videos.push(v);
        if (results.videos.length >= limit) break;
      }
    }

    return results;
  }

  // ─── Entity (generic) ────────────────────────────────────────────────

  /**
   * Get any entity by name — auto-detects type and returns the richest data available.
   */
  getEntity(name) {
    // Check content catalog first
    const content = this.catalogByTitle[name.toLowerCase()];
    if (content && content.length > 0) {
      const item = content[0];
      switch (item.type) {
        case 'film': case 'tv-series': case 'documentary': case 'episode':
          return { type: item.type, data: this.getFilm(name) };
        case 'song': case 'composition':
          return { type: item.type, data: this.getSong(name) };
        case 'album':
          return { type: 'album', data: this.getAlbum(name) };
        case 'book': case 'novel': case 'poem': case 'play': case 'memoir':
          return { type: item.type, data: this.getBook(name) };
      }
    }

    // Check entity index
    const entity = this.entities?.[name];
    if (entity) {
      // Might be a person, place, etc.
      const works = this.catalogByCreator[name.toLowerCase()] || [];
      if (works.length > 0) {
        return { type: 'artist', data: this.getArtist(name) };
      }
      return { type: 'entity', data: { name, ...entity } };
    }

    return null;
  }

  // ─── Internal helpers ────────────────────────────────────────────────

  _findByTitle(title, types = null) {
    const tl = title.toLowerCase();
    const items = this.catalogByTitle[tl] || [];
    if (types) return items.filter(i => types.includes(i.type));
    return items;
  }

  _findNeedleDrops(filmTitle) {
    const filmLower = filmTitle.toLowerCase();
    return this.catalog
      .filter(item =>
        item.type === 'song' &&
        (item.categories || []).some(cat => cat.toLowerCase().includes(filmLower))
      )
      .map(item => ({
        title: item.title,
        creator: item.creator,
        videoCount: item.videoCount,
        spotify: item.spotify ? {
          trackId: item.spotify.track_id,
          url: item.spotify.url,
          albumArt: item.spotify.album_art_url,
          embedUrl: `https://open.spotify.com/embed/track/${item.spotify.track_id}?utm_source=generator&theme=0`,
        } : null,
        youtube: item.youtube ? {
          videoId: item.youtube.video_id,
          embedUrl: `https://www.youtube.com/embed/${item.youtube.video_id}?rel=0&modestbranding=1`,
        } : null,
        category: (item.categories || []).find(c => c.toLowerCase().includes(filmLower)),
      }))
      .sort((a, b) => (b.videoCount || 0) - (a.videoCount || 0));
  }

  _getEntityData(name) {
    const entity = this.entities?.[name];
    if (!entity) return null;
    return {
      totalVideos: entity.total_videos,
      videos: (entity.videos || []).slice(0, 10).map(v => ({
        videoId: v.video_id,
        title: v.video_title,
        channel: v.channel,
        watchUrl: v.youtube_url,
        moments: v.total_moments,
        quotes: (v.related_quotes || []).slice(0, 2),
      })),
    };
  }
}

// ES module export (for Vite/React builds)
export { UTDataClient };

// Also attach to window for script tag use
if (typeof window !== 'undefined') window.UTDataClient = UTDataClient;
