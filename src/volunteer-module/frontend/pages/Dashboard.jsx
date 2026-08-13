import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../auth-module/frontend/components/AuthContext';
import { useVolunteer, volunteerQuery } from '../components/volunteerContext';
import './Dashboard.css';

function formatDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

const SEVERITY_COLORS = { LOW: 'low', MEDIUM: 'medium', HIGH: 'high', CRITICAL: 'critical' };
const ALERT_COLORS = { CRITICAL: 'alert-critical', WARNING: 'alert-warning', INFO: 'alert-info' };

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { volunteerId, activeShelterId, selectShelter, ready } = useVolunteer();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        const res = await fetch(`/api/volunteer/dashboard?${volunteerQuery(volunteerId, activeShelterId)}`);
        if (!res.ok) throw new Error('Failed to load dashboard');
        const payload = await res.json();
        if (!cancelled) { setData(payload); setError(null); }
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    if (ready && volunteerId) load();
    return () => { cancelled = true; };
  }, [ready, volunteerId, activeShelterId]);

  if (loading) return <div className="state-message">Loading dashboard...</div>;
  if (error) return <div className="state-message error">{error}</div>;

  const { shelters = [], events = [], tasks, alerts = [], announcements = [] } = data || {};
  const stats = tasks?.stats || {};
  const upcoming = tasks?.upcoming || [];

  // An alert about a specific shelter switches to that shelter on the way, so the
  // page it opens is already scoped to the one at fault.
  function followAlert(alert) {
    if (!alert.action) return;
    if (alert.shelterId && alert.shelterId !== activeShelterId) selectShelter(alert.shelterId);
    navigate(alert.action.to);
  }

  return (
    <div className="dashboard-page">
      <div className="page-header">
        <div>
          <h1>Welcome back, {user?.profile?.name}</h1>
          <p>
            {shelters.length > 1
              ? `Operations overview across your ${shelters.length} shelter assignments.`
              : 'Operations overview for your shelter assignment.'}
          </p>
        </div>
      </div>

      {alerts.length > 0 && (
        <div className="alerts-section">
          {alerts.map((a, i) => (
            <button
              key={i}
              type="button"
              className={`alert-banner ${ALERT_COLORS[a.level] || 'alert-info'}${a.action ? ' is-actionable' : ''}`}
              onClick={() => followAlert(a)}
              disabled={!a.action}
            >
              <span className="alert-icon">{a.level === 'CRITICAL' ? '!' : '⚠'}</span>
              <span className="alert-message">{a.message}</span>
              {a.action && (
                <span className="alert-action">
                  {a.action.label}
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="5" y1="12" x2="19" y2="12" />
                    <polyline points="12 5 19 12 12 19" />
                  </svg>
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      <div className="dash-grid">
        <div className="dash-col-main">
          {shelters.length === 0 ? (
            <div className="content-card empty-card">
              <p>You are not currently assigned to any shelter.</p>
            </div>
          ) : (
            shelters.map((shelter) => (
              <div key={shelter.shelter_id} className="content-card">
                <div className="card-toolbar">
                  <h2>{shelters.length > 1 ? shelter.name : 'My Shelter'}</h2>
                  <span className={`status-badge ${shelter.status?.toLowerCase()}`}>{shelter.status}</span>
                </div>
                {shelters.length === 1 && <div className="shelter-name">{shelter.name}</div>}
                <div className="shelter-sub">{shelter.area_name} · {shelter.area_state}</div>
                <div className="shelter-stats">
                  <div className="shelter-stat">
                    <span className="shelter-stat-value">{shelter.current_occupancy}</span>
                    <span className="shelter-stat-label">Occupants</span>
                  </div>
                  <div className="shelter-stat">
                    <span className="shelter-stat-value">{shelter.capacity}</span>
                    <span className="shelter-stat-label">Capacity</span>
                  </div>
                  <div className="shelter-stat">
                    <span className="shelter-stat-value">{shelter.occupancy_rate}%</span>
                    <span className="shelter-stat-label">Occupancy</span>
                  </div>
                  <div className="shelter-stat">
                    <span className="shelter-stat-value">{shelter.available_space}</span>
                    <span className="shelter-stat-label">Available</span>
                  </div>
                </div>
                {shelter.inventory?.length > 0 && (
                  <div className="supply-list">
                    <div className="supply-header">Supply Levels</div>
                    {shelter.inventory.map((item) => (
                      <div key={item.resource_id} className="supply-row">
                        <span className="supply-name">{item.name}</span>
                        <span className={`supply-badge ${item.supply_level?.toLowerCase()}`}>
                          {item.supply_level}
                        </span>
                        <span className="supply-qty">{item.quantity_available} {item.unit}</span>
                      </div>
                    ))}
                  </div>
                )}
                {shelters.length > 1 && (
                  <button
                    type="button"
                    className="btn-link shelter-focus"
                    onClick={() => selectShelter(shelter.shelter_id)}
                  >
                    Focus this shelter
                  </button>
                )}
              </div>
            ))
          )}

          {events.length > 0 && (
            <div className="content-card">
              <div className="card-toolbar"><h2>Active Disaster Events</h2></div>
              <div className="event-list">
                {events.map((e) => (
                  <div key={e.event_id} className="event-row">
                    <div>
                      <div className="event-name">{e.name}</div>
                      <div className="event-meta">{e.type} · {formatDate(e.start_date)}</div>
                    </div>
                    <span className={`severity-badge ${SEVERITY_COLORS[e.severity]}`}>{e.severity}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="dash-col-side">
          <div className="content-card">
            <div className="card-toolbar">
              <h2>Tasks</h2>
              <button className="btn-link" onClick={() => navigate('../tasks')}>View all</button>
            </div>
            <div className="task-stats-grid">
              <div className="task-stat pending">
                <span className="task-stat-val">{stats.pending || 0}</span>
                <span className="task-stat-lbl">Pending</span>
              </div>
              <div className="task-stat in-progress">
                <span className="task-stat-val">{stats.in_progress || 0}</span>
                <span className="task-stat-lbl">In Progress</span>
              </div>
              <div className="task-stat completed">
                <span className="task-stat-val">{stats.completed || 0}</span>
                <span className="task-stat-lbl">Completed</span>
              </div>
              {(stats.overdue || 0) > 0 && (
                <div className="task-stat overdue">
                  <span className="task-stat-val">{stats.overdue}</span>
                  <span className="task-stat-lbl">Overdue</span>
                </div>
              )}
            </div>
            {upcoming.length > 0 && (
              <div className="upcoming-tasks">
                <div className="upcoming-label">Open Tasks</div>
                {upcoming.map((t) => (
                  <div key={t.task_id} className="upcoming-task">
                    <span className={`status-dot ${t.status?.toLowerCase().replace('_', '-')}`} />
                    <div className="upcoming-task-info">
                      <div className="upcoming-task-title">{t.title}</div>
                      <div className="upcoming-task-meta">
                        {t.shelter_name} {t.due_date ? `· Due ${formatDate(t.due_date)}` : ''}
                      </div>
                    </div>
                    <span className={`priority-chip ${t.priority?.toLowerCase()}`}>{t.priority}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {announcements.length > 0 && (
            <div className="content-card">
              <div className="card-toolbar"><h2>Announcements</h2></div>
              <div className="announcement-list">
                {announcements.map((a) => (
                  <div key={a.announcement_id} className="announcement-row">
                    <div className="announcement-title">{a.title}</div>
                    <div className="announcement-body">{a.message}</div>
                    <div className="announcement-meta">{a.issued_by} · {formatDate(a.created_at)}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
