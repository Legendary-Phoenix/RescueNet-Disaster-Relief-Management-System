import './EventDetailPanel.css'

const NEED_DISPLAY = {
  LOW: 'Low',
  MODERATE: 'Moderate',
  HIGH: 'High',
  CRITICAL: 'Critical',
}

const SHELTER_STATUS = {
  OPEN: 'Open',
  CLOSED: 'Closed',
}

const REQUEST_STATUS = {
  PENDING: 'Pending',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
  REVOKED: 'Revoked',
  FULFILLED: 'Fulfilled',
}

const RESOURCE_TYPE_LABELS = {
  WATER: 'Water',
  FOOD: 'Food',
  MEDICINE: 'Medicine',
  HYGIENE: 'Hygiene',
}

function formatDate(value) {
  if (!value) return '—'
  return new Date(value).toLocaleDateString('en-MY', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function needLabel(level) {
  return NEED_DISPLAY[level] || level
}

export default function EventDetailPanel({ type, data, loading, error, onClose }) {
  return (
    <>
      <div className="panel-backdrop" onClick={onClose} />
      <aside className="detail-panel">
        <button className="panel-close" onClick={onClose}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        {loading ? (
          <div className="state-message">Loading details...</div>
        ) : error ? (
          <div className="state-message error">{error}</div>
        ) : !data ? (
          <div className="state-message">No details found.</div>
        ) : type === 'area' ? (
          <AreaDetail data={data} />
        ) : (
          <ShelterDetail data={data} />
        )}
      </aside>
    </>
  )
}

function AreaDetail({ data }) {
  const { area, stats, shelters, inventory, needBreakdown } = data

  return (
    <>
      <h2 className="panel-title">{area.name}</h2>
      <span className="panel-subtitle">Affected Area · {area.state}</span>

      <div className="panel-info">
        <div className="panel-info-row">
          <span className="panel-info-label">Need level</span>
          <span className={`need-badge ${area.needLevel.toLowerCase()}`}>
            {needLabel(area.needLevel)}
          </span>
        </div>
        <div className="panel-info-row">
          <span className="panel-info-label">Shelters</span>
          <span>{stats.shelterCount}</span>
        </div>
        <div className="panel-info-row">
          <span className="panel-info-label">Victims</span>
          <span>{stats.victimCount}</span>
        </div>
      </div>

      <div className="panel-section">
        <h3 className="panel-section-title">Shelters in area</h3>
        <div className="detail-list">
          {shelters.map((s) => {
            const ratio = s.capacity > 0 ? s.currentOccupancy / s.capacity : 0
            const percent = Math.min(100, ratio * 100)
            return (
              <div key={s.id} className="detail-list-item">
                <div className="detail-item-main">
                  <span className="detail-item-title">{s.name}</span>
                  <div className="occupancy-bar">
                    <span className="occupancy-fill" style={{ width: `${percent}%` }} />
                  </div>
                  <span className="detail-item-sub">
                    {s.currentOccupancy} / {s.capacity} occupants
                  </span>
                </div>
                <div className="detail-item-badges">
                  <span className={`status-badge ${s.status.toLowerCase()}`}>
                    {SHELTER_STATUS[s.status] || s.status}
                  </span>
                  <span className={`need-badge ${s.needLevel.toLowerCase()}`}>
                    {needLabel(s.needLevel)}
                  </span>
                </div>
              </div>
            )
          })}
          {shelters.length === 0 && <p className="detail-empty">No shelters in this area.</p>}
        </div>
      </div>

      <div className="panel-section">
        <h3 className="panel-section-title">Inventory summary</h3>
        <div className="detail-table">
          {inventory.map((item) => (
            <div key={item.type} className="detail-table-row">
              <span className="detail-table-label">
                {RESOURCE_TYPE_LABELS[item.type] || item.type}
              </span>
              <span className="detail-table-value">
                {item.available} available · {item.requested} requested
              </span>
            </div>
          ))}
          {inventory.length === 0 && <p className="detail-empty">No inventory recorded.</p>}
        </div>
      </div>

      <div className="panel-section">
        <h3 className="panel-section-title">Need level breakdown</h3>
        <div className="need-breakdown">
          {Object.entries(needBreakdown).map(([level, count]) => (
            <div key={level} className="need-breakdown-row">
              <span className={`need-badge ${level.toLowerCase()}`}>{needLabel(level)}</span>
              <span className="need-breakdown-count">
                {count} shelter{count === 1 ? '' : 's'}
              </span>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}

function ShelterDetail({ data }) {
  const { shelter, victimCount, inventory, requests } = data

  return (
    <>
      <h2 className="panel-title">{shelter.name}</h2>
      <span className="panel-subtitle">
        Shelter · {shelter.areaName}, {shelter.areaState}
      </span>

      <div className="panel-info">
        <div className="panel-info-row">
          <span className="panel-info-label">Address</span>
          <span>{shelter.address}</span>
        </div>
        <div className="panel-info-row">
          <span className="panel-info-label">Contact</span>
          <span>{shelter.contact || '—'}</span>
        </div>
        <div className="panel-info-row">
          <span className="panel-info-label">Capacity</span>
          <span>{shelter.capacity}</span>
        </div>
        <div className="panel-info-row">
          <span className="panel-info-label">Occupancy</span>
          <span>{shelter.currentOccupancy}</span>
        </div>
        <div className="panel-info-row">
          <span className="panel-info-label">Status</span>
          <span className={`status-badge ${shelter.status.toLowerCase()}`}>
            {SHELTER_STATUS[shelter.status] || shelter.status}
          </span>
        </div>
        <div className="panel-info-row">
          <span className="panel-info-label">Need level</span>
          <span className={`need-badge ${shelter.needLevel.toLowerCase()}`}>
            {needLabel(shelter.needLevel)}
          </span>
        </div>
        <div className="panel-info-row">
          <span className="panel-info-label">Victims</span>
          <span>{victimCount}</span>
        </div>
      </div>

      <div className="panel-section">
        <h3 className="panel-section-title">Inventory breakdown</h3>
        <div className="detail-table">
          {inventory.map((item) => (
            <div key={item.resourceId} className="detail-table-row">
              <div className="detail-table-main">
                <span className="detail-item-title">{item.name}</span>
                <span className="detail-item-sub">{item.unit}</span>
              </div>
              <span className="detail-table-value">
                {item.available} available · {item.requested} requested
              </span>
            </div>
          ))}
          {inventory.length === 0 && <p className="detail-empty">No inventory recorded.</p>}
        </div>
      </div>

      <div className="panel-section">
        <h3 className="panel-section-title">Resource requests</h3>
        <div className="request-list">
          {requests.map((req) => (
            <div key={req.id} className="request-item">
              <div className="request-item-head">
                <span className={`status-badge ${req.status.toLowerCase()}`}>
                  {REQUEST_STATUS[req.status] || req.status}
                </span>
                <span className="request-date">{formatDate(req.createdAt)}</span>
              </div>
              <ul className="request-items">
                {req.items.map((it, i) => (
                  <li key={i}>
                    {it.quantity}× {it.name} ({it.unit})
                  </li>
                ))}
              </ul>
            </div>
          ))}
          {requests.length === 0 && <p className="detail-empty">No resource requests.</p>}
        </div>
      </div>
    </>
  )
}
