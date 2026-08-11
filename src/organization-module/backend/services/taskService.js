import pool from '../../../db.js';
import Task from '../../../models/Task.js';

async function getOrgId() {
  const { rows } = await pool.query(
    `SELECT org_id FROM ReliefOrganization WHERE status = 'APPROVED' LIMIT 1`
  );
  return rows[0]?.org_id;
}

export async function findAll({ status, shelter, event, volunteer, search } = {}) {
  const orgId = await getOrgId();
  const params = [orgId];
  let query = `
    SELECT t.task_id, t.title, t.description, t.status,
      t.assigned_to, t.created_by, t.shelter_id, t.event_id, t.created_at,
      v.name AS volunteer_name,
      s.name AS shelter_name,
      de.name AS event_name
    FROM Task t
    JOIN Volunteer v ON t.assigned_to = v.volunteer_id
    JOIN Shelter s ON t.shelter_id = s.shelter_id
    JOIN DisasterEvent de ON t.event_id = de.event_id
    WHERE t.created_by = $1
  `;

  if (status) {
    params.push(status);
    query += ` AND t.status = $${params.length}`;
  }
  if (shelter) {
    params.push(shelter);
    query += ` AND t.shelter_id = $${params.length}`;
  }
  if (event) {
    params.push(event);
    query += ` AND t.event_id = $${params.length}`;
  }
  if (volunteer) {
    params.push(volunteer);
    query += ` AND t.assigned_to = $${params.length}`;
  }
  if (search) {
    params.push(`%${search}%`);
    query += ` AND (t.title ILIKE $${params.length} OR t.description ILIKE $${params.length})`;
  }

  query += ` ORDER BY t.created_at DESC`;

  const { rows } = await pool.query(query, params);
  return rows.map(r => new Task(r));
}

export async function create({ title, description, assignedTo, shelterId, eventId }) {
  const orgId = await getOrgId();
  const { rows } = await pool.query(
    `INSERT INTO Task (title, description, status, assigned_to, created_by, shelter_id, event_id)
     VALUES ($1, $2, 'PENDING', $3, $4, $5, $6) RETURNING task_id`,
    [title, description, assignedTo, orgId, shelterId, eventId]
  );
  return rows[0];
}

export async function update(taskId, { title, description, assignedTo, shelterId, eventId }) {
  await pool.query(
    `UPDATE Task SET title = $2, description = $3, assigned_to = $4, shelter_id = $5, event_id = $6
     WHERE task_id = $1`,
    [taskId, title, description, assignedTo, shelterId, eventId]
  );
}

export async function updateStatus(taskId, status) {
  const { rowCount } = await pool.query(
    `UPDATE Task SET status = $2 WHERE task_id = $1`,
    [taskId, status]
  );
  if (rowCount === 0) throw new Error('Task not found');
}

export async function remove(taskId) {
  await pool.query(`DELETE FROM Task WHERE task_id = $1`, [taskId]);
}
