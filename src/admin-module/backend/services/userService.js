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

const GENDERS = ['MALE', 'FEMALE']

const ROLE_CONFIG = {
  ADMIN: { table: 'systemadmin', idColumn: 'admin_id' },
  RELIEF_ORG: { table: 'relieforganization', idColumn: 'org_id' },
  VOLUNTEER: { table: 'volunteer', idColumn: 'volunteer_id' },
  PUBLIC: { table: 'publicuser', idColumn: 'user_id' },
}

function mapRow(row) {
  return {
    id: row.user_id,
    username: row.username,
    name: row.name ?? null,
    role: row.role,
    contactNumber: row.contact_number ?? null,
    age: row.age ?? null,
    gender: row.gender ?? null,
    organizationId: row.organization_id ?? null,
    address: row.address ?? null,
    createdAt: row.created_at,
  }
}

const SELECT_QUERY = `
  SELECT u.user_id, u.username, u.role, u.created_at,
         COALESCE(sa.name, ro.name, v.name, pu.name) AS name,
         COALESCE(sa.contact_number, ro.contact_number, v.contact_number, pu.contact_number) AS contact_number,
         COALESCE(v.age, pu.age) AS age,
         COALESCE(v.gender, pu.gender) AS gender,
         v.organization_id,
         ro.address
  FROM "User" u
  LEFT JOIN systemadmin sa ON sa.admin_id = u.user_id
  LEFT JOIN relieforganization ro ON ro.org_id = u.user_id
  LEFT JOIN volunteer v ON v.volunteer_id = u.user_id
  LEFT JOIN publicuser pu ON pu.user_id = u.user_id
`


//list 
export async function listUsers({ search } = {}) {
  const values = []
  let where = ''
  if (search) {
    values.push(`%${search}%`)
    where = `WHERE (u.username ILIKE $1 OR u.role::text ILIKE $1)`
  }
  const result = await pool.query(
    `${SELECT_QUERY} ${where} ORDER BY u.created_at DESC, u.username`,
    values
  )
  return result.rows.map(mapRow)
}

export async function getUserById(userId) {
  const result = await pool.query(`${SELECT_QUERY} WHERE u.user_id = $1`, [userId])
  return result.rows[0] ? mapRow(result.rows[0]) : null
}

function normalizeProfile({ name, contactNumber, age, gender, organizationId, address }) {
  if (!name) throw new Error('Name is required')

  let ageNum = null
  if (age !== '' && age !== null && age !== undefined) {
    ageNum = Number(age)
    if (Number.isNaN(ageNum)) throw new Error('Age must be a number')
  }

  let genderVal = gender
  if (genderVal === '' || genderVal === null || genderVal === undefined) {
    genderVal = null
  } else if (!GENDERS.includes(genderVal)) {
    throw new Error(`Invalid gender "${genderVal}"`)
  }

  return {
    name,
    contactNumber: contactNumber || null,
    age: ageNum,
    gender: genderVal,
    organizationId: organizationId || null,
    address: address || null,
  }
}


//insert the real role
async function insertRoleRow(client, userId, role, profile) {
  const { table, idColumn } = ROLE_CONFIG[role]
  let columns
  let values
  switch (role) {
    case 'ADMIN':
      columns = [idColumn, 'name', 'contact_number']
      values = [userId, profile.name, profile.contactNumber]
      break
    case 'RELIEF_ORG':
      columns = [idColumn, 'name', 'address', 'contact_number']
      values = [userId, profile.name, profile.address, profile.contactNumber]
      break
    case 'VOLUNTEER':
      columns = [idColumn, 'name', 'age', 'gender', 'contact_number', 'organization_id']
      values = [
        userId,
        profile.name,
        profile.age,
        profile.gender,
        profile.contactNumber,
        profile.organizationId,
      ]
      break
    case 'PUBLIC':
      columns = [idColumn, 'name', 'age', 'gender', 'contact_number']
      values = [userId, profile.name, profile.age, profile.gender, profile.contactNumber]
      break
    default:
      throw new Error(`Invalid role "${role}"`)
  }
  await client.query(
    `INSERT INTO "${table}" (${columns.join(', ')}) VALUES (${columns
      .map((_, i) => `$${i + 1}`)
      .join(', ')})`,
    values
  )
}

//should allow for roles to update as well
async function updateRoleRow(client, userId, role, profile) {
  const { table, idColumn } = ROLE_CONFIG[role]
  let sets
  let values
  switch (role) {
    case 'ADMIN':
      sets = 'name = $1, contact_number = $2'
      values = [profile.name, profile.contactNumber, userId]
      break
    case 'RELIEF_ORG':
      sets = 'name = $1, address = $2, contact_number = $3'
      values = [profile.name, profile.address, profile.contactNumber, userId]
      break
    case 'VOLUNTEER':
      sets = 'name = $1, age = $2, gender = $3, contact_number = $4, organization_id = $5'
      values = [
        profile.name,
        profile.age,
        profile.gender,
        profile.contactNumber,
        profile.organizationId,
        userId,
      ]
      break
    case 'PUBLIC':
      sets = 'name = $1, age = $2, gender = $3, contact_number = $4'
      values = [profile.name, profile.age, profile.gender, profile.contactNumber, userId]
      break
    default:
      throw new Error(`Invalid role "${role}"`)
  }
  const result = await client.query(
    `UPDATE "${table}" SET ${sets} WHERE ${idColumn} = $${values.length}`,
    values
  )
  return result.rowCount
}

export async function createUser({
  username,
  password,
  role,
  name,
  contactNumber,
  age,
  gender,
  organizationId,
  address,
}) {
  if (!username) throw new Error('Username is required')
  if (!password) throw new Error('Password is required')
  if (!ROLES.includes(role)) throw new Error(`Invalid role "${role}"`)

  const profile = normalizeProfile({ name, contactNumber, age, gender, organizationId, address })

  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    const existing = await client.query('SELECT 1 FROM "User" WHERE username = $1', [username])
    if (existing.rows.length) throw new Error('Username already exists')

    const result = await client.query(
      `INSERT INTO "User" (username, password, role) VALUES ($1, $2, $3) RETURNING user_id`,
      [username, password, role]
    )
    const userId = result.rows[0].user_id

    await insertRoleRow(client, userId, role, profile)

    await client.query('COMMIT')
    return getUserById(userId)
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
}

//UPDATE
export async function updateUser({
  userId,
  username,
  role,
  password,
  name,
  contactNumber,
  age,
  gender,
  organizationId,
  address,
}) {
  if (!username) throw new Error('Username is required')
  if (!ROLES.includes(role)) throw new Error(`Invalid role "${role}"`)

  const profile = normalizeProfile({ name, contactNumber, age, gender, organizationId, address })

  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    const existing = await client.query(
      'SELECT 1 FROM "User" WHERE username = $1 AND user_id <> $2',
      [username, userId]
    )
    if (existing.rows.length) throw new Error('Username already exists')

    const current = await client.query('SELECT role FROM "User" WHERE user_id = $1', [userId])
    if (!current.rows.length) throw new Error('User not found')
    const currentRole = current.rows[0].role

    const result = await client.query(
      `UPDATE "User"
       SET username = $1, role = $2, password = COALESCE($3, password)
       WHERE user_id = $4
       RETURNING user_id`,
      [username, role, password || null, userId]
    )
    if (!result.rows.length) throw new Error('User not found')

    if (role !== currentRole) {
      const old = ROLE_CONFIG[currentRole]
      if (old) {
        await client.query(`DELETE FROM "${old.table}" WHERE ${old.idColumn} = $1`, [userId])
      }
      await insertRoleRow(client, userId, role, profile)
    } else {
      const updated = await updateRoleRow(client, userId, role, profile)
      if (!updated) {
        await insertRoleRow(client, userId, role, profile)
      }
    }

    await client.query('COMMIT')
    return getUserById(userId)
  } catch (err) {
    await client.query('ROLLBACK')
    if (err.code === '23503') {
      throw new Error(
        'Cannot change this user — they are referenced by other records.',
        { cause: err }
      )
    }
    throw err
  } finally {
    client.release()
  }
}


//deletioin should now support
export async function deleteUser(userId) {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const userRes = await client.query('SELECT role FROM "User" WHERE user_id = $1', [userId])
    if (!userRes.rows.length) throw new Error('User not found')
    const roleConfig = ROLE_CONFIG[userRes.rows[0].role]
    if (roleConfig) {
      await client.query(
        `DELETE FROM "${roleConfig.table}" WHERE ${roleConfig.idColumn} = $1`,
        [userId]
      )
    }
    await client.query('DELETE FROM "User" WHERE user_id = $1', [userId])
    await client.query('COMMIT')
    return { id: userId }
  } catch (err) {
    await client.query('ROLLBACK')
    //this should still catch any errors that are from FKs being in  other records
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
