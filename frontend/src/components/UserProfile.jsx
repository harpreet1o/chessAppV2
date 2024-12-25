import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';

const UserProfile = () => {
    const [profile, setProfile] = useState();
    const [loading, setLoading] = useState(true); // Set to false since we're using dummy data
    const [error, setError] = useState(null);
    const [games, setGames] = useState();

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const response = await axios.get('http://localhost:3000/user/profile', { withCredentials: true });
                setProfile(response.data);
                setLoading(false);
            } catch (err) {
                setError(err.response ? err.response.data.message : 'Error fetching profile');
                setLoading(false);
            }
        };
        fetchProfile();
    }, []);

    if (loading) {
        return <div className="flex justify-center items-center h-screen"><div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-blue-500"></div></div>;
    }

    if (error) {
        return <div className="text-center text-red-500">{error}</div>;
    }

    return (
        <div className="container mx-auto mt-8">
            <div className="flex justify-center items-center">
                <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-6">
                    <div className="flex items-center space-x-4 mb-6">
                        <div className="w-16 h-16 rounded-full bg-blue-500 flex items-center justify-center text-white text-2xl">
                            {profile.name.charAt(0)}
                        </div>
                        <div>
                            <h2 className="text-xl font-semibold">{profile.name}</h2>
                            <p className="text-gray-600">{profile.email}</p>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="text-center">
                            <h3 className="text-gray-600">Games Played</h3>
                            <p className="text-2xl font-bold">{profile.gamesPlayed}</p>
                        </div>
                        <div className="text-center">
                            <h3 className="text-gray-600">Games Won</h3>
                            <p className="text-2xl font-bold">{profile.gamesWon}</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default UserProfile;
