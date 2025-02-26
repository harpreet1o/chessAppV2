// config.js
import * as dotenv from 'dotenv';

dotenv.config();

export default {
  databaseUser: process.env.DB_USER,
  databaseHost: process.env.DB_HOST,
  databaseName: process.env.DB_DATABASE,
  databasePassword: process.env.DB_PASSWORD,
  databasePort: process.env.DB_PORT,
  secretKeyJWT: process.env.SECRET_KEY_JWT,
  port: process.env.PORT,
  corsOrigin: process.env.CORS_ORIGIN,
  googleClientId: process.env.GOOGLE_CLIENT_ID,
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET
};
