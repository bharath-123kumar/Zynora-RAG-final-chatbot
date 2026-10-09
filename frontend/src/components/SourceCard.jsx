import React from 'react';

export default function SourceCard({ source }) {
  if (!source) return null;

  return (
    <div className="source-card">
      <div className="source-title">{source.documentTitle || 'Zyngram Document'}</div>
      {source.section && (
        <div className="source-section">Section: {source.section}</div>
      )}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '4px' }}>
        <span className="source-badge">
          {source.category || 'Knowledge Base'}
        </span>
        {source.relevanceScore !== undefined && (
          <span style={{ fontSize: '0.7rem', color: '#9ca3af', fontFamily: 'var(--font-mono)' }}>
            Score: {Math.round(source.relevanceScore * 100)}%
          </span>
        )}
      </div>
      {source.version && (
        <div style={{ fontSize: '0.68rem', color: '#6b7280' }}>
          Ver: {source.version}
        </div>
      )}
    </div>
  );
}
