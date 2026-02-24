export default function NextQuestions({ questions, onSelect }) {
  if (!questions || questions.length === 0) return null;

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
      {questions.map((q, i) => (
        <button
          key={i}
          onClick={() => onSelect && onSelect(q.text)}
          style={{
            cursor: 'pointer',
            padding: '8px 16px',
            border: '1px solid #e5e7eb',
            borderRadius: 20,
            background: 'none',
            color: 'inherit',
            font: 'inherit',
            textAlign: 'left',
          }}
        >
          <span>{q.text}</span>
          {q.reason && (
            <span style={{ display: 'block', fontSize: '0.85em', opacity: 0.6, marginTop: 2 }}>
              {q.reason}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
