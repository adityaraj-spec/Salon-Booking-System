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
            const token = localStorage.getItem("authToken");
            if (!token) {
                // Visitor has no auth token — treat as guest and skip unnecessary 401 probe
                setUser(null);
                setLoading(false);
                return;
            }

            try {
                // skipInterceptor = true prevents the 401 interceptor from firing
                // a token refresh loop when checking initial session state.
                const response = await axiosInstance.get("/users/me", { skipInterceptor: true });
                const userData = response.data?.data?.user || response.data?.data;
                if (userData) {
                    setUser(userData);
                    localStorage.setItem("user", JSON.stringify(userData));
                }
            } catch (error) {
                // Token is expired or invalid — clear stale credentials
                localStorage.removeItem("authToken");
                localStorage.removeItem("user");
                setUser(null);
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
