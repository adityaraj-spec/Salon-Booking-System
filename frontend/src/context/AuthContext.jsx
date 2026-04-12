import { createContext, useContext, useState, useEffect } from "react";
import axiosInstance from "../api/axiosConfig";
import { useNotification } from "./NotificationContext";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const { showNotification } = useNotification();
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Here you could fetch the current user if you had a /me endpoint
        // For now, let's assume session is handled by cookies
        const storedUser = localStorage.getItem("user");
        if (storedUser) {
            setUser(JSON.parse(storedUser));
        }
        setLoading(false);
    }, []);

    const login = (userData) => {
        setUser(userData);
        localStorage.setItem("user", JSON.stringify(userData));
    };

    const updateUserRole = (newRole) => {
        if (user) {
            const updatedUser = { ...user, role: newRole };
            setUser(updatedUser);
            localStorage.setItem("user", JSON.stringify(updatedUser));
        }
    };

    const logout = async () => {
        try {
            await axiosInstance.post("/users/logout");
            showNotification("Logged out successfully. See you soon!", "success");
        } catch (error) {
            console.error("Logout failed:", error);
            // Even if backend fails (e.g. token expired), we should still log out on frontend
            showNotification("Signed out from local session.", "info");
        } finally {
            setUser(null);
            localStorage.removeItem("user");
            localStorage.removeItem("authToken");
            window.location.href = "/login";
        }
    };

    return (
        <AuthContext.Provider value={{ user, loading, login, logout, updateUserRole }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
