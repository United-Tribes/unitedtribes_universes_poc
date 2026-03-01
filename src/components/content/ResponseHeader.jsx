export default function ResponseHeader({ headline, summary, entities, sortedEntityNames, entityAliases, onEntityClick, linkEntitiesFn }) {
  if (!headline && !summary) return null;

  const linkedSummary = summary && linkEntitiesFn && entities && sortedEntityNames?.length
    ? linkEntitiesFn(summary, entities, sortedEntityNames, onEntityClick, 'rh-', entityAliases)
    : summary;

  return (
    <div>
      {headline && (
        <h2 style={{ fontWeight: 700, margin: 0 }}>{headline}</h2>
      )}
      {linkedSummary && (
        <p style={{ margin: headline ? '8px 0 0' : 0 }}>{linkedSummary}</p>
      )}
    </div>
  );
}
