import pool from '../../../db.js';

function calcNeedLevel(requested, supply) {
  const score = requested / (supply + 1);
  let level;
  if (score < 1.0) level = 'LOW';
  else if (score <= 1.5) level = 'MODERATE';
  else if (score <= 2.0) level = 'HIGH';
  else level = 'CRITICAL';
  return { need_level: level, need_score: Math.round(score * 100) / 100 };
}

export async function getDetails(areaId, eventId) {
  const { rows: [area] } = await pool.query(
    `SELECT * FROM Area WHERE area_id = $1`, [areaId]
  );
  if (!area) return null;

  const { rows: shelters } = await pool.query(`
    WITH shelter_supply AS (
      SELECT shelter_id, COALESCE(SUM(quantity_available), 0)::int AS total
      FROM Inventory GROUP BY shelter_id
    ),
    shelter_demand AS (
      SELECT rr.shelter_id, COALESCE(SUM(rri.quantity), 0)::int AS total
      FROM ResourceRequest rr
      JOIN ResourceRequestItem rri ON rri.request_id = rr.request_id
      WHERE rr.event_id = $1 AND rr.status IN ('PENDING', 'APPROVED')
      GROUP BY rr.shelter_id
    )
    SELECT s.shelter_id, s.name, s.capacity, s.current_occupancy, s.status,
      COALESCE(sup.total, 0)::int AS total_supply,
      COALESCE(dem.total, 0)::int AS total_requested
    FROM Shelter s
    LEFT JOIN shelter_supply sup ON sup.shelter_id = s.shelter_id
    LEFT JOIN shelter_demand dem ON dem.shelter_id = s.shelter_id
    WHERE s.area_id = $2 AND s.status = 'OPEN'
    ORDER BY s.name
  `, [eventId, areaId]);

  const sheltersWithNeed = shelters.map(s => ({
    ...s, ...calcNeedLevel(s.total_requested, s.total_supply),
  }));

  const stats = {
    shelter_count: shelters.length,
    victim_count: shelters.reduce((sum, s) => sum + s.current_occupancy, 0),
  };

  const { rows: resources } = await pool.query(`
    SELECT r.type, r.name, r.unit,
      COALESCE(SUM(inv.quantity_available), 0)::int AS available,
      COALESCE(SUM(dem.quantity), 0)::int AS requested
    FROM Resource r
    LEFT JOIN (
      SELECT inv.resource_id, inv.quantity_available
      FROM Inventory inv
      JOIN Shelter s ON inv.shelter_id = s.shelter_id
      WHERE s.area_id = $2 AND s.status = 'OPEN'
    ) inv ON inv.resource_id = r.resource_id
    LEFT JOIN (
      SELECT rri.resource_id, rri.quantity
      FROM ResourceRequestItem rri
      JOIN ResourceRequest rr ON rri.request_id = rr.request_id
      JOIN Shelter s ON rr.shelter_id = s.shelter_id
      WHERE s.area_id = $2 AND rr.event_id = $1 AND rr.status IN ('PENDING', 'APPROVED')
    ) dem ON dem.resource_id = r.resource_id
    GROUP BY r.type, r.name, r.unit
    HAVING COALESCE(SUM(inv.quantity_available), 0) > 0 OR COALESCE(SUM(dem.quantity), 0) > 0
    ORDER BY r.type, r.name
  `, [eventId, areaId]);

  return { area, stats, shelters: sheltersWithNeed, resources };
}
