import { useState, useEffect } from 'react';
import './Dashboard.css';
import { formatDate } from '../utils/format.js';

const TYPE_DISPLAY = {
  FLOOD: 'Flood',
  LANDSLIDE: 'Landslide',
  SEVERE_STORM: 'Severe Storm',
  EARTHQUAKE: 'Earthquake',
};

export default function Dashboard() {
  const [events, setEvents] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  async function fetchDashboard() {
    try {
      setLoading(true);
      setError(null);
      const [eventsRes, announcementsRes] = await Promise.all([
        fetch('/api/public/events?status=ACTIVE'),
        fetch('/api/public/announcements/recent'),
      ]);
      if (!eventsRes.ok || !announcementsRes.ok) throw new Error('Failed to load dashboard');
      setEvents(await eventsRes.json());
      setAnnouncements(await announcementsRes.json());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    queueMicrotask(() => {
      fetchDashboard();
    });
  }, []);

  const affectedAreaCount = new Set(
    events.flatMap((evt) => evt.areas.map((area) => area.area_id))
  ).size;

  return (
    <div className="dashboard-page">
      <div className="page-header">
        <h1>Dashboard</h1>
      </div>

      {loading ? (
        <div className="state-message">Loading dashboard...</div>
      ) : error ? (
        <div className="state-message error">{error}</div>
      ) : (
        <>
          <div className="stats-row">
            <div className="stat-card">
              <div className="stat-value">{events.length}</div>
              <div className="stat-label">Active events</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{affectedAreaCount}</div>
              <div className="stat-label">Affected areas</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{announcements.length}</div>
              <div className="stat-label">Recent announcements</div>
            </div>
          </div>

          <div className="content-card">
            <div className="card-toolbar">
              <h2>Active disaster events</h2>
            </div>
            {events.length === 0 ? (
              <div className="state-message">No active disaster events right now.</div>
            ) : (
              <div className="event-list">
                {events.map((evt) => (
                  <div key={evt.event_id} className="event-item">
                    <div className="event-item-header">
                      <span className="event-name">{evt.name}</span>
                      <span className={`severity-badge ${evt.severity.toLowerCase()}`}>{evt.severity}</span>
                    </div>
                    <div className="event-meta">
                      {TYPE_DISPLAY[evt.type] || evt.type} · Since {formatDate(evt.start_date)}
                    </div>
                    <div className="area-chips">
                      {evt.areas.map((area) => (
                        <span key={area.area_id} className="area-chip">{area.name}, {area.state}</span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="content-card">
            <div className="card-toolbar">
              <h2>Latest announcements</h2>
            </div>
            {announcements.length === 0 ? (
              <div className="state-message">No announcements yet.</div>
            ) : (
              <div className="announcement-list">
                {announcements.map((a) => (
                  <div key={a.announcement_id} className="announcement-item">
                    <div className="announcement-item-header">
                      <span className="announcement-title">{a.title}</span>
                      <span className="announcement-date">{formatDate(a.created_at)}</span>
                    </div>
                    <p className="announcement-message">{a.message}</p>
                    {a.event && <span className="event-tag">{a.event.name}</span>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
