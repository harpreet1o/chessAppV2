// src/components/Games.js
import React, { useEffect, useState,useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { UserContext } from '../context/UserContext';

const Games = () => {
     const { user} = useContext(UserContext);
    const [games, setGames] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
        const fetchGames = async () => {
            try {
                const response = await axios.get(`${apiUrl}/user/games`, { withCredentials: true });
                console.log(response.data);
                setGames(response.data);
                setLoading(false);
            } catch (error) {
                setError('Error fetching games');
                setLoading(false);
            }
        };

        fetchGames();
    }, []);

    const handleGameClick = (game) => {
        navigate(`/game/${game.id}`, { state: { game } });
    };



    if (loading) {
        return (
            <div className="flex justify-center items-center h-screen">
                <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    if (error) {
        return <div className="text-center text-red-700 m-4">No Games to display</div>;
    }

    return (
        <div className="container mx-auto mt-8">
            <h1 className="text-3xl font-bold mb-6 text-center">Games Played</h1>
         
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
{games.map((game) => (
    <div
        key={game.id}
        onClick={() => handleGameClick(game)}
        className="border rounded-lg shadow-lg p-6 cursor-pointer hover:bg-gray-100 transition duration-300"
    >
        <div className="mb-4">
            <h2 className="text-xl font-semibold">Game ID: {game.id}</h2>
        </div>
        <div className="flex justify-center items-center">
            <img
                src="https://thechessworld.com/wp-content/uploads/2021/03/setup-1-9-10-300x300.webp"
                alt="Chess Board"
                style={{ width: '200px', height: '200px' }}
            />
        </div>
        <div>
            <p className="text-black-500">
                <strong>Result</strong> {game.result==="d"?"draw":game.result==="w"&&game.white_player===user?"win":game.result==="w"&&game.black_player===user?"lose":game.result==="b"&&game.white_player===user?"lose":"win"}</p>
        </div>
    </div>
))}
</div>
</div>
    );
};

export default Games;
