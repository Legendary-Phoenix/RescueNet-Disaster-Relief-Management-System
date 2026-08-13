import { useCallback, useEffect, useState } from 'react'
import Modal from '../components/Modal.jsx'
import './DisasterEvents.css'

const TYPE_OPTIONS = [
  { value: 'FLOOD', label: 'Flood' },
  { value: 'LANDSLIDE', label: 'Landslide' },
  { value: 'SEVERE_STORM', label: 'Severe Storm' },
  { value: 'EARTHQUAKE', label: 'Earthquake' },
]

const STATUS_OPTIONS = ['All status', 'Active', 'Resolved']
const SEVERITY_OPTIONS = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']

const STATUS_DISPLAY = {
  ACTIVE: 'Active',
  RESOLVED: 'Resolved',
}

const TYPE_LABELS = Object.fromEntries(TYPE_OPTIONS.map((t) => [t.value, t.label]))

const EMPTY_FORM = {
  name: '',
  description: '',
  type: 'FLOOD',
  severity: 'LOW',
  startDate: '',
  areaIds: [],
}

export default function DisasterEvents({ onOpenEvent }) {
  const [events, setEvents] = useState([])
  const [areas, setAreas] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [statusFilter, setStatusFilter] = useState('All status')
  const [typeFilter, setTypeFilter] = useState('All types')
  const [areaFilter, setAreaFilter] = useState('All areas')
  const [dateFilter, setDateFilter] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [creating, setCreating] = useState(false)
  const [formError, setFormError] = useState(null)
  const [resolveTarget, setResolveTarget] = useState(null)
  const [resolving, setResolving] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput), 300)
    return () => clearTimeout(timer)
  }, [searchInput])

  useEffect(() => {
    fetch('/api/admin/areas')
      .then((res) =>
        res.ok ? res.json() : Promise.reject(new Error('Failed to load areas'))
      )
      .then(setAreas)
      .catch(() => {})
  }, [])

  const fetchEvents = useCallback(async () => {
    const params = new URLSearchParams()
    if (statusFilter !== 'All status') params.set('status', statusFilter.toUpperCase())
    if (typeFilter !== 'All types') params.set('type', typeFilter)
    if (areaFilter !== 'All areas') params.set('area', areaFilter)
    if (dateFilter) params.set('date', dateFilter)
    if (search) params.set('search', search)
    const res = await fetch(`/api/admin/disaster-events?${params}`)
    if (!res.ok) throw new Error('Failed to fetch disaster events')
    return res.json()
  }, [statusFilter, typeFilter, areaFilter, dateFilter, search])

  useEffect(() => {
    let cancelled = false
    fetchEvents()
      .then((data) => {
        if (cancelled) return
        setEvents(data)
        setError(null)
      })
      .catch((err) => {
        if (!cancelled) setError(err.message)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [fetchEvents])

  function refresh() {
    fetchEvents().then(setEvents).catch(setError)
  }

  function toggleArea(areaId) {
    setForm((prev) => ({
      ...prev,
      areaIds: prev.areaIds.includes(areaId)
        ? prev.areaIds.filter((id) => id !== areaId)
        : [...prev.areaIds, areaId],
    }))
  }

  function openCreate() {
    setForm(EMPTY_FORM)
    setFormError(null)
    setShowCreate(true)
  }

  async function handleCreate(e) {
    e.preventDefault()
    setCreating(true)
    setFormError(null)
    try {
      const res = await fetch('/api/admin/disaster-events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.message || 'Failed to create event')
      }
      setShowCreate(false)
      refresh()
    } catch (err) {
      setFormError(err.message)
    } finally {
      setCreating(false)
    }
  }

  async function handleResolve() {
    if (!resolveTarget) return
    setResolving(true)
    setFormError(null)
    try {
      const res = await fetch(
        `/api/admin/disaster-events/${resolveTarget}/status`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'RESOLVED' }),
        }
      )
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.message || 'Failed to resolve event')
      }
      setResolveTarget(null)
      refresh()
    } catch (err) {
      setFormError(err.message)
    } finally {
      setResolving(false)
    }
  }

  function formatDate(value) {
    if (!value) return '—'
    return new Date(value).toLocaleDateString('en-MY', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  }

  return (
    <div className="disaster-events-page">
      <div className="page-header">
        <h1>Disaster Events</h1>
        <p>Monitor and manage active and past disaster events.</p>
      </div>

      <div className="content-card">
        <div className="card-toolbar">
          <h2>All events</h2>
          <div className="toolbar-actions">
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
            <button type="button" className="primary-btn" onClick={openCreate}>
              + New event
            </button>
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
            <select
              className="filter-select"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
            >
              <option value="All types">All types</option>
              {TYPE_OPTIONS.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
            <select
              className="filter-select"
              value={areaFilter}
              onChange={(e) => setAreaFilter(e.target.value)}
            >
              <option value="All areas">All areas</option>
              {areas.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}, {a.state}
                </option>
              ))}
            </select>
            <input
              type="date"
              className="filter-select"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
            />
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
                <th>AREAS</th>
                <th>SEVERITY</th>
                <th>START DATE</th>
                <th>STATUS</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {events.map((evt) => (
                <tr key={evt.id} onClick={() => onOpenEvent(evt.id)}>
                  <td>
                    <span className="event-name">
                      {evt.name}
                      <svg className="chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="9 18 15 12 9 6" />
                      </svg>
                    </span>
                  </td>
                  <td>{TYPE_LABELS[evt.type] || evt.type}</td>
                  <td>{evt.areaCount}</td>
                  <td>
                    <span className={`severity-badge ${evt.severity.toLowerCase()}`}>
                      {evt.severity}
                    </span>
                  </td>
                  <td>{formatDate(evt.startDate)}</td>
                  <td>
                    <span className={`status-badge ${evt.status.toLowerCase()}`}>
                      {STATUS_DISPLAY[evt.status] || evt.status}
                    </span>
                  </td>
                  <td>
                    {evt.status === 'ACTIVE' && (
                      <button
                        type="button"
                        className="ghost-btn"
                        onClick={(e) => {
                          e.stopPropagation()
                          setFormError(null)
                          setResolveTarget(evt.id)
                        }}
                      >
                        Resolve
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showCreate && (
        <Modal
          title="Create disaster event"
          subtitle="Register a new disaster event and its affected areas."
          onClose={() => setShowCreate(false)}
        >
          <form onSubmit={handleCreate} className="event-form">
            <div className="form-grid">
              <div className="form-field full">
                <label className="form-label" htmlFor="event-name">
                  Event name
                </label>
                <input
                  id="event-name"
                  className="form-input"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Klang Valley Flood 2026"
                  required
                />
              </div>
              <div className="form-field full">
                <label className="form-label" htmlFor="event-desc">
                  Description
                </label>
                <textarea
                  id="event-desc"
                  className="form-textarea"
                  rows="3"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Brief description of the disaster event"
                />
              </div>
              <div className="form-field">
                <label className="form-label" htmlFor="event-type">
                  Type
                </label>
                <select
                  id="event-type"
                  className="form-select"
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value })}
                >
                  {TYPE_OPTIONS.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-field">
                <label className="form-label" htmlFor="event-severity">
                  Severity
                </label>
                <select
                  id="event-severity"
                  className="form-select"
                  value={form.severity}
                  onChange={(e) => setForm({ ...form, severity: e.target.value })}
                >
                  {SEVERITY_OPTIONS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-field">
                <label className="form-label" htmlFor="event-date">
                  Start date
                </label>
                <input
                  id="event-date"
                  type="date"
                  className="form-input"
                  value={form.startDate}
                  onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                  required
                />
              </div>
              <div className="form-field full">
                <span className="form-label">Affected areas</span>
                <div className="area-check-list">
                  {areas.map((a) => (
                    <label key={a.id} className="area-check">
                      <input
                        type="checkbox"
                        checked={form.areaIds.includes(a.id)}
                        onChange={() => toggleArea(a.id)}
                      />
                      <span>
                        {a.name} · {a.state}
                      </span>
                    </label>
                  ))}
                  {areas.length === 0 && (
                    <p className="form-hint">No areas available.</p>
                  )}
                </div>
              </div>
            </div>
            {formError && <div className="form-error">{formError}</div>}
            <div className="modal-actions">
              <button type="button" className="ghost-btn" onClick={() => setShowCreate(false)}>
                Cancel
              </button>
              <button type="submit" className="primary-btn" disabled={creating}>
                {creating ? 'Creating...' : 'Create event'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {resolveTarget && (
        <Modal
          title="Mark event as resolved"
          subtitle="Resolve disaster event"
          onClose={() => setResolveTarget(null)}
        >
          <p className="modal-note">
            Confirm that relief operations for this event are complete? It will no longer
            appear under active events.
          </p>
          {formError && <div className="form-error">{formError}</div>}
          <div className="modal-actions">
            <button type="button" className="ghost-btn" onClick={() => setResolveTarget(null)}>
              Cancel
            </button>
            <button
              type="button"
              className="primary-btn"
              onClick={handleResolve}
              disabled={resolving}
            >
              {resolving ? 'Resolving...' : 'Mark as resolved'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}
