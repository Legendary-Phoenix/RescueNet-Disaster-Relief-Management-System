import { useState, useEffect } from 'react';
import './VictimLookup.css';
import { formatDate } from '../utils/format.js';

const MIN_NAME_LENGTH = 2;

export default function VictimLookup() {
  const [events, setEvents] = useState([]);
  const [shelters, setShelters] = useState([]);

  const [name, setName] = useState('');
  const [eventId, setEventId] = useState('');
  const [shelterId, setShelterId] = useState('');

  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [validationError, setValidationError] = useState(null);

  useEffect(() => {
    fetch('/api/public/events').then((res) => (res.ok ? res.json() : [])).then(setEvents).catch(() => {});
    fetch('/api/public/shelters').then((res) => (res.ok ? res.json() : [])).then(setShelters).catch(() => {});
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    const trimmed = name.trim();

    if (trimmed.length < MIN_NAME_LENGTH) {
      setValidationError(`Please enter at least ${MIN_NAME_LENGTH} characters of the victim's name.`);
      setResults(null);
      return;
    }
    setValidationError(null);

    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams({ name: trimmed });
      if (eventId) params.set('event_id', eventId);
      if (shelterId) params.set('shelter_id', shelterId);

      const res = await fetch(`/api/public/victims/search?${params}`);
      if (!res.ok) throw new Error('Search failed. Please try again.');
      setResults(await res.json());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="victim-lookup-page">
      <div className="page-header">
        <h1>Victim Lookup</h1>
      </div>

      <div className="content-card">
        <form className="lookup-form" onSubmit={handleSubmit}>
          <div className="form-row">
            <label className="form-field">
              <span className="form-label">Name (required)</span>
              <input
                type="text"
                className="form-input"
                placeholder="Enter victim's name..."
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </label>
            <label className="form-field">
              <span className="form-label">Disaster event (optional)</span>
              <select className="form-select" value={eventId} onChange={(e) => setEventId(e.target.value)}>
                <option value="">Any event</option>
                {events.map((evt) => (
                  <option key={evt.event_id} value={evt.event_id}>{evt.name}</option>
                ))}
              </select>
            </label>
            <label className="form-field">
              <span className="form-label">Shelter (optional)</span>
              <select className="form-select" value={shelterId} onChange={(e) => setShelterId(e.target.value)}>
                <option value="">Any shelter</option>
                {shelters.map((s) => (
                  <option key={s.shelter_id} value={s.shelter_id}>{s.name}</option>
                ))}
              </select>
            </label>
          </div>
          <button type="submit" className="search-btn" disabled={loading}>
            {loading ? 'Searching...' : 'Search'}
          </button>
        </form>

        {validationError && <div className="state-message error">{validationError}</div>}
        {error && <div className="state-message error">{error}</div>}

        {results !== null && !loading && !validationError && !error && (
          results.length === 0 ? (
            <div className="state-message">No matching victims found.</div>
          ) : (
            <table className="results-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Registered at</th>
                  <th>Shelter</th>
                  <th>Disaster event</th>
                </tr>
              </thead>
              <tbody>
                {results.map((v, i) => (
                  <tr key={`${v.name}-${i}`}>
                    <td>{v.name}</td>
                    <td>{formatDate(v.registered_at)}</td>
                    <td>{v.shelter_name}</td>
                    <td>{v.event_name}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )
        )}
      </div>
    </div>
  );
}
