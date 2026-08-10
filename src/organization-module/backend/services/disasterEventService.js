import pool from '../../../db.js';
import DisasterEvent from '../../../models/DisasterEvent.js';

export async function findAll({ status, type, search } = {}) {
  let query = `
    SELECT de.event_id, de.name, de.type, de.severity,
           de.start_date, de.end_date, de.status,
           COUNT(dea.area_id)::int AS area_count
    FROM DisasterEvent de
    LEFT JOIN DisasterEventArea dea ON de.event_id = dea.event_id
    WHERE 1=1
  `;
  const params = [];

  if (status) {
    params.push(status);
    query += ` AND de.status = $${params.length}`;
  }
  if (type) {
    params.push(type);
    query += ` AND de.type = $${params.length}`;
  }
  if (search) {
    params.push(`%${search}%`);
    query += ` AND de.name ILIKE $${params.length}`;
  }

  query += ` GROUP BY de.event_id ORDER BY de.start_date DESC`;

  const { rows } = await pool.query(query, params);
  return rows.map(row => new DisasterEvent(row));
}
