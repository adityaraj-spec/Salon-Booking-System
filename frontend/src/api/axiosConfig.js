import axios from "axios";

const axiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "/api/v1",
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

// Attach the JWT access token from localStorage as a Bearer token on every request.
// This is necessary in local development where cross-origin cookies (port 5173 → 8000)
// are blocked by the browser. The backend verifyJWT middleware accepts both
// Authorization header and accessToken cookie, so this works without backend changes.
axiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("authToken");
    if (token) {
      config.headers["Authorization"] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If caller opted out of the interceptor (e.g. AuthContext session probe), skip refresh
    if (originalRequest?.skipInterceptor) {
      return Promise.reject(error);
    }

    // Trigger token refresh only on 401 Unauthorized errors (excluding auth endpoints themselves)
    const isAuthEndpoint = originalRequest.url?.includes("/users/login") || originalRequest.url?.includes("/users/refresh-token");

    if (error.response?.status === 401 && !originalRequest._retry && !isAuthEndpoint) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then(() => axiosInstance(originalRequest))
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshRes = await axiosInstance.post("/users/refresh-token");
        const newToken = refreshRes.data?.data?.accessToken;
        if (newToken) {
          localStorage.setItem("authToken", newToken);
        }
        processQueue(null);
        return axiosInstance(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        if (typeof window !== "undefined" && !window.location.pathname.includes("/login")) {
          localStorage.removeItem("user");
          window.location.href = "/login";
        }
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default axiosInstance;
