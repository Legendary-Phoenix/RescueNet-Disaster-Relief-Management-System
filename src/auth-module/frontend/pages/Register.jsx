import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../components/AuthContext';
import './Auth.css';

const ROLES = [
  { value: 'ADMIN', label: 'System Administrator', description: 'Manage disaster events, shelters, and system operations' },
  { value: 'RELIEF_ORG', label: 'Relief Organization', description: 'Manage volunteers, resources, and shelter operations' },
  { value: 'PUBLIC', label: 'Public User', description: 'View disaster events, shelters, and submit emergency reports' },
];

export default function Register() {
  const [step, setStep] = useState(1);
  const [role, setRole] = useState('');
  const [formData, setFormData] = useState({ username: '', password: '', confirmPassword: '', name: '', contactNumber: '', address: '', age: '', gender: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  function handleRoleSelect(r) {
    setRole(r);
    setStep(2);
    setError('');
  }

  function set(field) {
    return e => setFormData(prev => ({ ...prev, [field]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, role, age: formData.age ? parseInt(formData.age) : null }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Registration failed');
        return;
      }

      const loginRes = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: formData.username, password: formData.password }),
      });
      const userData = await loginRes.json();
      login(userData);

      if (role === 'RELIEF_ORG') {
        navigate('/pending-approval');
      } else if (role === 'ADMIN') {
        navigate('/admin');
      } else {
        navigate('/public');
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
          <h1>Create an account</h1>
          <p>{step === 1 ? 'Choose your role to get started' : `Registering as ${ROLES.find(r => r.value === role)?.label}`}</p>
        </div>

        {step === 1 ? (
          <div className="role-selection">
            {ROLES.map(r => (
              <button key={r.value} className="role-card" onClick={() => handleRoleSelect(r.value)}>
                <span className="role-icon">{r.value === 'ADMIN' ? ShieldIcon() : r.value === 'RELIEF_ORG' ? OrgIcon() : GlobeIcon()}</span>
                <div>
                  <span className="role-name">{r.label}</span>
                  <span className="role-desc">{r.description}</span>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <form className="auth-form" onSubmit={handleSubmit}>
            <label>
              Username
              <input type="text" value={formData.username} onChange={set('username')} placeholder="Choose a username" autoFocus />
            </label>
            <div className="form-row">
              <label>
                Password
                <input type="password" value={formData.password} onChange={set('password')} placeholder="Min. 6 characters" />
              </label>
              <label>
                Confirm Password
                <input type="password" value={formData.confirmPassword} onChange={set('confirmPassword')} placeholder="Re-enter password" />
              </label>
            </div>
            <label>
              Full Name
              <input type="text" value={formData.name} onChange={set('name')} placeholder="Enter your full name" />
            </label>
            <label>
              Contact Number
              <input type="text" value={formData.contactNumber} onChange={set('contactNumber')} placeholder="e.g. 0123456789" />
            </label>

            {role === 'RELIEF_ORG' && (
              <label>
                Organization Address
                <input type="text" value={formData.address} onChange={set('address')} placeholder="Enter organization address" />
              </label>
            )}

            {role === 'PUBLIC' && (
              <div className="form-row">
                <label>
                  Age
                  <input type="number" min="1" value={formData.age} onChange={set('age')} placeholder="Age" />
                </label>
                <label>
                  Gender
                  <select value={formData.gender} onChange={set('gender')}>
                    <option value="">Select gender</option>
                    <option value="MALE">Male</option>
                    <option value="FEMALE">Female</option>
                  </select>
                </label>
              </div>
            )}

            {error && <p className="auth-error">{error}</p>}

            <button type="submit" className="auth-btn" disabled={loading || !formData.username || !formData.password || !formData.name || !formData.contactNumber}>
              {loading ? 'Creating account...' : 'Create Account'}
            </button>
            <button type="button" className="auth-btn-secondary" onClick={() => { setStep(1); setError(''); }}>
              Back to role selection
            </button>
          </form>
        )}

        <p className="auth-footer-text">
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      </div>
    </div>
  );
}

function ShieldIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );
}

function OrgIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  );
}

function GlobeIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="2" y1="12" x2="22" y2="12" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  );
}
