import { useState, useEffect } from 'react';
import './Areas.css';
import AreaDetailPanel from '../components/AreaDetailPanel';

const EVENT_OPTIONS = ['All areas', 'Active events only'];

export default function Areas() {
  const [areas, setAreas] = useState([]);
  const [stateOptions, setStateOptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [eventFilter, setEventFilter] = useState('All areas');
  const [stateFilter, setStateFilter] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');

  const [selectedAreaId, setSelectedAreaId] = useState(null);
  const [panelData, setPanelData] = useState(null);
  const [panelLoading, setPanelLoading] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput), 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    queueMicrotask(() => {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (stateFilter) params.set('state', stateFilter);
      if (eventFilter === 'Active events only') params.set('hasActiveEvent', 'true');

      fetch(`/api/public/areas?${params}`)
        .then((res) => {
          if (!res.ok) throw new Error('Failed to fetch areas');
          return res.json();
        })
        .then(setAreas)
        .catch((err) => setError(err.message))
        .finally(() => setLoading(false));
    });
  }, [search, stateFilter, eventFilter]);

  useEffect(() => {
    fetch('/api/public/areas')
      .then((res) => (res.ok ? res.json() : []))
      .then((rows) => {
        const states = new Set(rows.map((a) => a.state));
        setStateOptions([...states].sort());
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!selectedAreaId) return;
    queueMicrotask(() => {
      setPanelLoading(true);
      setPanelData(null);
      fetch(`/api/public/areas/${selectedAreaId}`)
        .then((res) => (res.ok ? res.json() : null))
        .then(setPanelData)
        .finally(() => setPanelLoading(false));
    });
  }, [selectedAreaId]);

  return (
    <div className="areas-page">
      <div className="page-header">
        <h1>Areas</h1>
      </div>

      <div className="content-card">
        <div className="filters">
          <div className="filter-group">
            {EVENT_OPTIONS.map((opt) => (
              <button
                key={opt}
                className={`filter-chip${eventFilter === opt ? ' active' : ''}`}
                onClick={() => setEventFilter(opt)}
              >
                {opt}
              </button>
            ))}
          </div>

          <div className="card-toolbar">
            <div className="search-wrapper">
              <svg
                className="search-icon"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                type="text"
                className="search-input"
                placeholder="Search areas..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
              />
            </div>

            <select
              className="area-select"
              value={stateFilter}
              onChange={(e) => setStateFilter(e.target.value)}
            >
              <option value="">All states</option>
              {stateOptions.map((state) => (
                <option key={state} value={state}>{state}</option>
              ))}
            </select>
          </div>
        </div>

        {loading ? (
          <div className="state-message">Loading areas...</div>
        ) : error ? (
          <div className="state-message error">{error}</div>
        ) : areas.length === 0 ? (
          <div className="state-message">No areas found.</div>
        ) : (
          <div className="area-grid">
            {areas.map((area) => (
              <button
                key={area.area_id}
                className="area-card"
                onClick={() => setSelectedAreaId(area.area_id)}
              >
                <div className="area-card-header">
                  <span className="area-name">{area.name}</span>
                  <span className="area-state">{area.state}</span>
                </div>
                <div className="area-card-stats">
                  <div className="area-stat">
                    <span className="area-stat-value">{area.shelter_count}</span>
                    <span className="area-stat-label">Shelters</span>
                  </div>
                  <div className="area-stat">
                    <span className="area-stat-value">{area.victim_count}</span>
                    <span className="area-stat-label">Victims</span>
                  </div>
                  <div className="area-stat">
                    <span className="area-stat-value">{area.active_event_count}</span>
                    <span className="area-stat-label">Active events</span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {selectedAreaId && (
        <AreaDetailPanel
          data={panelData}
          loading={panelLoading}
          onClose={() => setSelectedAreaId(null)}
        />
      )}
    </div>
  );
}
