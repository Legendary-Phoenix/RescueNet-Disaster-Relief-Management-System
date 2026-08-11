import pool from '../../../db.js';
import DisasterEvent from '../../../models/DisasterEvent.js';

function calcNeedLevel(requested, supply) {
  const score = requested / (supply + 1);
  let level;
  if (score < 1.0) level = 'LOW';
  else if (score <= 1.5) level = 'MODERATE';
  else if (score <= 2.0) level = 'HIGH';
  else level = 'CRITICAL';
  return { need_level: level, need_score: Math.round(score * 100) / 100 };
}

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

export async function getDashboard(eventId) {
  const eventResult = await pool.query(
    `SELECT * FROM DisasterEvent WHERE event_id = $1`, [eventId]
  );
  if (eventResult.rows.length === 0) return null;
  const event = new DisasterEvent(eventResult.rows[0]);

  const { rows: areaRows } = await pool.query(`
    WITH area_supply AS (
      SELECT s.area_id, COALESCE(SUM(inv.quantity_available), 0)::int AS total
      FROM Shelter s
      JOIN DisasterEventArea dea ON s.area_id = dea.area_id AND dea.event_id = $1
      LEFT JOIN Inventory inv ON inv.shelter_id = s.shelter_id
      WHERE s.status = 'OPEN'
      GROUP BY s.area_id
    ),
    area_demand AS (
      SELECT s.area_id, COALESCE(SUM(rri.quantity), 0)::int AS total
      FROM ResourceRequest rr
      JOIN ResourceRequestItem rri ON rri.request_id = rr.request_id
      JOIN Shelter s ON rr.shelter_id = s.shelter_id
      WHERE rr.event_id = $1 AND rr.status IN ('PENDING', 'APPROVED')
      GROUP BY s.area_id
    )
    SELECT a.area_id, a.name, a.state,
      COUNT(DISTINCT s.shelter_id) FILTER (WHERE s.status = 'OPEN')::int AS shelter_count,
      COALESCE(SUM(s.current_occupancy) FILTER (WHERE s.status = 'OPEN'), 0)::int AS victim_count,
      COALESCE(sup.total, 0)::int AS total_supply,
      COALESCE(dem.total, 0)::int AS total_requested
    FROM DisasterEventArea dea
    JOIN Area a ON dea.area_id = a.area_id
    LEFT JOIN Shelter s ON s.area_id = a.area_id
    LEFT JOIN area_supply sup ON sup.area_id = a.area_id
    LEFT JOIN area_demand dem ON dem.area_id = a.area_id
    WHERE dea.event_id = $1
    GROUP BY a.area_id, a.name, a.state, sup.total, dem.total
    ORDER BY a.name
  `, [eventId]);

  const areas = areaRows.map(r => ({
    ...r,
    ...calcNeedLevel(r.total_requested, r.total_supply),
  }));

  const { rows: shelterRows } = await pool.query(`
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
    SELECT s.shelter_id, s.name, s.capacity, s.current_occupancy, s.status, s.area_id,
      a.name AS area_name,
      COALESCE(sup.total, 0)::int AS total_supply,
      COALESCE(dem.total, 0)::int AS total_requested
    FROM Shelter s
    JOIN Area a ON s.area_id = a.area_id
    JOIN DisasterEventArea dea ON a.area_id = dea.area_id AND dea.event_id = $1
    LEFT JOIN shelter_supply sup ON sup.shelter_id = s.shelter_id
    LEFT JOIN shelter_demand dem ON dem.shelter_id = s.shelter_id
    ORDER BY s.name
  `, [eventId]);

  const shelters = shelterRows.map(r => ({
    ...r,
    ...calcNeedLevel(r.total_requested, r.total_supply),
    is_overloaded: r.current_occupancy > r.capacity,
  }));

  const { rows: resourceRows } = await pool.query(`
    SELECT r.type,
      COALESCE(SUM(inv.quantity_available), 0)::int AS total_available,
      COALESCE(SUM(dem.quantity), 0)::int AS total_requested
    FROM Resource r
    LEFT JOIN (
      SELECT inv.resource_id, inv.quantity_available
      FROM Inventory inv
      JOIN Shelter s ON inv.shelter_id = s.shelter_id
      JOIN DisasterEventArea dea ON s.area_id = dea.area_id AND dea.event_id = $1
      WHERE s.status = 'OPEN'
    ) inv ON inv.resource_id = r.resource_id
    LEFT JOIN (
      SELECT rri.resource_id, rri.quantity
      FROM ResourceRequestItem rri
      JOIN ResourceRequest rr ON rri.request_id = rr.request_id
      WHERE rr.event_id = $1 AND rr.status IN ('PENDING', 'APPROVED')
    ) dem ON dem.resource_id = r.resource_id
    GROUP BY r.type
    ORDER BY r.type
  `, [eventId]);

  const totalAvailable = resourceRows.reduce((s, r) => s + r.total_available, 0);
  const totalRequested = resourceRows.reduce((s, r) => s + r.total_requested, 0);
  const resourceCoverage = totalAvailable + totalRequested > 0
    ? Math.round((totalAvailable / (totalAvailable + totalRequested)) * 100)
    : 100;

  const activeShelters = shelters.filter(s => s.status === 'OPEN');

  return {
    event,
    overview: {
      affected_areas: areas.length,
      active_shelters: activeShelters.length,
      total_victims: activeShelters.reduce((s, sh) => s + sh.current_occupancy, 0),
      resource_coverage: resourceCoverage,
    },
    areas,
    shelters,
    resource_overview: resourceRows,
  };
}
