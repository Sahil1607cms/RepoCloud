import { useState, useEffect } from "react";
import { deploymentService } from "../services/deploymentService";

export const useDeployements = () => {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(false);

  // Load from localStorage
  useEffect(() => {
    const stored = localStorage.getItem("repocloud_projects");
    if (stored) {
      try {
        setProjects(JSON.parse(stored));
      } catch (e) {
        console.error("Failed to parse projects", e);
      }
    }
  }, []);

  const saveProjects = (updated) => {
    setProjects(updated);
    localStorage.setItem("repocloud_projects", JSON.stringify(updated));
  };

  const createProject = async (githubUrl) => {
    setLoading(true);
    try {
      const res = await deploymentService.createDeployment(githubUrl);
      const randomId = res.data.randomId;
      const url = res.data.url;
      
      // Extract repo name
      let name = "Unnamed Project";
      try {
        const parts = githubUrl.split("/");
        name = parts[parts.length - 1].replace(".git", "") || "New Project";
      } catch (err) {
        // Fallback
      }

      const newProject = {
        id: randomId,
        name,
        repoUrl: githubUrl,
        status: "Building",
        url: url,
        logs: [],
        createdAt: new Date().toISOString()
      };

      const updated = [newProject, ...projects];
      saveProjects(updated);
      return newProject;
    } catch (error) {
      console.error("Deployment failed", error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const updateProject = (id, fields) => {
    // We fetch current projects from localStorage to ensure we don't overwrite concurrent changes
    const stored = localStorage.getItem("repocloud_projects");
    let currentProjects = projects;
    if (stored) {
      try {
        currentProjects = JSON.parse(stored);
      } catch (e) {}
    }
    const updated = currentProjects.map(p => {
      if (p.id === id) {
        return { ...p, ...fields };
      }
      return p;
    });
    saveProjects(updated);
  };

  const deleteProject = (id) => {
    const stored = localStorage.getItem("repocloud_projects");
    let currentProjects = projects;
    if (stored) {
      try {
        currentProjects = JSON.parse(stored);
      } catch (e) {}
    }
    const updated = currentProjects.filter(p => p.id !== id);
    saveProjects(updated);
  };

  return {
    projects,
    loading,
    createProject,
    updateProject,
    deleteProject,
  };
};
