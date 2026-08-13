import { useCallback, useEffect, useState } from 'react'
import DetailPanel from '../components/DetailPanel.jsx'
import './ReliefOrganizationsList.css'

const STATUS_OPTIONS = ['All status', 'Pending', 'Approved', 'Rejected', 'Revoked']

const STATUS_DISPLAY = {
  PENDING: 'Pending',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
  REVOKED: 'Revoked',
}

export default function ReliefOrganizationsList() {
  const [organizations, setOrganizations] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [statusFilter, setStatusFilter] = useState('All status')
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [selectedOrg, setSelectedOrg] = useState(null)

  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput), 300)
    return () => clearTimeout(timer)
  }, [searchInput])

  const fetchOrganizations = useCallback(async () => {
    const params = new URLSearchParams()
    if (statusFilter !== 'All status') params.set('status', statusFilter.toUpperCase())
    if (search) params.set('search', search)
    const res = await fetch(`/api/admin/relief-organizations?${params}`)
    if (!res.ok) throw new Error('Failed to fetch organizations')
    return res.json()
  }, [statusFilter, search])

  useEffect(() => {
    let cancelled = false
    fetchOrganizations()
      .then((data) => {
        if (cancelled) return
        setOrganizations(data)
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
  }, [fetchOrganizations])

  async function handleStatusChange(status) {
    if (!selectedOrg) return
    try {
      setError(null)
      const res = await fetch(
        `/api/admin/relief-organizations/${selectedOrg.id}/status`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status }),
        }
      )
      if (!res.ok) throw new Error('Failed to update organization status')
      const updated = await res.json()
      setSelectedOrg(updated)
      const data = await fetchOrganizations()
      setOrganizations(data)
    } catch (err) {
      setError(err.message)
    }
  }




  //content card is misaligned
  return (
    <div className="relief-organizations-page">
      <div className="page-header">
        <h1>Relief Organizations</h1>
        <p>Review and manage relief organization registrations.</p>
      </div>

      <div className="content-card">
        <div className="card-toolbar">
          <h2>All organizations</h2>
          <div className="search-wrapper">
            <svg className="search-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              className="search-input"
              placeholder="Search organizations..."
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
        </div>

        {loading ? (
          <div className="state-message">Loadig organizations...</div>
        ) : error ? (
          <div className="state-message error">{error}</div>
        ) : organizations.length === 0 ? (
          <div className="state-message">No organizations found.</div>
        ) : (
          <table className="orgs-table">
            <thead>
              <tr>
                <th>ORGANZATION</th>
                <th>CONTACT</th>
                <th>LOCATION</th>
                <th>STATUS</th>
              </tr>
            </thead>
            <tbody>
              {organizations.map((org) => (
                <tr key={org.id} onClick={() => setSelectedOrg(org)}>
                  <td>
                    <span className="org-name">
                      {org.name}
                      <svg className="chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="9 18 15 12 9 6" />
                      </svg>
                    </span>
                  </td>
                  <td>{org.contact}</td>
                  <td className="org-location">{org.address}</td>
                  <td>
                    <span className={`status-badge ${org.status.toLowerCase()}`}>
                      {STATUS_DISPLAY[org.status] || org.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {selectedOrg && (
        <DetailPanel
          organization={selectedOrg}
          onClose={() => setSelectedOrg(null)}
          onStatusChange={handleStatusChange}
        />
      )}
    </div>
  )
}
