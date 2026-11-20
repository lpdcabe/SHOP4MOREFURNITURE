import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api.js';

export default function LoginPage() {
  const navigate = useNavigate();
  const [username, setUsername] = useState('administrator');
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
    <div className="landing-body">
      <div className="landing-box">
        <img src="/assets/ICON.jpg" alt="Shop 4 More Logo" className="landing-logo" />
        <h1>SHOP 4 MORE</h1>
        <h4>Furniture Inventory Management System</h4>

        {error && <div className="alert alert-danger py-2 text-start">{error}</div>}

        <form onSubmit={handleSubmit} className="text-start mt-3">
          <div className="mb-3">
            <label className="form-label fw-medium">Username</label>
            <div className="input-group">
              <span className="input-group-text">
                <i className="fas fa-user" />
              </span>
              <input
                type="text"
                className="form-control"
                placeholder="Enter username"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>
          </div>

          <div className="mb-4">
            <label className="form-label fw-medium">Password</label>
            <div className="input-group">
              <span className="input-group-text">
                <i className="fas fa-lock" />
              </span>
              <input
                type={showPassword ? 'text' : 'password'}
                className="form-control"
                placeholder="Enter password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="button"
                className="btn btn-outline-secondary"
                onClick={() => setShowPassword((v) => !v)}
                aria-label="Toggle password visibility"
              >
                <i className={`fas ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`} />
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="btn-enter w-100 justify-content-center border-0"
            disabled={loading}
          >
            <i className="fas fa-right-to-bracket" />
            {loading ? 'Signing In...' : 'Sign In'}
          </button>
        </form>

        <div className="landing-footer">Aliyah F. Lopez | IE-401</div>
      </div>
    </div>
  );
}
