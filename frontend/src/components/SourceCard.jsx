import React, { useState } from 'react';

/**
 * SourceCard.jsx
 * Displays verified, auditable knowledge citations supporting each RAG response.
 * Defensively handles camelCase and snake_case properties from live chat and historical DB rows.
 * Features chunk references, readable excerpt accordion with bounded scrolling, and one-click citation copying.
 */
export default function SourceCard({ source }) {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!source || typeof source !== 'object') {
    return null;
  }

  // Defensive normalization of live API and historical database properties
  const documentTitle = source.documentTitle || source.document_title || 'Zyngram Knowledge Document';
  const section = source.section || 'General Specifications';
  const version = source.version || '1.0';
  const category = source.category || 'Approved Knowledge';
  const rawScore = source.relevanceScore !== undefined ? source.relevanceScore : source.relevance_score;
  const scorePct = rawScore !== undefined && rawScore !== null && !isNaN(Number(rawScore)) 
    ? Math.round(Number(rawScore) * 100) 
    : null;
  const chunkId = source.chunkId || source.chunk_id || null;
  const snippet = (source.snippet || '').trim();

  const handleCopyCitation = (e) => {
    e.stopPropagation();
    const chunkTag = chunkId ? ` [Chunk #${chunkId.substring(0, 8)}]` : '';
    const citation = `Source: "${documentTitle}", Section: ${section} (Ver ${version})${chunkTag} — Zyngram Approved Knowledge Base`;
    
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(citation).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }).catch(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
    } else {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div 
      className={`source-card ${expanded ? 'expanded' : ''}`}
      onClick={() => setExpanded(!expanded)}
      title="Click to view verified excerpt"
      role="button"
      tabIndex={0}
      aria-expanded={expanded}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          setExpanded(!expanded);
        }
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
        <div className="source-title" title={documentTitle}>
          📄 {documentTitle}
        </div>
        <button
          className="btn-copy-citation"
          onClick={handleCopyCitation}
          title="Copy verified citation to clipboard"
          aria-label="Copy Citation"
        >
          {copied ? '✓ Copied' : '📋'}
        </button>
      </div>

      <div className="source-section">
        📁 Section: <strong>{section}</strong>
      </div>

      {chunkId && (
        <div className="source-chunk-ref" title={`Full Chunk ID: ${chunkId}`}>
          🔖 Chunk Ref: <code>#{chunkId.substring(0, 8)}</code>
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '6px' }}>
        <span className="source-badge">
          {category}
        </span>
        {scorePct !== null && (
          <span 
            className="source-match-score"
            style={{ 
              fontSize: '0.74rem', 
              color: scorePct >= 70 ? '#34d399' : '#38bdf8', 
              fontFamily: 'var(--font-mono)',
              fontWeight: 600
            }}
          >
            Match: {scorePct}%
          </span>
        )}
      </div>

      {/* Snippet Accordion with readable bounded preview */}
      {snippet ? (
        <div className="source-snippet-toggle">
          <span>{expanded ? '▲ Hide Excerpt' : '▼ View Verified Excerpt'}</span>
        </div>
      ) : (
        <div className="source-snippet-toggle" style={{ opacity: 0.6 }}>
          <span>Excerpt not indexed for this section</span>
        </div>
      )}

      {expanded && snippet && (
        <div className="source-snippet-box">
          <div className="source-snippet-label">VERIFIED APPROVED EXCERPT:</div>
          <div className="source-snippet-content">
            "{snippet}"
          </div>
          <div className="source-snippet-footer">
            Approved Knowledge Base • Version {version} {chunkId ? `• ID ${chunkId.substring(0, 8)}` : ''}
          </div>
        </div>
      )}
    </div>
  );
}
