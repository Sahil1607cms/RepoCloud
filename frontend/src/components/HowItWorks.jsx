const steps = [
  "Connect",
  "Paste Repository",
  "Deploy",
  "Go Live",
];

const HowItWorks = () => {
  return (
    <section id="how" className="mx-auto max-w-7xl px-6 py-24">
      <h2 className="text-center text-5xl font-bold mb-16">
        Four Steps to Production
      </h2>

      <div className="grid md:grid-cols-4 gap-10">
        {steps.map((step, index) => (
          <div key={step}>
            <div className="flex h-16 w-16 items-center justify-center rounded-full border border-purple-500 text-2xl">
              {index + 1}
            </div>

            <h3 className="mt-6 text-3xl font-semibold">
              {step}
            </h3>
          </div>
        ))}
      </div>
    </section>
  );
};

export default HowItWorks;