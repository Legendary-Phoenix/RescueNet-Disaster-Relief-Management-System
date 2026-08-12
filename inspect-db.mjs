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

const tables = await pool.query(
  `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'`
)
console.log('TABLES:', tables.rows)

for (const { table_name } of tables.rows) {
  if (/organization|org/i.test(table_name)) {
    const cols = await pool.query(
      `SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = $1`,
      [table_name]
    )
    console.log(`COLUMNS of ${table_name}:`, cols.rows.map((r) => r.column_name))
    const sample = await pool.query(`SELECT * FROM ${table_name} LIMIT 3`)
    console.log(`SAMPLE of ${table_name}:`, JSON.stringify(sample.rows, null, 2))
  }
}

await pool.end()
