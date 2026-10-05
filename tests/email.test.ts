import { describe, it, expect } from "vitest";
import {
  escapeHtml,
  renderAdminRequestAlert,
  renderAdminVendorPendingAlert,
  renderCustomerConfirmation,
  renderVendorApproved,
  renderVendorLeadAlert,
} from "@/lib/email";

describe("escapeHtml", () => {
  it("escapes HTML-significant characters", () => {
    expect(escapeHtml(`<script>alert("x&y")</script>`)).toBe(
      "&lt;script&gt;alert(&quot;x&amp;y&quot;)&lt;/script&gt;"
    );
  });

  it("escapes single quotes", () => {
    expect(escapeHtml("it's")).toBe("it&#39;s");
  });

  it("handles null and undefined", () => {
    expect(escapeHtml(null)).toBe("");
    expect(escapeHtml(undefined)).toBe("");
  });
});

describe("renderAdminRequestAlert", () => {
  const base = {
    customerName: "Jane Doe",
    email: "jane@example.com",
    phone: "(555) 123-4567",
    serviceName: "Plumbing",
    zipCode: "12345",
    description: "Leaking pipe",
    urgency: "NORMAL",
    requestId: "r1",
    matchedVendors: [
      {
        id: "v1",
        businessName: "Plumbing Co",
        contactName: "John Doe",
        email: "john@abcplumbing.com",
        phone: "555-1000",
        website: "https://abcplumbing.com",
      },
      {
        id: "v2",
        businessName: "Quick Electric",
        contactName: "Mike Smith",
        email: "mike@quickelectric.com",
        phone: "555-2000",
        website: null,
      },
    ],
  };

  it("lists every matched vendor with full contact details and a request ID", () => {
    const html = renderAdminRequestAlert(base);

    expect(html).toContain("Matched Vendors (2)");
    expect(html).toContain("Plumbing Co");
    expect(html).toContain("abcplumbing.com");
    expect(html).toContain("Quick Electric");
    expect(html).toContain("mike@quickelectric.com");
    expect(html).toContain("Request ID:");
    expect(html).not.toContain("lead(s) created");
  });

  it("never leaks raw user input into the HTML (stored-XSS guard)", () => {
    const html = renderAdminRequestAlert({
      ...base,
      customerName: `<img src=x onerror=alert(1)>`,
      description: `<script>alert("pwned")</script>`,
      matchedVendors: [
        {
          id: "v1",
          businessName: `<b>Evil Co</b> & Sons`,
          contactName: `"><script>`,
          email: "e@x.com",
          phone: "555-3000",
          website: "url",
        },
      ],
    });

    expect(html).not.toContain("<img src=x");
    expect(html).not.toContain("<script>");
    expect(html).not.toContain("<b>Evil Co</b>");
    expect(html).toContain("&lt;img src=x");
    expect(html).toContain("&lt;script&gt;");
    expect(html).toContain("&lt;b&gt;Evil Co&lt;/b&gt; &amp; Sons");
    expect(html).toContain("&quot;&gt;&lt;script&gt;");
  });

  it("omits the phone row when not provided", () => {
    const html = renderAdminRequestAlert({ ...base, phone: null });
    expect(html).not.toContain("(555) 123-4567");
  });

  it("shows a no-match message when zero vendors matched", () => {
    const html = renderAdminRequestAlert({ ...base, matchedVendors: [] });
    expect(html).toContain("Matched Vendors (0)");
    expect(html).toContain("No matching vendors found.");
  });

  it("flags urgent requests", () => {
    const html = renderAdminRequestAlert({ ...base, urgency: "URGENT" });
    expect(html).toContain("Urgent");
  });

  it("shows preferred contact method and additional notes for the admin", () => {
    const html = renderAdminRequestAlert({
      ...base,
      preferredContact: "phone",
      additionalNotes: "Call after 6pm",
    });
    expect(html).toContain("Preferred Contact:");
    expect(html).toContain("Call after 6pm");
  });
});

describe("renderCustomerConfirmation", () => {
  it("escapes user input (stored-XSS guard)", () => {
    const html = renderCustomerConfirmation({
      name: `<img src=x onerror=alert(1)>`,
      serviceName: `<script>alert(1)</script>`,
      zipCode: `12345" "<!--`,
    });

    expect(html).not.toContain("<img src=x");
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;img src=x");
    expect(html).toContain("&lt;script&gt;");
  });
});

describe("renderVendorApproved", () => {
  it("escapes the business name", () => {
    const html = renderVendorApproved({ businessName: `<b>Evil Co</b>&Sons` });
    expect(html).not.toContain("<b>Evil Co</b>");
    expect(html).toContain("&lt;b&gt;Evil Co&lt;/b&gt;&amp;Sons");
  });
});

describe("renderVendorLeadAlert", () => {
  it("escapes input and flags urgency", () => {
    const html = renderVendorLeadAlert({
      businessName: `<script>alert(1)</script>`,
      serviceName: "Plumbing",
      zipCode: "12345",
      description: `<img src=x onerror=alert(1)>`,
      urgency: "URGENT",
    });

    expect(html).not.toContain("<script>");
    expect(html).not.toContain("<img src=x");
    expect(html).toContain("&lt;script&gt;");
    expect(html).toContain("&lt;img src=x");
    expect(html).toContain("Urgent");
  });
});

describe("renderAdminVendorPendingAlert", () => {
  it("escapes all registration fields", () => {
    const html = renderAdminVendorPendingAlert({
      businessName: `<b>Co</b>`,
      contactName: `<img src=x onerror=alert(1)>`,
      email: `a@b.com`,
      phone: "555-0000",
      services: `<script>alert(1)</script>, Plumbing`,
      zipCodes: `10001, 10002`,
    });

    expect(html).not.toContain("<b>Co</b>");
    expect(html).not.toContain("<img src=x");
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;b&gt;Co&lt;/b&gt;");
    expect(html).toContain("&lt;img src=x");
    expect(html).toContain("&lt;script&gt;alert(1)&lt;/script&gt;, Plumbing");
  });
});