const DashboardPreview = () => {
  return (
    <section className="mx-auto max-w-7xl px-6 py-24">
      <div className="rounded-3xl border border-zinc-800 bg-zinc-950 p-10">
        <div className="grid md:grid-cols-2 gap-10">
          <div>
            <h3 className="mb-6 text-3xl font-bold">
              New Deployment
            </h3>

            <input
              placeholder="GitHub Repository URL"
              className="w-full rounded-lg border border-zinc-700 bg-black p-4"
            />

            <button className="mt-4 rounded-lg bg-gradient-to-r from-purple-500 to-blue-500 px-6 py-3">
              Start Deployment
            </button>
          </div>

          <div>
            <h3 className="mb-6 text-3xl font-bold">
              Recent Events
            </h3>

            <div className="space-y-3">
              <div className="rounded-lg border border-zinc-800 p-4">
                Deployment Successful
              </div>

              <div className="rounded-lg border border-zinc-800 p-4">
                Build Started
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default DashboardPreview;