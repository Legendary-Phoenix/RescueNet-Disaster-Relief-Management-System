import './DetailPanel.css';

const NEED_COLORS = {
  LOW: '#16a34a',
  MODERATE: '#d97706',
  HIGH: '#ea580c',
  CRITICAL: '#dc2626',
};

function NeedBadge({ level }) {
  if (!level) return null;
  return (
    <span className="panel-need-badge" style={{ background: `${NEED_COLORS[level]}14`, color: NEED_COLORS[level] }}>
      {level}
    </span>
  );
}

function CapacityBar({ current, capacity }) {
  const pct = capacity > 0 ? Math.min((current / capacity) * 100, 100) : 0;
  const overloaded = current > capacity;
  const color = overloaded ? '#dc2626' : pct > 80 ? '#d97706' : '#16a34a';
  return (
    <div className="panel-capacity">
      <div className="panel-capacity-header">
        <span>Capacity</span>
        <span style={{ color, fontWeight: 600 }}>
          {current} / {capacity}{overloaded && ' (Overloaded)'}
        </span>
      </div>
      <div className="panel-capacity-bar">
        <div className="panel-capacity-fill" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
}

function ShelterView({ data }) {
  const { shelter, inventory } = data;
  return (
    <>
      <h2 className="panel-title">{shelter.name}</h2>
      <div className="panel-info">
        <div className="panel-info-row">
          <span className="panel-info-label">Area</span>
          <span>{shelter.area_name}, {shelter.area_state}</span>
        </div>
        {shelter.address && (
          <div className="panel-info-row">
            <span className="panel-info-label">Address</span>
            <span>{shelter.address}</span>
          </div>
        )}
        {shelter.contact_number && (
          <div className="panel-info-row">
            <span className="panel-info-label">Contact</span>
            <span>{shelter.contact_number}</span>
          </div>
        )}
        <div className="panel-info-row">
          <span className="panel-info-label">Status</span>
          <span className={`status-badge ${shelter.status.toLowerCase()}`}>{shelter.status}</span>
        </div>
      </div>

      <CapacityBar current={shelter.current_occupancy} capacity={shelter.capacity} />

      <div className="panel-section">
        <h3 className="panel-section-title">Inventory</h3>
        {inventory.length === 0 ? (
          <p className="panel-empty">No inventory records</p>
        ) : (
          <div className="inventory-list">
            {inventory.map(item => {
              const total = item.available + item.requested;
              const pct = total > 0 ? Math.round((item.available / total) * 100) : 100;
              const color = pct >= 75 ? '#16a34a' : pct >= 50 ? '#d97706' : '#dc2626';
              return (
                <div key={item.resource_id} className="inventory-item">
                  <div className="inventory-header">
                    <div>
                      <span className="resource-name">{item.name}</span>
                      <span className="resource-unit"> · {item.unit}</span>
                    </div>
                    <span className="inventory-ratio" style={{ color }}>
                      {item.available.toLocaleString()} / {total.toLocaleString()}
                    </span>
                  </div>
                  <div className="inventory-bar">
                    <div className="inventory-fill" style={{ width: `${pct}%`, background: color }} />
                  </div>
                  <div className="inventory-labels">
                    <span>{item.available.toLocaleString()} available</span>
                    <span>{item.requested.toLocaleString()} requested</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="panel-section">
        <h3 className="panel-section-title">Actions</h3>
        <div className="panel-actions">
          <a className="panel-action-link" href={`/organization/resources?tab=requests&shelter=${shelter.shelter_id}`}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16.5 9.4l-9-5.19"/><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>
            View Resource Requests
          </a>
          <a className="panel-action-link" href={`/organization/volunteers?shelter=${shelter.shelter_id}`}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
            View Volunteers
          </a>
          <a className="panel-action-link" href={`/organization/tasks?shelter=${shelter.shelter_id}`}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1"/><line x1="9" y1="12" x2="15" y2="12"/><line x1="9" y1="16" x2="15" y2="16"/></svg>
            View Tasks
          </a>
        </div>
      </div>
    </>
  );
}

function AreaView({ data, onShelterClick }) {
  const { area, stats, shelters, resources } = data;
  return (
    <>
      <h2 className="panel-title">{area.name}</h2>
      <span className="panel-subtitle">{area.state}</span>

      <div className="panel-stats">
        <div className="panel-stat">
          <span className="panel-stat-value">{stats.shelter_count}</span>
          <span className="panel-stat-label">Shelters</span>
        </div>
        <div className="panel-stat">
          <span className="panel-stat-value">{stats.victim_count}</span>
          <span className="panel-stat-label">Victims</span>
        </div>
      </div>

      <div className="panel-section">
        <h3 className="panel-section-title">Shelters</h3>
        {shelters.length === 0 ? (
          <p className="panel-empty">No active shelters</p>
        ) : (
          <div className="panel-shelter-list">
            {shelters.map(s => (
              <div key={s.shelter_id} className="panel-shelter-item" onClick={() => onShelterClick(s.shelter_id)}>
                <div className="panel-shelter-main">
                  <span className="panel-shelter-name">{s.name}</span>
                  <span className="panel-shelter-occ">{s.current_occupancy}/{s.capacity}</span>
                </div>
                <NeedBadge level={s.need_level} />
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="panel-section">
        <h3 className="panel-section-title">Resource Summary</h3>
        {resources.length === 0 ? (
          <p className="panel-empty">No resource data</p>
        ) : (
          <div className="inventory-list">
            {resources.map((r, i) => {
              const total = r.available + r.requested;
              const pct = total > 0 ? Math.round((r.available / total) * 100) : 100;
              const color = pct >= 75 ? '#16a34a' : pct >= 50 ? '#d97706' : '#dc2626';
              return (
                <div key={i} className="inventory-item">
                  <div className="inventory-header">
                    <div>
                      <span className="resource-name">{r.name}</span>
                      <span className="resource-unit"> · {r.unit}</span>
                    </div>
                    <span className="inventory-ratio" style={{ color }}>
                      {r.available.toLocaleString()} / {total.toLocaleString()}
                    </span>
                  </div>
                  <div className="inventory-bar">
                    <div className="inventory-fill" style={{ width: `${pct}%`, background: color }} />
                  </div>
                  <div className="inventory-labels">
                    <span>{r.available.toLocaleString()} available</span>
                    <span>{r.requested.toLocaleString()} requested</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}

export default function DetailPanel({ type, data, loading, onClose, onShelterClick }) {
  return (
    <>
      <div className="panel-backdrop" onClick={onClose} />
      <aside className="detail-panel">
        <button className="panel-close" onClick={onClose}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
        {loading ? (
          <div className="panel-loading">Loading...</div>
        ) : !data ? (
          <div className="panel-loading">Failed to load details</div>
        ) : type === 'shelter' ? (
          <ShelterView data={data} />
        ) : (
          <AreaView data={data} onShelterClick={onShelterClick} />
        )}
      </aside>
    </>
  );
}
