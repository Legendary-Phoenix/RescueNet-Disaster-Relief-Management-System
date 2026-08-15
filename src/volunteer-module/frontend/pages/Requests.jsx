import { useState, useEffect, useCallback } from 'react';
import { useVolunteer, volunteerQuery } from '../components/volunteerContext';
import './Requests.css';

const REQUEST_STATUSES = ['PENDING', 'APPROVED', 'FULFILLED', 'REJECTED', 'REVOKED'];
const STATUS_LABELS = {
  PENDING: 'Pending',
  APPROVED: 'Approved',
  FULFILLED: 'Fulfilled',
  REJECTED: 'Rejected',
  REVOKED: 'Revoked',
};

// Sentinel for the "Other / Custom..." choice in the item dropdown — an item that is
// not in the catalogue yet. It still has to be filed under one of the four
// resource_type_enum categories; the schema has no free-text category to invent one.
const CUSTOM = '__custom__';

const CATEGORY_LABELS = {
  WATER: 'Water',
  FOOD: 'Food',
  MEDICINE: 'Medicine',
  HYGIENE: 'Hygiene',
};

const EMPTY_ITEM = {
  category: '',
  resourceId: '',
  quantity: '1',
  customName: '',
  customUnit: '',
};

function categoryLabel(value) {
  return CATEGORY_LABELS[value] || value;
}

/** A line needs typed item details when the item dropdown is on "Other / Custom...". */
function needsCustomItem(line) {
  return line.resourceId === CUSTOM;
}

/** Catalogue items available under the category picked on this line. */
function itemsForCategory(line, resources) {
  if (!line.category) return [];
  return resources.filter((r) => r.type === line.category);
}

function formatDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function Requests() {
  const { volunteerId, shelters, activeShelterId, ready } = useVolunteer();

  const [requests, setRequests] = useState([]);
  const [stats, setStats] = useState(null);
  const [options, setOptions] = useState(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [expandedId, setExpandedId] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [withdrawingId, setWithdrawingId] = useState(null);
  const [form, setForm] = useState({ shelterId: '', eventId: '', items: [] });

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    try {
      const query = volunteerQuery(volunteerId, activeShelterId, { status: statusFilter });
      const [rRes, sRes] = await Promise.all([
        fetch(`/api/volunteer/requests?${query}`),
        fetch(`/api/volunteer/requests/stats?${volunteerQuery(volunteerId, activeShelterId)}`),
      ]);
      setRequests(await rRes.json());
      setStats(await sRes.json());
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [volunteerId, activeShelterId, statusFilter]);

  // Submitting a custom line can create a Resource row, which then has to appear in
  // the category and item dropdowns — so this reloads after every successful submit,
  // not just on mount.
  const loadOptions = useCallback(async () => {
    try {
      const res = await fetch(`/api/volunteer/requests/options?volunteerId=${volunteerId}`);
      setOptions(await res.json());
    } catch { /* ignore */ }
  }, [volunteerId]);

  useEffect(() => {
    if (ready && volunteerId) {
      loadOptions();
      fetchRequests();
    }
  }, [ready, volunteerId, loadOptions, fetchRequests]);

  function openCreate() {
    setEditTarget(null);
    setForm({ shelterId: activeShelterId || '', eventId: '', items: [{ ...EMPTY_ITEM }] });
    setFormError('');
    setShowModal(true);
  }

  function openEdit(req) {
    setEditTarget(req);
    setForm({
      shelterId: req.shelter_id,
      eventId: req.event_id,
      items: (req.items || []).map((i) => ({
        ...EMPTY_ITEM,
        category: i.type,
        resourceId: i.resource_id,
        quantity: String(i.quantity),
      })),
    });
    setFormError('');
    setShowModal(true);
  }

  function addItem() {
    setForm((f) => ({ ...f, items: [...f.items, { ...EMPTY_ITEM }] }));
  }

  function removeItem(idx) {
    setForm((f) => ({ ...f, items: f.items.filter((_, i) => i !== idx) }));
  }

  function updateItem(idx, key, value) {
    setForm((f) => ({
      ...f,
      items: f.items.map((item, i) => {
        if (i !== idx) return item;
        const next = { ...item, [key]: value };
        // Changing category invalidates the item picked under the old one.
        if (key === 'category') {
          next.resourceId = '';
          next.customName = '';
          next.customUnit = '';
        }
        if (key === 'resourceId' && value !== CUSTOM) {
          next.customName = '';
          next.customUnit = '';
        }
        return next;
      }),
    }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.shelterId) { setFormError('Select a shelter'); return; }
    if (!form.eventId) { setFormError('Select a disaster event'); return; }
    if (form.items.length === 0) { setFormError('Add at least one resource item'); return; }

    for (const [index, item] of form.items.entries()) {
      const line = index + 1;
      const qty = parseInt(item.quantity, 10);
      if (!item.category) { setFormError(`Line ${line}: choose a category`); return; }
      if (needsCustomItem(item)) {
        if (!item.customName.trim()) { setFormError(`Line ${line}: name the custom item`); return; }
        if (!item.customUnit.trim()) { setFormError(`Line ${line}: give the custom item a unit`); return; }
      } else if (!item.resourceId) {
        setFormError(`Line ${line}: choose an item`); return;
      }
      if (!qty || qty < 1) { setFormError(`Line ${line}: quantity must be at least 1`); return; }
    }

    setSubmitting(true);
    setFormError('');
    try {
      const payload = {
        shelterId: form.shelterId,
        eventId: form.eventId,
        items: form.items.map((item) => {
          const quantity = parseInt(item.quantity, 10);
          if (!needsCustomItem(item)) return { resourceId: item.resourceId, quantity };
          return {
            quantity,
            custom: {
              category: item.category,
              name: item.customName.trim(),
              unit: item.customUnit.trim(),
            },
          };
        }),
      };

      let res;
      if (editTarget) {
        res = await fetch(`/api/volunteer/requests/${editTarget.request_id}?volunteerId=${volunteerId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ items: payload.items }),
        });
      } else {
        res = await fetch(`/api/volunteer/requests?volunteerId=${volunteerId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }

      const data = await res.json();
      if (!res.ok) { setFormError(data.error || 'Failed to submit request'); return; }
      setShowModal(false);
      await Promise.all([fetchRequests(), loadOptions()]);
    } catch {
      setFormError('An error occurred. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  const standardCategories = options?.categories || [];

  async function handleWithdraw(requestId) {
    if (!window.confirm('Withdraw this request? This cannot be undone.')) return;
    setWithdrawingId(requestId);
    try {
      await fetch(`/api/volunteer/requests/${requestId}?volunteerId=${volunteerId}`, { method: 'DELETE' });
      fetchRequests();
    } catch { /* ignore */ }
    finally { setWithdrawingId(null); }
  }


  return (
    <div className="requests-page">
      <div className="page-header">
        <div>
          <h1>Resource Requests</h1>
          <p>Submit and track resource requests for your shelter.</p>
        </div>
        <button className="btn-primary" onClick={openCreate}>New Request</button>
      </div>

      {stats && (
        <div className="req-stats">
          <div className="stat-card">
            <span className="stat-value">{stats.total}</span>
            <span className="stat-label">Total</span>
          </div>
          <div className="stat-card">
            <span className="stat-value pending">{stats.pending}</span>
            <span className="stat-label">Pending</span>
          </div>
          <div className="stat-card">
            <span className="stat-value approved">{stats.approved}</span>
            <span className="stat-label">Approved</span>
          </div>
          <div className="stat-card">
            <span className="stat-value fulfilled">{stats.fulfilled}</span>
            <span className="stat-label">Fulfilled</span>
          </div>
          <div className="stat-card">
            <span className="stat-value mine">{stats.mine}</span>
            <span className="stat-label">Raised By Me</span>
          </div>
        </div>
      )}

      <div className="content-card">
        <div className="card-toolbar"><h2>Requests</h2></div>
        <div className="filters">
          <div className="filter-group">
            <button className={`filter-chip${!statusFilter ? ' active' : ''}`} onClick={() => setStatusFilter('')}>All</button>
            {REQUEST_STATUSES.map((s) => (
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
          <div className="state-message">Loading requests...</div>
        ) : requests.length === 0 ? (
          <div className="state-message">No requests found.</div>
        ) : (
          <div className="request-list">
            {requests.map((req) => (
              <div key={req.request_id} className="request-card">
                <div
                  className="request-card-header"
                  onClick={() => setExpandedId(expandedId === req.request_id ? null : req.request_id)}
                >
                  <div className="request-title-area">
                    <div>
                      <h3 className="request-shelter">{req.shelter_name}</h3>
                      <div className="request-meta">
                        {req.event_name} · {formatDate(req.created_at)}
                      </div>
                    </div>
                    <span className={`status-badge ${req.status?.toLowerCase()}`}>
                      {STATUS_LABELS[req.status] || req.status}
                    </span>
                  </div>
                  <svg
                    className="expand-chevron"
                    width="16" height="16" viewBox="0 0 24 24"
                    fill="none" stroke="currentColor" strokeWidth="2"
                    strokeLinecap="round" strokeLinejoin="round"
                    style={{ transform: expandedId === req.request_id ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }}
                  >
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </div>

                {expandedId === req.request_id && (
                  <div className="request-card-body">
                    <div className="items-label">Items Requested</div>
                    <div className="items-list">
                      {(req.items || []).map((item, i) => (
                        <div key={i} className="item-row">
                          <span className={`type-chip ${item.type?.toLowerCase()}`}>
                            {CATEGORY_LABELS[item.type] || item.type}
                          </span>
                          <span className="item-name">{item.name}</span>
                          <span className="item-qty">{item.quantity} {item.unit}</span>
                        </div>
                      ))}
                    </div>
                    <div className="request-footer-meta">
                      Requested by {req.requested_by} · {req.area_name}
                    </div>
                    {req.editable && (
                      <div className="request-actions">
                        <button className="btn-sm btn-secondary" onClick={() => openEdit(req)}>Edit</button>
                        <button
                          className="btn-sm btn-danger"
                          disabled={withdrawingId === req.request_id}
                          onClick={() => handleWithdraw(req.request_id)}
                        >
                          {withdrawingId === req.request_id ? 'Withdrawing...' : 'Withdraw'}
                        </button>
                      </div>
                    )}
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
              <h2>{editTarget ? 'Edit Request' : 'New Resource Request'}</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
            </div>
            <form onSubmit={handleSubmit} className="modal-form">
              {!editTarget && (
                <>
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
                      {(options?.events || []).map((e) => (
                        <option key={e.event_id} value={e.event_id}>{e.name} ({e.severity})</option>
                      ))}
                    </select>
                  </div>
                </>
              )}

              {editTarget && (
                <div className="edit-context">
                  <span className="detail-label">Shelter</span> {editTarget.shelter_name}
                  &nbsp;·&nbsp;
                  <span className="detail-label">Event</span> {editTarget.event_name}
                </div>
              )}

              <div className="form-group">
                <label>Items *</label>

                <div className="item-head">
                  <span>Category</span>
                  <span>Item</span>
                  <span>Qty</span>
                  <span />
                </div>

                {form.items.map((item, idx) => {
                  const catalogue = itemsForCategory(item, options?.resources || []);

                  return (
                    <div key={idx} className="item-line">
                      <div className="item-row-form">
                        <select
                          value={item.category}
                          onChange={(e) => updateItem(idx, 'category', e.target.value)}
                          aria-label={`Line ${idx + 1} category`}
                        >
                          <option value="">Select category</option>
                          {standardCategories.map((c) => (
                            <option key={c} value={c}>{categoryLabel(c)}</option>
                          ))}
                        </select>

                        <select
                          value={item.resourceId}
                          onChange={(e) => updateItem(idx, 'resourceId', e.target.value)}
                          disabled={!item.category}
                          aria-label={`Line ${idx + 1} item`}
                        >
                          <option value="">
                            {item.category ? 'Select item' : 'Pick a category first'}
                          </option>
                          {catalogue.map((r) => (
                            <option key={r.resource_id} value={r.resource_id}>
                              {r.name} ({r.unit})
                            </option>
                          ))}
                          <option value={CUSTOM}>Other / Custom...</option>
                        </select>

                        <input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => updateItem(idx, 'quantity', e.target.value)}
                          className="qty-input"
                          aria-label={`Line ${idx + 1} quantity`}
                          required
                        />
                        <button
                          type="button"
                          className="btn-remove"
                          aria-label={`Remove line ${idx + 1}`}
                          onClick={() => removeItem(idx)}
                        >
                          ×
                        </button>
                      </div>

                      {needsCustomItem(item) && (
                        <div className="custom-fields">
                          <input
                            type="text"
                            maxLength={60}
                            value={item.customName}
                            placeholder="Item name, e.g. Portable Generator"
                            onChange={(e) => updateItem(idx, 'customName', e.target.value)}
                          />
                          <input
                            type="text"
                            maxLength={60}
                            value={item.customUnit}
                            placeholder="Unit, e.g. unit"
                            onChange={(e) => updateItem(idx, 'customUnit', e.target.value)}
                          />
                        </div>
                      )}
                    </div>
                  );
                })}

                <button type="button" className="btn-add-item" onClick={addItem}>+ Add Item</button>
              </div>

              {formError && <div className="form-error">{formError}</div>}

              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn-primary" disabled={submitting}>
                  {submitting ? 'Submitting...' : editTarget ? 'Save Changes' : 'Submit Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
