import { Resend } from "resend";

const FROM = process.env.EMAIL_FROM || "ALshowUhow <onboarding@resend.dev>";
const ADMIN_NOTIFY = process.env.ADMIN_NOTIFY_EMAIL || "nyc.aljoseph@gmail.com";
const ADMIN_NOTIFY_CC = process.env.ADMIN_NOTIFY_CC;
const APP_URL = process.env.NEXTAUTH_URL;

function client(): Resend | null {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  return new Resend(key);
}

// Every ADMIN-role user in the database receives admin notifications, plus
// anything explicitly configured via ADMIN_NOTIFY_EMAIL / ADMIN_NOTIFY_CC.
async function adminRecipients(): Promise<string[]> {
  const recipients = new Set<string>();
  if (ADMIN_NOTIFY) recipients.add(ADMIN_NOTIFY);
  try {
    const { db } = await import("@/lib/db");
    const admins = await db.user.findMany({
      where: { role: "ADMIN" },
      select: { email: true },
    });
    for (const admin of admins) recipients.add(admin.email);
  } catch {
    // DB unavailable — fall back to the env-configured recipient only.
  }
  if (ADMIN_NOTIFY_CC) {
    for (const cc of Array.isArray(ADMIN_NOTIFY_CC) ? ADMIN_NOTIFY_CC : [ADMIN_NOTIFY_CC]) {
      recipients.add(cc);
    }
  }
  return [...recipients];
}

async function send(
  to: string | string[],
  subject: string,
  html: string,
  cc?: string[] | string
): Promise<void> {
  const resend = client();
  if (!resend) return;
  const recipients = (Array.isArray(to) ? to : [to])
    .map(safeEmail)
    .filter((e): e is string => e !== null);
  const ccs = cc
    ? (Array.isArray(cc) ? cc : [cc])
        .map(safeEmail)
        .filter((e): e is string => e !== null)
    : undefined;
  if (recipients.length === 0) return;
  try {
    await resend.emails.send({
      from: FROM,
      to: recipients,
      cc: ccs,
      subject: sanitizeHeaderValue(subject),
      html,
    });
  } catch {
    // Email must never break the marketplace flow — silently move on.
  }
}

function wrap(content: string): string {
  return `
  <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#172554;">
    <div style="border-bottom:3px solid #C92535;padding-bottom:12px;margin-bottom:20px;">
      <span style="font-size:20px;font-weight:bold;color:#C92535;">AL</span><span style="font-size:20px;font-weight:bold;color:#4B1E8E;">showUhow</span>
    </div>
    ${content}
    <p style="font-size:12px;color:#6b7280;margin-top:32px;border-top:1px solid #e5e7eb;padding-top:12px;">
      You received this message because of activity on ALshowUhow.
    </p>
  </div>`;
}

// Escape user-supplied values before interpolating into HTML templates.
// Email clients render <img> tags even when <script> is stripped — unescaped
// customer/vendor input is a stored-XSS vector into admin mailboxes.
export function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Strip CR/LF (and collapse whitespace) from values interpolated into email
// subjects/addresses to prevent header/SMTP-envelope injection.
function sanitizeHeaderValue(value: unknown, max = 200): string {
  return String(value ?? "").replace(/[\r\n\t]+/g, " ").trim().slice(0, max);
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Drop CR/LF and reject clearly-invalid addresses before they reach Resend.
function safeEmail(value: unknown): string | null {
  const address = String(value ?? "").replace(/[\r\n]/g, "");
  return EMAIL_RE.test(address) ? address : null;
}

export function renderCustomerConfirmation(input: {
  name: string;
  serviceName: string;
  zipCode: string;
  otherServiceText?: string | null;
}): string {
  return wrap(`
      <h2 style="margin-top:0;">Request Received</h2>
      <p>Hi ${escapeHtml(input.name)},</p>
      <p>Thank you for contacting ALshowUhow. We've received your
      <strong>${escapeHtml(input.serviceName)}</strong> request for ZIP code
      <strong>${escapeHtml(input.zipCode)}</strong> and are working to identify an appropriate local provider.</p>
      ${input.otherServiceText ? `<p><strong>What you asked for:</strong><br/>${escapeHtml(input.otherServiceText)}</p>` : ""}
      <p>Our team is reviewing your request and will contact you with an update.</p>
    `);
}

export function sendCustomerConfirmation(input: {
  name: string;
  email: string;
  serviceName: string;
  zipCode: string;
  otherServiceText?: string | null;
}) {
  return send(
    input.email,
    "We received your service request — ALshowUhow",
    renderCustomerConfirmation(input)
  );
}

// @deprecated — Vendors are never auto-notified at match time (strict
// admin gatekeeping). Kept only for a future manual assign/release flow.
export function renderVendorLeadAlert(input: {
  businessName: string;
  serviceName: string;
  zipCode: string;
  description: string;
  urgency?: string;
}): string {
  return wrap(`
      <h2 style="margin-top:0;color:#C92535;">New Service Opportunity</h2>
      <p>Hello ${escapeHtml(input.businessName)},</p>
      <table style="width:100%;border-collapse:collapse;">
        <tr><td style="padding:6px 0;font-weight:bold;width:100px;">Service:</td><td>${escapeHtml(input.serviceName)}</td></tr>
        <tr><td style="padding:6px 0;font-weight:bold;">ZIP Code:</td><td>${escapeHtml(input.zipCode)}</td></tr>
        ${input.urgency === "URGENT" ? '<tr><td style="padding:6px 0;font-weight:bold;">Urgency:</td><td style="color:#C92535;font-weight:bold;">Urgent</td></tr>' : ""}
      </table>
      <p style="margin-top:16px;"><strong>Project:</strong><br/>${escapeHtml(input.description)}</p>
      <p>
        <a href="${escapeHtml(APP_URL)}/login"
           style="display:inline-block;background:#4B1E8E;color:#ffffff;text-decoration:none;
                  padding:10px 20px;border-radius:6px;font-weight:bold;margin-top:8px;">
          Review the lead
        </a>
      </p>
    `);
}

export function sendVendorLeadAlert(input: {
  businessName: string;
  email: string;
  serviceName: string;
  zipCode: string;
  description: string;
  urgency?: string;
}) {
  return send(
    input.email,
    "New ALshowUhow Service Opportunity",
    renderVendorLeadAlert(input)
  );
}

export function renderVendorApproved(input: { businessName: string }): string {
  return wrap(`
      <h2 style="margin-top:0;">Welcome aboard, ${escapeHtml(input.businessName)}!</h2>
      <p>Your vendor account has been approved.</p>
      <p>You are now eligible to receive leads. Our team matches requests
      to the right providers, and we will notify you when a lead is assigned
      to you. Sign in to review your leads.</p>
      <p>
        <a href="${escapeHtml(APP_URL)}/login"
           style="display:inline-block;background:#4B1E8E;color:#ffffff;text-decoration:none;
                  padding:10px 20px;border-radius:6px;font-weight:bold;">
          Sign in
        </a>
      </p>
    `);
}

export function sendVendorApproved(input: { businessName: string; email: string }) {
  return send(
    input.email,
    "You're approved — start receiving leads on ALshowUhow",
    renderVendorApproved(input)
  );
}

export type AdminMatchVendor = {
  id: string;
  businessName: string;
  contactName: string;
  email: string;
  phone: string;
  website: string | null;
};

export type AdminRequestAlertInput = {
  customerName: string;
  email: string;
  phone?: string | null;
  preferredContact?: string | null;
  serviceName: string;
  zipCode: string;
  description: string;
  additionalNotes?: string | null;
  otherServiceText?: string | null;
  urgency?: string;
  requestId: string;
  matchedVendors: AdminMatchVendor[];
};

// Pure renderer so the escaped HTML is unit-testable without a Resend key.
export function renderAdminRequestAlert(input: AdminRequestAlertInput): string {
  const vendorRows = input.matchedVendors.length
    ? input.matchedVendors
        .map(
          (v) => `
        <tr style="vertical-align:top;">
          <td style="padding:8px 6px;border-top:1px solid #e5e7eb;font-weight:bold;">${escapeHtml(v.businessName)}</td>
          <td style="padding:8px 6px;border-top:1px solid #e5e7eb;">${escapeHtml(v.contactName)}</td>
          <td style="padding:8px 6px;border-top:1px solid #e5e7eb;">${escapeHtml(v.email)}</td>
          <td style="padding:8px 6px;border-top:1px solid #e5e7eb;">${escapeHtml(v.phone)}</td>
          <td style="padding:8px 6px;border-top:1px solid #e5e7eb;">${escapeHtml(v.website)}</td>
        </tr>`
        )
        .join("")
    : '<tr><td style="padding:8px 6px;color:#6b7280;" colspan="5">No matching vendors found.</td></tr>';

  return wrap(`
      <h2 style="margin-top:0;color:#C92535;">New Customer Request</h2>
      <table style="width:100%;border-collapse:collapse;">
        <tr><td style="padding:6px 0;font-weight:bold;width:140px;">Customer:</td><td>${escapeHtml(input.customerName)}</td></tr>
        <tr><td style="padding:6px 0;font-weight:bold;">Email:</td><td><a href="mailto:${escapeHtml(input.email)}">${escapeHtml(input.email)}</a></td></tr>
        ${input.phone ? `<tr><td style="padding:6px 0;font-weight:bold;">Phone:</td><td>${escapeHtml(input.phone)}</td></tr>` : ""}
        ${input.preferredContact ? `<tr><td style="padding:6px 0;font-weight:bold;">Preferred Contact:</td><td>${escapeHtml(input.preferredContact)}</td></tr>` : ""}
        <tr><td style="padding:6px 0;font-weight:bold;">Service:</td><td>${escapeHtml(input.serviceName)}</td></tr>
        ${input.otherServiceText ? `<tr><td style="padding:6px 0;font-weight:bold;">Service Requested:</td><td><strong>${escapeHtml(input.otherServiceText)}</strong></td></tr>` : ""}
        <tr><td style="padding:6px 0;font-weight:bold;">ZIP Code:</td><td>${escapeHtml(input.zipCode)}</td></tr>
        ${input.urgency === "URGENT" ? '<tr><td style="padding:6px 0;font-weight:bold;">Urgency:</td><td style="color:#C92535;font-weight:bold;">Urgent</td></tr>' : ""}
        <tr><td style="padding:6px 0;font-weight:bold;">Description:</td><td>${escapeHtml(input.description)}</td></tr>
        ${input.additionalNotes ? `<tr><td style="padding:6px 0;font-weight:bold;">Additional Notes:</td><td>${escapeHtml(input.additionalNotes)}</td></tr>` : ""}
        <tr><td style="padding:6px 0;font-weight:bold;">Request ID:</td><td>${escapeHtml(input.requestId)}</td></tr>
      </table>
      <h3 style="margin:20px 0 8px;color:#172554;">Matched Vendors (${input.matchedVendors.length})</h3>
      <table style="width:100%;border-collapse:collapse;font-size:13px;">
        <tr style="text-align:left;color:#6b7280;">
          <th style="padding:6px;border-bottom:1px solid #d1d5db;">Business</th>
          <th style="padding:6px;border-bottom:1px solid #d1d5db;">Contact</th>
          <th style="padding:6px;border-bottom:1px solid #d1d5db;">Email</th>
          <th style="padding:6px;border-bottom:1px solid #d1d5db;">Phone</th>
          <th style="padding:6px;border-bottom:1px solid #d1d5db;">Website</th>
        </tr>
        ${vendorRows}
      </table>
      <p style="font-size:12px;color:#6b7280;margin-top:16px;">
        Vendors were NOT notified. Select and contact the right provider manually,
        then assign the lead in the admin dashboard.
      </p>
    `);
}

export function sendAdminRequestAlert(input: AdminRequestAlertInput) {
  return adminRecipients().then((to) => send(
    to,
    `New service request — ${input.serviceName}`,
    renderAdminRequestAlert(input)
  ));
}

export function renderAdminVendorPendingAlert(input: {
  businessName: string;
  contactName: string;
  email: string;
  phone: string;
  services: string;
  zipCodes: string;
}): string {
  return wrap(`
      <h2 style="margin-top:0;color:#C92535;">Vendor Registration Pending Approval</h2>
      <p>A new vendor has registered and needs your review.</p>
      <table style="width:100%;border-collapse:collapse;">
        <tr><td style="padding:6px 0;font-weight:bold;width:120px;">Business:</td><td>${escapeHtml(input.businessName)}</td></tr>
        <tr><td style="padding:6px 0;font-weight:bold;">Contact:</td><td>${escapeHtml(input.contactName)}</td></tr>
        <tr><td style="padding:6px 0;font-weight:bold;">Email:</td><td>${escapeHtml(input.email)}</td></tr>
        <tr><td style="padding:6px 0;font-weight:bold;">Phone:</td><td>${escapeHtml(input.phone)}</td></tr>
        <tr><td style="padding:6px 0;font-weight:bold;">Services:</td><td>${escapeHtml(input.services)}</td></tr>
        <tr><td style="padding:6px 0;font-weight:bold;">ZIP Codes:</td><td>${escapeHtml(input.zipCodes)}</td></tr>
      </table>
      <p>
        <a href="${escapeHtml(APP_URL)}/admin/dashboard"
           style="display:inline-block;background:#4B1E8E;color:#ffffff;text-decoration:none;
                  padding:10px 20px;border-radius:6px;font-weight:bold;margin-top:8px;">
          Review in the admin dashboard
        </a>
      </p>
    `);
}

export function sendAdminVendorPendingAlert(input: {
  businessName: string;
  contactName: string;
  email: string;
  phone: string;
  services: string;
  zipCodes: string;
}) {
  return adminRecipients().then((to) => send(
    to,
    `New vendor awaits approval — ${input.businessName}`,
    renderAdminVendorPendingAlert(input)
  ));
}
