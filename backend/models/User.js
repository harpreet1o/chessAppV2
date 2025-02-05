import poolPromise from './dbconnect.js';
import sql from 'mssql';
import bcrypt from "bcryptjs";
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
// function to check the user if the user choose to login with the google
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
  console.log("hi");
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

// Function to find user by email for 
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


export { findUserById, createUser, findUserByEmail,UserLoginByGoogle };
