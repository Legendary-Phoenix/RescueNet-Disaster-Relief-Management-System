//changed to not have a detailed breakdwno


import { pool } from '../../../db.js'

const SHELTER_STATUS = ['OPEN', 'CLOSED']



async function getDefaultAdminId() {
  const result = await pool.query(
    'SELECT admin_id FROM SystemAdmin ORDER BY name LIMIT 1'
  )
  return result.rows[0]?.admin_id ?? null
}

function mapShelter(row) {
  return {
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
  }
}

const SHELTER_SELECT = `
  SELECT s.shelter_id, s.name, s.address, s.contact_number, s.capacity,
         s.current_occupancy, s.status, s.area_id, a.name AS area_name, a.state AS area_state
  FROM Shelter s
  JOIN Area a ON a.area_id = s.area_id
`

//list with searhc
export async function listShelters({ search } = {}) {
  const values = []
  let where = ''
  if (search) {
    values.push(`%${search}%`)
    where = `WHERE (s.name ILIKE $1 OR s.address ILIKE $1 OR s.contact_number ILIKE $1)`
  }
  const result = await pool.query(`${SHELTER_SELECT} ${where} ORDER BY s.name`, values)
  return result.rows.map(mapShelter)
}

export async function getShelterById(shelterId) {
  const result = await pool.query(`${SHELTER_SELECT} WHERE s.shelter_id = $1`, [shelterId])

  return result.rows[0] ? mapShelter(result.rows[0]) : null
}

export async function createShelter({
  name,
  address,
  contactNumber,
  capacity,
  status,
  areaId,
}) {
  //checks
  if (!name) throw new Error('Name is required')
  if (!SHELTER_STATUS.includes(status)) throw new Error(`Invalid status "${status}"`)
  if (!areaId) throw new Error('Area is required')

  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const adminId = await getDefaultAdminId()
    const result = await client.query(
      `INSERT INTO Shelter (name, address, contact_number, capacity, current_occupancy, status, area_id, created_by)
       VALUES ($1, $2, $3, $4, 0, $5, $6, $7)
       RETURNING shelter_id`,
      [name, address ?? null, contactNumber ?? null, capacity ?? 0, status, areaId, adminId]
    )
    await client.query('COMMIT')
    return getShelterById(result.rows[0].shelter_id)
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
}



export async function updateShelter({
  shelterId,
  name,
  address,
  contactNumber,
  capacity,
  status,
  areaId,
}) {
  //checks
  if (!name) throw new Error('Name is required')
  if (!SHELTER_STATUS.includes(status)) throw new Error(`Invalid status "${status}"`)
  if (!areaId) throw new Error('Area is required')

  const result = await pool.query(
    `UPDATE Shelter
     SET name = $1, address = $2, contact_number = $3, capacity = $4, status = $5, area_id = $6
     WHERE shelter_id = $7
     RETURNING shelter_id`,
    [name, address ?? null, contactNumber ?? null, capacity ?? 0, status, areaId, shelterId]
  )
  if (!result.rows.length) throw new Error('Shelter not found')
  return getShelterById(shelterId)
}

// deletion needswork
export async function deleteShelter(shelterId) {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    await client.query(
      `DELETE FROM ResourceRequestItem
       WHERE request_id IN (SELECT request_id FROM ResourceRequest WHERE shelter_id = $1)`,
      [shelterId]
    )
    // TODO: check how other member handle the query
    await client.query('DELETE FROM ResourceRequest WHERE shelter_id = $1', [shelterId])
    await client.query('DELETE FROM Inventory WHERE shelter_id = $1', [shelterId])
    await client.query('DELETE FROM VolunteerShelterAssignment WHERE shelter_id = $1', [shelterId])
    await client.query('DELETE FROM Victim WHERE shelter_id = $1', [shelterId])
    await client.query('DELETE FROM Task WHERE shelter_id = $1', [shelterId])
    const result = await client.query(
      'DELETE FROM Shelter WHERE shelter_id = $1 RETURNING shelter_id',
      [shelterId]
    )
    await client.query('COMMIT')
    if (!result.rows.length) throw new Error('Shelter not found')
    return { id: shelterId }
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
}
