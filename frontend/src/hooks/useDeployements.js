import { useState, useEffect, useCallback } from "react";
import { deploymentService } from "../services/deploymentService";

export const useDeployements = () => {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch projects from MongoDB database
  const fetchProjects = useCallback(async () => {
    setLoading(true);
    try {
      const data = await deploymentService.getProjects();
      setProjects(data || []);
      setError(null);
    } catch (err) {
      console.error("Failed to load projects from MongoDB:", err);
      setError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const createProject = async (githubUrl) => {
    setLoading(true);
    try {
      const res = await deploymentService.createDeployment(githubUrl);
      const randomId = res.data.randomId;
      const url = res.data.url;

      let name = "Unnamed Project";
      try {
        const parts = githubUrl.split("/");
        name = parts[parts.length - 1].replace(".git", "") || "New Project";
      } catch (err) {}

      const newProject = res.data.project || {
        id: randomId,
        name,
        repoUrl: githubUrl,
        status: "Building",
        url: url,
        logs: [],
        createdAt: new Date().toISOString(),
      };

      setProjects((prev) => [newProject, ...prev.filter((p) => p.id !== newProject.id)]);
      return newProject;
    } catch (error) {
      console.error("Deployment failed", error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Update project status and logs in MongoDB
  const updateProject = async (id, fields) => {
    setProjects((prev) =>
      prev.map((p) => (p.id === id ? { ...p, ...fields } : p))
    );

    try {
      await deploymentService.updateProject(id, fields);
    } catch (err) {
      console.error(`Failed to update project ${id} in MongoDB:`, err);
    }
  };

  const deleteProject = async (id) => {
    setProjects((prev) => prev.filter((p) => p.id !== id));

    try {
      await deploymentService.deleteProject(id);
    } catch (err) {
      console.error(`Failed to delete project ${id} from MongoDB:`, err);
    }
  };

  return {
    projects,
    loading,
    error,
    createProject,
    updateProject,
    deleteProject,
    fetchProjects,
  };
};
