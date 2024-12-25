// routes/auth.js
import express from 'express';
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { createUser, findUserByEmail, matchPassword, findUserById,UserLoginByGoogle } from '../models/User.js';
import { getGamesByUserId } from '../models/games.js';
import config from '../config.js';

const secretKeyJWT=config.secretKeyJWT;

passport.use(new GoogleStrategy({
  clientID: config.googleClientId,
  clientSecret: config.googleClientSecret,
  callbackURL: 'http://localhost:3000/oauth2/redirect/google', // Ensure this matches your route
  scope: ['profile', 'email', 'openid']
},async (accessToken, refreshToken,issuer, profile, cb) => {
  console.log("acess token");
  console.log(accessToken);
  const newUser = {
    id: profile.id,
    email: profile.emails[0].value,
    name: profile.displayName,
  };
  const v=await UserLoginByGoogle(newUser);
  console.log(v);
  return cb(null,v);
}));

passport.serializeUser((user, cb) => {
  process.nextTick(() => {
    cb(null, user.id);
  });
});

passport.deserializeUser((id, cb) => {
  findUserById(id, (err, user) => {
    cb(err, user);
  });
});

const router = express.Router();

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

// User registration route
router.post('/register',async (req, res) => {
  try{
  const { email, name, password } = req.body;
 const result= await findUserByEmail(email);
 if(result){
  return res.status(400).json({message:'user already exists'})
 }
 else{
  console.log("run the else")
  const newUser = {
    id: uuidv4(),
    email,
    name,
    password
  };
  const result = await createUser(newUser);
  console.log(result);
  res.status(201).json({ message: "created succesfully" });
 }
}
catch(err){
  console.err(err);
}
   });

// User login route
router.post('/login', async(req, res) => {
  const { email, password } = req.body;
  try{
  const result=await findUserByEmail(email);
  console.log(matchPassword(password, result.user_password));
    if (!result || !matchPassword(password, result.user_password)) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }
    const token = generateToken(result.uuid);
    res.cookie('token', token, { httpOnly: true, secure: true, sameSite: "none" });
    res.json({ result, token });
  }
catch(err){
  console.err(err);
}
});

router.get('/login/federated/google', (req, res, next) => {
  console.log(req.cookies.token);
  if (req.cookies && req.cookies.token) {
    const token = req.cookies.token;
    jwt.verify(token, secretKeyJWT, (err, decoded) => {
      if (err) {
        return res.status(403).json({ message: 'Failed to authenticate token.' });
      }
      findUserById(decoded.id, (err, user) => {
        if (err) {
          return res.status(500).json({ message: 'Internal server error.' });
        }
        if (user) {
          res.redirect(`http://localhost:5173`);
        }
        return next();
      });
    });
  } else {
    passport.authenticate('google')(req, res, next);
  }
});

router.get('/oauth2/redirect/google', passport.authenticate('google', {
  session: false,
  failureRedirect: 'http://localhost:5173/login'
}), (req, res) => {
  const token = generateToken(req.user.id);
  res.cookie('token', token, { httpOnly: true, secure: true, sameSite: "none" , path: '/'});
  res.redirect(`http://localhost:5173`);
});



  router.post('/logout', (req, res) => {
    console.log("cleared cookie try")
    res.clearCookie('token', {
      httpOnly: true,
      secure: true,
      sameSite: 'none', 
      path: '/', 
    });
    res.json({ message: "Token removed successfully" });
  });
  


// Route to get current user
router.get('/current_user', authenticateJWT, async (req, res) => {
  console.log("result");
  console.log(req.user)
  const result= await findUserById(req.user.id)
  console.log(result);
    res.json({ username: result.username });
  });

router.get('/user/profile', authenticateJWT, (req, res) => {
  try {
    findUserById(req.user.id, (err, user) => {
      if (err) {
        return res.status(500).json({ message: 'Internal server error.' });
      }
      if (!user) {
        return res.status(404).json({ message: 'User not found.' });
      };
      res.json(user);
    });

  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
});

router.get('/user/games', authenticateJWT, (req, res) => {
  try {
    getGamesByUserId(req.user.id, (err, games) => {
      if (err) {
        return res.status(500).json({ message: 'Internal server error.' });
      }
      res.json(games);
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
});

export default router;
