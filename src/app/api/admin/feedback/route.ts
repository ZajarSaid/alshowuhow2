import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { route } from "@/lib/api";

export const GET = route("admin:feedback:GET", async () => {
  const { response } = await requireAdmin();
  if (response) return response;

  const feedback = await db.customerFeedback.findMany({
    include: {
      serviceRequest: {
        include: {
          customer: true,
          service: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(feedback);
});
