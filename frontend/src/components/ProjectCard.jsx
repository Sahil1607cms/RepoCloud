import { Link } from "react-router-dom";

const ProjectCard = ({ project }) => {
  return (
    <Link to={`/project/${project.id}`}>
      <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-6 transition hover:border-purple-500">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-semibold">
            {project.name}
          </h3>

          <span
            className={`rounded-full px-3 py-1 text-sm ${
              project.status === "Success"
                ? "bg-green-500/20 text-green-400"
                : "bg-yellow-500/20 text-yellow-400"
            }`}
          >
            {project.status}
          </span>
        </div>

        {project.url && (
          <p className="mt-4 text-zinc-400">
            {project.url}
          </p>
        )}
      </div>
    </Link>
  );
};

export default ProjectCard;