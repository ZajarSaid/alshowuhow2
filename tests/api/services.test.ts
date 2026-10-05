import { describe, it, expect, beforeEach } from "vitest";
import { mockPrisma, mockRequest, jsonResponse, resetMocks, asAdmin } from "../helpers";

describe("GET /api/services", () => {
  beforeEach(() => resetMocks());

  it("returns featured categories with their active sub-services, excluding the catch-all", async () => {
    const mockCategories = [
      {
        id: "cat-1",
        name: "Home Services",
        icon: "🏡",
        description: "Plumbing, HVAC, and more",
        subServices: [
          { id: "sub-1", name: "Plumbing", icon: "🔧", description: "Pipes and faucets" },
          { id: "sub-2", name: "HVAC", icon: "❄️", description: "Heating and cooling" },
        ],
      },
    ];
    mockPrisma.service.findMany.mockResolvedValue(mockCategories);

    const { GET } = await import("@/app/api/services/route");
    const res = await GET();
    const data = await jsonResponse(res);

    expect(data).toEqual(mockCategories);
    expect(mockPrisma.service.findMany).toHaveBeenCalledWith({
      // isCatchAll: false — the "Other" bucket is a customer free-text input,
      // not a real service a vendor can register for. Excluding it also keeps
      // the vendor form from rendering a category with an empty sub-grid.
      where: { active: true, featured: true, isCatchAll: false },
      orderBy: { sortOrder: "asc" },
      select: {
        id: true,
        name: true,
        icon: true,
        description: true,
        subServices: {
          where: { active: true },
          orderBy: { sortOrder: "asc" },
          select: { id: true, name: true, icon: true, description: true },
        },
      },
    });
  });
});

describe("POST /api/services", () => {
  beforeEach(() => {
    resetMocks();
    asAdmin();
  });

  it("returns 401 when not authenticated", async () => {
    const { mockAuth } = await import("../helpers");
    mockAuth.user = null;

    const { POST } = await import("@/app/api/services/route");
    const res = await POST(mockRequest({ name: "X" }));

    expect(res.status).toBe(401);
  });

  it("creates a new service with valid data", async () => {
    const input = { name: "Painting", description: "Interior and exterior", icon: "🎨" };
    const created = { id: "3", ...input, active: true };
    mockPrisma.service.create.mockResolvedValue(created);

    const { POST } = await import("@/app/api/services/route");
    const res = await POST(mockRequest(input));
    const data = await jsonResponse(res);

    expect(res.status).toBe(201);
    expect(data).toEqual(created);
    expect(mockPrisma.service.create).toHaveBeenCalledWith({
      data: { name: "Painting", description: "Interior and exterior", icon: "🎨" },
    });
  });

  it("returns 400 when name is missing", async () => {
    const { POST } = await import("@/app/api/services/route");
    const res = await POST(mockRequest({ description: "No name" }));
    const data = await jsonResponse(res);

    expect(res.status).toBe(400);
    expect(data.error).toBe("Name is required");
  });
});
