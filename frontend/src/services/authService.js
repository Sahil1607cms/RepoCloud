import api from "./api";

export const authService = {
  // Get current user info
  getCurrentUser: async () => {
    try {
      const response = await api.get("/auth/me");
      return {
        ...response.data,
        login: response.data?.username || response.data?.displayName,
      };
    } catch (error) {
      console.error("Failed to get current user:", error);
      throw error;
    }
  },

  // Logout
  logout: async () => {
    try {
      await api.post("/auth/logout");
    } catch (error) {
      console.error("Failed to logout:", error);
      throw error;
    }
  },

  // GitHub login redirect
  loginWithGithub: () => {
    window.location.href = `${import.meta.env.VITE_API_URL || "http://localhost:3000"}/auth/github`;
  },

  // Check if user is authenticated
  isAuthenticated: async () => {
    try {
      await api.get("/auth/me");
      return true;
    } catch (error) {
      return false;
    }
  },
};
