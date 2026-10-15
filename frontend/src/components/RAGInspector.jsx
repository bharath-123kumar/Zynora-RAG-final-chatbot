import React, { useState, useRef } from 'react';
import { inspectorApi } from '../api/inspectorApi';

const SAMPLE_QUERIES = [
  'What is the mission of Zyngram?',
  'Explain the Zyngram Physical Franchise Hierarchy',
  'What is a Hub in Zyngram?',
  'What does Command supervise?',
  'What is Zynora RAG Intelligence System?',
  'What is the banana price at Center?',
];

function ScoreBar({ value, max = 1.0, color = '#6366f1' }) {
  const pct = Math.min(100, Math.round((value / max) * 100));
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{
        flex: 1, height: 6, background: 'rgba(255,255,255,0.06)',
        borderRadius: 99, overflow: 'hidden'
      }}>
        <div style={{
          width: `${pct}%`, height: '100%',
          background: color, borderRadius: 99,
          transition: 'width 0.6s ease'
        }} />
      </div>
      <span style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: '#e2e8f0', minWidth: 38, textAlign: 'right' }}>
        {typeof value === 'number' ? value.toFixed(3) : value}
      </span>
    </div>
  );
}

function TokenBadge({ token }) {
  return (
    <span style={{
      display: 'inline-block', padding: '2px 8px',
      background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)',
      borderRadius: 99, fontSize: '0.72rem', fontFamily: 'var(--font-mono)',
      color: '#a5b4fc', margin: '2px 3px'
    }}>
      {token}
    </span>
  );
}

function ChunkCard({ chunk, maxScore }) {
  const [expanded, setExpanded] = useState(false);
  const pct = maxScore > 0 ? Math.round((chunk.hybridScore / maxScore) * 100) : 0;
  const rankColor = chunk.rank === 1 ? '#fbbf24' : chunk.rank === 2 ? '#94a3b8' : chunk.rank === 3 ? '#b45309' : '#475569';
  const passed = chunk.passedThreshold;

  return (
    <div style={{
      background: 'rgba(255,255,255,0.03)',
      border: `1px solid ${passed ? 'rgba(99,102,241,0.25)' : 'rgba(255,255,255,0.07)'}`,
      borderRadius: 10,
      padding: '14px 16px',
      marginBottom: 10,
      opacity: passed ? 1 : 0.55,
      transition: 'all 0.2s'
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 10 }}>
        {/* Rank badge */}
        <div style={{
          width: 32, height: 32, borderRadius: '50%',
          background: passed ? rankColor : 'rgba(255,255,255,0.06)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontWeight: 800, fontSize: '0.85rem', color: '#fff', flexShrink: 0
        }}>
          #{chunk.rank}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#e2e8f0', marginBottom: 2, lineHeight: 1.3 }}>
            {chunk.documentTitle}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
            {chunk.section && (
              <span style={{ fontSize: '0.72rem', color: '#a5b4fc', background: 'rgba(99,102,241,0.12)', padding: '1px 7px', borderRadius: 4 }}>
                § {chunk.section}
              </span>
            )}
            <span style={{ fontSize: '0.72rem', color: '#94a3b8', background: 'rgba(255,255,255,0.05)', padding: '1px 7px', borderRadius: 4 }}>
              {chunk.category}
            </span>
            <span style={{ fontSize: '0.72rem', fontFamily: 'var(--font-mono)', color: '#64748b' }}>
              v{chunk.version}
            </span>
            <span style={{
              fontSize: '0.7rem', padding: '1px 7px', borderRadius: 4, fontWeight: 700,
              background: passed ? 'rgba(16,185,129,0.15)' : 'rgba(100,116,139,0.15)',
              color: passed ? '#34d399' : '#94a3b8',
              border: `1px solid ${passed ? 'rgba(16,185,129,0.3)' : 'rgba(100,116,139,0.2)'}`
            }}>
              {passed ? '✓ Above Threshold' : '✗ Below Threshold'}
            </span>
          </div>
        </div>

        {/* Score ring */}
        <div style={{ textAlign: 'center', flexShrink: 0 }}>
          <div style={{
            fontSize: '1.4rem', fontWeight: 900,
            fontFamily: 'var(--font-mono)',
            color: passed ? (pct >= 80 ? '#34d399' : '#a5b4fc') : '#475569'
          }}>
            {pct}%
          </div>
          <div style={{ fontSize: '0.65rem', color: '#64748b', marginTop: 1 }}>Relative Score</div>
        </div>
      </div>

      {/* Score Breakdown */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px 16px', marginBottom: 10 }}>
        <div>
          <div style={{ fontSize: '0.68rem', color: '#64748b', marginBottom: 3 }}>BM25 Score</div>
          <ScoreBar value={chunk.bm25Score} max={Math.max(chunk.bm25Score, 4)} color='#8b5cf6' />
        </div>
        <div>
          <div style={{ fontSize: '0.68rem', color: '#64748b', marginBottom: 3 }}>Cosine Similarity</div>
          <ScoreBar value={chunk.cosineScore} color='#06b6d4' />
        </div>
        <div>
          <div style={{ fontSize: '0.68rem', color: '#64748b', marginBottom: 3 }}>Hybrid Score</div>
          <ScoreBar value={chunk.hybridScore} color='#6366f1' />
        </div>
      </div>

      {/* Term Coverage */}
      <div style={{ marginBottom: 8 }}>
        <div style={{ fontSize: '0.68rem', color: '#64748b', marginBottom: 3 }}>Term Coverage</div>
        <ScoreBar value={chunk.termCoverage} color='#f59e0b' />
      </div>

      {/* Chunk ID */}
      <div style={{ fontSize: '0.67rem', fontFamily: 'var(--font-mono)', color: '#475569', marginBottom: 8 }}>
        🔖 {chunk.chunkId}
      </div>

      {/* Content preview toggle */}
      <button
        onClick={() => setExpanded(e => !e)}
        style={{
          fontSize: '0.75rem', color: '#6366f1', background: 'none', border: 'none',
          cursor: 'pointer', padding: 0, fontFamily: 'var(--font-mono)'
        }}
      >
        {expanded ? '▲ Hide chunk content' : '▼ Show chunk content'}
      </button>

      {expanded && (
        <div style={{
          marginTop: 8, background: 'rgba(0,0,0,0.25)',
          borderRadius: 6, padding: '10px 12px',
          fontSize: '0.78rem', color: '#94a3b8', lineHeight: 1.6,
          maxHeight: 180, overflowY: 'auto',
          fontFamily: 'var(--font-mono)', whiteSpace: 'pre-wrap',
          border: '1px solid rgba(255,255,255,0.05)'
        }}>
          {chunk.contentPreview}{chunk.contentPreview.length >= 300 ? '…' : ''}
        </div>
      )}
    </div>
  );
}

export default function RAGInspector() {
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState(null);
  const [error, setError] = useState(null);
  const inputRef = useRef(null);

  const handleInspect = async (q) => {
    const query = (q || question).trim();
    if (!query) return;
    setQuestion(query);
    setLoading(true);
    setReport(null);
    setError(null);

    try {
      const res = await inspectorApi.inspect(query);
      if (res.success) {
        setReport(res.report);
      } else {
        setError(res.message || 'Inspection failed');
      }
    } catch (err) {
      setError(err.message || 'Network error — is the backend running?');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleInspect();
    }
  };

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.3rem', color: 'var(--text-main)', marginBottom: 6 }}>
          🔍 Live RAG Query Inspector
        </h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', lineHeight: 1.5 }}>
          Type any question to trace it through the full RAG pipeline — see ranked knowledge chunks, BM25 + Cosine scores, term coverage, and the final grounded answer verdict in real-time.
        </p>
      </div>

      {/* Query Input */}
      <div style={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(99,102,241,0.3)',
        borderRadius: 12,
        padding: '16px 20px',
        marginBottom: 16
      }}>
        <div style={{ display: 'flex', gap: 10 }}>
          <input
            ref={inputRef}
            type="text"
            value={question}
            onChange={e => setQuestion(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="e.g. What is the mission of Zyngram?"
            style={{ flex: 1, fontSize: '0.95rem', padding: '10px 14px' }}
          />
          <button
            className="btn-primary"
            onClick={() => handleInspect()}
            disabled={loading || !question.trim()}
            style={{ padding: '10px 22px', fontSize: '0.9rem', minWidth: 110 }}
          >
            {loading ? '⏳ Tracing...' : '🔍 Inspect'}
          </button>
        </div>

        {/* Sample queries */}
        <div style={{ marginTop: 12, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          <span style={{ fontSize: '0.75rem', color: '#64748b', marginRight: 4, lineHeight: 2 }}>Samples:</span>
          {SAMPLE_QUERIES.map(q => (
            <button
              key={q}
              onClick={() => handleInspect(q)}
              style={{
                fontSize: '0.72rem', padding: '3px 10px',
                borderRadius: 99,
                background: 'rgba(99,102,241,0.1)',
                border: '1px solid rgba(99,102,241,0.2)',
                color: '#a5b4fc', cursor: 'pointer'
              }}
            >
              {q}
            </button>
          ))}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div style={{
          padding: '12px 16px', borderRadius: 8, marginBottom: 16,
          background: 'rgba(244,63,94,0.1)', border: '1px solid rgba(244,63,94,0.2)',
          color: '#fda4af', fontSize: '0.85rem'
        }}>
          ❌ {error}
        </div>
      )}

      {/* Loading skeleton */}
      {loading && (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
          <div style={{ fontSize: '2rem', marginBottom: 12, animation: 'pulse 1.5s infinite' }}>🔎</div>
          <div style={{ fontSize: '0.9rem' }}>Tracing through RAG pipeline…</div>
          <div style={{ fontSize: '0.75rem', color: '#475569', marginTop: 6 }}>Tokenizing → Retrieving → Scoring → Synthesizing</div>
        </div>
      )}

      {/* Report */}
      {report && !loading && (
        <div>
          {/* Summary bar */}
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
            gap: 12, marginBottom: 20
          }}>
            {[
              { label: 'Chunks Found', value: report.totalChunksRetrieved, color: '#6366f1' },
              { label: 'Max Score', value: report.maxHybridScore.toFixed(3), color: '#06b6d4' },
              { label: 'Retrieval', value: `${report.retrievalTimeMs}ms`, color: '#8b5cf6' },
              { label: 'Synthesis', value: `${report.synthesisTimeMs}ms`, color: '#f59e0b' },
              { label: 'Total Time', value: `${report.totalTimeMs}ms`, color: '#10b981' },
              {
                label: 'Verdict',
                value: report.isGrounded ? '✓ GROUNDED' : '⚠ FALLBACK',
                color: report.isGrounded ? '#34d399' : '#fbbf24'
              }
            ].map(stat => (
              <div key={stat.label} style={{
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.07)',
                borderRadius: 10, padding: '12px 14px',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '1.15rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: stat.color }}>
                  {stat.value}
                </div>
                <div style={{ fontSize: '0.68rem', color: '#64748b', marginTop: 3 }}>{stat.label}</div>
              </div>
            ))}
          </div>

          {/* Query Tokens */}
          <div style={{
            background: 'rgba(255,255,255,0.02)',
            border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: 10, padding: '12px 16px', marginBottom: 16
          }}>
            <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: 8, fontWeight: 600 }}>
              🔠 Query Tokens ({report.queryTokens.length})
            </div>
            <div>
              {report.queryTokens.length === 0
                ? <span style={{ fontSize: '0.8rem', color: '#475569' }}>No meaningful tokens extracted (too generic or adversarial).</span>
                : report.queryTokens.map((t, i) => <TokenBadge key={i} token={t} />)
              }
            </div>
          </div>

          {/* Answer Verdict */}
          <div style={{
            borderRadius: 10, padding: '14px 18px', marginBottom: 20,
            background: report.isGrounded ? 'rgba(16,185,129,0.08)' : 'rgba(251,191,36,0.08)',
            border: `1px solid ${report.isGrounded ? 'rgba(16,185,129,0.25)' : 'rgba(251,191,36,0.25)'}`
          }}>
            <div style={{
              fontSize: '0.75rem', fontWeight: 700, marginBottom: 8,
              color: report.isGrounded ? '#34d399' : '#fbbf24'
            }}>
              {report.isGrounded ? '✅ GROUNDED ANSWER' : '⚠️ FALLBACK TRIGGERED'}
              {report.citedSources.length > 0 && (
                <span style={{ marginLeft: 10, fontWeight: 400, color: '#94a3b8' }}>
                  · {report.citedSources.length} cited source{report.citedSources.length > 1 ? 's' : ''}
                </span>
              )}
            </div>
            <div style={{ fontSize: '0.88rem', color: '#e2e8f0', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
              {report.answer}
            </div>
            {report.citedSources.length > 0 && (
              <div style={{ marginTop: 10, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {report.citedSources.map((s, i) => (
                  <span key={i} style={{
                    fontSize: '0.72rem', padding: '3px 10px', borderRadius: 6,
                    background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.2)',
                    color: '#a5b4fc'
                  }}>
                    📄 {s.documentTitle} {s.section ? `· ${s.section}` : ''} ({Math.round((s.relevanceScore || 0) * 100)}%)
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Ranked Chunks */}
          <div style={{ marginBottom: 8 }}>
            <div style={{
              fontSize: '0.8rem', fontWeight: 700, color: '#94a3b8',
              marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8
            }}>
              📊 Retrieved Chunks ({report.chunks.length})
              <span style={{ fontWeight: 400, color: '#475569', fontSize: '0.72rem' }}>
                — sorted by hybrid score descending
              </span>
            </div>

            {report.chunks.length === 0 ? (
              <div style={{
                textAlign: 'center', padding: '32px',
                background: 'rgba(255,255,255,0.02)', borderRadius: 10,
                border: '1px solid rgba(255,255,255,0.06)',
                color: '#475569', fontSize: '0.85rem'
              }}>
                ⚠️ No chunks retrieved — query tokens had zero matches in the knowledge base.
              </div>
            ) : (
              report.chunks.map(chunk => (
                <ChunkCard key={chunk.chunkId} chunk={chunk} maxScore={report.maxHybridScore} />
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
