import { useState, useEffect } from "react";
import NetworkGraph from "./NetworkGraph";
import { fetchUniverseGraph, MOCK_NODES, MOCK_EDGES, slugify } from "./adapters";
import { UNIVERSE_TYPES, REL_COLORS } from "./constants";

// Inject a synthetic score-track node connected to Dave Porter if he exists
function injectScoreNode(data) {
  const SCORE_NODE_ID = "score-track-display";
  const DAVE_ID = "dave-porter";
  if (!data || !data.nodes) return data;
  const hasDave = data.nodes.some(n => n.id === DAVE_ID);
  if (!hasDave) return data;
  if (data.nodes.some(n => n.id === SCORE_NODE_ID)) return data;
  return {
    ...data,
    nodes: [...data.nodes, {
      id: SCORE_NODE_ID, name: "Original Score", type: "music", size: 8,
      featured: false, isHub: false, subtitle: "", description: "", hook: "",
      imageUrl: null, media: { videos: [], audio: [] },
    }],
    edges: [...data.edges, {
      source: DAVE_ID, target: SCORE_NODE_ID, rel: "COMPOSED", label: "score",
    }],
  };
}

export default function UniverseNetwork({ entityName, onEntityTap, assembledData, responseData, theme, smartCamera = false, queryGraphOverride, focusNodeId, activeHubType, onGraphReady, onNodeFocus, nodeSizeScale, castNodeIds, scoreTrackLabel }) {
  const [graphData, setGraphData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // When query graph override is provided, use it directly
    if (queryGraphOverride) {
      const enhanced = injectScoreNode(queryGraphOverride);
      setGraphData(enhanced);
      setLoading(false);
      onGraphReady?.(enhanced);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    fetchUniverseGraph(entityName, assembledData, responseData)
      .then((data) => {
        if (!cancelled) {
          const enhanced = injectScoreNode(data);
          setGraphData(enhanced);
          onGraphReady?.(enhanced);
        }
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
  }, [entityName, assembledData, responseData, queryGraphOverride]);

  if (loading) return <LoadingState />;
  if (error) return <ErrorState error={error} onRetry={() => setError(null)} />;
  if (!graphData) return null;

  return (
    <NetworkGraph
      nodes={graphData.nodes}
      edges={graphData.edges}
      centerId={graphData.centerId || slugify(entityName)}
      types={graphData.types || UNIVERSE_TYPES}
      relColors={REL_COLORS}
      onNodeClick={onEntityTap}
      theme={theme}
      smartCamera={smartCamera}
      nodeSizeScale={nodeSizeScale}
      castNodeIds={castNodeIds}
      focusNodeId={focusNodeId}
      activeHubType={activeHubType}
      onNodeFocus={onNodeFocus}
      scoreTrackLabel={scoreTrackLabel}
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
