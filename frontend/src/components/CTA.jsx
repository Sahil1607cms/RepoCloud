import { Link } from "react-router-dom";

const CTA = () => {
  return (
    <section className="mx-auto max-w-6xl px-6 py-24">
      <div className="rounded-3xl border border-zinc-800 bg-gradient-to-r from-zinc-950 to-slate-950 p-16 text-center">
        <h2 className="text-5xl font-bold">
          Ready to Deploy Your Next Project?
        </h2>

        <p className="mt-6 text-xl text-zinc-400">
          Start deploying directly from GitHub.
        </p>

        <Link
          to="/login"
          className="mt-8 inline-block rounded-xl bg-white px-8 py-4 text-black font-semibold"
        >
          Continue with GitHub
        </Link>
      </div>
    </section>
  );
};

export default CTA;