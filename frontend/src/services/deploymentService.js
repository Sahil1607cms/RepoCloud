import api from "./api";

export const deploymentService = {
  createDeployment: async (githubUrl) => {
    try {
      const response = await api.post("/project", {
        githubUrl,
      });
      return response.data;
    } catch (error) {
      console.error("Failed to create deployment:", error);
      throw error;
    }
  },
};
