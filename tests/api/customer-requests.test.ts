import { describe, it, expect, beforeEach } from "vitest";
import { mockPrisma, mockEmail, mockRequest, jsonResponse, resetMocks, asAdmin } from "../helpers";

describe("POST /api/customer-requests", () => {
  beforeEach(() => resetMocks());

  const validRequest = {
    name: "John Doe",
    email: "john@example.com",
    phone: "(555) 123-4567",
    serviceId: "svc1",
    zipCode: "12345",
    description: "Leaking pipe needs repair",
    preferredContactMethod: "email",
    urgency: "NORMAL",
  };

  // The route resolves the service up front (existence + active + isCatchAll).
  const normalService = { id: "svc1", name: "Plumbing", active: true, isCatchAll: false };

  it("creates customer + service request, matches vendors but creates no leads and emails no vendors", async () => {
    mockPrisma.service.findUnique.mockResolvedValue(normalService);
    mockPrisma.customer.findFirst.mockResolvedValue(null);
    const user = { id: "u1", email: "john@example.com", role: "CUSTOMER" };
    mockPrisma.user.create.mockResolvedValue(user);
    const customer = { id: "c1", userId: "u1", firstName: "John", lastName: "Doe", email: "john@example.com" };
    mockPrisma.customer.create.mockResolvedValue(customer);
    const request = {
      id: "r1",
      customerId: "c1",
      serviceId: "svc1",
      zipCode: "12345",
      matchedVendors: [{ id: "v1", businessName: "Plumbing Co" }],
    };
    mockPrisma.serviceRequest.create.mockResolvedValue(request);
    const matchedVendor = {
      id: "v1",
      businessName: "Plumbing Co",
      contactName: "John Doe",
      email: "john@abcplumbing.com",
      phone: "555-1234",
      website: null,
    };
    mockPrisma.vendor.findMany.mockResolvedValue([matchedVendor]);

    const { POST } = await import("@/app/api/customer-requests/route");
    const res = await POST(mockRequest(validRequest));
    const data = await jsonResponse(res);

    expect(res.status).toBe(201);
    expect(data.matchedVendors).toBe(1);
    expect(data.leadsCreated).toBe(0);
    // Admin-only snapshot must never echo back to the customer response.
    expect(data.request).not.toHaveProperty("matchedVendors");
    expect(mockPrisma.serviceRequest.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          matchedVendors: [
            {
              id: "v1",
              businessName: "Plumbing Co",
              contactName: "John Doe",
              email: "john@abcplumbing.com",
              phone: "555-1234",
              website: null,
            },
          ],
        }),
      })
    );
    expect(mockPrisma.lead.create).not.toHaveBeenCalled();
    expect(mockEmail.sendVendorLeadAlert).not.toHaveBeenCalled();
    // Admin alert receives the full match snapshot (not a count), and no leaks.
    expect(mockEmail.sendAdminRequestAlert).toHaveBeenCalledWith(
      expect.objectContaining({
        requestId: "r1",
        matchedVendors: [
          {
            id: "v1",
            businessName: "Plumbing Co",
            contactName: "John Doe",
            email: "john@abcplumbing.com",
            phone: "555-1234",
            website: null,
          },
        ],
      })
    );
  });

  it("finds existing customer by email and stores empty matched-vendors snapshot when no vendors match", async () => {
    mockPrisma.service.findUnique.mockResolvedValue(normalService);
    const existingCustomer = { id: "c1", userId: "u1", firstName: "John", lastName: "Doe", email: "john@example.com" };
    mockPrisma.customer.findFirst.mockResolvedValue(existingCustomer);
    const request = { id: "r1", customerId: "c1" };
    mockPrisma.serviceRequest.create.mockResolvedValue(request);
    mockPrisma.vendor.findMany.mockResolvedValue([]);

    const { POST } = await import("@/app/api/customer-requests/route");
    const res = await POST(mockRequest(validRequest));
    const data = await jsonResponse(res);

    expect(res.status).toBe(201);
    expect(mockPrisma.user.create).not.toHaveBeenCalled();
    expect(mockPrisma.customer.create).not.toHaveBeenCalled();
    expect(data.matchedVendors).toBe(0);
    expect(mockPrisma.serviceRequest.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ matchedVendors: [] }),
      })
    );
  });

  it("returns 400 for missing required fields", async () => {
    const { POST } = await import("@/app/api/customer-requests/route");
    const res = await POST(mockRequest({ name: "John" }));
    const data = await jsonResponse(res);

    expect(res.status).toBe(400);
    expect(data.error).toBe("Missing required fields");
  });

  it("returns 400 when no name is provided", async () => {
    const { POST } = await import("@/app/api/customer-requests/route");
    const res = await POST(mockRequest({
      email: "test@test.com",
      serviceId: "svc1",
      zipCode: "12345",
      description: "Some description",
    }));
    const data = await jsonResponse(res);

    expect(res.status).toBe(400);
  });

  it("returns 400 for an unknown or inactive service", async () => {
    mockPrisma.service.findUnique.mockResolvedValue(null);

    const { POST } = await import("@/app/api/customer-requests/route");
    const res = await POST(mockRequest(validRequest));
    const data = await jsonResponse(res);

    expect(res.status).toBe(400);
    expect(data.error).toBe("Unknown service");
    // Nothing may be written when the service can't be resolved.
    expect(mockPrisma.serviceRequest.create).not.toHaveBeenCalled();
  });

  it("returns 400 for an inactive service", async () => {
    mockPrisma.service.findUnique.mockResolvedValue({ ...normalService, active: false });

    const { POST } = await import("@/app/api/customer-requests/route");
    const res = await POST(mockRequest(validRequest));

    expect(res.status).toBe(400);
    expect(mockPrisma.serviceRequest.create).not.toHaveBeenCalled();
  });
});

describe("POST /api/customer-requests — catch-all (Other) service", () => {
  beforeEach(() => resetMocks());

  const catchAllService = { id: "svc-other", name: "Other", active: true, isCatchAll: true };

  const otherRequest = {
    name: "Jane Roe",
    email: "jane@example.com",
    phone: "(555) 999-0000",
    serviceId: "svc-other",
    zipCode: "12345",
    description: "Need a quote",
    preferredContactMethod: "email",
    urgency: "NORMAL",
    otherServiceText: "  Install a ceiling fan  ",
  };

  const zipFallbackVendor = {
    id: "v9",
    businessName: "Any Handyman",
    contactName: "Sam Doe",
    email: "sam@anyhandyman.com",
    phone: "555-9999",
    website: null,
  };

  it("rejects the request with 400 when the free-text is missing", async () => {
    mockPrisma.service.findUnique.mockResolvedValue(catchAllService);

    const { POST } = await import("@/app/api/customer-requests/route");
    const res = await POST(mockRequest({ ...otherRequest, otherServiceText: "   " }));
    const data = await jsonResponse(res);

    expect(res.status).toBe(400);
    expect(data.error).toBe("Please tell us what service you need");
    expect(mockPrisma.serviceRequest.create).not.toHaveBeenCalled();
  });

  it("rejects free-text longer than the cap", async () => {
    mockPrisma.service.findUnique.mockResolvedValue(catchAllService);

    const { POST } = await import("@/app/api/customer-requests/route");
    const res = await POST(
      mockRequest({ ...otherRequest, otherServiceText: "x".repeat(501) }),
    );
    const data = await jsonResponse(res);

    expect(res.status).toBe(400);
    expect(data.error).toMatch(/under 500 characters/);
    expect(mockPrisma.serviceRequest.create).not.toHaveBeenCalled();
  });

  it("falls back to every approved vendor in the ZIP when service matching returns nothing", async () => {
    mockPrisma.service.findUnique.mockResolvedValue(catchAllService);
    mockPrisma.customer.findFirst.mockResolvedValue({ id: "c9", userId: "u9" });
    mockPrisma.serviceRequest.create.mockResolvedValue({ id: "r9", customerId: "c9" });
    // First call = strict service+ZIP match (empty), second = ZIP-only fallback.
    mockPrisma.vendor.findMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([zipFallbackVendor]);

    const { POST } = await import("@/app/api/customer-requests/route");
    const res = await POST(mockRequest(otherRequest));
    const data = await jsonResponse(res);

    expect(res.status).toBe(201);
    expect(data.matchedVendors).toBe(1);

    // The fallback must be ZIP-scoped and still restricted to approved vendors.
    expect(mockPrisma.vendor.findMany).toHaveBeenLastCalledWith({
      where: { status: "APPROVED", serviceAreas: { some: { zipCode: "12345" } } },
      orderBy: { businessName: "asc" },
    });
  });

  it("does not run the ZIP fallback when service matching already found a vendor", async () => {
    mockPrisma.service.findUnique.mockResolvedValue(catchAllService);
    mockPrisma.customer.findFirst.mockResolvedValue({ id: "c9", userId: "u9" });
    mockPrisma.serviceRequest.create.mockResolvedValue({ id: "r9", customerId: "c9" });
    mockPrisma.vendor.findMany.mockResolvedValue([zipFallbackVendor]);

    const { POST } = await import("@/app/api/customer-requests/route");
    const res = await POST(mockRequest(otherRequest));

    expect(res.status).toBe(201);
    expect(mockPrisma.vendor.findMany).toHaveBeenCalledTimes(1);
  });

  it("does not fall back to the ZIP for a non-catch-all service with no matches", async () => {
    mockPrisma.service.findUnique.mockResolvedValue({
      id: "svc1", name: "Plumbing", active: true, isCatchAll: false,
    });
    mockPrisma.customer.findFirst.mockResolvedValue({ id: "c1", userId: "u1" });
    mockPrisma.serviceRequest.create.mockResolvedValue({ id: "r1", customerId: "c1" });
    mockPrisma.vendor.findMany.mockResolvedValue([]);

    const { POST } = await import("@/app/api/customer-requests/route");
    const res = await POST(
      mockRequest({
        name: "John Doe", email: "john@example.com", serviceId: "svc1",
        zipCode: "12345", description: "Leak",
      }),
    );

    expect(res.status).toBe(201);
    expect(mockPrisma.vendor.findMany).toHaveBeenCalledTimes(1);
  });

  it("trims and stores the free-text, and passes it to both emails", async () => {
    mockPrisma.service.findUnique.mockResolvedValue(catchAllService);
    mockPrisma.customer.findFirst.mockResolvedValue({ id: "c9", userId: "u9" });
    mockPrisma.serviceRequest.create.mockResolvedValue({ id: "r9", customerId: "c9" });
    mockPrisma.vendor.findMany.mockResolvedValue([zipFallbackVendor]);

    const { POST } = await import("@/app/api/customer-requests/route");
    const res = await POST(mockRequest(otherRequest));

    expect(res.status).toBe(201);
    expect(mockPrisma.serviceRequest.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ otherServiceText: "Install a ceiling fan" }),
      })
    );
    expect(mockEmail.sendCustomerConfirmation).toHaveBeenCalledWith(
      expect.objectContaining({ otherServiceText: "Install a ceiling fan" })
    );
    expect(mockEmail.sendAdminRequestAlert).toHaveBeenCalledWith(
      expect.objectContaining({ otherServiceText: "Install a ceiling fan" })
    );
  });

  it("ignores free-text on a normal service (stored as null)", async () => {
    mockPrisma.service.findUnique.mockResolvedValue({
      id: "svc1", name: "Plumbing", active: true, isCatchAll: false,
    });
    mockPrisma.customer.findFirst.mockResolvedValue({ id: "c1", userId: "u1" });
    mockPrisma.serviceRequest.create.mockResolvedValue({ id: "r1", customerId: "c1" });
    mockPrisma.vendor.findMany.mockResolvedValue([]);

    const { POST } = await import("@/app/api/customer-requests/route");
    const res = await POST(
      mockRequest({
        name: "John Doe", email: "john@example.com", serviceId: "svc1",
        zipCode: "12345", description: "Leak", otherServiceText: "sneaky injection",
      }),
    );

    expect(res.status).toBe(201);
    expect(mockPrisma.serviceRequest.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ otherServiceText: null }),
      })
    );
    expect(mockEmail.sendAdminRequestAlert).toHaveBeenCalledWith(
      expect.objectContaining({ otherServiceText: null })
    );
  });
});

describe("GET /api/customer-requests", () => {
  beforeEach(() => {
    resetMocks();
    asAdmin();
  });

  it("returns all requests with customer, service, and leads", async () => {
    asAdmin();
    const requests = [
      { id: "r1", customer: {}, service: {}, leads: [] },
    ];
    mockPrisma.serviceRequest.findMany.mockResolvedValue(requests);

    const { GET } = await import("@/app/api/customer-requests/route");
    const res = await GET();
    const data = await jsonResponse(res);

    expect(data).toEqual(requests);
    expect(mockPrisma.serviceRequest.findMany).toHaveBeenCalledWith({
      include: {
        customer: true,
        service: true,
        leads: { include: { vendor: true } },
      },
      orderBy: { createdAt: "desc" },
    });
  });

  it("returns 401 when not authenticated", async () => {
    const { mockAuth } = await import("../helpers");
    mockAuth.user = null;

    const { GET } = await import("@/app/api/customer-requests/route");
    const res = await GET();

    expect(res.status).toBe(401);
  });
});

describe("ServiceRequest enum normalisation", () => {
  beforeEach(() => resetMocks());

  const normalService = { id: "svc1", name: "Plumbing", active: true, isCatchAll: false };

  async function postWith(extra: Record<string, unknown>) {
    mockPrisma.service.findUnique.mockResolvedValue(normalService);
    mockPrisma.customer.findFirst.mockResolvedValue(null);
    mockPrisma.user.create.mockResolvedValue({ id: "u1", role: "CUSTOMER" });
    mockPrisma.customer.create.mockResolvedValue({ id: "c1" });
    mockPrisma.serviceRequest.create.mockResolvedValue({ id: "r1" });
    mockPrisma.vendor.findMany.mockResolvedValue([]);

    const { POST } = await import("@/app/api/customer-requests/route");
    return POST(
      mockRequest({
        name: "Enum Test",
        email: "enum@example.com",
        serviceId: "svc1",
        zipCode: "12345",
        description: "Checking enums",
        ...extra,
      }),
    );
  }

  it("stores an upper-case urgency", async () => {
    const res = await postWith({ urgency: "URGENT" });
    expect(res.status).toBe(201);
    expect(mockPrisma.serviceRequest.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ urgency: "URGENT" }),
      }),
    );
  });

  it("coerces a lower-case urgency to the canonical value instead of storing it verbatim", async () => {
    await postWith({ urgency: "urgent" });
    expect(mockPrisma.serviceRequest.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ urgency: "NORMAL" }),
      }),
    );
  });

  it("rejects an unknown urgency value by falling back to NORMAL", async () => {
    await postWith({ urgency: "ASAP" });
    expect(mockPrisma.serviceRequest.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ urgency: "NORMAL" }),
      }),
    );
  });

  it("rejects an unknown preferred contact method by falling back to email", async () => {
    await postWith({ preferredContactMethod: "carrier-pigeon" });
    expect(mockPrisma.serviceRequest.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ preferredContactMethod: "email" }),
      }),
    );
  });
});
