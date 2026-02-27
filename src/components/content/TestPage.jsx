import { useState } from 'react';
import ContentRenderer from './ContentRenderer';
import {
  mockRichResponse,
  mockModerateResponse,
  mockSparseResponse,
  mockNoContentResponse,
} from './mockData';

const MOCKS = [
  { label: 'Rich (all section types)', data: mockRichResponse },
  { label: 'Moderate (no media)', data: mockModerateResponse },
  { label: 'Sparse (minimal)', data: mockSparseResponse },
  { label: 'No content field (fallback)', data: mockNoContentResponse },
];

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
