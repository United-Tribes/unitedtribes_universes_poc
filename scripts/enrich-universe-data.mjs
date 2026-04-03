#!/usr/bin/env node
/**
 * Enrich universe data files with content from the enriched content catalog.
 *
 * For each entity in a universe file, looks up related content in the enriched
 * catalog and adds it to completeWorks (films, books, songs, albums) and
 * sonic (soundtracks, needle drops).
 *
 * Usage:
 *   node scripts/enrich-universe-data.mjs                    # All universes
 *   node scripts/enrich-universe-data.mjs --universe sinners  # One universe
 *   node scripts/enrich-universe-data.mjs --dry-run           # Preview only
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, '..', 'src', 'data');
const CATALOG_FILE = path.join(DATA_DIR, 'enriched-content-catalog.json');
const ENTITY_INDEX_FILE = path.join(DATA_DIR, 'all-video-entity-index.json');

const UNIVERSES = ['sinners', 'gerwig', 'bluenote', 'pattismith', 'pluribus'];

// Parse args
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const targetUniverse = args.find((a, i) => args[i - 1] === '--universe');

// ─── Type → display mapping ─────────────────────────────────────────────────

const TYPE_CONFIG = {
  film:             { icon: '🎬', badge: '#16803c', display: 'FILM' },
  'tv-series':      { icon: '📺', badge: '#2563eb', display: 'TV' },
  'tv-miniseries':  { icon: '📺', badge: '#2563eb', display: 'TV' },
  'tv-special':     { icon: '📺', badge: '#2563eb', display: 'TV' },
  'tv-pilot':       { icon: '📺', badge: '#2563eb', display: 'TV' },
  documentary:      { icon: '🎥', badge: '#059669', display: 'DOCUMENTARY' },
  'documentary-series': { icon: '🎥', badge: '#059669', display: 'DOCUMENTARY' },
  'short-film':     { icon: '🎬', badge: '#16803c', display: 'SHORT FILM' },
  song:             { icon: '🎵', badge: '#7c3aed', display: 'SONG' },
  album:            { icon: '💿', badge: '#9333ea', display: 'ALBUM' },
  composition:      { icon: '🎼', badge: '#a855f7', display: 'COMPOSITION' },
  book:             { icon: '📖', badge: '#b45309', display: 'BOOK' },
  novel:            { icon: '📖', badge: '#b45309', display: 'BOOK' },
  novella:          { icon: '📖', badge: '#b45309', display: 'BOOK' },
  memoir:           { icon: '📖', badge: '#b45309', display: 'MEMOIR' },
  poem:             { icon: '📜', badge: '#92400e', display: 'POEM' },
  play:             { icon: '🎭', badge: '#dc2626', display: 'PLAY' },
  essay:            { icon: '📝', badge: '#78716c', display: 'ESSAY' },
  'video-game':     { icon: '🎮', badge: '#4f46e5', display: 'GAME' },
  painting:         { icon: '🎨', badge: '#c026d3', display: 'PAINTING' },
};

function getTypeConfig(type) {
  return TYPE_CONFIG[type] || { icon: '📄', badge: '#555', display: type?.toUpperCase() || 'WORK' };
}

// ─── Normalize for matching ─────────────────────────────────────────────────

function normalize(s) {
  return (s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

// ─── Build catalog indexes ──────────────────────────────────────────────────

function buildCatalogIndexes(catalog) {
  // Index by normalized title
  const byTitle = new Map();
  // Index by normalized creator
  const byCreator = new Map();

  for (const item of catalog) {
    const normTitle = normalize(item.title);
    if (!byTitle.has(normTitle)) byTitle.set(normTitle, []);
    byTitle.get(normTitle).push(item);

    if (item.creator) {
      const normCreator = normalize(item.creator);
      if (!byCreator.has(normCreator)) byCreator.set(normCreator, []);
      byCreator.get(normCreator).push(item);
    }
  }

  return { byTitle, byCreator };
}

// ─── Build entity index ─────────────────────────────────────────────────────

function loadEntityIndex() {
  if (!fs.existsSync(ENTITY_INDEX_FILE)) return null;
  try {
    const raw = JSON.parse(fs.readFileSync(ENTITY_INDEX_FILE, 'utf8'));
    // Entity index has entities as an object keyed by name, convert to lookup map
    const entities = raw.entities || {};
    return { byName: entities, videos: raw.videos || {} };
  } catch { return null; }
}

// ─── Find content for an entity ─────────────────────────────────────────────

function findContentForEntity(entityName, entityType, indexes, entityIndex) {
  const { byTitle, byCreator } = indexes;
  const normName = normalize(entityName);
  const results = [];
  const seen = new Set();

  // 1. If entity is a film/show, look up that specific title
  if (['film', 'show'].includes(entityType)) {
    const matches = byTitle.get(normName) || [];
    for (const m of matches) {
      const key = normalize(m.title) + '|' + m.type;
      if (!seen.has(key)) {
        seen.add(key);
        results.push(m);
      }
    }
  }

  // 2. If entity is a person/artist, find content they created
  const creatorMatches = byCreator.get(normName) || [];
  for (const m of creatorMatches) {
    const key = normalize(m.title) + '|' + m.type;
    if (!seen.has(key)) {
      seen.add(key);
      results.push(m);
    }
  }

  // 3. Check entity index for content discussed in relation to this entity
  if (entityIndex?.byName) {
    // Try exact name match and common variations
    const entityEntry = entityIndex.byName[entityName] || entityIndex.byName[entityName.toLowerCase()];
    if (entityEntry?.relatedContent) {
      for (const rc of entityEntry.relatedContent) {
        const titleMatches = byTitle.get(normalize(rc.title || rc)) || [];
        for (const m of titleMatches) {
          const key = normalize(m.title) + '|' + m.type;
          if (!seen.has(key)) {
            seen.add(key);
            results.push(m);
          }
        }
      }
    }
  }

  return results;
}

// ─── Build completeWorks entry from catalog item ────────────────────────────

function buildWorkEntry(item) {
  const config = getTypeConfig(item.type);

  // Build poster URL — prefer TMDB, then Open Library, then Spotify album art
  let posterUrl = null;
  if (item.tmdb?.poster_url) {
    posterUrl = item.tmdb.poster_url.startsWith('http')
      ? item.tmdb.poster_url
      : `https://image.tmdb.org/t/p/w200${item.tmdb.poster_url}`;
  } else if (item.openLibrary?.cover_url) {
    posterUrl = item.openLibrary.cover_url;
  } else if (item.spotify?.image_url) {
    posterUrl = item.spotify.image_url;
  }

  // Build year
  const year = item.tmdb?.year || item.openLibrary?.year || null;

  // Build YouTube ID for trailers
  let youtubeId = null;
  if (item.tmdb?.videos?.length) {
    const trailer = item.tmdb.videos.find(v => v.type === 'Trailer') || item.tmdb.videos[0];
    youtubeId = trailer?.key;
  } else if (item.youtube?.video_id) {
    youtubeId = item.youtube.video_id;
  }

  // Build Spotify link
  let spotifyUrl = null;
  if (item.spotify?.url) {
    spotifyUrl = item.spotify.url;
  } else if (item.spotify?.track_id) {
    spotifyUrl = `https://open.spotify.com/track/${item.spotify.track_id}`;
  } else if (item.spotify?.album_id) {
    spotifyUrl = `https://open.spotify.com/album/${item.spotify.album_id}`;
  }

  return {
    type: config.display,
    typeBadgeColor: config.badge,
    title: item.title,
    role: item.creator || '',
    meta: [item.creator, year].filter(Boolean).join(' · '),
    context: '',
    platform: spotifyUrl ? 'Spotify' : youtubeId ? 'YouTube' : '',
    platformColor: spotifyUrl ? '#1db954' : youtubeId ? '#ff0000' : '#555',
    icon: config.icon,
    posterUrl,
    year,
    yearEnd: null,
    ...(youtubeId && { youtube_id: youtubeId }),
    ...(spotifyUrl && { spotify_url: spotifyUrl }),
  };
}

// ─── Build soundtrack entry ─────────────────────────────────────────────────

function buildSoundtrackEntry(item) {
  if (!item.soundtrack?.album_id) return null;

  return {
    type: 'SOUNDTRACK',
    typeBadgeColor: '#7c3aed',
    title: item.soundtrack.album_name || `${item.title} (Soundtrack)`,
    meta: item.title,
    context: `From ${item.title}`,
    platform: 'Spotify',
    platformColor: '#1db954',
    icon: '🎵',
    spotify_url: `https://open.spotify.com/album/${item.soundtrack.album_id}`,
    album_id: item.soundtrack.album_id,
    ...(item.soundtrack.image_url && { posterUrl: item.soundtrack.image_url }),
  };
}

// ─── Enrich a universe file ─────────────────────────────────────────────────

function enrichUniverse(universeName, indexes, entityIndex) {
  const filePath = path.join(DATA_DIR, `${universeName}-universe.json`);
  if (!fs.existsSync(filePath)) {
    console.log(`  ⚠ ${universeName}-universe.json not found, skipping`);
    return;
  }

  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  const entityNames = Object.keys(data);

  console.log(`\n── ${universeName} (${entityNames.length} entities) ──`);

  let totalWorksAdded = 0;
  let totalSoundtracksFixed = 0;
  let totalEntitiesEnriched = 0;

  for (const name of entityNames) {
    const entity = data[name];
    const entityType = entity.type || 'unknown';

    // Find all related content from enriched catalog
    const content = findContentForEntity(name, entityType, indexes, entityIndex);

    if (content.length === 0) continue;

    // Build new completeWorks entries
    const existingWorkTitles = new Set(
      (entity.completeWorks || []).map(w => normalize(w.title))
    );

    const newWorks = [];
    let soundtrackEntry = null;

    for (const item of content) {
      // Skip if already in completeWorks
      if (existingWorkTitles.has(normalize(item.title))) {
        // But update existing entry if it's missing poster/youtube
        const existing = entity.completeWorks?.find(w => normalize(w.title) === normalize(item.title));
        if (existing) {
          const built = buildWorkEntry(item);
          if (!existing.posterUrl && built.posterUrl) existing.posterUrl = built.posterUrl;
          if (!existing.youtube_id && built.youtube_id) existing.youtube_id = built.youtube_id;
          if (!existing.spotify_url && built.spotify_url) existing.spotify_url = built.spotify_url;
          if (!existing.year && built.year) {
            existing.year = built.year;
            existing.meta = [existing.role || item.creator, built.year].filter(Boolean).join(' · ');
          }
        }
        continue;
      }

      const work = buildWorkEntry(item);
      newWorks.push(work);
      existingWorkTitles.add(normalize(item.title));

      // If this is a film with a soundtrack, build soundtrack entry for sonic
      if (item.soundtrack?.album_id) {
        soundtrackEntry = buildSoundtrackEntry(item);
      }
    }

    if (newWorks.length > 0) {
      entity.completeWorks = [...(entity.completeWorks || []), ...newWorks];
      totalWorksAdded += newWorks.length;
      totalEntitiesEnriched++;
    }

    // Fix entity type if catalog says it's a film (e.g., "sinners" typed as "person")
    if (entityType === 'person') {
      const filmMatch = content.find(c =>
        ['film', 'tv-series', 'documentary'].includes(c.type) &&
        normalize(c.title) === normalize(name)
      );
      if (filmMatch) {
        entity.type = 'film';
        console.log(`  Fixed type: "${name}" person → film`);
      }
    }

    // Fix soundtrack in sonic array — replace wrong soundtracks with correct per-entity one
    if (soundtrackEntry && entityType === 'film') {
      // Remove any existing wrong soundtrack
      entity.sonic = (entity.sonic || []).filter(s => s.type !== 'SOUNDTRACK' && s.type !== 'OST');
      entity.sonic.unshift(soundtrackEntry);
      totalSoundtracksFixed++;
    }

    // For person entities that are film directors, add their films' soundtracks to sonic
    if (['person', 'artist'].includes(entityType)) {
      const existingSonicTitles = new Set((entity.sonic || []).map(s => normalize(s.title)));
      for (const item of content) {
        if (item.soundtrack?.album_id) {
          const st = buildSoundtrackEntry(item);
          if (st && !existingSonicTitles.has(normalize(st.title))) {
            entity.sonic = entity.sonic || [];
            entity.sonic.push(st);
            existingSonicTitles.add(normalize(st.title));
          }
        }
      }
    }
  }

  // Sort completeWorks: FILM first, then TV, BOOK, SONG, ALBUM, by year desc
  const TYPE_ORDER = { FILM: 0, TV: 1, DOCUMENTARY: 2, 'SHORT FILM': 3, BOOK: 4, MEMOIR: 4, POEM: 5, PLAY: 5, ALBUM: 6, SONG: 7, COMPOSITION: 8 };
  for (const name of entityNames) {
    const entity = data[name];
    if (entity.completeWorks?.length > 1) {
      entity.completeWorks.sort((a, b) => {
        const typeA = TYPE_ORDER[a.type] ?? 99;
        const typeB = TYPE_ORDER[b.type] ?? 99;
        if (typeA !== typeB) return typeA - typeB;
        return (parseInt(b.year) || 0) - (parseInt(a.year) || 0);
      });
    }
  }

  console.log(`  Added ${totalWorksAdded} works to ${totalEntitiesEnriched} entities`);
  console.log(`  Fixed ${totalSoundtracksFixed} soundtracks`);

  if (!dryRun) {
    // Backup
    const backupDir = path.join(DATA_DIR, '_backups');
    if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });
    const backupPath = path.join(backupDir, `${universeName}-universe-${Date.now()}.json`);
    fs.copyFileSync(filePath, backupPath);

    // Write enriched file
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    console.log(`  Saved: ${universeName}-universe.json`);
  } else {
    console.log(`  (dry run — not saving)`);
  }
}

// ─── Main ───────────────────────────────────────────────────────────────────

console.log('UnitedTribes Universe Enrichment');
console.log(`Catalog: ${CATALOG_FILE}`);

if (!fs.existsSync(CATALOG_FILE)) {
  console.error('Error: enriched-content-catalog.json not found in src/data/');
  console.error('Copy from harvester: cp ../harvester/data/enriched-content-catalog.json src/data/');
  process.exit(1);
}

const catalogData = JSON.parse(fs.readFileSync(CATALOG_FILE, 'utf8'));
const catalog = catalogData.content;
console.log(`Loaded ${catalog.length} catalog items`);
console.log(`  With TMDB: ${catalog.filter(i => i.tmdb?.id).length}`);
console.log(`  With Spotify: ${catalog.filter(i => i.spotify?.track_id || i.spotify?.album_id).length}`);
console.log(`  With Open Library: ${catalog.filter(i => i.openLibrary?.cover_url).length}`);
console.log(`  With Soundtracks: ${catalog.filter(i => i.soundtrack?.album_id).length}`);

const indexes = buildCatalogIndexes(catalog);

// Try to load entity index for cross-referencing
const entityIndex = loadEntityIndex();
if (entityIndex) {
  console.log(`Entity index: ${Object.keys(entityIndex.byName).length} entities`);
}

const universesToProcess = targetUniverse ? [targetUniverse] : UNIVERSES;

for (const u of universesToProcess) {
  enrichUniverse(u, indexes, entityIndex);
}

console.log('\nDone!');
if (dryRun) console.log('(This was a dry run — re-run without --dry-run to save)');
