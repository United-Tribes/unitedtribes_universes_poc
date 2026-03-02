import { useState, useEffect, useRef, useMemo } from "react";
import { createPortal } from "react-dom";
import TestPage from "./components/content/TestPage";
import { ResponseHeader, NarrativeSection } from "./components/content";
import { UniverseNetwork, ThemesNetwork, NetworkGraph, fetchQueryGraph } from "./components/visualization";
import { MOCK_NODES, MOCK_EDGES } from "./components/visualization/adapters";
import { UNIVERSE_TYPES, REL_COLORS } from "./components/visualization/constants";

const SCREENS = {
  HOME: "home",
  UNIVERSE_HOME: "universe_home",
  THINKING: "thinking",
  RESPONSE: "response",
  CONSTELLATION: "constellation",
  ENTITY_DETAIL: "entity_detail",
  LIBRARY: "library",
  THEMES: "themes",
  SONIC: "sonic",
  CAST_CREW: "cast_crew",
  EPISODES: "episodes",
  EPISODE_DETAIL: "episode_detail",
};

// --- Build Version ---
const BUILD_VERSION = "v1.3.0-dev";
const BUILD_COMMIT = "88ca402";
const BUILD_DATE = "Mar 2, 2026";
const BUILD_COMMIT_URL = "https://github.com/United-Tribes/unitedtribes_universes_poc/tree/jd/design-reskin";
const DEV_URL = "http://localhost:5173/jd-universes-poc/";

// --- API Configuration ---
const API_BASE = "https://166ws8jk15.execute-api.us-east-1.amazonaws.com/prod";

const MODELS = [
  { id: "gpt", name: "ChatGPT", provider: "OpenAI", endpoint: "/v2/broker-gpt", dot: "#10a37f" },
  { id: "claude", name: "Claude", provider: "Anthropic", endpoint: "/v2/broker", dot: "#2563eb" },
  { id: "nova", name: "Amazon Nova", provider: "Amazon Bedrock", endpoint: "/v2/broker-nova", dot: "#ff9900" },
  { id: "llama", name: "Llama 3.3", provider: "Meta", endpoint: "/v2/broker-llama", dot: "#7950f2" },
  { id: "mistral", name: "Mistral Large", provider: "Mistral AI", endpoint: "/v2/broker-mistral", dot: "#16803c" },
];

const DEFAULT_MODEL = MODELS[0]; // ChatGPT as default

// Compare-only models (no broker endpoint yet — raw API integration TBD)
const COMPARE_EXTRA_MODELS = [
  { id: "perplexity", name: "Perplexity", provider: "Perplexity AI", endpoint: null, dot: "#20B8CD" },
  { id: "gemini", name: "Gemini", provider: "Google", endpoint: null, dot: "#E44332" },
];
const COMPARE_MODELS = [...MODELS, ...COMPARE_EXTRA_MODELS];

// --- Universe Context (scopes API queries to the active universe) ---
const UNIVERSE_CONTEXT = {
  pluribus: {
    name: "Pluribus",
    description: "Vince Gilligan's Apple TV+ sci-fi series (2025) about an alien virus that creates a hive mind, starring Rhea Seehorn as Carol Sturka",
    scope: "the TV series Pluribus, its cast, crew, themes, influences, music, and connected works",
    keywords: ["pluribus", "gilligan", "vince", "rhea", "seehorn", "carol", "sturka", "hive mind", "joining", "apple tv", "breaking bad", "better call saul", "el camino", "x-files", "dave porter", "zosia", "helen", "umstead", "manousos", "immune", "sci-fi", "alien", "virus", "albuquerque"],
    suggestedQueries: [
      "Who created Pluribus and what inspired it?",
      "Tell me about Rhea Seehorn's role",
      "What music is featured in the show?",
      "Trace the line from Breaking Bad to Pluribus",
    ],
  },
  bluenote: {
    name: "Blue Note Records",
    description: "The iconic jazz label and its artists, albums, and cultural legacy",
    scope: "Blue Note Records artists, albums, jazz history, and cultural connections",
    keywords: ["blue note", "jazz", "coltrane", "miles davis", "art blakey", "monk", "hard bop", "rudy van gelder"],
    suggestedQueries: [],
  },
  pattismith: {
    name: "Patty Smith: Just Kids",
    description: "Patty Smith's memoir and creative world — punk, poetry, and the New York art scene",
    scope: "Patty Smith, her creative network, punk, poetry, and the New York art scene",
    keywords: ["patti smith", "just kids", "mapplethorpe", "punk", "chelsea hotel", "cbgb"],
    suggestedQueries: [],
  },
  gerwig: {
    name: "Greta Gerwig",
    description: "Greta Gerwig's films, influences, and creative universe",
    scope: "Greta Gerwig's filmography, influences, collaborators, and creative connections",
    keywords: ["gerwig", "greta", "lady bird", "barbie", "little women", "frances ha", "baumbach"],
    suggestedQueries: [],
  },
  sinners: {
    name: "Sinners",
    description: "Ryan Coogler's 2025 film exploring music, identity, and the supernatural in the Mississippi Delta",
    scope: "Sinners, Ryan Coogler's filmography, blues music history, and cultural connections",
    keywords: ["sinners", "coogler", "ryan coogler", "blues", "mississippi", "delta", "juke joint", "vampire"],
    suggestedQueries: [
      "What is Sinners about?",
      "How does Ryan Coogler use music in his films?",
      "Connect Coogler to the history of blues music",
      "What themes run through Coogler's filmography?",
    ],
  },
};

// Check if a query is likely relevant to the active universe
function isQueryRelevantToUniverse(queryText, universeId) {
  const q = queryText.toLowerCase();
  const universe = UNIVERSE_CONTEXT[universeId];
  if (!universe) return true;
  if (universe.keywords.some(kw => q.includes(kw))) return true;
  const otherUniverses = Object.entries(UNIVERSE_CONTEXT).filter(([id]) => id !== universeId);
  const mentionsOther = otherUniverses.some(([, u]) =>
    u.keywords.some(kw => q.includes(kw))
  );
  if (mentionsOther) return false;
  const genericPatterns = /^(who|what|why|how|when|where|tell me|describe|explain|show me|which|compare|list|is there|are there|does|did|was|were|can you|could you)/i;
  if (genericPatterns.test(q.trim())) return true;
  if (q.trim().split(/\s+/).length <= 4) return true;
  return false;
}

// Build an off-topic redirect response object that mimics broker API shape
function buildUniverseRedirectResponse(universeId) {
  const universe = UNIVERSE_CONTEXT[universeId];
  const suggestions = universe.suggestedQueries.length > 0
    ? "\n\nHere are some things you can ask:\n" + universe.suggestedQueries.map(q => `- ${q}`).join("\n")
    : "";
  return {
    narrative: `You're currently exploring the **${universe.name}** universe. This question doesn't seem to be about ${universe.scope}.\n\nTry asking something about ${universe.name} — its story, characters, creators, influences, or music.${suggestions}`,
    connections: {},
    recommendations: {},
    insights: { entities_explored: [], total_relationships_analyzed: 0 },
    metadata: { redirect: true },
  };
}

// --- Palette matched to screenshot ---
const T = {
  bg: "#ffffff",
  bgCard: "#ffffff",
  bgElevated: "#f5f0e8",
  bgHover: "#ebe4d8",
  border: "#d8cfc2",
  borderLight: "#d8cfc2",
  text: "#1a2744",
  textMuted: "#3d3028",
  textDim: "#5a4a3a",
  blue: "#2563eb",
  blueDark: "#1d4ed8",
  blueLight: "rgba(37,99,235,0.12)",
  blueBorder: "rgba(37,99,235,0.2)",
  gold: "#f5b800",
  goldBg: "rgba(245,184,0,0.14)",
  goldBorder: "rgba(245,184,0,0.3)",
  green: "#16803c",
  greenBg: "rgba(22,128,60,0.12)",
  greenBorder: "rgba(22,128,60,0.22)",
  queryBg: "#1a2744",
  shadow: "0 1px 3px rgba(0,0,0,0.04), 0 4px 14px rgba(0,0,0,0.03)",
  shadowHover: "0 2px 8px rgba(0,0,0,0.06), 0 10px 28px rgba(0,0,0,0.05)",
};

// --- Theme colors for cross-screen consistency (matches THEMES_DB) ---
const THEME_COLORS = {
  collective: "#2563eb",
  psychology: "#6366f1",
  immunity: "#0891b2",
  grief: "#dc2626",
  trauma: "#ea580c",
  relationships: "#be185d",
  morality: "#9f1239",
  identity: "#7c3aed",
  resistance: "#8b5cf6",
  isolation: "#a78bfa",
};

const THEME_LABELS = {
  collective: "Collective Consciousness",
  psychology: "Psychology",
  immunity: "Immunity",
  grief: "Grief & Loss",
  trauma: "Trauma",
  relationships: "Fractured Relationships",
  morality: "Morality",
  identity: "Identity",
  resistance: "Resistance",
  isolation: "Isolation",
};

// --- Arc markers for episode groupings (editorial/curatorial) ---
const EPISODE_ARCS = [
  { label: "First Contact", range: [1, 3], description: "Carol's world ends. A new one begins." },
  { label: "The Fracture", range: [4, 6], description: "Alliances form. Trust breaks. The rules change." },
  { label: "The Choice", range: [7, 9], description: "Everyone picks a side. Carol picks something else." },
];

// --- Shared ThemePill component ---
function ThemePill({ themeId, onClick, size = "sm" }) {
  const color = THEME_COLORS[themeId] || T.textDim;
  const label = THEME_LABELS[themeId] || themeId;
  const fontSize = size === "sm" ? 10 : 11.5;
  const pad = size === "sm" ? "2px 8px" : "3px 10px";
  return (
    <span
      onClick={onClick}
      style={{
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        fontSize,
        fontWeight: 600,
        color,
        background: `${color}14`,
        border: `1px solid ${color}30`,
        padding: pad,
        borderRadius: 5,
        cursor: onClick ? "pointer" : "default",
        whiteSpace: "nowrap",
        transition: "all 0.15s",
      }}
    >
      {label}
    </span>
  );
}

// --- UNITED TRIBES Logo matching colleague's site ---
function Logo({ size = "md" }) {
  const fontSize = size === "lg" ? 22 : 15;
  const weight = size === "lg" ? 900 : 900;
  const spacing = size === "lg" ? "1.5px" : "1.5px";
  return (
    <div style={{ display: "flex", alignItems: "center", cursor: "pointer", userSelect: "none" }}>
      <span
        style={{
          fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
          fontSize,
          fontWeight: weight,
          color: "#1a2744",
          letterSpacing: spacing,
          textTransform: "uppercase",
        }}
      >
        UNITED
      </span>
      <span
        style={{
          fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
          fontSize,
          fontWeight: weight,
          color: "#f5b800",
          letterSpacing: spacing,
          textTransform: "uppercase",
        }}
      >
        TRIBES
      </span>
    </div>
  );
}

function SideNavIcon({ name }) {
  const svgs = {
    explore: <svg viewBox="0 0 24 24" width="20" height="20" fill="none" strokeWidth="2.2" stroke="currentColor"><circle cx="11" cy="11" r="7"/><line x1="16.5" y1="16.5" x2="21" y2="21"/></svg>,
    universe: <svg viewBox="0 0 24 24" width="20" height="20" fill="none" strokeWidth="2.2" stroke="currentColor"><circle cx="12" cy="12" r="3"/><circle cx="5" cy="6" r="2"/><circle cx="19" cy="6" r="2"/><circle cx="5" cy="18" r="2"/><circle cx="19" cy="18" r="2"/><line x1="9.5" y1="10.5" x2="6.5" y2="7.5"/><line x1="14.5" y1="10.5" x2="17.5" y2="7.5"/><line x1="9.5" y1="13.5" x2="6.5" y2="16.5"/><line x1="14.5" y1="13.5" x2="17.5" y2="16.5"/></svg>,
    cast: <svg viewBox="0 0 24 24" width="20" height="20" fill="none" strokeWidth="2.2" stroke="currentColor"><circle cx="9" cy="7" r="3.5"/><circle cx="17" cy="9" r="2.5"/><path d="M2 21v-2a5 5 0 0 1 5-5h4a5 5 0 0 1 5 5v2"/><path d="M17 14a4 4 0 0 1 4 4v3"/></svg>,
    sonic: <svg viewBox="0 0 24 24" width="20" height="20" fill="none" strokeWidth="2.2" stroke="currentColor"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>,
    episodes: <svg viewBox="0 0 24 24" width="20" height="20" fill="none" strokeWidth="2.2" stroke="currentColor"><rect x="2" y="4" width="20" height="14" rx="2"/><line x1="2" y1="22" x2="22" y2="22"/><line x1="10" y1="18" x2="10" y2="22"/><line x1="14" y1="18" x2="14" y2="22"/></svg>,
    themes: <svg viewBox="0 0 24 24" width="20" height="20" fill="none" strokeWidth="2.2" stroke="currentColor"><circle cx="12" cy="12" r="9"/><path d="M12 3a4.5 4.5 0 0 0 0 9a4.5 4.5 0 0 1 0 9"/><circle cx="12" cy="7.5" r=".5" fill="currentColor"/><circle cx="12" cy="16.5" r=".5" fill="currentColor"/></svg>,
    library: <svg viewBox="0 0 24 24" width="20" height="20" fill="none" strokeWidth="2.2" stroke="currentColor"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>,
  };
  return <div style={{ width: 24, height: 24, display: "flex", alignItems: "center", justifyContent: "center" }}>{svgs[name]}</div>;
}

function SideNav({ active, onNavigate, libraryCount = 0, hasActiveResponse = false }) {
  const [hovered, setHovered] = useState(null);
  const items = [
    { id: "explore", label: "Explore", screen: hasActiveResponse ? SCREENS.RESPONSE : SCREENS.HOME },
    { id: "universe", label: "Universe\n& Map", screen: SCREENS.CONSTELLATION },
    { id: "cast", label: "Cast &\nCreators", screen: SCREENS.CAST_CREW },
    { id: "sonic", label: "Music\n& Sonic", screen: SCREENS.SONIC },
    { id: "episodes", label: "Episodes", screen: SCREENS.EPISODES },
    { id: "themes", label: "Themes", screen: SCREENS.THEMES },
    { id: "library", label: "Library", screen: SCREENS.LIBRARY },
  ];
  return (
    <nav
      style={{
        width: 72,
        position: "fixed",
        top: 49,
        left: 0,
        bottom: 0,
        background: "#fff",
        borderRight: `1px solid ${T.border}`,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        paddingTop: 14,
        gap: 2,
        zIndex: 80,
      }}
    >
      {items.map((item) => {
        const isActive = active === item.id;
        const isHover = hovered === item.id;
        return (
          <button
            key={item.id}
            onClick={() => onNavigate(item.screen)}
            onMouseEnter={() => setHovered(item.id)}
            onMouseLeave={() => setHovered(null)}
            style={{
              width: 62,
              padding: "8px 0",
              border: "none",
              borderRadius: 8,
              background: isActive
                ? "linear-gradient(135deg, #fffdf5, #fff8e8)"
                : isHover ? T.bgElevated : "transparent",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 3,
              cursor: "pointer",
              transition: "all 0.2s",
              position: "relative",
              fontFamily: "inherit",
            }}
          >
            {/* Gold left bar for active */}
            {isActive && (
              <div style={{
                position: "absolute",
                left: 0,
                top: 8,
                bottom: 8,
                width: 3,
                background: T.gold,
                borderRadius: "0 2px 2px 0",
              }} />
            )}
            <div style={{ color: isActive ? T.gold : isHover ? "#1a2744" : "#2a3a5a" }}>
              <SideNavIcon name={item.id} />
            </div>
            <div style={{
              fontSize: 8.5,
              fontWeight: isActive ? 700 : 600,
              color: isActive ? "#1a2744" : "#3d3028",
              textAlign: "center",
              lineHeight: 1.25,
              letterSpacing: "0.02em",
              whiteSpace: "pre-line",
              fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
            }}>
              {item.label}
            </div>
            {item.id === "library" && libraryCount > 0 && (
              <div
                style={{
                  position: "absolute",
                  top: 4,
                  right: 6,
                  minWidth: 14,
                  height: 14,
                  borderRadius: 7,
                  background: T.gold,
                  color: "#1a2744",
                  fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
                  fontSize: 8,
                  fontWeight: 800,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "0 3px",
                }}
              >
                {libraryCount}
              </div>
            )}
          </button>
        );
      })}
    </nav>
  );
}

function TopNav({ onNavigate, selectedModel, onModelChange, showCompare, onCompareToggle, selectedUniverse, onUniverseChange, onNewChat }) {
  const [newChatHover, setNewChatHover] = useState(false);
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "12px 48px",
        background: "#fff",
        borderBottom: `1px solid ${T.border}`,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div onClick={() => onNavigate(SCREENS.HOME)}><Logo /></div>
        <ModelSelector selectedModel={selectedModel} onModelChange={onModelChange} />
        {onUniverseChange && (
          <>
            <div style={{ width: 1, height: 20, background: T.border, margin: "0 2px" }} />
            <UniverseSwitcher selectedUniverse={selectedUniverse} onUniverseChange={onUniverseChange} />
          </>
        )}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        {onCompareToggle && (
          <button
            onClick={onCompareToggle}
            disabled={showCompare}
            style={{
              fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
              fontSize: 12.5,
              color: showCompare ? T.textDim : T.textMuted,
              background: T.bgElevated,
              border: `1px solid ${T.border}`,
              padding: "5px 12px",
              borderRadius: 8,
              cursor: showCompare ? "default" : "pointer",
              fontWeight: 500,
              opacity: showCompare ? 0.5 : 1,
            }}
          >
            ⟷ Compare
          </button>
        )}
      <button
        onClick={() => onNewChat ? onNewChat() : onNavigate(SCREENS.HOME)}
        onMouseEnter={() => setNewChatHover(true)}
        onMouseLeave={() => setNewChatHover(false)}
        style={{
          padding: "6px 14px",
          background: newChatHover ? "#fff" : "none",
          border: `1.5px solid ${newChatHover ? T.gold : T.border}`,
          borderRadius: 8,
          fontSize: 12,
          fontWeight: 600,
          color: "#1a2744",
          cursor: "pointer",
          fontFamily: "inherit",
          transition: "all 0.15s",
        }}
      >
        + New chat
      </button>
      </div>
    </div>
  );
}

function InputDock({ value, onChange, onSubmit, placeholder, disabled, drawerWidth = 0 }) {
  const [focused, setFocused] = useState(false);
  const [sendHover, setSendHover] = useState(false);
  const textareaRef = useRef(null);

  const autoResize = () => {
    const ta = textareaRef.current;
    if (ta) {
      ta.style.height = "auto";
      const scrollH = ta.scrollHeight;
      ta.style.height = Math.min(scrollH, 150) + "px";
      ta.style.overflowY = scrollH > 150 ? "auto" : "hidden";
    }
  };

  const handleSubmit = () => {
    console.log("[InputDock] submit fired, value:", JSON.stringify(value));
    if (value.trim() && !disabled) {
      onSubmit();
      // Reset textarea height after clearing
      setTimeout(() => {
        const ta = textareaRef.current;
        if (ta) { ta.style.height = "auto"; ta.style.overflowY = "hidden"; }
      }, 0);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        bottom: 0,
        left: 72,
        right: drawerWidth,
        padding: "16px 32px 24px",
        background: "linear-gradient(0deg, #f5f0e8 0%, #f5f0e880 50%, transparent 100%)",
        zIndex: 50,
        transition: "right 0.3s ease",
      }}
    >
      <div style={{ maxWidth: 740, margin: "0 auto", display: "flex", gap: 10, alignItems: "center" }}>
        <textarea
          ref={textareaRef}
          id="inputDockOmni"
          value={value}
          onChange={(e) => { onChange(e); setTimeout(autoResize, 0); }}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSubmit();
            }
          }}
          placeholder={placeholder || "Ask a follow-up or explore something new..."}
          disabled={disabled}
          rows={1}
          style={{
            flex: 1,
            padding: "14px 18px",
            border: `2px solid ${focused ? T.gold : "#1a2744"}`,
            borderRadius: 18,
            fontSize: 14,
            fontFamily: "inherit",
            color: "#1a2744",
            background: "#fff",
            outline: "none",
            transition: "border-color 0.2s",
            resize: "none",
            overflow: "hidden",
            lineHeight: 1.5,
            minHeight: 48,
            maxHeight: 150,
          }}
        />
        <button
          onClick={handleSubmit}
          onMouseEnter={() => setSendHover(true)}
          onMouseLeave={() => setSendHover(false)}
          style={{
            width: 38,
            height: 38,
            background: sendHover ? "#2a3a5a" : "#1a2744",
            border: "none",
            borderRadius: 10,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "all 0.15s",
            flexShrink: 0,
            transform: sendHover ? "scale(1.05)" : undefined,
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ffce3a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 6 15 12 9 18" /></svg>
        </button>
      </div>
    </div>
  );
}

function Chip({ children, active, onClick, variant = "default" }) {
  const styles = {
    default: {
      background: active ? T.blueLight : T.bgCard,
      border: `1px solid ${active ? T.blueBorder : T.border}`,
      color: active ? T.blue : T.textMuted,
    },
    blue: {
      background: T.blueLight,
      border: `1px solid ${T.blueBorder}`,
      color: T.blue,
    },
    gold: {
      background: T.goldBg,
      border: `1px solid ${T.goldBorder}`,
      color: T.gold,
    },
  };
  return (
    <button
      onClick={onClick}
      style={{
        ...styles[variant],
        padding: "6px 14px",
        borderRadius: 20,
        fontSize: 12.5,
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        fontWeight: 500,
        cursor: "pointer",
        transition: "all 0.2s",
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </button>
  );
}

function EntityTag({ children, onClick }) {
  return (
    <span
      onClick={onClick}
      title={onClick ? undefined : "Entity not yet available in knowledge graph"}
      style={{
        color: onClick ? T.blue : T.textMuted,
        textDecoration: "underline",
        textDecorationColor: onClick ? T.blueBorder : T.border,
        textUnderlineOffset: 3,
        cursor: onClick ? "pointer" : "default",
        fontWeight: 600,
        transition: "all 0.15s",
      }}
    >
      {children}
    </span>
  );
}

// --- Universal Entity Linking Utility ---
// Splits text into an array of strings and <EntityTag> JSX elements.
// entityNames must be pre-sorted longest-first to prevent partial matches.
// aliases is an optional map of shortName → fullEntityKey for fuzzy matching.
function linkEntities(text, entities, entityNames, onEntityClick, keyPrefix = "", aliases) {
  if (!text || !entityNames?.length) return [text];

  let parts = [text];
  for (const eName of entityNames) {
    const newParts = [];
    for (const part of parts) {
      if (typeof part !== "string") { newParts.push(part); continue; }
      // Word-boundary-aware regex: use \b when name starts/ends with word chars
      const escaped = eName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const prefix = /^\w/.test(eName) ? "\\b" : "";
      const suffix = /\w$/.test(eName) ? "\\b" : "";
      const regex = new RegExp(`(${prefix}${escaped}${suffix})`, "gi");
      const splits = part.split(regex);
      for (const s of splits) {
        if (regex.test(s)) {
          // Reset regex lastIndex after test
          regex.lastIndex = 0;
          // Resolve alias to actual entity key if needed
          const resolvedKey = (aliases && aliases[eName]) || eName;
          const inEntities = entities[resolvedKey] || entities[Object.keys(entities).find(k => k.toLowerCase() === resolvedKey.toLowerCase())];
          newParts.push(
            <EntityTag
              key={`${keyPrefix}${eName}-${newParts.length}`}
              onClick={inEntities && onEntityClick ? (e) => onEntityClick(resolvedKey, e) : undefined}
            >
              {s}
            </EntityTag>
          );
        } else if (s) {
          newParts.push(s);
        }
      }
    }
    parts = newParts;
  }
  return parts;
}

function LibraryCounter({ count }) {
  return count > 0 ? (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 5,
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        fontSize: 12,
        fontWeight: 600,
        color: T.blue,
        background: `${T.blue}0c`,
        border: `1px solid ${T.blue}22`,
        padding: "4px 11px",
        borderRadius: 8,
        transition: "all 0.2s",
      }}
    >
      <span style={{ fontSize: 13 }}>📚</span>
      <span>{count}</span>
    </div>
  ) : null;
}

function ModelSelector({ selectedModel, onModelChange }) {
  const [open, setOpen] = useState(false);
  const current = selectedModel || DEFAULT_MODEL;

  return (
    <div style={{ position: "relative" }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
          fontSize: 12.5,
          color: T.textMuted,
          background: T.bgElevated,
          border: `1px solid ${T.border}`,
          padding: "5px 12px 5px 14px",
          borderRadius: 8,
          cursor: "pointer",
          fontWeight: 500,
          display: "flex",
          alignItems: "center",
          gap: 6,
        }}
      >
        <span style={{ width: 6, height: 6, borderRadius: "50%", background: current.dot, flexShrink: 0 }} />
        {current.name} · Enhanced
        <span style={{ fontSize: 9, opacity: 0.5, marginLeft: 2 }}>▼</span>
      </button>
      {open && (
        <>
          <div onClick={() => setOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 99 }} />
          <div
            style={{
              position: "absolute",
              top: "calc(100% + 6px)",
              right: 0,
              width: 220,
              background: T.bgCard,
              border: `1px solid ${T.border}`,
              borderRadius: 12,
              boxShadow: "0 8px 30px rgba(0,0,0,0.12)",
              zIndex: 100,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
                fontSize: 11,
                fontWeight: 700,
                color: T.textDim,
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                padding: "12px 16px 6px",
              }}
            >
              Select AI Model
            </div>
            {MODELS.map((m) => (
              <div
                key={m.id}
                onClick={() => { if (onModelChange) onModelChange(m); setOpen(false); }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "10px 16px",
                  cursor: "pointer",
                  background: current.id === m.id ? T.blueLight : "transparent",
                  transition: "background 0.1s",
                }}
              >
                <span style={{ width: 7, height: 7, borderRadius: "50%", background: m.dot, flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", fontSize: 13, fontWeight: 600, color: T.text }}>
                    {m.name}
                  </div>
                  <div style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", fontSize: 11, color: T.textDim }}>
                    {m.provider}
                  </div>
                </div>
                {current.id === m.id && (
                  <span style={{ color: T.blue, fontSize: 14, fontWeight: 700 }}>✓</span>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function UniverseSwitcher({ selectedUniverse, onUniverseChange }) {
  const [open, setOpen] = useState(false);
  const UNIVERSES = [
    { id: "pluribus", name: "Pluribus", dot: "#2a7a4a", available: true },
    { id: "sinners", name: "Sinners", dot: "#c0392b", available: false },
    { id: "bluenote", name: "Blue Note", dot: "#3b6fa0", available: false },
    { id: "pattismith", name: "Patty Smith", dot: "#a03a5a", available: false },
    { id: "gerwig", name: "Greta Gerwig", dot: "#9a8040", available: false },
  ];
  const current = UNIVERSES.find((u) => u.id === selectedUniverse) || UNIVERSES[0];
  return (
    <div style={{ position: "relative" }}>
      <button onClick={() => setOpen(!open)} style={{
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        fontSize: 12.5, color: T.textMuted, background: T.bgElevated,
        border: `1px solid ${T.border}`, padding: "5px 12px 5px 14px",
        borderRadius: 8, cursor: "pointer", fontWeight: 500,
        display: "flex", alignItems: "center", gap: 6,
      }}>
        <span style={{ width: 6, height: 6, borderRadius: "50%", background: current.dot, flexShrink: 0 }} />
        {current.name}
        <span style={{ fontSize: 9, opacity: 0.5, marginLeft: 2 }}>▼</span>
      </button>
      {open && (
        <>
          <div onClick={() => setOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 99 }} />
          <div style={{
            position: "absolute", top: "calc(100% + 6px)", left: 0, width: 220,
            background: T.bgCard, border: `1px solid ${T.border}`, borderRadius: 12,
            boxShadow: "0 8px 30px rgba(0,0,0,0.12)", zIndex: 100, overflow: "hidden",
          }}>
            <div style={{
              fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
              fontSize: 11, fontWeight: 700, color: T.textDim,
              textTransform: "uppercase", letterSpacing: "0.06em", padding: "12px 16px 6px",
            }}>Select Universe</div>
            {UNIVERSES.map((u) => (
              <div key={u.id} onClick={() => { onUniverseChange(u.id); setOpen(false); }} style={{
                display: "flex", alignItems: "center", gap: 10, padding: "10px 16px",
                cursor: "pointer",
                background: current.id === u.id ? T.blueLight : "transparent",
              }}>
                <span style={{ width: 7, height: 7, borderRadius: "50%", background: u.dot, flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: T.text }}>{u.name}</div>
                </div>
                {current.id === u.id && (
                  <span style={{ color: T.blue, fontSize: 14, fontWeight: 700 }}>✓</span>
                )}
                {!u.available && (
                  <span style={{
                    fontSize: 10, fontWeight: 600, color: T.textDim,
                    background: T.bgElevated, border: `1px solid ${T.border}`,
                    borderRadius: 4, padding: "2px 6px", whiteSpace: "nowrap",
                  }}>Coming Soon</span>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function EnhancedBadge({ count }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10, fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "1px", color: "#3d3028" }}>
      <span style={{ width: 7, height: 7, borderRadius: "50%", background: T.gold }} />
      Enhanced Discovery
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 5,
          padding: "4px 12px",
          background: "linear-gradient(135deg, #fffdf5, #fff8e8)",
          border: "1.5px solid #ffce3a",
          borderRadius: 12,
          fontSize: 11,
          fontWeight: 700,
          color: "#1a2744",
          marginLeft: 12,
        }}
      >
        <span style={{ color: T.gold }}>✦</span> {count} discoveries in this response
      </span>
    </div>
  );
}

// ==========================================================
//  SCREEN 1: HOME — Universe Selector + Explore Panel
// ==========================================================
function HomeScreen({ onNavigate, spoilerFree, setSpoilerFree, onSubmit, selectedModel, onModelChange }) {
  const [hovered, setHovered] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const [selectedUniverse, setSelectedUniverse] = useState(null);
  const [query, setQuery] = useState("");
  const [activePathway, setActivePathway] = useState(null);
  const [bugHover, setBugHover] = useState(false);
  const [sendHover, setSendHover] = useState(false);
  const [inputFocused, setInputFocused] = useState(false);
  const [pathwayHover, setPathwayHover] = useState(null);
  const [chipHover, setChipHover] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [tileOverrides, setTileOverrides] = useState(() => {
    try { return JSON.parse(localStorage.getItem("ut_tile_overrides") || "{}"); } catch { return {}; }
  });
  const exploreRef = useRef(null);

  useEffect(() => {
    setTimeout(() => setLoaded(true), 100);
  }, []);

  useEffect(() => {
    if (selectedUniverse) {
      if (selectedUniverse === "pluribus" && exploreRef.current) {
        setTimeout(() => {
          exploreRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
        }, 150);
      } else {
        const container = document.querySelector('[data-home-scroll]');
        const grid = document.querySelector('[data-tile-grid]');
        if (container && grid) {
          setTimeout(() => {
            const targetScroll = grid.offsetTop + 30;
            container.scrollTo({ top: targetScroll, behavior: "smooth" });
          }, 150);
        }
      }
    }
  }, [selectedUniverse]);

  const handleSubmit = () => {
    const queryText = query.trim() || (selectedUniverse ? universes.find(u => u.id === selectedUniverse)?.placeholder : "") || "Who created Pluribus and what inspired it?";
    if (onSubmit) onSubmit(queryText, selectedUniverse || "pluribus");
  };

  const universes = [
    {
      id: "bluenote",
      title: "Blue Note Records",
      subtitle: "The Sound of Cool",
      available: false,
      gradient: "linear-gradient(160deg, #3b6fa0 0%, #4a82b8 100%)",
      bgImage: "/jd-universes-poc/images/bluenote-key-art.webp?v=2",
      bgColor: "#0a1a20",
      bgFit: "contain",
      bgScale: 1.03,
      textColor: "#fff",
      subColor: "rgba(255,255,255,0.7)",
      image: "🎵",
      exploreName: "Blue Note Records",
      exploreDescription: "Explore the artists, albums, and cultural legacy that defined modern jazz",
      placeholder: "What made Blue Note's recording approach revolutionary?",
      chips: [
        "How did Rudy Van Gelder shape the Blue Note sound?",
        "Connect Art Blakey to modern jazz",
        "Which Blue Note albums influenced hip-hop?",
        "Map the hard bop family tree",
      ],
    },
    {
      id: "pattismith",
      title: "Patti Smith: Just Kids",
      subtitle: "Punk, Poetry, Chelsea Hotel",
      available: false,
      gradient: "linear-gradient(160deg, #a03a5a 0%, #b84a6a 100%)",
      bgImage: "/jd-universes-poc/images/pattismith-key-art.webp?v=4",
      bgColor: "#0a0a0a",
      bgFit: "cover",
      bgPosition: "center 35%",
      textColor: "#fff",
      subColor: "rgba(255,255,255,0.7)",
      image: "📖",
      exploreName: "Patty Smith: Just Kids",
      exploreDescription: "Trace the connections between punk, poetry, and the New York art scene",
      placeholder: "How did Patty Smith and Robert Mapplethorpe influence each other?",
      chips: [
        "Map the Chelsea Hotel creative network",
        "What literature shaped Patty Smith's lyrics?",
        "Connect punk to the Beat poets",
        "Which artists emerged from this scene?",
      ],
    },
    {
      id: "pluribus",
      title: "Pluribus",
      subtitle: "The Hive Mind Universe of Vince Gilligan",
      available: true,
      gradient: "linear-gradient(160deg, #2a7a4a 0%, #35905a 100%)",
      bgImage: "/jd-universes-poc/images/pluribus-key-art.webp?v=13",
      bgPositionSelected: "bottom",
      textColor: "#fff",
      subColor: "rgba(255,255,255,0.7)",
      image: "🌐",
      featured: true,
      exploreName: "Pluribus",
      exploreDescription: "Ask anything — discover connections across film, music, books, and podcasts",
      placeholder: "Who created Pluribus and what inspired it?",
      chips: [
        "What music inspired the show's tone?",
        "Trace the line from X-Files to Pluribus",
        "Which books share Pluribus' themes?",
        "Show me the Vince Gilligan universe",
      ],
    },
    {
      id: "gerwig",
      title: "Greta Gerwig",
      subtitle: "The Director's Lens",
      available: false,
      gradient: "linear-gradient(160deg, #9a8040 0%, #b89850 100%)",
      bgImage: "/jd-universes-poc/images/gerwig-key-art.webp?v=5",
      bgColor: "#ffffff",
      bgFit: "cover",
      bgPosition: "top",
      textColor: "#fff",
      subColor: "rgba(255,255,255,0.7)",
      image: "🎬",
      exploreName: "Greta Gerwig",
      exploreDescription: "Discover the films, books, and music that define Gerwig's creative universe",
      placeholder: "What are the literary influences behind Lady Bird?",
      chips: [
        "How does Gerwig reference the French New Wave?",
        "What books shaped Little Women's adaptation?",
        "Connect Gerwig to the mumblecore movement",
        "Which composers define her soundtracks?",
      ],
    },
    {
      id: "sinners",
      title: "Sinners",
      subtitle: "From the Mind of Ryan Coogler",
      available: false,
      gradient: "linear-gradient(160deg, #8b2500 0%, #c0392b 100%)",
      bgImage: "/jd-universes-poc/images/sinners-key-art.webp?v=2",
      bgColor: "#1a0800",
      bgFit: "cover",
      bgPosition: "top",
      bgPositionSelected: "center",
      textColor: "#fff",
      subColor: "rgba(255,255,255,0.7)",
      image: "🔥",
      exploreName: "Sinners",
      exploreDescription: "Placeholder — Ryan Coogler's world of music, culture, and storytelling",
      placeholder: "What inspired Ryan Coogler to make Sinners?",
      chips: [
        "What is Sinners about?",
        "How does Ryan Coogler use music in his films?",
        "Connect Coogler to the history of blues music",
        "What themes run through Coogler's filmography?",
      ],
    },
  ];

  const effectiveUniverses = useMemo(() =>
    universes.map(u => ({ ...u, ...(tileOverrides[u.id] || {}) })),
    [tileOverrides]
  );

  const handleSaveOverrides = (newOverrides) => {
    setTileOverrides(newOverrides);
    localStorage.setItem("ut_tile_overrides", JSON.stringify(newOverrides));
    setShowSettings(false);
  };

  const selected = effectiveUniverses.find((u) => u.id === selectedUniverse);

  return (
    <div
      data-home-scroll
      style={{
        background: "transparent",
        display: "flex",
        flexDirection: "column",
        alignItems: "stretch",
        padding: "60px 32px 80px 32px",
        position: "relative",
        marginLeft: 0,
        height: "100vh",
        overflowY: "auto",
      }}
    >
      {/* Header */}
      <div
        style={{
          alignSelf: "center",
          opacity: loaded ? 1 : 0,
          transform: loaded ? "translateY(0)" : "translateY(20px)",
          transition: "all 0.8s cubic-bezier(0.16,1,0.3,1)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          marginBottom: 48,
        }}
      >
        <Logo size="lg" />
        <p
          style={{
            fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
            color: T.textMuted,
            fontSize: 16,
            marginTop: 14,
            textAlign: "center",
          }}
        >
          Choose a universe to explore
        </p>
      </div>

      {/* Universe Cards */}
      <div
        data-tile-grid
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(5, 1fr)",
          gap: 16,
          maxWidth: 1166,
          width: "100%",
          margin: "0 auto",
          alignSelf: "stretch",
          overflow: "visible",
          paddingTop: selected ? 40 : 0,
          opacity: loaded ? 1 : 0,
          transform: loaded ? "translateY(0)" : "translateY(30px)",
          transition: "all 0.8s cubic-bezier(0.16,1,0.3,1) 0.15s",
        }}
      >
        {effectiveUniverses.map((u) => {
          const isSelected = selectedUniverse === u.id;
          const isHover = hovered === u.id;
          return (
            <div
              key={u.id}
              onMouseEnter={() => setHovered(u.id)}
              onMouseLeave={() => setHovered(null)}
              onClick={() => {
                setSelectedUniverse(u.id);
                setQuery("");
              }}
              style={{
                borderRadius: 10,
                height: 264,
                display: "flex",
                flexDirection: "column",
                cursor: "pointer",
                background: u.bgImage ? (u.bgColor || "#f3db00") : "transparent",
                border: isSelected
                  ? "2px solid rgba(255,255,255,0.5)"
                  : `1px solid ${isHover ? "rgba(255,255,255,0.2)" : "transparent"}`,
                transition: "all 1.2s cubic-bezier(0.4,0,0.2,1)",
                transformOrigin: "top center",
                opacity: selected && !isSelected ? 0.4 : 1,
                transform: isSelected
                  ? "none"
                  : selected && !isSelected
                    ? "scale(0.84)"
                    : isHover ? "translateY(-4px)" : "none",
                boxShadow: isSelected
                  ? "0 8px 32px rgba(26,39,68,0.25)"
                  : isHover
                  ? T.shadowHover
                  : T.shadow,
                overflow: "hidden",
              }}
            >
              {/* Art area */}
              <div style={{
                flex: 1,
                position: "relative",
                background: u.bgImage ? (u.bgColor || "#f3db00") : u.gradient,
                overflow: "hidden",
              }}>
                {u.bgImage && (
                  <img
                    src={u.bgImage}
                    alt=""
                    style={{
                      position: "absolute",
                      inset: 0,
                      width: u.bgScale ? `${u.bgScale * 100}%` : "100%",
                      height: u.bgScale ? `${u.bgScale * 100}%` : "100%",
                      top: u.bgScale ? `${(1 - u.bgScale) * 50}%` : 0,
                      left: u.bgScale ? `${(1 - u.bgScale) * 50}%` : 0,
                      objectFit: u.bgFit || "contain",
                      objectPosition: isSelected && selected && u.bgPositionSelected ? u.bgPositionSelected : (u.bgPosition || "center"),
                      transition: "object-fit 1.2s cubic-bezier(0.4,0,0.2,1), object-position 1.2s cubic-bezier(0.4,0,0.2,1)",
                    }}
                  />
                )}
                {!u.bgImage && (
                  <div
                    style={{
                      position: "absolute",
                      top: "42%",
                      left: "50%",
                      transform: "translate(-50%, -50%)",
                      fontSize: 44,
                      opacity: 0.25,
                    }}
                  >
                    {u.image}
                  </div>
                )}
                {!u.bgImage && u.featured && !isSelected && (
                  <div
                    style={{
                      position: "absolute",
                      top: 10,
                      right: 10,
                      background: "rgba(255,255,255,0.2)",
                      border: "1px solid rgba(255,255,255,0.35)",
                      color: "#fff",
                      fontSize: 9,
                      padding: "3px 8px",
                      borderRadius: 8,
                      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
                      letterSpacing: "0.06em",
                      textTransform: "uppercase",
                      fontWeight: 600,
                    }}
                  >
                    Featured
                  </div>
                )}
                {!u.bgImage && !u.featured && !isSelected && (
                  <div
                    style={{
                      position: "absolute",
                      top: 10,
                      right: 10,
                      background: "rgba(255,255,255,0.15)",
                      border: "1px solid rgba(255,255,255,0.25)",
                      color: "rgba(255,255,255,0.7)",
                      fontSize: 9,
                      padding: "3px 8px",
                      borderRadius: 8,
                      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
                      letterSpacing: "0.06em",
                      textTransform: "uppercase",
                      fontWeight: 600,
                    }}
                  >
                    {u.available ? "Preview" : "Coming Soon"}
                  </div>
                )}
                {!u.bgImage && isSelected && (
                  <div
                    style={{
                      position: "absolute",
                      top: 10,
                      right: 10,
                      background: "rgba(255,255,255,0.25)",
                      border: "1px solid rgba(255,255,255,0.4)",
                      color: "#fff",
                      fontSize: 9,
                      padding: "3px 8px",
                      borderRadius: 8,
                      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
                      letterSpacing: "0.06em",
                      textTransform: "uppercase",
                      fontWeight: 600,
                    }}
                  >
                    Selected
                  </div>
                )}
              </div>
              {/* Text footer — collapses when selected, image fills the space */}
              <div style={{
                background: "#1a2744",
                padding: isSelected && selected ? "0 12px" : "10px 12px",
                height: isSelected && selected ? 0 : 64,
                flexShrink: 0,
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                overflow: "hidden",
                transition: "height 1.2s cubic-bezier(0.4,0,0.2,1), padding 1.2s cubic-bezier(0.4,0,0.2,1)",
              }}>
                <h3 style={{
                  fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
                  fontSize: 11,
                  fontWeight: 600,
                  color: "#fff",
                  margin: 0,
                  lineHeight: 1.3,
                }}>
                  {u.id === "pluribus" ? (tileOverrides.pluribus?.title || "Vince Gilligan's Hive Mind Universe") : u.title}
                </h3>
                <p style={{
                  fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
                  fontSize: 9,
                  color: "rgba(255,255,255,0.6)",
                  margin: "2px 0 0",
                  lineHeight: 1.3,
                }}>
                  {u.id === "pluribus" ? (tileOverrides.pluribus?.subtitle || "Creator of Breaking Bad & Better Call Saul") : u.subtitle}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Explore Panel — v2.8 Bible hero section */}
      {selected && selected.id === "pluribus" && (() => {
        const pOv = tileOverrides.pluribus?.pathways || {};
        const pathwayDefs = [
          { id: "gilligan", emoji: pOv.gilligan?.emoji !== undefined ? pOv.gilligan.emoji : "\ud83c\udfac", label: pOv.gilligan?.label !== undefined ? pOv.gilligan.label : "The Vince Gilligan Universe", chips: pOv.gilligan?.chips || [
            "Who made Pluribus? What else have they done?",
            "What\u2019s the relationship between Pluribus and Breaking Bad?",
            "What inspired Pluribus? What are its influences?",
            "What\u2019s all the hype? Should I watch it?",
          ]},
          { id: "cast", emoji: pOv.cast?.emoji !== undefined ? pOv.cast.emoji : "\u2b50", label: pOv.cast?.label !== undefined ? pOv.cast.label : "Cast & Creators", chips: pOv.cast?.chips || [
            "Who\u2019s the lead actress? She\u2019s amazing.",
            "Why is Rhea Seehorn\u2019s Golden Globe win such a big deal?",
            "Why\u2019s Carol so mad?",
            "What\u2019s the deal with Zosia in Pluribus?",
          ]},
          { id: "deepdive", emoji: pOv.deepdive?.emoji !== undefined ? pOv.deepdive.emoji : "\ud83d\udd2e", label: pOv.deepdive?.label !== undefined ? pOv.deepdive.label : "Pluribus Deep Dive", chips: pOv.deepdive?.chips || [
            "How did the music make Pluribus work?",
            "What\u2019s the deal with the Hive Mind?",
            "It felt so dystopian \u2014 what else is like it?",
            "Explain the ending to me!",
          ]},
          // Include any custom pathways added via settings
          ...Object.entries(pOv).filter(([id]) => !["gilligan", "cast", "deepdive"].includes(id)).map(([id, p]) => ({
            id, emoji: p.emoji || "", label: p.label || "", chips: p.chips || [],
          })),
        ];
        const activeChips = pathwayDefs.find(p => p.id === activePathway)?.chips || [];

        return (
          <div
            ref={exploreRef}
            style={{
              alignSelf: "center",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
            }}
          >
            {/* hero-section: bug + tagline */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "40px 48px 20px" }}>
              {/* Pluribus Bug — 110x110 gold gradient circle */}
              <div
                onMouseEnter={() => setBugHover(true)}
                onMouseLeave={() => setBugHover(false)}
                onClick={() => {
                  const inp = document.getElementById("heroInputPluribusBible");
                  if (inp) inp.focus();
                }}
                style={{
                  width: 110,
                  height: 110,
                  background: "linear-gradient(145deg, #ffe066, #ffce3a 40%, #f5b800)",
                  borderRadius: "50%",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: bugHover
                    ? "0 12px 44px rgba(245,184,0,0.5)"
                    : "0 8px 32px rgba(245,184,0,0.35)",
                  cursor: "pointer",
                  transition: "all 0.3s",
                  marginBottom: 16,
                  transform: bugHover ? "scale(1.06)" : undefined,
                  animation: "bugPulse 3s ease-in-out infinite",
                }}
              >
                <h1 style={{
                  fontSize: 16, fontWeight: 800, color: "#1a2744",
                  textTransform: "uppercase", letterSpacing: 2, margin: 0,
                }}>Pluribus</h1>
                <span style={{
                  fontSize: 9, color: "#1a2744", textTransform: "uppercase",
                  letterSpacing: 1.5, fontWeight: 600,
                }}>universe</span>
              </div>
              {/* Tagline */}
              <div style={{
                fontSize: 14, color: "#1a2744", fontWeight: 600,
                marginBottom: 24, textAlign: "center",
              }}>
                Explore the Vince Gilligan Universe — powered by authorized cross-media discovery
              </div>
            </div>

            {/* Pathway buttons */}
            <div style={{
              display: "flex", gap: 12, justifyContent: "center",
              marginBottom: 28, flexWrap: "wrap", padding: "0 48px",
            }}>
              {pathwayDefs.map((p) => {
                const isActive = activePathway === p.id;
                const isHoverP = pathwayHover === p.id;
                return (
                  <button
                    key={p.id}
                    onClick={() => setActivePathway(isActive ? null : p.id)}
                    onMouseEnter={() => setPathwayHover(p.id)}
                    onMouseLeave={() => setPathwayHover(null)}
                    style={{
                      display: "flex", alignItems: "center", gap: 8,
                      padding: "10px 20px", borderRadius: 24,
                      border: `2px solid ${isActive || isHoverP ? "#f5b800" : T.border}`,
                      background: isActive || isHoverP
                        ? "linear-gradient(180deg, #fffdf5, #fff8e8)" : "#fff",
                      fontSize: 13, fontWeight: 700, color: "#1a2744",
                      cursor: "pointer", transition: "all 0.25s", fontFamily: "inherit",
                      transform: isHoverP && !isActive ? "translateY(-2px)" : undefined,
                      boxShadow: isActive
                        ? "0 4px 16px rgba(245,184,0,0.2)"
                        : isHoverP ? "0 6px 20px rgba(245,184,0,0.2)" : undefined,
                    }}
                  >
                    <span style={{ fontSize: 18 }}>{p.emoji}</span> {p.label}
                  </button>
                );
              })}
            </div>

            {/* Starter chips — contextual per pathway */}
            {activeChips.length > 0 && (
              <div style={{
                display: "flex", flexWrap: "wrap", gap: 8,
                justifyContent: "center", maxWidth: 800,
                margin: "0 auto 24px", padding: "0 48px",
                animation: "startersIn 0.3s ease",
              }}>
                {activeChips.map((chip, ci) => {
                  const isChipHover = chipHover === `${activePathway}-${ci}`;
                  return (
                    <div
                      key={chip}
                      onClick={() => { if (onSubmit) onSubmit(chip, "pluribus"); }}
                      onMouseEnter={() => setChipHover(`${activePathway}-${ci}`)}
                      onMouseLeave={() => setChipHover(null)}
                      style={{
                        padding: "8px 16px", background: isChipHover
                          ? "linear-gradient(180deg, #fffdf5, #fff8e8)" : "#fff",
                        border: `1px solid ${isChipHover ? "#f5b800" : T.border}`,
                        borderRadius: 20, fontSize: 12, color: "#1a2744",
                        cursor: "pointer", transition: "all 0.2s", lineHeight: 1.4,
                        transform: isChipHover ? "translateY(-1px)" : undefined,
                        boxShadow: isChipHover ? "0 3px 10px rgba(245,184,0,0.15)" : undefined,
                      }}
                    >
                      {chip}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Hero chat — input + Send button */}
            <div style={{ maxWidth: 900, margin: "0 auto", padding: "0 48px 40px", width: "100%" }}>
              <div style={{ display: "flex", gap: 12 }}>
                <input
                  id="heroInputPluribusBible"
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && query.trim()) handleSubmit(); }}
                  onFocus={() => setInputFocused(true)}
                  onBlur={() => setInputFocused(false)}
                  placeholder="Ask about Pluribus, its creators, cast, music, themes..."
                  style={{
                    flex: 1, padding: "14px 20px",
                    border: `2px solid ${inputFocused ? "#f5b800" : "#1a2744"}`,
                    borderRadius: 12, fontSize: 14, fontWeight: 500,
                    fontFamily: "inherit", color: "#1a2744", background: "#fff",
                    outline: "none", transition: "border-color 0.2s",
                  }}
                />
                <button
                  onClick={() => { if (query.trim()) handleSubmit(); }}
                  onMouseEnter={() => setSendHover(true)}
                  onMouseLeave={() => setSendHover(false)}
                  style={{
                    padding: "10px 18px",
                    background: "linear-gradient(135deg, #1a2744, #2a3a5a)",
                    color: "#ffce3a", border: "none", borderRadius: 12,
                    fontSize: 18, fontWeight: 700, cursor: "pointer",
                    transition: "all 0.2s", whiteSpace: "nowrap", fontFamily: "inherit",
                    lineHeight: 1, display: "flex", alignItems: "center",
                    transform: sendHover ? "translateY(-1px)" : undefined,
                    boxShadow: sendHover ? "0 4px 16px rgba(26,39,68,0.3)" : undefined,
                  }}
                >
                  <span style={{ display: "inline-block", transform: "scaleX(1.5)" }}>&#x2192;</span>
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Explore Panel — non-Pluribus universes (Coming Soon) */}
      {selected && selected.id !== "pluribus" && (
        <div
          ref={exploreRef}
          style={{
            maxWidth: 960,
            width: "100%",
            marginTop: 36,
            background: T.bgCard,
            border: `1px solid ${T.border}`,
            borderRadius: 16,
            padding: "40px 48px",
            boxShadow: T.shadow,
            animation: "slideUp 0.5s cubic-bezier(0.16,1,0.3,1)",
          }}
        >
          <div style={{ textAlign: "center", marginBottom: 32 }}>
            <h2
              style={{
                fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
                fontSize: 28,
                fontWeight: 700,
                color: T.text,
                margin: "0 0 8px",
              }}
            >
              Explore {selected.exploreName}
            </h2>
            <p
              style={{
                fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
                color: T.textMuted,
                fontSize: 15,
              }}
            >
              {selected.exploreDescription}
            </p>
            <div
              style={{
                marginTop: 16,
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                background: T.goldBg,
                border: `1px solid ${T.goldBorder}`,
                borderRadius: 10,
                padding: "8px 18px",
                fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
                fontSize: 13,
                fontWeight: 600,
                color: T.text,
              }}
            >
              <span style={{ fontSize: 14 }}>&#9679;</span> Coming Soon — This universe is under construction
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <p
        style={{
          alignSelf: "center",
          textAlign: "center",
          fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
          color: T.textDim,
          fontSize: 12,
          marginTop: 40,
          opacity: loaded ? 1 : 0,
          transition: "opacity 0.6s 0.5s",
        }}
      >
        Powered by UnitedTribes Knowledge Graph · Authorized content partnerships
      </p>
      <a
        href={BUILD_COMMIT_URL}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          alignSelf: "center",
          display: "inline-block",
          marginTop: 12,
          fontFamily: "'SF Mono', Menlo, Monaco, monospace",
          fontSize: 10,
          color: "#3d3028",
          opacity: loaded ? 0.7 : 0,
          transition: "opacity 0.6s 0.6s",
          textDecoration: "none",
          letterSpacing: "0.03em",
        }}
      >
        {BUILD_VERSION} · {BUILD_COMMIT} · {BUILD_DATE}
      </a>
      <span
        onClick={() => setShowSettings(true)}
        style={{
          alignSelf: "center",
          display: "inline-block",
          marginTop: 8,
          fontSize: 28,
          cursor: "pointer",
          opacity: 0.4,
          transition: "opacity 0.2s",
        }}
        onMouseEnter={(e) => e.target.style.opacity = 0.8}
        onMouseLeave={(e) => e.target.style.opacity = 0.4}
        title="Edit tile settings"
      >
        &#9881;
      </span>
      {showSettings && (
        <TileSettingsModal
          tileOverrides={tileOverrides}
          universes={universes}
          onSave={handleSaveOverrides}
          onClose={() => setShowSettings(false)}
        />
      )}
    </div>
  );
}

// ==========================================================
//  TILE SETTINGS MODAL — Edit tile text, chips, pathways
// ==========================================================
function TileSettingsModal({ tileOverrides, universes, onSave, onClose }) {
  const defaultPathways = {
    gilligan: { emoji: "\uD83C\uDFAC", label: "The Vince Gilligan Universe", chips: ["Who made Pluribus? What else have they done?", "What\u2019s the relationship between Pluribus and Breaking Bad?", "What inspired Pluribus? What are its influences?", "What\u2019s all the hype? Should I watch it?"] },
    cast: { emoji: "\u2B50", label: "Cast & Creators", chips: ["Who\u2019s the lead actress? She\u2019s amazing.", "Why is Rhea Seehorn\u2019s Golden Globe win such a big deal?", "Why\u2019s Carol so mad?", "What\u2019s the deal with Zosia in Pluribus?"] },
    deepdive: { emoji: "\uD83D\uDD2E", label: "Pluribus Deep Dive", chips: ["How did the music make Pluribus work?", "What\u2019s the deal with the Hive Mind?", "It felt so dystopian \u2014 what else is like it?", "Explain the ending to me!"] },
  };

  const [draft, setDraft] = useState(() => {
    const base = JSON.parse(JSON.stringify(tileOverrides));
    if (!base.pluribus) base.pluribus = {};
    if (!base.pluribus.pathways) {
      base.pluribus.pathways = JSON.parse(JSON.stringify(defaultPathways));
    } else {
      for (const [id, def] of Object.entries(defaultPathways)) {
        if (!base.pluribus.pathways[id]) base.pluribus.pathways[id] = JSON.parse(JSON.stringify(def));
      }
    }
    return base;
  });

  // Preview: merge draft into base universes
  const previewUniverses = useMemo(() =>
    universes.map(u => ({ ...u, ...(draft[u.id] || {}) })),
    [universes, draft]
  );

  // --- Helpers ---
  const setField = (uId, field, value) => {
    setDraft(prev => ({ ...prev, [uId]: { ...(prev[uId] || {}), [field]: value } }));
  };
  const setChip = (uId, idx, value) => {
    const chips = [...(draft[uId]?.chips || universes.find(u => u.id === uId)?.chips || [])];
    chips[idx] = value;
    setField(uId, "chips", chips);
  };
  const addChip = (uId) => {
    const chips = [...(draft[uId]?.chips || universes.find(u => u.id === uId)?.chips || [])];
    setField(uId, "chips", [...chips, ""]);
  };
  const removeChip = (uId, idx) => {
    const chips = (draft[uId]?.chips || universes.find(u => u.id === uId)?.chips || []).filter((_, i) => i !== idx);
    setField(uId, "chips", chips);
  };
  const setPathField = (uId, pathId, field, value) => {
    setDraft(prev => ({
      ...prev, [uId]: { ...(prev[uId] || {}), pathways: { ...((prev[uId] || {}).pathways || {}), [pathId]: { ...(((prev[uId] || {}).pathways || {})[pathId] || {}), [field]: value } } },
    }));
  };
  const setPathChip = (uId, pathId, idx, value) => {
    const chips = [...(draft[uId]?.pathways?.[pathId]?.chips || [])];
    chips[idx] = value;
    setPathField(uId, pathId, "chips", chips);
  };
  const addPathChip = (uId, pathId) => {
    const chips = [...(draft[uId]?.pathways?.[pathId]?.chips || [])];
    setPathField(uId, pathId, "chips", [...chips, ""]);
  };
  const removePathChip = (uId, pathId, idx) => {
    const chips = (draft[uId]?.pathways?.[pathId]?.chips || []).filter((_, i) => i !== idx);
    setPathField(uId, pathId, "chips", chips);
  };
  const removePathway = (uId, pathId) => {
    setDraft(prev => {
      const paths = { ...((prev[uId] || {}).pathways || {}) };
      delete paths[pathId];
      return { ...prev, [uId]: { ...(prev[uId] || {}), pathways: paths } };
    });
  };
  const addPathway = (uId) => {
    const newId = "pathway_" + Date.now();
    setDraft(prev => ({
      ...prev, [uId]: { ...(prev[uId] || {}), pathways: { ...((prev[uId] || {}).pathways || {}), [newId]: { emoji: "", label: "", chips: [""] } } },
    }));
  };
  const handleReset = () => {
    localStorage.removeItem("ut_tile_overrides");
    onSave({});
  };

  const font = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
  const inputSt = { width: "100%", padding: "8px 12px", border: "1px solid #e5e7eb", borderRadius: 8, fontSize: 13, fontFamily: font, color: "#1a2744", background: "#fff", boxSizing: "border-box", outline: "none" };
  const labelSt = { display: "block", fontSize: 11, fontWeight: 600, color: "#4b5563", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4, fontFamily: font };
  const headSt = { fontSize: 14, fontWeight: 700, color: "#1a2744", fontFamily: font, marginBottom: 12, paddingBottom: 8, borderBottom: "1px solid #e5e7eb" };
  const smallBtnSt = { background: "none", border: "none", color: "#9ca3af", cursor: "pointer", fontSize: 14, padding: "0 4px" };

  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}
    >
      <div onClick={(e) => e.stopPropagation()} style={{ background: "#fff", borderRadius: 16, width: "100%", maxWidth: 780, maxHeight: "88vh", display: "flex", flexDirection: "column", boxShadow: "0 20px 60px rgba(0,0,0,0.3)", overflow: "hidden" }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 24px 16px", borderBottom: "1px solid #e5e7eb", flexShrink: 0 }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "#1a2744", fontFamily: font }}>Tile Settings</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 20, color: "#4b5563", cursor: "pointer", padding: "2px 6px" }}>&#10005;</button>
        </div>

        {/* Preview strip */}
        <div style={{ flexShrink: 0, padding: "16px 24px", borderBottom: "1px solid #e5e7eb", background: "#f3f4f6" }}>
          <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
            {previewUniverses.map((u) => {
              const pTitle = u.id === "pluribus" ? (draft.pluribus?.title || "Vince Gilligan\u2019s Hive Mind Universe") : (draft[u.id]?.title || u.title);
              const pSub = u.id === "pluribus" ? (draft.pluribus?.subtitle || "Creator of Breaking Bad & Better Call Saul") : (draft[u.id]?.subtitle || u.subtitle);
              return (
                <div key={u.id} style={{ width: 140, height: 160, borderRadius: 6, overflow: "hidden", border: "1px solid #e5e7eb", flexShrink: 0, display: "flex", flexDirection: "column", background: u.bgColor || "#111" }}>
                  <div style={{ flex: 1, background: u.bgColor || "#111", backgroundImage: u.bgImage ? ("url(" + u.bgImage + ")") : "none", backgroundSize: u.bgFit === "contain" ? "contain" : "cover", backgroundPosition: u.bgPosition || "center", backgroundRepeat: "no-repeat" }} />
                  <div style={{ background: "#1a2744", padding: "6px 6px 8px", flexShrink: 0, minHeight: 44 }}>
                    <div style={{ fontSize: 9, fontWeight: 700, color: "#fff", fontFamily: font, overflow: "hidden", textOverflow: "ellipsis", lineHeight: 1.4, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>{pTitle}</div>
                    <div style={{ fontSize: 7.5, color: "rgba(255,255,255,0.65)", fontFamily: font, overflow: "hidden", textOverflow: "ellipsis", lineHeight: 1.4, marginTop: 2, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>{pSub}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Scrollable editor */}
        <div style={{ overflowY: "auto", padding: "20px 24px", flex: 1 }}>
          {universes.map((u) => {
            const draftU = draft[u.id] || {};
            const chips = draftU.chips || u.chips || [];
            const titlePh = u.id === "pluribus" ? "Vince Gilligan\u2019s Hive Mind Universe" : u.title;
            const subPh = u.id === "pluribus" ? "Creator of Breaking Bad & Better Call Saul" : u.subtitle;
            const titleVal = u.id === "pluribus" ? (draft.pluribus?.title !== undefined ? draft.pluribus.title : titlePh) : (draftU.title !== undefined ? draftU.title : u.title);
            const subVal = u.id === "pluribus" ? (draft.pluribus?.subtitle !== undefined ? draft.pluribus.subtitle : subPh) : (draftU.subtitle !== undefined ? draftU.subtitle : u.subtitle);
            const onTitle = (e) => {
              if (u.id === "pluribus") {
                setDraft(prev => ({ ...prev, pluribus: { ...(prev.pluribus || {}), title: e.target.value } }));
              } else { setField(u.id, "title", e.target.value); }
            };
            const onSub = (e) => {
              if (u.id === "pluribus") {
                setDraft(prev => ({ ...prev, pluribus: { ...(prev.pluribus || {}), subtitle: e.target.value } }));
              } else { setField(u.id, "subtitle", e.target.value); }
            };
            return (
              <div key={u.id} style={{ marginBottom: 32 }}>
                <div style={headSt}>{u.title}</div>
                <div style={{ marginBottom: 12 }}>
                  <label style={labelSt}>Title</label>
                  <input style={inputSt} value={titleVal} placeholder={titlePh} onChange={onTitle} />
                </div>
                <div style={{ marginBottom: 12 }}>
                  <label style={labelSt}>Subtitle</label>
                  <input style={inputSt} value={subVal} placeholder={subPh} onChange={onSub} />
                </div>
                <div>
                  <label style={labelSt}>Chips</label>
                  {chips.map((chip, idx) => (
                    <div key={idx} style={{ display: "flex", gap: 6, marginBottom: 6, alignItems: "center" }}>
                      <span style={{ fontSize: 11, color: "#9ca3af", width: 16, flexShrink: 0, textAlign: "right" }}>{idx + 1}.</span>
                      <input style={{ ...inputSt, flex: 1 }} value={chip} placeholder={u.chips?.[idx] || ""} onChange={(e) => setChip(u.id, idx, e.target.value)} />
                      <button onClick={() => removeChip(u.id, idx)} style={smallBtnSt}>&#10005;</button>
                    </div>
                  ))}
                  <button onClick={() => addChip(u.id)} style={{ marginTop: 4, background: "none", border: "1px dashed #e5e7eb", borderRadius: 6, padding: "5px 12px", fontSize: 12, color: "#4b5563", cursor: "pointer", fontFamily: font }}>+ Add chip</button>
                </div>

                {/* Pathways */}
                {(() => {
                  const uPathways = draft[u.id]?.pathways || {};
                  const hasPathways = Object.keys(uPathways).length > 0;
                  return (
                    <div style={{ marginTop: 20 }}>
                      <label style={{ ...labelSt, fontSize: 12, color: "#1a2744", textTransform: "none", letterSpacing: 0, fontWeight: 700 }}>Pathway Sections</label>
                      {hasPathways && Object.entries(uPathways).map(([pathId, p]) => (
                        <div key={pathId} style={{ marginTop: 14, paddingLeft: 12, borderLeft: "3px solid #e5e7eb" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                            <span style={{ fontSize: 12, fontWeight: 600, color: "#4b5563", fontFamily: font }}>{p.emoji || ""} {p.label || "(unnamed)"}</span>
                            <button onClick={() => removePathway(u.id, pathId)} style={{ ...smallBtnSt, fontSize: 11, color: "#b91c1c" }}>&#10005; Remove</button>
                          </div>
                          <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
                            <div style={{ width: 60 }}>
                              <label style={labelSt}>Emoji</label>
                              <input style={{ ...inputSt, textAlign: "center" }} value={p.emoji || ""} onChange={(e) => setPathField(u.id, pathId, "emoji", e.target.value)} />
                            </div>
                            <div style={{ flex: 1 }}>
                              <label style={labelSt}>Label</label>
                              <input style={inputSt} value={p.label || ""} placeholder={defaultPathways[pathId]?.label || ""} onChange={(e) => setPathField(u.id, pathId, "label", e.target.value)} />
                            </div>
                          </div>
                          <label style={labelSt}>Chips</label>
                          {(p.chips || []).map((chip, idx) => (
                            <div key={idx} style={{ display: "flex", gap: 6, marginBottom: 6, alignItems: "center" }}>
                              <span style={{ fontSize: 11, color: "#9ca3af", width: 16, flexShrink: 0, textAlign: "right" }}>{idx + 1}.</span>
                              <input style={{ ...inputSt, flex: 1 }} value={chip} onChange={(e) => setPathChip(u.id, pathId, idx, e.target.value)} />
                              <button onClick={() => removePathChip(u.id, pathId, idx)} style={smallBtnSt}>&#10005;</button>
                            </div>
                          ))}
                          <button onClick={() => addPathChip(u.id, pathId)} style={{ marginTop: 4, background: "none", border: "1px dashed #e5e7eb", borderRadius: 6, padding: "5px 12px", fontSize: 12, color: "#4b5563", cursor: "pointer", fontFamily: font }}>+ Add chip</button>
                        </div>
                      ))}
                      <button onClick={() => addPathway(u.id)} style={{ marginTop: 14, background: "none", border: "1px dashed #2563eb", borderRadius: 8, padding: "8px 16px", fontSize: 13, fontWeight: 600, color: "#2563eb", cursor: "pointer", fontFamily: font, width: "100%" }}>+ Add pathway</button>
                    </div>
                  );
                })()}
              </div>
            );
          })}
        </div>

        {/* Footer buttons */}
        <div style={{ display: "flex", gap: 10, padding: "16px 24px", borderTop: "1px solid #e5e7eb", flexShrink: 0, justifyContent: "flex-end" }}>
          <button onClick={handleReset} style={{ padding: "9px 18px", borderRadius: 8, border: "1px solid #fca5a5", background: "#fff1f2", color: "#b91c1c", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: font }}>Reset All</button>
          <button onClick={onClose} style={{ padding: "9px 18px", borderRadius: 8, border: "1px solid #e5e7eb", background: "#f3f4f6", color: "#4b5563", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: font }}>Cancel</button>
          <button onClick={() => onSave(draft)} style={{ padding: "9px 18px", borderRadius: 8, border: "none", background: "#2563eb", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: font }}>Save</button>
        </div>
      </div>
    </div>
  );
}

// ==========================================================
//  SCREEN 2: UNIVERSE HOME — In-universe new chat landing
// ==========================================================
function UniverseHomeScreen({ onNavigate, selectedUniverse, onSubmit, selectedModel, onModelChange, onUniverseChange, onNewChat }) {
  const [loaded, setLoaded] = useState(false);
  const [localQuery, setLocalQuery] = useState("");
  const [inputFocused, setInputFocused] = useState(false);
  const [sendHover, setSendHover] = useState(false);
  const [chipHover, setChipHover] = useState(null);
  const universeId = selectedUniverse || "pluribus";
  // Read tile overrides from localStorage so settings editor changes apply here too
  const tileOverrides = useMemo(() => {
    try { return JSON.parse(localStorage.getItem("ut_tile_overrides") || "{}"); } catch { return {}; }
  }, []);
  const [activePathway, setActivePathway] = useState(universeId === "pluribus" ? "gilligan" : null);
  const [pathwayHover, setPathwayHover] = useState(null);

  useEffect(() => { setTimeout(() => setLoaded(true), 100); }, []);
  const universe = UNIVERSE_CONTEXT[universeId] || UNIVERSE_CONTEXT.pluribus;

  // Universe-specific gradient for the identity circle (non-Pluribus)
  const universeGradients = {
    pluribus:   "linear-gradient(160deg, #2a7a4a 0%, #35905a 100%)",
    sinners:    "linear-gradient(160deg, #8b2500 0%, #c0392b 100%)",
    bluenote:   "linear-gradient(160deg, #3b6fa0 0%, #4a82b8 100%)",
    pattismith: "linear-gradient(160deg, #a03a5a 0%, #b84a6a 100%)",
    gerwig:     "linear-gradient(160deg, #9a8040 0%, #b89850 100%)",
  };

  // Universe emoji fallbacks for non-Pluribus identity circles
  const universeEmoji = {
    sinners:    "🎵",
    bluenote:   "🎷",
    pattismith: "🎤",
    gerwig:     "🎬",
  };

  // Determine if the universe is available for queries
  const isAvailable = universeId === "pluribus" || universeId === "sinners";

  const chips = universe.suggestedQueries || [];

  const handleSubmit = (text) => {
    const queryText = text || localQuery.trim() || universe?.suggestedQueries?.[0] || "Tell me about this universe";
    if (onSubmit) onSubmit(queryText, selectedUniverse);
  };

  return (
    <div style={{ height: "100vh", background: "transparent" }}>
      <SideNav active="explore" onNavigate={onNavigate} />
      <div style={{ marginLeft: 72 }}>
        <TopNav
          onNavigate={onNavigate}
          selectedModel={selectedModel}
          onModelChange={onModelChange}
          selectedUniverse={selectedUniverse}
          onUniverseChange={onUniverseChange}
          onNewChat={onNewChat}
        />
        <div
          style={{
            height: "calc(100vh - 49px)",
            overflowY: "auto",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            padding: "60px 40px 80px",
            opacity: loaded ? 1 : 0,
            transition: "opacity 0.5s",
          }}
        >
          {/* Universe identity circle */}
          <div
            style={{
              width: 110,
              height: 110,
              borderRadius: "50%",
              marginBottom: 20,
              background: universeId === "pluribus"
                ? "linear-gradient(145deg, #ffe066, #ffce3a 40%, #f5b800)"
                : (universeGradients[universeId] || universeGradients.pluribus),
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: universeId === "pluribus"
                ? "0 8px 32px rgba(245,184,0,0.35)"
                : "0 8px 32px rgba(0,0,0,0.15)",
            }}
          >
            {universeId === "pluribus" ? (
              <>
                <span
                  style={{
                    fontSize: 16,
                    fontWeight: 800,
                    color: "#1a2744",
                    textTransform: "uppercase",
                    letterSpacing: 2,
                    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
                    lineHeight: 1.1,
                  }}
                >
                  PLURIBUS
                </span>
                <span
                  style={{
                    fontSize: 9,
                    fontWeight: 600,
                    color: "#1a2744",
                    textTransform: "uppercase",
                    letterSpacing: 1.5,
                    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
                    marginTop: 3,
                  }}
                >
                  UNIVERSE
                </span>
              </>
            ) : (
              <span style={{ fontSize: 34 }}>
                {universeEmoji[universeId] || "🌐"}
              </span>
            )}
          </div>

          {/* Universe name */}
          <div
            style={{
              fontSize: 22,
              fontWeight: 700,
              color: T.text,
              marginBottom: 10,
              textAlign: "center",
              fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
            }}
          >
            {universe.name}
          </div>

          {/* Tagline / description */}
          <div
            style={{
              fontSize: 14,
              fontWeight: 600,
              color: T.text,
              textAlign: "center",
              maxWidth: 560,
              marginBottom: isAvailable ? 28 : 16,
              lineHeight: 1.6,
              fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
            }}
          >
            {universeId === "pluribus"
              ? "Explore the Vince Gilligan Universe — powered by authorized cross-media discovery"
              : universe.description}
          </div>

          {/* Coming Soon badge for unavailable universes */}
          {!isAvailable && (
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "6px 14px",
                borderRadius: 20,
                background: T.bgElevated,
                border: `1px solid ${T.border}`,
                fontSize: 11,
                fontWeight: 700,
                color: T.textMuted,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
                marginBottom: 28,
              }}
            >
              <span style={{ fontSize: 9, color: T.gold }}>&#9679;</span>
              Coming Soon
            </div>
          )}

          {/* Pathways + contextual chips (Pluribus) or flat chips (other universes) */}
          {(() => {
            const pOv = tileOverrides[universeId]?.pathways || (universeId === "pluribus" ? tileOverrides.pluribus?.pathways : null) || {};
            const defaultPluribusPathways = [
              { id: "gilligan", emoji: "\ud83c\udfac", label: "The Vince Gilligan Universe", chips: [
                "Who made Pluribus? What else have they done?",
                "What\u2019s the relationship between Pluribus and Breaking Bad?",
                "What inspired Pluribus? What are its influences?",
                "What\u2019s all the hype? Should I watch it?",
              ]},
              { id: "cast", emoji: "\u2b50", label: "Cast & Creators", chips: [
                "Who\u2019s the lead actress? She\u2019s amazing.",
                "Why is Rhea Seehorn\u2019s Golden Globe win such a big deal?",
                "Why\u2019s Carol so mad?",
                "What\u2019s the deal with Zosia in Pluribus?",
              ]},
              { id: "deepdive", emoji: "\ud83d\udd2e", label: "Pluribus Deep Dive", chips: [
                "How did the music make Pluribus work?",
                "What\u2019s the deal with the Hive Mind?",
                "It felt so dystopian \u2014 what else is like it?",
                "Explain the ending to me!",
              ]},
            ];
            const hasOverridePathways = Object.keys(pOv).length > 0;
            const pathwayDefs = universeId === "pluribus" ? (
              hasOverridePathways ? defaultPluribusPathways.map(p => ({
                ...p,
                emoji: pOv[p.id]?.emoji !== undefined ? pOv[p.id].emoji : p.emoji,
                label: pOv[p.id]?.label !== undefined ? pOv[p.id].label : p.label,
                chips: pOv[p.id]?.chips || p.chips,
              })).concat(
                Object.entries(pOv).filter(([id]) => !["gilligan", "cast", "deepdive"].includes(id)).map(([id, p]) => ({
                  id, emoji: p.emoji || "", label: p.label || "", chips: p.chips || [],
                }))
              ) : defaultPluribusPathways
            ) : (hasOverridePathways ? Object.entries(pOv).map(([id, p]) => ({
              id, emoji: p.emoji || "", label: p.label || "", chips: p.chips || [],
            })) : null);

            if (pathwayDefs) {
              const activeChips = pathwayDefs.find(p => p.id === activePathway)?.chips || [];
              return (
                <>
                  {/* Pathway buttons */}
                  <div style={{
                    display: "flex", gap: 12, justifyContent: "center",
                    marginBottom: 28, flexWrap: "wrap", maxWidth: 700,
                  }}>
                    {pathwayDefs.map((p) => {
                      const isActive = activePathway === p.id;
                      const isHoverP = pathwayHover === p.id;
                      return (
                        <button
                          key={p.id}
                          onClick={() => setActivePathway(isActive ? null : p.id)}
                          onMouseEnter={() => setPathwayHover(p.id)}
                          onMouseLeave={() => setPathwayHover(null)}
                          style={{
                            display: "flex", alignItems: "center", gap: 8,
                            padding: "10px 20px", borderRadius: 24,
                            border: `2px solid ${isActive || isHoverP ? "#f5b800" : T.border}`,
                            background: isActive || isHoverP
                              ? "linear-gradient(180deg, #fffdf5, #fff8e8)" : "#fff",
                            fontSize: 13, fontWeight: 700, color: "#1a2744",
                            cursor: "pointer", transition: "all 0.25s", fontFamily: "inherit",
                            transform: isHoverP && !isActive ? "translateY(-2px)" : undefined,
                            boxShadow: isActive
                              ? "0 4px 16px rgba(245,184,0,0.2)"
                              : isHoverP ? "0 6px 20px rgba(245,184,0,0.2)" : undefined,
                          }}
                        >
                          <span style={{ fontSize: 18 }}>{p.emoji}</span> {p.label}
                        </button>
                      );
                    })}
                  </div>
                  {/* Starter chips — contextual per pathway */}
                  {activeChips.length > 0 && (
                    <div style={{
                      display: "flex", flexWrap: "wrap", gap: 8,
                      justifyContent: "center", maxWidth: 700,
                      marginBottom: 24, animation: "startersIn 0.3s ease",
                    }}>
                      {activeChips.map((chip, ci) => {
                        const isChipHover = chipHover === `${activePathway}-${ci}`;
                        return (
                          <div
                            key={chip}
                            onClick={() => handleSubmit(chip)}
                            onMouseEnter={() => setChipHover(`${activePathway}-${ci}`)}
                            onMouseLeave={() => setChipHover(null)}
                            style={{
                              padding: "8px 16px", background: isChipHover
                                ? "linear-gradient(180deg, #fffdf5, #fff8e8)" : "#fff",
                              border: `1px solid ${isChipHover ? "#f5b800" : T.border}`,
                              borderRadius: 20, fontSize: 12, color: "#1a2744",
                              cursor: "pointer", transition: "all 0.2s", lineHeight: 1.4,
                              transform: isChipHover ? "translateY(-1px)" : undefined,
                              boxShadow: isChipHover ? "0 3px 10px rgba(245,184,0,0.15)" : undefined,
                            }}
                          >
                            {chip}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </>
              );
            }

            // Fallback: flat chips for non-Pluribus universes
            return chips.length > 0 ? (
              <div style={{
                display: "flex", flexWrap: "wrap", gap: 8,
                justifyContent: "center", maxWidth: 700, marginBottom: 28,
              }}>
                {chips.map((chip, i) => (
                  <button
                    key={i}
                    onClick={() => isAvailable && handleSubmit(chip)}
                    onMouseEnter={() => setChipHover(i)}
                    onMouseLeave={() => setChipHover(null)}
                    disabled={!isAvailable}
                    style={{
                      padding: "8px 16px", borderRadius: 20,
                      border: `1px solid ${chipHover === i && isAvailable ? T.gold : T.border}`,
                      background: chipHover === i && isAvailable
                        ? "linear-gradient(180deg, #fffdf5, #fff8e8)" : "#fff",
                      fontSize: 12, color: isAvailable ? T.text : T.textDim,
                      cursor: isAvailable ? "pointer" : "default",
                      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
                      transition: "all 0.2s",
                      transform: chipHover === i && isAvailable ? "translateY(-1px)" : undefined,
                      boxShadow: chipHover === i && isAvailable
                        ? "0 3px 10px rgba(245,184,0,0.15)" : undefined,
                      opacity: isAvailable ? 1 : 0.5,
                    }}
                  >
                    {chip}
                  </button>
                ))}
              </div>
            ) : null;
          })()}

          {/* Search input + send button */}
          <div style={{ display: "flex", gap: 10, width: "100%", maxWidth: 600 }}>
            <input
              type="text"
              value={localQuery}
              onChange={(e) => setLocalQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && localQuery.trim() && isAvailable) handleSubmit();
              }}
              onFocus={() => setInputFocused(true)}
              onBlur={() => setInputFocused(false)}
              disabled={!isAvailable}
              placeholder={
                isAvailable
                  ? `Ask about ${universe.name}...`
                  : `${universe.name} is coming soon`
              }
              style={{
                flex: 1,
                padding: "14px 20px",
                border: `2px solid ${inputFocused && isAvailable ? T.gold : T.text}`,
                borderRadius: 12,
                fontSize: 14,
                fontWeight: 500,
                fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
                color: T.text,
                background: isAvailable ? "#fff" : T.bgElevated,
                outline: "none",
                transition: "border-color 0.2s",
                opacity: isAvailable ? 1 : 0.6,
              }}
            />
            <button
              onClick={() => { if (localQuery.trim() && isAvailable) handleSubmit(); }}
              onMouseEnter={() => setSendHover(true)}
              onMouseLeave={() => setSendHover(false)}
              disabled={!isAvailable}
              style={{
                padding: "10px 18px",
                background: isAvailable
                  ? "linear-gradient(135deg, #1a2744, #2a3a5a)"
                  : T.bgElevated,
                color: isAvailable ? "#ffce3a" : T.textDim,
                border: "none",
                borderRadius: 12,
                fontSize: 18,
                fontWeight: 700,
                cursor: isAvailable ? "pointer" : "default",
                transition: "all 0.2s",
                whiteSpace: "nowrap",
                fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
                lineHeight: 1,
                display: "flex",
                alignItems: "center",
                transform: sendHover && isAvailable ? "translateY(-1px)" : undefined,
                boxShadow: sendHover && isAvailable
                  ? "0 4px 16px rgba(26,39,68,0.3)"
                  : undefined,
                opacity: isAvailable ? 1 : 0.5,
              }}
            >
              <span style={{ display: "inline-block", transform: "scaleX(1.5)" }}>&#x2192;</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ==========================================================
//  SCREEN 3: THINKING
// ==========================================================
function ThinkingScreen({ onNavigate, query, selectedModel, onModelChange, onComplete, selectedUniverse }) {
  const [step, setStep] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [entityCount, setEntityCount] = useState(0);
  const [mediaCount, setMediaCount] = useState(0);
  const [apiError, setApiError] = useState(null);
  const [apiDone, setApiDone] = useState(false);
  const [visibleEntities, setVisibleEntities] = useState(0);
  const apiResponseRef = useRef(null);

  // Entity pills that appear one by one during graph traversal
  const entityPills = [
    { name: "Vince Gilligan", type: "CREATOR" },
    { name: "Rhea Seehorn", type: "CAST" },
    { name: "Breaking Bad", type: "TV" },
    { name: "Carol Sturka", type: "CHARACTER" },
    { name: "Dave Porter", type: "COMPOSER" },
    { name: "Better Call Saul", type: "TV" },
    { name: "The Twilight Zone", type: "INFLUENCE" },
    { name: "Zamyatin — We", type: "LITERATURE" },
    { name: "Thomas Golubić", type: "MUSIC SUP" },
    { name: "Kepler-22b", type: "REFERENCE" },
    { name: "The Borg", type: "INFLUENCE" },
    { name: "El Camino", type: "FILM" },
    { name: "UMG Catalog", type: "MUSIC" },
    { name: "Harper Collins", type: "PUBLISHING" },
  ];

  const steps = [
    { label: "Connecting to UnitedTribes Knowledge Graph", detail: "Pluribus universe loaded" },
    { label: "Scanning cross-media relationships", detail: "Film, music, books, podcasts" },
    { label: "Resolving entities", detail: "Analyzing knowledge graph..." },
    { label: "Mapping cross-media connections", detail: "Linking discoveries..." },
    { label: "Verifying source authority", detail: "All sources from authorized partnerships" },
    { label: "Generating response", detail: "Finalizing..." },
  ];

  // Step animation (advances every 900ms for steps 0-3, waits for API for step 4+)
  useEffect(() => {
    setTimeout(() => setLoaded(true), 100);
    const interval = setInterval(() => {
      setStep((prev) => {
        if (prev >= 3 && !apiDone) return prev; // Pause at step 3 until API completes
        if (prev >= steps.length - 1) {
          clearInterval(interval);
          // Navigate to response after brief delay
          setTimeout(() => {
            if (apiResponseRef.current && onComplete) {
              onComplete(apiResponseRef.current);
            } else {
              onNavigate(SCREENS.RESPONSE);
            }
          }, 600);
          return prev;
        }
        return prev + 1;
      });
    }, 900);
    return () => clearInterval(interval);
  }, [apiDone]);

  // API call — universe-scoped with relevance check
  useEffect(() => {
    const rawQuery = query || "Who created Pluribus and what inspired it?";
    const model = selectedModel || DEFAULT_MODEL;
    const universeId = selectedUniverse || "pluribus";
    const universe = UNIVERSE_CONTEXT[universeId] || UNIVERSE_CONTEXT.pluribus;

    // Check if the query is relevant to the active universe
    if (!isQueryRelevantToUniverse(rawQuery, universeId)) {
      apiResponseRef.current = buildUniverseRedirectResponse(universeId);
      setApiDone(true);
      return;
    }

    // Frame the query within the active universe
    const queryText = `You are answering questions about the ${universe.name} universe (${universe.description}). Focus your answer on ${universe.scope}.\n\nUser question: ${rawQuery}`;

    fetch(`${API_BASE}${model.endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: queryText }),
    })
      .then((res) => {
        if (!res.ok) throw new Error(`API returned ${res.status}`);
        return res.json();
      })
      .then((data) => {
        apiResponseRef.current = data;
        // Update step details with real data
        const entCount = data.insights?.entities_explored?.length || data.connections?.direct_connections?.length || 0;
        const relCount = data.metadata?.relationships_analyzed || 0;
        if (entCount > 0) {
          steps[2].detail = `${entCount} verified entities found`;
        }
        if (relCount > 0) {
          steps[3].detail = `${relCount} relationships analyzed`;
        }
        setApiDone(true);
      })
      .catch((err) => {
        console.error("Broker API error:", err);
        setApiError(err.message);
        // Still navigate to response, just without API data
        setApiDone(true);
      });
  }, []);

  useEffect(() => {
    if (step >= 2) {
      const target = apiResponseRef.current?.insights?.entities_explored?.length || apiResponseRef.current?.connections?.direct_connections?.length || 16;
      let c = 0;
      const i = setInterval(() => { c++; setEntityCount(Math.min(c, target)); if (c >= target) clearInterval(i); }, 50);
      return () => clearInterval(i);
    }
  }, [step >= 2]);

  useEffect(() => {
    if (step >= 3) {
      let c = 0;
      const i = setInterval(() => { c++; setMediaCount(Math.min(c, 4)); if (c >= 4) clearInterval(i); }, 150);
      return () => clearInterval(i);
    }
  }, [step >= 3]);

  // Stagger entity pills — start at step 2, reveal one every 500ms
  useEffect(() => {
    if (step >= 2) {
      const interval = setInterval(() => {
        setVisibleEntities(prev => {
          if (prev >= entityPills.length) { clearInterval(interval); return prev; }
          return prev + 1;
        });
      }, 500);
      return () => clearInterval(interval);
    }
  }, [step >= 2]);

  return (
    <div style={{ minHeight: "100vh", background: "transparent" }}>
      <SideNav active="explore" onNavigate={onNavigate} />
      <div style={{ marginLeft: 72 }}>
        <TopNav onNavigate={onNavigate} selectedModel={selectedModel} onModelChange={onModelChange} />

        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "flex-start",
            padding: "20px 40px 20px",
            maxWidth: 740,
            margin: "0 auto",
            opacity: loaded ? 1 : 0,
            transition: "opacity 0.4s",
          }}
        >
          {/* Query bubble — matches ResponseScreen style */}
          <div style={{ width: "100%", maxWidth: 740, display: "flex", justifyContent: "flex-end", marginBottom: 16 }}>
            <div
              style={{
                background: "#fcfbf9",
                color: "#1a2744",
                fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
                fontSize: 15,
                fontWeight: 600,
                lineHeight: 1.5,
                padding: "10px 16px",
                borderRadius: "18px 18px 4px 18px",
                maxWidth: "75%",
              }}
            >
              {query || "Who created Pluribus and what inspired it?"}
            </div>
          </div>

          {/* Error state with retry */}
          {apiError && (
            <div style={{ marginBottom: 20, textAlign: "center" }}>
              <div style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", fontSize: 13, color: "#c0392b", marginBottom: 8 }}>
                API Error: {apiError}
              </div>
              <button
                onClick={() => { setApiError(null); setApiDone(false); setStep(0); }}
                style={{
                  fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", fontSize: 13, fontWeight: 600,
                  color: "#fff", background: T.blue, border: "none",
                  padding: "8px 20px", borderRadius: 8, cursor: "pointer",
                }}
              >
                Retry
              </button>
            </div>
          )}

          {/* Thinking card */}
          <div
            style={{
              background: T.bgCard,
              border: `1px solid ${T.border}`,
              borderRadius: 14,
              padding: "18px 28px",
              maxWidth: 520,
              width: "100%",
              boxShadow: T.shadow,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
              <div
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: "50%",
                  background: T.gold,
                  animation: "pulse 1.2s infinite",
                }}
              />
              <span
                style={{
                  fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
                  fontSize: 14,
                  fontWeight: 600,
                  color: T.text,
                  letterSpacing: "0.04em",
                  textTransform: "uppercase",
                }}
              >
                Enhanced Discovery
              </span>
            </div>

            <div
              style={{
                height: 3,
                background: T.bgElevated,
                borderRadius: 2,
                marginBottom: 14,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  height: "100%",
                  background: `linear-gradient(90deg, ${T.blue}, ${T.blueDark})`,
                  borderRadius: 2,
                  width: `${((step + 1) / steps.length) * 100}%`,
                  transition: "width 0.6s cubic-bezier(0.16,1,0.3,1)",
                }}
              />
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {steps.map((s, i) => {
                const isVisible = i <= step;
                const isCurrent = i === step;
                const isComplete = i < step;
                return (
                  <div
                    key={i}
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: 12,
                      opacity: isVisible ? 1 : 0,
                      transform: isVisible ? "translateY(0)" : "translateY(8px)",
                      transition: "all 0.4s cubic-bezier(0.16,1,0.3,1)",
                    }}
                  >
                    <div
                      style={{
                        width: 20,
                        height: 20,
                        borderRadius: "50%",
                        background: isComplete ? T.goldBg : isCurrent ? "rgba(26,39,68,0.08)" : T.bgElevated,
                        border: `1.5px solid ${isComplete ? T.gold : isCurrent ? "#1a2744" : T.border}`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 10,
                        color: isComplete ? T.gold : "#1a2744",
                        flexShrink: 0,
                        marginTop: 1,
                        transition: "all 0.3s",
                      }}
                    >
                      {isComplete ? "✓" : isCurrent ? "●" : ""}
                    </div>
                    <div>
                      <div
                        style={{
                          fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
                          fontSize: 13.5,
                          color: isCurrent ? T.text : isComplete ? T.textMuted : T.textDim,
                          fontWeight: isCurrent ? 500 : 400,
                        }}
                      >
                        {s.label}
                      </div>
                      {isVisible && (
                        <div
                          style={{
                            fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
                            fontSize: 11.5,
                            color: isComplete ? T.textDim : "#1a2744",
                            marginTop: 2,
                          }}
                        >
                          {s.detail}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Counters */}
          <div
            style={{
              display: "flex",
              gap: 24,
              marginTop: 16,
              opacity: step >= 2 ? 1 : 0,
              transition: "opacity 0.4s",
            }}
          >
            {[
              { label: "Discoveries", value: entityCount, color: "#1a2744" },
              { label: "Media Types", value: mediaCount, color: "#1a2744" },
              { label: "Confidence", value: step >= 5 ? "94%" : "—", color: T.gold },
            ].map((stat) => (
              <div
                key={stat.label}
                style={{
                  background: T.bgCard,
                  border: `1px solid ${T.border}`,
                  borderRadius: 12,
                  padding: "10px 18px",
                  textAlign: "center",
                  minWidth: 120,
                  boxShadow: T.shadow,
                }}
              >
                <div
                  style={{
                    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
                    fontSize: 22,
                    fontWeight: 700,
                    color: stat.color,
                    lineHeight: 1,
                  }}
                >
                  {stat.value}
                </div>
                <div
                  style={{
                    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
                    fontSize: 10,
                    fontWeight: 600,
                    color: T.textDim,
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                    marginTop: 3,
                  }}
                >
                  {stat.label}
                </div>
              </div>
            ))}
          </div>

          <div
            style={{
              marginTop: 10,
              fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
              fontSize: 11,
              color: T.textDim,
              display: "flex",
              alignItems: "center",
              gap: 6,
              opacity: step >= 4 ? 1 : 0,
              transition: "opacity 0.4s",
            }}
          >
            <span style={{ color: T.green }}>●</span>
            All data from authorized content partnerships
          </div>

          {/* Entity discovery pills — staggered appearance */}
          {step >= 2 && (
            <div style={{
              display: "flex", flexWrap: "wrap", gap: 8,
              justifyContent: "center", maxWidth: 520,
              marginTop: 12, padding: "0 8px",
            }}>
              {entityPills.slice(0, visibleEntities).map((ent, i) => {
                const typeColors = {
                  CREATOR: T.gold, CAST: "#2563eb", TV: "#16803c", CHARACTER: "#7c3aed",
                  COMPOSER: "#ea580c", INFLUENCE: "#6366f1", LITERATURE: "#be185d",
                  "MUSIC SUP": "#0891b2", REFERENCE: "#dc2626", FILM: "#16803c",
                  MUSIC: "#8b5cf6", PUBLISHING: "#9f1239",
                };
                return (
                  <div
                    key={ent.name}
                    style={{
                      display: "inline-flex", alignItems: "center", gap: 6,
                      padding: "4px 10px",
                      background: "#fff",
                      border: `1px solid ${T.border}`,
                      borderRadius: 16,
                      fontSize: 11.5, fontWeight: 500,
                      color: T.text,
                      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
                      animation: "slideUp 0.35s ease-out",
                      boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
                    }}
                  >
                    <span style={{
                      fontSize: 8, fontWeight: 700, color: typeColors[ent.type] || T.textMuted,
                      textTransform: "uppercase", letterSpacing: "0.04em",
                      fontFamily: "'DM Mono', monospace",
                    }}>
                      {ent.type}
                    </span>
                    {ent.name}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


// ==========================================================
//  SHARED: Discovery Card (dark, media-rich)
// ==========================================================
function DiscoveryCard({ type, typeBadgeColor, title, meta, context, platform, platformColor, price, icon, spoiler, spoilerFree, library, toggleLibrary, onCardClick, video_id, spotify_url, spotify_id, album_id, timecode_url, timestamp, seconds, thumbnail, photoUrl, posterUrl }) {
  const isLocked = spoiler && spoilerFree;
  const inLibrary = library && library.has(title);

  const handleClick = () => {
    if (isLocked || !onCardClick) return;
    onCardClick({ type, title, meta, context, platform, platformColor, price, icon, video_id, spotify_url, spotify_id, album_id, timecode_url, timestamp, seconds });
  };

  const hasImage = !!(thumbnail || photoUrl || posterUrl);
  const imgSrc = thumbnail || photoUrl || posterUrl;

  return (
    <div
      onClick={handleClick}
      style={{
        minWidth: 165,
        maxWidth: 185,
        flexShrink: 0,
        boxSizing: "border-box",
        background: T.queryBg,
        borderRadius: 10,
        overflow: "hidden",
        cursor: isLocked ? "default" : "pointer",
        transition: "transform 0.2s, box-shadow 0.2s, border-color 0.2s",
        border: inLibrary && !isLocked ? `1.5px solid ${T.blue}66` : "1.5px solid rgba(255,255,255,0.06)",
        position: "relative",
      }}
    >
      {/* Spoiler lock overlay */}
      {isLocked && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 3,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(26,32,44,0.85)",
            backdropFilter: "blur(8px)",
            borderRadius: 10,
          }}
        >
          <div style={{ fontSize: 18, marginBottom: 4, opacity: 0.7 }}>🔒</div>
          <div style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", fontSize: 10, fontWeight: 600, color: "rgba(255,255,255,0.6)", textAlign: "center", padding: "0 12px", lineHeight: 1.4 }}>
            Finish S1 to unlock
          </div>
        </div>
      )}

      {/* Image area */}
      <div
        style={{
          height: hasImage ? 180 : 105,
          background: hasImage
            ? `url(${imgSrc}) top center/cover no-repeat`
            : `linear-gradient(135deg, ${T.queryBg}, #2a3548)`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
          fontSize: 34,
          opacity: isLocked ? 0.3 : 1,
          filter: isLocked ? "blur(3px)" : "none",
          transition: "all 0.3s",
        }}
      >
        {!hasImage && icon}
        {hasImage && (
          <div style={{
            position: "absolute", inset: 0,
            background: "linear-gradient(to bottom, rgba(0,0,0,0.05) 0%, rgba(0,0,0,0.25) 100%)",
          }} />
        )}
        {/* Category badge */}
        <div
          style={{
            position: "absolute",
            top: 10,
            left: 10,
            background: typeBadgeColor || T.blue,
            color: "#fff",
            fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
            fontSize: 8.5,
            fontWeight: 700,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            padding: "3px 8px",
            borderRadius: 4,
            zIndex: 1,
          }}
        >
          {type}
        </div>
        {/* Spoiler badge */}
        {spoiler && !spoilerFree && (
          <div style={{ position: "absolute", top: 10, right: 10, fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", fontSize: 8.5, fontWeight: 700, color: "rgba(255,255,255,0.5)", background: "rgba(255,255,255,0.1)", padding: "3px 8px", borderRadius: 4, textTransform: "uppercase", letterSpacing: "0.05em", zIndex: 2 }}>
            S1
          </div>
        )}
      </div>

      {/* Info footer — below image */}
      <div
        style={{
          padding: "8px 10px",
          filter: isLocked ? "blur(4px)" : "none",
          opacity: isLocked ? 0.3 : 1,
          transition: "all 0.3s",
        }}
      >
        <div style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", fontSize: 11, fontWeight: 700, color: "#fff", lineHeight: 1.3, marginBottom: 2 }}>
          {title}
        </div>
        <div style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", fontSize: 9, color: "rgba(255,255,255,0.5)", marginBottom: context ? 4 : 6 }}>
          {meta}
        </div>
        {context && (
          <div style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", fontSize: 10, fontStyle: "italic", color: "rgba(255,255,255,0.65)", lineHeight: 1.35, marginBottom: 6, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
            {context}
          </div>
        )}
        <div style={{ display: "flex", gap: 5, alignItems: "center" }}>
          {platform && (
            <span style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", fontSize: 8, fontWeight: 700, color: "#fff", background: platformColor || T.blue, padding: "2px 6px", borderRadius: 4 }}>
              {platform}
            </span>
          )}
          {price && (
            <span style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", fontSize: 8, fontWeight: 700, color: "#fff", background: "#f5b800", padding: "2px 6px", borderRadius: 4 }}>
              {price}
            </span>
          )}
        </div>
      </div>

      {/* Add to library button */}
      {toggleLibrary && !isLocked && (
        <div
          onClick={(e) => { e.stopPropagation(); toggleLibrary(title); }}
          style={{
            position: "absolute",
            bottom: 8,
            right: 8,
            width: 20,
            height: 20,
            borderRadius: 5,
            background: inLibrary ? T.blue : "rgba(255,255,255,0.1)",
            border: inLibrary ? "none" : "1px solid rgba(255,255,255,0.15)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            transition: "all 0.2s",
            zIndex: 2,
            fontSize: 11,
            color: inLibrary ? "#fff" : "rgba(255,255,255,0.5)",
            fontWeight: 700,
          }}
        >
          {inLibrary ? "✓" : "+"}
        </div>
      )}
    </div>
  );
}

// ==========================================================
//  SHARED: AI-Curated Discovery Header
// ==========================================================
function AICuratedHeader({ subtitle }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 22 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <div style={{ width: 4, minHeight: subtitle ? 40 : 32, borderRadius: 2, background: "#c0392b", flexShrink: 0 }} />
        <div>
          <h2 style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", fontSize: 22, fontWeight: 700, color: T.text, margin: 0 }}>
            AI-Curated Discovery
          </h2>
          {subtitle && (
            <p style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", fontSize: 13, fontStyle: "italic", color: T.textMuted, margin: "3px 0 0", lineHeight: 1.3 }}>
              {subtitle}
            </p>
          )}
        </div>
      </div>
      <div
        style={{
          fontSize: 9.5, fontWeight: 800,
          textTransform: "uppercase", letterSpacing: "1px",
          background: "linear-gradient(135deg, #fffdf5, #fff8e8)",
          border: "1.5px solid #ffce3a", borderRadius: 12, padding: "4px 12px",
        }}
      >
        <span style={{ color: "#000", fontWeight: 600 }}>POWERED BY </span><span style={{ color: "#000", fontWeight: 900 }}>UNITED</span><span style={{ color: "#f5b800", fontWeight: 900 }}>TRIBES</span>
      </div>
    </div>
  );
}

// ==========================================================
//  SHARED: Song Tile (for episode music section)
// ==========================================================
function SongTile({ title, artist, isPlaying, onPlay, artColor }) {
  return (
    <div
      onClick={onPlay}
      style={{
        display: "flex", alignItems: "center", gap: 12,
        padding: "10px 14px", background: isPlaying ? T.queryBg : T.bgCard,
        border: `1px solid ${isPlaying ? "rgba(255,255,255,0.1)" : T.border}`,
        borderRadius: 10, cursor: "pointer", transition: "all 0.2s", minWidth: 0,
      }}
    >
      <div
        style={{
          width: 42, height: 42, borderRadius: 6, flexShrink: 0,
          background: artColor || "linear-gradient(135deg, #1a2744, #2a3a5a)",
          display: "flex", alignItems: "center", justifyContent: "center",
          position: "relative", fontSize: 18,
        }}
      >
        🎵
        <div style={{
          position: "absolute", bottom: -2, right: -2, width: 14, height: 14, borderRadius: "50%",
          background: "#c0392b", border: "2px solid #fff",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 7, color: "#fff",
        }}>
          ▶
        </div>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", fontSize: 13, fontWeight: 700, color: isPlaying ? "#fff" : T.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {title}
        </div>
        <div style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", fontSize: 11.5, color: isPlaying ? "rgba(255,255,255,0.5)" : T.textMuted }}>
          {artist}
        </div>
      </div>
      <div
        style={{
          width: 30, height: 30, borderRadius: "50%",
          background: "#16803c", color: "#fff",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 11, flexShrink: 0,
        }}
      >
        ▶
      </div>
    </div>
  );
}

// ==========================================================
//  SHARED: Now Playing Bar (expandable with scrub + skip)
// ==========================================================
function NowPlayingBar({ song, artist, context, timestamp, spotifyUrl, videoId, onClose, onNext, onPrev, onWatchVideo, library, toggleLibrary }) {
  const [expanded, setExpanded] = useState(false);
  const [progress, setProgress] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [playerMode, setPlayerMode] = useState('youtube'); // 'youtube' | 'spotify'
  const progressRef = useRef(null);

  // YouTube embed URL with autoplay
  const youtubeEmbedUrl = useMemo(() => {
    if (!videoId) return null;
    return `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1`;
  }, [videoId]);

  // Spotify embed URL
  const spotifyEmbedUrl = useMemo(() => {
    if (!spotifyUrl) return null;
    const match = spotifyUrl.match(/open\.spotify\.com\/(track|album)\/([a-zA-Z0-9]+)/);
    if (match) return `https://open.spotify.com/embed/${match[1]}/${match[2]}?utm_source=generator&theme=0`;
    return null;
  }, [spotifyUrl]);

  const hasEmbed = playerMode === 'spotify' ? !!spotifyEmbedUrl : !!youtubeEmbedUrl;

  // Simulate playback progress (only when no embed active)
  useEffect(() => {
    if (!playing || !song || hasEmbed) return;
    const interval = setInterval(() => {
      setProgress(p => p >= 100 ? 0 : p + 0.3);
    }, 100);
    return () => clearInterval(interval);
  }, [playing, song, hasEmbed]);

  // Reset on song change — default to YouTube
  useEffect(() => {
    setProgress(0);
    setPlaying(true);
    setPlayerMode('youtube');
  }, [song]);

  if (!song) return null;

  const handleScrub = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
    setProgress(pct);
  };

  return (
    <div
      style={{
        position: "fixed", bottom: 60, left: 68, right: 0,
        background: T.queryBg, zIndex: 50,
        transition: "all 0.3s ease",
      }}
    >
      {/* Embed area — YouTube (default, autoplay) or Spotify (on toggle) */}
      {playerMode === 'youtube' && youtubeEmbedUrl && (
        <div style={{ padding: "8px 20px 4px", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
          <iframe
            src={youtubeEmbedUrl}
            width="270"
            height="152"
            frameBorder="0"
            allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
            title={`Now playing: ${song} by ${artist}`}
            style={{ borderRadius: 8 }}
          />
        </div>
      )}
      {playerMode === 'spotify' && spotifyEmbedUrl && (
        <div style={{ padding: "8px 20px 4px", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
          <iframe
            src={spotifyEmbedUrl}
            width="100%"
            height="152"
            frameBorder="0"
            allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
            title={`Spotify: ${song} by ${artist}`}
            style={{ borderRadius: 8 }}
          />
        </div>
      )}

      {/* Scrub bar (fallback when no embed active) */}
      {!hasEmbed && (
        <div
          onClick={handleScrub}
          style={{
            height: 3, background: "rgba(255,255,255,0.1)", cursor: "pointer",
            position: "relative",
          }}
        >
          <div style={{
            height: "100%", background: "#16803c", width: `${progress}%`,
            transition: "width 0.1s linear", borderRadius: "0 1.5px 1.5px 0",
          }} />
          <div style={{
            position: "absolute", top: -4, left: `${progress}%`, width: 10, height: 10,
            borderRadius: "50%", background: "#16803c", transform: "translateX(-50%)",
            boxShadow: "0 0 4px rgba(22,128,60,0.5)", opacity: 0.9,
          }} />
        </div>
      )}

      {/* Main controls row */}
      <div
        style={{
          height: 52, display: "flex",
          alignItems: "center", justifyContent: "space-between",
          padding: "0 20px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: playerMode === 'spotify' ? "#1db954" : youtubeEmbedUrl ? "#ff0000" : "#16803c" }} />

          {/* Skip / play controls — only show when no real embed is active */}
          {!hasEmbed && (
            <div style={{ display: "flex", alignItems: "center", gap: 4, marginRight: 4 }}>
              <button
                onClick={(e) => { e.stopPropagation(); onPrev && onPrev(); }}
                style={{
                  background: "none", border: "none", color: "rgba(255,255,255,0.5)",
                  cursor: "pointer", fontSize: 11, padding: "4px 6px",
                }}
              >
                ⏮
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); setPlaying(!playing); }}
                style={{
                  background: "none", border: "none", color: "#fff",
                  cursor: "pointer", fontSize: 14, padding: "4px 6px",
                }}
              >
                {playing ? "⏸" : "▶"}
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onNext && onNext(); }}
                style={{
                  background: "none", border: "none", color: "rgba(255,255,255,0.5)",
                  cursor: "pointer", fontSize: 11, padding: "4px 6px",
                }}
              >
                ⏭
              </button>
            </div>
          )}

          <span style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", fontSize: 13.5, fontWeight: 700, color: "#fff" }}>
            {song}
          </span>
          <span style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", fontSize: 13, color: T.blue, fontWeight: 500 }}>
            · {artist}
          </span>
          {toggleLibrary && (() => {
            const saveKey = `${song} — ${artist}`;
            const inLib = library && library.has(saveKey);
            return (
              <div onClick={(e) => { e.stopPropagation(); toggleLibrary(saveKey); }} style={{
                width: 22, height: 22, borderRadius: 6, marginLeft: 4,
                background: inLib ? T.blue : "rgba(255,255,255,0.1)",
                border: `1px solid ${inLib ? T.blue : "rgba(255,255,255,0.15)"}`,
                display: "flex", alignItems: "center", justifyContent: "center",
                cursor: "pointer", transition: "all 0.2s",
                fontSize: 12, color: inLib ? "#fff" : "rgba(255,255,255,0.5)", fontWeight: 700,
              }}>
                {inLib ? "✓" : "+"}
              </div>
            );
          })()}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {spotifyEmbedUrl && (
            <button
              onClick={() => setPlayerMode(playerMode === 'spotify' ? 'youtube' : 'spotify')}
              style={{
                fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", fontSize: 11.5, fontWeight: 700,
                color: "#fff", background: playerMode === 'spotify' ? "#1db954" : "rgba(255,255,255,0.12)",
                border: "none", padding: "6px 14px", borderRadius: 8, cursor: "pointer",
                display: "flex", alignItems: "center", gap: 6,
              }}
            >
              {playerMode === 'spotify' ? "♪ Spotify" : "♪ Switch to Spotify"}
            </button>
          )}
          <button
            onClick={() => setExpanded(!expanded)}
            style={{
              fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", fontSize: 11.5, fontWeight: 700,
              color: "#fff", background: expanded ? "rgba(255,255,255,0.18)" : "rgba(255,255,255,0.12)",
              border: "none", padding: "6px 14px", borderRadius: 8, cursor: "pointer",
              display: "flex", alignItems: "center", gap: 6,
            }}
          >
            📋 How it's used
          </button>
          <button
            onClick={() => onWatchVideo && onWatchVideo()}
            style={{
              fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", fontSize: 11.5, fontWeight: 700,
              color: "#fff", background: "rgba(255,255,255,0.12)",
              border: "none", padding: "6px 14px", borderRadius: 8, cursor: "pointer",
              display: "flex", alignItems: "center", gap: 6,
            }}
          >
            ▶ Watch Video
          </button>
          <span style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", fontSize: 10.5, fontWeight: 600, color: "rgba(255,255,255,0.35)", marginLeft: 4 }}>
            via UMG
          </span>
          <button
            onClick={onClose}
            style={{
              background: "none", border: "none", color: "rgba(255,255,255,0.4)",
              cursor: "pointer", fontSize: 16, marginLeft: 4,
            }}
          >
            ×
          </button>
        </div>
      </div>

      {/* Expanded: IN THE EPISODE context */}
      {expanded && context && (
        <div style={{ padding: "0 20px 16px", borderTop: "1px solid rgba(255,255,255,0.08)" }}>
          <div style={{
            fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", fontSize: 9.5, fontWeight: 700,
            color: "#c0392b", textTransform: "uppercase", letterSpacing: "0.08em",
            marginTop: 12, marginBottom: 8,
          }}>
            IN THE EPISODE
          </div>
          <div style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", fontSize: 13.5, color: "rgba(255,255,255,0.75)", lineHeight: 1.6 }}>
            {context}
            {timestamp && (
              <span
                onClick={() => onWatchVideo && onWatchVideo()}
                style={{ color: "#16803c", fontWeight: 600, marginLeft: 2, cursor: "pointer" }}
              >
                ⏱ {timestamp} Watch the scene →
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ==========================================================
//  SHARED: Video Modal
// ==========================================================
function VideoModal({ title, subtitle, videoId, timecodeUrl, onClose }) {
  if (!title) return null;
  // Build embed URL: use timecode start time if available
  let embedUrl = null;
  if (videoId) {
    let startParam = "";
    if (timecodeUrl) {
      const tMatch = timecodeUrl.match(/[?&]t=(\d+)/);
      if (tMatch) startParam = `&start=${tMatch[1]}`;
    }
    embedUrl = `https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1&autoplay=1${startParam}`;
  }
  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 100,
        background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 640, background: T.queryBg, borderRadius: 14,
          overflow: "hidden", boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
        }}
      >
        {/* Header */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "14px 18px",
        }}>
          <span style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", fontSize: 15, fontWeight: 700, color: "#fff", flex: 1, marginRight: 12 }}>
            {title}{subtitle ? ` — ${subtitle}` : ""}
          </span>
          <button
            onClick={onClose}
            style={{
              background: "none", border: "none", color: "rgba(255,255,255,0.5)",
              cursor: "pointer", fontSize: 20, lineHeight: 1, flexShrink: 0,
            }}
          >
            ×
          </button>
        </div>

        {/* Video area */}
        {embedUrl ? (
          <div style={{ width: "100%", aspectRatio: "16/9", background: "#000" }}>
            <iframe
              src={embedUrl}
              width="100%"
              height="100%"
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              title={title}
              style={{ border: "none" }}
            />
          </div>
        ) : (
          <div
            style={{
              width: "100%", aspectRatio: "16/9", background: "#000",
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer",
            }}
          >
            <div
              style={{
                width: 64, height: 64, borderRadius: "50%",
                background: "rgba(255,255,255,0.15)", backdropFilter: "blur(8px)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 24, color: "#fff",
                border: "2px solid rgba(255,255,255,0.2)",
              }}
            >
              ▶
            </div>
          </div>
        )}

        {/* Footer */}
        <div style={{
          padding: "12px 18px",
          fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", fontSize: 12, color: "rgba(255,255,255,0.45)",
        }}>
          {videoId ? "via YouTube · Powered by UnitedTribes Knowledge Graph" : "Video not available · Placeholder"}
        </div>
      </div>
    </div>
  );
}

// ==========================================================
//  SHARED: Entity Popover (floating card on entity click)
// ==========================================================

function getEntityTypeBadge(type, subtitle) {
  const sub = (subtitle || "").toLowerCase();
  if (type === "character") return { label: "CHARACTER", bg: "#dc2626" };
  if (type === "theme") return { label: "THEME", bg: "#b8860b" };
  if (type === "show") return { label: "TV SERIES", bg: "#16803c" };
  if (type === "film" && sub.includes("tv episode")) return { label: "EPISODE", bg: "#7c3aed" };
  if (type === "film") return { label: "FILM", bg: "#7c3aed" };
  if (type === "person" && sub.includes("creator")) return { label: "CREATOR", bg: "#2563eb" };
  if (type === "person" && sub.includes("composer")) return { label: "COMPOSER", bg: "#6366f1" };
  if (type === "person" && sub.includes("crew")) return { label: "CREW", bg: "#475569" };
  if (type === "person" && sub.includes("actor")) return { label: "ACTOR", bg: "#1a2744" };
  if (type === "person") return { label: "PERSON", bg: "#1a2744" };
  return { label: (type || "ENTITY").toUpperCase(), bg: "#475569" };
}

function getPopoverMedia(data) {
  const videos = [];
  // First try quickViewGroups
  for (const g of (data.quickViewGroups || [])) {
    for (const item of (g.items || [])) {
      if (item.video_id && videos.length < 2) {
        videos.push(item);
      }
    }
  }
  // Fallback to interviews
  if (videos.length < 2) {
    for (const item of (data.interviews || [])) {
      if (item.video_id && videos.length < 2 && !videos.find(v => v.video_id === item.video_id)) {
        videos.push(item);
      }
    }
  }
  return videos;
}

function PopoverVideoCard({ video }) {
  const F = "'DM Sans', sans-serif";
  return (
    <div style={{
      display: "flex", gap: 10, padding: "8px 0", cursor: "pointer",
    }} onClick={() => window.open(`https://www.youtube.com/watch?v=${video.video_id}`, "_blank")}>
      <div style={{
        width: 110, height: 62, borderRadius: 6, overflow: "hidden",
        background: "#000", flexShrink: 0, position: "relative",
      }}>
        {video.thumbnail ? (
          <img src={video.thumbnail} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        ) : (
          <div style={{ width: "100%", height: "100%", background: "#1a1a2e" }} />
        )}
        {/* Play circle */}
        <div style={{
          position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)",
          width: 28, height: 28, borderRadius: "50%", background: "rgba(255,0,0,0.85)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <span style={{ fontSize: 11, color: "#fff", marginLeft: 2 }}>▶</span>
        </div>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontFamily: F, fontSize: 12, fontWeight: 600, color: T.text, lineHeight: 1.4,
          display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden",
        }}>
          {(video.title || "Video").replace(/&quot;/g, '"').replace(/&amp;/g, "&")}
        </div>
        {video.meta && (
          <div style={{ fontFamily: F, fontSize: 11, color: T.textDim, marginTop: 3 }}>{video.meta}</div>
        )}
      </div>
    </div>
  );
}

function PopoverAskInput({ entityName, onAsk }) {
  const [value, setValue] = useState("");
  const F = "'DM Sans', sans-serif";
  return (
    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
      <input
        value={value}
        onChange={e => setValue(e.target.value)}
        onKeyDown={e => { if (e.key === "Enter" && value.trim()) { onAsk(value.trim()); setValue(""); } }}
        placeholder={`Ask more about ${entityName}...`}
        style={{
          flex: 1, fontFamily: F, fontSize: 13, color: T.text,
          background: T.bgElevated, border: `1px solid ${T.border}`, borderRadius: 8,
          padding: "8px 12px", outline: "none",
        }}
      />
      <button
        onClick={() => { if (value.trim()) { onAsk(value.trim()); setValue(""); } }}
        style={{
          width: 34, height: 34, borderRadius: 8, border: "none",
          background: T.gold, color: "#fff", cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 14, fontWeight: 700, flexShrink: 0,
        }}
      >
        ›
      </button>
    </div>
  );
}

function EntityPopover({ entityKey, entityData, anchorRect, onClose, onAsk }) {
  const popoverRef = useRef(null);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const F = "'DM Sans', sans-serif";

  // Position calculation
  useEffect(() => {
    if (!anchorRect || !popoverRef.current) return;
    const popW = 520;
    const popH = popoverRef.current.offsetHeight || 420;
    const pad = 12;
    let top = anchorRect.bottom + 8;
    let left = anchorRect.left;

    // Flip above if near bottom
    if (top + popH > window.innerHeight - pad) {
      top = anchorRect.top - popH - 8;
    }
    // Shift left if near right edge
    if (left + popW > window.innerWidth - pad) {
      left = window.innerWidth - popW - pad;
    }
    // Don't go off left edge
    if (left < pad) left = pad;
    // Don't go off top
    if (top < pad) top = pad;

    setPos({ top, left });
  }, [anchorRect]);

  // Close on Escape, click outside, scroll
  useEffect(() => {
    const handleKey = (e) => { if (e.key === "Escape") onClose(); };
    const handleClick = (e) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target)) onClose();
    };
    const handleScroll = () => onClose();
    document.addEventListener("keydown", handleKey);
    // Delay click listener to avoid closing from the triggering click
    const clickTimer = setTimeout(() => document.addEventListener("mousedown", handleClick), 50);
    // Listen for scroll on capture to catch scrollable parents
    document.addEventListener("scroll", handleScroll, true);
    return () => {
      document.removeEventListener("keydown", handleKey);
      clearTimeout(clickTimer);
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("scroll", handleScroll, true);
    };
  }, [onClose]);

  if (!entityData || !anchorRect) return null;

  const badge = getEntityTypeBadge(entityData.type, entityData.subtitle);
  const videos = getPopoverMedia(entityData);
  const photoUrl = entityData.photoUrl || entityData.posterUrl;
  const bio = (entityData.bio || []).filter(p => p && p !== "No biography available.").join(" ");
  const displayName = entityKey;

  const popoverContent = (
    <div
      ref={popoverRef}
      style={{
        position: "fixed",
        top: pos.top,
        left: pos.left,
        width: 520,
        background: T.bgCard,
        borderRadius: 14,
        boxShadow: "0 12px 48px rgba(0,0,0,0.18), 0 2px 8px rgba(0,0,0,0.08)",
        border: `1px solid ${T.border}`,
        zIndex: 95,
        overflow: "hidden",
        animation: "popoverFadeIn 0.15s ease-out",
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <style>{`@keyframes popoverFadeIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }`}</style>

      {/* Top section: photo + name + bio */}
      <div style={{ display: "flex", gap: 16, padding: "18px 20px 14px" }}>
        {/* Photo */}
        <div style={{
          width: 100, height: 100, borderRadius: 10, overflow: "hidden",
          flexShrink: 0, background: entityData.avatarGradient || T.bgElevated,
          position: "relative",
        }}>
          {photoUrl ? (
            <img src={photoUrl} alt={displayName} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          ) : (
            <div style={{
              width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 36, color: "rgba(255,255,255,0.7)", background: entityData.avatarGradient || "linear-gradient(135deg, #2a4a6a, #1a2744)",
            }}>
              {entityData.emoji || "◆"}
            </div>
          )}
          {/* Type badge overlay */}
          <div style={{
            position: "absolute", bottom: 6, left: 6,
            fontFamily: "'DM Mono', monospace", fontSize: 9, fontWeight: 700,
            color: "#fff", background: badge.bg,
            padding: "2px 7px", borderRadius: 4, letterSpacing: "0.5px",
          }}>
            {badge.label}
          </div>
        </div>

        {/* Name + subtitle + bio */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ fontFamily: F, fontSize: 18, fontWeight: 700, color: T.text, lineHeight: 1.3 }}>
              {displayName}
            </div>
            <button
              onClick={onClose}
              style={{
                background: "none", border: "none", color: T.textDim,
                cursor: "pointer", fontSize: 18, lineHeight: 1, flexShrink: 0,
                padding: "0 0 0 8px",
              }}
            >
              ×
            </button>
          </div>
          {entityData.subtitle && (
            <div style={{
              fontFamily: F, fontSize: 12, color: T.textMuted, marginTop: 3,
              whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
            }}>
              {entityData.subtitle}
            </div>
          )}
          {bio && (
            <div style={{
              fontFamily: F, fontSize: 13, color: T.textMuted, lineHeight: 1.6,
              marginTop: 8,
              display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden",
            }}>
              {bio}
            </div>
          )}
        </div>
      </div>

      {/* Videos section */}
      {videos.length > 0 && (
        <div style={{ padding: "0 20px 14px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <div style={{ width: 3, height: 16, borderRadius: 2, background: T.gold }} />
            <span style={{
              fontFamily: "'DM Mono', monospace", fontSize: 10, fontWeight: 600,
              color: T.textDim, letterSpacing: "0.8px",
            }}>
              FROM THE KNOWLEDGE GRAPH
            </span>
          </div>
          {videos.map((v, i) => (
            <PopoverVideoCard key={v.video_id || i} video={v} />
          ))}
        </div>
      )}

      {/* Ask input */}
      <div style={{ padding: "0 20px 16px" }}>
        <PopoverAskInput entityName={displayName} onAsk={onAsk} />
      </div>
    </div>
  );

  return createPortal(popoverContent, document.body);
}

// ==========================================================
//  SHARED: Reading Modal (articles, books, essays)
// ==========================================================
function ReadingModal({ title, meta, context, platform, platformColor, price, icon, url, onClose }) {
  if (!title) return null;
  const isBook = icon === "📖";

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 100,
        background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 520, maxHeight: "80vh", background: T.bgCard, borderRadius: 14,
          overflow: "hidden", boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
          display: "flex", flexDirection: "column",
        }}
      >
        {/* Header */}
        <div style={{
          padding: "20px 24px 0", flexShrink: 0,
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div style={{ display: "flex", gap: 16, flex: 1 }}>
              <div style={{
                width: isBook ? 70 : 56, height: isBook ? 100 : 56, borderRadius: isBook ? 4 : 10, flexShrink: 0,
                background: isBook
                  ? "linear-gradient(145deg, #1e3a5f, #2a5a8a)"
                  : "linear-gradient(145deg, #1a2744, #2a3a5a)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: isBook ? 28 : 24, boxShadow: isBook ? "3px 3px 8px rgba(0,0,0,0.15)" : "none",
              }}>
                {icon}
              </div>
              <div>
                <div style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", fontSize: 18, fontWeight: 700, color: T.text, lineHeight: 1.3 }}>
                  {title}
                </div>
                <div style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", fontSize: 13, color: T.textMuted, marginTop: 4 }}>
                  {meta}
                </div>
                <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                  {platform && (
                    <span style={{
                      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", fontSize: 10.5, fontWeight: 700,
                      color: "#fff", background: platformColor || T.blue,
                      padding: "3px 10px", borderRadius: 4,
                    }}>
                      {platform}
                    </span>
                  )}
                  {price && (
                    <span style={{
                      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", fontSize: 10.5, fontWeight: 700,
                      color: "#fff", background: "#f5b800",
                      padding: "3px 10px", borderRadius: 4,
                    }}>
                      {price}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <button
              onClick={onClose}
              style={{
                background: "none", border: "none", color: T.textDim,
                cursor: "pointer", fontSize: 22, lineHeight: 1, flexShrink: 0, marginLeft: 8,
              }}
            >
              ×
            </button>
          </div>
        </div>

        {/* Divider */}
        <div style={{ height: 1, background: T.border, margin: "18px 24px 0" }} />

        {/* Content area */}
        <div style={{ padding: "18px 24px", overflowY: "auto", flex: 1 }}>
          {/* Why this matters */}
          <div style={{
            fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", fontSize: 9.5, fontWeight: 700,
            color: "#c0392b", textTransform: "uppercase", letterSpacing: "0.08em",
            marginBottom: 10,
          }}>
            {isBook ? "WHY THIS BOOK MATTERS" : "WHY THIS MATTERS"}
          </div>
          <div style={{
            fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", fontSize: 14.5, lineHeight: 1.75,
            color: T.text, marginBottom: 20,
          }}>
            {context}
          </div>

          {/* Connection to Pluribus */}
          <div style={{
            padding: "14px 16px", background: T.bgElevated, borderRadius: 10,
            border: `1px solid ${T.border}`, marginBottom: 16,
          }}>
            <div style={{
              fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", fontSize: 9.5, fontWeight: 700,
              color: T.blue, textTransform: "uppercase", letterSpacing: "0.08em",
              marginBottom: 8,
            }}>
              CONNECTION TO PLURIBUS
            </div>
            <div style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", fontSize: 13.5, lineHeight: 1.65, color: T.textMuted }}>
              {isBook
                ? `This work is part of the literary DNA that feeds directly into Pluribus's themes of identity, consciousness, and what it means to be human in a world that has moved beyond individuality.`
                : `Referenced in the UnitedTribes Knowledge Graph as a verified influence on or analysis of Vince Gilligan's creative universe.`
              }
            </div>
          </div>

          {/* Source attribution */}
          <div style={{
            display: "flex", alignItems: "center", gap: 8,
            fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", fontSize: 11, color: T.textDim,
          }}>
            <span style={{ fontSize: 13 }}>{icon}</span>
            <span>Powered by UnitedTribes Knowledge Graph</span>
          </div>
        </div>

        {/* Footer action */}
        <div style={{
          padding: "14px 24px", borderTop: `1px solid ${T.border}`,
          display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0,
        }}>
          <span style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", fontSize: 11, color: T.textDim }}>
            {isBook ? "Purchase links are affiliate-free" : "Opens in external reader"}
          </span>
          <button
            onClick={() => {
              const searchUrl = url || `https://www.google.com/search?q=${encodeURIComponent(title + (meta ? " " + meta : ""))}`;
              window.open(searchUrl, "_blank");
            }}
            style={{
              fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", fontSize: 13, fontWeight: 600,
              color: "#fff", background: T.blue, border: "none",
              padding: "8px 20px", borderRadius: 8, cursor: "pointer",
            }}
          >
            {price ? `Buy · ${price}` : platform ? `Open on ${platform}` : "Read more"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ==========================================================
//  SHARED: Contextual Discovery Group
// ==========================================================
function DiscoveryGroup({ accentColor, title, description, children }) {
  return (
    <div style={{ marginBottom: 34 }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 14, marginBottom: 14 }}>
        <div
          style={{
            width: 4,
            minHeight: 44,
            borderRadius: 2,
            background: accentColor,
            flexShrink: 0,
            marginTop: 2,
          }}
        />
        <div>
          <h3
            style={{
              fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
              fontSize: 18,
              fontWeight: 700,
              color: T.text,
              margin: 0,
              lineHeight: 1.3,
            }}
          >
            {title}
          </h3>
          <p
            style={{
              fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
              fontSize: 16,
              fontWeight: 450,
              color: T.textMuted,
              margin: "4px 0 0",
              lineHeight: 1.7,
            }}
          >
            {description}
          </p>
        </div>
      </div>
      {/* dc-wrap */}
      <div style={{ position: "relative" }}>
        {/* dc-row */}
        <div data-dc-row style={{ display: "flex", flexWrap: "nowrap", gap: 10, overflowX: "auto", paddingBottom: 6, WebkitOverflowScrolling: "touch", scrollbarWidth: "thin" }}>
          {children}
        </div>
        {/* Right-edge fade overlay */}
        <div style={{ position: "absolute", top: 0, right: 0, width: 40, height: "calc(100% - 6px)", background: "linear-gradient(90deg, transparent, #f5f0e8)", pointerEvents: "none", zIndex: 1 }} />
      </div>
    </div>
  );
}

// ==========================================================
//  SHARED: Entity Quick View Panel
// ==========================================================
function EntityQuickView({ entity, onClose, onNavigate, onViewDetail, library, toggleLibrary, onItemClick, entities }) {
  if (!entity) return null;
  const data = entities[entity];
  if (!data) return null;

  const mediaGroups = data.quickViewGroups || [];
  const totalItems = mediaGroups.reduce((sum, g) => sum + (g.total || g.items?.length || 0), 0);

  return (
    <div
      style={{
        position: "fixed",
        top: 49,
        right: 0,
        bottom: 0,
        width: 390,
        zIndex: 90,
        boxShadow: "-4px 0 20px rgba(0,0,0,0.08)",
        background: T.bgCard,
        overflowY: "auto",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "18px 22px",
          borderBottom: `1px solid ${T.border}`,
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          position: "sticky",
          top: 0,
          background: T.bgCard,
          zIndex: 2,
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
                fontSize: 19,
                fontWeight: 700,
                color: T.text,
              }}
            >
              {entity}
            </div>
            <span
              style={{
                fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
                fontSize: 9,
                fontWeight: 700,
                color: T.green,
                background: T.greenBg,
                padding: "3px 8px",
                borderRadius: 6,
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                border: `1px solid ${T.greenBorder}`,
              }}
            >
              Verified
            </span>
          </div>
          <div
            style={{
              fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
              fontSize: 12.5,
              color: T.textMuted,
              marginTop: 4,
            }}
          >
            {data.subtitle} · {totalItems} media items
          </div>
        </div>
        <button
          onClick={onClose}
          style={{
            background: "none",
            border: "none",
            color: T.textMuted,
            cursor: "pointer",
            fontSize: 20,
            padding: "0 4px",
            lineHeight: 1,
          }}
        >
          ×
        </button>
      </div>

      {/* Action bar */}
      <div
        style={{
          padding: "12px 22px",
          borderBottom: `1px solid ${T.border}`,
          display: "flex",
          gap: 8,
        }}
      >
        <button
          onClick={() => onViewDetail(entity)}
          style={{
            fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
            fontSize: 12,
            fontWeight: 600,
            color: T.blue,
            background: T.blueLight,
            border: `1px solid ${T.blueBorder}`,
            padding: "7px 14px",
            borderRadius: 8,
            cursor: "pointer",
          }}
        >
          Full Profile →
        </button>
        <button
          onClick={() => onNavigate(SCREENS.CONSTELLATION)}
          style={{
            fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
            fontSize: 12,
            fontWeight: 500,
            color: T.textMuted,
            background: T.bgElevated,
            border: `1px solid ${T.border}`,
            padding: "7px 14px",
            borderRadius: 8,
            cursor: "pointer",
          }}
        >
          View in Constellation
        </button>
      </div>

      {/* Media groups */}
      <div style={{ padding: "16px 22px", flex: 1 }}>
        {mediaGroups.length === 0 && data.bio?.length > 0 && (
          <div style={{ marginBottom: 22 }}>
            <div style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", fontSize: 10.5, fontWeight: 700, color: T.textDim, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 10 }}>
              About
            </div>
            <div style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", fontSize: 13.5, lineHeight: 1.7, color: T.textMuted }}>
              {data.bio[0].length > 200 ? data.bio[0].slice(0, 197) + "..." : data.bio[0]}
            </div>
          </div>
        )}
        {mediaGroups.map((group) => (
          <div key={group.label} style={{ marginBottom: 22 }}>
            <div
              style={{
                fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
                fontSize: 10.5,
                fontWeight: 700,
                color: T.textDim,
                textTransform: "uppercase",
                letterSpacing: "0.07em",
                marginBottom: 10,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <span>{group.label}</span>
              <span style={{ color: T.blue, fontWeight: 600, fontSize: 10, cursor: "pointer" }}>
                {group.total && group.total > group.items.length
                  ? `${group.items.length} of ${group.total}`
                  : `${group.items.length} items`}
              </span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              {group.items.map((item) => {
                const itemInLibrary = library && library.has(item.title);
                return (
                <div
                  key={item.title}
                  onClick={() => onItemClick && onItemClick(item)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "9px 13px",
                    background: T.bgElevated,
                    border: `1px solid ${itemInLibrary ? `${T.blue}33` : T.border}`,
                    borderLeft: itemInLibrary ? `3px solid ${T.blue}` : `1px solid ${itemInLibrary ? `${T.blue}33` : T.border}`,
                    borderRadius: 8,
                    cursor: "pointer",
                    transition: "all 0.15s",
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
                        fontSize: 13,
                        fontWeight: 600,
                        color: T.text,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {item.title}
                    </div>
                    <div
                      style={{
                        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
                        fontSize: 11,
                        color: T.textDim,
                        marginTop: 1,
                      }}
                    >
                      {item.meta}
                    </div>
                  </div>
                  <span
                    style={{
                      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
                      fontSize: 9.5,
                      fontWeight: 700,
                      color: "#fff",
                      background: item.platformColor,
                      padding: "3px 8px",
                      borderRadius: 4,
                      flexShrink: 0,
                      marginLeft: 10,
                    }}
                  >
                    {item.platform}
                  </span>
                  {toggleLibrary && (
                    <div
                      onClick={(e) => { e.stopPropagation(); toggleLibrary(item.title); }}
                      style={{
                        width: 22,
                        height: 22,
                        borderRadius: 5,
                        background: itemInLibrary ? T.blue : T.bg,
                        border: itemInLibrary ? "none" : `1px solid ${T.border}`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        cursor: "pointer",
                        transition: "all 0.2s",
                        flexShrink: 0,
                        marginLeft: 8,
                        fontSize: 12,
                        color: itemInLibrary ? "#fff" : T.textDim,
                        fontWeight: 700,
                      }}
                    >
                      {itemInLibrary ? "✓" : "+"}
                    </div>
                  )}
                </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Source footer */}
      <div
        style={{
          padding: "12px 22px",
          borderTop: `1px solid ${T.border}`,
          fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
          fontSize: 11,
          color: T.textDim,
          display: "flex",
          alignItems: "center",
          gap: 6,
        }}
      >
        <span style={{ color: T.green }}>●</span>
        Sourced from authorized partnerships
      </div>
    </div>
  );
}


// ==========================================================
//  Query Intent Classification & Discovery Reordering
//  (Ported from Justin's commit 2f5aec5 — see docs/selective-merge-2f5aec5.md)
// ==========================================================
const QUERY_INTENTS = {
  MUSIC: {
    keywords: ["music", "song", "songs", "soundtrack", "track", "tracks", "needle drop", "needle drops", "sonic", "score", "listen", "playlist", "album"],
    groupOrder: ["inspirations", "cast", "crew"],
    subtitle: "Exploring the sonic world of Pluribus",
  },
  CAST: {
    keywords: ["cast", "actor", "actors", "actress", "star", "stars", "who plays", "who portrays", "character", "characters", "rhea", "seehorn", "carol"],
    groupOrder: ["cast", "crew", "inspirations", "music"],
    subtitle: "The people who bring this universe to life",
  },
  CREW: {
    keywords: ["crew", "creator", "created", "director", "writer", "producer", "showrunner", "behind the scenes", "made", "gilligan", "vince"],
    groupOrder: ["crew", "cast", "inspirations", "music"],
    subtitle: "The creative vision behind Pluribus",
  },
  INFLUENCES: {
    keywords: ["influence", "influences", "inspired", "inspiration", "reference", "references", "based on", "source", "origins", "homage", "twilight zone", "body snatchers"],
    groupOrder: ["inspirations", "cast", "crew", "music"],
    subtitle: "The cultural DNA that shaped this universe",
  },
  THEMES: {
    keywords: ["theme", "themes", "about", "meaning", "symbolism", "metaphor", "grief", "trauma", "identity", "collective", "hive mind", "joining"],
    groupOrder: ["inspirations", "cast", "music", "crew"],
    subtitle: "The ideas at the heart of this universe",
  },
};

function classifyQueryIntent(query, brokerResponse) {
  if (!query) return null;
  const lower = query.toLowerCase();
  const scores = {};

  for (const [intent, config] of Object.entries(QUERY_INTENTS)) {
    scores[intent] = 0;
    for (const kw of config.keywords) {
      if (lower.includes(kw)) scores[intent] += 1;
    }
  }

  // Boost scores by scanning broker narrative for reinforcing terms
  const narrative = (brokerResponse?.narrative || "").toLowerCase();
  if (narrative) {
    if (narrative.includes("soundtrack") || narrative.includes("needle drop") || narrative.includes("music supervisor")) scores.MUSIC = (scores.MUSIC || 0) + 0.5;
    if (narrative.includes("portrays") || narrative.includes("performance") || narrative.includes("starring")) scores.CAST = (scores.CAST || 0) + 0.5;
    if (narrative.includes("created by") || narrative.includes("showrunner") || narrative.includes("directed")) scores.CREW = (scores.CREW || 0) + 0.5;
    if (narrative.includes("influenced by") || narrative.includes("inspired") || narrative.includes("homage")) scores.INFLUENCES = (scores.INFLUENCES || 0) + 0.5;
    if (narrative.includes("explores themes") || narrative.includes("thematic") || narrative.includes("symbolism")) scores.THEMES = (scores.THEMES || 0) + 0.5;
  }

  // Find highest scoring intent
  let best = null;
  let bestScore = 0;
  for (const [intent, score] of Object.entries(scores)) {
    if (score > bestScore) { bestScore = score; best = intent; }
  }

  // Threshold: at least 1 keyword hit to be considered specific
  if (bestScore < 1) return null;
  return { id: best, ...QUERY_INTENTS[best] };
}

function getQueryAwareGroups(query, brokerResponse, responseData) {
  const groups = responseData?.discoveryGroups || [];
  const intent = classifyQueryIntent(query, brokerResponse);
  if (!intent) return { groups, intent: null };

  // Reorder groups by intent's preferred order
  const ordered = [];
  for (const gid of intent.groupOrder) {
    const g = groups.find(g => g.id === gid);
    if (g) ordered.push(g);
  }
  // Append any groups not in the order list (preserves unexpected groups)
  for (const g of groups) {
    if (!ordered.includes(g)) ordered.push(g);
  }
  return { groups: ordered, intent };
}

// ==========================================================
//  Broker → DiscoveryGroup transformer (Step 7)
// ==========================================================

function findEntity(name, entities) {
  if (!entities || !name) return null;
  let ent = entities[name];
  if (!ent) {
    const lower = name.toLowerCase();
    const key = Object.keys(entities).find(k => k.toLowerCase() === lower);
    if (key) ent = entities[key];
  }
  return ent || null;
}

function inferType(name, entities) {
  // Check assembled entity data for accurate type
  const ent = findEntity(name, entities);
  if (ent) {
    if (ent.type === "show") return "TV";
    if (ent.type === "film") return "FILM";
    if (ent.type === "person") return "PERSON";
    if (ent.type === "character") return "CHARACTER";
  }
  const lower = (name || "").toLowerCase();
  if (lower.includes("s1e") || lower.includes("s2e") || lower.includes("s5e") || lower.includes("episode")) return "EPISODE";
  if (lower.includes("season") || lower.includes("s1") || lower.includes("zone") || lower.includes("pluribus")) return "TV";
  return "FILM";
}

function inferIcon(name, types, entities) {
  const ent = findEntity(name, entities);
  if (ent) {
    if (ent.type === "show") return "📺";
    if (ent.type === "film") return "🎬";
    if (ent.type === "person") return "👤";
    if (ent.type === "character") return "👤";
  }
  const lower = (name || "").toLowerCase();
  if (lower.includes("book") || lower.includes("novel")) return "📖";
  if (lower.includes("zone") || lower.includes("episode") || lower.includes("s1e") || lower.includes("s2e") || lower.includes("s5e")) return "📺";
  return "🎬";
}

function getEntityImage(name, entities) {
  const ent = findEntity(name, entities);
  if (!ent) return null;
  return ent.photoUrl || ent.posterUrl || null;
}

function isPerson(dc) {
  const personTypes = ["created", "crew_member", "wrote_episode", "directed_episode", "starred_in", "guest_starred_in"];
  return dc.top_connections?.some(tc => personTypes.includes(tc.type));
}

function inferRoleType(topConnections) {
  const types = (topConnections || []).map(tc => tc.type);
  if (types.includes("created")) return "CREATOR";
  if (types.includes("starred_in") || types.includes("guest_starred_in")) return "CAST";
  if (types.includes("wrote_episode") || types.includes("directed_episode")) return "CREW";
  if (types.includes("crew_member")) return "CREW";
  return "PERSON";
}

function buildDynamicGroups(brokerResponse, entities) {
  if (!brokerResponse?.connections) return [];
  const groups = [];

  // Group 1: Key Influences (from influence_networks)
  const influences = brokerResponse.connections.influence_networks || [];
  if (influences.length > 0) {
    // Build editorial description from KG data
    const typeSet = new Set();
    influences.forEach(inf => inf.influence_types?.forEach(t => typeSet.add(t)));
    const typeList = [...typeSet].slice(0, 4);
    const verifiedCount = influences.filter(inf => inf.catalog_verified).length;
    const influenceDesc = (() => {
      const n = influences.length;
      if (typeList.length === 0) return `Every universe has a lineage. These ${n} works and creators left fingerprints all over this one.`;
      const types = typeList.join(", ");
      if (verifiedCount > 0) return `No story exists in a vacuum. Across ${types}, these ${n} influences reveal the creative lineage — the films watched late at night, the books dog-eared and passed around, the ideas that refused to stay in someone else's universe.`;
      return `Across ${types}, these ${n} influences trace the invisible threads connecting this universe to the wider culture that shaped it.`;
    })();

    groups.push({
      id: "influences",
      accentColor: "#c0392b",
      title: "Key Influences",
      description: influenceDesc,
      cards: influences.map(inf => ({
        type: inferType(inf.influencer, entities),
        typeBadgeColor: "#16803c",
        title: inf.influencer,
        meta: inf.influence_types?.join(", ") || "",
        context: inf.context,
        platform: inf.catalog_verified ? "Verified" : "",
        platformColor: inf.catalog_verified ? "#16803c" : "#555",
        icon: inferIcon(inf.influencer, inf.influence_types, entities),
        posterUrl: getEntityImage(inf.influencer, entities),
      })),
    });
  }

  // Group 2: The Creative Network (people from direct_connections)
  const people = (brokerResponse.connections.direct_connections || [])
    .filter(dc => isPerson(dc));
  if (people.length > 0) {
    // Build editorial description from KG data
    const roleSet = new Set();
    people.forEach(dc => {
      const role = inferRoleType(dc.top_connections);
      if (role) roleSet.add(role);
    });
    const totalConns = people.reduce((sum, dc) => sum + (dc.connection_count || 0), 0);
    const roleList = [...roleSet].slice(0, 4);
    const networkDesc = (() => {
      const n = people.length;
      if (roleList.length === 0) return `Behind every universe is a constellation of people who willed it into existence. ${n} of them are mapped here.`;
      const roles = roleList.join(", ").toLowerCase();
      return `A universe doesn't build itself. These ${n} people — across ${roles} — share ${totalConns} verified connections to this world. Some created it, some inhabit it, and some shaped it in ways the credits never fully capture.`;
    })();

    groups.push({
      id: "network",
      accentColor: "#2563eb",
      title: "The Creative Network",
      description: networkDesc,
      cards: people.map(dc => ({
        type: inferRoleType(dc.top_connections),
        typeBadgeColor: "#2563eb",
        title: dc.entity,
        meta: `${dc.connection_count} connections`,
        context: dc.top_connections?.[0]?.evidence || "",
        icon: "👤",
        photoUrl: getEntityImage(dc.entity, entities),
      })),
    });
  }

  return groups;
}

// ==========================================================
//  COMPARE PANEL — Side-by-side model response comparison
// ==========================================================
function ComparePanel({ query, selectedModel, brokerResponse, onClose }) {
  const currentModel = selectedModel || DEFAULT_MODEL;
  const [activeModels, setActiveModels] = useState([currentModel.id]);
  const [responses, setResponses] = useState({});
  const [loading, setLoading] = useState({});
  const [dropdownOpen, setDropdownOpen] = useState(false);

  // Fetch raw response for a model
  const fetchRaw = (model) => {
    if (!query) return;
    if (!model.endpoint) {
      setResponses(prev => ({ ...prev, [model.id]: { narrative: `Raw ${model.name} integration coming soon.` } }));
      return;
    }
    setLoading(prev => ({ ...prev, [model.id]: true }));
    fetch(`${API_BASE}${model.endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: query }),
    })
      .then(res => res.ok ? res.json() : Promise.reject(res.status))
      .then(data => {
        setResponses(prev => ({ ...prev, [model.id]: data }));
        setLoading(prev => ({ ...prev, [model.id]: false }));
      })
      .catch(() => {
        setResponses(prev => ({ ...prev, [model.id]: { narrative: "Failed to load response." } }));
        setLoading(prev => ({ ...prev, [model.id]: false }));
      });
  };

  // Auto-fetch for default model on mount
  useEffect(() => {
    if (query && !responses[currentModel.id] && !loading[currentModel.id]) {
      fetchRaw(currentModel);
    }
  }, []);

  const addModel = (model) => {
    if (activeModels.includes(model.id) || activeModels.length >= 4) return;
    setActiveModels(prev => [...prev, model.id]);
    if (!responses[model.id]) fetchRaw(model);
    setDropdownOpen(false);
  };

  const compareAll = () => {
    const toAdd = COMPARE_MODELS.filter(m => !activeModels.includes(m.id)).slice(0, 4 - activeModels.length);
    const newIds = toAdd.map(m => m.id);
    setActiveModels(prev => [...prev, ...newIds]);
    toAdd.forEach(m => { if (!responses[m.id]) fetchRaw(m); });
    setDropdownOpen(false);
  };

  const removeModel = (modelId) => {
    setActiveModels(prev => prev.filter(id => id !== modelId));
  };

  // Container backgrounds: default model = warm cream (matches main screen), others = model dot color tint
  const getTint = (model, isFirst) => {
    if (isFirst) return { bg: "#f5f0e8", border: "1px solid #e2d9cc" };
    const hex = model.dot;
    return { bg: `${hex}12`, border: `1px solid ${hex}25` };
  };

  const availableModels = COMPARE_MODELS.filter(m => !activeModels.includes(m.id));

  return (
    <div style={{
      position: "fixed", top: 49, right: 0, bottom: 0, width: 380,
      zIndex: 89, boxShadow: "-4px 0 20px rgba(0,0,0,0.08)",
      background: T.bgCard, overflowY: "auto", padding: 24,
    }}>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", fontSize: 14, fontWeight: 600, color: T.text }}>
            Without UnitedTribes
          </span>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        {/* Add model dropdown */}
        {availableModels.length > 0 && activeModels.length < 4 && (
          <div style={{ position: "relative" }}>
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              style={{
                fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
                fontSize: 12.5, color: T.textMuted, background: T.bgElevated,
                border: `1px solid ${T.border}`, padding: "5px 12px 5px 14px",
                borderRadius: 8, cursor: "pointer", fontWeight: 500,
                display: "flex", alignItems: "center", gap: 6,
              }}
            >
              + Add model
              <span style={{ fontSize: 9, opacity: 0.5, marginLeft: 2 }}>▼</span>
            </button>
            {dropdownOpen && (
              <>
                <div onClick={() => setDropdownOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 99 }} />
                <div style={{
                  position: "absolute", top: "calc(100% + 6px)", right: 0, width: 250,
                  background: T.bgCard, border: `1px solid ${T.border}`, borderRadius: 12,
                  boxShadow: "0 8px 30px rgba(0,0,0,0.12)", zIndex: 100, overflow: "hidden",
                }}>
                  {availableModels.map(m => (
                    <button
                      key={m.id}
                      onClick={() => addModel(m)}
                      onMouseEnter={e => e.currentTarget.style.background = T.bgElevated}
                      onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                      style={{
                        display: "flex", alignItems: "center", gap: 8, width: "100%",
                        padding: "10px 14px", border: "none", cursor: "pointer", background: "transparent",
                        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
                        fontSize: 12.5, color: T.text, textAlign: "left", transition: "background 0.15s",
                      }}
                    >
                      <span style={{ width: 6, height: 6, borderRadius: "50%", background: m.dot, flexShrink: 0 }} />
                      <span style={{ flex: 1, whiteSpace: "nowrap" }}>{m.name}</span>
                      <span style={{ fontSize: 11, color: T.textDim, textAlign: "right", flexShrink: 0 }}>{m.provider}</span>
                    </button>
                  ))}
                  {availableModels.length > 1 && (
                    <>
                      <div style={{ height: 1, background: T.border, margin: "2px 10px" }} />
                      <button
                        onClick={compareAll}
                        onMouseEnter={e => e.currentTarget.style.background = T.bgElevated}
                        onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                        style={{
                          display: "flex", alignItems: "center", justifyContent: "center", width: "100%",
                          padding: "10px 14px", border: "none", cursor: "pointer", background: "transparent",
                          fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
                          fontSize: 12, fontWeight: 600, color: T.textMuted, textAlign: "center",
                          transition: "background 0.15s",
                        }}
                      >
                        Compare all
                      </button>
                    </>
                  )}
                </div>
              </>
            )}
          </div>
        )}
          <button onClick={onClose} style={{
            background: T.bgElevated, border: `1px solid ${T.border}`,
            color: T.textMuted, cursor: "pointer", fontSize: 14, fontWeight: 600, width: 26, height: 26,
            borderRadius: 7, display: "flex", alignItems: "center", justifyContent: "center", lineHeight: 1, flexShrink: 0,
          }}>×</button>
          </div>
        </div>
        <div style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", fontSize: 11.5, color: T.textDim, marginTop: 6, lineHeight: 1.4 }}>
          Same query, no knowledge graph enhancement
        </div>
      </div>

      {/* Active query bubble — right justified, static */}
      {query && (
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16 }}>
          <div style={{
            background: "#fcfbf9", color: "#1a2744", fontSize: 13, fontWeight: 600,
            padding: "8px 14px", borderRadius: "16px 16px 4px 16px", maxWidth: "85%",
            fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
            lineHeight: 1.4,
          }}>
            {query}
          </div>
        </div>
      )}

      {/* Model response containers */}
      {activeModels.map((modelId, idx) => {
        const model = COMPARE_MODELS.find(m => m.id === modelId);
        if (!model) return null;
        const isFirst = idx === 0;
        const tint = getTint(model, isFirst);
        const resp = responses[modelId];
        const isLoading = loading[modelId];
        const narrative = resp?.narrative || null;

        return (
          <div key={modelId} style={{ marginBottom: 16 }}>
            <div style={{
              background: tint.bg, border: tint.border, borderRadius: 10, padding: 14,
            }}>
              {/* Model header with close button */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ width: 7, height: 7, borderRadius: "50%", background: model.dot }} />
                  <span style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", fontSize: 11, fontWeight: 600, color: T.textMuted, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    {model.name}
                  </span>
                </div>
                <button
                  onClick={() => removeModel(modelId)}
                  onMouseEnter={e => { e.currentTarget.style.background = T.bgHover; e.currentTarget.style.borderColor = T.borderLight; }}
                  onMouseLeave={e => { e.currentTarget.style.background = T.bgElevated; e.currentTarget.style.borderColor = T.border; }}
                  style={{ background: T.bgElevated, border: `1px solid ${T.border}`, color: T.textMuted, cursor: "pointer", fontSize: 12, fontWeight: 600, width: 22, height: 22, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", lineHeight: 1, padding: 0, transition: "background 0.15s, border-color 0.15s" }}
                >
                  ×
                </button>
              </div>
              {/* Response content */}
              {isLoading && (
                <div style={{
                  fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
                  fontSize: 13, lineHeight: 1.65, color: T.textDim, textAlign: "center", padding: "8px 0",
                }}>
                  Loading...
                </div>
              )}
              {!isLoading && narrative && (
                <div style={{
                  fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
                  fontSize: 13, lineHeight: 1.65, color: T.text,
                  maxHeight: 300, overflowY: "auto",
                }}>
                  {narrative}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ==========================================================
//  Thread Entry — collapsible previous model response
// ==========================================================
function ThreadEntry({ entry, entities, onEntityClick, sortedEntityNames, entityAliases }) {
  const [open, setOpen] = useState(false);
  const previewText = entry.response?.narrative?.split(/\n\n+/)?.[0]?.slice(0, 120) || "";

  // Reusable entity-linking paragraph renderer using linkEntities utility
  const renderLinkedParagraphs = (response, keyPrefix = "") => {
    if (!response?.narrative) return null;
    return response.narrative.split(/\n\n+/).filter(p => p.trim()).map((para, i) => (
      <p key={`${keyPrefix}${i}`} style={{ margin: "0 0 14px" }}>
        {linkEntities(para, entities, sortedEntityNames, onEntityClick, `${keyPrefix}${i}-`, entityAliases)}
      </p>
    ));
  };

  return (
    <div style={{
      marginBottom: 16,
      border: `1px solid ${T.border}`,
      borderRadius: 12,
      overflow: "hidden",
      background: T.bgCard,
    }}>
      <div
        onClick={() => setOpen(!open)}
        style={{
          display: "flex", alignItems: "center", gap: 8,
          padding: "10px 16px",
          cursor: "pointer",
          background: open ? T.bgElevated : T.bgCard,
          transition: "background 0.2s",
        }}
      >
        <span style={{
          fontSize: 12, color: T.textMuted, flexShrink: 0,
          transition: "transform 0.2s",
          transform: open ? "rotate(90deg)" : "rotate(0deg)",
        }}>▶</span>
        <span style={{ width: 8, height: 8, borderRadius: "50%", background: entry.model.dot, flexShrink: 0 }} />
        <span style={{ fontSize: 12, fontWeight: 600, fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", color: T.text, flexShrink: 0 }}>
          {entry.model.name}
        </span>
        {!open && previewText && (
          <span style={{
            fontSize: 14, color: T.textMuted, marginLeft: 4,
            fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          }}>
            {previewText}...
          </span>
        )}
      </div>
      {open && (
        <div style={{ padding: "12px 16px 16px" }}>
          {/* Query pill — shows what search this model was responding to */}
          {entry.query && (
            <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 14 }}>
              <div style={{
                background: T.bgElevated,
                padding: "8px 14px",
                borderRadius: "18px 18px 4px 18px",
                fontSize: 15,
                fontWeight: 600,
                fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
                color: T.text,
              }}>
                {entry.query}
              </div>
            </div>
          )}
          <div style={{ fontSize: 16, fontWeight: 450, lineHeight: 1.7, color: T.text, fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" }}>
            {renderLinkedParagraphs(entry.response, "main-")}
          </div>
          {entry.followUps?.map((fu, fi) => (
            <div key={fi} style={{ marginTop: 16 }}>
              <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 8 }}>
                <div style={{ background: "#fcfbf9", padding: "8px 14px", borderRadius: "18px 18px 4px 18px", fontSize: 15, fontWeight: 600, fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" }}>{fu.query}</div>
              </div>
              <div style={{ fontSize: 16, fontWeight: 450, lineHeight: 1.7, fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" }}>
                {renderLinkedParagraphs(fu.response, `fu${fi}-`)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ==========================================================
//  Inline Thinking Indicator (compact pipeline for in-session queries)
// ==========================================================
function InlineThinkingIndicator({ step = 0, model }) {
  const allSteps = [
    "Connecting to Knowledge Graph",
    "Scanning cross-media relationships",
    "Resolving entities",
    "Mapping connections",
    "Verifying sources",
    "Generating response",
    // Entity exploration phase — fills wait time
    "Exploring Vince Gilligan",
    "Connecting Breaking Bad → Pluribus",
    "Scanning Rhea Seehorn's filmography",
    "Mapping Dave Porter's score",
    "Tracing Twilight Zone influences",
    "Linking Zamyatin's We (1924)",
    "Analyzing Carol Sturka's arc",
    "Traversing 9,000+ relationships",
    "Scanning UMG music catalog",
    "Mapping Harper Collins connections",
    "Resolving hive mind mythology",
    "Verifying cross-media sources",
  ];
  // Self-animate: follow parent for steps 0-2, then self-cycle from step 3 onward
  const [localStep, setLocalStep] = useState(step);
  // Sync from parent but never go backwards
  useEffect(() => { setLocalStep(prev => Math.max(prev, step)); }, [step]);
  // Once we hit step 3 (API wait point), start cycling through entity exploration
  useEffect(() => {
    if (localStep < 3) return;
    const interval = setInterval(() => {
      setLocalStep(prev => prev < allSteps.length - 1 ? prev + 1 : 6); // Loop entity phase
    }, 1200);
    return () => clearInterval(interval);
  }, [localStep >= 3]);
  const current = allSteps[Math.min(localStep, allSteps.length - 1)];
  return (
    <div style={{
      display: "inline-flex", alignItems: "center", gap: 8,
      padding: "8px 16px",
      width: model ? 380 : 310,
      background: "#fff",
      border: `1px solid ${T.border}`,
      borderRadius: 20,
      boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
    }}>
      {/* Model indicator — shown during model switch, on the left */}
      {model && (
        <>
          <span style={{ width: 7, height: 7, borderRadius: "50%", background: model.dot, flexShrink: 0 }} />
          <span style={{
            fontSize: 11, fontWeight: 600,
            fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
            color: T.text, whiteSpace: "nowrap", flexShrink: 0,
          }}>
            {model.name}
          </span>
          <span style={{ width: 1, height: 14, background: T.border, flexShrink: 0 }} />
        </>
      )}
      {/* Animated dot */}
      <div style={{
        width: 7, height: 7, borderRadius: "50%",
        background: localStep < 6 ? T.blue : T.gold,
        animation: "pulse 1.2s infinite",
        flexShrink: 0,
      }} />
      {/* Cycling step label */}
      <span
        key={localStep}
        style={{
          fontSize: 12, fontWeight: 500,
          fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
          color: T.textMuted, whiteSpace: "nowrap",
          overflow: "hidden", textOverflow: "ellipsis",
          animation: "slideUp 0.35s ease-out",
        }}
      >
        {current}
      </span>
    </div>
  );
}

// ==========================================================
//  SCREEN 3: RESPONSE — Contextual Discovery Experience
// ==========================================================
function ResponseScreen({ onNavigate, onSelectEntity, spoilerFree, library, toggleLibrary, query, brokerResponse, selectedModel, onModelChange, onFollowUp, followUpResponses, isLoading, onSubmit, entities, responseData, onDrawerChange, selectedUniverse, onUniverseChange, onNewChat, responseThread, inlineThinking, inlineStep, followUpThinkingStep, hasActiveResponse, sortedEntityNames, entityAliases, onEntityPopover }) {
  const [loaded, setLoaded] = useState(false);
  const [showCompare, setShowCompare] = useState(false);
  const [quickViewEntity, setQuickViewEntity] = useState(null);
  const [nowPlaying, setNowPlaying] = useState(null);
  const [videoModal, setVideoModal] = useState(null);
  const [readingModal, setReadingModal] = useState(null);
  const [groupFilters, setGroupFilters] = useState({});
  const useLive = true;

  useEffect(() => {
    setTimeout(() => setLoaded(true), 100);
  }, []);

  // Notify App of drawer width changes for InputDock + content adjustment
  useEffect(() => {
    if (onDrawerChange) {
      if (quickViewEntity) onDrawerChange(390);
      else if (showCompare) onDrawerChange(360);
      else onDrawerChange(0);
    }
  }, [quickViewEntity, showCompare, onDrawerChange]);

  // Reset drawer width when unmounting (navigating away)
  useEffect(() => {
    return () => { if (onDrawerChange) onDrawerChange(0); };
  }, [onDrawerChange]);

  const openQuickView = (entity) => {
    setShowCompare(false);
    setQuickViewEntity(entity);
  };

  const viewDetail = (entity) => {
    onSelectEntity(entity);
    onNavigate(SCREENS.ENTITY_DETAIL);
  };

  const songs = responseData?.songs || [];

  const handleNextSong = () => {
    if (nowPlaying !== null) setNowPlaying((nowPlaying + 1) % songs.length);
  };
  const handlePrevSong = () => {
    if (nowPlaying !== null) setNowPlaying(nowPlaying === 0 ? songs.length - 1 : nowPlaying - 1);
  };

  const handleCardClick = (card) => {
    const videoTypes = ["ANALYSIS", "VIDEO", "VIDEO ESSAY", "SCORE", "AMBIENT", "INFLUENCE", "PLAYLIST", "OST", "NEEDLE DROP", "INTERVIEW", "PODCAST", "PANEL", "FEATURED", "TRACK", "REVIEW"];
    const readTypes = ["NOVEL", "BOOK", "DYSTOPIA", "PROFILE", "ACADEMIC", "ESSAY", "ARTICLE"];
    const t = (card.type || "").toUpperCase();
    if (videoTypes.includes(t) || (card.platform && card.platform.includes("Watch"))) {
      setVideoModal({ title: card.title, subtitle: card.meta, videoId: card.video_id, timecodeUrl: card.timecode_url });
    } else if (readTypes.includes(t) || card.icon === "📖" || card.icon === "📄") {
      setReadingModal(card);
    } else if (t === "FILM" || t === "TV" || t === "TZ" || t === "CAREER" || t === "16 EMMYS" || t === "EPISODE") {
      setVideoModal({ title: card.title, subtitle: card.meta, videoId: card.video_id, timecodeUrl: card.timecode_url });
    }
  };

  return (
    <div style={{ height: "100vh", background: "transparent" }}>
      <SideNav active="explore" onNavigate={onNavigate} libraryCount={library ? library.size : 0} hasActiveResponse={hasActiveResponse} />
      <div style={{ marginLeft: 72 }}>
        <TopNav onNavigate={onNavigate} selectedModel={selectedModel} onModelChange={onModelChange} showCompare={showCompare} onCompareToggle={() => { setShowCompare(!showCompare); setQuickViewEntity(null); }} selectedUniverse={selectedUniverse} onUniverseChange={onUniverseChange} onNewChat={onNewChat} />

        <div style={{ display: "flex", height: "calc(100vh - 49px)", overflow: "hidden" }}>
          {/* ===== Main response column ===== */}
          <div
            data-response-scroll
            style={{
              flex: 1,
              overflowY: "auto",
              padding: "28px 20px 160px",
              marginRight: quickViewEntity ? 390 : showCompare ? 360 : 0,
              opacity: loaded ? 1 : 0,
              transition: "opacity 0.5s, margin-right 0.3s ease",
            }}
          >
            <div style={{ maxWidth: 810, margin: "0 auto" }}>
            {/* Query bubble */}
            <div style={{ maxWidth: 810 }}>
              <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 28 }}>
                <div
                  style={{
                    background: "#fcfbf9",
                    color: "#1a2744",
                    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
                    fontSize: 15,
                    fontWeight: 600,
                    padding: "10px 16px",
                    borderRadius: "18px 18px 4px 18px",
                    maxWidth: "75%",
                  }}
                >
                  {query || "Who created Pluribus and what inspired it?"}
                </div>
              </div>
            </div>

            {/* Inline thinking indicator — shown during model switch / in-session queries */}
            {inlineThinking && !brokerResponse ? (
              <div style={{ display: "flex", justifyContent: "center", padding: "8px 0" }}>
                <InlineThinkingIndicator step={inlineStep} model={selectedModel} />
              </div>
            ) : (
            <>
            {/* Spoiler-free banner */}
            {spoilerFree && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "10px 16px",
                  background: `${T.blue}0a`,
                  border: `1px solid ${T.blueBorder}`,
                  borderRadius: 10,
                  marginBottom: 20,
                }}
              >
                <span style={{ fontSize: 15 }}>🛡️</span>
                <div>
                  <div style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", fontSize: 12.5, fontWeight: 600, color: T.blue }}>
                    Spoiler-Free Mode
                  </div>
                  <div style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", fontSize: 11, color: T.textMuted, marginTop: 1 }}>
                    Some content is hidden or redacted to protect your Season 1 experience. 3 cards locked.
                  </div>
                </div>
              </div>
            )}

            {/* Enhanced Discovery header */}
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10, fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "1px", color: "#3d3028" }}>
              <span style={{ width: 7, height: 7, borderRadius: "50%", background: T.gold }} />
              Enhanced Discovery
              <span
                style={{
                  display: "inline-flex", alignItems: "center", gap: 5,
                  padding: "4px 12px", background: "linear-gradient(135deg, #fffdf5, #fff8e8)",
                  border: "1.5px solid #ffce3a", borderRadius: 12,
                  fontSize: 11, fontWeight: 700, color: "#1a2744", marginLeft: 12,
                }}
              >
                <span style={{ color: T.gold }}>✦</span> {useLive ? (brokerResponse?.connections?.direct_connections?.length || brokerResponse?.insights?.entities_explored?.length || 0) : (responseData?.discoveryCount || 16)} discoveries in this response
              </span>
            </div>

            {/* Response prose — live narrative from broker API, with entity linking */}
            <div
              style={{
                fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
                fontSize: 16,
                fontWeight: 450,
                lineHeight: 1.7,
                color: T.text,
                maxWidth: 810,
              }}
            >
              {useLive && brokerResponse?.content ? (
                // Structured content from broker API — Phase A: headline + narrative sections only
                (() => {
                  const summary = brokerResponse.content.summary || "";
                  const narrativeSections = (brokerResponse.content.sections || [])
                    .filter(s => s.type === "narrative" && s.text)
                    // Skip first section if it duplicates the summary
                    .filter(s => s.text.trim().slice(0, 100) !== summary.trim().slice(0, 100));
                  return (
                    <>
                      <ResponseHeader
                        headline={brokerResponse.content.headline}
                        summary={summary}
                        entities={entities}
                        sortedEntityNames={sortedEntityNames}
                        entityAliases={entityAliases}
                        onEntityClick={onEntityPopover}
                        linkEntitiesFn={linkEntities}
                      />
                      {narrativeSections.map((s, i) => <NarrativeSection key={i} text={s.text} entities={entities} sortedEntityNames={sortedEntityNames} entityAliases={entityAliases} onEntityClick={onEntityPopover} linkEntitiesFn={linkEntities} />)}
                    </>
                  );
                })()
              ) : useLive && brokerResponse?.narrative ? (
                // Fallback: plain narrative — split into paragraphs and auto-link entity names
                brokerResponse.narrative.split(/\n\n+/).filter(p => p.trim()).map((para, i) => (
                  <p key={i} style={{ margin: "0 0 18px" }}>
                    {linkEntities(para, entities, sortedEntityNames, onEntityPopover, `resp-${i}-`, entityAliases)}
                  </p>
                ))
              ) : (
                // Fallback: hardcoded narrative
                <>
                  <p style={{ margin: "0 0 18px" }}>
                    <strong>Pluribus</strong> was created by{" "}
                    <EntityTag onClick={() => openQuickView("Vince Gilligan")}>Vince Gilligan</EntityTag>,
                    the visionary behind{" "}
                    <EntityTag onClick={() => openQuickView("Breaking Bad")}>Breaking Bad</EntityTag> (2008–2013, 16 Emmys),{" "}
                    <EntityTag onClick={() => openQuickView("Breaking Bad")}>Better Call Saul</EntityTag> (2015–2022), and{" "}
                    <EntityTag>El Camino</EntityTag> (2019). He began his career writing 30 episodes of{" "}
                    <EntityTag>The X-Files</EntityTag>, including "<EntityTag>Pusher</EntityTag>" — the seed for Pluribus's
                    mind-control themes.
                  </p>

                  <p style={{ margin: "0 0 18px" }}>
                    The show's inspirations run deep. Gilligan cited{" "}
                    <EntityTag onClick={() => openQuickView("Invasion of the Body Snatchers")}>Invasion of the Body Snatchers</EntityTag> (1956) as{" "}
                    <em>"THE wellspring for Pluribus"</em> — the fear that people around you aren't who they
                    seem. He pulled from <EntityTag>The Thing</EntityTag>,{" "}
                    <EntityTag>Village of the Damned</EntityTag>, and{" "}
                    <EntityTag>The Quiet Earth</EntityTag> for isolation and paranoia.
                  </p>

                  {spoilerFree ? (
                    <div
                      style={{
                        margin: "0 0 18px",
                        padding: "14px 18px",
                        background: T.bgElevated,
                        border: `1px solid ${T.border}`,
                        borderRadius: 10,
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                      }}
                    >
                      <span style={{ fontSize: 16, opacity: 0.5 }}>🔒</span>
                      <div>
                        <div style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", fontSize: 13, fontWeight: 600, color: T.textMuted }}>
                          Plot details hidden
                        </div>
                        <div style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", fontSize: 12, color: T.textDim, marginTop: 2 }}>
                          This section reveals key S1 connections between character names, distances, and body counts. Finish Season 1 to unlock.
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p style={{ margin: "0 0 18px" }}>
                      Crucially, Gilligan named his protagonist after{" "}
                      <EntityTag>William Sturka</EntityTag> from the 1960{" "}
                      <EntityTag>Twilight Zone</EntityTag> episode "<EntityTag>Third from the Sun</EntityTag>"
                      — then <em>corrected</em> its scientific error: the original said Earth was "11 million
                      miles" away. In Pluribus, the signal comes from <strong>600 light-years</strong> — the
                      real distance to <EntityTag>Kepler-22b</EntityTag>. And 11 million? That became the body
                      count. <span style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", fontSize: 11, color: T.textDim }}>[Source: Poggy Analysis]</span>
                    </p>
                  )}

                  <p style={{ margin: "0 0 18px" }}>
                    The literary DNA goes deeper: <EntityTag>Zamyatin</EntityTag>'s{" "}
                    <EntityTag>We</EntityTag> (1924) — <em>the first dystopia</em>, before Orwell —{" "}
                    <EntityTag>Matheson</EntityTag>'s <EntityTag>I Am Legend</EntityTag>, and the{" "}
                    <EntityTag>Borg</EntityTag> collective all feed into:{" "}
                    <em>What if losing yourself felt like relief?</em>
                  </p>
                </>
              )}
            </div>

            {/* Follow-up responses — stacked inline above discovery cards */}
            {followUpResponses && followUpResponses.map((fu, fi) => (
              <div key={fi} style={{ marginTop: 28, maxWidth: 810 }} {...(fi === followUpResponses.length - 1 ? { "data-followup-latest": true } : {})}>
                {/* Follow-up query bubble */}
                <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: fu.pending ? 10 : 16 }}>
                  <div style={{ background: "#fcfbf9", color: "#1a2744", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", fontSize: 15, fontWeight: 600, padding: "10px 16px", borderRadius: "18px 18px 4px 18px", maxWidth: "75%" }}>
                    {fu.query}
                  </div>
                </div>
                {/* Follow-up response */}
                <div style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", fontSize: 16, fontWeight: 450, lineHeight: 1.7, color: T.text }}>
                  {fu.pending ? (
                    <div style={{ display: "flex", justifyContent: "center" }}>
                      <InlineThinkingIndicator step={followUpThinkingStep} />
                    </div>
                  ) : fu.error ? (
                    <div style={{ color: "#c0392b", fontStyle: "italic" }}>Error: {fu.error}</div>
                  ) : fu.response?.narrative ? (
                    fu.response.narrative.split(/\n\n+/).filter(p => p.trim()).map((para, i) => (
                      <p key={i} style={{ margin: "0 0 14px" }}>
                        {linkEntities(para, entities, sortedEntityNames, onEntityPopover, `fu-${fi}-${i}-`, entityAliases)}
                      </p>
                    ))
                  ) : (
                    <div style={{ color: T.textDim, fontStyle: "italic" }}>No response received.</div>
                  )}
                </div>
              </div>
            ))}

            </>
            )}

            {/* Thread history — previous model responses, collapsible */}
            {responseThread && responseThread.length > 0 && (
              <div style={{ marginTop: 32 }}>
                {[...responseThread].reverse().map((entry, ti) => (
                  <ThreadEntry key={ti} entry={entry} entities={entities} onEntityClick={onEntityPopover} sortedEntityNames={sortedEntityNames} entityAliases={entityAliases} />
                ))}
              </div>
            )}

            </div>{/* end maxWidth text wrapper */}

            {/* ========== AI-Curated Discovery ========== */}
            <div style={{ marginTop: 40 }}>
              {/* Discovery Groups — query-aware reordered (ported from Justin's 2f5aec5) */}
              {(() => {
                const dynamicGroups = useLive ? buildDynamicGroups(brokerResponse, entities) : [];
                // Merge dynamic groups with static — dynamic replaces matching IDs, static fills the rest
                const staticGroups = responseData?.discoveryGroups || [];
                const baseGroups = dynamicGroups.length > 0
                  ? [...dynamicGroups, ...staticGroups.filter(sg => !dynamicGroups.some(dg => dg.id === sg.id))]
                  : staticGroups;
                const { groups: reorderedGroups, intent: queryIntent } = getQueryAwareGroups(query, brokerResponse, { ...responseData, discoveryGroups: baseGroups });
                const isMusicIntent = queryIntent?.id === "MUSIC";

                // Needle Drops block — rendered before groups for music queries, after otherwise
                const needleDropBlock = (() => {
                  const episodes = responseData?.episodes || [];
                  const epSongs = episodes.map(ep => {
                    const epTracks = songs.filter(s => s.context && s.context.includes(ep.code));
                    if (epTracks.length === 0) return null;
                    return { episode: ep, song: epTracks[0], totalTracks: epTracks.length, songIndex: songs.indexOf(epTracks[0]) };
                  }).filter(Boolean);
                  if (epSongs.length === 0) return null;
                  return (
                    <div style={{ marginBottom: 34 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 6 }}>
                        <div style={{ width: 4, minHeight: 44, borderRadius: 2, background: "#7c3aed", flexShrink: 0, marginTop: 2 }} />
                        <div>
                          <h3 style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", fontSize: 18, fontWeight: 700, color: T.text, margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
                            <span style={{ fontSize: 16 }}>🎧</span> The Needle Drops
                            {isMusicIntent && (
                              <span style={{
                                fontSize: 9, fontWeight: 700,
                                color: T.gold, background: `${T.gold}18`, border: `1px solid ${T.gold}40`,
                                padding: "2px 8px", borderRadius: 4, textTransform: "uppercase", letterSpacing: "0.05em",
                                whiteSpace: "nowrap",
                              }}>
                                MOST RELEVANT
                              </span>
                            )}
                          </h3>
                          <p style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", fontSize: 16, fontWeight: 450, color: T.textMuted, margin: "4px 0 0", lineHeight: 1.7 }}>
                            Thomas Golubić doesn't pick songs — he casts them. Each needle drop enters the scene like a character, carrying its own history into Carol's story. Here's one from each episode to set the mood — head to the Sonic Layer for the full {songs.length}-track soundtrack.
                          </p>
                        </div>
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 10 }}>
                        {epSongs.map(({ episode: ep, song, totalTracks, songIndex }) => (
                          <div
                            key={ep.id}
                            onClick={() => setNowPlaying(nowPlaying === songIndex ? null : songIndex)}
                            style={{
                              display: "flex", alignItems: "center", gap: 12, padding: "10px 14px",
                              background: nowPlaying === songIndex ? T.queryBg : T.bgCard,
                              border: `1px solid ${nowPlaying === songIndex ? "transparent" : T.border}`,
                              borderRadius: 10, cursor: "pointer",
                              transition: "all 0.2s",
                            }}
                          >
                            <div style={{
                              width: 36, height: 36, borderRadius: 8,
                              background: nowPlaying === songIndex ? "rgba(34,197,94,0.2)" : (song.artColor || "#7c3aed") + "18",
                              display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                            }}>
                              <span style={{ fontSize: 14, color: nowPlaying === songIndex ? "#22c55e" : (song.artColor || "#7c3aed") }}>
                                {nowPlaying === songIndex ? "⏸" : "▶"}
                              </span>
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", fontSize: 14, fontWeight: 600, color: nowPlaying === songIndex ? "#fff" : T.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                {song.title}
                              </div>
                              <div style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", fontSize: 12, color: nowPlaying === songIndex ? "rgba(255,255,255,0.6)" : T.textMuted }}>
                                {song.artist} · Ep {ep.number}: "{ep.title}"
                              </div>
                            </div>
                            {totalTracks > 1 && (
                              <div style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", fontSize: 11, color: nowPlaying === songIndex ? "rgba(255,255,255,0.5)" : T.textDim, whiteSpace: "nowrap" }}>
                                +{totalTracks - 1} more
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                      <div style={{ marginTop: 14 }}>
                        <button
                          onClick={() => onNavigate(SCREENS.SONIC)}
                          style={{
                            fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", fontSize: 13, fontWeight: 600,
                            color: T.blue, background: "none", border: "none", padding: 0,
                            cursor: "pointer", display: "flex", alignItems: "center", gap: 6,
                          }}
                        >
                          Explore all {songs.length} tracks in the Sonic Layer →
                        </button>
                      </div>
                    </div>
                  );
                })();

                return (
                  <>
                  <AICuratedHeader subtitle={queryIntent?.subtitle} />
                  {/* Needle Drops first when music intent */}
                  {isMusicIntent && needleDropBlock}
                  {reorderedGroups.filter(g => g.id !== "literary" && g.id !== "music").map((group, groupIdx) => {
                  // Collect unique type values for filter chips
                  const types = [...new Set(group.cards.map(c => c.type).filter(Boolean))];
                  const activeFilter = groupFilters[group.id] || null;
                  const filteredCards = activeFilter
                    ? group.cards.filter(c => c.type === activeFilter)
                    : group.cards;
                  return (
                    <div key={group.id} style={{ marginBottom: 34 }}>
                      <div style={{ display: "flex", alignItems: "flex-start", gap: 14, marginBottom: 14 }}>
                        <div style={{ width: 4, minHeight: 44, borderRadius: 2, background: group.accentColor, flexShrink: 0, marginTop: 2 }} />
                        <div>
                          <h3 style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", fontSize: 18, fontWeight: 700, color: T.text, margin: 0, lineHeight: 1.3, display: "flex", alignItems: "center", gap: 8 }}>
                            {group.title}
                            {queryIntent && groupIdx === 0 && (
                              <span style={{
                                fontSize: 9, fontWeight: 700,
                                color: T.gold, background: `${T.gold}18`, border: `1px solid ${T.gold}40`,
                                padding: "2px 8px", borderRadius: 4, textTransform: "uppercase", letterSpacing: "0.05em",
                                whiteSpace: "nowrap",
                              }}>
                                MOST RELEVANT
                              </span>
                            )}
                          </h3>
                          <p style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", fontSize: 16, fontWeight: 450, color: T.textMuted, margin: "4px 0 0", lineHeight: 1.7 }}>{group.description}</p>
                        </div>
                      </div>
                      {types.length > 1 && (
                        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
                          <button
                            onClick={() => setGroupFilters(prev => ({ ...prev, [group.id]: null }))}
                            style={{
                              fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", fontSize: 12, fontWeight: 600,
                              color: !activeFilter ? "#fff" : T.textMuted,
                              background: !activeFilter ? group.accentColor : T.bgElevated,
                              border: `1px solid ${!activeFilter ? group.accentColor : T.border}`,
                              padding: "4px 12px", borderRadius: 20, cursor: "pointer",
                              transition: "all 0.15s",
                            }}
                          >
                            All ({group.cards.length})
                          </button>
                          {types.map(type => {
                            const count = group.cards.filter(c => c.type === type).length;
                            const isActive = activeFilter === type;
                            return (
                              <button
                                key={type}
                                onClick={() => setGroupFilters(prev => ({ ...prev, [group.id]: isActive ? null : type }))}
                                style={{
                                  fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", fontSize: 12, fontWeight: 600,
                                  color: isActive ? "#fff" : T.textMuted,
                                  background: isActive ? group.accentColor : T.bgElevated,
                                  border: `1px solid ${isActive ? group.accentColor : T.border}`,
                                  padding: "4px 12px", borderRadius: 20, cursor: "pointer",
                                  transition: "all 0.15s",
                                }}
                              >
                                {type} ({count})
                              </button>
                            );
                          })}
                        </div>
                      )}
                      {/* dc-wrap */}
                      <div style={{ position: "relative" }}>
                        {/* dc-row */}
                        <div data-dc-row style={{ display: "flex", flexWrap: "nowrap", gap: 10, overflowX: "auto", paddingBottom: 6, WebkitOverflowScrolling: "touch", scrollbarWidth: "thin" }}>
                          {filteredCards.map((card, ci) => (
                            <DiscoveryCard key={ci} {...card} spoilerFree={spoilerFree} library={library} toggleLibrary={group.id !== "network" ? toggleLibrary : undefined} onCardClick={handleCardClick} />
                          ))}
                        </div>
                        {/* Right-edge fade overlay */}
                        <div style={{ position: "absolute", top: 0, right: 0, width: 40, height: "calc(100% - 6px)", background: "linear-gradient(90deg, transparent, #f5f0e8)", pointerEvents: "none", zIndex: 1 }} />
                      </div>
                    </div>
                  );
                })}
                  {/* Needle Drops after groups when NOT music intent */}
                  {!isMusicIntent && needleDropBlock}
                  </>
                );
              })()}


              {/* Literary Roots — only in curated mode */}
              {(() => {
                if (useLive && buildDynamicGroups(brokerResponse, entities).length > 0) return null;
                return (responseData?.discoveryGroups || []).filter(g => g.id === "literary").map((group) => (
                  <DiscoveryGroup
                    key={group.id}
                    accentColor={group.accentColor}
                    title={group.title}
                    description={group.description}
                  >
                    {group.cards.map((card, ci) => (
                      <DiscoveryCard key={ci} {...card} spoilerFree={spoilerFree} library={library} toggleLibrary={toggleLibrary} onCardClick={handleCardClick} />
                    ))}
                  </DiscoveryGroup>
                ));
              })()}

            </div>

          </div>
        </div>{/* end flex container */}

          {/* ===== Entity Quick View Panel (fixed overlay) ===== */}
          {quickViewEntity && (
            <EntityQuickView
              entity={quickViewEntity}
              onClose={() => setQuickViewEntity(null)}
              onNavigate={onNavigate}
              onViewDetail={viewDetail}
              library={library}
              toggleLibrary={toggleLibrary}
              entities={entities}
              onItemClick={(item) => {
                if (item.video_id) {
                  setVideoModal({ title: item.title, subtitle: item.meta, videoId: item.video_id, timecodeUrl: item.timecode_url });
                } else if (item.spotify_url) {
                  window.open(item.spotify_url, '_blank');
                }
              }}
            />
          )}

          {/* ===== Compare Panel (fixed overlay) ===== */}
          {showCompare && (
            <ComparePanel
              query={query}
              selectedModel={selectedModel}
              brokerResponse={brokerResponse}
              onClose={() => setShowCompare(false)}
            />
          )}
      </div>

      {/* Now Playing Bar */}
      {nowPlaying !== null && (
        <NowPlayingBar
          song={songs[nowPlaying].title}
          artist={songs[nowPlaying].artist}
          context={songs[nowPlaying].context}
          timestamp={songs[nowPlaying].timestamp}
          spotifyUrl={songs[nowPlaying].spotify_url}
          videoId={songs[nowPlaying].video_id}
          onClose={() => setNowPlaying(null)}
          onNext={handleNextSong}
          onPrev={handlePrevSong}
          onWatchVideo={() => setVideoModal({ title: songs[nowPlaying].title, subtitle: songs[nowPlaying].artist, videoId: songs[nowPlaying].video_id })}
          library={library}
          toggleLibrary={toggleLibrary}
        />
      )}

      {/* Video Modal */}
      {videoModal && (
        <VideoModal
          title={videoModal.title}
          subtitle={videoModal.subtitle}
          videoId={videoModal.videoId}
          timecodeUrl={videoModal.timecodeUrl}
          onClose={() => setVideoModal(null)}
        />
      )}

      {/* Reading Modal */}
      {readingModal && (
        <ReadingModal
          {...readingModal}
          onClose={() => setReadingModal(null)}
        />
      )}
    </div>
  );
}

//  SCREEN 5: CONSTELLATION
// ==========================================================
function ConstellationScreen({ onNavigate, onSelectEntity, selectedModel, onModelChange, onSubmit, entities, selectedUniverse, onUniverseChange, onNewChat, hasActiveResponse, responseData }) {
  const [viewMode, setViewMode] = useState("universe");
  const [activeTab, setActiveTab] = useState("universe");
  const [graphQuery, setGraphQuery] = useState("");
  const [graphQueryText, setGraphQueryText] = useState("");
  const [queryGraphData, setQueryGraphData] = useState(null);
  const [graphLoading, setGraphLoading] = useState(false);

  // --- J.D.'s Universe drawer state ---
  const [constellationDrawerOpen, setConstellationDrawerOpen] = useState(false);
  const [focusNodeId, setFocusNodeId] = useState(null);
  const [drawerSortMode, setDrawerSortMode] = useState("all");
  const [jdGraphData, setJdGraphData] = useState(null);

  // Close drawer + clear focus when switching away from jd-universe
  useEffect(() => {
    if (activeTab !== "jd-universe") {
      setConstellationDrawerOpen(false);
      setFocusNodeId(null);
      setDrawerSortMode("all");
    }
  }, [activeTab]);


  const CONSTELLATION_TABS = [
    { id: "universe", label: "Universe Network" },
    { id: "jd-universe", label: "J.D.'s Universe" },
    { id: "themes", label: "Themes Network" },
    { id: "static", label: "Static (Mock Data)" },
  ];

  // Fetch entity relationships from KG API and build focused graph
  const handleGraphQuery = async () => {
    const text = graphQuery.trim();
    if (!text) return;
    setGraphLoading(true);
    setGraphQueryText(text);
    setGraphQuery("");
    try {
      const data = await fetchQueryGraph(text, entities);
      if (data) {
        setQueryGraphData(data);
        setViewMode("query");
      } else {
        console.warn("No graph data returned for:", text);
      }
    } catch (err) {
      console.warn("Constellation query failed:", err);
    } finally {
      setGraphLoading(false);
    }
  };

  // --- J.D.'s Universe drawer data (independent copy from CastCrewScreen) ---
  const jdInfluenceCards = responseData?.discoveryGroups?.[0]?.cards || [];
  const jdMusicCards = useMemo(() => {
    const songs = responseData?.songs || [];
    const EXCLUDE_MUSIC = new Set(["Dave Porter", "TV Themes", "BTR1", "Ricky Cook"]);
    const artistMap = new Map();
    songs.forEach(s => {
      if (!s.artist || EXCLUDE_MUSIC.has(s.artist)) return;
      if (!artistMap.has(s.artist)) {
        artistMap.set(s.artist, {
          title: s.artist,
          type: "MUSIC",
          meta: s.title,
          context: s.context ? `'${s.title}' by ${s.artist} featured in ${s.context}` : `'${s.title}' by ${s.artist}`,
        });
      }
    });
    return [...artistMap.values()];
  }, [responseData]);
  const jdThemeCards = useMemo(() => {
    const tv = responseData?.themeVideos || {};
    return Object.entries(tv)
      .filter(([, v]) => (v.videos?.length || 0) + (v.characters?.length || 0) > 0)
      .sort((a, b) => {
        const aS = (a[1].videos?.length || 0) * 2 + (a[1].characters?.length || 0);
        const bS = (b[1].videos?.length || 0) * 2 + (b[1].characters?.length || 0);
        return bS - aS;
      })
      .slice(0, 6)
      .map(([key, data]) => ({
        name: key.charAt(0).toUpperCase() + key.slice(1),
        key,
        videoCount: data.videos?.length || 0,
        charCount: data.characters?.length || 0,
      }));
  }, [responseData]);
  const jdCastCards = responseData?.discoveryGroups?.[1]?.cards || [];
  const jdCrewCards = responseData?.discoveryGroups?.[2]?.cards || [];
  const jdActorCharMap = responseData?.actorCharacterMap || {};

  const JD_KG_CAST_EXTRAS = [{ title: "John Cena", type: "GUEST", context: "Comedic cameo in Episode 6, playing himself" }];
  const jdConfirmedCast = [
    ...jdCastCards.filter(p => { const n = p.title || p.name; return jdActorCharMap[n] || p.character; }),
    ...JD_KG_CAST_EXTRAS.filter(c => !jdCastCards.some(p => p.title === c.title)),
  ];
  const JD_PROMOTED_LEADS = ["Carlos-Manuel Vesga", "Menik Gooneratne", "John Cena"];
  const jdDrawerLeads = jdConfirmedCast.filter(p => {
    const name = p.title || p.name;
    return p.type === "LEAD" || p.role === "Lead" || JD_PROMOTED_LEADS.includes(name);
  });
  const jdDrawerCast = jdConfirmedCast.filter(p => {
    const name = p.title || p.name;
    return p.type !== "LEAD" && p.role !== "Lead" && !JD_PROMOTED_LEADS.includes(name);
  });
  const JD_KG_CREW_ROLES = {
    "Vince Gilligan": "Creator, Executive Producer, Writer & Director",
    "Gordon Smith": "Executive Producer, Writer & Director",
    "Alison Tatlock": "Executive Producer & Writer",
    "Jenn Carroll": "Co-Executive Producer & Writer",
    "Dave Porter": "Composer",
    "Thomas Golubic": "Music Supervisor",
  };
  // Dynamic character descriptions from entity data (replaces hardcoded list)
  const JD_CHARACTER_DESCS = useMemo(() => {
    if (!entities) return {};
    const descs = {};
    // Collect all character entities with bios
    const charEntities = [];
    Object.entries(entities).forEach(([name, ent]) => {
      if (ent.type === "character" && ent.bio?.[0]) charEntities.push([name, ent]);
    });
    // For each actor in the character map, find matching character entity bio
    Object.entries(jdActorCharMap).forEach(([, charName]) => {
      if (!charName || descs[charName]) return;
      // Direct match
      const direct = charEntities.find(([n]) => n === charName);
      if (direct) {
        // Strip "X is a character in the TV series Pluribus. " prefix for brevity
        let desc = direct[1].bio[0];
        desc = desc.replace(/^.+? is (?:a character|the protagonist) in (?:the TV series )?Pluribus\.\s*/i, "");
        descs[charName] = desc;
        return;
      }
      // Fuzzy: surname match (e.g., "Mr. Diabaté" → "Koumba Diabaté", "Helen" → "Helen L. Umstead")
      const lower = charName.toLowerCase();
      const surname = lower.split(/[\s.]+/).pop();
      const fuzzy = charEntities.find(([n]) => {
        const nl = n.toLowerCase();
        return nl.includes(lower) || lower.includes(nl) || (surname.length > 3 && nl.includes(surname));
      });
      if (fuzzy) {
        let desc = fuzzy[1].bio[0];
        desc = desc.replace(/^.+? is (?:a character|the protagonist) in (?:the TV series )?Pluribus\.\s*/i, "");
        descs[charName] = desc;
      }
    });
    // Also add actor bios for people like John Cena (character name = real name)
    Object.entries(jdActorCharMap).forEach(([actor, charName]) => {
      if (descs[charName]) return;
      const actorEnt = entities[actor];
      if (actorEnt?.bio?.[0]) {
        const bio = actorEnt.bio[0];
        descs[charName] = bio.length > 150 ? bio.slice(0, 147) + "..." : bio;
      }
    });
    return descs;
  }, [entities, jdActorCharMap]);
  const JD_KG_CREW_EXTRAS = [{ title: "Thomas Golubic", type: "CREW", context: "Music Supervisor" }];
  const JD_EXCLUDE_CREW = ["Vince Gilligan", "Vince Gilligan tv-series", "BTR1", "Ricky Cook"];
  const jdAllCrewCards = [
    ...jdCrewCards,
    ...JD_KG_CREW_EXTRAS.filter(c => !jdCrewCards.some(p => p.title === c.title)),
  ];
  const jdDrawerCrewAll = jdAllCrewCards.filter(p => !JD_EXCLUDE_CREW.includes(p.title));
  const jdCreator = entities?.["Vince Gilligan"] ? {
    name: "Vince Gilligan",
    photoUrl: entities["Vince Gilligan"]?.photoUrl || null,
  } : null;
  const jdCrewSectionCount = (jdCreator ? 1 : 0) + jdDrawerCrewAll.length;
  const jdCastSectionCount = jdDrawerLeads.length + jdDrawerCast.length;

  // Build all people list for constellation matching
  const jdAllPeople = useMemo(() => {
    const people = [];
    jdDrawerLeads.forEach(p => people.push({ ...p, _section: "lead" }));
    jdDrawerCast.forEach(p => people.push({ ...p, _section: "cast" }));
    if (jdCreator) people.push({ title: jdCreator.name, photoUrl: jdCreator.photoUrl, _section: "crew" });
    jdDrawerCrewAll.forEach(p => people.push({ ...p, _section: "crew" }));
    return people;
  }, [jdDrawerLeads, jdDrawerCast, jdCreator, jdDrawerCrewAll]);

  // Constellation info: build personConstellations from graph adjacency


  // Fixed 5 constellation tabs matching the graph hub types
  const CONSTELLATION_FILTER_TABS = [
    { id: "all", label: "All" },
    { id: "person", label: "Cast" },
    { id: "creator", label: "Creators" },
    { id: "concept", label: "Influences" },
    { id: "music", label: "Music" },
    { id: "theme", label: "Themes" },
  ];

  // Build person→constellation set from graph adjacency (which hubs they connect to)
  const personHubMap = useMemo(() => {
    if (!jdGraphData) return new Map();
    const nodes = jdGraphData.nodes || [];
    const edges = jdGraphData.edges || [];

    // Identify hub node IDs and their types
    const hubIdToType = new Map();
    nodes.forEach(n => { if (n.isHub) hubIdToType.set(n.id, n.type); });

    // Build adjacency
    const adj = new Map();
    nodes.forEach(n => adj.set(n.id, new Set()));
    edges.forEach(e => {
      const sid = typeof e.source === "object" ? e.source.id : e.source;
      const tid = typeof e.target === "object" ? e.target.id : e.target;
      if (adj.has(sid)) adj.get(sid).add(tid);
      if (adj.has(tid)) adj.get(tid).add(sid);
    });

    // For each person, find which hub types they connect to (directly or via hub neighbors)
    const slugify = (name) => name.toLowerCase().replace(/['']/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    const result = new Map();

    jdAllPeople.forEach(p => {
      const name = p.title || p.name;
      const slug = slugify(name);
      const hubs = new Set();

      // Check direct adjacency to hubs
      const neighbors = adj.get(slug);
      if (neighbors) {
        neighbors.forEach(nid => {
          const hubType = hubIdToType.get(nid);
          if (hubType) hubs.add(hubType);
        });
      }

      // Fallback: use section to infer hub type
      if (hubs.size === 0) {
        if (p._section === "lead" || p._section === "cast") hubs.add("person");
        else if (p._section === "crew") hubs.add("creator");
      }

      result.set(name, hubs);
    });

    return result;
  }, [jdGraphData, jdAllPeople]);

  // Count items matching each filter tab
  const drawerTabCounts = useMemo(() => {
    const counts = {};
    counts.all = jdAllPeople.length;
    CONSTELLATION_FILTER_TABS.forEach(tab => {
      if (tab.id === "all") return;
      // Content tabs count actual content items, not people
      if (tab.id === "concept") { counts[tab.id] = jdInfluenceCards.length; return; }
      if (tab.id === "music") { counts[tab.id] = jdMusicCards.length; return; }
      if (tab.id === "theme") { counts[tab.id] = jdThemeCards.length; return; }
      let count = 0;
      jdAllPeople.forEach(p => {
        const name = p.title || p.name;
        const hubs = personHubMap.get(name);
        if (hubs && hubs.has(tab.id)) count++;
      });
      counts[tab.id] = count;
    });
    return counts;
  }, [jdAllPeople, personHubMap, jdInfluenceCards, jdMusicCards, jdThemeCards]);

  // Sort people: matching hub type to top for active filter
  const sortPeopleByMode = (people, mode) => {
    if (mode === "all") return people;
    return [...people].sort((a, b) => {
      const aName = a.title || a.name;
      const bName = b.title || b.name;
      const aHubs = personHubMap.get(aName);
      const bHubs = personHubMap.get(bName);
      const aMatch = aHubs && aHubs.has(mode) ? 1 : 0;
      const bMatch = bHubs && bHubs.has(mode) ? 1 : 0;
      return bMatch - aMatch;
    });
  };

  // --- renderConstellationDrawer ---
  const renderConstellationDrawer = () => {
    const F = "'DM Sans', sans-serif";

    const ConstellationPersonRow = ({ name, subtitle, subtitleColor, photoUrl, charDesc, nodeId, dimmed }) => {
      const active = focusNodeId === nodeId;
      const initials = (name || "").split(" ").map(n => n[0]).join("").slice(0, 2);
      const [hovered, setHovered] = useState(false);
      return (
        <div
          onClick={() => {
            if (focusNodeId === nodeId) {
              setFocusNodeId(null); // deselect
            } else {
              setFocusNodeId(nodeId);
            }
          }}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          style={{
            display: "flex", alignItems: "center", gap: 14, padding: "12px 24px",
            cursor: "pointer", transition: "background 0.15s, opacity 0.15s",
            background: active ? "linear-gradient(135deg, #fffdf5, #fff8e8)" : hovered ? "#faf8f5" : "transparent",
            borderLeft: active ? "3px solid #f5b800" : "3px solid transparent",
            opacity: dimmed && !active ? 0.35 : 1,
          }}
        >
          {/* Active dot */}
          <div style={{
            width: 8, height: 8, borderRadius: "50%", flexShrink: 0,
            background: active ? "#f5b800" : "transparent",
            transition: "background 0.15s",
          }} />
          <div style={{
            width: 56, height: 56, borderRadius: 10, flexShrink: 0,
            background: photoUrl ? `url(${photoUrl}) top center/cover no-repeat` : "linear-gradient(135deg, #fffdf5, #fff8e8)",
            border: active ? "2px solid #f5b800" : "1.5px solid #d8cfc2",
            boxShadow: active ? "0 0 10px rgba(245,184,0,0.35)" : "none",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 16, fontWeight: 700, color: "#1a2744", fontFamily: F,
            transition: "border 0.15s, box-shadow 0.15s",
          }}>
            {!photoUrl && initials}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: F, fontSize: 15, fontWeight: 700, color: "#1a2744", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{name}</div>
            {subtitle && <div style={{ fontFamily: F, fontSize: 12, fontWeight: 600, color: subtitleColor || "#2563eb", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", marginTop: 2 }}>{subtitle}</div>}
            {charDesc && <div style={{ display: "grid", gridTemplateRows: (hovered || active) ? "1fr" : "0fr", transition: "grid-template-rows 0.35s ease, opacity 0.3s ease", opacity: (hovered || active) ? 1 : 0 }}><div style={{ overflow: "hidden", minHeight: 0 }}><div style={{ fontFamily: F, fontSize: 11.5, fontWeight: 500, color: "#3d3028", marginTop: 3, lineHeight: 1.4 }}>{charDesc}</div></div></div>}
          </div>
        </div>
      );
    };

    const SectionHead = ({ label, count }) => (
      <div style={{ padding: "18px 24px 8px", fontFamily: F, fontSize: 11, fontWeight: 700, color: "#1a2744", textTransform: "uppercase", letterSpacing: "0.8px" }}>
        {label} <span style={{ fontWeight: 600 }}>({count})</span>
      </div>
    );

    const InfluenceWorkRow = ({ card }) => {
      const nodeId = card.title.toLowerCase().replace(/['']/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
      const active = focusNodeId === nodeId;
      const [hovered, setHovered] = useState(false);
      const typeLabel = card.type === "TV" ? "TV Series" : card.type === "FILM" ? "Film" : card.type;
      return (
        <div
          onClick={() => setFocusNodeId(focusNodeId === nodeId ? null : nodeId)}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          style={{
            display: "flex", alignItems: "center", gap: 14, padding: "12px 24px",
            cursor: "pointer", transition: "background 0.15s",
            background: active ? "linear-gradient(135deg, #fffdf5, #fff8e8)" : hovered ? "#faf8f5" : "transparent",
            borderLeft: active ? "3px solid #f5b800" : "3px solid transparent",
          }}
        >
          <div style={{
            width: 8, height: 8, borderRadius: "50%", flexShrink: 0,
            background: active ? "#f5b800" : "transparent",
            transition: "background 0.15s",
          }} />
          <div style={{
            width: 56, height: 74, borderRadius: 6, flexShrink: 0,
            background: card.posterUrl ? `url(${card.posterUrl}) center/cover no-repeat` : "linear-gradient(135deg, #fffdf5, #fff8e8)",
            border: active ? "2px solid #f5b800" : "1.5px solid #d8cfc2",
            boxShadow: active ? "0 0 10px rgba(245,184,0,0.35)" : "none",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 12, fontWeight: 700, color: "#1a2744", fontFamily: F,
            transition: "border 0.15s, box-shadow 0.15s",
          }}>
            {!card.posterUrl && card.icon}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: F, fontSize: 15, fontWeight: 700, color: "#1a2744", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{card.title}</div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 3 }}>
              <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, fontWeight: 600, color: "#fff", background: card.type === "TV" ? "#2563eb" : "#16803c", padding: "2px 6px", borderRadius: 4, textTransform: "uppercase", letterSpacing: "0.5px" }}>{typeLabel}</span>
              {card.meta && <span style={{ fontFamily: F, fontSize: 12, fontWeight: 500, color: "#6b5d4f" }}>{card.meta}</span>}
            </div>
            {card.context && <div style={{ display: "grid", gridTemplateRows: (hovered || active) ? "1fr" : "0fr", transition: "grid-template-rows 0.35s ease, opacity 0.3s ease", opacity: (hovered || active) ? 1 : 0 }}><div style={{ overflow: "hidden", minHeight: 0 }}><div style={{ fontFamily: F, fontSize: 11.5, fontWeight: 500, color: "#3d3028", marginTop: 3, lineHeight: 1.4 }}>{card.context}</div></div></div>}
          </div>
        </div>
      );
    };

    const MusicArtistRow = ({ card }) => {
      const nodeId = card.title.toLowerCase().replace(/['']/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
      const active = focusNodeId === nodeId;
      const [hovered, setHovered] = useState(false);
      const entityData = entities?.[card.title];
      const photoUrl = entityData?.photoUrl || null;
      const initials = (card.title || "").split(" ").map(n => n[0]).join("").slice(0, 2);
      return (
        <div
          onClick={() => setFocusNodeId(focusNodeId === nodeId ? null : nodeId)}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          style={{
            display: "flex", alignItems: "center", gap: 14, padding: "12px 24px",
            cursor: "pointer", transition: "background 0.15s",
            background: active ? "linear-gradient(135deg, #fffdf5, #fff8e8)" : hovered ? "#faf8f5" : "transparent",
            borderLeft: active ? "3px solid #f5b800" : "3px solid transparent",
          }}
        >
          <div style={{
            width: 8, height: 8, borderRadius: "50%", flexShrink: 0,
            background: active ? "#f5b800" : "transparent",
            transition: "background 0.15s",
          }} />
          <div style={{
            width: 56, height: 56, borderRadius: 10, flexShrink: 0,
            background: photoUrl ? `url(${photoUrl}) center/cover no-repeat` : "linear-gradient(135deg, #e8f5e9, #c8e6c9)",
            border: active ? "2px solid #f5b800" : "1.5px solid #d8cfc2",
            boxShadow: active ? "0 0 10px rgba(245,184,0,0.35)" : "none",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 16, fontWeight: 700, color: "#1a2744", fontFamily: F,
            transition: "border 0.15s, box-shadow 0.15s",
          }}>
            {!photoUrl && initials}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: F, fontSize: 15, fontWeight: 700, color: "#1a2744", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{card.title}</div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 3 }}>
              <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, fontWeight: 600, color: "#fff", background: "#47A617", padding: "2px 6px", borderRadius: 4, textTransform: "uppercase", letterSpacing: "0.5px" }}>MUSIC</span>
              {card.meta && <span style={{ fontFamily: F, fontSize: 12, fontWeight: 500, color: "#6b5d4f" }}>{card.meta}</span>}
            </div>
            {card.context && <div style={{ display: "grid", gridTemplateRows: (hovered || active) ? "1fr" : "0fr", transition: "grid-template-rows 0.35s ease, opacity 0.3s ease", opacity: (hovered || active) ? 1 : 0 }}><div style={{ overflow: "hidden", minHeight: 0 }}><div style={{ fontFamily: F, fontSize: 11.5, fontWeight: 500, color: "#3d3028", marginTop: 3, lineHeight: 1.4 }}>{card.context}</div></div></div>}
          </div>
        </div>
      );
    };

    const ThemeRow = ({ theme }) => {
      const nodeId = theme.name.toLowerCase().replace(/['']/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
      const active = focusNodeId === nodeId;
      const [hovered, setHovered] = useState(false);
      const THEME_COLORS = {
        "collective consciousness": "#2563eb", isolation: "#a78bfa",
        survival: "#0891b2", choice: "#7c3aed", morality: "#9f1239",
        romance: "#be185d", assimilation: "#2563eb", independence: "#8b5cf6",
        loss: "#dc2626", trauma: "#ea580c",
      };
      const themeColor = THEME_COLORS[theme.key] || "#8b5cf6";
      const desc = `${theme.videoCount} analysis videos, ${theme.charCount} character moments`;
      return (
        <div
          onClick={() => setFocusNodeId(focusNodeId === nodeId ? null : nodeId)}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          style={{
            display: "flex", alignItems: "center", gap: 14, padding: "12px 24px",
            cursor: "pointer", transition: "background 0.15s",
            background: active ? "linear-gradient(135deg, #fffdf5, #fff8e8)" : hovered ? "#faf8f5" : "transparent",
            borderLeft: active ? "3px solid #f5b800" : "3px solid transparent",
          }}
        >
          <div style={{
            width: 8, height: 8, borderRadius: "50%", flexShrink: 0,
            background: active ? "#f5b800" : "transparent",
            transition: "background 0.15s",
          }} />
          <div style={{
            width: 56, height: 56, borderRadius: 10, flexShrink: 0,
            background: `linear-gradient(135deg, ${themeColor}22, ${themeColor}44)`,
            border: active ? "2px solid #f5b800" : `1.5px solid ${themeColor}66`,
            boxShadow: active ? "0 0 10px rgba(245,184,0,0.35)" : "none",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 22, transition: "border 0.15s, box-shadow 0.15s",
          }}>
            <div style={{ width: 18, height: 18, borderRadius: "50%", background: themeColor }} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: F, fontSize: 15, fontWeight: 700, color: "#1a2744", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{theme.name}</div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 3 }}>
              <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, fontWeight: 600, color: "#fff", background: themeColor, padding: "2px 6px", borderRadius: 4, textTransform: "uppercase", letterSpacing: "0.5px" }}>THEME</span>
            </div>
            {<div style={{ display: "grid", gridTemplateRows: (hovered || active) ? "1fr" : "0fr", transition: "grid-template-rows 0.35s ease, opacity 0.3s ease", opacity: (hovered || active) ? 1 : 0 }}><div style={{ overflow: "hidden", minHeight: 0 }}><div style={{ fontFamily: F, fontSize: 11.5, fontWeight: 500, color: "#3d3028", marginTop: 3, lineHeight: 1.4 }}>{desc}</div></div></div>}
          </div>
        </div>
      );
    };

    const slugifyName = (name) => name.toLowerCase().replace(/['']/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

    // Check if a person matches the active filter
    const isMatch = (person) => {
      const name = person.title || person.name;
      const section = person._section;
      if (drawerSortMode === "all") return true;
      // Cast/Creators use section data (reliable)
      if (drawerSortMode === "person") return section === "lead" || section === "cast";
      if (drawerSortMode === "creator") return section === "crew";
      // Influences/Music/Themes use graph adjacency
      const hubs = personHubMap.get(name);
      return hubs && hubs.has(drawerSortMode);
    };

    // Build flat sorted list for filtered view: matches first, then non-matches
    const buildPersonEntry = (p, section) => {
      const isCrew = section === "crew";
      const name = p.title || p.name;
      const charName = !isCrew ? (jdActorCharMap[name] || p.character || "") : "";
      const entityData = entities?.[name];
      const desc = !isCrew ? (JD_CHARACTER_DESCS[charName] || "") : (entityData?.bio?.[0] ? (entityData.bio[0].length > 150 ? entityData.bio[0].slice(0, 147) + "..." : entityData.bio[0]) : "");
      const role = isCrew ? (JD_KG_CREW_ROLES[name] || p.context || p.type || "") : "";
      return {
        name,
        subtitle: isCrew ? role : (charName ? `as ${charName}` : ""),
        subtitleColor: isCrew ? "#3d3028" : undefined,
        photoUrl: entityData?.photoUrl || p.photoUrl,
        charDesc: desc,
        nodeId: slugifyName(name),
        _person: { ...p, _section: section },
      };
    };

    const filteredList = drawerSortMode !== "all" ? (() => {
      // Build flat list of all people
      const all = [];
      jdDrawerLeads.forEach(p => all.push(buildPersonEntry(p, "lead")));
      jdDrawerCast.forEach(p => all.push(buildPersonEntry(p, "cast")));
      if (jdCreator) all.push({
        name: "Vince Gilligan", subtitle: JD_KG_CREW_ROLES["Vince Gilligan"],
        subtitleColor: "#3d3028", photoUrl: entities?.["Vince Gilligan"]?.photoUrl,
        charDesc: "", nodeId: slugifyName("Vince Gilligan"),
        _person: { title: "Vince Gilligan", _section: "crew" },
      });
      jdDrawerCrewAll.forEach(p => all.push(buildPersonEntry(p, "crew")));
      // Sort: matches first
      const matches = all.filter(e => isMatch(e._person));
      const nonMatches = all.filter(e => !isMatch(e._person));
      return { matches, nonMatches };
    })() : null;

    return (
      <div style={{
        width: "100%", height: "100%", overflow: "hidden",
        borderLeft: constellationDrawerOpen ? "2px solid #d8cfc2" : "none",
        background: "#f0ebe3",
        display: "flex", flexDirection: "column",
        boxShadow: constellationDrawerOpen ? "-6px 0 30px rgba(44,24,16,.1)" : "none",
      }}>
        <div style={{
          borderBottom: "2px solid #e8e0d4",
          background: "rgba(240,235,227,0.97)", backdropFilter: "blur(8px)",
          position: "sticky", top: 0, zIndex: 2, minWidth: 400,
        }}>
          <div style={{ padding: "16px 24px 0", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontFamily: F, fontSize: 14, fontWeight: 700, textTransform: "uppercase", letterSpacing: "1.5px", color: "#1a2744" }}>Pluribus Directory</span>
            <span
              onClick={() => { setConstellationDrawerOpen(false); setFocusNodeId(null); }}
              style={{ fontSize: 22, color: "#1a2744", cursor: "pointer", lineHeight: 1, fontWeight: 300 }}
              onMouseEnter={(e) => { e.currentTarget.style.color = "#f5b800"; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = "#1a2744"; }}
            >×</span>
          </div>
          {/* Filter pills */}
          <div style={{ padding: "10px 24px", display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            {CONSTELLATION_FILTER_TABS.map(tab => {
              const count = drawerTabCounts[tab.id] || 0;
              const isActive = drawerSortMode === tab.id;
              return (
                <span
                  key={tab.id}
                  onClick={() => { setDrawerSortMode(tab.id); if (tab.id === "all") setFocusNodeId(null); }}
                  style={{
                    fontFamily: F, fontSize: 12, fontWeight: 700, color: "#1a2744",
                    padding: "5px 12px", borderRadius: 8, cursor: "pointer",
                    background: "linear-gradient(135deg, #fffdf5, #fff8e8)",
                    border: isActive ? "1.5px solid #f5b800" : "1.5px solid #d8cfc2",
                    boxShadow: isActive ? "0 0 8px rgba(245,184,0,0.35)" : "none",
                    transition: "all 0.15s",
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#f5b800"; }}
                  onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.borderColor = "#d8cfc2"; }}
                >{tab.label} ({count})</span>
              );
            })}
          </div>
        </div>
        <div style={{ flex: 1, overflowY: "auto", minWidth: 400 }}>
          {drawerSortMode === "all" ? (
            <>
              {/* Lead Cast */}
              {jdDrawerLeads.length > 0 && (
                <>
                  <SectionHead label="Lead Cast" count={jdDrawerLeads.length} />
                  {jdDrawerLeads.map(p => {
                    const name = p.title || p.name;
                    const charName = jdActorCharMap[name] || p.character || "";
                    const entityData = entities?.[name];
                    const desc = JD_CHARACTER_DESCS[charName] || "";
                    const nodeId = slugifyName(name);
                    return (
                      <ConstellationPersonRow key={name} name={name} subtitle={charName ? `as ${charName}` : ""} photoUrl={entityData?.photoUrl || p.photoUrl} charDesc={desc} nodeId={nodeId} />
                    );
                  })}
                </>
              )}
              {/* Cast */}
              {jdDrawerCast.length > 0 && (
                <>
                  <SectionHead label="Cast" count={jdDrawerCast.length} />
                  {jdDrawerCast.map(p => {
                    const name = p.title || p.name;
                    const charName = jdActorCharMap[name] || p.character || "";
                    const entityData = entities?.[name];
                    const desc = JD_CHARACTER_DESCS[charName] || "";
                    const nodeId = slugifyName(name);
                    return (
                      <ConstellationPersonRow key={name} name={name} subtitle={charName ? `as ${charName}` : ""} photoUrl={entityData?.photoUrl || p.photoUrl} charDesc={desc} nodeId={nodeId} />
                    );
                  })}
                </>
              )}
              {/* Creators & Key Crew */}
              <SectionHead label="Creators & Key Crew" count={jdCrewSectionCount} />
              {jdCreator && (
                <ConstellationPersonRow name="Vince Gilligan" subtitle={JD_KG_CREW_ROLES["Vince Gilligan"]} subtitleColor="#3d3028" photoUrl={entities?.["Vince Gilligan"]?.photoUrl} nodeId={slugifyName("Vince Gilligan")} />
              )}
              {jdDrawerCrewAll.map(p => {
                const name = p.title || p.name;
                const role = JD_KG_CREW_ROLES[name] || p.context || p.type || "";
                const nodeId = slugifyName(name);
                return (
                  <ConstellationPersonRow key={name} name={name} subtitle={role} subtitleColor="#3d3028" photoUrl={entities?.[name]?.photoUrl || p.photoUrl} nodeId={nodeId} />
                );
              })}
            </>
          ) : drawerSortMode === "concept" ? (
            <>
              {/* Influences tab: show actual influence works */}
              <SectionHead label="Key Influences" count={jdInfluenceCards.length} />
              {jdInfluenceCards.map(card => (
                <InfluenceWorkRow key={card.title} card={card} />
              ))}
            </>
          ) : drawerSortMode === "music" ? (
            <>
              {/* Music tab: show featured music artists */}
              <SectionHead label="Featured Music" count={jdMusicCards.length} />
              {jdMusicCards.map(card => (
                <MusicArtistRow key={card.title} card={card} />
              ))}
            </>
          ) : drawerSortMode === "theme" ? (
            <>
              {/* Themes tab: show core themes */}
              <SectionHead label="Themes" count={jdThemeCards.length} />
              {jdThemeCards.map(theme => (
                <ThemeRow key={theme.name} theme={theme} />
              ))}
            </>
          ) : (
            <>
              {/* Filtered view: matches at top, non-matches dimmed below */}
              {filteredList && filteredList.matches.length > 0 && (
                <>
                  <SectionHead label={CONSTELLATION_FILTER_TABS.find(t => t.id === drawerSortMode)?.label || ""} count={filteredList.matches.length} />
                  {filteredList.matches.map(e => (
                    <ConstellationPersonRow key={e.name} name={e.name} subtitle={e.subtitle} subtitleColor={e.subtitleColor} photoUrl={e.photoUrl} charDesc={e.charDesc} nodeId={e.nodeId} />
                  ))}
                </>
              )}
              {filteredList && filteredList.nonMatches.length > 0 && (
                <>
                  <SectionHead label="Other" count={filteredList.nonMatches.length} />
                  {filteredList.nonMatches.map(e => (
                    <ConstellationPersonRow key={e.name} name={e.name} subtitle={e.subtitle} subtitleColor={e.subtitleColor} photoUrl={e.photoUrl} charDesc={e.charDesc} nodeId={e.nodeId} dimmed={true} />
                  ))}
                </>
              )}
            </>
          )}
          <div style={{ height: 24 }} />
        </div>
      </div>
    );
  };

  const showQueryView = viewMode === "query" && queryGraphData;

  return (
    <div style={{ height: "100vh", background: "transparent", overflow: "hidden" }}>
      <SideNav active="universe" onNavigate={onNavigate} hasActiveResponse={hasActiveResponse} />
      <div style={{ marginLeft: 72, height: "100vh", display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <TopNav onNavigate={onNavigate} selectedModel={selectedModel} onModelChange={onModelChange} selectedUniverse={selectedUniverse} onUniverseChange={onUniverseChange} onNewChat={onNewChat} />

        {/* Dev tabs */}
        <div style={{
          padding: "0 20px",
          display: "flex",
          gap: 0,
          borderBottom: `1px solid ${T.border}`,
          background: T.bgCard,
          flexShrink: 0,
        }}>
          {CONSTELLATION_TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: "10px 20px",
                fontSize: 12,
                fontWeight: activeTab === tab.id ? 700 : 500,
                color: activeTab === tab.id ? T.blue : T.textMuted,
                background: "none",
                border: "none",
                borderBottom: activeTab === tab.id ? `2px solid ${T.blue}` : "2px solid transparent",
                cursor: "pointer",
                fontFamily: "'DM Sans', sans-serif",
                transition: "all 0.15s",
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* View toggle — only visible when query graph data exists on universe tab */}
        {activeTab === "universe" && queryGraphData && (
          <div style={{
            display: "flex", alignItems: "center", gap: 8,
            padding: "8px 20px",
            borderBottom: `1px solid ${T.border}`,
            background: T.bgCard,
            flexShrink: 0,
          }}>
            <button
              onClick={() => setViewMode("query")}
              style={{
                padding: "5px 14px", fontSize: 12, fontWeight: 600,
                fontFamily: "'DM Mono', monospace",
                border: `1px solid ${viewMode === "query" ? T.blue : T.border}`,
                borderRadius: 6, cursor: "pointer",
                background: viewMode === "query" ? T.blue : "transparent",
                color: viewMode === "query" ? "#fff" : T.textMuted,
                transition: "all 0.15s",
              }}
            >
              {queryGraphData.entityName || "Query View"}
            </button>
            <button
              onClick={() => setViewMode("universe")}
              style={{
                padding: "5px 14px", fontSize: 12, fontWeight: 600,
                fontFamily: "'DM Mono', monospace",
                border: `1px solid ${viewMode === "universe" ? T.blue : T.border}`,
                borderRadius: 6, cursor: "pointer",
                background: viewMode === "universe" ? T.blue : "transparent",
                color: viewMode === "universe" ? "#fff" : T.textMuted,
                transition: "all 0.15s",
              }}
            >
              Full Universe
            </button>
            {showQueryView && (
              <span style={{
                fontSize: 11, color: T.textDim, fontFamily: "'DM Sans', sans-serif",
                marginLeft: 8,
              }}>
                {queryGraphData.nodes.length} entities, {queryGraphData.edges.length} relationships
              </span>
            )}
          </div>
        )}

        <div style={{ flex: 1, position: "relative", minHeight: 0 }}>
          {activeTab === "universe" && (
            showQueryView ? (
              <UniverseNetwork
                entityName={queryGraphData.centerId}
                onEntityTap={(name) => {
                  onSelectEntity(name);
                  onNavigate(SCREENS.ENTITY_DETAIL);
                }}
                assembledData={entities}
                responseData={responseData}
                queryGraphOverride={queryGraphData}
              />
            ) : (
              <UniverseNetwork
                entityName="Pluribus"
                onEntityTap={(name) => {
                  onSelectEntity(name);
                  onNavigate(SCREENS.ENTITY_DETAIL);
                }}
                assembledData={entities}
                responseData={responseData}
              />
            )
          )}

          {activeTab === "jd-universe" && (
            <div style={{ display: "flex", position: "absolute", inset: 0 }}>
              {/* Graph area — flexes to fill remaining space */}
              <div style={{ flex: 1, position: "relative", minWidth: 0 }}>
                <UniverseNetwork
                  entityName="Pluribus"
                  onEntityTap={(name) => {
                    onSelectEntity(name);
                    onNavigate(SCREENS.ENTITY_DETAIL);
                  }}
                  assembledData={entities}
                  responseData={responseData}
                  smartCamera={true}
                  focusNodeId={focusNodeId}
                  activeHubType={drawerSortMode}
                  onGraphReady={setJdGraphData}
                  onNodeFocus={(nodeId) => {
                    setFocusNodeId(nodeId);
                    if (!nodeId) { setDrawerSortMode("all"); return; }
                    // Determine which hub this node belongs to and update drawer filter
                    if (jdGraphData) {
                      const nodes = jdGraphData.nodes || [];
                      const edges = jdGraphData.edges || [];
                      const hubIdToType = new Map();
                      nodes.forEach(n => { if (n.isHub) hubIdToType.set(n.id, n.type); });
                      // Check if clicked node IS a hub
                      if (hubIdToType.has(nodeId)) {
                        setDrawerSortMode(hubIdToType.get(nodeId));
                        return;
                      }
                      // Find which hub this node connects to
                      for (const e of edges) {
                        const sid = typeof e.source === "object" ? e.source.id : e.source;
                        const tid = typeof e.target === "object" ? e.target.id : e.target;
                        if (sid === nodeId && hubIdToType.has(tid)) { setDrawerSortMode(hubIdToType.get(tid)); return; }
                        if (tid === nodeId && hubIdToType.has(sid)) { setDrawerSortMode(hubIdToType.get(sid)); return; }
                      }
                    }
                  }}
                />
                {/* Drawer toggle tab */}
                {!constellationDrawerOpen && (
                  <div
                    onClick={() => setConstellationDrawerOpen(true)}
                    style={{
                      position: "absolute", right: 0, top: "50%", transform: "translateY(-50%)",
                      background: "#1a2744", border: "none", padding: "14px 8px",
                      cursor: "pointer", borderRadius: "8px 0 0 8px",
                      writingMode: "vertical-rl", fontSize: 11, letterSpacing: "0.8px",
                      color: "#ffce3a", fontWeight: 700, fontFamily: "'DM Sans', sans-serif",
                      zIndex: 10, transition: "padding 0.15s",
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.paddingLeft = "12px"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.paddingLeft = "8px"; }}
                  >PEOPLE</div>
                )}
              </div>
              {/* Drawer */}
              <div style={{
                width: constellationDrawerOpen ? 400 : 0,
                overflow: "hidden",
                transition: "width 0.8s cubic-bezier(0.16,1,0.3,1)",
                flexShrink: 0,
              }}>
                {renderConstellationDrawer()}
              </div>
            </div>
          )}

          {activeTab === "themes" && (
            <ThemesNetwork
              entityName="Pluribus"
              themesDB={null}
              themeVideos={null}
              onThemeTap={() => {}}
              onEntityTap={() => {}}
            />
          )}

          {activeTab === "static" && (
            <NetworkGraph
              nodes={MOCK_NODES}
              edges={MOCK_EDGES}
              centerId="pluribus"
              types={UNIVERSE_TYPES}
              relColors={REL_COLORS}
              onNodeClick={() => {}}
            />
          )}

          {/* Loading overlay */}
          {graphLoading && (
            <div style={{
              position: "absolute", inset: 0,
              display: "flex", alignItems: "center", justifyContent: "center",
              background: "rgba(255,255,255,0.7)", zIndex: 10,
            }}>
              <div style={{ textAlign: "center" }}>
                <div style={{
                  width: 28, height: 28, margin: "0 auto 10px",
                  border: "3px solid #e5e7eb", borderTopColor: T.blue,
                  borderRadius: "50%", animation: "spin 0.8s linear infinite",
                }} />
                <div style={{ fontSize: 13, fontWeight: 500, color: T.textMuted, fontFamily: "'DM Sans', sans-serif" }}>
                  Searching knowledge graph...
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Entity search input — universe tab only */}
        {activeTab === "universe" && <div style={{
          padding: "10px 20px", borderTop: `1px solid ${T.border}`,
          background: T.bgCard, flexShrink: 0,
          display: "flex", gap: 8, alignItems: "center",
        }}>
          <input
            type="text"
            value={graphQuery}
            onChange={(e) => setGraphQuery(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleGraphQuery(); }}
            placeholder="Search for an entity (e.g. Rhea Seehorn, Breaking Bad)..."
            disabled={graphLoading}
            style={{
              flex: 1, padding: "9px 14px", fontSize: 13,
              fontFamily: "'DM Sans', sans-serif",
              border: `1px solid ${T.border}`, borderRadius: 8,
              background: T.bgElevated, color: T.text,
              outline: "none",
              opacity: graphLoading ? 0.5 : 1,
            }}
          />
          <button
            onClick={handleGraphQuery}
            disabled={graphLoading || !graphQuery.trim()}
            style={{
              padding: "9px 18px", fontSize: 12, fontWeight: 600,
              fontFamily: "'DM Mono', monospace",
              border: `1px solid ${T.blue}`, borderRadius: 8,
              background: T.blue, color: "#fff", cursor: "pointer",
              opacity: (graphLoading || !graphQuery.trim()) ? 0.5 : 1,
            }}
          >
            Explore
          </button>
        </div>}
      </div>
    </div>
  );
}

// ==========================================================
//  SCREEN 6: ENTITY DETAIL — Full Knowledge Graph Record
// ==========================================================

function CollaboratorRow({ name, role, projects, projectCount, photoUrl }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "12px 16px",
        background: T.bgCard,
        border: `1px solid ${T.border}`,
        borderRadius: 10,
        cursor: "pointer",
        transition: "all 0.15s",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: 10,
            background: photoUrl ? `url(${photoUrl}) top center/cover no-repeat` : T.blueLight,
            border: `1px solid ${photoUrl ? 'rgba(0,0,0,0.1)' : T.blueBorder}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 16,
            color: T.blue,
            fontWeight: 700,
            fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
            flexShrink: 0,
          }}
        >
          {!photoUrl && name.split(" ").map((n) => n[0]).join("")}
        </div>
        <div>
          <div style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", fontSize: 14, fontWeight: 600, color: T.text }}>
            {name}
          </div>
          <div style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", fontSize: 12, color: T.textMuted, marginTop: 1 }}>
            {role}
          </div>
        </div>
      </div>
      <div style={{ textAlign: "right" }}>
        <div style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", fontSize: 11, color: T.textDim }}>
          {projects}
        </div>
        <div style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", fontSize: 10, color: T.blue, fontWeight: 600, marginTop: 2 }}>
          {projectCount} projects
        </div>
      </div>
    </div>
  );
}

function ThemeCard({ title, description, works }) {
  return (
    <div
      style={{
        background: T.bgCard,
        border: `1px solid ${T.border}`,
        borderRadius: 12,
        padding: 18,
        cursor: "pointer",
        boxShadow: T.shadow,
        flex: 1,
        minWidth: 200,
      }}
    >
      <div
        style={{
          fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
          fontSize: 15,
          fontWeight: 700,
          color: T.text,
          marginBottom: 6,
        }}
      >
        {title}
      </div>
      <div
        style={{
          fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
          fontSize: 13,
          color: T.textMuted,
          lineHeight: 1.6,
          marginBottom: 10,
        }}
      >
        {description}
      </div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {works.map((w) => (
          <span
            key={w}
            style={{
              fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
              fontSize: 10.5,
              fontWeight: 600,
              color: T.blue,
              background: T.blueLight,
              border: `1px solid ${T.blueBorder}`,
              padding: "3px 9px",
              borderRadius: 6,
            }}
          >
            {w}
          </span>
        ))}
      </div>
    </div>
  );
}


// ==========================================================
//  SHARED COMPONENTS — Used by nav screens
// ==========================================================

// ==========================================================
//  CURATED THEME DATA — 3 Pathways, 10 Themes
// ==========================================================

const PATHWAYS = [
  {
    id: "hivemind", title: "The Hive Mind", subtitle: "The sci-fi question at the center", color: "#2563eb",
    hook: "What if losing yourself felt like relief?",
    themes: ["collective", "psychology", "immunity"],
    description: "Pluribus sits in a lineage of sci-fi that uses alien contact as a mirror for humanity's relationship with collective consciousness. From the paranoid Cold War allegories of Body Snatchers to Star Trek's Borg, this pathway maps the genre questions Pluribus inherits — and subverts.",
  },
  {
    id: "human-cost", title: "The Human Cost", subtitle: "The emotional core", color: "#dc2626",
    hook: "The sci-fi is the premise. The people are the story.",
    themes: ["grief", "trauma", "relationships", "morality"],
    description: "Behind the sci-fi premise, Pluribus is a story about people under extraordinary pressure. This pathway follows the emotional core — grief, trauma, family bonds — through the characters who carry the show's weight.",
  },
  {
    id: "inner-battle", title: "The Inner Battle", subtitle: "Who you are vs. who you're becoming", color: "#7c3aed",
    hook: "The hardest fight is the one against yourself.",
    themes: ["identity", "resistance", "isolation"],
    description: "The most intimate pathway — the one that plays out inside individual characters. Identity, resistance, isolation: these are the themes that make Pluribus feel personal even when the stakes are global.",
  },
];

const THEMES_DB = {
  collective: {
    id: "collective", title: "Collective Consciousness", color: "#2563eb", prominence: 95, pathwayId: "hivemind",
    shortDesc: "When individual minds merge — is it invasion or evolution?",
    fullDesc: "The central sci-fi question of Pluribus: what does it mean when individual minds merge into something larger? The show approaches this not as horror but as genuine ambiguity. The signal offers connection, unity, the end of loneliness — and some characters want it. That's what makes Pluribus more unsettling than a straightforward alien invasion: the threat isn't destruction, it's seduction.",
    hookLine: "The most frightening thing about the signal isn't that it takes away who you are — it's that part of you wants to let it.",
    relatedThemes: ["psychology", "immunity", "identity"],
  },
  psychology: {
    id: "psychology", title: "Psychology", color: "#6366f1", prominence: 78, pathwayId: "hivemind",
    shortDesc: "How minds actually break under pressure from the signal.",
    fullDesc: "Pluribus treats psychology not as background texture but as mechanism. Characters' pre-existing psychological profiles — their attachment styles, their defense mechanisms, their relationship to control — predict whether they resist the signal or welcome it. The show draws on real psychological research into groupthink, mass formation, and the conditions under which individuals surrender autonomy.",
    hookLine: "The signal doesn't change who you are. It reveals who you were all along.",
    relatedThemes: ["collective", "immunity", "identity"],
  },
  immunity: {
    id: "immunity", title: "Immunity", color: "#0891b2", prominence: 72, pathwayId: "hivemind",
    shortDesc: "Some resist the signal. The show asks whether that's strength or limitation.",
    fullDesc: "Why are some characters immune to the signal while others aren't? Pluribus uses biological immunity as a lens for something psychological: the capacity to resist groupthink, to hold onto individual identity when the collective offers belonging. But the show complicates the heroic reading — the immune characters are also the most isolated, the most rigid, the least able to connect even before the signal arrived.",
    hookLine: "Immunity isn't a superpower. It might be a diagnosis.",
    relatedThemes: ["collective", "psychology", "resistance", "isolation"],
  },
  grief: {
    id: "grief", title: "Grief & Loss", color: "#dc2626", prominence: 85, pathwayId: "human-cost",
    shortDesc: "Loss that predates the signal — and loss the signal causes.",
    fullDesc: "Grief in Pluribus operates on two timelines. Several characters carry losses from before the signal — deaths, broken relationships, abandoned identities — that shape how they respond when the signal arrives. Then the signal itself creates new losses: people who are taken, relationships that can't survive the pressure, the grief of watching someone you love become someone you don't recognize. The show never uses grief as decoration; it's the engine that drives character decisions.",
    hookLine: "The signal didn't cause the grief. It just made it impossible to keep ignoring.",
    relatedThemes: ["trauma", "relationships", "identity"],
  },
  trauma: {
    id: "trauma", title: "Trauma", color: "#ea580c", prominence: 80, pathwayId: "human-cost",
    shortDesc: "Not what happened, but how it echoes through everything after.",
    fullDesc: "Pluribus understands trauma not as a single event but as a pattern of response. Characters carry wounds from before the signal — childhood neglect, violence, loss of agency — and the signal doesn't heal those wounds. It exploits them. The show maps how trauma shapes vulnerability: who breaks, who dissociates, who fights harder precisely because they've been broken before.",
    hookLine: "The signal found the cracks that were already there.",
    relatedThemes: ["grief", "relationships", "isolation"],
  },
  relationships: {
    id: "relationships", title: "Fractured Relationships", color: "#be185d", prominence: 72, pathwayId: "human-cost",
    shortDesc: "Trust becomes dangerous when you can't tell who's still themselves.",
    fullDesc: "Every relationship in Pluribus becomes a test case for trust under impossible conditions. Marriages fracture when one partner joins and the other doesn't. Friendships collapse under suspicion. Parent-child bonds warp when the child changes first. The show's most devastating insight: the signal doesn't destroy relationships directly. It removes the shared reality that relationships depend on.",
    hookLine: "Love doesn't protect you. It just gives the signal more leverage.",
    relatedThemes: ["grief", "morality", "isolation"],
  },
  morality: {
    id: "morality", title: "Morality", color: "#9f1239", prominence: 68, pathwayId: "human-cost",
    shortDesc: "Impossible choices the show refuses to judge for you.",
    fullDesc: "Pluribus constructs moral dilemmas with no clean answers. Is it murder to kill someone who's been joined? Is forced immunity a form of violence? Should the government quarantine the joined or protect their rights? The show refuses to provide moral authority — no character has the complete picture, no decision is validated by the narrative. The audience is left to sit with the discomfort.",
    hookLine: "Everyone in Pluribus thinks they're doing the right thing. That's what makes it terrifying.",
    relatedThemes: ["grief", "relationships", "resistance"],
  },
  identity: {
    id: "identity", title: "Identity Under Pressure", color: "#7c3aed", prominence: 88, pathwayId: "inner-battle",
    shortDesc: "Who are you when everything external is stripped away?",
    fullDesc: "The signal forces every character to confront a question most people never face: what is the self? Is identity the sum of your memories, your relationships, your choices — or something more fundamental? Characters who join report feeling more themselves, not less. Characters who resist cling to identity markers that may have been arbitrary all along. Pluribus treats identity not as fixed but as a negotiation that the signal interrupts.",
    hookLine: "The signal doesn't erase who you are. It asks whether 'who you are' was ever the point.",
    relatedThemes: ["collective", "resistance", "isolation", "psychology"],
  },
  resistance: {
    id: "resistance", title: "Resistance", color: "#8b5cf6", prominence: 82, pathwayId: "inner-battle",
    shortDesc: "The act of saying no — and what it costs to keep saying it.",
    fullDesc: "Resistance in Pluribus is not heroic in any simple sense. The characters who resist the signal pay for it — in isolation, in paranoia, in the growing suspicion that what they're protecting might not be worth the cost. The show asks whether resistance is courage or stubbornness, principle or fear. And it never fully answers.",
    hookLine: "Resistance isn't a virtue. It's a bet — and the odds keep getting worse.",
    relatedThemes: ["identity", "immunity", "isolation", "morality"],
  },
  isolation: {
    id: "isolation", title: "Isolation", color: "#a78bfa", prominence: 70, pathwayId: "inner-battle",
    shortDesc: "The price of staying yourself when everyone else has changed.",
    fullDesc: "Isolation is the shadow side of immunity and resistance. The characters who don't join find themselves increasingly alone — cut off from loved ones who've changed, mistrusted by a government that can't verify their status, and haunted by the question of whether connection was what they needed all along. Pluribus makes isolation feel physical: empty streets, silent phones, the particular loneliness of being the last one left.",
    hookLine: "Freedom and loneliness turn out to be the same thing.",
    relatedThemes: ["immunity", "resistance", "relationships", "grief"],
  },
};

// Maps KG theme keys (from responseData.themeVideos) → curated design theme IDs
const KG_THEME_MAP = {
  "collective consciousness": "collective",
  "isolation": "isolation",
  "morality": "morality",
  "trauma": "trauma",
  "loss": "grief",
  "sacrifice": "grief",
  "mortality": "grief",
  "survival": "immunity",
  "choice": "morality",
  "assimilation": "collective",
  "acceptance": "collective",
  "independence": "resistance",
  "surrender": "resistance",
  "romance": "relationships",
  "passivity": "isolation",
};

// Maps characters → their themes + editorial roles
const CHARACTER_THEME_MAP = {
  "Zosia": { themes: ["collective", "identity", "relationships"], role: "The liaison between worlds" },
  "Manousos Oviedo": { themes: ["resistance", "isolation", "morality"], role: "The stubborn survivor" },
  "Koumba Diabate": { themes: ["morality", "identity", "immunity"], role: "The hedonist philosopher" },
  "Davis Taffler": { themes: ["morality", "resistance", "collective"], role: "The government's voice" },
  "Helen L. Umstead": { themes: ["grief", "relationships", "collective"], role: "The loss that drives everything" },
};

// Maps influence entities → their themes + editorial context
const ENTITY_THEME_MAP = {
  "Invasion of the Body Snatchers": { themes: ["collective", "identity", "psychology"], type: "PRECURSOR", context: "The original Cold War allegory — loss of self as political metaphor" },
  "Invasion of the Body Snatchers (1978)": { themes: ["collective", "isolation", "psychology"], type: "PRECURSOR", context: "Paranoia amplified — the remake that made conformity the real monster" },
  "Star Trek: First Contact": { themes: ["collective", "resistance", "immunity"], type: "INFLUENCE", context: "The Borg as seductive collective — assimilation as upgrade, not death" },
  "The Thing": { themes: ["isolation", "identity", "psychology"], type: "PRECURSOR", context: "Trust collapses when you can't tell who's still human" },
  "They Live": { themes: ["resistance", "collective", "morality"], type: "INFLUENCE", context: "Hidden control structures — the fight to see what's really there" },
  "The Borg": { themes: ["collective", "resistance", "identity"], type: "INFLUENCE", context: "The hive mind as both threat and temptation" },
  "The Twilight Zone": { themes: ["identity", "morality", "isolation"], type: "INFLUENCE", context: "Anthology DNA — moral parables dressed as genre fiction" },
};

// Percentage-based positions for constellation SVG layout
const CONSTELLATION_LAYOUT = {
  center: { x: 50, y: 40 },
  pathways: {
    "hivemind": { x: 30, y: 40 },
    "human-cost": { x: 70, y: 40 },
    "inner-battle": { x: 50, y: 72 },
  },
  themes: {
    "collective": { x: 6, y: 14 },
    "psychology": { x: 4, y: 46 },
    "immunity": { x: 6, y: 72 },
    "grief": { x: 94, y: 14 },
    "trauma": { x: 96, y: 40 },
    "relationships": { x: 96, y: 60 },
    "morality": { x: 94, y: 80 },
    "identity": { x: 20, y: 92 },
    "resistance": { x: 50, y: 96 },
    "isolation": { x: 80, y: 92 },
  },
};

function ProminenceBar({ value, color }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <div style={{ flex: 1, height: 4, background: T.bgElevated, borderRadius: 2, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${value}%`, background: color, borderRadius: 2, transition: "width 0.5s ease" }} />
      </div>
      <span style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", fontSize: 10, fontWeight: 600, color: T.textDim, minWidth: 24 }}>
        {value}%
      </span>
    </div>
  );
}

function VideoTile({ video, accentColor, onClick, library, toggleLibrary }) {
  const [hovered, setHovered] = useState(false);
  const thumbUrl = video.videoId ? `https://img.youtube.com/vi/${video.videoId}/mqdefault.jpg` : null;
  const saveKey = video.title || "";
  const inLibrary = library && library.has(saveKey);
  return (
    <div onClick={onClick} onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)} style={{
      flex: "0 0 auto", width: 248, background: T.bgCard, border: `1px solid ${hovered ? (accentColor || T.blue) + "40" : T.border}`,
      borderRadius: 12, overflow: "hidden", cursor: "pointer", transition: "all 0.2s", position: "relative",
      boxShadow: hovered ? T.shadowHover : T.shadow, transform: hovered ? "translateY(-2px)" : "none",
    }}>
      <div style={{ position: "relative", width: "100%", aspectRatio: "16/9", background: "#0f0f0f", overflow: "hidden" }}>
        {thumbUrl && <img src={thumbUrl} alt={video.title} style={{ width: "100%", height: "100%", objectFit: "cover", opacity: hovered ? 1 : 0.9, transition: "opacity 0.2s" }} onError={(e) => { e.target.style.display = "none"; }} />}
        <div style={{ position: "absolute", inset: 0, background: hovered ? "rgba(0,0,0,0.25)" : "rgba(0,0,0,0.1)", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s" }}>
          <div style={{ width: 36, height: 36, borderRadius: "50%", background: "rgba(255,255,255,0.95)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, color: T.queryBg, opacity: hovered ? 1 : 0, transform: hovered ? "scale(1)" : "scale(0.8)", transition: "all 0.2s", boxShadow: "0 2px 8px rgba(0,0,0,0.3)" }}>▶</div>
        </div>
        {video.timecodeLabel && <div style={{ position: "absolute", bottom: 6, right: 6, background: "rgba(0,0,0,0.8)", padding: "2px 6px", borderRadius: 4, fontFamily: "'SF Mono', Menlo, Monaco, monospace", fontSize: 10, fontWeight: 500, color: "#fff" }}>{video.timecodeLabel}</div>}
      </div>
      <div style={{ padding: "8px 10px 10px" }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 6 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", fontSize: 12, fontWeight: 600, color: T.text, lineHeight: 1.35, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{video.title}</div>
          </div>
          {toggleLibrary && (
            <div onClick={(e) => { e.stopPropagation(); toggleLibrary(saveKey); }} style={{
              width: 22, height: 22, borderRadius: 6, flexShrink: 0,
              background: inLibrary ? T.blue : T.bgElevated,
              border: `1px solid ${inLibrary ? T.blue : T.border}`,
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer", transition: "all 0.2s",
              fontSize: 12, color: inLibrary ? "#fff" : T.textDim, fontWeight: 700,
            }}>
              {inLibrary ? "✓" : "+"}
            </div>
          )}
        </div>
        {video.channel && <div style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", fontSize: 11, color: T.textDim, marginTop: 2 }}>{video.channel}</div>}
        {video.moment && <div style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", fontSize: 11, color: T.textMuted, marginTop: 6, lineHeight: 1.45, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{video.moment}</div>}
      </div>
    </div>
  );
}

function EntityChip({ name, type, context, color, onClick }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)} onClick={onClick} style={{
      display: "flex", alignItems: "center", gap: 10, padding: "10px 14px",
      background: hovered ? `${color}08` : T.bgCard, border: `1px solid ${hovered ? color + "40" : T.border}`,
      borderRadius: 10, cursor: "pointer", transition: "all 0.2s",
    }}>
      <div style={{ width: 6, height: 6, borderRadius: "50%", background: color, flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", fontSize: 13.5, fontWeight: 600, color: T.text }}>{name}</span>
          <span style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", fontSize: 9.5, fontWeight: 700, color: color, background: color + "14", padding: "2px 7px", borderRadius: 4, textTransform: "uppercase", letterSpacing: "0.04em" }}>{type}</span>
        </div>
        {context && <div style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", fontSize: 12, color: T.textMuted, marginTop: 2 }}>{context}</div>}
      </div>
      <span style={{ color: T.textDim, fontSize: 13, flexShrink: 0 }}>→</span>
    </div>
  );
}

function ComposerCard({ composer }) {
  return (
    <div style={{ display: "flex", gap: 16, padding: 18, background: T.bgCard, border: `1px solid ${T.border}`, borderRadius: 14, flex: 1, minWidth: 280 }}>
      <div style={{ width: 56, height: 56, borderRadius: 12, flexShrink: 0, background: composer.photoUrl ? `url(${composer.photoUrl}) top center/cover no-repeat` : T.blueLight, border: `1px solid ${composer.photoUrl ? "rgba(0,0,0,0.1)" : T.blueBorder}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, color: T.blue }}>
        {!composer.photoUrl && "♪"}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", fontSize: 15, fontWeight: 700, color: T.text }}>{composer.name}</div>
        <div style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", fontSize: 11.5, color: T.blue, fontWeight: 600, marginTop: 1 }}>{composer.role}</div>
        {composer.bio && <div style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", fontSize: 12.5, color: T.textMuted, marginTop: 6, lineHeight: 1.55 }}>{composer.bio}</div>}
        <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
          <span style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", fontSize: 10.5, color: T.textDim }}>{composer.trackCount} tracks in Pluribus</span>
          {composer.previousWork && (Array.isArray(composer.previousWork) ? composer.previousWork.length > 0 : !!composer.previousWork) && (
            <span style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", fontSize: 10.5, color: T.textDim }}>Also: {Array.isArray(composer.previousWork) ? composer.previousWork.map(w => w.title || w).join(", ") : composer.previousWork}</span>
          )}
        </div>
      </div>
    </div>
  );
}

function TrackRow({ track, isPlaying, onPlay, index, library, toggleLibrary }) {
  const [hovered, setHovered] = useState(false);
  const isScore = track.type === "score";
  const hasPlayable = track.spotify_url || track.video_id;
  const saveKey = `${track.title} — ${track.artist}`;
  const inLibrary = library && library.has(saveKey);
  return (
    <div onClick={() => hasPlayable && onPlay()} onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)} style={{
      display: "flex", alignItems: "center", gap: 14, padding: "10px 14px",
      background: isPlaying ? T.queryBg : hovered ? T.bgElevated : T.bgCard,
      border: `1px solid ${isPlaying ? "transparent" : T.border}`, borderRadius: 10,
      cursor: hasPlayable ? "pointer" : "default", transition: "all 0.15s", opacity: hasPlayable ? 1 : 0.7,
    }}>
      <div style={{
        width: 28, height: 28, borderRadius: 6, flexShrink: 0,
        background: isScore ? (isPlaying ? "rgba(255,255,255,0.15)" : "linear-gradient(135deg, #1a2744, #2a3a5a)") : (isPlaying ? "rgba(255,255,255,0.15)" : "linear-gradient(135deg, #16803c, #22c55e)"),
        display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, color: "#fff", fontWeight: 700, fontFamily: "'SF Mono', Menlo, Monaco, monospace",
      }}>
        {hovered && hasPlayable ? "▶" : (index + 1)}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", fontSize: 13.5, fontWeight: 700, color: isPlaying ? "#fff" : T.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{track.title}</span>
          <span style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", fontSize: 9, fontWeight: 700, color: isScore ? (isPlaying ? "rgba(255,255,255,0.7)" : T.textDim) : (isPlaying ? "#22c55e" : T.green), background: isScore ? (isPlaying ? "rgba(255,255,255,0.1)" : T.bgElevated) : (isPlaying ? "rgba(22,128,60,0.3)" : T.greenBg), padding: "2px 6px", borderRadius: 3, textTransform: "uppercase", letterSpacing: "0.04em", flexShrink: 0 }}>{isScore ? "SCORE" : "NEEDLE DROP"}</span>
          {track.timestamp && <span style={{ fontFamily: "'SF Mono', Menlo, Monaco, monospace", fontSize: 10.5, color: isPlaying ? "rgba(255,255,255,0.4)" : T.textDim, flexShrink: 0 }}>{track.timestamp}</span>}
          <div style={{ display: "flex", gap: 4, flexShrink: 0, marginLeft: "auto", alignItems: "center" }}>
            {track.spotify_url && <div style={{ width: 18, height: 18, borderRadius: "50%", background: isPlaying ? "#1db954" : T.bgElevated, border: `1px solid ${isPlaying ? "#1db954" : T.border}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 8, color: isPlaying ? "#fff" : T.textDim }}>S</div>}
            {track.video_id && <div style={{ width: 18, height: 18, borderRadius: "50%", background: isPlaying ? "#ff0000" : T.bgElevated, border: `1px solid ${isPlaying ? "#ff0000" : T.border}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 8, color: isPlaying ? "#fff" : T.textDim }}>Y</div>}
            {toggleLibrary && (
              <div onClick={(e) => { e.stopPropagation(); toggleLibrary(saveKey); }} style={{
                width: 22, height: 22, borderRadius: 6, marginLeft: 4,
                background: inLibrary ? T.blue : (isPlaying ? "rgba(255,255,255,0.1)" : T.bgElevated),
                border: `1px solid ${inLibrary ? T.blue : (isPlaying ? "rgba(255,255,255,0.15)" : T.border)}`,
                display: "flex", alignItems: "center", justifyContent: "center",
                cursor: "pointer", transition: "all 0.2s",
                fontSize: 12, color: inLibrary ? "#fff" : (isPlaying ? "rgba(255,255,255,0.5)" : T.textDim), fontWeight: 700,
              }}>
                {inLibrary ? "✓" : "+"}
              </div>
            )}
          </div>
        </div>
        <div style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", fontSize: 12, color: isPlaying ? "rgba(255,255,255,0.5)" : T.textMuted, marginTop: 2 }}>{track.artist}</div>
        {track.context && <div style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", fontSize: 12, fontStyle: "italic", color: isPlaying ? "rgba(255,255,255,0.4)" : T.textDim, lineHeight: 1.5, marginTop: 4 }}>{track.context}</div>}
      </div>
    </div>
  );
}

function CreatorSpotlight({ creator, onEntityClick }) {
  return (
    <div onClick={() => onEntityClick?.(creator.name)} style={{ background: T.bgCard, border: `1px solid ${T.border}`, borderRadius: 16, overflow: "hidden", boxShadow: T.shadow, cursor: "pointer", transition: "all 0.2s" }}>
      <div style={{ padding: "28px 28px 24px", background: "linear-gradient(135deg, rgba(37,99,235,0.04), rgba(124,58,237,0.02))" }}>
        <div style={{ display: "flex", gap: 24 }}>
          <div style={{ width: 100, height: 100, borderRadius: 14, flexShrink: 0, background: creator.photoUrl ? `url(${creator.photoUrl}) top center/cover no-repeat` : T.blueLight, border: `1px solid ${T.border}`, boxShadow: T.shadow }} />
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
              <h2 style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", fontSize: 24, fontWeight: 700, color: T.text, margin: 0 }}>{creator.name}</h2>
              <span style={{ fontFamily: "'SF Mono', Menlo, Monaco, monospace", fontSize: 9.5, fontWeight: 700, color: "#7c3aed", background: "rgba(124,58,237,0.1)", padding: "3px 8px", borderRadius: 5, textTransform: "uppercase", letterSpacing: "0.05em" }}>CREATOR</span>
            </div>
          </div>
        </div>
        {creator.bio && <p style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", fontSize: 14.5, color: T.text, lineHeight: 1.75, margin: "16px 0 0" }}>{creator.bio}</p>}
      </div>
    </div>
  );
}

function CastCard({ person, onEntityClick, mediaCount }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div onClick={() => onEntityClick?.(person.name || person.title)} onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)} style={{
      background: T.bgCard, border: `1px solid ${hovered ? T.blueBorder : T.border}`, borderRadius: 14, overflow: "hidden",
      cursor: "pointer", transition: "all 0.2s", boxShadow: hovered ? T.shadowHover : T.shadow, transform: hovered ? "translateY(-2px)" : "none",
    }}>
      <div style={{ width: "100%", aspectRatio: "3/4", background: person.photoUrl ? `url(${person.photoUrl}) top center/cover no-repeat` : "linear-gradient(135deg, #1a2744, #2a3a5a)", position: "relative" }}>
        <div style={{ position: "absolute", top: 8, left: 8, display: "flex", gap: 4 }}>
          <span style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", fontSize: 9, fontWeight: 700, color: "#fff", background: (person.type === "LEAD" || person.role === "Lead") ? T.blue : (person.type === "CAST" || person.role === "Supporting") ? "#7c3aed" : T.textMuted, padding: "2px 7px", borderRadius: 4, textTransform: "uppercase", letterSpacing: "0.04em" }}>{person.type || person.role}</span>
        </div>
        {mediaCount > 0 && (
          <div style={{ position: "absolute", bottom: 8, right: 8, fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", fontSize: 9, fontWeight: 700, color: "#fff", background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)", padding: "2px 7px", borderRadius: 4 }}>
            {mediaCount} media
          </div>
        )}
      </div>
      <div style={{ padding: "12px 14px 14px" }}>
        <div style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", fontSize: 15, fontWeight: 700, color: T.text, lineHeight: 1.2 }}>{person.name || person.title}</div>
        {person.character && <div style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", fontSize: 12.5, fontWeight: 600, color: T.blue, marginTop: 2 }}>as {person.character}</div>}
        {(person.context || person.description || person.meta) && <div style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", fontSize: 12, color: T.textMuted, lineHeight: 1.5, marginTop: 6, display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{person.context || person.description || person.meta}</div>}
      </div>
    </div>
  );
}

function CrewRow({ person, onEntityClick }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div onClick={() => onEntityClick?.(person.name || person.title)} onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)} style={{
      display: "flex", alignItems: "center", gap: 14, padding: "12px 16px",
      background: hovered ? T.bgElevated : T.bgCard, border: `1px solid ${hovered ? T.blueBorder : T.border}`, borderRadius: 12, cursor: "pointer", transition: "all 0.15s",
    }}>
      <div style={{ width: 44, height: 44, borderRadius: 10, flexShrink: 0, background: person.photoUrl ? `url(${person.photoUrl}) top center/cover no-repeat` : "linear-gradient(135deg, #1a2744, #2a3a5a)", border: `1px solid ${T.border}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 700, color: "#fff", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" }}>
        {!person.photoUrl && (person.name || person.title || "").split(" ").map((n) => n[0]).join("").slice(0, 2)}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", fontSize: 14, fontWeight: 600, color: T.text }}>{person.name || person.title}</span>
          <span style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", fontSize: 9.5, fontWeight: 700, color: "#7c3aed", background: "rgba(124,58,237,0.1)", padding: "2px 7px", borderRadius: 4, textTransform: "uppercase", letterSpacing: "0.04em" }}>{person.type || person.role || "CREW"}</span>
        </div>
        {(person.context || person.meta) && <div style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", fontSize: 12.5, color: T.textMuted, marginTop: 3, lineHeight: 1.5 }}>{person.context || person.meta}</div>}
      </div>
      <span style={{ color: T.textDim, fontSize: 14, flexShrink: 0 }}>→</span>
    </div>
  );
}

function EpisodeCard({ episode, onSelect, onSelectEntity, songs, castCards, actorCharMap, onNavigateSonic }) {
  const [expanded, setExpanded] = useState(false);
  const trackCount = songs ? songs.filter(s => s.context && s.context.includes(episode.code)).length : 0;
  const themes = episode.themes || [];
  const credits = [episode.director && `Dir. ${episode.director}`, episode.writer && `Written by ${episode.writer}`].filter(Boolean);

  // Get cast for this episode — prefer per-episode TMDB cast, fall back to global castCards
  const epCastFromTmdb = [...(episode.cast || []), ...(episode.guestStars || [])];
  const epCast = epCastFromTmdb.length > 0
    ? epCastFromTmdb.slice(0, 6).map(c => ({ title: c.name, character: c.character, photoUrl: null }))
    : (castCards || []).slice(0, 6);

  return (
    <div style={{ background: T.bgCard, border: `1px solid ${T.border}`, borderRadius: 16, overflow: "hidden", boxShadow: T.shadow }}>
      <div style={{ display: "flex" }}>
        <div onClick={() => onSelect?.(episode.id)} style={{
          width: 220, minHeight: 160, flexShrink: 0,
          background: episode.stillUrl ? `url(${episode.stillUrl}) center/cover` : "linear-gradient(135deg, #1a2744, #2a3a5a)",
          position: "relative", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
        }}>
          {!episode.stillUrl && <span style={{ fontFamily: "'SF Mono', Menlo, Monaco, monospace", fontSize: 24, fontWeight: 700, color: "rgba(255,255,255,0.3)" }}>{episode.code}</span>}
          <div style={{ position: "absolute", top: 8, left: 8, background: T.blue, padding: "3px 8px", borderRadius: 5, fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", fontSize: 10, fontWeight: 700, color: "#fff", letterSpacing: "0.04em" }}>{episode.code}</div>
          {episode.imdbRating && <div style={{ position: "absolute", bottom: 8, right: 8, background: "rgba(245,184,0,0.9)", padding: "2px 7px", borderRadius: 4, fontFamily: "'SF Mono', Menlo, Monaco, monospace", fontSize: 11, fontWeight: 700, color: "#1a2744" }}>★ {episode.imdbRating}</div>}
        </div>
        <div style={{ flex: 1, padding: "16px 20px", minWidth: 0 }}>
          <h3 onClick={() => onSelect?.(episode.id)} style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", fontSize: 18, fontWeight: 700, color: T.text, margin: 0, lineHeight: 1.2, cursor: "pointer" }}>{episode.title}</h3>
          <div style={{ display: "flex", gap: 10, marginTop: 4, flexWrap: "wrap", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", fontSize: 11, color: T.textDim }}>
            {episode.airDate && <span>{episode.airDate}</span>}
            {episode.runtime && <><span style={{ color: T.border }}>·</span><span>{episode.runtime} min</span></>}
            {credits.length > 0 && <><span style={{ color: T.border }}>·</span><span>{credits.join(" · ")}</span></>}
          </div>
          {themes.length > 0 && (
            <div style={{ display: "flex", gap: 5, marginTop: 8, flexWrap: "wrap" }}>
              {themes.map(tid => <ThemePill key={tid} themeId={tid} />)}
            </div>
          )}
          <p style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", fontSize: 13.5, color: T.textMuted, lineHeight: 1.65, margin: "8px 0 0" }}>{episode.synopsis}</p>
        </div>
      </div>
      <div style={{ padding: "10px 20px", borderTop: `1px solid ${T.border}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", fontSize: 10.5, color: T.textDim }}>
          {trackCount > 0 && <span>♪ {trackCount} tracks</span>}
          {epCastFromTmdb.length > 0 ? <span>◉ {epCastFromTmdb.length} cast</span> : epCast.length > 0 && <span>◉ {epCast.length} cast</span>}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button onClick={() => setExpanded(!expanded)} style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", fontSize: 11, fontWeight: 600, color: T.blue, background: "transparent", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}>
            {expanded ? "Less" : "Details"}
            <span style={{ fontSize: 12, transition: "transform 0.2s", transform: expanded ? "rotate(180deg)" : "none" }}>▾</span>
          </button>
          <button onClick={() => onSelect?.(episode.id)} style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", fontSize: 11, fontWeight: 600, color: T.blue, background: T.blueLight, border: `1px solid ${T.blueBorder}`, padding: "4px 12px", borderRadius: 6, cursor: "pointer" }}>Full Episode →</button>
        </div>
      </div>
      {expanded && (
        <div style={{ padding: "0 20px 16px", borderTop: `1px solid ${T.border}` }}>
          {episode.keyMoment && (
            <div style={{ marginTop: 14, padding: "14px 16px", background: T.goldBg, border: `1px solid ${T.goldBorder}`, borderRadius: 10, borderLeft: `4px solid ${T.gold}` }}>
              <div style={{ fontFamily: "'SF Mono', Menlo, Monaco, monospace", fontSize: 13, fontWeight: 700, color: T.gold, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>Key Moment</div>
              <p style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", fontSize: 13, color: T.text, lineHeight: 1.6, margin: 0, fontStyle: "italic" }}>{episode.keyMoment}</p>
            </div>
          )}
          {epCast.length > 0 && (
            <div style={{ marginTop: 14 }}>
              <div style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", fontSize: 10, fontWeight: 700, color: T.textDim, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>Cast</div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {epCast.map(c => {
                  const charName = c.character || actorCharMap?.[c.title] || "";
                  return (
                    <div key={c.title} onClick={() => onSelectEntity?.(c.title)} style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 10px 4px 4px", background: T.bgElevated, border: `1px solid ${T.border}`, borderRadius: 8, cursor: "pointer" }}>
                      <div style={{ width: 24, height: 24, borderRadius: 6, flexShrink: 0, background: c.photoUrl ? `url(${c.photoUrl}) top center/cover` : T.textDim }} />
                      <div>
                        <div style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", fontSize: 11, fontWeight: 600, color: T.text }}>{c.title}</div>
                        {charName && <div style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", fontSize: 9.5, color: T.blue }}>{charName}</div>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          {trackCount > 0 && (
            <div style={{ marginTop: 12, padding: "8px 12px", background: T.greenBg, border: `1px solid ${T.greenBorder}`, borderRadius: 8, display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }} onClick={onNavigateSonic}>
              <span style={{ fontSize: 14 }}>♪</span>
              <span style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", fontSize: 12, fontWeight: 600, color: T.green }}>{trackCount} tracks in Sonic Layer →</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}


// ==========================================================
//  SCREEN: THEMES — Thematic Through-Lines
// ==========================================================
function ThemesScreen({ onNavigate, onSelectEntity, library, toggleLibrary, selectedModel, onModelChange, entities, responseData, selectedUniverse, onUniverseChange, onNewChat, hasActiveResponse }) {
  const [loaded, setLoaded] = useState(false);
  const [videoModal, setVideoModal] = useState(null);
  const [view, setView] = useState("lobby"); // "lobby" | "pathwayDetail" | "themeDetail"
  const [selectedPathwayId, setSelectedPathwayId] = useState(null);
  const [selectedThemeId, setSelectedThemeId] = useState(null);
  const [expandedAccordion, setExpandedAccordion] = useState(null);
  const [hoveredPathway, setHoveredPathway] = useState(null);
  const [hoveredTheme, setHoveredTheme] = useState(null);
  const [isWide, setIsWide] = useState(window.innerWidth >= 820);
  const [canvasSize, setCanvasSize] = useState({ w: 800, h: 480 });
  const canvasRef = useRef(null);

  useEffect(() => { setTimeout(() => setLoaded(true), 100); }, []);

  // Responsive breakpoint
  useEffect(() => {
    const onResize = () => setIsWide(window.innerWidth >= 820);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // Measure constellation canvas
  useEffect(() => {
    if (!canvasRef.current) return;
    const ro = new ResizeObserver(([entry]) => {
      setCanvasSize({ w: entry.contentRect.width, h: 480 });
    });
    ro.observe(canvasRef.current);
    return () => ro.disconnect();
  }, [view, isWide]);

  // Merge curated THEMES_DB with dynamic data from props
  const enrichedThemes = useMemo(() => {
    const tvData = responseData?.themeVideos || {};
    const result = {};
    Object.entries(THEMES_DB).forEach(([id, theme]) => {
      // Collect videos from KG data routed through KG_THEME_MAP
      const videos = [];
      const seenVids = new Set();
      Object.entries(tvData).forEach(([kgKey, kgTheme]) => {
        const mappedId = KG_THEME_MAP[kgKey.toLowerCase()];
        if (mappedId !== id) return;
        (kgTheme.videos || []).filter(v => v.videoId).forEach(v => {
          if (seenVids.has(v.videoId)) return;
          seenVids.add(v.videoId);
          videos.push({ ...v, moment: v.evidence ? v.evidence.replace(/^Discussed at \d+:\d+:\s*/, "").replace(/^"/, "").replace(/"$/, "") : "" });
        });
        (kgTheme.characters || []).filter(c => c.videoId).forEach(c => {
          if (seenVids.has(c.videoId)) return;
          seenVids.add(c.videoId);
          videos.push({ title: `${c.character}: "${c.text}"`, channel: c.videoTitle || "", videoId: c.videoId, timecodeLabel: c.timestamp || "", timecodeUrl: c.timecodeUrl || "", moment: c.text || "" });
        });
      });

      // Characters for this theme
      const characters = Object.entries(CHARACTER_THEME_MAP)
        .filter(([, info]) => info.themes.includes(id))
        .map(([name, info]) => {
          const ent = entities?.[name];
          return { name, role: info.role, photoUrl: ent?.photoUrl || ent?.posterUrl || null, context: info.role };
        });

      // Connected entities for this theme
      const connectedEntities = Object.entries(ENTITY_THEME_MAP)
        .filter(([, info]) => info.themes.includes(id))
        .map(([name, info]) => {
          const ent = entities?.[name];
          return { name, type: info.type, context: info.context, entityType: ent?.type || "entity" };
        });

      result[id] = { ...theme, videos, characters, connectedEntities };
    });
    return result;
  }, [entities, responseData]);

  // Navigation helpers
  const goToLobby = () => { setView("lobby"); setSelectedPathwayId(null); setSelectedThemeId(null); setExpandedAccordion(null); };
  const goToPathway = (pwId) => { setView("pathwayDetail"); setSelectedPathwayId(pwId); setSelectedThemeId(null); setExpandedAccordion(null); };
  const goToTheme = (themeId) => {
    const pw = PATHWAYS.find(p => p.themes.includes(themeId));
    setView("themeDetail"); setSelectedThemeId(themeId); setSelectedPathwayId(pw?.id || null);
  };

  const selectedPathway = PATHWAYS.find(p => p.id === selectedPathwayId);
  const selectedTheme = selectedThemeId ? enrichedThemes[selectedThemeId] : null;

  // Breadcrumbs
  const renderBreadcrumbs = () => {
    const F = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
    const sep = <span style={{ color: T.textDim, fontSize: 13, margin: "0 4px" }}>/</span>;
    const link = (text, onClick) => <span onClick={onClick} style={{ fontFamily: F, fontSize: 13, color: T.blue, cursor: "pointer", fontWeight: 500 }}>{text}</span>;
    const current = (text) => <span style={{ fontFamily: F, fontSize: 13, color: T.text, fontWeight: 600 }}>{text}</span>;
    if (view === "lobby") return <Logo />;
    if (view === "pathwayDetail") return <div style={{ display: "flex", alignItems: "center", gap: 0, flexWrap: "wrap" }}><Logo />{sep}{link("Themes", goToLobby)}{sep}{current(selectedPathway?.title)}</div>;
    if (view === "themeDetail") return <div style={{ display: "flex", alignItems: "center", gap: 0, flexWrap: "wrap" }}><Logo />{sep}{link("Themes", goToLobby)}{sep}{link(selectedPathway?.title, () => goToPathway(selectedPathwayId))}{sep}{current(selectedTheme?.title)}</div>;
    return <Logo />;
  };

  // ==================== LOBBY — WIDE CONSTELLATION ====================
  const renderWideConstellation = () => {
    const CL = CONSTELLATION_LAYOUT;
    const W = canvasSize.w;
    const H = canvasSize.h;
    const cx = (CL.center.x / 100) * W;
    const cy = (CL.center.y / 100) * H;

    const dots = [
      { x: 15, y: 20 }, { x: 82, y: 17 }, { x: 20, y: 72 }, { x: 75, y: 80 }, { x: 42, y: 14 },
      { x: 58, y: 85 }, { x: 8, y: 42 }, { x: 92, y: 48 }, { x: 35, y: 33 }, { x: 65, y: 62 },
      { x: 25, y: 58 }, { x: 78, y: 36 }, { x: 50, y: 22 }, { x: 30, y: 80 }, { x: 70, y: 12 },
      { x: 45, y: 68 }, { x: 55, y: 28 }, { x: 18, y: 52 }, { x: 72, y: 74 }, { x: 33, y: 17 },
    ];

    // Tooltip positioning: always appears close to the chip
    // Bottom items → tooltip above. Left items → tooltip right. Right items → tooltip left.
    const getTooltipStyle = (tpos, pw) => {
      const isBottom = tpos.y > 80;
      const isLeft = tpos.x < 30;
      const isRight = tpos.x > 70;
      const base = {
        position: "absolute",
        background: T.bgCard, borderRadius: 10, padding: "10px 14px", width: 220,
        border: `1.5px solid ${pw.color}30`,
        boxShadow: "0 4px 20px rgba(0,0,0,0.12)", zIndex: 30,
        pointerEvents: "none",
      };
      if (isBottom) {
        // Show above the chip, aligned to left edge
        return { ...base, bottom: "calc(100% + 6px)", left: 0 };
      }
      if (isRight) {
        // Show to the left of the chip
        return { ...base, right: "calc(100% + 8px)", top: "50%", transform: "translateY(-50%)" };
      }
      // Left side or center: show to the right
      return { ...base, left: "calc(100% + 8px)", top: "50%", transform: "translateY(-50%)" };
    };

    return (
      <div ref={canvasRef} style={{ position: "relative", width: "100%", height: H, marginTop: 8, overflow: "visible" }}>
        {/* SVG lines */}
        <svg width={W} height={H} style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 0 }}>
          {dots.map((d, i) => (
            <circle key={`dot-${i}`} cx={(d.x / 100) * W} cy={(d.y / 100) * H} r="1.5" fill={T.border} opacity="0.5">
              <animate attributeName="opacity" values="0.15;0.55;0.15" dur={`${3 + i * 0.35}s`} repeatCount="indefinite" />
            </circle>
          ))}
          {PATHWAYS.map(pw => {
            const pos = CL.pathways[pw.id];
            const px = (pos.x / 100) * W;
            const py = (pos.y / 100) * H;
            const isH = hoveredPathway === pw.id;
            return (
              <g key={`pw-line-${pw.id}`}>
                <path
                  d={`M${cx},${cy} C${cx + (px - cx) * 0.3},${cy + (py - cy) * 0.1} ${cx + (px - cx) * 0.7},${cy + (py - cy) * 0.9} ${px},${py}`}
                  fill="none" stroke={pw.color} strokeWidth={isH ? 2.5 : 1.5}
                  opacity={isH ? 0.5 : 0.12} strokeDasharray={isH ? "" : "6 4"}
                  style={{ transition: "all 0.3s" }}
                />
                {pw.themes.map(tid => {
                  const tpos = CL.themes[tid];
                  const tx = (tpos.x / 100) * W;
                  const ty = (tpos.y / 100) * H;
                  return (
                    <line key={`leaf-${tid}`}
                      x1={px} y1={py} x2={tx} y2={ty}
                      stroke={pw.color} strokeWidth="1"
                      opacity={isH ? 0.4 : 0.08} strokeDasharray="4 3"
                      style={{ transition: "all 0.3s" }}
                    />
                  );
                })}
              </g>
            );
          })}
        </svg>

        {/* Center node — small */}
        <div style={{ position: "absolute", left: `${CL.center.x}%`, top: `${CL.center.y}%`, transform: "translate(-50%, -50%)", zIndex: 15 }}>
          <div style={{ width: 110, height: 110, borderRadius: "50%", background: "linear-gradient(145deg, #ffe066, #ffce3a 40%, #f5b800)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", boxShadow: "0 8px 32px rgba(245,184,0,0.35)" }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: "#1a2744", letterSpacing: 2, fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", lineHeight: 1.1 }}>PLURIBUS</div>
            <div style={{ fontSize: 9, fontWeight: 600, color: "#1a2744", letterSpacing: 1.5, fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", marginTop: 3 }}>UNIVERSE</div>
          </div>
        </div>

        {/* Pathway nodes — tight to center */}
        {PATHWAYS.map(pw => {
          const pos = CL.pathways[pw.id];
          const isH = hoveredPathway === pw.id;
          return (
            <div key={`pw-node-${pw.id}`}
              style={{ position: "absolute", left: `${pos.x}%`, top: `${pos.y}%`, transform: "translate(-50%, -50%)", zIndex: 10, cursor: "pointer" }}
              onMouseEnter={() => setHoveredPathway(pw.id)}
              onMouseLeave={() => setHoveredPathway(null)}
              onClick={() => goToPathway(pw.id)}
            >
              <div style={{
                background: T.bgCard, borderRadius: 10, padding: "8px 12px", width: 140, textAlign: "center",
                border: `2px solid ${isH ? pw.color : pw.color + "50"}`,
                boxShadow: isH ? `0 4px 16px ${pw.color}20` : "0 1px 3px rgba(0,0,0,0.04)",
                transform: isH ? "scale(1.06)" : "scale(1)", transition: "all 0.3s",
              }}>
                <div style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", fontSize: 13, fontWeight: 700, color: pw.color }}>{pw.title}</div>
                <div style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", fontSize: 9.5, color: T.textDim, marginTop: 1 }}>{pw.subtitle}</div>
                <div style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", fontSize: 9, fontWeight: 600, color: isH ? pw.color : T.textDim, marginTop: 4 }}>{pw.themes.length} themes · Explore →</div>
              </div>
            </div>
          );
        })}

        {/* Theme leaf chips — compact pills with hover tooltip */}
        {PATHWAYS.map(pw => pw.themes.map(tid => {
          const tpos = CONSTELLATION_LAYOUT.themes[tid];
          const td = THEMES_DB[tid];
          if (!td) return null;
          const vis = !hoveredPathway || hoveredPathway === pw.id;
          const isHovered = hoveredTheme === tid;
          // Edge-aware anchoring
          const anchorX = tpos.x < 30 ? "0%" : tpos.x > 70 ? "-100%" : "-50%";
          const anchorY = tpos.y > 85 ? "-100%" : "-50%";
          return (
            <div key={`leaf-chip-${tid}`}
              onMouseEnter={() => setHoveredTheme(tid)}
              onMouseLeave={() => setHoveredTheme(null)}
              onClick={() => goToTheme(tid)}
              style={{
                position: "absolute", left: `${tpos.x}%`, top: `${tpos.y}%`,
                zIndex: isHovered ? 25 : 5,
                transform: `translate(${anchorX}, ${anchorY})`,
                cursor: "pointer", transition: "opacity 0.4s", opacity: vis ? 1 : 0.18,
              }}
            >
              <div style={{
                background: isHovered ? T.bgCard : T.bgCard, borderRadius: 8, padding: "5px 10px",
                border: `1.5px solid ${isHovered ? pw.color : vis ? pw.color + "35" : T.border}`,
                boxShadow: isHovered ? `0 2px 10px ${pw.color}20` : "0 1px 3px rgba(0,0,0,0.03)",
                transition: "all 0.2s", whiteSpace: "nowrap",
                transform: isHovered ? "scale(1.05)" : "scale(1)",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <div style={{ width: 5, height: 5, borderRadius: "50%", background: vis ? pw.color : T.borderLight, flexShrink: 0 }} />
                  <span style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", fontSize: 11.5, fontWeight: 700, color: vis ? pw.color : T.textDim }}>{td.title}</span>
                  <span style={{ fontFamily: "'SF Mono', Menlo, Monaco, monospace", fontSize: 8.5, color: vis ? pw.color + "80" : T.borderLight }}>{td.prominence}%</span>
                </div>
              </div>
              {/* Hover tooltip with shortDesc + hookLine */}
              {isHovered && vis && (
                <div style={getTooltipStyle(tpos, pw)}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                    <span style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", fontSize: 13, fontWeight: 700, color: pw.color }}>{td.title}</span>
                    <span style={{ fontFamily: "'SF Mono', Menlo, Monaco, monospace", fontSize: 9, color: pw.color + "80" }}>{td.prominence}%</span>
                  </div>
                  <div style={{ width: "100%", height: 2, background: T.bgElevated, borderRadius: 1, overflow: "hidden", marginBottom: 6 }}>
                    <div style={{ height: "100%", width: `${td.prominence}%`, background: pw.color, borderRadius: 1 }} />
                  </div>
                  <div style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", fontSize: 11.5, color: T.textMuted, lineHeight: 1.5, marginBottom: 6 }}>{td.shortDesc}</div>
                  <div style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", fontSize: 10.5, fontStyle: "italic", color: pw.color, lineHeight: 1.45 }}>"{td.hookLine}"</div>
                  <div style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", fontSize: 9, fontWeight: 600, color: T.textDim, marginTop: 6 }}>Click to explore →</div>
                </div>
              )}
            </div>
          );
        }))}

      </div>
    );
  };

  // ==================== LOBBY — NARROW STACKED ====================
  const renderNarrowLobby = () => (
    <div style={{ padding: "0 32px 60px", maxWidth: 680 }}>
      {PATHWAYS.map(pw => (
        <div key={`stacked-${pw.id}`}>
          <div onClick={() => goToPathway(pw.id)} style={{
            background: T.bgCard, borderRadius: 16, padding: "18px 22px", cursor: "pointer",
            border: `2px solid ${pw.color}55`, boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
            marginBottom: 10, transition: "all 0.2s",
          }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <div style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", fontSize: 16, fontWeight: 700, color: pw.color }}>{pw.title}</div>
                <div style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", fontSize: 11, color: T.textDim, marginTop: 1 }}>{pw.subtitle}</div>
              </div>
              <span style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", fontSize: 12, fontWeight: 600, color: pw.color }}>Explore →</span>
            </div>
            <div style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", fontSize: 12.5, color: T.textMuted, marginTop: 8, lineHeight: 1.5, fontStyle: "italic" }}>"{pw.hook}"</div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6, paddingLeft: 18, borderLeft: `2px dashed ${pw.color}30`, marginBottom: 28 }}>
            {pw.themes.map(tid => {
              const td = THEMES_DB[tid];
              if (!td) return null;
              return (
                <div key={`stacked-theme-${tid}`} onClick={() => goToTheme(tid)} style={{
                  background: T.bgCard, borderRadius: 10, padding: "10px 14px", cursor: "pointer",
                  border: `1.5px solid ${pw.color}30`, transition: "all 0.2s",
                }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", fontSize: 13, fontWeight: 700, color: pw.color }}>{td.title}</div>
                    <div style={{ fontFamily: "'SF Mono', Menlo, Monaco, monospace", fontSize: 9.5, color: pw.color + "80" }}>{td.prominence}%</div>
                  </div>
                  <div style={{ width: "100%", height: 2, background: T.bgElevated, borderRadius: 1, overflow: "hidden", marginTop: 5 }}>
                    <div style={{ height: "100%", width: `${td.prominence}%`, background: pw.color, borderRadius: 1 }} />
                  </div>
                  <div style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", fontSize: 11, color: T.textMuted, marginTop: 5, lineHeight: 1.45 }}>{td.shortDesc}</div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );

  // ==================== LOBBY VIEW ====================
  const renderLobby = () => (
    <>
      <div style={{ textAlign: "center", padding: "28px 32px 0", maxWidth: 620, margin: "0 auto" }}>
        <h1 style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", fontSize: 24, fontWeight: 700, color: T.text, marginBottom: 8 }}>Themes View</h1>
        <p style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", fontSize: 14, color: T.textMuted, lineHeight: 1.7 }}>
          Pluribus is a show about what happens when individuality collides with collective consciousness — and the grief, resistance, and moral compromise that follow. The UnitedTribes Knowledge Graph identified <strong>10 themes</strong> running through the series, organized here into three pathways: the <span style={{ color: "#2563eb", fontWeight: 600 }}>sci-fi ideas</span> that drive the premise, the <span style={{ color: "#dc2626", fontWeight: 600 }}>emotional toll</span> on the characters who live through it, and the <span style={{ color: "#7c3aed", fontWeight: 600 }}>internal struggles</span> of people trying to hold onto who they are.
        </p>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, fontSize: 11, color: T.textDim, marginTop: 10 }}>
          <span style={{ width: 5, height: 5, borderRadius: "50%", background: T.gold, display: "inline-block" }} />
          Select a pathway or theme to explore
        </div>
      </div>
      {isWide ? renderWideConstellation() : renderNarrowLobby()}
    </>
  );

  // ==================== PATHWAY DETAIL VIEW ====================
  const renderPathwayDetail = () => {
    if (!selectedPathway) return null;
    const pw = selectedPathway;
    return (
      <div style={{ padding: "36px 48px 120px", maxWidth: 860 }}>
        <div onClick={goToLobby} style={{ display: "inline-flex", alignItems: "center", gap: 6, fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", fontSize: 13, fontWeight: 600, color: T.blue, cursor: "pointer", marginBottom: 20 }}>← Themes View</div>

        {/* Pathway header card */}
        <div style={{ background: T.bgCard, border: `1px solid ${T.border}`, borderTop: `4px solid ${pw.color}`, borderRadius: 14, padding: "20px 22px", marginBottom: 16, boxShadow: T.shadow }}>
          <h2 style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", fontSize: 24, fontWeight: 700, color: T.text, marginBottom: 4 }}>{pw.title}</h2>
          <div style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", fontSize: 13, fontWeight: 600, color: pw.color, marginBottom: 10 }}>{pw.subtitle}</div>
          <div style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", fontSize: 17, fontStyle: "italic", color: pw.color, lineHeight: 1.55, marginBottom: 12, fontWeight: 600 }}>"{pw.hook}"</div>
          <div style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", fontSize: 14.5, color: T.textMuted, lineHeight: 1.75 }}>{pw.description}</div>
        </div>

        {/* Theme accordions */}
        {pw.themes.map(tid => {
          const td = THEMES_DB[tid];
          if (!td) return null;
          const isExp = expandedAccordion === tid;
          return (
            <div key={`acc-${tid}`} style={{ background: T.bgCard, border: `1px solid ${T.border}`, borderLeft: `4px solid ${td.color}`, borderRadius: 14, overflow: "hidden", marginBottom: 16, boxShadow: T.shadow }}>
              <div onClick={() => setExpandedAccordion(isExp ? null : tid)} style={{ padding: "16px 20px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                    <h3 style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", fontSize: 16, fontWeight: 700, color: td.color, margin: 0 }}>{td.title}</h3>
                    <div style={{ width: 80 }}>
                      <div style={{ width: "100%", height: 3, background: T.bgElevated, borderRadius: 2, overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${td.prominence}%`, background: td.color, borderRadius: 2, transition: "width 0.6s ease" }} />
                      </div>
                    </div>
                    <span style={{ fontFamily: "'SF Mono', Menlo, Monaco, monospace", fontSize: 10, color: T.textDim }}>{td.prominence}%</span>
                  </div>
                  <div style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", fontSize: 13, color: T.textMuted, lineHeight: 1.5 }}>{td.shortDesc}</div>
                </div>
                <span style={{ fontSize: 14, color: T.textDim, marginLeft: 12, transition: "transform 0.2s", display: "inline-block", transform: isExp ? "rotate(180deg)" : "none" }}>▾</span>
              </div>
              {isExp && (
                <div style={{ padding: "0 20px 16px", borderTop: `1px solid ${T.border}` }}>
                  <p style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", fontSize: 13.5, color: T.textMuted, lineHeight: 1.65, margin: "14px 0" }}>{td.fullDesc}</p>
                  <div style={{ textAlign: "right" }}>
                    <span onClick={() => goToTheme(tid)} style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", fontSize: 12, fontWeight: 600, color: td.color, cursor: "pointer" }}>Full theme detail →</span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  // ==================== THEME DETAIL VIEW ====================
  const renderThemeDetail = () => {
    if (!selectedTheme) return null;
    const theme = selectedTheme;
    const pw = selectedPathway || PATHWAYS.find(p => p.themes.includes(selectedThemeId));
    const c = theme.color;

    return (
      <div style={{ padding: "36px 48px 120px", maxWidth: 860 }}>
        {/* Back link */}
        <div onClick={() => goToPathway(pw?.id)} style={{ display: "inline-flex", alignItems: "center", gap: 6, fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", fontSize: 13, fontWeight: 600, color: T.blue, cursor: "pointer", marginBottom: 20 }}>← {pw?.title || "Pathways"}</div>

        {/* Hero header */}
        <div style={{ background: T.bgCard, border: `1px solid ${T.border}`, borderTop: `4px solid ${c}`, borderRadius: 14, padding: "28px 26px", marginBottom: 16, boxShadow: T.shadow }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
            <span style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", fontSize: 10, fontWeight: 700, color: pw?.color, background: (pw?.color || c) + "10", border: `1px solid ${(pw?.color || c)}20`, padding: "2px 8px", borderRadius: 4 }}>{pw?.title}</span>
            <span style={{ fontSize: 10, color: T.textDim }}>·</span>
            <span style={{ fontFamily: "'SF Mono', Menlo, Monaco, monospace", fontSize: 11, color: c, fontWeight: 600 }}>{theme.prominence}% prominence</span>
          </div>
          <h2 style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", fontSize: 26, fontWeight: 700, color: T.text, marginBottom: 8 }}>{theme.title}</h2>
          <div style={{ width: 200, marginBottom: 14 }}><ProminenceBar value={theme.prominence} color={c} /></div>
          <div style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", fontSize: 16, fontStyle: "italic", color: c, lineHeight: 1.6, marginBottom: 14, fontWeight: 600 }}>"{theme.hookLine}"</div>
          <p style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", fontSize: 14.5, color: T.textMuted, lineHeight: 1.8, margin: 0 }}>{theme.fullDesc}</p>
        </div>

        {/* Source Videos */}
        {theme.videos && theme.videos.length > 0 && (
          <div style={{ background: T.bgCard, border: `1px solid ${T.border}`, borderRadius: 14, padding: "20px 22px", marginBottom: 16, boxShadow: T.shadow }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
              <div style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", fontSize: 10, fontWeight: 700, color: T.textDim, textTransform: "uppercase", letterSpacing: "0.06em" }}>Source Material</div>
              <span style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", fontSize: 9.5, fontWeight: 600, color: T.gold, background: T.goldBg, border: `1px solid ${T.goldBorder}`, padding: "2px 8px", borderRadius: 4 }}>✦ Graph Source</span>
            </div>
            <div style={{ display: "flex", gap: 12, overflowX: "auto", paddingBottom: 4 }}>
              {theme.videos.map((v, i) => <VideoTile key={i} video={v} accentColor={c} onClick={() => setVideoModal(v)} library={library} toggleLibrary={toggleLibrary} />)}
            </div>
          </div>
        )}

        {/* Connected Entities */}
        {theme.connectedEntities && theme.connectedEntities.length > 0 && (
          <div style={{ background: T.bgCard, border: `1px solid ${T.border}`, borderRadius: 14, padding: "20px 22px", marginBottom: 16, boxShadow: T.shadow }}>
            <div style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", fontSize: 10, fontWeight: 700, color: T.textDim, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 12 }}>Connected Works & Influences</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {theme.connectedEntities.map(ent => (
                <EntityChip key={ent.name} name={ent.name} type={ent.type} context={ent.context} color={c}
                  onClick={() => { onSelectEntity(ent.name); onNavigate(SCREENS.ENTITY_DETAIL); }} />
              ))}
            </div>
          </div>
        )}

        {/* Characters */}
        {theme.characters && theme.characters.length > 0 && (
          <div style={{ background: T.bgCard, border: `1px solid ${T.border}`, borderRadius: 14, padding: "20px 22px", marginBottom: 16, boxShadow: T.shadow }}>
            <div style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", fontSize: 10, fontWeight: 700, color: T.textDim, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 12 }}>Characters Who Carry This Theme</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {theme.characters.map(ch => {
                const initials = ch.name.split(" ").map(w => w[0]).join("").slice(0, 2);
                return (
                  <div key={ch.name} onClick={() => { onSelectEntity(ch.name); onNavigate(SCREENS.ENTITY_DETAIL); }}
                    style={{ display: "flex", gap: 14, padding: 14, background: T.bgCard, border: `1px solid ${T.border}`, borderRadius: 12, cursor: "pointer", transition: "all 0.2s" }}>
                    <div style={{
                      width: 48, height: 48, borderRadius: 12, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 16, color: "#fff", fontWeight: 700,
                      background: ch.photoUrl ? `url(${ch.photoUrl}) top center/cover no-repeat` : `linear-gradient(135deg, ${c}, ${c}88)`,
                    }}>
                      {!ch.photoUrl && initials}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                        <span style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", fontSize: 14, fontWeight: 700, color: T.text }}>{ch.name}</span>
                        <span style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", fontSize: 10.5, color: c, fontWeight: 600, fontStyle: "italic" }}>{ch.role}</span>
                      </div>
                      <div style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", fontSize: 12.5, color: T.textMuted, marginTop: 4, lineHeight: 1.5 }}>{ch.context}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Related Themes */}
        {theme.relatedThemes && theme.relatedThemes.length > 0 && (
          <div style={{ background: T.bgCard, border: `1px solid ${T.border}`, borderRadius: 14, padding: "20px 22px", marginBottom: 16, boxShadow: T.shadow }}>
            <div style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", fontSize: 10, fontWeight: 700, color: T.textDim, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 12 }}>Related Themes</div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {theme.relatedThemes.map(rid => {
                const rt = THEMES_DB[rid];
                if (!rt) return null;
                const rpw = PATHWAYS.find(p => p.themes.includes(rid));
                return (
                  <div key={rid} onClick={() => goToTheme(rid)} style={{
                    display: "inline-flex", alignItems: "center", gap: 5, padding: "5px 12px",
                    borderRadius: 8, cursor: "pointer", fontSize: 12, fontWeight: 600,
                    color: rt.color, background: rt.color + "08", border: `1px solid ${rt.color}20`,
                    transition: "all 0.15s", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
                  }}>
                    <span style={{ fontFamily: "'SF Mono', Menlo, Monaco, monospace", fontSize: 9 }}>{rt.prominence}%</span>
                    {rt.title}
                    <span style={{ fontSize: 9, color: T.textDim }}>{rpw?.title || ""}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  };

  // ==================== OUTER SHELL ====================
  return (
    <div style={{ height: "100vh", background: "transparent" }}>
      <SideNav active="themes" onNavigate={onNavigate} libraryCount={library ? library.size : 0} hasActiveResponse={hasActiveResponse} />
      <div style={{ marginLeft: 72, height: "100vh", display: "flex", flexDirection: "column" }}>
        <TopNav onNavigate={onNavigate} selectedModel={selectedModel} onModelChange={onModelChange} selectedUniverse={selectedUniverse} onUniverseChange={onUniverseChange} onNewChat={onNewChat} />
        <div style={{ flex: 1, overflowY: "auto", paddingBottom: 120, opacity: loaded ? 1 : 0, transition: "opacity 0.4s" }}>
          {view === "lobby" && renderLobby()}
          {view === "pathwayDetail" && renderPathwayDetail()}
          {view === "themeDetail" && renderThemeDetail()}
        </div>
      </div>
      {videoModal && <VideoModal title={videoModal.title} subtitle={videoModal.channel} videoId={videoModal.videoId} timecodeUrl={videoModal.timecodeUrl} onClose={() => setVideoModal(null)} />}
    </div>
  );
}

// ==========================================================
//  SCREEN: SONIC LAYER — Music & Score
// ==========================================================
function SonicLayerScreen({ onNavigate, onSelectEntity, library, toggleLibrary, selectedModel, onModelChange, entities, responseData, selectedUniverse, onUniverseChange, onNewChat, hasActiveResponse }) {
  const [loaded, setLoaded] = useState(false);
  const [nowPlaying, setNowPlaying] = useState(null);
  const [filter, setFilter] = useState("all");
  const [view, setView] = useState("lobby"); // "lobby" | "composerDetail"
  const [selectedComposer, setSelectedComposer] = useState(null);
  const [expandedMoment, setExpandedMoment] = useState(null);
  const [videoModal, setVideoModal] = useState(null);
  useEffect(() => { setTimeout(() => setLoaded(true), 100); }, []);

  const songs = responseData?.songs || [];
  const episodes = responseData?.episodes || [];
  const themeVideos = responseData?.themeVideos || {};

  // Determine track type
  const tracksWithType = useMemo(() => {
    return songs.map(s => ({
      ...s,
      type: (s.artist || "").toLowerCase().includes("dave porter") ? "score" : "needle",
    }));
  }, [songs]);

  // Group by episode
  const episodeGroups = useMemo(() => {
    const groups = {};
    tracksWithType.forEach(t => {
      const ctx = t.context || "Other";
      if (!groups[ctx]) groups[ctx] = [];
      groups[ctx].push(t);
    });
    return Object.entries(groups).sort((a, b) => {
      const aMatch = a[0].match(/S\d+E(\d+)/);
      const bMatch = b[0].match(/S\d+E(\d+)/);
      return (aMatch ? parseInt(aMatch[1]) : 99) - (bMatch ? parseInt(bMatch[1]) : 99);
    }).map(([code, tracks]) => {
      const ep = episodes.find(e => code.includes(e.code));
      return { code, title: ep ? `${ep.code} — ${ep.title}` : code, synopsis: ep?.synopsis || "", tracks };
    });
  }, [tracksWithType, episodes]);

  // Composers from entities — exclude unresolved aliases (BTR1, Ricky Cook)
  const EXCLUDE_COMPOSERS = ["BTR1", "Ricky Cook"];
  const composers = useMemo(() => {
    if (!entities) return [];
    return Object.entries(entities)
      .filter(([name, e]) => (e.subtitle || "").toLowerCase().includes("composer") && !EXCLUDE_COMPOSERS.includes(name))
      .map(([name, e]) => ({
        name,
        role: e.subtitle || "Composer",
        bio: (e.bio || [])[0] || "",
        photoUrl: e.photoUrl || null,
        trackCount: tracksWithType.filter(t => (t.artist || "").toLowerCase().includes(name.toLowerCase())).length,
        previousWork: (e.completeWorks || e.collaborators || []).filter(w => w.title !== "Pluribus").slice(0, 6),
        interviews: (e.interviews || []).slice(0, 4),
      }));
  }, [entities, tracksWithType]);

  // Sonic moments from themeVideos — scenes with high music significance
  const sonicMoments = useMemo(() => {
    const moments = [];
    Object.values(themeVideos).forEach(themeData => {
      (themeData.videos || []).filter(v => v.videoId).forEach(v => {
        if (v.themeEntity && v.themeEntity.toLowerCase().includes("music") || v.title?.toLowerCase().includes("soundtrack") || v.title?.toLowerCase().includes("song")) {
          moments.push({ title: v.title || "", videoId: v.videoId, timecodeUrl: v.timecodeUrl || "", timestamp: v.timecodeLabel || "", channel: v.channel || "", context: v.evidence ? v.evidence.replace(/^Discussed at \d+:\d+:\s*/, "").replace(/^"/, "").replace(/"$/, "").slice(0, 120) : "" });
        }
      });
      (themeData.characters || []).filter(c => c.videoId && c.text && (c.text.toLowerCase().includes("song") || c.text.toLowerCase().includes("music") || c.text.toLowerCase().includes("sing"))).forEach(c => {
        moments.push({ title: `${c.character}: "${c.text.slice(0, 60)}..."`, videoId: c.videoId, timecodeUrl: c.timecodeUrl || "", timestamp: c.timestamp || "", channel: c.videoTitle || "", context: c.text || "" });
      });
    });
    return moments.slice(0, 5);
  }, [themeVideos]);

  const scoreCount = tracksWithType.filter(t => t.type === "score").length;
  const needleCount = tracksWithType.filter(t => t.type === "needle").length;
  const allTracksFlat = episodeGroups.flatMap(g => g.tracks);

  const handlePlay = (track) => setNowPlaying(track);
  const handleNext = () => {
    if (!nowPlaying) return;
    const playable = allTracksFlat.filter(t => t.spotify_url || t.video_id);
    const idx = playable.findIndex(t => t.title === nowPlaying.title && t.artist === nowPlaying.artist);
    if (idx >= 0) setNowPlaying(playable[(idx + 1) % playable.length]);
  };
  const handlePrev = () => {
    if (!nowPlaying) return;
    const playable = allTracksFlat.filter(t => t.spotify_url || t.video_id);
    const idx = playable.findIndex(t => t.title === nowPlaying.title && t.artist === nowPlaying.artist);
    if (idx >= 0) setNowPlaying(playable[idx === 0 ? playable.length - 1 : idx - 1]);
  };

  const npTrack = nowPlaying;

  // Breadcrumbs
  const renderBreadcrumbs = () => {
    if (view === "lobby") return <Logo />;
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 0 }}>
        <Logo />
        <span style={{ color: T.textDim, fontSize: 13, margin: "0 4px" }}>/</span>
        <span onClick={() => { setView("lobby"); setSelectedComposer(null); }} style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", fontSize: 13, color: T.blue, cursor: "pointer", fontWeight: 500 }}>Sonic Layer</span>
        <span style={{ color: T.textDim, fontSize: 13, margin: "0 4px" }}>/</span>
        <span style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", fontSize: 13, color: T.text, fontWeight: 600 }}>{selectedComposer}</span>
      </div>
    );
  };

  // Composer Detail View
  const renderComposerDetail = () => {
    const c = composers.find(comp => comp.name === selectedComposer);
    if (!c) return null;
    const composerTracks = tracksWithType.filter(t => (t.artist || "").toLowerCase().includes(c.name.toLowerCase()));
    return (
      <div style={{ maxWidth: 820 }}>
        <div style={{ display: "flex", gap: 28, marginBottom: 32 }}>
          <div style={{ width: 140, height: 140, borderRadius: 14, flexShrink: 0, background: c.photoUrl ? `url(${c.photoUrl}) top center/cover` : "linear-gradient(135deg, #1a2744, #2a3a5a)", border: `1px solid ${T.border}` }} />
          <div style={{ flex: 1 }}>
            <h1 style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", fontSize: 28, fontWeight: 700, color: T.text, margin: "0 0 4px" }}>{c.name}</h1>
            <div style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", fontSize: 14, color: T.blue, fontWeight: 600, marginBottom: 8 }}>{c.role}</div>
            <p style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", fontSize: 14, color: T.textMuted, lineHeight: 1.7, margin: 0 }}>{c.bio}</p>
          </div>
        </div>

        {composerTracks.length > 0 && (
          <section style={{ marginBottom: 32 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
              <div style={{ width: 4, height: 28, borderRadius: 2, background: T.green, flexShrink: 0 }} />
              <h3 style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", fontSize: 18, fontWeight: 700, color: T.text, margin: 0 }}>Score Cues in Pluribus</h3>
              <span style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", fontSize: 11, color: T.textDim }}>{composerTracks.length} tracks</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {composerTracks.map((track, i) => (
                <TrackRow key={track.title + track.artist} track={track} index={i} isPlaying={nowPlaying?.title === track.title && nowPlaying?.artist === track.artist} onPlay={() => handlePlay(track)} library={library} toggleLibrary={toggleLibrary} />
              ))}
            </div>
          </section>
        )}

        {c.previousWork.length > 0 && (
          <section style={{ marginBottom: 32 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
              <div style={{ width: 4, height: 28, borderRadius: 2, background: T.blue, flexShrink: 0 }} />
              <h3 style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", fontSize: 18, fontWeight: 700, color: T.text, margin: 0 }}>Known For</h3>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {c.previousWork.map(w => (
                <div key={w.title} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", background: T.bgCard, border: `1px solid ${T.border}`, borderRadius: 10 }}>
                  <span style={{ fontFamily: "'SF Mono', Menlo, Monaco, monospace", fontSize: 13, fontWeight: 700, color: T.green, background: T.greenBg, padding: "2px 6px", borderRadius: 3, textTransform: "uppercase" }}>{w.type || "SCORE"}</span>
                  <span style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", fontSize: 13, fontWeight: 600, color: T.text }}>{w.title}</span>
                  {w.meta && <span style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", fontSize: 11.5, color: T.textMuted }}>{w.meta}</span>}
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    );
  };

  return (
    <div style={{ height: "100vh", background: "transparent" }}>
      <SideNav active="sonic" onNavigate={onNavigate} libraryCount={library ? library.size : 0} hasActiveResponse={hasActiveResponse} />
      <div style={{ marginLeft: 72, height: "100vh", display: "flex", flexDirection: "column" }}>
        <TopNav onNavigate={onNavigate} selectedModel={selectedModel} onModelChange={onModelChange} selectedUniverse={selectedUniverse} onUniverseChange={onUniverseChange} onNewChat={onNewChat} />
        <div style={{ flex: 1, overflowY: "auto", padding: npTrack ? "36px 48px 260px" : "36px 48px 120px", opacity: loaded ? 1 : 0, transition: "opacity 0.4s" }}>
          {view === "composerDetail" ? renderComposerDetail() : (
          <div style={{ maxWidth: 820 }}>
            <div style={{ marginBottom: 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
                <span style={{ fontSize: 26 }}>♪</span>
                <h1 style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", fontSize: 28, fontWeight: 700, color: T.text, margin: 0 }}>Sonic Layer</h1>
                <span style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", fontSize: 12, fontWeight: 600, color: T.blue, background: T.blueLight, padding: "3px 10px", borderRadius: 6 }}>{songs.length} tracks</span>
              </div>
              <p style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", fontSize: 15, color: T.textMuted, lineHeight: 1.65, maxWidth: 640, marginBottom: 4 }}>
                The complete musical identity of Pluribus — Dave Porter's original score and the needle drops that define each episode. Every track is mapped to its narrative moment in the UnitedTribes Knowledge Graph.
              </p>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 28, fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", fontSize: 11, color: T.textDim }}>
              <div style={{ width: 5, height: 5, borderRadius: "50%", background: T.gold }} />
              <span>Powered by UnitedTribes Knowledge Graph</span>
              <span style={{ color: T.border }}>·</span>
              <span>{scoreCount} score cues</span>
              <span style={{ color: T.border }}>·</span>
              <span>{needleCount} needle drops</span>
              <span style={{ color: T.border }}>·</span>
              <span>{episodeGroups.length} episodes</span>
            </div>

            {/* Score vs Needle Drops split */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
              <div onClick={() => setFilter(filter === "score" ? "all" : "score")} style={{ padding: "20px 22px", background: T.bgCard, border: `1px solid ${filter === "score" ? "#7c3aed" : T.border}`, borderRadius: 14, borderLeft: `4px solid #7c3aed`, cursor: "pointer", transition: "all 0.2s" }}>
                <div style={{ fontFamily: "'SF Mono', Menlo, Monaco, monospace", fontSize: 10, fontWeight: 700, color: "#7c3aed", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>Original Score</div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 6 }}>
                  <div style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", fontSize: 22, fontWeight: 700, color: T.text }}>{scoreCount} tracks</div>
                  <span style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", fontSize: 12, color: T.textMuted }}>Dave Porter</span>
                </div>
                <p style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", fontSize: 12.5, color: T.textMuted, lineHeight: 1.6, margin: 0 }}>
                  Dave Porter's score builds on his Breaking Bad DNA — sparse, synth-driven tension that makes silence feel dangerous. Porter has scored every Gilligan project since 2008.
                </p>
              </div>
              <div onClick={() => setFilter(filter === "needle" ? "all" : "needle")} style={{ padding: "20px 22px", background: T.bgCard, border: `1px solid ${filter === "needle" ? T.green : T.border}`, borderRadius: 14, cursor: "pointer", transition: "all 0.2s", borderLeft: `4px solid ${T.green}` }}>
                <div style={{ fontFamily: "'SF Mono', Menlo, Monaco, monospace", fontSize: 10, fontWeight: 700, color: T.green, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>Needle Drops</div>
                <div style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", fontSize: 22, fontWeight: 700, color: T.text, marginBottom: 6 }}>{needleCount} songs</div>
                <p style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", fontSize: 12.5, color: T.textMuted, lineHeight: 1.6, margin: 0 }}>
                  Licensed tracks chosen for maximum emotional impact — from R.E.M. to Ray Charles, each song earns its scene.
                </p>
              </div>
            </div>

            {/* Filter pills */}
            <div style={{ display: "flex", gap: 8, marginBottom: 28 }}>
              {[
                { key: "all", label: `All (${songs.length})` },
                { key: "score", label: `Score (${scoreCount})` },
                { key: "needle", label: `Needle Drops (${needleCount})` },
              ].map(f => (
                <button key={f.key} onClick={() => setFilter(f.key)} style={{
                  fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", fontSize: 11.5, fontWeight: 600,
                  padding: "5px 14px", borderRadius: 8, cursor: "pointer", transition: "all 0.15s",
                  background: filter === f.key ? T.blue : "transparent",
                  color: filter === f.key ? "#fff" : T.textMuted,
                  border: `1px solid ${filter === f.key ? T.blue : T.border}`,
                }}>{f.label}</button>
              ))}
            </div>

            {/* Sonic Moments */}
            {sonicMoments.length > 0 && (
              <div style={{ marginBottom: 32 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
                  <div style={{ width: 4, height: 28, borderRadius: 2, background: T.gold, flexShrink: 0 }} />
                  <div>
                    <h3 style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", fontSize: 18, fontWeight: 700, color: T.text, margin: 0 }}>Sonic Moments</h3>
                    <p style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", fontSize: 13, color: T.textMuted, margin: "2px 0 0" }}>Key scenes where music drives the story.</p>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 12, overflowX: "auto", paddingBottom: 8 }}>
                  {sonicMoments.map((m, i) => (
                    <div key={i} onClick={() => setExpandedMoment(expandedMoment === i ? null : i)} style={{
                      minWidth: 240, maxWidth: 280, flexShrink: 0, padding: "14px 16px", background: T.bgCard,
                      border: `1px solid ${expandedMoment === i ? T.goldBorder : T.border}`, borderRadius: 12, cursor: "pointer", transition: "all 0.15s",
                    }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                        <span style={{ fontFamily: "'SF Mono', Menlo, Monaco, monospace", fontSize: 10, fontWeight: 700, color: T.gold, background: T.goldBg, padding: "2px 6px", borderRadius: 3 }}>MOMENT</span>
                        {m.timestamp && <span style={{ fontFamily: "'SF Mono', Menlo, Monaco, monospace", fontSize: 10, color: T.textDim }}>{m.timestamp}</span>}
                      </div>
                      <div style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", fontSize: 13, fontWeight: 600, color: T.text, lineHeight: 1.4, marginBottom: 4, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{m.title}</div>
                      {m.context && <div style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", fontSize: 11.5, color: T.textMuted, lineHeight: 1.5, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{m.context}</div>}
                      {expandedMoment === i && m.videoId && (
                        <div style={{ marginTop: 10 }}>
                          <div style={{ position: "relative", paddingTop: "56.25%", borderRadius: 8, overflow: "hidden", background: "#000" }}>
                            <iframe src={`https://www.youtube.com/embed/${m.videoId}${m.timecodeUrl && m.timecodeUrl.includes("&t=") ? "?start=" + m.timecodeUrl.split("&t=")[1] : ""}${m.timecodeUrl && m.timecodeUrl.includes("&t=") ? "&" : "?"}autoplay=1&rel=0&modestbranding=1`} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", border: "none" }} allow="autoplay; encrypted-media" />
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Composers */}
            {composers.length > 0 && (
              <div style={{ marginBottom: 32 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
                  <div style={{ width: 4, height: 28, borderRadius: 2, background: "#7c3aed", flexShrink: 0 }} />
                  <h3 style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", fontSize: 18, fontWeight: 700, color: T.text, margin: 0 }}>The Composers</h3>
                </div>
                <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
                  {composers.map(c => (
                    <div key={c.name} onClick={() => { setView("composerDetail"); setSelectedComposer(c.name); }} style={{ cursor: "pointer" }}>
                      <ComposerCard composer={c} />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Section header for tracklist */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
              <div style={{ width: 4, height: 28, borderRadius: 2, background: T.green, flexShrink: 0 }} />
              <h3 style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", fontSize: 18, fontWeight: 700, color: T.text, margin: 0 }}>
                {filter === "score" ? "Original Score" : filter === "needle" ? "Needle Drops" : "Full Tracklist"}
              </h3>
              <span style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", fontSize: 11, color: T.textDim }}>
                {filter === "all" ? `${songs.length} tracks` : filter === "score" ? `${scoreCount} tracks` : `${needleCount} tracks`} by episode
              </span>
            </div>

            {/* Full Tracklist by episode */}
            <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
              {episodeGroups.map(group => {
                const tracks = filter === "all" ? group.tracks : group.tracks.filter(t => t.type === filter);
                if (tracks.length === 0) return null;
                const isScoreGroup = group.code === "Original Score";
                const accentColor = isScoreGroup ? "#7c3aed" : "linear-gradient(180deg, #16803c, #2563eb)";
                return (
                  <div key={group.code}>
                    <div style={{ marginBottom: 12 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                        <div style={{ width: 4, height: 28, borderRadius: 2, background: accentColor, flexShrink: 0 }} />
                        <h3 style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", fontSize: 17, fontWeight: 700, color: T.text, margin: 0 }}>{isScoreGroup ? "Original Score — Dave Porter" : group.title}</h3>
                        <span style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", fontSize: 10.5, fontWeight: 600, color: T.textDim }}>{tracks.length} {tracks.length === 1 ? "track" : "tracks"}</span>
                      </div>
                      {group.synopsis && <p style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", fontSize: 13.5, color: T.textMuted, lineHeight: 1.6, marginLeft: 14, paddingLeft: 10, borderLeft: `1px solid ${T.border}` }}>{group.synopsis}</p>}
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                      {tracks.map((track, i) => (
                        <TrackRow key={track.title + track.artist} track={track} index={i} isPlaying={nowPlaying?.title === track.title && nowPlaying?.artist === track.artist} onPlay={() => handlePlay(track)} library={library} toggleLibrary={toggleLibrary} />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          )}
        </div>
      </div>
      {npTrack && (
        <NowPlayingBar
          song={npTrack.title} artist={npTrack.artist} context={npTrack.context} timestamp={npTrack.timestamp}
          spotifyUrl={npTrack.spotify_url} videoId={npTrack.video_id}
          onClose={() => setNowPlaying(null)} onNext={handleNext} onPrev={handlePrev}
          library={library} toggleLibrary={toggleLibrary}
        />
      )}
      {videoModal && <VideoModal title={videoModal.title} subtitle={videoModal.channel} videoId={videoModal.videoId} timecodeUrl={videoModal.timecodeUrl} onClose={() => setVideoModal(null)} />}
    </div>
  );
}

// ==========================================================
//  SCREEN: CAST & CREW
// ==========================================================
// Gilligan repertory: people who worked on Breaking Bad, Better Call Saul, El Camino, or X-Files
const GILLIGAN_SHOWS = ["Breaking Bad", "Better Call Saul", "El Camino", "The X-Files"];
function isRepertory(entityData) {
  if (!entityData) return false;
  const works = [...(entityData.completeWorks || []), ...(entityData.collaborators || [])];
  return works.some(w => GILLIGAN_SHOWS.some(gs => (w.title || w.name || "").includes(gs)));
}

// Helper: extract all video items from an entity's quickViewGroups and interviews
function getEntityVideos(entity) {
  const qvVideos = (entity?.quickViewGroups || [])
    .filter(g => ["Videos", "Trailers", "Interviews", "Analysis"].includes(g.label))
    .flatMap(g => g.items || []);
  const interviews = (entity?.interviews || []).filter(i => i.video_id);
  const seen = new Set();
  return [...qvVideos, ...interviews].filter(v => {
    const id = v.video_id;
    if (!id || seen.has(id)) return false;
    seen.add(id);
    return true;
  });
}

// KG-informed bio prompt builder — type-aware, includes entity relationships
function buildKGBioPrompt(name, entity, charName, universe) {
  const type = entity?.type || "person";
  const subtitle = entity?.subtitle || "";
  const collabs = (entity?.collaborators || []).slice(0, 6).map(c => c.name).join(", ");
  const works = (entity?.completeWorks || []).filter(w => !w.title?.includes(name)).slice(0, 5).map(w => w.title).join("; ");
  const stats = (entity?.stats || []).map(s => `${s.label}: ${s.value}`).join(", ");
  const themes = (entity?.themes || []).slice(0, 4).map(t => t.title || t.name || t).join(", ");
  const charLine = charName ? `Plays "${charName}" in ${universe.name}.` : "";

  const typeFraming = {
    person: `Write a biography of ${name} (${subtitle}).`,
    character: `Write a character profile of ${name} from ${universe.name}.`,
    show: `Write about the TV series ${name} and its significance.`,
    film: `Write about the film ${name} and its significance.`,
    artist: `Write about the musician/artist ${name}.`,
  }[type] || `Write about ${name}.`;

  return `You are writing for the ${universe.name} universe (${universe.description}).
${typeFraming} ${charLine}
Known facts: ${stats || "N/A"}.
Collaborators: ${collabs || "N/A"}.
Notable works: ${works || "N/A"}.
Thematic connections: ${themes || "N/A"}.
Write 2-3 paragraphs emphasizing creative relationships, role in ${universe.name}, and artistic significance. Warm editorial tone, no Wikipedia-style opening.`;
}

// Bio cache helpers — localStorage, following ut_library / ut_tile_overrides patterns
function getBioCache(name) {
  try { return JSON.parse(localStorage.getItem(`ut_bio_${name.toLowerCase().replace(/\s+/g, "_")}`)); } catch { return null; }
}
function setBioCache(name, narrative, edited = false) {
  try { localStorage.setItem(`ut_bio_${name.toLowerCase().replace(/\s+/g, "_")}`, JSON.stringify({ narrative, timestamp: Date.now(), edited })); } catch {}
}
function clearBioCache(name) {
  try { localStorage.removeItem(`ut_bio_${name.toLowerCase().replace(/\s+/g, "_")}`); } catch {}
}

function CastCrewScreen({ onNavigate, onSelectEntity, library, toggleLibrary, selectedModel, onModelChange, entities, responseData, selectedUniverse, onUniverseChange, onNewChat, hasActiveResponse, sortedEntityNames, entityAliases, onEntityPopover }) {
  const [loaded, setLoaded] = useState(false);
  const [view, setView] = useState("lobby"); // "lobby" | "castDetail" | "crewDetail"
  const [selectedPerson, setSelectedPerson] = useState(null);
  const [liveBio, setLiveBio] = useState(null);
  const [liveBioLoading, setLiveBioLoading] = useState(false);
  const [bioCacheTimestamp, setBioCacheTimestamp] = useState(null);
  const [bioCacheEdited, setBioCacheEdited] = useState(false);
  const [editingBio, setEditingBio] = useState(false);
  const [editDraft, setEditDraft] = useState("");
  const [peopleNavOpen, setPeopleNavOpen] = useState(false);
  useEffect(() => { setTimeout(() => setLoaded(true), 100); }, []);

  // Creator: Vince Gilligan
  const creator = useMemo(() => {
    const vg = entities?.["Vince Gilligan"];
    if (!vg) return null;
    return {
      name: "Vince Gilligan",
      role: vg.subtitle || "Creator, Showrunner, Writer & Director",
      photoUrl: vg.photoUrl || null,
      bio: (vg.bio || [])[0] || "",
      stats: [
        { value: (vg.collaborators || []).length, label: "Collaborators" },
        { value: (vg.completeWorks || []).length || 4, label: "Major Works" },
      ],
      knownFor: [
        { title: "The X-Files", role: "Writer-Producer", year: "1995–2002" },
        { title: "Breaking Bad", role: "Creator", year: "2008–2013" },
        { title: "Better Call Saul", role: "Co-Creator", year: "2015–2022" },
        { title: "El Camino", role: "Writer & Director", year: "2019" },
        { title: "Pluribus", role: "Creator", year: "2025–" },
      ],
    };
  }, [entities]);

  const castCards = responseData?.discoveryGroups?.[1]?.cards || [];
  const crewCards = responseData?.discoveryGroups?.[2]?.cards || [];

  // Actor→character mapping with dynamic fallback from entity data
  const actorCharMap = useMemo(() => {
    if (responseData?.actorCharacterMap) return responseData.actorCharacterMap;
    if (!entities) return {};
    const map = {};
    for (const [name, e] of Object.entries(entities)) {
      if (e.type !== "character") continue;
      const match = e.subtitle?.match(/Played by (.+)$/);
      if (match) map[match[1]] = name;
    }
    return map;
  }, [entities, responseData]);

  // totalPeople is computed after drawer data derivation — see drawerTotal below

  // Fetch bio: check cache first, then broker API with KG-informed prompt
  useEffect(() => {
    if (!selectedPerson) return;
    if (liveBio) return;
    // Check cache first
    const cached = getBioCache(selectedPerson);
    if (cached?.narrative) {
      setLiveBio(cached.narrative);
      setBioCacheTimestamp(cached.timestamp);
      setBioCacheEdited(!!cached.edited);
      return;
    }
    // Build KG-informed prompt and fetch
    setLiveBioLoading(true);
    const entityData = entities?.[selectedPerson];
    const charName = actorCharMap[selectedPerson] || "";
    const universe = UNIVERSE_CONTEXT.pluribus;
    const queryText = buildKGBioPrompt(selectedPerson, entityData, charName, universe);
    fetch(`${API_BASE}/v2/broker`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: queryText }),
    })
      .then(res => res.ok ? res.json() : Promise.reject(res.status))
      .then(data => {
        const narrative = data.narrative || null;
        if (narrative) {
          setBioCache(selectedPerson, narrative);
          setBioCacheTimestamp(Date.now());
          setBioCacheEdited(false);
        }
        setLiveBio(narrative);
        setLiveBioLoading(false);
      })
      .catch(() => { setLiveBioLoading(false); });
  }, [selectedPerson, entities]);

  // Reset bio and editing state when person changes
  useEffect(() => { setLiveBio(null); setBioCacheTimestamp(null); setBioCacheEdited(false); setEditingBio(false); }, [selectedPerson]);

  const goToLobby = () => { setView("lobby"); setSelectedPerson(null); };
  const goToCastDetail = (name) => { setView("castDetail"); setSelectedPerson(name); };
  const goToCrewDetail = (name) => { setView("crewDetail"); setSelectedPerson(name); };

  // --- Breadcrumbs ---
  const renderBreadcrumbs = () => {
    if (view === "lobby") return <Logo />;
    const F = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
    const sep = <span style={{ color: T.textDim, fontSize: 13, margin: "0 4px" }}>/</span>;
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 0 }}>
        <Logo />
        {sep}
        <span onClick={goToLobby} style={{ fontFamily: F, fontSize: 13, color: T.blue, cursor: "pointer", fontWeight: 500 }}>Cast & Creators</span>
        {sep}
        <span style={{ fontFamily: F, fontSize: 13, color: T.text, fontWeight: 600 }}>{selectedPerson}</span>
      </div>
    );
  };

  // --- CAST DETAIL VIEW ---
  const renderCastDetail = () => {
    const person = castCards.find(c => c.title === selectedPerson);
    const entityData = entities?.[selectedPerson];
    const charName = actorCharMap[selectedPerson] || "";
    const charEntity = charName ? entities?.[charName] : null;
    const repertory = isRepertory(entityData);
    const previousWork = entityData?.completeWorks || [];
    const charThemes = charEntity?.themes || [];
    const entityBio = entityData?.bio || [];
    const entityStats = entityData?.stats || [];
    const entityTags = entityData?.tags || [];
    const videos = getEntityVideos(entityData);
    const collaborators = (entityData?.collaborators || []).slice(0, 8);
    const F = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
    const photoUrl = entityData?.photoUrl || person?.photoUrl;
    const isGilliganWork = (title) => GILLIGAN_SHOWS.some(gs => (title || "").includes(gs)) || (title || "").includes("Pluribus");

    return (
      <div style={{ maxWidth: 820 }}>
        {/* Enhanced Hero */}
        <div style={{ display: "flex", gap: 28, marginBottom: 32 }}>
          <div style={{ width: 160, height: 200, borderRadius: 14, flexShrink: 0, background: photoUrl ? `url(${photoUrl}) top center/cover` : "linear-gradient(135deg, #1a2744, #2a3a5a)", border: `1px solid ${T.border}`, boxShadow: T.shadow }} />
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, flexWrap: "wrap" }}>
              <h1 style={{ fontFamily: F, fontSize: 28, fontWeight: 700, color: T.text, margin: 0 }}>{selectedPerson}</h1>
            </div>
            {charName && <div style={{ fontFamily: F, fontSize: 16, color: T.blue, fontWeight: 600, marginBottom: 8 }}>as {charName}</div>}
            {/* Tags */}
            {entityTags.length > 0 && (
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
                {entityTags.map((tag, i) => (
                  <span key={i} style={{ fontFamily: F, fontSize: 10.5, color: T.textDim, background: T.bgElevated, padding: "2px 8px", borderRadius: 4, border: `1px solid ${T.border}` }}>{tag}</span>
                ))}
              </div>
            )}
            <p style={{ fontFamily: F, fontSize: 14, color: T.textMuted, lineHeight: 1.7, margin: 0 }}>{person?.context || ""}</p>
          </div>
        </div>

        {/* In Pluribus — Character Section */}
        {charEntity && (
          <section style={{ marginBottom: 32 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
              <div style={{ width: 4, height: 28, borderRadius: 2, background: "#c0392b", flexShrink: 0 }} />
              <h3 style={{ fontFamily: F, fontSize: 18, fontWeight: 700, color: T.text, margin: 0 }}>In Pluribus — {charName}</h3>
            </div>
            <p style={{ fontFamily: F, fontSize: 14, color: T.text, lineHeight: 1.75, marginBottom: 0 }}>
              {(charEntity.bio || [])[0] || `${charName} is a character in Pluribus.`}
            </p>
          </section>
        )}

        {/* Character Themes */}
        {charThemes.length > 0 && (
          <section style={{ marginBottom: 32 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
              <div style={{ width: 4, height: 28, borderRadius: 2, background: "#7c3aed", flexShrink: 0 }} />
              <h3 style={{ fontFamily: F, fontSize: 18, fontWeight: 700, color: T.text, margin: 0 }}>Themes This Character Carries</h3>
            </div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {charThemes.map(th => {
                const tid = (th.title || th.name || th).toString().toLowerCase().replace(/\s+/g, "_");
                const matchId = Object.keys(THEME_COLORS).find(k => tid.includes(k));
                return <ThemePill key={tid} themeId={matchId || tid} size="md" />;
              })}
            </div>
          </section>
        )}

        {/* Biography — KG-generated bio primary, entity.bio fallback */}
        <section style={{ marginBottom: 32 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
            <div style={{ width: 4, height: 28, borderRadius: 2, background: T.blue, flexShrink: 0 }} />
            <h3 style={{ fontFamily: F, fontSize: 18, fontWeight: 700, color: T.text, margin: 0 }}>About {selectedPerson}</h3>
          </div>
          {liveBioLoading ? (
            <div style={{ fontFamily: F, fontSize: 13, color: T.textDim, fontStyle: "italic" }}>Generating biography from knowledge graph...</div>
          ) : editingBio ? (
            <div>
              <textarea
                value={editDraft}
                onChange={e => setEditDraft(e.target.value)}
                style={{ fontFamily: F, fontSize: 14, color: T.text, lineHeight: 1.75, width: "100%", minHeight: 160, padding: 12, borderRadius: 8, border: `1px solid ${T.border}`, background: T.bgCard, resize: "vertical", outline: "none" }}
              />
              <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                <button onClick={() => { setBioCache(selectedPerson, editDraft, true); setLiveBio(editDraft); setBioCacheTimestamp(Date.now()); setBioCacheEdited(true); setEditingBio(false); }} style={{ fontFamily: F, fontSize: 12, fontWeight: 600, color: "#fff", background: T.blue, border: "none", borderRadius: 6, padding: "6px 16px", cursor: "pointer" }}>Save</button>
                <button onClick={() => setEditingBio(false)} style={{ fontFamily: F, fontSize: 12, fontWeight: 600, color: T.textMuted, background: "transparent", border: `1px solid ${T.border}`, borderRadius: 6, padding: "6px 16px", cursor: "pointer" }}>Cancel</button>
              </div>
            </div>
          ) : liveBio ? (
            <div>
              {liveBio.split(/\n\n+/).filter(p => p.trim()).map((para, i) => (
                <p key={i} style={{ fontFamily: F, fontSize: 14, color: T.text, lineHeight: 1.75, marginBottom: 12 }}>
                  {linkEntities(para, entities, sortedEntityNames, onEntityPopover, `cc-bio-${i}-`, entityAliases)}
                </p>
              ))}
            </div>
          ) : entityBio.length >= 1 ? (
            <div>
              {entityBio.map((para, i) => (
                <p key={i} style={{ fontFamily: F, fontSize: 14, color: T.text, lineHeight: 1.75, marginBottom: i < entityBio.length - 1 ? 12 : 0 }}>
                  {linkEntities(para, entities, sortedEntityNames, onEntityPopover, `cc-ebio-${i}-`, entityAliases)}
                </p>
              ))}
            </div>
          ) : (
            <p style={{ fontFamily: F, fontSize: 14, color: T.textMuted, lineHeight: 1.75 }}>{person?.context || "Biography not available."}</p>
          )}
          {/* Bio toolbar */}
          {(liveBio || bioCacheTimestamp) && !editingBio && !liveBioLoading && (
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 10 }}>
              <span onClick={() => { clearBioCache(selectedPerson); setLiveBio(null); setBioCacheTimestamp(null); setBioCacheEdited(false); }} style={{ fontFamily: F, fontSize: 11, color: T.blue, cursor: "pointer", fontWeight: 600 }}>Regenerate</span>
              <span onClick={() => { setEditDraft(liveBio || ""); setEditingBio(true); }} style={{ fontFamily: F, fontSize: 11, color: T.blue, cursor: "pointer", fontWeight: 600 }}>Edit</span>
              {bioCacheTimestamp && (
                <span style={{ fontFamily: F, fontSize: 11, color: T.textDim }}>· {bioCacheEdited ? "Edited" : "Generated"} {new Date(bioCacheTimestamp).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
              )}
            </div>
          )}
        </section>

        {/* Interviews & Appearances — YouTube embeds */}
        {videos.length > 0 && (
          <section style={{ marginBottom: 32 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
              <div style={{ width: 4, height: 28, borderRadius: 2, background: "#dc2626", flexShrink: 0 }} />
              <h3 style={{ fontFamily: F, fontSize: 18, fontWeight: 700, color: T.text, margin: 0 }}>Interviews & Appearances</h3>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: videos.length === 1 ? "1fr" : "repeat(2, 1fr)", gap: 16 }}>
              {videos.slice(0, 4).map((v) => (
                <div key={v.video_id} style={{ background: T.bgCard, border: `1px solid ${T.border}`, borderRadius: 12, overflow: "hidden", boxShadow: T.shadow }}>
                  <div style={{ position: "relative", paddingBottom: "56.25%", background: "#000" }}>
                    <iframe
                      src={`https://www.youtube.com/embed/${v.video_id}?rel=0&modestbranding=1`}
                      style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", border: "none" }}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      loading="lazy"
                      title={v.title || "Video"}
                    />
                  </div>
                  <div style={{ padding: "10px 14px" }}>
                    <div style={{ fontFamily: F, fontSize: 12.5, fontWeight: 600, color: T.text, lineHeight: 1.4, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{v.title || "Interview"}</div>
                    {v.meta && <div style={{ fontFamily: F, fontSize: 11, color: T.textDim, marginTop: 3 }}>{v.meta}</div>}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Known For — grouped by role, most recent first */}
        {previousWork.length > 0 && (
          <section style={{ marginBottom: 32 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
              <div style={{ width: 4, height: 28, borderRadius: 2, background: T.green, flexShrink: 0 }} />
              <h3 style={{ fontFamily: F, fontSize: 18, fontWeight: 700, color: T.text, margin: 0 }}>Known For</h3>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {(() => {
                let lastRole = null;
                return previousWork.map((w, i) => {
                  const gilliganWork = isGilliganWork(w.title);
                  const currentRole = w.role || w.type || "WORK";
                  const showRoleHeader = currentRole !== lastRole;
                  lastRole = currentRole;
                  return (
                    <div key={`${w.title}-${i}`}>
                      {showRoleHeader && (
                        <div style={{ fontFamily: "'SF Mono', Menlo, Monaco, monospace", fontSize: 10, fontWeight: 700, color: T.textMuted, textTransform: "uppercase", letterSpacing: "0.06em", marginTop: i > 0 ? 12 : 0, marginBottom: 6, paddingLeft: 2 }}>{currentRole}</div>
                      )}
                      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", background: T.bgCard, border: `1px solid ${gilliganWork ? T.goldBorder : T.border}`, borderRadius: 10 }}>
                        {w.posterUrl && <div style={{ width: 36, height: 52, borderRadius: 4, background: `url(${w.posterUrl}) center/cover`, flexShrink: 0, border: `1px solid ${T.border}` }} />}
                        <span style={{ fontFamily: "'SF Mono', Menlo, Monaco, monospace", fontSize: 11.5, fontWeight: 700, color: gilliganWork ? T.gold : T.green, background: gilliganWork ? T.goldBg : T.greenBg, padding: "2px 6px", borderRadius: 3, textTransform: "uppercase", flexShrink: 0 }}>{w.type || "WORK"}</span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <span style={{ fontFamily: F, fontSize: 13, fontWeight: 600, color: T.text }}>{w.title}</span>
                          {w.year && <span style={{ fontFamily: F, fontSize: 11.5, color: T.textMuted, marginLeft: 8 }}>{w.yearEnd && w.yearEnd !== w.year ? `${w.year}–${w.yearEnd}` : w.year}</span>}
                        </div>
                        {gilliganWork && <span style={{ fontFamily: "'SF Mono', Menlo, Monaco, monospace", fontSize: 8, fontWeight: 700, color: T.gold, textTransform: "uppercase", letterSpacing: "0.05em", flexShrink: 0 }}>GILLIGAN</span>}
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          </section>
        )}

        {/* Collaborators */}
        {collaborators.length > 0 && (
          <section style={{ marginBottom: 32 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
              <div style={{ width: 4, height: 28, borderRadius: 2, background: "#0891b2", flexShrink: 0 }} />
              <h3 style={{ fontFamily: F, fontSize: 18, fontWeight: 700, color: T.text, margin: 0 }}>Collaborators</h3>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10 }}>
              {collaborators.map(c => {
                const collabEntity = entities?.[c.name];
                const inCast = castCards.some(cc => cc.title === c.name) || crewCards.some(cc => cc.title === c.name);
                return (
                  <div key={c.name} onClick={() => { if (inCast) { if (castCards.some(cc => cc.title === c.name)) goToCastDetail(c.name); else goToCrewDetail(c.name); } }} style={{
                    display: "flex", alignItems: "center", gap: 12, padding: "10px 14px",
                    background: T.bgCard, border: `1px solid ${inCast ? T.blueBorder : T.border}`, borderRadius: 10,
                    cursor: inCast ? "pointer" : "default", transition: "all 0.15s",
                  }}>
                    <div style={{ width: 36, height: 36, borderRadius: 8, flexShrink: 0, background: collabEntity?.photoUrl ? `url(${collabEntity.photoUrl}) top center/cover` : "linear-gradient(135deg, #1a2744, #2a3a5a)", border: `1px solid ${T.border}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: "#fff", fontFamily: F }}>
                      {!collabEntity?.photoUrl && (c.name || "").split(" ").map(n => n[0]).join("").slice(0, 2)}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontFamily: F, fontSize: 13, fontWeight: 600, color: T.text }}>{c.name}</div>
                      {c.relationship && <div style={{ fontFamily: F, fontSize: 11, color: T.textDim, lineHeight: 1.4 }}>{c.relationship}</div>}
                    </div>
                    {inCast && <span style={{ fontFamily: F, fontSize: 9, fontWeight: 700, color: T.blue, background: T.blueLight, padding: "2px 6px", borderRadius: 3, textTransform: "uppercase", flexShrink: 0 }}>In Cast</span>}
                  </div>
                );
              })}
            </div>
          </section>
        )}
      </div>
    );
  };

  // --- CREW DETAIL VIEW ---
  const renderCrewDetail = () => {
    const person = crewCards.find(c => c.title === selectedPerson);
    const entityData = entities?.[selectedPerson];
    const repertory = isRepertory(entityData);
    const creativeLineage = entityData?.completeWorks || [];
    const entityBio = entityData?.bio || [];
    const entityStats = entityData?.stats || [];
    const videos = getEntityVideos(entityData);
    const photoUrl = entityData?.photoUrl || person?.photoUrl;
    const F = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
    const isGilliganWork = (title) => GILLIGAN_SHOWS.some(gs => (title || "").includes(gs)) || (title || "").includes("Pluribus");

    return (
      <div style={{ maxWidth: 820 }}>
        {/* Enhanced Hero — larger photo */}
        <div style={{ display: "flex", gap: 28, marginBottom: 32 }}>
          <div style={{ width: 160, height: 200, borderRadius: 14, flexShrink: 0, background: photoUrl ? `url(${photoUrl}) top center/cover` : "linear-gradient(135deg, #1a2744, #2a3a5a)", border: `1px solid ${T.border}`, boxShadow: T.shadow, display: "flex", alignItems: "center", justifyContent: "center" }}>
            {!photoUrl && <span style={{ fontSize: 32, fontWeight: 700, color: "#fff", fontFamily: F }}>{(selectedPerson || "").split(" ").map(n => n[0]).join("").slice(0, 2)}</span>}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, flexWrap: "wrap" }}>
              <h1 style={{ fontFamily: F, fontSize: 28, fontWeight: 700, color: T.text, margin: 0 }}>{selectedPerson}</h1>
              <span style={{ fontFamily: "'SF Mono', Menlo, Monaco, monospace", fontSize: 9, fontWeight: 700, color: "#7c3aed", background: "rgba(124,58,237,0.1)", padding: "2px 8px", borderRadius: 4, textTransform: "uppercase" }}>{person?.type || person?.role || "CREW"}</span>
            </div>
            <p style={{ fontFamily: F, fontSize: 14, color: T.textMuted, lineHeight: 1.7, margin: 0 }}>{person?.context || person?.meta || ""}</p>
          </div>
        </div>

        {/* Biography — KG-generated bio primary, entity.bio fallback */}
        <section style={{ marginBottom: 32 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
            <div style={{ width: 4, height: 28, borderRadius: 2, background: T.blue, flexShrink: 0 }} />
            <h3 style={{ fontFamily: F, fontSize: 18, fontWeight: 700, color: T.text, margin: 0 }}>About {selectedPerson}</h3>
          </div>
          {liveBioLoading ? (
            <div style={{ fontFamily: F, fontSize: 13, color: T.textDim, fontStyle: "italic" }}>Generating biography from knowledge graph...</div>
          ) : editingBio ? (
            <div>
              <textarea
                value={editDraft}
                onChange={e => setEditDraft(e.target.value)}
                style={{ fontFamily: F, fontSize: 14, color: T.text, lineHeight: 1.75, width: "100%", minHeight: 160, padding: 12, borderRadius: 8, border: `1px solid ${T.border}`, background: T.bgCard, resize: "vertical", outline: "none" }}
              />
              <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                <button onClick={() => { setBioCache(selectedPerson, editDraft, true); setLiveBio(editDraft); setBioCacheTimestamp(Date.now()); setBioCacheEdited(true); setEditingBio(false); }} style={{ fontFamily: F, fontSize: 12, fontWeight: 600, color: "#fff", background: T.blue, border: "none", borderRadius: 6, padding: "6px 16px", cursor: "pointer" }}>Save</button>
                <button onClick={() => setEditingBio(false)} style={{ fontFamily: F, fontSize: 12, fontWeight: 600, color: T.textMuted, background: "transparent", border: `1px solid ${T.border}`, borderRadius: 6, padding: "6px 16px", cursor: "pointer" }}>Cancel</button>
              </div>
            </div>
          ) : liveBio ? (
            <div>
              {liveBio.split(/\n\n+/).filter(p => p.trim()).map((para, i) => (
                <p key={i} style={{ fontFamily: F, fontSize: 14, color: T.text, lineHeight: 1.75, marginBottom: 12 }}>{para}</p>
              ))}
            </div>
          ) : entityBio.length >= 1 ? (
            <div>
              {entityBio.map((para, i) => (
                <p key={i} style={{ fontFamily: F, fontSize: 14, color: T.text, lineHeight: 1.75, marginBottom: i < entityBio.length - 1 ? 12 : 0 }}>{para}</p>
              ))}
            </div>
          ) : (
            <p style={{ fontFamily: F, fontSize: 14, color: T.textMuted, lineHeight: 1.75 }}>{person?.context || "Details not available."}</p>
          )}
          {/* Bio toolbar */}
          {(liveBio || bioCacheTimestamp) && !editingBio && !liveBioLoading && (
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 10 }}>
              <span onClick={() => { clearBioCache(selectedPerson); setLiveBio(null); setBioCacheTimestamp(null); setBioCacheEdited(false); }} style={{ fontFamily: F, fontSize: 11, color: T.blue, cursor: "pointer", fontWeight: 600 }}>Regenerate</span>
              <span onClick={() => { setEditDraft(liveBio || ""); setEditingBio(true); }} style={{ fontFamily: F, fontSize: 11, color: T.blue, cursor: "pointer", fontWeight: 600 }}>Edit</span>
              {bioCacheTimestamp && (
                <span style={{ fontFamily: F, fontSize: 11, color: T.textDim }}>· {bioCacheEdited ? "Edited" : "Generated"} {new Date(bioCacheTimestamp).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
              )}
            </div>
          )}
        </section>

        {/* Videos — interviews, behind-the-scenes */}
        {videos.length > 0 && (
          <section style={{ marginBottom: 32 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
              <div style={{ width: 4, height: 28, borderRadius: 2, background: "#dc2626", flexShrink: 0 }} />
              <h3 style={{ fontFamily: F, fontSize: 18, fontWeight: 700, color: T.text, margin: 0 }}>Videos</h3>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: videos.length === 1 ? "1fr" : "repeat(2, 1fr)", gap: 16 }}>
              {videos.slice(0, 4).map((v) => (
                <div key={v.video_id} style={{ background: T.bgCard, border: `1px solid ${T.border}`, borderRadius: 12, overflow: "hidden", boxShadow: T.shadow }}>
                  <div style={{ position: "relative", paddingBottom: "56.25%", background: "#000" }}>
                    <iframe
                      src={`https://www.youtube.com/embed/${v.video_id}?rel=0&modestbranding=1`}
                      style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", border: "none" }}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      loading="lazy"
                      title={v.title || "Video"}
                    />
                  </div>
                  <div style={{ padding: "10px 14px" }}>
                    <div style={{ fontFamily: F, fontSize: 12.5, fontWeight: 600, color: T.text, lineHeight: 1.4, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{v.title || "Video"}</div>
                    {v.meta && <div style={{ fontFamily: F, fontSize: 11, color: T.textDim, marginTop: 3 }}>{v.meta}</div>}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Known For — with gold accents for Gilligan works, grouped by role */}
        {creativeLineage.length > 0 && (
          <section style={{ marginBottom: 32 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
              <div style={{ width: 4, height: 28, borderRadius: 2, background: T.green, flexShrink: 0 }} />
              <h3 style={{ fontFamily: F, fontSize: 18, fontWeight: 700, color: T.text, margin: 0 }}>Known For</h3>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {(() => {
                let lastRole = null;
                return creativeLineage.map((w, i) => {
                  const gilliganWork = isGilliganWork(w.title);
                  const currentRole = w.role || w.type || "WORK";
                  const showRoleHeader = currentRole !== lastRole;
                  lastRole = currentRole;
                  return (
                    <div key={`${w.title}-${i}`}>
                      {showRoleHeader && (
                        <div style={{ fontFamily: "'SF Mono', Menlo, Monaco, monospace", fontSize: 10, fontWeight: 700, color: T.textMuted, textTransform: "uppercase", letterSpacing: "0.06em", marginTop: i > 0 ? 12 : 0, marginBottom: 6, paddingLeft: 2 }}>{currentRole}</div>
                      )}
                      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", background: T.bgCard, border: `1px solid ${gilliganWork ? T.goldBorder : T.border}`, borderRadius: 10 }}>
                        <span style={{ fontFamily: "'SF Mono', Menlo, Monaco, monospace", fontSize: 11.5, fontWeight: 700, color: gilliganWork ? T.gold : T.green, background: gilliganWork ? T.goldBg : T.greenBg, padding: "2px 6px", borderRadius: 3, textTransform: "uppercase", flexShrink: 0 }}>{w.type || "WORK"}</span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <span style={{ fontFamily: F, fontSize: 13, fontWeight: 600, color: T.text }}>{w.title}</span>
                          {w.year && <span style={{ fontFamily: F, fontSize: 11.5, color: T.textMuted, marginLeft: 8 }}>{w.yearEnd && w.yearEnd !== w.year ? `${w.year}–${w.yearEnd}` : w.year}</span>}
                        </div>
                        {gilliganWork && <span style={{ fontFamily: "'SF Mono', Menlo, Monaco, monospace", fontSize: 8, fontWeight: 700, color: T.gold, textTransform: "uppercase", letterSpacing: "0.05em", flexShrink: 0 }}>GILLIGAN</span>}
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          </section>
        )}
      </div>
    );
  };

  // --- LOBBY VIEW ---
  const renderLobby = () => (
    <div style={{ maxWidth: 820 }}>
      <div style={{ marginBottom: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
          <span style={{ fontSize: 26 }}>◉</span>
          <h1 style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", fontSize: 28, fontWeight: 700, color: T.text, margin: 0 }}>Cast & Creators</h1>
          <span onClick={() => setPeopleNavOpen(!peopleNavOpen)} style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, fontWeight: 700, color: "#1a2744", background: peopleNavOpen ? "linear-gradient(135deg, #f5b800, #ffce3a)" : "linear-gradient(135deg, #fffdf5, #fff8e8)", border: peopleNavOpen ? "1.5px solid #f5b800" : "1.5px solid #ffce3a", padding: "4px 12px", borderRadius: 12, cursor: "pointer", transition: "all 0.2s" }}>{totalPeople} people</span>
        </div>
        <p style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", fontSize: 15, color: T.textMuted, lineHeight: 1.65, maxWidth: 640, marginBottom: 4 }}>
          Pluribus reunites Vince Gilligan's trusted creative family with a striking new ensemble. Many of these collaborators have been working together since the meth labs of Albuquerque — now they're navigating alien signals and hive minds.
        </p>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 32, fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", fontSize: 11, color: T.textDim }}>
        <div style={{ width: 5, height: 5, borderRadius: "50%", background: T.gold }} />
        <span>Powered by UnitedTribes Knowledge Graph</span>
        <span style={{ color: T.border }}>·</span>
        <span>{castSectionCount} cast</span>
        <span style={{ color: T.border }}>·</span>
        <span>{crewSectionCount} creators & crew</span>
      </div>

      {/* Creator Spotlight with Timeline */}
      {creator && (
        <div style={{ marginBottom: 36 }}>
          <div style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", fontSize: 10, fontWeight: 700, color: T.textDim, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 12 }}>Creator</div>
          <CreatorSpotlight creator={creator} onEntityClick={() => goToCrewDetail("Vince Gilligan")} />
          {/* Timeline strip */}
          <div style={{ display: "flex", gap: 0, marginTop: 14, alignItems: "stretch" }}>
            {(creator.knownFor || []).map((show, i) => {
              const isActive = show.title === "Pluribus";
              return (
                <div key={show.title} onClick={() => { if (!isActive) { onSelectEntity(show.title); onNavigate(SCREENS.ENTITY_DETAIL); } }} style={{ flex: 1, position: "relative", cursor: isActive ? "default" : "pointer" }}>
                  <div style={{ height: 3, background: isActive ? T.blue : T.border }} />
                  <div style={{ padding: "8px 10px 0" }}>
                    <div style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", fontSize: 11, fontWeight: 700, color: isActive ? T.blue : T.text }}>{show.title}</div>
                    <div style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", fontSize: 10, color: T.textDim }}>{show.role} · {show.year}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* The Cast — 3-column grid */}
      {castCards.length > 0 && (
        <div style={{ marginBottom: 36 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
            <div style={{ width: 4, height: 28, borderRadius: 2, background: T.blue, flexShrink: 0 }} />
            <div>
              <h3 style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", fontSize: 18, fontWeight: 700, color: T.text, margin: 0 }}>The Cast</h3>
              <p style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", fontSize: 13, color: T.textMuted, margin: "2px 0 0" }}>{castCards.length} actors bringing Pluribus to life.</p>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
            {castCards.map(person => {
              const charName = actorCharMap[person.title] || "";
              const entityData = entities?.[person.title];
              const repertory = isRepertory(entityData);
              const mediaCount = getEntityVideos(entityData).length;
              const entityPhoto = entityData?.photoUrl;
              return (
                <CastCard
                  key={person.title}
                  person={{ ...person, character: charName, repertory, photoUrl: entityPhoto || person.photoUrl }}
                  onEntityClick={(name) => goToCastDetail(name)}
                  mediaCount={mediaCount}
                />
              );
            })}
          </div>
        </div>
      )}

      {/* Key Crew */}
      {crewCards.length > 0 && (
        <div style={{ marginBottom: 36 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
            <div style={{ width: 4, height: 28, borderRadius: 2, background: "#7c3aed", flexShrink: 0 }} />
            <div>
              <h3 style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", fontSize: 18, fontWeight: 700, color: T.text, margin: 0 }}>Key Crew</h3>
              <p style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", fontSize: 13, color: T.textMuted, margin: "2px 0 0" }}>The behind-the-scenes team — many of them Gilligan collaborators for over a decade.</p>
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {crewCards.filter(p => p.title !== "Vince Gilligan" && p.title !== "Vince Gilligan tv-series" && p.title !== "BTR1" && p.title !== "Ricky Cook").map(person => {
              const entityData = entities?.[person.title];
              const repertory = isRepertory(entityData);
              const entityPhoto = entityData?.photoUrl;
              return (
                <CrewRow
                  key={person.title}
                  person={{ ...person, repertory, photoUrl: entityPhoto || person.photoUrl }}
                  onEntityClick={(name) => goToCrewDetail(name)}
                />
              );
            })}
          </div>
        </div>
      )}
    </div>
  );

  // --- People drawer data ---
  // Only include cast with confirmed character roles (from actorCharMap) + KG cameos/guests
  const KG_CAST_EXTRAS = [{ title: "John Cena", type: "GUEST", context: "Comedic cameo in Episode 6, playing himself" }];
  const confirmedCast = [
    ...castCards.filter(p => { const n = p.title || p.name; return actorCharMap[n] || p.character; }),
    ...KG_CAST_EXTRAS.filter(c => !castCards.some(p => p.title === c.title)),
  ];
  const PROMOTED_LEADS = ["Carlos-Manuel Vesga", "Menik Gooneratne", "John Cena"];
  const drawerLeads = confirmedCast.filter(p => {
    const name = p.title || p.name;
    return p.type === "LEAD" || p.role === "Lead" || PROMOTED_LEADS.includes(name);
  });
  const drawerCast = confirmedCast.filter(p => {
    const name = p.title || p.name;
    return p.type !== "LEAD" && p.role !== "Lead" && !PROMOTED_LEADS.includes(name);
  });
  // Crew: enriched roles from KG, add missing crew members
  const KG_CREW_ROLES = {
    "Vince Gilligan": "Creator, Executive Producer, Writer & Director",
    "Gordon Smith": "Executive Producer, Writer & Director",
    "Alison Tatlock": "Executive Producer & Writer",
    "Jenn Carroll": "Co-Executive Producer & Writer",
    "Dave Porter": "Composer",
    "Thomas Golubic": "Music Supervisor",
  };
  const CHARACTER_DESCS = {
    "Carol Sturka": "Protagonist — Albuquerque romantasy novelist immune to the Joining",
    "Zosia": "One of the Others who becomes Carol's guide",
    "Helen L. Umstead": "Carol's public manager and private partner",
    "Helen": "Carol's public manager and private partner",
    "Davis Taffler": "A government figure who communicates with Carol",
    "Koumba Diabaté": "An immune survivor who chooses a hedonistic lifestyle",
    "Mr. Diabaté": "An immune survivor who chooses a hedonistic lifestyle",
    "Manousos Oviedo": "A Paraguayan storage manager who is also immune",
  };
  const KG_CREW_EXTRAS = [{ title: "Thomas Golubic", type: "CREW", context: "Music Supervisor" }];
  const EXCLUDE_CREW = ["Vince Gilligan", "Vince Gilligan tv-series", "BTR1", "Ricky Cook"];
  const allCrewCards = [
    ...crewCards,
    ...KG_CREW_EXTRAS.filter(c => !crewCards.some(p => p.title === c.title)),
  ];
  const drawerCrewAll = allCrewCards.filter(p => !EXCLUDE_CREW.includes(p.title));
  const crewSectionCount = (creator ? 1 : 0) + drawerCrewAll.length;
  const castSectionCount = drawerLeads.length + drawerCast.length;
  const totalPeople = crewSectionCount + castSectionCount;

  const renderPeopleDrawer = () => {
    const F = "'DM Sans', sans-serif";
    const isActiveP = (name, isCrew) => selectedPerson === name && view === (isCrew ? "crewDetail" : "castDetail");

    const PersonRow = ({ name, subtitle, subtitleColor, photoUrl, isCrew, charDesc }) => {
      const active = isActiveP(name, isCrew);
      const initials = (name || "").split(" ").map(n => n[0]).join("").slice(0, 2);
      const [hovered, setHovered] = useState(false);
      return (
        <div
          onClick={() => { isCrew ? goToCrewDetail(name) : goToCastDetail(name); }}
          onMouseEnter={(e) => { setHovered(true); if (!active) e.currentTarget.style.background = "#faf8f5"; }}
          onMouseLeave={(e) => { setHovered(false); if (!active) e.currentTarget.style.background = active ? "linear-gradient(135deg, #fffdf5, #fff8e8)" : "transparent"; }}
          style={{
            display: "flex", alignItems: "center", gap: 14, padding: "12px 24px",
            cursor: "pointer", transition: "background 0.15s",
            background: active ? "linear-gradient(135deg, #fffdf5, #fff8e8)" : "transparent",
            borderLeft: active ? "3px solid #f5b800" : "3px solid transparent",
          }}
        >
          <div style={{
            width: 56, height: 56, borderRadius: 10, flexShrink: 0,
            background: photoUrl ? `url(${photoUrl}) top center/cover no-repeat` : "linear-gradient(135deg, #fffdf5, #fff8e8)",
            border: "1.5px solid #d8cfc2",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 16, fontWeight: 700, color: "#1a2744", fontFamily: F,
          }}>
            {!photoUrl && initials}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: F, fontSize: 15, fontWeight: 700, color: "#1a2744", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{name}</div>
            {subtitle && <div style={{ fontFamily: F, fontSize: 12, fontWeight: 600, color: subtitleColor || "#2563eb", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", marginTop: 2 }}>{subtitle}</div>}
            {charDesc && <div style={{ display: "grid", gridTemplateRows: (hovered || active) ? "1fr" : "0fr", transition: "grid-template-rows 0.35s ease, opacity 0.3s ease", opacity: (hovered || active) ? 1 : 0 }}><div style={{ overflow: "hidden", minHeight: 0 }}><div style={{ fontFamily: F, fontSize: 11.5, fontWeight: 500, color: "#3d3028", marginTop: 3, lineHeight: 1.4 }}>{charDesc}</div></div></div>}
          </div>
        </div>
      );
    };

    const SectionHead = ({ label, count }) => (
      <div style={{ padding: "18px 24px 8px", fontFamily: F, fontSize: 11, fontWeight: 700, color: "#1a2744", textTransform: "uppercase", letterSpacing: "0.8px" }}>
        {label} <span style={{ fontWeight: 600 }}>({count})</span>
      </div>
    );

    return (
      <div style={{
        width: peopleNavOpen ? 400 : 0, flexShrink: 0, overflow: "hidden",
        borderLeft: peopleNavOpen ? "2px solid #d8cfc2" : "none",
        background: "#f0ebe3",
        display: "flex", flexDirection: "column", height: "100%",
        boxShadow: peopleNavOpen ? "-6px 0 30px rgba(44,24,16,.1)" : "none",
        transition: "width 0.35s cubic-bezier(0.16,1,0.3,1), box-shadow 0.35s ease",
      }}>
        <div style={{
          borderBottom: "2px solid #e8e0d4",
          background: "rgba(240,235,227,0.97)", backdropFilter: "blur(8px)",
          position: "sticky", top: 0, zIndex: 2, minWidth: 400,
        }}>
          <div style={{ padding: "16px 24px 0", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontFamily: F, fontSize: 14, fontWeight: 700, textTransform: "uppercase", letterSpacing: "1.5px", color: "#1a2744" }}>People Directory</span>
            <span
              onClick={() => setPeopleNavOpen(false)}
              style={{ fontSize: 22, color: "#1a2744", cursor: "pointer", lineHeight: 1, fontWeight: 300 }}
              onMouseEnter={(e) => { e.currentTarget.style.color = "#f5b800"; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = "#1a2744"; }}
            >×</span>
          </div>
          <div style={{ padding: "10px 24px", display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            {[
              { label: "Cast", count: castSectionCount, id: "drawer-cast" },
              { label: "Creators & Crew", count: crewSectionCount, id: "drawer-crew" },
            ].map(tab => (
              <span
                key={tab.id}
                onClick={() => { const el = document.getElementById(tab.id); if (el) el.scrollIntoView({ behavior: "smooth", block: "start" }); }}
                style={{
                  fontFamily: F, fontSize: 12, fontWeight: 700, color: "#1a2744",
                  padding: "5px 12px", borderRadius: 8, cursor: "pointer",
                  background: "linear-gradient(135deg, #fffdf5, #fff8e8)", border: "1.5px solid #d8cfc2",
                  transition: "all 0.15s",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#f5b800"; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#d8cfc2"; }}
              >{tab.label} ({tab.count})</span>
            ))}
            {view !== "lobby" && (
              <span
                onClick={goToLobby}
                style={{ fontFamily: F, fontSize: 12, fontWeight: 700, color: "#2563eb", cursor: "pointer", marginLeft: "auto" }}
                onMouseEnter={(e) => { e.currentTarget.style.textDecoration = "underline"; }}
                onMouseLeave={(e) => { e.currentTarget.style.textDecoration = "none"; }}
              >← Overview</span>
            )}
          </div>
        </div>
        <div style={{ flex: 1, overflowY: "auto", minWidth: 400 }}>
          {/* Lead Cast */}
          <div id="drawer-cast" />
          {drawerLeads.length > 0 && (
            <>
              <SectionHead label="Lead Cast" count={drawerLeads.length} />
              {drawerLeads.map(p => {
                const name = p.title || p.name;
                const charName = actorCharMap[name] || p.character || "";
                const entityData = entities?.[name];
                const desc = CHARACTER_DESCS[charName] || "";
                return (
                  <PersonRow key={name} name={name} subtitle={charName ? `as ${charName}` : ""} photoUrl={entityData?.photoUrl || p.photoUrl} isCrew={false} charDesc={desc} />
                );
              })}
            </>
          )}
          {/* Cast */}
          {drawerCast.length > 0 && (
            <>
              <SectionHead label="Cast" count={drawerCast.length} />
              {drawerCast.map(p => {
                const name = p.title || p.name;
                const charName = actorCharMap[name] || p.character || "";
                const entityData = entities?.[name];
                const desc = CHARACTER_DESCS[charName] || "";
                return (
                  <PersonRow key={name} name={name} subtitle={charName ? `as ${charName}` : ""} photoUrl={entityData?.photoUrl || p.photoUrl} isCrew={false} charDesc={desc} />
                );
              })}
            </>
          )}
          {/* Creators & Key Crew */}
          <div id="drawer-crew" />
          <SectionHead label="Creators & Key Crew" count={crewSectionCount} />
          {creator && (
            <PersonRow name="Vince Gilligan" subtitle={KG_CREW_ROLES["Vince Gilligan"]} subtitleColor="#3d3028" photoUrl={entities?.["Vince Gilligan"]?.photoUrl} isCrew={true} />
          )}
          {drawerCrewAll.map(p => {
            const name = p.title || p.name;
            const role = KG_CREW_ROLES[name] || p.context || p.type || "";
            return (
              <PersonRow key={name} name={name} subtitle={role} subtitleColor="#3d3028" photoUrl={entities?.[name]?.photoUrl || p.photoUrl} isCrew={true} />
            );
          })}
          <div style={{ height: 24 }} />
        </div>
      </div>
    );
  };

  return (
    <div style={{ height: "100vh", background: "transparent" }}>
      <SideNav active="cast" onNavigate={(s) => { if (s === SCREENS.CAST_CREW) goToLobby(); else onNavigate(s); }} libraryCount={library ? library.size : 0} hasActiveResponse={hasActiveResponse} />
      <div style={{ marginLeft: 72, height: "100vh", display: "flex", flexDirection: "column" }}>
        <TopNav onNavigate={(s) => { if (s === SCREENS.CAST_CREW) goToLobby(); else onNavigate(s); }} selectedModel={selectedModel} onModelChange={onModelChange} selectedUniverse={selectedUniverse} onUniverseChange={onUniverseChange} onNewChat={onNewChat} />
        <div style={{ flex: 1, display: "flex", minHeight: 0, position: "relative" }}>
          <div style={{ flex: 1, overflowY: "auto", padding: "36px 48px 120px", opacity: loaded ? 1 : 0, transition: "opacity 0.4s" }}>
            {view === "lobby" && renderLobby()}
            {view === "castDetail" && renderCastDetail()}
            {view === "crewDetail" && renderCrewDetail()}
          </div>
          {!peopleNavOpen && (
            <div
              onClick={() => setPeopleNavOpen(true)}
              style={{
                position: "absolute", right: 0, top: "50%", transform: "translateY(-50%)",
                background: "#1a2744", border: "none", padding: "14px 8px",
                cursor: "pointer", borderRadius: "8px 0 0 8px",
                writingMode: "vertical-rl", fontSize: 11, letterSpacing: "0.8px",
                color: "#ffce3a", fontWeight: 700, fontFamily: "'DM Sans', sans-serif",
                zIndex: 10, transition: "padding 0.15s",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.paddingLeft = "12px"; }}
              onMouseLeave={(e) => { e.currentTarget.style.paddingLeft = "8px"; }}
            >PEOPLE</div>
          )}
          {renderPeopleDrawer()}
        </div>
      </div>
    </div>
  );
}

// ==========================================================
//  SCREEN: EPISODES
// ==========================================================
function EpisodesScreen({ onNavigate, onSelectEntity, library, toggleLibrary, selectedModel, onModelChange, entities, responseData, onSelectEpisode, selectedUniverse, onUniverseChange, onNewChat, hasActiveResponse }) {
  const [loaded, setLoaded] = useState(false);
  useEffect(() => { setTimeout(() => setLoaded(true), 100); }, []);

  const episodes = responseData?.episodes || [];
  const songs = responseData?.songs || [];
  const castCards = responseData?.discoveryGroups?.[1]?.cards || [];
  const actorCharMap = responseData?.actorCharacterMap || {};

  return (
    <div style={{ height: "100vh", background: "transparent" }}>
      <SideNav active="episodes" onNavigate={onNavigate} libraryCount={library ? library.size : 0} hasActiveResponse={hasActiveResponse} />
      <div style={{ marginLeft: 72, height: "100vh", display: "flex", flexDirection: "column" }}>
        <TopNav onNavigate={onNavigate} selectedModel={selectedModel} onModelChange={onModelChange} selectedUniverse={selectedUniverse} onUniverseChange={onUniverseChange} onNewChat={onNewChat} />
        <div style={{ flex: 1, overflowY: "auto", padding: "36px 48px 120px", opacity: loaded ? 1 : 0, transition: "opacity 0.4s" }}>
          <div style={{ maxWidth: 820 }}>
            <div style={{ marginBottom: 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
                <span style={{ fontSize: 26 }}>▣</span>
                <h1 style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", fontSize: 28, fontWeight: 700, color: T.text, margin: 0 }}>Episodes</h1>
                <span style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", fontSize: 12, fontWeight: 600, color: T.blue, background: T.blueLight, padding: "3px 10px", borderRadius: 6 }}>Season 1 · {episodes.length} episodes</span>
              </div>
              <p style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", fontSize: 15, color: T.textMuted, lineHeight: 1.65, maxWidth: 640, marginBottom: 4 }}>
                Nine episodes. One signal. Thirteen immune. Vince Gilligan's first original series since Breaking Bad unfolds as a slow-burn alien invasion where the real horror isn't what the signal does to you — it's that part of you wants it to.
              </p>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 32, fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", fontSize: 11, color: T.textDim }}>
              <div style={{ width: 5, height: 5, borderRadius: "50%", background: T.gold }} />
              <span>Powered by UnitedTribes Knowledge Graph</span>
              <span style={{ color: T.border }}>·</span>
              <span>{songs.length} tracks mapped</span>
              <span style={{ color: T.border }}>·</span>
              <span>{castCards.length} cast</span>
            </div>

            {episodes.length > 0 ? EPISODE_ARCS.map(arc => {
              const arcEps = episodes.filter(ep => ep.number >= arc.range[0] && ep.number <= arc.range[1]);
              if (arcEps.length === 0) return null;
              return (
                <div key={arc.label} style={{ marginBottom: 36 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
                    <div style={{ width: 4, height: 36, borderRadius: 2, background: `linear-gradient(180deg, ${T.gold}, ${T.gold}88)`, flexShrink: 0 }} />
                    <div>
                      <div style={{ fontFamily: "'SF Mono', Menlo, Monaco, monospace", fontSize: 10, fontWeight: 700, color: T.gold, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                        {arc.label} — Episodes {arc.range[0]}–{arc.range[1]}
                      </div>
                      <div style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", fontSize: 13.5, color: T.textMuted, marginTop: 2, fontStyle: "italic" }}>{arc.description}</div>
                    </div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                    {arcEps.map(ep => (
                      <EpisodeCard
                        key={ep.id}
                        episode={ep}
                        songs={songs}
                        castCards={castCards.slice(0, 6)}
                        actorCharMap={actorCharMap}
                        onSelect={(id) => onSelectEpisode(id)}
                        onSelectEntity={(name) => { onSelectEntity(name); onNavigate(SCREENS.ENTITY_DETAIL); }}
                        onNavigateSonic={() => onNavigate(SCREENS.SONIC)}
                      />
                    ))}
                  </div>
                </div>
              );
            }) : (
              <div style={{ padding: 40, textAlign: "center", color: T.textDim, fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", fontSize: 14 }}>
                No episode data available. Run the assembler with episode data to populate this screen.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ==========================================================
//  SCREEN: EPISODE DETAIL
// ==========================================================
function EpisodeDetailScreen_({ onNavigate, onSelectEntity, library, toggleLibrary, selectedModel, onModelChange, entities, responseData, episodeId, onSelectEpisode, selectedUniverse, onUniverseChange, onNewChat, hasActiveResponse }) {
  const [loaded, setLoaded] = useState(false);
  const [videoModal, setVideoModal] = useState(null);
  const [nowPlaying, setNowPlaying] = useState(null);
  useEffect(() => { setTimeout(() => setLoaded(true), 100); }, []);

  const episodes = responseData?.episodes || [];
  const songs = responseData?.songs || [];
  const castCards = responseData?.discoveryGroups?.[1]?.cards || [];
  const actorCharMap = responseData?.actorCharacterMap || {};
  const ep = episodes.find(e => e.id === episodeId) || episodes[0];

  if (!ep) {
    return (
      <div style={{ height: "100vh", background: "transparent" }}>
        <SideNav active="episodes" onNavigate={onNavigate} libraryCount={library ? library.size : 0} hasActiveResponse={hasActiveResponse} />
        <div style={{ marginLeft: 72, display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", color: T.textMuted }}>Episode not found</div>
      </div>
    );
  }

  const epIdx = episodes.indexOf(ep);
  const prevEp = epIdx > 0 ? episodes[epIdx - 1] : null;
  const nextEp = epIdx < episodes.length - 1 ? episodes[epIdx + 1] : null;
  const themes = ep.themes || [];
  const credits = [ep.director && `Directed by ${ep.director}`, ep.writer && `Written by ${ep.writer}`].filter(Boolean);

  // Tracks for this episode
  const epTracks = songs.filter(s => s.context && s.context.includes(ep.code)).map(s => ({
    ...s,
    type: (s.artist || "").toLowerCase().includes("dave porter") ? "score" : "needle",
  }));
  const scoreCount = epTracks.filter(t => t.type === "score").length;
  const needleCount = epTracks.filter(t => t.type === "needle").length;

  // Source videos from anchor — filter to this episode where possible
  const sourceVideos = useMemo(() => {
    const anchor = entities?.["Pluribus"] || entities?.["pluribus"];
    if (!anchor?.quickViewGroups) return [];
    const vids = [];
    const epNum = ep.number;
    anchor.quickViewGroups.forEach(g => {
      (g.items || []).forEach(item => {
        if (item.video_id) {
          const title = (item.title || item.name || "").toLowerCase();
          const isEpSpecific = title.includes(`episode ${epNum}`) || title.includes(`ep ${epNum}`) || title.includes(`e${epNum}`);
          if (isEpSpecific || title.includes("season 1")) {
            vids.push({ title: item.title || item.name || "", channel: item.channel || "", videoId: item.video_id, timecodeLabel: item.timecode_label || "", timecodeUrl: item.timecode_url || "", moment: item.context || "" });
          }
        }
      });
    });
    return vids.slice(0, 6);
  }, [entities, ep]);

  // Connected influences from anchor entity
  const influences = useMemo(() => {
    const anchor = entities?.["Pluribus"] || entities?.["pluribus"];
    if (!anchor?.inspirations) return [];
    return (anchor.inspirations || []).slice(0, 4);
  }, [entities]);

  // NowPlaying integration
  const allTracks = epTracks;
  const handlePlay = (track) => setNowPlaying(track);
  const handleNext = () => {
    if (!nowPlaying) return;
    const playable = allTracks.filter(t => t.spotify_url || t.video_id);
    const idx = playable.findIndex(t => t.title === nowPlaying.title && t.artist === nowPlaying.artist);
    if (idx >= 0) setNowPlaying(playable[(idx + 1) % playable.length]);
  };
  const handlePrev = () => {
    if (!nowPlaying) return;
    const playable = allTracks.filter(t => t.spotify_url || t.video_id);
    const idx = playable.findIndex(t => t.title === nowPlaying.title && t.artist === nowPlaying.artist);
    if (idx >= 0) setNowPlaying(playable[idx === 0 ? playable.length - 1 : idx - 1]);
  };

  return (
    <div style={{ height: "100vh", background: "transparent" }}>
      <SideNav active="episodes" onNavigate={onNavigate} libraryCount={library ? library.size : 0} hasActiveResponse={hasActiveResponse} />
      <div style={{ marginLeft: 72, height: "100vh", display: "flex", flexDirection: "column" }}>
        <TopNav onNavigate={onNavigate} selectedModel={selectedModel} onModelChange={onModelChange} selectedUniverse={selectedUniverse} onUniverseChange={onUniverseChange} onNewChat={onNewChat} />
        <div style={{ flex: 1, overflowY: "auto", padding: nowPlaying ? "0 0 260px" : "0 0 120px", opacity: loaded ? 1 : 0, transition: "opacity 0.4s" }}>
          {/* Hero */}
          <div style={{ width: "100%", height: 300, position: "relative", background: ep.stillUrl ? `url(${ep.stillUrl}) center/cover` : "linear-gradient(135deg, #1a2744, #0f172a)" }}>
            <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(255,255,255,1) 0%, rgba(255,255,255,0.6) 40%, rgba(0,0,0,0.15) 100%)" }} />
            <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "0 48px 28px" }}>
              <div style={{ maxWidth: 820 }}>
                <div style={{ fontFamily: "'SF Mono', Menlo, Monaco, monospace", fontSize: 11, fontWeight: 700, color: T.blue, marginBottom: 6, letterSpacing: "0.04em" }}>EPISODE {ep.number}</div>
                <h1 style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", fontSize: 36, fontWeight: 700, color: T.text, margin: "0 0 10px", lineHeight: 1.15 }}>{ep.title}</h1>
                <div style={{ display: "flex", alignItems: "center", gap: 12, fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", fontSize: 12.5, color: T.textMuted, marginBottom: 10 }}>
                  {ep.airDate && <span>{ep.airDate}</span>}
                  {ep.runtime && <><span style={{ color: T.border }}>·</span><span>{ep.runtime} min</span></>}
                  {ep.imdbRating && <><span style={{ color: T.border }}>·</span><span>★ {ep.imdbRating} IMDB</span></>}
                  {credits.map((c, i) => <span key={i}><span style={{ color: T.border }}>·</span> {c}</span>)}
                </div>
                {themes.length > 0 && (
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {themes.map(tid => <ThemePill key={tid} themeId={tid} size="md" />)}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div style={{ padding: "28px 48px 0" }}>
            <div style={{ maxWidth: 820 }}>
              {/* Synopsis */}
              <p style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", fontSize: 15, color: T.text, lineHeight: 1.8, marginBottom: 28 }}>{ep.synopsis}</p>

              {/* What to Watch For */}
              {ep.watchFor && (
                <section style={{ marginBottom: 36 }}>
                  <div style={{ padding: "18px 20px", background: T.goldBg, border: `1px solid ${T.goldBorder}`, borderRadius: 12, borderLeft: `4px solid ${T.gold}` }}>
                    <div style={{ fontFamily: "'SF Mono', Menlo, Monaco, monospace", fontSize: 9, fontWeight: 700, color: T.gold, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>What to Watch For</div>
                    <p style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", fontSize: 14, color: T.text, lineHeight: 1.7, margin: 0 }}>{ep.watchFor}</p>
                  </div>
                </section>
              )}

              {/* Cast in This Episode */}
              {(() => {
                // Build per-episode cast from TMDB data, enriched with photos from global castCards
                const tmdbCast = [...(ep.cast || []), ...(ep.guestStars || [])];
                const photoLookup = {};
                castCards.forEach(c => { if (c.photoUrl) photoLookup[c.title] = c.photoUrl; });
                const displayCast = tmdbCast.length > 0
                  ? tmdbCast.slice(0, 12).map(c => ({ title: c.name, character: c.character, photoUrl: photoLookup[c.name] || null }))
                  : castCards.slice(0, 12).map(c => ({ title: c.title, character: actorCharMap[c.title] || "", photoUrl: c.photoUrl }));
                if (displayCast.length === 0) return null;
                return (
                  <section style={{ marginBottom: 36 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
                      <div style={{ width: 4, height: 28, borderRadius: 2, background: T.blue, flexShrink: 0 }} />
                      <h3 style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", fontSize: 18, fontWeight: 700, color: T.text, margin: 0 }}>Cast in This Episode</h3>
                      {tmdbCast.length > 12 && <span style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", fontSize: 11, color: T.textDim }}>{tmdbCast.length} total</span>}
                    </div>
                    <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                      {displayCast.map(c => (
                        <div key={c.title} onClick={() => { onSelectEntity(c.title); onNavigate(SCREENS.ENTITY_DETAIL); }} style={{
                          display: "flex", alignItems: "center", gap: 8, padding: "6px 12px 6px 6px",
                          background: T.bgCard, border: `1px solid ${T.border}`, borderRadius: 10, cursor: "pointer",
                          transition: "all 0.15s",
                        }}>
                          <div style={{ width: 32, height: 32, borderRadius: 8, flexShrink: 0, background: c.photoUrl ? `url(${c.photoUrl}) top center/cover` : "linear-gradient(135deg, #1a2744, #2a3a5a)", border: `1px solid ${T.border}` }} />
                          <div>
                            <div style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", fontSize: 12.5, fontWeight: 600, color: T.text }}>{c.title}</div>
                            {c.character && <div style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", fontSize: 10.5, color: T.blue }}>as {c.character}</div>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                );
              })()}

              {/* Music in This Episode */}
              {epTracks.length > 0 && (
                <section style={{ marginBottom: 36 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
                    <div style={{ width: 4, height: 28, borderRadius: 2, background: T.green, flexShrink: 0 }} />
                    <h3 style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", fontSize: 18, fontWeight: 700, color: T.text, margin: 0 }}>Music in This Episode</h3>
                    <span style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", fontSize: 11, color: T.textDim }}>
                      {scoreCount > 0 && `${scoreCount} score`}{scoreCount > 0 && needleCount > 0 && " · "}{needleCount > 0 && `${needleCount} needle drops`}
                    </span>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    {epTracks.map((track, i) => (
                      <TrackRow key={track.title + track.artist} track={track} index={i} isPlaying={nowPlaying?.title === track.title && nowPlaying?.artist === track.artist} onPlay={() => handlePlay(track)} library={library} toggleLibrary={toggleLibrary} />
                    ))}
                  </div>
                </section>
              )}

              {/* Connected Influences */}
              {influences.length > 0 && (
                <section style={{ marginBottom: 36 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
                    <div style={{ width: 4, height: 28, borderRadius: 2, background: "#7c3aed", flexShrink: 0 }} />
                    <h3 style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", fontSize: 18, fontWeight: 700, color: T.text, margin: 0 }}>Connected Works & Influences</h3>
                  </div>
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                    {influences.map(inf => (
                      <div key={inf.title} onClick={() => { if (inf.title) { onSelectEntity(inf.title); onNavigate(SCREENS.ENTITY_DETAIL); } }} style={{
                        padding: "10px 14px", background: T.bgCard, border: `1px solid ${T.border}`, borderRadius: 10,
                        cursor: "pointer", transition: "all 0.15s", minWidth: 180, flex: "1 1 200px", maxWidth: 280,
                      }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                          <span style={{ fontFamily: "'SF Mono', Menlo, Monaco, monospace", fontSize: 9, fontWeight: 700, color: "#7c3aed", background: "rgba(124,58,237,0.1)", padding: "2px 6px", borderRadius: 3, textTransform: "uppercase" }}>{inf.type || "INFLUENCE"}</span>
                        </div>
                        <div style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", fontSize: 13, fontWeight: 600, color: T.text }}>{inf.title}</div>
                        {inf.meta && <div style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", fontSize: 11.5, color: T.textMuted, marginTop: 2 }}>{inf.meta}</div>}
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Source Material */}
              {sourceVideos.length > 0 && (
                <section style={{ marginBottom: 36 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
                    <div style={{ width: 4, height: 28, borderRadius: 2, background: "#c0392b", flexShrink: 0 }} />
                    <h3 style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", fontSize: 18, fontWeight: 700, color: T.text, margin: 0 }}>Source Material</h3>
                    <span style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", fontSize: 9.5, fontWeight: 600, color: T.gold, background: T.goldBg, border: `1px solid ${T.goldBorder}`, padding: "2px 8px", borderRadius: 4 }}>✦ GRAPH SOURCE</span>
                  </div>
                  <div style={{ display: "flex", gap: 12, overflowX: "auto", paddingBottom: 4 }}>
                    {sourceVideos.map((v, i) => <VideoTile key={i} video={v} accentColor="#c0392b" onClick={() => setVideoModal(v)} library={library} toggleLibrary={toggleLibrary} />)}
                  </div>
                </section>
              )}

              {/* Episode navigation */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px 0", borderTop: `1px solid ${T.border}`, marginTop: 12 }}>
                {prevEp ? (
                  <div onClick={() => onSelectEpisode(prevEp.id)} style={{ cursor: "pointer" }}>
                    <div style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", fontSize: 10, color: T.textDim, textTransform: "uppercase", letterSpacing: "0.05em" }}>← Previous</div>
                    <div style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", fontSize: 14, fontWeight: 600, color: T.blue, marginTop: 2 }}>{prevEp.code} — {prevEp.title}</div>
                  </div>
                ) : <div />}
                {nextEp ? (
                  <div onClick={() => onSelectEpisode(nextEp.id)} style={{ cursor: "pointer", textAlign: "right" }}>
                    <div style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", fontSize: 10, color: T.textDim, textTransform: "uppercase", letterSpacing: "0.05em" }}>Next →</div>
                    <div style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", fontSize: 14, fontWeight: 600, color: T.blue, marginTop: 2 }}>{nextEp.code} — {nextEp.title}</div>
                  </div>
                ) : <div />}
              </div>
            </div>
          </div>
        </div>
      </div>
      {nowPlaying && (
        <NowPlayingBar
          song={nowPlaying.title} artist={nowPlaying.artist} context={nowPlaying.context} timestamp={nowPlaying.timestamp}
          spotifyUrl={nowPlaying.spotify_url} videoId={nowPlaying.video_id}
          onClose={() => setNowPlaying(null)} onNext={handleNext} onPrev={handlePrev}
          library={library} toggleLibrary={toggleLibrary}
        />
      )}
      {videoModal && <VideoModal title={videoModal.title} subtitle={videoModal.channel} videoId={videoModal.videoId} timecodeUrl={videoModal.timecodeUrl} onClose={() => setVideoModal(null)} />}
    </div>
  );
}

// ==========================================================
//  SCREEN 5: ENTITY DETAIL — Full Knowledge Graph Record
// ==========================================================
function EntityDetailScreen({ onNavigate, entityName, onSelectEntity, library, toggleLibrary, selectedModel, onModelChange, entities, selectedUniverse, onUniverseChange, onNewChat, hasActiveResponse, sortedEntityNames, entityAliases, onEntityPopover }) {
  const [loaded, setLoaded] = useState(false);
  const [videoModal, setVideoModal] = useState(null);
  const [readingModal, setReadingModal] = useState(null);
  const [liveBio, setLiveBio] = useState(null);
  const [liveBioLoading, setLiveBioLoading] = useState(false);
  const [liveBioError, setLiveBioError] = useState(null);
  const [bioCacheTimestamp, setBioCacheTimestamp] = useState(null);
  const [bioCacheEdited, setBioCacheEdited] = useState(false);
  const [editingBio, setEditingBio] = useState(false);
  const [editDraft, setEditDraft] = useState("");
  useEffect(() => { setTimeout(() => setLoaded(true), 100); }, []);

  // Fetch bio: check cache first, then broker API with KG-informed prompt
  useEffect(() => {
    if (liveBio || liveBioLoading) return;
    // Check cache first
    const cached = getBioCache(entityName);
    if (cached?.narrative) {
      setLiveBio(cached.narrative);
      setBioCacheTimestamp(cached.timestamp);
      setBioCacheEdited(!!cached.edited);
      return;
    }
    // Build KG-informed prompt and fetch
    const entityData = entities?.[entityName];
    const universe = UNIVERSE_CONTEXT.pluribus;
    const queryText = buildKGBioPrompt(entityName, entityData, null, universe);
    setLiveBioLoading(true);
    setLiveBioError(null);
    fetch(`${API_BASE}/v2/broker`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: queryText }),
    })
      .then(res => { if (!res.ok) throw new Error(`API ${res.status}`); return res.json(); })
      .then(data => {
        const narrative = data.narrative || null;
        if (narrative) {
          setBioCache(entityName, narrative);
          setBioCacheTimestamp(Date.now());
          setBioCacheEdited(false);
        }
        setLiveBio(narrative);
        setLiveBioLoading(false);
      })
      .catch(err => { setLiveBioError(err.message); setLiveBioLoading(false); });
  }, [entityName, entities]);

  // Reset bio state when entity changes
  useEffect(() => { setLiveBio(null); setLiveBioError(null); setBioCacheTimestamp(null); setBioCacheEdited(false); setEditingBio(false); }, [entityName]);

  const name = entityName || "Vince Gilligan";
  const data = entities[name];
  if (!data) return null;

  const handleCardClick = (card) => {
    const videoTypes = ["ANALYSIS", "VIDEO", "VIDEO ESSAY", "SCORE", "AMBIENT", "INFLUENCE", "PLAYLIST", "OST", "NEEDLE DROP", "FILM", "TV", "TZ", "CAREER", "EPISODE", "16 EMMYS", "INTERVIEW", "PODCAST", "PANEL", "FEATURED", "TRACK", "REVIEW"];
    const readTypes = ["NOVEL", "BOOK", "DYSTOPIA", "PROFILE", "ACADEMIC", "ESSAY", "ARTICLE", "COMMENTARY"];
    const t = (card.type || "").toUpperCase();
    if (videoTypes.includes(t) || (card.platform && card.platform.includes("Watch"))) {
      setVideoModal({ title: card.title, subtitle: card.meta, videoId: card.video_id, timecodeUrl: card.timecode_url });
    } else if (readTypes.includes(t) || card.icon === "📖" || card.icon === "📄") {
      setReadingModal(card);
    } else {
      setVideoModal({ title: card.title, subtitle: card.meta, videoId: card.video_id, timecodeUrl: card.timecode_url });
    }
  };

  const detailGroupLabels = {
    person: {
      works: { title: "Known For", desc: `The most recognized projects in ${name.split(" ").pop()}'s career.` },
      inspirations: { title: `${name.split(" ").pop()}'s Inspirations`, desc: `The films, books, and ideas ${name.split(" ").pop()} has cited as direct influences.` },
      collaborators: { title: "The Collaborator Network", desc: `The recurring creative partners across ${name.split(" ").pop()}'s career.` },
      themes: { title: "Thematic Through-Lines", desc: `The ideas ${name.split(" ").pop()} keeps returning to across decades of work.` },
      interviews: { title: "Interviews, Talks & Appearances", desc: `Conversations with and about ${name.split(" ").pop()}.` },
      articles: { title: "Articles & Analysis", desc: `Profiles, video essays, and critical analysis.` },
      sonic: { title: "The Sonic DNA", desc: `The music of ${name.split(" ").pop()}'s universes.` },
    },
    show: {
      works: { title: "Seasons & Extended Universe", desc: `Every season, spinoff, and continuation of ${name}.` },
      inspirations: { title: "Influences & Predecessors", desc: `The films, shows, and books that paved the way for ${name}.` },
      collaborators: { title: "Cast & Key Crew", desc: `The actors, writers, and producers who brought ${name} to life.` },
      themes: { title: "Thematic Through-Lines", desc: `The ideas ${name} explores across its run.` },
      interviews: { title: "Podcasts & Companion Content", desc: `Official podcasts, panels, and behind-the-scenes conversations.` },
      articles: { title: "Articles & Analysis", desc: `Reviews, essays, and critical analysis of ${name}.` },
      sonic: { title: "The Soundtrack", desc: `Original score, needle drops, and the complete musical identity of ${name}.` },
    },
    film: {
      works: { title: "Versions & Adaptations", desc: `Every version, remake, and adaptation of ${name}.` },
      inspirations: { title: "Influences & Predecessors", desc: `The films, books, and cultural forces that shaped ${name}.` },
      collaborators: { title: "Cast & Creators", desc: `The filmmakers and actors who brought ${name} to life.` },
      themes: { title: "Thematic Through-Lines", desc: `The ideas ${name} explores and the works it influenced.` },
      interviews: { title: "Commentary & Conversations", desc: `Director commentaries, podcasts, and behind-the-scenes material.` },
      articles: { title: "Articles & Analysis", desc: `Essays, video essays, and critical analysis of ${name}.` },
      sonic: { title: "The Score", desc: `The musical identity of ${name} and its remakes.` },
    },
    character: {
      works: { title: "Character Arc", desc: `The key episodes and moments that define ${name}'s journey.` },
      inspirations: { title: "Character DNA", desc: `The fictional predecessors and influences that shaped ${name}.` },
      collaborators: { title: "Relationships", desc: `The people in ${name}'s world — and what happened to them.` },
      themes: { title: "Thematic Through-Lines", desc: `The ideas ${name}'s story explores across the series.` },
      interviews: { title: "Behind the Character", desc: `How the creators and actors built ${name}.` },
      articles: { title: "Articles & Analysis", desc: `Essays, video essays, and critical analysis of ${name}.` },
      sonic: { title: "The Sonic Identity", desc: `The music that defines ${name}'s presence on screen.` },
    },
  };

  const labels = detailGroupLabels[data.type] || detailGroupLabels.person;

  return (
    <div style={{ height: "100vh", background: "transparent" }}>
      <SideNav active="cast" onNavigate={onNavigate}  libraryCount={library ? library.size : 0} hasActiveResponse={hasActiveResponse} />
      <div style={{ marginLeft: 72, height: "100vh", display: "flex", flexDirection: "column" }}>
        <TopNav onNavigate={onNavigate} selectedModel={selectedModel} onModelChange={onModelChange} selectedUniverse={selectedUniverse} onUniverseChange={onUniverseChange} onNewChat={onNewChat} />

        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "36px 48px 120px",
            opacity: loaded ? 1 : 0,
            transition: "opacity 0.5s",
          }}
        >
          {/* ===== Hero Header ===== */}
          <div style={{ display: "flex", gap: 32, marginBottom: 36 }}>
            <div
              style={{
                width: 140,
                height: 140,
                borderRadius: 16,
                background: (data.photoUrl || data.posterUrl)
                  ? `url(${data.photoUrl || data.posterUrl}) top center/cover no-repeat`
                  : data.avatarGradient,
                border: `1px solid ${T.border}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 56,
                flexShrink: 0,
                boxShadow: T.shadow,
              }}
            >
              {!(data.photoUrl || data.posterUrl) && data.emoji}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 6 }}>
                <h1 style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", fontSize: 36, fontWeight: 700, color: T.text, margin: 0 }}>
                  {name}
                </h1>
                <span
                  style={{
                    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
                    fontSize: 10,
                    fontWeight: 700,
                    color: T.green,
                    background: T.greenBg,
                    padding: "4px 10px",
                    borderRadius: 10,
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                    border: `1px solid ${T.greenBorder}`,
                  }}
                >
                  {data.badge}
                </span>
              </div>
              <p style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", fontSize: 15, color: T.textMuted, margin: "0 0 14px" }}>
                {data.subtitle}
              </p>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {data.tags.map((tag) => (
                  <span
                    key={tag}
                    style={{
                      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
                      fontSize: 12,
                      color: T.textMuted,
                      background: T.bgElevated,
                      padding: "5px 12px",
                      borderRadius: 8,
                      border: `1px solid ${T.border}`,
                      fontWeight: 500,
                    }}
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* ===== Biography — KG-generated bio primary, entity.bio fallback ===== */}
          <section style={{ marginBottom: 40, maxWidth: 760 }}>
            <div style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", fontSize: 15, lineHeight: 1.8, color: T.textMuted }}>
              {liveBioLoading ? (
                <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "20px 0" }}>
                  <div style={{
                    width: 16, height: 16, borderRadius: "50%",
                    border: `2px solid ${T.border}`, borderTopColor: T.blue,
                    animation: "spin 0.8s linear infinite",
                  }} />
                  <span style={{ fontSize: 14, color: T.textDim }}>Generating biography from knowledge graph...</span>
                  <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                </div>
              ) : editingBio ? (
                <div>
                  <textarea
                    value={editDraft}
                    onChange={e => setEditDraft(e.target.value)}
                    style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", fontSize: 15, color: T.text, lineHeight: 1.8, width: "100%", minHeight: 180, padding: 14, borderRadius: 8, border: `1px solid ${T.border}`, background: T.bgCard, resize: "vertical", outline: "none" }}
                  />
                  <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                    <button onClick={() => { setBioCache(name, editDraft, true); setLiveBio(editDraft); setBioCacheTimestamp(Date.now()); setBioCacheEdited(true); setEditingBio(false); }} style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", fontSize: 12, fontWeight: 600, color: "#fff", background: T.blue, border: "none", borderRadius: 6, padding: "6px 16px", cursor: "pointer" }}>Save</button>
                    <button onClick={() => setEditingBio(false)} style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", fontSize: 12, fontWeight: 600, color: T.textMuted, background: "transparent", border: `1px solid ${T.border}`, borderRadius: 6, padding: "6px 16px", cursor: "pointer" }}>Cancel</button>
                  </div>
                </div>
              ) : liveBioError && !liveBio ? (
                data.bio?.length > 0 ? (
                  data.bio.map((para, i) => (
                    <p key={i} style={{ margin: i < data.bio.length - 1 ? "0 0 14px" : "0" }}>
                      {linkEntities(para, entities, sortedEntityNames, onEntityPopover, `ed-ebio-${i}-`, entityAliases)}
                    </p>
                  ))
                ) : (
                  <div style={{ color: T.textDim, fontStyle: "italic" }}>Biography not available.</div>
                )
              ) : liveBio ? (
                liveBio.split(/\n\n+/).filter(p => p.trim()).map((para, i) => (
                  <p key={i} style={{ margin: "0 0 14px" }}>
                    {linkEntities(para, entities, sortedEntityNames, onEntityPopover, `ed-bio-${i}-`, entityAliases)}
                  </p>
                ))
              ) : data.bio?.length > 0 ? (
                data.bio.map((para, i) => (
                  <p key={i} style={{ margin: i < data.bio.length - 1 ? "0 0 14px" : "0" }}>
                    {linkEntities(para, entities, sortedEntityNames, onEntityPopover, `ed-fbio-${i}-`, entityAliases)}
                  </p>
                ))
              ) : (
                <div style={{ color: T.textDim, fontStyle: "italic" }}>Biography not available.</div>
              )}
            </div>
            {/* Bio toolbar */}
            {(liveBio || bioCacheTimestamp) && !editingBio && !liveBioLoading && (
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 10 }}>
                <span onClick={() => { clearBioCache(name); setLiveBio(null); setBioCacheTimestamp(null); setBioCacheEdited(false); }} style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", fontSize: 11, color: T.blue, cursor: "pointer", fontWeight: 600 }}>Regenerate</span>
                <span onClick={() => { setEditDraft(liveBio || ""); setEditingBio(true); }} style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", fontSize: 11, color: T.blue, cursor: "pointer", fontWeight: 600 }}>Edit</span>
                {bioCacheTimestamp && (
                  <span style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", fontSize: 11, color: T.textDim }}>· {bioCacheEdited ? "Edited" : "Generated"} {new Date(bioCacheTimestamp).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
                )}
              </div>
            )}
          </section>

          {/* ===== Sparse entity notice ===== */}
          {(() => {
            const sectionCount = [data.completeWorks, data.inspirations, data.collaborators, data.themes, data.interviews, data.articles, data.sonic].filter(s => s?.length > 0).length;
            if (sectionCount === 0 && (!data.bio || data.bio.length === 0)) return (
              <div style={{ padding: "24px 28px", background: T.bgElevated, border: `1px solid ${T.border}`, borderRadius: 12, marginBottom: 36, maxWidth: 760 }}>
                <p style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", fontSize: 14, color: T.textMuted, margin: 0 }}>
                  Limited data available for {name}. More content will be added as the knowledge graph expands.
                </p>
              </div>
            );
            return null;
          })()}

          {/* ===== Complete Works / Seasons ===== */}
          {data.completeWorks?.length > 0 && (
            <DiscoveryGroup accentColor={T.blue} title={labels.works.title} description={labels.works.desc}>
              {data.completeWorks.map((w) => (
                <DiscoveryCard key={w.title} {...w} library={library} toggleLibrary={toggleLibrary} onCardClick={handleCardClick} />
              ))}
            </DiscoveryGroup>
          )}

          {/* ===== Inspirations ===== */}
          {data.inspirations?.length > 0 && (
            <DiscoveryGroup accentColor="#c0392b" title={labels.inspirations.title} description={labels.inspirations.desc}>
              {data.inspirations.map((w) => (
                <DiscoveryCard key={w.title} {...w} library={library} toggleLibrary={toggleLibrary} onCardClick={handleCardClick} />
              ))}
            </DiscoveryGroup>
          )}

          {/* ===== Collaborators ===== */}
          {data.collaborators?.length > 0 && (
            <div style={{ marginBottom: 36 }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 14, marginBottom: 18 }}>
                <div style={{ width: 4, minHeight: 44, borderRadius: 2, background: "#7c3aed", flexShrink: 0, marginTop: 2 }} />
                <div>
                  <h3 style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", fontSize: 18, fontWeight: 700, color: T.text, margin: 0 }}>
                    {labels.collaborators.title}
                  </h3>
                  <p style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", fontSize: 14, color: T.textMuted, margin: "4px 0 0" }}>
                    {labels.collaborators.desc}
                  </p>
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10, paddingLeft: 18 }}>
                {data.collaborators.map((c) => (
                  <CollaboratorRow key={c.name} {...c} />
                ))}
              </div>
            </div>
          )}

          {/* ===== Themes ===== */}
          {data.themes?.filter(t => t.videos?.length > 0).length > 0 && (
            <div style={{ marginBottom: 36 }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 14, marginBottom: 18 }}>
                <div style={{ width: 4, minHeight: 44, borderRadius: 2, background: T.gold, flexShrink: 0, marginTop: 2 }} />
                <div>
                  <h3 style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", fontSize: 18, fontWeight: 700, color: T.text, margin: 0 }}>
                    {labels.themes.title}
                  </h3>
                  <p style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", fontSize: 14, color: T.textMuted, margin: "4px 0 0" }}>
                    {labels.themes.desc}
                  </p>
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 20, paddingLeft: 18 }}>
                {data.themes.filter(t => t.videos?.length > 0).map((t) => (
                  <div key={t.title}>
                    <div style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", fontSize: 15, fontWeight: 700, color: T.text, marginBottom: 4 }}>{t.title}</div>
                    <p style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", fontSize: 13, color: T.textMuted, lineHeight: 1.6, margin: "0 0 10px" }}>{t.description}</p>
                    <div style={{ display: "flex", gap: 12, overflowX: "auto", paddingBottom: 4 }}>
                      {t.videos.map((v, i) => (
                        <VideoTile key={i} video={v} accentColor={T.gold} onClick={() => setVideoModal(v)} library={library} toggleLibrary={toggleLibrary} />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ===== Interviews ===== */}
          {data.interviews?.length > 0 && (
            <DiscoveryGroup accentColor="#2563eb" title={labels.interviews.title} description={labels.interviews.desc}>
              {data.interviews.map((w) => (
                <DiscoveryCard key={w.title} {...w} library={library} toggleLibrary={toggleLibrary} onCardClick={handleCardClick} />
              ))}
            </DiscoveryGroup>
          )}

          {/* ===== Articles ===== */}
          {data.articles?.length > 0 && (
            <DiscoveryGroup accentColor="#16803c" title={labels.articles.title} description={labels.articles.desc}>
              {data.articles.map((w) => (
                <DiscoveryCard key={w.title} {...w} library={library} toggleLibrary={toggleLibrary} onCardClick={handleCardClick} />
              ))}
            </DiscoveryGroup>
          )}

          {/* ===== Sonic ===== */}
          {data.sonic?.length > 0 && (
            <DiscoveryGroup accentColor="#7c3aed" title={labels.sonic.title} description={labels.sonic.desc}>
              {data.sonic.map((w) => (
                <DiscoveryCard key={w.title} {...w} library={library} toggleLibrary={toggleLibrary} onCardClick={handleCardClick} />
              ))}
            </DiscoveryGroup>
          )}

          {/* ===== Mini Constellation ===== */}
          {data.graphNodes?.length > 0 && (
          <div style={{ marginBottom: 36 }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 14, marginBottom: 18 }}>
              <div style={{ width: 4, minHeight: 44, borderRadius: 2, background: T.text, flexShrink: 0, marginTop: 2 }} />
              <div>
                <h3 style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", fontSize: 18, fontWeight: 700, color: T.text, margin: 0 }}>
                  In the Knowledge Graph
                </h3>
                <p style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", fontSize: 14, color: T.textMuted, margin: "4px 0 0" }}>
                  {name}'s position in the UnitedTribes knowledge graph — {" "}
                  <span
                    style={{ color: T.blue, cursor: "pointer", fontWeight: 600 }}
                    onClick={() => onNavigate(SCREENS.CONSTELLATION)}
                  >
                    Open full constellation →
                  </span>
                </p>
              </div>
            </div>
            <div
              style={{
                marginLeft: 18,
                height: 280,
                background: T.bgCard,
                border: `1px solid ${T.border}`,
                borderRadius: 14,
                position: "relative",
                overflow: "hidden",
                boxShadow: T.shadow,
              }}
            >
              <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}>
                {(data.graphEdges || []).map(([x1, y1, x2, y2], i) => {
                  const sx = (x1 - 120) / 600 * 55 + 10;
                  const sy = (y1 + 40) / 280 * 100;
                  const ex = (x2 - 120) / 600 * 55 + 10;
                  const ey = (y2 + 40) / 280 * 100;
                  return (
                    <line key={i} x1={`${sx}%`} y1={`${sy}%`} x2={`${ex}%`} y2={`${ey}%`} stroke={T.border} strokeWidth={1.2} opacity={0.45} />
                  );
                })}
              </svg>
              {data.graphNodes.map((node) => {
                const cx = (node.x - 120) / 600 * 55 + 10;
                const cy = (node.y + 40) / 280 * 100;
                const displayR = node.bold ? 30 : 22;
                return (
                  <div
                    key={node.label}
                    style={{
                      position: "absolute",
                      left: `${cx}%`,
                      top: `${cy}%`,
                      transform: "translate(-50%, -50%)",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      cursor: "pointer",
                    }}
                  >
                    <div
                      style={{
                        width: displayR * 2,
                        height: displayR * 2,
                        borderRadius: "50%",
                        background: node.color + "30",
                        border: `2px solid ${node.color}55`,
                        boxShadow: `0 0 12px ${node.color}18`,
                      }}
                    />
                    <div
                      style={{
                        marginTop: 6,
                        whiteSpace: "nowrap",
                        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
                        fontSize: node.bold ? 12 : 10.5,
                        color: node.bold ? T.text : T.textMuted,
                        fontWeight: node.bold ? 700 : 500,
                        letterSpacing: "-0.01em",
                      }}
                    >
                      {node.label}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          )}

          {/* ===== Source Footer ===== */}
          <div
            style={{
              padding: "16px 22px",
              background: T.bgCard,
              border: `1px solid ${T.border}`,
              borderRadius: 10,
              fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
              fontSize: 12,
              color: T.textDim,
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginBottom: 50,
              boxShadow: T.shadow,
              fontWeight: 500,
            }}
          >
            <span style={{ color: T.green }}>●</span>
            Data sourced from authorized content partnerships with Universal Music Group & Harper Collins · UnitedTribes Knowledge Graph v2.1
          </div>
        </div>
      </div>

      {/* Video Modal */}
      {videoModal && (
        <VideoModal
          title={videoModal.title}
          subtitle={videoModal.subtitle}
          videoId={videoModal.videoId}
          timecodeUrl={videoModal.timecodeUrl}
          onClose={() => setVideoModal(null)}
        />
      )}

      {/* Reading Modal */}
      {readingModal && (
        <ReadingModal
          {...readingModal}
          onClose={() => setReadingModal(null)}
        />
      )}
    </div>
  );
}

// ==========================================================
//  MAIN APP
// ==========================================================
// ==========================================================
//  SCREEN 6: LIBRARY
// ==========================================================
function LibraryScreen({ onNavigate, library, toggleLibrary, selectedModel, onModelChange, entities, responseData, selectedUniverse, onUniverseChange, onNewChat, hasActiveResponse }) {
  // Build a comprehensive lookup of all saveable items from every data source
  const allItemsByKey = useMemo(() => {
    const map = {};
    const add = (key, item) => { if (!map[key]) map[key] = item; };

    // 1. Songs — saved as "Title — Artist"
    (responseData?.songs || []).forEach(s => {
      add(`${s.title} — ${s.artist}`, {
        title: s.title, meta: s.artist, context: s.context,
        icon: "🎵", category: "Music", source: "Sonic Layer",
        spotifyUrl: s.spotify_url, videoId: s.video_id,
      });
    });

    // 2. Discovery group cards — saved by title
    (responseData?.discoveryGroups || []).forEach(group => {
      (group.cards || []).forEach(card => {
        const cat = (card.type === "SCORE" || card.type === "OST" || card.type === "AMBIENT") ? "Music"
          : (card.type === "NOVEL" || card.type === "BOOK" || card.type === "DYSTOPIA") ? "Books"
          : (card.type === "INTERVIEW" || card.type === "PODCAST" || card.type === "PANEL") ? "Interviews & Podcasts"
          : (card.type === "ARTICLE" || card.type === "ESSAY" || card.type === "ACADEMIC" || card.type === "ANALYSIS" || card.type === "VIDEO ESSAY" || card.type === "REVIEW") ? "Articles & Analysis"
          : "TV & Film";
        add(card.title, { ...card, category: cat, source: "Discovery" });
      });
    });

    // 3. Entity detail sections
    Object.entries(entities || {}).forEach(([entityName, data]) => {
      const sectionCats = {
        completeWorks: "TV & Film", inspirations: "TV & Film",
        interviews: "Interviews & Podcasts", articles: "Articles & Analysis", sonic: "Music",
      };
      Object.entries(sectionCats).forEach(([section, cat]) => {
        (data[section] || []).forEach(item => {
          add(item.title, { ...item, category: cat, source: entityName });
        });
      });
    });

    // 4. Theme videos — saved by video title
    if (responseData?.themeVideos) {
      Object.values(responseData.themeVideos).forEach(tv => {
        (tv.videos || []).forEach(v => {
          add(v.title, {
            title: v.title, meta: v.channel || "", context: v.moment || "",
            icon: "🎬", category: "TV & Film", source: "Themes", videoId: v.videoId,
          });
        });
      });
    }

    return map;
  }, [entities, responseData]);

  // Match saved library keys to known items, or create minimal entries for unknown keys
  const savedItems = useMemo(() => {
    return [...library].map(key => {
      if (allItemsByKey[key]) return { ...allItemsByKey[key], _saveKey: key };
      // Unknown key — infer from format
      const isSong = key.includes(" — ");
      if (isSong) {
        const [title, artist] = key.split(" — ");
        return { title, meta: artist, icon: "🎵", category: "Music", source: "Saved", _saveKey: key };
      }
      return { title: key, meta: "", icon: "📌", category: "Other", source: "Saved", _saveKey: key };
    });
  }, [library, allItemsByKey]);

  // Group by category
  const groups = useMemo(() => {
    const order = ["TV & Film", "Music", "Books", "Articles & Analysis", "Interviews & Podcasts", "Other"];
    const grouped = {};
    savedItems.forEach(item => {
      const cat = item.category || "Other";
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push(item);
    });
    return order.filter(cat => grouped[cat]?.length > 0).map(cat => [cat, grouped[cat]]);
  }, [savedItems]);

  const groupIcons = { "TV & Film": "🎬", "Music": "🎵", "Books": "📖", "Articles & Analysis": "📄", "Interviews & Podcasts": "🎙", "Other": "📌" };

  const [videoModal, setVideoModal] = useState(null);
  const [nowPlaying, setNowPlaying] = useState(null);

  const handleItemClick = (item) => {
    // Video content — open video modal
    if (item.videoId || item.video_id) {
      setVideoModal({ title: item.title, subtitle: item.meta || item.artist || "", videoId: item.videoId || item.video_id });
      return;
    }
    // Music with Spotify — open in NowPlayingBar
    if (item.spotifyUrl || item.spotify_url) {
      setNowPlaying({ title: item.title, artist: item.meta || "", spotifyUrl: item.spotifyUrl || item.spotify_url, videoId: item.videoId || item.video_id || null, context: item.context || "" });
      return;
    }
  };

  return (
    <div style={{ height: "100vh", background: "transparent" }}>
      <SideNav active="library" onNavigate={onNavigate} libraryCount={library.size} hasActiveResponse={hasActiveResponse} />
      <div style={{ marginLeft: 72, height: "100vh", display: "flex", flexDirection: "column" }}>
        <TopNav onNavigate={onNavigate} selectedModel={selectedModel} onModelChange={onModelChange} selectedUniverse={selectedUniverse} onUniverseChange={onUniverseChange} onNewChat={onNewChat} />

        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "40px 48px 120px",
          }}
        >
          {/* Page header */}
          <div style={{ maxWidth: 800, marginBottom: 36 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
              <span style={{ fontSize: 28 }}>📚</span>
              <h1
                style={{
                  fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
                  fontSize: 28,
                  fontWeight: 700,
                  color: T.text,
                  margin: 0,
                }}
              >
                My Library
              </h1>
              {library.size > 0 && (
                <span
                  style={{
                    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
                    fontSize: 13,
                    fontWeight: 600,
                    color: T.blue,
                    background: T.blueLight,
                    padding: "3px 10px",
                    borderRadius: 6,
                  }}
                >
                  {library.size} {library.size === 1 ? "item" : "items"}
                </span>
              )}
            </div>
            <p
              style={{
                fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
                fontSize: 15,
                color: T.textMuted,
                lineHeight: 1.6,
              }}
            >
              Content you've saved while exploring. Everything here links back to its source in the knowledge graph.
            </p>
          </div>

          {/* Empty state */}
          {library.size === 0 && (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                padding: "80px 40px",
                maxWidth: 480,
                margin: "0 auto",
                textAlign: "center",
              }}
            >
              <div style={{ fontSize: 48, marginBottom: 20, opacity: 0.4 }}>📚</div>
              <h3
                style={{
                  fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
                  fontSize: 20,
                  fontWeight: 600,
                  color: T.text,
                  marginBottom: 10,
                }}
              >
                Your library is empty
              </h3>
              <p
                style={{
                  fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
                  fontSize: 14,
                  color: T.textMuted,
                  lineHeight: 1.6,
                  marginBottom: 24,
                }}
              >
                Tap the + button on any film, book, album, or article to save it here. Your library builds as you explore — a personal map of everything that caught your attention.
              </p>
              <button
                onClick={() => onNavigate(SCREENS.RESPONSE)}
                style={{
                  fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
                  fontSize: 14,
                  fontWeight: 600,
                  color: "#fff",
                  background: T.blue,
                  border: "none",
                  padding: "10px 24px",
                  borderRadius: 10,
                  cursor: "pointer",
                }}
              >
                Start Exploring
              </button>
            </div>
          )}

          {/* Grouped saved items */}
          {groups.map(([groupLabel, items]) => (
            <div key={groupLabel} style={{ marginBottom: 36, maxWidth: 800 }}>
              <div
                style={{
                  fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
                  fontSize: 11,
                  fontWeight: 700,
                  color: T.textDim,
                  textTransform: "uppercase",
                  letterSpacing: "0.07em",
                  marginBottom: 12,
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <span style={{ fontSize: 14 }}>{groupIcons[groupLabel] || "📌"}</span>
                <span>{groupLabel}</span>
                <span style={{ fontWeight: 500, color: T.blue }}>{items.length}</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {items.map((item) => {
                  const hasPlayable = item.videoId || item.video_id || item.spotifyUrl || item.spotify_url;
                  return (
                  <div
                    key={item._saveKey}
                    onClick={() => hasPlayable && handleItemClick(item)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      padding: "12px 16px",
                      background: T.bgCard,
                      border: `1px solid ${T.border}`,
                      borderLeft: `3px solid ${T.blue}`,
                      borderRadius: 10,
                      transition: "all 0.15s",
                      cursor: hasPlayable ? "pointer" : "default",
                    }}
                  >
                    {hasPlayable ? (
                      <div style={{ width: 32, height: 32, borderRadius: 8, marginRight: 12, flexShrink: 0, background: (item.videoId || item.video_id) ? "linear-gradient(135deg, #dc2626, #ef4444)" : "linear-gradient(135deg, #1db954, #22c55e)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, color: "#fff" }}>▶</div>
                    ) : (
                      <span style={{ fontSize: 20, marginRight: 14, flexShrink: 0 }}>{item.icon || groupIcons[groupLabel] || "📌"}</span>
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
                          fontSize: 14,
                          fontWeight: 600,
                          color: T.text,
                          marginBottom: 2,
                        }}
                      >
                        {item.title}
                      </div>
                      {item.meta && (
                        <div style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", fontSize: 12, color: T.textDim }}>
                          {item.meta}
                        </div>
                      )}
                      {item.context && (
                        <div
                          style={{
                            fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
                            fontSize: 11.5,
                            fontStyle: "italic",
                            color: T.textMuted,
                            marginTop: 3,
                          }}
                        >
                          {item.context}
                        </div>
                      )}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0, marginLeft: 12 }}>
                      {item.platform && (
                        <span
                          style={{
                            fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
                            fontSize: 10,
                            fontWeight: 700,
                            color: "#fff",
                            background: item.platformColor || T.blue,
                            padding: "3px 9px",
                            borderRadius: 4,
                          }}
                        >
                          {item.platform}
                        </span>
                      )}
                      {item.source && (
                        <span
                          style={{
                            fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
                            fontSize: 10,
                            fontWeight: 600,
                            color: T.textDim,
                            background: T.bgElevated,
                            padding: "3px 8px",
                            borderRadius: 4,
                            border: `1px solid ${T.border}`,
                          }}
                        >
                          via {item.source}
                        </span>
                      )}
                      <div
                        onClick={(e) => { e.stopPropagation(); toggleLibrary(item._saveKey); }}
                        style={{
                          width: 26,
                          height: 26,
                          borderRadius: 6,
                          background: "transparent",
                          border: `1px solid ${T.border}`,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          cursor: "pointer",
                          transition: "all 0.15s",
                          fontSize: 13,
                          color: T.textDim,
                        }}
                        title="Remove from library"
                      >
                        ✕
                      </div>
                    </div>
                  </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Video Modal */}
      {videoModal && (
        <VideoModal
          title={videoModal.title}
          subtitle={videoModal.subtitle}
          videoId={videoModal.videoId}
          onClose={() => setVideoModal(null)}
        />
      )}

      {/* Now Playing Bar for audio */}
      {nowPlaying && (
        <NowPlayingBar
          song={nowPlaying.title}
          artist={nowPlaying.artist}
          context={nowPlaying.context}
          spotifyUrl={nowPlaying.spotifyUrl}
          videoId={nowPlaying.videoId}
          onClose={() => setNowPlaying(null)}
          library={library}
          toggleLibrary={toggleLibrary}
        />
      )}
    </div>
  );
}

export default function App() {
  // Restore session state if returning via forward button or reload
  // Only restore screens that make sense without deep context (skip entity_detail, episode_detail)
  const _saved = (() => { try { return JSON.parse(sessionStorage.getItem("ut_session")); } catch { return null; } })();
  const _safeScreens = new Set([SCREENS.HOME, SCREENS.THEMES, SCREENS.SONIC, SCREENS.CAST_CREW, SCREENS.EPISODES, SCREENS.LIBRARY]);
  const [screen, setScreen] = useState(_safeScreens.has(_saved?.screen) ? _saved.screen : SCREENS.HOME);
  const [selectedEntity, setSelectedEntity] = useState(_saved?.selectedEntity || "Vince Gilligan");
  const [spoilerFree, setSpoilerFree] = useState(_saved?.spoilerFree || false);
  const [library, setLibrary] = useState(() => {
    try {
      const saved = localStorage.getItem("ut_library");
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch { return new Set(); }
  });

  // Lifted state for live API integration
  const [query, setQuery] = useState("");
  const [selectedModel, setSelectedModel] = useState(() => {
    const saved = localStorage.getItem("ut_selected_model");
    return saved ? MODELS.find(m => m.name === saved) || DEFAULT_MODEL : DEFAULT_MODEL;
  });
  const [brokerResponse, setBrokerResponse] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedUniverse, setSelectedUniverse] = useState("pluribus");
  const [followUpResponses, setFollowUpResponses] = useState([]);
  const [dockQuery, setDockQuery] = useState("");

  // Inline thinking + model-switch threading state
  const [responseThread, setResponseThread] = useState([]);
  const [inlineThinking, setInlineThinking] = useState(false);
  const [inlineStep, setInlineStep] = useState(0);
  const [followUpThinkingStep, setFollowUpThinkingStep] = useState(0);
  const inlineAbortRef = useRef(null);

  // Dynamic universe data loading
  const [entities, setEntities] = useState({});
  const [responseData, setResponseData] = useState(null);
  const [universeLoading, setUniverseLoading] = useState(true);
  const [selectedEpisode, setSelectedEpisode] = useState(null);
  const [drawerWidth, setDrawerWidth] = useState(0);

  // --- Entity Popover state ---
  const [popoverEntity, setPopoverEntity] = useState(null);
  const [popoverAnchorRect, setPopoverAnchorRect] = useState(null);

  // Sorted entity names (longest-first) for linkEntities matching
  // Also builds aliases: short display names → full entity keys
  // e.g. "The Monsters Are Due on Maple Street" → "The Twilight Zone: The Monsters Are Due on Maple Street (S1E22)"
  const { sortedEntityNames, entityAliases } = useMemo(() => {
    const aliases = {};
    const names = [];
    for (const key of Object.keys(entities)) {
      if (key === "pluribus") continue;
      names.push(key);
      // Extract short name from "Series: Episode Title (S1E2)" pattern
      const colonMatch = key.match(/^[^:]+:\s*(.+?)(?:\s*\(S\d+E\d+\))?$/);
      if (colonMatch) {
        const shortName = colonMatch[1].trim();
        if (shortName.length >= 4 && shortName !== key) {
          aliases[shortName] = key;
          names.push(shortName);
        }
      }
      // Extract short name from "Title (Year)" pattern — e.g. "Invasion of the Body Snatchers (1956)"
      const yearMatch = key.match(/^(.+?)\s*\(\d{4}\)$/);
      if (yearMatch) {
        const shortName = yearMatch[1].trim();
        // Only add alias if the short name isn't already a direct entity key
        if (shortName.length >= 4 && !entities[shortName]) {
          aliases[shortName] = key;
          names.push(shortName);
        }
      }
    }
    // Deduplicate and sort longest-first
    const unique = [...new Set(names)].sort((a, b) => b.length - a.length);
    return { sortedEntityNames: unique, entityAliases: aliases };
  }, [entities]);

  const openPopover = (entityKey, event) => {
    // Get bounding rect from the clicked element (store as plain object, not live DOMRect)
    const domRect = event?.currentTarget?.getBoundingClientRect?.() || event?.target?.getBoundingClientRect?.();
    if (!domRect) return;
    const rect = { top: domRect.top, left: domRect.left, bottom: domRect.bottom, right: domRect.right, width: domRect.width, height: domRect.height };
    setPopoverEntity(entityKey);
    setPopoverAnchorRect(rect);
  };

  const closePopover = () => {
    setPopoverEntity(null);
    setPopoverAnchorRect(null);
  };

  // Persist navigation state so forward button / reload restores session
  useEffect(() => {
    try {
      sessionStorage.setItem("ut_session", JSON.stringify({
        screen, selectedEntity, spoilerFree, selectedUniverse, query,
      }));
    } catch {}
  }, [screen, selectedEntity, spoilerFree, selectedUniverse, query]);

  useEffect(() => {
    let cancelled = false;
    setUniverseLoading(true);

    const loaders = {
      pluribus: () => Promise.all([
        import("./data/pluribus-universe.json").then(m => m.default),
        import("./data/pluribus-response.json").then(m => m.default),
      ]),
    };

    const loader = loaders[selectedUniverse];
    if (!loader) {
      setEntities({});
      setResponseData(null);
      setUniverseLoading(false);
      return;
    }

    loader().then(([ent, resp]) => {
      if (!cancelled) {
        setEntities(ent);
        setResponseData(resp);
        setUniverseLoading(false);
      }
    });

    return () => { cancelled = true; };
  }, [selectedUniverse]);

  // --- Inline thinking: fire API call without navigating to ThinkingScreen ---
  const fireInlineQuery = async (queryText, model) => {
    if (inlineAbortRef.current) inlineAbortRef.current.abort();
    const controller = new AbortController();
    inlineAbortRef.current = controller;

    try {
      const universeId = selectedUniverse || "pluribus";
      const universe = UNIVERSE_CONTEXT[universeId] || UNIVERSE_CONTEXT.pluribus;
      const framedQuery = `You are answering questions about the ${universe.name} universe. ${universe.description}. Scope: ${universe.scope}.\n\nUser question: "${queryText}"`;

      const res = await fetch(`${API_BASE}${model.endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: framedQuery }),
        signal: controller.signal,
      });
      if (!res.ok) throw new Error(`API error: ${res.status}`);
      const data = await res.json();

      setBrokerResponse(data);
      setInlineThinking(false);
      setInlineStep(0);
    } catch (err) {
      if (err.name !== "AbortError") {
        console.error("[fireInlineQuery] Error:", err.message);
        setInlineThinking(false);
      }
    }
  };

  // --- Inline thinking step animation ---
  useEffect(() => {
    if (!inlineThinking) return;
    const interval = setInterval(() => {
      setInlineStep(prev => {
        if (prev < 3) return prev + 1;
        if (prev === 3 && brokerResponse) return prev + 1;
        if (prev > 3 && prev < 5) return prev + 1;
        return prev;
      });
    }, 900);
    return () => clearInterval(interval);
  }, [inlineThinking, brokerResponse]);

  useEffect(() => {
    if (inlineStep >= 5 && brokerResponse) {
      setInlineThinking(false);
      setInlineStep(0);
    }
  }, [inlineStep, brokerResponse]);

  const toggleLibrary = (title) => {
    setLibrary((prev) => {
      const next = new Set(prev);
      if (next.has(title)) next.delete(title);
      else next.add(title);
      try { localStorage.setItem("ut_library", JSON.stringify([...next])); } catch {}
      return next;
    });
  };

  const handleSelectEntity = (name) => {
    setSelectedEntity(name);
  };

  const handleQuerySubmit = (queryText, universe) => {
    console.log("[handleQuerySubmit] queryText:", queryText, "universe:", universe);
    setQuery(queryText);
    setSelectedUniverse(universe || "pluribus");
    setBrokerResponse(null);
    setFollowUpResponses([]);
    setResponseThread([]);

    if (screen === SCREENS.HOME) {
      // From homepage — full ThinkingScreen
      setScreen(SCREENS.THINKING);
    } else {
      // From universe (New Chat) or any in-session screen — inline thinking
      setInlineThinking(true);
      setInlineStep(0);
      setScreen(SCREENS.RESPONSE);
      fireInlineQuery(queryText, selectedModel);
    }
  };

  // When model changes on ResponseScreen, re-fire query through new model (threaded)
  const handleModelChange = (newModel) => {
    const wasOnResponse = screen === SCREENS.RESPONSE;
    const oldModel = selectedModel;
    setSelectedModel(newModel);
    localStorage.setItem("ut_selected_model", newModel.name);

    if (wasOnResponse && query && brokerResponse) {
      // Check if we already have a response from this model in the thread
      const existingIdx = responseThread.findIndex(
        entry => entry.model.endpoint === newModel.endpoint
      );

      if (existingIdx !== -1) {
        // Swap: pull existing response out of thread, push current into thread
        const existing = responseThread[existingIdx];
        setResponseThread(prev => {
          const updated = [...prev];
          // Replace the existing entry with the current active response
          updated[existingIdx] = {
            query,
            response: brokerResponse,
            model: oldModel,
            followUps: [...followUpResponses],
          };
          return updated;
        });
        // Restore the existing response as active
        setBrokerResponse(existing.response);
        setFollowUpResponses(existing.followUps || []);
      } else {
        // New model — push current to thread and fetch
        setResponseThread(prev => [...prev, {
          query,
          response: brokerResponse,
          model: oldModel,
          followUps: [...followUpResponses],
        }]);
        setBrokerResponse(null);
        setFollowUpResponses([]);
        setInlineThinking(true);
        setInlineStep(0);
        fireInlineQuery(query, newModel);
      }
    }
  };

  // Switch universe via TopNav dropdown → go to in-universe new chat view
  const handleUniverseChange = (universeId) => {
    setSelectedUniverse(universeId);
    setScreen(SCREENS.UNIVERSE_HOME);
  };

  // New Chat → stay in current universe, go to in-universe new chat view
  const handleNewChat = () => {
    setScreen(SCREENS.UNIVERSE_HOME);
  };

  const handleBrokerComplete = (response) => {
    setBrokerResponse(response);
    setScreen(SCREENS.RESPONSE);
  };

  const handleFollowUp = async (followUpQuery) => {
    console.log("[handleFollowUp] followUpQuery:", followUpQuery, "current followUpResponses:", followUpResponses.length);
    setIsLoading(true);
    setFollowUpThinkingStep(0);
    // Show query bubble immediately (pending state)
    setFollowUpResponses((prev) => {
      console.log("[handleFollowUp] Adding pending bubble, prev length:", prev.length);
      return [...prev, { query: followUpQuery, pending: true }];
    });
    // Animate follow-up thinking steps
    const fuStepInterval = setInterval(() => {
      setFollowUpThinkingStep(prev => prev < 5 ? prev + 1 : prev);
    }, 900);
    // Scroll the new follow-up bubble into view within the response scroll area
    setTimeout(() => {
      const bubble = document.querySelector('[data-followup-latest]');
      if (bubble) bubble.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 100);
    try {
      const universeId = selectedUniverse || "pluribus";
      const universe = UNIVERSE_CONTEXT[universeId] || UNIVERSE_CONTEXT.pluribus;

      // Build context-aware prompt with universe scope + conversation history
      const contextParts = [
        `You are answering questions about the ${universe.name} universe (${universe.description}). Focus your answer on ${universe.scope}.`,
        `Original question: "${query}"`,
      ];
      if (brokerResponse?.narrative) {
        const summary = brokerResponse.narrative.length > 800
          ? brokerResponse.narrative.slice(0, 800) + "..."
          : brokerResponse.narrative;
        contextParts.push(`Original answer: "${summary}"`);
      }
      // Include prior follow-ups (last 3 to keep prompt manageable)
      const recentFollowUps = followUpResponses.filter(fu => !fu.pending).slice(-3);
      for (const fu of recentFollowUps) {
        contextParts.push(`Follow-up Q: "${fu.query}"`);
        if (fu.response?.narrative) {
          const fuSummary = fu.response.narrative.length > 400
            ? fu.response.narrative.slice(0, 400) + "..."
            : fu.response.narrative;
          contextParts.push(`Follow-up A: "${fuSummary}"`);
        }
      }
      contextParts.push(`New follow-up question: "${followUpQuery}"`);
      contextParts.push("Answer the follow-up question using the conversation context above. Be specific and avoid repeating information already provided.");

      const contextualQuery = contextParts.join("\n\n");

      const res = await fetch(`${API_BASE}${selectedModel.endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: contextualQuery }),
      });
      if (!res.ok) throw new Error(`API error: ${res.status}`);
      const data = await res.json();
      console.log("[handleFollowUp] Got response:", data?.narrative?.substring(0, 80));
      clearInterval(fuStepInterval);
      setFollowUpThinkingStep(0);
      // Replace the pending entry with the completed response
      setFollowUpResponses((prev) => prev.map((fu) =>
        fu.query === followUpQuery && fu.pending ? { query: followUpQuery, response: data } : fu
      ));
    } catch (err) {
      console.error("[handleFollowUp] Error:", err.message);
      clearInterval(fuStepInterval);
      setFollowUpThinkingStep(0);
      setFollowUpResponses((prev) => prev.map((fu) =>
        fu.query === followUpQuery && fu.pending ? { query: followUpQuery, error: err.message } : fu
      ));
    } finally {
      setIsLoading(false);
    }
  };

  // ?test=content → render Justin's test page with mock data
  if (new URLSearchParams(window.location.search).get("test") === "content") {
    return <TestPage />;
  }

  return (
    <div>
      <style>{`
        /* System fonts — no import needed */
        * { margin: 0; padding: 0; box-sizing: border-box; }
        html, body { background: linear-gradient(165deg, #faf8f5 0%, #f5f0e8 50%, #ebe4d8 100%); overflow: hidden; }
        input::placeholder { color: ${T.textDim}; }
        #heroInputPluribusBible::placeholder { color: #4a5a6a; font-weight: 400; }
        #inputDockOmni::placeholder { color: #3d3028; }
        #inputDockOmni::-webkit-scrollbar { width: 4px; }
        #inputDockOmni::-webkit-scrollbar-thumb { background: #ccc; border-radius: 2px; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: ${T.border}; border-radius: 3px; }
        [data-dc-row]::-webkit-scrollbar { height: 4px; }
        [data-dc-row]::-webkit-scrollbar-thumb { background: ${T.border}; border-radius: 2px; }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes startersIn {
          from { opacity: 0; transform: translateY(-8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes bugPulse {
          0%, 100% { box-shadow: 0 8px 32px rgba(245,184,0,0.35); }
          50% { box-shadow: 0 8px 40px rgba(245,184,0,0.5); }
        }
      `}</style>

      <div
        style={{
          position: "fixed",
          bottom: 16,
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 1000,
          display: "none",
          gap: 3,
          background: T.bgCard,
          border: `1px solid ${T.border}`,
          borderRadius: 12,
          padding: 4,
          boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
        }}
      >
        {[
          { id: SCREENS.HOME, label: "1. Home" },
          { id: SCREENS.THINKING, label: "2. Thinking" },
          { id: SCREENS.RESPONSE, label: "3. Response" },
          { id: SCREENS.CONSTELLATION, label: "4. Constellation" },
          { id: SCREENS.ENTITY_DETAIL, label: "5. Detail" },
          { id: SCREENS.LIBRARY, label: "6. Library" },
        ].map((s) => (
          <button
            key={s.id}
            onClick={() => setScreen(s.id)}
            style={{
              padding: "8px 12px",
              borderRadius: 8,
              border: "none",
              background: screen === s.id ? T.queryBg : "transparent",
              color: screen === s.id ? "#fff" : T.textMuted,
              fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
              fontSize: 11.5,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            {s.label}
          </button>
        ))}

        {/* Entity toggle for Detail screen */}
        {screen === SCREENS.ENTITY_DETAIL && (
          <div style={{ display: "flex", gap: 2, marginLeft: 8, borderLeft: `1px solid ${T.border}`, paddingLeft: 8 }}>
            {Object.keys(entities).map((eName) => (
              <button
                key={eName}
                onClick={() => setSelectedEntity(eName)}
                style={{
                  padding: "8px 12px",
                  borderRadius: 8,
                  border: "none",
                  background: selectedEntity === eName ? T.blue : "transparent",
                  color: selectedEntity === eName ? "#fff" : T.textMuted,
                  fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
                  fontSize: 11,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                {eName}
              </button>
            ))}
          </div>
        )}
      </div>

      {universeLoading && screen !== SCREENS.HOME && screen !== SCREENS.THINKING && (
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "center",
          height: "100vh", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
          fontSize: 15, color: T.textMuted,
        }}>
          Loading universe...
        </div>
      )}
      {screen === SCREENS.HOME && <HomeScreen onNavigate={setScreen} spoilerFree={spoilerFree} setSpoilerFree={setSpoilerFree} onSubmit={handleQuerySubmit} selectedModel={selectedModel} onModelChange={setSelectedModel} />}
      {screen === SCREENS.UNIVERSE_HOME && <UniverseHomeScreen onNavigate={setScreen} selectedUniverse={selectedUniverse} onSubmit={handleQuerySubmit} selectedModel={selectedModel} onModelChange={setSelectedModel} onUniverseChange={handleUniverseChange} onNewChat={handleNewChat} />}
      {screen === SCREENS.THINKING && <ThinkingScreen onNavigate={setScreen} query={query} selectedModel={selectedModel} onModelChange={setSelectedModel} onComplete={handleBrokerComplete} selectedUniverse={selectedUniverse} />}
      {!universeLoading && screen === SCREENS.RESPONSE && <ResponseScreen onNavigate={setScreen} onSelectEntity={handleSelectEntity} spoilerFree={spoilerFree} library={library} toggleLibrary={toggleLibrary} query={query} brokerResponse={brokerResponse} selectedModel={selectedModel} onModelChange={handleModelChange} onFollowUp={handleFollowUp} followUpResponses={followUpResponses} isLoading={isLoading} onSubmit={handleQuerySubmit} entities={entities} responseData={responseData} onDrawerChange={setDrawerWidth} selectedUniverse={selectedUniverse} onUniverseChange={handleUniverseChange} onNewChat={handleNewChat} responseThread={responseThread} inlineThinking={inlineThinking} inlineStep={inlineStep} followUpThinkingStep={followUpThinkingStep} hasActiveResponse={!!brokerResponse} sortedEntityNames={sortedEntityNames} entityAliases={entityAliases} onEntityPopover={openPopover} />}
      {!universeLoading && screen === SCREENS.CONSTELLATION && <ConstellationScreen onNavigate={setScreen} onSelectEntity={handleSelectEntity} selectedModel={selectedModel} onModelChange={setSelectedModel} onSubmit={handleQuerySubmit} entities={entities} selectedUniverse={selectedUniverse} onUniverseChange={handleUniverseChange} onNewChat={handleNewChat} hasActiveResponse={!!brokerResponse} responseData={responseData} />}
      {!universeLoading && screen === SCREENS.ENTITY_DETAIL && <EntityDetailScreen onNavigate={setScreen} entityName={selectedEntity} onSelectEntity={handleSelectEntity} library={library} toggleLibrary={toggleLibrary} selectedModel={selectedModel} onModelChange={setSelectedModel} entities={entities} selectedUniverse={selectedUniverse} onUniverseChange={handleUniverseChange} onNewChat={handleNewChat} hasActiveResponse={!!brokerResponse} sortedEntityNames={sortedEntityNames} entityAliases={entityAliases} onEntityPopover={openPopover} />}
      {!universeLoading && screen === SCREENS.LIBRARY && <LibraryScreen onNavigate={setScreen} library={library} toggleLibrary={toggleLibrary} selectedModel={selectedModel} onModelChange={setSelectedModel} entities={entities} responseData={responseData} selectedUniverse={selectedUniverse} onUniverseChange={handleUniverseChange} onNewChat={handleNewChat} hasActiveResponse={!!brokerResponse} />}
      {!universeLoading && screen === SCREENS.THEMES && <ThemesScreen onNavigate={setScreen} onSelectEntity={handleSelectEntity} library={library} toggleLibrary={toggleLibrary} selectedModel={selectedModel} onModelChange={setSelectedModel} entities={entities} responseData={responseData} selectedUniverse={selectedUniverse} onUniverseChange={handleUniverseChange} onNewChat={handleNewChat} hasActiveResponse={!!brokerResponse} />}
      {!universeLoading && screen === SCREENS.SONIC && <SonicLayerScreen onNavigate={setScreen} onSelectEntity={handleSelectEntity} library={library} toggleLibrary={toggleLibrary} selectedModel={selectedModel} onModelChange={setSelectedModel} entities={entities} responseData={responseData} selectedUniverse={selectedUniverse} onUniverseChange={handleUniverseChange} onNewChat={handleNewChat} hasActiveResponse={!!brokerResponse} />}
      {!universeLoading && screen === SCREENS.CAST_CREW && <CastCrewScreen onNavigate={setScreen} onSelectEntity={handleSelectEntity} library={library} toggleLibrary={toggleLibrary} selectedModel={selectedModel} onModelChange={setSelectedModel} entities={entities} responseData={responseData} selectedUniverse={selectedUniverse} onUniverseChange={handleUniverseChange} onNewChat={handleNewChat} hasActiveResponse={!!brokerResponse} sortedEntityNames={sortedEntityNames} entityAliases={entityAliases} onEntityPopover={openPopover} />}
      {!universeLoading && screen === SCREENS.EPISODES && <EpisodesScreen onNavigate={setScreen} onSelectEntity={handleSelectEntity} library={library} toggleLibrary={toggleLibrary} selectedModel={selectedModel} onModelChange={setSelectedModel} entities={entities} responseData={responseData} onSelectEpisode={(id) => { setSelectedEpisode(id); setScreen(SCREENS.EPISODE_DETAIL); }} selectedUniverse={selectedUniverse} onUniverseChange={handleUniverseChange} onNewChat={handleNewChat} hasActiveResponse={!!brokerResponse} />}
      {!universeLoading && screen === SCREENS.EPISODE_DETAIL && <EpisodeDetailScreen_ onNavigate={setScreen} onSelectEntity={handleSelectEntity} library={library} toggleLibrary={toggleLibrary} selectedModel={selectedModel} onModelChange={setSelectedModel} entities={entities} responseData={responseData} episodeId={selectedEpisode} onSelectEpisode={(id) => { setSelectedEpisode(id); }} selectedUniverse={selectedUniverse} onUniverseChange={handleUniverseChange} onNewChat={handleNewChat} hasActiveResponse={!!brokerResponse} />}

      {/* Omnipresent InputDock — visible on all screens except Home and Thinking */}
      {screen !== SCREENS.HOME && screen !== SCREENS.THINKING && screen !== SCREENS.UNIVERSE_HOME && screen !== SCREENS.CONSTELLATION && (
        <InputDock
          value={dockQuery}
          onChange={(e) => setDockQuery(e.target.value)}
          drawerWidth={drawerWidth}
          onSubmit={() => {
            const text = dockQuery.trim();
            console.log("[App] InputDock onSubmit, text:", JSON.stringify(text), "screen:", screen);
            if (text) {
              setDockQuery("");
              if (screen === SCREENS.RESPONSE) {
                console.log("[App] Calling handleFollowUp (inline)");
                handleFollowUp(text);
              } else {
                console.log("[App] Calling handleQuerySubmit (ThinkingScreen)");
                handleQuerySubmit(text);
              }
            }
          }}
        />
      )}

      {/* Entity Popover — rendered at App level, positioned via portal */}
      {popoverEntity && entities[popoverEntity] && (
        <EntityPopover
          entityKey={popoverEntity}
          entityData={entities[popoverEntity]}
          anchorRect={popoverAnchorRect}
          onClose={closePopover}
          onAsk={(question) => {
            closePopover();
            const text = `Tell me about ${popoverEntity}: ${question}`;
            if (screen === SCREENS.RESPONSE) {
              handleFollowUp(text);
            } else {
              handleQuerySubmit(text);
            }
          }}
        />
      )}
    </div>
  );
}
