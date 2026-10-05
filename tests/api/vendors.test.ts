import { describe, it, expect, beforeEach } from "vitest";
import { mockPrisma, mockRequest, jsonResponse, resetMocks, asAdmin } from "../helpers";

describe("POST /api/vendors", () => {
  beforeEach(() => resetMocks());

  const validVendorData = {
    businessName: "Test Plumbing",
    contactPerson: "John Test",
    email: "john@test.com",
    phone: "(555) 123-4567",
    address: "123 Test St, City, ST 12345",
    services: ["svc1", "svc2"],
    zipCodes: "12345, 12346",
    password: "testpass123",
  };

  it("registers a new vendor with all fields", async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null);
    const createdUser = { id: "user1", email: "john@test.com", role: "VENDOR" };
    mockPrisma.user.create.mockResolvedValue(createdUser);
    const createdVendor = { id: "vendor1", ...validVendorData, userId: "user1" };
    mockPrisma.vendor.create.mockResolvedValue(createdVendor);
    mockPrisma.service.findUnique.mockResolvedValue({ id: "svc1", name: "Plumbing" });
    mockPrisma.vendorService.create.mockResolvedValue({});
    mockPrisma.vendorServiceArea.create.mockResolvedValue({});
    mockPrisma.vendorService.findMany.mockResolvedValue([{ service: { name: "Plumbing" } }]);

    const { POST } = await import("@/app/api/vendors/route");
    const res = await POST(mockRequest(validVendorData));
    const data = await jsonResponse(res);

    expect(res.status).toBe(201);
    expect(data.id).toBe("vendor1");
    expect(mockPrisma.user.create).toHaveBeenCalledTimes(1);
    expect(mockPrisma.vendor.create).toHaveBeenCalledTimes(1);
    expect(mockPrisma.vendorService.create).toHaveBeenCalledTimes(2);
    expect(mockPrisma.vendorServiceArea.create).toHaveBeenCalledTimes(2);
  });

  it("returns 409 if email already registered", async () => {
    mockPrisma.user.findUnique.mockResolvedValue({ id: "existing", email: "john@test.com" });

    const { POST } = await import("@/app/api/vendors/route");
    const res = await POST(mockRequest(validVendorData));
    const data = await jsonResponse(res);

    expect(res.status).toBe(409);
    expect(data.error).toBe("Email already registered");
  });

  it("returns 400 if required fields are missing", async () => {
    const { POST } = await import("@/app/api/vendors/route");
    const res = await POST(mockRequest({ email: "only@email.com" }));
    const data = await jsonResponse(res);

    expect(res.status).toBe(400);
    expect(data.error).toBe("Missing required fields");
  });
});

describe("GET /api/vendors", () => {
  beforeEach(() => resetMocks());

  it("returns all vendors with services and service areas for admins", async () => {
    asAdmin();

    const vendors = [
      { id: "v1", businessName: "Plumbing Co", services: [], serviceAreas: [] },
    ];
    mockPrisma.vendor.findMany.mockResolvedValue(vendors);

    const { GET } = await import("@/app/api/vendors/route");
    const res = await GET();
    const data = await jsonResponse(res);

    expect(data).toEqual(vendors);
    expect(mockPrisma.vendor.findMany).toHaveBeenCalledWith({
      include: { services: { include: { service: true } }, serviceAreas: true },
      orderBy: { createdAt: "desc" },
    });
  });

  it("returns 401 when not authenticated", async () => {
    const { GET } = await import("@/app/api/vendors/route");
    const res = await GET();

    expect(res.status).toBe(401);
  });
});
