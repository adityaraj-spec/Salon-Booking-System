import React, { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext();

export const useSocket = () => useContext(SocketContext);

export const SocketProvider = ({ children }) => {
    const { user } = useAuth();
    const [socket, setSocket] = useState(null);

    useEffect(() => {
        if (user) {
            const token = localStorage.getItem("authToken");
            const userId = user._id || user.id || "";
            const backendUrl = import.meta.env.VITE_BACKEND_URL || (typeof window !== "undefined" && window.location.hostname === "localhost" ? "http://localhost:8000" : window.location.origin);
            const newSocket = io(backendUrl, {
                auth: { token },
                query: { token, userId },
                transports: ["polling", "websocket"],
                withCredentials: true
            });

            setSocket(newSocket);

            return () => {
                newSocket.disconnect();
            };
        } else {
            if (socket) {
                socket.disconnect();
                setSocket(null);
            }
        }
    }, [user]);

    return (
        <SocketContext.Provider value={socket}>
            {children}
        </SocketContext.Provider>
    );
};
