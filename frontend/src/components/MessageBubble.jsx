import React, { useState } from 'react';
import SourceCard from './SourceCard';

export default function MessageBubble({ message }) {
  const [sourcesOpen, setSourcesOpen] = useState(true);
  const isUser = message.role === 'user';

  return (
    <div className={`message-wrapper ${isUser ? 'user' : 'assistant'}`}>
      {!isUser && (
        <div className="brand-icon" style={{ width: 36, height: 36, fontSize: '1rem', flexShrink: 0 }}>
          Z
        </div>
      )}

      <div className="message-bubble">
        <div style={{ whiteSpace: 'pre-wrap' }}>
          {message.content}
        </div>

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
            </div>

            {message.sources && message.sources.length > 0 && (
              <div className="sources-container">
                <div 
                  className="sources-header"
                  onClick={() => setSourcesOpen(!sourcesOpen)}
                  title="Toggle source citations"
                >
                  <span>📚 Verified Sources ({message.sources.length})</span>
                  <span style={{ fontSize: '0.7rem' }}>{sourcesOpen ? '▲' : '▼'}</span>
                </div>

                {sourcesOpen && (
                  <div className="sources-grid">
                    {message.sources.map((src, idx) => (
                      <SourceCard key={src.id || idx} source={src} />
                    ))}
                  </div>
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
