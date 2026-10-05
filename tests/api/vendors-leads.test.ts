import { describe, it, expect, beforeEach } from "vitest";
import { mockPrisma, mockRequest, jsonResponse, resetMocks, asVendor } from "../helpers";

describe("GET /api/vendors/leads", () => {
  beforeEach(() => resetMocks());

  it("returns leads for the signed-in vendor only, excluding the admin-only matchedVendors snapshot", async () => {
    asVendor("v1");

    const leads = [
      { id: "l1", status: "NEW", serviceRequest: { customer: {}, service: {} }, project: null },
    ];
    mockPrisma.lead.findMany.mockResolvedValue(leads);

    const { GET } = await import("@/app/api/vendors/leads/route");
    const res = await GET();
    const data = await jsonResponse(res);

    expect(data).toEqual(leads);
    expect(mockPrisma.lead.findMany).toHaveBeenCalledWith({
      where: { vendorId: "v1" },
      include: {
        serviceRequest: {
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
      },
      orderBy: { createdAt: "desc" },
    });
  });

  it("returns 401 when not authenticated", async () => {
    const { GET } = await import("@/app/api/vendors/leads/route");
    const res = await GET();

    expect(res.status).toBe(401);
  });

  it("returns 403 when the user is not a vendor with a vendor profile", async () => {
    const { asAdmin } = await import("../helpers");
    asAdmin();

    const { GET } = await import("@/app/api/vendors/leads/route");
    const res = await GET();

    expect(res.status).toBe(403);
  });
});

describe("PATCH /api/vendors/leads", () => {
  beforeEach(() => resetMocks());

  it("updates own lead status to CONTACTED with timestamp", async () => {
    asVendor("v1");
    mockPrisma.lead.findUnique.mockResolvedValue({ id: "l1", vendorId: "v1", status: "NEW" });
    const updated = { id: "l1", status: "CONTACTED", contactedAt: new Date() };
    mockPrisma.lead.update.mockResolvedValue(updated);

    const { PATCH } = await import("@/app/api/vendors/leads/route");
    const res = await PATCH(mockRequest({ id: "l1", status: "CONTACTED" }));
    const data = await jsonResponse(res);

    expect(data.status).toBe("CONTACTED");
    expect(mockPrisma.lead.update).toHaveBeenCalledWith({
      where: { id: "l1" },
      data: expect.objectContaining({ status: "CONTACTED", contactedAt: expect.any(Date) }),
    });
  });

  it("creates (upserts) a project when status is WON", async () => {
    asVendor("v1");
    mockPrisma.lead.findUnique.mockResolvedValue({ id: "l1", vendorId: "v1", status: "NEW" });
    const updated = { id: "l1", status: "WON", closedAt: new Date() };
    mockPrisma.lead.update.mockResolvedValue(updated);
    mockPrisma.project.upsert.mockResolvedValue({ id: "p1", leadId: "l1" });

    const { PATCH } = await import("@/app/api/vendors/leads/route");
    const res = await PATCH(mockRequest({ id: "l1", status: "WON" }));
    const data = await jsonResponse(res);

    expect(data.status).toBe("WON");
    expect(mockPrisma.project.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { leadId: "l1" },
        create: { leadId: "l1", status: "WON", wonDate: expect.any(Date) },
      })
    );
  });

  it("returns 403 when the lead belongs to another vendor", async () => {
    asVendor("v1");
    mockPrisma.lead.findUnique.mockResolvedValue({ id: "l2", vendorId: "someone-else" });

    const { PATCH } = await import("@/app/api/vendors/leads/route");
    const res = await PATCH(mockRequest({ id: "l2", status: "WON" }));

    expect(res.status).toBe(403);
    expect(mockPrisma.lead.update).not.toHaveBeenCalled();
  });

  it("returns 404 when the lead does not exist", async () => {
    asVendor("v1");
    mockPrisma.lead.findUnique.mockResolvedValue(null);

    const { PATCH } = await import("@/app/api/vendors/leads/route");
    const res = await PATCH(mockRequest({ id: "missing", status: "WON" }));

    expect(res.status).toBe(404);
  });

  it("returns 400 when id or status is missing", async () => {
    asVendor("v1");

    const { PATCH } = await import("@/app/api/vendors/leads/route");
    const res = await PATCH(mockRequest({ id: "l1" }));
    const data = await jsonResponse(res);

    expect(res.status).toBe(400);
    expect(data.error).toBe("Missing id or status");
  });

  it("returns 401 when not authenticated", async () => {
    const { PATCH } = await import("@/app/api/vendors/leads/route");
    const res = await PATCH(mockRequest({ id: "l1", status: "WON" }));

    expect(res.status).toBe(401);
  });
});
