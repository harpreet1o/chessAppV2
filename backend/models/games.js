import poolPromise from "./dbconnect.js";
// Function to save game result
import sql from 'mssql';
const saveGameResult = async (whitePlayer, blackPlayer, result, message, gameState) => {
  try {
    const pool = await poolPromise;
    await pool.request()
      .input('whitePlayer', sql.VarChar, whitePlayer)
      .input('blackPlayer', sql.VarChar, blackPlayer)
      .input('result', sql.VarChar, result)
      .input('message', sql.VarChar, message) // Add message input
      .input('gameState', sql.VarChar(sql.MAX), gameState) // Use VARCHAR(MAX) for large text data
      .query(`
        INSERT INTO game (white_player, black_player, result, message, game_state)
        VALUES (@whitePlayer, @blackPlayer, @result, @message, @gameState)
      `);
  } catch (err) {
    console.error('Error saving game result:', err.message);
  }
};


// Function to get all game histories
const getAllGameHistories = async (cb) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request().query('SELECT * FROM game');
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
      .query('SELECT * FROM game WHERE id = @id');
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
        SELECT g.*, wu.username AS white_player, bu.username AS black_player
        FROM game g
        LEFT JOIN [userbase] wu ON g.white_player = wu.uuid
        LEFT JOIN [userbase] bu ON g.black_player = bu.uuid
        WHERE g.white_player = @userId OR g.black_player = @userId
      `);

    cb(null, result.recordset);
  } catch (err) {
    console.error('Error fetching game records:', err.message);
    cb(err, null);
  }
};


export { saveGameResult, getAllGameHistories, getGameHistoryById, getGamesByUserId };

// CREATE TABLE game (
//   id INT IDENTITY(1,1) PRIMARY KEY,
//   white_player VARCHAR(255),
//   black_player VARCHAR(255),
//   result VARCHAR(50),
//   message VARCHAR(255),
//   game_state VARCHAR(MAX)
// );