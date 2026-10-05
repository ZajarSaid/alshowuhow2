import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export type SessionUser = {
  id: string;
  email: string | null;
  role: string;
};

export async function getSessionUser(): Promise<SessionUser | null> {
  const session = await auth();
  if (!session?.user?.id) return null;
  const role = (session.user as { role?: string }).role ?? "CUSTOMER";
  return {
    id: session.user.id,
    email: session.user.email ?? null,
    role,
  };
}

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

function forbidden() {
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

type Guard<T> = { value: T; response: null } | { value: null; response: NextResponse };

export async function requireAdmin(): Promise<Guard<SessionUser>> {
  const user = await getSessionUser();
  if (!user) return { value: null, response: unauthorized() };
  if (user.role !== "ADMIN") return { value: null, response: forbidden() };
  return { value: user, response: null };
}

export async function requireVendor(): Promise<
  Guard<SessionUser & { vendorId: string; vendorStatus: string }>
> {
  const user = await getSessionUser();
  if (!user) return { value: null, response: unauthorized() };
  if (user.role !== "VENDOR") return { value: null, response: forbidden() };

  const vendor = await db.vendor.findUnique({ where: { userId: user.id } });
  if (!vendor) return { value: null, response: forbidden() };

  return {
    value: { ...user, vendorId: vendor.id, vendorStatus: vendor.status },
    response: null,
  };
}
