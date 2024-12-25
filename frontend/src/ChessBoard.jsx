import { Chess } from 'chess.js';
import { io } from "socket.io-client";
import { useState, useMemo, useEffect, useContext } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { UserContext } from './context/UserContext';
import styles from './ChessBoard.module.css';


// Import piece images
import wP from './images/chess-pieces/wP.png';
import wR from './images/chess-pieces/wR.png';
import wN from './images/chess-pieces/wN.png';
import wB from './images/chess-pieces/wB.png';
import wQ from './images/chess-pieces/wQ.png';
import wK from './images/chess-pieces/wK.png';
import bP from './images/chess-pieces/bP.png';
import bR from './images/chess-pieces/bR.png';
import bN from './images/chess-pieces/bN.png';
import bB from './images/chess-pieces/bB.png';
import bQ from './images/chess-pieces/bQ.png';
import bK from './images/chess-pieces/bK.png';

export default function ChessBoard() {
  const chess = useMemo(() => new Chess(), []);
  const [board, setBoard] = useState(chess.board());
  const [selectedSquare, setSelectedSquare] = useState(null);
  const [availableMoves, setAvailableMoves] = useState([]);
  const [playerRole, setPlayerRole] = useState("w");
  const [players, setPlayers] = useState({ white: null, black: null });
  const [gameOverMessage, setGameOverMessage] = useState(null);
  const [whiteTime, setWhiteTime] = useState(300); // Initial time in seconds
  const [blackTime, setBlackTime] = useState(300);

  const navigate = useNavigate();
  const { user } = useContext(UserContext);
  const location = useLocation();
  const { time } = location.state; // Access the selected time

  const socket = useMemo(() => {
    if (user) {
      return io("http://localhost:3000", {
        withCredentials: true,
        query: { time, username: user } // Include username in query parameters
      });
    }
    return null;
  }, [time]);

  useEffect(() => {
    if (!user) {
      navigate('/');
    }

    socket.on("connect", () => {
      console.log("connected", socket.id);
    });



    socket.on('roleAssigned', ({ role, userName, socketId }) => {
      console.log('Role assigned:', role);
      setPlayerRole(role);
      setPlayers(prev => ({ ...prev, [role === "w" ? "white" : "black"]: { userName, socketId } }));
    });

    socket.on("gameState", (fen) => {
      chess.load(fen);
      setBoard([...chess.board()]);
    });

    socket.on("players", (players) => {
      console.log(players);
      setPlayers(players);
    });

    socket.on("gameOver", (message) => {
      console.log("Game Over: " + message);
      setGameOverMessage(message);
    });

    socket.on("timerUpdate", ({ whiteTime, blackTime }) => {
      setWhiteTime(whiteTime);
      setBlackTime(blackTime);
    });

    return () => {
      socket.off("connect");
      socket.off("roleAssigned");
      socket.off("gameState");
      socket.off("players");
      socket.off("gameOver");
      socket.off("timerUpdate");
    };
  }, [socket, chess, navigate, user]);


  const getPieceImage = (piece) => {
    const pieceImages = {
      p: bP,
      r: bR,
      n: bN,
      b: bB,
      q: bQ,
      k: bK,
      P: wP,
      R: wR,
      N: wN,
      B: wB,
      Q: wQ,
      K: wK,
    };
    const imageKey = piece ? (piece.color === 'w' ? piece.type.toUpperCase() : piece.type) : '';

    return piece ? pieceImages[imageKey] : '';
  };

  const handleSquareClick = (rowIndex, squareIndex, square) => {
    if (gameOverMessage) return;

    if (selectedSquare) {
      if (selectedSquare.row !== rowIndex || selectedSquare.col !== squareIndex) {
        handleMove(selectedSquare, { row: rowIndex, col: squareIndex });
      }
      setSelectedSquare(null);
      setAvailableMoves([]);
    } else if (square && square.color === playerRole) {
      setSelectedSquare({ row: rowIndex, col: squareIndex });
      const moves = chess.moves({ square: `${String.fromCharCode(97 + squareIndex)}${8 - rowIndex}`, verbose: true });
      setAvailableMoves(moves.map(move => move.to));
    }
  };

  const handleMove = (source, target) => {
    const move = {
      from: `${String.fromCharCode(97 + source.col)}${8 - source.row}`,
      to: `${String.fromCharCode(97 + target.col)}${8 - target.row}`,
      promotion: 'q'
    };

    const result = chess.move(move);

    if (result) {
      setBoard([...chess.board()]);
      socket.emit("move", move);
    } else {
      console.log("Invalid move");
    }
  };

  const isAvailableMove = (rowIndex, colIndex) => {
    return availableMoves.includes(`${String.fromCharCode(97 + colIndex)}${8 - rowIndex}`);
  };

  const handleResign = () => {
    socket.emit('resign');
  };


  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const sec = seconds % 60;
    return `${minutes}:${sec < 10 ? '0' : ''}${sec}`;
  };

  return (
    <div className={styles.container}>
      {gameOverMessage && <div className={styles.gameOverMessage}>{gameOverMessage}</div>}
      <div className="timers">
        <p>White: {formatTime(whiteTime)}</p>
        <p>Black: {formatTime(blackTime)}</p>
      </div>
      <div className={styles.info}>
        <div className={styles.playerInfo}>
          <p>White:</p>
          <p className={styles.playerName}>
            {players.white ? players.white.userName : "Not connected yet"}
          </p>
        </div>
        <div className={styles.playerInfo}>
          <p>Black:</p>
          <p className={styles.playerName}>
            {players.black ? players.black.userName : "Not connected yet"}
          </p>
        </div>
      </div>
      <div className={`${styles.board} ${playerRole === "b" ? styles.rotate180 : ""}`}>
        {board.map((row, rowIndex) =>
          row.map((square, squareIndex) => (
            <div
              key={rowIndex * 8 + squareIndex}
              onClick={() => handleSquareClick(rowIndex, squareIndex, square)}
              className={`${styles.square} ${(rowIndex + squareIndex) % 2 === 0 ? styles.light : styles.dark} 
                          ${playerRole === "b" ? styles.rotate180 : ""} 
                          ${selectedSquare && selectedSquare.row === rowIndex && selectedSquare.col === squareIndex ? styles.selected : ""} 
                          ${isAvailableMove(rowIndex, squareIndex) ? styles.availableMove : ""}`}
            >
              {
                square && square.type && (
                  (() => {
                    console.log(square); // Log the square object for debugging
                    return (
                      <img
                        src={getPieceImage(square)}

                        className={styles.piece}
                      />
                    );
                  })()
                )
              }

            </div>
          ))
        )}
      </div>
      
      <button onClick={handleResign} className={styles.resignButton}>Resign</button>
    </div>
  );
}
