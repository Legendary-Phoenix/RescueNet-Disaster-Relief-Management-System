import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useVolunteer, volunteerQuery } from '../components/volunteerContext';
import './MyTasks.css';

// The KPI cards are the only filter control on this page. Each one filters the list
// below it using the same parameter the server counts by, so a card can never claim
// rows the list won't show.
//
// There is no Overdue card: Task has no due_date in the official schema, so there is
// no deadline for a task to be past.
const KPI_CARDS = [
  { key: 'pending', label: 'Pending Tasks', tone: 'pending', param: { status: 'PENDING' } },
  { key: 'in_progress', label: 'In Progress', tone: 'in-progress', param: { status: 'IN_PROGRESS' } },
  {
    key: 'completed_today',
    label: 'Completed Today',
    tone: 'completed',
    param: { view: 'completed_today' },
    note: 'Task has no completion timestamp, so this counts tasks raised today that are now complete.',
  },
];

function formatDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function statusLabel(status) {
  if (status === 'IN_PROGRESS') return 'In Progress';
  return status.charAt(0) + status.slice(1).toLowerCase();
}

export default function MyTasks() {
  const { volunteerId, activeShelterId, ready } = useVolunteer();
  const [searchParams, setSearchParams] = useSearchParams();

  const [tasks, setTasks] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  // The selected card lives in the URL, not in state, so back/forward and a shared
  // link all land on the same filter with nothing to keep in sync.
  const requestedView = searchParams.get('view');
  const activeCard = KPI_CARDS.some((c) => c.key === requestedView) ? requestedView : null;

  const selectCard = useCallback((key) => {
    setSearchParams(key ? { view: key } : {}, { replace: true });
  }, [setSearchParams]);
  const [expandedTask, setExpandedTask] = useState(null);
  const [updating, setUpdating] = useState(null);

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    try {
      const card = KPI_CARDS.find((c) => c.key === activeCard);
      const [tasksRes, statsRes] = await Promise.all([
        fetch(`/api/volunteer/tasks?${volunteerQuery(volunteerId, activeShelterId, card?.param)}`),
        fetch(`/api/volunteer/tasks/stats?${volunteerQuery(volunteerId, activeShelterId)}`),
      ]);
      setTasks(await tasksRes.json());
      setStats(await statsRes.json());
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [volunteerId, activeShelterId, activeCard]);

  useEffect(() => {
    if (ready && volunteerId) fetchTasks();
  }, [ready, volunteerId, fetchTasks]);

  async function handleStatusUpdate(taskId, newStatus) {
    setUpdating(taskId);
    try {
      await fetch(`/api/volunteer/tasks/${taskId}/status?volunteerId=${volunteerId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      await fetchTasks();
    } catch { /* ignore */ }
    finally { setUpdating(null); }
  }

  function quickAction(task) {
    if (task.status === 'PENDING') {
      return { label: 'Start task', status: 'IN_PROGRESS', cls: 'btn-start' };
    }
    if (task.status === 'IN_PROGRESS') {
      return { label: 'Mark complete', status: 'COMPLETED', cls: 'btn-complete' };
    }
    return null;
  }

  const activeCardConfig = KPI_CARDS.find((c) => c.key === activeCard);

  return (
    <div className="tasks-page">
      <div className="page-header">
        <div>
          <h1>My Tasks</h1>
          <p>View and update the status of your assigned tasks.</p>
        </div>
      </div>

      <div className="task-kpis">
        {KPI_CARDS.map((card) => (
          <button
            key={card.key}
            type="button"
            className={`kpi-card ${card.tone}${activeCard === card.key ? ' selected' : ''}`}
            aria-pressed={activeCard === card.key}
            title={card.note || `Show only ${card.label.toLowerCase()}`}
            onClick={() => selectCard(activeCard === card.key ? null : card.key)}
          >
            <span className="kpi-value">{stats?.[card.key] ?? 0}</span>
            <span className="kpi-label">{card.label}</span>
          </button>
        ))}
      </div>

      <div className="content-card">
        <div className="card-toolbar">
          <h2>{activeCardConfig ? activeCardConfig.label : 'All tasks'}</h2>
          {activeCard && (
            <button className="btn-reset" onClick={() => selectCard(null)}>
              All tasks
            </button>
          )}
        </div>

        {activeCardConfig?.note && <p className="filter-note">{activeCardConfig.note}</p>}

        {loading ? (
          <div className="state-message">Loading tasks...</div>
        ) : tasks.length === 0 ? (
          <div className="state-message">
            {activeCardConfig ? `No ${activeCardConfig.label.toLowerCase()} right now.` : 'No tasks found.'}
          </div>
        ) : (
          <div className="task-list">
            {tasks.map(task => {
              const action = quickAction(task);
              const expanded = expandedTask === task.task_id;

              return (
                <div key={task.task_id} className="task-card">
                  <div
                    className="task-card-header"
                    onClick={() => setExpandedTask(expanded ? null : task.task_id)}
                  >
                    <div className="task-title-area">
                      <span className={`status-dot ${task.status.toLowerCase().replace('_', '-')}`} />
                      <h3 className="task-title">{task.title}</h3>
                      <span className={`status-badge ${task.status.toLowerCase().replace('_', '-')}`}>
                        {statusLabel(task.status)}
                      </span>
                    </div>

                    <div className="task-meta">
                      <span className="meta-item">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                          <circle cx="12" cy="10" r="3" />
                        </svg>
                        {task.shelter_name || 'Unassigned'}
                      </span>
                      <span className="meta-item">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                          <line x1="16" y1="2" x2="16" y2="6" />
                          <line x1="8" y1="2" x2="8" y2="6" />
                          <line x1="3" y1="10" x2="21" y2="10" />
                        </svg>
                        Raised {formatDate(task.created_at)}
                      </span>

                      {action ? (
                        <button
                          className={`btn-sm ${action.cls}`}
                          disabled={updating === task.task_id}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleStatusUpdate(task.task_id, action.status);
                          }}
                        >
                          {updating === task.task_id ? 'Updating...' : action.label}
                        </button>
                      ) : (
                        <span className="task-done">✓ Completed</span>
                      )}

                      <svg
                        className="expand-chevron"
                        width="16" height="16" viewBox="0 0 24 24"
                        fill="none" stroke="currentColor" strokeWidth="2"
                        strokeLinecap="round" strokeLinejoin="round"
                        style={{
                          transform: expanded ? 'rotate(180deg)' : 'none',
                          transition: 'transform 0.15s',
                        }}
                      >
                        <polyline points="6 9 12 15 18 9" />
                      </svg>
                    </div>
                  </div>

                  {expanded && (
                    <div className="task-card-body">
                      <div className="task-detail-grid">
                        <div className="detail-item">
                          <span className="detail-label">Event</span>
                          <span className="detail-value">{task.event_name || '—'}</span>
                        </div>
                        <div className="detail-item">
                          <span className="detail-label">Issued By</span>
                          <span className="detail-value">{task.issued_by || '—'}</span>
                        </div>
                        <div className="detail-item">
                          <span className="detail-label">Raised</span>
                          <span className="detail-value">{formatDate(task.created_at)}</span>
                        </div>
                        <div className="detail-item full-width">
                          <span className="detail-label">Description</span>
                          <span className="detail-value">{task.description || '—'}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
