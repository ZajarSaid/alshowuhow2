import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import VendorSettings from "@/components/dashboard/VendorSettings";

export const metadata = {
  title: "Profile Settings — ALshowUhow",
};

export const dynamic = "force-dynamic";

export default async function VendorSettingsPage() {
  const session = await auth();

  if (!session?.user) redirect("/login");

  const role = (session.user as { role?: string }).role;
  if (role === "ADMIN") redirect("/admin/dashboard");
  if (role !== "VENDOR") redirect("/login");

  const vendor = await db.vendor.findUnique({
    where: { userId: session.user.id },
    include: {
      services: { include: { service: true } },
      serviceAreas: true,
    },
  });

  if (!vendor) redirect("/login");

  return <VendorSettings vendor={vendor} />;
}
