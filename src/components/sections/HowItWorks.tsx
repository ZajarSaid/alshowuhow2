import { fill } from "@/lib/i18n/config";
import { getMessages } from "@/lib/i18n/server";

export default async function HowItWorks() {
  const t = await getMessages();

  const steps = [
    { number: "1", title: t.howItWorks.step1Title, description: t.howItWorks.step1Body, icon: "📝" },
    { number: "2", title: t.howItWorks.step2Title, description: t.howItWorks.step2Body, icon: "🔍" },
    { number: "3", title: t.howItWorks.step3Title, description: t.howItWorks.step3Body, icon: "📞" },
    { number: "4", title: t.howItWorks.step4Title, description: t.howItWorks.step4Body, icon: "✅" },
  ];

  return (
    <section className="relative py-20 bg-white overflow-hidden">
      <div className="pointer-events-none absolute inset-0 -z-10">
      </div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold tracking-tight text-dark-text mb-4">
            {t.howItWorks.title}
          </h2>
          <p className="text-lg md:text-xl text-dark-text/70 max-w-3xl mx-auto">
            {t.howItWorks.subtitle}
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 lg:gap-8">
          {steps.map((step, index) => (
            <div
              key={step.number}
              className="group relative flex flex-col items-center text-center rounded-2xl border border-slate-200/60 bg-white/80 p-6 shadow-sm backdrop-blur-sm transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-lg hover:border-crimson/30"
            >
              {index < steps.length - 1 && (
                <div className="pointer-events-none absolute left-[calc(50%+2.75rem)] top-10 hidden h-px w-[calc(100%-5.5rem)] md:block">
                  <div className="h-full w-full bg-slate-200" />
                </div>
              )}
              <div className="relative mb-5 flex h-20 w-20 items-center justify-center rounded-2xl bg-crimson text-4xl shadow-md ring-1 ring-white/40 transition-transform duration-300 group-hover:scale-110">
                <span className="drop-shadow-sm">{step.icon}</span>
                <div className="absolute inset-0 -z-10 rounded-2xl bg-white/20" />
              </div>
              <div className="mb-2 inline-flex items-center rounded-full bg-crimson/10 px-3 py-0.5 text-xs font-semibold tracking-wide text-crimson ring-1 ring-crimson/20">
                {fill(t.howItWorks.stepLabel, { number: step.number })}
              </div>
              <h3 className="mb-2 text-lg font-semibold tracking-tight text-dark-text">
                {step.title}
              </h3>
              <p className="text-sm leading-relaxed text-dark-text/70">
                {step.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
