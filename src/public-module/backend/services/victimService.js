import pool from '../../../db.js';

// Only return fields safe to expose to pubclic
export async function search({ name, event_id, shelter_id } = {}) {
  let query = `
    SELECT v.name AS victim_name, s.name AS shelter_name, de.name AS event_name
    FROM Victim v
    JOIN Shelter s ON s.shelter_id = v.shelter_id
    JOIN DisasterEvent de ON de.event_id = v.event_id
    WHERE v.name ILIKE $1
  `;
  const params = [`%${name}%`];

  if (event_id) {
    params.push(event_id);
    query += ` AND v.event_id = $${params.length}`;
  }
  if (shelter_id) {
    params.push(shelter_id);
    query += ` AND v.shelter_id = $${params.length}`;
  }

  query += ` ORDER BY v.name LIMIT 50`;

  const { rows } = await pool.query(query, params);

  // Field whitelisting happens here, at the service layer, not the controller.
  return rows.map((row) => ({
    name: row.victim_name,
    shelter_name: row.shelter_name,
    event_name: row.event_name,
  }));
}
