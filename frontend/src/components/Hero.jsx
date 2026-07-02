import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const Hero = () => {
  const navigate = useNavigate();
  const { isAuthenticated, loading } = useAuth();

  const handleDeployNow = () => {
    // Wait for auth context to finish loading before deciding
    if (loading) {
      return; // Don't allow clicks while loading
    }
    
    if (isAuthenticated) {
      navigate("/dashboard");
    } else {
      navigate("/login");
    }
  };

  return (
    <section className="mx-auto max-w-7xl px-6 py-24">
      <div className="grid md:grid-cols-2 gap-12 items-center">
        <div>
          <span className="rounded-full border border-purple-500 px-4 py-2 text-sm text-purple-300">
            Version 1.0
          </span>

          <h1 className="mt-8 text-6xl font-bold leading-tight">
            Deploy GitHub
            <br />
            Projects in
            <span className="bg-gradient-to-r from-purple-400 to-blue-500 bg-clip-text text-transparent">
              {" "}
              Seconds
            </span>
          </h1>

          <p className="mt-6 text-xl text-zinc-400">
            Connect your repository and get a live deployment URL instantly.
          </p>

          <div className="mt-10 flex gap-4">
            <button 
              onClick={handleDeployNow}
              disabled={loading}
              className="rounded-xl bg-gradient-to-r from-purple-500 to-blue-500 px-8 py-4 font-semibold hover:from-purple-600 hover:to-blue-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Loading..." : "Deploy Now"}
            </button>

            <button className="rounded-xl border border-zinc-700 px-8 py-4">
              View Demo
            </button>
          </div>
        </div>

        <div className="rounded-3xl border border-zinc-800 bg-zinc-900 p-8">
  <div className="rounded-2xl border border-zinc-700 overflow-hidden">
    
    {/* Browser Header */}
    <div className="flex items-center gap-2 border-b border-zinc-800 bg-zinc-900 px-5 py-4">
      <div className="h-3 w-3 rounded-full bg-red-500"></div>
      <div className="h-3 w-3 rounded-full bg-yellow-500"></div>
      <div className="h-3 w-3 rounded-full bg-green-500"></div>
    </div>

    {/* Deployment Status */}
    <div className="p-8">
      <p className="mb-4 text-zinc-400">Deployment Status</p>

      <div className="h-3 rounded-full bg-zinc-700">
        <div className="h-3 w-4/5 rounded-full bg-gradient-to-r from-cyan-400 to-purple-500"></div>
      </div>

      <div className="mt-4 flex items-center justify-between">
        <p className="text-white">Deploying to production...</p>

        <span className="rounded-md bg-purple-500/20 px-3 py-1 text-sm text-purple-300">
          80%
        </span>
      </div>
    </div>

  </div>
</div>
      </div>
    </section>
  );
};

export default Hero;