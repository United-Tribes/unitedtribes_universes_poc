import { useRef, useEffect, useState, useCallback } from "react";
import * as d3 from "d3";
import { FORCE_CONFIG, SMART_FORCE_CONFIG, NODE_SIZE, ENTRANCE_DELAYS, DEFAULT_THEME, CLUSTER_CONFIG, HUB_ORDER } from "./constants";
import DetailPanel from "./DetailPanel";
import Legend from "./Legend";

function nodeRadius(d, centerId) {
  if (d.id === centerId) return NODE_SIZE.centerRadius;
  if (d.isHub) return NODE_SIZE.hubRadius;
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
  smartCamera = false,
  focusNodeId,
  activeHubType,
  onNodeFocus,
}) {
  const wrapRef = useRef(null);
  const svgRef = useRef(null);
  const simRef = useRef(null);
  const nodesRef = useRef([]);
  const edgesRef = useRef([]);
  const adjacencyRef = useRef(new Map());
  const smartCameraRef = useRef(smartCamera);
  smartCameraRef.current = smartCamera;
  const onNodeFocusRef = useRef(onNodeFocus);
  onNodeFocusRef.current = onNodeFocus;
  const overviewActiveRef = useRef(false);
  const settleTimerRef = useRef(null);
  const initialAnimatingRef = useRef(false);
  const pendingClickRef = useRef(null);
  const selectedNodeRef = useRef(null);
  const zoomToFitRef = useRef(null);
  const zoomToNodeRef = useRef(null);

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
    selectedNodeRef.current = d;
    setPanelOpen(true);
  }, []);

  const handlePanelClose = useCallback(() => {
    setPanelOpen(false);
    setSelectedNode(null);
    selectedNodeRef.current = null;
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
      pendingClickRef.current = null;
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

    // ─── COMPUTE HUB TARGETS (smartCamera) ───
    const FC = smartCameraRef.current ? SMART_FORCE_CONFIG : FORCE_CONFIG;
    const hubRadius = Math.min(W, H) * 0.28;
    const hubTargets = new Map(); // hubId → {x, y}

    if (smartCameraRef.current) {
      // Pin ONLY center node — everything else stays free for organic settling
      const centerNode = nodes.find((n) => n.id === centerId);
      if (centerNode) {
        centerNode.fx = W / 2;
        centerNode.fy = H / 2;
        centerNode.x = W / 2;
        centerNode.y = H / 2;
      }

      // Compute where hubs will end up (ring positions) — but don't pin yet
      const hubNodes = nodes.filter((n) => n.isHub);
      hubNodes.sort((a, b) => {
        const ai = HUB_ORDER.findIndex((prefix) => a.name.startsWith(prefix));
        const bi = HUB_ORDER.findIndex((prefix) => b.name.startsWith(prefix));
        return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
      });
      const startAngle = -Math.PI / 2;
      hubNodes.forEach((hub, i) => {
        const angle = startAngle + (2 * Math.PI * i) / hubNodes.length;
        hubTargets.set(hub.id, {
          x: W / 2 + hubRadius * Math.cos(angle),
          y: H / 2 + hubRadius * Math.sin(angle),
        });
        // No fx/fy, no pre-positioning — let D3 place them organically
      });
    }

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
            if (s && t && s.featured && t.featured) return FC.linkDistance.featuredToFeatured;
            if (d.rel === "INFLUENCED_BY") return FC.linkDistance.influenced;
            return FC.linkDistance.default;
          })
          .strength(FC.linkStrength)
      )
      .force(
        "charge",
        d3.forceManyBody().strength((d) => {
          if (d.id === centerId) return FC.charge.center;
          if (d.featured) return FC.charge.featured;
          if (d.size >= 12) return FC.charge.large;
          return FC.charge.default;
        })
      )
      .force("center", d3.forceCenter(W / 2, H / 2))
      .force(
        "collision",
        d3.forceCollide().radius((d) => nodeRadius(d, centerId) + FC.collision.padding)
      )
      .force("x", d3.forceX(W / 2).strength(FC.center.xStrength))
      .force("y", d3.forceY(H / 2).strength(FC.center.yStrength))
      .alphaDecay(FC.alphaDecay)
      .velocityDecay(FC.velocityDecay)
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
            // In smartCamera, keep center/hub pinned where dropped
            if (smartCameraRef.current && (d.id === centerId || d.isHub)) return;
            d.fx = null;
            d.fy = null;
          })
      )
      .on("click", (e, d) => {
        e.stopPropagation();

        // smartCamera=false → original behavior
        if (!smartCameraRef.current) {
          handleNodeClick(d);
          highlightNeighborhood(d);
          return;
        }

        // smartCamera=true, center node → close panel, show pathway overview
        if (d.id === centerId) {
          handlePanelClose();
          applyPathwayOverview();
          overviewActiveRef.current = true;
          pendingClickRef.current = centerId;
          onNodeFocusRef.current?.(null);
          // Small delay to let panel close transition start, then zoom to fit
          setTimeout(() => zoomToPathwayCluster(800), 100);
          return;
        }

        // smartCamera=true, other nodes → two-tap pattern
        if (pendingClickRef.current === d.id) {
          // Second click on same node → open panel
          pendingClickRef.current = null;
          handleNodeClick(d);
          highlightNeighborhood(d);
        } else {
          // First click (or different node) → highlight + zoom to fit neighborhood
          pendingClickRef.current = d.id;
          highlightWithCluster(d);
          zoomToNeighborhood(d);
          onNodeFocusRef.current?.(d.id);
        }
      })
      .on("mouseover", (e, d) => {
        highlightNeighborhood(d);
        if (!smartCameraRef.current) {
          const rect = wrap.getBoundingClientRect();
          setTooltipData(d);
          setTooltipPos({ x: e.clientX - rect.left + 14, y: e.clientY - rect.top - 10 });
        }
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
        if (d.isHub) return "12px";
        if (d.featured) return "12px";
        if (d.size >= 12) return "10px";
        return "9px";
      })
      .attr("font-weight", (d) => (d.isHub || d.featured || d.id === centerId ? "800" : "500"))
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

    // ─── PATHWAY OVERVIEW SETTLE (smartCamera) ───
    const pathwayNodeIds = new Set(
      nodes.filter((n) => n.id === centerId || n.isHub).map((n) => n.id)
    );

    function applyPathwayOverview() {
      nodeElements
        .transition()
        .duration(CLUSTER_CONFIG.fadeDuration)
        .attr("opacity", (n) => pathwayNodeIds.has(n.id) ? 1 : CLUSTER_CONFIG.spokeDimOpacity);

      labelElements
        .transition()
        .duration(CLUSTER_CONFIG.fadeDuration)
        .attr("opacity", (n) => pathwayNodeIds.has(n.id) ? defaultLabelOpacity(n) : CLUSTER_CONFIG.spokeDimLabelOpacity);

      linkElements
        .transition()
        .duration(CLUSTER_CONFIG.fadeDuration)
        .attr("stroke-opacity", (l) => {
          const sid = l.source.id || l.source;
          const tid = l.target.id || l.target;
          const bothPathway = pathwayNodeIds.has(sid) && pathwayNodeIds.has(tid);
          if (bothPathway) {
            if (sid === centerId || tid === centerId) return 0.6;
            return 0.3;
          }
          return CLUSTER_CONFIG.spokeDimLinkOpacity;
        });

      container
        .selectAll(".aura")
        .transition()
        .duration(CLUSTER_CONFIG.fadeDuration)
        .attr("stroke-opacity", (a) => pathwayNodeIds.has(a.id) ? 0.25 : 0.12);
    }

    // ─── zoomToNodeSet: fit a set of nodes in viewport with padding ───
    function zoomToNodeSet(targetNodes, pad, duration, maxScale) {
      if (!targetNodes.length) return;
      // Use current wrapper dimensions (accounts for open/closed drawer)
      const curW = wrap.clientWidth;
      const curH = wrap.clientHeight;
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      targetNodes.forEach((n) => {
        const r = nodeRadius(n, centerId) + 16;
        if (n.x - r < minX) minX = n.x - r;
        if (n.y - r < minY) minY = n.y - r;
        if (n.x + r > maxX) maxX = n.x + r;
        if (n.y + r > maxY) maxY = n.y + r;
      });
      const bw = maxX - minX + pad * 2;
      const bh = maxY - minY + pad * 2;
      const scale = Math.min(curW / bw, curH / bh, maxScale || 1.8);
      const cx = (minX + maxX) / 2;
      const cy = (minY + maxY) / 2;
      const tx = curW / 2 - cx * scale;
      const ty = curH / 2 - cy * scale;
      svg
        .transition()
        .duration(duration || 800)
        .ease(d3.easeCubicInOut)
        .call(zoom.transform, d3.zoomIdentity.translate(tx, ty).scale(scale));
    }

    // ─── zoomToNeighborhood: fit clicked node + its neighbors ───
    function zoomToNeighborhood(d) {
      const neighbors = adjacency.get(d.id) || new Set();
      const targetNodes = nodes.filter((n) => n.id === d.id || neighbors.has(n.id));
      zoomToNodeSet(targetNodes, 60, 700, 1.6);
    }

    // ─── zoomToPathwayCluster: fit center + hub nodes in viewport ───
    function zoomToPathwayCluster(duration) {
      const clusterNodes = nodes.filter((n) => pathwayNodeIds.has(n.id));
      zoomToNodeSet(clusterNodes, 80, duration || 1800, 1.2);
    }

    // No auto-fade on load — spokes only dim when user clicks Pluribus

    // ─── SMOOTH TRANSITION to pathway layout (smartCamera) ───
    // After organic settling (~2.5s), smoothly lerp hubs from wherever
    // they naturally landed to their ring targets over 1.5s.
    // Spokes follow via link forces. Pathways emerge from chaos.
    if (smartCameraRef.current && hubTargets.size > 0) {
      initialAnimatingRef.current = true;
      settleTimerRef.current = setTimeout(() => {
        const lerpDuration = 1500;
        const startTime = performance.now();
        // Snapshot each hub's current organic position
        const hubStarts = new Map();
        nodes.forEach((n) => {
          if (hubTargets.has(n.id)) {
            hubStarts.set(n.id, { x: n.x, y: n.y });
            // Pin at current position first (no visual change)
            n.fx = n.x;
            n.fy = n.y;
          }
        });

        function lerpStep(now) {
          const t = Math.min((now - startTime) / lerpDuration, 1);
          // Ease-in-out (smooth start and end)
          const e = t < 0.5
            ? 4 * t * t * t
            : 1 - Math.pow(-2 * t + 2, 3) / 2;

          nodes.forEach((n) => {
            const tgt = hubTargets.get(n.id);
            const start = hubStarts.get(n.id);
            if (tgt && start) {
              n.fx = start.x + (tgt.x - start.x) * e;
              n.fy = start.y + (tgt.y - start.y) * e;
            }
          });
          // Keep simulation warm so spokes follow their hubs
          simulation.alpha(Math.max(0.1, 0.2 * (1 - t))).restart();

          if (t < 1) {
            requestAnimationFrame(lerpStep);
          } else {
            // Transition done — let simulation decay naturally
            simulation.alphaTarget(0);
            initialAnimatingRef.current = false;
          }
        }
        requestAnimationFrame(lerpStep);
      }, 2500);
    }

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
    // Cluster-aware highlight: if d connects to a hub, keep entire hub cluster visible
    function highlightWithCluster(d) {
      const myNeighbors = adjacency.get(d.id) || new Set();
      let connectedHub = null;
      myNeighbors.forEach(nid => {
        const neighbor = nodes.find(n => n.id === nid);
        if (neighbor && neighbor.isHub) connectedHub = neighbor;
      });
      if (connectedHub) {
        const hubNeighbors = adjacency.get(connectedHub.id) || new Set();
        const clusterSet = new Set([d.id, connectedHub.id, ...hubNeighbors]);
        nodeElements.transition().duration(200)
          .attr("opacity", (n) => clusterSet.has(n.id) ? 1 : 0.08);
        labelElements.transition().duration(200)
          .attr("opacity", (n) => {
            if (n.id === d.id) return 1;
            if (clusterSet.has(n.id)) return 0.85;
            return 0;
          });
        linkElements.transition().duration(200)
          .attr("stroke-opacity", (l) => {
            const sid = l.source.id;
            const tid = l.target.id;
            if (clusterSet.has(sid) && clusterSet.has(tid)) return 0.8;
            return 0.03;
          })
          .attr("stroke-width", (l) => {
            const sid = l.source.id;
            const tid = l.target.id;
            if (sid === d.id || tid === d.id) return 2.5;
            if (clusterSet.has(sid) && clusterSet.has(tid)) return 1.5;
            return 0.5;
          });
        linkLabels.transition().duration(200)
          .attr("opacity", (l) => {
            const sid = l.source.id;
            const tid = l.target.id;
            if (sid === d.id || tid === d.id) return 0.7;
            if (clusterSet.has(sid) && clusterSet.has(tid)) return 0.4;
            return 0;
          });
        container.selectAll(".aura").transition().duration(200)
          .attr("stroke-opacity", (a) => clusterSet.has(a.id) ? 0.2 : 0.02);
        return;
      }
      highlightNeighborhood(d);
    }

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
      // In smartCamera, keep focused/selected node's neighborhood highlighted
      if (smartCameraRef.current) {
        // Panel open → keep selected node highlighted
        if (selectedNodeRef.current) {
          highlightWithCluster(selectedNodeRef.current);
          return;
        }
        // Clicked a node (hub, spoke, etc.) → keep its neighborhood lit
        if (pendingClickRef.current) {
          // If pending is center and overview is active, restore overview
          if (pendingClickRef.current === centerId && overviewActiveRef.current) {
            applyPathwayOverview();
            linkElements
              .transition()
              .duration(400)
              .attr("stroke-width", (d) => {
                if (d.source.id === centerId || d.target.id === centerId) return 2;
                if (d.rel === "COLLABORATED" || d.rel === "CO_CREATED") return 1.5;
                return 0.8;
              });
            linkLabels.transition().duration(400).attr("opacity", 0);
            return;
          }
          // Otherwise keep clicked node's cluster highlighted
          const focusNode = nodes.find((n) => n.id === pendingClickRef.current);
          if (focusNode) {
            highlightWithCluster(focusNode);
            return;
          }
        }
        // No click active but overview is on → restore overview
        if (overviewActiveRef.current) {
          applyPathwayOverview();
          linkElements
            .transition()
            .duration(400)
            .attr("stroke-width", (d) => {
              if (d.source.id === centerId || d.target.id === centerId) return 2;
              if (d.rel === "COLLABORATED" || d.rel === "CO_CREATED") return 1.5;
              return 0.8;
            });
          linkLabels.transition().duration(400).attr("opacity", 0);
          return;
        }
      }

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
      simulation.force("x", d3.forceX(w / 2).strength(FC.center.xStrength));
      simulation.force("y", d3.forceY(h / 2).strength(FC.center.yStrength));
      simulation.alpha(FC.resizeAlpha).restart();
    }
    window.addEventListener("resize", handleResize);

    // ─── CONTAINER RESIZE OBSERVER (smooth refit for smartCamera) ───
    let resizeObserver;
    if (typeof ResizeObserver !== "undefined") {
      resizeObserver = new ResizeObserver(() => {
        const w = wrap.clientWidth;
        const h = wrap.clientHeight;
        if (w === 0 || h === 0) return;
        svg.attr("width", w).attr("height", h);
        if (initialAnimatingRef.current) return;
        if (smartCameraRef.current) {
          // Refit to selected node's neighborhood, or pathway cluster if nothing selected
          let targetNodes;
          const focusId = selectedNodeRef.current?.id || pendingClickRef.current;
          if (focusId && focusId !== centerId) {
            const neighbors = adjacency.get(focusId) || new Set();
            targetNodes = nodes.filter((n) => n.id === focusId || neighbors.has(n.id));
          } else {
            targetNodes = nodes.filter((n) => pathwayNodeIds.has(n.id));
          }
          if (!targetNodes.length) return;
          const pad = focusId && focusId !== centerId ? 60 : 80;
          let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
          targetNodes.forEach((n) => {
            const r = nodeRadius(n, centerId) + 16;
            if (n.x - r < minX) minX = n.x - r;
            if (n.y - r < minY) minY = n.y - r;
            if (n.x + r > maxX) maxX = n.x + r;
            if (n.y + r > maxY) maxY = n.y + r;
          });
          const bw = maxX - minX + pad * 2;
          const bh = maxY - minY + pad * 2;
          const scale = Math.min(w / bw, h / bh, 1.2);
          const cx = (minX + maxX) / 2;
          const cy = (minY + maxY) / 2;
          const tx = w / 2 - cx * scale;
          const ty = h / 2 - cy * scale;
          svg.call(zoom.transform, d3.zoomIdentity.translate(tx, ty).scale(scale));
        }
      });
      resizeObserver.observe(wrap);
    }

    // Store a zoom-to-fit function for Reset button
    zoomToFitRef.current = (duration) => {
      const w = wrap.clientWidth;
      const h = wrap.clientHeight;
      if (!w || !h) return;
      const clusterNodes = nodes.filter((n) => pathwayNodeIds.has(n.id));
      if (!clusterNodes.length) return;
      const pad = 80;
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      clusterNodes.forEach((n) => {
        const r = nodeRadius(n, centerId) + 16;
        if (n.x - r < minX) minX = n.x - r;
        if (n.y - r < minY) minY = n.y - r;
        if (n.x + r > maxX) maxX = n.x + r;
        if (n.y + r > maxY) maxY = n.y + r;
      });
      const bw = maxX - minX + pad * 2;
      const bh = maxY - minY + pad * 2;
      const scale = Math.min(w / bw, h / bh, 1.2);
      const cx = (minX + maxX) / 2;
      const cy = (minY + maxY) / 2;
      const tx = w / 2 - cx * scale;
      const ty = h / 2 - cy * scale;
      svg.transition().duration(duration || 500).ease(d3.easeCubicInOut)
        .call(zoom.transform, d3.zoomIdentity.translate(tx, ty).scale(scale));
    };

    // Store a zoom-to-node function for external focusNodeId changes
    // If the node connects to a hub, zoom to the full hub cluster
    zoomToNodeRef.current = (nodeId) => {
      const node = nodes.find((n) => n.id === nodeId);
      if (!node) return;
      highlightWithCluster(node);

      // Check if this node connects to a hub — if so, zoom to full cluster
      const myNeighbors = adjacency.get(node.id) || new Set();
      let connectedHub = null;
      myNeighbors.forEach(nid => {
        const neighbor = nodes.find(n => n.id === nid);
        if (neighbor && neighbor.isHub) connectedHub = neighbor;
      });

      if (connectedHub) {
        const hubNeighbors = adjacency.get(connectedHub.id) || new Set();
        const clusterNodes = nodes.filter(n =>
          n.id === node.id || n.id === connectedHub.id || hubNeighbors.has(n.id)
        );
        zoomToNodeSet(clusterNodes, 60, 700, 1.6);
      } else {
        zoomToNeighborhood(node);
      }
    };

    return () => {
      simulation.stop();
      window.removeEventListener("resize", handleResize);
      if (resizeObserver) resizeObserver.disconnect();
      if (settleTimerRef.current) clearTimeout(settleTimerRef.current);
      overviewActiveRef.current = false;
    };
  }, [nodesProp, edgesProp, centerId, types, relColors, theme.labelColor, handleNodeClick, handlePanelClose]);

  // ─── PANEL OPEN/CLOSE → GRAPH COMPRESSION ───
  useEffect(() => {
    const sim = simRef.current;
    const wrap = wrapRef.current;
    if (!sim || !wrap) return;

    const FC = smartCameraRef.current ? SMART_FORCE_CONFIG : FORCE_CONFIG;

    const timeout = setTimeout(() => {
      const w = wrap.clientWidth;
      const h = wrap.clientHeight;

      if (smartCameraRef.current) {
        // In smartCamera, nodes are pinned — use zoom transform to recenter
        const s = selectionsRef.current;
        if (!s.svg || !s.zoom) return;
        const nodes = nodesRef.current;
        const adj = adjacencyRef.current;

        // Pick target nodes: selected node's neighborhood when opening, pathway cluster when closing
        let targetNodes;
        if (panelOpen && selectedNode) {
          const neighbors = adj.get(selectedNode.id) || new Set();
          targetNodes = nodes.filter((n) => n.id === selectedNode.id || neighbors.has(n.id));
        } else {
          targetNodes = nodes.filter((n) => n.id === centerId || n.isHub);
        }
        if (!targetNodes.length) return;

        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        targetNodes.forEach((n) => {
          const r = nodeRadius(n, centerId) + 16;
          if (n.x - r < minX) minX = n.x - r;
          if (n.y - r < minY) minY = n.y - r;
          if (n.x + r > maxX) maxX = n.x + r;
          if (n.y + r > maxY) maxY = n.y + r;
        });
        const pad = 60;
        const bw = maxX - minX + pad * 2;
        const bh = maxY - minY + pad * 2;
        const maxScale = panelOpen ? 1.6 : 1.2;
        const scale = Math.min(w / bw, h / bh, maxScale);
        const cx = (minX + maxX) / 2;
        const cy = (minY + maxY) / 2;
        const tx = w / 2 - cx * scale;
        const ty = h / 2 - cy * scale;
        s.svg
          .transition()
          .duration(600)
          .ease(d3.easeCubicInOut)
          .call(s.zoom.transform, d3.zoomIdentity.translate(tx, ty).scale(scale));
      } else {
        // Original behavior for non-smartCamera
        if (panelOpen) {
          const cx = w * 0.5;
          const cy = h * 0.48;
          sim.force("center", d3.forceCenter(cx, cy));
          sim.force("x", d3.forceX(cx).strength(FC.center.compressedStrength));
          sim.force("y", d3.forceY(cy).strength(FC.center.compressedStrength));
          sim.force(
            "collision",
            d3.forceCollide().radius((d) => nodeRadius(d, centerId) + FC.collision.compressedPadding)
          );
          sim.alpha(FC.panelOpenAlpha).restart();
        } else {
          sim.force("center", d3.forceCenter(w / 2, h / 2));
          sim.force("x", d3.forceX(w / 2).strength(FC.center.xStrength));
          sim.force("y", d3.forceY(h / 2).strength(FC.center.yStrength));
          sim.force(
            "collision",
            d3.forceCollide().radius((d) => nodeRadius(d, centerId) + FC.collision.padding)
          );
          sim.alpha(FC.panelCloseAlpha).restart();
        }
      }
    }, 80);

    return () => clearTimeout(timeout);
  }, [panelOpen, centerId, selectedNode]);

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

  // ─── FOCUS NODE + HUB GLOW (external highlight + zoom from drawer) ───
  // Only active when focusNodeId or activeHubType props are passed (jd-universe tab only)
  const focusEverActive = useRef(false);
  useEffect(() => {
    const s = selectionsRef.current;
    if (!s.nodeElements) return;
    // Skip entirely until a specific focus or hub filter has been activated
    const hasActiveHub = activeHubType && activeHubType !== "all";
    // "all" glows center, but only after user has interacted (not on mount)
    const hasAllActive = activeHubType === "all" && focusEverActive.current;
    if (!focusNodeId && !hasActiveHub && !hasAllActive && !focusEverActive.current) return;
    if (focusNodeId || hasActiveHub) focusEverActive.current = true;

    // Find which node should glow (hub, center for "all", or focused node's hub)
    let glowHubId = null;
    if (hasAllActive && !focusNodeId) {
      glowHubId = centerId;
    } else if (hasActiveHub) {
      s.nodeElements.each(function (d) {
        if (d.isHub && d.type === activeHubType) glowHubId = d.id;
      });
    }
    if (!glowHubId && focusNodeId) {
      const adj = adjacencyRef.current;
      const neighbors = adj.get(focusNodeId) || new Set();
      const allNodes = nodesRef.current;
      neighbors.forEach(nid => {
        const n = allNodes.find(nd => nd.id === nid);
        if (n && n.isHub) glowHubId = n.id;
      });
    }

    if (focusNodeId || glowHubId) {
      s.nodeElements.each(function (d) {
        const el = d3.select(this);
        const baseR = nodeRadius(d, centerId);
        if (d.id === focusNodeId) {
          el.attr("stroke", "rgba(245,184,0,0.55)")
            .attr("stroke-width", 2)
            .style("filter", "drop-shadow(0 0 6px rgba(245,184,0,1)) drop-shadow(0 0 16px rgba(245,184,0,0.7)) drop-shadow(0 0 30px rgba(245,184,0,0.35))")
            .transition().duration(200).attr("r", baseR * 1.35);
        } else if (d.id === glowHubId) {
          el.attr("stroke", "rgba(245,184,0,0.4)")
            .attr("stroke-width", 1.5)
            .style("filter", "drop-shadow(0 0 8px rgba(245,184,0,0.8)) drop-shadow(0 0 20px rgba(245,184,0,0.4)) drop-shadow(0 0 40px rgba(245,184,0,0.2))");
        } else {
          el.attr("stroke", d.featured ? nodeColor(d, types) : "#d1d5db")
            .attr("stroke-width", d.featured ? 2 : 0.5)
            .style("filter", null)
            .transition().duration(200).attr("r", baseR);
        }
      });
      s.labelElements.each(function (d) {
        const defaultWeight = (d.isHub || d.featured || d.id === centerId) ? "800" : "500";
        d3.select(this).attr("font-weight", d.id === focusNodeId ? "800" : defaultWeight);
      });
      if (focusNodeId && zoomToNodeRef.current) {
        zoomToNodeRef.current(focusNodeId);
      } else if (glowHubId && !focusNodeId && zoomToNodeRef.current) {
        zoomToNodeRef.current(glowHubId);
      }
    } else {
      // Only revert if we previously applied focus styles
      s.nodeElements.each(function (d) {
        d3.select(this)
          .attr("stroke", d.featured ? nodeColor(d, types) : "#d1d5db")
          .attr("stroke-width", d.featured ? 2 : 0.5)
          .style("filter", null)
          .transition().duration(200).attr("r", nodeRadius(d, centerId));
      });
      s.labelElements.each(function (d) {
        const defaultWeight = (d.isHub || d.featured || d.id === centerId) ? "800" : "500";
        d3.select(this).attr("font-weight", defaultWeight);
      });
    }
  }, [focusNodeId, activeHubType, types]);

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
          pendingClickRef.current = null;
          overviewActiveRef.current = false;
          setActiveTypes(new Set(Object.keys(types)));
          if (smartCameraRef.current && zoomToFitRef.current) {
            zoomToFitRef.current(500);
          } else {
            const s = selectionsRef.current;
            if (s.svg && s.zoom) {
              s.svg.transition().duration(500).call(s.zoom.transform, d3.zoomIdentity);
            }
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
