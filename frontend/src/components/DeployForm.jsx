import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useDeployements } from "../hooks/useDeployements";

const DeployForm = () => {
  const [repoUrl, setRepoUrl] = useState("");
  const { createProject, loading } = useDeployements();
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleDeploy = async () => {
    if (!repoUrl.trim()) {
      setError("Please enter a valid GitHub repository URL");
      return;
    }
    setError("");
    try {
      const project = await createProject(repoUrl.trim());
      navigate(`/project/${project.id}`);
    } catch (err) {
      console.error(err);
      const serverErrMsg = err.response?.data?.details || err.response?.data?.error || err.message;
      setError(`Failed to start deployment: ${serverErrMsg}`);
    }
  };

  return (
    <div className="rounded-3xl border border-zinc-800 bg-zinc-950 p-8 shadow-xl">
      <h2 className="text-3xl font-bold">
        Deploy Repository
      </h2>

      <p className="mt-2 text-zinc-400">
        Paste your GitHub repository URL below to trigger an automatic containerized build and S3 deployment.
      </p>

      <input
        value={repoUrl}
        onChange={(e) => {
          setRepoUrl(e.target.value);
          if (error) setError("");
        }}
        placeholder="https://github.com/user/repo"
        className="mt-6 w-full rounded-xl border border-zinc-700 bg-black p-4 text-white focus:border-purple-500 outline-none transition"
      />

      {error && (
        <p className="mt-3 text-sm text-red-400">
          {error}
        </p>
      )}

      <button
        onClick={handleDeploy}
        disabled={loading}
        className="mt-6 w-full rounded-xl bg-gradient-to-r from-purple-500 to-blue-500 py-4 font-semibold text-white transition hover:opacity-90 active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? "Starting Deployment..." : "Start Deployment"}
      </button>
    </div>
  );
};

export default DeployForm;
