export default function NarrativeSection({ text, entities, sortedEntityNames, entityAliases, onEntityClick, linkEntitiesFn, linkCitationsFn, kgSources, onOpenSource }) {
  if (!text) return null;

  // Split on double newlines to preserve paragraph breaks within a section
  const paragraphs = text.split(/\n\n+/).filter(p => p.trim());

  return (
    <div style={{ marginTop: 18 }}>
      {paragraphs.map((para, i) => {
        let content = para;
        if (linkEntitiesFn && entities && sortedEntityNames?.length) {
          content = linkEntitiesFn(para, entities, sortedEntityNames, onEntityClick, `ns-${i}-`, entityAliases);
        }
        if (linkCitationsFn) {
          content = linkCitationsFn(content, kgSources, onOpenSource);
        }
        return (
          <p key={i} style={{ lineHeight: 1.6, margin: i > 0 ? '14px 0 0' : 0 }}>
            {content}
          </p>
        );
      })}
    </div>
  );
}
