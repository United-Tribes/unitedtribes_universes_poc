export default function ConnectionHighlight({ entity, relationship, follow_up_query, image_url, onTap }) {
  if (!entity) return null;

  return (
    <div
      onClick={() => onTap && onTap(follow_up_query || entity)}
      style={{ cursor: 'pointer', padding: 12, border: '1px solid #e5e7eb', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 12 }}
    >
      {image_url && (
        <img
          src={image_url}
          alt={entity}
          style={{ width: 48, height: 48, borderRadius: '50%', objectFit: 'cover' }}
        />
      )}
      <div>
        <span style={{ fontWeight: 700 }}>{entity}</span>
        {relationship && (
          <p style={{ margin: '4px 0 0', opacity: 0.7 }}>{relationship}</p>
        )}
      </div>
    </div>
  );
}
