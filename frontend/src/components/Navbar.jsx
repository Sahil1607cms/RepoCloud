import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const Navbar = () => {
  const navigate = useNavigate();
  const { isAuthenticated, user, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    setTimeout(() => {
      navigate("/", { replace: true });
    }, 100);
  };

  return (
    <nav className="sticky top-0 z-50 border-b border-zinc-800 bg-black/70 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
        <h1 
          className="text-2xl font-bold cursor-pointer hover:text-purple-400 transition" 
          onClick={() => navigate("/")}
        >
          RepoCloud
        </h1>

        <div className="hidden md:flex gap-8 text-zinc-300">
          <a href="#features">Features</a>
          <a href="#how">How It Works</a>
        </div>

        <div className="flex gap-3 items-center">
          {isAuthenticated ? (
            <>
              <div className="flex items-center gap-3">
                {user?.login && (
                  <span className="text-zinc-400 text-sm">
                    {user.login}
                  </span>
                )}
              </div>
              <button
                onClick={handleLogout}
                className="px-4 py-2 text-zinc-300 hover:text-white transition border border-zinc-700 rounded-lg hover:border-zinc-500"
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="px-4 py-2 text-zinc-300 hover:text-white transition">
                Login
              </Link>

              <Link
                to="/login"
                className="rounded-lg bg-gradient-to-r from-purple-500 to-blue-500 px-5 py-2 font-medium hover:from-purple-600 hover:to-blue-600 transition"
              >
                Get Started
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;