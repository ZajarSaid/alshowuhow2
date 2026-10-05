import CustomerRequestForm from "@/components/forms/CustomerRequestForm";
import { db } from "@/lib/db";

// DB-backed (reads featured categories) — never prerender against prod Turso
// at build time, where columns may lag the migrations applied to local dev.db.
export const dynamic = "force-dynamic";
export const dynamicParams = true;
export const revalidate = 0;

export const metadata = {
  title: "Request a Service — ALshowUhow",
  description:
    "Tell us what you need and we'll connect you with qualified local service providers.",
};

export default async function RequestPage({
  searchParams,
}: {
  searchParams: Promise<{ service?: string }>;
}) {
  const { service } = await searchParams;

  const categories = (
    await db.service.findMany({
      where: { active: true, featured: true },
      orderBy: { sortOrder: "asc" },
      select: {
        id: true,
        name: true,
        icon: true,
        description: true,
        isCatchAll: true,
        subServices: {
          where: { active: true },
          orderBy: { sortOrder: "asc" },
          select: { id: true, name: true, icon: true, description: true, isCatchAll: true },
        },
      },
    })
  ).map((c) => ({
    ...c,
    icon: c.icon ?? "",
    description: c.description ?? "",
    subServices: c.subServices.map((s) => ({
      ...s,
      icon: s.icon ?? "",
      description: s.description ?? "",
    })),
  }));

  return (
    <div className="bg-gray-50 min-h-screen py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <CustomerRequestForm initialServiceId={service} categories={categories} />
      </div>
    </div>
  );
}
