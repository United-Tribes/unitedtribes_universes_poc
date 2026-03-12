#!/usr/bin/env node

/**
 * extract-modal-data.js
 *
 * Reads YTA analysis.md files for 5 demo entities and outputs modal-data.json.
 *
 * Each entity is built from one or more video folders under:
 *   ~/Desktop/my-claude/podcast-test/youtube-analysis-viewer/data/videos/
 *
 * Output written to: ~/Desktop/unitedtribes-pocv2-jd/docs/modal-data.json
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

// ---------------------------------------------------------------------------
// Paths
// ---------------------------------------------------------------------------

const VIDEOS_DIR = path.join(
  os.homedir(),
  'Desktop/my-claude/podcast-test/youtube-analysis-viewer/data/videos'
);

const OUTPUT_PATH = path.join(
  os.homedir(),
  'Desktop/unitedtribes-pocv2-jd/docs/modal-data.json'
);

// ---------------------------------------------------------------------------
// Low-level file helpers
// ---------------------------------------------------------------------------

/**
 * Read a file as UTF-8 text. Returns null on error.
 * @param {string} filePath
 * @returns {string|null}
 */
function readFile(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch {
    return null;
  }
}

/**
 * Parse metadata.json for a video folder.
 * @param {string} folderName
 * @returns {{ video_id: string, title: string, channel: string }|null}
 */
function readMetadata(folderName) {
  const raw = readFile(path.join(VIDEOS_DIR, folderName, 'metadata.json'));
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/**
 * Read analysis.md for a video folder.
 * @param {string} folderName
 * @returns {string|null}
 */
function readAnalysis(folderName) {
  return readFile(path.join(VIDEOS_DIR, folderName, 'analysis.md'));
}

// ---------------------------------------------------------------------------
// Section parsers
// ---------------------------------------------------------------------------

/**
 * Extract the opening narrative paragraph (before the first "---" separator).
 * This is the editorial summary at the top of analysis.md.
 * @param {string} md
 * @returns {string}
 */
function parseOpeningNarrative(md) {
  // The header block ends with "---"; the paragraph follows.
  // The structure is: title line, blank line, bold metadata lines, blank, ---, blank, paragraph, blank, ---
  const lines = md.split('\n');
  let pastHeader = false;
  const paragraphLines = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (!pastHeader) {
      // The first "---" marks the end of the metadata block
      if (line.trim() === '---') {
        pastHeader = true;
      }
      continue;
    }

    // After the first "---" we collect lines until the next "---"
    if (line.trim() === '---') break;

    paragraphLines.push(line);
  }

  return paragraphLines.join('\n').trim();
}

/**
 * Extract content of a named ## section.
 * Returns the raw text between the section header and the next "---" separator.
 * @param {string} md
 * @param {string} sectionName  e.g. "THEMATIC OVERVIEW"
 * @returns {string}
 */
function extractSection(md, sectionName) {
  const lines = md.split('\n');
  let capturing = false;
  const captured = [];

  for (const line of lines) {
    if (capturing) {
      if (line.trim() === '---') break;
      captured.push(line);
    } else {
      // Match "## SECTION NAME" allowing for inline timestamps like "[00:00] ## SECTION NAME"
      if (line.includes(`## ${sectionName}`)) {
        capturing = true;
      }
    }
  }

  return captured.join('\n').trim();
}

// ---------------------------------------------------------------------------
// THEMATIC OVERVIEW parser
// ---------------------------------------------------------------------------

/**
 * Parse thematic overview paragraphs.
 * Format:
 *   **Bold title**
 *   Paragraph text (may span multiple lines)
 *   (blank line)
 *   **Next bold title**
 *   ...
 *
 * @param {string} md
 * @returns {Array<{ title: string, body: string }>}
 */
function parseThematicOverview(md) {
  const section = extractSection(md, 'THEMATIC OVERVIEW');
  if (!section) return [];

  const paragraphs = [];
  const lines = section.split('\n');
  let currentTitle = null;
  let bodyLines = [];

  const flush = () => {
    if (currentTitle) {
      paragraphs.push({ title: currentTitle, body: bodyLines.join(' ').trim() });
    }
    currentTitle = null;
    bodyLines = [];
  };

  for (const line of lines) {
    // Bold title line: **...**
    const titleMatch = line.match(/^\*\*(.+?)\*\*\s*$/);
    if (titleMatch) {
      flush();
      currentTitle = titleMatch[1].trim();
      continue;
    }

    if (currentTitle) {
      if (line.trim() === '') {
        // blank line between title and paragraph body is fine to skip
        if (bodyLines.length > 0) {
          // multiple blank lines signal a new block — but since titles delineate
          // blocks we just continue collecting
        }
      } else {
        bodyLines.push(line);
      }
    }
  }

  flush();
  return paragraphs;
}

// ---------------------------------------------------------------------------
// DISCOVERY PLAYLIST parser
// ---------------------------------------------------------------------------

/**
 * Parse the ## DISCOVERY PLAYLIST section.
 * Format:
 *   **Playlist Group Title**
 *   - Item Title - Creator type
 *   - Item Title - Creator type
 *
 * Returns an array of playlist groups, each with title + items array.
 *
 * @param {string} md
 * @returns {Array<{ title: string, items: Array<{ title: string, creator: string, type: string, icon: string }> }>}
 */
function parseDiscoveryPlaylist(md) {
  const section = extractSection(md, 'DISCOVERY PLAYLIST');
  if (!section) return [];

  const groups = [];
  let currentGroup = null;

  for (const line of section.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Group title: **Title**
    const groupMatch = trimmed.match(/^\*\*(.+?)\*\*\s*$/);
    if (groupMatch) {
      currentGroup = { title: groupMatch[1].trim(), items: [] };
      groups.push(currentGroup);
      continue;
    }

    // Item: - Title - Creator type
    if (trimmed.startsWith('- ') && currentGroup) {
      const itemText = trimmed.slice(2).trim();
      // Split on last " - " to separate "Title - Creator type"
      // Some items have multiple dashes so we find the last occurrence that is
      // followed by a known type word, otherwise use any last dash.
      const lastDash = itemText.lastIndexOf(' - ');
      if (lastDash !== -1) {
        const titlePart = itemText.slice(0, lastDash).trim();
        const creatorTypePart = itemText.slice(lastDash + 3).trim();
        // creatorTypePart = "Creator type" — the last word is the type
        const spaceIdx = creatorTypePart.lastIndexOf(' ');
        let creator, type;
        if (spaceIdx !== -1) {
          creator = creatorTypePart.slice(0, spaceIdx).trim();
          type = creatorTypePart.slice(spaceIdx + 1).trim();
        } else {
          creator = creatorTypePart;
          type = '';
        }
        const icon = typeToIcon(type);
        currentGroup.items.push({ title: titlePart, creator, type, icon });
      } else {
        // No dash — treat entire text as title with unknown creator/type
        currentGroup.items.push({ title: itemText, creator: '', type: '', icon: '🎵' });
      }
    }
  }

  return groups;
}

/**
 * Map a content type string to a display icon.
 * @param {string} type
 * @returns {string}
 */
function typeToIcon(type) {
  const t = (type || '').toLowerCase();
  if (t === 'song') return '🎵';
  if (t === 'album') return '💿';
  if (t === 'film' || t === 'movie') return '🎬';
  if (t === 'tv-series' || t === 'series') return '📺';
  if (t === 'episode') return '📺';
  if (t === 'documentary') return '🎞️';
  if (t === 'book' || t === 'novel') return '📚';
  if (t === 'podcast') return '🎙️';
  if (t === 'play') return '🎭';
  return '🔗';
}

// ---------------------------------------------------------------------------
// QUOTABLE MOMENTS parser
// ---------------------------------------------------------------------------

/**
 * Parse the ## QUOTABLE MOMENTS section.
 * Format:
 *   **[MM:SS]** - "Quote text" — Speaker
 *   Context: paragraph text
 *
 * Some entries omit the speaker ("— Speaker") portion.
 *
 * @param {string} md
 * @returns {Array<{ timestamp: string, quote: string, speaker: string, context: string }>}
 */
function parseQuotableMoments(md, videoId) {
  const section = extractSection(md, 'QUOTABLE MOMENTS');
  if (!section) return [];

  const moments = [];
  const lines = section.split('\n');
  let i = 0;

  while (i < lines.length) {
    const line = lines[i].trim();

    // Header line: **[MM:SS]** - "Quote" — Speaker
    // or: **[MM:SS]** - "Quote"
    // or: **[MM:SS]** "Quote" — Speaker  (no leading dash)
    const headerMatch = line.match(/^\*\*\[(\d{1,2}:\d{2}(?::\d{2})?)\]\*\*\s*[-–]?\s*"(.+?)"(?:\s*[—–-]\s*(.+?))?\.?\s*$/);

    if (headerMatch) {
      const timestamp = headerMatch[1];
      const quote = headerMatch[2].trim();
      const speaker = (headerMatch[3] || '').trim();

      // Collect context lines that follow
      const contextLines = [];
      i++;
      while (i < lines.length) {
        const nextLine = lines[i].trim();
        // Stop at the next bold timestamp header or blank line after context
        if (nextLine.match(/^\*\*\[\d{1,2}:\d{2}/)) break;
        if (nextLine.startsWith('Context:')) {
          contextLines.push(nextLine.replace(/^Context:\s*/, ''));
        } else if (contextLines.length > 0 && nextLine !== '') {
          contextLines.push(nextLine);
        } else if (contextLines.length > 0 && nextLine === '') {
          // blank line after context — peek ahead to see if next is another header
          const peek = (lines[i + 1] || '').trim();
          if (peek.match(/^\*\*\[\d{1,2}:\d{2}/)) break;
          // otherwise allow multi-paragraph context
        }
        i++;
      }

      moments.push({
        timestamp,
        quote,
        speaker,
        context: contextLines.join(' ').trim(),
        videoId: videoId || ''
      });
      continue;
    }

    i++;
  }

  return moments;
}

// ---------------------------------------------------------------------------
// DETAILED ANALYSIS parser
// ---------------------------------------------------------------------------

/**
 * Parse the ## DETAILED ANALYSIS section.
 * Format:
 *   **[MM:SS] — Label text**
 *   Paragraph text
 *
 * or:
 *   **[MM:SS] - Label text:**
 *   Paragraph text
 *
 * @param {string} md
 * @returns {Array<{ timestamp: string, label: string, context: string }>}
 */
function parseDetailedAnalysis(md) {
  const section = extractSection(md, 'DETAILED ANALYSIS');
  if (!section) return [];

  const keyMoments = [];
  const lines = section.split('\n');
  let i = 0;

  while (i < lines.length) {
    const line = lines[i].trim();

    // Header: **[MM:SS] — Label** or **[MM:SS] - Label:** or **[MM:SS] Label**
    const headerMatch = line.match(/^\*\*\[(\d{1,2}:\d{2}(?::\d{2})?)\]\s*[-–—]?\s*(.+?)\*\*\s*:?\s*$/);

    if (headerMatch) {
      const timestamp = headerMatch[1];
      const label = headerMatch[2].replace(/:$/, '').trim();

      // Collect body paragraph lines
      const bodyLines = [];
      i++;
      while (i < lines.length) {
        const nextLine = lines[i].trim();
        if (nextLine.match(/^\*\*\[\d{1,2}:\d{2}/)) break;
        if (nextLine !== '') bodyLines.push(nextLine);
        i++;
      }

      keyMoments.push({
        timestamp,
        label,
        context: bodyLines.join(' ').trim()
      });
      continue;
    }

    i++;
  }

  return keyMoments;
}

// ---------------------------------------------------------------------------
// ENTITY EXTRACTION parser (for cross-video search)
// ---------------------------------------------------------------------------

/**
 * Parse the ## ENTITY EXTRACTION section.
 * Format: - **[MM:SS] Entity Name** type
 *
 * @param {string} md
 * @returns {Array<{ timestamp: string, name: string, type: string }>}
 */
function parseEntityExtraction(md) {
  const section = extractSection(md, 'ENTITY EXTRACTION');
  if (!section) return [];

  const entities = [];
  for (const line of section.split('\n')) {
    const match = line.match(/^[-*]\s*\*\*\[(\d{1,2}:\d{2}(?::\d{2})?)\]\s+(.+?)\*\*\s*(.*)$/);
    if (match) {
      entities.push({
        timestamp: match[1],
        name: match[2].trim(),
        type: match[3].trim()
      });
    }
  }
  return entities;
}

// ---------------------------------------------------------------------------
// Insight selector
// ---------------------------------------------------------------------------

/**
 * Score a piece of text for "holy shit" quality.
 * Heuristic: prefers specific numbers, proper names, surprising reversals,
 * counterintuitive words, and longer (denser) quotes.
 *
 * @param {string} text
 * @returns {number}
 */
function scoreInsight(text) {
  let score = 0;
  // Length bonus (density of information)
  score += Math.min(text.length / 20, 30);
  // Specific numbers
  if (/\d+/.test(text)) score += 10;
  // Surprising/counterintuitive language
  const surpriseWords = [
    'never', 'first time', 'only', 'twenty years', 'rip', 'tore down',
    'rejected', 'loved.*rejected', 'not.*but', 'despite', 'completely',
    'radical', 'accident', 'unexpected', 'killed', 'million', 'billion',
    'immune', 'weapon', 'fresh start', 'blank'
  ];
  for (const w of surpriseWords) {
    if (new RegExp(w, 'i').test(text)) score += 5;
  }
  // Quotes with specific timestamps feel more grounded
  if (/\[\d{2}:\d{2}\]/.test(text)) score += 8;
  return score;
}

/**
 * Pick the best insight from a collection of quotable moments and thematic
 * paragraphs across multiple videos.
 *
 * @param {Array<{ quote: string, speaker: string, timestamp: string, videoId: string, videoTitle: string }>} quotes
 * @param {Array<{ title: string, body: string, videoId: string, videoTitle: string }>} thematicParagraphs
 * @returns {{ text: string, source: string, videoId: string, timestamp: string, proofLabel: string }}
 */
function selectBestInsight(quotes, thematicParagraphs) {
  let best = null;
  let bestScore = -Infinity;

  for (const q of quotes) {
    const s = scoreInsight(q.quote);
    if (s > bestScore) {
      bestScore = s;
      best = {
        text: q.quote,
        source: q.videoTitle,
        videoId: q.videoId,
        timestamp: q.timestamp,
        proofLabel: `"${q.quote.slice(0, 60)}…" — ${q.speaker || 'speaker'} [${q.timestamp}]`
      };
    }
  }

  for (const p of thematicParagraphs) {
    // Use a shorter excerpt (first sentence) as insight text for thematic paragraphs
    const firstSentence = p.body.split(/(?<=[.!?])\s+/)[0] || p.body;
    const s = scoreInsight(firstSentence) + scoreInsight(p.title);
    if (s > bestScore) {
      bestScore = s;
      best = {
        text: firstSentence,
        source: p.videoTitle,
        videoId: p.videoId,
        timestamp: '',
        proofLabel: `${p.title}`
      };
    }
  }

  return best || { text: '', source: '', videoId: '', timestamp: '', proofLabel: '' };
}

// ---------------------------------------------------------------------------
// Video loader — loads all parsed sections for a folder
// ---------------------------------------------------------------------------

/**
 * @typedef VideoData
 * @property {string} folderName
 * @property {string} videoId
 * @property {string} title
 * @property {string} channel
 * @property {string} openingNarrative
 * @property {Array<{ title: string, body: string }>} thematicOverview
 * @property {Array<object>} discoveryPlaylists
 * @property {Array<object>} quotableMoments
 * @property {Array<object>} keyMoments
 * @property {Array<object>} entities
 */

/**
 * Load and parse all data for a single video folder.
 * @param {string} folderName
 * @returns {VideoData|null}
 */
function loadVideo(folderName) {
  const meta = readMetadata(folderName);
  const analysis = readAnalysis(folderName);
  if (!meta || !analysis) {
    console.warn(`[WARN] Could not load video: ${folderName}`);
    return null;
  }

  return {
    folderName,
    videoId: meta.video_id,
    title: meta.title,
    channel: meta.channel,
    openingNarrative: parseOpeningNarrative(analysis),
    thematicOverview: parseThematicOverview(analysis),
    discoveryPlaylists: parseDiscoveryPlaylist(analysis),
    quotableMoments: parseQuotableMoments(analysis, meta.video_id),
    keyMoments: parseDetailedAnalysis(analysis),
    entities: parseEntityExtraction(analysis)
  };
}

// ---------------------------------------------------------------------------
// Cross-video search helpers
// ---------------------------------------------------------------------------

/**
 * List all folder names in VIDEOS_DIR.
 * @returns {string[]}
 */
function listAllFolders() {
  try {
    return fs.readdirSync(VIDEOS_DIR).filter(f => {
      return fs.statSync(path.join(VIDEOS_DIR, f)).isDirectory();
    });
  } catch {
    return [];
  }
}

/**
 * Search all analysis.md files for folders that mention a search term in their
 * entity extraction section. Returns matching folder names + the entity entries.
 *
 * @param {string[]} allFolders
 * @param {string} termRegex  a regex string to match entity names
 * @returns {Array<{ folderName: string, entities: Array<object> }>}
 */
function searchEntityMentions(allFolders, termRegex) {
  const re = new RegExp(termRegex, 'i');
  const results = [];

  for (const folder of allFolders) {
    const analysis = readAnalysis(folder);
    if (!analysis) continue;

    const entities = parseEntityExtraction(analysis);
    const matched = entities.filter(e => re.test(e.name));
    if (matched.length > 0) {
      results.push({ folderName: folder, entities: matched });
    }
  }

  return results;
}

/**
 * Search all analysis.md files for those that contain a term anywhere in the
 * discovery playlist groups — used for thematic/reference entities like
 * "Invasion of the Body Snatchers" that appear as playlist recommendations.
 *
 * @param {string[]} allFolders
 * @param {string} termRegex
 * @returns {Array<{ folderName: string, playlists: Array<object> }>}
 */
function searchPlaylistMentions(allFolders, termRegex) {
  const re = new RegExp(termRegex, 'i');
  const results = [];

  for (const folder of allFolders) {
    const analysis = readAnalysis(folder);
    if (!analysis) continue;

    const playlists = parseDiscoveryPlaylist(analysis);
    const matchedGroups = playlists
      .map(group => ({
        ...group,
        items: group.items.filter(item => re.test(item.title))
      }))
      .filter(group => group.items.length > 0);

    if (matchedGroups.length > 0) {
      results.push({ folderName: folder, playlists: matchedGroups });
    }
  }

  return results;
}

/**
 * Collect all quotable moments and thematic paragraphs from a list of
 * VideoData objects, annotating each with video title and id for provenance.
 *
 * @param {VideoData[]} videos
 * @returns {{ allQuotes: Array<object>, allThematic: Array<object> }}
 */
function aggregateInsightSources(videos) {
  const allQuotes = [];
  const allThematic = [];

  for (const v of videos) {
    for (const q of v.quotableMoments) {
      allQuotes.push({ ...q, videoTitle: v.title, videoId: v.videoId });
    }
    for (const p of v.thematicOverview) {
      allThematic.push({ ...p, videoTitle: v.title, videoId: v.videoId });
    }
  }

  return { allQuotes, allThematic };
}

// ---------------------------------------------------------------------------
// Entity builders
// ---------------------------------------------------------------------------

/**
 * Build the Dave Porter modal entity.
 * Primary video: the_unique_musical_approach_of_better_call_saul_da
 * Additional: breaking_the_rules_dave_porter, dave_porter_pluribus_full_interview,
 *   pluribus_composer_dave_porter_on_finding_the_rhyth,
 *   pluribus_composer_dave_porter_on_having_rhea_seeho,
 *   pluribus_composer_dave_porter_on_writing_more_than
 *
 * @returns {object}
 */
function buildDavePorter() {
  const folders = [
    'the_unique_musical_approach_of_better_call_saul_da',
    'breaking_the_rules_dave_porter',
    'dave_porter_pluribus_full_interview',
    'pluribus_composer_dave_porter_on_finding_the_rhyth',
    'pluribus_composer_dave_porter_on_having_rhea_seeho',
    'pluribus_composer_dave_porter_on_writing_more_than'
  ];

  const videos = folders.map(loadVideo).filter(Boolean);
  const primary = videos[0]; // the_unique_musical_approach
  const fullInterview = videos.find(v => v.folderName === 'dave_porter_pluribus_full_interview');

  const { allQuotes, allThematic } = aggregateInsightSources(videos);

  // Best insight: the "wholly fresh / rip to studs" quote from the full interview
  // is the most surprising disclosure across all Porter videos.
  const insight = selectBestInsight(allQuotes, allThematic);

  // Override with the most compelling specific quote we know exists
  const studsQuote = allQuotes.find(q =>
    q.quote.toLowerCase().includes('wholly fresh') ||
    q.quote.toLowerCase().includes('rip everything down to the studs')
  );
  if (studsQuote) {
    insight.text = studsQuote.quote;
    insight.source = studsQuote.videoTitle;
    insight.videoId = studsQuote.videoId;
    insight.timestamp = studsQuote.timestamp;
    insight.proofLabel = `"${studsQuote.quote.slice(0, 80)}…" [${studsQuote.timestamp}]`;
  }

  // Narrative: use the most information-dense thematic paragraph from the primary video
  // about the no-temp-music commitment (most distinctive/surprising fact)
  const noTempParagraph = primary.thematicOverview.find(p =>
    p.title.toLowerCase().includes('temp') || p.title.toLowerCase().includes('temp music')
  );
  const narrative = noTempParagraph
    ? noTempParagraph.body
    : (primary.thematicOverview[0] ? primary.thematicOverview[0].body : primary.openingNarrative);

  // Best discovery playlist: use the one about composer process from primary video
  const allPlaylists = videos.flatMap(v => v.discoveryPlaylists);
  const composerProcessPlaylist = allPlaylists.find(p =>
    p.title.toLowerCase().includes('process') || p.title.toLowerCase().includes('pluribus score')
  );
  const discoveryPlaylist = composerProcessPlaylist || primary.discoveryPlaylists[0] || { title: '', items: [] };

  // Top 3 quotable moments — pick across all videos, prefer those with strong context
  const topQuotes = allQuotes
    .sort((a, b) => scoreInsight(b.quote) - scoreInsight(a.quote))
    .slice(0, 3);

  // Key moments from primary video
  const keyMoments = primary.keyMoments.slice(0, 4);

  return {
    entityKey: 'dave-porter',
    type: 'person',
    typeBadge: { text: 'COMPOSER', color: '#7c3aed' },
    name: 'Dave Porter',
    subtitle: 'Composer, Breaking Bad / Better Call Saul / Pluribus',

    insight: {
      text: insight.text,
      source: insight.source,
      videoId: insight.videoId,
      timestamp: insight.timestamp,
      proofLabel: insight.proofLabel
    },

    narrative,

    discoveryPlaylist: {
      title: discoveryPlaylist.title,
      items: discoveryPlaylist.items.slice(0, 6)
    },

    quotableMoments: topQuotes.map(q => ({
      quote: q.quote,
      speaker: q.speaker || 'Dave Porter',
      timestamp: q.timestamp,
      videoId: q.videoId,
      context: q.context
    })),

    keyMoments: keyMoments.map(m => ({
      timestamp: m.timestamp,
      label: m.label,
      context: m.context.slice(0, 300) + (m.context.length > 300 ? '…' : '')
    })),

    searchPills: [
      'Dave Porter composer',
      'Breaking Bad score',
      'Better Call Saul music',
      'Pluribus soundtrack',
      'no temp music'
    ]
  };
}

/**
 * Build the Thomas Golubić modal entity.
 * Videos: 2.3.6 (GMSCon), 3.3.6 (GoldDerby), interview_thomas_golubi_halt_and_,
 *   the_life_of_a_hollywood_music_supervisor, the_walking_dead_music_supervisor
 *
 * @returns {object}
 */
function buildThomasGolubic() {
  const folders = [
    '2.3.6.he_loves_all_his_children_equally_thomas_golubi_gm',
    '3.3.6.thomas_golubic_better_call_saul_music_supervisor_c',
    'interview_thomas_golubi_music_supervisor_halt_and_',
    'the_life_of_a_hollywood_music_supervisor_how_to_be',
    'the_walking_dead_music_supervisor_thomas_golubic_o'
  ];

  const videos = folders.map(loadVideo).filter(Boolean);
  const primary = videos[0];    // GMSCon — most personal/surprising
  const goldDerby = videos[1];  // GoldDerby — richest analysis

  const { allQuotes, allThematic } = aggregateInsightSources(videos);

  // Best insight: the Kubrick comparison is the most emotionally revealing
  const kubrickQuote = allQuotes.find(q =>
    q.quote.toLowerCase().includes('kubrick') ||
    q.quote.toLowerCase().includes('closest i\'ve gotten')
  );

  // Burma Shave quote is also very distinctive
  const burmaShaveQuote = allQuotes.find(q =>
    q.quote.toLowerCase().includes('burma shave') ||
    q.quote.toLowerCase().includes('road tells you how far away')
  );

  const insightQuote = kubrickQuote || burmaShaveQuote;
  const insight = insightQuote
    ? {
        text: insightQuote.quote,
        source: insightQuote.videoTitle,
        videoId: insightQuote.videoId,
        timestamp: insightQuote.timestamp,
        proofLabel: `"${insightQuote.quote.slice(0, 80)}…" [${insightQuote.timestamp}]`
      }
    : selectBestInsight(allQuotes, allThematic);

  // Narrative: the private playlists paragraph is most revealing of craft
  const playlistParagraph = goldDerby.thematicOverview.find(p =>
    p.title.toLowerCase().includes('playlist') || p.title.toLowerCase().includes('private')
  );
  const narrative = playlistParagraph
    ? playlistParagraph.body
    : (goldDerby.thematicOverview[0] ? goldDerby.thematicOverview[0].body : primary.openingNarrative);

  // Best discovery playlist: The Needle Drops from GMSCon or the BCS songs from GoldDerby
  const allPlaylists = videos.flatMap(v => v.discoveryPlaylists);
  const needleDropPlaylist = allPlaylists.find(p =>
    p.title.toLowerCase().includes('needle drop') || p.title.toLowerCase().includes('songs')
  );
  const discoveryPlaylist = needleDropPlaylist || primary.discoveryPlaylists[0] || { title: '', items: [] };

  // Top 3 quotable moments
  const topQuotes = allQuotes
    .sort((a, b) => scoreInsight(b.quote) - scoreInsight(a.quote))
    .slice(0, 3);

  // Key moments from GoldDerby (richest analysis)
  const keyMoments = goldDerby.keyMoments.slice(0, 4);

  return {
    entityKey: 'thomas-golubic',
    type: 'person',
    typeBadge: { text: 'MUSIC SUPERVISOR', color: '#0d9488' },
    name: 'Thomas Golubić',
    subtitle: 'Music Supervisor, Breaking Bad / Better Call Saul / Pluribus',

    insight: {
      text: insight.text,
      source: insight.source,
      videoId: insight.videoId,
      timestamp: insight.timestamp,
      proofLabel: insight.proofLabel
    },

    narrative,

    discoveryPlaylist: {
      title: discoveryPlaylist.title,
      items: discoveryPlaylist.items.slice(0, 6)
    },

    quotableMoments: topQuotes.map(q => ({
      quote: q.quote,
      speaker: q.speaker || 'Thomas Golubić',
      timestamp: q.timestamp,
      videoId: q.videoId,
      context: q.context
    })),

    keyMoments: keyMoments.map(m => ({
      timestamp: m.timestamp,
      label: m.label,
      context: m.context.slice(0, 300) + (m.context.length > 300 ? '…' : '')
    })),

    searchPills: [
      'Thomas Golubić music supervisor',
      'Better Call Saul soundtrack',
      'needle drop selection',
      'Pluribus music',
      'no temp music television'
    ]
  };
}

/**
 * Build the "Invasion of the Body Snatchers" modal entity.
 *
 * This is a reference/thematic entity: it appears across 137+ analysis files
 * as a discovery playlist recommendation. We pick the analysis files where it's
 * most meaningfully discussed, then surface the best thematic context.
 *
 * Strategy:
 *   1. Find the top folders where "Invasion of the Body Snatchers" appears in
 *      entity extraction (most direct mentions) — use up to 5.
 *   2. Fall back to folders with discovery playlist appearances if needed.
 *   3. Collect quotable moments and thematic paragraphs from those folders
 *      that reference hive mind / body snatchers themes.
 *
 * @param {string[]} allFolders
 * @returns {object}
 */
function buildInvasionBodySnatchers(allFolders) {
  // Primary folders: the ones with richest thematic discussion of the hive-mind theme
  // that explicitly invoke Invasion of the Body Snatchers in playlist groups titled
  // "Hive Minds" or similar — drawn from our file reading above
  const primaryFolders = [
    '5_10_why_carol_is_immune_in_pluribus_finally_explained_',
    '7_1pluribus_season_1_episode_7_breakdown_recap_review',
    '4.3.6.thematically_is_pluribus_headed_in_a_similar_direc',
    '6_8the_terrifying_purpose_of_the_virus_revealed_pluri',
    '5_1pluribus_episode_5_the_specificity_of_grief_and_mi'
  ];

  const videos = primaryFolders.map(loadVideo).filter(Boolean);
  const { allQuotes, allThematic } = aggregateInsightSources(videos);

  // Best insight: the "planet" quote about seduction of peace
  const seductionQuotes = allQuotes.filter(q =>
    q.quote.toLowerCase().includes('hive') ||
    q.quote.toLowerCase().includes('snatchers') ||
    q.quote.toLowerCase().includes('snatched') ||
    q.quote.toLowerCase().includes('peace') ||
    q.quote.toLowerCase().includes('immune') ||
    q.quote.toLowerCase().includes('individual')
  );

  const { allQuotes: q1, allThematic: t1 } = { allQuotes: seductionQuotes, allThematic: allThematic };
  const insight = selectBestInsight(q1, t1);

  // Narrative: from the thematic overview about "hive minds and seduction of peace"
  const hiveParagraph = allThematic.find(p =>
    p.body.toLowerCase().includes('body snatchers') ||
    p.body.toLowerCase().includes('hive') ||
    p.title.toLowerCase().includes('hive') ||
    p.title.toLowerCase().includes('seduction') ||
    p.title.toLowerCase().includes('carol')
  );
  const narrative = hiveParagraph ? hiveParagraph.body : (allThematic[0] ? allThematic[0].body : '');

  // Discovery playlist: collect the "Hive Minds" playlist groups across all videos
  const hiveMindPlaylists = videos.flatMap(v =>
    v.discoveryPlaylists.filter(p =>
      p.title.toLowerCase().includes('hive') ||
      p.title.toLowerCase().includes('mind') ||
      p.title.toLowerCase().includes('snatchers') ||
      p.title.toLowerCase().includes('body') ||
      p.title.toLowerCase().includes('seduction') ||
      p.title.toLowerCase().includes('conformity')
    )
  );

  // Find the richest hive-mind playlist — deduplicate items by title
  const seenTitles = new Set();
  const bestPlaylistItems = [];
  const bestPlaylistTitle = hiveMindPlaylists[0] ? hiveMindPlaylists[0].title : 'Hive Minds and the Seduction of Peace';

  for (const playlist of hiveMindPlaylists) {
    for (const item of playlist.items) {
      if (!seenTitles.has(item.title)) {
        seenTitles.add(item.title);
        bestPlaylistItems.push(item);
      }
    }
    if (bestPlaylistItems.length >= 6) break;
  }

  // Top 3 quotable moments
  const topQuotes = allQuotes
    .filter(q =>
      q.quote.toLowerCase().includes('hive') ||
      q.quote.toLowerCase().includes('individual') ||
      q.quote.toLowerCase().includes('human') ||
      q.quote.toLowerCase().includes('immune')
    )
    .sort((a, b) => scoreInsight(b.quote) - scoreInsight(a.quote))
    .slice(0, 3);

  // Key moments from the Carol immunity video (most explicit hive-mind analysis)
  const primaryVideo = videos[0];
  const hiveMindKeyMoments = primaryVideo ? primaryVideo.keyMoments
    .filter(m =>
      m.label.toLowerCase().includes('hive') ||
      m.label.toLowerCase().includes('short-circuit') ||
      m.label.toLowerCase().includes('signal') ||
      m.label.toLowerCase().includes('invasion') ||
      m.label.toLowerCase().includes('biological') ||
      m.label.toLowerCase().includes('collective')
    )
    .slice(0, 4) : [];

  return {
    entityKey: 'invasion-body-snatchers',
    type: 'work',
    typeBadge: { text: 'FILM', color: '#dc2626' },
    name: 'Invasion of the Body Snatchers',
    subtitle: 'Philip Kaufman, 1978 — the hive-mind film Pluribus keeps invoking',

    insight: {
      text: insight.text || 'The Hive is a social network with no off switch — it spreads through kisses, saliva, and contaminated surfaces until the world collapses into one voice.',
      source: insight.source || videos[0]?.title || '',
      videoId: insight.videoId || videos[0]?.videoId || '',
      timestamp: insight.timestamp || '',
      proofLabel: insight.proofLabel || 'Thematic analysis across Pluribus commentary'
    },

    narrative: narrative || 'Invasion of the Body Snatchers appears across every major Pluribus analysis as the canonical reference point for the show\'s central horror: the seduction of conformity. Where the 1978 Kaufman film made pod-person conversion terrifying, Pluribus makes it genuinely appealing — which is the more unsettling update.',

    discoveryPlaylist: {
      title: bestPlaylistTitle,
      items: bestPlaylistItems.slice(0, 6)
    },

    quotableMoments: topQuotes.map(q => ({
      quote: q.quote,
      speaker: q.speaker || '',
      timestamp: q.timestamp,
      videoId: q.videoId,
      context: q.context
    })),

    keyMoments: hiveMindKeyMoments.map(m => ({
      timestamp: m.timestamp,
      label: m.label,
      context: m.context.slice(0, 300) + (m.context.length > 300 ? '…' : '')
    })),

    searchPills: [
      'Invasion of the Body Snatchers',
      'hive mind horror',
      'Pluribus hive',
      'pod person',
      'collective consciousness film'
    ]
  };
}

/**
 * Build the Carol Sturka modal entity.
 *
 * Carol appears in 241+ files. Strategy:
 *   1. Use the richest dedicated Carol analysis videos as primaries.
 *   2. Collect quotes and thematic paragraphs that directly analyze her character.
 *
 * @param {string[]} allFolders
 * @returns {object}
 */
function buildCarolSturka(allFolders) {
  // The richest dedicated Carol analysis videos (loaded from our exploration)
  const primaryFolders = [
    '5_10_why_carol_is_immune_in_pluribus_finally_explained_',
    '7_1pluribus_season_1_episode_7_breakdown_recap_review',
    'carol_must_escape_from_the_hives_mousetrap_pluribu',
    'why_pluribus_please_carol_episode_is_genius',
    's1e4fullplease_carol'
  ];

  // Also include any "carol" titled folders that exist
  const carolFolders = allFolders.filter(f =>
    f.toLowerCase().startsWith('carol_') ||
    f.toLowerCase().includes('_carol_') ||
    f.toLowerCase().endsWith('_carol')
  ).slice(0, 5);

  const allFoldersToLoad = [...new Set([...primaryFolders, ...carolFolders])];
  const videos = allFoldersToLoad.map(loadVideo).filter(Boolean);

  const { allQuotes, allThematic } = aggregateInsightSources(videos);

  // Filter to Carol-relevant content
  const carolQuotes = allQuotes.filter(q =>
    q.quote.toLowerCase().includes('carol') ||
    q.quote.toLowerCase().includes('immune') ||
    q.quote.toLowerCase().includes('helen') ||
    q.quote.toLowerCase().includes('hive') ||
    q.speaker.toLowerCase().includes('carol')
  );

  const carolThematic = allThematic.filter(p =>
    p.title.toLowerCase().includes('carol') ||
    p.body.toLowerCase().includes('carol sturka') ||
    p.title.toLowerCase().includes('immune') ||
    p.title.toLowerCase().includes('helen')
  );

  // Best insight: "immunity isn't a cape or a lab result" — the most evocative single line
  const capeQuote = allQuotes.find(q =>
    q.quote.toLowerCase().includes('cape') || q.quote.toLowerCase().includes('lab result')
  );
  const impedanceQuote = allQuotes.find(q =>
    q.quote.toLowerCase().includes('impedance') || q.quote.toLowerCase().includes('blanket') || q.quote.toLowerCase().includes('blade')
  );

  const insightSource = capeQuote || impedanceQuote || carolQuotes[0];
  const insight = insightSource
    ? {
        text: insightSource.quote,
        source: insightSource.videoTitle,
        videoId: insightSource.videoId,
        timestamp: insightSource.timestamp,
        proofLabel: `"${insightSource.quote.slice(0, 80)}…" [${insightSource.timestamp}]`
      }
    : selectBestInsight(carolQuotes, carolThematic);

  // Narrative: the paragraph about Carol's immunity as personality/wound/choice
  const immunityNarrativeParagraph = carolThematic.find(p =>
    p.title.toLowerCase().includes('unhappy outlier') ||
    p.title.toLowerCase().includes('worse than') ||
    p.title.toLowerCase().includes('three')
  ) || carolThematic.find(p => p.body.toLowerCase().includes('authentic misery')) || carolThematic[0];

  const narrative = immunityNarrativeParagraph ? immunityNarrativeParagraph.body : videos[0]?.openingNarrative || '';

  // Discovery playlist: the "Grief as an Anchor" or "Right to Be Unhappy" group
  const allPlaylists = videos.flatMap(v => v.discoveryPlaylists);
  const griefPlaylist = allPlaylists.find(p =>
    p.title.toLowerCase().includes('grief') ||
    p.title.toLowerCase().includes('unhappy') ||
    p.title.toLowerCase().includes('resistance') ||
    p.title.toLowerCase().includes('individual')
  );
  const discoveryPlaylist = griefPlaylist || allPlaylists[0] || { title: '', items: [] };

  // Top 3 quotable moments
  const topQuotes = carolQuotes
    .sort((a, b) => scoreInsight(b.quote) - scoreInsight(a.quote))
    .slice(0, 3);

  // Key moments from the Carol immunity video
  const carolImmunityVideo = videos.find(v =>
    v.folderName === '5_10_why_carol_is_immune_in_pluribus_finally_explained_'
  );
  const keyMoments = (carolImmunityVideo || videos[0])?.keyMoments
    .filter(m =>
      m.label.toLowerCase().includes('immunity') ||
      m.label.toLowerCase().includes('carol') ||
      m.label.toLowerCase().includes('shield') ||
      m.label.toLowerCase().includes('hive') ||
      m.label.toLowerCase().includes('helen') ||
      m.label.toLowerCase().includes('weapon')
    )
    .slice(0, 4) || [];

  return {
    entityKey: 'carol-sturka',
    type: 'character',
    typeBadge: { text: 'CHARACTER', color: '#b45309' },
    name: 'Carol Sturka',
    subtitle: 'Protagonist, Pluribus (Apple TV+) — played by Rhea Seehorn',

    insight: {
      text: insight.text,
      source: insight.source,
      videoId: insight.videoId,
      timestamp: insight.timestamp,
      proofLabel: insight.proofLabel
    },

    narrative,

    discoveryPlaylist: {
      title: discoveryPlaylist.title,
      items: discoveryPlaylist.items.slice(0, 6)
    },

    quotableMoments: topQuotes.map(q => ({
      quote: q.quote,
      speaker: q.speaker || '',
      timestamp: q.timestamp,
      videoId: q.videoId,
      context: q.context
    })),

    keyMoments: keyMoments.map(m => ({
      timestamp: m.timestamp,
      label: m.label,
      context: m.context.slice(0, 300) + (m.context.length > 300 ? '…' : '')
    })),

    searchPills: [
      'Carol Sturka Pluribus',
      'Rhea Seehorn character',
      'hive immunity explained',
      'Carol and Helen',
      'Pluribus protagonist'
    ]
  };
}

/**
 * Build the "Episode 7 Music" modal entity.
 *
 * This is a special entity organized around specific songs used in Episode 7
 * of Pluribus: R.E.M., Baltimora, Sousa, Kenny Loggins, Steppenwolf, Nelly,
 * Ray Charles, Gloria Gaynor, Hermanos Gutiérrez, Judas Priest.
 *
 * Strategy:
 *   - Load Episode 7 breakdown videos as primaries.
 *   - Extract quotable moments and key moments specifically about music use.
 *   - Build a discovery playlist from the Episode 7 songs themselves.
 *
 * @param {string[]} allFolders
 * @returns {object}
 */
function buildEpisode7Music(allFolders) {
  // Episode 7 analysis folders (all start with 7_)
  const ep7Folders = allFolders.filter(f =>
    f.match(/^7_\d/) ||
    f.match(/^7\d_/) ||
    f.toLowerCase().includes('episode_7') ||
    f.toLowerCase().includes('episode7') ||
    f.toLowerCase().includes('ep7') ||
    f.toLowerCase().includes('ep_7')
  );

  const videos = ep7Folders.map(loadVideo).filter(Boolean);

  const { allQuotes, allThematic } = aggregateInsightSources(videos);

  // The songs of Episode 7 (from the brief)
  const ep7Songs = [
    { title: "It's the End of the World as We Know It (And I Feel Fine)", creator: 'R.E.M.', type: 'song', icon: '🎵' },
    { title: 'Tarzan Boy', creator: 'Baltimora', type: 'song', icon: '🎵' },
    { title: 'Stars and Stripes Forever', creator: 'John Philip Sousa', type: 'song', icon: '🎵' },
    { title: "I'm Alright", creator: 'Kenny Loggins', type: 'song', icon: '🎵' },
    { title: 'Born to Be Wild', creator: 'Steppenwolf', type: 'song', icon: '🎵' },
    { title: 'Hot In Herre', creator: 'Nelly', type: 'song', icon: '🎵' },
    { title: 'Georgia on My Mind', creator: 'Ray Charles', type: 'song', icon: '🎵' },
    { title: 'I Will Survive', creator: 'Gloria Gaynor', type: 'song', icon: '🎵' },
    { title: 'Esperanza', creator: 'Hermanos Gutiérrez', type: 'song', icon: '🎵' },
    { title: "You've Got Another Thing Coming", creator: 'Judas Priest', type: 'song', icon: '🎵' }
  ];

  // Filter quotes to music-related ones
  const musicQuotes = allQuotes.filter(q => {
    const text = (q.quote + ' ' + q.context).toLowerCase();
    return (
      text.includes('music') ||
      text.includes('song') ||
      text.includes('score') ||
      text.includes('r.e.m') ||
      text.includes('end of the world') ||
      text.includes('i\'m alright') ||
      text.includes('tarzan') ||
      text.includes('loggins') ||
      text.includes('judas priest') ||
      text.includes('scoring') ||
      text.includes('soundtrack') ||
      text.includes('needle drop')
    );
  });

  // Best insight: the R.E.M. cut-before-"fine" observation is the single sharpest music insight
  const remObservation = allQuotes.find(q =>
    q.quote.toLowerCase().includes("end of the world") ||
    q.quote.toLowerCase().includes("i feel") ||
    q.quote.toLowerCase().includes('cuts away on the')
  );
  const logginsSong = allQuotes.find(q =>
    q.quote.toLowerCase().includes("i'm alright") ||
    q.quote.toLowerCase().includes('alright') && q.quote.toLowerCase().includes('loggins')
  );

  const insightQuote = remObservation || logginsSong || musicQuotes[0];
  const insight = insightQuote
    ? {
        text: insightQuote.quote,
        source: insightQuote.videoTitle,
        videoId: insightQuote.videoId,
        timestamp: insightQuote.timestamp,
        proofLabel: `"${insightQuote.quote.slice(0, 80)}…" [${insightQuote.timestamp}]`
      }
    : selectBestInsight(musicQuotes, allThematic);

  // Narrative: from Pete Peppers analysis about Carol scoring her own existence
  const scoringNarrative = allThematic.find(p =>
    p.body.toLowerCase().includes('scoring') ||
    p.body.toLowerCase().includes("i'm alright") ||
    p.body.toLowerCase().includes('end of the world') ||
    p.title.toLowerCase().includes('music') ||
    p.title.toLowerCase().includes('soundtrack')
  );
  const narrative = scoringNarrative ? scoringNarrative.body : videos[0]?.openingNarrative || '';

  // Top 3 music quotable moments
  const topMusicQuotes = musicQuotes
    .sort((a, b) => scoreInsight(b.quote) - scoreInsight(a.quote))
    .slice(0, 3);

  // Key moments about music from Episode 7 analysis
  const musicKeyMoments = videos.flatMap(v =>
    v.keyMoments.filter(m =>
      m.label.toLowerCase().includes('music') ||
      m.label.toLowerCase().includes('song') ||
      m.label.toLowerCase().includes('soundtrack') ||
      m.label.toLowerCase().includes('scoring') ||
      m.label.toLowerCase().includes('r.e.m') ||
      m.label.toLowerCase().includes('loggins') ||
      m.label.toLowerCase().includes('judas')
    )
  ).slice(0, 4);

  return {
    entityKey: 'episode-7-music',
    type: 'playlist',
    typeBadge: { text: 'EPISODE MUSIC', color: '#1d4ed8' },
    name: 'Episode 7 — "The Gap" Music',
    subtitle: 'Every song in Pluribus S1E7, and what each one means',

    insight: {
      text: insight.text || '"It\'s the End of the World as We Know It" plays on the highway — but the shot cuts away on the "I feel" part so Carol never gets to the word "fine."',
      source: insight.source || videos[0]?.title || '',
      videoId: insight.videoId || videos[0]?.videoId || '',
      timestamp: insight.timestamp || '03:55',
      proofLabel: insight.proofLabel || 'Music analysis, Pete Peppers — Pluribus S1E7 breakdown'
    },

    narrative: narrative || 'Episode 7 ("The Gap") is built around Carol scoring her own existence — choosing music that comments on her psychological state rather than expressing it. Each cue is an act of self-narration for an audience of no one, which makes the editorial choices (cutting R.E.M. before "fine," playing Kenny Loggins ironically, ending on Judas Priest while smashing windows) feel like Carol writing her own breakdown into the show\'s soundtrack.',

    discoveryPlaylist: {
      title: 'The Songs of Episode 7 — "The Gap"',
      items: ep7Songs
    },

    quotableMoments: topMusicQuotes.map(q => ({
      quote: q.quote,
      speaker: q.speaker || '',
      timestamp: q.timestamp,
      videoId: q.videoId,
      context: q.context
    })),

    keyMoments: musicKeyMoments.map(m => ({
      timestamp: m.timestamp,
      label: m.label,
      context: m.context.slice(0, 300) + (m.context.length > 300 ? '…' : '')
    })),

    searchPills: [
      'Pluribus episode 7 music',
      'R.E.M. end of the world Pluribus',
      "I'm Alright Kenny Loggins",
      'Thomas Golubić music supervisor',
      'episode 7 The Gap breakdown'
    ]
  };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log('[extract-modal-data] Starting extraction…');
  console.log(`[extract-modal-data] Videos dir: ${VIDEOS_DIR}`);

  // Verify videos directory exists
  if (!fs.existsSync(VIDEOS_DIR)) {
    console.error(`[ERROR] Videos directory not found: ${VIDEOS_DIR}`);
    process.exit(1);
  }

  const allFolders = listAllFolders();
  console.log(`[extract-modal-data] Found ${allFolders.length} video folders`);

  console.log('[extract-modal-data] Building entity: Dave Porter…');
  const davePorter = buildDavePorter();

  console.log('[extract-modal-data] Building entity: Thomas Golubić…');
  const thomasGolubic = buildThomasGolubic();

  console.log('[extract-modal-data] Building entity: Invasion of the Body Snatchers…');
  const bodySnatchersFolders = allFolders; // pass all for cross-search
  const invasionBodySnatchers = buildInvasionBodySnatchers(bodySnatchersFolders);

  console.log('[extract-modal-data] Building entity: Carol Sturka…');
  const carolSturka = buildCarolSturka(allFolders);

  console.log('[extract-modal-data] Building entity: Episode 7 Music…');
  const episode7Music = buildEpisode7Music(allFolders);

  // Add visual data from pluribus-universe.json
  const uniPath = path.join(os.homedir(), 'Desktop/unitedtribes-pocv2-jd/src/data/pluribus-universe.json');
  const universe = JSON.parse(fs.readFileSync(uniPath, 'utf8'));

  function addVisual(entity, uniKey) {
    const uniEntity = universe[uniKey];
    if (uniEntity) {
      entity.visual = {
        photoUrl: uniEntity.photoUrl || null,
        posterUrl: uniEntity.posterUrl || null,
        gradient: uniEntity.avatarGradient || 'linear-gradient(135deg, #1e40af, #3b82f6)'
      };
    } else {
      entity.visual = { photoUrl: null, posterUrl: null, gradient: 'linear-gradient(135deg, #1e40af, #3b82f6)' };
    }
  }

  addVisual(davePorter, 'Dave Porter');
  addVisual(thomasGolubic, 'Thomas Golubic');
  addVisual(invasionBodySnatchers, 'Invasion of the Body Snatchers');
  addVisual(carolSturka, 'Carol Sturka');
  episode7Music.visual = { photoUrl: null, posterUrl: null, gradient: 'linear-gradient(135deg, #16803c, #22c55e)' };

  // Output keyed by entityKey for easy lookup in the UI
  const allEntities = [davePorter, thomasGolubic, invasionBodySnatchers, carolSturka, episode7Music];
  const output = {};
  for (const entity of allEntities) {
    output[entity.entityKey] = entity;
  }

  // Ensure output directory exists
  const outputDir = path.dirname(OUTPUT_PATH);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(output, null, 2), 'utf8');

  console.log(`[extract-modal-data] Done. Output written to: ${OUTPUT_PATH}`);
  console.log(`[extract-modal-data] Entities generated: ${allEntities.map(e => e.entityKey).join(', ')}`);

  // Print a brief summary per entity
  for (const entity of allEntities) {
    const qCount = entity.quotableMoments?.length ?? 0;
    const kmCount = entity.keyMoments?.length ?? 0;
    const piCount = entity.discoveryPlaylist?.items?.length ?? 0;
    console.log(
      `  → ${entity.entityKey}: ${qCount} quotes, ${kmCount} key moments, ${piCount} playlist items`
    );
  }
}

main().catch(err => {
  console.error('[ERROR]', err);
  process.exit(1);
});
