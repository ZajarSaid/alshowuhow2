# ALshowUhow

A full-stack service marketplace connecting customers with approved vendors. Customers submit service requests; approved vendors compete for the leads; admins manage the marketplace in a scoped subdomain console.

## Stack

- Next.js (App Router)
- Prisma + SQLite / Turso
- NextAuth v5 (JWT, credentials)
- Tailwind CSS
- Cypress (e2e + component), Vitest

## Key highlights / what I owned

- **Multi-tenant admin host** — served the admin console on its own `admin.*` subdomain via Next.js middleware, sharing one JWT session across subdomains with a domain-scoped cookie (`AUTH_COOKIE_DOMAIN`).
- **Role/approval-gated access** — customers, vendors, and admins have different auth policies (customers can't log in, vendors must be approved before access), enforced in both the authorize callback and middleware.
- **Production sign-out fix** — replaced the flaky client-side `signOut` with a server action that clears the session cookie reliably across the shared subdomain, even in production.
- **Full vendor lifecycle** — request intake, lead assignment, approval workflow, admin stats/dashboard, plus email notifications (Resend, with dry-run mode).

## Skills it demonstrates

- Full-stack app architecture
- AuthN / AuthZ and session management across domains
- Database modeling
- Middleware / routing
- CI (Cypress e2e + component tests, Vitest)
- Shipping a DB-backed app to production (Vercel + Turso)
