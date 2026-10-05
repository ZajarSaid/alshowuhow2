# ALSHOWUHOW — SESSION HANDOFF

Status snapshot so the next agent/session can pick up exactly where things stand.
Written: 2026-09-01. Repo is on `main` and currently in sync with production.

---

## 1) Quick facts

- **Repo:** `git@github.com:HossamTuwano/ALshowUhow.git` (private), branch `main`, auto-deploys to Vercel on push.
- **Stack:** Next.js `16.3.1` (App Router+Actions), NextAuth v5 (AUTH.js), Prisma 7 (`@prisma/client` + `@prisma/adapter-libsql`), Turso (libSQL) DB, Tailwind v4, Resend for email.
- **Domains:** `alshowuhow.com` (public site), `admin.alshowuhow.com` (admin console — host-routed via `src/proxy.ts`).
- **Production DB:** Turso at `libsql://alshouhow-prod-hossamtuwano.aws-us-east-1.turso.io`. Contains REAL data — never run a destructive reseed against it.
- **Local DB:** `dev.db` (untracked, in `.gitignore`). `.env` `DATABASE_URL` points at `file:./dev.db`.

## 2) Downloads/setup for a fresh session

- Dev server: `npm run dev`. Build check: `npx next build`.
- Reads docs in `node_modules/next/dist/docs/` BEFORE writing Next.js code (custom Next 16 conventions — see AGENTS.md).
- Prisma skills available in `.agents/skills/` / `.claude/skills/`.

## 3) Production infra — env vars

Vercel production env vars include: `DATABASE_URL` (libsql prod URL), `DATABASE_AUTH_TOKEN`, `AUTH_SECRET`, `AUTH_TRUST_HOST`, `AUTH_COOKIE_DOMAIN` (set to `.alshowuhow.com`), `NEXTAUTH_URL` (`https://alshowuhow.com`), `RESEND_API_KEY` (send-only), `EMAIL_FROM` (`ALshowUhow <no-reply@alshowuhow.com>`), `ADMIN_NOTIFY_EMAIL` (`nyc.aljoseph@gmail.com`).

> **IMPORTANT:** The production Turso `DATABASE_AUTH_TOKEN` is NOT in local `.env`. It was shared inline in prior chat. If a session needs to script against prod: either pull it from the Vercel dashboard, or ask the user to re-share it. Use env `TURSO_DATABASE_URL` / `TURSO_AUTH_TOKEN` with `tsx scripts/_x.ts` (see pattern below). Do NOT hardcode the token into repo files.

### Verified script pattern (prod DB access)
```ts
import { PrismaClient } from "@prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";
const adapter = new PrismaLibSql({ url: process.env.TURSO_DATABASE_URL!, authToken: process.env.TURSO_AUTH_TOKEN! });
const db = new PrismaClient({ adapter });
```
Run with: `TURSO_DATABASE_URL="libsql://alshouhow-prod-..." TURSO_AUTH_TOKEN="<token>" npx tsx scripts/_x.ts`

## 4) Admin credentials

- Admin: `nyc.aljoseph@gmail.com` / `alshowuhow@2026#7` (works locally AND in prod Turso DB — old `admin@alshowuhow.com` was deleted from both).
- Admin console: `https://alshowuhow.com/admin/login` (or `admin.alshowuhow.com`).
- Vendor login: `https://alshowuhow.com/login`. Test vendors: `john@abcplumbing.com` / `vendor123`, `mike@quickelectric.com` / `vendor123`.
- Full creds + testing instructions also in `qa_analysis.md`.

## 5) Work completed (this + recent sessions)

- **MVP feature set live:** public homepage, `/request` flow, vendor register/login/dashboard/settings, admin console (Overview/Vendors/Leads/Customers/Services), automatic vendor matching by service+ZIP (`src/app/api/customer-requests/route.ts`).
- **Emails (Resend):** `sendCustomerConfirmation`, `sendVendorLeadAlert`, `sendAdminRequestAlert` in `src/lib/email.ts`. Admin request-alert goes To `ADMIN_NOTIFY_EMAIL`. `EMAIL_DEMO_TO` / `ADMIN_NOTIFY_CC` removed (test-only, must never be set in prod).
- **Email UX fix:** `send()` returns a non-throwing result; `route.ts` used `Promise.allSettled` so email failures never block request creation.
- **Production polish:** removed hardcoded/password fallback, fake placeholder data, console logs, localhost fallback (email now real), fabric vendor stats relabeled; no raw UUIDs shown in UI.
- **Logo:** `src/logo.png` now used across Navbar, Footer, AdminDashboard, login pages, admin login.
- **Sign-out bug FIXED (commit `61b4626`):** all sign-out buttons (AdminDashboard, Navbar desktop+mobile, VendorDashboard, VendorSettings) now use client-side `signOut({ callbackUrl: "/" })` from `next-auth/react`. `src/actions/auth.ts` was deleted. Root cause: server-side `cookies().delete()` can't clear the cross-domain cookie (`domain=.alshowuhow.com`), but client-side signOut uses the exact cookie attributes set at login. **Next session should NOT reintroduce `signOutAction`.**
- **Admin console routing:** host-based router in `src/proxy.ts` — on `admin.*` hosts, `/` and `/login` show the admin console; logged-in admin hitting login pages redirects to `/admin/dashboard`.

## 6) Proven end-to-end (do not re-test unnecessarily)

On 2026-09-01 a live PROD proof was run: POST to `https://alshowuhow.com/api/customer-requests` (Plumbing @ ZIP 12345) returned `matchedVendors:2, leadsCreated:2`. Prod DB rows verified: 2 leads in `NEW` status attached to **ABC Plumbing Co.** and **Hossam Tuwano**. Resend returned real send IDs for both vendor lead alerts + admin alert. Test rows were then deleted (leads=2, request=1, customer=1, user=1 removed).

## 7) Uncommitted / do-not-touch

- `ALSHOWUHOW_TESTING_MANUAL.txt` — client-facing MVP testing manual for the non-technical client/owner. **CONTAINS THE ADMIN PASSWORD.** User explicitly said DO NOT commit it — keep local only, send to client directly if desired.
- `.env` is untracked (good). `dev.db` untracked (good).

## 8) Known limitations / future work

1. **Payment** not implemented (no money/checkout/vendor fees). Revenue figures shown are examples.
2. **No customer accounts/login** — customers only submit requests.
3. Demo/seed vendors exist so the site isn't empty; replace with real vendors.
4. Email deliverability — Resend domain verified but some mail may hit Spam/Promotions; `EMAIL_FROM` already uses the custom verified domain.
5. `AUTH_COOKIE_DOMAIN` nuance — must stay `.alshowuhow.com` for the shared cross-domain session cookie.

## 9) Suggested next steps (when the client gives feedback)

1. Ask the client (owner) to run through `ALSHOWUHOW_TESTING_MANUAL.txt`; fix anything they report (Part 8 reporting format).
2. If sign-out is still flaky on `admin.alshowuhow.com`, double-check `AUTH_COOKIE_DOMAIN` env on Vercel.
3. Plan for real vendor onboarding + payments (biggest gap to a sellable product).
4. Optionally rotate the prod `DATABASE_AUTH_TOKEN` (it appears inside git history from an earlier deleted `VERCEL_UPLOAD_ENV.txt`; repo is private so low urgency).