import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { authService } from "../services/authService";

const LoginPage = () => {
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { isAuthenticated, loading } = useAuth();

  // Redirect to dashboard if already logged in
  useEffect(() => {
    if (!loading && isAuthenticated) {
      navigate("/dashboard", { replace: true });
    }
  }, [isAuthenticated, loading, navigate]);

  const handleGithubLogin = () => {
    setIsLoading(true);
    authService.loginWithGithub();
  };
  return (
    <div className="flex min-h-screen items-center justify-center bg-black px-6">
      {" "}
      <div className="w-full max-w-md rounded-3xl border border-zinc-800 bg-zinc-950 p-10">
        {" "}
        <div className="text-center">
          {" "}
          <h1 className="text-4xl font-bold text-white">
            {" "}
            Welcome to RepoCloud{" "}
          </h1>{" "}
          <p className="mt-4 text-zinc-400">
            {" "}
            Sign in with GitHub to manage your deployments.{" "}
          </p>{" "}
        </div>{" "}
        <button
          onClick={handleGithubLogin}
          disabled={isLoading}
          className="mt-10 flex w-full items-center justify-center gap-3 rounded-xl bg-white px-6 py-4 font-semibold text-black transition hover:bg-zinc-200 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {" "}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 98 96"
            className="h-6 w-6"
            fill="currentColor"
          >
            {" "}
            <path d="M49 0C21.9 0 0 21.9 0 49c0 21.7 14.1 40.1 33.6 46.6 2.5.5 3.4-1.1 3.4-2.4 0-1.2-.1-5.3-.1-9.6-13.7 3-16.6-5.8-16.6-5.8-2.2-5.6-5.4-7.1-5.4-7.1-4.4-3 .3-3 .3-3 4.9.3 7.5 5 7.5 5 4.3 7.4 11.4 5.3 14.2 4 .4-3.1 1.7-5.3 3.1-6.5-10.9-1.2-22.4-5.4-22.4-24.3 0-5.4 1.9-9.8 5-13.3-.5-1.2-2.2-6.2.5-12.9 0 0 4.1-1.3 13.4 5.1 3.9-1.1 8.1-1.6 12.3-1.6s8.4.5 12.3 1.6c9.3-6.4 13.4-5.1 13.4-5.1 2.7 6.7 1 11.7.5 12.9 3.1 3.5 5 7.9 5 13.3 0 18.9-11.5 23-22.5 24.2 1.8 1.5 3.3 4.5 3.3 9.2 0 6.6-.1 11.9-.1 13.5 0 1.3.9 2.9 3.5 2.4C83.9 89.1 98 70.7 98 49 98 21.9 76.1 0 49 0z" />{" "}
          </svg>{" "}
          {isLoading ? "Redirecting..." : "Continue with GitHub"}{" "}
        </button>{" "}
        <p className="mt-6 text-center text-sm text-zinc-500">
          {" "}
          By continuing, you agree to sign in using your GitHub account.{" "}
        </p>{" "}
      </div>{" "}
    </div>
  );
};
export default LoginPage;
