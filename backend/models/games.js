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

// Function to save game result
const saveGameResult = async (whitePlayer, blackPlayer, winner, loser, gameState, cb) => {
  try {
    const pool = await poolPromise;
    await pool.request()
      .input('whitePlayer', sql.VarChar, whitePlayer)
      .input('blackPlayer', sql.VarChar, blackPlayer)
      .input('winner', sql.VarChar, winner)
      .input('loser', sql.VarChar, loser)
      .input('gameState', sql.VarChar, gameState)
      .query('INSERT INTO game_history (white_player, black_player, winner, loser, game_state) VALUES (@whitePlayer, @blackPlayer, @winner, @loser, @gameState)');
    cb(null);
  } catch (err) {
    cb(err);
  }
};

// Function to get all game histories
const getAllGameHistories = async (cb) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request().query('SELECT * FROM game_history');
    cb(null, result.recordset);
  } catch (err) {
    cb(err, null);
  }
};

// Function to get a game history by ID
const getGameHistoryById = async (id, cb) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request()
      .input('id', sql.Int, id)
      .query('SELECT * FROM game_history WHERE id = @id');
    cb(null, result.recordset[0]);
  } catch (err) {
    cb(err, null);
  }
};

const getGamesByUserId = async (userId, cb) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request()
      .input('userId', sql.VarChar, userId)
      .query(`
        SELECT gh.*, wu.name as white_username, bu.name as black_username
        FROM game_history gh
        LEFT JOIN [user] wu ON gh.white_player = wu.id
        LEFT JOIN [user] bu ON gh.black_player = bu.id
        WHERE gh.white_player = @userId OR gh.black_player = @userId
      `);
    cb(null, result.recordset);
  } catch (err) {
    console.error('Error fetching games for user:', err.message);
    cb(err, null);
  }
};



export { saveGameResult, getAllGameHistories, getGameHistoryById, getGamesByUserId };
