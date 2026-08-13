import { useCallback, useEffect, useRef, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../auth-module/frontend/components/AuthContext';
import { ACTIVE_SHELTER_KEY, VolunteerContext, useVolunteer } from './volunteerContext';
import './Layout.css';

const navItems = [
  { to: 'dashboard', label: 'Dashboard', icon: HomeIcon },
  { to: 'tasks', label: 'My Tasks', icon: ClipboardIcon },
  { to: 'victims', label: 'Victims', icon: UsersIcon },
  { to: 'requests', label: 'Resource Requests', icon: PackageIcon },
];

export default function Layout() {
  return (
    <VolunteerProvider>
      <div className="layout">
        <Sidebar />
        <main className="main-content">
          <ShelterBar />
          <div className="page-body">
            <Outlet />
          </div>
        </main>
      </div>
    </VolunteerProvider>
  );
}

/**
 * Loads the volunteer's shelter assignments once and holds the active selection for
 * every page below. `ready` gates the pages' first fetch — without it each screen
 * fires an unscoped request before the shelter list has landed, then a second one
 * after, and the KPI cards visibly flicker between the two answers.
 */
function VolunteerProvider({ children }) {
  const { user } = useAuth();
  const volunteerId = user?.profile?.volunteer_id;

  const [shelters, setShelters] = useState([]);
  const [activeShelterId, setActiveShelterId] = useState(
    () => sessionStorage.getItem(ACTIVE_SHELTER_KEY) || ''
  );
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadShelters() {
      try {
        const res = await fetch(`/api/volunteer/shelters?volunteerId=${volunteerId}`);
        const rows = await res.json();
        if (cancelled) return;
        const list = Array.isArray(rows) ? rows : [];
        setShelters(list);
        // A stored id from a previous session may no longer be assigned to them.
        setActiveShelterId((current) =>
          list.some((s) => s.shelter_id === current) ? current : ''
        );
      } catch {
        if (!cancelled) setShelters([]);
      } finally {
        if (!cancelled) setReady(true);
      }
    }

    if (volunteerId) loadShelters();
    return () => { cancelled = true; };
  }, [volunteerId]);

  const selectShelter = useCallback((shelterId) => {
    setActiveShelterId(shelterId);
    if (shelterId) sessionStorage.setItem(ACTIVE_SHELTER_KEY, shelterId);
    else sessionStorage.removeItem(ACTIVE_SHELTER_KEY);
  }, []);

  return (
    <VolunteerContext.Provider
      value={{ volunteerId, shelters, activeShelterId, selectShelter, ready }}
    >
      {children}
    </VolunteerContext.Provider>
  );
}

function ShelterBar() {
  const { shelters, activeShelterId, selectShelter } = useVolunteer();
  const active = shelters.find((s) => s.shelter_id === activeShelterId);

  return (
    <header className="topbar">
      <div className="topbar-shelter">
        <label className="topbar-label" htmlFor="assigned-shelter">Assigned Shelter</label>
        <select
          id="assigned-shelter"
          className="shelter-select"
          value={activeShelterId}
          onChange={(e) => selectShelter(e.target.value)}
          disabled={shelters.length === 0}
        >
          <option value="">
            {shelters.length === 0 ? 'No shelter assignment' : 'All assigned shelters'}
          </option>
          {shelters.map((s) => (
            <option key={s.shelter_id} value={s.shelter_id}>{s.name}</option>
          ))}
        </select>
      </div>

      {active && (
        <div className="topbar-occupancy">
          <span className={`shelter-status ${active.status?.toLowerCase()}`}>{active.status}</span>
          <span className="topbar-count">
            {active.current_occupancy} / {active.capacity} occupied
          </span>
        </div>
      )}
    </header>
  );
}

function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const accountRef = useRef(null);

  useEffect(() => {
    if (!menuOpen) return;
    function onPointerDown(e) {
      if (!accountRef.current?.contains(e.target)) setMenuOpen(false);
    }
    function onKeyDown(e) {
      if (e.key === 'Escape') setMenuOpen(false);
    }
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [menuOpen]);

  function handleLogout() {
    logout();
    navigate('/login');
  }

  const profile = user?.profile || {};

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="logo">RN</div>
        <div>
          <div className="app-name">RescueNet</div>
          <div className="role-label">Volunteer</div>
        </div>
      </div>

      <nav className="sidebar-nav">
        <span className="nav-label">NAVIGATION</span>
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
          >
            <Icon />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-footer" ref={accountRef}>
        <span className="nav-label signed-in-label">SIGNED IN AS</span>

        {menuOpen && (
          <div className="account-menu" role="menu">
            <div className="account-menu-row">
              <span className="account-menu-key">Username</span>
              <span className="account-menu-val">{user?.username || '—'}</span>
            </div>
            <div className="account-menu-row">
              <span className="account-menu-key">Contact</span>
              <span className="account-menu-val">{profile.contact_number || '—'}</span>
            </div>
            <div className="account-menu-row">
              <span className="account-menu-key">Status</span>
              <span className="account-menu-val">{profile.status || '—'}</span>
            </div>
            <button className="account-menu-action" role="menuitem" onClick={handleLogout}>
              <LogoutIcon />
              <span>Sign out</span>
            </button>
          </div>
        )}

        <button
          className="account-trigger"
          onClick={() => setMenuOpen((open) => !open)}
          aria-expanded={menuOpen}
          aria-haspopup="menu"
        >
          <span className="account-avatar">
            {(profile.name || 'V').charAt(0).toUpperCase()}
          </span>
          <span className="account-identity">
            <span className="vol-name">{profile.name || 'Volunteer'}</span>
            <span className="vol-user">{user?.username || ''}</span>
          </span>
          <ChevronIcon open={menuOpen} />
        </button>
      </div>
    </aside>
  );
}

function HomeIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  );
}

function ClipboardIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
      <rect x="8" y="2" width="8" height="4" rx="1" />
      <line x1="9" y1="12" x2="15" y2="12" />
      <line x1="9" y1="16" x2="15" y2="16" />
    </svg>
  );
}

function UsersIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function PackageIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="16.5" y1="9.4" x2="7.5" y2="4.21" />
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
      <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
      <line x1="12" y1="22.08" x2="12" y2="12" />
    </svg>
  );
}

function ChevronIcon({ open }) {
  return (
    <svg
      className="account-chevron"
      width="16" height="16" viewBox="0 0 24 24"
      fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round"
      style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }}
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

function LogoutIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  );
}
