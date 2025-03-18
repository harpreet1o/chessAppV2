// import { Chess } from 'chess.js';
// import { saveGameResult } from "../models/games.js";
// const gameTimers = {};

// const startTimer = (uniqueRoomIndex, selectedTime, io) => {
//   if (!gameTimers[uniqueRoomIndex]) {
//     gameTimers[uniqueRoomIndex] = {
//       whiteTime: selectedTime * 60, // Convert minutes to seconds
//       blackTime: selectedTime * 60,
//       currentPlayer: "w",
//       intervalId: setInterval(() => updateTimer(uniqueRoomIndex, selectedTime, io), 1000),
//     };
//   }
// };

// const updateTimer = (uniqueRoomIndex, selectedTime, io) => {
//   const timer = gameTimers[uniqueRoomIndex];
//   if (!timer) {
//     console.error(`Timer not found: ${uniqueRoomIndex}`);
//     clearInterval(gameTimers[uniqueRoomIndex].intervalId); // Stop the interval if the timer does not exist
//     return;
//   }
//   if (timer.currentPlayer === "w") {
//     timer.whiteTime--;
//     if (timer.whiteTime <= 0) {
//       endGame(uniqueRoomIndex, `${selectedTime}min`, "b", "Time out", io);
//     }
//   } else {
//     timer.blackTime--;
//     if (timer.blackTime <= 0) {
//       endGame(uniqueRoomIndex, `${selectedTime}min`, "w", "Time out", io);
//     }
//   }
//   io.to(uniqueRoomIndex).emit("timerUpdate", {
//     whiteTime: timer.whiteTime,
//     blackTime: timer.blackTime,
//   });
// };

// const endGame = async (roomId, lobby, result, message, io, redisClient) => {
//   const timer = gameTimers[roomId];
//   if (timer) {
//     clearInterval(timer.intervalId); // Stop the interval
//     delete gameTimers[roomId];
//   }

//   if (roomId) { 
//     io.to(roomId).emit("gameOver", { message: message, result: result });
//     const roomT = await redisClient.json.get("lobbies", { path: `$.${lobby}.${roomId}` });
//     const room = roomT[0];
//     await saveGameResult(room.white, room.black, result, message, JSON.stringify(room.gameHistory));
//     await redisClient.json.del("lobbies", `$.${lobby}.${roomId}`);
//     await redisClient.hDel("userRoom", room.white);
//     await redisClient.hDel("userRoom", room.black);
//     io.socketsLeave(roomId);
//   } else {
//     console.error(`Room not found in endGame: ${roomId}`);
//   }
// };

// const assignUserToRoom = async (socket, userId, selectedTime, redisClient) => {
//   const existingRoom = await redisClient.hGet('userRoom', userId);
//   const userRooms = await redisClient.hGetAll('userRoom');
//   console.log(userRooms);
//   console.log("existingRoom");
//   const userName = socket.handshake.query.username;
//   console.log(existingRoom);
//   if (existingRoom) {
//     const data = JSON.parse(existingRoom);
//     const roomInfo = await redisClient.json.get(`lobbies`, { path: `$.${data.lobby}.${data.RoomId}` });
//     const room = roomInfo[0];
//     if (room.user2 && room.user1)
//       return { RoomId: data.RoomId, lobby: data.lobby };
//     else {
//       await redisClient.hDel('userRoom', userId);
//       await redisClient.json.del("lobbies", `$.${data.lobby}.${data.RoomId}`);
//     }
//   }
//   const timeLobby = await redisClient.json.get(`lobbies`, { path: `$.${selectedTime}min` });
//   console.log(`timeLobby${timeLobby}`);
//   let RoomId = null;
//   if (timeLobby[0] && Object.keys(timeLobby[0]).length > 0) {
//     for (const [key, room] of Object.entries(timeLobby)) {
//       RoomId = Object.keys(room)[0];
//       console.log(`RoomId${RoomId}`);
//       if (!room[RoomId].user2) {
//         console.log("user2");
//         await redisClient.hSet('userRoom', userId, JSON.stringify({ RoomId, lobby: `${selectedTime}min` }));
//         const gameState = new Chess().fen();
//         const white = Math.random() > 0.5 ? userId : room[RoomId].user1;
//         const black = white === userId ? room[RoomId].user1 : userId;
//         await redisClient.json.set("lobbies", `$.${selectedTime}min.${RoomId}`, { user1: room[RoomId].user1, user2: userId, gameState: gameState, gameHistory: [], white: white, black: black, user1Name: room[RoomId].user1Name, user2Name: userName });
//         return { RoomId, lobby: `${selectedTime}min` };
//       }
//     }
//   }
//   RoomId = Math.random().toString(36).substring(7);
//   await redisClient.json.set("lobbies", `$.${selectedTime}min.${RoomId}`, { user1: userId, user2: null, gameState: null, gameHistory: null, white: null, black: null, user1Name: userName, user2Name: null });
//   await redisClient.hSet('userRoom', userId, JSON.stringify({ RoomId, lobby: `${selectedTime}min` }));
//   return { RoomId, lobby: `${selectedTime}min` };
// };

// const changeTimer = (userRoom) => {
//   const timer = gameTimers[userRoom];
//   if (timer) {
//     timer.currentPlayer = timer.currentPlayer === "w" ? "b" : "w";
//   } else {
//     console.error(`Timer not found in move handler: ${userRoom}`);
//   }
// };

// export { assignUserToRoom, changeTimer, startTimer, updateTimer, endGame, gameTimers };