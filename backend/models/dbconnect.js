import pg from 'pg';
const { Pool } = pg;
import config from '../config.js';

const pool = new Pool({
  user: config.databaseUser,
  host: config.databaseHost,
  database: config.databaseName,
  password: config.databasePassword,
  port: config.databasePort
});

pool.connect()
  .then(() => console.log('Connected to PostgreSQL on Docker'))
  .catch(err => {
    console.error('Connection error:', err.message);
    console.error('Full error stack:', err.stack);
  });

export default pool;