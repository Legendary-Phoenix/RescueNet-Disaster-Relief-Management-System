import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import './Tasks.css';

const STATUS_FILTERS = ['All', 'Pending', 'In Progress', 'Completed', 'Revoked'];
const STATUS_VALUES = { 'All': '', 'Pending': 'PENDING', 'In Progress': 'IN_PROGRESS', 'Completed': 'COMPLETED', 'Revoked': 'REVOKED' };

function formatDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function Tasks() {
  const [searchParams] = useSearchParams();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('All');
  const [shelterFilter, setShelterFilter] = useState(searchParams.get('shelter') || '');
  const [eventFilter, setEventFilter] = useState('');
  const [volunteerFilter, setVolunteerFilter] = useState('');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  const [shelters, setShelters] = useState([]);
  const [events, setEvents] = useState([]);
  const [volunteers, setVolunteers] = useState([]);

  const [modal, setModal] = useState(null);
  const [editingTask, setEditingTask] = useState(null);
  const [formData, setFormData] = useState({});
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [expandedTask, setExpandedTask] = useState(null);

  const [modalShelters, setModalShelters] = useState([]);
  const [modalVolunteers, setModalVolunteers] = useState([]);

  useEffect(() => {
    fetch('/api/organization/shelters').then(r => r.json()).then(setShelters).catch(() => {});
    fetch('/api/organization/disaster-events').then(r => r.json()).then(setEvents).catch(() => {});
    fetch('/api/organization/volunteers').then(r => r.json()).then(d => setVolunteers(d.filter(v => v.status === 'ACTIVE'))).catch(() => {});
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    const sv = STATUS_VALUES[statusFilter];
    if (sv) params.set('status', sv);
    if (shelterFilter) params.set('shelter', shelterFilter);
    if (eventFilter) params.set('event', eventFilter);
    if (volunteerFilter) params.set('volunteer', volunteerFilter);
    if (debouncedSearch) params.set('search', debouncedSearch);
    const res = await fetch(`/api/organization/tasks?${params}`);
    setTasks(await res.json());
    setLoading(false);
  }, [statusFilter, shelterFilter, eventFilter, volunteerFilter, debouncedSearch]);

  useEffect(() => { fetchTasks(); }, [fetchTasks]);

  function fetchModalShelters(eventId) {
    if (!eventId) { setModalShelters([]); return; }
    fetch(`/api/organization/shelters?event=${eventId}`).then(r => r.json()).then(setModalShelters).catch(() => setModalShelters([]));
  }

  function fetchModalVolunteers(shelterId) {
    if (!shelterId) { setModalVolunteers([]); return; }
    fetch(`/api/organization/volunteers?shelter=${shelterId}`).then(r => r.json())
      .then(d => setModalVolunteers(d.filter(v => v.status === 'ACTIVE'))).catch(() => setModalVolunteers([]));
  }

  function handleEventChange(eventId) {
    setFormData(prev => ({ ...prev, eventId, shelterId: '', assignedTo: '' }));
    setModalVolunteers([]);
    fetchModalShelters(eventId);
  }

  function handleShelterChange(shelterId) {
    setFormData(prev => ({ ...prev, shelterId, assignedTo: '' }));
    fetchModalVolunteers(shelterId);
  }

  function openCreateModal() {
    setFormData({ title: '', description: '', assignedTo: '', shelterId: '', eventId: '' });
    setModalShelters([]);
    setModalVolunteers([]);
    setFormError('');
    setEditingTask(null);
    setModal('create');
  }

  function openEditModal(task) {
    setFormData({
      title: task.title,
      description: task.description,
      assignedTo: task.assigned_to,
      shelterId: task.shelter_id,
      eventId: task.event_id,
    });
    setFormError('');
    setEditingTask(task);
    fetchModalShelters(task.event_id);
    fetchModalVolunteers(task.shelter_id);
    setModal('edit');
  }

  function openDeleteModal(task) {
    setEditingTask(task);
    setModal('delete');
  }

  async function handleSave() {
    setSaving(true);
    setFormError('');
    try {
      const url = modal === 'edit'
        ? `/api/organization/tasks/${editingTask.task_id}`
        : '/api/organization/tasks';
      const res = await fetch(url, {
        method: modal === 'edit' ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Failed to save task');
      setModal(null);
      fetchTasks();
    } catch (err) { setFormError(err.message); }
    finally { setSaving(false); }
  }

  async function handleDelete() {
    setSaving(true);
    try {
      await fetch(`/api/organization/tasks/${editingTask.task_id}`, { method: 'DELETE' });
      setModal(null);
      fetchTasks();
    } catch { /* ignore */ }
    finally { setSaving(false); }
  }

  async function handleStatusUpdate(taskId, newStatus) {
    await fetch(`/api/organization/tasks/${taskId}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    });
    fetchTasks();
  }

  function getStatusActions(task) {
    if (task.status === 'PENDING' || task.status === 'IN_PROGRESS') {
      return [{ label: 'Revoke', status: 'REVOKED', cls: 'btn-revoke' }];
    }
    return [];
  }

  const statusCounts = {
    all: tasks.length,
    pending: tasks.filter(t => t.status === 'PENDING').length,
    in_progress: tasks.filter(t => t.status === 'IN_PROGRESS').length,
    completed: tasks.filter(t => t.status === 'COMPLETED').length,
  };

  return (
    <div className="tasks-page">
      <div className="page-header">
        <div>
          <h1>Task Management</h1>
          <p>Create and manage tasks assigned to volunteers.</p>
        </div>
        <button className="btn-primary" onClick={openCreateModal}>+ Create Task</button>
      </div>

      <div className="task-stats">
        <div className="stat-card">
          <span className="stat-value">{statusCounts.all}</span>
          <span className="stat-label">Total Tasks</span>
        </div>
        <div className="stat-card">
          <span className="stat-value pending">{statusCounts.pending}</span>
          <span className="stat-label">Pending</span>
        </div>
        <div className="stat-card">
          <span className="stat-value in-progress">{statusCounts.in_progress}</span>
          <span className="stat-label">In Progress</span>
        </div>
        <div className="stat-card">
          <span className="stat-value completed">{statusCounts.completed}</span>
          <span className="stat-label">Completed</span>
        </div>
      </div>

      <div className="content-card">
        <div className="card-toolbar">
          <h2>Tasks</h2>
          <div className="search-wrapper">
            <svg className="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input className="search-input" type="text" placeholder="Search tasks..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>

        <div className="filters">
          <div className="filter-group">
            {STATUS_FILTERS.map(s => (
              <button key={s} className={`filter-chip${statusFilter === s ? ' active' : ''}`} onClick={() => setStatusFilter(s)}>
                {s}
              </button>
            ))}
          </div>
          <div className="filter-dropdowns">
            <select className="shelter-filter" value={eventFilter} onChange={e => setEventFilter(e.target.value)}>
              <option value="">All events</option>
              {events.map(e => <option key={e.event_id} value={e.event_id}>{e.name}</option>)}
            </select>
            <select className="shelter-filter" value={shelterFilter} onChange={e => setShelterFilter(e.target.value)}>
              <option value="">All shelters</option>
              {shelters.map(s => <option key={s.shelter_id} value={s.shelter_id}>{s.name}</option>)}
            </select>
            <select className="shelter-filter" value={volunteerFilter} onChange={e => setVolunteerFilter(e.target.value)}>
              <option value="">All volunteers</option>
              {volunteers.map(v => <option key={v.volunteer_id} value={v.volunteer_id}>{v.name}</option>)}
            </select>
          </div>
        </div>

        {loading ? (
          <div className="state-message">Loading tasks...</div>
        ) : tasks.length === 0 ? (
          <div className="state-message">No tasks found.</div>
        ) : (
          <div className="task-list">
            {tasks.map(task => (
              <div key={task.task_id} className="task-card">
                <div className="task-card-header" onClick={() => setExpandedTask(expandedTask === task.task_id ? null : task.task_id)}>
                  <div className="task-title-area">
                    <span className={`status-dot ${task.status.toLowerCase().replace('_', '-')}`} />
                    <h3 className="task-title">{task.title}</h3>
                    <span className={`status-badge ${task.status.toLowerCase().replace('_', '-')}`}>
                      {task.status === 'IN_PROGRESS' ? 'In Progress' : task.status.charAt(0) + task.status.slice(1).toLowerCase()}
                    </span>
                  </div>
                  <div className="task-meta">
                    <span className="meta-item">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                      {task.volunteer_name}
                    </span>
                    <span className="meta-item">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
                      {task.shelter_name}
                    </span>
                    <span className="meta-item">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                      {formatDate(task.created_at)}
                    </span>
                    <svg className="expand-chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ transform: expandedTask === task.task_id ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }}>
                      <polyline points="6 9 12 15 18 9"/>
                    </svg>
                  </div>
                </div>

                {expandedTask === task.task_id && (
                  <div className="task-card-body">
                    <div className="task-detail-grid">
                      <div className="detail-item">
                        <span className="detail-label">Event</span>
                        <span className="detail-value">{task.event_name}</span>
                      </div>
                      <div className="detail-item">
                        <span className="detail-label">Description</span>
                        <span className="detail-value">{task.description}</span>
                      </div>
                    </div>
                    <div className="task-card-actions">
                      <div className="status-actions">
                        {getStatusActions(task).map(a => (
                          <button key={a.status} className={`btn-sm ${a.cls}`} onClick={() => handleStatusUpdate(task.task_id, a.status)}>
                            {a.label}
                          </button>
                        ))}
                      </div>
                      <div className="edit-actions">
                        {(task.status === 'PENDING' || task.status === 'IN_PROGRESS') && (
                          <button className="action-btn" title="Edit" onClick={() => openEditModal(task)}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                            </svg>
                          </button>
                        )}
                        <button className="action-btn danger" title="Delete" onClick={() => openDeleteModal(task)}>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                            <path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create / Edit Modal */}
      {(modal === 'create' || modal === 'edit') && (
        <>
          <div className="modal-backdrop" onClick={() => setModal(null)} />
          <div className="modal">
            <h2>{modal === 'edit' ? 'Edit Task' : 'Create Task'}</h2>
            <div className="modal-form">
              <label>
                Title
                <input type="text" value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} placeholder="Enter task title" />
              </label>
              <label>
                Description
                <textarea value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} placeholder="Describe the task..." rows={3} />
              </label>
              <label>
                Disaster Event
                <select value={formData.eventId} onChange={e => handleEventChange(e.target.value)}>
                  <option value="">Select event</option>
                  {events.map(e => <option key={e.event_id} value={e.event_id}>{e.name}</option>)}
                </select>
              </label>
              <label>
                Shelter
                <select value={formData.shelterId} onChange={e => handleShelterChange(e.target.value)} disabled={!formData.eventId}>
                  <option value="">{formData.eventId ? 'Select shelter' : 'Select an event first'}</option>
                  {modalShelters.map(s => <option key={s.shelter_id} value={s.shelter_id}>{s.name}</option>)}
                </select>
              </label>
              <label>
                Assign To
                <select value={formData.assignedTo} onChange={e => setFormData({ ...formData, assignedTo: e.target.value })} disabled={!formData.shelterId}>
                  <option value="">{formData.shelterId ? 'Select volunteer' : 'Select a shelter first'}</option>
                  {modalVolunteers.map(v => <option key={v.volunteer_id} value={v.volunteer_id}>{v.name}</option>)}
                </select>
              </label>
              {formError && <p className="form-error">{formError}</p>}
            </div>
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setModal(null)}>Cancel</button>
              <button className="btn-primary" onClick={handleSave}
                disabled={saving || !formData.title || !formData.assignedTo || !formData.shelterId || !formData.eventId}>
                {saving ? 'Saving...' : modal === 'edit' ? 'Save Changes' : 'Create Task'}
              </button>
            </div>
          </div>
        </>
      )}

      {/* Delete Confirmation Modal */}
      {modal === 'delete' && (
        <>
          <div className="modal-backdrop" onClick={() => setModal(null)} />
          <div className="modal modal-sm">
            <h2>Delete Task</h2>
            <p className="modal-subtitle">Are you sure you want to delete <strong>{editingTask?.title}</strong>? This action cannot be undone.</p>
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setModal(null)}>Cancel</button>
              <button className="btn-danger" onClick={handleDelete} disabled={saving}>
                {saving ? 'Deleting...' : 'Delete Task'}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
