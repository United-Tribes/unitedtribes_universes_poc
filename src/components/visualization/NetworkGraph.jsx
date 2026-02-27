import { useRef, useEffect, useState, useCallback } from "react";
import * as d3 from "d3";
import { FORCE_CONFIG, NODE_SIZE, ENTRANCE_DELAYS, DEFAULT_THEME } from "./constants";
import DetailPanel from "./DetailPanel";
import Legend from "./Legend";

function nodeRadius(d, centerId) {
  if (d.id === centerId) return NODE_SIZE.centerRadius;
  if (d.featured) return Math.max(d.size * NODE_SIZE.featuredScale, NODE_SIZE.featuredMin);
  return Math.max(d.size * NODE_SIZE.defaultScale, NODE_SIZE.defaultMin);
}

function nodeColor(d, types) {
  return types[d.type]?.color || "#607d8b";
}

function entranceDelay(d, centerId) {
  if (d.id === centerId) return ENTRANCE_DELAYS.center;
  if (d.featured) return ENTRANCE_DELAYS.featured;
  if (d.size >= 12) return ENTRANCE_DELAYS.large;
  if (d.size >= 9) return ENTRANCE_DELAYS.medium;
  return ENTRANCE_DELAYS.small;
}

function defaultLabelOpacity(d) {
  if (d.featured) return 0.9;
  if (d.size >= 12) return 0.6;
  if (d.size >= 9) return 0.35;
  return 0;
}

export default function NetworkGraph({
  nodes: nodesProp,
  edges: edgesProp,
  centerId,
  types,
  relColors,
  onNodeClick,
  onPanelNavigate,
  themeVideos,
  theme: themeProp,
  className,
}) {
  const wrapRef = useRef(null);
  const svgRef = useRef(null);
  const simRef = useRef(null);
  const nodesRef = useRef([]);
  const edgesRef = useRef([]);
  const adjacencyRef = useRef(new Map());

  const [selectedNode, setSelectedNode] = useState(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [activeTypes, setActiveTypes] = useState(() => new Set(Object.keys(types)));
  const [tooltipData, setTooltipData] = useState(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  const theme = { ...DEFAULT_THEME, ...themeProp };

  // Track D3 selections for hover/filter updates
  const selectionsRef = useRef({});

  const handleToggleType = useCallback((type) => {
    setActiveTypes((prev) => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
  }, []);

  const handleNodeClick = useCallback((d) => {
    setSelectedNode(d);
    setPanelOpen(true);
  }, []);

  const handlePanelClose = useCallback(() => {
    setPanelOpen(false);
    setSelectedNode(null);
  }, []);

  const handlePanelNavigate = useCallback((nodeId) => {
    const node = nodesRef.current.find((n) => n.id === nodeId);
    if (node) {
      setSelectedNode(node);
      onPanelNavigate?.(nodeId);
    }
  }, [onPanelNavigate]);

  // ─── D3 INITIALIZATION ───
  useEffect(() => {
    if (!svgRef.current || !wrapRef.current || !nodesProp.length) return;

    const wrap = wrapRef.current;
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const W = wrap.clientWidth;
    const H = wrap.clientHeight;
    svg.attr("width", W).attr("height", H);

    const container = svg.append("g");

    // Zoom
    const zoom = d3.zoom().scaleExtent([0.2, 4]).on("zoom", (e) => {
      container.attr("transform", e.transform);
    });
    svg.call(zoom);
    svg.on("click", () => {
      handlePanelClose();
    });

    // Deep copy data
    const nodes = nodesProp.map((d) => ({ ...d }));
    const edges = edgesProp.map((d) => ({ ...d }));
    nodesRef.current = nodes;
    edgesRef.current = edges;

    // Build adjacency
    const adjacency = new Map();
    nodes.forEach((n) => adjacency.set(n.id, new Set()));
    edges.forEach((e) => {
      const sid = typeof e.source === "object" ? e.source.id : e.source;
      const tid = typeof e.target === "object" ? e.target.id : e.target;
      if (adjacency.has(sid)) adjacency.get(sid).add(tid);
      if (adjacency.has(tid)) adjacency.get(tid).add(sid);
    });
    adjacencyRef.current = adjacency;

    // ─── FORCE SIMULATION ───
    const simulation = d3
      .forceSimulation(nodes)
      .force(
        "link",
        d3
          .forceLink(edges)
          .id((d) => d.id)
          .distance((d) => {
            const s = typeof d.source === "object" ? d.source : nodes.find((n) => n.id === d.source);
            const t = typeof d.target === "object" ? d.target : nodes.find((n) => n.id === d.target);
            if (s && t && s.featured && t.featured) return FORCE_CONFIG.linkDistance.featuredToFeatured;
            if (d.rel === "INFLUENCED_BY") return FORCE_CONFIG.linkDistance.influenced;
            return FORCE_CONFIG.linkDistance.default;
          })
          .strength(FORCE_CONFIG.linkStrength)
      )
      .force(
        "charge",
        d3.forceManyBody().strength((d) => {
          if (d.id === centerId) return FORCE_CONFIG.charge.center;
          if (d.featured) return FORCE_CONFIG.charge.featured;
          if (d.size >= 12) return FORCE_CONFIG.charge.large;
          return FORCE_CONFIG.charge.default;
        })
      )
      .force("center", d3.forceCenter(W / 2, H / 2))
      .force(
        "collision",
        d3.forceCollide().radius((d) => nodeRadius(d, centerId) + FORCE_CONFIG.collision.padding)
      )
      .force("x", d3.forceX(W / 2).strength(FORCE_CONFIG.center.xStrength))
      .force("y", d3.forceY(H / 2).strength(FORCE_CONFIG.center.yStrength))
      .alphaDecay(FORCE_CONFIG.alphaDecay)
      .velocityDecay(FORCE_CONFIG.velocityDecay)
      .alpha(1);

    simRef.current = simulation;

    // ─── RENDERING ───

    // Links
    const linkG = container.append("g");
    const linkElements = linkG
      .selectAll("line")
      .data(edges)
      .enter()
      .append("line")
      .attr("stroke", (d) => relColors[d.rel] || "#d1d5db")
      .attr("stroke-width", (d) => {
        const sid = typeof d.source === "object" ? d.source.id : d.source;
        const tid = typeof d.target === "object" ? d.target.id : d.target;
        if (sid === centerId || tid === centerId) return 2;
        if (d.rel === "COLLABORATED" || d.rel === "CO_CREATED") return 1.5;
        return 0.8;
      })
      .attr("stroke-opacity", 0);

    // Link labels
    const linkLabelG = container.append("g");
    const linkLabels = linkLabelG
      .selectAll("text")
      .data(edges)
      .enter()
      .append("text")
      .text((d) => d.label)
      .attr("font-size", "8px")
      .attr("font-family", "DM Sans, sans-serif")
      .attr("fill", (d) => relColors[d.rel] || "#556")
      .attr("text-anchor", "middle")
      .attr("dy", -4)
      .attr("opacity", 0)
      .style("pointer-events", "none");

    // Node auras (featured)
    const auraG = container.append("g");
    nodes
      .filter((d) => d.featured)
      .forEach((d) => {
        auraG
          .append("circle")
          .datum(d)
          .attr("r", nodeRadius(d, centerId) * NODE_SIZE.auraScale)
          .attr("fill", "none")
          .attr("stroke", nodeColor(d, types))
          .attr("stroke-width", 0.5)
          .attr("stroke-opacity", 0)
          .attr("class", "aura");
      });

    // Nodes
    const nodeG = container.append("g");
    const nodeElements = nodeG
      .selectAll("circle")
      .data(nodes)
      .enter()
      .append("circle")
      .attr("r", (d) => nodeRadius(d, centerId))
      .attr("fill", (d) => nodeColor(d, types))
      .attr("stroke", (d) => (d.featured ? nodeColor(d, types) : "#d1d5db"))
      .attr("stroke-width", (d) => (d.featured ? 2 : 0.5))
      .attr("opacity", 0)
      .style("cursor", "pointer")
      .call(
        d3
          .drag()
          .on("start", (event, d) => {
            if (!event.active) simulation.alphaTarget(0.08).restart();
            d.fx = d.x;
            d.fy = d.y;
          })
          .on("drag", (event, d) => {
            d.fx = event.x;
            d.fy = event.y;
          })
          .on("end", (event, d) => {
            if (!event.active) simulation.alphaTarget(0);
            d.fx = null;
            d.fy = null;
          })
      )
      .on("click", (e, d) => {
        e.stopPropagation();
        handleNodeClick(d);
        highlightNeighborhood(d);
      })
      .on("mouseover", (e, d) => {
        highlightNeighborhood(d);
        const rect = wrap.getBoundingClientRect();
        setTooltipData(d);
        setTooltipPos({ x: e.clientX - rect.left + 14, y: e.clientY - rect.top - 10 });
      })
      .on("mouseout", () => {
        clearHighlight();
        setTooltipData(null);
      });

    // Labels
    const labelG = container.append("g");
    const labelElements = labelG
      .selectAll("text")
      .data(nodes)
      .enter()
      .append("text")
      .text((d) => d.name)
      .attr("font-size", (d) => {
        if (d.id === centerId) return "14px";
        if (d.featured) return "12px";
        if (d.size >= 12) return "10px";
        return "9px";
      })
      .attr("font-weight", (d) => (d.featured || d.id === centerId ? "800" : "500"))
      .attr("fill", theme.labelColor)
      .attr("text-anchor", "middle")
      .attr("dy", (d) => nodeRadius(d, centerId) + 14)
      .attr("opacity", 0)
      .style("pointer-events", "none");

    // Store selections for hover/filter
    selectionsRef.current = {
      nodeElements,
      labelElements,
      linkElements,
      linkLabels,
      container,
      zoom,
      svg,
    };

    // ─── ENTRANCE ANIMATION ───
    nodeElements
      .transition()
      .delay((d) => entranceDelay(d, centerId))
      .duration(600)
      .attr("opacity", 1);

    labelElements
      .transition()
      .delay((d) => entranceDelay(d, centerId) + 200)
      .duration(500)
      .attr("opacity", (d) => defaultLabelOpacity(d));

    linkElements
      .transition()
      .delay(ENTRANCE_DELAYS.edges)
      .duration(800)
      .attr("stroke-opacity", (d) => {
        const sid = d.source.id || d.source;
        const tid = d.target.id || d.target;
        if (sid === centerId || tid === centerId) return 0.6;
        return 0.3;
      });

    container
      .selectAll(".aura")
      .transition()
      .delay((d) => entranceDelay(d, centerId) + 400)
      .duration(1000)
      .attr("stroke-opacity", 0.25);

    // ─── TICK ───
    simulation.on("tick", () => {
      linkElements
        .attr("x1", (d) => d.source.x)
        .attr("y1", (d) => d.source.y)
        .attr("x2", (d) => d.target.x)
        .attr("y2", (d) => d.target.y);
      linkLabels
        .attr("x", (d) => (d.source.x + d.target.x) / 2)
        .attr("y", (d) => (d.source.y + d.target.y) / 2);
      nodeElements.attr("cx", (d) => d.x).attr("cy", (d) => d.y);
      labelElements.attr("x", (d) => d.x).attr("y", (d) => d.y);
      container.selectAll(".aura").attr("cx", (d) => d.x).attr("cy", (d) => d.y);
    });

    // ─── HOVER FUNCTIONS ───
    function highlightNeighborhood(d) {
      const neighbors = adjacency.get(d.id) || new Set();

      nodeElements
        .transition()
        .duration(200)
        .attr("opacity", (n) => (n.id === d.id || neighbors.has(n.id) ? 1 : 0.08));

      labelElements
        .transition()
        .duration(200)
        .attr("opacity", (n) => {
          if (n.id === d.id) return 1;
          if (neighbors.has(n.id)) return 0.85;
          return 0;
        });

      linkElements
        .transition()
        .duration(200)
        .attr("stroke-opacity", (l) => {
          const sid = l.source.id;
          const tid = l.target.id;
          if (sid === d.id || tid === d.id) return 0.8;
          return 0.03;
        })
        .attr("stroke-width", (l) => {
          const sid = l.source.id;
          const tid = l.target.id;
          if (sid === d.id || tid === d.id) return 2.5;
          return 0.5;
        });

      linkLabels
        .transition()
        .duration(200)
        .attr("opacity", (l) => {
          const sid = l.source.id;
          const tid = l.target.id;
          return sid === d.id || tid === d.id ? 0.7 : 0;
        });

      container
        .selectAll(".aura")
        .transition()
        .duration(200)
        .attr("stroke-opacity", (a) => (a.id === d.id || neighbors.has(a.id) ? 0.2 : 0.02));
    }

    function clearHighlight() {
      nodeElements.transition().duration(400).attr("opacity", 1);
      labelElements
        .transition()
        .duration(400)
        .attr("opacity", (d) => defaultLabelOpacity(d));
      linkElements
        .transition()
        .duration(400)
        .attr("stroke-opacity", (d) => {
          const s = d.source.id;
          const t = d.target.id;
          if (s === centerId || t === centerId) return 0.6;
          return 0.3;
        })
        .attr("stroke-width", (d) => {
          if (d.source.id === centerId || d.target.id === centerId) return 2;
          if (d.rel === "COLLABORATED" || d.rel === "CO_CREATED") return 1.5;
          return 0.8;
        });
      linkLabels.transition().duration(400).attr("opacity", 0);
      container.selectAll(".aura").transition().duration(400).attr("stroke-opacity", 0.25);
    }

    // ─── RESIZE ───
    function handleResize() {
      const w = wrap.clientWidth;
      const h = wrap.clientHeight;
      svg.attr("width", w).attr("height", h);
      simulation.force("center", d3.forceCenter(w / 2, h / 2));
      simulation.force("x", d3.forceX(w / 2).strength(FORCE_CONFIG.center.xStrength));
      simulation.force("y", d3.forceY(h / 2).strength(FORCE_CONFIG.center.yStrength));
      simulation.alpha(FORCE_CONFIG.resizeAlpha).restart();
    }
    window.addEventListener("resize", handleResize);

    return () => {
      simulation.stop();
      window.removeEventListener("resize", handleResize);
    };
  }, [nodesProp, edgesProp, centerId, types, relColors, theme.labelColor, handleNodeClick, handlePanelClose]);

  // ─── PANEL OPEN/CLOSE → GRAPH COMPRESSION ───
  useEffect(() => {
    const sim = simRef.current;
    const wrap = wrapRef.current;
    if (!sim || !wrap) return;

    const timeout = setTimeout(() => {
      const w = wrap.clientWidth;
      const h = wrap.clientHeight;

      if (panelOpen) {
        const cx = w * 0.5;
        const cy = h * 0.48;
        sim.force("center", d3.forceCenter(cx, cy));
        sim.force("x", d3.forceX(cx).strength(FORCE_CONFIG.center.compressedStrength));
        sim.force("y", d3.forceY(cy).strength(FORCE_CONFIG.center.compressedStrength));
        sim.force(
          "collision",
          d3.forceCollide().radius((d) => nodeRadius(d, centerId) + FORCE_CONFIG.collision.compressedPadding)
        );
        sim.alpha(FORCE_CONFIG.panelOpenAlpha).restart();
      } else {
        sim.force("center", d3.forceCenter(w / 2, h / 2));
        sim.force("x", d3.forceX(w / 2).strength(FORCE_CONFIG.center.xStrength));
        sim.force("y", d3.forceY(h / 2).strength(FORCE_CONFIG.center.yStrength));
        sim.force(
          "collision",
          d3.forceCollide().radius((d) => nodeRadius(d, centerId) + FORCE_CONFIG.collision.padding)
        );
        sim.alpha(FORCE_CONFIG.panelCloseAlpha).restart();
      }
    }, 80);

    return () => clearTimeout(timeout);
  }, [panelOpen, centerId]);

  // ─── LEGEND FILTERING ───
  useEffect(() => {
    const s = selectionsRef.current;
    if (!s.nodeElements) return;

    s.nodeElements
      .transition()
      .duration(300)
      .attr("opacity", (d) => (activeTypes.has(d.type) ? 1 : 0.04))
      .style("pointer-events", (d) => (activeTypes.has(d.type) ? "all" : "none"));

    s.labelElements
      .transition()
      .duration(300)
      .attr("opacity", (d) => (activeTypes.has(d.type) ? defaultLabelOpacity(d) : 0));

    s.linkElements
      .transition()
      .duration(300)
      .attr("stroke-opacity", (d) => {
        const sv = activeTypes.has(d.source.type);
        const tv = activeTypes.has(d.target.type);
        if (sv && tv) {
          if (d.source.id === centerId || d.target.id === centerId) return 0.6;
          return 0.3;
        }
        return 0.02;
      });

    s.container
      ?.selectAll(".aura")
      .transition()
      .duration(300)
      .attr("stroke-opacity", (d) => (activeTypes.has(d.type) ? 0.25 : 0));
  }, [activeTypes, centerId]);

  const visibleCount = nodesProp.filter((n) => activeTypes.has(n.type)).length;

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        overflow: "hidden",
        fontFamily: "'DM Sans', sans-serif",
      }}
      className={className}
    >
      {/* Graph area */}
      <div
        ref={wrapRef}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          bottom: 0,
          right: panelOpen ? "32%" : 0,
          transition: "right 0.5s cubic-bezier(0.16,1,0.3,1)",
          background: theme.bg,
          backgroundImage: `radial-gradient(circle, ${theme.dotGrid} 0.5px, transparent 0.5px)`,
          backgroundSize: "24px 24px",
        }}
      >
        <svg ref={svgRef} style={{ display: "block", width: "100%", height: "100%" }} />
      </div>

      {/* Tooltip */}
      {tooltipData && (
        <div
          style={{
            position: "absolute",
            left: tooltipPos.x,
            top: tooltipPos.y,
            zIndex: 200,
            pointerEvents: "none",
            background: theme.tooltipBg,
            backdropFilter: "blur(16px)",
            WebkitBackdropFilter: "blur(16px)",
            border: `1px solid ${theme.panelBorder}`,
            borderRadius: 10,
            padding: "10px 14px",
            maxWidth: 240,
            boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
          }}
        >
          <div
            style={{
              fontSize: 8,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              padding: "2px 6px",
              borderRadius: 3,
              display: "inline-block",
              marginBottom: 4,
              color: nodeColor(tooltipData, types),
              background: nodeColor(tooltipData, types) + "18",
            }}
          >
            {types[tooltipData.type]?.label || tooltipData.type}
          </div>
          <div style={{ fontSize: 13, fontWeight: 700, color: theme.text, marginBottom: 2 }}>
            {tooltipData.name}
          </div>
          <div style={{ fontSize: 11, color: theme.textMuted, lineHeight: 1.45 }}>
            {tooltipData.subtitle || ""}
          </div>
          <div style={{ fontSize: 9, color: theme.textDim, marginTop: 6, fontStyle: "italic" }}>
            Click for details
          </div>
        </div>
      )}

      {/* Legend */}
      <Legend
        types={types}
        activeTypes={activeTypes}
        onToggle={handleToggleType}
        nodeCount={nodesProp.length}
        visibleCount={visibleCount}
        edgeCount={edgesProp.length}
        theme={theme}
      />

      {/* Detail Panel */}
      <DetailPanel
        node={selectedNode}
        edges={edgesRef.current}
        nodes={nodesRef.current}
        types={types}
        relColors={relColors}
        onClose={handlePanelClose}
        onNavigate={handlePanelNavigate}
        onEntityTap={onNodeClick}
        theme={theme}
        themeVideos={themeVideos}
        open={panelOpen}
      />

      {/* Reset button */}
      <button
        onClick={() => {
          handlePanelClose();
          setActiveTypes(new Set(Object.keys(types)));
          const s = selectionsRef.current;
          if (s.svg && s.zoom) {
            s.svg.transition().duration(500).call(s.zoom.transform, d3.zoomIdentity);
          }
        }}
        style={{
          position: "absolute",
          bottom: 12,
          right: panelOpen ? "calc(32% + 16px)" : 16,
          fontSize: 10,
          fontWeight: 600,
          color: theme.textDim,
          cursor: "pointer",
          zIndex: 50,
          border: `1px solid ${theme.panelBorder}`,
          background: "rgba(255,255,255,0.9)",
          padding: "5px 12px",
          borderRadius: 6,
          fontFamily: "'DM Sans', sans-serif",
          transition: "all 0.3s",
        }}
      >
        ⌂ Reset
      </button>
    </div>
  );
}
