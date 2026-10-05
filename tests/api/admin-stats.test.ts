import { describe, it, expect, beforeEach } from "vitest";
import { asAdmin, jsonResponse, mockPrisma, resetMocks } from "../helpers";

describe("GET /api/admin/stats", () => {
  beforeEach(() => { resetMocks(); asAdmin(); });

  it("returns aggregated dashboard stats", async () => {
    mockPrisma.customer.count.mockResolvedValue(5);
    mockPrisma.vendor.count
      .mockResolvedValueOnce(10)  // total vendors
      .mockResolvedValueOnce(3)   // pending
      .mockResolvedValueOnce(7);  // approved
    mockPrisma.serviceRequest.count.mockResolvedValue(20);
    mockPrisma.lead.count.mockResolvedValue(8);
    mockPrisma.project.count
      .mockResolvedValueOnce(5)   // won
      .mockResolvedValueOnce(2);  // lost
    mockPrisma.payment.aggregate.mockResolvedValue({ _sum: { amount: 1250 } });
    mockPrisma.customerFeedback.count
      .mockResolvedValueOnce(12)  // total feedback
      .mockResolvedValueOnce(9)   // use again count
      .mockResolvedValueOnce(10); // recommend count
    mockPrisma.customerFeedback.aggregate.mockResolvedValue({ _avg: { rating: 4.2 } });

    const { GET } = await import("@/app/api/admin/stats/route");
    const res = await GET();
    const data = await jsonResponse(res);

    expect(data).toEqual({
      totalCustomers: 5,
      totalVendors: 10,
      pendingVendors: 3,
      approvedVendors: 7,
      totalRequests: 20,
      activeLeads: 8,
      wonProjects: 5,
      lostProjects: 2,
      totalRevenue: 1250,
      totalFeedback: 12,
      avgRating: 4.2,
      percentUseAgain: 75,
      percentRecommend: 83,
    });
  });

  it("returns 0 revenue when no payments exist", async () => {
    mockPrisma.customer.count.mockResolvedValue(0);
    mockPrisma.vendor.count.mockResolvedValue(0);
    mockPrisma.serviceRequest.count.mockResolvedValue(0);
    mockPrisma.lead.count.mockResolvedValue(0);
    mockPrisma.project.count.mockResolvedValue(0);
    mockPrisma.payment.aggregate.mockResolvedValue({ _sum: { amount: null } });
    mockPrisma.customerFeedback.count
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(0);
    mockPrisma.customerFeedback.aggregate.mockResolvedValue({ _avg: { rating: null } });

    const { GET } = await import("@/app/api/admin/stats/route");
    const res = await GET();
    const data = await jsonResponse(res);

    expect(data.totalRevenue).toBe(0);
  });

  it("returns 401 when not authenticated", async () => {
    const { mockAuth } = await import("../helpers");
    mockAuth.user = null;

    const { GET } = await import("@/app/api/admin/stats/route");
    const res = await GET();

    expect(res.status).toBe(401);
  });

  it("returns 403 for non-admin users", async () => {
    const { mockAuth } = await import("../helpers");
    mockAuth.user = { id: "u1", email: "cust@test.com", role: "CUSTOMER" };

    const { GET } = await import("@/app/api/admin/stats/route");
    const res = await GET();

    expect(res.status).toBe(403);
  });
});
