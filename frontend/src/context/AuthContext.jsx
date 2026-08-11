import { createContext, useContext, useState, useEffect } from "react";
import axiosInstance from "../api/axiosConfig";
import { useNotification } from "./NotificationContext";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const { showNotification } = useNotification();
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchCurrentUser = async () => {
            try {
                // skipInterceptor = true prevents the 401 interceptor from firing
                // a pointless token refresh when the user simply has no session yet.
                const response = await axiosInstance.get("/users/me", { skipInterceptor: true });
                if (response.data?.data) {
                    setUser(response.data.data);
                    localStorage.setItem("user", JSON.stringify(response.data.data));
                }
            } catch (error) {
                // 401 here just means "not logged in" — silently fall back to localStorage
                const storedUser = localStorage.getItem("user");
                if (storedUser && storedUser !== "undefined") {
                    try {
                        setUser(JSON.parse(storedUser));
                    } catch (e) {
                        localStorage.removeItem("user");
                    }
                }
            } finally {
                setLoading(false);
            }
        };

        fetchCurrentUser();
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
