import { useState, useEffect } from "react";
import NetworkGraph from "./NetworkGraph";
import { fetchThemesGraph, slugify } from "./adapters";
import { THEMES_TYPES, THEME_REL_COLORS } from "./constants";

export default function ThemesNetwork({
  entityName,
  themesDB,
  themeVideos,
  onThemeTap,
  onEntityTap,
  theme,
}) {
  const [graphData, setGraphData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    fetchThemesGraph(entityName, themesDB, themeVideos)
      .then((data) => {
        if (!cancelled) setGraphData(data);
      })
      .catch((err) => {
        console.error("ThemesNetwork: fetch failed:", err);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [entityName, themesDB, themeVideos]);

  if (loading) return <LoadingState />;
  if (!graphData) return null;

  return (
    <NetworkGraph
      nodes={graphData.nodes}
      edges={graphData.edges}
      centerId={slugify(entityName)}
      types={graphData.types || THEMES_TYPES}
      relColors={THEME_REL_COLORS}
      onNodeClick={(node) => {
        if (node.type === "theme") onThemeTap?.(node.id);
        else onEntityTap?.(node.name);
      }}
      themeVideos={themeVideos}
      theme={theme}
    />
  );
}

function LoadingState() {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        height: "100%",
        fontFamily: "'DM Sans', sans-serif",
        color: "#9ca3af",
        flexDirection: "column",
        gap: 12,
      }}
    >
      <div
        style={{
          width: 32,
          height: 32,
          border: "3px solid #e5e7eb",
          borderTopColor: "#7c3aed",
          borderRadius: "50%",
          animation: "spin 0.8s linear infinite",
        }}
      />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <div style={{ fontSize: 13, fontWeight: 500 }}>Loading themes graph...</div>
    </div>
  );
}
