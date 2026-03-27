/**
 * parseYtaAnalysis.js
 * Parses YTA analysis markdown into structured data for modal display.
 *
 * YTA analysis framework (v7.7.5+) produces consistent sections:
 *   ## DISCOVERY PLAYLIST
 *   ## ENTITY EXTRACTION
 *   ## THEMATIC OVERVIEW
 *   ## QUOTABLE MOMENTS
 *   ## WORKS DISCUSSED IN THIS VIDEO
 *   ## DETAILED ANALYSIS
 *
 * Returns: { discoveryPlaylists, entities, quotes, themes, worksDiscussed, synopsis }
 */

function parseTimestamp(ts) {
  if (!ts) return 0;
  const clean = ts.replace(/[\[\]]/g, "").trim();
  const parts = clean.split(":").map(Number);
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return 0;
}

function formatTimestamp(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export default function parseYtaAnalysis(markdown) {
  if (!markdown || typeof markdown !== "string") {
    return { discoveryPlaylists: [], entities: [], quotes: [], themes: [], worksDiscussed: [], synopsis: "" };
  }

  const result = {
    discoveryPlaylists: [],
    entities: [],
    quotes: [],
    themes: [],
    worksDiscussed: [],
    synopsis: "",
  };

  // Extract synopsis — the paragraph(s) before the first ## section
  const firstSectionMatch = markdown.match(/\n(?:\*\*\[\d{1,2}:\d{2}(?::\d{2})?\]\*\*\s*)?## /);
  const firstSection = firstSectionMatch ? firstSectionMatch.index : -1;
  if (firstSection > 0) {
    const preamble = markdown.substring(0, firstSection);
    // Find the first substantial paragraph (skip title/metadata lines)
    const lines = preamble.split("\n").filter(l => {
      const t = l.trim();
      if (!t) return false;
      if (t.startsWith("#")) return false;
      if (t.startsWith("---")) return false;
      // Skip all **Key:** metadata lines (Title, Source, ID, Duration, Type, Channel, Video Title, Video ID, etc.)
      if (/^\*\*[A-Za-z\s]+:\*\*/.test(t)) return false;
      return true;
    });
    if (lines.length > 0) {
      result.synopsis = lines.join(" ").trim();
    }
  }

  // Split into sections by ## headers (may have optional **[timestamp]** prefix)
  const sectionRegex = /^(?:\*\*\[\d{1,2}:\d{2}(?::\d{2})?\]\*\*\s*)?## (.+)$/gm;
  const sections = {};
  let match;
  const sectionPositions = [];

  while ((match = sectionRegex.exec(markdown)) !== null) {
    sectionPositions.push({ title: match[1].trim(), start: match.index + match[0].length });
  }

  for (let i = 0; i < sectionPositions.length; i++) {
    const end = i + 1 < sectionPositions.length ? sectionPositions[i + 1].start - sectionPositions[i + 1].title.length - 4 : markdown.length;
    const content = markdown.substring(sectionPositions[i].start, end).trim();
    const key = sectionPositions[i].title.toUpperCase();
    if (!sections[key]) sections[key] = content;
    else sections[key] += "\n\n" + content; // multiple sections with same name get merged
  }

  // --- DISCOVERY PLAYLISTS ---
  const discContent = sections["DISCOVERY PLAYLIST"] || sections["DISCOVERY PLAYLISTS"] || "";
  if (discContent) {
    let currentPlaylist = null;
    for (const line of discContent.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      // Playlist title: bold line like **The Works Born at the Hotel Chelsea — ...**
      if (trimmed.startsWith("**") && trimmed.endsWith("**")) {
        if (currentPlaylist) result.discoveryPlaylists.push(currentPlaylist);
        currentPlaylist = { title: trimmed.replace(/\*\*/g, "").trim(), items: [] };
      } else if (trimmed.startsWith("- ") && currentPlaylist) {
        // Item: - Just Kids - Patti Smith book
        const itemText = trimmed.slice(2).trim();
        // Parse: "Title - Creator type" or "Title - Creator"
        const dashParts = itemText.split(" - ");
        if (dashParts.length >= 2) {
          const title = dashParts[0].trim();
          const rest = dashParts.slice(1).join(" - ").trim();
          // Try to extract type from the end (book, song, album, film, etc.)
          const typeMatch = rest.match(/\b(book|song|album|film|documentary|novel|play|memoir|record|short story|poem|compilation|anthology)\s*$/i);
          const type = typeMatch ? typeMatch[1] : "";
          const creator = type ? rest.slice(0, rest.length - type.length).trim() : rest;
          currentPlaylist.items.push({ title, creator, type: type.toLowerCase() });
        } else {
          currentPlaylist.items.push({ title: itemText, creator: "", type: "" });
        }
      }
    }
    if (currentPlaylist) result.discoveryPlaylists.push(currentPlaylist);
  }

  // --- ENTITY EXTRACTION ---
  const entityContent = sections["ENTITY EXTRACTION"] || "";
  if (entityContent) {
    // Format: - **[00:02] Hotel Chelsea** place
    // or: **[00:02] Hotel Chelsea** place
    const entityRegex = /\*\*\[(\d{1,2}:\d{2}(?::\d{2})?)\]\s*([^*]+)\*\*\s*(.*)/g;
    let em;
    while ((em = entityRegex.exec(entityContent)) !== null) {
      const ts = em[1].trim();
      const name = em[2].trim();
      const type = em[3].trim();
      result.entities.push({
        timestamp: ts,
        timestamp_seconds: parseTimestamp(ts),
        name,
        type: type || "entity",
      });
    }
  }

  // --- QUOTABLE MOMENTS ---
  const quoteContent = sections["QUOTABLE MOMENTS"] || "";
  if (quoteContent) {
    // Format: **[00:02]** - "Quote text" — Attribution\nContext: paragraph
    const quoteBlocks = quoteContent.split(/\n(?=\*\*\[)/);
    for (const block of quoteBlocks) {
      const headerMatch = block.match(/\*\*\[(\d{1,2}:\d{2}(?::\d{2})?)\]\*\*\s*[-–—]\s*"([^"]+)"\s*[-–—]\s*(.+)/);
      if (headerMatch) {
        const ts = headerMatch[1].trim();
        const quote = headerMatch[2].trim();
        const attribution = headerMatch[3].split("\n")[0].trim();
        // Extract context paragraph
        const contextMatch = block.match(/Context:\s*(.+)/s);
        const context = contextMatch ? contextMatch[1].trim() : "";
        result.quotes.push({
          timestamp: ts,
          timestamp_seconds: parseTimestamp(ts),
          quote,
          attribution,
          context,
        });
      }
    }
  }

  // --- THEMATIC OVERVIEW ---
  const themeContent = sections["THEMATIC OVERVIEW"] || "";
  if (themeContent) {
    // Format: **Bold Title**\nParagraph text with [timestamp] references
    const themeBlocks = themeContent.split(/\n(?=\*\*[A-Z])/);
    for (const block of themeBlocks) {
      const titleMatch = block.match(/^\*\*(.+?)\*\*/);
      if (titleMatch) {
        const title = titleMatch[1].trim();
        const summary = block.slice(titleMatch[0].length).trim();
        // Extract first timestamp from the summary
        const tsMatch = summary.match(/\[(\d{1,2}:\d{2}(?::\d{2})?)\]/);
        result.themes.push({
          title,
          summary: summary.slice(0, 500) + (summary.length > 500 ? "..." : ""),
          timestamp: tsMatch ? tsMatch[1] : "",
          timestamp_seconds: tsMatch ? parseTimestamp(tsMatch[1]) : 0,
        });
      }
    }
  }

  // --- WORKS DISCUSSED ---
  const worksContent = sections["WORKS DISCUSSED IN THIS VIDEO"] || "";
  if (worksContent) {
    for (const line of worksContent.split("\n")) {
      const trimmed = line.trim();
      if (trimmed.startsWith("- **")) {
        // Format: - **Just Kids** - Patti Smith book
        const workMatch = trimmed.match(/- \*\*(.+?)\*\*\s*[-–—]\s*(.+)/);
        if (workMatch) {
          const title = workMatch[1].trim();
          const rest = workMatch[2].trim();
          const typeMatch = rest.match(/\b(book|song|album|film|documentary|novel|play|memoir)\s*$/i);
          const type = typeMatch ? typeMatch[1] : "";
          const creator = type ? rest.slice(0, rest.length - type.length).trim() : rest;
          result.worksDiscussed.push({ title, creator, type: type.toLowerCase() });
        }
      }
    }
  }

  return result;
}
