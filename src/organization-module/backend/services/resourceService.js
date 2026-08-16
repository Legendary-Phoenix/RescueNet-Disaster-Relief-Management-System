import pool from '../../../db.js';

function computeNeedLevel(requested, available) {
  const ratio = requested / (available + 1);
  if (ratio >= 2.0) return 'CRITICAL';
  if (ratio >= 1.5) return 'HIGH';
  if (ratio >= 1.0) return 'MODERATE';
  return 'LOW';
}

async function getOrgId() {
  const { rows } = await pool.query(
    `SELECT org_id FROM ReliefOrganization WHERE status = 'APPROVED' LIMIT 1`
  );
  return rows[0]?.org_id;
}

export async function getInventory({ shelter, type, needLevel } = {}) {
  const params = [];
  let query = `
    SELECT s.shelter_id, s.name AS shelter_name,
      r.resource_id, r.type, r.name AS resource_name, r.unit,
      inv.inventory_id, inv.quantity_available,
      COALESCE(req.total_requested, 0) AS total_requested
    FROM Inventory inv
    JOIN Shelter s ON inv.shelter_id = s.shelter_id
    JOIN Resource r ON inv.resource_id = r.resource_id
    LEFT JOIN (
      SELECT rri.resource_id, rr.shelter_id, SUM(rri.quantity) AS total_requested
      FROM ResourceRequestItem rri
      JOIN ResourceRequest rr ON rri.request_id = rr.request_id
      WHERE rr.status IN ('PENDING', 'APPROVED')
      GROUP BY rri.resource_id, rr.shelter_id
    ) req ON req.resource_id = inv.resource_id AND req.shelter_id = inv.shelter_id
    WHERE s.status = 'OPEN'
  `;
  if (shelter) {
    params.push(shelter);
    query += ` AND inv.shelter_id = $${params.length}`;
  }
  if (type) {
    params.push(type);
    query += ` AND r.type = $${params.length}`;
  }
  query += ` ORDER BY s.name, r.type, r.name`;

  const { rows } = await pool.query(query, params);

  const grouped = [];
  let current = null;
  for (const row of rows) {
    if (!current || current.shelter_id !== row.shelter_id) {
      current = { shelter_id: row.shelter_id, shelter_name: row.shelter_name, items: [] };
      grouped.push(current);
    }
    const requested = parseInt(row.total_requested);
    const level = computeNeedLevel(requested, row.quantity_available);
    if (needLevel && level !== needLevel) continue;
    current.items.push({
      inventory_id: row.inventory_id,
      resource_id: row.resource_id,
      type: row.type,
      name: row.resource_name,
      unit: row.unit,
      quantity: row.quantity_available,
      requested,
      need_level: level,
    });
  }
  return grouped.filter(g => g.items.length > 0);
}

export async function getResources() {
  const { rows } = await pool.query(`SELECT * FROM Resource ORDER BY type, name`);
  return rows;
}

export async function addStock(shelterId, resourceId, quantity) {
  const orgId = await getOrgId();
  const { rows } = await pool.query(
    `SELECT inventory_id FROM Inventory WHERE shelter_id = $1 AND resource_id = $2`,
    [shelterId, resourceId]
  );
  if (rows.length > 0) {
    await pool.query(
      `UPDATE Inventory SET quantity_available = quantity_available + $2, last_updated = NOW(), updated_by = $3
       WHERE inventory_id = $1`,
      [rows[0].inventory_id, quantity, orgId]
    );
  } else {
    await pool.query(
      `INSERT INTO Inventory (shelter_id, resource_id, quantity_available, updated_by)
       VALUES ($1, $2, $3, $4)`,
      [shelterId, resourceId, quantity, orgId]
    );
  }
}

export async function moveStock(fromShelterId, toShelterId, resourceId, quantity) {
  const orgId = await getOrgId();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows: [source] } = await client.query(
      `SELECT inventory_id, quantity_available FROM Inventory
       WHERE shelter_id = $1 AND resource_id = $2 FOR UPDATE`,
      [fromShelterId, resourceId]
    );
    if (!source || source.quantity_available < quantity) {
      throw new Error('Insufficient stock at source shelter');
    }
    await client.query(
      `UPDATE Inventory SET quantity_available = quantity_available - $2, last_updated = NOW(), updated_by = $3
       WHERE inventory_id = $1`,
      [source.inventory_id, quantity, orgId]
    );
    const { rows: dest } = await client.query(
      `SELECT inventory_id FROM Inventory WHERE shelter_id = $1 AND resource_id = $2 FOR UPDATE`,
      [toShelterId, resourceId]
    );
    if (dest.length > 0) {
      await client.query(
        `UPDATE Inventory SET quantity_available = quantity_available + $2, last_updated = NOW(), updated_by = $3
         WHERE inventory_id = $1`,
        [dest[0].inventory_id, quantity, orgId]
      );
    } else {
      await client.query(
        `INSERT INTO Inventory (shelter_id, resource_id, quantity_available, updated_by)
         VALUES ($1, $2, $3, $4)`,
        [toShelterId, resourceId, quantity, orgId]
      );
    }
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function getRequests({ volunteer, shelter, status, event } = {}) {
  const params = [];
  let query = `
    SELECT rr.request_id, rr.status, rr.created_at,
      s.shelter_id, s.name AS shelter_name,
      de.event_id, de.name AS event_name,
      v.volunteer_id, v.name AS volunteer_name,
      json_agg(json_build_object(
        'resource_id', r.resource_id, 'name', r.name,
        'type', r.type, 'unit', r.unit, 'quantity', rri.quantity
      ) ORDER BY r.type, r.name) AS items
    FROM ResourceRequest rr
    JOIN Shelter s ON rr.shelter_id = s.shelter_id
    JOIN DisasterEvent de ON rr.event_id = de.event_id
    JOIN Volunteer v ON rr.created_by = v.volunteer_id
    JOIN ResourceRequestItem rri ON rr.request_id = rri.request_id
    JOIN Resource r ON rri.resource_id = r.resource_id
    WHERE 1=1
  `;
  if (volunteer) {
    params.push(volunteer);
    query += ` AND rr.created_by = $${params.length}`;
  }
  if (shelter) {
    params.push(shelter);
    query += ` AND rr.shelter_id = $${params.length}`;
  }
  if (status) {
    params.push(status);
    query += ` AND rr.status = $${params.length}`;
  }
  if (event) {
    params.push(event);
    query += ` AND rr.event_id = $${params.length}`;
  }
  query += ` GROUP BY rr.request_id, s.shelter_id, s.name, de.event_id, de.name, v.volunteer_id, v.name
             ORDER BY rr.created_at DESC`;

  const { rows } = await pool.query(query, params);
  return rows;
}

export async function updateRequestStatus(requestId, status) {
  const { rowCount } = await pool.query(
    `UPDATE ResourceRequest SET status = $2 WHERE request_id = $1`,
    [requestId, status]
  );
  if (rowCount === 0) throw new Error('Request not found');
}
