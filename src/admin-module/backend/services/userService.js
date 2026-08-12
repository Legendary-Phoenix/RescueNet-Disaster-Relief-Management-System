import pg from 'pg'
import dotenv from 'dotenv'

dotenv.config()

const pool = new pg.Pool({
  host: process.env.DBHOST,
  port: Number(process.env.PORT),
  database: process.env.DBNAME,
  user: process.env.USER,
  password: process.env.PASSWORD,
})

const ROLES = ['ADMIN', 'RELIEF_ORG', 'VOLUNTEER', 'PUBLIC']

const ROLE_TABLE = {
  ADMIN: 'systemadmin',
  RELIEF_ORG: 'relieforganization',
  VOLUNTEER: 'volunteer',
  PUBLIC: 'publicuser',
}

function mapRow(row) {
  return {
    id: row.user_id,
    username: row.username,
    role: row.role,
    createdAt: row.created_at,
  }
}

const SELECT_QUERY = `
  SELECT user_id, username, role, created_at
  FROM "User"
`

export async function listUsers({ search } = {}) {
  const values = []
  let where = ''
  if (search) {
    values.push(`%${search}%`)
    where = `WHERE (username ILIKE $1 OR role::text ILIKE $1)`
  }
  const result = await pool.query(
    `${SELECT_QUERY} ${where} ORDER BY created_at DESC, username`,
    values
  )
  return result.rows.map(mapRow)
}

export async function getUserById(userId) {
  const result = await pool.query(`${SELECT_QUERY} WHERE user_id = $1`, [userId])
  return result.rows[0] ? mapRow(result.rows[0]) : null
}

export async function createUser({ username, password, role }) {
  if (!username) throw new Error('Username is required')
  if (!password) throw new Error('Password is required')
  if (!ROLES.includes(role)) throw new Error(`Invalid role "${role}"`)

  const existing = await pool.query('SELECT 1 FROM "User" WHERE username = $1', [username])
  if (existing.rows.length) throw new Error('Username already exists')

  const result = await pool.query(
    `INSERT INTO "User" (username, password, role) VALUES ($1, $2, $3) RETURNING user_id`,
    [username, password, role]
  )
  return getUserById(result.rows[0].user_id)
}

export async function updateUser({ userId, username, role, password }) {
  if (!username) throw new Error('Username is required')
  if (!ROLES.includes(role)) throw new Error(`Invalid role "${role}"`)

  const existing = await pool.query(
    'SELECT 1 FROM "User" WHERE username = $1 AND user_id <> $2',
    [username, userId]
  )
  if (existing.rows.length) throw new Error('Username already exists')

  const result = await pool.query(
    `UPDATE "User"
     SET username = $1, role = $2, password = COALESCE($3, password)
     WHERE user_id = $4
     RETURNING user_id`,
    [username, role, password || null, userId]
  )
  if (!result.rows.length) throw new Error('User not found')
  return getUserById(userId)
}

export async function deleteUser(userId) {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const userRes = await client.query('SELECT role FROM "User" WHERE user_id = $1', [userId])
    if (!userRes.rows.length) throw new Error('User not found')
    const roleTable = ROLE_TABLE[userRes.rows[0].role]
    if (roleTable) {
      await client.query(`DELETE FROM "${roleTable}" WHERE user_id = $1`, [userId])
    }
    await client.query('DELETE FROM "User" WHERE user_id = $1', [userId])
    await client.query('COMMIT')
    return { id: userId }
  } catch (err) {
    await client.query('ROLLBACK')
    if (err.code === '23503') {
      throw new Error(
        'Cannot delete this user — they are referenced by other records.',
        { cause: err }
      )
    }
    throw err
  } finally {
    client.release()
  }
}
