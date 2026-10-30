import React, { createContext, useContext, useState, useEffect } from "react";
import { User, UserRole } from "../types/api";
import { apiClient } from "../api/client";

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  hasRole: (allowedRoles: UserRole[]) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    const cached = localStorage.getItem("fleetflow_user");
    return cached ? JSON.parse(cached) : null;
  });
  const [token, setToken] = useState<string | null>(() => localStorage.getItem("fleetflow_token"));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const verifyToken = async () => {
      if (token) {
        try {
          const freshUser = await apiClient.getCurrentUser();
          setUser(freshUser);
          localStorage.setItem("fleetflow_user", JSON.stringify(freshUser));
        } catch (err) {
          logout();
        }
      }
      setLoading(false);
    };
    verifyToken();
  }, [token]);

  const login = async (email: string, password: string) => {
    const res = await apiClient.login(email, password);
    setToken(res.access_token);
    setUser(res.user);
    localStorage.setItem("fleetflow_token", res.access_token);
    localStorage.setItem("fleetflow_user", JSON.stringify(res.user));
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem("fleetflow_token");
    localStorage.removeItem("fleetflow_user");
  };

  const hasRole = (allowedRoles: UserRole[]) => {
    if (!user) return false;
    if (user.role === "admin") return true;
    return allowedRoles.includes(user.role);
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout, hasRole }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
};
