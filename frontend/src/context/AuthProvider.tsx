import { useState, useEffect, useCallback } from "react";
import { AuthContext } from "./AuthContext";
import { authService } from "@/services/userService";
import api, { setAccessToken } from "@/services/api";
import axios from "axios";
import type { AuthContextType, User } from "./auth.types";

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const isAuthenticated = !!user;

  // Function to update user data in both context and local storage
  const updateUser = useCallback((userData: Partial<User>) => {
    setUser((prev) => {
      if (!prev) return null;

      const updatedUser = {
        ...prev,
        ...userData,
        hasCompletedProfile:
          prev.hasCompletedProfile || userData.hasCompletedProfile || false,
        profile: {
          ...prev.profile,
          ...userData.profile,
        },
      };

      localStorage.setItem("user", JSON.stringify(updatedUser));
      return updatedUser;
    });
  }, []);

  useEffect(() => {
    const checkAuth = async () => {
      const storedUser = localStorage.getItem("user");

      // Optimistically show stored user while we rehydrate
      if (storedUser) {
        try {
          setUser(JSON.parse(storedUser));
        } catch {
          localStorage.removeItem("user");
        }
      }

      try {
        // Rehydrate in-memory access token from httpOnly refresh cookie
        const apiBase = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";
        const { data: refreshData } = await axios.post(
          `${apiBase}/users/refresh`,
          {},
          { withCredentials: true }
        );
        setAccessToken(refreshData.token);

        // Fetch fresh user profile
        const { data: response } = await api.get("/users/me");
        const userData = response.data;
        const normalizedUser = {
          ...userData,
          isAdmin: Boolean(userData.isAdmin),
          hasCompletedProfile:
            userData.hasCompletedProfile ||
            (storedUser ? JSON.parse(storedUser).hasCompletedProfile : false),
        };

        localStorage.setItem("user", JSON.stringify(normalizedUser));
        setUser(normalizedUser);
      } catch {
        // No valid session — clear any stale user data
        setAccessToken(null);
        localStorage.removeItem("user");
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  const login = async (
    credentials: Parameters<AuthContextType["login"]>[0]
  ) => {
    try {
      const response = await authService.login(credentials);
      const userWithAdmin = {
        ...response.user,
        isAdmin: Boolean(response.user.isAdmin),
      };
      setUser(userWithAdmin);
      return { user: userWithAdmin };
    } catch (error) {
      throw error;
    }
  };

  const register = async (
    userData: Parameters<AuthContextType["register"]>[0]
  ) => {
    try {
      const response = await authService.register(userData);
      const userWithDefaults = {
        ...response.user,
        hasCompletedProfile: false,
        isAdmin: Boolean(response.user.isAdmin),
      };
      setUser(userWithDefaults);
      localStorage.setItem("user", JSON.stringify(userWithDefaults));
    } catch (error) {
      throw error;
    }
  };

  const logout = () => {
    authService.logout();
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        setUser,
        isAuthenticated,
        isLoading,
        login,
        register,
        logout,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
