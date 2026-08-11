import { useState, useEffect, useMemo } from 'react';
import './Shelters.css';

const STATUS_OPTIONS = ['All status', 'Open', 'Closed'];

export default function Shelters() {
  const [shelters, setShelters] = useState([]);
  const [areaOptions, setAreaOptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [statusFilter, setStatusFilter] = useState('All status');
  const [areaFilter, setAreaFilter] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput), 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  async function fetchShelters() {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      if (statusFilter !== 'All status') params.set('status', statusFilter.toUpperCase());
      if (areaFilter) params.set('area_id', areaFilter);
      if (search) params.set('search', search);

      const res = await fetch(`/api/public/shelters?${params}`);
      if (!res.ok) throw new Error('Failed to fetch shelters');
      setShelters(await res.json());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchShelters();
  }, [statusFilter, areaFilter, search]);

  // Area dropdown is populated once, independent of the current filters.
  useEffect(() => {
    fetch('/api/public/shelters')
      .then((res) => (res.ok ? res.json() : []))
      .then((rows) => {
        const areas = new Map();
        rows.forEach((s) => areas.set(s.area.area_id, s.area));
        setAreaOptions([...areas.values()].sort((a, b) => a.name.localeCompare(b.name)));
      })
      .catch(() => {});
  }, []);

  return (
    <div className="shelters-page">
      <div className="page-header">
        <h1>Shelter Search</h1>
        <p>Find emergency shelters, their location, capacity and current status.</p>
      </div>

      <div className="content-card">
        <div className="card-toolbar">
          <h2>All shelters</h2>
          <div className="search-wrapper">
            <svg className="search-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              className="search-input"
              placeholder="Search shelters..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
          </div>
        </div>

        <div className="filters">
          <div className="filter-group">
            {STATUS_OPTIONS.map((opt) => (
              <button
                key={opt}
                className={`filter-chip${statusFilter === opt ? ' active' : ''}`}
                onClick={() => setStatusFilter(opt)}
              >
                {opt}
              </button>
            ))}
          </div>
          <select
            className="area-select"
            value={areaFilter}
            onChange={(e) => setAreaFilter(e.target.value)}
          >
            <option value="">All areas</option>
            {areaOptions.map((area) => (
              <option key={area.area_id} value={area.area_id}>{area.name}, {area.state}</option>
            ))}
          </select>
        </div>

        {loading ? (
          <div className="state-message">Loading shelters...</div>
        ) : error ? (
          <div className="state-message error">{error}</div>
        ) : shelters.length === 0 ? (
          <div className="state-message">No shelters found.</div>
        ) : (
          <div className="shelter-grid">
            {shelters.map((s) => (
              <ShelterCard key={s.shelter_id} shelter={s} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ShelterCard({ shelter }) {
  const occupancyPct = useMemo(
    () => (shelter.capacity > 0 ? Math.round((shelter.current_occupancy / shelter.capacity) * 100) : 0),
    [shelter]
  );

  return (
    <div className="shelter-card">
      <div className="shelter-card-header">
        <span className="shelter-name">{shelter.name}</span>
        <span className={`status-badge ${shelter.status.toLowerCase()}`}>
          {shelter.status.charAt(0) + shelter.status.slice(1).toLowerCase()}
        </span>
      </div>
      <div className="shelter-address">{shelter.address}</div>
      <div className="shelter-area">{shelter.area.name}, {shelter.area.state}</div>
      <div className="shelter-occupancy">
        <div className="occupancy-bar">
          <div className="occupancy-fill" style={{ width: `${Math.min(occupancyPct, 100)}%` }} />
        </div>
        <span className="occupancy-text">{shelter.current_occupancy}/{shelter.capacity}</span>
      </div>
      {shelter.contact_number && <div className="shelter-contact">{shelter.contact_number}</div>}
    </div>
  );
}
