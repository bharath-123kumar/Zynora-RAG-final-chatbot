import React, { useState, useEffect, useRef } from 'react';
import { conversationApi } from '../api/conversationApi';
import { chatApi } from '../api/chatApi';
import { useAuth } from '../context/AuthContext';
import Sidebar from '../components/Sidebar';
import MessageBubble from '../components/MessageBubble';
import Modal from '../components/Modal';
import '../styles/chat.css';

const SAMPLE_PROMPTS = [
  'Explain the Zyngram Physical Franchise Hierarchy.',
  'What is Zyngram Express Transit and how fast is it?',
  'What is the document lifecycle policy for approved knowledge?',
  'What is Zynora RAG Intelligence System?'
];

export default function ChatPage() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [activeConversationId, setActiveConversationId] = useState(null);
  const [currentConversation, setCurrentConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [clearModalOpen, setClearModalOpen] = useState(false);
  const [errorBanner, setErrorBanner] = useState(null);

  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  // Load user conversations
  const loadConversations = async () => {
    try {
      const res = await conversationApi.list();
      if (res.success) {
        setConversations(res.conversations);
      }
    } catch (err) {
      console.error('Failed to load conversations:', err);
    }
  };

  useEffect(() => {
    loadConversations();
  }, []);

  // Load active conversation details & messages
  const loadActiveConversation = async (convId) => {
    if (!convId) {
      setCurrentConversation(null);
      setMessages([]);
      return;
    }

    try {
      const res = await conversationApi.get(convId);
      if (res.success && res.conversation) {
        setCurrentConversation(res.conversation);
        setMessages(res.conversation.messages || []);
      }
    } catch (err) {
      console.error('Failed to load conversation details:', err);
    }
  };

  useEffect(() => {
    if (activeConversationId) {
      loadActiveConversation(activeConversationId);
    } else {
      setCurrentConversation(null);
      setMessages([]);
    }
  }, [activeConversationId]);

  // Handle New Conversation
  const handleNewConversation = async () => {
    setActiveConversationId(null);
    setCurrentConversation(null);
    setMessages([]);
    setSidebarOpen(false);
  };

  // Select Conversation
  const handleSelectConversation = (convId) => {
    setActiveConversationId(convId);
    setSidebarOpen(false);
  };

  // Rename Conversation
  const handleRenameConversation = async (convId, newTitle) => {
    try {
      await conversationApi.rename(convId, newTitle);
      loadConversations();
      if (activeConversationId === convId) {
        setCurrentConversation(prev => prev ? { ...prev, title: newTitle } : null);
      }
    } catch (err) {
      console.error('Rename failed:', err);
    }
  };

  // Delete Conversation
  const handleDeleteConversation = async (convId) => {
    try {
      await conversationApi.delete(convId);
      if (activeConversationId === convId) {
        setActiveConversationId(null);
        setCurrentConversation(null);
        setMessages([]);
      }
      loadConversations();
    } catch (err) {
      console.error('Delete failed:', err);
    }
  };

  // Clear Conversation Messages
  const handleClearMessages = async () => {
    if (!activeConversationId) return;
    try {
      await conversationApi.clear(activeConversationId);
      setMessages([]);
      setClearModalOpen(false);
      loadConversations();
    } catch (err) {
      console.error('Clear failed:', err);
    }
  };

  // Send Message
  const handleSendMessage = async (e) => {
    if (e) e.preventDefault();
    const trimmed = inputMessage.trim();
    if (!trimmed || loading) return;

    setErrorBanner(null);
    setInputMessage('');

    // Optimistic UI for user message
    const tempUserMsg = {
      id: `temp_${Date.now()}`,
      role: 'user',
      content: trimmed,
      createdAt: new Date().toISOString()
    };

    setMessages(prev => [...prev, tempUserMsg]);
    setLoading(true);

    try {
      const res = await chatApi.sendMessage(trimmed, activeConversationId);
      if (res.success) {
        const assistantMsg = {
          id: res.messageId || `asst_${Date.now()}`,
          role: 'assistant',
          content: res.answer,
          grounded: res.grounded,
          confidenceScore: res.confidenceIndicator,
          responseTimeMs: res.responseTimeMs,
          sources: res.sources || [],
          createdAt: new Date().toISOString()
        };

        setMessages(prev => [...prev, assistantMsg]);

        // If newly created conversation, set active ID and refresh list
        if (!activeConversationId && res.conversationId) {
          setActiveConversationId(res.conversationId);
          loadConversations();
        }
      }
    } catch (err) {
      setErrorBanner(err.message || 'An error occurred while retrieving answer from approved knowledge base.');
    } finally {
      setLoading(false);
    }
  };

  const handlePromptClick = (prompt) => {
    setInputMessage(prompt);
  };

  return (
    <div className="chat-page">
      <Sidebar
        conversations={conversations}
        activeConversationId={activeConversationId}
        onSelectConversation={handleSelectConversation}
        onNewConversation={handleNewConversation}
        onRenameConversation={handleRenameConversation}
        onDeleteConversation={handleDeleteConversation}
        isOpen={sidebarOpen}
        onCloseMobile={() => setSidebarOpen(false)}
      />

      <main className="chat-main">
        {/* Header */}
        <header className="chat-header">
          <div className="chat-header-info">
            <button 
              className="mobile-nav-toggle btn-secondary"
              onClick={() => setSidebarOpen(true)}
              style={{ padding: '6px 10px' }}
              title="Open Navigation"
            >
              ☰
            </button>
            <div>
              <div className="chat-active-title">
                {currentConversation ? currentConversation.title : 'New Inquiry'}
              </div>
              {currentConversation && (
                <span className="chat-id-tag">
                  ID: {currentConversation.id.substring(0, 8)}...
                </span>
              )}
            </div>
          </div>

          <div className="chat-header-actions">
            <span style={{ fontSize: '0.78rem', color: '#38bdf8', background: 'rgba(6, 182, 212, 0.1)', padding: '4px 10px', borderRadius: 'var(--radius-full)', border: '1px solid rgba(6, 182, 212, 0.25)' }}>
              🔒 Zero-Trust Grounded AI
            </span>

            {activeConversationId && messages.length > 0 && (
              <button
                className="btn-secondary"
                style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                onClick={() => setClearModalOpen(true)}
                title="Clear current conversation messages"
              >
                🧹 Clear
              </button>
            )}
          </div>
        </header>

        {/* Error Banner */}
        {errorBanner && (
          <div style={{
            margin: '12px 24px 0',
            padding: '10px 16px',
            background: 'rgba(244, 63, 94, 0.15)',
            border: '1px solid rgba(244, 63, 94, 0.3)',
            borderRadius: 'var(--radius-md)',
            color: '#fda4af',
            fontSize: '0.85rem'
          }}>
            ⚠️ {errorBanner}
          </div>
        )}

        {/* Messages History */}
        <div className="chat-messages">
          {messages.length === 0 ? (
            <div className="empty-chat-welcome">
              <div className="welcome-icon">💬</div>
              <h2 className="welcome-title">How can Zynora assist your operations today?</h2>
              <p className="welcome-desc">
                Zynora answers strictly from verified, approved Zyngram documentation. All responses include source citations and grounded confidence scores.
              </p>

              <div className="sample-prompts">
                {SAMPLE_PROMPTS.map((prompt, idx) => (
                  <button
                    key={idx}
                    className="prompt-card"
                    onClick={() => handlePromptClick(prompt)}
                  >
                    👉 {prompt}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((msg) => (
              <MessageBubble key={msg.id} message={msg} />
            ))
          )}

          {loading && (
            <div className="message-wrapper assistant">
              <div className="brand-icon" style={{ width: 36, height: 36, fontSize: '1rem' }}>
                Z
              </div>
              <div className="typing-indicator">
                <span className="typing-dot" />
                <span className="typing-dot" />
                <span className="typing-dot" />
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <div className="chat-input-bar">
          <form className="chat-input-form" onSubmit={handleSendMessage}>
            <textarea
              className="chat-textarea"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              placeholder="Ask a question regarding franchise hierarchy, transit, policies, or services..."
              rows={1}
            />
            <button
              type="submit"
              className="btn-send"
              disabled={loading || !inputMessage.trim()}
              title="Send Message"
            >
              ➤
            </button>
          </form>
          <div className="input-disclaimer">
            Zynora retrieves strictly approved knowledge. Unapproved drafts and general internet knowledge are excluded.
          </div>
        </div>
      </main>

      {/* Clear Confirmation Modal */}
      <Modal
        isOpen={clearModalOpen}
        title="Clear Conversation"
        onClose={() => setClearModalOpen(false)}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Are you sure you want to clear all messages in this conversation? This action cannot be undone.
          </p>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
            <button className="btn-secondary" onClick={() => setClearModalOpen(false)}>
              Cancel
            </button>
            <button className="btn-danger" onClick={handleClearMessages}>
              Clear Messages
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
