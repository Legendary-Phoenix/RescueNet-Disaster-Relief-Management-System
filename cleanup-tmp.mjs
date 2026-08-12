import dotenv from 'dotenv'
import pg from 'pg'

dotenv.config({ override: true })

const pool = new pg.Pool({
  host: process.env.DBHOST,
  port: Number(process.env.PORT),
  database: process.env.DBNAME,
  user: process.env.USER,
  password: process.env.PASSWORD,
})

const res = await pool.query(
  `DELETE FROM DisasterEventArea WHERE event_id IN
   (SELECT event_id FROM DisasterEvent WHERE name LIKE 'Test %')
   RETURNING event_id`
)
const del = await pool.query(
  `DELETE FROM DisasterEvent WHERE name LIKE 'Test %' RETURNING name`
)
console.log('area links deleted:', res.rowCount)
console.log('events deleted:', del.rows)

await pool.end()
