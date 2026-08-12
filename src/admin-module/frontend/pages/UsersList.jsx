import { useCallback, useEffect, useState } from 'react'
import Modal from '../components/Modal.jsx'
import './UsersList.css'

const ROLE_OPTIONS = [
  { value: 'ADMIN', label: 'Admin' },
  { value: 'RELIEF_ORG', label: 'Relief Organization' },
  { value: 'VOLUNTEER', label: 'Volunteer' },
  { value: 'PUBLIC', label: 'Public User' },
]

const ROLE_LABELS = Object.fromEntries(ROLE_OPTIONS.map((r) => [r.value, r.label]))

const EMPTY_FORM = {
  username: '',
  password: '',
  role: 'VOLUNTEER',
}

function formatDate(value) {
  if (!value) return '—'
  return new Date(value).toLocaleDateString('en-MY', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export default function UsersList() {
  const [users, setUsers] = useState([])
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

  const fetchUsers = useCallback(async () => {
    const params = new URLSearchParams()
    if (search) params.set('search', search)
    const res = await fetch(`/api/admin/users?${params}`)
    if (!res.ok) throw new Error('Failed to fetch users')
    return res.json()
  }, [search])

  useEffect(() => {
    let cancelled = false
    fetchUsers()
      .then((data) => {
        if (cancelled) return
        setUsers(data)
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
  }, [fetchUsers])

  function refresh() {
    fetchUsers().then(setUsers).catch(setError)
  }

  function openAdd() {
    setForm(EMPTY_FORM)
    setFormError(null)
    setModal({ mode: 'add' })
  }

  function openEdit(user) {
    setForm({
      username: user.username,
      password: '',
      role: user.role,
    })
    setFormError(null)
    setModal({ mode: 'edit', user })
  }

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    setFormError(null)
    try {
      const url =
        modal.mode === 'edit'
          ? `/api/admin/users/${modal.user.id}`
          : '/api/admin/users'
      const method = modal.mode === 'edit' ? 'PUT' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.message || 'Failed to save user')
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
      const res = await fetch(`/api/admin/users/${deleteTarget.id}`, {
        method: 'DELETE',
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.message || 'Failed to delete user')
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
    <div className="users-page">
      <div className="page-header">
        <h1>User Management</h1>
        <p>Create, edit, and manage system user accounts.</p>
      </div>

      <div className="content-card">
        <div className="card-toolbar">
          <h2>All users</h2>
          <div className="toolbar-actions">
            <div className="search-wrapper">
              <svg className="search-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                type="text"
                className="search-input"
                placeholder="Search users..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
              />
            </div>
            <button type="button" className="primary-btn" onClick={openAdd}>
              + Add user
            </button>
          </div>
        </div>

        {loading ? (
          <div className="state-message">Loading users...</div>
        ) : error ? (
          <div className="state-message error">{error}</div>
        ) : users.length === 0 ? (
          <div className="state-message">No users found.</div>
        ) : (
          <table className="users-table">
            <thead>
              <tr>
                <th>USERNAME</th>
                <th>ROLE</th>
                <th>CREATED</th>
                <th>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id}>
                  <td>
                    <span className="user-name">
                      {user.username}
                      <span className="user-id">{user.id}</span>
                    </span>
                  </td>
                  <td>
                    <span className={`role-badge ${user.role.toLowerCase().replace('_', '-')}`}>
                      {ROLE_LABELS[user.role] || user.role}
                    </span>
                  </td>
                  <td>{formatDate(user.createdAt)}</td>
                  <td>
                    <div className="row-actions">
                      <button
                        type="button"
                        className="icon-btn"
                        title="Edit"
                        onClick={() => openEdit(user)}
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
                          setDeleteTarget(user)
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
          title={modal.mode === 'edit' ? 'Edit user' : 'Add user'}
          subtitle={modal.mode === 'edit' ? modal.user.username : 'Create a new system account.'}
          onClose={() => setModal(null)}
        >
          <form onSubmit={handleSave} className="user-form">
            <div className="form-grid">
              <div className="form-field full">
                <label className="form-label" htmlFor="user-username">
                  Username
                </label>
                <input
                  id="user-username"
                  className="form-input"
                  value={form.username}
                  onChange={(e) => setForm({ ...form, username: e.target.value })}
                  required
                />
              </div>
              <div className="form-field full">
                <label className="form-label" htmlFor="user-password">
                  {modal.mode === 'edit' ? 'New password (optional)' : 'Password'}
                </label>
                <input
                  id="user-password"
                  type="password"
                  className="form-input"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  placeholder={
                    modal.mode === 'edit' ? 'Leave blank to keep current password' : ''
                  }
                  required={modal.mode === 'add'}
                />
              </div>
              <div className="form-field full">
                <label className="form-label" htmlFor="user-role">
                  Role
                </label>
                <select
                  id="user-role"
                  className="form-select"
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value })}
                >
                  {ROLE_OPTIONS.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
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
                {saving ? 'Saving...' : modal.mode === 'edit' ? 'Save changes' : 'Add user'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {deleteTarget && (
        <Modal
          title="Delete user"
          subtitle={deleteTarget.username}
          onClose={() => setDeleteTarget(null)}
        >
          <p className="modal-note">
            This will permanently delete the user account and its role record. This action
            cannot be undone.
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
              {deleting ? 'Deleting...' : 'Delete user'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}
