import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import Modal from './Modal';

export default function Sidebar({
  conversations,
  activeConversationId,
  onSelectConversation,
  onNewConversation,
  onRenameConversation,
  onDeleteConversation,
  isOpen,
  onCloseMobile
}) {
  const { user, logout, isAdmin } = useAuth();
  const [renameModalOpen, setRenameModalOpen] = useState(false);
  const [targetConv, setTargetConv] = useState(null);
  const [newTitle, setNewTitle] = useState('');

  const handleOpenRename = (e, conv) => {
    e.stopPropagation();
    setTargetConv(conv);
    setNewTitle(conv.title);
    setRenameModalOpen(true);
  };

  const handleConfirmRename = () => {
    if (targetConv && newTitle.trim()) {
      onRenameConversation(targetConv.id, newTitle.trim());
      setRenameModalOpen(false);
    }
  };

  const handleDelete = (e, convId) => {
    e.stopPropagation();
    if (window.confirm('Are you sure you want to delete this conversation?')) {
      onDeleteConversation(convId);
    }
  };

  return (
    <>
      <aside className={`chat-sidebar ${isOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <div className="brand-container">
            <div className="brand-logo">
              <div className="brand-icon">Z</div>
              <div>
                <span className="brand-name">Zynora</span>
                <span className="brand-tag">RAG AI</span>
              </div>
            </div>
            {onCloseMobile && (
              <button 
                className="mobile-nav-toggle" 
                onClick={onCloseMobile}
                style={{ color: 'var(--text-muted)' }}
              >
                ✕
              </button>
            )}
          </div>

          <button className="btn-new-chat" onClick={onNewConversation}>
            <span>+</span>
            <span>New Conversation</span>
          </button>
        </div>

        <div className="conversation-list">
          {conversations.length === 0 ? (
            <div style={{ padding: '20px 10px', textAlign: 'center', color: 'var(--text-dim)', fontSize: '0.82rem' }}>
              No conversations yet. Start a new chat!
            </div>
          ) : (
            conversations.map((conv) => {
              const isActive = conv.id === activeConversationId;
              return (
                <div
                  key={conv.id}
                  className={`conv-item ${isActive ? 'active' : ''}`}
                  onClick={() => onSelectConversation(conv.id)}
                >
                  <span className="conv-title" title={conv.title}>
                    💬 {conv.title}
                  </span>

                  <div className="conv-actions">
                    <button
                      className="conv-action-btn"
                      title="Rename"
                      onClick={(e) => handleOpenRename(e, conv)}
                    >
                      ✏️
                    </button>
                    <button
                      className="conv-action-btn"
                      title="Delete"
                      onClick={(e) => handleDelete(e, conv.id)}
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="sidebar-footer">
          <div className="user-badge">
            <div className="avatar-circle">
              {user?.fullName?.charAt(0) || 'U'}
            </div>
            <div className="user-name-role">
              <span className="user-name">{user?.fullName || 'Operator'}</span>
              <span className="user-role">{user?.role || 'User'}</span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            {isAdmin && (
              <Link 
                to="/admin" 
                className="btn-secondary" 
                style={{ padding: '6px 10px', fontSize: '0.75rem' }}
                title="Admin Dashboard"
              >
                ⚙️ Admin
              </Link>
            )}
            <button
              onClick={logout}
              className="conv-action-btn"
              title="Logout"
              style={{ padding: '6px 8px' }}
            >
              🚪
            </button>
          </div>
        </div>
      </aside>

      {/* Rename Modal */}
      <Modal
        isOpen={renameModalOpen}
        title="Rename Conversation"
        onClose={() => setRenameModalOpen(false)}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div className="form-group">
            <label className="form-label">Conversation Title</label>
            <input
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Enter new conversation title"
              autoFocus
            />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
            <button className="btn-secondary" onClick={() => setRenameModalOpen(false)}>
              Cancel
            </button>
            <button className="btn-primary" onClick={handleConfirmRename}>
              Save
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}
