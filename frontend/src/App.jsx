import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Login from './components/Login';
import Register from './components/Register';
import ChessBoard from './ChessBoard';
import Navbar from './components/Navbar';
import Home from './Home';
import ProfilePage from './pages/ProfilePage';
import GameDetail from './components/GameDetail';


export default function App() {
  return (
    <Router>
      <Navbar />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/" element={<Home/>} />
        <Route path="/chessboard" element={<ChessBoard />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/game/:id" element={<GameDetail />} />

      </Routes>
    </Router>
  )
}