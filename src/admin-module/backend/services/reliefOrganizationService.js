import { pool } from '../../../db.js'


// check db schema
// revoked vs rejected
const STATUS_VALUES = ['PENDING', 'APPROVED', 'REJECTED', 'REVOKED']

function mapRow(row) {
  return {
    id: row.org_id,
    name: row.name,
    address: row.address,
    contact: row.contact_number,
    status: row.status,
    approvedBy: row.approved_by
      ? { id: row.approved_by, name: row.approved_by_name }
      : null,
  }
}

const SELECT_QUERY = `
  SELECT ro.org_id, ro.name, ro.address, ro.contact_number, ro.status,
         ro.approved_by, sa.name AS approved_by_name
  FROM ReliefOrganization ro
  LEFT JOIN SystemAdmin sa ON sa.admin_id = ro.approved_by
`



export async function getReliefOrganizations({ status, search } = {}) {
  const conditions = []
  const values = []
  if (status && STATUS_VALUES.includes(status)) {
    values.push(status)
    conditions.push(`ro.status = $${values.length}`)
  }
  if (search) {
    values.push(`%${search}%`)
    const idx = values.length
    conditions.push(
      `(ro.name ILIKE $${idx} OR ro.address ILIKE $${idx} OR ro.contact_number ILIKE $${idx})`
    )
  }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''
  const result = await pool.query(
    `${SELECT_QUERY} ${where} ORDER BY ro.name`,
    values
  )
  return result.rows.map(mapRow)
}

export async function getReliefOrganizationById(orgId) {
  const result = await pool.query(`${SELECT_QUERY} WHERE ro.org_id = $1`, [orgId])
  // return via mapped row instead
  return result.rows[0] ? mapRow(result.rows[0]) : null
}

export async function updateReliefOrganizationStatus({ orgId, status, adminId }) {
  if (!STATUS_VALUES.includes(status)) {
    throw new Error(`Invalid status "${status}"`)
  }


  if (status === 'APPROVED') {
    if (!adminId) {
      // sql LIMIT keyword didnt work llast time
      const admin = await pool.query(
        'SELECT admin_id FROM SystemAdmin ORDER BY name LIMIT 1'
      )
      adminId = admin.rows[0]?.admin_id ?? null
    }
  } else {
    adminId = null
  }



  const result = await pool.query(
    `UPDATE ReliefOrganization
     SET status = $1, approved_by = $2
     WHERE org_id = $3
     RETURNING org_id`,
    [status, adminId, orgId]
  )

  if (!result.rows.length) {
    throw new Error('Organization not found')
  }

  const full = await pool.query(`${SELECT_QUERY} WHERE ro.org_id = $1`, [orgId])
  return mapRow(full.rows[0])
}
