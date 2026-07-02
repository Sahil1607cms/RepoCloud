import { Link2, Zap, History } from "lucide-react";

const Features = () => {
  const features = [
    {
      icon: <Link2 />,
      title: "GitHub Integration",
      text: "Connect repositories instantly.",
    },
    {
      icon: <Zap />,
      title: "One-Click Deployment",
      text: "Build and deploy with a single action.",
    },
    {
      icon: <History />,
      title: "Deployment History",
      text: "Track previous deployments.",
    },
  ];

  return (
    <section id="features" className="mx-auto max-w-7xl px-6 py-24">
      <h2 className="text-center text-5xl font-bold">
        Built for High-Performance Teams
      </h2>

      <div className="mt-16 grid md:grid-cols-3 gap-8">
        {features.map((feature) => (
          <div
            key={feature.title}
            className="rounded-2xl border border-zinc-800 bg-zinc-950 p-8"
          >
            {feature.icon}

            <h3 className="mt-6 text-3xl font-semibold">
              {feature.title}
            </h3>

            <p className="mt-4 text-zinc-400">{feature.text}</p>
          </div>
        ))}
      </div>
    </section>
  );
};

export default Features;