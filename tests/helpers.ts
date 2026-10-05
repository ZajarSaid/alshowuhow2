import { vi } from "vitest";
import { __resetRateLimits } from "@/lib/rate-limit";

const mockPrisma = {
  service: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    count: vi.fn(),
  },
  vendor: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    count: vi.fn(),
  },
  vendorService: {
    create: vi.fn(),
    findMany: vi.fn(),
  },
  vendorServiceArea: {
    create: vi.fn(),
    createMany: vi.fn(),
  },
  user: {
    findUnique: vi.fn(),
    create: vi.fn(),
  },
  customer: {
    findFirst: vi.fn(),
    create: vi.fn(),
    findMany: vi.fn(),
    count: vi.fn(),
  },
  serviceRequest: {
    create: vi.fn(),
    findMany: vi.fn(),
    findUnique: vi.fn(),
    count: vi.fn(),
  },
  lead: {
    create: vi.fn(),
    findMany: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
    count: vi.fn(),
  },
  project: {
    create: vi.fn(),
    upsert: vi.fn(),
    count: vi.fn(),
  },
  payment: {
    aggregate: vi.fn(),
    create: vi.fn(),
  },
  notification: {
    findMany: vi.fn(),
  },
  customerFeedback: {
    findUnique: vi.fn(),
    create: vi.fn(),
    findMany: vi.fn(),
    count: vi.fn(),
    aggregate: vi.fn(),
  },
  $disconnect: vi.fn(),
};

vi.mock("@/lib/db", () => ({
  db: mockPrisma,
}));

export const mockEmail = {
  sendCustomerConfirmation: vi.fn(),
  sendVendorLeadAlert: vi.fn(),
  sendVendorApproved: vi.fn(),
  sendAdminRequestAlert: vi.fn(),
  sendAdminVendorPendingAlert: vi.fn(),
  escapeHtml: vi.fn((value) => String(value ?? "")),
  renderAdminRequestAlert: vi.fn(() => ""),
};

vi.mock("@/lib/email", () => mockEmail);

type MockUser = { id: string; email?: string | null; role: string };

export const mockAuth = {
  user: null as MockUser | null,
  vendor: null as { id: string; status: string } | null,
};

vi.mock("@/lib/session", () => {
  const deny = (status: number, error: string) => async () => ({
    value: null,
    response: new Response(JSON.stringify({ error }), {
      status,
      headers: { "Content-Type": "application/json" },
    }),
  });
  return {
    getSessionUser: async () => mockAuth.user,
    requireAdmin: async () => {
      if (!mockAuth.user) return { value: null, response: new Response(null, { status: 401 }) };
      if (mockAuth.user.role !== "ADMIN") return { value: null, response: new Response(null, { status: 403 }) };
      return { value: mockAuth.user, response: null };
    },
    requireVendor: async () => {
      if (!mockAuth.user) return { value: null, response: new Response(null, { status: 401 }) };
      if (mockAuth.user.role !== "VENDOR" || !mockAuth.vendor) {
        return { value: null, response: new Response(null, { status: 403 }) };
      }
      return {
        value: { ...mockAuth.user, vendorId: mockAuth.vendor.id, vendorStatus: mockAuth.vendor.status },
        response: null,
      };
    },
    __deny: deny,
  };
});

export function asAdmin() {
  mockAuth.user = { id: "admin-user", email: "admin@test.com", role: "ADMIN" };
}

export function asVendor(vendorId = "vendor-session-1") {
  mockAuth.user = { id: "vendor-user", email: "vendor@test.com", role: "VENDOR" };
  mockAuth.vendor = { id: vendorId, status: "APPROVED" };
}

export function resetMocks() {
  vi.clearAllMocks();
  mockAuth.user = null;
  mockAuth.vendor = null;
  // Rate-limit buckets are module state that outlives a single mock reset, so a
  // test file that calls a throttled endpoint repeatedly would start tripping the
  // limiter partway through and produce failures unrelated to what it is testing.
  __resetRateLimits();
}

export { mockPrisma };

export function mockRequest(body?: unknown, method = "POST"): Request {
  return new Request("http://localhost:3000/api/test", {
    method,
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
}

export function jsonResponse(res: Response) {
  return res.json();
}
