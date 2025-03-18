import { Chess } from 'chess.js';
import { useState, useMemo, useEffect } from 'react';
import { useParams } from 'react-router-dom';

export default function GameDetail() {
  const { gameId } = useParams();
  const chess = useMemo(() => new Chess(), []);
  const [board, setBoard] = useState(chess.board());
  const [gameHistory, setGameHistory] = useState([]);
  const [currentMoveIndex, setCurrentMoveIndex] = useState(0);

  useEffect(() => {
    // Fetch game history from the backend using gameId
    const fetchGameHistory = async () => {
      try {
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
        const response = await fetch(`${apiUrl}/api/games/${gameId}`);
        const data = await response.json();
        setGameHistory(data.gameHistory);
        chess.load(data.gameState);
        setBoard([...chess.board()]);
      } catch (error) {
        console.error('Error fetching game history:', error);
      }
    };

    fetchGameHistory();
  }, [gameId, chess]);

  const getPieceImage = (piece) => {
    const pieceImages = {
      p: '♟',
      r: '♜',
      n: '♞',
      b: '♝',
      q: '♛',
      k: '♚',
      P: '♙',
      R: '♖',
      N: '♘',
      B: '♗',
      Q: '♕',
      K: '♔',
    };
    return piece ? pieceImages[piece.type] : '';
  };

  const handleMoveClick = (moveIndex) => {
    chess.reset();
    for (let i = 0; i <= moveIndex; i++) {
      chess.move(gameHistory[i]);
    }
    setBoard([...chess.board()]);
    setCurrentMoveIndex(moveIndex);
  };

  return (
    <div>
      <div>
        {board.map((row, rowIndex) =>
          row.map((square, squareIndex) => (
            <div
              key={rowIndex * 8 + squareIndex}
              style={{
                width: '50px',
                height: '50px',
                display: 'inline-block',
                backgroundColor: (rowIndex + squareIndex) % 2 === 0 ? 'white' : 'gray',
                textAlign: 'center',
                lineHeight: '50px',
                fontSize: '24px',
              }}
            >
              {square && getPieceImage(square)}
            </div>
          ))
        )}
      </div>
      <div>
        {gameHistory.map((move, index) => (
          <div
            key={index}
            style={{
              cursor: 'pointer',
              fontWeight: index === currentMoveIndex ? 'bold' : 'normal',
            }}
            onClick={() => handleMoveClick(index)}
          >
            {move.san}
          </div>
        ))}
      </div>
    </div>
  );
}
