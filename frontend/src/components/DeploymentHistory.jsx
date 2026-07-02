import React from "react";
import ProjectCard from "./ProjectCard";

const DeploymentHistory = ({ projects }) => {
  if (!projects || projects.length === 0) {
    return (
      <div className="rounded-3xl border border-zinc-800 bg-zinc-950 p-8 text-center text-zinc-500">
        No deployments found. Start by entering a GitHub URL above!
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      {projects.map((project) => (
        <ProjectCard key={project.id} project={project} />
      ))}
    </div>
  );
};

export default DeploymentHistory;
