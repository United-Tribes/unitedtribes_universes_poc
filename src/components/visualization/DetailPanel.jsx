import { useMemo } from "react";
import { DEFAULT_THEME } from "./constants";

export default function DetailPanel({
  node,
  edges,
  nodes,
  types,
  relColors,
  onClose,
  onNavigate,
  onEntityTap,
  theme: themeProp,
  themeVideos,
  open,
}) {
  const theme = { ...DEFAULT_THEME, ...themeProp };

  const connections = useMemo(() => {
    if (!node || !edges.length) return {};
    const connected = edges.filter((e) => {
      const sid = e.source.id || e.source;
      const tid = e.target.id || e.target;
      return sid === node.id || tid === node.id;
    });

    const grouped = {};
    connected.forEach((e) => {
      const sid = e.source.id || e.source;
      const tid = e.target.id || e.target;
      const otherId = sid === node.id ? tid : sid;
      const other = nodes.find((n) => n.id === otherId);
      const key = e.rel;
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push({ ...e, other, otherId });
    });
    return grouped;
  }, [node, edges, nodes]);

  const totalConnections = useMemo(
    () => Object.values(connections).reduce((sum, arr) => sum + arr.length, 0),
    [connections]
  );

  // Theme videos for theme nodes — skip if node already has videos from assembled data
  const nodeVideos = useMemo(() => {
    if (!node || node.type !== "theme" || !themeVideos) return [];
    if (node.media?.videos?.length > 0) return []; // already provided via assembled quickViewGroups
    const key = Object.keys(themeVideos).find(
      (k) => k.toLowerCase() === node.name.toLowerCase() || k.toLowerCase() === node.id
    );
    return key ? themeVideos[key]?.videos || [] : [];
  }, [node, themeVideos]);

  const nodeCharacters = useMemo(() => {
    if (!node || node.type !== "theme" || !themeVideos) return [];
    if (node.media?.videos?.length > 0) return []; // assembled data provides richer content
    const key = Object.keys(themeVideos).find(
      (k) => k.toLowerCase() === node.name.toLowerCase() || k.toLowerCase() === node.id
    );
    return key ? themeVideos[key]?.characters || [] : [];
  }, [node, themeVideos]);

  const color = node ? types[node.type]?.color || "#607d8b" : "#607d8b";
  const typeLabel = node ? types[node.type]?.label || node.type : "";

  return (
    <div
      style={{
        position: "absolute",
        right: 0,
        top: 0,
        bottom: 0,
        width: "32%",
        background: theme.panelBg,
        borderLeft: `1px solid ${theme.panelBorder}`,
        zIndex: 95,
        transform: open ? "translateX(0)" : "translateX(100%)",
        transition: "transform 0.5s cubic-bezier(0.16,1,0.3,1)",
        overflowY: "auto",
        backdropFilter: "blur(16px)",
        padding: "56px 0 40px",
        boxShadow: open ? theme.panelShadow : "none",
      }}
    >
      {/* Close button */}
      <button
        onClick={(e) => { e.stopPropagation(); onClose(); }}
        style={{
          position: "absolute",
          top: 14,
          right: 14,
          width: 28,
          height: 28,
          borderRadius: 6,
          border: `1px solid ${theme.panelBorder}`,
          background: "transparent",
          color: theme.textDim,
          cursor: "pointer",
          fontSize: 13,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 10,
        }}
      >
        ✕
      </button>

      {node && (
        <>
          {/* Header */}
          <div style={{ padding: "0 24px 16px", borderBottom: "1px solid #f0f0f0" }}>
            <div
              style={{
                fontSize: 8,
                fontWeight: 700,
                padding: "3px 8px",
                borderRadius: 4,
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                display: "inline-block",
                marginBottom: 10,
                color,
                background: color + "12",
                border: `1px solid ${color}22`,
              }}
            >
              {typeLabel}
            </div>
            <div style={{ fontSize: 22, fontWeight: 800, lineHeight: 1.15, marginBottom: 4, color }}>
              {node.name}
            </div>
            <div style={{ fontSize: 12, color: theme.textDim }}>{node.subtitle || ""}</div>
          </div>

          {/* Main content */}
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ padding: "20px 24px" }}>
              {/* Hook */}
              {node.hook && (
                <div
                  style={{
                    fontSize: 14,
                    fontStyle: "italic",
                    lineHeight: 1.55,
                    marginBottom: 16,
                    color: theme.textMuted,
                    borderLeft: `3px solid ${color}`,
                    paddingLeft: 12,
                  }}
                >
                  "{node.hook}"
                </div>
              )}

              {/* Description */}
              {node.description && (
                <div style={{ fontSize: 13, color: theme.textMuted, lineHeight: 1.75, marginBottom: 20 }}>
                  {node.description}
                </div>
              )}

              {/* Entity image */}
              {node.imageUrl && (
                <div style={{ marginBottom: 20 }}>
                  <img
                    src={node.imageUrl}
                    alt={node.name}
                    style={{
                      width: "100%",
                      borderRadius: 10,
                      border: `1px solid ${theme.panelBorder}`,
                    }}
                  />
                </div>
              )}

              {/* YouTube embeds for media */}
              {node.media?.videos?.length > 0 && (
                <div style={{ marginBottom: 20 }}>
                  <div style={sectionLabelStyle(theme)}>Video · {node.media.videos.length}</div>
                  {node.media.videos.map((v, i) => (
                    <VideoCard key={i} video={v} theme={theme} />
                  ))}
                </div>
              )}

              {/* Theme videos (YouTube embeds) */}
              {nodeVideos.length > 0 && (
                <div style={{ marginBottom: 20 }}>
                  <div style={sectionLabelStyle(theme)}>Theme Videos · {nodeVideos.length}</div>
                  {nodeVideos.slice(0, 3).map((v, i) => (
                    <ThemeVideoCard key={i} video={v} theme={theme} />
                  ))}
                </div>
              )}

              {/* Theme character moments */}
              {nodeCharacters.length > 0 && (
                <div style={{ marginBottom: 20 }}>
                  <div style={sectionLabelStyle(theme)}>Character Moments · {nodeCharacters.length}</div>
                  {nodeCharacters.slice(0, 4).map((c, i) => (
                    <div
                      key={i}
                      style={{
                        padding: "10px 12px",
                        background: "#f9fafb",
                        border: "1px solid #f0f0f0",
                        borderRadius: 8,
                        marginBottom: 6,
                      }}
                    >
                      <div style={{ fontSize: 11, fontWeight: 600, color: theme.text, marginBottom: 4 }}>
                        {c.character}
                        {c.timestamp && (
                          <span style={{ color: theme.textDim, fontWeight: 400, marginLeft: 6 }}>
                            {c.timestamp}
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: 11, color: theme.textMuted, lineHeight: 1.5 }}>
                        {c.text?.slice(0, 200)}{c.text?.length > 200 ? "…" : ""}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Audio (from prototype data) */}
              {node.media?.audio?.length > 0 && (
                <div style={{ marginBottom: 20 }}>
                  <div style={sectionLabelStyle(theme)}>Audio · {node.media.audio.length}</div>
                  {node.media.audio.map((a, i) => (
                    <AudioCard key={i} audio={a} color={a.color || color} theme={theme} />
                  ))}
                </div>
              )}
            </div>

            {/* Connections */}
            <div style={{ padding: "0 24px 32px", borderTop: "1px solid #f0f0f0", paddingTop: 16 }}>
              <div style={{ ...sectionLabelStyle(theme), marginBottom: 12 }}>{totalConnections} connections</div>
              {Object.entries(connections).map(([rel, conns]) => (
                <div key={rel} style={{ marginBottom: 16 }}>
                  <div style={sectionLabelStyle(theme)}>
                    {rel.replace(/_/g, " ").toLowerCase()} · {conns.length}
                  </div>
                  {conns.map((conn, i) => {
                    const oc = types[conn.other?.type]?.color || "#556";
                    const ot = types[conn.other?.type]?.label || "";
                    return (
                      <div
                        key={i}
                        onClick={() => onNavigate(conn.otherId)}
                        style={{
                          display: "flex",
                          alignItems: "flex-start",
                          gap: 8,
                          padding: "8px 10px",
                          background: "#f9fafb",
                          border: "1px solid #f0f0f0",
                          borderRadius: 8,
                          marginBottom: 4,
                          cursor: "pointer",
                          transition: "background 0.15s",
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = "#f0f1f3")}
                        onMouseLeave={(e) => (e.currentTarget.style.background = "#f9fafb")}
                      >
                        <span
                          style={{
                            fontSize: 7,
                            fontWeight: 700,
                            padding: "2px 5px",
                            borderRadius: 3,
                            textTransform: "uppercase",
                            flexShrink: 0,
                            marginTop: 2,
                            color: oc,
                            background: oc + "15",
                          }}
                        >
                          {ot}
                        </span>
                        <div>
                          <div style={{ fontSize: 12, fontWeight: 600, color: theme.text }}>
                            {conn.other?.name || conn.otherId}
                          </div>
                          <div style={{ fontSize: 10, color: theme.textDim, marginTop: 1 }}>{conn.label}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function sectionLabelStyle(theme) {
  return {
    fontSize: 9,
    fontWeight: 700,
    color: theme.textDim,
    textTransform: "uppercase",
    letterSpacing: "0.06em",
    marginBottom: 8,
  };
}

function VideoCard({ video, theme }) {
  const videoId = video.videoId || extractYouTubeId(video.src || video.url || "");
  if (!videoId) {
    return (
      <div
        style={{
          borderRadius: 10,
          overflow: "hidden",
          border: `1px solid ${theme.panelBorder}`,
          marginBottom: 10,
          background: "#f3f4f6",
        }}
      >
        <div style={{ padding: "10px 12px", background: "#f9fafb" }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: "#374151" }}>{video.title}</div>
          <div style={{ fontSize: 10, color: theme.textDim, marginTop: 2 }}>{video.desc || video.context || ""}</div>
        </div>
      </div>
    );
  }
  return (
    <div
      style={{
        borderRadius: 10,
        overflow: "hidden",
        border: `1px solid ${theme.panelBorder}`,
        marginBottom: 10,
        background: "#f3f4f6",
      }}
    >
      <div style={{ position: "relative", width: "100%", paddingBottom: "56.25%" }}>
        <iframe
          src={`https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1`}
          title={video.title}
          style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", border: "none" }}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
      <div style={{ padding: "10px 12px", background: "#f9fafb" }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: "#374151" }}>{video.title}</div>
        <div style={{ fontSize: 10, color: theme.textDim, marginTop: 2 }}>{video.desc || video.context || ""}</div>
      </div>
    </div>
  );
}

function ThemeVideoCard({ video, theme }) {
  const videoId = video.videoId;
  const timecode = video.timecodeSeconds ? `&t=${video.timecodeSeconds}` : "";
  if (!videoId) return null;
  return (
    <div
      style={{
        borderRadius: 10,
        overflow: "hidden",
        border: `1px solid ${theme.panelBorder}`,
        marginBottom: 10,
        background: "#f3f4f6",
      }}
    >
      <div style={{ position: "relative", width: "100%", paddingBottom: "56.25%" }}>
        <iframe
          src={`https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1&start=${video.timecodeSeconds || 0}`}
          title={video.title}
          style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", border: "none" }}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
      <div style={{ padding: "10px 12px", background: "#f9fafb" }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: "#374151" }}>{video.title}</div>
        <div style={{ fontSize: 10, color: theme.textDim, marginTop: 2 }}>
          {video.channel || ""}{video.timecodeLabel ? ` · ${video.timecodeLabel}` : ""}
        </div>
        {video.evidence && (
          <div style={{ fontSize: 10, color: theme.textMuted, marginTop: 4, lineHeight: 1.4 }}>
            {video.evidence.slice(0, 150)}{video.evidence.length > 150 ? "…" : ""}
          </div>
        )}
      </div>
    </div>
  );
}

function AudioCard({ audio, color, theme }) {
  // Extract Spotify track/album ID for iframe embed
  const trackId = audio.spotifyUrl?.match(/track\/([a-zA-Z0-9]+)/)?.[1];
  const albumId = audio.albumId || audio.spotifyUrl?.match(/album\/([a-zA-Z0-9]+)/)?.[1];

  // Render Spotify iframe embed if we have a URL
  if (trackId || albumId) {
    const embedUrl = trackId
      ? `https://open.spotify.com/embed/track/${trackId}?utm_source=generator&theme=0`
      : `https://open.spotify.com/embed/album/${albumId}?utm_source=generator&theme=0`;
    const embedHeight = trackId ? 80 : 152;

    return (
      <div
        style={{
          borderRadius: 10,
          border: `1px solid ${theme.panelBorder}`,
          overflow: "hidden",
          marginBottom: 8,
          background: "#f9fafb",
        }}
      >
        <div style={{ padding: "8px 12px 4px" }}>
          <div
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: "#374151",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {audio.title}
          </div>
          {audio.artist && (
            <div style={{ fontSize: 10, color: theme.textDim }}>{audio.artist}</div>
          )}
        </div>
        <iframe
          src={embedUrl}
          width="100%"
          height={embedHeight}
          frameBorder="0"
          allow="autoplay; clipboard-write; encrypted-media"
          loading="lazy"
          style={{ display: "block" }}
        />
      </div>
    );
  }

  // Fallback: cosmetic play button (no Spotify URL)
  return (
    <div
      style={{
        borderRadius: 10,
        border: `1px solid ${theme.panelBorder}`,
        padding: "12px 14px",
        marginBottom: 8,
        display: "flex",
        alignItems: "center",
        gap: 12,
        background: "#f9fafb",
        transition: "background 0.15s",
        cursor: "pointer",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.background = "#f3f4f6")}
      onMouseLeave={(e) => (e.currentTarget.style.background = "#f9fafb")}
    >
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: "50%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          fontSize: 12,
          background: color + "18",
          color,
        }}
      >
        ▶
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: "#374151",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {audio.title}
        </div>
        <div style={{ fontSize: 10, color: theme.textDim }}>{audio.artist}</div>
      </div>
      <div style={{ fontSize: 9, color: theme.textDim }}>{audio.duration}</div>
    </div>
  );
}

function extractYouTubeId(url) {
  if (!url) return null;
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=))([^?&]+)/);
  return match ? match[1] : null;
}
