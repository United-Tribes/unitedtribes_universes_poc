import { useState } from 'react';
import ContentRenderer from './ContentRenderer';
import {
  mockRichResponse,
  mockModerateResponse,
  mockSparseResponse,
  mockNoContentResponse,
} from './mockData';

const BROKER_URL = 'https://166ws8jk15.execute-api.us-east-1.amazonaws.com/prod/v2/broker';

const MOCKS = [
  { label: 'Rich (all section types)', data: mockRichResponse },
  { label: 'Moderate (no media)', data: mockModerateResponse },
  { label: 'Sparse (minimal)', data: mockSparseResponse },
  { label: 'No content field (fallback)', data: mockNoContentResponse },
];

const PRESET_QUERIES = [
  'What music is in Pluribus?',
  'Tell me about Rhea Seehorn in Pluribus',
  'How did The Twilight Zone influence Pluribus?',
  'Who created Pluribus?',
];

function LiveApiPanel({ addLog }) {
  const [query, setQuery] = useState('');
  const [response, setResponse] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [rawExpanded, setRawExpanded] = useState(false);

  const submit = async (q) => {
    const queryText = q || query;
    if (!queryText.trim()) return;
    setLoading(true);
    setError(null);
    setResponse(null);
    setRawExpanded(false);
    try {
      const res = await fetch(BROKER_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: queryText }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setResponse(data);
      addLog('API response', `${data.content?.sections?.length || 0} sections, ${data.connections?.featured_music?.length || 0} songs`);
    } catch (e) {
      setError(e.message);
      addLog('API error', e.message);
    } finally {
      setLoading(false);
    }
  };

  const sectionTypes = response?.content?.sections?.reduce((acc, s) => {
    acc[s.type] = (acc[s.type] || 0) + 1;
    return acc;
  }, {});

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
          placeholder="Ask anything about Pluribus..."
          style={{ flex: 1, padding: '10px 14px', border: '1px solid #e5e7eb', borderRadius: 8, font: 'inherit', fontSize: 14 }}
        />
        <button
          onClick={() => submit()}
          disabled={loading || !query.trim()}
          style={{ padding: '10px 20px', background: loading ? '#9ca3af' : '#2563eb', color: '#fff', border: 'none', borderRadius: 8, cursor: loading ? 'wait' : 'pointer', font: 'inherit', fontWeight: 600 }}
        >
          {loading ? 'Loading...' : 'Send'}
        </button>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 20 }}>
        {PRESET_QUERIES.map((pq, i) => (
          <button
            key={i}
            onClick={() => { setQuery(pq); submit(pq); }}
            disabled={loading}
            style={{ padding: '6px 12px', background: 'none', border: '1px solid #d1d5db', borderRadius: 16, cursor: 'pointer', font: 'inherit', fontSize: 12, color: '#4b5563' }}
          >
            {pq}
          </button>
        ))}
      </div>

      {error && (
        <div style={{ padding: 12, background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, color: '#dc2626', marginBottom: 16 }}>
          {error}
        </div>
      )}

      {response && (
        <div>
          <div style={{ padding: 12, background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, marginBottom: 16, fontSize: 13, fontFamily: "'DM Mono', monospace" }}>
            <strong>API metadata:</strong> {response.content?.sections?.length || 0} sections
            ({sectionTypes ? Object.entries(sectionTypes).map(([t, c]) => `${c} ${t}`).join(', ') : 'none'})
            {' · '}{response.connections?.featured_music?.length || 0} songs
            {' · '}{response.connections?.music_crew?.length || 0} crew
            {' · '}{response.metadata?.processing_time_ms || '?'}ms
          </div>

          <h3 style={{ fontSize: 14, fontWeight: 600, color: '#2563eb', marginBottom: 12, fontFamily: "'DM Mono', monospace" }}>
            ContentRenderer output:
          </h3>
          <ContentRenderer
            apiResponse={response}
            onFollowUp={(q) => { setQuery(q); submit(q); addLog('onFollowUp', q); }}
            onEntityTap={(e) => addLog('onEntityTap', e)}
          />

          <div style={{ marginTop: 24 }}>
            <button
              onClick={() => setRawExpanded(!rawExpanded)}
              style={{ padding: '6px 12px', background: 'none', border: '1px solid #d1d5db', borderRadius: 8, cursor: 'pointer', font: 'inherit', fontSize: 12, color: '#4b5563' }}
            >
              {rawExpanded ? 'Hide' : 'Show'} raw JSON
            </button>
            {rawExpanded && (
              <pre style={{ marginTop: 8, padding: 12, background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 11, overflow: 'auto', maxHeight: 400 }}>
                {JSON.stringify(response, null, 2)}
              </pre>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function TestPage() {
  const [log, setLog] = useState([]);

  const addLog = (action, value) => {
    setLog((prev) => [`${action}: ${value}`, ...prev].slice(0, 20));
  };

  return (
    <div style={{ fontFamily: "'DM Sans', sans-serif", maxWidth: 720, margin: '0 auto', padding: '32px 16px' }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>Content Renderer Test Page</h1>
      <p style={{ color: '#666', marginBottom: 32 }}>
        Access via <code>?test=content</code> — remove the param to return to the app.
      </p>

      <section style={{ marginBottom: 48, padding: 24, border: '2px solid #2563eb', borderRadius: 12, background: '#fafbff' }}>
        <h2 style={{ fontSize: 16, fontWeight: 600, color: '#2563eb', marginBottom: 16, fontFamily: "'DM Mono', monospace" }}>
          Live API
        </h2>
        <LiveApiPanel addLog={addLog} />
      </section>

      <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16, color: '#9ca3af' }}>Mock Data</h2>

      {MOCKS.map(({ label, data }, i) => (
        <section key={i} style={{ marginBottom: 48, padding: 24, border: '1px solid #e5e7eb', borderRadius: 12 }}>
          <h2 style={{ fontSize: 16, fontWeight: 600, color: '#2563eb', marginBottom: 16, fontFamily: "'DM Mono', monospace" }}>
            Mock {i + 1}: {label}
          </h2>
          <ContentRenderer
            apiResponse={data}
            onFollowUp={(q) => addLog('onFollowUp', q)}
            onEntityTap={(e) => addLog('onEntityTap', e)}
          />
        </section>
      ))}

      {log.length > 0 && (
        <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: '#1a2744', color: '#fff', padding: '12px 16px', fontFamily: "'DM Mono', monospace", fontSize: 12, maxHeight: 160, overflow: 'auto' }}>
          <strong>Event Log</strong>
          {log.map((entry, i) => (
            <div key={i} style={{ opacity: i === 0 ? 1 : 0.6 }}>{entry}</div>
          ))}
        </div>
      )}
    </div>
  );
}
