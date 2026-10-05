import { describe, it, expect, beforeEach } from "vitest";
import { Prisma } from "@prisma/client";
import { asAdmin, jsonResponse, mockEmail, mockPrisma, mockRequest, resetMocks } from "../helpers";

describe("GET /api/admin/vendors", () => {
  beforeEach(() => { resetMocks(); asAdmin(); });

  it("returns all vendors with services and service areas", async () => {
    const vendors = [
      { id: "v1", businessName: "Plumbing Co", status: "APPROVED", services: [], serviceAreas: [] },
      { id: "v2", businessName: "Electric Co", status: "PENDING", services: [], serviceAreas: [] },
    ];
    mockPrisma.vendor.findMany.mockResolvedValue(vendors);

    const { GET } = await import("@/app/api/admin/vendors/route");
    const res = await GET();
    const data = await jsonResponse(res);

    expect(data).toHaveLength(2);
    expect(mockPrisma.vendor.findMany).toHaveBeenCalledWith({
      include: { services: { include: { service: true } }, serviceAreas: true },
      orderBy: { createdAt: "desc" },
    });
  });
});

describe("PATCH /api/admin/vendors", () => {
  beforeEach(() => { resetMocks(); asAdmin(); });

  it("approves a pending vendor without creating leads or backfilling matches", async () => {
    const updated = { id: "v1", businessName: "Plumbing Co", email: "john@abcplumbing.com", status: "APPROVED" };
    mockPrisma.vendor.update.mockResolvedValue(updated);

    const { PATCH } = await import("@/app/api/admin/vendors/route");
    const res = await PATCH(mockRequest({ id: "v1", status: "APPROVED" }));
    const data = await jsonResponse(res);

    expect(data.status).toBe("APPROVED");
    expect(mockPrisma.vendor.update).toHaveBeenCalledWith({
      where: { id: "v1" },
      data: { status: "APPROVED" },
    });
    expect(mockEmail.sendVendorApproved).toHaveBeenCalled();
    expect(mockPrisma.lead.create).not.toHaveBeenCalled();
    expect(mockPrisma.serviceRequest.findMany).not.toHaveBeenCalled();
  });

  it("rejects a vendor", async () => {
    const updated = { id: "v1", status: "REJECTED" };
    mockPrisma.vendor.update.mockResolvedValue(updated);

    const { PATCH } = await import("@/app/api/admin/vendors/route");
    const res = await PATCH(mockRequest({ id: "v1", status: "REJECTED" }));
    const data = await jsonResponse(res);

    expect(data.status).toBe("REJECTED");
  });

  it("returns 400 when id or status is missing", async () => {
    const { PATCH } = await import("@/app/api/admin/vendors/route");
    const res = await PATCH(mockRequest({ id: "v1" }));
    const data = await jsonResponse(res);

    expect(res.status).toBe(400);
  });

  it("returns 400 for an invalid status value", async () => {
    const { PATCH } = await import("@/app/api/admin/vendors/route");
    const res = await PATCH(mockRequest({ id: "v1", status: "hacked" }));
    const data = await jsonResponse(res);

    expect(res.status).toBe(400);
    expect(data.error).toBe("Invalid vendor status");
    expect(mockPrisma.vendor.update).not.toHaveBeenCalled();
  });

  it("returns 404 when the vendor does not exist", async () => {
    mockPrisma.vendor.update.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError("Record not found", {
        code: "P2025",
        clientVersion: "7.0.0",
      })
    );

    const { PATCH } = await import("@/app/api/admin/vendors/route");
    const res = await PATCH(mockRequest({ id: "missing", status: "APPROVED" }));
    const data = await jsonResponse(res);

    expect(res.status).toBe(404);
    expect(data.error).toBe("Vendor not found");
    expect(mockEmail.sendVendorApproved).not.toHaveBeenCalled();
  });
});
