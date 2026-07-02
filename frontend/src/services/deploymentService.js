import axios from "axios";

const API_SERVER_URL = "http://127.0.0.1:9000";

export const deploymentService = {
  createDeployment: async (githubUrl) => {
    try {
      const response = await axios.post(`${API_SERVER_URL}/project`, {
        githubUrl,
      });
      return response.data;
    } catch (error) {
      console.error("Failed to create deployment:", error);
      throw error;
    }
  },
};
