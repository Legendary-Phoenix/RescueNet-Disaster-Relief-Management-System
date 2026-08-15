import pool from '../../../db.js';

// Victim has no status column in the official schema, so presence at a shelter is the
// only admission signal there is: a victim occupies a bed exactly while shelter_id
// points at one. Discharging clears shelter_id rather than deleting the record, which
// keeps the registration visible to the admin counts and the public victim lookup.
function occupiesBed(shelterId) {
  return shelterId != null;
}

function daysOfCover(type, quantity, occupancy) {
  if (occupancy <= 0) return null;
  const rates = { WATER: 3, FOOD: 2, MEDICINE: 0.5, HYGIENE: 0.5 };
  const rate = rates[type] || 1;
  return Math.round((quantity / (rate * occupancy)) * 10) / 10;
}

function supplyLevel(days) {
  if (days === null) return 'UNKNOWN';
  if (days < 1) return 'CRITICAL';
  if (days < 3) return 'LOW';
  return 'SUFFICIENT';
}

// ── Profile ─────────────────────────────────────────────────────────────────

export async function getProfile(volunteerId) {
  const { rows } = await pool.query(
    `SELECT v.volunteer_id, v.name, v.age, v.gender, v.contact_number, v.status,
            u.username,
            o.org_id, o.name AS organization_name, o.contact_number AS organization_contact,
            COALESCE((
              SELECT json_agg(json_build_object(
                       'shelter_id', s.shelter_id, 'name', s.name,
                       'area_id', s.area_id, 'area_name', a.name,
                       'status', s.status, 'capacity', s.capacity,
                       'current_occupancy', s.current_occupancy
                     ) ORDER BY vsa.assigned_at)
                FROM VolunteerShelterAssignment vsa
                JOIN Shelter s ON s.shelter_id = vsa.shelter_id
                JOIN Area a    ON a.area_id    = s.area_id
               WHERE vsa.volunteer_id = v.volunteer_id
            ), '[]'::json) AS shelters
       FROM Volunteer v
       JOIN "User" u ON u.user_id = v.volunteer_id
       LEFT JOIN ReliefOrganization o ON o.org_id = v.organization_id
      WHERE v.volunteer_id = $1`,
    [volunteerId]
  );
  if (rows.length === 0) throw Object.assign(new Error('Volunteer not found'), { status: 404 });
  return rows[0];
}

// ── Tasks ────────────────────────────────────────────────────────────────────

// The KPI cards on /volunteer/tasks filter the list below them, so the counter and
// the list have to agree exactly. Both build their WHERE clause from these, with the
// table alias passed in ('t.' for the list query, '' for the aggregate).
//
// completedToday is an approximation: Task has no completed_at column, so the closest
// available answer is "raised today and now COMPLETED".
//
// There is no 'overdue' view: the official schema has no Task.due_date, so a task has
// no deadline to be past. Ordering and the KPI row drop it with the column.
export const TASK_VIEWS = {
  completed_today: (a = '') =>
    `${a}status = 'COMPLETED' AND ${a}created_at::date = CURRENT_DATE`,
};

export async function listMyTasks(volunteerId, { status, shelterId, view } = {}) {
  const params = [volunteerId];
  const conditions = ['t.assigned_to = $1', "t.status != 'REVOKED'"];

  if (status) {
    params.push(status);
    conditions.push(`t.status = $${params.length}`);
  }
  if (shelterId) {
    params.push(shelterId);
    conditions.push(`t.shelter_id = $${params.length}`);
  }
  if (view) {
    if (!TASK_VIEWS[view]) {
      throw Object.assign(new Error(`Unknown task view: ${view}`), { status: 400 });
    }
    conditions.push(`(${TASK_VIEWS[view]('t.')})`);
  }

  const { rows } = await pool.query(
    `SELECT t.task_id, t.title, t.description, t.status, t.created_at,
            t.shelter_id, t.event_id,
            s.name AS shelter_name,
            e.name AS event_name, e.severity AS event_severity,
            o.name AS issued_by
       FROM Task t
       LEFT JOIN Shelter s            ON s.shelter_id = t.shelter_id
       LEFT JOIN DisasterEvent e      ON e.event_id   = t.event_id
       LEFT JOIN ReliefOrganization o ON o.org_id     = t.created_by
      WHERE ${conditions.join(' AND ')}
      ORDER BY
        CASE t.status WHEN 'IN_PROGRESS' THEN 0 WHEN 'PENDING' THEN 1 ELSE 2 END,
        t.created_at DESC`,
    params
  );
  return rows;
}

export async function getMyTaskStats(volunteerId, { shelterId } = {}) {
  const params = [volunteerId];
  const conditions = ['assigned_to = $1'];

  if (shelterId) {
    params.push(shelterId);
    conditions.push(`shelter_id = $${params.length}`);
  }

  const { rows } = await pool.query(
    `SELECT
       count(*) FILTER (WHERE status = 'PENDING')::int                    AS pending,
       count(*) FILTER (WHERE status = 'IN_PROGRESS')::int                AS in_progress,
       count(*) FILTER (WHERE status = 'COMPLETED')::int                  AS completed,
       count(*) FILTER (WHERE status = 'REVOKED')::int                    AS revoked,
       count(*) FILTER (WHERE ${TASK_VIEWS.completed_today()})::int       AS completed_today
     FROM Task WHERE ${conditions.join(' AND ')}`,
    params
  );
  return rows[0];
}

export async function updateTaskStatus(volunteerId, taskId, status) {
  const ALLOWED = ['PENDING', 'IN_PROGRESS', 'COMPLETED'];
  if (!ALLOWED.includes(status)) {
    throw Object.assign(new Error(`Volunteers may only set: ${ALLOWED.join(', ')}`), { status: 400 });
  }

  const existing = await pool.query(
    `SELECT status FROM Task WHERE task_id = $1 AND assigned_to = $2`,
    [taskId, volunteerId]
  );
  if (existing.rows.length === 0) {
    throw Object.assign(new Error('Task not found or not assigned to you'), { status: 404 });
  }
  if (existing.rows[0].status === 'REVOKED') {
    throw Object.assign(new Error('This task was revoked and can no longer change'), { status: 409 });
  }

  await pool.query(
    `UPDATE Task SET status = $1 WHERE task_id = $2 AND assigned_to = $3`,
    [status, taskId, volunteerId]
  );
}

// ── Shelter ──────────────────────────────────────────────────────────────────

export async function getMyShelter(volunteerId, shelterId) {
  const assignment = await pool.query(
    `SELECT s.shelter_id
       FROM VolunteerShelterAssignment vsa
       JOIN Shelter s ON s.shelter_id = vsa.shelter_id
      WHERE vsa.volunteer_id = $1 AND ($2::uuid IS NULL OR s.shelter_id = $2)
      ORDER BY vsa.assigned_at LIMIT 1`,
    [volunteerId, shelterId ?? null]
  );
  if (assignment.rows.length === 0) return null;

  const id = assignment.rows[0].shelter_id;

  const [shelter, inventory, requests, colleagues] = await Promise.all([
    pool.query(
      `SELECT s.shelter_id, s.name, s.address, s.contact_number, s.capacity,
              s.current_occupancy, s.status, s.area_id,
              a.name AS area_name, a.state AS area_state,
              (SELECT count(*)::int FROM Victim vi WHERE vi.shelter_id = s.shelter_id) AS registered_victims
         FROM Shelter s JOIN Area a ON a.area_id = s.area_id WHERE s.shelter_id = $1`,
      [id]
    ),
    pool.query(
      `SELECT r.resource_id, r.name, r.type, r.unit, i.quantity_available, i.last_updated
         FROM Inventory i JOIN Resource r ON r.resource_id = i.resource_id
        WHERE i.shelter_id = $1 ORDER BY r.type, r.name`,
      [id]
    ),
    pool.query(
      `SELECT count(*)::int AS open_requests FROM ResourceRequest
        WHERE shelter_id = $1 AND status IN ('PENDING','APPROVED')`,
      [id]
    ),
    pool.query(
      `SELECT v.volunteer_id, v.name, v.contact_number, v.status
         FROM VolunteerShelterAssignment vsa
         JOIN Volunteer v ON v.volunteer_id = vsa.volunteer_id
        WHERE vsa.shelter_id = $1 AND v.volunteer_id <> $2 ORDER BY v.name`,
      [id, volunteerId]
    ),
  ]);

  const row = shelter.rows[0];
  return {
    ...row,
    available_space: Math.max(0, row.capacity - row.current_occupancy),
    occupancy_rate: row.capacity > 0 ? Math.round((row.current_occupancy / row.capacity) * 100) : 0,
    open_requests: requests.rows[0].open_requests,
    colleagues: colleagues.rows,
    inventory: inventory.rows.map((item) => {
      const days = daysOfCover(item.type, item.quantity_available, row.current_occupancy);
      return { ...item, days_of_cover: days, supply_level: supplyLevel(days) };
    }),
  };
}

// ── Dashboard ────────────────────────────────────────────────────────────────

/**
 * shelterId null means "all my assigned shelters" — and then the dashboard has to
 * report on all of them. Returning only the earliest assignment while the header
 * says "All assigned shelters" hides real problems at the other shelters.
 */
export async function getDashboard(volunteerId, shelterId) {
  const [taskStats, announcements, assigned] = await Promise.all([
    getMyTaskStats(volunteerId, { shelterId }),
    pool.query(
      `SELECT ea.announcement_id, ea.title, ea.message, ea.created_at,
              u.username AS issued_by, de.name AS event_name, de.severity AS event_severity
         FROM EmergencyAnnouncement ea
         JOIN "User" u ON u.user_id = ea.created_by
         LEFT JOIN DisasterEvent de ON de.event_id = ea.event_id
        ORDER BY ea.created_at DESC LIMIT 5`
    ),
    getAssignedShelters(volunteerId),
  ]);

  const targetIds = shelterId ? [shelterId] : assigned.map((s) => s.shelter_id);
  const shelters = (
    await Promise.all(targetIds.map((id) => getMyShelter(volunteerId, id)))
  ).filter(Boolean);

  const emptyResult = {
    shelters: [],
    events: [],
    tasks: { stats: taskStats, upcoming: [] },
    requests: null,
    alerts: [],
    announcements: announcements.rows,
  };
  if (shelters.length === 0) return emptyResult;

  const areaIds = [...new Set(shelters.map((s) => s.area_id))];
  const [events, upcoming] = await Promise.all([
    pool.query(
      `SELECT DISTINCT e.event_id, e.name, e.type, e.severity, e.status, e.start_date
         FROM DisasterEvent e
         JOIN DisasterEventArea dea ON dea.event_id = e.event_id
        WHERE dea.area_id = ANY($1) AND e.status = 'ACTIVE'
        ORDER BY e.severity DESC, e.start_date DESC`,
      [areaIds]
    ),
    listMyTasks(volunteerId, { shelterId }),
  ]);

  const openTasks = upcoming.filter((t) => t.status === 'PENDING' || t.status === 'IN_PROGRESS').slice(0, 5);

  // Name the shelter in the message only when there is more than one on screen,
  // otherwise every alert repeats a name the panel above already shows.
  const nameThem = shelters.length > 1;
  const alerts = shelters.flatMap((s) => buildShelterAlerts(s, nameThem));

  return {
    shelters,
    events: events.rows,
    tasks: { stats: taskStats, upcoming: openTasks },
    requests: { open: shelters.reduce((sum, s) => sum + (s.open_requests ?? 0), 0) },
    alerts,
    announcements: announcements.rows,
  };
}

// Each alert carries where the volunteer should go to act on it, so the banner is a
// shortcut rather than a dead end. shelterId lets the UI switch the active shelter
// first, so the destination page opens already scoped to the shelter at fault.
function buildShelterAlerts(shelter, nameThem) {
  const alerts = [];
  const at = nameThem ? ` at ${shelter.name}` : '';
  const scope = { shelterId: shelter.shelter_id, shelterName: shelter.name };
  const rate = shelter.capacity > 0 ? shelter.current_occupancy / shelter.capacity : 0;

  if (rate >= 1) {
    alerts.push({
      ...scope,
      level: 'CRITICAL',
      message: `Shelter at full capacity${at} — ${shelter.current_occupancy}/${shelter.capacity} places used.`,
      action: { label: 'Open victim register', to: '/volunteer/victims' },
    });
  } else if (rate >= 0.9) {
    alerts.push({
      ...scope,
      level: 'WARNING',
      message: `Shelter overcrowded${at} — ${Math.round(rate * 100)}% occupied, ${shelter.available_space} places left.`,
      action: { label: 'Open victim register', to: '/volunteer/victims' },
    });
  }

  const critical = shelter.inventory.filter((i) => i.supply_level === 'CRITICAL');
  const low = shelter.inventory.filter((i) => i.supply_level === 'LOW');
  if (critical.length > 0) {
    alerts.push({
      ...scope,
      level: 'CRITICAL',
      message: `${critical.length} supply line(s) under 1 day of cover${at}: ${critical.map((i) => i.name).join(', ')}.`,
      action: { label: 'Raise a resource request', to: '/volunteer/requests' },
    });
  }
  if (low.length > 0) {
    alerts.push({
      ...scope,
      level: 'WARNING',
      message: `${low.length} supply line(s) running low${at}: ${low.map((i) => i.name).join(', ')}.`,
      action: { label: 'Raise a resource request', to: '/volunteer/requests' },
    });
  }

  return alerts;
}

// ── Victims ──────────────────────────────────────────────────────────────────

export async function registerVictim(volunteerId, { name, age, gender, shelterId, eventId }) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const asgn = await client.query(
      `SELECT 1 FROM VolunteerShelterAssignment WHERE volunteer_id = $1 AND shelter_id = $2`,
      [volunteerId, shelterId]
    );
    if (asgn.rows.length === 0) {
      throw Object.assign(new Error('You can only register victims at a shelter you are assigned to'), { status: 403 });
    }

    const shl = await client.query(
      `SELECT capacity, current_occupancy, status FROM Shelter WHERE shelter_id = $1 FOR UPDATE`,
      [shelterId]
    );
    if (shl.rows[0].status === 'CLOSED') {
      throw Object.assign(new Error('This shelter is closed and cannot take new arrivals'), { status: 400 });
    }
    if (shl.rows[0].current_occupancy >= shl.rows[0].capacity) {
      throw Object.assign(new Error('This shelter is at full capacity'), { status: 409 });
    }

    const evt = await client.query(`SELECT status FROM DisasterEvent WHERE event_id = $1`, [eventId]);
    if (evt.rows.length === 0) throw Object.assign(new Error('Disaster event not found'), { status: 404 });
    if (evt.rows[0].status === 'RESOLVED') {
      throw Object.assign(new Error('Cannot register victims against a resolved disaster event'), { status: 400 });
    }

    const { rows } = await client.query(
      `INSERT INTO Victim (name, age, gender, shelter_id, event_id, registered_by)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING victim_id, name, age, gender, shelter_id, event_id, registered_at`,
      [name, age ?? null, gender ?? null, shelterId, eventId, volunteerId]
    );

    await client.query(
      `UPDATE Shelter SET current_occupancy = current_occupancy + 1 WHERE shelter_id = $1`,
      [shelterId]
    );

    await client.query('COMMIT');
    return rows[0];
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

// Victim has no status column, so a discharged victim is simply one with no shelter.
// Under the default scope that drops them out of the shelter register, which is the
// point; scope 'mine' still lists them, with a null shelter_name.
export async function listVictims(volunteerId, { shelterId, search, scope } = {}) {
  const params = [volunteerId];
  const conditions = [];

  if (scope === 'mine') {
    conditions.push('v.registered_by = $1');
  } else {
    conditions.push(`v.shelter_id IN (SELECT shelter_id FROM VolunteerShelterAssignment WHERE volunteer_id = $1)`);
  }

  if (shelterId) {
    params.push(shelterId);
    conditions.push(`v.shelter_id = $${params.length}`);
  }
  if (search) {
    params.push(`%${search}%`);
    conditions.push(`v.name ILIKE $${params.length}`);
  }

  const { rows } = await pool.query(
    `SELECT v.victim_id, v.name, v.age, v.gender,
            v.registered_at, v.shelter_id, v.event_id,
            vol.name AS registered_by_name,
            s.name AS shelter_name, e.name AS event_name
       FROM Victim v
       LEFT JOIN Volunteer vol   ON vol.volunteer_id = v.registered_by
       LEFT JOIN Shelter s       ON s.shelter_id     = v.shelter_id
       LEFT JOIN DisasterEvent e ON e.event_id       = v.event_id
      WHERE ${conditions.join(' AND ')}
      ORDER BY v.registered_at DESC`,
    params
  );
  return rows;
}

export async function getVictimStats(volunteerId, { shelterId, scope } = {}) {
  const params = [volunteerId];
  const conditions = [];

  if (scope === 'mine') {
    conditions.push('registered_by = $1');
  } else {
    conditions.push(`shelter_id IN (SELECT shelter_id FROM VolunteerShelterAssignment WHERE volunteer_id = $1)`);
  }

  if (shelterId) {
    params.push(shelterId);
    conditions.push(`shelter_id = $${params.length}`);
  }

  // The status breakdown (checked in / medical / transferred / discharged) came from
  // Victim.status, which the official schema does not have. What is left is who is on
  // the register and how much of it this volunteer put there.
  const { rows } = await pool.query(
    `SELECT
       count(*) FILTER (WHERE registered_by = $1)::int AS registered_by_me,
       count(*)::int                                   AS total
     FROM Victim WHERE ${conditions.join(' AND ')}`,
    params
  );
  return rows[0];
}

// Discharge clears the shelter rather than deleting the Victim row: the registration
// stays on record for the admin event counts and the public victim lookup, and the bed
// is handed back. Without Victim.status this is the only way to leave a shelter.
export async function dischargeVictim(volunteerId, victimId) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const existing = await client.query(
      `SELECT victim_id, shelter_id FROM Victim WHERE victim_id = $1`,
      [victimId]
    );
    if (existing.rows.length === 0) throw Object.assign(new Error('Victim not found'), { status: 404 });

    const victim = existing.rows[0];
    if (!occupiesBed(victim.shelter_id)) {
      throw Object.assign(new Error('This victim has already been discharged'), { status: 409 });
    }

    const asgn = await client.query(
      `SELECT 1 FROM VolunteerShelterAssignment WHERE volunteer_id = $1 AND shelter_id = $2`,
      [volunteerId, victim.shelter_id]
    );
    if (asgn.rows.length === 0) {
      throw Object.assign(new Error('You can only discharge victims at a shelter you are assigned to'), { status: 403 });
    }

    await client.query(
      `UPDATE Shelter SET current_occupancy = GREATEST(0, current_occupancy - 1) WHERE shelter_id = $1`,
      [victim.shelter_id]
    );

    const { rows } = await client.query(
      `UPDATE Victim SET shelter_id = NULL WHERE victim_id = $1
       RETURNING victim_id, name, shelter_id`,
      [victimId]
    );
    await client.query('COMMIT');
    return rows[0];
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function assignVictimToShelter(volunteerId, victimId, shelterId) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const existing = await client.query(
      `SELECT victim_id, name, shelter_id FROM Victim WHERE victim_id = $1`,
      [victimId]
    );
    if (existing.rows.length === 0) throw Object.assign(new Error('Victim not found'), { status: 404 });

    const victim = existing.rows[0];
    if (victim.shelter_id === shelterId) {
      throw Object.assign(new Error('This victim is already at that shelter'), { status: 409 });
    }

    const asgns = await client.query(
      `SELECT shelter_id FROM VolunteerShelterAssignment
        WHERE volunteer_id = $1 AND shelter_id = ANY($2::uuid[])`,
      [volunteerId, [victim.shelter_id, shelterId].filter(Boolean)]
    );
    const covered = new Set(asgns.rows.map((r) => r.shelter_id));
    if (!covered.has(shelterId) || (victim.shelter_id && !covered.has(victim.shelter_id))) {
      throw Object.assign(new Error('You can only move a victim between shelters you are assigned to'), { status: 403 });
    }

    // The victim always takes a bed at the destination, so the destination is checked
    // every time. The source is only given a bed back if they were actually in one —
    // a discharged victim (shelter_id NULL) is being re-admitted, not moved.
    const ids = [victim.shelter_id, shelterId].filter(Boolean).sort();
    const locked = await client.query(
      `SELECT shelter_id, capacity, current_occupancy, status FROM Shelter
        WHERE shelter_id = ANY($1::uuid[]) ORDER BY shelter_id FOR UPDATE`,
      [ids]
    );
    const dest = locked.rows.find((r) => r.shelter_id === shelterId);
    if (dest.status === 'CLOSED') throw Object.assign(new Error('That shelter is closed'), { status: 400 });
    if (dest.current_occupancy >= dest.capacity) throw Object.assign(new Error('That shelter is at full capacity'), { status: 409 });

    if (occupiesBed(victim.shelter_id)) {
      await client.query(
        `UPDATE Shelter SET current_occupancy = GREATEST(0, current_occupancy - 1) WHERE shelter_id = $1`,
        [victim.shelter_id]
      );
    }
    await client.query(
      `UPDATE Shelter SET current_occupancy = current_occupancy + 1 WHERE shelter_id = $1`,
      [shelterId]
    );

    const { rows } = await client.query(
      `UPDATE Victim SET shelter_id = $1 WHERE victim_id = $2 RETURNING victim_id, name, shelter_id`,
      [shelterId, victimId]
    );
    await client.query('COMMIT');
    return rows[0];
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function getAssignedShelters(volunteerId) {
  const { rows } = await pool.query(
    `SELECT s.shelter_id, s.name, s.status, s.capacity, s.current_occupancy
       FROM VolunteerShelterAssignment vsa
       JOIN Shelter s ON s.shelter_id = vsa.shelter_id
      WHERE vsa.volunteer_id = $1 ORDER BY vsa.assigned_at`,
    [volunteerId]
  );
  return rows;
}

export async function getActiveEventsForVolunteer(volunteerId) {
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
