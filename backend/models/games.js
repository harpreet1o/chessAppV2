import poolPromise from "./dbconnect.js";
// Function to save game result
import sql from 'mssql';
const saveGameResult = async (roomIndex,whitePlayer, blackPlayer, winner, loser, gameState) => {
  console.log("whiteplayer"+whitePlayer);
  console.log("blackplayer"+blackPlayer);
  console.log("winner"+winner);
  console.log("gameState"+gameState);
  console.log("loser"+loser);
  try {
    console.log(whitePlayer);
    console.log(blackPlayer);
    console.log(winner);
    console.log(gameState);
    const pool = await poolPromise;
    await pool.request()
    .input('id', sql.Char, roomIndex)
      .input('whitePlayer', sql.VarChar, whitePlayer)
      .input('blackPlayer', sql.VarChar, blackPlayer)
      .input('winner', sql.VarChar, winner)
      .input('loser', sql.VarChar, loser)
      .input('gameState', sql.VarChar, gameState)
      .query('INSERT INTO game_history (id,white_player, black_player, winner, loser, game_state) VALUES (@id,@whitePlayer, @blackPlayer, @winner, @loser, @gameState)');
   
  } catch (err) {
    console.error('Error saving game result:', err.message);
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
