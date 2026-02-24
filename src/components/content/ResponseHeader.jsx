export default function ResponseHeader({ headline, summary }) {
  if (!headline && !summary) return null;

  return (
    <div>
      {headline && (
        <h2 style={{ fontWeight: 700, margin: 0 }}>{headline}</h2>
      )}
      {summary && (
        <p style={{ margin: headline ? '8px 0 0' : 0 }}>{summary}</p>
      )}
    </div>
  );
}
