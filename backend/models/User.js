import sql from 'mssql';
import bcrypt from 'bcryptjs';
import config from '../config.js';
import { userInfo } from 'os';

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

// Function to find user by ID
const findUserById = async (id) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request()
      .input('uuid', sql.Char, id)
      .query('SELECT uuid, username, email FROM userbase WHERE uuid = @uuid');
      console.log("find user by Id")
      console.log(result.recordset)
    return (result.recordset[0]);
  } catch (err) {
    return (err);
  }
};
const UserLoginByGoogle=async({id, email, name})=>{
  try{
    const pool = await poolPromise;
    const result= await pool.request()
    .input('uuid',sql.Char,id)
    .query('SELECT email FROM userbase WHERE uuid = @uuid');
    if(result.recordset[0].email==email)
      return {id,email,name};
    else{
  const result=await pool.request()
    .input('uuid',sql.Char,id)
    .input('email',sql.VarChar,email)
    .input('username',sql.VarChar,name)
    .input('is_google',sql.Bit,1)
    .query('INSERT INTO userbase (uuid,email,username,is_google) VALUES (@uuid,@email,@username,@is_google)');
    }
  }
  catch(error){
    console.log("error during the login by google ",error)
  }
}

// Function to create a new user
const createUser = async ({ id, email, name, password }) => {
  let hashedPassword = null;
  if (password) {
    const salt = bcrypt.genSaltSync(10);
    hashedPassword = bcrypt.hashSync(password, salt);
  }
  try {
    const pool = await poolPromise;
    const result=await pool.request()
      .input('uuid', sql.VarChar, id)
      .input('email', sql.VarChar, email)
      .input('username', sql.VarChar, name)
      .input('password', sql.VarChar, hashedPassword)
      .input('is_google',sql.Bit,0)
      .query('INSERT INTO userbase (uuid, email,username, user_password,is_google) VALUES (@uuid, @email, @username, @password,@is_google)');
      console.log("result");
      console.log(result);
      return result;
  } catch (err) {
    return err;
  }
};

// Function to find user by email
const findUserByEmail = async (email) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request()
      .input('email', sql.VarChar, email)
      .query('SELECT uuid, username, email, user_password FROM userbase WHERE email = @email');
    return result.recordset[0];
  } catch (err) {
   return err;
  }
};

// Function to compare passwords
const matchPassword = (password, hash) => bcrypt.compareSync(password, hash);

export { findUserById, createUser, findUserByEmail, matchPassword,UserLoginByGoogle };
