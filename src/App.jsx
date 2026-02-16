import { useState, useEffect, useRef, useMemo } from "react";
import ENTITIES from "./data/pluribus-universe.json";
import RESPONSE_DATA from "./data/pluribus-response.json";

const SCREENS = {
  HOME: "home",
  THINKING: "thinking",
  RESPONSE: "response",
  CONSTELLATION: "constellation",
  ENTITY_DETAIL: "entity_detail",
  LIBRARY: "library",
};

// --- API Configuration ---
const API_BASE = "https://166ws8jk15.execute-api.us-east-1.amazonaws.com/prod";

const MODELS = [
  { id: "gpt", name: "ChatGPT", provider: "OpenAI", endpoint: "/v2/broker-gpt", dot: "#10a37f" },
  { id: "claude", name: "Claude", provider: "Anthropic", endpoint: "/v2/broker", dot: "#2563eb" },
  { id: "nova", name: "Amazon Nova", provider: "Amazon Bedrock", endpoint: "/v2/broker-nova", dot: "#ff9900" },
  { id: "llama", name: "Llama 3.3", provider: "Meta", endpoint: "/v2/broker-llama", dot: "#2563eb" },
  { id: "mistral", name: "Mistral Large", provider: "Mistral AI", endpoint: "/v2/broker-mistral", dot: "#16803c" },
];

const DEFAULT_MODEL = MODELS[0]; // ChatGPT as default

// --- Palette matched to screenshot ---
const T = {
  bg: "#ffffff",
  bgCard: "#ffffff",
  bgElevated: "#f3f4f6",
  bgHover: "#e5e7eb",
  border: "#e5e7eb",
  borderLight: "#d1d5db",
  text: "#1a2744",
  textMuted: "#4b5563",
  textDim: "#9ca3af",
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

// --- Entity Data Store: imported from ./data/pluribus-universe.json ---


// --- UNITED TRIBES Logo matching colleague's site ---
function Logo({ size = "md" }) {
  const fontSize = size === "lg" ? 22 : 13;
  return (
    <div style={{ display: "flex", alignItems: "center", cursor: "pointer", userSelect: "none" }}>
      <span
        style={{
          fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
          fontSize,
          fontWeight: 800,
          color: "#1a2744",
          letterSpacing: "1px",
          textTransform: "uppercase",
        }}
      >
        UNITED
      </span>
      <span
        style={{
          fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
          fontSize,
          fontWeight: 800,
          color: "#f5b800",
          letterSpacing: "1px",
          textTransform: "uppercase",
        }}
      >
        TRIBES
      </span>
    </div>
  );
}

function SideNav({ active, onNavigate, libraryCount = 0 }) {
  const items = [
    { id: "universe", icon: "◎", label: "Universe" },
    { id: "characters", icon: "◉", label: "Characters" },
    { id: "episodes", icon: "▣", label: "Episodes" },
    { id: "sonic", icon: "♪", label: "Sonic Layer" },
    { id: "explore", icon: "⊕", label: "Explore" },
    { id: "themes", icon: "◈", label: "Themes" },
    { id: "library", icon: "▤", label: "Library" },
  ];
  return (
    <nav
      style={{
        width: 68,
        minHeight: "100%",
        background: T.bgCard,
        borderRight: `1px solid ${T.border}`,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        paddingTop: 16,
        gap: 4,
        flexShrink: 0,
      }}
    >
      {items.map((item) => {
        const isActive = active === item.id;
        return (
          <button
            key={item.id}
            onClick={() => {
              if (item.id === "universe") onNavigate(SCREENS.CONSTELLATION);
              if (item.id === "explore") onNavigate(SCREENS.RESPONSE);
              if (item.id === "library") onNavigate(SCREENS.LIBRARY);
            }}
            style={{
              width: 54,
              height: 54,
              border: "none",
              borderRadius: 10,
              background: isActive ? T.blueLight : "transparent",
              color: isActive ? T.blue : T.textMuted,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              gap: 3,
              transition: "all 0.2s",
              position: "relative",
            }}
          >
            <span style={{ fontSize: 18 }}>{item.icon}</span>
            <span style={{ fontSize: 9, letterSpacing: "0.04em", fontFamily: "'DM Sans', sans-serif" }}>
              {item.label}
            </span>
            {item.id === "library" && libraryCount > 0 && (
              <div
                style={{
                  position: "absolute",
                  top: 5,
                  right: 5,
                  minWidth: 16,
                  height: 16,
                  borderRadius: 8,
                  background: T.blue,
                  color: "#fff",
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: 9,
                  fontWeight: 700,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "0 4px",
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
        fontFamily: "'DM Sans', sans-serif",
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

function LibraryCounter({ count }) {
  return count > 0 ? (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 5,
        fontFamily: "'DM Sans', sans-serif",
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
          fontFamily: "'DM Sans', sans-serif",
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
                fontFamily: "'DM Sans', sans-serif",
                fontSize: 10,
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
                  <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 600, color: T.text }}>
                    {m.name}
                  </div>
                  <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: T.textDim }}>
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

function EnhancedBadge({ count }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 7,
          fontFamily: "'DM Sans', sans-serif",
          fontSize: 11.5,
          fontWeight: 600,
          color: T.text,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
        }}
      >
        <span style={{ width: 8, height: 8, borderRadius: "50%", background: T.gold }} />
        Enhanced Discovery
      </span>
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 5,
          fontFamily: "'DM Sans', sans-serif",
          fontSize: 11.5,
          fontWeight: 600,
          color: T.blue,
          background: T.blueLight,
          border: `1px solid ${T.blueBorder}`,
          padding: "4px 12px",
          borderRadius: 14,
        }}
      >
        + {count} discoveries in this response
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
  const exploreRef = useRef(null);

  useEffect(() => {
    setTimeout(() => setLoaded(true), 100);
  }, []);

  useEffect(() => {
    if (selectedUniverse && exploreRef.current) {
      setTimeout(() => {
        exploreRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 150);
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
      gradient: "linear-gradient(160deg, #3b6fa0 0%, #4a82b8 100%)",
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
      gradient: "linear-gradient(160deg, #a03a5a 0%, #b84a6a 100%)",
      textColor: "#fff",
      subColor: "rgba(255,255,255,0.7)",
      image: "📖",
      exploreName: "Patti Smith: Just Kids",
      exploreDescription: "Trace the connections between punk, poetry, and the New York art scene",
      placeholder: "How did Patti Smith and Robert Mapplethorpe influence each other?",
      chips: [
        "Map the Chelsea Hotel creative network",
        "What literature shaped Patti Smith's lyrics?",
        "Connect punk to the Beat poets",
        "Which artists emerged from this scene?",
      ],
    },
    {
      id: "gerwig",
      title: "Greta Gerwig",
      subtitle: "The Director's Lens",
      gradient: "linear-gradient(160deg, #9a8040 0%, #b89850 100%)",
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
      id: "pluribus",
      title: "Pluribus",
      subtitle: "The Hive Mind Universe",
      gradient: "linear-gradient(160deg, #2a7a4a 0%, #35905a 100%)",
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
  ];

  const selected = universes.find((u) => u.id === selectedUniverse);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: T.bg,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "60px 40px 80px",
        position: "relative",
        overflowY: "auto",
      }}
    >
      {/* Header */}
      <div
        style={{
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
            fontFamily: "'DM Sans', sans-serif",
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
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 20,
          maxWidth: 960,
          width: "100%",
          opacity: loaded ? 1 : 0,
          transform: loaded ? "translateY(0)" : "translateY(30px)",
          transition: "all 0.8s cubic-bezier(0.16,1,0.3,1) 0.15s",
        }}
      >
        {universes.map((u) => {
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
                background: u.gradient,
                borderRadius: 14,
                padding: 28,
                minHeight: 240,
                display: "flex",
                flexDirection: "column",
                justifyContent: "flex-end",
                cursor: "pointer",
                border: isSelected
                  ? "2px solid rgba(255,255,255,0.5)"
                  : `1px solid ${isHover ? "rgba(255,255,255,0.2)" : "transparent"}`,
                transition: "all 0.4s cubic-bezier(0.16,1,0.3,1)",
                transform: isHover ? "translateY(-4px)" : "none",
                boxShadow: isSelected
                  ? "0 4px 20px rgba(0,0,0,0.15)"
                  : isHover
                  ? T.shadowHover
                  : T.shadow,
                position: "relative",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  top: "42%",
                  left: "50%",
                  transform: "translate(-50%, -50%)",
                  fontSize: 64,
                  opacity: 0.25,
                }}
              >
                {u.image}
              </div>
              {u.featured && !isSelected && (
                <div
                  style={{
                    position: "absolute",
                    top: 14,
                    right: 14,
                    background: "rgba(255,255,255,0.2)",
                    border: "1px solid rgba(255,255,255,0.35)",
                    color: "#fff",
                    fontSize: 10,
                    padding: "4px 10px",
                    borderRadius: 10,
                    fontFamily: "'DM Sans', sans-serif",
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                    fontWeight: 600,
                  }}
                >
                  Featured
                </div>
              )}
              {!u.featured && !isSelected && (
                <div
                  style={{
                    position: "absolute",
                    top: 14,
                    right: 14,
                    background: "rgba(255,255,255,0.15)",
                    border: "1px solid rgba(255,255,255,0.25)",
                    color: "rgba(255,255,255,0.7)",
                    fontSize: 10,
                    padding: "4px 10px",
                    borderRadius: 10,
                    fontFamily: "'DM Sans', sans-serif",
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                    fontWeight: 600,
                  }}
                >
                  Preview
                </div>
              )}
              {isSelected && (
                <div
                  style={{
                    position: "absolute",
                    top: 14,
                    right: 14,
                    background: "rgba(255,255,255,0.25)",
                    border: "1px solid rgba(255,255,255,0.4)",
                    color: "#fff",
                    fontSize: 10,
                    padding: "4px 10px",
                    borderRadius: 10,
                    fontFamily: "'DM Sans', sans-serif",
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                    fontWeight: 600,
                  }}
                >
                  Selected
                </div>
              )}
              <h3
                style={{
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: 22,
                  fontWeight: 600,
                  color: u.textColor,
                  margin: 0,
                  lineHeight: 1.2,
                }}
              >
                {u.title}
              </h3>
              <p
                style={{
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: 13,
                  color: u.subColor,
                  margin: "8px 0 0",
                }}
              >
                {u.subtitle}
              </p>
            </div>
          );
        })}
      </div>

      {/* Explore Panel — appears below cards when a universe is selected */}
      {selected && (
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
                fontFamily: "'DM Sans', sans-serif",
                fontSize: 28,
                fontWeight: 600,
                color: T.text,
                margin: "0 0 8px",
              }}
            >
              Explore {selected.exploreName}
            </h2>
            <p
              style={{
                fontFamily: "'DM Sans', sans-serif",
                color: T.textMuted,
                fontSize: 15,
              }}
            >
              {selected.exploreDescription}
            </p>

            {/* Spoiler Toggle — Pluribus only (hidden for now) */}
            {false && selected.id === "pluribus" && (
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 14,
                  marginTop: 16,
                  background: T.bgElevated,
                  border: `1px solid ${T.border}`,
                  borderRadius: 12,
                  padding: "10px 20px",
                }}
              >
                <span
                  style={{
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: 13.5,
                    fontWeight: 600,
                    color: T.text,
                  }}
                >
                  Finished Season 1?
                </span>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span
                    style={{
                      fontFamily: "'DM Sans', sans-serif",
                      fontSize: 12,
                      color: spoilerFree ? T.text : T.textDim,
                      fontWeight: spoilerFree ? 600 : 400,
                    }}
                  >
                    No (Spoiler-Free)
                  </span>
                  <div
                    onClick={() => setSpoilerFree(!spoilerFree)}
                    style={{
                      width: 44,
                      height: 24,
                      borderRadius: 12,
                      background: spoilerFree ? T.border : T.blue,
                      cursor: "pointer",
                      position: "relative",
                      transition: "background 0.2s",
                      flexShrink: 0,
                    }}
                  >
                    <div
                      style={{
                        width: 18,
                        height: 18,
                        borderRadius: "50%",
                        background: "#fff",
                        position: "absolute",
                        top: 3,
                        left: spoilerFree ? 3 : 23,
                        transition: "left 0.2s",
                        boxShadow: "0 1px 3px rgba(0,0,0,0.15)",
                      }}
                    />
                  </div>
                  <span
                    style={{
                      fontFamily: "'DM Sans', sans-serif",
                      fontSize: 12,
                      color: !spoilerFree ? T.text : T.textDim,
                      fontWeight: !spoilerFree ? 600 : 400,
                    }}
                  >
                    Yes (Unlock All)
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Search input */}
          <div style={{ maxWidth: 640, margin: "0 auto", position: "relative" }}>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              placeholder={selected.placeholder}
              style={{
                width: "100%",
                padding: "16px 56px 16px 20px",
                borderRadius: 12,
                border: `1px solid ${T.borderLight}`,
                background: T.bg,
                color: T.text,
                fontSize: 15,
                fontFamily: "'DM Sans', sans-serif",
                outline: "none",
                boxSizing: "border-box",
                boxShadow: "inset 0 1px 3px rgba(0,0,0,0.04)",
              }}
            />
            <button
              onClick={handleSubmit}
              style={{
                position: "absolute",
                right: 8,
                top: "50%",
                transform: "translateY(-50%)",
                width: 38,
                height: 38,
                borderRadius: 10,
                border: "none",
                background: T.queryBg,
                color: "#fff",
                fontSize: 18,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              →
            </button>
          </div>

          {/* Starter chips */}
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 8,
              marginTop: 20,
              justifyContent: "center",
              maxWidth: 640,
              margin: "20px auto 0",
            }}
          >
            {selected.chips.map((chip) => (
              <Chip key={chip} onClick={() => { setQuery(chip); if (onSubmit) onSubmit(chip, selectedUniverse || "pluribus"); }}>
                {chip}
              </Chip>
            ))}
          </div>

          {/* Model indicator */}
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              marginTop: 24,
            }}
          >
            <ModelSelector selectedModel={selectedModel} onModelChange={onModelChange} />
          </div>
        </div>
      )}

      {/* Footer */}
      <p
        style={{
          fontFamily: "'DM Sans', sans-serif",
          color: T.textDim,
          fontSize: 12,
          marginTop: 40,
          opacity: loaded ? 1 : 0,
          transition: "opacity 0.6s 0.5s",
        }}
      >
        Powered by UnitedTribes Knowledge Graph · Authorized content partnerships
      </p>
    </div>
  );
}

// ==========================================================
//  SCREEN 3: THINKING
// ==========================================================
function ThinkingScreen({ onNavigate, query, selectedModel, onModelChange, onComplete }) {
  const [step, setStep] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [entityCount, setEntityCount] = useState(0);
  const [mediaCount, setMediaCount] = useState(0);
  const [apiError, setApiError] = useState(null);
  const [apiDone, setApiDone] = useState(false);
  const apiResponseRef = useRef(null);

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

  // API call
  useEffect(() => {
    const queryText = query || "Who created Pluribus and what inspired it?";
    const model = selectedModel || DEFAULT_MODEL;

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

  return (
    <div style={{ display: "flex", height: "100vh", background: T.bg }}>
      <SideNav active="explore" onNavigate={onNavigate} />
      <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        <header
          style={{
            height: 56,
            borderBottom: `1px solid ${T.border}`,
            background: T.bgCard,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 24px",
          }}
        >
          <Logo />
          <ModelSelector selectedModel={selectedModel} onModelChange={onModelChange} />
          <button
            onClick={() => onNavigate(SCREENS.HOME)}
            style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: 13,
              color: T.textMuted,
              background: T.bgCard,
              padding: "6px 16px",
              borderRadius: 8,
              border: `1px solid ${T.border}`,
              cursor: "pointer",
              fontWeight: 500,
            }}
          >
            + New chat
          </button>
        </header>

        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: 40,
            opacity: loaded ? 1 : 0,
            transition: "opacity 0.4s",
          }}
        >
          {/* Query bubble */}
          <div
            style={{
              background: T.queryBg,
              color: "#fff",
              fontFamily: "'DM Sans', sans-serif",
              fontSize: 17,
              fontWeight: 500,
              padding: "14px 28px",
              borderRadius: 24,
              marginBottom: 40,
              maxWidth: 480,
              textAlign: "center",
            }}
          >
            {query || "Who created Pluribus and what inspired it?"}
          </div>

          {/* Error state with retry */}
          {apiError && (
            <div style={{ marginBottom: 20, textAlign: "center" }}>
              <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: "#c0392b", marginBottom: 8 }}>
                API Error: {apiError}
              </div>
              <button
                onClick={() => { setApiError(null); setApiDone(false); setStep(0); }}
                style={{
                  fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 600,
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
              padding: "28px 36px",
              maxWidth: 520,
              width: "100%",
              boxShadow: T.shadow,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 22 }}>
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
                  fontFamily: "'DM Sans', sans-serif",
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
                marginBottom: 24,
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

            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
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
                        background: isComplete ? T.greenBg : isCurrent ? T.blueLight : T.bgElevated,
                        border: `1.5px solid ${isComplete ? T.green : isCurrent ? T.blue : T.border}`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 10,
                        color: isComplete ? T.green : T.blue,
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
                          fontFamily: "'DM Sans', sans-serif",
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
                            fontFamily: "'DM Sans', sans-serif",
                            fontSize: 11.5,
                            color: isComplete ? T.textDim : T.blue,
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
              marginTop: 28,
              opacity: step >= 2 ? 1 : 0,
              transition: "opacity 0.4s",
            }}
          >
            {[
              { label: "Discoveries", value: entityCount, color: T.blue },
              { label: "Media Types", value: mediaCount, color: T.blue },
              { label: "Confidence", value: step >= 5 ? "94%" : "—", color: T.green },
            ].map((stat) => (
              <div
                key={stat.label}
                style={{
                  background: T.bgCard,
                  border: `1px solid ${T.border}`,
                  borderRadius: 12,
                  padding: "16px 24px",
                  textAlign: "center",
                  minWidth: 120,
                  boxShadow: T.shadow,
                }}
              >
                <div
                  style={{
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: 28,
                    fontWeight: 700,
                    color: stat.color,
                    lineHeight: 1,
                  }}
                >
                  {stat.value}
                </div>
                <div
                  style={{
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: 10,
                    fontWeight: 600,
                    color: T.textDim,
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                    marginTop: 6,
                  }}
                >
                  {stat.label}
                </div>
              </div>
            ))}
          </div>

          <div
            style={{
              marginTop: 18,
              fontFamily: "'DM Sans', sans-serif",
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
        </div>
      </div>
    </div>
  );
}


// ==========================================================
//  SHARED: Discovery Card (dark, media-rich)
// ==========================================================
function DiscoveryCard({ type, typeBadgeColor, title, meta, context, platform, platformColor, price, icon, spoiler, spoilerFree, library, toggleLibrary, onCardClick, video_id, spotify_url, spotify_id, album_id, timecode_url, timestamp, seconds, thumbnail }) {
  const isLocked = spoiler && spoilerFree;
  const inLibrary = library && library.has(title);

  const handleClick = () => {
    if (isLocked || !onCardClick) return;
    onCardClick({ type, title, meta, context, platform, platformColor, price, icon, video_id, spotify_url, spotify_id, album_id, timecode_url, timestamp, seconds });
  };

  return (
    <div
      onClick={handleClick}
      style={{
        minWidth: 185,
        maxWidth: 205,
        background: T.queryBg,
        borderRadius: 12,
        overflow: "hidden",
        cursor: isLocked ? "default" : "pointer",
        flexShrink: 0,
        transition: "all 0.2s",
        border: isLocked ? "1px solid rgba(255,255,255,0.12)" : inLibrary ? `1px solid ${T.blue}44` : "1px solid rgba(255,255,255,0.06)",
        position: "relative",
        borderLeft: inLibrary && !isLocked ? `3px solid ${T.blue}` : undefined,
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
            borderRadius: 12,
          }}
        >
          <div style={{ fontSize: 22, marginBottom: 6, opacity: 0.7 }}>🔒</div>
          <div
            style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: 11,
              fontWeight: 600,
              color: "rgba(255,255,255,0.6)",
              textAlign: "center",
              padding: "0 16px",
              lineHeight: 1.4,
            }}
          >
            Finish S1 to unlock
          </div>
          {spoiler === "S1" && (
            <div
              style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: 9,
                fontWeight: 700,
                color: "rgba(255,255,255,0.35)",
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                marginTop: 6,
                background: "rgba(255,255,255,0.08)",
                padding: "2px 8px",
                borderRadius: 4,
              }}
            >
              S1 Spoiler
            </div>
          )}
        </div>
      )}

      <div
        style={{
          height: 105,
          background: thumbnail ? `url(${thumbnail}) center/cover no-repeat` : `linear-gradient(135deg, ${T.queryBg}, #2a3548)`,
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
        {!thumbnail && icon}
        {thumbnail && (
          <div style={{
            position: "absolute", inset: 0,
            background: "linear-gradient(to bottom, rgba(0,0,0,0.05) 0%, rgba(0,0,0,0.25) 100%)",
          }} />
        )}
        <div
          style={{
            position: "absolute",
            top: 10,
            left: 10,
            background: typeBadgeColor || T.blue,
            color: "#fff",
            fontFamily: "'DM Sans', sans-serif",
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
      </div>
      <div
        style={{
          padding: "11px 13px",
          filter: isLocked ? "blur(4px)" : "none",
          opacity: isLocked ? 0.3 : 1,
          transition: "all 0.3s",
        }}
      >
        <div
          style={{
            fontFamily: "'DM Sans', sans-serif",
            fontSize: 13.5,
            fontWeight: 600,
            color: "#fff",
            lineHeight: 1.3,
            marginBottom: 3,
          }}
        >
          {title}
        </div>
        <div
          style={{
            fontFamily: "'DM Sans', sans-serif",
            fontSize: 11,
            color: "rgba(255,255,255,0.5)",
            marginBottom: context ? 5 : 9,
          }}
        >
          {meta}
        </div>
        {context && (
          <div
            style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: 10.5,
              fontStyle: "italic",
              color: "rgba(255,255,255,0.7)",
              lineHeight: 1.4,
              marginBottom: 9,
            }}
          >
            {context}
          </div>
        )}
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          {platform && (
            <span
              style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: 9.5,
                fontWeight: 700,
                color: "#fff",
                background: platformColor || T.blue,
                padding: "3px 8px",
                borderRadius: 4,
              }}
            >
              {platform}
            </span>
          )}
          {price && (
            <span
              style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: 9.5,
                fontWeight: 700,
                color: "#fff",
                background: "#f5b800",
                padding: "3px 8px",
                borderRadius: 4,
              }}
            >
              {price}
            </span>
          )}
        </div>
      </div>

      {/* Spoiler badge on unlocked spoiler cards */}
      {spoiler && !spoilerFree && (
        <div
          style={{
            position: "absolute",
            top: 10,
            right: 10,
            fontFamily: "'DM Sans', sans-serif",
            fontSize: 8,
            fontWeight: 700,
            color: "rgba(255,255,255,0.5)",
            background: "rgba(255,255,255,0.1)",
            padding: "2px 7px",
            borderRadius: 4,
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            zIndex: 2,
          }}
        >
          S1 Spoiler
        </div>
      )}

      {/* Add to library button */}
      {toggleLibrary && !isLocked && (
        <div
          onClick={(e) => { e.stopPropagation(); toggleLibrary(title); }}
          style={{
            position: "absolute",
            bottom: 10,
            right: 10,
            width: 24,
            height: 24,
            borderRadius: 6,
            background: inLibrary ? T.blue : "rgba(255,255,255,0.1)",
            border: inLibrary ? "none" : "1px solid rgba(255,255,255,0.15)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            transition: "all 0.2s",
            zIndex: 2,
            fontSize: 13,
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
function AICuratedHeader() {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 22 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <div style={{ width: 4, minHeight: 32, borderRadius: 2, background: "#c0392b", flexShrink: 0 }} />
        <h2 style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 22, fontWeight: 700, color: T.text, margin: 0 }}>
          AI-Curated Discovery
        </h2>
      </div>
      <div
        style={{
          fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", fontSize: 9.5, fontWeight: 800,
          textTransform: "uppercase", letterSpacing: "1px",
          border: `1px solid ${T.border}`, borderRadius: 6, padding: "5px 12px",
        }}
      >
        <span style={{ color: "#1a2744" }}>POWERED BY UNITED</span><span style={{ color: "#f5b800" }}>TRIBES</span>
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
          background: artColor || "linear-gradient(135deg, #374151, #6b7280)",
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
        <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 600, color: isPlaying ? "#fff" : T.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {title}
        </div>
        <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11.5, color: isPlaying ? "rgba(255,255,255,0.5)" : T.textMuted }}>
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
function NowPlayingBar({ song, artist, context, timestamp, spotifyUrl, onClose, onNext, onPrev, onWatchVideo }) {
  const [expanded, setExpanded] = useState(false);
  const [progress, setProgress] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [showSpotify, setShowSpotify] = useState(false);
  const progressRef = useRef(null);

  // Extract Spotify track/album ID from URL
  const spotifyEmbedUrl = useMemo(() => {
    if (!spotifyUrl) return null;
    // Extract type and ID: https://open.spotify.com/track/xxx or /album/xxx
    const match = spotifyUrl.match(/open\.spotify\.com\/(track|album)\/([a-zA-Z0-9]+)/);
    if (match) return `https://open.spotify.com/embed/${match[1]}/${match[2]}?utm_source=generator&theme=0`;
    return null;
  }, [spotifyUrl]);

  // Simulate playback progress (only when no Spotify embed active)
  useEffect(() => {
    if (!playing || !song || showSpotify) return;
    const interval = setInterval(() => {
      setProgress(p => p >= 100 ? 0 : p + 0.3);
    }, 100);
    return () => clearInterval(interval);
  }, [playing, song, showSpotify]);

  // Reset progress on song change
  useEffect(() => {
    setProgress(0);
    setPlaying(true);
    setShowSpotify(false);
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
      {/* Spotify embed (shows below bar when active) */}
      {showSpotify && spotifyEmbedUrl && (
        <div style={{ padding: "0 20px 8px", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
          <iframe
            src={spotifyEmbedUrl}
            width="100%"
            height="80"
            frameBorder="0"
            allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
            loading="lazy"
            title={`Spotify: ${song}`}
            style={{ borderRadius: 8 }}
          />
        </div>
      )}

      {/* Scrub bar (hidden when Spotify is playing) */}
      {!showSpotify && (
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
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: showSpotify ? "#1db954" : "#16803c" }} />

          {/* Skip / play controls */}
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

          <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13.5, fontWeight: 600, color: "#fff" }}>
            {song}
          </span>
          <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: T.blue, fontWeight: 500 }}>
            · {artist}
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {spotifyEmbedUrl && (
            <button
              onClick={() => setShowSpotify(!showSpotify)}
              style={{
                fontFamily: "'DM Sans', sans-serif", fontSize: 11.5, fontWeight: 600,
                color: "#fff", background: showSpotify ? "#1db954" : "rgba(255,255,255,0.12)",
                border: "none", padding: "6px 14px", borderRadius: 8, cursor: "pointer",
                display: "flex", alignItems: "center", gap: 6,
              }}
            >
              {showSpotify ? "♪ Playing" : "♪ Spotify"}
            </button>
          )}
          <button
            onClick={() => setExpanded(!expanded)}
            style={{
              fontFamily: "'DM Sans', sans-serif", fontSize: 11.5, fontWeight: 600,
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
              fontFamily: "'DM Sans', sans-serif", fontSize: 11.5, fontWeight: 600,
              color: "#fff", background: "rgba(255,255,255,0.12)",
              border: "none", padding: "6px 14px", borderRadius: 8, cursor: "pointer",
              display: "flex", alignItems: "center", gap: 6,
            }}
          >
            ▶ Watch Video
          </button>
          <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 10.5, color: "rgba(255,255,255,0.35)", marginLeft: 4 }}>
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
            fontFamily: "'DM Sans', sans-serif", fontSize: 9.5, fontWeight: 700,
            color: "#c0392b", textTransform: "uppercase", letterSpacing: "0.08em",
            marginTop: 12, marginBottom: 8,
          }}>
            IN THE EPISODE
          </div>
          <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13.5, color: "rgba(255,255,255,0.75)", lineHeight: 1.6 }}>
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
          <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 15, fontWeight: 700, color: "#fff", flex: 1, marginRight: 12 }}>
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
          fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: "rgba(255,255,255,0.45)",
        }}>
          {videoId ? "via YouTube · Powered by UnitedTribes Knowledge Graph" : "Video not available · Placeholder"}
        </div>
      </div>
    </div>
  );
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
                  : "linear-gradient(145deg, #374151, #4b5563)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: isBook ? 28 : 24, boxShadow: isBook ? "3px 3px 8px rgba(0,0,0,0.15)" : "none",
              }}>
                {icon}
              </div>
              <div>
                <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 18, fontWeight: 700, color: T.text, lineHeight: 1.3 }}>
                  {title}
                </div>
                <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: T.textMuted, marginTop: 4 }}>
                  {meta}
                </div>
                <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                  {platform && (
                    <span style={{
                      fontFamily: "'DM Sans', sans-serif", fontSize: 10.5, fontWeight: 700,
                      color: "#fff", background: platformColor || T.blue,
                      padding: "3px 10px", borderRadius: 4,
                    }}>
                      {platform}
                    </span>
                  )}
                  {price && (
                    <span style={{
                      fontFamily: "'DM Sans', sans-serif", fontSize: 10.5, fontWeight: 700,
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
            fontFamily: "'DM Sans', sans-serif", fontSize: 9.5, fontWeight: 700,
            color: "#c0392b", textTransform: "uppercase", letterSpacing: "0.08em",
            marginBottom: 10,
          }}>
            {isBook ? "WHY THIS BOOK MATTERS" : "WHY THIS MATTERS"}
          </div>
          <div style={{
            fontFamily: "'DM Sans', sans-serif", fontSize: 14.5, lineHeight: 1.75,
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
              fontFamily: "'DM Sans', sans-serif", fontSize: 9.5, fontWeight: 700,
              color: T.blue, textTransform: "uppercase", letterSpacing: "0.08em",
              marginBottom: 8,
            }}>
              CONNECTION TO PLURIBUS
            </div>
            <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13.5, lineHeight: 1.65, color: T.textMuted }}>
              {isBook
                ? `This work is part of the literary DNA that feeds directly into Pluribus's themes of identity, consciousness, and what it means to be human in a world that has moved beyond individuality.`
                : `Referenced in the UnitedTribes Knowledge Graph as a verified influence on or analysis of Vince Gilligan's creative universe.`
              }
            </div>
          </div>

          {/* Source attribution */}
          <div style={{
            display: "flex", alignItems: "center", gap: 8,
            fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: T.textDim,
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
          <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: T.textDim }}>
            {isBook ? "Purchase links are affiliate-free" : "Opens in external reader"}
          </span>
          <button
            onClick={() => {
              const searchUrl = url || `https://www.google.com/search?q=${encodeURIComponent(title + (meta ? " " + meta : ""))}`;
              window.open(searchUrl, "_blank");
            }}
            style={{
              fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 600,
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
              fontFamily: "'DM Sans', sans-serif",
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
              fontFamily: "'DM Sans', sans-serif",
              fontSize: 14,
              color: T.textMuted,
              margin: "4px 0 0",
              lineHeight: 1.5,
            }}
          >
            {description}
          </p>
        </div>
      </div>
      <div
        style={{
          display: "flex",
          gap: 12,
          overflowX: "auto",
          paddingBottom: 8,
          paddingLeft: 18,
        }}
      >
        {children}
      </div>
    </div>
  );
}

// ==========================================================
//  SHARED: Entity Quick View Panel
// ==========================================================
function EntityQuickView({ entity, onClose, onNavigate, onViewDetail, library, toggleLibrary, onItemClick }) {
  if (!entity) return null;
  const data = ENTITIES[entity];
  if (!data) return null;

  const mediaGroups = data.quickViewGroups || [];
  const totalItems = mediaGroups.reduce((sum, g) => sum + (g.total || g.items?.length || 0), 0);

  return (
    <div
      style={{
        width: 390,
        borderLeft: `1px solid ${T.border}`,
        background: T.bgCard,
        overflowY: "auto",
        flexShrink: 0,
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
                fontFamily: "'DM Sans', sans-serif",
                fontSize: 19,
                fontWeight: 700,
                color: T.text,
              }}
            >
              {entity}
            </div>
            <span
              style={{
                fontFamily: "'DM Sans', sans-serif",
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
              fontFamily: "'DM Sans', sans-serif",
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
            fontFamily: "'DM Sans', sans-serif",
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
            fontFamily: "'DM Sans', sans-serif",
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
            <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 10.5, fontWeight: 700, color: T.textDim, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 10 }}>
              About
            </div>
            <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13.5, lineHeight: 1.7, color: T.textMuted }}>
              {data.bio[0].length > 200 ? data.bio[0].slice(0, 197) + "..." : data.bio[0]}
            </div>
          </div>
        )}
        {mediaGroups.map((group) => (
          <div key={group.label} style={{ marginBottom: 22 }}>
            <div
              style={{
                fontFamily: "'DM Sans', sans-serif",
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
                        fontFamily: "'DM Sans', sans-serif",
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
                        fontFamily: "'DM Sans', sans-serif",
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
                      fontFamily: "'DM Sans', sans-serif",
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
          fontFamily: "'DM Sans', sans-serif",
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
//  SCREEN 3: RESPONSE — Contextual Discovery Experience
// ==========================================================
function ResponseScreen({ onNavigate, onSelectEntity, spoilerFree, library, toggleLibrary, query, brokerResponse, selectedModel, onModelChange, onFollowUp, followUpResponses, isLoading, onSubmit }) {
  const [loaded, setLoaded] = useState(false);
  const [showCompare, setShowCompare] = useState(false);
  const [quickViewEntity, setQuickViewEntity] = useState(null);
  const [nowPlaying, setNowPlaying] = useState(null);
  const [videoModal, setVideoModal] = useState(null);
  const [readingModal, setReadingModal] = useState(null);
  const [followUpText, setFollowUpText] = useState("");

  useEffect(() => {
    setTimeout(() => setLoaded(true), 100);
  }, []);

  const openQuickView = (entity) => {
    setShowCompare(false);
    setQuickViewEntity(entity);
  };

  const viewDetail = (entity) => {
    onSelectEntity(entity);
    onNavigate(SCREENS.ENTITY_DETAIL);
  };

  const songs = RESPONSE_DATA.songs;

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
    <div style={{ display: "flex", height: "100vh", background: T.bg }}>
      <SideNav active="explore" onNavigate={onNavigate} libraryCount={library ? library.size : 0} />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <header
          style={{
            height: 56,
            borderBottom: `1px solid ${T.border}`,
            background: T.bgCard,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 24px",
            flexShrink: 0,
          }}
        >
          <Logo />
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button
              onClick={() => {
                setShowCompare(!showCompare);
                setQuickViewEntity(null);
              }}
              style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: 12.5,
                color: showCompare ? T.blue : T.textMuted,
                background: showCompare ? T.blueLight : T.bgCard,
                border: `1px solid ${showCompare ? T.blueBorder : T.border}`,
                padding: "6px 14px",
                borderRadius: 8,
                cursor: "pointer",
                fontWeight: 500,
              }}
            >
              ⟷ Compare Response
            </button>
            <ModelSelector selectedModel={selectedModel} onModelChange={onModelChange} />
          </div>
        </header>

        <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
          {/* ===== Main response column ===== */}
          <div
            style={{
              flex: 1,
              overflowY: "auto",
              padding: "28px 36px",
              opacity: loaded ? 1 : 0,
              transition: "opacity 0.5s",
            }}
          >
            {/* Query bubble */}
            <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 28 }}>
              <div
                style={{
                  background: T.queryBg,
                  color: "#fff",
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: 16,
                  fontWeight: 500,
                  padding: "12px 24px",
                  borderRadius: 22,
                }}
              >
                {query || "Who created Pluribus and what inspired it?"}
              </div>
            </div>

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
                  maxWidth: 700,
                }}
              >
                <span style={{ fontSize: 15 }}>🛡️</span>
                <div>
                  <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12.5, fontWeight: 600, color: T.blue }}>
                    Spoiler-Free Mode
                  </div>
                  <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: T.textMuted, marginTop: 1 }}>
                    Some content is hidden or redacted to protect your Season 1 experience. 3 cards locked.
                  </div>
                </div>
              </div>
            )}

            {/* Enhanced Discovery header */}
            <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 22 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: T.gold }} />
                <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, fontWeight: 700, color: T.textMuted, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                  Enhanced Discovery
                </span>
              </div>
              <div
                style={{
                  fontFamily: "'DM Sans', sans-serif", fontSize: 11, fontWeight: 600,
                  color: T.gold, background: T.goldBg, border: `1px solid ${T.goldBorder}`,
                  padding: "4px 12px", borderRadius: 20, display: "flex", alignItems: "center", gap: 5,
                }}
              >
                <span style={{ fontSize: 11 }}>✦</span> {brokerResponse?.insights?.entities_explored?.length || brokerResponse?.connections?.direct_connections?.length || RESPONSE_DATA.discoveryCount || 16} DISCOVERIES IN THIS RESPONSE
              </div>
            </div>

            {/* Response prose — live narrative from broker API, with entity linking */}
            <div
              style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: 16,
                lineHeight: 1.8,
                color: T.text,
                maxWidth: 700,
              }}
            >
              {brokerResponse?.narrative ? (
                // Live API narrative — split into paragraphs and auto-link entity names
                brokerResponse.narrative.split(/\n\n+/).filter(p => p.trim()).map((para, i) => {
                  // Find entity names from connections to auto-link
                  const entityNames = (brokerResponse.connections?.direct_connections || [])
                    .map(c => c.entity)
                    .filter(Boolean)
                    .sort((a, b) => b.length - a.length); // longest first to avoid partial matches

                  // Build JSX with entity tags
                  let parts = [para];
                  for (const eName of entityNames) {
                    const newParts = [];
                    for (const part of parts) {
                      if (typeof part !== "string") { newParts.push(part); continue; }
                      const regex = new RegExp(`(${eName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi");
                      const splits = part.split(regex);
                      for (const s of splits) {
                        if (s.toLowerCase() === eName.toLowerCase()) {
                          const inEntities = ENTITIES[eName] || ENTITIES[Object.keys(ENTITIES).find(k => k.toLowerCase() === eName.toLowerCase())];
                          newParts.push(
                            <EntityTag key={`${i}-${eName}-${newParts.length}`} onClick={inEntities ? () => openQuickView(eName) : undefined}>
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

                  return <p key={i} style={{ margin: "0 0 18px" }}>{parts}</p>;
                })
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
                        <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 600, color: T.textMuted }}>
                          Plot details hidden
                        </div>
                        <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: T.textDim, marginTop: 2 }}>
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
                      count. <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: T.textDim }}>[Source: Poggy Analysis]</span>
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

            {/* ========== AI-Curated Discovery ========== */}
            <div style={{ marginTop: 40 }}>
              <AICuratedHeader />

              {/* Discovery Groups — data from pluribus-response.json */}
              {RESPONSE_DATA.discoveryGroups.filter(g => g.id !== "literary").map((group) => (
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
              ))}

              {/* ===== Episode Music Section ===== */}
              <div style={{ marginBottom: 34 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                    <div style={{ width: 4, minHeight: 44, borderRadius: 2, background: "#7c3aed", flexShrink: 0, marginTop: 2 }} />
                    <div>
                      <h3 style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 18, fontWeight: 700, color: T.text, margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: 16 }}>🎧</span> Episode 7 — "The Gap"
                      </h3>
                      <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: T.textMuted, margin: "4px 0 0", lineHeight: 1.5 }}>
                        Thomas Golubić's needle drops — every song chosen to mirror Carol's emotional state as she realizes what the Joining really means.
                      </p>
                    </div>
                  </div>
                  <button
                    style={{
                      fontFamily: "'DM Sans', sans-serif", fontSize: 12, fontWeight: 700,
                      color: "#fff", background: "#16803c",
                      border: "none", padding: "8px 18px", borderRadius: 8, cursor: "pointer",
                      display: "flex", alignItems: "center", gap: 6, flexShrink: 0,
                    }}
                  >
                    ▶ Play All
                  </button>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, paddingLeft: 18 }}>
                  {songs.map((s, i) => (
                    <SongTile
                      key={i}
                      title={s.title}
                      artist={s.artist}
                      artColor={s.artColor}
                      isPlaying={nowPlaying === i}
                      onPlay={() => setNowPlaying(nowPlaying === i ? null : i)}
                    />
                  ))}
                </div>
              </div>

              {/* Literary Roots — data from pluribus-response.json */}
              {RESPONSE_DATA.discoveryGroups.filter(g => g.id === "literary").map((group) => (
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
              ))}

            </div>

            {/* Follow-up responses */}
            {followUpResponses && followUpResponses.map((fu, fi) => (
              <div key={fi} style={{ marginTop: 28 }}>
                {/* Follow-up query bubble */}
                <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16 }}>
                  <div style={{ background: T.queryBg, color: "#fff", fontFamily: "'DM Sans', sans-serif", fontSize: 15, fontWeight: 500, padding: "10px 20px", borderRadius: 20 }}>
                    {fu.query}
                  </div>
                </div>
                {/* Follow-up response */}
                <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 15, lineHeight: 1.8, color: T.text, maxWidth: 700 }}>
                  {fu.error ? (
                    <div style={{ color: "#c0392b", fontStyle: "italic" }}>Error: {fu.error}</div>
                  ) : fu.response?.narrative ? (
                    fu.response.narrative.split(/\n\n+/).filter(p => p.trim()).map((para, i) => (
                      <p key={i} style={{ margin: "0 0 14px" }}>{para}</p>
                    ))
                  ) : (
                    <div style={{ color: T.textDim, fontStyle: "italic" }}>No response received.</div>
                  )}
                </div>
              </div>
            ))}

            {/* Follow-up input */}
            <div style={{ marginTop: 16, maxWidth: 640, paddingBottom: 40, position: "relative" }}>
              <input
                type="text"
                value={followUpText}
                onChange={(e) => setFollowUpText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && followUpText.trim() && !isLoading) {
                    onFollowUp(followUpText.trim());
                    setFollowUpText("");
                  }
                }}
                placeholder="Ask a follow-up about Pluribus..."
                disabled={isLoading}
                style={{
                  width: "100%",
                  padding: "14px 56px 14px 20px",
                  borderRadius: 12,
                  border: `1px solid ${T.border}`,
                  background: T.bgCard,
                  color: T.text,
                  fontSize: 14,
                  fontFamily: "'DM Sans', sans-serif",
                  outline: "none",
                  boxSizing: "border-box",
                  boxShadow: T.shadow,
                  opacity: isLoading ? 0.6 : 1,
                }}
              />
              <button
                onClick={() => {
                  if (followUpText.trim() && !isLoading) {
                    onFollowUp(followUpText.trim());
                    setFollowUpText("");
                  }
                }}
                style={{
                  position: "absolute",
                  right: 8,
                  top: "50%",
                  transform: "translateY(-50%)",
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  border: "none",
                  background: isLoading ? T.textDim : T.queryBg,
                  color: "#fff",
                  fontSize: 16,
                  cursor: isLoading ? "not-allowed" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {isLoading ? "…" : "→"}
              </button>
            </div>
          </div>

          {/* ===== Entity Quick View Panel ===== */}
          {quickViewEntity && (
            <EntityQuickView
              entity={quickViewEntity}
              onClose={() => setQuickViewEntity(null)}
              onNavigate={onNavigate}
              onViewDetail={viewDetail}
              library={library}
              toggleLibrary={toggleLibrary}
              onItemClick={(item) => {
                if (item.video_id) {
                  setVideoModal({ title: item.title, subtitle: item.meta, videoId: item.video_id, timecodeUrl: item.timecode_url });
                } else if (item.spotify_url) {
                  window.open(item.spotify_url, '_blank');
                }
              }}
            />
          )}

          {/* ===== Compare Panel ===== */}
          {showCompare && (() => {
            // Derive real stats from broker response if available
            const entityCount = brokerResponse?.connections?.direct_connections?.length || brokerResponse?.insights?.entities_explored?.length || RESPONSE_DATA.comparePanel?.enhancedResponse?.stats?.[0]?.match(/\d+/)?.[0] || 16;
            const rawModelName = `Raw ${selectedModel?.name || "LLM"}`;
            const rawText = brokerResponse
              ? `${query ? query.replace(/\?$/, '') : "Pluribus"} — a brief factual summary without verified entity data, cross-media connections, or actionable discovery links. Just general knowledge from the model's training data.`
              : "Vince Gilligan created Pluribus. It is a science fiction television series that premiered on Apple TV+ in 2024. The show follows a small town that discovers an alien presence has been slowly infiltrating their community. Gilligan has cited various influences including classic sci-fi films and his own earlier work on The X-Files. The show has received generally positive reviews.";
            const enhancedText = brokerResponse?.narrative
              ? brokerResponse.narrative.slice(0, 300) + (brokerResponse.narrative.length > 300 ? "..." : "")
              : `Rich response with ${entityCount} verified entities, cross-media connections spanning film, literature, and music, plus actionable discovery links from authorized partnerships.`;
            const enhancementSummary = [
              { label: "Verified Entities", raw: "0", enhanced: String(entityCount) },
              { label: "Media Types", raw: "1", enhanced: "4" },
              { label: "Actionable Links", raw: "0", enhanced: String(Math.min(entityCount, 20)) },
              { label: "Source Authority", raw: "Unverified", enhanced: "Authorized" },
            ];

            return (
            <div
              style={{
                width: 360,
                borderLeft: `1px solid ${T.border}`,
                background: T.bgCard,
                overflowY: "auto",
                flexShrink: 0,
                padding: 24,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
                <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, fontWeight: 600, color: T.text }}>
                  Compare Response
                </span>
                <button
                  onClick={() => setShowCompare(false)}
                  style={{ background: "none", border: "none", color: T.textMuted, cursor: "pointer", fontSize: 18 }}
                >
                  ×
                </button>
              </div>

              <div style={{ marginBottom: 28 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                  <div style={{ width: 7, height: 7, borderRadius: "50%", background: T.textDim }} />
                  <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 10.5, fontWeight: 600, color: T.textDim, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                    {rawModelName}
                  </span>
                </div>
                <div
                  style={{
                    background: T.bgElevated,
                    border: `1px solid ${T.border}`,
                    borderRadius: 10,
                    padding: 16,
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: 13.5,
                    lineHeight: 1.65,
                    color: T.textMuted,
                  }}
                >
                  {rawText}
                </div>
                <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 10, color: T.textDim, marginTop: 8, display: "flex", gap: 16, fontWeight: 500 }}>
                  <span>0 entities</span><span>0 cross-media links</span><span>No actions</span>
                </div>
              </div>

              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                  <div style={{ width: 7, height: 7, borderRadius: "50%", background: T.gold }} />
                  <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 10.5, fontWeight: 600, color: T.gold, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                    UnitedTribes Enhanced
                  </span>
                </div>
                <div
                  style={{
                    background: T.goldBg,
                    border: `1px solid ${T.goldBorder}`,
                    borderRadius: 10,
                    padding: 16,
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: 13.5,
                    lineHeight: 1.65,
                    color: T.text,
                  }}
                >
                  {brokerResponse?.narrative ? enhancedText : (
                    <>Rich response with <span style={{ color: T.blue, fontWeight: 700 }}>{entityCount} verified entities</span>, cross-media connections spanning film, literature, and music, plus actionable discovery links from authorized partnerships.</>
                  )}
                </div>
                <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 10, color: T.green, marginTop: 8, display: "flex", gap: 16, fontWeight: 600 }}>
                  <span>{entityCount} entities</span><span>4 media types</span><span>{Math.min(entityCount, 20)} actions</span>
                </div>
              </div>

              <div
                style={{
                  marginTop: 28,
                  padding: 16,
                  background: T.bgElevated,
                  borderRadius: 10,
                  border: `1px solid ${T.border}`,
                }}
              >
                <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 10, fontWeight: 600, color: T.textDim, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 12 }}>
                  Enhancement Summary
                </div>
                {enhancementSummary.map((stat) => (
                  <div
                    key={stat.label}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "8px 0",
                      borderBottom: `1px solid ${T.border}40`,
                      fontFamily: "'DM Sans', sans-serif",
                      fontSize: 12,
                    }}
                  >
                    <span style={{ color: T.textMuted }}>{stat.label}</span>
                    <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
                      <span style={{ color: T.textDim }}>{stat.raw}</span>
                      <span style={{ color: T.textDim }}>→</span>
                      <span style={{ color: T.green, fontWeight: 700 }}>{stat.enhanced}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            );
          })()}
        </div>
      </div>

      {/* Now Playing Bar */}
      {nowPlaying !== null && (
        <NowPlayingBar
          song={songs[nowPlaying].title}
          artist={songs[nowPlaying].artist}
          context={songs[nowPlaying].context}
          timestamp={songs[nowPlaying].timestamp}
          spotifyUrl={songs[nowPlaying].spotify_url}
          onClose={() => setNowPlaying(null)}
          onNext={handleNextSong}
          onPrev={handlePrevSong}
          onWatchVideo={() => setVideoModal({ title: songs[nowPlaying].title, subtitle: songs[nowPlaying].artist, videoId: songs[nowPlaying].video_id })}
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
function ConstellationScreen({ onNavigate, onSelectEntity, selectedModel, onModelChange, onSubmit }) {
  const [loaded, setLoaded] = useState(false);
  const [hoveredNode, setHoveredNode] = useState(null);
  const [hoveredPath, setHoveredPath] = useState(null);
  const [selectedPath, setSelectedPath] = useState(null);
  const [assistantOpen, setAssistantOpen] = useState(true);

  useEffect(() => {
    setTimeout(() => setLoaded(true), 100);
  }, []);

  const [sidebarQuery, setSidebarQuery] = useState("");

  // --- Pathways data model ---
  // Map leaf IDs to ENTITIES keys
  const leafEntityMap = {
    bb: null, // Breaking Bad not in tier 1-2 entity data
    bcs: null,
    xfiles: null,
    bodysnatch: "Invasion of the Body Snatchers",
    thing: "The Thing",
    borg: "The Borg",
    carol: null, // Carol Sturka not in assembled entities (character not in KG)
    zosia: "Zosia",
    manousos: "Manousos Oviedo",
  };

  const handleLeafClick = (leafId) => {
    const entityName = leafEntityMap[leafId];
    if (entityName && onSelectEntity) {
      onSelectEntity(entityName);
      onNavigate(SCREENS.ENTITY_DETAIL);
    }
  };

  const hub = { id: "hub", label: "PLURIBUS", sublabel: "UNIVERSE", x: 480, y: 270, r: 48 };

  const pathways = [
    {
      id: "auteur",
      label: "The Auteur Path",
      sublabel: "Gilligan Universe",
      color: "#2a9d5c",
      leafBg: "#e8f5ee",
      leafBorder: "#2a9d5c",
      x: 270, y: 270, r: 28,
      angle: Math.PI,
      description: "Every show, film, and episode Gilligan created — the skills and storytelling instincts that made Pluribus possible.",
      leaves: [
        { id: "bb", label: "Breaking Bad", x: 95, y: 150, r: 18, context: "16 Emmys · The moral spiral" },
        { id: "bcs", label: "Better Call Saul", x: 80, y: 270, r: 18, context: "Patience as a storytelling weapon" },
        { id: "xfiles", label: "X-Files", x: 95, y: 390, r: 18, context: "\"Pusher\" planted the seed" },
      ],
    },
    {
      id: "scifi",
      label: "The Sci-Fi Path",
      sublabel: "The Hive Mind",
      color: "#2563eb",
      leafBg: "#eff6ff",
      leafBorder: "#2563eb",
      x: 670, y: 130, r: 28,
      angle: -0.55,
      description: "The films, novels, and concepts that feed directly into Pluribus's core premise — collective consciousness and identity erasure.",
      leaves: [
        { id: "bodysnatch", label: "Invasion of the\nBody Snatchers", x: 835, y: 55, r: 18, context: "\"THE wellspring\" — Gilligan" },
        { id: "thing", label: "The Thing", x: 848, y: 148, r: 18, context: "Isolation + paranoia template" },
        { id: "borg", label: "The Borg", x: 835, y: 235, r: 18, context: "Collective as seductive threat" },
      ],
    },
    {
      id: "actor",
      label: "The Character Path",
      sublabel: "Carol Sturka",
      color: "#c0392b",
      leafBg: "#fef2f2",
      leafBorder: "#c0392b",
      x: 665, y: 400, r: 28,
      angle: 0.55,
      description: "Carol Sturka — the misanthropic novelist immune to the Joining. Her character arc, key relationships, and the fictional DNA that shaped her.",
      leaves: [
        { id: "carol", label: "Carol Sturka", x: 830, y: 325, r: 18, context: "Reluctant hero of the Joining" },
        { id: "zosia", label: "Zosia", x: 845, y: 410, r: 18, context: "The Others' liaison to Carol" },
        { id: "manousos", label: "Manousos", x: 830, y: 490, r: 18, context: "The man who refused everything" },
      ],
    },
  ];

  // --- Curved path helper ---
  function curvePath(x1, y1, x2, y2, curvature = 0.3) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const cx = x1 + dx * 0.5 - dy * curvature;
    const cy = y1 + dy * 0.5 + dx * curvature;
    return `M ${x1} ${y1} Q ${cx} ${cy} ${x2} ${y2}`;
  }

  // --- Sparkle positions ---
  const sparkles = [
    { x: 90, y: 80, s: 8 }, { x: 320, y: 50, s: 6 }, { x: 680, y: 40, s: 7 },
    { x: 830, y: 280, s: 6 }, { x: 750, y: 500, s: 8 }, { x: 150, y: 460, s: 7 },
    { x: 450, y: 520, s: 5 }, { x: 50, y: 180, s: 5 },
  ];

  return (
    <div style={{ display: "flex", height: "100vh", background: T.bg }}>
      <SideNav active="universe" onNavigate={onNavigate} />
      <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        <header
          style={{
            height: 56,
            borderBottom: `1px solid ${T.border}`,
            background: T.bgCard,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 24px",
            flexShrink: 0,
          }}
        >
          <Logo />
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div
              style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: 13,
                fontWeight: 600,
                color: T.text,
              }}
            >
              Pathways View
            </div>
            <div
              style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: 10.5,
                color: T.textDim,
                background: T.bgElevated,
                border: `1px solid ${T.border}`,
                padding: "3px 10px",
                borderRadius: 6,
              }}
            >
              3 pathways · 9 entities
            </div>
          </div>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <ModelSelector selectedModel={selectedModel} onModelChange={onModelChange} />
            <button
              onClick={() => setAssistantOpen(!assistantOpen)}
              style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: 12.5,
                color: assistantOpen ? T.blue : T.textMuted,
                background: assistantOpen ? T.blueLight : T.bgCard,
                border: `1px solid ${assistantOpen ? T.blueBorder : T.border}`,
                padding: "6px 14px",
                borderRadius: 8,
                cursor: "pointer",
                fontWeight: 500,
              }}
            >
              ◎ Guide
            </button>
          </div>
        </header>

        <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
          {/* ===== Main pathways canvas ===== */}
          <div
            style={{
              flex: 1,
              position: "relative",
              opacity: loaded ? 1 : 0,
              transition: "opacity 0.8s",
              background: "#ffffff",
              overflow: "hidden",
              display: "flex",
              justifyContent: "center",
              alignItems: "flex-start",
              paddingTop: 20,
            }}
          >
            {/* Background network texture */}
            <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0.08 }}>
              {Array.from({ length: 24 }, (_, i) => {
                const x1 = Math.random() * 900;
                const y1 = Math.random() * 560;
                const x2 = x1 + (Math.random() - 0.5) * 200;
                const y2 = y1 + (Math.random() - 0.5) * 200;
                return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={T.blue} strokeWidth={0.8} />;
              })}
              {Array.from({ length: 16 }, (_, i) => {
                const cx = Math.random() * 900;
                const cy = Math.random() * 560;
                return <circle key={`d${i}`} cx={cx} cy={cy} r={2} fill={T.blue} opacity={0.3} />;
              })}
            </svg>

            {/* Centered graph container */}
            <div style={{ position: "relative", width: 960, height: 560, flexShrink: 0 }}>

            {/* Sparkle stars */}
            {sparkles.map((sp, i) => (
              <div
                key={`sp${i}`}
                style={{
                  position: "absolute",
                  left: sp.x,
                  top: sp.y,
                  width: sp.s,
                  height: sp.s,
                  opacity: 0.2,
                  fontSize: sp.s + 4,
                  lineHeight: 1,
                  pointerEvents: "none",
                }}
              >
                ✦
              </div>
            ))}

            {/* SVG curves */}
            <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }}>
              <defs>
                {pathways.map((p) => (
                  <linearGradient key={`g-${p.id}`} id={`grad-${p.id}`} x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor={T.textDim} stopOpacity={0.15} />
                    <stop offset="50%" stopColor={p.color} stopOpacity={0.5} />
                    <stop offset="100%" stopColor={p.color} stopOpacity={0.3} />
                  </linearGradient>
                ))}
              </defs>

              {/* Hub → Pathway curves */}
              {pathways.map((p) => {
                const hl = hoveredPath === p.id || selectedPath === p.id;
                return (
                  <path
                    key={`hp-${p.id}`}
                    d={curvePath(hub.x, hub.y, p.x, p.y, 0.15)}
                    stroke={p.color}
                    strokeWidth={hl ? 3 : 2}
                    fill="none"
                    opacity={hl ? 0.8 : 0.3}
                    style={{ transition: "all 0.3s" }}
                  />
                );
              })}

              {/* Pathway → Leaf curves */}
              {pathways.map((p) =>
                p.leaves.map((leaf) => {
                  const hl = hoveredPath === p.id || selectedPath === p.id || hoveredNode === leaf.id;
                  return (
                    <path
                      key={`pl-${leaf.id}`}
                      d={curvePath(p.x, p.y, leaf.x, leaf.y, 0.12)}
                      stroke={p.color}
                      strokeWidth={hl ? 2.5 : 1.5}
                      fill="none"
                      opacity={hl ? 0.7 : 0.25}
                      style={{ transition: "all 0.3s" }}
                    />
                  );
                })
              )}
            </svg>

            {/* Central hub */}
            <div
              style={{
                position: "absolute",
                left: hub.x - hub.r,
                top: hub.y - hub.r,
                width: hub.r * 2,
                height: hub.r * 2,
                borderRadius: "50%",
                background: "linear-gradient(145deg, #ffffff, #f0f0f0)",
                border: "3px solid rgba(0,0,0,0.06)",
                boxShadow: "0 8px 32px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.06), inset 0 1px 2px rgba(255,255,255,0.8)",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                zIndex: 5,
                cursor: "default",
              }}
            >
              <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 10.5, fontWeight: 700, color: T.text, letterSpacing: "0.08em", lineHeight: 1.1 }}>
                {hub.label}
              </div>
              <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 8, fontWeight: 600, color: T.textDim, letterSpacing: "0.06em" }}>
                {hub.sublabel}
              </div>
            </div>

            {/* Pathway nodes */}
            {pathways.map((p) => {
              const hl = hoveredPath === p.id || selectedPath === p.id;
              return (
                <div
                  key={p.id}
                  onMouseEnter={() => setHoveredPath(p.id)}
                  onMouseLeave={() => setHoveredPath(null)}
                  onClick={() => setSelectedPath(selectedPath === p.id ? null : p.id)}
                  style={{
                    position: "absolute",
                    left: p.x - (hl ? 90 : 80),
                    top: p.y - (hl ? 22 : 18),
                    width: hl ? 180 : 160,
                    padding: "8px 14px",
                    borderRadius: 20,
                    background: hl ? p.color : p.leafBg,
                    border: `2px solid ${p.color}`,
                    boxShadow: hl
                      ? `0 8px 28px ${p.color}35, 0 2px 6px ${p.color}20`
                      : `0 4px 16px ${p.color}18, 0 1px 4px rgba(0,0,0,0.06)`,
                    cursor: "pointer",
                    zIndex: 6,
                    textAlign: "center",
                    transition: "all 0.3s cubic-bezier(0.16,1,0.3,1)",
                    transform: hl ? "scale(1.05) translateY(-2px)" : "scale(1)",
                  }}
                >
                  <div
                    style={{
                      fontFamily: "'DM Sans', sans-serif",
                      fontSize: 11.5,
                      fontWeight: 700,
                      color: hl ? "#fff" : T.text,
                      lineHeight: 1.2,
                    }}
                  >
                    {p.label}
                  </div>
                  <div
                    style={{
                      fontFamily: "'DM Sans', sans-serif",
                      fontSize: 9.5,
                      color: hl ? "rgba(255,255,255,0.8)" : T.textDim,
                      marginTop: 1,
                    }}
                  >
                    ({p.sublabel})
                  </div>
                </div>
              );
            })}

            {/* Leaf nodes */}
            {pathways.map((p) =>
              p.leaves.map((leaf) => {
                const hl = hoveredNode === leaf.id || hoveredPath === p.id || selectedPath === p.id;
                return (
                  <div
                    key={leaf.id}
                    onMouseEnter={() => setHoveredNode(leaf.id)}
                    onMouseLeave={() => setHoveredNode(null)}
                    onClick={() => handleLeafClick(leaf.id)}
                    style={{
                      position: "absolute",
                      left: leaf.x - 62,
                      top: leaf.y - 18,
                      minWidth: 124,
                      maxWidth: 160,
                      padding: "8px 14px",
                      borderRadius: 14,
                      background: hl ? p.leafBg : `${p.leafBg}cc`,
                      border: `1.5px solid ${hl ? p.leafBorder : `${p.leafBorder}40`}`,
                      boxShadow: hl
                        ? `0 6px 22px ${p.color}28, 0 2px 6px ${p.color}15`
                        : `0 3px 12px ${p.color}12, 0 1px 3px rgba(0,0,0,0.05)`,
                      cursor: leafEntityMap[leaf.id] ? "pointer" : "default",
                      zIndex: hl ? 8 : 3,
                      textAlign: "center",
                      transition: "all 0.3s",
                      transform: hl ? "scale(1.05) translateY(-3px)" : "scale(1)",
                    }}
                  >
                    <div
                      style={{
                        fontFamily: "'DM Sans', sans-serif",
                        fontSize: 12,
                        fontWeight: 600,
                        color: T.text,
                        lineHeight: 1.3,
                        whiteSpace: "pre-line",
                      }}
                    >
                      {leaf.label}
                    </div>
                    {hl && leaf.context && (
                      <div
                        style={{
                          fontFamily: "'DM Sans', sans-serif",
                          fontSize: 10,
                          fontStyle: "italic",
                          color: T.textMuted,
                          marginTop: 3,
                        }}
                      >
                        {leaf.context}
                      </div>
                    )}
                  </div>
                );
              })
            )}

            {/* Legend */}
            <div
              style={{
                position: "absolute",
                bottom: 20,
                left: 20,
                display: "flex",
                gap: 16,
                fontFamily: "'DM Sans', sans-serif",
                fontSize: 10,
                fontWeight: 500,
                background: "rgba(255,255,255,0.9)",
                padding: "8px 14px",
                borderRadius: 8,
                border: `1px solid ${T.border}`,
                backdropFilter: "blur(8px)",
              }}
            >
              {pathways.map((p) => (
                <div
                  key={p.id}
                  style={{ display: "flex", alignItems: "center", gap: 5, cursor: "pointer" }}
                  onMouseEnter={() => setHoveredPath(p.id)}
                  onMouseLeave={() => setHoveredPath(null)}
                >
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: p.color }} />
                  <span style={{ color: T.textMuted }}>{p.label}</span>
                </div>
              ))}
            </div>

            {/* Title */}
            <div
              style={{
                position: "absolute",
                top: 20,
                left: "50%",
                transform: "translateX(-50%)",
                textAlign: "center",
              }}
            >
              <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 20, fontWeight: 700, color: T.text }}>
                Pathways View
              </div>
              <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: T.textMuted, marginTop: 2 }}>
                How everything connects to the Pluribus universe
              </div>
            </div>
            </div>
          </div>

          {/* ===== Sidebar: pathway detail or guide ===== */}
          {assistantOpen && (
            <div
              style={{
                width: 320,
                borderLeft: `1px solid ${T.border}`,
                background: T.bgCard,
                display: "flex",
                flexDirection: "column",
                flexShrink: 0,
                overflowY: "auto",
              }}
            >
              {selectedPath ? (() => {
                const p = pathways.find((pw) => pw.id === selectedPath);
                return (
                  <>
                    <div style={{ padding: "20px 20px 16px", borderBottom: `1px solid ${T.border}` }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                        <div style={{ width: 10, height: 10, borderRadius: "50%", background: p.color }} />
                        <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 17, fontWeight: 600, color: T.text }}>
                          {p.label}
                        </div>
                      </div>
                      <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: T.textDim, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>
                        {p.sublabel}
                      </div>
                      <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13.5, color: T.textMuted, lineHeight: 1.6, margin: 0 }}>
                        {p.description}
                      </p>
                    </div>
                    <div style={{ padding: "16px 20px" }}>
                      <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 10, fontWeight: 700, color: T.textDim, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>
                        Entities in this pathway
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        {p.leaves.map((leaf) => (
                          <div
                            key={leaf.id}
                            onClick={() => handleLeafClick(leaf.id)}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              padding: "10px 14px",
                              background: T.bgElevated,
                              border: `1px solid ${T.border}`,
                              borderLeft: `3px solid ${p.color}`,
                              borderRadius: 8,
                              cursor: "pointer",
                              transition: "all 0.15s",
                            }}
                          >
                            <div style={{ flex: 1 }}>
                              <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13.5, fontWeight: 600, color: T.text }}>
                                {leaf.label.replace("\n", " ")}
                              </div>
                              <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11.5, fontStyle: "italic", color: T.textMuted, marginTop: 2 }}>
                                {leaf.context}
                              </div>
                            </div>
                            <span style={{ color: T.textDim, fontSize: 14 }}>→</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div style={{ padding: "0 20px 20px" }}>
                      <button
                        onClick={() => setSelectedPath(null)}
                        style={{
                          width: "100%",
                          fontFamily: "'DM Sans', sans-serif",
                          fontSize: 12.5,
                          color: T.textMuted,
                          background: T.bgElevated,
                          border: `1px solid ${T.border}`,
                          padding: "8px",
                          borderRadius: 8,
                          cursor: "pointer",
                        }}
                      >
                        ← Back to Guide
                      </button>
                    </div>
                  </>
                );
              })() : (
                <>
                  <div style={{ padding: "18px 20px", borderBottom: `1px solid ${T.border}` }}>
                    <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 17, fontWeight: 600, color: T.text }}>
                      Pluribus Guide
                    </div>
                    <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: T.textMuted, margin: "8px 0 0", lineHeight: 1.5 }}>
                      Click a pathway to explore its connections, or ask a question below.
                    </p>
                  </div>
                  <div style={{ padding: "16px 20px" }}>
                    <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 10, fontWeight: 600, color: T.textDim, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>
                      Pathways
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      {pathways.map((p) => (
                        <div
                          key={p.id}
                          onClick={() => setSelectedPath(p.id)}
                          onMouseEnter={() => setHoveredPath(p.id)}
                          onMouseLeave={() => setHoveredPath(null)}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            padding: "10px 14px",
                            background: T.bgElevated,
                            border: `1px solid ${T.border}`,
                            borderLeft: `3px solid ${p.color}`,
                            borderRadius: 8,
                            cursor: "pointer",
                            transition: "all 0.15s",
                          }}
                        >
                          <div style={{ flex: 1 }}>
                            <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13.5, fontWeight: 600, color: T.text }}>
                              {p.label}
                            </div>
                            <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: T.textDim }}>
                              {p.sublabel} · {p.leaves.length} entities
                            </div>
                          </div>
                          <span style={{ color: T.textDim, fontSize: 14 }}>→</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div style={{ padding: "8px 20px" }}>
                    <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 10, fontWeight: 600, color: T.textDim, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>
                      Try asking
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      {["How does the Auteur Path connect to Pluribus?", "What sci-fi influenced the Hive Mind?", "Who is Carol Sturka?", "Which themes run across all pathways?"].map((q) => (
                        <button
                          key={q}
                          onClick={() => { if (onSubmit) onSubmit(q, "pluribus"); }}
                          style={{
                            background: T.bgElevated,
                            border: `1px solid ${T.border}`,
                            borderRadius: 8,
                            padding: "10px 14px",
                            color: T.text,
                            fontFamily: "'DM Sans', sans-serif",
                            fontSize: 12.5,
                            textAlign: "left",
                            cursor: "pointer",
                            lineHeight: 1.4,
                          }}
                        >
                          {q}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div style={{ flex: 1 }} />
                  <div style={{ padding: 16, borderTop: `1px solid ${T.border}` }}>
                    <input
                      type="text"
                      placeholder="Ask anything about Pluribus..."
                      value={sidebarQuery}
                      onChange={(e) => setSidebarQuery(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && sidebarQuery.trim() && onSubmit) {
                          onSubmit(sidebarQuery.trim(), "pluribus");
                          setSidebarQuery("");
                        }
                      }}
                      style={{
                        width: "100%",
                        padding: "12px 16px",
                        borderRadius: 10,
                        border: `1px solid ${T.border}`,
                        background: T.bgElevated,
                        color: T.text,
                        fontSize: 13,
                        fontFamily: "'DM Sans', sans-serif",
                        outline: "none",
                        boxSizing: "border-box",
                      }}
                    />
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ==========================================================
//  SCREEN 6: ENTITY DETAIL — Full Knowledge Graph Record
// ==========================================================

function CollaboratorRow({ name, role, projects, projectCount }) {
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
            background: T.blueLight,
            border: `1px solid ${T.blueBorder}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 16,
            color: T.blue,
            fontWeight: 700,
            fontFamily: "'DM Sans', sans-serif",
            flexShrink: 0,
          }}
        >
          {name.split(" ").map((n) => n[0]).join("")}
        </div>
        <div>
          <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, fontWeight: 600, color: T.text }}>
            {name}
          </div>
          <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: T.textMuted, marginTop: 1 }}>
            {role}
          </div>
        </div>
      </div>
      <div style={{ textAlign: "right" }}>
        <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: T.textDim }}>
          {projects}
        </div>
        <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 10, color: T.blue, fontWeight: 600, marginTop: 2 }}>
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
          fontFamily: "'DM Sans', sans-serif",
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
          fontFamily: "'DM Sans', sans-serif",
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
              fontFamily: "'DM Sans', sans-serif",
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
//  SCREEN 5: ENTITY DETAIL — Full Knowledge Graph Record
// ==========================================================
function EntityDetailScreen({ onNavigate, entityName, onSelectEntity, library, toggleLibrary, selectedModel, onModelChange }) {
  const [loaded, setLoaded] = useState(false);
  const [videoModal, setVideoModal] = useState(null);
  const [readingModal, setReadingModal] = useState(null);
  useEffect(() => { setTimeout(() => setLoaded(true), 100); }, []);

  const name = entityName || "Vince Gilligan";
  const data = ENTITIES[name];
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
      works: { title: "The Complete Works", desc: `Every project ${name.split(" ").pop()} created, wrote, or directed — organized by role.` },
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
      collaborators: { title: "Cast & Crew", desc: `The filmmakers and actors who brought ${name} to life.` },
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
    <div style={{ display: "flex", height: "100vh", background: T.bg }}>
      <SideNav active="characters" onNavigate={onNavigate}  libraryCount={library ? library.size : 0} />
      <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        <header
          style={{
            height: 56,
            borderBottom: `1px solid ${T.border}`,
            background: T.bgCard,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 24px",
            flexShrink: 0,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <Logo />
            <span style={{ color: T.textDim, fontSize: 13 }}>/</span>
            <span
              style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: T.blue, cursor: "pointer", fontWeight: 500 }}
              onClick={() => onNavigate(SCREENS.CONSTELLATION)}
            >
              Pluribus Universe
            </span>
            <span style={{ color: T.textDim, fontSize: 13 }}>/</span>
            <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: T.text, fontWeight: 600 }}>
              {name}
            </span>
          </div>
          <ModelSelector selectedModel={selectedModel} onModelChange={onModelChange} />
        </header>

        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "36px 48px",
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
                background: data.avatarGradient,
                border: `1px solid ${T.border}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 56,
                flexShrink: 0,
                boxShadow: T.shadow,
              }}
            >
              {data.emoji}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 6 }}>
                <h1 style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 36, fontWeight: 700, color: T.text, margin: 0 }}>
                  {name}
                </h1>
                <span
                  style={{
                    fontFamily: "'DM Sans', sans-serif",
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
              <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 15, color: T.textMuted, margin: "0 0 14px" }}>
                {data.subtitle}
              </p>
              <div style={{ display: "flex", gap: 20, marginBottom: 14 }}>
                {data.stats.map((stat) => (
                  <div key={stat.label} style={{ textAlign: "center" }}>
                    <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 22, fontWeight: 700, color: T.blue, lineHeight: 1 }}>
                      {stat.value}
                    </div>
                    <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 10, fontWeight: 600, color: T.textDim, textTransform: "uppercase", letterSpacing: "0.05em", marginTop: 3 }}>
                      {stat.label}
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {data.tags.map((tag) => (
                  <span
                    key={tag}
                    style={{
                      fontFamily: "'DM Sans', sans-serif",
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

          {/* ===== Biography ===== */}
          {data.bio?.length > 0 && (
          <section style={{ marginBottom: 40, maxWidth: 760 }}>
            <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 15, lineHeight: 1.8, color: T.textMuted }}>
              {data.bio.map((para, i) => (
                <p key={i} style={{ margin: i < data.bio.length - 1 ? "0 0 14px" : "0" }}>
                  {para}
                </p>
              ))}
            </div>
          </section>
          )}

          {/* ===== Sparse entity notice ===== */}
          {(() => {
            const sectionCount = [data.completeWorks, data.inspirations, data.collaborators, data.themes, data.interviews, data.articles, data.sonic].filter(s => s?.length > 0).length;
            if (sectionCount === 0 && (!data.bio || data.bio.length === 0)) return (
              <div style={{ padding: "24px 28px", background: T.bgElevated, border: `1px solid ${T.border}`, borderRadius: 12, marginBottom: 36, maxWidth: 760 }}>
                <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: T.textMuted, margin: 0 }}>
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
                  <h3 style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 18, fontWeight: 700, color: T.text, margin: 0 }}>
                    {labels.collaborators.title}
                  </h3>
                  <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: T.textMuted, margin: "4px 0 0" }}>
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
          {data.themes?.length > 0 && (
            <div style={{ marginBottom: 36 }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 14, marginBottom: 18 }}>
                <div style={{ width: 4, minHeight: 44, borderRadius: 2, background: T.gold, flexShrink: 0, marginTop: 2 }} />
                <div>
                  <h3 style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 18, fontWeight: 700, color: T.text, margin: 0 }}>
                    {labels.themes.title}
                  </h3>
                  <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: T.textMuted, margin: "4px 0 0" }}>
                    {labels.themes.desc}
                  </p>
                </div>
              </div>
              <div style={{ display: "flex", gap: 14, paddingLeft: 18, overflowX: "auto", paddingBottom: 8 }}>
                {data.themes.map((t) => (
                  <ThemeCard key={t.title} {...t} />
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
                <h3 style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 18, fontWeight: 700, color: T.text, margin: 0 }}>
                  In the Knowledge Graph
                </h3>
                <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: T.textMuted, margin: "4px 0 0" }}>
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
                        fontFamily: "'DM Sans', sans-serif",
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
              fontFamily: "'DM Sans', sans-serif",
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
function LibraryScreen({ onNavigate, library, toggleLibrary, selectedModel, onModelChange }) {
  // Build a lookup of all known items across entities and response cards
  const allItems = useMemo(() => {
    const items = [];
    const seen = new Set();
    // Entity detail sections
    Object.entries(ENTITIES).forEach(([entityName, data]) => {
      const sections = ["completeWorks", "inspirations", "interviews", "articles", "sonic"];
      sections.forEach((section) => {
        if (data[section]) {
          data[section].forEach((item) => {
            if (!seen.has(item.title)) {
              seen.add(item.title);
              items.push({ ...item, source: entityName, section });
            }
          });
        }
      });
    });
    // Response discovery group cards
    if (RESPONSE_DATA.discoveryGroups) {
      RESPONSE_DATA.discoveryGroups.forEach((group) => {
        if (group.cards) {
          group.cards.forEach((card) => {
            if (!seen.has(card.title)) {
              seen.add(card.title);
              items.push({ ...card, source: "Discovery", section: group.id });
            }
          });
        }
      });
    }
    return items;
  }, []);

  // Filter to only saved items
  const savedItems = allItems.filter((item) => library.has(item.title));

  // Group by media type
  const groups = useMemo(() => {
    const typeMap = {
      "TV & Film": [],
      "Music": [],
      "Books": [],
      "Articles & Analysis": [],
      "Interviews & Talks": [],
    };
    savedItems.forEach((item) => {
      const icon = item.icon;
      if (icon === "🎵") typeMap["Music"].push(item);
      else if (icon === "📖") typeMap["Books"].push(item);
      else if (icon === "📄") typeMap["Articles & Analysis"].push(item);
      else if (icon === "🎙" || icon === "🎤") typeMap["Interviews & Talks"].push(item);
      else typeMap["TV & Film"].push(item);
    });
    return Object.entries(typeMap).filter(([, items]) => items.length > 0);
  }, [savedItems]);

  return (
    <div style={{ display: "flex", height: "100vh", background: T.bg }}>
      <SideNav active="library" onNavigate={onNavigate} libraryCount={library.size} />
      <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        <header
          style={{
            height: 56,
            borderBottom: `1px solid ${T.border}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 28px",
            background: T.bgCard,
            flexShrink: 0,
          }}
        >
          <Logo />
          <ModelSelector selectedModel={selectedModel} onModelChange={onModelChange} />
        </header>

        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "40px 48px 80px",
          }}
        >
          {/* Page header */}
          <div style={{ maxWidth: 800, marginBottom: 36 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
              <span style={{ fontSize: 28 }}>📚</span>
              <h1
                style={{
                  fontFamily: "'DM Sans', sans-serif",
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
                    fontFamily: "'DM Sans', sans-serif",
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
                fontFamily: "'DM Sans', sans-serif",
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
                  fontFamily: "'DM Sans', sans-serif",
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
                  fontFamily: "'DM Sans', sans-serif",
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
                  fontFamily: "'DM Sans', sans-serif",
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
                  fontFamily: "'DM Sans', sans-serif",
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
                <span>{groupLabel}</span>
                <span style={{ fontWeight: 500, color: T.blue }}>{items.length}</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {items.map((item) => (
                  <div
                    key={item.title}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      padding: "12px 16px",
                      background: T.bgCard,
                      border: `1px solid ${T.border}`,
                      borderLeft: `3px solid ${T.blue}`,
                      borderRadius: 10,
                      transition: "all 0.15s",
                    }}
                  >
                    <span style={{ fontSize: 20, marginRight: 14, flexShrink: 0 }}>{item.icon}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontFamily: "'DM Sans', sans-serif",
                          fontSize: 14,
                          fontWeight: 600,
                          color: T.text,
                          marginBottom: 2,
                        }}
                      >
                        {item.title}
                      </div>
                      <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: T.textDim }}>
                        {item.meta}
                      </div>
                      {item.context && (
                        <div
                          style={{
                            fontFamily: "'DM Sans', sans-serif",
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
                            fontFamily: "'DM Sans', sans-serif",
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
                      <span
                        style={{
                          fontFamily: "'DM Sans', sans-serif",
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
                      <div
                        onClick={() => toggleLibrary(item.title)}
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
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [screen, setScreen] = useState(SCREENS.HOME);
  const [selectedEntity, setSelectedEntity] = useState("Vince Gilligan");
  const [spoilerFree, setSpoilerFree] = useState(false);
  const [library, setLibrary] = useState(() => {
    try {
      const saved = localStorage.getItem("ut_library");
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch { return new Set(); }
  });

  // Lifted state for live API integration
  const [query, setQuery] = useState("");
  const [selectedModel, setSelectedModel] = useState(DEFAULT_MODEL);
  const [brokerResponse, setBrokerResponse] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedUniverse, setSelectedUniverse] = useState("pluribus");
  const [followUpResponses, setFollowUpResponses] = useState([]);

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
    setQuery(queryText);
    setSelectedUniverse(universe || "pluribus");
    setBrokerResponse(null);
    setFollowUpResponses([]);
    setScreen(SCREENS.THINKING);
  };

  const handleBrokerComplete = (response) => {
    setBrokerResponse(response);
    setScreen(SCREENS.RESPONSE);
  };

  const handleFollowUp = async (followUpQuery) => {
    setIsLoading(true);
    try {
      const res = await fetch(`${API_BASE}${selectedModel.endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: followUpQuery }),
      });
      if (!res.ok) throw new Error(`API error: ${res.status}`);
      const data = await res.json();
      setFollowUpResponses((prev) => [...prev, { query: followUpQuery, response: data }]);
    } catch (err) {
      setFollowUpResponses((prev) => [...prev, { query: followUpQuery, error: err.message }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,wght@0,300;0,400;0,500;0,600;0,700;1,400&family=DM+Mono:wght@400;500&display=swap');
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { background: #ffffff; overflow: hidden; }
        input::placeholder { color: ${T.textDim}; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: ${T.border}; border-radius: 3px; }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
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
              fontFamily: "'DM Sans', sans-serif",
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
            {Object.keys(ENTITIES).map((eName) => (
              <button
                key={eName}
                onClick={() => setSelectedEntity(eName)}
                style={{
                  padding: "8px 12px",
                  borderRadius: 8,
                  border: "none",
                  background: selectedEntity === eName ? T.blue : "transparent",
                  color: selectedEntity === eName ? "#fff" : T.textMuted,
                  fontFamily: "'DM Sans', sans-serif",
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

      {screen === SCREENS.HOME && <HomeScreen onNavigate={setScreen} spoilerFree={spoilerFree} setSpoilerFree={setSpoilerFree} onSubmit={handleQuerySubmit} selectedModel={selectedModel} onModelChange={setSelectedModel} />}
      {screen === SCREENS.THINKING && <ThinkingScreen onNavigate={setScreen} query={query} selectedModel={selectedModel} onModelChange={setSelectedModel} onComplete={handleBrokerComplete} />}
      {screen === SCREENS.RESPONSE && <ResponseScreen onNavigate={setScreen} onSelectEntity={handleSelectEntity} spoilerFree={spoilerFree} library={library} toggleLibrary={toggleLibrary} query={query} brokerResponse={brokerResponse} selectedModel={selectedModel} onModelChange={setSelectedModel} onFollowUp={handleFollowUp} followUpResponses={followUpResponses} isLoading={isLoading} onSubmit={handleQuerySubmit} />}
      {screen === SCREENS.CONSTELLATION && <ConstellationScreen onNavigate={setScreen} onSelectEntity={handleSelectEntity} selectedModel={selectedModel} onModelChange={setSelectedModel} onSubmit={handleQuerySubmit} />}
      {screen === SCREENS.ENTITY_DETAIL && <EntityDetailScreen onNavigate={setScreen} entityName={selectedEntity} onSelectEntity={handleSelectEntity} library={library} toggleLibrary={toggleLibrary} selectedModel={selectedModel} onModelChange={setSelectedModel} />}
      {screen === SCREENS.LIBRARY && <LibraryScreen onNavigate={setScreen} library={library} toggleLibrary={toggleLibrary} selectedModel={selectedModel} onModelChange={setSelectedModel} />}
    </div>
  );
}
