import { getMessages } from "@/lib/i18n/server";

// Server component, so it reads the locale cookie itself rather than through the
// client-side context. Values are numbers, not prose, so they need no formatting
// and stay identical in both locales.
export default async function Stats() {
  const t = await getMessages();
  const stats = [
    { label: t.stats.categories, value: "8+" },
    { label: t.stats.vendorNetwork, value: "50+" },
    { label: t.stats.requestsFulfilled, value: "100+" },
    { label: t.stats.customerSatisfaction, value: "95%" },
  ];

  return (
    <section className="py-12 bg-white border-y border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {stats.map((stat) => (
            <div key={stat.label} className="text-center">
              <div className="text-3xl md:text-4xl font-bold text-crimson">{stat.value}</div>
              <div className="text-sm text-dark-text/75 mt-1">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
