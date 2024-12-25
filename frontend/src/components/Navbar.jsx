import React, { useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { UserContext } from '../context/UserContext';
import axios from 'axios';

const Navbar = () => {
  const { user, setUser } = useContext(UserContext);
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await axios.post('http://localhost:3000/logout',{}, { withCredentials: true });
      setUser(null);
      navigate('/login');
    } catch (err) {
      console.error('Error during logout:', err);
    }
  };

  return (
    <nav className="p-4 bg-blue-500 text-white shadow-lg">
      <div className="container mx-auto flex justify-between items-center">
        <h1 className="text-2xl font-bold">
          <Link to="/" className="hover:text-gray-200">Chess App</Link>
        </h1>
        <Link to="/">Home</Link>

        <Link to="/profile">Profile</Link>
        <div>
          {user ? (
            <div className="flex items-center">
              <span className="mr-4">Hi, {user}</span>
              <button 
                onClick={handleLogout} 
                className="bg-red-500 px-4 py-2 rounded hover:bg-red-600 transition duration-200"
              >
                Logout
              </button>
            </div>
          ) : (
            <div className="flex items-center">
              <Link 
                to="/login" 
                className="bg-blue-600 px-4 py-2 rounded hover:bg-blue-700 transition duration-200 mr-4"
              >
                Login
              </Link>
              <Link 
                to="/register" 
                className="bg-green-500 px-4 py-2 rounded hover:bg-green-600 transition duration-200"
              >
                Register
              </Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
