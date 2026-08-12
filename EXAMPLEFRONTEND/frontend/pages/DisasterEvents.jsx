import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './DisasterEvents.css';

const STATUS_OPTIONS = ['All status', 'Active', 'Resolved'];
const TYPE_OPTIONS = ['All types', 'Flood', 'Landslide', 'Severe Storm', 'Earthquake'];

const TYPE_MAP = {
  'Flood': 'FLOOD',
  'Landslide': 'LANDSLIDE',
  'Severe Storm': 'SEVERE_STORM',
  'Earthquake': 'EARTHQUAKE',
};

const TYPE_DISPLAY = {
  FLOOD: 'Flood',
  LANDSLIDE: 'Landslide',
  SEVERE_STORM: 'Severe Storm',
  EARTHQUAKE: 'Earthquake',
};

function formatDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export default function DisasterEvents() {
  const navigate = useNavigate();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [statusFilter, setStatusFilter] = useState('All status');
  const [typeFilter, setTypeFilter] = useState('All types');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput), 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    fetchEvents();
  }, [statusFilter, typeFilter, search]);

  async function fetchEvents() {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      if (statusFilter !== 'All status') params.set('status', statusFilter.toUpperCase());
      if (typeFilter !== 'All types') params.set('type', TYPE_MAP[typeFilter]);
      if (search) params.set('search', search);

      const res = await fetch(`/api/organization/disaster-events?${params}`);
      if (!res.ok) throw new Error('Failed to fetch events');
      setEvents(await res.json());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="disaster-events-page">
      <div className="page-header">
        <h1>Disaster Events</h1>
        <p>Monitor active disaster events across all regions.</p>
      </div>

      <div className="content-card">
        <div className="card-toolbar">
          <h2>All events</h2>
          <div className="search-wrapper">
            <svg className="search-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              className="search-input"
              placeholder="Search events..."
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
          <div className="filter-group">
            {TYPE_OPTIONS.map((opt) => (
              <button
                key={opt}
                className={`filter-chip${typeFilter === opt ? ' active' : ''}`}
                onClick={() => setTypeFilter(opt)}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="state-message">Loading events...</div>
        ) : error ? (
          <div className="state-message error">{error}</div>
        ) : events.length === 0 ? (
          <div className="state-message">No events found.</div>
        ) : (
          <table className="events-table">
            <thead>
              <tr>
                <th>EVENT</th>
                <th>TYPE</th>
                <th>DATE</th>
                <th>AREAS</th>
                <th>STATUS</th>
              </tr>
            </thead>
            <tbody>
              {events.map((evt) => (
                <tr key={evt.event_id} onClick={() => navigate(`/organization/disaster-events/${evt.event_id}`)}>
                  <td>
                    <span className="event-name">
                      {evt.name}
                      <svg className="chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="9 18 15 12 9 6" />
                      </svg>
                    </span>
                  </td>
                  <td>{TYPE_DISPLAY[evt.type] || evt.type}</td>
                  <td>{formatDate(evt.start_date)}</td>
                  <td>{evt.area_count} {evt.area_count === 1 ? 'area' : 'areas'}</td>
                  <td>
                    <span className={`status-badge ${evt.status.toLowerCase()}`}>
                      {evt.status.charAt(0) + evt.status.slice(1).toLowerCase()}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
