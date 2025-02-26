import pool from './dbconnect.js';

// Save game result to PostgreSQL
const saveGameResult = async (whitePlayer, blackPlayer, result, message, gameState) => {
  try {
    const query = `
      INSERT INTO game (white_player, black_player, result, message, game_state)
      VALUES ($1, $2, $3, $4, $5)
    `;
    const values = [whitePlayer, blackPlayer, result, message, gameState];
    await pool.query(query, values);
    console.log('Game result saved successfully.');
  } catch (error) {
    console.error('Error saving game result:', error);
  }
};

// Function to get all game histories
const getAllGameHistories = async (cb) => {
  try {
    const result = await pool.query('SELECT * FROM game');
    cb(null, result.rows);
  } catch (err) {
    cb(err, null);
  }
};

// Function to get a game history by ID
const getGameHistoryById = async (id, cb) => {
  try {
    const result = await pool.query('SELECT * FROM game WHERE id = $1', [id]);
    cb(null, result.rows[0]);
  } catch (err) {
    cb(err, null);
  }
};

const getGamesByUserId = async (userId, cb) => {
  try {
    const query = `
      SELECT g.*, wu.username AS white_player, bu.username AS black_player
      FROM game g
      LEFT JOIN userbase wu ON g.white_player = wu.uuid
      LEFT JOIN userbase bu ON g.black_player = bu.uuid
      WHERE g.white_player = $1 OR g.black_player = $1
    `;
    const result = await pool.query(query, [userId]);
    cb(null, result.rows);
  } catch (err) {
    console.error('Error fetching game records:', err.message);
    cb(err, null);
  }
};

export { saveGameResult, getAllGameHistories, getGameHistoryById, getGamesByUserId };

// CREATE TABLE game (
//   id SERIAL PRIMARY KEY,
//   white_player VARCHAR(255),
//   black_player VARCHAR(255),
//   result VARCHAR(50),
//   message VARCHAR(255),
//   game_state TEXT
// );