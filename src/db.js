import pg from 'pg';
import dotenv from 'dotenv';

const env = dotenv.config().parsed;

const pool = new pg.Pool({
  host: env.DBHOST,
  port: parseInt(env.PORT),
  database: env.DBNAME,
  user: env.USER,
  password: env.PASSWORD,
});

export default pool;
