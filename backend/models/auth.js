import pool from './dbconnect.js';

// Function to find user by email
export const findUserByEmail = async (email) => {
  try {
    const query = `
      SELECT * FROM userbase WHERE email = $1
    `;
    const values = [email];
    const result = await pool.query(query, values);
    return result.rows[0];
  } catch (error) {
    console.error('Error finding user by email:', error);
  }
};

// Function to create a new user
export const createUser = async (uuid, email, username, password, isGoogle) => {
  try {
    const query = `
      INSERT INTO userbase (uuid, email, username, user_password, is_google)
      VALUES ($1, $2, $3, $4, $5)
    `;
    const values = [uuid, email, username, password, isGoogle];
    await pool.query(query, values);
    console.log('User created successfully.');
  } catch (error) {
    console.error('Error creating user:', error);
  }
};