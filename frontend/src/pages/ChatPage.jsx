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
  const [loadingStep, setLoadingStep] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [clearModalOpen, setClearModalOpen] = useState(false);
  const [errorBanner, setErrorBanner] = useState(null);
  const [copyFeedback, setCopyFeedback] = useState(false);

  const messagesEndRef = useRef(null);
  const isSubmittingRef = useRef(false);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  // Loading animation step tracker
  useEffect(() => {
    if (!loading) {
      setLoadingStep('');
      return;
    }
    setLoadingStep('Ingesting query and matching approved documents...');
    const timer1 = setTimeout(() => {
      setLoadingStep('Calculating BM25 + cosine vector similarity...');
    }, 450);
    const timer2 = setTimeout(() => {
      setLoadingStep('Verifying zero-trust grounding & citations...');
    }, 900);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, [loading]);

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

  // Send Message with strict duplicate suppression
  const handleSendMessage = async (textToSend = null) => {
    if (isSubmittingRef.current || loading) return;

    const trimmed = (textToSend || inputMessage).trim();
    if (!trimmed) return;

    // Atomic submission lock
    isSubmittingRef.current = true;
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
      isSubmittingRef.current = false;
    }
  };

  const handlePromptClick = (prompt) => {
    handleSendMessage(prompt);
  };

  // Export / Copy Transcript
  const handleExportTranscript = () => {
    if (messages.length === 0) return;

    const transcript = messages.map(m => {
      const header = m.role === 'user' ? '👤 OPERATOR' : '🤖 ZYNORA AI';
      let body = `${header} (${new Date(m.createdAt).toLocaleTimeString()}):\n${m.content}`;
      if (m.sources && m.sources.length > 0) {
        body += '\n\nCITED SOURCES:\n' + m.sources.map(s => ` - [${s.documentTitle}] Section: ${s.section} (Match: ${Math.round((s.relevanceScore || 0) * 100)}%)`).join('\n');
      }
      return body;
    }).join('\n\n' + '='.repeat(60) + '\n\n');

    navigator.clipboard.writeText(transcript).then(() => {
      setCopyFeedback(true);
      setTimeout(() => setCopyFeedback(false), 2500);
    });
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
              aria-label="Open Navigation"
            >
              ☰
            </button>
            <div>
              <div className="chat-active-title">
                {currentConversation ? currentConversation.title : 'Operational Inquiry'}
              </div>
              {currentConversation && (
                <span className="chat-id-tag">
                  ID: {currentConversation.id.substring(0, 8)}...
                </span>
              )}
            </div>
          </div>

          <div className="chat-header-actions">
            <span className="badge-grounded-status">
              🔒 Zero-Trust Grounded AI
            </span>

            {messages.length > 0 && (
              <button
                className="btn-secondary"
                style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                onClick={handleExportTranscript}
                title="Copy conversation transcript to clipboard"
              >
                {copyFeedback ? '✓ Copied Transcript' : '📤 Export'}
              </button>
            )}

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
          <div className="chat-error-banner">
            <span>⚠️ {errorBanner}</span>
            <button 
              className="chat-error-dismiss"
              onClick={() => setErrorBanner(null)}
              title="Dismiss"
            >
              ✕
            </button>
          </div>
        )}

        {/* Messages History */}
        <div className="chat-messages">
          {messages.length === 0 ? (
            <div className="empty-chat-welcome">
              <div className="welcome-icon">💬</div>
              <h2 className="welcome-title">How can Zynora assist your operations today?</h2>
              <p className="welcome-desc">
                Zynora synthesizes strictly from verified, approved Zyngram documentation. All answers feature auditable citations, grounded confidence metrics, and knowledge-boundary protection.
              </p>

              <div className="sample-prompts-label">CLICK A SAMPLE INQUIRY TO EXECUTE:</div>
              <div className="sample-prompts">
                {SAMPLE_PROMPTS.map((prompt, idx) => (
                  <button
                    key={idx}
                    className="prompt-card"
                    onClick={() => handlePromptClick(prompt)}
                    disabled={loading}
                    title="Run sample inquiry"
                  >
                    <span className="prompt-arrow">👉</span>
                    <span>{prompt}</span>
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
              <div className="typing-indicator-box">
                <div className="typing-indicator-dots">
                  <span className="typing-dot" />
                  <span className="typing-dot" />
                  <span className="typing-dot" />
                </div>
                <div className="typing-status-text">
                  {loadingStep || 'Retrieving approved knowledge...'}
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <div className="chat-input-bar">
          <form 
            className="chat-input-form" 
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
          >
            <textarea
              className="chat-textarea"
              value={inputMessage}
              disabled={loading}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              placeholder={loading ? "Generating grounded answer..." : "Ask a question regarding franchise hierarchy, transit, policies, or services..."}
              rows={1}
              aria-label="Ask a question"
            />
            <button
              type="submit"
              className="btn-send"
              disabled={loading || !inputMessage.trim()}
              title={loading ? "Processing..." : "Send Message"}
              aria-label="Send Message"
            >
              {loading ? (
                <span className="spinner-inline" />
              ) : (
                '➤'
              )}
            </button>
          </form>
          <div className="input-disclaimer">
            Zero-Trust Policy: Unapproved drafts, archived docs, and external hallucinations are strictly excluded.
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
