import { useCallback, useEffect, useState } from 'react'
import Modal from '../components/Modal.jsx'
import './ShelterManagement.css'

const EMPTY_FORM = {
  name: '',
  address: '',
  contactNumber: '',
  capacity: '',
  status: 'OPEN',
  areaId: '',
}

export default function ShelterManagement() {
  const [shelters, setShelters] = useState([])
  const [areas, setAreas] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [modal, setModal] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)

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

  const fetchShelters = useCallback(async () => {
    const params = new URLSearchParams()
    if (search) params.set('search', search)
    const res = await fetch(`/api/admin/shelters?${params}`)
    if (!res.ok) throw new Error('Failed to fetch shelters')
    return res.json()
  }, [search])

  useEffect(() => {
    let cancelled = false
    fetchShelters()
      .then((data) => {
        if (cancelled) return
        setShelters(data)
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
  }, [fetchShelters])

  function refresh() {
    fetchShelters().then(setShelters).catch(setError)
  }

  function openAdd() {
    setForm(EMPTY_FORM)
    setFormError(null)
    setModal({ mode: 'add' })
  }

  function openEdit(shelter) {
    setForm({
      name: shelter.name,
      address: shelter.address || '',
      contactNumber: shelter.contact || '',
      capacity: String(shelter.capacity),
      status: shelter.status,
      areaId: shelter.areaId,
    })
    setFormError(null)
    setModal({ mode: 'edit', shelter })
  }

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    setFormError(null)
    try {
      const url =
        modal.mode === 'edit'
          ? `/api/admin/shelters/${modal.shelter.id}`
          : '/api/admin/shelters'
      const method = modal.mode === 'edit' ? 'PUT' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, capacity: Number(form.capacity) || 0 }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.message || 'Failed to save shelter')
      }
      setModal(null)
      refresh()
    } catch (err) {
      setFormError(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    setFormError(null)
    try {
      const res = await fetch(`/api/admin/shelters/${deleteTarget.id}`, {
        method: 'DELETE',
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.message || 'Failed to delete shelter')
      }
      setDeleteTarget(null)
      refresh()
    } catch (err) {
      setFormError(err.message)
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="shelters-page">
      <div className="page-header">
        <h1>Shelter Management</h1>
        <p>Manage shelters used across disaster events.</p>
      </div>

      <div className="content-card">
        <div className="card-toolbar">
          <h2>All shelters</h2>
          <div className="toolbar-actions">
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
            <button type="button" className="primary-btn" onClick={openAdd}>
              + Add shelter
            </button>
          </div>
        </div>

        {loading ? (
          <div className="state-message">Loading shelters...</div>
        ) : error ? (
          <div className="state-message error">{error}</div>
        ) : shelters.length === 0 ? (
          <div className="state-message">No shelters found.</div>
        ) : (
          <table className="shelters-table">
            <thead>
              <tr>
                <th>SHELTER</th>
                <th>AREA</th>
                <th>CONTACT</th>
                <th>CAPACITY</th>
                <th>OCCUPANCY</th>
                <th>STATUS</th>
                <th>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {shelters.map((s) => {
                const ratio = s.capacity > 0 ? s.currentOccupancy / s.capacity : 0
                const percent = Math.min(100, ratio * 100)
                return (
                  <tr key={s.id}>
                    <td>
                      <span className="shelter-name">
                        {s.name}
                        <span className="shelter-address">{s.address}</span>
                      </span>
                    </td>
                    <td>{s.areaName}</td>
                    <td>{s.contact || '—'}</td>
                    <td>{s.capacity}</td>
                    <td>
                      <div className="occupancy-cell">
                        <div className="occupancy-bar">
                          <span style={{ width: `${percent}%` }} />
                        </div>
                        <span className="occupancy-text">
                          {s.currentOccupancy} / {s.capacity}
                        </span>
                      </div>
                    </td>
                    <td>
                      <span className={`status-badge ${s.status.toLowerCase()}`}>
                        {s.status === 'OPEN' ? 'Open' : 'Closed'}
                      </span>
                    </td>
                    <td>
                      <div className="row-actions">
                        <button
                          type="button"
                          className="icon-btn"
                          title="Edit"
                          onClick={() => openEdit(s)}
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M17 3a2.83 2.83 0 0 1 4 4L7.5 20.5 2 22l1.5-5.5z" />
                          </svg>
                        </button>
                        <button
                          type="button"
                          className="icon-btn danger"
                          title="Delete"
                          onClick={() => {
                            setFormError(null)
                            setDeleteTarget(s)
                          }}
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {modal && (
        <Modal
          title={modal.mode === 'edit' ? 'Edit shelter' : 'Add shelter'}
          subtitle={modal.mode === 'edit' ? modal.shelter.name : 'Register a new shelter.'}
          onClose={() => setModal(null)}
        >
          <form onSubmit={handleSave} className="shelter-form">
            <div className="form-grid">
              <div className="form-field full">
                <label className="form-label" htmlFor="shelter-name">
                  Name
                </label>
                <input
                  id="shelter-name"
                  className="form-input"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                />
              </div>
              <div className="form-field full">
                <label className="form-label" htmlFor="shelter-address">
                  Address
                </label>
                <input
                  id="shelter-address"
                  className="form-input"
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                />
              </div>
              <div className="form-field">
                <label className="form-label" htmlFor="shelter-contact">
                  Contact number
                </label>
                <input
                  id="shelter-contact"
                  className="form-input"
                  value={form.contactNumber}
                  onChange={(e) => setForm({ ...form, contactNumber: e.target.value })}
                />
              </div>
              <div className="form-field">
                <label className="form-label" htmlFor="shelter-capacity">
                  Capacity
                </label>
                <input
                  id="shelter-capacity"
                  type="number"
                  min="0"
                  className="form-input"
                  value={form.capacity}
                  onChange={(e) => setForm({ ...form, capacity: e.target.value })}
                  required
                />
              </div>
              <div className="form-field">
                <label className="form-label" htmlFor="shelter-status">
                  Status
                </label>
                <select
                  id="shelter-status"
                  className="form-select"
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value })}
                >
                  <option value="OPEN">Open</option>
                  <option value="CLOSED">Closed</option>
                </select>
              </div>
              <div className="form-field">
                <label className="form-label" htmlFor="shelter-area">
                  Area
                </label>
                <select
                  id="shelter-area"
                  className="form-select"
                  value={form.areaId}
                  onChange={(e) => setForm({ ...form, areaId: e.target.value })}
                  required
                >
                  <option value="">Select area...</option>
                  {areas.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}, {a.state}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            {formError && <div className="form-error">{formError}</div>}
            <div className="modal-actions">
              <button type="button" className="ghost-btn" onClick={() => setModal(null)}>
                Cancel
              </button>
              <button type="submit" className="primary-btn" disabled={saving}>
                {saving ? 'Saving...' : modal.mode === 'edit' ? 'Save changes' : 'Add shelter'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {deleteTarget && (
        <Modal
          title="Delete shelter"
          subtitle={deleteTarget.name}
          onClose={() => setDeleteTarget(null)}
        >
          <p className="modal-note">
            This will permanently delete the shelter along with its inventory, resource
            requests, victims, and task records. This action cannot be undone.
          </p>
          {formError && <div className="form-error">{formError}</div>}
          <div className="modal-actions">
            <button type="button" className="ghost-btn" onClick={() => setDeleteTarget(null)}>
              Cancel
            </button>
            <button
              type="button"
              className="danger-btn"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? 'Deleting...' : 'Delete shelter'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}
