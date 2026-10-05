import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { readJson, route } from "@/lib/api";

export const GET = route("admin:leads:GET", async () => {
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

export const PATCH = route("admin:leads:PATCH", async (req: Request) => {
  const { response } = await requireAdmin();
  if (response) return response;

  const { value: body, response: parseResponse } = await readJson<{
    id?: string; status?: string; vendorId?: string;
  }>(req);
  if (parseResponse) return parseResponse;
  const { id, status, vendorId } = body;

  if (!id) {
    return NextResponse.json({ error: "Missing lead id" }, { status: 400 });
  }

  const updateData: Record<string, unknown> = {};
  if (status) updateData.status = status;
  if (vendorId) updateData.vendorId = vendorId;
  if (status === "ASSIGNED" || status === "SENT") updateData.assignedAt = new Date();
  if (status === "SENT") updateData.sentAt = new Date();
  if (status === "CONTACTED") updateData.contactedAt = new Date();
  if (status === "WON" || status === "LOST" || status === "CLOSED") updateData.closedAt = new Date();

  const lead = await db.lead.update({
    where: { id },
    data: updateData,
  });

  return NextResponse.json(lead);
});
