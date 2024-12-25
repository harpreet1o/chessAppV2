// config.js
import * as dotenv from 'dotenv';

dotenv.config();

const config = {
  databaseUser: process.env.DATABASE_USER,
  databasePassword: process.env.DATABASE_PASSWORD,
  databaseName: process.env.DATABASE_NAME,
  databaseServer: process.env.DATABASE_SERVER,
  databaseTrustServerCertificate: process.env.DATABASE_TRUST_SERVER_CERTIFICATE || 'no',
  databaseConnectionTimeout: process.env.DATABASE_CONNECTION_TIMEOUT || 30000,
  secretKeyJWT: process.env.SECRET_KEY_JWT,
  port: process.env.PORT || 3000,
  googleClientId: process.env.GOOGLE_CLIENT_ID,
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET,
  corsOrigin: process.env.CORS_ORIGIN
};


export default config;
