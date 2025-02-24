import express from "express";
import { Server } from "socket.io";
import { createServer } from "http";
import cors from "cors";
import jwt from "jsonwebtoken";
import cookieParser from "cookie-parser";
import { Chess } from "chess.js";
import { createClient } from "redis";
import config from './config.js';
import sql from 'mssql';
import authRoutes from './routes/auth.js';
import { saveGameResult as saveAzureGameResult } from "./models/games.js"; // Assume you have a similar Azure implementation

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

const redisClient = createClient(
  {
    url: 'redis://localhost:6379'
    }
);

redisClient.on("error", (error) => console.error(`Error: ${error}`));

const clearAllRedisKeys = async () => {
  try {
    await redisClient.flushDb(); 
    console.log('All Redis keys cleared successfully.');
  } catch (error) {
    console.error(error);
  }
};
// this run at the start of the program
(async () => {
  await redisClient.connect();
  await clearAllRedisKeys();
  console.log('Redis client connected successfully.');
  // creating lobbies in the redis client for storing the object data
  await redisClient.json.del("lobbies","$.*");
  await redisClient.json.set(
    "lobbies",
    "$",
    {
      "5min": {"hi":"hello"},
      "10min": {},
      "1min": {}
    }
  );


  let lobbie=await redisClient.json.get("lobbies");
  console.log(lobbie);
// const v=  await redisClient.json.get("lobbies",{path:"$.5min"});


  
  // const removedCount = await redisClient.json.del(
  //   "lobbies",          // the Redis key where your JSON is stored
  //   `$.lobby5min.${id}`    // JSON path to the object you want to delete
  // );
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
        intervalId: setInterval(() => updateTimer(uniqueRoomIndex), 1000),
      };
    }
};
const updateTimer = (uniqueRoomIndex) => {
  const timer = gameTimers[uniqueRoomIndex];
  if (!timer) {
    console.error(`Timer not found: ${uniqueRoomIndex}`);
    return;
  }
  if (timer.currentPlayer === "w") {
    timer.whiteTime--;
    if (timer.whiteTime <= 0) {
      endGame(uniqueRoomIndex, "black", "Time out");
    }
  } else {
    timer.blackTime--;
    if (timer.blackTime <= 0) {
      endGame(uniqueRoomIndex, "white", "Time out");
    }
  }
  io.to(uniqueRoomIndex).emit("timerUpdate", {
    whiteTime: timer.whiteTime,
    blackTime: timer.blackTime,
  });
};

const endGame = async (uniqueRoomIndex, winnerColor, reason) => {
  const timer = gameTimers[uniqueRoomIndex];
  if (timer) {
    clearInterval(timer.intervalId);
    delete gameTimers[uniqueRoomIndex];
  }

  const [roomIndex, selectedTime] = uniqueRoomIndex.split('-');
  const lobby = lobbies[selectedTime];
  const room = lobby.find(room => room.roomIndex === parseInt(roomIndex));
  
  if (room) {
    const result = winnerColor === "w" ? "w" : "b";
  

    io.to(uniqueRoomIndex).emit("gameOver", reason);
    const gameState = JSON.stringify(new Chess(room.game).history({ verbose: true }));

    // Save game result in Azure SQL Database
    await saveAzureGameResult(room.white, room.black, result, gameState);
        await redisClient.del(`userRoom:${room.white}`);
        await redisClient.del(`userRoom:${room.black}`);
      

    // Remove room from lobby
    lobby.splice(lobby.findIndex(room => room.roomIndex === parseInt(roomIndex)), 1);

    // Make all sockets leave the room and delete the room from the socket.io namespace
    io.socketsLeave(uniqueRoomIndex);
  } else {
    console.error(`Room not found in endGame: ${uniqueRoomIndex}`);
  }
};

const assignUserToRoom = async (userId, selectedTime) => {

  const existingRoom = await redisClient.hGet('userRoom', userId);
  console.log("existingRoom")
  const userName = socket.handshake.query.username;
  console.log(existingRoom)
  if(existingRoom){
    const data = JSON.parse(existingRoom);
    const roomInfo = await redisClient.json.get(`lobbies`, {path:`$.${data.lobby}.${data.RoomId}`});
    console.log(roomInfo);
    const room=roomInfo[0]
    if (room.user2&&room.user1) 
      return { RoomId: data.RoomId, lobby: data.lobby };
    else{
      await redisClient.hDel('userRoom', userId);
      await redisClient.json.del("lobbies", `$.${data.lobby}.${data.RoomId}`);
    }
  
  }
  const timeLobby = await redisClient.json.get(`lobbies`, {path:`$.${selectedTime}min`});
let RoomId=null;
if(timeLobby[0]&&Object.keys(timeLobby[0]).length>0){
for (const [key, room] of Object.entries(timeLobby)) {
  RoomId = Object.keys(room)[0]; 
  if (!room[RoomId].user2) {
    await redisClient.hSet('userRoom', userId, JSON.stringify({ RoomId, lobby: `${selectedTime}min` }));  
    const gameState=new Chess().fen();
    const white=Math.random()>0.5?userId:room[RoomId].user1;
    const black=white===userId?room[RoomId].user1:userId;
    await redisClient.json.set("lobbies", `$.${selectedTime}min.${RoomId}`, { user1:room[RoomId].user1,user2:userId,gameSate:gameState,white:white,black:black,user1Name:room[roomId].user1Name,user2Name:userName });
     return {RoomId,lobby:`${selectedTime}min`};
  }
}
}
  RoomId = Math.random().toString(36).substring(7);
  await redisClient.json.set("lobbies", `$.${selectedTime}min.${RoomId}`, { user1:userId,user2:null,gameSate:null,white:null,black:null,user1Name:userName,user2Name:null });
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
      socket.decoded = decoded; // Attach decoded token payload to socket object
      console.log(`User ${decoded.id} authenticated`);
      const selectedTime = parseInt(socket.handshake.query.time, 10);
      const value = await assignUserToRoom(decoded.id, selectedTime);
     const roomInfo= await redisClient.json.get("lobbies", {path:`$.${value.lobby}.${value.RoomId}`}); 
     socket.join(`${value.RoomId}`)
     if(!roomInfo[0].user2||!roomInfo[0].user1)
     {
      socket.emit("waitng","waiting for the other player to join");

     }
     else{
      io.to(`${value.RoomId}`).emit("startGame","Game Started");
      // io.to(`${value.RoomId}`).emit("roleAssign",{role:roomInfo[0].white===decoded.id?"w":"b",userName:roomInfo[0].user1==decoded.id?roomInfo[0].user1Name:roomInfo[0].user2Name});
      io.to(`${value.RoomId}`).emit("roleAssign",{role:roomInfo[0].white===decoded.id?"w":"b",usernames:{userName1:roomInfo[0].white==roomInfo[0].user1?roomInfo[0].,fgj:roomInfo[0].user2Name}});

      io.to(`${value.RoomId}`).emit("gameState", roomInfo[0].gameState);        
      startTimer(`${value.RoomId}`,selectedTime);
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

//       assignUserToRoom(decoded.id, selectedTime).then((uniqueRoomIndex) => { //here sending socket seems unnecessary
//         if (uniqueRoomIndex !== undefined) {
//           socket.join(uniqueRoomIndex);
//           const [roomIndex, time] = uniqueRoomIndex.split('-');
//           const lobby = lobbies[time];
//           const room = lobby.find(room => room.roomIndex === parseInt(roomIndex));
//           console.log(uniqueRoomIndex);
//           if (room) {
//             console.log(`User joined room ${uniqueRoomIndex}`);
//             // Emit initial game state
//             socket.emit("gameState", room.game);
//             socket.emit("players", { -
//               white: room.white ? { userName: room.whiteUserName, socketId: room.whiteSocketId } : null,
//               black: room.black ? { userName: room.blackUserName, socketId: room.blackSocketId } : null,
//             });
//             // Notify other player in the room
//             socket.to(uniqueRoomIndex).emit("players", {
//               white: room.white ? { userName: room.whiteUserName, socketId: room.whiteSocketId } : null,
//               black: room.black ? { userName: room.blackUserName, socketId: room.blackSocketId } : null,
//             });
//             // startTimer(uniqueRoomIndex); // Start the timer
//           } else {
//             console.error(`Room not found in assignUserToRoom: ${uniqueRoomIndex}`);
//           }
//         }
//       });

//       next();
//     } catch (error) {
//       return next(new Error("Token Verification Failed"));
//     }
//   });
  })
});
 io.on("connection", (socket) => {
//    console.log("connected");
  // username event
  socket.on('username', (username) => {
     console.log('username:', username);
     socket.data.username = username;
});

  // Handle incoming moves
  socket.on("move", async (move) => {
    const userId = socket.decoded.id;
    const userRoomKey = `userRoom:${userId}`;
    const userRoom = JSON.parse(await redisClient.get(userRoomKey));

    if (!userRoom) {
      console.log(`User room not found for user: ${userId}`);
      return;
    }

    const uniqueRoomIndex = `${userRoom.roomIndex}-${userRoom.time}`;
    const lobby = lobbies[userRoom.time];
    const room = lobby.find(room => room.roomIndex === userRoom.roomIndex);

    if (room) {
      const game = new Chess(room.game);
      const result = game.move(move);

      if (result) {
        // history
        if (!room.history) {
          room.history = [];
        }
        room.history.push(game.history({verbose: true})[0]);
  
        // Update timerd
        const timer = gameTimers[uniqueRoomIndex];
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
        // Update game state in Redis
        room.game = game.fen();
        
            const gameState = JSON.stringify(room.history);
          console.log("gameState "+gameState);
          console.log("roomindex"+userRoom.roomIndex)
        await redisClient.set("rooms", JSON.stringify(lobbies)); // Save updated lobbies to Redis

        // Emit updated game state to both players in the room
        io.to(uniqueRoomIndex).emit("gameState", game.fen());

        if (gameOver) {
          io.to(uniqueRoomIndex).emit("gameOver", gameOverMessage);
          // Save game result and remove the room from Redis

          const gameState = JSON.stringify(room.history);
          console.log("gameover--gameState "+gameState);
          console.log("gameover--roomindex"+room.roomIndex)
          await saveAzureGameResult(room.white, room.black, result, gameState)


              await redisClient.del(userRoomKey);
            
          endGame(uniqueRoomIndex, winner, gameOverMessage);
        }
      } else {
        socket.emit("invalidMove", "Invalid move");
      }
    } else {
      console.error(`Room not found in move: ${uniqueRoomIndex}`);
    }
  });

   // Handle resign event
   socket.on('resign', async () => {
    const userId = socket.decoded.id;
    const userRoomKey = `userRoom:${userId}`;
    const userRoom = JSON.parse(await redisClient.get(userRoomKey));

    if (!userRoom) {
      console.log(`User room not found for user: ${userId}`);
      return;
    }

    const uniqueRoomIndex = `${userRoom.roomIndex}-${userRoom.time}`;
    const lobby = lobbies[userRoom.time];
    const room = lobby.find(room => room.roomIndex === userRoom.roomIndex);

    if (room) {
      const winnerColor = userRoom.role === "w" ? "b" : "w";
      const reason = `Player ${userRoom.role === "w" ? "White" : "Black"} resigned`;
      endGame(uniqueRoomIndex, winnerColor, reason);
    } else {
      console.error(`Room not found in resign: ${uniqueRoomIndex}`);
    }
  });

  // Handle disconnection
  socket.on("disconnect", async () => {
    const userId = socket.decoded.id;
    const userRoomKey = `userRoom:${userId}`;
    const userRoom = JSON.parse(await redisClient.get(userRoomKey));

    if (!userRoom) {
      console.log(`User room not found for user: ${userId}`);
      return;
    }

    const uniqueRoomIndex = `${userRoom.roomIndex}-${userRoom.time}`;
    const lobby = lobbies[userRoom.time];
    const room = lobby.find(room => room.roomIndex === userRoom.roomIndex);

    if (room) {
      if (room.white === userId) {
        room.white = null;
        console.log(`User ${userId} left room ${uniqueRoomIndex} (was white)`);
      } else if (room.black === userId) {
        room.black = null;
        console.log(`User ${userId} left room ${uniqueRoomIndex} (was black)`);
      }

      
      if (!room.white && !room.black) {
        const roomIndexInLobby = lobby.findIndex(room => room.roomIndex === userRoom.roomIndex);
        lobby.splice(roomIndexInLobby, 1);
        console.log(`Room ${uniqueRoomIndex} removed because it is empty`);
      }

      await redisClient.set("rooms", JSON.stringify(lobbies)); // Save updated lobbies to Redis
      await redisClient.del(userRoomKey);

      // Make the user leave the socket.io room
      socket.leave(uniqueRoomIndex);
    } else {
      console.error(`Room not found in disconnect: ${uniqueRoomIndex}`);
    }
  });
});
server.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
