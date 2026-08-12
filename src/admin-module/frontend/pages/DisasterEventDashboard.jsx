import { useEffect, useState } from 'react'
import EventDetailPanel from '../components/EventDetailPanel.jsx'
import './DisasterEventDashboard.css'

const TYPE_LABELS = {
  FLOOD: 'Flood',
  LANDSLIDE: 'Landslide',
  SEVERE_STORM: 'Severe Storm',
  EARTHQUAKE: 'Earthquake',
}

const RESOURCE_TYPE_LABELS = {
  WATER: 'Water',
  FOOD: 'Food',
  MEDICINE: 'Medicine',
  HYGIENE: 'Hygiene',
}

const STATUS_DISPLAY = {
  ACTIVE: 'Active',
  RESOLVED: 'Resolved',
}

function formatDate(value) {
  if (!value) return '—'
  return new Date(value).toLocaleDateString('en-MY', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function StatCard({ label, value }) {
  return (
    <div className="stat-card">
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
    </div>
  )
}

export default function DisasterEventDashboard({ eventId, onBack }) {
  const [dashboard, setDashboard] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [panel, setPanel] = useState(null)
  const [panelDetail, setPanelDetail] = useState(null)
  const [panelLoading, setPanelLoading] = useState(false)
  const [panelError, setPanelError] = useState(null)

  useEffect(() => {
    let cancelled = false
    fetch(`/api/admin/disaster-events/${eventId}/dashboard`)
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load event dashboard')
        return res.json()
      })
      .then((data) => {
        if (cancelled) return
        setDashboard(data)
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
  }, [eventId])

  function openArea(areaId) {
    setPanel({ type: 'area', id: areaId })
    setPanelDetail(null)
    setPanelError(null)
    setPanelLoading(true)
    fetch(`/api/admin/areas/${areaId}?eventId=${eventId}`)
      .then((res) =>
        res.ok ? res.json() : Promise.reject(new Error('Failed to load area details'))
      )
      .then(setPanelDetail)
      .catch((err) => setPanelError(err.message))
      .finally(() => setPanelLoading(false))
  }

  function openShelter(shelterId) {
    setPanel({ type: 'shelter', id: shelterId })
    setPanelDetail(null)
    setPanelError(null)
    setPanelLoading(true)
    fetch(`/api/admin/shelters/${shelterId}?eventId=${eventId}`)
      .then((res) =>
        res.ok ? res.json() : Promise.reject(new Error('Failed to load shelter details'))
      )
      .then(setPanelDetail)
      .catch((err) => setPanelError(err.message))
      .finally(() => setPanelLoading(false))
  }

  function closePanel() {
    setPanel(null)
    setPanelDetail(null)
    setPanelError(null)
  }

  if (loading) {
    return <div className="state-message">Loading event dashboard...</div>
  }

  if (error) {
    return <div className="state-message error">{error}</div>
  }

  if (!dashboard) {
    return <div className="state-message">No event data found.</div>
  }

  const { event, overview, areas, shelters, resourceOverview } = dashboard
  const totalAvailable = resourceOverview.reduce(
    (sum, r) => sum + r.totalAvailable,
    0
  )
  const totalRequested = resourceOverview.reduce(
    (sum, r) => sum + r.totalRequested,
    0
  )

  return (
    <div className="event-dashboard-page">
      <div className="page-header">
        <button type="button" className="back-link" onClick={onBack}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Back to events
        </button>

        <div className="title-row">
          <h1>{event.name}</h1>
          <span className={`status-badge ${event.status.toLowerCase()}`}>
            {STATUS_DISPLAY[event.status] || event.status}
          </span>
        </div>
        <p className="event-meta">
          {TYPE_LABELS[event.type] || event.type} · Severity {event.severity} ·
          Started {formatDate(event.startDate)}
        </p>
      </div>

      <div className="overview-grid">
        <StatCard label="Affected areas" value={overview.affectedAreas} />
        <StatCard label="Active shelters" value={overview.activeShelters} />
        <StatCard label="Total victims" value={overview.totalVictims} />
        <StatCard label="Resource coverage" value={`${overview.resourceCoverage}%`} />
      </div>

      <div className="sections-grid">
        <section className="dashboard-section">
          <h2 className="section-heading">Area Overview</h2>
          <div className="area-list">
            {areas.map((a) => (
              <button
                key={a.id}
                type="button"
                className="area-row"
                onClick={() => openArea(a.id)}
              >
                <div className="row-main">
                  <span className="row-title">{a.name}</span>
                  <span className="row-sub">
                    {a.shelterCount} shelters · {a.victimCount} victims
                  </span>
                </div>
                <span className={`need-badge ${a.needLevel.toLowerCase()}`}>
                  {a.needLevel}
                </span>
              </button>
            ))}
            {areas.length === 0 && <p className="section-empty">No affected areas.</p>}
          </div>
        </section>

        <section className="dashboard-section">
          <h2 className="section-heading">Shelter Overview</h2>
          <div className="shelter-list">
            {shelters.map((s) => {
              const ratio = s.capacity > 0 ? s.currentOccupancy / s.capacity : 0
              const overloaded = ratio > 1
              const percent = Math.min(100, ratio * 100)
              return (
                <button
                  key={s.id}
                  type="button"
                  className="shelter-row"
                  onClick={() => openShelter(s.id)}
                >
                  <div className="row-main">
                    <span className="row-title">{s.name}</span>
                    <span className="row-sub">
                      {s.areaName} · {s.currentOccupancy} / {s.capacity} occupants
                    </span>
                    <div className="occupancy-bar">
                      <span
                        className={`occupancy-fill${overloaded ? ' overloaded' : ''}`}
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                  <div className="row-badges">
                    <span
                      className={`status-badge ${overloaded ? 'overloaded' : 'normal'}`}
                    >
                      {overloaded ? 'Overloaded' : 'Normal'}
                    </span>
                    <span className={`need-badge ${s.needLevel.toLowerCase()}`}>
                      {s.needLevel}
                    </span>
                  </div>
                </button>
              )
            })}
            {shelters.length === 0 && (
              <p className="section-empty">No shelters in this event.</p>
            )}
          </div>
        </section>

        <section className="dashboard-section">
          <h2 className="section-heading">Resource Overview</h2>
          <div className="resource-summary">
            <div className="resource-total-row">
              <span>Available</span>
              <strong>{totalAvailable}</strong>
            </div>
            <div className="resource-total-row">
              <span>Requested</span>
              <strong>{totalRequested}</strong>
            </div>
            <div className="coverage-bar">
              <div
                className="coverage-fill"
                style={{ width: `${overview.resourceCoverage}%` }}
              />
            </div>
            <span className="coverage-label">
              {overview.resourceCoverage}% coverage
            </span>
          </div>
          <div className="resource-breakdown">
            {resourceOverview.map((r) => (
              <div key={r.type} className="resource-row">
                <span className="resource-type">
                  {RESOURCE_TYPE_LABELS[r.type] || r.type}
                </span>
                <span className="resource-qty">
                  {r.totalAvailable} / {r.totalRequested}
                </span>
              </div>
            ))}
          </div>
        </section>
      </div>

      {panel && (
        <EventDetailPanel
          type={panel.type}
          data={panelDetail}
          loading={panelLoading}
          error={panelError}
          onClose={closePanel}
        />
      )}
    </div>
  )
}
