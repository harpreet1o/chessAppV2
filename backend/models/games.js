import poolPromise from "./dbconnect.js";
// Function to save game result
import sql from 'mssql';
const saveGameResult = async (whitePlayer, blackPlayer, result, gameState) => {
  console.log("whiteplayer"+whitePlayer);
  console.log("blackplayer"+blackPlayer);
 console.log("result"+result);
 try {
  const pool = await poolPromise;
  await pool.request()
    .input('whitePlayer', sql.VarChar, whitePlayer)
    .input('blackPlayer', sql.VarChar, blackPlayer)
    .input('result', sql.VarChar, result) 
    .input('gameState', sql.Text, gameState) 
    .query(`
      INSERT INTO game (white_player, black_player, result, game_state) 
      VALUES (@whitePlayer, @blackPlayer, @result, @gameState)
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
        SELECT g.*, wu.name AS white_username, bu.name AS black_username
        FROM game g
        LEFT JOIN [user] wu ON g.white_player = wu.id
        LEFT JOIN [user] bu ON g.black_player = bu.id
        WHERE g.white_player = @userId OR g.black_player = @userId
      `);

    cb(null, result.recordset);
  } catch (err) {
    console.error('Error fetching game records:', err.message);
    cb(err, null);
  }
};


export { saveGameResult, getAllGameHistories, getGameHistoryById, getGamesByUserId };
