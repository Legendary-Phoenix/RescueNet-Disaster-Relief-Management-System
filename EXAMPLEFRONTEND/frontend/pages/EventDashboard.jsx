import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import DetailPanel from '../components/DetailPanel';
import { DisasterTypeLabel, Severity } from '../../../models/enums';
import './EventDashboard.css';

const NEED_COLORS = {
  LOW: '#16a34a',
  MODERATE: '#d97706',
  HIGH: '#ea580c',
  CRITICAL: '#dc2626',
};

const RESOURCE_TYPE_LABELS = {
  WATER: 'Water & Drinks',
  FOOD: 'Food',
  MEDICINE: 'Medicine',
  HYGIENE: 'Hygiene',
};

function NeedBadge({ level }) {
  return (
    <span className="need-badge" style={{ background: `${NEED_COLORS[level]}14`, color: NEED_COLORS[level] }}>
      {level}
    </span>
  );
}

function OccupancyBar({ current, capacity }) {
  const pct = capacity > 0 ? Math.min((current / capacity) * 100, 100) : 0;
  const overloaded = current > capacity;
  const color = overloaded ? '#dc2626' : pct > 80 ? '#d97706' : '#16a34a';
  return (
    <div className="occupancy-bar-wrapper">
      <div className="occupancy-bar">
        <div className="occupancy-fill" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="occupancy-text" style={{ color }}>
        {current}/{capacity}
        {overloaded && ' (Overloaded)'}
      </span>
    </div>
  );
}

export default function EventDashboard() {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [panel, setPanel] = useState(null);
  const [panelData, setPanelData] = useState(null);
  const [panelLoading, setPanelLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/organization/disaster-events/${eventId}/dashboard`)
      .then(r => {
        if (!r.ok) throw new Error('Failed to load dashboard');
        return r.json();
      })
      .then(setData)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [eventId]);

  useEffect(() => {
    if (!panel) { setPanelData(null); return; }
    setPanelLoading(true);
    const url = panel.type === 'shelter'
      ? `/api/organization/shelters/${panel.id}?eventId=${eventId}`
      : `/api/organization/areas/${panel.id}?eventId=${eventId}`;
    fetch(url)
      .then(r => r.json())
      .then(setPanelData)
      .catch(() => setPanelData(null))
      .finally(() => setPanelLoading(false));
  }, [panel, eventId]);

  if (loading) return <div className="state-message">Loading dashboard...</div>;
  if (error) return <div className="state-message error">{error}</div>;
  if (!data) return null;

  const { event, overview, areas, shelters, resource_overview } = data;

  return (
    <div className="event-dashboard">
      <button className="back-link" onClick={() => navigate('/organization/disaster-events')}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
        Back to events
      </button>

      <div className="dashboard-header">
        <div>
          <h1>{event.name}</h1>
          {event.description && <p className="event-desc">{event.description}</p>}
        </div>
        <div className="header-meta">
          <span className={`status-badge ${event.status.toLowerCase()}`}>{event.status}</span>
          <span className="meta-tag">{DisasterTypeLabel[event.type] || event.type}</span>
          <span className="meta-tag">{Severity[event.severity] || event.severity}</span>
        </div>
      </div>

      <div className="stats-row">
        <div className="stat-card">
          <span className="stat-value">{overview.affected_areas}</span>
          <span className="stat-label">Affected Areas</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">{overview.active_shelters}</span>
          <span className="stat-label">Active Shelters</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">{overview.total_victims.toLocaleString()}</span>
          <span className="stat-label">Total Victims</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">{overview.resource_coverage}%</span>
          <span className="stat-label">Resource Coverage</span>
        </div>
      </div>

      <div className="dashboard-columns">
        <div className="content-card">
          <h2 className="section-title">Affected Areas</h2>
          {areas.length === 0 ? (
            <p className="empty-text">No affected areas</p>
          ) : (
            <div className="list-items">
              {areas.map(area => (
                <div key={area.area_id} className="list-item" onClick={() => setPanel({ type: 'area', id: area.area_id })}>
                  <div className="list-item-main">
                    <span className="list-item-name">{area.name}</span>
                    <span className="list-item-sub">{area.state}</span>
                  </div>
                  <div className="list-item-meta">
                    <span className="list-item-stat">{area.shelter_count} shelters &middot; {area.victim_count} victims</span>
                    <NeedBadge level={area.need_level} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="content-card">
          <h2 className="section-title">Shelters</h2>
          {shelters.length === 0 ? (
            <p className="empty-text">No shelters</p>
          ) : (
            <div className="list-items">
              {shelters.map(shelter => (
                <div key={shelter.shelter_id} className="list-item" onClick={() => setPanel({ type: 'shelter', id: shelter.shelter_id })}>
                  <div className="list-item-main">
                    <span className="list-item-name">{shelter.name}</span>
                    <span className="list-item-sub">{shelter.area_name}</span>
                  </div>
                  <div className="list-item-right">
                    <OccupancyBar current={shelter.current_occupancy} capacity={shelter.capacity} />
                    <NeedBadge level={shelter.need_level} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="content-card resource-overview">
        <h2 className="section-title">Resource Overview</h2>
        <div className="resource-grid">
          {resource_overview.map(r => {
            const ratio = r.total_available + r.total_requested > 0
              ? Math.round((r.total_available / (r.total_available + r.total_requested)) * 100)
              : 100;
            const color = ratio >= 75 ? '#16a34a' : ratio >= 50 ? '#d97706' : '#dc2626';
            return (
              <div key={r.type} className="resource-card">
                <h3>{RESOURCE_TYPE_LABELS[r.type] || r.type}</h3>
                <div className="resource-stats">
                  <div><span className="resource-num">{r.total_available.toLocaleString()}</span> available</div>
                  <div><span className="resource-num">{r.total_requested.toLocaleString()}</span> requested</div>
                </div>
                <div className="resource-bar">
                  <div className="resource-fill" style={{ width: `${ratio}%`, background: color }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {panel && (
        <DetailPanel
          type={panel.type}
          data={panelData}
          loading={panelLoading}
          onClose={() => setPanel(null)}
          onShelterClick={(id) => setPanel({ type: 'shelter', id })}
        />
      )}
    </div>
  );
}
