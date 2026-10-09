import React, { useState, useEffect } from 'react';
import { knowledgeApi } from '../api/knowledgeApi';
import Modal from './Modal';

const CATEGORIES = [
  'Zyngram Company Overview',
  'Services',
  'Franchise Structure',
  'Policies',
  'Frequently Asked Questions',
  'General'
];

const STATUSES = ['DRAFT', 'APPROVED', 'ACTIVE IN RAG', 'ARCHIVED'];

export default function KnowledgeManager() {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [reindexing, setReindexing] = useState(false);
  const [statusMessage, setStatusMessage] = useState(null);

  // New Document Form
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [content, setContent] = useState('');
  const [version, setVersion] = useState('1.0');
  const [status, setStatus] = useState('DRAFT');

  const loadDocuments = async () => {
    try {
      setLoading(true);
      const params = {};
      if (filterStatus) params.status = filterStatus;
      const res = await knowledgeApi.list(params);
      if (res.success) {
        setDocuments(res.documents);
      }
    } catch (err) {
      console.error('Failed to load documents:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDocuments();
  }, [filterStatus]);

  const handleCreateDocument = async (e) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;

    try {
      const res = await knowledgeApi.create({
        title: title.trim(),
        category,
        content: content.trim(),
        version,
        status
      });

      if (res.success) {
        setModalOpen(false);
        setTitle('');
        setContent('');
        setStatusMessage({ type: 'success', text: 'Document created and indexed successfully!' });
        loadDocuments();
      }
    } catch (err) {
      setStatusMessage({ type: 'error', text: err.message || 'Failed to create document' });
    }
  };

  const handleStatusChange = async (docId, newStatus) => {
    try {
      const res = await knowledgeApi.updateStatus(docId, newStatus);
      if (res.success) {
        setStatusMessage({ type: 'success', text: `Document lifecycle updated to ${newStatus}` });
        loadDocuments();
      }
    } catch (err) {
      setStatusMessage({ type: 'error', text: err.message || 'Status update failed' });
    }
  };

  const handleDelete = async (docId) => {
    if (!window.confirm('Delete this knowledge document and its indexed chunks?')) return;
    try {
      await knowledgeApi.delete(docId);
      setStatusMessage({ type: 'success', text: 'Document deleted.' });
      loadDocuments();
    } catch (err) {
      setStatusMessage({ type: 'error', text: err.message || 'Deletion failed' });
    }
  };

  const handleReindex = async () => {
    try {
      setReindexing(true);
      const res = await knowledgeApi.reindex();
      if (res.success) {
        setStatusMessage({ type: 'success', text: `Reindexed ${res.documentsIndexed} knowledge documents!` });
        loadDocuments();
      }
    } catch (err) {
      setStatusMessage({ type: 'error', text: err.message || 'Re-indexing failed' });
    } finally {
      setReindexing(false);
    }
  };

  const getBadgeClass = (s) => {
    switch (s) {
      case 'DRAFT': return 'badge-draft';
      case 'APPROVED': return 'badge-approved';
      case 'ACTIVE IN RAG': return 'badge-active';
      case 'ARCHIVED': return 'badge-archived';
      default: return '';
    }
  };

  return (
    <div>
      <div className="section-header">
        <div>
          <h2 className="section-title">Approved Knowledge Repository</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            Manage Zyngram enterprise documentation lifecycle (DRAFT → APPROVED → ACTIVE IN RAG → ARCHIVED).
          </p>
        </div>

        <div className="section-actions">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            style={{ padding: '8px 12px', fontSize: '0.85rem' }}
          >
            <option value="">All Lifecycle Statuses</option>
            {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>

          <button 
            className="btn-secondary" 
            onClick={handleReindex}
            disabled={reindexing}
          >
            {reindexing ? '⏳ Reindexing...' : '🔄 Re-Index Knowledge'}
          </button>

          <button className="btn-primary" onClick={() => setModalOpen(true)}>
            + Add Document
          </button>
        </div>
      </div>

      {statusMessage && (
        <div style={{
          padding: '10px 16px',
          borderRadius: 'var(--radius-md)',
          marginBottom: '16px',
          fontSize: '0.88rem',
          backgroundColor: statusMessage.type === 'error' ? 'rgba(244, 63, 94, 0.15)' : 'rgba(16, 185, 129, 0.15)',
          color: statusMessage.type === 'error' ? '#fda4af' : '#6ee7b7',
          border: `1px solid ${statusMessage.type === 'error' ? 'rgba(244, 63, 94, 0.3)' : 'rgba(16, 185, 129, 0.3)'}`
        }}>
          {statusMessage.text}
        </div>
      )}

      <div className="table-card">
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
            Loading knowledge documents...
          </div>
        ) : (
          <table className="custom-table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Category</th>
                <th>Version</th>
                <th>Status</th>
                <th>Chunks</th>
                <th>Updated</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {documents.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '30px', color: 'var(--text-dim)' }}>
                    No documents found matching the filter.
                  </td>
                </tr>
              ) : (
                documents.map((doc) => (
                  <tr key={doc.id}>
                    <td style={{ fontWeight: 600 }}>{doc.title}</td>
                    <td>
                      <span style={{ fontSize: '0.78rem', color: '#a5b4fc', background: 'rgba(99, 102, 241, 0.1)', padding: '2px 8px', borderRadius: '4px' }}>
                        {doc.category}
                      </span>
                    </td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>v{doc.version}</td>
                    <td>
                      <span className={`badge ${getBadgeClass(doc.status)}`}>
                        {doc.status}
                      </span>
                    </td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>{doc.chunkCount}</td>
                    <td style={{ color: 'var(--text-dim)', fontSize: '0.78rem' }}>
                      {new Date(doc.updatedAt).toLocaleDateString()}
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <select
                          value={doc.status}
                          onChange={(e) => handleStatusChange(doc.id, e.target.value)}
                          style={{ padding: '4px 8px', fontSize: '0.75rem', borderRadius: '4px' }}
                        >
                          {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                        <button
                          onClick={() => handleDelete(doc.id)}
                          style={{ color: '#fda4af', padding: '4px 6px', fontSize: '0.8rem' }}
                          title="Delete Document"
                        >
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Add Document Modal */}
      <Modal
        isOpen={modalOpen}
        title="Add Knowledge Document"
        onClose={() => setModalOpen(false)}
      >
        <form onSubmit={handleCreateDocument} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div className="form-group">
            <label className="form-label">Document Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Zyngram Autonomous Dispatch Directives"
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div className="form-group">
              <label className="form-label">Category</label>
              <select value={category} onChange={(e) => setCategory(e.target.value)}>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Initial Status</label>
              <select value={status} onChange={(e) => setStatus(e.target.value)}>
                {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Content (Markdown or Plain Text)</label>
            <textarea
              rows={8}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Paste official, approved operational knowledge here..."
              required
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '6px' }}>
            <button type="button" className="btn-secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              Save and Index
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
