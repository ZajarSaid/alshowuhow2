import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const session = await auth();

  if (!session?.user) redirect("/admin/login");

  const role = (session.user as { role?: string }).role;
  if (role !== "ADMIN") redirect(role === "VENDOR" ? "/vendor/dashboard" : "/admin/login");

  redirect("/admin/dashboard");
}
