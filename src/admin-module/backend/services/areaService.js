import { pool } from '../../../db.js'





export async function listAreas() {
  const result = await pool.query(
    'SELECT area_id, name, state FROM Area ORDER BY state, name'
  )
  return result.rows.map((row) => ({
    id: row.area_id,
    name: row.name,
    state: row.state,
  })
  )
}
