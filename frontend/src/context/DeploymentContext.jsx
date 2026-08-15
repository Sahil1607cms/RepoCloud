import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { deploymentService } from "../services/deploymentService";

export const DeploymentContext = createContext();

export const DeploymentProvider = ({ children }) => {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch projects from backend
  const fetchProjects = useCallback(async () => {
    setLoading(true);
    try {
      const data = await deploymentService.getProjects();
      setProjects(data || []);
      setError(null);
    } catch (err) {
      console.error("Failed to load projects:", err);
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
      const randomId = res.data?.randomId;
      const url = res.data?.url;

      let name = "Unnamed Project";
      try {
        const parts = githubUrl.split("/");
        name = parts[parts.length - 1].replace(".git", "") || "New Project";
      } catch (err) {}

      const newProject = res.data?.project || {
        id: randomId,
        projectId: randomId,
        name,
        repoUrl: githubUrl,
        status: "Building",
        url: url,
        logs: [],
        createdAt: new Date().toISOString(),
      };

      setProjects((prev) => [
        newProject,
        ...prev.filter((p) => p.id !== newProject.id && p.projectId !== newProject.id),
      ]);
      return newProject;
    } catch (error) {
      console.error("Deployment failed", error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const updateProject = async (id, fields) => {
    setProjects((prev) =>
      prev.map((p) => (p.id === id || p.projectId === id ? { ...p, ...fields } : p))
    );

    try {
      await deploymentService.updateProject(id, fields);
    } catch (err) {
      console.error(`Failed to update project ${id}:`, err);
    }
  };

  const deleteProject = async (id) => {
    setProjects((prev) => prev.filter((p) => p.id !== id && p.projectId !== id));

    try {
      await deploymentService.deleteProject(id);
    } catch (err) {
      console.error(`Failed to delete project ${id}:`, err);
    }
  };

  return (
    <DeploymentContext.Provider
      value={{
        projects,
        loading,
        error,
        createProject,
        updateProject,
        deleteProject,
        fetchProjects,
        setProjects,
      }}
    >
      {children}
    </DeploymentContext.Provider>
  );
};

export const useDeployements = () => {
  const context = useContext(DeploymentContext);
  if (!context) {
    return {
      projects: [],
      loading: false,
      error: null,
      createProject: async () => {},
      updateProject: async () => {},
      deleteProject: async () => {},
      fetchProjects: async () => {},
    };
  }
  return context;
};
