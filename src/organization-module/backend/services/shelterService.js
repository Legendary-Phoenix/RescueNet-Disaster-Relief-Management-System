import pool from '../../../db.js';

export async function getDetails(shelterId, eventId) {
  const { rows: [shelter] } = await pool.query(`
    SELECT s.*, a.name AS area_name, a.state AS area_state
    FROM Shelter s
    JOIN Area a ON s.area_id = a.area_id
    WHERE s.shelter_id = $1
  `, [shelterId]);

  if (!shelter) return null;

  const { rows: inventory } = await pool.query(`
    SELECT r.resource_id, r.type, r.name, r.unit,
      inv.quantity_available::int AS available,
      COALESCE(dem.total, 0)::int AS requested
    FROM Inventory inv
    JOIN Resource r ON inv.resource_id = r.resource_id
    LEFT JOIN (
      SELECT rri.resource_id, SUM(rri.quantity)::int AS total
      FROM ResourceRequestItem rri
      JOIN ResourceRequest rr ON rri.request_id = rr.request_id
      WHERE rr.shelter_id = $1 AND rr.event_id = $2 AND rr.status IN ('PENDING', 'APPROVED')
      GROUP BY rri.resource_id
    ) dem ON dem.resource_id = r.resource_id
    WHERE inv.shelter_id = $1
    ORDER BY r.type, r.name
  `, [shelterId, eventId]);

  return { shelter, inventory };
}
