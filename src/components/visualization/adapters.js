import {
  API_BASE,
  TYPE_MAP,
  UNIVERSE_TYPES,
  THEMES_TYPES,
  REL_COLORS,
  THEME_REL_COLORS,
  MAX_NODES,
} from "./constants";

// ═══════════════════════════════════════════════════════
//  HELPERS
// ═══════════════════════════════════════════════════════

export function slugify(name) {
  return name
    .toLowerCase()
    .replace(/['']/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function mapEntityType(kgType) {
  if (!kgType) return "concept";
  const normalized = kgType.toLowerCase().replace(/\s+/g, "_");
  return TYPE_MAP[normalized] || "concept";
}

export function deriveNodeSize(degree, maxDegree, isCenter) {
  if (isCenter) return 28;
  const ratio = degree / Math.max(maxDegree, 1);
  if (ratio > 0.6) return 16 + Math.round(ratio * 6);
  if (ratio > 0.3) return 10 + Math.round(ratio * 5);
  return 6 + Math.round(ratio * 3);
}

// ═══════════════════════════════════════════════════════
//  KG API FETCHING
// ═══════════════════════════════════════════════════════

async function fetchEntityRelationships(entityName) {
  const encoded = encodeURIComponent(entityName);
  const allRelationships = [];
  let page = 1;
  let hasMore = true;

  while (hasMore) {
    const url = `${API_BASE}/entities/${encoded}?page=${page}&limit=100`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`API error: ${res.status} for ${entityName}`);
    const data = await res.json();

    const rels = data.relationships || data.results || [];
    allRelationships.push(...rels);

    if (rels.length < 100) {
      hasMore = false;
    } else {
      page++;
      if (page > 10) hasMore = false; // safety cap
    }
  }

  return allRelationships;
}

// ═══════════════════════════════════════════════════════
//  UNIVERSE NETWORK ADAPTER
// ═══════════════════════════════════════════════════════

// Entities to exclude from the graph (unresolved / noise)
const EXCLUDE_ENTITIES = new Set(["BTR1", "Ricky Cook", "Vince Gilligan tv-series"]);

// Derive relationship type from a collaborator role string
function deriveRelType(role) {
  if (!role) return "COLLABORATED";
  if (/Creator|created/i.test(role)) return "CREATED_BY";
  if (/\bCast\b|as |Actor|Actress/i.test(role)) return "STARRED_IN";
  if (/Composer|Music/i.test(role)) return "COMPOSED_FOR";
  if (/Producer/i.test(role)) return "PRODUCED_BY";
  if (/Director/i.test(role)) return "DIRECTED";
  if (/Writ/i.test(role)) return "WROTE_FOR";
  if (/Recurring/i.test(role)) return "STARRED_IN";
  if (/Crew/i.test(role)) return "COLLABORATED";
  return "COLLABORATED";
}

// Map assembled entity_type to visualization type, with overrides for
// entities that the harvester mis-categorized (e.g. TZ episodes as "person")
function resolveVisType(name, entData) {
  if (!entData) return "person";
  // Twilight Zone episodes and The Borg are mis-typed as "person"
  if (/^The Twilight Zone:/.test(name) || name === "The Borg") return "concept";
  return mapEntityType(entData.type || "person");
}

// Build media object for a node from its assembled data entry
function buildNodeMedia(entData, nodeColor) {
  if (!entData) return { videos: [], audio: [] };

  // Collect videos from multiple quickViewGroup labels (Videos, Trailers, Analysis)
  const videoLabels = new Set(["Videos", "Trailers", "Analysis"]);
  const allVideoItems = (entData.quickViewGroups || [])
    .filter((g) => videoLabels.has(g.label))
    .flatMap((g) => g.items || []);

  const videos = allVideoItems
    .slice(0, 3)
    .map((v) => ({
      title: v.title || v.label || "",
      videoId: v.videoId || v.video_id || "",
      desc: v.meta || v.context || "",
    }));

  const audio = (entData.sonic || [])
    .filter((s) => s.spotify_url)
    .slice(0, 3)
    .map((s) => ({
      title: s.title,
      artist: s.meta,
      spotifyUrl: s.spotify_url,
      albumId: s.album_id,
      type: s.type,
      color: nodeColor,
    }));

  return { videos, audio };
}

export async function fetchUniverseGraph(entityName, assembledData, responseData) {
  // Prefer assembled data when available — it gives us rich clusters
  if (assembledData && (assembledData[entityName] || assembledData[entityName.toLowerCase()])) {
    return buildUniverseGraphFromAssembled(entityName, assembledData, responseData);
  }

  // Fallback to KG API
  let relationships;
  try {
    relationships = await fetchEntityRelationships(entityName);
  } catch (err) {
    console.warn("KG API fetch failed, falling back to mock data:", err);
    if (assembledData) {
      return buildUniverseGraphFromAssembled(entityName, assembledData);
    }
    throw err;
  }

  if (!relationships.length && assembledData) {
    return buildUniverseGraphFromAssembled(entityName, assembledData);
  }

  // Filter out "discusses" noise and low-confidence relationships
  const filtered = relationships.filter((rel) => {
    const relType = (rel.relationship_type || rel.type || "").toLowerCase();
    if (relType === "discusses") return false;
    if (rel.confidence !== undefined && rel.confidence < 0.95) return false;
    return true;
  });

  // Build graph from API relationships (existing logic, with media enrichment)
  const entityMap = new Map();
  const centerId = slugify(entityName);
  entityMap.set(centerId, {
    id: centerId,
    name: entityName,
    type: "show",
    degree: 0,
    rawType: "show",
  });

  filtered.forEach((rel) => {
    const source = rel.source_entity || rel.source;
    const target = rel.target_entity || rel.target;
    const sourceType = rel.source_type || rel.source_entity_type || "";
    const targetType = rel.target_type || rel.target_entity_type || "";

    if (source) {
      const sid = slugify(source);
      if (!entityMap.has(sid)) {
        entityMap.set(sid, { id: sid, name: source, type: mapEntityType(sourceType), degree: 0, rawType: sourceType });
      }
      entityMap.get(sid).degree++;
    }
    if (target) {
      const tid = slugify(target);
      if (!entityMap.has(tid)) {
        entityMap.set(tid, { id: tid, name: target, type: mapEntityType(targetType), degree: 0, rawType: targetType });
      }
      entityMap.get(tid).degree++;
    }
  });

  filtered.forEach((rel) => {
    const source = rel.source_entity || rel.source;
    const target = rel.target_entity || rel.target;
    if (slugify(source) === centerId || slugify(target) === centerId) {
      entityMap.get(centerId).degree++;
    }
  });

  const sorted = [...entityMap.values()].sort((a, b) => b.degree - a.degree);
  const maxDegree = sorted[0]?.degree || 1;
  const topEntities = sorted.slice(0, MAX_NODES);
  const topIds = new Set(topEntities.map((e) => e.id));

  const nodes = topEntities.map((ent, i) => {
    const isCenter = ent.id === centerId;
    const size = deriveNodeSize(ent.degree, maxDegree, isCenter);
    const featured = isCenter || i < 5;
    const assembled = assembledData?.[ent.name];
    const color = UNIVERSE_TYPES[ent.type]?.color || "#607d8b";

    return {
      id: ent.id,
      name: ent.name,
      type: ent.type,
      size,
      featured,
      subtitle: assembled?.subtitle || ent.rawType || "",
      description: assembled?.bio?.[0] || "",
      hook: "",
      imageUrl: assembled?.photoUrl || assembled?.posterUrl || null,
      media: buildNodeMedia(assembled, color),
    };
  });

  const edgeSet = new Set();
  const edges = [];

  filtered.forEach((rel) => {
    const source = rel.source_entity || rel.source;
    const target = rel.target_entity || rel.target;
    const sid = slugify(source);
    const tid = slugify(target);

    if (!topIds.has(sid) || !topIds.has(tid)) return;
    if (sid === tid) return;

    const relType = (rel.relationship_type || rel.type || "RELATED_TO").toUpperCase().replace(/\s+/g, "_");
    const edgeKey = `${sid}-${tid}-${relType}`;
    const reverseKey = `${tid}-${sid}-${relType}`;
    if (edgeSet.has(edgeKey) || edgeSet.has(reverseKey)) return;
    edgeSet.add(edgeKey);

    edges.push({
      source: sid,
      target: tid,
      rel: relType,
      label: rel.relationship_type || rel.type || "related to",
    });
  });

  return { nodes, edges, types: UNIVERSE_TYPES };
}

// ── Primary: build rich graph from assembled (harvester) data ──
// Creates diverse clusters: cast, creators, influences, music, themes
function buildUniverseGraphFromAssembled(entityName, assembledData, responseData) {
  const centerId = slugify(entityName);
  const nodeMap = new Map(); // id → node data
  const edges = [];
  const edgeSet = new Set();

  const centerData = assembledData[entityName] || assembledData[Object.keys(assembledData)[0]];
  const centerType = centerData?.type || "show";

  // Helper: add an edge (deduped by source-target pair + rel type)
  function addEdge(sourceId, targetId, rel, label) {
    if (sourceId === targetId) return;
    const ek = `${sourceId}-${targetId}-${rel}`;
    const rk = `${targetId}-${sourceId}-${rel}`;
    if (edgeSet.has(ek) || edgeSet.has(rk)) return;
    edgeSet.add(ek);
    edges.push({ source: sourceId, target: targetId, rel, label });
  }

  // Helper: add a node to nodeMap if not already there
  function addNode(name, entData, type) {
    const id = slugify(name);
    if (nodeMap.has(id)) return id;
    nodeMap.set(id, { id, name, entData, type });
    return id;
  }

  // ── 1. Center node ──
  addNode(entityName, centerData, centerType);

  // ── 2. CAST & CREATORS — driven by discoveryGroups (TMDB-validated) ──
  const inspirationNames = new Set(
    (centerData?.inspirations || []).map((i) => i.title)
  );
  const creatorNodeIds = new Set(); // track creators for separate cluster
  const actorCharMap = responseData?.actorCharacterMap || {};

  // Create cast hub node
  const castHubId = slugify(`Cast of ${entityName}`);
  addNode(`Cast of ${entityName}`, {
    subtitle: "The ensemble",
    bio: [`The actors bringing ${entityName} to life.`],
    isHub: true,
  }, "person");
  addEdge(centerId, castHubId, "STARRED_IN", "cast");

  // Create creators hub node
  const creatorsHubId = slugify(`Creators of ${entityName}`);
  addNode(`Creators of ${entityName}`, {
    subtitle: "Creators & key crew",
    bio: [`The creative minds behind ${entityName} — creators, writers, composers, and key crew.`],
    isHub: true,
  }, "creator");
  addEdge(centerId, creatorsHubId, "CREATED_BY", "creators");

  // Read validated cast and crew from discoveryGroups
  const groups = responseData?.discoveryGroups || [];
  const castGroup = groups.find((g) => g.title === "The Cast");
  const crewGroup = groups.find((g) => g.title === "Behind the Scenes");

  // Build character entity lookup — handles name mismatches
  // (e.g. actorCharMap says "Helen" but entity is "Helen L. Umstead")
  const charEntities = Object.entries(assembledData)
    .filter(([, v]) => v.type === "character" && v.bio?.[0]);
  function findCharEntity(charName) {
    if (!charName) return null;
    // Exact match first
    if (assembledData[charName]?.type === "character") return assembledData[charName];
    // Fuzzy: full name contains, or shared surname
    const lower = charName.toLowerCase();
    const surname = lower.split(/[\s.]+/).pop();
    const match = charEntities.find(([name]) => {
      const nl = name.toLowerCase();
      return nl.includes(lower) || lower.includes(nl) ||
        (surname.length > 3 && nl.includes(surname));
    });
    return match ? match[1] : null;
  }

  // Add cast from discoveryGroups (TMDB-validated, 17 members)
  (castGroup?.cards || []).forEach((card) => {
    if (EXCLUDE_ENTITIES.has(card.title)) return;
    const entData = assembledData[card.title];
    if (!entData) return;
    // Enrich with character description if available
    const charName = actorCharMap[card.title];
    const charEntity = findCharEntity(charName);
    const charDesc = charEntity?.bio?.[0] || null;
    const enrichedData = charDesc
      ? { ...entData, bio: [charDesc, ...(entData.bio || [])] }
      : entData;
    addNode(card.title, enrichedData, "person");
  });

  // Add crew from discoveryGroups (validated)
  (crewGroup?.cards || []).forEach((card) => {
    if (EXCLUDE_ENTITIES.has(card.title)) return;
    const entData = assembledData[card.title];
    // Use entity data if available, otherwise build from card data
    const nodeData = entData || {
      subtitle: card.meta?.split("·")[0]?.trim() || card.type,
      bio: [card.meta || ""],
      photoUrl: card.photoUrl || null,
      type: "person",
    };
    const isCreator = /Creator|Composer|Writ|Direct|Produc/i.test(nodeData.subtitle || card.type || "");
    addNode(card.title, nodeData, isCreator ? "creator" : "person");
    creatorNodeIds.add(slugify(card.title));
  });

  // Add crew extras not in discoveryGroups (matches drawer's JD_KG_CREW_EXTRAS)
  const CREW_EXTRAS = [{ title: "Thomas Golubic", subtitle: "Music Supervisor" }];
  CREW_EXTRAS.forEach((extra) => {
    if (nodeMap.has(slugify(extra.title))) return;
    const entData = assembledData[extra.title];
    addNode(extra.title, entData || { subtitle: extra.subtitle, bio: [extra.subtitle], type: "person" }, "creator");
    creatorNodeIds.add(slugify(extra.title));
  });

  // Connect hub → spoke nodes
  nodeMap.forEach((nodeData, nodeId) => {
    if (nodeId === centerId || nodeId === castHubId || nodeId === creatorsHubId) return;
    if (nodeData.type !== "person" && nodeData.type !== "creator") return;
    let role = nodeData.entData?.subtitle || "collaborator";
    const hubId = creatorNodeIds.has(nodeId) ? creatorsHubId : castHubId;
    addEdge(hubId, nodeId, deriveRelType(role), role);
  });

  // Cross-link cast who mutually reference each other
  const hubIds = new Set([centerId, castHubId, creatorsHubId]);
  const collabSets = new Map();
  nodeMap.forEach((nodeData, nodeId) => {
    if (hubIds.has(nodeId)) return;
    const entData = nodeData.entData;
    if (!entData?.collaborators) return;
    collabSets.set(nodeId, new Set(
      entData.collaborators
        .filter((c) => !EXCLUDE_ENTITIES.has(c.name))
        .map((c) => slugify(c.name))
    ));
  });
  nodeMap.forEach((_, nodeId) => {
    if (hubIds.has(nodeId)) return;
    const myCollabs = collabSets.get(nodeId);
    if (!myCollabs) return;
    myCollabs.forEach((collabId) => {
      if (!nodeMap.has(collabId) || hubIds.has(collabId)) return;
      const theirCollabs = collabSets.get(collabId);
      if (!theirCollabs || !theirCollabs.has(nodeId)) return;
      addEdge(nodeId, collabId, "CO_STARRED", "co-starred");
    });
  });

  // ── 3. INFLUENCES — hub-and-spoke cluster ──
  // Use discoveryGroups influences (all 18 cards) as the primary source,
  // falling back to centerData.inspirations for backwards compatibility
  const INSP_TYPE_MAP = { FILM: "film", TV: "show", INFLUENCE: "concept" };
  const influenceGroup = groups.find((g) =>
    (g.cards || []).some((c) => c.type === "FILM" || c.type === "TV" || c.type === "INFLUENCE")
  );
  const influenceCards = influenceGroup?.cards || [];
  const inspirations = influenceCards.length > 0
    ? influenceCards
    : (centerData?.inspirations || []);

  // Create influences hub node
  const influenceHubId = slugify(`Influences on ${entityName}`);
  addNode(`Influences on ${entityName}`, {
    subtitle: `${inspirations.length} key influences`,
    bio: [`Films, shows, and works that shaped the DNA of ${entityName}.`],
    isHub: true,
  }, "concept");
  addEdge(centerId, influenceHubId, "INFLUENCED_BY", "influences");

  // Add influence spoke nodes connected to the hub
  // Sub-works (e.g. TZ episodes) connect to their parent instead of directly to hub
  const influenceTitles = new Set();
  inspirations.forEach((insp) => {
    if (!insp.title) return;
    influenceTitles.add(insp.title);
    const inspData = assembledData[insp.title];
    let visType;
    if (inspData && inspData.type !== "person") {
      visType = resolveVisType(insp.title, inspData);
    } else {
      visType = INSP_TYPE_MAP[insp.type] || "concept";
    }
    addNode(insp.title, inspData || {
      type: insp.type, subtitle: insp.meta,
      bio: [insp.context], posterUrl: insp.posterUrl,
    }, visType);

    // Check if this is a sub-work of another influence (e.g. "The Twilight Zone: ..." → "The Twilight Zone")
    const colonIdx = insp.title.indexOf(":");
    const parentName = colonIdx >= 0 ? insp.title.slice(0, colonIdx).trim() : null;
    if (parentName && influenceTitles.has(parentName) && nodeMap.has(slugify(parentName))) {
      addEdge(slugify(parentName), slugify(insp.title), "EPISODE_OF", "episode");
    } else {
      addEdge(influenceHubId, slugify(insp.title), "INFLUENCED_BY", "influenced by");
    }
  });

  // ── 4. MUSIC — hub-and-spoke cluster ──
  // Create a "Music" hub node, then attach artist nodes to it
  const songs = responseData?.songs || [];
  const artistSongs = new Map(); // artist → best song
  songs.forEach((song) => {
    if (!song.artist || !song.spotify_url) return;
    if (!artistSongs.has(song.artist)) {
      artistSongs.set(song.artist, song);
    }
  });

  const totalSongs = songs.length;
  const musicHubId = slugify(`Music from ${entityName}`);
  addNode(`Music from ${entityName}`, {
    subtitle: `${totalSongs} needle drops across 9 episodes`,
    bio: [`The soundtrack of ${entityName} — ${artistSongs.size} artists, ${totalSongs} needle drops.`],
    sonic: [],
    isHub: true,
  }, "music");
  addEdge(centerId, musicHubId, "FEATURES_MUSIC", "soundtrack");

  // Add all needle-drop music artist nodes (matching drawer's full music list)
  let musicCount = 0;
  const musicBudget = 40; // generous budget — songs data has ~34 unique artists
  const EXCLUDE_MUSIC = new Set(["TV Themes"]);
  artistSongs.forEach((song, artist) => {
    if (musicCount >= musicBudget) return;
    if (EXCLUDE_MUSIC.has(artist)) return;
    const id = slugify(artist);
    if (nodeMap.has(id)) return; // skip if already added as cast/crew
    const assembled = assembledData[artist];
    const entData = assembled || {
      subtitle: song.context || "Needle Drop",
      bio: [`"${song.title}" — featured in ${song.context || entityName}`],
      sonic: [{ title: song.title, meta: artist, spotify_url: song.spotify_url }],
    };
    addNode(artist, entData, "music");
    addEdge(musicHubId, id, "FEATURES_MUSIC", `${song.title}`);
    musicCount++;
  });

  // Cross-link music artists that appear in the same episode
  const episodeMusicMap = new Map(); // episode → [artist ids]
  songs.forEach((song) => {
    if (!song.artist || !song.context) return;
    const id = slugify(song.artist);
    if (!nodeMap.has(id)) return;
    const ep = song.context;
    if (!episodeMusicMap.has(ep)) episodeMusicMap.set(ep, []);
    episodeMusicMap.get(ep).push(id);
  });
  episodeMusicMap.forEach((artists) => {
    for (let i = 0; i < artists.length; i++) {
      for (let j = i + 1; j < artists.length; j++) {
        addEdge(artists[i], artists[j], "SAME_EPISODE", "same episode");
      }
    }
  });

  // ── 5. THEMES — hub-and-spoke cluster ──
  const themeVideos = responseData?.themeVideos || {};
  const THEME_COLORS = {
    "collective consciousness": "#2563eb", isolation: "#a78bfa",
    survival: "#0891b2", choice: "#7c3aed", morality: "#9f1239",
    romance: "#be185d", assimilation: "#2563eb", independence: "#8b5cf6",
    loss: "#dc2626", trauma: "#ea580c",
  };
  // Pick themes that have video or character content
  const richThemes = Object.entries(themeVideos)
    .filter(([, v]) => (v.videos?.length || 0) + (v.characters?.length || 0) > 0)
    .sort((a, b) => {
      const aScore = (a[1].videos?.length || 0) * 2 + (a[1].characters?.length || 0);
      const bScore = (b[1].videos?.length || 0) * 2 + (b[1].characters?.length || 0);
      return bScore - aScore;
    })
    .slice(0, 6);

  // Create themes hub node
  const themesHubId = slugify(`Themes of ${entityName}`);
  addNode(`Themes of ${entityName}`, {
    subtitle: `${richThemes.length} core themes`,
    bio: [`The conceptual DNA of ${entityName} — the ideas that drive the narrative.`],
    isHub: true,
  }, "theme");
  addEdge(centerId, themesHubId, "EXPLORES_THEME", "themes");

  richThemes.forEach(([themeKey, themeData]) => {
    const themeName = themeKey.charAt(0).toUpperCase() + themeKey.slice(1);
    const themeColor = THEME_COLORS[themeKey] || "#8b5cf6";
    const videoCount = themeData.videos?.length || 0;
    const charCount = themeData.characters?.length || 0;
    const desc = `${videoCount} analysis videos, ${charCount} character moments`;

    const assembled = assembledData[themeName];
    addNode(themeName, assembled || {
      subtitle: "Theme",
      bio: [desc],
      color: themeColor,
      quickViewGroups: videoCount ? [{
        label: "Videos",
        items: themeData.videos.slice(0, 3),
      }] : undefined,
    }, "theme");
    addEdge(themesHubId, slugify(themeName), "EXPLORES_THEME", "explores");
  });

  // Connect themes to cast members whose characters embody them
  const charToActor = {};
  Object.entries(actorCharMap).forEach(([actor, char]) => {
    charToActor[char] = actor;
  });

  richThemes.forEach(([themeKey, themeData]) => {
    const themeId = slugify(themeKey.charAt(0).toUpperCase() + themeKey.slice(1));
    (themeData.characters || []).forEach((c) => {
      const actorName = charToActor[c.character];
      if (actorName && nodeMap.has(slugify(actorName))) {
        addEdge(slugify(actorName), themeId, "EMBODIES_THEME", c.character);
      }
    });
  });

  // Connect related themes to each other
  const THEME_RELATIONS = {
    isolation: ["survival", "loss", "trauma"],
    survival: ["isolation", "choice", "independence"],
    choice: ["morality", "independence"],
    morality: ["choice", "romance"],
    "collective consciousness": ["assimilation", "isolation"],
    romance: ["loss", "morality"],
    loss: ["trauma", "isolation"],
    trauma: ["isolation", "loss"],
    assimilation: ["collective consciousness"],
    independence: ["survival", "choice"],
  };
  richThemes.forEach(([themeKey]) => {
    const themeId = slugify(themeKey.charAt(0).toUpperCase() + themeKey.slice(1));
    (THEME_RELATIONS[themeKey] || []).forEach((related) => {
      const relatedId = slugify(related.charAt(0).toUpperCase() + related.slice(1));
      if (nodeMap.has(relatedId)) {
        addEdge(themeId, relatedId, "RELATED_THEME", "related to");
      }
    });
  });

  // ── 5b. Cross-hub people connections (for drawer filtering) ──
  // Connect people to Themes hub if their character embodies a theme
  richThemes.forEach(([, themeData]) => {
    (themeData.characters || []).forEach((c) => {
      const actorName = charToActor[c.character];
      if (actorName && nodeMap.has(slugify(actorName))) {
        addEdge(slugify(actorName), themesHubId, "EXPLORES_THEME", "themes");
      }
    });
  });

  // People stay in their own hubs (Cast / Creators) — no cross-links to Influences.
  // The Influences cluster is purely content nodes (films, shows, episodes).

  // Connect Dave Porter / composers to Music hub
  nodeMap.forEach((nodeData, nodeId) => {
    if (!creatorNodeIds.has(nodeId)) return;
    const subtitle = (nodeData.entData?.subtitle || "").toLowerCase();
    if (subtitle.includes("composer") || subtitle.includes("music")) {
      addEdge(nodeId, musicHubId, "COMPOSED_FOR", "composer");
    }
  });

  // ── 6. Compute degree, size, featured ──
  const degreeMap = new Map();
  nodeMap.forEach((_, id) => degreeMap.set(id, 0));
  edges.forEach((e) => {
    degreeMap.set(e.source, (degreeMap.get(e.source) || 0) + 1);
    degreeMap.set(e.target, (degreeMap.get(e.target) || 0) + 1);
  });

  const maxDegree = Math.max(...degreeMap.values(), 1);

  // Sort: center > high-degree > rest
  const sortedEntries = [...nodeMap.entries()].sort((a, b) => {
    if (a[0] === centerId) return -1;
    if (b[0] === centerId) return 1;
    return (degreeMap.get(b[0]) || 0) - (degreeMap.get(a[0]) || 0);
  });

  const topEntries = sortedEntries.slice(0, MAX_NODES);
  const topIds = new Set(topEntries.map(([id]) => id));

  // Mark featured nodes — ensure at least 1 per type for cluster visibility
  const featuredIds = new Set([centerId]);

  // Pass 1: pick the highest-degree node from each entity type
  const typeLeaders = new Map(); // type → [id, degree]
  for (const [id, nodeData] of topEntries) {
    if (id === centerId) continue;
    const type = nodeData.type;
    const degree = degreeMap.get(id) || 0;
    if (!typeLeaders.has(type) || degree > typeLeaders.get(type)[1]) {
      typeLeaders.set(type, [id, degree]);
    }
  }
  typeLeaders.forEach(([id]) => featuredIds.add(id));

  // Pass 2: fill remaining budget with highest-degree nodes
  const featuredBudget = 12;
  for (const [id] of topEntries) {
    if (featuredIds.size >= featuredBudget) break;
    if (featuredIds.has(id)) continue;
    featuredIds.add(id);
  }

  // Minimum size floors by type — ensures cluster members have visible labels
  const TYPE_MIN_SIZE = { person: 10, creator: 10, theme: 10, music: 9, film: 9, concept: 9 };

  // Build final node objects
  const nodes = topEntries.map(([id, nodeData]) => {
    const isCenter = id === centerId;
    const degree = degreeMap.get(id) || 0;
    const rawSize = deriveNodeSize(degree, maxDegree, isCenter);
    const size = Math.max(rawSize, TYPE_MIN_SIZE[nodeData.type] || rawSize);
    const featured = featuredIds.has(id);
    const entData = nodeData.entData || {};
    const type = nodeData.type;
    const color = UNIVERSE_TYPES[type]?.color || "#607d8b";

    return {
      id,
      name: nodeData.name,
      type,
      size,
      featured,
      isHub: entData.isHub || false,
      subtitle: entData.subtitle || "",
      description: entData.bio?.[0] || "",
      hook: "",
      imageUrl: entData.photoUrl || entData.posterUrl || null,
      media: buildNodeMedia(entData, color),
    };
  });

  const finalEdges = edges.filter(
    (e) => topIds.has(e.source) && topIds.has(e.target)
  );

  return { nodes, edges: finalEdges, types: UNIVERSE_TYPES };
}

// ═══════════════════════════════════════════════════════
//  QUERY-DRIVEN GRAPH ADAPTER (KG Entity API)
// ═══════════════════════════════════════════════════════

// Map KG relationship_type strings to REL_COLORS keys
const KG_REL_MAP = {
  collaborated_with: "COLLABORATED",
  acted_in: "STARRED_IN",
  starred_in: "STARRED_IN",
  created: "CREATED_BY",
  created_by: "CREATED_BY",
  portrays: "STARRED_IN",
  directed: "DIRECTED",
  wrote: "WROTE_FOR",
  wrote_for: "WROTE_FOR",
  produced: "PRODUCED_BY",
  produced_by: "PRODUCED_BY",
  composed_for: "COMPOSED_FOR",
  features_music: "FEATURES_MUSIC",
  influenced_by: "INFLUENCED_BY",
  influenced: "INFLUENCED_BY",
  discusses: "COLLABORATED",
  related_to: "COLLABORATED",
  appears_in: "STARRED_IN",
  guest_starred_in: "STARRED_IN",
  co_starred: "CO_STARRED",
};

function findInAssembled(name, assembledData) {
  if (!name || !assembledData) return null;
  if (assembledData[name]) return assembledData[name];
  const key = Object.keys(assembledData).find(
    (k) => k.toLowerCase() === name.toLowerCase()
  );
  return key ? assembledData[key] : null;
}

// Search for an entity by name, returns the best match
async function searchEntity(query) {
  const encoded = encodeURIComponent(query);
  const res = await fetch(`${API_BASE}/entities?q=${encoded}`);
  if (!res.ok) throw new Error(`Search API error: ${res.status}`);
  const data = await res.json();
  const entities = data.entities || [];
  if (entities.length === 0) return null;
  return entities[0]; // highest match_score
}

export async function fetchQueryGraph(query, assembledData) {
  // 1. Search for the entity
  const match = await searchEntity(query);
  if (!match) return null;

  const entityName = match.name;

  // 2. Fetch relationships from KG API
  const relationships = await fetchEntityRelationships(entityName);

  // 3. Filter out low-confidence and noisy relationships
  const filtered = relationships.filter((rel) => {
    const relType = (rel.relationship_type || rel.type || "").toLowerCase();
    if (relType === "discusses") return false;
    if (rel.confidence !== undefined && rel.confidence < 0.9) return false;
    return true;
  });

  if (filtered.length === 0) return null;

  // 4. Build graph
  const centerId = slugify(entityName);
  const entityMap = new Map();
  entityMap.set(centerId, {
    id: centerId, name: entityName, type: mapEntityType(match.type || "person"),
    degree: 0, rawType: match.type || "person",
  });

  filtered.forEach((rel) => {
    const source = rel.source_entity || rel.source;
    const target = rel.target_entity || rel.target;
    const sourceType = rel.source_type || rel.source_entity_type || "";
    const targetType = rel.target_type || rel.target_entity_type || "";

    if (source && !EXCLUDE_ENTITIES.has(source)) {
      const sid = slugify(source);
      if (!entityMap.has(sid)) {
        entityMap.set(sid, { id: sid, name: source, type: mapEntityType(sourceType), degree: 0, rawType: sourceType });
      }
      entityMap.get(sid).degree++;
    }
    if (target && !EXCLUDE_ENTITIES.has(target)) {
      const tid = slugify(target);
      if (!entityMap.has(tid)) {
        entityMap.set(tid, { id: tid, name: target, type: mapEntityType(targetType), degree: 0, rawType: targetType });
      }
      entityMap.get(tid).degree++;
    }
  });

  // Count center degree
  filtered.forEach((rel) => {
    const source = rel.source_entity || rel.source;
    const target = rel.target_entity || rel.target;
    if (slugify(source) === centerId || slugify(target) === centerId) {
      entityMap.get(centerId).degree++;
    }
  });

  // 5. Take top N by degree
  const queryNodeLimit = 30;
  const sorted = [...entityMap.values()].sort((a, b) => b.degree - a.degree);
  const maxDegree = sorted[0]?.degree || 1;
  const topEntities = sorted.slice(0, queryNodeLimit);
  const topIds = new Set(topEntities.map((e) => e.id));

  // 6. Build nodes with assembledData enrichment
  const featuredIds = new Set([centerId]);
  topEntities.slice(0, 6).forEach((e) => featuredIds.add(e.id));

  const nodes = topEntities.map((ent) => {
    const isCenter = ent.id === centerId;
    const size = deriveNodeSize(ent.degree, maxDegree, isCenter);
    const featured = featuredIds.has(ent.id);
    const assembled = findInAssembled(ent.name, assembledData);
    const type = assembled ? resolveVisType(ent.name, assembled) : ent.type;
    const color = UNIVERSE_TYPES[type]?.color || "#607d8b";

    return {
      id: ent.id,
      name: ent.name,
      type,
      size,
      featured,
      subtitle: assembled?.subtitle || ent.rawType || "",
      description: assembled?.bio?.[0] || "",
      hook: "",
      imageUrl: assembled?.photoUrl || assembled?.posterUrl || null,
      media: buildNodeMedia(assembled, color),
    };
  });

  // 7. Build edges
  const edgeSet = new Set();
  const edges = [];

  filtered.forEach((rel) => {
    const source = rel.source_entity || rel.source;
    const target = rel.target_entity || rel.target;
    const sid = slugify(source);
    const tid = slugify(target);

    if (!topIds.has(sid) || !topIds.has(tid)) return;
    if (sid === tid) return;

    const rawRelType = (rel.relationship_type || rel.type || "related_to").toLowerCase().replace(/\s+/g, "_");
    const rel_mapped = KG_REL_MAP[rawRelType] || "COLLABORATED";
    const edgeKey = `${sid}-${tid}-${rel_mapped}`;
    const reverseKey = `${tid}-${sid}-${rel_mapped}`;
    if (edgeSet.has(edgeKey) || edgeSet.has(reverseKey)) return;
    edgeSet.add(edgeKey);

    edges.push({
      source: sid,
      target: tid,
      rel: rel_mapped,
      label: rel.relationship_type || rel.type || "related to",
    });
  });

  return { nodes, edges, types: UNIVERSE_TYPES, centerId, entityName };
}

// ═══════════════════════════════════════════════════════
//  THEMES NETWORK ADAPTER
// ═══════════════════════════════════════════════════════

export async function fetchThemesGraph(entityName, themesDB, themeVideos) {
  const centerId = slugify(entityName);
  const nodes = [];
  const edges = [];

  // Center node (the show)
  nodes.push({
    id: centerId,
    name: entityName,
    type: "show",
    size: 28,
    featured: true,
    subtitle: "Anchor Entity",
    description: "",
    hook: "",
  });

  // Theme nodes from THEMES_DB
  if (themesDB) {
    Object.values(themesDB).forEach((theme) => {
      const themeId = slugify(theme.id || theme.title);
      const size = 10 + Math.round((theme.prominence || 50) / 10);

      nodes.push({
        id: themeId,
        name: theme.title,
        type: "theme",
        size,
        featured: theme.prominence >= 80,
        subtitle: theme.shortDesc || "",
        description: theme.fullDesc || "",
        hook: theme.hookLine || "",
        color: theme.color,
      });

      edges.push({
        source: centerId,
        target: themeId,
        rel: "EXPLORES_THEME",
        label: "explores",
      });

      // Related theme connections
      if (theme.relatedThemes) {
        theme.relatedThemes.forEach((rt) => {
          const rtId = slugify(rt);
          if (themesDB[rt] && rtId !== themeId) {
            const ek = `${themeId}-${rtId}-RELATED`;
            edges.push({
              source: themeId,
              target: rtId,
              rel: "RELATED_THEME",
              label: "related to",
            });
          }
        });
      }
    });
  }

  // Add characters from CHARACTER_THEME_MAP-style data in themeVideos
  const addedCharacters = new Set();
  if (themeVideos) {
    Object.entries(themeVideos).forEach(([themeKey, data]) => {
      if (!data.characters) return;
      data.characters.forEach((c) => {
        const charId = slugify(c.character);
        if (!addedCharacters.has(charId)) {
          addedCharacters.add(charId);
          nodes.push({
            id: charId,
            name: c.character,
            type: "character",
            size: 8,
            featured: false,
            subtitle: "Character",
            description: c.text?.slice(0, 200) || "",
          });
        }
        // Link character to theme (find matching design theme)
        const designThemeId = findDesignThemeId(themeKey, themesDB);
        if (designThemeId) {
          edges.push({
            source: charId,
            target: designThemeId,
            rel: "CHARACTER_THEME",
            label: "embodies",
          });
        }
      });
    });
  }

  // Deduplicate edges
  const edgeSet = new Set();
  const dedupedEdges = edges.filter((e) => {
    const key = `${e.source}-${e.target}-${e.rel}`;
    const rev = `${e.target}-${e.source}-${e.rel}`;
    if (edgeSet.has(key) || edgeSet.has(rev)) return false;
    edgeSet.add(key);
    return true;
  });

  return { nodes, edges: dedupedEdges, types: THEMES_TYPES };
}

// Map KG theme keys to design theme IDs
const KG_THEME_MAP = {
  "collective consciousness": "collective",
  isolation: "isolation",
  morality: "morality",
  trauma: "trauma",
  loss: "grief",
  sacrifice: "grief",
  mortality: "grief",
  survival: "immunity",
  choice: "morality",
  assimilation: "collective",
  acceptance: "collective",
  independence: "resistance",
  surrender: "resistance",
  romance: "relationships",
  passivity: "isolation",
};

function findDesignThemeId(kgKey, themesDB) {
  if (!themesDB) return null;
  const mapped = KG_THEME_MAP[kgKey.toLowerCase()];
  if (mapped && themesDB[mapped]) return slugify(mapped);
  // Direct match
  if (themesDB[kgKey]) return slugify(kgKey);
  return null;
}

// ═══════════════════════════════════════════════════════
//  STATIC PROTOTYPE DATA (for testing without API)
// ═══════════════════════════════════════════════════════

export const MOCK_NODES = [
  { id: "pluribus", name: "Pluribus", type: "show", size: 28, featured: true,
    subtitle: "Apple TV+ · 2025", hook: "What if losing yourself felt like relief?",
    description: "Vince Gilligan's return to television — a sci-fi thriller about a mysterious signal that offers humanity a terrifying choice: connection at the cost of individuality.",
    media: { videos: [{ title: "Official Teaser Trailer", desc: "Apple TV+ · 2:14", videoId: "" }], audio: [{ title: "The Signal", artist: "Pluribus Original Score", duration: "3:47", color: "#f97316" }] },
  },
  { id: "gilligan", name: "Vince Gilligan", type: "creator", size: 22, featured: true,
    subtitle: "Creator / Showrunner", hook: "The architect of television's greatest moral descents.",
    description: "Gilligan built the template for prestige TV's moral complexity with Breaking Bad, then deepened it with Better Call Saul. Pluribus represents his first original series since Breaking Bad.",
    media: { videos: [], audio: [] },
  },
  { id: "seehorn", name: "Rhea Seehorn", type: "creator", size: 20, featured: true,
    subtitle: "Lead Actress", hook: "The performance that made Kim Wexler the soul of Better Call Saul.",
    description: "Seehorn's portrayal of Kim Wexler earned her universal acclaim. In Pluribus, she takes center stage as the lead.",
    media: { videos: [], audio: [] },
  },
  { id: "gould", name: "Peter Gould", type: "creator", size: 16, featured: true,
    subtitle: "Executive Producer", hook: "Co-architect of the Breaking Bad universe.",
    description: "Gould co-created Better Call Saul with Gilligan and served as showrunner for the series' later seasons.",
  },
  { id: "breaking-bad", name: "Breaking Bad", type: "show", size: 16,
    subtitle: "AMC · 2008–2013",
    description: "Gilligan's landmark series about a chemistry teacher turned drug lord.",
    media: { videos: [], audio: [{ title: "Baby Blue", artist: "Badfinger · Series Finale", duration: "3:40", color: "#f97316" }] },
  },
  { id: "bcs", name: "Better Call Saul", type: "show", size: 15,
    subtitle: "AMC · 2015–2022",
    description: "The prequel that deepened the Breaking Bad universe.",
    media: { videos: [], audio: [] },
  },
  { id: "el-camino", name: "El Camino", type: "film", size: 8, subtitle: "Netflix · 2019",
    description: "Gilligan's Breaking Bad epilogue film following Jesse Pinkman's escape." },
  { id: "x-files", name: "The X-Files", type: "show", size: 10, subtitle: "FOX · 1993–2002",
    description: "Where Gilligan cut his teeth as a writer and producer." },
  { id: "severance", name: "Severance", type: "show", size: 9, subtitle: "Apple TV+ · 2022–",
    description: "Apple TV+'s acclaimed sci-fi thriller about identity and corporate control." },
  { id: "silo", name: "Silo", type: "show", size: 8, subtitle: "Apple TV+ · 2023–",
    description: "Apple TV+'s post-apocalyptic sci-fi series." },
  { id: "dark-matter", name: "Dark Matter", type: "show", size: 7, subtitle: "Apple TV+ · 2024–",
    description: "Apple's multiverse thriller exploring identity across parallel lives." },
  { id: "cranston", name: "Bryan Cranston", type: "person", size: 12, subtitle: "Actor",
    description: "Walter White. Cranston's transformation across Breaking Bad remains the benchmark." },
  { id: "paul", name: "Aaron Paul", type: "person", size: 11, subtitle: "Actor",
    description: "Jesse Pinkman's moral arc across Breaking Bad and El Camino." },
  { id: "odenkirk", name: "Bob Odenkirk", type: "person", size: 12, subtitle: "Actor",
    description: "Jimmy McGill / Saul Goodman. Odenkirk's dramatic turn in Better Call Saul." },
  { id: "banks", name: "Jonathan Banks", type: "person", size: 10, subtitle: "Actor",
    description: "Mike Ehrmantraut — the moral center of both Breaking Bad and Better Call Saul." },
  { id: "norris", name: "Dean Norris", type: "person", size: 8, subtitle: "Actor",
    description: "Hank Schrader in Breaking Bad." },
  { id: "gunn", name: "Anna Gunn", type: "person", size: 8, subtitle: "Actress",
    description: "Skyler White in Breaking Bad." },
  { id: "mckean", name: "Michael McKean", type: "person", size: 8, subtitle: "Actor",
    description: "Chuck McGill in Better Call Saul." },
  { id: "fabian", name: "Patrick Fabian", type: "person", size: 7, subtitle: "Actor",
    description: "Howard Hamlin in Better Call Saul." },
  { id: "esposito", name: "Giancarlo Esposito", type: "person", size: 10, subtitle: "Actor",
    description: "Gus Fring — across Breaking Bad and Better Call Saul." },
  { id: "apple-tv", name: "Apple TV+", type: "network", size: 12, subtitle: "Streaming Platform",
    description: "Apple's streaming service has built a reputation for ambitious programming." },
  { id: "sony", name: "Sony Pictures Television", type: "network", size: 10, subtitle: "Production Studio",
    description: "Produced both Breaking Bad and Better Call Saul." },
  { id: "amc", name: "AMC", type: "network", size: 9, subtitle: "Cable Network",
    description: "Home of Breaking Bad and Better Call Saul." },
  { id: "body-snatchers", name: "Invasion of the Body Snatchers", type: "concept", size: 8,
    subtitle: "1956 / 1978 Films", description: "The foundational text for Pluribus' central question." },
  { id: "twilight-zone", name: "The Twilight Zone", type: "concept", size: 9,
    subtitle: "CBS · 1959–1964", description: "Rod Serling's anthology series — the DNA of everything Gilligan does." },
  { id: "solaris", name: "Solaris", type: "concept", size: 7, subtitle: "Tarkovsky · 1972",
    description: "An alien intelligence that mirrors human consciousness back at itself." },
  { id: "annihilation", name: "Annihilation", type: "concept", size: 7, subtitle: "Garland · 2018",
    description: "Transformation as beauty, not body horror." },
  { id: "leftovers", name: "The Leftovers", type: "concept", size: 8, subtitle: "HBO · 2014–2017",
    description: "Lindelof's masterpiece about living with the unexplained." },
  { id: "emmy", name: "Primetime Emmy Awards", type: "award", size: 8, subtitle: "Television Academy",
    description: "Breaking Bad won 16 Emmys including 4 for Outstanding Drama." },
  { id: "peabody", name: "Peabody Award", type: "award", size: 6, subtitle: "Peabody Board",
    description: "Both Breaking Bad and Better Call Saul received Peabody Awards." },
];

export const MOCK_EDGES = [
  { source: "pluribus", target: "gilligan", rel: "CREATED_BY", label: "created by" },
  { source: "pluribus", target: "seehorn", rel: "STARS", label: "stars" },
  { source: "pluribus", target: "gould", rel: "PRODUCED_BY", label: "exec produced by" },
  { source: "pluribus", target: "apple-tv", rel: "AIRS_ON", label: "airs on" },
  { source: "pluribus", target: "sony", rel: "PRODUCED_BY", label: "produced by" },
  { source: "gilligan", target: "breaking-bad", rel: "CREATED", label: "created" },
  { source: "gilligan", target: "bcs", rel: "CO_CREATED", label: "co-created" },
  { source: "gilligan", target: "el-camino", rel: "CREATED", label: "wrote & directed" },
  { source: "gilligan", target: "x-files", rel: "WROTE_FOR", label: "wrote for" },
  { source: "seehorn", target: "bcs", rel: "STARRED_IN", label: "starred in" },
  { source: "gould", target: "bcs", rel: "CO_CREATED", label: "co-created" },
  { source: "gould", target: "breaking-bad", rel: "WROTE_FOR", label: "wrote for" },
  { source: "gilligan", target: "cranston", rel: "COLLABORATED", label: "directed" },
  { source: "gilligan", target: "paul", rel: "COLLABORATED", label: "directed" },
  { source: "gilligan", target: "odenkirk", rel: "COLLABORATED", label: "cast" },
  { source: "gilligan", target: "seehorn", rel: "COLLABORATED", label: "cast" },
  { source: "gilligan", target: "gould", rel: "COLLABORATED", label: "creative partner" },
  { source: "cranston", target: "breaking-bad", rel: "STARRED_IN", label: "starred in" },
  { source: "paul", target: "breaking-bad", rel: "STARRED_IN", label: "starred in" },
  { source: "norris", target: "breaking-bad", rel: "STARRED_IN", label: "starred in" },
  { source: "gunn", target: "breaking-bad", rel: "STARRED_IN", label: "starred in" },
  { source: "esposito", target: "breaking-bad", rel: "STARRED_IN", label: "starred in" },
  { source: "banks", target: "breaking-bad", rel: "STARRED_IN", label: "starred in" },
  { source: "odenkirk", target: "bcs", rel: "STARRED_IN", label: "starred in" },
  { source: "banks", target: "bcs", rel: "STARRED_IN", label: "starred in" },
  { source: "mckean", target: "bcs", rel: "STARRED_IN", label: "starred in" },
  { source: "fabian", target: "bcs", rel: "STARRED_IN", label: "starred in" },
  { source: "esposito", target: "bcs", rel: "STARRED_IN", label: "starred in" },
  { source: "paul", target: "el-camino", rel: "STARRED_IN", label: "starred in" },
  { source: "breaking-bad", target: "amc", rel: "AIRED_ON", label: "aired on" },
  { source: "bcs", target: "amc", rel: "AIRED_ON", label: "aired on" },
  { source: "breaking-bad", target: "sony", rel: "PRODUCED_BY", label: "produced by" },
  { source: "bcs", target: "sony", rel: "PRODUCED_BY", label: "produced by" },
  { source: "severance", target: "apple-tv", rel: "AIRS_ON", label: "airs on" },
  { source: "silo", target: "apple-tv", rel: "AIRS_ON", label: "airs on" },
  { source: "dark-matter", target: "apple-tv", rel: "AIRS_ON", label: "airs on" },
  { source: "pluribus", target: "body-snatchers", rel: "INFLUENCED_BY", label: "influenced by" },
  { source: "pluribus", target: "twilight-zone", rel: "INFLUENCED_BY", label: "influenced by" },
  { source: "pluribus", target: "solaris", rel: "INFLUENCED_BY", label: "influenced by" },
  { source: "pluribus", target: "annihilation", rel: "INFLUENCED_BY", label: "influenced by" },
  { source: "pluribus", target: "leftovers", rel: "INFLUENCED_BY", label: "influenced by" },
  { source: "gilligan", target: "twilight-zone", rel: "INFLUENCED_BY", label: "inspired by" },
  { source: "breaking-bad", target: "emmy", rel: "WON", label: "16 wins" },
  { source: "bcs", target: "emmy", rel: "NOMINATED", label: "53 nominations" },
  { source: "breaking-bad", target: "peabody", rel: "WON", label: "won" },
  { source: "bcs", target: "peabody", rel: "WON", label: "won" },
  { source: "cranston", target: "paul", rel: "CO_STARRED", label: "co-starred" },
  { source: "odenkirk", target: "seehorn", rel: "CO_STARRED", label: "co-starred" },
  { source: "odenkirk", target: "banks", rel: "CO_STARRED", label: "co-starred" },
];
