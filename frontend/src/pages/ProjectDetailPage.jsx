import React, { useEffect, useState, useRef } from "react";
import {
  getLogSocket,
  subscribeLogChannel,
  unsubscribeLogChannel,
} from "../services/logSocket";
import { useParams, useNavigate } from "react-router-dom";
import { useDeployements } from "../hooks/useDeployements";
import { deploymentService } from "../services/deploymentService";
import BuildLogs from "../components/BuildLogs";
import {
  ArrowLeft,
  ExternalLink,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";

const ProjectDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { projects, updateProject, loading: listLoading } = useDeployements();

  const [fetchedProject, setFetchedProject] = useState(null);
  const [fetching, setFetching] = useState(false);
  const [fetchFailed, setFetchFailed] = useState(false);

  // Find project in hook list or fallback to directly fetched project
  const project = projects.find((p) => p.id === id) || fetchedProject;
  const [logs, setLogs] = useState([]);
  const [status, setStatus] = useState("Building");

  // Fetch project directly from MongoDB if not found in memory state yet
  useEffect(() => {
    if (!project && !fetching && !fetchFailed) {
      setFetching(true);
      deploymentService
        .getProjectById(id)
        .then((data) => {
          if (data) {
            setFetchedProject(data);
          } else {
            setFetchFailed(true);
          }
        })
        .catch((err) => {
          console.error("Project fetch error:", err);
          setFetchFailed(true);
        })
        .finally(() => setFetching(false));
    }
  }, [id, project, fetching, fetchFailed]);

  // Keep local logs state in sync with loaded project
  useEffect(() => {
    if (project) {
      setLogs(project.logs || []);
      setStatus(project.status || "Building");
    }
  }, [project]);

  const socketRef = useRef(null);

  // Connect to Socket.IO server on port 9001 if this project is Building
  useEffect(() => {
    if (!project || project.status !== "Building") return;

    const socket = getLogSocket();
    socketRef.current = socket;
    const channel = `logs:${id}`;

    const handleMessage = (payload) => {
      try {
        let parsed = payload;
        if (typeof payload === "string") {
          try {
            parsed = JSON.parse(payload);
          } catch (e) {
            // keep as string
          }
        }

        const logText = parsed?.log || parsed;
        if (logText) {
          setLogs((prev) => {
            const updatedLogs = [...prev, logText];
            updateProject(id, { logs: updatedLogs });
            return updatedLogs;
          });

          const lowerLog = ("" + logText).toLowerCase();
          if (
            lowerLog.includes("done...") ||
            lowerLog.includes("build is complete")
          ) {
            setStatus("Success");
            updateProject(id, { status: "Success" });
          }
          if (
            lowerLog.includes("npm err!") ||
            lowerLog.includes("command failed") ||
            lowerLog.includes("failed to compile") ||
            lowerLog.includes("build failed") ||
            lowerLog.includes("exit code")
          ) {
            setStatus("Failed");
            updateProject(id, { status: "Failed" });
          }
        }
      } catch (err) {
        console.error("Error handling socket message", err);
      }
    };

    subscribeLogChannel(channel);
    socket.on("message", handleMessage);

    return () => {
      try {
        unsubscribeLogChannel(channel);
        socket.off("message", handleMessage);
        socketRef.current = null;
      } catch (err) {
        console.error("Error during cleanup:", err);
      }
    };
  }, [id, project?.status]);

  if (fetching || (listLoading && !project)) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-black text-white px-6">
        <RefreshCw className="h-10 w-10 text-purple-500 animate-spin mb-4" />
        <p className="text-zinc-400 font-medium">Loading project from MongoDB...</p>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-black text-white px-6">
        <AlertCircle className="h-16 w-16 text-red-500 mb-4 animate-bounce" />
        <h1 className="text-3xl font-bold">Project Not Found</h1>
        <p className="mt-2 text-zinc-400">
          The deployment ID you are looking for does not exist in MongoDB database.
        </p>
        <button
          onClick={() => navigate("/dashboard")}
          className="mt-6 flex items-center gap-2 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-zinc-700 px-6 py-3 font-semibold transition"
        >
          <ArrowLeft className="h-5 w-5" /> Back to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <div className="border-b border-zinc-900 bg-zinc-950/50 backdrop-blur-md sticky top-0 z-50">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <button
            onClick={() => navigate("/dashboard")}
            className="flex items-center gap-2 rounded-xl hover:bg-zinc-900 px-4 py-2 text-zinc-400 hover:text-white transition"
          >
            <ArrowLeft className="h-5 w-5" /> Back to Dashboard
          </button>

          <span className="font-mono text-zinc-500 text-sm select-all">
            ID: {project.id}
          </span>
        </div>
      </div>

      {/* Main Content */}
      <div className="mx-auto max-w-6xl px-6 py-10">
        {/* Project Meta Info */}
        <div className="mb-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h1 className="text-4xl font-extrabold tracking-tight bg-gradient-to-r from-white to-zinc-400 bg-clip-text text-transparent">
              {project.name}
            </h1>
            <p className="mt-2 font-mono text-zinc-500 select-all hover:text-zinc-400 transition">
              {project.repoUrl}
            </p>
          </div>

          <div className="flex items-center gap-4">
            {status === "Building" && (
              <span className="flex items-center gap-2 rounded-full bg-yellow-500/10 border border-yellow-500/20 px-4 py-2 text-yellow-400 font-semibold shadow-lg shadow-yellow-500/5 animate-pulse">
                <RefreshCw className="h-4 w-4 animate-spin" />
                Building Project
              </span>
            )}
            {status === "Success" && (
              <span className="flex items-center gap-2 rounded-full bg-green-500/10 border border-green-500/20 px-4 py-2 text-green-400 font-semibold shadow-lg shadow-green-500/5">
                <CheckCircle2 className="h-4 w-4" />
                Ready (Success)
              </span>
            )}
            {status === "Failed" && (
              <span className="flex items-center gap-2 rounded-full bg-red-500/10 border border-red-500/20 px-4 py-2 text-red-400 font-semibold shadow-lg shadow-red-500/5">
                <AlertCircle className="h-4 w-4" />
                Build Failed
              </span>
            )}
          </div>
        </div>

        {/* Live Preview Card */}
        <div className="mb-8 rounded-3xl border border-zinc-800 bg-zinc-950 p-8 shadow-2xl relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 to-blue-500/10 opacity-0 group-hover:opacity-100 transition duration-500"></div>

          <h2 className="text-2xl font-bold relative z-10">
            Deployment Preview
          </h2>
          <p className="mt-2 text-zinc-400 relative z-10">
            {status === "Success"
              ? "Your project is live and accessible at the URL below."
              : status === "Building"
                ? "Building is in progress. The site preview will be ready once compiling completes."
                : "Compiling failed. Review logs below to fix details."}
          </p>

          {project.url && (
            <div className="mt-6 relative z-10">
              <input
                readOnly
                value={project.url}
                className="w-full rounded-xl border border-zinc-800 bg-black p-4 font-mono text-zinc-400 select-all focus:border-zinc-700 outline-none"
              />

              {status === "Success" ? (
                <a
                  href={project.url}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-6 block"
                >
                  <button className="w-full flex items-center justify-center gap-2 rounded-xl bg-white hover:bg-zinc-200 text-black py-4 font-semibold transition shadow-xl hover:shadow-white/5 active:scale-[0.99]">
                    Visit Website <ExternalLink className="h-4 w-4" />
                  </button>
                </a>
              ) : (
                <button
                  disabled
                  className="mt-6 w-full flex items-center justify-center gap-2 rounded-xl border border-zinc-850 text-zinc-600 py-4 font-semibold cursor-not-allowed bg-zinc-950"
                >
                  {status === "Building"
                    ? "Generating Preview..."
                    : "Preview Unavailable"}
                </button>
              )}
            </div>
          )}
        </div>

        {/* Build Logs Console */}
        <BuildLogs logs={logs} />
      </div>
    </div>
  );
};

export default ProjectDetailPage;
