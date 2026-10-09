import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import '../styles/auth.css';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleFillDemo = (demoEmail, demoPass) => {
    setEmail(demoEmail);
    setPassword(demoPass);
  };

  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-header">
          <div className="auth-logo-badge">Z</div>
          <h1 className="auth-title">Welcome to Zynora</h1>
          <p className="auth-subtitle">Zyngram Internal Knowledge RAG Assistant</p>
        </div>

        {error && (
          <div className="error-banner">
            ⚠️ {error}
          </div>
        )}

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Enterprise Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. operator@zyngram.com"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              required
            />
          </div>

          <button 
            type="submit" 
            className="btn-primary" 
            disabled={loading}
            style={{ width: '100%', marginTop: '6px' }}
          >
            {loading ? 'Authenticating...' : 'Sign In to Workspace'}
          </button>
        </form>

        <div className="demo-credentials-box">
          <span className="demo-title">Quick Demo Logins</span>
          <div className="demo-buttons-row">
            <button
              type="button"
              className="btn-demo"
              onClick={() => handleFillDemo('admin@zyngram.com', 'Admin@Zynora2026!')}
            >
              👑 Admin Demo
            </button>
            <button
              type="button"
              className="btn-demo"
              onClick={() => handleFillDemo('user@zyngram.com', 'User@Zynora2026!')}
            >
              👤 Operator Demo
            </button>
          </div>
        </div>

        <div className="auth-switch">
          Don't have an enterprise account? 
          <Link to="/register" className="auth-link">Register</Link>
        </div>
      </div>
    </div>
  );
}
