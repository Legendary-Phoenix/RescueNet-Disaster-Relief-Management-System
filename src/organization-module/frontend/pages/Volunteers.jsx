import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import './Volunteers.css';

const STATUS_OPTIONS = ['All', 'Active', 'Inactive'];

export default function Volunteers() {
  const [searchParams] = useSearchParams();
  const [volunteers, setVolunteers] = useState([]);
  const [shelters, setShelters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [statusFilter, setStatusFilter] = useState(
    searchParams.get('status') === 'ACTIVE' ? 'Active' : 'All'
  );
  const [shelterFilter, setShelterFilter] = useState(searchParams.get('shelter') || '');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');

  const [modal, setModal] = useState(null);
  const [formData, setFormData] = useState({});
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const [assignModal, setAssignModal] = useState(null);
  const [selectedShelter, setSelectedShelter] = useState('');

  const [confirmRemove, setConfirmRemove] = useState(null);

  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput), 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => { fetchShelters(); }, []);
  useEffect(() => { fetchVolunteers(); }, [statusFilter, shelterFilter, search]);

  async function fetchShelters() {
    try {
      const res = await fetch('/api/organization/shelters');
      setShelters(await res.json());
    } catch { /* ignore */ }
  }

  async function fetchVolunteers() {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      if (statusFilter !== 'All') params.set('status', statusFilter.toUpperCase());
      if (shelterFilter) params.set('shelter', shelterFilter);
      if (search) params.set('search', search);
      const res = await fetch(`/api/organization/volunteers?${params}`);
      if (!res.ok) throw new Error('Failed to fetch volunteers');
      setVolunteers(await res.json());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function openAddModal() {
    setFormData({ username: '', name: '', age: '', gender: 'MALE', contact_number: '' });
    setFormError('');
    setModal('add');
  }

  function openEditModal(vol) {
    setFormData({ name: vol.name, age: vol.age, gender: vol.gender, contact_number: vol.contact_number, status: vol.status });
    setFormError('');
    setModal(vol.volunteer_id);
  }

  function openAssignModal(vol) {
    setSelectedShelter(vol.shelters.length > 0 ? vol.shelters[0].shelter_id : '');
    setAssignModal(vol);
  }

  async function handleSave() {
    setSaving(true);
    setFormError('');
    try {
      if (modal === 'add') {
        const res = await fetch('/api/organization/volunteers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...formData, age: parseInt(formData.age) || null }),
        });
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || 'Failed to create volunteer');
        }
      } else {
        const res = await fetch(`/api/organization/volunteers/${modal}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...formData, age: parseInt(formData.age) || null }),
        });
        if (!res.ok) throw new Error('Failed to update volunteer');
      }
      setModal(null);
      fetchVolunteers();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleAssignSave() {
    setSaving(true);
    try {
      await fetch(`/api/organization/volunteers/${assignModal.volunteer_id}/shelter`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shelterId: selectedShelter || null }),
      });
      setAssignModal(null);
      fetchVolunteers();
    } catch { /* ignore */ }
    finally { setSaving(false); }
  }

  async function handleRemove() {
    await fetch(`/api/organization/volunteers/${confirmRemove.volunteer_id}`, { method: 'DELETE' });
    setConfirmRemove(null);
    fetchVolunteers();
  }

  return (
    <div className="volunteers-page">
      <div className="page-header">
        <div>
          <h1>Volunteer Management</h1>
          <p>Manage volunteers under your organization.</p>
        </div>
        <button className="btn-primary" onClick={openAddModal}>+ Add Volunteer</button>
      </div>

      <div className="content-card">
        <div className="card-toolbar">
          <h2>All volunteers</h2>
          <div className="search-wrapper">
            <svg className="search-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input type="text" className="search-input" placeholder="Search volunteers..." value={searchInput} onChange={e => setSearchInput(e.target.value)} />
          </div>
        </div>

        <div className="filters">
          <div className="filter-group">
            {STATUS_OPTIONS.map(opt => (
              <button key={opt} className={`filter-chip${statusFilter === opt ? ' active' : ''}`} onClick={() => setStatusFilter(opt)}>
                {opt}
              </button>
            ))}
          </div>
          <select className="shelter-filter" value={shelterFilter} onChange={e => setShelterFilter(e.target.value)}>
            <option value="">All shelters</option>
            {shelters.map(s => (
              <option key={s.shelter_id} value={s.shelter_id}>{s.name}</option>
            ))}
          </select>
        </div>

        {loading ? (
          <div className="state-message">Loading volunteers...</div>
        ) : error ? (
          <div className="state-message error">{error}</div>
        ) : volunteers.length === 0 ? (
          <div className="state-message">No volunteers found.</div>
        ) : (
          <table className="vol-table">
            <thead>
              <tr>
                <th>NAME</th>
                <th>CONTACT</th>
                <th>AGE</th>
                <th>GENDER</th>
                <th>SHELTER</th>
                <th>STATUS</th>
                <th>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {volunteers.map(vol => (
                <tr key={vol.volunteer_id}>
                  <td>
                    <div className="vol-name">{vol.name}</div>
                    <div className="vol-username">@{vol.username}</div>
                  </td>
                  <td>{vol.contact_number}</td>
                  <td>{vol.age}</td>
                  <td>{vol.gender === 'MALE' ? 'Male' : 'Female'}</td>
                  <td>
                    {vol.shelters.length === 0
                      ? <span className="no-shelter">Unassigned</span>
                      : <span className="shelter-tag">{vol.shelters[0].name}</span>
                    }
                  </td>
                  <td>
                    <span className={`status-badge ${vol.status.toLowerCase()}`}>
                      {vol.status === 'ACTIVE' ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td>
                    <div className="action-btns">
                      <button className="action-btn" title="Edit" onClick={() => openEditModal(vol)}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                      </button>
                      <button className="action-btn" title="Assign shelters" onClick={() => openAssignModal(vol)}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                      </button>
                      <button className="action-btn danger" title="Remove" onClick={() => setConfirmRemove(vol)}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Add / Edit Modal */}
      {modal && (
        <>
          <div className="modal-backdrop" onClick={() => setModal(null)} />
          <div className="modal">
            <h2>{modal === 'add' ? 'Add Volunteer' : 'Edit Volunteer'}</h2>
            <div className="modal-form">
              {modal === 'add' && (
                <>
                  <label>
                    Username
                    <input type="text" value={formData.username} onChange={e => setFormData({ ...formData, username: e.target.value })} />
                  </label>
                  <label>
                    Password
                    <input type="text" value="password123" readOnly className="input-readonly" />
                  </label>
                </>
              )}
              <label>
                Full Name
                <input type="text" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
              </label>
              <div className="form-row">
                <label>
                  Age
                  <input type="number" value={formData.age} onChange={e => setFormData({ ...formData, age: e.target.value })} />
                </label>
                <label>
                  Gender
                  <select value={formData.gender} onChange={e => setFormData({ ...formData, gender: e.target.value })}>
                    <option value="MALE">Male</option>
                    <option value="FEMALE">Female</option>
                  </select>
                </label>
              </div>
              <label>
                Contact Number
                <input type="text" value={formData.contact_number} onChange={e => setFormData({ ...formData, contact_number: e.target.value })} />
              </label>
              {modal !== 'add' && (
                <label>
                  Status
                  <select value={formData.status} onChange={e => setFormData({ ...formData, status: e.target.value })}>
                    <option value="ACTIVE">Active</option>
                    <option value="INACTIVE">Inactive</option>
                  </select>
                </label>
              )}
              {formError && <p className="form-error">{formError}</p>}
            </div>
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setModal(null)}>Cancel</button>
              <button className="btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? 'Saving...' : modal === 'add' ? 'Add Volunteer' : 'Save Changes'}
              </button>
            </div>
          </div>
        </>
      )}

      {/* Assign Shelter Modal */}
      {assignModal && (
        <>
          <div className="modal-backdrop" onClick={() => setAssignModal(null)} />
          <div className="modal">
            <h2>Assign Shelter</h2>
            <p className="modal-subtitle">Select a shelter for <strong>{assignModal.name}</strong></p>
            <div className="shelter-checklist">
              <label className="shelter-check-item">
                <input type="radio" name="shelter" value="" checked={selectedShelter === ''} onChange={() => setSelectedShelter('')} />
                <span className="unassign-option">Unassigned</span>
              </label>
              {shelters.map(s => (
                <label key={s.shelter_id} className="shelter-check-item">
                  <input type="radio" name="shelter" value={s.shelter_id} checked={selectedShelter === s.shelter_id} onChange={() => setSelectedShelter(s.shelter_id)} />
                  <span>{s.name}</span>
                </label>
              ))}
            </div>
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setAssignModal(null)}>Cancel</button>
              <button className="btn-primary" onClick={handleAssignSave} disabled={saving}>
                {saving ? 'Saving...' : 'Save Assignment'}
              </button>
            </div>
          </div>
        </>
      )}

      {/* Remove Confirmation */}
      {confirmRemove && (
        <>
          <div className="modal-backdrop" onClick={() => setConfirmRemove(null)} />
          <div className="modal modal-sm">
            <h2>Remove Volunteer</h2>
            <p>Are you sure you want to deactivate <strong>{confirmRemove.name}</strong>? They will be marked as inactive.</p>
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setConfirmRemove(null)}>Cancel</button>
              <button className="btn-danger" onClick={handleRemove}>Remove</button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
