import React, { useState } from 'react';

export default function SourceCard({ source }) {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!source) return null;

  const scorePct = source.relevanceScore !== undefined ? Math.round(source.relevanceScore * 100) : null;

  const handleCopyCitation = (e) => {
    e.stopPropagation();
    const citation = `Source: "${source.documentTitle}", Section: ${source.section || 'General'} (Ver ${source.version || '1.0'}) - Zyngram Approved Knowledge Base`;
    navigator.clipboard.writeText(citation).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div 
      className={`source-card ${expanded ? 'expanded' : ''}`}
      onClick={() => setExpanded(!expanded)}
      title="Click to view verified excerpt"
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          setExpanded(!expanded);
        }
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
        <div className="source-title">{source.documentTitle || 'Zyngram Document'}</div>
        <button
          className="btn-copy-citation"
          onClick={handleCopyCitation}
          title="Copy Citation"
          aria-label="Copy Citation"
        >
          {copied ? '✓ Copied' : '📋'}
        </button>
      </div>

      {source.section && (
        <div className="source-section">
          📁 Section: <strong>{source.section}</strong>
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '6px' }}>
        <span className="source-badge">
          {source.category || 'Knowledge Base'}
        </span>
        {scorePct !== null && (
          <span 
            style={{ 
              fontSize: '0.72rem', 
              color: scorePct > 60 ? '#34d399' : '#38bdf8', 
              fontFamily: 'var(--font-mono)',
              fontWeight: 600
            }}
          >
            Match: {scorePct}%
          </span>
        )}
      </div>

      {/* Snippet Accordion */}
      {source.snippet && (
        <div className="source-snippet-toggle">
          <span>{expanded ? '▲ Hide Excerpt' : '▼ View Verified Excerpt'}</span>
        </div>
      )}

      {expanded && source.snippet && (
        <div className="source-snippet-box">
          <div className="source-snippet-label">VERIFIED APPROVED EXCERPT:</div>
          <div className="source-snippet-content">
            "{source.snippet}"
          </div>
          {source.version && (
            <div className="source-snippet-footer">
              Approved Knowledge Base • Version {source.version}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
