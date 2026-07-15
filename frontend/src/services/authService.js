import api from "./api.js";

//creating objects with authentication objects
export const authService = {
  //for hydrating the global variables using context api (AuthContext)
  getCurrentUser: async () => {
    try {
      const response = await api.get("/auth/me");
      // console.log(response.data) 
      // = {id: '149762467', username: 'Sahil1607cms', avatar_url: 'https://avatars.githubusercontent.com/u/149762467?v=4', displayName: 'Sahil Srivastava'}

      return {
        ...response.data,
        login: response.data?.username || response.data?.displayName, //github may return displayName
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

  // not api request, redirecting to github login page
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
