import pool from '../models/dbconnect.js';
// const clearAllRedisKeys = async () => {
//   try {
//     await redisClient.flushDb(); 
//     console.log('All Redis keys cleared successfully.');
//   } catch (error) {
//     console.error(error);
//   }
// };
const createDb = async () => {
  try {
    const query = `
      CREATE TABLE IF NOT EXISTS game (
        id SERIAL PRIMARY KEY,
        white_player VARCHAR(255),
        black_player VARCHAR(255),
        result VARCHAR(50),
        message VARCHAR(255),
        game_state TEXT
      );
      CREATE TABLE IF NOT EXISTS userbase (
        uuid CHAR(36) PRIMARY KEY,
        email VARCHAR(255) NOT NULL,
        username VARCHAR(255) NOT NULL,
        user_password VARCHAR(255),
        is_google BOOLEAN NOT NULL
      );
    `;
    await pool.query(query);
    console.log('Tables created successfully.');
  } catch (error) {
    console.error('Error creating tables:', error);
  }
};

export {  createDb };