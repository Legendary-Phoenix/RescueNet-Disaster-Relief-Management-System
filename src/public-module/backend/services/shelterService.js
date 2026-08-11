import pool from '../../../db.js';

export async function findAll({ search, status, area_id } = {}) {
  let query = `
    SELECT s.shelter_id, s.name, s.address, s.contact_number, s.capacity,
           s.current_occupancy, s.status, s.area_id,
           a.name AS area_name, a.state AS area_state
    FROM Shelter s
    JOIN Area a ON a.area_id = s.area_id
    WHERE 1=1
  `;
  const params = [];

  if (search) {
    params.push(`%${search}%`);
    query += ` AND (s.name ILIKE $${params.length} OR s.address ILIKE $${params.length})`;
  }
  if (status) {
    params.push(status);
    query += ` AND s.status = $${params.length}`;
  }
  if (area_id) {
    params.push(area_id);
    query += ` AND s.area_id = $${params.length}`;
  }

  query += ` ORDER BY a.name, s.name`;

  const { rows } = await pool.query(query, params);
  return rows.map(mapShelter);
}

export async function findById(id) {
  const { rows } = await pool.query(
    `SELECT s.shelter_id, s.name, s.address, s.contact_number, s.capacity,
            s.current_occupancy, s.status, s.area_id,
            a.name AS area_name, a.state AS area_state
     FROM Shelter s
     JOIN Area a ON a.area_id = s.area_id
     WHERE s.shelter_id = $1`,
    [id]
  );

  if (!rows[0]) return null;
  return mapShelter(rows[0]);
}

function mapShelter(row) {
  return {
    shelter_id: row.shelter_id,
    name: row.name,
    address: row.address,
    contact_number: row.contact_number,
    capacity: row.capacity,
    current_occupancy: row.current_occupancy,
    status: row.status,
    area: { area_id: row.area_id, name: row.area_name, state: row.area_state },
  };
}
