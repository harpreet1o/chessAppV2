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
    await redisClient.sendCommand(['FLUSHDB']);
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
  await redisClient.json.set(
    "lobbies",
    "$",
    {
      "5min": {"hi":"hello"},
      "10min": {},
      "1min": {}
    }
  );

  // Verify the data was set correctly
  const lobbies = await redisClient.json.get("lobbies", "$.['5']");
  console.log("Lobbies after initialization:", lobbies);
  

  const fiveMinLobby = await redisClient.json.get("lobbies", "$.5min");
  console.log("5min Lobby:", fiveMinLobby);
  await redisClient.hSet("userRoom","intialized","true");

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

// for checking the server error
// app.get("/id", (req, res) => {
//   console.log("hi from server side");
//   res.send("Hello from server side");
// });

// const gameTimers = {};
// const lobbies = {
//   1: [], 
//   5: [],
//   10: [] 
// };
const startTimer = (uniqueRoomIndex) => {
  if (!gameTimers[uniqueRoomIndex]) {
    const [roomIndex, time] = uniqueRoomIndex.split('-');
    const room = lobbies[time].find(room => room.roomIndex === parseInt(roomIndex));
    if (!room) {
      console.error(`Room not found in startTimer: ${uniqueRoomIndex}`);
      return;
    }
    if (room.white && room.black) { // Check if both players are connected
      gameTimers[uniqueRoomIndex] = {
        whiteTime: room.time * 60, // Convert minutes to seconds
        blackTime: room.time * 60,
        currentPlayer: "w",
        intervalId: setInterval(() => updateTimer(uniqueRoomIndex), 1000),
      };
    }
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

// const assignUserToRoom = async (socket, userId, selectedTime) => {

//   const userName = socket.handshake.query.username;
//   console.log(`username ${userName}`);
//   const userRoomKey = `userRoom:${userId}`;
//   const roomsKey = "rooms";
//   console.log(userRoomKey);

//   const existingRoom = await redisClient.get(userRoomKey);
//   if (existingRoom) {
//     const roomInfo = JSON.parse(existingRoom);
//     console.log(roomInfo);
//     const uniqueRoomIndex = `${roomInfo.roomIndex}-${roomInfo.time}`;

//     // Ensure the user is reassigned to their existing room
//     socket.emit("roleAssigned", roomInfo.role);

//     return uniqueRoomIndex;
//   }
const assignUserToRoom = async (userId, selectedTime) => {

  const existingRoom = await redisClient.hGet('userRoom', userId);
  if(existingRoom){
    const data = JSON.parse(existingRoom);
    const roomInfo=await redisClient.json.get("lobbies", `$.${data.lobby}.${data.RoomId}`);
    if(roomInfo.user2)
      return { RoomId: roomInfo.RoomId, lobby: roomInfo.lobby };
    else{
      await redisClient.hDel('userRoom', userId);
      await redisClient.json.del("lobbies", `$.${data.lobby}.${data.RoomId}`);
    }
  
  }
  const timeLobby = await redisClient.json.get(`lobbies`, `$.${selectedTime}min`);
  console.log(timeLobby);
let RoomId=null;
if(timeLobby){
  console.log("checking room key"+timeLobby);
for (const [key, room] of Object.entries(timeLobby)) {
  console.log("checking room key"+room);
  if (!room.user2) {
    RoomId = key;
    await redisClient.hSet('userRoom', userId, JSON.stringify({ RoomId, lobby: `${selectedTime}min` }));  c
    await redisClient.json.set(`lobbies.${selectedTime}min.${RoomId}`, "$.user2", userId);
    return {RoomId,lobby:`${selectedTime}min`};
  }
}
}
  RoomId = Math.random().toString(36).substring(7);
  await redisClient.json.set("lobbies", `$.${selectedTime}min.${RoomId}`, { user1:userId,user2:null,gameSate:null,white:null,black:null });
  await redisClient.hSet('userRoom', userId, JSON.stringify({ RoomId, lobby: `${selectedTime}min` }));
  return {RoomId,lobby:`${selectedTime}min`};
}
 
// {
//   // const existingRoom = await redisClient.get(userRoomKey);
//   // if (existingRoom) {
//   //   const roomInfo = JSON.parse(existingRoom);
//   //   console.log(roomInfo);
//   //   const uniqueRoomIndex = `${roomInfo.roomIndex}-${roomInfo.time}`;

//   //   // Ensure the user is reassigned to their existing room
//   //   socket.emit("roleAssigned", roomInfo.role);

//   //   return uniqueRoomIndex;
//   // }


// //   let roomIndex = null;
// //   let role = null;
// //   const lobby = lobbies[selectedTime];

// //   // Find an available spot in an existing room
// //   for (let i = 0; i < lobby.length; i++) {
// //     if (!lobby[i].white) {
// //       lobby[i].white = userId;
// //       roomIndex = i;
// //       role = "w";
// //       break;
// //     } else if (!lobby[i].black) {
// //       lobby[i].black = userId;
// //       roomIndex = i;
// //       role = "b";
// //       break;
// //     }
// //   }

// //   // If no spot is available, create a new room
// //   if (roomIndex === null) {
// //     roomIndex = lobby.length;
// //     lobby.push({ roomIndex, white: userId, black: null, game: new Chess().fen(), time: selectedTime });
// //     console.log(`Created new room: ${roomIndex} in lobby for ${selectedTime} minutes`);
// //     role = "w";
// //   }

// //   const room = lobby[roomIndex];

// //   console.log("testing for name", userName)

// //   // Save user room and lobby state to Redis
// //   const uniqueRoomIndex = `${roomIndex}-${selectedTime}`;
// //   await redisClient.set(userRoomKey, JSON.stringify({ roomIndex, role, time: selectedTime }));
// //   await redisClient.set(roomsKey, JSON.stringify(lobbies));


// //   // Store user name in the room object
// //   if (role === "w") {
// //     room.whiteUserName = userName;
// //     room.whiteSocketId = socket.id;
// //   } else {
// //     room.blackUserName = userName;
// //     room.blackSocketId = socket.id;
// //   }
  
// //   // Emit roleAssigned event to the user
// //   socket.emit("roleAssigned", { role, userName, socketId: socket.id });

// //   io.to(uniqueRoomIndex).emit("players", {
// //     white: room.white ? { userName: room.whiteUserName, socketId: room.whiteSocketId } : null,
// //     black: room.black ? { userName: room.blackUserName, socketId: room.blackSocketId } : null,
// //   });
  
// //   if (room.white && room.black) {
// //     startTimer(uniqueRoomIndex);
// //   }

// //   return uniqueRoomIndex;
// // };
// }

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
      console.log(value);
      const v=await redisClient.json.get("lobbies" );
      console.log(v);
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
//             socket.emit("players", { 
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
// });

// io.on("connection", (socket) => {
//   console.log("connected");

//   // username event
//   socket.on('username', (username) => {
//     console.log('username:', username);
//     socket.data.username = username;
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
