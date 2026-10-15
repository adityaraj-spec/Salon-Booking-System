import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL;

const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

// Attach token from sessionStorage on every request
api.interceptors.request.use((config) => {
  const token = sessionStorage.getItem('adminToken');
  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 → redirect to login, but NOT during the login request itself
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const isLoginRequest = error.config?.url?.includes('/users/login');
    const isAlreadyOnLogin = window.location.pathname === '/login';

    if (error.response?.status === 401 && !isLoginRequest && !isAlreadyOnLogin) {
      sessionStorage.removeItem('adminToken');
      sessionStorage.removeItem('adminUser');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
