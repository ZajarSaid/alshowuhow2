import { describe, it, expect, beforeEach } from "vitest";
import { asAdmin, mockPrisma, mockRequest, resetMocks } from "../helpers";

function rawRequest(body: string): Request {
  return new Request("http://localhost:3000/api/test", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
  });
}

const validService = {
  id: "svc-1",
  name: "Roofing",
  description: null,
  icon: null,
  active: true,
  featured: false,
  isCatchAll: false,
  parentId: null,
  _count: { vendorServices: 0, serviceRequests: 0 },
};

describe("GET /api/admin/services", () => {
  beforeEach(() => { resetMocks(); });

  it("returns the service list to an admin", async () => {
    asAdmin();
    mockPrisma.service.findMany.mockResolvedValue([validService]);

    const { GET } = await import("@/app/api/admin/services/route");
    const res = await GET();

    expect(res.status).toBe(200);
    expect((await res.json()).length).toBe(1);
  });

  it("is 401 with no session, so the service tree is not public", async () => {
    mockPrisma.service.findMany.mockResolvedValue([validService]);

    const { GET } = await import("@/app/api/admin/services/route");
    const res = await GET();

    expect(res.status).toBe(401);
    expect(mockPrisma.service.findMany).not.toHaveBeenCalled();
  });

  it("is 403 for a non-admin user", async () => {
    const { mockAuth } = await import("../helpers");
    mockAuth.user = { id: "u1", email: "v@test.com", role: "VENDOR" };

    const { GET } = await import("@/app/api/admin/services/route");
    const res = await GET();

    expect(res.status).toBe(403);
    expect(mockPrisma.service.findMany).not.toHaveBeenCalled();
  });
});

describe("POST /api/admin/services", () => {
  beforeEach(() => { resetMocks(); });

  it("creates a service for an admin", async () => {
    asAdmin();
    mockPrisma.service.create.mockResolvedValue(validService);

    const { POST } = await import("@/app/api/admin/services/route");
    const res = await POST(mockRequest({ name: "Roofing" }));

    expect(res.status).toBe(201);
    expect(mockPrisma.service.create).toHaveBeenCalled();
  });

  it("is 401 with no session, so nobody can create services anonymously", async () => {
    const { POST } = await import("@/app/api/admin/services/route");
    const res = await POST(mockRequest({ name: "Injected" }));

    expect(res.status).toBe(401);
    expect(mockPrisma.service.create).not.toHaveBeenCalled();
  });

  it("rejects a missing name with 400", async () => {
    asAdmin();
    const { POST } = await import("@/app/api/admin/services/route");
    const res = await POST(mockRequest({ description: "no name" }));

    expect(res.status).toBe(400);
    expect(mockPrisma.service.create).not.toHaveBeenCalled();
  });

  it("rejects a whitespace-only name with 400", async () => {
    asAdmin();
    const { POST } = await import("@/app/api/admin/services/route");
    const res = await POST(mockRequest({ name: "   " }));

    expect(res.status).toBe(400);
  });
});

describe("PATCH /api/admin/services", () => {
  beforeEach(() => { resetMocks(); });

  it("is 401 with no session, so nobody can deactivate a service anonymously", async () => {
    const { PATCH } = await import("@/app/api/admin/services/route");
    const res = await PATCH(mockRequest({ id: "svc-1", active: false }, "PATCH"));

    expect(res.status).toBe(401);
    expect(mockPrisma.service.update).not.toHaveBeenCalled();
  });

  it("updates a service for an admin", async () => {
    asAdmin();
    mockPrisma.service.update.mockResolvedValue({ ...validService, active: false });

    const { PATCH } = await import("@/app/api/admin/services/route");
    const res = await PATCH(mockRequest({ id: "svc-1", active: false }, "PATCH"));

    expect(res.status).toBe(200);
  });

  it("rejects a malformed JSON body with 400 instead of an unhandled 500", async () => {
    asAdmin();
    const { PATCH } = await import("@/app/api/admin/services/route");
    const res = await PATCH(rawRequest("{not json"));

    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("Invalid JSON body");
  });

  it("rejects a non-object JSON body (array) with 400", async () => {
    asAdmin();
    const { PATCH } = await import("@/app/api/admin/services/route");
    const res = await PATCH(rawRequest("[1,2,3]"));

    expect(res.status).toBe(400);
  });

  it("rejects a bare string JSON body with 400", async () => {
    asAdmin();
    const { PATCH } = await import("@/app/api/admin/services/route");
    const res = await PATCH(rawRequest('"hello"'));

    expect(res.status).toBe(400);
  });

  it("returns a JSON 500 (not a stack trace) when the database rejects the update", async () => {
    asAdmin();
    mockPrisma.service.update.mockRejectedValue(new Error("P2025: record not found"));

    const { PATCH } = await import("@/app/api/admin/services/route");
    const res = await PATCH(mockRequest({ id: "nope", active: false }, "PATCH"));

    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body).toEqual({ error: "Internal server error" });
    expect(JSON.stringify(body)).not.toContain("P2025");
  });
});

describe("public vendor registration body validation", () => {
  beforeEach(() => { resetMocks(); });

  const vendorBody = {
    businessName: "Shape Check Co",
    contactPerson: "Someone",
    email: "shape-check@example.com",
    phone: "555-0000",
    address: "1 Test St",
    password: "Passw0rd!23",
  };

  it("rejects a non-array `services` value instead of iterating its characters", async () => {
    const { POST } = await import("@/app/api/vendors/route");
    const res = await POST(mockRequest({ ...vendorBody, services: "not-an-array" }));

    expect(res.status).toBe(400);
    expect((await res.json()).error).toContain("services must be an array");
    expect(mockPrisma.user.create).not.toHaveBeenCalled();
  });

  it("rejects a non-string `zipCodes` value", async () => {
    const { POST } = await import("@/app/api/vendors/route");
    const res = await POST(mockRequest({ ...vendorBody, zipCodes: 12345 }));

    expect(res.status).toBe(400);
    expect((await res.json()).error).toContain("zipCodes must be");
  });

  it("rejects a malformed JSON body with 400", async () => {
    const { POST } = await import("@/app/api/vendors/route");
    const res = await POST(rawRequest("{{{"));

    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("Invalid JSON body");
  });
});
