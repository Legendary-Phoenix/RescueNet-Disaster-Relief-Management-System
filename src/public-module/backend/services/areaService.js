import pool from '../../../db.js';

// Public-scoped area data. Exact resource/need numbers stay internal to the
// organization module — only capacity/occupancy/status is exposed here.

export async function findAll({ search, state, hasActiveEvent } = {}) {
  let query = `
    SELECT a.area_id, a.name, a.state,
      COUNT(DISTINCT s.shelter_id) FILTER (WHERE s.status = 'OPEN')::int AS shelter_count,
      COALESCE(SUM(s.current_occupancy) FILTER (WHERE s.status = 'OPEN'), 0)::int AS victim_count,
      COUNT(DISTINCT de.event_id) FILTER (WHERE de.status = 'ACTIVE')::int AS active_event_count
    FROM Area a
    LEFT JOIN Shelter s ON s.area_id = a.area_id
    LEFT JOIN DisasterEventArea dea ON dea.area_id = a.area_id
    LEFT JOIN DisasterEvent de ON de.event_id = dea.event_id
    WHERE 1=1
  `;
  const params = [];

  if (search) {
    params.push(`%${search}%`);
    query += ` AND a.name ILIKE $${params.length}`;
  }
  if (state) {
    params.push(state);
    query += ` AND a.state = $${params.length}`;
  }

  query += ` GROUP BY a.area_id, a.name, a.state`;

  if (hasActiveEvent) {
    query += ` HAVING COUNT(DISTINCT de.event_id) FILTER (WHERE de.status = 'ACTIVE') > 0`;
  }

  query += ` ORDER BY a.name`;

  const { rows } = await pool.query(query, params);
  return rows;
}

export async function getDetails(areaId) {
  const { rows: [area] } = await pool.query(
    `SELECT area_id, name, state FROM Area WHERE area_id = $1`, [areaId]
  );
  if (!area) return null;

  const { rows: shelters } = await pool.query(
    `SELECT shelter_id, name, address, contact_number, capacity, current_occupancy, status
     FROM Shelter
     WHERE area_id = $1 AND status = 'OPEN'
     ORDER BY name`,
    [areaId]
  );

  const stats = {
    shelter_count: shelters.length,
    victim_count: shelters.reduce((sum, s) => sum + s.current_occupancy, 0),
  };

  return { area, stats, shelters };
}
