# ALshowUhow — QA Analysis & Manual Test Guide

## Verdict: Basic MVP without payment? YES ✅

The app implements a working **lead-generation marketplace MVP with no payment flow**:

- Public marketing site (hero, stats, categories, how-it-works, vendor CTA)
- Customer service-request wizard → auto-matches approved vendors by **service + ZIP** → creates leads
- Vendor self-registration (lands as `PENDING`) → admin approves/rejects
- NextAuth credentials login with role toggle (Vendor / Administrator)
- Admin dashboard: stats overview, vendor approval, leads list, customers list
- Vendor dashboard: lead stats + lead list

A `Payment` model exists in the Prisma schema and one paid seed row feeds the "Total Revenue" stat ($25), but there is **no payment UI or checkout anywhere** — revenue is display-only. That is consistent with an MVP-without-payment.

---

## How to run

```bash
cd ~/DEV/work/Alshowuhow/alshowuhow
npm run dev          # http://localhost:3000
# optional clean slate (wipes all data, reseeds demo data):
npm run db:reset
```

> Note: the current `dev.db` contains leftover test rows (`tester@mail.com`, `tester1@mail.cm`, …). Run `npm run db:reset` before a formal QA pass.

## Test credentials (from `prisma/seed.ts`)

| Role | Email | Password | Notes |
|---|---|---|---|
| **Admin** | `nyc.aljoseph@gmail.com` | `alshowuhow@2026#7` | Full dashboard access |
| Vendor (approved) | `john@abcplumbing.com` | `vendor123` | ABC Plumbing Co. — Plumbing + HVAC, ZIPS 12345/12346/12347 |
| Vendor (approved) | `mike@quickelectric.com` | `vendor123` | Quick Electric — Electrical, ZIPS 12345/12347 |
| Vendor (approved) | `sarah@greenlawn.com` | `vendor123` | Green Lawn Care — Landscaping, ZIPS 12348/12349 |
| Vendor (**pending**) | `lisa@cleanpro.com` | `vendor123` | CleanPro Services — status PENDING (used for admin approval test) |

> Customers **cannot log in** (by design). `john@email.com` exists only as the owner of seeded requests; it has no usable password and sign-in attempts show "Customers don't need to log in."

Seeded services: Plumbing 🔧, HVAC ❄️, Electrical ⚡, Roofing 🏠, Landscaping 🌿, Cleaning ✨, Handyman 🔨, Appliance Repair 🔧

**Matching cheat-sheet** (request form → expected matched vendors):
- Plumbing @ `12345` → ABC Plumbing Co.
- HVAC @ `12346` → ABC Plumbing Co.
- Electrical @ `12347` → Quick Electric
- Landscaping @ `12349` → Green Lawn Care
- Cleaning @ any ZIP → **0 matches** (no vendor offers it)

---

## Pages under test

| Route | Type | Auth expected |
|---|---|---|
| `/` | Marketing homepage | Public |
| `/request` | Customer request wizard (5 steps) | Public |
| `/vendor/register` | Vendor application form | Public |
| `/login` | Login (role toggle) | Public |
| `/admin/dashboard` | Admin panel, 5 tabs | Should require ADMIN |
| `/vendor/dashboard` | Vendor leads view | Should require VENDOR |

Backend APIs: `/api/services`, `/api/customer-requests`, `/api/vendors`, `/api/vendors/leads`, `/api/admin/{stats,vendors,customers,leads,services}`, `/api/auth/[...nextauth]`

---

## Manual test checklist

### 1. Homepage `/`
- [ ] Hero renders with logo "ALshowUhow", headline, and two CTAs ("I Need a Service" → `/request`, vendor CTA → `/vendor/register`)
- [ ] Stats section renders
- [ ] Service Categories grid lists all 8 active services with icons; clicking a card navigates to `/request`
- [ ] How It Works shows 4 steps: Tell Us What You Need / We Find Local Pros / Vendors Contact You / Get It Done
- [ ] Vendor CTA section links to `/vendor/register` and `/login`
- [ ] Navbar links work: Home, I Need a Service, For Vendors, Login, Get Started
- [ ] Resize to mobile (<768px): hamburger menu appears, toggles open/close, links navigate and menu closes

### 2. Customer request wizard `/request`
- [ ] Progress bar shows 5 steps (Service, Location, Project Details, Contact Info, Review) and fills as you advance
- [ ] Step 1: "Next" disabled until a service tile is selected
- [ ] Step 2: ZIP input limited to 5 chars
- [ ] Step 3: description textarea, urgency toggle Normal/Urgent, optional notes
- [ ] Step 4: name/email/phone, preferred contact Email/Phone toggle
- [ ] Step 5: review screen reflects every value entered; Back works from any step
- [ ] Submit → success screen "Request Received!" showing your email
- [ ] Happy path: Plumbing + ZIP `12345` + valid data → then check Admin > Leads shows the new lead assigned to ABC Plumbing Co.
- [ ] No-match path: Cleaning + ZIP `90210` → still succeeds ("matchedVendors: 0"); verify in Admin > Leads no vendor is attached
- [ ] Empty-field submit: skip name/email/description via Back navigation then submit → red API error message shown (API rejects missing fields)
- [ ] Repeat submit with same email → existing customer reused, no duplicate user created

### 3. Vendor registration `/vendor/register`
- [ ] Services load dynamically from `/api/services`
- [ ] Multi-select service tiles highlight when selected
- [ ] Required fields enforced: businessName, contactPerson, email, phone, address, zipCodes
- [ ] Submit with an already-registered email (e.g., `john@email.com`) → error "Email already registered"
- [ ] Successful registration → "Application Submitted!" screen echoes your email
- [ ] Verify in Admin > Vendors: new vendor listed with status **PENDING**, selected services shown

### 4. Login `/login`
- [ ] Role toggle Vendor/Administrator changes accent color and button label
- [ ] Admin login `nyc.aljoseph@gmail.com` / `alshowuhow@2026#7` → redirects to `/admin/dashboard`
- [ ] Vendor login `john@abcplumbing.com` / `vendor123` → redirects to `/vendor/dashboard`
- [ ] Wrong password → inline "Invalid email or password"
- [ ] Unknown email → same generic error
- [ ] Logged-in user hitting the wrong dashboard is redirected to their own (admin → vendor page redirects to admin, etc.)
- [ ] "Register here" link visible only when role = Vendor

### 5. Admin dashboard `/admin/dashboard`
Sidebar tabs: Overview 📊, Vendors 🏪, Leads 📋, Customers 👥, Services 🔧

**Overview**
- [ ] Stat cards render: Total Requests, Active Leads, Pending Vendors, Won Projects, Total Revenue ($25 after reseed), Approved Vendors
- [ ] Recent Leads list (top 5) shows customer, service, ZIP, date, status pill

**Vendors**
- [ ] Table lists all vendors with contact, service tags, status pills
- [ ] Approve the pending CleanPro vendor → status flips to APPROVED without reload; Pending count drops / Approved rises on Overview
- [ ] Reject a pending vendor → status REJECTED
- [ ] Re-test customer matching: after approving a vendor that covers a service+ZIP, a new matching request should now create a lead for it (e.g., approve CleanPro… note: it has no services/Zips seeded, so instead register a new vendor covering Cleaning @ 12345, approve them, submit a Cleaning @ 12345 request)

**Leads**
- [ ] All leads listed: customer, service, ZIP, vendor (or "—"), status pill
- [ ] New requests appear at top (ordered newest first)

**Customers**
- [ ] Lists customers with email and request counts (John Doe = 2 after reseed)

**Services**
- [ ] Add-service form: create a new service with name (+ optional icon/description) → appears in list sorted by name and in `/request` + vendor registration forms
- [ ] Deactivate a service → shows Inactive (struck through); it disappears from public forms (`/api/services` returns active only)
- [ ] Reactivate a service → Active again

### 6. Vendor dashboard `/vendor/dashboard`
- [ ] Login as `john@abcplumbing.com`; header greets the vendor's business name; Sign out button returns to homepage
- [ ] Stat cards: New Leads / In Progress / Won / Total Leads consistent with the lead list below
- [ ] Lead cards show ID prefix, status pill, Urgent badge for urgent requests, service + ZIP, description, masked customer name ("John D.")
- [ ] WON lead shows green `$450` final value (after reseed)
- [ ] NEW/CONTACTED leads show action buttons: Mark Contacted (NEW only), Mark Won, Mark Lost → status pill updates without reload; Won stat +1 on WON; clicking Won twice doesn't error
- [ ] Empty state text if no leads
- [ ] ✅ Fixed: leads now belong to the signed-in vendor only — log in as Mike or Sarah and confirm you see only their own (or no) leads

### 7. End-to-end scenario (full loop, ~5 min)
1. `npm run db:reset`
2. Register new vendor: "QA Test Plumbing", services = Plumbing, ZIPS = `12345`, set a password
3. Login as admin → approve "QA Test Plumbing" in Vendors tab
4. Open `/request` in incognito → submit Plumbing @ `12345`, urgency Urgent
5. Admin > Leads: verify lead exists with vendor = QA Test Plumbing (or ABC), status NEW
6. Vendor dashboard: verify New Leads count increased
7. Admin > Overview: Total Requests +1

---

## Gaps & issues — status after fixes

All actionable gaps have been closed and verified (unit tests + live smoke test). #10 remains out of scope by design.

| # | Severity | Issue | Status |
|---|---|---|---|
| 1 | 🔴 High | **No authorization on any API route.** `/api/admin/*`, PATCH endpoints, and `/api/vendors/leads?vendorId=…` were callable unauthenticated. | ✅ **Fixed** — `src/lib/session.ts` adds `requireAdmin` / `requireVendor` guards on every route. Admin endpoints: 401 anonymous / 403 non-admin. Vendor leads are scoped to the signed-in vendor's account; PATCH verifies lead ownership (404/403). Dashboard pages also guard server-side and redirect by role. Verified live: anon → 401, vendor on admin API → 403, cross-role page access → redirect. |
| 2 | 🟠 Med | Vendor dashboard showed leads of `vendors[0]`, not of the signed-in vendor. | ✅ **Fixed** — `/vendor/dashboard` is now a server component that resolves the vendor from the session (`userId → Vendor`) and passes `vendorId` down; leads come from the session-scoped endpoint. |
| 3 | 🟠 Med | No UI for lead lifecycle (CONTACTED/WON/LOST). | ✅ **Fixed** — Vendor dashboard lead cards now have **Mark Contacted / Mark Won / Mark Lost** buttons hitting `PATCH /api/vendors/leads`. WON auto-creates a Project (upsert = safe on repeat clicks); Won Projects stat moves. Verified live end-to-end. |
| 4 | 🟡 Low | Admin Services tab was a placeholder. | ✅ **Fixed** — Full UI in Admin > Services: add service (name/description/icon), active/inactive toggle via PATCH, per-service vendor/request counts. |
| 5 | 🟡 Low | Homepage category cards linked to `/request?service=<id>` but the wizard ignored it. | ✅ **Fixed** — `/request` reads the `service` query param (Next 16 async `searchParams`) and preselects the tile; invalid ids are cleared once services load. |
| 6 | 🟡 Low | Wizard only validated step 1. | ✅ **Fixed** — Per-step gating: step 2 requires a valid 5-digit ZIP, step 3 a non-empty description, step 4 name + valid email; hint text explains what's missing. |
| 7 | 🟡 Low | Public-form customers got `passwordHash: "customer-pending"`. | ✅ **Fixed** — Now stores a bcrypt hash of a random UUID: no usable password exists until a real password/reset flow is built. |
| 8 | 🟡 Low | No sign-out anywhere. | ✅ **Fixed** — "Sign out" button added to both dashboards (`signOut({ callbackUrl: "/" })`). |
| 9 | 🟡 Low | "Remember me" / "Forgot password?" were decorative. | ✅ **Fixed** — Removed from the login form. |
| 10 | ℹ️ Info | Payment model + seeded $25 revenue exist, but no payment flow. | ⏸️ **Intentional** — out of scope for this MVP phase. |

### Verification summary
- `npx vitest run` → **38/38 passing** (new tests cover auth guards, ownership checks, project upsert)
- `tsc --noEmit` → clean; `eslint` → only pre-existing warnings/cypress-support error
- Live smoke test (dev server): anonymous 401s, admin/vendor logins, role redirects, scoped vendor leads, lead lifecycle CONTACTED→WON with auto-project, stats update, idempotent double-WON
- DB reset to clean seed afterwards

> Note for QA: run `npm run db:reset` before a formal pass to guarantee the documented baseline.

---

## Round 2 — findings from manual QA (all addressed)

### Answers to product questions

**What does "approved" / "rejected" mean for a vendor?**
It's the admin's quality gate on new vendor sign-ups. Lifecycle: a business registers → status **PENDING** (invisible to customers, receives no leads) → an admin reviews the application in Admin > Vendors:
- **Approve** → status APPROVED. From that moment the vendor is included in automatic matching: when a customer request matches the vendor's service + ZIP, a lead lands in the vendor's dashboard.
- **Reject** → status REJECTED. The account stays in the system but never enters matching and can't receive leads.

**Who is a "customer" and why do they have an account?**
A customer is a homeowner/person who submits a service request via `/request`. They don't sign up — an account row is created automatically from the email they typed in the form, purely as a container linking them to their request(s) and the leads generated from it. In this phase customers cannot log in at all: no dashboard exists for them and their auto-created password is unusable by design. If they later submit another request with the same email, the system reuses their record so their history stays together.

### Issues found & fixed

| # | Finding | Fix |
|---|---|---|
| R2-1 | Navbar always showed "Login" even while signed in | ✅ Navbar is session-aware (`useSession`): logged-in users see **Dashboard** (role-correct) + **Sign out**; logged-out users see Login + Get Started. Applies to desktop and mobile menus. |
| R2-2 | Logging in with customer credentials under the "Vendor" toggle landed on the vendor dashboard | ✅ Root cause: routing followed the UI role toggle instead of the account. Login now reads the session's real role after sign-in: ADMIN → admin dashboard, VENDOR → vendor dashboard, CUSTOMER → homepage (customers have no dashboard this phase). Role toggle removed — one honest "Sign In" button. |
| R2-3 | Browser back arrow returned to the dashboard still logged in | ✅ Dashboards are server-rendered per request (`force-dynamic`) and re-check the session every hit — after sign out, back-navigation bounces to /login. Note: the browser back/forward cache can briefly repaint a page it already rendered without asking the server; the next interaction re-validates. Full bfcache suppression isn't controllable from the app. |

### Regression checks for round 2
- [ ] Logged out: navbar shows Login + Get Started
- [ ] Log in as admin → navbar switches to Dashboard + Sign out (no Login link)
- [ ] Sign out → returns home; navbar shows Login again; browser Back on /admin/dashboard redirects to /login
- [ ] Vendor credentials → vendor dashboard; customer credentials (`john@email.com`) are rejected with a friendly message, never logged in
- [ ] `npx vitest run` → 38/38; cypress login spec updated to single-form flow

---

## Round 3 — product questions & changes

### Answers

**What is a lead?**
A lead is the connection record between one customer request and one vendor. When a customer submits a request, the system finds every approved vendor whose service list includes that service and whose ZIP area covers the customer's ZIP — each of those vendors gets its own Lead (status NEW). The vendor then works it: NEW → CONTACTED → WON or LOST. Marking WON auto-creates a Project. So: request = what the customer wants; lead = "this vendor was connected to this request."

**Who is an admin and why do they see stats?**
The admin is you / the platform operator — the business owner running ALshowUhow, not a user of the service. Their job: approve/reject vendors (quality gate), manage which services are offered, and watch marketplace health. The stats exist because they're your business metrics: total requests = demand, active leads = work in play, won projects = success rate, pending vendors = review backlog, revenue = lead fees collected. In short: customers use the site, vendors work leads, admin runs the marketplace.

**Why did the form promise a confirmation email?**
It shouldn't have — no email is ever actually sent in this phase (no email service is wired up). The success screen text was misleading and has been corrected to say matching providers will contact you directly at the given email.

**Why do logged-in users still see "I Need a Service" / "For Vendors"?**
They were static marketing links shown to everyone. Now hidden when signed in — logged-in vendors/admins see only Home + Dashboard + Sign out; the public marketing nav appears only for visitors.

**Can customers log in?**
Not anymore, by design (see change below).

### Changes made

| # | Change | Detail |
|---|---|---|
| R3-1 | Customer login removed | `authorize` now rejects CUSTOMER accounts with a dedicated error code; the login form shows "Customers don't need to log in — submit a request directly from the homepage." Seed no longer ships a working customer password (`customer123` gone). Customer accounts remain purely internal records linking requests + leads. |
| R3-2 | False email claim fixed | Request success screen now says "Matching providers will contact you directly at …" instead of claiming a confirmation email was sent. |
| R3-3 | Nav simplified for logged-in users | Signed in → Home, Dashboard, Sign out only. Marketing links ("I Need a Service", "For Vendors", Login, Get Started) show for visitors only. |

### Regression checks for round 3
- [ ] Submit a customer request → success screen mentions providers contacting you, says nothing about an email being sent
- [ ] Try logging in with `john@email.com` / any password → friendly "Customers don't need to log in" message, no session created
- [ ] Logged-in vendor/admin navbar shows exactly: Home, Dashboard, Sign out
- [ ] Vendor + admin logins still route correctly
- [ ] `npx vitest run` → 38/38

---

## Round 4 — requested features

### What was built

| # | Request | Implementation |
|---|---|---|
| R4-1 | Success screen should reflect the chosen contact method | The confirmation screen now adapts: chose **Phone** → "providers will call you at {number}"; chose **Email** → "…contact you at {email}"; chose **Both** → "…reach you at {phone} or {email}". |
| R4-2 | Contact preference: Email, Phone, and Both | Step 4 of the wizard now has three options (Email / Phone / Email & Phone). The Review step shows the selection; the value flows through the API into the request record. |
| R4-3 | Admin logs in on a separate domain/subdomain | Admin got its own console at **`/admin/login`** (dark blue, crimson accents — visually distinct from the vendor login). `/login` is now strictly vendor ("Vendor Sign In"). A host-based router (`src/proxy.ts`) serves the console on `admin.*` hosts: on `admin.alshowuhow.com`, `/` shows the console, `/login` becomes the admin form, and `/vendor/*` is unreachable. Vendors who type admin credentials into the admin form are signed out immediately with "This account does not have administrator access." |
| R4-4 | Vendors see customer contacts + one-click email | Vendor dashboard lead cards now show the customer's full name, 📧 email, 📞 phone, and their preferred contact method. An **"Email Customer"** button opens the browser's mail client (`mailto:`) pre-addressed to the customer with a subject line referencing their service request; a **"Call Customer"** button dials the number where present. |

### Subdomain notes (important)

- **Production:** point `admin.alshowuhow.com` at this app and set `AUTH_COOKIE_DOMAIN=".alshowuhow.com"` in `.env`. The session cookie then works on both domains and `src/proxy.ts` routes everything automatically.
- **Local dev:** browsers put `localhost` on the public suffix list, so a cookie can never be shared between `localhost` and `admin.localhost`. Locally use the console directly at **`http://localhost:3000/admin/login`**.

### Regression checks for round 4
- [ ] Wizard step 4: three toggle buttons (Email / Phone / Email & Phone); review screen shows "Preferred Contact"
- [ ] Submit with Phone chosen → success text mentions your phone number; Both → mentions both; Email → mentions email
- [ ] `/login` says "Vendor Sign In"; no admin wording anywhere on it
- [ ] `/admin/login` renders the Administrator Console; admin creds land in the dashboard; vendor creds are rejected and signed out
- [ ] Vendor dashboard lead cards show full customer name, email, phone, preferred contact; "Email Customer" opens mail client addressed to the customer
- [ ] `npx vitest run` → 38/38

## Automated tests available
- Unit/integration: `npm test` (vitest)
- E2E: `npm run test:e2e` (Cypress, needs dev server; specs in `cypress/`)

---

# Client Demo Guide — Email Notifications (Sandbox Mode)

Email notifications are now live via [Resend](https://resend.com). While the sending domain is not yet
verified, **every email is delivered to `hossamtuwano@gmail.com`** regardless of who the real recipient
would be. That is perfect for a client demo: submit things in the app, switch to Gmail, watch the
notifications arrive.

## How email works right now

| Setting (.env) | Value | Meaning |
|---|---|---|
| `RESEND_API_KEY` | set | Real sending through Resend. If removed/empty → dry-run mode (emails print as `[email:dry-run] ...` in the terminal instead of sending). |
| `EMAIL_FROM` | `onboarding@resend.dev` | Resend's sandbox sender — can ONLY deliver to the account owner's own inbox. This is why everything routes to you. |
| `EMAIL_DEMO_TO` | `hossamtuwano@gmail.com` | Forces ALL notifications into one inbox. Delete this line after the domain is verified to deliver to real recipients. |

**Going live later:** verify `alshowuhow.com` in the Resend dashboard (add the DNS records it shows),
change `EMAIL_FROM` to e.g. `ALshowUhow <noreply@alshowuhow.com>`, remove `EMAIL_DEMO_TO`, rotate the
API key (it was shared in chat), and restart. Nothing in the code changes.

## The three automated emails

| # | Trigger | Subject line |
|---|---|---|
| 1 | Customer submits a request | *We received your service request — ALshowUhow* |
| 2 | Request matches ≥1 approved vendor | *New ALshowUhow Service Opportunity* (one per matched vendor) |
| 3 | Admin approves a vendor | *You're approved — start receiving leads on ALshowUhow* |

## Before the client arrives (~10 min prep)

1. `npm run db:reset` — wipes test rows back to the documented seed baseline.
2. Check `.env` contains `RESEND_API_KEY` and `EMAIL_DEMO_TO="hossamtuwano@gmail.com"` (already configured).
3. `npm run dev` → confirm http://localhost:3000 loads.
4. Send yourself one test request now (Plumbing @ `12345`) and confirm both emails arrive.
   This proves the pipeline works **before** anyone is watching. Then `npm run db:reset` again.
5. Windows to have open:
   - Browser (incognito/logged-out): http://localhost:3000
   - Gmail signed in as `hossamtuwano@gmail.com` (check Spam/Promotions once so future mail is easy to find)
6. Credentials to keep handy:
   - Admin: `nyc.aljoseph@gmail.com` / `alshowuhow@2026#7`
   - Approved vendor: `john@abcplumbing.com` / `vendor123`

> Editing `.env` requires restarting `npm run dev` — do any changes before the demo.

## The demo script (~10 minutes, in order)

1. **Homepage** — "Customers come here; this is the marketplace front door." Point out the two CTAs.
2. **Submit a customer request** — Click *I Need a Service* → choose **Plumbing** → ZIP `12345`
   → describe a project → contact info → Submit. Success screen appears.
3. **Switch to Gmail** — Two new emails:
   - Confirmation to the customer (#1).
   - Lead alert for ABC Plumbing Co. (#2). Say: *"In production each matched vendor gets this at
     their own email address — right now everything routes to me because we haven't verified our
     domain yet."*
4. **Admin console** (`nyc.aljoseph@gmail.com`) — Overview shows the new request + active leads went up.
   Vendors tab → **Approve** the pending CleanPro vendor → Gmail receives email #3.
5. **Vendor side** — Sign out → login as `john@abcplumbing.com` → the lead from step 2 is in the
   dashboard → *Mark Contacted* → *Mark Won*. Point out the customer contact info + Email/Call buttons.
6. **Back to Admin Overview** — Won Projects +1, revenue stat reflects the seeded lead fee.
   *"This is the full loop: request → match → lead → outcome → revenue — tracked automatically."*

Optional closer: register a brand-new vendor live (any email), approve them as admin, resubmit a
matching request — shows the marketplace growing in real time.

## Troubleshooting mid-demo

| Symptom | Cause → Fix |
|---|---|
| Terminal prints `[email:dry-run] ...` instead of delivering | `.env` missing/unloaded → restore key, restart `npm run dev`. |
| No email, no dry-run log | Check Gmail Spam/Promotions; check https://resend.com/logs for the API result. |
| Emails stop after many submissions | Resend free tier caps at ~100 emails/day — reset happens daily. |
| Mail goes somewhere unexpected | `EMAIL_DEMO_TO` must stay the account-owner address while using the sandbox sender. |
| App errors on submit | Email failures never block requests by design — an error there is unrelated; check terminal. |
