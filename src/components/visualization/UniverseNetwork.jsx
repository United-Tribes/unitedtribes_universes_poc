import { useState, useEffect } from "react";
import NetworkGraph from "./NetworkGraph";
import { fetchUniverseGraph, MOCK_NODES, MOCK_EDGES, slugify } from "./adapters";
import { UNIVERSE_TYPES, REL_COLORS } from "./constants";

export default function UniverseNetwork({ entityName, onEntityTap, assembledData, responseData, theme }) {
  const [graphData, setGraphData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    fetchUniverseGraph(entityName, assembledData, responseData)
      .then((data) => {
        if (!cancelled) setGraphData(data);
      })
      .catch((err) => {
        console.warn("UniverseNetwork: fetch failed, using mock data:", err);
        if (!cancelled) {
          // Fallback to mock data
          setGraphData({ nodes: MOCK_NODES, edges: MOCK_EDGES, types: UNIVERSE_TYPES });
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [entityName, assembledData, responseData]);

  if (loading) return <LoadingState />;
  if (error) return <ErrorState error={error} onRetry={() => setError(null)} />;
  if (!graphData) return null;

  return (
    <NetworkGraph
      nodes={graphData.nodes}
      edges={graphData.edges}
      centerId={slugify(entityName)}
      types={graphData.types || UNIVERSE_TYPES}
      relColors={REL_COLORS}
      onNodeClick={onEntityTap}
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
          borderTopColor: "#2563eb",
          borderRadius: "50%",
          animation: "spin 0.8s linear infinite",
        }}
      />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <div style={{ fontSize: 13, fontWeight: 500 }}>Loading universe graph...</div>
      <div style={{ fontSize: 11, color: "#d1d5db" }}>Fetching from UnitedTribes Knowledge Graph</div>
    </div>
  );
}

function ErrorState({ error, onRetry }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        height: "100%",
        fontFamily: "'DM Sans', sans-serif",
        color: "#6b7280",
        flexDirection: "column",
        gap: 12,
      }}
    >
      <div style={{ fontSize: 24 }}>⚠</div>
      <div style={{ fontSize: 13, fontWeight: 600 }}>Failed to load graph</div>
      <div style={{ fontSize: 11, color: "#9ca3af", maxWidth: 300, textAlign: "center" }}>
        {error?.message || "Could not connect to the UnitedTribes Knowledge Graph API."}
      </div>
      {onRetry && (
        <button
          onClick={onRetry}
          style={{
            marginTop: 8,
            padding: "6px 16px",
            fontSize: 11,
            fontWeight: 600,
            border: "1px solid #e5e7eb",
            borderRadius: 6,
            background: "#fff",
            cursor: "pointer",
            color: "#2563eb",
            fontFamily: "'DM Sans', sans-serif",
          }}
        >
          Retry
        </button>
      )}
    </div>
  );
}
