import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../components/AuthContext';
import './Auth.css';

export default function PendingApproval() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <div className="auth-page">
      <Link to="/" className="auth-back-link">&larr; Back to home</Link>
      <div className="auth-card pending-card">
        <div className="pending-icon">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
        </div>

        <h1>Pending Approval</h1>
        <p className="pending-message">
          Your relief organization account <strong>{user?.profile?.name || user?.username}</strong> has been registered successfully and is currently awaiting admin approval.
        </p>
        <p className="pending-detail">
          A system administrator will review your registration. You will be able to access the dashboard once your organization has been approved.
        </p>

        <div className="pending-status">
          <div className="status-row">
            <span className="status-label">Username</span>
            <span className="status-value">{user?.username}</span>
          </div>
          <div className="status-row">
            <span className="status-label">Organization</span>
            <span className="status-value">{user?.profile?.name || '—'}</span>
          </div>
          <div className="status-row">
            <span className="status-label">Status</span>
            <span className="pending-badge">Pending</span>
          </div>
        </div>

        <button className="auth-btn-secondary" onClick={handleLogout}>
          Sign out
        </button>
      </div>
    </div>
  );
}
