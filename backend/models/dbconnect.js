import sql from 'mssql';
import config from '../config.js';

const dbConfig = {
  user: config.databaseUser,
  password: config.databasePassword,
  server: config.databaseServer,
  database: config.databaseName,
  options: {
    encrypt: true, // for Azure SQL Database
    trustServerCertificate: config.databaseTrustServerCertificate === 'yes',
  },
  connectionTimeout: parseInt(config.databaseConnectionTimeout, 10)
};

// Initialize Azure SQL Database connection
const poolPromise = sql.connect(dbConfig).then(pool => {
  console.log('Connected to Azure SQL Database');
  return pool;
}).catch(err => {
  console.error('Database connection failed: ', err);
});
export default poolPromise;