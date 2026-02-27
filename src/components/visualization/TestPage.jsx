import { useState, useEffect } from "react";
import UniverseNetwork from "./UniverseNetwork";
import ThemesNetwork from "./ThemesNetwork";
import { MOCK_NODES, MOCK_EDGES } from "./adapters";
import { UNIVERSE_TYPES, REL_COLORS } from "./constants";
import NetworkGraph from "./NetworkGraph";

// Inline THEMES_DB for test page (same as App.jsx)
const THEMES_DB = {
  collective: {
    id: "collective", title: "Collective Consciousness", color: "#2563eb", prominence: 95, pathwayId: "hivemind",
    shortDesc: "When individual minds merge — is it invasion or evolution?",
    fullDesc: "The central sci-fi question of Pluribus: what does it mean when individual minds merge into something larger?",
    hookLine: "The most frightening thing about the signal isn't that it takes away who you are — it's that part of you wants to let it.",
    relatedThemes: ["psychology", "immunity", "identity"],
  },
  psychology: {
    id: "psychology", title: "Psychology", color: "#6366f1", prominence: 78, pathwayId: "hivemind",
    shortDesc: "How minds actually break under pressure from the signal.",
    fullDesc: "Pluribus treats psychology not as background texture but as mechanism.",
    hookLine: "The signal doesn't change who you are. It reveals who you were all along.",
    relatedThemes: ["collective", "immunity", "identity"],
  },
  immunity: {
    id: "immunity", title: "Immunity", color: "#0891b2", prominence: 72, pathwayId: "hivemind",
    shortDesc: "Some resist the signal. The show asks whether that's strength or limitation.",
    fullDesc: "Why are some characters immune to the signal while others aren't?",
    hookLine: "Immunity isn't a superpower. It might be a diagnosis.",
    relatedThemes: ["collective", "psychology", "resistance", "isolation"],
  },
  grief: {
    id: "grief", title: "Grief & Loss", color: "#dc2626", prominence: 85, pathwayId: "human-cost",
    shortDesc: "Loss that predates the signal — and loss the signal causes.",
    fullDesc: "Grief in Pluribus operates on two timelines.",
    hookLine: "The signal didn't cause the grief. It just made it impossible to keep ignoring.",
    relatedThemes: ["trauma", "relationships", "identity"],
  },
  trauma: {
    id: "trauma", title: "Trauma", color: "#ea580c", prominence: 80, pathwayId: "human-cost",
    shortDesc: "Not what happened, but how it echoes through everything after.",
    fullDesc: "Pluribus understands trauma not as a single event but as a pattern of response.",
    hookLine: "The signal found the cracks that were already there.",
    relatedThemes: ["grief", "relationships", "isolation"],
  },
  relationships: {
    id: "relationships", title: "Fractured Relationships", color: "#be185d", prominence: 72, pathwayId: "human-cost",
    shortDesc: "Trust becomes dangerous when you can't tell who's still themselves.",
    fullDesc: "Every relationship in Pluribus becomes a test case for trust under impossible conditions.",
    hookLine: "Love doesn't protect you. It just gives the signal more leverage.",
    relatedThemes: ["grief", "morality", "isolation"],
  },
  morality: {
    id: "morality", title: "Morality", color: "#9f1239", prominence: 68, pathwayId: "human-cost",
    shortDesc: "Impossible choices the show refuses to judge for you.",
    fullDesc: "Pluribus constructs moral dilemmas with no clean answers.",
    hookLine: "Everyone in Pluribus thinks they're doing the right thing. That's what makes it terrifying.",
    relatedThemes: ["grief", "relationships", "resistance"],
  },
  identity: {
    id: "identity", title: "Identity Under Pressure", color: "#7c3aed", prominence: 88, pathwayId: "inner-battle",
    shortDesc: "Who are you when everything external is stripped away?",
    fullDesc: "The signal forces every character to confront a question most people never face: what is the self?",
    hookLine: "The signal doesn't erase who you are. It asks whether 'who you are' was ever the point.",
    relatedThemes: ["collective", "resistance", "isolation", "psychology"],
  },
  resistance: {
    id: "resistance", title: "Resistance", color: "#8b5cf6", prominence: 82, pathwayId: "inner-battle",
    shortDesc: "The act of saying no — and what it costs to keep saying it.",
    fullDesc: "Resistance in Pluribus is not heroic in any simple sense.",
    hookLine: "Resistance isn't a virtue. It's a bet — and the odds keep getting worse.",
    relatedThemes: ["identity", "immunity", "isolation", "morality"],
  },
  isolation: {
    id: "isolation", title: "Isolation", color: "#a78bfa", prominence: 70, pathwayId: "inner-battle",
    shortDesc: "The price of staying yourself when everyone else has changed.",
    fullDesc: "Isolation is the shadow side of immunity and resistance.",
    hookLine: "Freedom and loneliness turn out to be the same thing.",
    relatedThemes: ["immunity", "resistance", "relationships", "grief"],
  },
};

const TABS = [
  { id: "universe", label: "Universe Network" },
  { id: "themes", label: "Themes Network" },
  { id: "static", label: "Static (Mock Data)" },
];

export default function VisualizationTestPage() {
  const [activeTab, setActiveTab] = useState("static");
  const [log, setLog] = useState([]);
  const [assembledData, setAssembledData] = useState(null);
  const [responseData, setResponseData] = useState(null);

  useEffect(() => {
    Promise.all([
      import("../../data/pluribus-universe.json").then((m) => m.default),
      import("../../data/pluribus-response.json").then((m) => m.default),
    ]).then(([ent, resp]) => {
      setAssembledData(ent);
      setResponseData(resp);
    });
  }, []);

  const addLog = (action, value) => {
    setLog((prev) => [`${new Date().toLocaleTimeString()} — ${action}: ${value}`, ...prev].slice(0, 30));
  };

  return (
    <div
      style={{
        fontFamily: "'DM Sans', sans-serif",
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        background: "#f9fafb",
        color: "#1a2744",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "12px 24px",
          borderBottom: "1px solid #e5e7eb",
          background: "#fff",
          display: "flex",
          alignItems: "center",
          gap: 16,
          flexShrink: 0,
        }}
      >
        <div>
          <span style={{ fontSize: 12, fontWeight: 800, letterSpacing: 1, color: "#1a2744" }}>UNITED</span>
          <span style={{ fontSize: 12, fontWeight: 800, letterSpacing: 1, color: "#f5b800" }}>TRIBES</span>
        </div>
        <span style={{ fontSize: 10, fontWeight: 600, color: "#9ca3af", letterSpacing: "0.06em" }}>
          ✦ VISUALIZATION TEST PAGE
        </span>
        <div style={{ flex: 1 }} />
        <a
          href={window.location.pathname}
          style={{ fontSize: 10, color: "#2563eb", textDecoration: "none" }}
        >
          ← Back to app
        </a>
      </div>

      {/* Tabs */}
      <div
        style={{
          padding: "0 24px",
          display: "flex",
          gap: 0,
          borderBottom: "1px solid #e5e7eb",
          background: "#fff",
          flexShrink: 0,
        }}
      >
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: "10px 20px",
              fontSize: 12,
              fontWeight: activeTab === tab.id ? 700 : 500,
              color: activeTab === tab.id ? "#2563eb" : "#6b7280",
              background: "none",
              border: "none",
              borderBottom: activeTab === tab.id ? "2px solid #2563eb" : "2px solid transparent",
              cursor: "pointer",
              fontFamily: "'DM Sans', sans-serif",
              transition: "all 0.15s",
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Graph area */}
      <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>
        {activeTab === "universe" && (
          <UniverseNetwork
            entityName="pluribus"
            assembledData={assembledData}
            responseData={responseData}
            onEntityTap={(name) => addLog("onEntityTap", typeof name === "string" ? name : name?.name || name?.id)}
          />
        )}

        {activeTab === "themes" && (
          <ThemesNetwork
            entityName="Pluribus"
            themesDB={THEMES_DB}
            themeVideos={null}
            onThemeTap={(id) => addLog("onThemeTap", id)}
            onEntityTap={(name) => addLog("onEntityTap", name)}
          />
        )}

        {activeTab === "static" && (
          <NetworkGraph
            nodes={MOCK_NODES}
            edges={MOCK_EDGES}
            centerId="pluribus"
            types={UNIVERSE_TYPES}
            relColors={REL_COLORS}
            onNodeClick={(node) => addLog("onNodeClick", node?.name || node?.id)}
          />
        )}
      </div>

      {/* Event log */}
      {log.length > 0 && (
        <div
          style={{
            position: "fixed",
            bottom: 0,
            left: 0,
            right: 0,
            background: "#1a2744",
            color: "#fff",
            padding: "10px 16px",
            fontFamily: "'DM Mono', monospace",
            fontSize: 11,
            maxHeight: 140,
            overflow: "auto",
            zIndex: 999,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
            <strong>Event Log</strong>
            <span
              onClick={() => setLog([])}
              style={{ cursor: "pointer", color: "#9ca3af", fontSize: 10 }}
            >
              Clear
            </span>
          </div>
          {log.map((entry, i) => (
            <div key={i} style={{ opacity: i === 0 ? 1 : 0.5 }}>
              {entry}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
