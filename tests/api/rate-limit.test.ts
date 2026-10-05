import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { asAdmin, mockPrisma, mockRequest, resetMocks } from "../helpers";
import { __resetRateLimits } from "@/lib/rate-limit";

function reqWithIp(body: unknown, ip: string): Request {
  const req = mockRequest(body);
  req.headers.set("x-forwarded-for", ip);
  return req;
}

describe("rate limiting on public write endpoints", () => {
  beforeEach(() => {
    resetMocks();
    __resetRateLimits();
  });
  afterEach(() => vi.restoreAllMocks());

  it("throttles /api/customer-requests after 5 calls in an hour", async () => {
    const { POST } = await import("@/app/api/customer-requests/route");
    mockPrisma.service.findUnique.mockResolvedValue({
      id: "svc-1", name: "Plumbing", active: true, isCatchAll: false,
    });
    mockPrisma.customer.findFirst.mockResolvedValue(null);
    mockPrisma.user.create.mockResolvedValue({ id: "u1" });
    mockPrisma.customer.create.mockResolvedValue({ id: "c1" });
    mockPrisma.serviceRequest.create.mockResolvedValue({ id: "r1" });
    mockPrisma.vendor.findMany.mockResolvedValue([]);

    const body = {
      name: "Rate Test",
      email: "rate@example.com",
      serviceId: "svc-1",
      zipCode: "12345",
      description: "Testing the throttle",
    };

    for (let i = 0; i < 5; i++) {
      const res = await POST(reqWithIp(body, "10.0.0.1"));
      expect(res.status).toBe(201);
    }

    const blocked = await POST(reqWithIp(body, "10.0.0.1"));
    expect(blocked.status).toBe(429);
    expect((await blocked.json()).error).toContain("Too many requests");
    expect(blocked.headers.get("Retry-After")).toBeTruthy();
  });

  it("does not send email for a throttled request", async () => {
    const { POST } = await import("@/app/api/customer-requests/route");
    const { mockEmail } = await import("../helpers");
    mockPrisma.service.findUnique.mockResolvedValue({
      id: "svc-1", name: "Plumbing", active: true, isCatchAll: false,
    });
    mockPrisma.customer.findFirst.mockResolvedValue(null);
    mockPrisma.user.create.mockResolvedValue({ id: "u1" });
    mockPrisma.customer.create.mockResolvedValue({ id: "c1" });
    mockPrisma.serviceRequest.create.mockResolvedValue({ id: "r1" });
    mockPrisma.vendor.findMany.mockResolvedValue([]);

    const body = {
      name: "Rate Test",
      email: "rate@example.com",
      serviceId: "svc-1",
      zipCode: "12345",
      description: "Testing the throttle",
    };

    for (let i = 0; i < 6; i++) await POST(reqWithIp(body, "10.0.0.2"));
    expect(mockEmail.sendAdminRequestAlert).toHaveBeenCalledTimes(5);
  });

  it("keeps budgets independent per client IP", async () => {
    const { POST } = await import("@/app/api/feedback/route");
    mockPrisma.serviceRequest.findUnique.mockResolvedValue({ id: "r1" });
    mockPrisma.customerFeedback.findUnique.mockResolvedValue(null);
    mockPrisma.customerFeedback.create.mockResolvedValue({ id: "f1" });

    const body = {
      serviceRequestId: "r1",
      rating: 5,
      hearAbout: "google",
      useAgain: "very_likely",
      recommend: "definitely",
    };

    for (let i = 0; i < 10; i++) {
      const res = await POST(reqWithIp(body, "10.0.1.1"));
      expect(res.status).toBe(201);
    }
    expect((await POST(reqWithIp(body, "10.0.1.1"))).status).toBe(429);

    // A different client is unaffected.
    const other = await POST(reqWithIp(body, "10.0.1.2"));
    expect(other.status).toBe(201);
  });

  it("keeps budgets independent per endpoint scope", async () => {
    const { POST: feedbackPOST } = await import("@/app/api/feedback/route");
    const { POST: vendorPOST } = await import("@/app/api/vendors/route");
    mockPrisma.serviceRequest.findUnique.mockResolvedValue({ id: "r1" });
    mockPrisma.customerFeedback.findUnique.mockResolvedValue(null);
    mockPrisma.customerFeedback.create.mockResolvedValue({ id: "f1" });

    const feedback = {
      serviceRequestId: "r1",
      rating: 4,
      hearAbout: "google",
      useAgain: "likely",
      recommend: "probably",
    };
    for (let i = 0; i < 10; i++) await feedbackPOST(reqWithIp(feedback, "10.0.2.1"));
    expect((await feedbackPOST(reqWithIp(feedback, "10.0.2.1"))).status).toBe(429);

    // The vendor endpoint has its own budget, so the same IP is still allowed.
    mockPrisma.user.findUnique.mockResolvedValue(null);
    mockPrisma.user.create.mockResolvedValue({ id: "u9" });
    mockPrisma.vendor.create.mockResolvedValue({ id: "v9" });
    mockPrisma.service.findUnique.mockResolvedValue({ id: "svc1", name: "Plumbing" });
    mockPrisma.vendorService.create.mockResolvedValue({});
    mockPrisma.vendorServiceArea.create.mockResolvedValue({});
    mockPrisma.vendorService.findMany.mockResolvedValue([{ service: { name: "Plumbing" } }]);

    const vendor = {
      businessName: "Scope Check Co",
      contactPerson: "Someone",
      email: "scope@example.com",
      phone: "555-0000",
      address: "1 Test St",
      password: "Passw0rd!23",
    };
    const res = await vendorPOST(reqWithIp(vendor, "10.0.2.1"));
    expect(res.status).toBe(201);
  });

  it("does not throttle authenticated admin endpoints", async () => {
    asAdmin();
    mockPrisma.service.findMany.mockResolvedValue([]);

    const { GET } = await import("@/app/api/admin/stats/route");
    mockPrisma.customer.count.mockResolvedValue(0);
    mockPrisma.vendor.count.mockResolvedValue(0);
    mockPrisma.serviceRequest.count.mockResolvedValue(0);
    mockPrisma.lead.count.mockResolvedValue(0);
    mockPrisma.project.count.mockResolvedValue(0);
    mockPrisma.payment.aggregate.mockResolvedValue({ _sum: { amount: 10 } });
    mockPrisma.customerFeedback.count.mockResolvedValue(0);
    mockPrisma.customerFeedback.aggregate.mockResolvedValue({ _avg: { rating: 4 } });

    for (let i = 0; i < 20; i++) {
      const res = await GET();
      expect(res.status).toBe(200);
    }
  });
});
