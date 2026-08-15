import api from "./api";

export const deploymentService = {
  getProjects: async () => {
    try {
      const response = await api.get("/projects");
      return response.data;
    } catch (error) {
      console.error("Failed to fetch projects from MongoDB:", error);
      throw error;
    }
  },

  getProjectById: async (id) => {
    try {
      const response = await api.get(`/projects/${id}`);
      return response.data;
    } catch (error) {
      console.error(`Failed to fetch project ${id} from MongoDB:`, error);
      throw error;
    }
  },

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

  updateProject: async (id, fields) => {
    try {
      const response = await api.patch(`/projects/${id}`, fields);
      return response.data;
    } catch (error) {
      console.error(`Failed to update project ${id} in MongoDB:`, error);
      throw error;
    }
  },

  deleteProject: async (id) => {
    try {
      const response = await api.delete(`/projects/${id}`);
      return response.data;
    } catch (error) {
      console.error(`Failed to delete project ${id} from MongoDB:`, error);
      throw error;
    }
  },
};
