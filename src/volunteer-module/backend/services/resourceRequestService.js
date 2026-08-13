import pool from '../../../db.js';

const EDITABLE_STATUS = 'PENDING';

const REQUEST_COLUMNS = `
  rr.request_id, rr.shelter_id, rr.event_id, rr.created_by, rr.status, rr.created_at,
  s.name  AS shelter_name,
  a.name  AS area_name,
  e.name  AS event_name, e.severity AS event_severity, e.status AS event_status,
  v.name  AS requested_by`;

const ITEMS_SUBQUERY = `
  COALESCE((
    SELECT json_agg(json_build_object(
             'resource_id',     r.resource_id,
             'name',            r.name,
             'type',            r.type,
             'custom_category', r.custom_category,
             'unit',            r.unit,
             'quantity',        rri.quantity
           ) ORDER BY r.type, r.name)
      FROM ResourceRequestItem rri
      JOIN Resource r ON r.resource_id = rri.resource_id
     WHERE rri.request_id = rr.request_id
  ), '[]'::json) AS items`;

export async function listRequests(volunteerId, { status, shelterId, scope } = {}) {
  const params = [volunteerId];
  const conditions = [];

  if (scope === 'mine') {
    conditions.push('rr.created_by = $1');
  } else {
    conditions.push(`rr.shelter_id IN (
      SELECT shelter_id FROM VolunteerShelterAssignment WHERE volunteer_id = $1
    )`);
  }

  if (shelterId) {
    params.push(shelterId);
    conditions.push(`rr.shelter_id = $${params.length}`);
  }
  if (status) {
    params.push(status);
    conditions.push(`rr.status = $${params.length}`);
  }

  const { rows } = await pool.query(
    `SELECT ${REQUEST_COLUMNS}, ${ITEMS_SUBQUERY}
       FROM ResourceRequest rr
       JOIN Shelter s            ON s.shelter_id   = rr.shelter_id
       JOIN Area a               ON a.area_id      = s.area_id
       JOIN DisasterEvent e      ON e.event_id     = rr.event_id
       JOIN Volunteer v          ON v.volunteer_id = rr.created_by
      WHERE ${conditions.join(' AND ')}
      ORDER BY
        CASE rr.status WHEN 'PENDING' THEN 0 WHEN 'APPROVED' THEN 1 ELSE 2 END,
        rr.created_at DESC`,
    params
  );
  return rows.map((row) => ({ ...row, editable: isEditableBy(row, volunteerId) }));
}

export async function getRequestStats(volunteerId, { shelterId, scope } = {}) {
  const params = [volunteerId];
  const conditions = [];

  if (scope === 'mine') {
    conditions.push('created_by = $1');
  } else {
    conditions.push(`shelter_id IN (
      SELECT shelter_id FROM VolunteerShelterAssignment WHERE volunteer_id = $1
    )`);
  }

  if (shelterId) {
    params.push(shelterId);
    conditions.push(`shelter_id = $${params.length}`);
  }

  const { rows } = await pool.query(
    `SELECT
       count(*) FILTER (WHERE status = 'PENDING')::int   AS pending,
       count(*) FILTER (WHERE status = 'APPROVED')::int  AS approved,
       count(*) FILTER (WHERE status = 'FULFILLED')::int AS fulfilled,
       count(*) FILTER (WHERE status = 'REJECTED')::int  AS rejected,
       count(*) FILTER (WHERE status = 'REVOKED')::int   AS revoked,
       count(*) FILTER (WHERE created_by = $1)::int      AS mine,
       count(*)::int                                     AS total
     FROM ResourceRequest
     WHERE ${conditions.join(' AND ')}`,
    params
  );
  return rows[0];
}

export async function getRequest(volunteerId, requestId) {
  const { rows } = await pool.query(
    `SELECT ${REQUEST_COLUMNS}, ${ITEMS_SUBQUERY}
       FROM ResourceRequest rr
       JOIN Shelter s       ON s.shelter_id   = rr.shelter_id
       JOIN Area a          ON a.area_id      = s.area_id
       JOIN DisasterEvent e ON e.event_id     = rr.event_id
       JOIN Volunteer v     ON v.volunteer_id = rr.created_by
      WHERE rr.request_id = $1
        AND (rr.created_by = $2 OR rr.shelter_id IN (
              SELECT shelter_id FROM VolunteerShelterAssignment WHERE volunteer_id = $2
            ))`,
    [requestId, volunteerId]
  );

  if (rows.length === 0) {
    throw Object.assign(new Error('Resource request not found, or it is not for one of your shelters'), { status: 404 });
  }
  return { ...rows[0], editable: isEditableBy(rows[0], volunteerId) };
}

export async function createRequest(volunteerId, { shelterId, eventId, items }) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await assertCanRequestFor(client, volunteerId, shelterId, eventId);

    const request = await client.query(
      `INSERT INTO ResourceRequest (shelter_id, event_id, created_by, status)
       VALUES ($1, $2, $3, 'PENDING')
       RETURNING request_id`,
      [shelterId, eventId, volunteerId]
    );
    const requestId = request.rows[0].request_id;

    await insertItems(client, requestId, items);
    await client.query('COMMIT');
    return requestId;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function updateRequest(volunteerId, requestId, { items }) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const existing = await client.query(
      `SELECT created_by, status FROM ResourceRequest WHERE request_id = $1 FOR UPDATE`,
      [requestId]
    );
    if (existing.rows.length === 0) {
      throw Object.assign(new Error('Resource request not found'), { status: 404 });
    }

    const row = existing.rows[0];
    if (row.created_by !== volunteerId) {
      throw Object.assign(new Error('You can only change a request you raised yourself'), { status: 403 });
    }
    if (row.status !== EDITABLE_STATUS) {
      throw Object.assign(new Error(`This request is already ${row.status.toLowerCase()} and can no longer be changed`), { status: 409 });
    }

    await client.query(`DELETE FROM ResourceRequestItem WHERE request_id = $1`, [requestId]);
    await insertItems(client, requestId, items);
    await client.query('COMMIT');
    return requestId;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function withdrawRequest(volunteerId, requestId) {
  const { rows } = await pool.query(
    `SELECT created_by, status FROM ResourceRequest WHERE request_id = $1`,
    [requestId]
  );
  if (rows.length === 0) {
    throw Object.assign(new Error('Resource request not found'), { status: 404 });
  }
  if (rows[0].created_by !== volunteerId) {
    throw Object.assign(new Error('You can only withdraw a request you raised yourself'), { status: 403 });
  }
  if (rows[0].status !== EDITABLE_STATUS) {
    throw Object.assign(new Error(`This request is already ${rows[0].status.toLowerCase()} and can no longer be withdrawn`), { status: 409 });
  }

  await pool.query(`UPDATE ResourceRequest SET status = 'REVOKED' WHERE request_id = $1`, [requestId]);
  return requestId;
}

export async function listResources() {
  const { rows } = await pool.query(
    `SELECT resource_id, type, name, unit, custom_category FROM Resource ORDER BY type, name`
  );
  return rows;
}

export async function listRequestableEvents(volunteerId) {
  const { rows } = await pool.query(
    `SELECT DISTINCT e.event_id, e.name, e.type, e.severity, e.start_date
       FROM DisasterEvent e
       JOIN DisasterEventArea dea ON dea.event_id = e.event_id
       JOIN Shelter s             ON s.area_id    = dea.area_id
       JOIN VolunteerShelterAssignment vsa ON vsa.shelter_id = s.shelter_id
      WHERE vsa.volunteer_id = $1 AND e.status = 'ACTIVE'
      ORDER BY e.severity DESC, e.start_date DESC`,
    [volunteerId]
  );
  return rows;
}

function isEditableBy(row, volunteerId) {
  return row.created_by === volunteerId && row.status === EDITABLE_STATUS;
}

async function assertCanRequestFor(client, volunteerId, shelterId, eventId) {
  const assignment = await client.query(
    `SELECT 1 FROM VolunteerShelterAssignment WHERE volunteer_id = $1 AND shelter_id = $2`,
    [volunteerId, shelterId]
  );
  if (assignment.rows.length === 0) {
    throw Object.assign(new Error('You can only raise requests for a shelter you are assigned to'), { status: 403 });
  }

  const event = await client.query(`SELECT status FROM DisasterEvent WHERE event_id = $1`, [eventId]);
  if (event.rows.length === 0) {
    throw Object.assign(new Error('Disaster event not found'), { status: 404 });
  }
  if (event.rows[0].status === 'RESOLVED') {
    throw Object.assign(new Error('Cannot raise a request against a resolved disaster event'), { status: 400 });
  }
}

async function insertItems(client, requestId, items) {
  const seen = new Set();

  for (const item of items) {
    const resourceId = item.custom
      ? await resolveCustomResource(client, item.custom)
      : item.resourceId;

    if (seen.has(resourceId)) {
      throw Object.assign(new Error('Two lines resolve to the same resource — combine the quantities instead'), { status: 400 });
    }
    seen.add(resourceId);

    await client.query(
      `INSERT INTO ResourceRequestItem (request_id, resource_id, quantity) VALUES ($1, $2, $3)`,
      [requestId, resourceId, item.quantity]
    );
  }
}

// Reuses the catalogue row a custom line resolves to, so asking for the same thing
// twice doesn't litter Resource with duplicates. An existing row keeps its own
// custom_category — a request form has no business rewriting the catalogue.
async function resolveCustomResource(client, { category, name, unit, customCategory }) {
  const existing = await client.query(
    `SELECT resource_id FROM Resource WHERE type = $1 AND lower(name) = lower($2) LIMIT 1`,
    [category, name]
  );
  if (existing.rows.length > 0) {
    return existing.rows[0].resource_id;
  }

  const created = await client.query(
    `INSERT INTO Resource (type, name, unit, custom_category)
     VALUES ($1, $2, $3, $4) RETURNING resource_id`,
    [category, name, unit, customCategory ?? null]
  );
  return created.rows[0].resource_id;
}
