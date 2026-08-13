import './DetailPanel.css'

const STATUS_DISPLAY = {
  PENDING: 'Pending',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
  REVOKED: 'Revoked',
}

function availableActions(status) {
  switch (status) {
    case 'PENDING':
      return [
        { status: 'APPROVED', label: 'Approve', variant: 'primary' },
        { status: 'REJECTED', label: 'Reject', variant: 'danger' },
      ]
    case 'APPROVED':
      return [{ status: 'REVOKED', label: 'Revoke', variant: 'danger' }]
    case 'REJECTED':
      return [{ status: 'APPROVED', label: 'Approve', variant: 'primary' }]
    case 'REVOKED':
      return [
        { status: 'APPROVED', label: 'Approve', variant: 'primary' },
        { status: 'REJECTED', label: 'Reject', variant: 'danger' },
      ]
    default:
      return []
  }
}

export default function DetailPanel({ organization, onClose, onStatusChange }) {
  const actions = availableActions(organization.status)

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

        <h2 className="panel-title">{organization.name}</h2>
        <span className="panel-subtitle">Relief Organization</span>

        <div className="panel-info">
          <div className="panel-info-row">
            <span className="panel-info-label">Address</span>
            <span>{organization.address}</span>
          </div>
          <div className="panel-info-row">
            <span className="panel-info-label">Contact</span>
            <span>{organization.contact}</span>
          </div>
          <div className="panel-info-row">
            <span className="panel-info-label">Status</span>
            <span className={`status-badge ${organization.status.toLowerCase()}`}>
              {STATUS_DISPLAY[organization.status] || organization.status}
            </span>
          </div>
          <div className="panel-info-row">
            <span className="panel-info-label">Approved by</span>
            <span>{organization.approvedBy ? organization.approvedBy.name : '—'}</span>
          </div>
        </div>

        {actions.length > 0 && (
          <div className="panel-section">
            <h3 className="panel-section-title">Actions</h3>
            <div className="panel-actions">
              {actions.map(({ status, label, variant }) => (
                <button
                  key={status}
                  className={`panel-action-btn ${variant}`}
                  onClick={() => onStatusChange(status)}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        )}
      </aside>
    </>
  )
}
