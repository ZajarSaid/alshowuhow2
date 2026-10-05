import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { route } from "@/lib/api";

export const GET = route("admin:customers:GET", async () => {
  const { response } = await requireAdmin();
  if (response) return response;

  const customers = await db.customer.findMany({
    include: {
      serviceRequests: {
        include: {
          service: true,
          leads: { include: { vendor: true } },
        },
        orderBy: { createdAt: "desc" },
      },
    },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(customers);
});
