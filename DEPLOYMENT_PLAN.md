# Deployment Plan — ALshowUhow on Vercel + Turso

Status: proposed, not yet implemented.
Scope: keep Turso (libSQL/SQLite). No provider change.

This plan fixes the two silent-failure risks in the current deploy path, then
gives the exact Vercel configuration to apply once the local fixes land.

---

## 1. Current state

The stack is sound and should stay as-is:

- **Turso** holds the database, reached over HTTPS via libSQL.
- **Prisma 7** is the query layer. It never speaks to Turso directly — it speaks
  to `@prisma/adapter-libsql`, which wraps `@libsql/client`. `src/lib/db.ts`
  hands that adapter a URL and token, and Prisma emits SQLite-dialect queries.
- **Resend** sends transactional mail, fire-and-forget.

Prisma Migrate is **not supported against Turso** (Turso's docs and Prisma's v7
SQLite docs both state this; the supported workflow is `prisma migrate dev`
locally, then apply the `.sql` via `turso db shell`). So `prisma/schema.sql`
plus hand-run idempotent migration scripts plus a drift check is the correct
architecture for this provider, not a workaround. It should be kept and
hardened, not replaced.

### Verified facts this plan depends on

- `prisma.config.ts` marks `datasource` as *"Optional for most cases, but
  required for migration / introspection commands."* Therefore `prisma generate`
  does **not** need a database URL.
- Every route builds as `ƒ (Dynamic)`; only `/icon.svg` is static. Therefore
  `next build` never queries the database.
- Consequence: the drift check in `vercel.json` is the **only** part of the build
  that needs production database access.

---

## 2. The problems

### P1-a — `src/lib/db.ts` fails silently in production

`src/lib/db.ts:14` falls back to `file:./dev.db` for any URL that does not start
with `libsql`. On Vercel the filesystem is ephemeral, so a missing or mistyped
`DATABASE_URL` produces a green deploy serving an **empty database**. Nothing in
the logs says so.

This is the highest-severity item: it is the only failure mode that loses
customer-visible data rather than raising an error.

### P1-b — the build depends on production database availability

`vercel.json:3` runs `npm run db:check-drift:required && npm run build`. As a
result:

1. A Turso outage or transient network failure blocks all deploys.
2. Every build adds a network round-trip to production.
3. **Every pull request produces a Vercel preview build that queries the
   production database.** Preview builds inherit production environment
   variables.

### P2-a — money is stored as `Float`

`Project.estimatedValue`, `Project.finalValue` and `Payment.amount` are
IEEE-754 doubles. Real invoices will be off by cents.

Note: do **not** switch these to Prisma `Decimal`. On SQLite, `Decimal` maps to
`DECIMAL`, which SQLite stores with NUMERIC affinity and may still hold a REAL.
Integer minor units are the only reliable representation on this provider.

### P2-b — rate limits are per-instance on Vercel

`src/lib/rate-limit.ts:18` uses an in-process `Map`. The limiter *is* correctly
wired into all three public write endpoints (`customer-requests` 5/h,
`vendors` 3/h, `feedback` 10/h), but on Vercel each lambda keeps its own Map and
cold starts discard it. The effective limit is therefore "3 per hour *per warm
instance*" on endpoints that send real email on every accepted call.

### P3 — smaller items

- Three ad-hoc `migrate-prod-*.ts` scripts, one per schema change, is how
  `Service.isCatchAll` reached production missing.
- `src/middleware.ts` uses a file convention Next 16 deprecates; it warns on
  every build. `SESSION_HANDOFF.md:12` already refers to `src/proxy.ts`.
- `npm run db:schema-sql:check` exists (`package.json:18`) but nothing invokes
  it, so `prisma/schema.sql` can silently go stale against `schema.prisma`.
- There is no CI at all — `.github/` does not exist.

---

## 3. Local fixes, in order

Do these on a branch. Each is independently shippable.

### Step 1 — P1-b: take the drift check off the deploy path

`vercel.json`:

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "buildCommand": "npm run build",
  "installCommand": "npm ci --include=dev"
}
```

Keep `installCommand` — `prisma generate` needs the Prisma CLI, which is a
devDependency.

Add a scheduled workflow. Create `.github/workflows/schema-drift.yml`:

```yaml
name: schema-drift

on:
  schedule:
    - cron: "17 6 * * *"   # daily, off the hour to avoid the scheduler rush
  workflow_dispatch:

jobs:
  drift:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
      - run: npm ci --include=dev
      - run: npm run db:check-drift:required
        env:
          TURSO_DATABASE_URL: ${{ secrets.TURSO_DATABASE_URL }}
          TURSO_AUTH_TOKEN: ${{ secrets.TURSO_AUTH_TOKEN }}
```

Both secrets must be added under **Settings → Secrets and variables → Actions**
in the GitHub repository. The script already prefers `TURSO_DATABASE_URL` /
`TURSO_AUTH_TOKEN`, so no code change is needed.

The script exits non-zero on drift, which fails the step, the job, and the
workflow run. To be notified rather than having to check the Actions tab,
add a notification step after it — for example a Slack or email action
configured on the repository's `workflow_run` trigger, or a
`notifyOnFailure: true` equivalent. The value here is the alert, since this no
longer blocks a deploy.

### Step 2 — P1-a: make `db.ts` fail loudly in production

`src/lib/db.ts`, at the top of `createDb()`:

```ts
function createDb() {
  const url = process.env.DATABASE_URL;

  if (process.env.NODE_ENV === "production" && !url?.startsWith("libsql")) {
    throw new Error(
      "DATABASE_URL must be a libsql:// URL in production. Refusing to fall " +
      "back to a local SQLite file, which would serve an empty database.",
    );
  }

  // ...existing branch unchanged
}
```

Also apply the same rule in `scripts/assert-local-db.ts` so the scripts and the
app can never disagree about what counts as a production target. Extract the
predicate rather than duplicating the string test in five places.

### Step 3 — P3: rename middleware to proxy

`git mv src/middleware.ts src/proxy.ts`. No content change required. Confirm the
build warning is gone.

### Step 4 — P3: consolidate prod migrations into one runner

One numbered SQL migration per change, plus an applied-migrations table, applied
in order and safe to re-run. This replaces the three per-change scripts and
makes `db:check-drift` close to redundant. It is also a prerequisite for Step 5,
because that step converts live data.

### Step 5 — P2-a: store money as integer cents

Convert `Project.estimatedValue`, `Project.finalValue`, `Payment.amount` to
integer minor units in the datamodel, and write an idempotent migration that
converts existing values with `ROUND(x * 100)`. Update the admin UI and any
tests that format currency.

Do this after Step 4, and verify the converted prod totals against a known-good
export before declaring success.

### Step 6 — P2-b: shared rate-limit store

Keep the `hit()` signature so no call site changes. Back it with a Turso counter
table keyed by `scope:ip` using `INSERT ... ON CONFLICT DO UPDATE` (valid
SQLite).

Caveat to accept explicitly: this turns every rate-limit check into a Turso
*write*, adding latency to the public write endpoints and consuming write
throughput. If that trade is unacceptable, Upstash Redis is the cleaner
hot-path answer — the one place where adding a second vendor is justified.

### Step 7 — P3: wire up the checks that already exist

Add `npm run db:schema-sql:check` and `npm run lint && npm test` to the same
workflow, so `schema.sql` cannot drift from `schema.prisma` unnoticed.

---

## 4. Vercel configuration

Apply this **after** Steps 1 and 2 are merged and deployed once.

### 4.1 Environment variables

In **Project → Settings → Environment Variables**, set these against
**Production** only:

| Variable | Value | Notes |
|---|---|---|
| `DATABASE_URL` | `libsql://<db>.turso.io` | Must be `libsql://`. Never `file:` — see 4.3. |
| `DATABASE_AUTH_TOKEN` | Turso auth token | |
| `AUTH_SECRET` | `openssl rand -base64 32` | NextAuth v5 JWT signing. |
| `AUTH_COOKIE_DOMAIN` | `.alshowuhow.com` | Leading dot. Required — see 4.4. |
| `NEXTAUTH_URL` | `https://alshowuhow.com` | Used for links inside emails. |
| `RESEND_API_KEY` | Resend send-only key | |
| `EMAIL_FROM` | `ALshowUhow <no-reply@alshowuhow.com>` | Domain must be verified in Resend. |
| `ADMIN_NOTIFY_EMAIL` | `nyc.aljoseph@gmail.com` | |

Do **not** set: `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`,
`SEED_ADMIN_PASSWORD`, `SEED_ADMIN_EMAILS`, `SEED_ADMIN_EMAIL`,
`SEED_VENDOR_PASSWORD`, `SEED_VENDOR_DEMO`, `DEMO_PASSWORDS`. These are
local-script-only and several are credentials.

`AUTH_TRUST_HOST` is redundant — `src/lib/auth.ts:64` hardcodes
`trustHost: true`. Harmless to set; it has no effect.

### 4.2 Preview deployments

Set the two database variables for **Preview** only after pointing them at a
separate database (a Turso branch or a scratch database). Do not leave Preview
pointed at production. With Step 1 done, preview builds no longer touch the
database at all, so this is about protecting data rather than about the build.

The remaining non-secret variables (`AUTH_SECRET`, `NEXTAUTH_URL`,
`RESEND_API_KEY`, `EMAIL_FROM`) should be set for Preview as well, using a
separate `AUTH_SECRET` so preview sessions cannot be forged into production.

### 4.3 The one thing to double-check

Vercel does not support marking a variable "runtime only, not available during
build." A variable set on Production is injected into both build and runtime.
Step 1 removes the build's *need* for the token; it does not remove the token
from the build environment. Treat this as a Vercel platform limitation, not
something the plan can fix.

What Step 1 does buy: preview builds stop hitting production, and the deploy no
longer fails when Turso is unreachable.

### 4.4 Why `AUTH_COOKIE_DOMAIN` is required

`admin.alshowuhow.com` is a separate host from `alshowuhow.com`. Cookies are
host-only by default, so without an explicit domain the admin console is never
authenticated and sign-out appears flaky. `SESSION_HANDOFF.md:74` already flags
this.

### 4.5 Region alignment

Turso is in `aws-us-east-1`. Confirm the Vercel project's region matches,
otherwise every cold-start query is a cross-region round-trip. Set the Vercel
region under **Project → Settings → Functions → Function Regions**.

### 4.6 Build configuration

Leave `vercel.json` as written in Step 1. The Vercel-integrated Prisma
Postgres/SQLite settings are not applicable — the Prisma CLI is invoked directly
from `package.json`, so Vercel's "Postgres" database and Prisma build hooks are
not used here.

---

## 5. Post-deploy verification

Run in this order. Each step should pass before moving on.

1. `curl -s https://alshowuhow.com/api/services` — returns real service data.
   An empty array means the fallback fired; check `DATABASE_URL`.
2. Submit a customer request through the UI; confirm the row appears in the
   admin dashboard.
3. Confirm the confirmation email arrives, and that its "Sign in" link resolves
   (this validates `NEXTAUTH_URL`).
4. Register a vendor; confirm the admin notification email arrives (validates
   `ADMIN_NOTIFY_EMAIL`).
5. Sign in at `admin.alshowuhow.com`, navigate to several pages, sign out.
   Confirms `AUTH_SECRET` and `AUTH_COOKIE_DOMAIN`.
6. Push a throwaway commit to `main`; confirm the build succeeds and confirm
   from the build log that no database connection was attempted.
7. Trigger the `schema-drift` workflow manually via **Actions → schema-drift →
   Run workflow**. It should report every column present.

---

## 6. Runbook: changing the schema

Because Prisma Migrate does not support Turso, this is the supported flow:

1. Edit `prisma/schema.prisma`.
2. `npx prisma migrate dev --name <change>` — generates
   `prisma/migrations/<timestamp>_<change>/migration.sql` against local SQLite.
3. Add the matching idempotent migration to the consolidated runner (Step 4) and
   commit both.
4. `npm run db:schema-sql` then `npm run db:schema-sql:check` — regenerate and
   verify `prisma/schema.sql`.
5. Run the migration against production.
6. `npm run db:check-drift:required` — must report every column present.
7. Deploy.

### Never do these against production

- `npm run db:push-turso` — it executes `schema.sql`, which is
  `CREATE TABLE IF NOT EXISTS` only. Against an existing database every
  statement is a silent no-op and the script still reports success. It is for
  bootstrapping an empty database only.
- `npm run db:reset` — destructive. `assert-local-db.ts` should block it; treat
  that block as a hard requirement, not a formality. Production contains real
  data.

---

## 7. Deferred, with rationale

- **Native enums** for `role`, `status`, `urgency`. Currently `String` with
  defaults, validated only at the application layer. Worth doing eventually,
  but it touches TypeScript types throughout and is not blocking.
- **`@upstash/ratelimit`** if Step 6's Turso counter proves too slow.
- **Turso embedded replicas.** Not useful for Vercel serverless, where there is
  no long-lived host to hold a replica file.