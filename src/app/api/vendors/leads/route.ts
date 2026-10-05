import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireVendor } from "@/lib/session";
import { readJson, route } from "@/lib/api";

const leadInclude = {
  serviceRequest: {
    // Explicit select: matchedVendors is ADMIN-ONLY — never expose the
    // competitor snapshot to vendors via their own lead payloads.
    select: {
      id: true,
      customerId: true,
      serviceId: true,
      zipCode: true,
      description: true,
      preferredContactMethod: true,
      urgency: true,
      additionalNotes: true,
      status: true,
      createdAt: true,
      updatedAt: true,
      customer: true,
      service: true,
    },
  },
  project: true,
} as const;

export const GET = route("vendors:leads:GET", async () => {
  const { value: vendor, response } = await requireVendor();
  if (response) return response;

  const leads = await db.lead.findMany({
    where: { vendorId: vendor.vendorId },
    include: leadInclude,
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(leads);
});

export const PATCH = route("vendors:leads:PATCH", async (req: Request) => {
  const { value: vendor, response } = await requireVendor();
  if (response) return response;

  const { value: body, response: parseResponse } = await readJson<{
    id?: string; status?: string;
  }>(req);
  if (parseResponse) return parseResponse;
  const { id, status } = body;

  if (!id || !status) {
    return NextResponse.json({ error: "Missing id or status" }, { status: 400 });
  }

  const lead = await db.lead.findUnique({ where: { id } });
  if (!lead) {
    return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  }
  if (lead.vendorId !== vendor.vendorId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const updateData: Record<string, unknown> = { status };
  if (status === "CONTACTED") updateData.contactedAt = new Date();
  if (status === "WON" || status === "LOST" || status === "CLOSED") updateData.closedAt = new Date();

  const updated = await db.lead.update({
    where: { id },
    data: updateData,
  });

  // Auto-create project on WON
  if (status === "WON") {
    await db.project.upsert({
      where: { leadId: id },
      update: { status: "WON", wonDate: new Date() },
      create: { leadId: id, status: "WON", wonDate: new Date() },
    });
  }

  return NextResponse.json(updated);
});
