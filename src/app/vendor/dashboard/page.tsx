import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import VendorDashboard from "@/components/dashboard/VendorDashboard";

export const metadata = {
  title: "Vendor Dashboard — ALshowUhow",
};

export const dynamic = "force-dynamic";

export default async function VendorDashboardPage() {
  const session = await auth();

  if (!session?.user) redirect("/login");

  const role = (session.user as { role?: string }).role;
  if (role === "ADMIN") redirect("/admin/dashboard");

  const vendor = await db.vendor.findUnique({
    where: { userId: session.user.id },
  });

  if (!vendor) redirect("/login");

  return <VendorDashboard vendorId={vendor.id} businessName={vendor.businessName} />;
}
