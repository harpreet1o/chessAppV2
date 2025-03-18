import React, { createContext, useState, useEffect } from 'react';
import axios from 'axios';

const UserContext = createContext();

const UserProvider = ({ children }) => {
  const [user, setUser] = useState(null);


  useEffect(() => {
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
    console.log(apiUrl)
    const test = async () => {
      const res=await axios.get(`${apiUrl}/hi`, { withCredentials: true })
      console.log("hello")
      console.log(res);
    }
    test();
    const fetchUser = async () => {
      try {
        const res = await axios.get(`${apiUrl}/current_user`, { withCredentials: true });
        console.log(res.data)
        if(res)
          setUser(res.data.username);
      }
      catch (err) {
        setUser(null);
        console.error(err);
      }
    };

    fetchUser();
  }, []);

  return (
    <UserContext.Provider value={{ user, setUser }}>
      {children}
    </UserContext.Provider>
  );
};

export { UserContext, UserProvider };
