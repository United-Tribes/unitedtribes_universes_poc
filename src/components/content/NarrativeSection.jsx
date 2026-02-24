export default function NarrativeSection({ text }) {
  if (!text) return null;

  return (
    <p style={{ lineHeight: 1.6, margin: 0 }}>{text}</p>
  );
}
