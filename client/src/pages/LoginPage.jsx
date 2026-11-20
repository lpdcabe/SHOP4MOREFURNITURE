import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api.js';

export default function LoginPage() {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await api.login({ username: username.trim(), password });
      localStorage.setItem('shop4more_user', JSON.stringify(res.user));
      navigate('/dashboard');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        {/* Left Brand Showcase */}
        <div className="login-brand-panel">
          <div className="login-brand-content">
            <div className="login-logo-badge">
              <img src="/assets/ICON.jpg" alt="Shop 4 More Logo" />
            </div>
            <h1>SHOP 4 MORE</h1>
            <p className="login-brand-sub mb-0">Furniture Inventory Management System</p>
          </div>
        </div>

        {/* Right Sign-In Form */}
        <div className="login-form-panel">
          <div className="login-form-inner">
            <div className="login-form-header">
              <h2>Welcome Back</h2>
              <p>Sign in to manage your furniture inventory</p>
            </div>

            {error && (
              <div className="alert alert-danger py-2 px-3 small d-flex align-items-center gap-2">
                <i className="fas fa-circle-exclamation" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="mb-3">
                <label className="login-label">Username</label>
                <div className="login-input-wrap">
                  <i className="fas fa-user login-input-icon" />
                  <input
                    type="text"
                    className="login-input"
                    placeholder="Enter your username"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                  />
                </div>
              </div>

              <div className="mb-4">
                <label className="login-label">Password</label>
                <div className="login-input-wrap">
                  <i className="fas fa-lock login-input-icon" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    className="login-input"
                    placeholder="Enter your password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    className="login-eye-btn"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label="Toggle password visibility"
                  >
                    <i className={`fas ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`} />
                  </button>
                </div>
              </div>

              <button type="submit" className="login-submit-btn" disabled={loading}>
                <span>{loading ? 'Signing In...' : 'Sign In'}</span>
                <i className={`fas ${loading ? 'fa-spinner fa-spin' : 'fa-arrow-right'}`} />
              </button>
            </form>

            <div className="login-footer">Aliyah F. Lopez | IE-401</div>
          </div>
        </div>
      </div>
    </div>
  );
}
