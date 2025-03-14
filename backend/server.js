import express from "express";
import { Server } from "socket.io";
import { createServer } from "http";
import cors from "cors";
import jwt from "jsonwebtoken";
import cookieParser from "cookie-parser";
import { Chess } from "chess.js";
import { createClient } from "redis";
import config from './config.js';
import authRoutes from './routes/auth.js';
import { saveGameResult as saveAzureGameResult, saveGameResult } from "./models/games.js"; // Assume you have a similar Azure implementation
import pg from 'pg';
import pool from './models/dbconnect.js';
import { set } from "mongoose";

const secretKeyJWT = config.secretKeyJWT;
const port = config.port;

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: config.corsOrigin,
    methods: ["GET", "POST"],
    credentials: true,
  },
});

const redisClient = createClient({
  url: `redis://${process.env.REDIS_HOST}:${process.env.REDIS_PORT}`
});

redisClient.on("error", (error) => console.error(`Error: ${error}`));
// const redisClient = createClient(
//   {
//     url: 'redis://localhost:6379'
//     }
// );

// redisClient.on("error", (error) => console.error(`Error: ${error}`));
const clearAllRedisKeys = async () => {
  try {
    await redisClient.flushDb(); 
    console.log('All Redis keys cleared successfully.');
  } catch (error) {
    console.error(error);
  }
};
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

// this run at the start of the program
(async () => {
  await redisClient.connect();
  await createDb();
  await clearAllRedisKeys();
  console.log('Redis client connected successfully.');
  // creating lobbies in the redis client for storing the object data
  await redisClient.json.del("lobbies","$.*");
  await redisClient.json.set(
    "lobbies",
    "$",
    {
      "5min": {},
      "10min": {},
      "1min": {}
    }
  );
  const lobbies = await redisClient.json.get("lobbies");
  console.log(lobbies);
  await redisClient.json.set("lobbies", "$.5min.id", { name: "hello" })
  let lobbi=await redisClient.json.get("lobbies");
  console.log(lobbi);
  const id="id"
  
  const removedCount = await redisClient.json.del(
    "lobbies",          // the Redis key where your JSON is stored
    `$.5min.${id}`    // JSON path to the object you want to delete
  );


  let lob=await redisClient.json.get("lobbies");
  console.log(lob);
})();



app.use(
  cors({
    origin: config.corsOrigin,
    methods: ["GET", "POST"],
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());
app.use('/', authRoutes);

const gameTimers={};
let roomId;
const startTimer = (uniqueRoomIndex,selectedTime) => {
if(!gameTimers[uniqueRoomIndex]){
      gameTimers[uniqueRoomIndex] = {
        whiteTime: selectedTime * 60, // Convert minutes to seconds
        blackTime: selectedTime * 60,
        currentPlayer: "w",
        intervalId: setInterval(() => updateTimer(uniqueRoomIndex,selectedTime), 1000),
      };
    }
};
const updateTimer = (uniqueRoomIndex,selectedTime) => {
  const timer = gameTimers[uniqueRoomIndex];
  if (!timer) {
    console.error(`Timer not found: ${uniqueRoomIndex}`);
    return;
  }
  if (timer.currentPlayer === "w") {
    timer.whiteTime--;
    if (timer.whiteTime <= 0) {
      endGame(uniqueRoomIndex,`${selectedTime}min`, "b", "Time out");
    }
  } else {
    timer.blackTime--;
    if (timer.blackTime <= 0) {
      endGame(uniqueRoomIndex, `${selectedTime}min`,"w", "Time out");
    }
  }
  io.to(uniqueRoomIndex).emit("timerUpdate", {
    whiteTime: timer.whiteTime,
    blackTime: timer.blackTime,
  });
};

const endGame = async (roomId,lobby,result,message) => {
  const timer = gameTimers[roomId];
  if (timer) {
    delete gameTimers[roomId];
  }
   
  if (roomId) { 
    io.to(roomId).emit("gameOver", {message: message, result: result});
    const roomT= await redisClient.json.get("lobbies", {path:`$.${lobby}.${roomId}`});
    const room=roomT[0];
    console.log(room);
    console.log(lobby)
    await saveGameResult(room.white, room.black, result,message, room.gameHistory);
 // Delete room information from Redis
 await redisClient.json.del("lobbies", `$.${lobby}.${room}`);
 await redisClient.hDel("userRoom", roomInfo.white);
 await redisClient.hDel("userRoom", roomInfo.black);
      
    io.socketsLeave(room);
  } else {
    console.error(`Room not found in endGame: ${room}`);
  }
};
const assignUserToRoom = async (socket,userId, selectedTime) => {

  const existingRoom = await redisClient.hGet('userRoom', userId);
  const userRooms = await redisClient.hGetAll('userRoom');
  console.log(userRooms);
  console.log("existingRoom")
  const userName = socket.handshake.query.username;
  console.log(existingRoom)
  if(existingRoom){
    const data = JSON.parse(existingRoom);
    const roomInfo = await redisClient.json.get(`lobbies`, {path:`$.${data.lobby}.${data.RoomId}`});
    const room=roomInfo[0]
    if (room.user2&&room.user1) 
      return { RoomId: data.RoomId, lobby: data.lobby };
    else{
      await redisClient.hDel('userRoom', userId);
      await redisClient.json.del("lobbies", `$.${data.lobby}.${data.RoomId}`);
    }
  
  }
  console.log("174")
  const timeLobby = await redisClient.json.get(`lobbies`, {path:`$.${selectedTime}min`});
  console.log(`timeLobby${timeLobby}`)
let RoomId=null;
if(timeLobby[0]&&Object.keys(timeLobby[0]).length>0){
for (const [key, room] of Object.entries(timeLobby)) {
  RoomId = Object.keys(room)[0]; 
  console.log(`RoomId${RoomId}`)
  if (!room[RoomId].user2) {
    console.log("user2")
    await redisClient.hSet('userRoom', userId, JSON.stringify({ RoomId, lobby: `${selectedTime}min` }));  
    const gameState=new Chess().fen();
    const white=Math.random()>0.5?userId:room[RoomId].user1;
    const black=white===userId?room[RoomId].user1:userId;
    await redisClient.json.set("lobbies", `$.${selectedTime}min.${RoomId}`, { user1:room[RoomId].user1,user2:userId,gameState:gameState,gameHistory:[],white:white,black:black,user1Name:room[RoomId].user1Name,user2Name:userName });
     return {RoomId,lobby:`${selectedTime}min`};
  }
}

}
  RoomId = Math.random().toString(36).substring(7);
  await redisClient.json.set("lobbies", `$.${selectedTime}min.${RoomId}`, { user1:userId,user2:null,gameState:null,gameHistory:null,white:null,black:null,user1Name:userName,user2Name:null });
  await redisClient.hSet('userRoom', userId, JSON.stringify({ RoomId, lobby: `${selectedTime}min` }));
  return {RoomId,lobby:`${selectedTime}min`};
}
 
// Middleware to check authentication

io.use(async (socket, next) => {
  console.log(socket.id);

  cookieParser()(socket.request, socket.request.res || {},async (err) => {
    if (err) return next(err);
    const token = socket.request.cookies.token; // Extract the token from cookies
    if (!token) return next(new Error("Authentication Error"));
    try {
      const decoded = jwt.verify(token, secretKeyJWT);
      socket.decoded = decoded; // Attach decoded token payload to socket object though seems to be unnecessay
      console.log(`User ${decoded.id} authenticated`);
      const selectedTime = parseInt(socket.handshake.query.time, 10);
      const value = await assignUserToRoom(socket,decoded.id, selectedTime);
      socket.roomId = value.RoomId;
      socket.selectedTime = selectedTime+"min";
      const roomInf= await redisClient.json.get("lobbies", {path:`$.${value.lobby}`}); 
      console.log(roomInf)
      const roomInfo= await redisClient.json.get("lobbies", {path:`$.${value.lobby}.${value.RoomId}`}); 
    await socket.join(`${value.RoomId}`)
    //  console.log("roomInfo")
    //   console.log(roomInfo)
      const getRoomSize = (roomId) => {
        const room = io.sockets.adapter.rooms.get(roomId);
        return room ? room.size : 0;
      };
      const roomSize = getRoomSize(value.RoomId);
console.log(`Number of clients in room : ${roomSize}`);
      
     if(!roomInfo[0].user2||!roomInfo[0].user1)
     {
      socket.emit("waitng","waiting for the other player to join");

     }
     else{
    setTimeout(() => {
      io.to(`${value.RoomId}`).emit("startGame","Game Started");
      const availableId=socket.id;
      console.log(`availableId${availableId}`);
      (roomInfo[0].white===decoded)?io.to(`${value.RoomId}`).emit("roleAssign",{role:`w${availableId}`,usernames:{whiteUser:roomInfo[0].user1Name,blackUser:roomInfo[0].user2Name}}):io.to(`${value.RoomId}`).emit("roleAssign",{role:`b${availableId}`,usernames:{whiteUser:roomInfo[0].user1Name,blackUser:roomInfo[0].user2Name}});
      // io.to(`${value.RoomId}`).emit("roleAssign",{role:roomInfo[0].white===decoded.id?"w":"b",usernames:{whiteUser:roomInfo[0].white==roomInfo[0].user1?roomInfo[0].user1Name:roomInfo[0].user2Name,blackUser:roomInfo[0].black==roomInfo[0].user1?roomInfo[0].user1Name:roomInfo[0].user2Name}});
      io.to(`${value.RoomId}`).emit("gameState", roomInfo[0].gameState);  
      startTimer(`${value.RoomId}`,selectedTime);
        },3000)
   
     }
      next();
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        console.error('Token expired:', error.expiredAt);
        return next(new Error("Token Expired"));
      } else {
        console.error('Token verification failed:', error);
        return next(new Error("Token Verification Failed"));
      }
    }
  })
});
 io.on("connection", (socket) => {
  socket.on('username', (username) => {
     console.log('username:', username);
     socket.data.username = username;
});

  // Handle incoming moves
  socket.on("move", async (move) => {
    const userId = socket.decoded.id;
   
    const userRoom = socket.roomId;
    const lobby = socket.selectedTime;


    if (!userRoom) {
      console.log(`User room not found for user: ${userId}`);
      return;
    }    
    const roomInfo= await redisClient.json.get("lobbies", {path:`$.${lobby}.${userRoom}`}); 
      const game = new Chess(`${roomInfo[0].gameState}`);
      const movePlayed = game.move(move);
      console.log(movePlayed)
      if(movePlayed){
        await redisClient.json.ARRAPPEND("lobbies",`$.${lobby}.${userRoom}.gameHistory`,movePlayed);
        await redisClient.json.set("lobbies",`$.${lobby}.${userRoom}.gameState`,game.fen());
        io.to(userRoom).emit("gameState", game.fen());
      // Update timer

        const timer = gameTimers[userRoom];
        if (timer) {
          timer.currentPlayer = timer.currentPlayer === "w" ? "b" : "w";
        } else {
          console.error(`Timer not found in move handler: ${uniqueRoomIndex}`);
        }

        // Check for game-ending conditions
        let gameOver = false;
        let gameOverMessage = "";
        let result = null;

        if (game.isCheckmate()) {
          gameOver = true;
          gameOverMessage = "Checkmate";
          result= game.turn() === 'b' ? "w" : "b";
          
        } else if (game.isStalemate()) {
          gameOver = true;
          result="d";
          gameOverMessage = "Stalemate";
        } else if (game.isInsufficientMaterial()) {
          gameOver = true;
          result="d";
          gameOverMessage = "Insufficient material";
        } else if (game.isThreefoldRepetition()) {
          gameOver = true;
          result="d";
          gameOverMessage = "Threefold repetition";
        } else if (game.isDraw()) {
          gameOver = true;
          result="d";
          gameOverMessage = "Draw";
        }        

        if (gameOver) {                
          endGame(userRoom,result,gameOverMessage);
        }
      } else {
        socket.emit("invalidMove", "Invalid move");
      }
  });

   // Handle resign event
   socket.on('resign', async () => {
    const userId = socket.decoded.id;
    const roomId = socket.roomId;
    const lobby = socket.selectedTime;

    if (!userId) {
      console.log(`User room not found for user: ${userId}`);
      return;
    }


    if (roomId) {
      const roomT= await redisClient.json.get("lobbies", {path:`$.${lobby}.${roomId}`});
      const room=roomT[0];
      const winnerColor=room.white===userId?"b":"w";
      const reason = `${winnerColor==='w'?"black Resigned":"white Resigned"}`;
      endGame(roomId,lobby, winnerColor, reason);
    } else {
      console.error(`Room not found in resign`);
    }
  });

  // Handle disconnection
  socket.on("disconnect", async () => {
    const userId = socket.decoded.id;
    const userRoom = socket.roomId;

    if (!userRoom) {
      console.log(`User room not found for user: ${userId}`);
      return;
    }
    
    io.to(userRoom).emit("opponentLeft", "Opponent left the game");
    socket.leave(userRoom);
  });
});
server.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});