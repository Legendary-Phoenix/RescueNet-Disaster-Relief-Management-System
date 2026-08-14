import './AreaDetailPanel.css';

function CapacityBar({ current, capacity }) {
  const pct = capacity > 0 ? Math.min((current / capacity) * 100, 100) : 0;
  const overloaded = current > capacity;
  const color = overloaded ? '#dc2626' : pct > 80 ? '#d97706' : '#16a34a';
  return (
    <div className="area-panel-capacity">
      <div className="area-panel-capacity-bar">
        <div className="area-panel-capacity-fill" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="area-panel-capacity-text" style={{ color }}>
        {current}/{capacity}{overloaded && ' (Overloaded)'}
      </span>
    </div>
  );
}

export default function AreaDetailPanel({ data, loading, onClose }) {
  return (
    <>
      <div className="panel-backdrop" onClick={onClose} />
      <aside className="area-detail-panel">
        <button className="panel-close" onClick={onClose}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
        {loading ? (
          <div className="panel-loading">Loading...</div>
        ) : !data ? (
          <div className="panel-loading">Failed to load details</div>
        ) : (
          <>
            <h2 className="panel-title">{data.area.name}</h2>
            <span className="panel-subtitle">{data.area.state}</span>

            <div className="area-panel-stats">
              <div className="area-panel-stat">
                <span className="area-panel-stat-value">{data.stats.shelter_count}</span>
                <span className="area-panel-stat-label">Shelters</span>
              </div>
              <div className="area-panel-stat">
                <span className="area-panel-stat-value">{data.stats.victim_count}</span>
                <span className="area-panel-stat-label">Victims</span>
              </div>
            </div>

            <div className="area-panel-section">
              <h3 className="area-panel-section-title">Shelters</h3>
              {data.shelters.length === 0 ? (
                <p className="area-panel-empty">No active shelters</p>
              ) : (
                <div className="area-panel-shelter-list">
                  {data.shelters.map((s) => (
                    <div key={s.shelter_id} className="area-panel-shelter-item">
                      <div className="area-panel-shelter-header">
                        <span className="area-panel-shelter-name">{s.name}</span>
                        <span className={`status-badge ${s.status.toLowerCase()}`}>{s.status}</span>
                      </div>
                      {s.address && <div className="area-panel-shelter-address">{s.address}</div>}
                      {s.contact_number && <div className="area-panel-shelter-contact">{s.contact_number}</div>}
                      <CapacityBar current={s.current_occupancy} capacity={s.capacity} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </aside>
    </>
  );
}
