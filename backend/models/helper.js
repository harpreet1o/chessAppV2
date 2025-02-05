import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import config from '../config.js';

// Function to compare passwords

const secretKeyJWT=config.secretKeyJWT;

const  matchPassword = (password, hash) => bcrypt.compareSync(password, hash);
// Utility function to generate JWT
const generateToken = (userId) => {
    return jwt.sign({ id: userId }, secretKeyJWT, { expiresIn: '24h' });
  };
  
  // Middleware to authenticate the JWT token
  const authenticateJWT = (req, res, next) => {
    const token = req.cookies.token;
  
    if (token) {
      jwt.verify(token, secretKeyJWT, (err, decoded) => {
        if (err) {
          return res.sendStatus(403);
        }
        req.user = decoded;
        console.log("decoded");
        console.log(decoded);
        next();
      });
    } else {
      res.sendStatus(401);
    }
  };
export {matchPassword,authenticateJWT,generateToken};