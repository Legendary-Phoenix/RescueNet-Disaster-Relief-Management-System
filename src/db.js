import pg from 'pg';

const pool = new pg.Pool({
    host: process.env.DBHOST,
    port: parseInt(process.env.DBPORT),
    database: process.env.DBNAME,
    user: process.env.USER,
    password: process.env.PASSWORD,
    ssl: {
        rejectUnauthorized: false
    }
});

export default pool;
export { pool };