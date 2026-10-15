import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import KnowledgeManager from '../components/KnowledgeManager';
import MonitoringDashboard from '../components/MonitoringDashboard';
import RAGInspector from '../components/RAGInspector';
import '../styles/admin.css';

export default function AdminPage() {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('knowledge'); // 'knowledge' | 'monitoring' | 'inspector'

  if (!isAdmin) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '16px' }}>
        <h2 style={{ color: '#fda4af' }}>Access Denied</h2>
        <p style={{ color: 'var(--text-muted)' }}>You do not have administrative privileges to view this portal.</p>
        <Link to="/" className="btn-primary">Return to Chat</Link>
      </div>
    );
  }

  return (
    <div className="admin-page">
      <header className="admin-navbar">
        <div className="admin-nav-left">
          <div className="admin-title-badge">
            <div className="brand-icon" style={{ width: 34, height: 34 }}>Z</div>
            <span style={{ fontWeight: 800, fontSize: '1.2rem', fontFamily: 'var(--font-heading)' }}>Zynora Admin Console</span>
            <span className="admin-badge">Tier: HQ Command</span>
          </div>

          <div className="admin-tabs">
            <button 
              className={`admin-tab ${activeTab === 'knowledge' ? 'active' : ''}`}
              onClick={() => setActiveTab('knowledge')}
            >
              📚 Knowledge Base
            </button>
            <button 
              className={`admin-tab ${activeTab === 'monitoring' ? 'active' : ''}`}
              onClick={() => setActiveTab('monitoring')}
            >
              📊 Monitoring & Analytics
            </button>
            <button 
              className={`admin-tab ${activeTab === 'inspector' ? 'active' : ''}`}
              onClick={() => setActiveTab('inspector')}
              style={{ position: 'relative' }}
            >
              🔍 RAG Inspector
              <span style={{
                position: 'absolute', top: -6, right: -6,
                background: '#6366f1', color: '#fff',
                fontSize: '0.55rem', fontWeight: 800, padding: '1px 5px',
                borderRadius: 99, letterSpacing: '0.05em'
              }}>NEW</span>
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Logged in as: <strong>{user?.fullName}</strong>
          </span>
          <Link to="/" className="btn-secondary" style={{ padding: '8px 14px', fontSize: '0.85rem' }}>
            ← Back to Chat
          </Link>
        </div>
      </header>

      <main className="admin-content">
        {activeTab === 'knowledge' ? (
          <KnowledgeManager />
        ) : activeTab === 'monitoring' ? (
          <MonitoringDashboard />
        ) : (
          <RAGInspector />
        )}
      </main>
    </div>
  );
}
