"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface AuthContextProps {
  token: string | null;
  login: (t: string) => void;
  logout: () => void;
  loading: boolean;
  refreshToken: () => Promise<string | null>;
}

const AuthContext = createContext<AuthContextProps | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const storedToken = localStorage.getItem("token");
    if (storedToken) {
      setToken(storedToken);
    }
    setLoading(false);
  }, []);

  const login = (t: string) => {
    localStorage.setItem("token", t);
    setToken(t);
  };

  const logout = () => {
    localStorage.removeItem("token");
    setToken(null);
    router.push("/login");
  };

  const refreshToken = async (): Promise<string | null> => {
    try {
      const response = await fetch("http://localhost:8000/api/refresh", {
        method: "POST",
        credentials: "include", // Include cookies if refresh token is stored in HttpOnly cookies
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }), // Adjust payload based on backend requirements
      });

      if (!response.ok) {
        throw new Error("Failed to refresh token");
      }

      const data = await response.json();
      const newToken = data.token; // Adjust based on backend response structure
      if (newToken) {
        localStorage.setItem("token", newToken);
        setToken(newToken);
        return newToken;
      }
      return null;
    } catch (error) {
      console.error("Token refresh failed:", error);
      logout();
      return null;
    }
  };

  return (
    <AuthContext.Provider value={{ token, login, logout, loading, refreshToken }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};