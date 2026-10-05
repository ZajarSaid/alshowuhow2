import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { sendVendorApproved } from "@/lib/email";
import { readJson, route } from "@/lib/api";

export const GET = route("admin:vendors:GET", async () => {
  const { response } = await requireAdmin();
  if (response) return response;

  const vendors = await db.vendor.findMany({
    include: {
      services: { include: { service: true } },
      serviceAreas: true,
    },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(vendors);
});

const VALID_VENDOR_STATUSES = ["PENDING", "APPROVED", "SUSPENDED", "REJECTED"];

export const PATCH = route("admin:vendors:PATCH", async (req: Request) => {
  const { response } = await requireAdmin();
  if (response) return response;

  const { value: body, response: parseResponse } = await readJson<{
    id?: string; status?: string;
  }>(req);
  if (parseResponse) return parseResponse;
  const { id, status } = body;

  if (!id || !status) {
    return NextResponse.json({ error: "Missing id or status" }, { status: 400 });
  }

  if (!VALID_VENDOR_STATUSES.includes(status)) {
    return NextResponse.json({ error: "Invalid vendor status" }, { status: 400 });
  }

  let vendor: Awaited<ReturnType<typeof db.vendor.update>>;
  try {
    vendor = await db.vendor.update({
      where: { id },
      data: { status },
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2025") {
      return NextResponse.json({ error: "Vendor not found" }, { status: 404 });
    }
    throw err;
  }

  // Approving a vendor must NOT retro-create leads for existing matching
  // requests: matches are admin-gated, and vendor-visible leads only exist
  // when an admin creates them manually. No lead backfill here.
  if (status === "APPROVED") {
    await sendVendorApproved({
      businessName: vendor.businessName,
      email: vendor.email,
    });
  }

  return NextResponse.json(vendor);
});
