import pool from './dbconnect.js';
import bcrypt from "bcryptjs";

// Function to find user by ID
const findUserById = async (id) => {
  try {
    const result = await pool.query('SELECT uuid, username, email FROM userbase WHERE uuid = $1', [id]);
    console.log("finding")
    console.log(result.rows[0])
    return result.rows[0];
  } catch (err) {
    console.error('Error finding user by ID:', err);
    return err;
  }
};
const findGamesStatsByUserId = async (userId) => {
  try {
    const gamesPlayedResult = await pool.query('SELECT COUNT(*) FROM game WHERE white_player = $1 OR black_player = $1', [userId]);
    const gamesWonResult = await pool.query('SELECT COUNT(*) FROM game WHERE (white_player = $1 AND result = $2) OR (black_player = $1 AND result = $3)', [userId, 'w', 'b']);
    const gamesDrawnResult = await pool.query('SELECT COUNT(*) FROM game WHERE (white_player = $1 OR black_player = $1) AND result = $2', [userId, 'd']);

    return {
      gamesPlayed: parseInt(gamesPlayedResult.rows[0].count, 10),
      gamesWon: parseInt(gamesWonResult.rows[0].count, 10),
      gamesDrawn: parseInt(gamesDrawnResult.rows[0].count, 10),
    };
  } catch (err) {
    console.error('Error finding games stats by user ID:', err);
    throw err;
  }
};

// Function to check the user if the user chooses to login with Google
const UserLoginByGoogle = async ({ id, email, name }) => {
  try {
    const result = await pool.query('SELECT email FROM userbase WHERE uuid = $1', [id]);
    if (result.rows[0] && result.rows[0].email === email) {
      return { id, email, name };
    } else {
      const insertQuery = `
        INSERT INTO userbase (uuid, email, username, is_google)
        VALUES ($1, $2, $3, $4)
      `;
      await pool.query(insertQuery, [id, email, name, true]);
      return { id, email, name };
    }
  } catch (error) {
    console.error('Error during login by Google:', error);
  }
};

// Function to create a new user
const createUser = async ({ id, email, name, password }) => {
  let hashedPassword = null;
  if (password) {
    const salt = bcrypt.genSaltSync(10);
    hashedPassword = bcrypt.hashSync(password, salt);
  }
  try {
    const query = `
      INSERT INTO userbase (uuid, email, username, user_password, is_google)
      VALUES ($1, $2, $3, $4, $5)
    `;
    await pool.query(query, [id, email, name, hashedPassword, false]);
    console.log('User created successfully.');
  } catch (err) {
    console.error('Error creating user:', err);
    return err;
  }
};

// Function to find user by email
const findUserByEmail = async (email) => {
  try {
    const result = await pool.query('SELECT uuid, username, email, user_password FROM userbase WHERE email = $1', [email]);
    return result.rows[0];
  } catch (err) {
    console.error('Error finding user by email:', err);
    return err;
  }
};

export { findUserById, createUser, findUserByEmail, UserLoginByGoogle,findGamesStatsByUserId };