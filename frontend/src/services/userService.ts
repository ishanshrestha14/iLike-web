import api, { setAccessToken, getAccessToken } from "./api";

export interface User {
  id?: string;
  name: string;
  email: string;
  password?: string;
  isAdmin: boolean;  // Changed from optional to required
  bio?: string;
  avatar?: string;
  hasCompletedProfile?: boolean;
  profile?: {
    gender?: string;
    interests?: string[];
    age?: number;
    bio?: string;
    profilePicture?: string;
  };
  // Add other user properties as needed
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData extends Omit<User, "id" | 'isAdmin'> {
  password: string;
  isAdmin?: boolean;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export const authService = {
  // Register a new user
  async register(userData: RegisterData): Promise<AuthResponse> {
    const response = await api.post<AuthResponse>("/users/register", userData);
    const { token, user } = response.data;
    if (token) {
      setAccessToken(token);
      localStorage.setItem("user", JSON.stringify(user));
    }
    return response.data;
  },

  // Login user
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    try {
      console.log('Sending login request with:', credentials);
      const response = await api.post<AuthResponse>("/users/login", credentials);
      console.log('Login response received:', response.data);
      
      const { token, user } = response.data;
      if (token) {
        setAccessToken(token);
        localStorage.setItem("user", JSON.stringify(user));
      } else {
        throw new Error('Authentication failed: No token received');
      }
      return response.data;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      const errorData = error && typeof error === 'object' && 'response' in error
        ? error.response as { data?: unknown; status?: number; headers?: unknown }
        : null;
      
      console.error('Login error:', {
        message: errorMessage,
        response: errorData?.data,
        status: errorData?.status,
        headers: errorData?.headers
      });
      
      // Re-throw with a more specific error if possible
      if (errorData?.data && typeof errorData.data === 'object' && errorData.data !== null) {
        const data = errorData.data as { message?: string };
        throw new Error(data.message || errorMessage);
      }
      
      throw new Error(errorMessage);
    }
  },

  // Logout user
  async logout(): Promise<void> {
    try {
      await api.post("/users/logout");
    } catch {
      // Ignore errors — we're logging out anyway
    }
    setAccessToken(null);
    localStorage.removeItem("user");
    window.location.href = "/auth";
  },

  // Get auth token
  getToken(): string | null {
    return getAccessToken();
  },

  // Check if user is authenticated
  isAuthenticated(): boolean {
    return !!getAccessToken();
  },

  // Get current user profile (me)
  async getCurrentUser(): Promise<User> {
    try {
      const response = await api.get<{ success: boolean; data: User }>("/users/me");
      const user = response.data.data;
      
      // Update local storage with fresh user data
      if (user) {
        const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
        const updatedUser = {
          ...currentUser,
          ...user,
          // Preserve the hasCompletedProfile flag if it exists
          hasCompletedProfile: currentUser.hasCompletedProfile || user.hasCompletedProfile || false,
          // Merge profile data if it exists
          profile: {
            ...currentUser.profile,
            ...user.profile
          }
        };
        
        localStorage.setItem('user', JSON.stringify(updatedUser));
        return updatedUser;
      }
      
      return user;
    } catch (error) {
      console.error('Error fetching current user:', error);
      throw error;
    }
  },

  // Get user profile (other user) 
  async getProfile(userId: string): Promise<User> {
    const response = await api.get<User>(`/users/profile/${userId}`);
    return response.data;
  },

  // Update user profile
  async updateProfile(userId: string, userData: Partial<User>): Promise<User> {
    const response = await api.put<User>(`/users/profile/${userId}`, userData);
    return response.data;
  },

  // Request password reset email
  async forgotPassword(email: string): Promise<void> {
    await api.post("/users/forgot-password", { email });
  },

  // Reset password with token — returns new access token on success
  async resetPassword(token: string, password: string): Promise<string> {
    const response = await api.post<{ success: boolean; token: string }>(
      `/users/reset-password/${token}`,
      { password }
    );
    return response.data.token;
  },

  // Delete account
  async deleteAccount(password: string): Promise<void> {
    await api.delete("/users/me", { data: { password } });
    setAccessToken(null);
    localStorage.removeItem("user");
  },

  // Get all users (for admin)
  async getAllUsers(): Promise<User[]> {
    const response = await api.get<User[]>("/users");
    return response.data;
  },

};
