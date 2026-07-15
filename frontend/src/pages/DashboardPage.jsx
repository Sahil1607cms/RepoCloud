import React from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import DeployForm from "../components/DeployForm";
import DeploymentHistory from "../components/DeploymentHistory";
import { useDeployements } from "../hooks/useDeployements";

const DashboardPage = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { projects } = useDeployements();

  const handleLogout = async () => {
    await logout();
    // Add a small delay to ensure state updates are processed
    setTimeout(() => {
      navigate("/", { replace: true });
    }, 200);
  };

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <div className="border-b border-zinc-800">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <h1
            onClick={() => navigate("/")}
            className="cursor-pointer text-3xl font-bold hover:opacity-85 transition"
          >
            RepoCloud
          </h1>

          <div className="flex items-center gap-4">
            {user?.login && (
              <span className="text-zinc-400 font-medium">
                {user.login}
              </span>
            )}

            <button
              onClick={handleLogout}
              className="rounded-lg border border-zinc-700 hover:border-zinc-500 bg-zinc-950 px-4 py-2 hover:bg-zinc-900 transition active:scale-[0.98]"
            >
              Logout
            </button>
          </div>
        </div>
      </div>

      {/* Main */}
      <div className="mx-auto max-w-6xl px-6 py-10">
        <h2 className="mb-8 text-4xl font-bold bg-gradient-to-r from-white to-zinc-400 bg-clip-text text-transparent">
          Dashboard
        </h2>

        <DeployForm />

        <div className="mt-12">
          <h3 className="mb-6 text-2xl font-semibold">
            Past Projects
          </h3>

          <DeploymentHistory projects={projects} />
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
