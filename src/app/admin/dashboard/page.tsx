import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import AdminDashboard from "@/components/dashboard/AdminDashboard";

export const metadata = {
  title: "Admin Dashboard — ALshowUhow",
};

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const session = await auth();

  if (!session?.user) redirect("/admin/login");

  const role = (session.user as { role?: string }).role;
  if (role !== "ADMIN") redirect(role === "VENDOR" ? "/vendor/dashboard" : "/admin/login");

  return <AdminDashboard />;
}
