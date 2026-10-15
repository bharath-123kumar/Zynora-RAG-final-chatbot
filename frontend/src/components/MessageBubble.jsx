import React, { useState } from 'react';
import SourceCard from './SourceCard';

const FALLBACK_MESSAGE = "I couldn't find this information in the approved Zyngram knowledge base.";

export default function MessageBubble({ message }) {
  const [sourcesOpen, setSourcesOpen] = useState(true);
  const [copied, setCopied] = useState(false);

  if (!message) return null;

  const isUser = message.role === 'user';
  const isFallback = !isUser && message.content === FALLBACK_MESSAGE;
  const sources = Array.isArray(message.sources) ? message.sources : [];

  const handleCopy = () => {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(message.content || '').then(() => {
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
    <div className={`message-wrapper ${isUser ? 'user' : 'assistant'}`}>
      {!isUser && (
        <div className="brand-icon" style={{ width: 36, height: 36, fontSize: '1rem', flexShrink: 0 }}>
          Z
        </div>
      )}

      <div className={`message-bubble ${isFallback ? 'fallback-bubble' : ''}`}>
        {/* Zero-Trust Knowledge Boundary Banner for Fallbacks */}
        {isFallback && (
          <div className="boundary-callout">
            <div className="boundary-callout-header">
              <span className="boundary-icon">🛡️</span>
              <span className="boundary-title">Zero-Trust Knowledge Boundary Active</span>
            </div>
            <p className="boundary-text">
              This query cannot be answered from verified Zyngram documentation. External speculation, competitors, and unapproved claims are strictly deflected.
            </p>
          </div>
        )}

        {/* Message Content */}
        <div style={{ whiteSpace: 'pre-wrap', lineHeight: '1.6' }}>
          {message.content || ''}
        </div>

        {/* Assistant Metadata & Verification Section */}
        {!isUser && (
          <>
            <div className="message-meta">
              {message.responseTimeMs !== undefined && message.responseTimeMs !== null && (
                <span className="pill-metric">
                  ⚡ {message.responseTimeMs}ms
                </span>
              )}
              {message.confidenceScore !== undefined && message.confidenceScore !== null && (
                <span className="pill-metric" style={{ color: message.confidenceScore > 0.5 ? '#34d399' : '#fbbf24' }}>
                  🎯 {Math.round(message.confidenceScore * 100)}% Confidence
                </span>
              )}
              {message.grounded && (
                <span className="pill-metric" style={{ color: '#38bdf8' }}>
                  ✓ Grounded Answer
                </span>
              )}
              <button 
                className="btn-copy-action"
                onClick={handleCopy}
                title="Copy response text"
                aria-label="Copy response text"
              >
                {copied ? '✓ Copied' : '📋 Copy'}
              </button>
            </div>

            {/* Clearly Labeled Sources Section */}
            {!isFallback && (
              <div className="sources-container">
                <div 
                  className="sources-header"
                  onClick={() => setSourcesOpen(!sourcesOpen)}
                  title="Toggle source citations"
                  role="button"
                  tabIndex={0}
                  aria-expanded={sourcesOpen}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setSourcesOpen(!sourcesOpen);
                    }
                  }}
                >
                  <span className="sources-header-title">
                    📚 Verified Sources {sources.length > 0 ? `(${sources.length})` : ''}
                  </span>
                  {sources.length > 0 && (
                    <span style={{ fontSize: '0.75rem', opacity: 0.8 }}>
                      {sourcesOpen ? '▲ Collapse' : '▼ Expand'}
                    </span>
                  )}
                </div>

                {sourcesOpen && (
                  sources.length > 0 ? (
                    <div className="sources-grid">
                      {sources.map((src, idx) => (
                        <SourceCard 
                          key={src.id || src.chunkId || src.chunk_id || `src_${idx}`} 
                          source={src} 
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="sources-empty-notice">
                      <span>ℹ️ Source citation details unavailable for this response.</span>
                    </div>
                  )
                )}
              </div>
            )}
          </>
        )}
      </div>

      {isUser && (
        <div className="avatar-circle" style={{ width: 36, height: 36, flexShrink: 0 }}>
          U
        </div>
      )}
    </div>
  );
}
