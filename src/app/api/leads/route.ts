import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { route } from "@/lib/api";

export const GET = route("leads:GET", async () => {
  const { response } = await requireAdmin();
  if (response) return response;

  const leads = await db.lead.findMany({
    include: {
      serviceRequest: { include: { customer: true, service: true } },
      vendor: true,
      project: true,
    },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(leads);
});
