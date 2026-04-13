import { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  // Check for token in URL immediately during initialization
  const hasTokenInUrl = new URLSearchParams(window.location.search).has('token');

  const [user, setUser] = useState(() => {
    if (hasTokenInUrl) return null; // Ignore stale localStorage if a new token is incoming
    try {
      const stored = localStorage.getItem('adminUser');
      return stored ? JSON.parse(stored) : null;
    } catch { return null; }
  });
  
  const [loading, setLoading] = useState(hasTokenInUrl); // Wait for profile fetch if token present

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    
    if (token) {
      // Clear token from URL for security
      window.history.replaceState({}, document.title, window.location.pathname);
      
      // CRITICAL: Clear potentially stale user data before fetching new profile
      localStorage.removeItem('adminUser');
      localStorage.setItem('adminToken', token);
      
      const fetchProfile = async () => {
        setLoading(true);
        try {
          const res = await api.get('/users/me');
          if (res.data.success) {
            const userData = res.data.data.user;
            if (userData.role === 'customer' || userData.role === 'staff') {
              throw new Error('Access Denied. Admin accounts only.');
            }
            localStorage.setItem('adminUser', JSON.stringify(userData));
            setUser(userData);
          }
        } catch (error) {
          console.error('Auto login failed:', error);
          localStorage.removeItem('adminToken');
          localStorage.removeItem('adminUser');
          setUser(null);
        } finally {
          setLoading(false);
        }
      };
      
      fetchProfile();
    }
  }, []);

  const login = async (email, password) => {
    setLoading(true);
    try {
      const response = await api.post('/users/login', { email, password });
      const { user: userData, accessToken } = response.data.data;

      if (userData.role === 'customer' || userData.role === 'staff') {
        throw new Error('Access Denied. Admin accounts only.');
      }

      localStorage.setItem('adminToken', accessToken);
      localStorage.setItem('adminUser', JSON.stringify(userData));
      setUser(userData);
      return userData;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try { await api.post('/users/logout'); } catch { /* silent */ }
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminUser');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
