import { describe, it, expect, beforeEach } from "vitest";
import { asAdmin, jsonResponse, mockPrisma, mockRequest, resetMocks } from "../helpers";

describe("GET /api/admin/leads", () => {
  beforeEach(() => { resetMocks(); asAdmin(); });

  it("returns all leads with service request, vendor, and project", async () => {
    const leads = [
      {
        id: "l1",
        status: "NEW",
        serviceRequest: { customer: { firstName: "John" }, service: { name: "Plumbing" } },
        vendor: { businessName: "Plumbing Co" },
        project: null,
      },
    ];
    mockPrisma.lead.findMany.mockResolvedValue(leads);

    const { GET } = await import("@/app/api/admin/leads/route");
    const res = await GET();
    const data = await jsonResponse(res);

    expect(data).toEqual(leads);
    expect(mockPrisma.lead.findMany).toHaveBeenCalledWith({
      include: {
        serviceRequest: { include: { customer: true, service: true } },
        vendor: true,
        project: true,
      },
      orderBy: { createdAt: "desc" },
    });
  });
});

describe("PATCH /api/admin/leads", () => {
  beforeEach(() => { resetMocks(); asAdmin(); });

  it("updates lead status", async () => {
    const updated = { id: "l1", status: "ASSIGNED" };
    mockPrisma.lead.update.mockResolvedValue(updated);

    const { PATCH } = await import("@/app/api/admin/leads/route");
    const res = await PATCH(mockRequest({ id: "l1", status: "ASSIGNED" }));
    const data = await jsonResponse(res);

    expect(data.status).toBe("ASSIGNED");
    expect(mockPrisma.lead.update).toHaveBeenCalledWith({
      where: { id: "l1" },
      data: expect.objectContaining({ status: "ASSIGNED", assignedAt: expect.any(Date) }),
    });
  });

  it("assigns a vendor to a lead", async () => {
    const updated = { id: "l1", vendorId: "v1", status: "ASSIGNED" };
    mockPrisma.lead.update.mockResolvedValue(updated);

    const { PATCH } = await import("@/app/api/admin/leads/route");
    const res = await PATCH(mockRequest({ id: "l1", vendorId: "v1", status: "ASSIGNED" }));
    const data = await jsonResponse(res);

    expect(mockPrisma.lead.update).toHaveBeenCalledWith({
      where: { id: "l1" },
      data: expect.objectContaining({ vendorId: "v1", status: "ASSIGNED" }),
    });
  });

  it("returns 400 when lead id is missing", async () => {
    const { PATCH } = await import("@/app/api/admin/leads/route");
    const res = await PATCH(mockRequest({ status: "NEW" }));
    const data = await jsonResponse(res);

    expect(res.status).toBe(400);
  });
});
