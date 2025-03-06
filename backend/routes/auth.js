// routes/auth.js
import express from 'express';
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { v4 as uuidv4 } from 'uuid';
import { createUser, findUserByEmail,  findUserById,UserLoginByGoogle ,findGamesStatsByUserId} from '../models/User.js';
import { matchPassword, authenticateJWT, generateToken } from '../models/helper.js';
import { getGamesByUserId } from '../models/games.js';
import config from '../config.js';
import jwt from 'jsonwebtoken';

// Function to compare passwords

const secretKeyJWT=config.secretKeyJWT;


const router = express.Router();


passport.use(new GoogleStrategy({
  clientID: config.googleClientId,
  clientSecret: config.googleClientSecret,
  callbackURL: 'http://localhost:3000/oauth2/redirect/google', 
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

router.get('/login/federated/google',(req, res, next) => {
  console.log(req.cookies.token);
  if (req.cookies && req.cookies.token) {
    const token = req.cookies.token;
    jwt.verify(token, secretKeyJWT, async (err, decoded) => {
      if (err) {
        passport.authenticate('google')(req, res, next);
      }
      else{
    const result= await findUserById(decoded.id);
    if(result)
          res.redirect(`http://localhost:5173`);
  }
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
  console.error(err);
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
    res.json({ username: result.username});
  });

  router.get('/user/profile', authenticateJWT, async (req, res) => {
    console.log("got a call");
    try {
      const user = await findUserById(req.user.id);
      if (!user) {
        return res.status(404).json({ message: 'User not found.' });
      }
  
      const gamesStats = await findGamesStatsByUserId(req.user.id);
  
      console.log("user");
      console.log(user);
      console.log("gamesStats");
      console.log(gamesStats);
  
      res.json({
        ...user,
        gamesPlayed: gamesStats.gamesPlayed,
        gamesWon: gamesStats.gamesWon,
        gamesDrawn: gamesStats.gamesDrawn,
      });
    } catch (err) {
      console.error('Error finding user by ID:', err);
      return res.status(500).json({ message: 'Internal server error.' });
    }
  });

router.get('/user/games', authenticateJWT, (req, res) => {
  try {
    console.log("user id in router")
    console.log(req.user.id)
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