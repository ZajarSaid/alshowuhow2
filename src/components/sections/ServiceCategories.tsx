import Link from "next/link";
import { db } from "@/lib/db";
import { getLocale, getMessages } from "@/lib/i18n/server";
import { localizeServiceName } from "@/lib/i18n/serviceNames";

export default async function ServiceCategories() {
  const [locale, t] = await Promise.all([getLocale(), getMessages()]);

  const categories = await db.service.findMany({
    where: { active: true, featured: true },
    orderBy: { sortOrder: "asc" },
    select: { id: true, name: true, icon: true, description: true },
  });

  return (
    <section className="py-16 bg-light-bg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-dark-text mb-4">{t.categories.title}</h2>
          <p className="text-dark-text/75 max-w-2xl mx-auto">{t.categories.subtitle}</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {categories.map((category) => (
            <Link
              key={category.id}
              href={`/request?service=${category.id}`}
              // Links to a page that is not translated yet, so a Spanish visitor
              // who taps through gets English. Correct for the demo's scope.
              lang={locale}
              className="bg-white rounded-xl p-6 text-center hover:shadow-lg transition-all border border-gray-100 hover:border-crimson group"
            >
              <div className="text-4xl mb-3" aria-hidden="true">{category.icon}</div>
              <h3 className="font-semibold text-dark-text group-hover:text-crimson transition-colors">
                {localizeServiceName(locale, category)}
              </h3>
              {/* Descriptions are still English from the database in both locales;
                  see serviceNames.ts for why and what replaces this. */}
              <p className="text-sm text-dark-text/75 mt-1">{category.description}</p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
