import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";
import { requireAdmin } from "@/lib/session";
import { sendAdminVendorPendingAlert } from "@/lib/email";
import { readJson, rateLimit, route } from "@/lib/api";

export const POST = route("vendors:POST", async (req: Request) => {
  // Emails admins on every accepted call.
  const { response: limited } = rateLimit(req, "vendors", 3, 60 * 60 * 1000);
  if (limited) return limited;

  const { value: body, response } = await readJson<{
    businessName?: string; contactPerson?: string; email?: string;
    phone?: string; address?: string; website?: string;
    services?: string[]; zipCodes?: string; licenseInfo?: string;
    insuranceInfo?: string; yearsInBusiness?: string; password?: string;
  }>(req);
  if (response) return response;
  const {
    businessName, contactPerson, email, phone, address, website,
    services, zipCodes, licenseInfo, insuranceInfo, yearsInBusiness,
    password,
  } = body;

  if (!businessName || !contactPerson || !email || !phone || !address || !password) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  // The declared types are compile-time only, so shape-check before iterating:
  // a client sending `services: "abc"` would otherwise be iterated per character.
  if (services !== undefined && !Array.isArray(services)) {
    return NextResponse.json({ error: "services must be an array of service ids" }, { status: 400 });
  }
  if (zipCodes !== undefined && typeof zipCodes !== "string") {
    return NextResponse.json({ error: "zipCodes must be a comma-separated string" }, { status: 400 });
  }

  const existingUser = await db.user.findUnique({ where: { email } });
  if (existingUser) {
    return NextResponse.json({ error: "Email already registered" }, { status: 409 });
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const user = await db.user.create({
    data: {
      email,
      passwordHash,
      role: "VENDOR",
    },
  });

  const vendor = await db.vendor.create({
    data: {
      userId: user.id,
      businessName,
      contactName: contactPerson,
      email,
      phone,
      address,
      website: website || null,
      licenseInformation: licenseInfo || null,
      insuranceInformation: insuranceInfo || null,
      yearsInBusiness: yearsInBusiness ? parseInt(yearsInBusiness) : null,
    },
  });

  // Connect services
  if (services && services.length > 0) {
    for (const serviceId of services) {
      const service = await db.service.findUnique({ where: { id: serviceId } });
      if (service) {
        await db.vendorService.create({
          data: { vendorId: vendor.id, serviceId },
        });
      }
    }
  }

  // Connect ZIP codes
  if (zipCodes) {
    const zipList = zipCodes.split(",").map((z: string) => z.trim()).filter(Boolean);
    for (const zip of zipList) {
      await db.vendorServiceArea.create({
        data: { vendorId: vendor.id, zipCode: zip },
      });
    }
  }

  // Notify all admins that a new vendor is pending approval.
  // Best-effort — failures are logged, never surfaced.
  const serviceNames = await db.vendorService.findMany({
    where: { vendorId: vendor.id },
    include: { service: true },
  });
  await sendAdminVendorPendingAlert({
    businessName: vendor.businessName,
    contactName: vendor.contactName,
    email: vendor.email,
    phone: vendor.phone,
    services: serviceNames.map((s) => s.service.name).join(", ") || "—",
    zipCodes: `${zipCodes ?? ""}`.split(",").map((z: string) => z.trim()).filter(Boolean).join(", ") || "—",
  });

  return NextResponse.json(vendor, { status: 201 });
});

export const GET = route("vendors:GET", async () => {
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
