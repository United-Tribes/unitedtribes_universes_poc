export default function NarrativeSection({ text, entities, sortedEntityNames, entityAliases, onEntityClick, linkEntitiesFn }) {
  if (!text) return null;

  // Split on double newlines to preserve paragraph breaks within a section
  const paragraphs = text.split(/\n\n+/).filter(p => p.trim());

  return (
    <div style={{ marginTop: 18 }}>
      {paragraphs.map((para, i) => (
        <p key={i} style={{ lineHeight: 1.6, margin: i > 0 ? '14px 0 0' : 0 }}>
          {linkEntitiesFn && entities && sortedEntityNames?.length
            ? linkEntitiesFn(para, entities, sortedEntityNames, onEntityClick, `ns-${i}-`, entityAliases)
            : para}
        </p>
      ))}
    </div>
  );
}
