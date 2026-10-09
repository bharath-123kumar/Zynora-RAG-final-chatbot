import React, { useState, useEffect } from 'react';
import { monitoringApi } from '../api/monitoringApi';

export default function MonitoringDashboard() {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const loadMetrics = async () => {
    try {
      setLoading(true);
      const params = {};
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      const res = await monitoringApi.getMetrics(params);
      if (res.success) {
        setMetrics(res.metrics);
      }
    } catch (err) {
      console.error('Failed to load monitoring metrics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMetrics();
  }, [startDate, endDate]);

  if (loading && !metrics) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
        Computing live RAG monitoring analytics...
      </div>
    );
  }

  const m = metrics || {};
  const health = m.serviceHealth || {};

  return (
    <div>
      {/* Health Banner */}
      <div className="health-banner">
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div className="health-dot" style={{ backgroundColor: health.status === 'HEALTHY' ? '#10b981' : '#f59e0b' }} />
          <div>
            <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-main)' }}>
              AI / RAG Engine Health: <span style={{ color: health.status === 'HEALTHY' ? '#34d399' : '#fbbf24' }}>{health.status || 'UNKNOWN'}</span>
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              DB Engine: {health.databaseEngine || 'PostgreSQL'} • Active Documents: {health.activeDocumentsIndexed || 0} • Status: {health.ragPipelineStatus || 'OPERATIONAL'}
            </div>
          </div>
        </div>

        {/* Date Filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            style={{ padding: '6px 10px', fontSize: '0.8rem' }}
            title="Start Date Filter"
          />
          <span style={{ color: 'var(--text-dim)', fontSize: '0.8rem' }}>to</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            style={{ padding: '6px 10px', fontSize: '0.8rem' }}
            title="End Date Filter"
          />
          {(startDate || endDate) && (
            <button 
              className="btn-secondary" 
              onClick={() => { setStartDate(''); setEndDate(''); }}
              style={{ padding: '6px 10px', fontSize: '0.78rem' }}
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* KPI Metrics Grid */}
      <div className="metrics-grid">
        <div className="metric-card">
          <span className="metric-label">Total Conversations</span>
          <span className="metric-value">{m.totalConversations || 0}</span>
          <span className="metric-sub">Across all authorized users</span>
        </div>

        <div className="metric-card">
          <span className="metric-label">Total Questions Asked</span>
          <span className="metric-value">{m.totalQuestions || 0}</span>
          <span className="metric-sub">Tracked in evaluation logs</span>
        </div>

        <div className="metric-card">
          <span className="metric-label">Successful Answers</span>
          <span className="metric-value" style={{ color: '#34d399' }}>{m.successfulAnswers || 0}</span>
          <span className="metric-sub">Strictly grounded in approved docs</span>
        </div>

        <div className="metric-card">
          <span className="metric-label">No-Answer Fallbacks</span>
          <span className="metric-value" style={{ color: '#fbbf24' }}>{m.noAnswerResponses || 0}</span>
          <span className="metric-sub">Exact fallback triggered safely</span>
        </div>

        <div className="metric-card">
          <span className="metric-label">Average Response Time</span>
          <span className="metric-value">{m.averageResponseTimeMs || 0}ms</span>
          <span className="metric-sub">Local embedding & retrieval latency</span>
        </div>

        <div className="metric-card">
          <span className="metric-label">System Errors</span>
          <span className="metric-value" style={{ color: m.errorCount > 0 ? '#fda4af' : 'var(--text-main)' }}>
            {m.errorCount || 0}
          </span>
          <span className="metric-sub">Retrieval & authorization errors</span>
        </div>
      </div>

      {/* Frequently Asked Questions */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '20px' }}>
        <div className="table-card">
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-subtle)', fontWeight: 700 }}>
            🔥 Frequently Asked Questions
          </div>
          <table className="custom-table">
            <thead>
              <tr>
                <th>Question</th>
                <th>Count</th>
                <th>Outcome</th>
              </tr>
            </thead>
            <tbody>
              {(!m.frequentlyAskedQuestions || m.frequentlyAskedQuestions.length === 0) ? (
                <tr>
                  <td colSpan="3" style={{ textAlign: 'center', padding: '24px', color: 'var(--text-dim)' }}>
                    No recorded questions yet.
                  </td>
                </tr>
              ) : (
                m.frequentlyAskedQuestions.map((faq, i) => (
                  <tr key={i}>
                    <td style={{ fontSize: '0.85rem' }}>{faq.question}</td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{faq.count}</td>
                    <td>
                      <span className={`badge ${faq.grounded ? 'badge-active' : 'badge-draft'}`}>
                        {faq.grounded ? 'Grounded' : 'Fallback'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Knowledge Categories Breakdown */}
        <div className="table-card">
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-subtle)', fontWeight: 700 }}>
            📂 Knowledge Base Categories
          </div>
          <table className="custom-table">
            <thead>
              <tr>
                <th>Category</th>
                <th>Status</th>
                <th>Docs</th>
              </tr>
            </thead>
            <tbody>
              {(!m.knowledgeCategories || m.knowledgeCategories.length === 0) ? (
                <tr>
                  <td colSpan="3" style={{ textAlign: 'center', padding: '24px', color: 'var(--text-dim)' }}>
                    No categories registered.
                  </td>
                </tr>
              ) : (
                m.knowledgeCategories.map((cat, i) => (
                  <tr key={i}>
                    <td style={{ fontSize: '0.82rem', fontWeight: 500 }}>{cat.category}</td>
                    <td>
                      <span style={{ fontSize: '0.7rem', color: '#9ca3af' }}>{cat.status}</span>
                    </td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{cat.count}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
