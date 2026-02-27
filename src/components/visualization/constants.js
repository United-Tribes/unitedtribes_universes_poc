// ═══════════════════════════════════════════════════════
//  VISUALIZATION CONSTANTS — UnitedTribes Knowledge Graph
// ═══════════════════════════════════════════════════════

// Entity type registries
export const UNIVERSE_TYPES = {
  show:      { label: "Show",           color: "#f97316", sort: 0 },
  person:    { label: "Person",         color: "#3b82f6", sort: 1 },
  creator:   { label: "Creator",        color: "#ec4899", sort: 2 },
  network:   { label: "Network/Studio", color: "#22c55e", sort: 3 },
  film:      { label: "Film",           color: "#ef4444", sort: 4 },
  concept:   { label: "Influence",      color: "#a855f7", sort: 5 },
  award:     { label: "Award",          color: "#eab308", sort: 6 },
  music:     { label: "Music",          color: "#14b8a6", sort: 7 },
  theme:     { label: "Theme",          color: "#8b5cf6", sort: 8 },
};

export const THEMES_TYPES = {
  show:      { label: "Show",           color: "#f97316", sort: 0 },
  theme:     { label: "Theme",          color: "#2563eb", sort: 1 },
  character: { label: "Character",      color: "#ec4899", sort: 2 },
  concept:   { label: "Influence",      color: "#a855f7", sort: 3 },
  person:    { label: "Person",         color: "#3b82f6", sort: 4 },
};

// Relationship type colors
export const REL_COLORS = {
  CREATED_BY:    "#ec4899",
  CREATED:       "#ec4899",
  CO_CREATED:    "#ec4899",
  STARS:         "#ec4899",
  PRODUCED_BY:   "#22c55e",
  AIRS_ON:       "#22c55e",
  AIRED_ON:      "#22c55e",
  STARRED_IN:    "#3b82f6",
  WROTE_FOR:     "#f97316",
  COLLABORATED:  "#8b5cf6",
  CO_STARRED:    "#6366f1",
  INFLUENCED_BY: "#a855f7",
  WON:           "#eab308",
  NOMINATED:     "#eab308",
  FEATURES_MUSIC: "#14b8a6",
  SAME_EPISODE:  "#14b8a6",
  EXPLORES_THEME: "#8b5cf6",
  EMBODIES_THEME: "#8b5cf6",
  RELATED_THEME: "#a855f7",
  COMPOSED_FOR:  "#14b8a6",
  DIRECTED:      "#ec4899",
};

export const THEME_REL_COLORS = {
  EXPLORES_THEME:   "#2563eb",
  CHARACTER_THEME:  "#ec4899",
  INFLUENCED_BY:    "#a855f7",
  RELATED_THEME:    "#8b5cf6",
  DISCUSSES_THEME:  "#22c55e",
  STARS:            "#ec4899",
  CREATED_BY:       "#ec4899",
};

// KG entity type → visualization type mapping
export const TYPE_MAP = {
  tv_show: "show",
  film: "film",
  person: "person",
  music_artist: "person",
  character: "character",
  theme: "theme",
  song: "music",
  album: "music",
  influence: "concept",
  concept: "concept",
  award: "award",
  network: "network",
  studio: "network",
  show: "show",
  creator: "creator",
  music: "music",
};

// Force simulation parameters
export const FORCE_CONFIG = {
  linkDistance: {
    featuredToFeatured: 140,
    influenced: 200,
    default: 110,
  },
  linkStrength: 0.35,
  charge: {
    center: -2200,
    featured: -900,
    large: -500,
    default: -300,
  },
  collision: {
    padding: 8,
    compressedPadding: 4,
  },
  center: {
    xStrength: 0.03,
    yStrength: 0.03,
    compressedStrength: 0.06,
  },
  alphaDecay: 0.025,
  velocityDecay: 0.55,
  panelOpenAlpha: 0.3,
  panelCloseAlpha: 0.25,
  resizeAlpha: 0.2,
};

// Node sizing
export const NODE_SIZE = {
  centerRadius: 26,
  featuredScale: 0.75,
  featuredMin: 14,
  defaultScale: 0.55,
  defaultMin: 4,
  auraScale: 2.2,
};

// Entrance animation delays (ms)
export const ENTRANCE_DELAYS = {
  center: 200,
  featured: 600,
  large: 1000,
  medium: 1300,
  small: 1600,
  edges: 2000,
};

// Default theme (Justin's neutral palette)
export const DEFAULT_THEME = {
  bg: "#f9fafb",
  dotGrid: "#d1d5db",
  panelBg: "rgba(255,255,255,0.98)",
  panelBorder: "#e5e7eb",
  panelShadow: "-4px 0 32px rgba(0,0,0,0.06)",
  tooltipBg: "rgba(255,255,255,0.96)",
  text: "#1a2744",
  textMuted: "#6b7280",
  textDim: "#9ca3af",
  labelColor: "#1a2744",
};

// API base URL
export const API_BASE = "https://166ws8jk15.execute-api.us-east-1.amazonaws.com/prod";

// Max nodes for readability
export const MAX_NODES = 45;
