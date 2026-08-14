import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../components/AuthContext';
import './Auth.css';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Login failed');
        return;
      }

      login(data);

      switch (data.role) {
        case 'RELIEF_ORG':
          if (data.profile?.status === 'PENDING') {
            navigate('/pending-approval');
          } else {
            navigate('/organization');
          }
          break;
        case 'ADMIN':
          navigate('/admin');
          break;
        case 'VOLUNTEER':
          navigate('/volunteer');
          break;
        case 'PUBLIC':
          navigate('/public');
          break;
        default:
          navigate('/');
      }
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <Link to="/" className="auth-back-link">&larr; Back to home</Link>
      <div className="auth-card">
        <div className="auth-header">
          <div className="auth-logo">RN</div>
          <h1>Welcome back</h1>
          <p>Sign in to your RescueNet account</p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          <label>
            Username
            <input type="text" value={username} onChange={e => setUsername(e.target.value)} placeholder="Enter your username" autoFocus />
          </label>
          <label>
            Password
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Enter your password" />
          </label>
          {error && <p className="auth-error">{error}</p>}
          <button type="submit" className="auth-btn" disabled={loading || !username || !password}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <p className="auth-footer-text">
          Don't have an account? <Link to="/register">Register</Link>
        </p>
      </div>
    </div>
  );
}
