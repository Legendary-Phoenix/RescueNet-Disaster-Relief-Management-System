import { pool } from '../../../db.js'



async function getDefaultAdminId() {
  const result = await pool.query(
    'SELECT admin_id FROM SystemAdmin ORDER BY name LIMIT 1'
  )
  return result.rows[0]?.admin_id ?? null
}

function mapAnnouncement(row) {
  return {
    id: row.announcement_id,
    title: row.title,
    message: row.message,
    createdAt: row.created_at,
    eventId: row.event_id,
    eventName: row.event_name,
  }
}

const ANNOUNCEMENT_SELECT = `
  SELECT ea.announcement_id, ea.title, ea.message, ea.created_at, ea.event_id,
         de.name AS event_name
  FROM EmergencyAnnouncement ea
  LEFT JOIN DisasterEvent de ON de.event_id = ea.event_id
`

//list with search
export async function listAnnouncements({ search, eventId } = {}) {
  const conditions = []
  const values = []
  if (search) {
    values.push(`%${search}%`)
    conditions.push(`ea.title ILIKE $${values.length}`)
  }
  if (eventId) {
    values.push(eventId)
    conditions.push(`ea.event_id = $${values.length}`)
  }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''
  const result = await pool.query(
    `${ANNOUNCEMENT_SELECT} ${where} ORDER BY ea.created_at DESC`,
    values
  )
  return result.rows.map(mapAnnouncement)
}

export async function getAnnouncementById(announcementId) {
  const result = await pool.query(
    `${ANNOUNCEMENT_SELECT} WHERE ea.announcement_id = $1`,
    [announcementId]
  )
  return result.rows[0] ? mapAnnouncement(result.rows[0]) : null
}

export async function createAnnouncement({ title, message, eventId }) {
  //checks
  if (!title) throw new Error('Title is required')
  if (!message) throw new Error('Message is required')

  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const adminId = await getDefaultAdminId()
    const result = await client.query(
      `INSERT INTO EmergencyAnnouncement (title, message, created_by, event_id)
       VALUES ($1, $2, $3, $4)
       RETURNING announcement_id`,
      [title, message, adminId, eventId || null]
    )
    await client.query('COMMIT')
    return getAnnouncementById(result.rows[0].announcement_id)
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
}



export async function updateAnnouncement({ announcementId, title, message, eventId }) {
  //checks
  if (!title) throw new Error('Title is required')
  if (!message) throw new Error('Message is required')

  const result = await pool.query(
    `UPDATE EmergencyAnnouncement
     SET title = $1, message = $2, event_id = $3
     WHERE announcement_id = $4
     RETURNING announcement_id`,
    [title, message, eventId || null, announcementId]
  )
  if (!result.rows.length) throw new Error('Announcement not found')
  return getAnnouncementById(announcementId)
}

export async function deleteAnnouncement(announcementId) {
  const result = await pool.query(
    'DELETE FROM EmergencyAnnouncement WHERE announcement_id = $1 RETURNING announcement_id',
    [announcementId]
  )
  if (!result.rows.length) throw new Error('Announcement not found')
  return { id: announcementId }
}
