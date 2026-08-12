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
