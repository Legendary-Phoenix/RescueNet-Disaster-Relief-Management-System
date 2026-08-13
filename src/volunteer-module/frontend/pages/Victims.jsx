import { useState, useEffect, useCallback } from 'react';
import { useVolunteer, volunteerQuery } from '../components/volunteerContext';
import './Victims.css';

const VICTIM_STATUSES = ['CHECKED_IN', 'MEDICAL_ATTENTION', 'TRANSFERRED', 'DISCHARGED'];
const GENDERS = ['MALE', 'FEMALE'];

const STATUS_LABELS = {
  CHECKED_IN: 'Checked In',
  MEDICAL_ATTENTION: 'Medical Attention',
  TRANSFERRED: 'Transferred',
  DISCHARGED: 'Discharged',
};

const NEED_LABELS = {
  INFANT_CARE: 'Infant Care',
  ELDERLY_MOBILITY: 'Elderly / Mobility',
  MEDICAL_SUPPLIES: 'Medical Supplies',
  DIETARY_RESTRICTIONS: 'Dietary Restrictions',
  PREGNANCY: 'Pregnancy',
  DISABILITY_SUPPORT: 'Disability Support',
  CHRONIC_ILLNESS: 'Chronic Illness',
  UNACCOMPANIED_MINOR: 'Unaccompanied Minor',
};

const DEFAULT_NEED_LIMITS = { maxCustomNeeds: 3, maxNeedLength: 60 };

// Preset tags are stored as SCREAMING_CASE; a custom need is whatever the volunteer
// typed and must be shown back to them verbatim.
function needLabel(tag) {
  if (NEED_LABELS[tag]) return NEED_LABELS[tag];
  if (!/^[A-Z0-9_]+$/.test(tag)) return tag;
  return tag.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

// Presets and custom entries land in the same TEXT[] column; blank rows are dropped
// so an empty "Other" box never registers a nameless need.
function collectNeeds(form) {
  const custom = form.customNeedsOn
    ? form.customNeeds.map((n) => n.trim()).filter(Boolean)
    : [];
  return [...form.specialNeeds, ...custom];
}

function formatDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

const EMPTY_FORM = {
  name: '',
  age: '',
  gender: '',
  contactNumber: '',
  shelterId: '',
  eventId: '',
  status: 'CHECKED_IN',
  specialNeeds: [],
  customNeedsOn: false,
  customNeeds: [''],
};

export default function Victims() {
  const { volunteerId, shelters, activeShelterId, ready } = useVolunteer();

  const [victims, setVictims] = useState([]);
  const [stats, setStats] = useState(null);
  const [presetNeeds, setPresetNeeds] = useState([]);
  const [needLimits, setNeedLimits] = useState(DEFAULT_NEED_LIMITS);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [updatingId, setUpdatingId] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [moveModal, setMoveModal] = useState(null);
  const [moveShelter, setMoveShelter] = useState('');

  const fetchVictims = useCallback(async () => {
    setLoading(true);
    try {
      const query = volunteerQuery(volunteerId, activeShelterId, { status: statusFilter, search });
      const [vRes, sRes] = await Promise.all([
        fetch(`/api/volunteer/victims?${query}`),
        fetch(`/api/volunteer/victims/stats?${volunteerQuery(volunteerId, activeShelterId)}`),
      ]);
      setVictims(await vRes.json());
      setStats(await sRes.json());
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [volunteerId, activeShelterId, statusFilter, search]);

  useEffect(() => {
    async function loadOptions() {
      try {
        const [optRes, evRes] = await Promise.all([
          fetch(`/api/volunteer/victims/options?volunteerId=${volunteerId}`),
          fetch(`/api/volunteer/requests/events?volunteerId=${volunteerId}`),
        ]);
        const options = await optRes.json();
        setPresetNeeds(options.specialNeeds || []);
        setNeedLimits({ ...DEFAULT_NEED_LIMITS, ...(options.limits || {}) });
        setEvents(await evRes.json());
      } catch { /* ignore */ }
    }
    if (ready && volunteerId) {
      loadOptions();
      fetchVictims();
    }
  }, [ready, volunteerId, fetchVictims]);

  async function handleRegister(e) {
    e.preventDefault();
    if (!form.name.trim()) { setFormError('Name is required'); return; }
    if (!form.shelterId) { setFormError('Select a shelter'); return; }
    if (!form.eventId) { setFormError('Select a disaster event'); return; }
    setSubmitting(true);
    setFormError('');
    try {
      const res = await fetch(`/api/volunteer/victims?volunteerId=${volunteerId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name.trim(),
          age: form.age ? parseInt(form.age, 10) : null,
          gender: form.gender || null,
          contactNumber: form.contactNumber || null,
          shelterId: form.shelterId,
          eventId: form.eventId,
          status: form.status,
          specialNeeds: collectNeeds(form),
        }),
      });
      const data = await res.json();
      if (!res.ok) { setFormError(data.error || 'Failed to register victim'); return; }
      setShowModal(false);
      setForm(EMPTY_FORM);
      fetchVictims();
    } catch {
      setFormError('An error occurred. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleStatusChange(victimId, newStatus) {
    setUpdatingId(victimId);
    try {
      await fetch(`/api/volunteer/victims/${victimId}/status?volunteerId=${volunteerId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      fetchVictims();
    } catch { /* ignore */ }
    finally { setUpdatingId(null); }
  }

  async function handleMove(victimId) {
    if (!moveShelter) return;
    setUpdatingId(victimId);
    try {
      await fetch(`/api/volunteer/victims/${victimId}/shelter?volunteerId=${volunteerId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shelterId: moveShelter }),
      });
      setMoveModal(null);
      setMoveShelter('');
      fetchVictims();
    } catch { /* ignore */ }
    finally { setUpdatingId(null); }
  }

  function toggleNeed(need) {
    setForm((f) => ({
      ...f,
      specialNeeds: f.specialNeeds.includes(need)
        ? f.specialNeeds.filter((n) => n !== need)
        : [...f.specialNeeds, need],
    }));
  }

  // Unticking "Other" throws the typed text away rather than submitting a need the
  // volunteer can no longer see.
  function toggleCustomNeeds() {
    setForm((f) => (
      f.customNeedsOn
        ? { ...f, customNeedsOn: false, customNeeds: [''] }
        : { ...f, customNeedsOn: true }
    ));
  }

  function updateCustomNeed(index, value) {
    setForm((f) => ({
      ...f,
      customNeeds: f.customNeeds.map((n, i) => (i === index ? value : n)),
    }));
  }

  function addCustomNeed() {
    setForm((f) => ({ ...f, customNeeds: [...f.customNeeds, ''] }));
  }

  function removeCustomNeed(index) {
    setForm((f) => {
      const remaining = f.customNeeds.filter((_, i) => i !== index);
      return { ...f, customNeeds: remaining.length ? remaining : [''] };
    });
  }

  function openRegister() {
    setShowModal(true);
    setFormError('');
    setForm({ ...EMPTY_FORM, shelterId: activeShelterId || '' });
  }

  return (
    <div className="victims-page">
      <div className="page-header">
        <div>
          <h1>Victims</h1>
          <p>Register and manage shelter occupants.</p>
        </div>
        <button className="btn-primary" onClick={openRegister}>
          Register Victim
        </button>
      </div>

      {stats && (
        <div className="victim-stats">
          <div className="stat-card">
            <span className="stat-value">{stats.total}</span>
            <span className="stat-label">Total</span>
          </div>
          <div className="stat-card">
            <span className="stat-value checked-in">{stats.checked_in}</span>
            <span className="stat-label">Checked In</span>
          </div>
          <div className="stat-card">
            <span className="stat-value medical">{stats.medical_attention}</span>
            <span className="stat-label">Medical Attention</span>
          </div>
          <div className="stat-card">
            <span className="stat-value transferred">{stats.transferred}</span>
            <span className="stat-label">Transferred</span>
          </div>
          <div className="stat-card">
            <span className="stat-value discharged">{stats.discharged}</span>
            <span className="stat-label">Discharged</span>
          </div>
          <div className="stat-card">
            <span className="stat-value mine">{stats.registered_by_me}</span>
            <span className="stat-label">Registered By Me</span>
          </div>
        </div>
      )}

      <div className="content-card">
        <div className="card-toolbar">
          <h2>Victim Register</h2>
        </div>
        <div className="filters">
          <input
            className="search-input"
            type="text"
            placeholder="Search by name or contact..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <div className="filter-group">
            <button className={`filter-chip${!statusFilter ? ' active' : ''}`} onClick={() => setStatusFilter('')}>All</button>
            {VICTIM_STATUSES.map((s) => (
              <button
                key={s}
                className={`filter-chip${statusFilter === s ? ' active' : ''}`}
                onClick={() => setStatusFilter(s)}
              >
                {STATUS_LABELS[s]}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="state-message">Loading victims...</div>
        ) : victims.length === 0 ? (
          <div className="state-message">No victims found.</div>
        ) : (
          <div className="victim-list">
            {victims.map((v) => (
              <div key={v.victim_id} className="victim-card">
                <div
                  className="victim-card-header"
                  onClick={() => setExpandedId(expandedId === v.victim_id ? null : v.victim_id)}
                >
                  <div className="victim-title-area">
                    <span className={`status-dot ${v.status?.toLowerCase().replace('_', '-')}`} />
                    <div>
                      <h3 className="victim-name">{v.name}</h3>
                      <span className="victim-meta">
                        {[v.age && `Age ${v.age}`, v.gender, v.shelter_name].filter(Boolean).join(' · ')}
                      </span>
                    </div>
                    <span className={`status-badge ${v.status?.toLowerCase().replace('_', '-')}`}>
                      {STATUS_LABELS[v.status] || v.status}
                    </span>
                  </div>
                  <svg
                    className="expand-chevron"
                    width="16" height="16" viewBox="0 0 24 24"
                    fill="none" stroke="currentColor" strokeWidth="2"
                    strokeLinecap="round" strokeLinejoin="round"
                    style={{ transform: expandedId === v.victim_id ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }}
                  >
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </div>

                {expandedId === v.victim_id && (
                  <div className="victim-card-body">
                    <div className="victim-detail-grid">
                      <div className="detail-item">
                        <span className="detail-label">Contact</span>
                        <span className="detail-value">{v.contact_number || '—'}</span>
                      </div>
                      <div className="detail-item">
                        <span className="detail-label">Event</span>
                        <span className="detail-value">{v.event_name || '—'}</span>
                      </div>
                      <div className="detail-item">
                        <span className="detail-label">Registered</span>
                        <span className="detail-value">{formatDate(v.registered_at)}</span>
                      </div>
                      <div className="detail-item">
                        <span className="detail-label">Registered By</span>
                        <span className="detail-value">{v.registered_by_name || '—'}</span>
                      </div>
                      {v.special_needs?.length > 0 && (
                        <div className="detail-item full-width">
                          <span className="detail-label">Special Needs</span>
                          <div className="needs-tags">
                            {v.special_needs.map((n) => <span key={n} className="need-tag">{needLabel(n)}</span>)}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="victim-card-actions">
                      {v.status !== 'DISCHARGED' && v.status !== 'TRANSFERRED' && (
                        <>
                          {v.status === 'CHECKED_IN' && (
                            <button
                              className="btn-sm btn-warning"
                              disabled={updatingId === v.victim_id}
                              onClick={() => handleStatusChange(v.victim_id, 'MEDICAL_ATTENTION')}
                            >
                              {updatingId === v.victim_id ? 'Updating...' : 'Mark Medical Attention'}
                            </button>
                          )}
                          {v.status === 'MEDICAL_ATTENTION' && (
                            <button
                              className="btn-sm btn-start"
                              disabled={updatingId === v.victim_id}
                              onClick={() => handleStatusChange(v.victim_id, 'CHECKED_IN')}
                            >
                              {updatingId === v.victim_id ? 'Updating...' : 'Back to Checked In'}
                            </button>
                          )}
                          <button
                            className="btn-sm btn-secondary"
                            disabled={updatingId === v.victim_id}
                            onClick={() => { setMoveModal(v); setMoveShelter(''); }}
                          >
                            Transfer Shelter
                          </button>
                          <button
                            className="btn-sm btn-complete"
                            disabled={updatingId === v.victim_id}
                            onClick={() => handleStatusChange(v.victim_id, 'DISCHARGED')}
                          >
                            {updatingId === v.victim_id ? 'Updating...' : 'Discharge'}
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Register Victim</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
            </div>
            <form onSubmit={handleRegister} className="modal-form">
              <div className="form-group">
                <label>Full Name *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="Full name"
                  required
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Age</label>
                  <input
                    type="number"
                    min="0"
                    max="120"
                    value={form.age}
                    onChange={(e) => setForm((f) => ({ ...f, age: e.target.value }))}
                    placeholder="Optional"
                  />
                </div>
                <div className="form-group">
                  <label>Gender</label>
                  <select value={form.gender} onChange={(e) => setForm((f) => ({ ...f, gender: e.target.value }))}>
                    <option value="">Not specified</option>
                    {GENDERS.map((g) => <option key={g} value={g}>{g.charAt(0) + g.slice(1).toLowerCase()}</option>)}
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label>Contact Number</label>
                <input
                  type="text"
                  value={form.contactNumber}
                  onChange={(e) => setForm((f) => ({ ...f, contactNumber: e.target.value }))}
                  placeholder="Optional"
                />
              </div>

              <div className="form-group">
                <label>Shelter *</label>
                <select value={form.shelterId} onChange={(e) => setForm((f) => ({ ...f, shelterId: e.target.value }))} required>
                  <option value="">Select shelter</option>
                  {shelters.map((s) => (
                    <option key={s.shelter_id} value={s.shelter_id}>{s.name}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Disaster Event *</label>
                <select value={form.eventId} onChange={(e) => setForm((f) => ({ ...f, eventId: e.target.value }))} required>
                  <option value="">Select event</option>
                  {events.map((e) => (
                    <option key={e.event_id} value={e.event_id}>{e.name}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Admission Status</label>
                <select value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}>
                  {VICTIM_STATUSES.slice(0, 2).map((s) => (
                    <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Special Needs</label>
                <div className="needs-grid">
                  {presetNeeds.map((n) => (
                    <label key={n} className={`need-option${form.specialNeeds.includes(n) ? ' selected' : ''}`}>
                      <input
                        type="checkbox"
                        checked={form.specialNeeds.includes(n)}
                        onChange={() => toggleNeed(n)}
                      />
                      <span>{needLabel(n)}</span>
                    </label>
                  ))}

                  <label className={`need-option need-option-other${form.customNeedsOn ? ' selected' : ''}`}>
                    <input
                      type="checkbox"
                      checked={form.customNeedsOn}
                      onChange={toggleCustomNeeds}
                    />
                    <span>Other / Custom Special Need</span>
                  </label>
                </div>

                {form.customNeedsOn && (
                  <div className="custom-needs">
                    {form.customNeeds.map((value, index) => (
                      <div key={index} className="custom-need-row">
                        <input
                          type="text"
                          value={value}
                          maxLength={needLimits.maxNeedLength}
                          placeholder="Describe the need, e.g. Requires insulin refrigeration"
                          onChange={(e) => updateCustomNeed(index, e.target.value)}
                        />
                        {form.customNeeds.length > 1 && (
                          <button
                            type="button"
                            className="btn-remove"
                            aria-label="Remove custom need"
                            onClick={() => removeCustomNeed(index)}
                          >
                            ×
                          </button>
                        )}
                      </div>
                    ))}

                    {form.customNeeds.length < needLimits.maxCustomNeeds && (
                      <button type="button" className="btn-add-item" onClick={addCustomNeed}>
                        + Add another custom need
                      </button>
                    )}
                    <span className="field-hint">
                      Up to {needLimits.maxCustomNeeds} custom needs, {needLimits.maxNeedLength} characters each.
                    </span>
                  </div>
                )}
              </div>

              {formError && <div className="form-error">{formError}</div>}

              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn-primary" disabled={submitting}>
                  {submitting ? 'Registering...' : 'Register Victim'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {moveModal && (
        <div className="modal-overlay" onClick={() => setMoveModal(null)}>
          <div className="modal modal-sm" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Transfer {moveModal.name}</h2>
              <button className="modal-close" onClick={() => setMoveModal(null)}>×</button>
            </div>
            <div className="modal-form">
              <div className="form-group">
                <label>Move to Shelter</label>
                <select value={moveShelter} onChange={(e) => setMoveShelter(e.target.value)}>
                  <option value="">Select shelter</option>
                  {shelters
                    .filter((s) => s.shelter_id !== moveModal.shelter_id)
                    .map((s) => (
                      <option key={s.shelter_id} value={s.shelter_id}>{s.name}</option>
                    ))}
                </select>
              </div>
              <div className="modal-footer">
                <button className="btn-secondary" onClick={() => setMoveModal(null)}>Cancel</button>
                <button
                  className="btn-primary"
                  disabled={!moveShelter || updatingId === moveModal.victim_id}
                  onClick={() => handleMove(moveModal.victim_id)}
                >
                  {updatingId === moveModal.victim_id ? 'Moving...' : 'Transfer'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
