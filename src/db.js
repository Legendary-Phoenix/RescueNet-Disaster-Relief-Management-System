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

export { pool };