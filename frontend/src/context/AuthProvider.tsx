import { useState, useEffect, useCallback } from "react";
import { AuthContext } from "./AuthContext";
import { authService } from "@/services/userService";
import api from "@/services/api";
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
      const token = authService.getToken();
      const storedUser = localStorage.getItem("user");

      if (!token) {
        setIsLoading(false);
        return;
      }

      try {
        // If we have a stored user, use it while we fetch fresh data
        if (storedUser) {
          const parsedUser = JSON.parse(storedUser);
          setUser(parsedUser);
        }

        // Fetch current user's profile using axios (supports silent refresh)
        const { data: userData } = await api.get("/users/me");
        // Ensure isAdmin is always a boolean and merge with existing user data
        const normalizedUser = {
          ...userData,
          isAdmin: Boolean(userData.isAdmin),
          // Preserve hasCompletedProfile from local storage if it exists
          hasCompletedProfile:
            userData.hasCompletedProfile ||
            (storedUser ? JSON.parse(storedUser).hasCompletedProfile : false),
        };

        // Update the stored user data
        localStorage.setItem("user", JSON.stringify(normalizedUser));
        setUser(normalizedUser);
      } catch (error) {
        console.error("Failed to fetch user profile", error);
        authService.logout();
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  const login = async (
    credentials: Parameters<AuthContextType["login"]>[0]
  ) => {
    console.log("Attempting login with:", credentials.email);
    try {
      const response = await authService.login(credentials);
      console.log("Login response in AuthContext:", response);

      // Ensure isAdmin is a boolean
      const userWithAdmin = {
        ...response.user,
        isAdmin: Boolean(response.user.isAdmin),
      };

      console.log("Setting user in context:", userWithAdmin);
      setUser(userWithAdmin);
      return { user: userWithAdmin };
    } catch (error) {
      console.error("Login failed:", error);
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
        hasCompletedProfile: false, // New users always start with incomplete profile
        isAdmin: Boolean(response.user.isAdmin),
      };
      setUser(userWithDefaults);
      localStorage.setItem("user", JSON.stringify(userWithDefaults));
    } catch (error) {
      console.error("Registration failed:", error);
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
