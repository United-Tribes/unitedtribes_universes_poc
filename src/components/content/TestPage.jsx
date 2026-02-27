import { useState } from 'react';
import ContentRenderer from './ContentRenderer';
import {
  mockRichResponse,
  mockModerateResponse,
  mockSparseResponse,
  mockNoContentResponse,
} from './mockData';

const API_BASE = 'https://166ws8jk15.execute-api.us-east-1.amazonaws.com/prod';

const MODELS = [
  { id: 'broker', label: 'Claude', endpoint: '/v2/broker' },
  { id: 'broker-gpt', label: 'ChatGPT', endpoint: '/v2/broker-gpt' },
  { id: 'broker-nova', label: 'Nova', endpoint: '/v2/broker-nova' },
  { id: 'broker-llama', label: 'Llama', endpoint: '/v2/broker-llama' },
  { id: 'broker-mistral', label: 'Mistral', endpoint: '/v2/broker-mistral' },
];

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
  const [selectedModel, setSelectedModel] = useState(MODELS[0]);
  const [responses, setResponses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const submit = async (q, model) => {
    const queryText = q || query;
    const m = model || selectedModel;
    if (!queryText.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const url = `${API_BASE}${m.endpoint}`;
      const t0 = performance.now();
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: queryText }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status} from ${m.label}`);
      const data = await res.json();
      const clientMs = Math.round(performance.now() - t0);
      const entry = { model: m, query: queryText, data, clientMs, id: Date.now() };
      setResponses((prev) => [entry, ...prev]);
      addLog(`${m.label} response`, `${data.content?.sections?.length || 0} sections, ${data.connections?.featured_music?.length || 0} songs, ${clientMs}ms`);
    } catch (e) {
      setError(e.message);
      addLog('API error', `${m.label}: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  const submitAll = async (q) => {
    const queryText = q || query;
    if (!queryText.trim()) return;
    setLoading(true);
    setError(null);
    const results = await Promise.allSettled(
      MODELS.map(async (m) => {
        const url = `${API_BASE}${m.endpoint}`;
        const t0 = performance.now();
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: queryText }),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        const clientMs = Math.round(performance.now() - t0);
        return { model: m, query: queryText, data, clientMs, id: Date.now() + Math.random() };
      })
    );
    const entries = [];
    for (const r of results) {
      if (r.status === 'fulfilled') {
        entries.push(r.value);
        addLog(`${r.value.model.label}`, `${r.value.data.content?.sections?.length || 0} sections, ${r.value.clientMs}ms`);
      } else {
        addLog('API error', r.reason?.message || 'Unknown error');
      }
    }
    setResponses((prev) => [...entries, ...prev]);
    setLoading(false);
  };

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12, alignItems: 'center' }}>
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
          style={{ padding: '10px 20px', background: loading ? '#9ca3af' : '#2563eb', color: '#fff', border: 'none', borderRadius: 8, cursor: loading ? 'wait' : 'pointer', font: 'inherit', fontWeight: 600, whiteSpace: 'nowrap' }}
        >
          {loading ? 'Loading...' : 'Send'}
        </button>
        <button
          onClick={() => submitAll()}
          disabled={loading || !query.trim()}
          title="Send to all 5 models in parallel"
          style={{ padding: '10px 16px', background: loading ? '#9ca3af' : '#7c3aed', color: '#fff', border: 'none', borderRadius: 8, cursor: loading ? 'wait' : 'pointer', font: 'inherit', fontWeight: 600, whiteSpace: 'nowrap' }}
        >
          All 5
        </button>
      </div>

      <div style={{ display: 'flex', gap: 6, marginBottom: 12, alignItems: 'center' }}>
        <span style={{ fontSize: 12, color: '#9ca3af', fontFamily: "'DM Mono', monospace" }}>Model:</span>
        {MODELS.map((m) => (
          <button
            key={m.id}
            onClick={() => setSelectedModel(m)}
            style={{
              padding: '5px 12px',
              background: selectedModel.id === m.id ? '#1a2744' : 'none',
              color: selectedModel.id === m.id ? '#fff' : '#4b5563',
              border: `1px solid ${selectedModel.id === m.id ? '#1a2744' : '#d1d5db'}`,
              borderRadius: 16,
              cursor: 'pointer',
              font: 'inherit',
              fontSize: 12,
              fontWeight: selectedModel.id === m.id ? 600 : 400,
            }}
          >
            {m.label}
          </button>
        ))}
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

      {responses.length > 0 && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <span style={{ fontSize: 13, color: '#9ca3af' }}>{responses.length} response{responses.length !== 1 ? 's' : ''}</span>
          <button
            onClick={() => setResponses([])}
            style={{ padding: '4px 10px', background: 'none', border: '1px solid #d1d5db', borderRadius: 6, cursor: 'pointer', font: 'inherit', fontSize: 11, color: '#9ca3af' }}
          >
            Clear all
          </button>
        </div>
      )}

      {responses.map((entry) => (
        <ResponseCard key={entry.id} entry={entry} addLog={addLog} setQuery={setQuery} submit={submit} />
      ))}
    </div>
  );
}

function ResponseCard({ entry, addLog, setQuery, submit }) {
  const [rawExpanded, setRawExpanded] = useState(false);
  const { model, query: q, data, clientMs } = entry;

  const sectionTypes = data.content?.sections?.reduce((acc, s) => {
    acc[s.type] = (acc[s.type] || 0) + 1;
    return acc;
  }, {});

  const serverMs = data.metadata?.processing_time_ms;
  const reportedModel = data.metadata?.model || data.ai_analysis?.model || '?';

  return (
    <div style={{ marginBottom: 24, padding: 16, border: '1px solid #e5e7eb', borderRadius: 10, background: '#fff' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ padding: '3px 10px', background: '#1a2744', color: '#fff', borderRadius: 12, fontSize: 12, fontWeight: 600 }}>
            {model.label}
          </span>
          <span style={{ fontSize: 12, color: '#9ca3af', fontFamily: "'DM Mono', monospace" }}>
            {reportedModel}
          </span>
        </div>
        <span style={{ fontSize: 12, color: '#9ca3af', fontFamily: "'DM Mono', monospace" }}>
          {serverMs ? `${Math.round(serverMs)}ms server` : ''}{serverMs ? ' · ' : ''}{clientMs}ms total
        </span>
      </div>

      <div style={{ fontSize: 13, color: '#4b5563', marginBottom: 10, fontStyle: 'italic' }}>"{q}"</div>

      <div style={{ padding: 10, background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, marginBottom: 14, fontSize: 12, fontFamily: "'DM Mono', monospace" }}>
        {data.content?.sections?.length || 0} sections
        ({sectionTypes ? Object.entries(sectionTypes).map(([t, c]) => `${c} ${t}`).join(', ') : 'none'})
        {' · '}{data.connections?.featured_music?.length || 0} songs
        {' · '}{data.connections?.music_crew?.length || 0} crew
      </div>

      <ContentRenderer
        apiResponse={data}
        onFollowUp={(fq) => { setQuery(fq); submit(fq); addLog('onFollowUp', fq); }}
        onEntityTap={(e) => addLog('onEntityTap', e)}
      />

      <div style={{ marginTop: 16 }}>
        <button
          onClick={() => setRawExpanded(!rawExpanded)}
          style={{ padding: '5px 10px', background: 'none', border: '1px solid #d1d5db', borderRadius: 6, cursor: 'pointer', font: 'inherit', fontSize: 11, color: '#4b5563' }}
        >
          {rawExpanded ? 'Hide' : 'Show'} raw JSON
        </button>
        {rawExpanded && (
          <pre style={{ marginTop: 8, padding: 12, background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 11, overflow: 'auto', maxHeight: 400 }}>
            {JSON.stringify(data, null, 2)}
          </pre>
        )}
      </div>
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
