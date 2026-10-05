import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { sendCustomerConfirmation, sendAdminRequestAlert } from "@/lib/email";
import { readJson, rateLimit, route } from "@/lib/api";

// Upper bound on the "Other" free-text, so a pasted novel can't bloat the
// request row or blow out the admin alert email.
const MAX_OTHER_SERVICE_TEXT = 500;

// Canonical upper-case enum values, shared with src/lib/types.ts. The stored
// columns are plain TEXT, so anything a client sends would otherwise be written
// verbatim and later miss the UI's status lookups.
const VALID_URGENCIES = ["NORMAL", "URGENT"] as const;
const VALID_CONTACT_METHODS = ["email", "phone", "both"] as const;

// Simple matching: service + ZIP + approved vendor. Scalar fields only —
// the match snapshot never needs the nested services/areas relations.
//
// `isCatchAll` is the "Other" category: no vendor ever registers for it, so
// strict service matching always returns nothing. In that case fall back to
// every APPROVED vendor serving the customer's ZIP — still admin-gated, the
// snapshot is informational only.
async function findMatchingVendors(serviceId: string, zipCode: string, isCatchAll: boolean) {
  const matched = await db.vendor.findMany({
    where: {
      status: "APPROVED",
      services: { some: { serviceId } },
      serviceAreas: { some: { zipCode } },
    },
    orderBy: { businessName: "asc" },
  });

  if (matched.length > 0 || !isCatchAll) return matched;

  return db.vendor.findMany({
    where: {
      status: "APPROVED",
      serviceAreas: { some: { zipCode } },
    },
    orderBy: { businessName: "asc" },
  });
}

export const POST = route("customer-requests:POST", async (req: Request) => {
  // Sends two real emails per accepted call, so it is the most expensive
  // public endpoint in the app.
  const { response: limited } = rateLimit(req, "customer-requests", 5, 60 * 60 * 1000);
  if (limited) return limited;

  const { value: body, response } = await readJson<{
    name?: string; email?: string; phone?: string; serviceId?: string;
    zipCode?: string; description?: string; preferredContactMethod?: "email" | "phone" | "both";
    urgency?: "NORMAL" | "URGENT"; additionalNotes?: string; otherServiceText?: string;
  }>(req);
  if (response) return response;
  const {
    name, email, phone, serviceId, zipCode, description,
    preferredContactMethod, urgency, additionalNotes, otherServiceText,
  } = body;

  if (!serviceId || !zipCode || !description || !name || !email) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  // Resolve the service up front: it gates the catch-all branch below, supplies
  // the name for emails, and rejects ids that don't exist (or were deactivated)
  // before any User/Customer/ServiceRequest rows are written.
  const service = await db.service.findUnique({ where: { id: serviceId } });
  if (!service || !service.active) {
    return NextResponse.json({ error: "Unknown service" }, { status: 400 });
  }
  const isCatchAll = service.isCatchAll;

  // "Other" is only meaningful with a description of what is actually needed.
  const otherText = typeof otherServiceText === "string" ? otherServiceText.trim() : "";
  if (isCatchAll) {
    if (!otherText) {
      return NextResponse.json(
        { error: "Please tell us what service you need" },
        { status: 400 },
      );
    }
    if (otherText.length > MAX_OTHER_SERVICE_TEXT) {
      return NextResponse.json(
        { error: `Please keep your description under ${MAX_OTHER_SERVICE_TEXT} characters` },
        { status: 400 },
      );
    }
  }

  // Find matching vendors FIRST (before any user/customer rows are created, so
  // a failure here cannot orphan a fresh User/Customer). Vendors are NEVER
  // notified at this stage and no leads are created: matching is
  // informational, surfaced to admins only.
  const matchedVendors = await findMatchingVendors(serviceId, zipCode, isCatchAll);
  const matchedVendorsSnapshot = matchedVendors.map((v) => ({
    id: v.id,
    businessName: v.businessName,
    contactName: v.contactName,
    email: v.email,
    phone: v.phone,
    website: v.website ?? null,
  }));

  // Find or create customer
  let customer = await db.customer.findFirst({ where: { email } });
  if (!customer) {
    const user = await db.user.create({
      data: {
        email,
        // Unusable password: hashed random value so this account can never be
        // logged into until a real password flow exists.
        passwordHash: await bcrypt.hash(randomUUID(), 10),
        role: "CUSTOMER",
      },
    });
    customer = await db.customer.create({
      data: {
        userId: user.id,
        firstName: name.split(" ")[0] || name,
        lastName: name.split(" ").slice(1).join(" ") || "",
        email,
        phone: phone || null,
        preferredContact: preferredContactMethod || "email",
      },
    });
  }

  // The declared types are compile-time only, so re-check at runtime: the stored
  // columns are plain TEXT and a client can send any string, which would miss the
  // UI's status lookups and corrupt the enum.
  const urgencyValue = VALID_URGENCIES.includes(urgency as never) ? urgency! : "NORMAL";
  const contactValue = VALID_CONTACT_METHODS.includes(preferredContactMethod as never)
    ? preferredContactMethod!
    : "email";

  // Create service request with the vendor snapshot attached (admin-only data).
  const request = await db.serviceRequest.create({
    data: {
      customerId: customer.id,
      serviceId,
      zipCode,
      description,
      preferredContactMethod: contactValue,
      urgency: urgencyValue,
      additionalNotes: additionalNotes || null,
      otherServiceText: isCatchAll ? otherText : null,
      matchedVendors: matchedVendorsSnapshot,
    },
  });

  // Notifications are best-effort — failures are logged, never surfaced.
  // Only the customer and the admins are emailed. Vendor lead alerts are not
  // sent here (strict gatekeeping): the admin reviews the match first.
  await Promise.allSettled([
    sendCustomerConfirmation({
      name,
      email,
      serviceName: service.name ?? "Service",
      zipCode,
      otherServiceText: isCatchAll ? otherText : null,
    }),
    sendAdminRequestAlert({
      customerName: name,
      email,
      phone: phone || null,
      preferredContact: preferredContactMethod || "email",
      serviceName: service.name ?? "Service",
      zipCode,
      description,
      additionalNotes: additionalNotes || null,
      otherServiceText: isCatchAll ? otherText : null,
      urgency,
      requestId: request.id,
      matchedVendors: matchedVendorsSnapshot,
    }),
  ]);

  // matchedVendors is ADMIN-ONLY: never echo the snapshot back to the
  // customer — strip it from the returned request row.
  const { matchedVendors: _snapshotInRow, ...publicRequest } = request;

  return NextResponse.json({
    request: publicRequest,
    matchedVendors: matchedVendors.length,
    leadsCreated: 0,
  }, { status: 201 });
});

export const GET = route("customer-requests:GET", async () => {
  const { response } = await requireAdmin();
  if (response) return response;

  const requests = await db.serviceRequest.findMany({
    include: {
      customer: true,
      service: true,
      leads: { include: { vendor: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(requests);
});
