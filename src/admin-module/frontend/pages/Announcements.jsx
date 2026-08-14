import { useCallback, useEffect, useState } from 'react'
import Modal from '../components/Modal.jsx'
import './Announcements.css'


//init form
const EMPTY_FORM = {
  title: '',
  message: '',
  eventId: '',
}

export default function Announcements() {
  const [announcements, setAnnouncements] = useState([])
  const [events, setEvents] = useState([])
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
    fetch('/api/admin/disaster-events')
      .then((res) =>
        res.ok ? res.json() : Promise.reject(new Error('Failed to load events'))
      )
      .then(setEvents)
      .catch(() => { })
  }, [])

  const fetchAnnouncements = useCallback(async () => {
    const params = new URLSearchParams()
    if (search) params.set('search', search)
    const res = await fetch(`/api/admin/announcements?${params}`)
    if (!res.ok) throw new Error('Failed to fetch announcements')
    return res.json()
  }, [search])

  useEffect(() => {
    let cancelled = false
    fetchAnnouncements()
      .then((data) => {
        if (cancelled) return
        setAnnouncements(data)
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
  }, [fetchAnnouncements])

  function refresh() {
    fetchAnnouncements().then(setAnnouncements).catch(setError)
  }

  function openAdd() {
    setForm(EMPTY_FORM)
    setFormError(null)
    setModal({ mode: 'add' })
  }

  function openEdit(announcement) {
    setForm({
      title: announcement.title,
      message: announcement.message,
      eventId: announcement.eventId || '',
    })
    setFormError(null)
    setModal({ mode: 'edit', announcement })
  }

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    setFormError(null)
    try {
      const url =
        modal.mode === 'edit'
          ? `/api/admin/announcements/${modal.announcement.id}`
          : '/api/admin/announcements'
      const method = modal.mode === 'edit' ? 'PUT' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.message || 'Failed to save announcement')
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
      const res = await fetch(`/api/admin/announcements/${deleteTarget.id}`, {
        method: 'DELETE',
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.message || 'Failed to delete announcement')
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
    <div className="announcements-page">
      <div className="page-header">
        <h1>Announcements</h1>
        <p>Publish emergency announcements shown to the public.</p>
      </div>

      <div className="content-card">
        <div className="card-toolbar">
          <h2>All announcements</h2>
          <div className="toolbar-actions">
            <div className="search-wrapper">
              <svg className="search-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                type="text"
                className="search-input"
                placeholder="Search announcements..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
              />
            </div>
            <button type="button" className="primary-btn" onClick={openAdd}>
              + Add announcement
            </button>
          </div>
        </div>

        {loading ? (
          <div className="state-message">Loading announcements...</div>
        ) : error ? (
          <div className="state-message error">{error}</div>
        ) : announcements.length === 0 ? (
          <div className="state-message">No announcements found.</div>
        ) : (
          <table className="announcements-table">
            <thead>
              <tr>
                <th>ANNOUNCEMENT</th>
                <th>EVENT</th>
                <th>PUBLISHED</th>
                <th>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {announcements.map((a) => (
                <tr key={a.id}>
                  <td>
                    <span className="announcement-title-cell">
                      {a.title}
                      <span className="announcement-message-preview">{a.message}</span>
                    </span>
                  </td>
                  <td>{a.eventName || '—'}</td>
                  <td>{new Date(a.createdAt).toLocaleDateString()}</td>
                  <td>
                    <div className="row-actions">
                      <button
                        type="button"
                        className="icon-btn"
                        title="Edit"
                        onClick={() => openEdit(a)}
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
                          setDeleteTarget(a)
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
              ))}
            </tbody>
          </table>
        )}
      </div>

      {modal && (
        <Modal
          title={modal.mode === 'edit' ? 'Edit announcement' : 'Add announcement'}
          subtitle={modal.mode === 'edit' ? modal.announcement.title : 'Publish a new announcement.'}
          onClose={() => setModal(null)}
        >
          <form onSubmit={handleSave} className="announcement-form">
            <div className="form-grid">
              <div className="form-field full">
                <label className="form-label" htmlFor="announcement-title">
                  Title
                </label>
                <input
                  id="announcement-title"
                  className="form-input"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  required
                />
              </div>
              <div className="form-field full">
                <label className="form-label" htmlFor="announcement-message">
                  Message
                </label>
                <textarea
                  id="announcement-message"
                  className="form-textarea"
                  rows="4"
                  value={form.message}
                  onChange={(e) => setForm({ ...form, message: e.target.value })}
                  required
                />
              </div>
              <div className="form-field full">
                <label className="form-label" htmlFor="announcement-event">
                  Related event (optional)
                </label>
                <select
                  id="announcement-event"
                  className="form-select"
                  value={form.eventId}
                  onChange={(e) => setForm({ ...form, eventId: e.target.value })}
                >
                  <option value="">No related event</option>
                  {events.map((ev) => (
                    <option key={ev.id} value={ev.id}>
                      {ev.name}
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
                {saving ? 'Saving...' : modal.mode === 'edit' ? 'Save changes' : 'Publish announcement'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {deleteTarget && (
        <Modal
          title="Delete announcement"
          subtitle={deleteTarget.title}
          onClose={() => setDeleteTarget(null)}
        >
          <p className="modal-note">
            This will permanently remove the announcement from the public dashboard. This
            action cannot be undone.
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
              {deleting ? 'Deleting...' : 'Delete announcement'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}
