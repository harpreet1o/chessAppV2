// components/Home.js
import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserContext } from './context/UserContext';
import Games from './components/Games';

const Home = () => {
  const navigate = useNavigate();
  const { user } = useContext(UserContext);
  const [selectedTime, setSelectedTime] = useState('1'); // Default to 1 minute
  const [message, setMessage] = useState('');

  const handleCreateGame = () => {
    if (user) {
      navigate('/chessboard', { state: { time: selectedTime } });
    } else {
      setMessage('Please log in to create a game.');
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4 text-center">Welcome to the Chess Game</h1>
      {message && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4 text-center" role="alert">
          <span className="block sm:inline">{message}</span>
        </div>
      )}
      <div className="flex flex-col items-center">
        <label className="mb-4">
          <span className="block text-lg font-semibold mb-2">Select Game Time:</span>
          <select value={selectedTime} onChange={(e) => setSelectedTime(e.target.value)} className="border rounded px-2 py-1">
            <option value="1">1 Minute</option>
            <option value="5">5 Minutes</option>
            <option value="10">10 Minutes</option>
          </select>
        </label>
        <button onClick={handleCreateGame} className="bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600">
          Create Game
        </button>
      </div>
      <Games />
    </div>
  );
};

export default Home;
