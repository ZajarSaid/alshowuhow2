import { describe, it, expect, beforeEach } from "vitest";
import { asAdmin, jsonResponse, mockPrisma, resetMocks } from "../helpers";

describe("GET /api/admin/customers", () => {
  beforeEach(() => { resetMocks(); asAdmin(); });

  it("returns all customers with their service requests", async () => {
    const customers = [
      {
        id: "c1",
        firstName: "John",
        lastName: "Doe",
        email: "john@email.com",
        serviceRequests: [
          { id: "r1", service: { name: "Plumbing" }, createdAt: "2026-01-01T00:00:00.000Z" },
        ],
      },
    ];
    mockPrisma.customer.findMany.mockResolvedValue(customers);

    const { GET } = await import("@/app/api/admin/customers/route");
    const res = await GET();
    const data = await jsonResponse(res);

    expect(data).toEqual(customers);
    expect(mockPrisma.customer.findMany).toHaveBeenCalledWith({
      include: {
        serviceRequests: {
          include: {
            service: true,
            leads: { include: { vendor: true } },
          },
          orderBy: { createdAt: "desc" },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  });

  it("returns empty array when no customers exist", async () => {
    mockPrisma.customer.findMany.mockResolvedValue([]);

    const { GET } = await import("@/app/api/admin/customers/route");
    const res = await GET();
    const data = await jsonResponse(res);

    expect(data).toEqual([]);
  });
});
