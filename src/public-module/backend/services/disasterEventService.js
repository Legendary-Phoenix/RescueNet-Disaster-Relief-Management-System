import pool from '../../../db.js';

export async function findEvents({ status } = {}) {
  let query = `
    SELECT de.event_id, de.name, de.type, de.severity,
           de.start_date, de.end_date, de.status,
           COALESCE((
             SELECT json_agg(json_build_object('area_id', a.area_id, 'name', a.name, 'state', a.state) ORDER BY a.name)
             FROM DisasterEventArea dea
             JOIN Area a ON a.area_id = dea.area_id
             WHERE dea.event_id = de.event_id
           ), '[]') AS areas
    FROM DisasterEvent de
    WHERE 1=1
  `;
  const params = [];

  if (status) {
    params.push(status);
    query += ` AND de.status = $${params.length}`;
  }

  query += ` ORDER BY de.start_date DESC`;

  const { rows } = await pool.query(query, params);
  return rows;
}
