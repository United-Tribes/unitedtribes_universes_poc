import { DEFAULT_THEME } from "./constants";

export default function Legend({
  types,
  activeTypes,
  onToggle,
  nodeCount,
  visibleCount,
  edgeCount,
  theme: themeProp,
}) {
  const theme = { ...DEFAULT_THEME, ...themeProp };

  const sorted = Object.entries(types).sort((a, b) => (a[1].sort ?? 0) - (b[1].sort ?? 0));

  return (
    <>
      {/* Legend items */}
      <div
        style={{
          position: "absolute",
          top: 12,
          left: 12,
          zIndex: 90,
          display: "flex",
          flexDirection: "column",
          gap: 2,
        }}
      >
        {sorted.map(([key, val]) => {
          const active = activeTypes.has(key);
          return (
            <div
              key={key}
              onClick={() => onToggle(key)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 7,
                padding: "5px 10px",
                borderRadius: 6,
                cursor: "pointer",
                transition: "all 0.15s",
                opacity: active ? 1 : 0.2,
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "#f3f4f6")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              <div
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: "50%",
                  flexShrink: 0,
                  background: val.color,
                }}
              />
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  color: theme.textMuted,
                  fontFamily: "'DM Sans', sans-serif",
                }}
              >
                {val.label}
              </span>
            </div>
          );
        })}
      </div>

      {/* Stats */}
      <div
        style={{
          position: "absolute",
          bottom: 12,
          left: 12,
          fontSize: 9,
          color: theme.dotGrid,
          fontFamily: "'DM Mono', monospace",
          lineHeight: 1.5,
          zIndex: 50,
        }}
      >
        {visibleCount}/{nodeCount} entities · {edgeCount} relationships
        <br />
        UnitedTribes Knowledge Graph
      </div>
    </>
  );
}
