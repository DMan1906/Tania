import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import axios from "axios";

const AuthContext = createContext(null);

const API_URL = `${process.env.REACT_APP_BACKEND_URL}/api`;

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem("candle_token"));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [forceRefresh, setForceRefresh] = useState(0);

  // Configure axios defaults
  useEffect(() => {
    if (token) {
      axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
    } else {
      delete axios.defaults.headers.common["Authorization"];
    }
  }, [token]);

  // Global axios response interceptor: handle 401/403 by clearing token
  useEffect(() => {
    const id = axios.interceptors.response.use(
      (resp) => resp,
      (error) => {
        const status = error.response?.status;
        if (status === 401 || status === 403) {
          localStorage.removeItem("candle_token");
          setToken(null);
          setUser(null);
          // Optional: reload to redirect to login route
          window.location.href = "/login";
        }
        return Promise.reject(error);
      }
    );

    return () => axios.interceptors.response.eject(id);
  }, []);

  // Fetch user on mount if token exists
  const fetchUser = useCallback(async () => {
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      const response = await axios.get(`${API_URL}/auth/me`);
      setUser(response.data);
      setError(null);
    } catch (err) {
      console.error("Failed to fetch user:", err);
      // Token invalid, clear it
      localStorage.removeItem("candle_token");
      setToken(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  const register = async (email, password, name) => {
    try {
      setError(null);
      const response = await axios.post(`${API_URL}/auth/register`, {
        email,
        password,
        name,
      });

      const { access_token, user: userData } = response.data;
      localStorage.setItem("candle_token", access_token);
      setToken(access_token);
      setUser(userData);
      return { success: true };
    } catch (err) {
      const message = err.response?.data?.detail || "Registration failed";
      setError(message);
      return { success: false, error: message };
    }
  };

  const login = async (email, password) => {
    try {
      setError(null);
      const response = await axios.post(`${API_URL}/auth/login`, {
        email,
        password,
      });

      const { access_token, user: userData } = response.data;
      localStorage.setItem("candle_token", access_token);
      setToken(access_token);
      setUser(userData);
      return { success: true };
    } catch (err) {
      const message = err.response?.data?.detail || "Login failed";
      setError(message);
      return { success: false, error: message };
    }
  };

  const logout = () => {
    localStorage.removeItem("candle_token");
    setToken(null);
    setUser(null);
    delete axios.defaults.headers.common["Authorization"];
  };

  // Soft reload mechanism - triggers every 1 second
  useEffect(() => {
    const interval = setInterval(() => {
      setForceRefresh((prev) => prev + 1);
    }, 1000); // 1 second

    return () => clearInterval(interval);
  }, []);

  const refreshUser = async () => {
    await fetchUser();
  };

  const softReload = () => {
    setForceRefresh((prev) => prev + 1);
  };

  const value = {
    user,
    token,
    loading,
    error,
    isAuthenticated: !!user,
    isPaired: !!user?.partner_id,
    forceRefresh, // Expose for components that need to react to soft reloads
    register,
    login,
    logout,
    refreshUser,
    softReload, // Manual soft reload trigger
    clearError: () => setError(null),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
