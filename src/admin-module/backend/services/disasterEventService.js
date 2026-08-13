import { pool } from '../../../db.js'

const EVENT_STATUS = ['ACTIVE', 'RESOLVED']
const EVENT_TYPES = ['FLOOD', 'LANDSLIDE', 'SEVERE_STORM', 'EARTHQUAKE']

const RESOURCE_TYPES = ['WATER', 'FOOD', 'MEDICINE', 'HYGIENE']

//calc need level from this predetermined ratio (used in breakdwon)
export function needLevelForRatio(ratio) {
  if (ratio > 1) return 'CRITICAL'
  if (ratio > 0.8) return 'HIGH'
  if (ratio > 0.5) return 'MODERATE'
  return 'LOW'
}



async function getDefaultAdminId() {
  const result = await pool.query(
    'SELECT admin_id FROM SystemAdmin ORDER BY name LIMIT 1'
  )
  return result.rows[0]?.admin_id ?? null

}

function mapEvent(row) {
  return {
    id: row.event_id,
    name: row.name,
    description: row.description,
    type: row.type,
    severity: row.severity,
    startDate: row.start_date,
    endDate: row.end_date,
    status: row.status,
    areaCount: Number(row.area_count),
  }

}


// sql for finding the event
const EVENT_SELECT = `
  SELECT e.event_id, e.name, e.description, e.type, e.severity,
         e.start_date, e.end_date, e.status,
         (SELECT count(*) FROM DisasterEventArea dea WHERE dea.event_id = e.event_id) AS area_count
  FROM DisasterEvent e
`


// list 
export async function listDisasterEvents({ status, type, area, date, search } = {}) {
  const conditions = []
  const values = []
  //to make sure of each 
  if (status && EVENT_STATUS.includes(status)) {
    values.push(status)
    conditions.push(`e.status = $${values.length}`)
  }
  if (type && EVENT_TYPES.includes(type)) {
    values.push(type)
    conditions.push(`e.type = $${values.length}`)
  }
  if (area) {
    values.push(area)
    conditions.push(
      `EXISTS (SELECT 1 FROM DisasterEventArea dea WHERE dea.event_id = e.event_id AND dea.area_id = $${values.length})`
    )
  }
  if (date) {
    values.push(date)
    const idx = values.length
    conditions.push(
      `(e.start_date::date <= $${idx} AND (e.end_date IS NULL OR e.end_date::date >= $${idx}))`
    )
  }
  if (search) {
    values.push(`%${search}%`)
    const idx = values.length
    conditions.push(`(e.name ILIKE $${idx} OR e.description ILIKE $${idx})`)
  }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''
  const result = await pool.query(
    `${EVENT_SELECT} ${where} ORDER BY e.start_date DESC`,
    values
  )
  return result.rows.map(mapEvent)
}



export async function getDisasterEventById(eventId) {
  const result = await pool.query(`${EVENT_SELECT} WHERE e.event_id = $1`, [eventId])
  return result.rows[0] ? mapEvent(result.rows[0]) : null
}



export async function createDisasterEvent({
  name,
  description,
  type,
  severity,
  startDate,
  areaIds,
}) {
  //checks
  if (!name) throw new Error('Name is required')
  if (!EVENT_TYPES.includes(type)) throw new Error(`Invalid type "${type}"`)
  if (!['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].includes(severity)) {
    throw new Error(`Invalid severity "${severity}"`)
  }
  if (!Array.isArray(areaIds)) throw new Error('Affected areas are required')

  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const adminId = await getDefaultAdminId()
    const result = await client.query(
      `INSERT INTO DisasterEvent (name, description, type, severity, start_date, status, created_by)
       VALUES ($1, $2, $3, $4, COALESCE($5, CURRENT_TIMESTAMP), 'ACTIVE', $6)
       RETURNING event_id`,
      [name, description ?? null, type, severity, startDate, adminId]
    )
    const eventId = result.rows[0].event_id
    for (const areaId of areaIds) {
      await client.query(
        'INSERT INTO DisasterEventArea (event_id, area_id) VALUES ($1, $2)',
        [eventId, areaId]
      )
    }
    await client.query('COMMIT')
    return getDisasterEventById(eventId)
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
}

// update
export async function updateDisasterEventStatus({ eventId, status, endDate }) {
  if (!EVENT_STATUS.includes(status)) {
    throw new Error(`Invalid status "${status}"`)
  }
  const resolvedOn = status === 'RESOLVED' ? (endDate ?? new Date()) : null
  const result = await pool.query(
    `UPDATE DisasterEvent
     SET status = $1, end_date = $2
     WHERE event_id = $3
     RETURNING event_id`,
    [status, resolvedOn, eventId]
  )
  if (!result.rows.length) throw new Error('Event not found')
  return getDisasterEventById(eventId)
}



// ..:: DISASTER EVENT DASHBOARD ::..
//  find all information for the specific disaster
export async function getDisasterEventDashboard(eventId) {
  const event = await getDisasterEventById(eventId)
  if (!event) return null

  const areasRes = await pool.query(
    `SELECT a.area_id, a.name, a.state,
            (SELECT count(*) FROM Shelter s WHERE s.area_id = a.area_id) AS shelter_count,
            (SELECT count(*) FROM Victim v
             JOIN Shelter s ON s.shelter_id = v.shelter_id
             WHERE s.area_id = a.area_id AND v.event_id = $1) AS victim_count,
            (SELECT COALESCE(SUM(s2.capacity), 0) FROM Shelter s2 WHERE s2.area_id = a.area_id) AS total_capacity,
            (SELECT COALESCE(SUM(s3.current_occupancy), 0) FROM Shelter s3 WHERE s3.area_id = a.area_id) AS total_occupancy
     FROM DisasterEventArea dea
     JOIN Area a ON a.area_id = dea.area_id
     WHERE dea.event_id = $1
     ORDER BY a.name`,
    [eventId]
  )

  const areas = areasRes.rows.map((row) => ({
    id: row.area_id,
    name: row.name,
    state: row.state,
    shelterCount: Number(row.shelter_count),
    victimCount: Number(row.victim_count),
    needLevel: needLevelForRatio(
      row.total_capacity > 0 ? row.total_occupancy / row.total_capacity : 0
    ),
  }))

  const sheltersRes = await pool.query(
    `SELECT s.shelter_id, s.name, s.address, s.contact_number, s.capacity,
            s.current_occupancy, s.status, s.area_id, a.name AS area_name, a.state AS area_state
     FROM Shelter s
     JOIN Area a ON a.area_id = s.area_id
     JOIN DisasterEventArea dea ON dea.area_id = s.area_id
     WHERE dea.event_id = $1
     ORDER BY s.name`,
    [eventId]
  )

  const shelters = sheltersRes.rows.map((row) => ({
    id: row.shelter_id,
    name: row.name,
    address: row.address,
    contact: row.contact_number,
    capacity: Number(row.capacity),
    currentOccupancy: Number(row.current_occupancy),
    status: row.status,
    areaId: row.area_id,
    areaName: row.area_name,
    areaState: row.area_state,
    needLevel: needLevelForRatio(
      row.capacity > 0 ? row.current_occupancy / row.capacity : 0
    ),
  }))

  const availableRes = await pool.query(
    `SELECT r.type, COALESCE(SUM(i.quantity_available), 0) AS available
     FROM DisasterEventArea dea
     JOIN Shelter s ON s.area_id = dea.area_id
     LEFT JOIN Inventory i ON i.shelter_id = s.shelter_id
     LEFT JOIN Resource r ON r.resource_id = i.resource_id
     WHERE dea.event_id = $1
     GROUP BY r.type`,
    [eventId]
  )

  //TODO: ask if i should list detailed requested items or not 
  const requestedRes = await pool.query(
    `SELECT r.type, COALESCE(SUM(ri.quantity), 0) AS requested
     FROM ResourceRequest rq
     JOIN ResourceRequestItem ri ON ri.request_id = rq.request_id
     JOIN Resource r ON r.resource_id = ri.resource_id
     WHERE rq.event_id = $1
     GROUP BY r.type`,
    [eventId]
  )

  const availableByType = {}
  for (const row of availableRes.rows) availableByType[row.type] = Number(row.available)
  const requestedByType = {}
  for (const row of requestedRes.rows) requestedByType[row.type] = Number(row.requested)

  const resourceOverview = RESOURCE_TYPES.map((type) => ({
    type,
    totalAvailable: availableByType[type] ?? 0,
    totalRequested: requestedByType[type] ?? 0,
  }))

  const totalAvailable = resourceOverview.reduce((sum, r) => sum + r.totalAvailable, 0)
  const totalRequested = resourceOverview.reduce((sum, r) => sum + r.totalRequested, 0)
  const resourceCoverage =
    totalAvailable + totalRequested > 0
      ? Math.round((totalAvailable / (totalAvailable + totalRequested)) * 100)
      : 100

  const victimRes = await pool.query(
    'SELECT count(*) AS total FROM Victim WHERE event_id = $1',
    [eventId]
  )

  return {
    event,
    overview: {
      affectedAreas: areas.length,
      activeShelters: shelters.filter((s) => s.status === 'OPEN').length,
      totalVictims: Number(victimRes.rows[0].total),
      resourceCoverage,
    },
    areas,
    shelters,
    resourceOverview,
  }
}




export async function getAreaDetail(areaId, eventId) {
  const areaRes = await pool.query(
    `SELECT a.area_id, a.name, a.state,
            (SELECT count(*) FROM Shelter s WHERE s.area_id = a.area_id) AS shelter_count,
            (SELECT count(*) FROM Victim v
             JOIN Shelter s ON s.shelter_id = v.shelter_id
             WHERE s.area_id = a.area_id AND v.event_id = $2) AS victim_count,
            (SELECT COALESCE(SUM(s2.capacity), 0) FROM Shelter s2 WHERE s2.area_id = a.area_id) AS total_capacity,
            (SELECT COALESCE(SUM(s3.current_occupancy), 0) FROM Shelter s3 WHERE s3.area_id = a.area_id) AS total_occupancy
     FROM Area a
     WHERE a.area_id = $1`,
    [areaId, eventId]
  )
  if (!areaRes.rows.length) return null
  const area = areaRes.rows[0]

  const sheltersRes = await pool.query(
    `SELECT s.shelter_id, s.name, s.capacity, s.current_occupancy, s.status
     FROM Shelter s
     WHERE s.area_id = $1
       AND EXISTS (SELECT 1 FROM DisasterEventArea dea WHERE dea.area_id = $1 AND dea.event_id = $2)
     ORDER BY s.name`,
    [areaId, eventId]
  )


  const shelters = sheltersRes.rows.map((row) => ({
    id: row.shelter_id,
    name: row.name,
    capacity: Number(row.capacity),
    currentOccupancy: Number(row.current_occupancy),
    status: row.status,
    needLevel: needLevelForRatio(
      row.capacity > 0 ? row.current_occupancy / row.capacity : 0
    ),
  }))

  const needBreakdown = { LOW: 0, MODERATE: 0, HIGH: 0, CRITICAL: 0 }
  for (const s of shelters) needBreakdown[s.needLevel] += 1

  const inventory = await getAreaInventorySummary(areaId, eventId)



  return {
    area: {
      id: area.area_id,
      name: area.name,
      state: area.state,
      needLevel: needLevelForRatio(
        area.total_capacity > 0 ? area.total_occupancy / area.total_capacity : 0
      ),
    },
    stats: {
      shelterCount: Number(area.shelter_count),
      victimCount: Number(area.victim_count),
    },
    shelters,
    inventory,
    needBreakdown,
  }
}

async function getAreaInventorySummary(areaId, eventId) {
  const availableRes = await pool.query(
    `SELECT r.type, COALESCE(SUM(i.quantity_available), 0) AS available
     FROM Shelter s
     JOIN Inventory i ON i.shelter_id = s.shelter_id
     JOIN Resource r ON r.resource_id = i.resource_id
     WHERE s.area_id = $1
       AND EXISTS (SELECT 1 FROM DisasterEventArea dea
                   WHERE dea.area_id = s.area_id AND dea.event_id = $2)
     GROUP BY r.type`,
    [areaId, eventId]
  )
  const requestedRes = await pool.query(
    `SELECT r.type, COALESCE(SUM(ri.quantity), 0) AS requested
     FROM Shelter s
     JOIN ResourceRequest rq ON rq.shelter_id = s.shelter_id
     JOIN ResourceRequestItem ri ON ri.request_id = rq.request_id
     JOIN Resource r ON r.resource_id = ri.resource_id
     WHERE s.area_id = $1 AND rq.event_id = $2
     GROUP BY r.type`,
    [areaId, eventId]
  )

  const availableByType = {}
  for (const row of availableRes.rows) availableByType[row.type] = Number(row.available)
  const requestedByType = {}
  for (const row of requestedRes.rows) requestedByType[row.type] = Number(row.requested)
  return RESOURCE_TYPES.map((type) => ({
    type,
    available: availableByType[type] ?? 0,
    requested: requestedByType[type] ?? 0,
  }))
}



export async function getShelterDetail(shelterId, eventId) {
  const shelterRes = await pool.query(
    `SELECT s.shelter_id, s.name, s.address, s.contact_number, s.capacity,
            s.current_occupancy, s.status, s.area_id, a.name AS area_name, a.state AS area_state
     FROM Shelter s
     JOIN Area a ON a.area_id = s.area_id
     WHERE s.shelter_id = $1`,
    [shelterId]
  )
  if (!shelterRes.rows.length) return null
  const row = shelterRes.rows[0]

  const victimRes = await pool.query(
    'SELECT count(*) AS total FROM Victim WHERE shelter_id = $1 AND event_id = $2',
    [shelterId, eventId]
  )

  const inventoryRes = await pool.query(
    `SELECT i.resource_id, r.name, r.unit, r.type, i.quantity_available AS available
     FROM Inventory i
     JOIN Resource r ON r.resource_id = i.resource_id
     WHERE i.shelter_id = $1
     ORDER BY r.name`,
    [shelterId]
  )

  const requestedRes = await pool.query(
    `SELECT ri.resource_id, SUM(ri.quantity) AS requested
     FROM ResourceRequest rq
     JOIN ResourceRequestItem ri ON ri.request_id = rq.request_id
     WHERE rq.shelter_id = $1 AND rq.event_id = $2
     GROUP BY ri.resource_id`,
    [shelterId, eventId]
  )
  const requestedByResource = {}
  for (const r of requestedRes.rows) requestedByResource[r.resource_id] = Number(r.requested)

  const inventory = inventoryRes.rows.map((item) => ({
    resourceId: item.resource_id,
    name: item.name,
    unit: item.unit,
    type: item.type,
    available: Number(item.available),
    requested: requestedByResource[item.resource_id] ?? 0,
  }))

  const requestsRes = await pool.query(
    `SELECT rq.request_id, rq.status, rq.created_at
     FROM ResourceRequest rq
     WHERE rq.shelter_id = $1 AND rq.event_id = $2
     ORDER BY rq.created_at DESC`,
    [shelterId, eventId]

  )
  const requests = []

  for (const req of requestsRes.rows) {
    const itemsRes = await pool.query(
      `SELECT ri.quantity, r.name, r.unit
       FROM ResourceRequestItem ri
       JOIN Resource r ON r.resource_id = ri.resource_id
       WHERE ri.request_id = $1`,
      [req.request_id]
    )
    requests.push({
      id: req.request_id,
      status: req.status,
      createdAt: req.created_at,
      items: itemsRes.rows.map((it) => ({
        name: it.name,
        unit: it.unit,
        quantity: Number(it.quantity),
      })),
    })
  }

  return {

    shelter: {
      id: row.shelter_id,
      name: row.name,
      address: row.address,
      contact: row.contact_number,
      capacity: Number(row.capacity),
      currentOccupancy: Number(row.current_occupancy),
      status: row.status,
      areaName: row.area_name,
      areaState: row.area_state,
      needLevel: needLevelForRatio(
        row.capacity > 0 ? row.current_occupancy / row.capacity : 0
      ),
    },
    victimCount: Number(victimRes.rows[0].total),
    inventory,
    requests,
  }
}
