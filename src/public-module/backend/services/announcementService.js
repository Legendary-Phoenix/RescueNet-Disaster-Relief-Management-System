import pool from '../../../db.js';

const RECENT_LIMIT = 5;

export async function findAll({ event_id, search } = {}) {
  let query = `
    SELECT ea.announcement_id, ea.title, ea.message, ea.created_at,
           de.event_id, de.name AS event_name
    FROM EmergencyAnnouncement ea
    LEFT JOIN DisasterEvent de ON de.event_id = ea.event_id
    WHERE 1=1
  `;
  const params = [];

  if (event_id) {
    params.push(event_id);
    query += ` AND ea.event_id = $${params.length}`;
  }
  if (search) {
    params.push(`%${search}%`);
    query += ` AND ea.title ILIKE $${params.length}`;
  }

  query += ` ORDER BY ea.created_at DESC`;

  const { rows } = await pool.query(query, params);
  return rows.map(mapAnnouncement);
}

export async function findRecent() {
  const { rows } = await pool.query(
    `SELECT ea.announcement_id, ea.title, ea.message, ea.created_at,
            de.event_id, de.name AS event_name
     FROM EmergencyAnnouncement ea
     LEFT JOIN DisasterEvent de ON de.event_id = ea.event_id
     ORDER BY ea.created_at DESC
     LIMIT $1`,
    [RECENT_LIMIT]
  );
  return rows.map(mapAnnouncement);
}

function mapAnnouncement(row) {
  return {
    announcement_id: row.announcement_id,
    title: row.title,
    message: row.message,
    created_at: row.created_at,
    event: row.event_id ? { event_id: row.event_id, name: row.event_name } : null,
  };
}
