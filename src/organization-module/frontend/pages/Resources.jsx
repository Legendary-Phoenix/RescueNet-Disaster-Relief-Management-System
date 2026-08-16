import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import './Resources.css';

const RESOURCE_TYPES = ['All types', 'WATER', 'FOOD', 'MEDICINE', 'HYGIENE'];
const TYPE_LABELS = { WATER: 'Water & Drinks', FOOD: 'Food', MEDICINE: 'Medicine', HYGIENE: 'Hygiene' };
const REQUEST_STATUSES = ['All', 'Pending', 'Approved', 'Fulfilled', 'Rejected', 'Revoked'];
const NEED_LEVELS = ['All levels', 'LOW', 'MODERATE', 'HIGH', 'CRITICAL'];
const NEED_COLORS = { LOW: '#16a34a', MODERATE: '#d97706', HIGH: '#ea580c', CRITICAL: '#dc2626' };

function formatDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function Resources() {
  const [searchParams] = useSearchParams();
  const [tab, setTab] = useState(searchParams.get('tab') === 'requests' ? 'requests' : 'inventory');

  const [shelters, setShelters] = useState([]);
  const [resources, setResources] = useState([]);
  const [events, setEvents] = useState([]);
  const [volunteers, setVolunteers] = useState([]);

  useEffect(() => {
    fetch('/api/organization/shelters').then(r => r.json()).then(setShelters).catch(() => {});
    fetch('/api/organization/resources').then(r => r.json()).then(setResources).catch(() => {});
    fetch('/api/organization/disaster-events').then(r => r.json()).then(setEvents).catch(() => {});
    fetch('/api/organization/volunteers').then(r => r.json()).then(setVolunteers).catch(() => {});
  }, []);

  return (
    <div className="resources-page">
      <div className="page-header">
        <div>
          <h1>Resource Management</h1>
          <p>Manage shelter inventory and resource requests.</p>
        </div>
      </div>

      <div className="tab-bar">
        <button className={`tab-btn${tab === 'inventory' ? ' active' : ''}`} onClick={() => setTab('inventory')}>Inventory</button>
        <button className={`tab-btn${tab === 'requests' ? ' active' : ''}`} onClick={() => setTab('requests')}>Resource Requests</button>
      </div>

      {tab === 'inventory'
        ? <InventoryTab shelters={shelters} resources={resources} prefilterShelter={searchParams.get('shelter') || ''} />
        : <RequestsTab shelters={shelters} events={events} volunteers={volunteers} prefilterShelter={searchParams.get('shelter') || ''} />
      }
    </div>
  );
}

function InventoryTab({ shelters, resources, prefilterShelter }) {
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [shelterFilter, setShelterFilter] = useState(prefilterShelter);
  const [typeFilter, setTypeFilter] = useState('All types');
  const [needLevelFilter, setNeedLevelFilter] = useState('All levels');
  const [modal, setModal] = useState(null);
  const [formData, setFormData] = useState({});
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetchInventory(); }, [shelterFilter, typeFilter, needLevelFilter]);

  async function fetchInventory() {
    setLoading(true);
    const params = new URLSearchParams();
    if (shelterFilter) params.set('shelter', shelterFilter);
    if (typeFilter !== 'All types') params.set('type', typeFilter);
    if (needLevelFilter !== 'All levels') params.set('needLevel', needLevelFilter);
    const res = await fetch(`/api/organization/inventory?${params}`);
    setInventory(await res.json());
    setLoading(false);
  }

  function openAddModal() {
    setFormData({ shelterId: shelterFilter || '', resourceId: '', quantity: '' });
    setFormError('');
    setModal('add');
  }

  function openMoveModal() {
    setFormData({ fromShelterId: '', toShelterId: '', resourceId: '', quantity: '' });
    setFormError('');
    setModal('move');
  }

  async function handleAddStock() {
    setSaving(true);
    setFormError('');
    try {
      const res = await fetch('/api/organization/inventory/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, quantity: parseInt(formData.quantity) }),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Failed to add stock');
      setModal(null);
      fetchInventory();
    } catch (err) { setFormError(err.message); }
    finally { setSaving(false); }
  }

  async function handleMoveStock() {
    setSaving(true);
    setFormError('');
    try {
      const res = await fetch('/api/organization/inventory/move', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, quantity: parseInt(formData.quantity) }),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Failed to move stock');
      setModal(null);
      fetchInventory();
    } catch (err) { setFormError(err.message); }
    finally { setSaving(false); }
  }

  return (
    <>
      <div className="content-card">
        <div className="card-toolbar">
          <h2>Inventory by shelter</h2>
          <div className="toolbar-actions">
            <button className="btn-secondary" onClick={openMoveModal}>Move Stock</button>
            <button className="btn-primary" onClick={openAddModal}>+ Add Stock</button>
          </div>
        </div>

        <div className="filters">
          <select className="shelter-filter" value={shelterFilter} onChange={e => setShelterFilter(e.target.value)}>
            <option value="">All shelters</option>
            {shelters.map(s => <option key={s.shelter_id} value={s.shelter_id}>{s.name}</option>)}
          </select>
          <div className="filter-group">
            {RESOURCE_TYPES.map(t => (
              <button key={t} className={`filter-chip${typeFilter === t ? ' active' : ''}`} onClick={() => setTypeFilter(t)}>
                {t === 'All types' ? t : TYPE_LABELS[t]}
              </button>
            ))}
          </div>
          <select className="shelter-filter" value={needLevelFilter} onChange={e => setNeedLevelFilter(e.target.value)}>
            {NEED_LEVELS.map(l => <option key={l} value={l}>{l === 'All levels' ? l : l.charAt(0) + l.slice(1).toLowerCase()}</option>)}
          </select>
        </div>

        {loading ? (
          <div className="state-message">Loading inventory...</div>
        ) : inventory.length === 0 ? (
          <div className="state-message">No inventory records found.</div>
        ) : (
          <div className="inventory-groups">
            {inventory.map(group => (
              <div key={group.shelter_id} className="inventory-group">
                <h3 className="group-header">{group.shelter_name}</h3>
                <table className="inv-table">
                  <thead>
                    <tr>
                      <th>RESOURCE</th>
                      <th>TYPE</th>
                      <th>AVAILABLE</th>
                      <th>REQUESTED</th>
                      <th>UNIT</th>
                      <th>NEED LEVEL</th>
                    </tr>
                  </thead>
                  <tbody>
                    {group.items.map(item => (
                      <tr key={item.inventory_id}>
                        <td className="resource-cell">{item.name}</td>
                        <td><span className="type-tag">{TYPE_LABELS[item.type]}</span></td>
                        <td><span className="qty-ok">{item.quantity.toLocaleString()}</span></td>
                        <td>{item.requested.toLocaleString()}</td>
                        <td className="unit-cell">{item.unit}</td>
                        <td>
                          <span className="need-badge" style={{ background: `${NEED_COLORS[item.need_level]}14`, color: NEED_COLORS[item.need_level] }}>
                            {item.need_level}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Stock Modal */}
      {modal === 'add' && (
        <>
          <div className="modal-backdrop" onClick={() => setModal(null)} />
          <div className="modal">
            <h2>Add Stock</h2>
            <div className="modal-form">
              <label>
                Shelter
                <select value={formData.shelterId} onChange={e => setFormData({ ...formData, shelterId: e.target.value })}>
                  <option value="">Select shelter</option>
                  {shelters.map(s => <option key={s.shelter_id} value={s.shelter_id}>{s.name}</option>)}
                </select>
              </label>
              <label>
                Resource
                <select value={formData.resourceId} onChange={e => setFormData({ ...formData, resourceId: e.target.value })}>
                  <option value="">Select resource</option>
                  {resources.map(r => <option key={r.resource_id} value={r.resource_id}>{r.name} ({r.unit})</option>)}
                </select>
              </label>
              <label>
                Quantity
                <input type="number" min="1" value={formData.quantity} onChange={e => setFormData({ ...formData, quantity: e.target.value })} />
              </label>
              {formError && <p className="form-error">{formError}</p>}
            </div>
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setModal(null)}>Cancel</button>
              <button className="btn-primary" onClick={handleAddStock} disabled={saving || !formData.shelterId || !formData.resourceId || !formData.quantity}>
                {saving ? 'Adding...' : 'Add Stock'}
              </button>
            </div>
          </div>
        </>
      )}

      {/* Move Stock Modal */}
      {modal === 'move' && (
        <>
          <div className="modal-backdrop" onClick={() => setModal(null)} />
          <div className="modal">
            <h2>Move Stock</h2>
            <div className="modal-form">
              <label>
                From Shelter
                <select value={formData.fromShelterId} onChange={e => setFormData({ ...formData, fromShelterId: e.target.value, resourceId: '', quantity: '' })}>
                  <option value="">Select source</option>
                  {shelters.map(s => <option key={s.shelter_id} value={s.shelter_id}>{s.name}</option>)}
                </select>
              </label>
              <label>
                Resource
                <select value={formData.resourceId} onChange={e => setFormData({ ...formData, resourceId: e.target.value })}>
                  <option value="">Select resource</option>
                  {resources.map(r => <option key={r.resource_id} value={r.resource_id}>{r.name} ({r.unit})</option>)}
                </select>
              </label>
              <label>
                Quantity
                <input type="number" min="1" value={formData.quantity} onChange={e => setFormData({ ...formData, quantity: e.target.value })} />
              </label>
              <label>
                To Shelter
                <select value={formData.toShelterId} onChange={e => setFormData({ ...formData, toShelterId: e.target.value })}>
                  <option value="">Select destination</option>
                  {shelters.filter(s => s.shelter_id !== formData.fromShelterId).map(s => (
                    <option key={s.shelter_id} value={s.shelter_id}>{s.name}</option>
                  ))}
                </select>
              </label>
              {formError && <p className="form-error">{formError}</p>}
            </div>
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setModal(null)}>Cancel</button>
              <button className="btn-primary" onClick={handleMoveStock} disabled={saving || !formData.fromShelterId || !formData.toShelterId || !formData.resourceId || !formData.quantity}>
                {saving ? 'Moving...' : 'Move Stock'}
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
}

function RequestsTab({ shelters, events, volunteers, prefilterShelter }) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('All');
  const [shelterFilter, setShelterFilter] = useState(prefilterShelter);
  const [eventFilter, setEventFilter] = useState('');
  const [volunteerFilter, setVolunteerFilter] = useState('');
  const [expandedRow, setExpandedRow] = useState(null);

  useEffect(() => { fetchRequests(); }, [statusFilter, shelterFilter, eventFilter, volunteerFilter]);

  async function fetchRequests() {
    setLoading(true);
    const params = new URLSearchParams();
    if (statusFilter !== 'All') params.set('status', statusFilter.toUpperCase());
    if (shelterFilter) params.set('shelter', shelterFilter);
    if (eventFilter) params.set('event', eventFilter);
    if (volunteerFilter) params.set('volunteer', volunteerFilter);
    const res = await fetch(`/api/organization/resource-requests?${params}`);
    setRequests(await res.json());
    setLoading(false);
  }

  async function handleStatusUpdate(requestId, newStatus) {
    await fetch(`/api/organization/resource-requests/${requestId}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    });
    fetchRequests();
  }

  function getActions(req) {
    switch (req.status) {
      case 'PENDING': return [
        { label: 'Approve', status: 'APPROVED', cls: 'btn-approve' },
        { label: 'Reject', status: 'REJECTED', cls: 'btn-reject' },
      ];
      case 'APPROVED': return [
        { label: 'Mark Fulfilled', status: 'FULFILLED', cls: 'btn-approve' },
        { label: 'Revoke', status: 'REVOKED', cls: 'btn-reject' },
      ];
      default: return [];
    }
  }

  return (
    <div className="content-card">
      <div className="card-toolbar">
        <h2>Resource Requests</h2>
      </div>

      <div className="filters">
        <div className="filter-group">
          {REQUEST_STATUSES.map(s => (
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
        <div className="state-message">Loading requests...</div>
      ) : requests.length === 0 ? (
        <div className="state-message">No resource requests found.</div>
      ) : (
        <table className="req-table">
          <thead>
            <tr>
              <th>DATE</th>
              <th>SHELTER</th>
              <th>EVENT</th>
              <th>REQUESTED BY</th>
              <th>ITEMS</th>
              <th>STATUS</th>
              <th>ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {requests.map(req => (
              <tr key={req.request_id}>
                <td>{formatDate(req.created_at)}</td>
                <td>{req.shelter_name}</td>
                <td>{req.event_name}</td>
                <td>{req.volunteer_name}</td>
                <td>
                  <button className="items-toggle" onClick={() => setExpandedRow(expandedRow === req.request_id ? null : req.request_id)}>
                    {req.items.length} item{req.items.length !== 1 ? 's' : ''}
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ transform: expandedRow === req.request_id ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }}>
                      <polyline points="6 9 12 15 18 9"/>
                    </svg>
                  </button>
                  {expandedRow === req.request_id && (
                    <div className="items-detail">
                      {req.items.map((item, i) => (
                        <div key={i} className="item-row">
                          <span className="item-name">{item.name}</span>
                          <span className="item-qty">{item.quantity} {item.unit}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </td>
                <td>
                  <span className={`status-badge ${req.status.toLowerCase()}`}>
                    {req.status.charAt(0) + req.status.slice(1).toLowerCase()}
                  </span>
                </td>
                <td>
                  <div className="action-btns">
                    {getActions(req).map(a => (
                      <button key={a.status} className={`btn-sm ${a.cls}`} onClick={() => handleStatusUpdate(req.request_id, a.status)}>
                        {a.label}
                      </button>
                    ))}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
