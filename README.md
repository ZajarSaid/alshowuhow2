# ALshowUhow

Marketplace connecting homeowners with local service vendors. Customers submit a
request, vendors are matched automatically by service and ZIP code.

**Stack:** Next.js 16 (App Router) · NextAuth v5 · Prisma 7 with the libSQL driver
adapter · Turso (hosted SQLite) · Tailwind v4 · Resend for transactional email.

---

## Local development

```bash
npm ci
cp .env.example .env     # then fill in what you need
npm run db:reset         # create dev.db, apply migrations, seed demo data
npm run dev              # http://localhost:3000
```

Requires Node 22+ (`.nvmrc` pins the major; `engines.node` enforces it).

`.env.example` documents every variable the app reads. Out of the box only
`DATABASE_URL="file:./dev.db"` is needed — everything else is optional until you
touch auth or email.

### Useful scripts

| Command | What it does |
|---|---|
| `npm run dev` | Dev server |
| `npm run build` | `prisma generate` + `next build` |
| `npm run lint` | ESLint |
| `npm test` | Vitest unit/API suite |
| `npm run test:e2e` | Cypress against a running dev server |
| `npm run db:reset` | Drop, re-migrate and reseed `dev.db` (destructive, local only) |
| `npm run db:studio` | Prisma Studio |
| `npm run db:check-drift` | Verify the live database matches `schema.prisma` |
| `npm run db:schema-sql` | Regenerate `prisma/schema.sql` from the datamodel |

---

## Deploying to Vercel

The app deploys from git: push to `main` and Vercel builds it. `vercel.json` pins
the build command and the function region.

### 1. Environment variables

Set these in **Project → Settings → Environment Variables**. `.env.example` lists
all of them with notes on which are seed-only or script-only and must never be set
in production.

Required in **Production**:

| Variable | Notes |
|---|---|
| `DATABASE_URL` | Turso `libsql://…` URL. **Never `file:`** — see below. |
| `DATABASE_AUTH_TOKEN` | Turso auth token |
| `AUTH_SECRET` | `openssl rand -base64 32` |
| `AUTH_COOKIE_DOMAIN` | `.alshowuhow.com` — leading dot required |
| `NEXTAUTH_URL` | `https://alshowuhow.com` (used in email links) |
| `RESEND_API_KEY` | Send-only key |
| `EMAIL_FROM` | Domain must be verified in Resend |
| `ADMIN_NOTIFY_EMAIL` | Where admin alerts go |

Do **not** set: `SEED_*`, `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`. Several are
credentials and the seed ones are destructive.

### 2. Preview deployments need a database too

Vercel sets `VERCEL=1` on preview builds, and the app refuses to fall back to a
local SQLite file when that is set. **A preview without `DATABASE_URL` fails the
build** rather than deploying an empty site.

So set `DATABASE_URL` and `DATABASE_AUTH_TOKEN` for Preview as well, pointing at a
scratch database or a Turso branch — not at production. Give Preview its own
`AUTH_SECRET` too, so a preview session cannot be forged into production.

### 3. Why a missing `DATABASE_URL` fails loudly

`src/lib/db-url.ts` is the single source of truth for "is this a remote database?".
In production on an ephemeral filesystem it throws instead of falling back to
`file:./dev.db`. Without that guard a mistyped variable produced a **green deploy
serving an empty database**, with nothing in the logs to explain it. Failing the
build is the intended outcome.

### 4. Region

Turso runs in `aws-us-east-1`, which is Vercel's `iad1`. `vercel.json` pins
`regions: ["iad1"]` so functions run next to the database instead of crossing a
region on every cold-start query.

### 5. The build never touches the database

`prisma generate` does not need a datasource, and every route is dynamic, so
`next build` runs no queries. The production schema-drift check used to run inside
the Vercel build command, which meant a Turso outage blocked all deploys and every
pull request preview queried production. It now runs daily from
`.github/workflows/schema-drift.yml` instead.

That workflow needs `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN` as repository
secrets under **Settings → Secrets and variables → Actions**.

---

## Changing the database schema

Prisma Migrate does not support Turso, so the flow is: generate the migration
locally against SQLite, then apply the SQL to Turso by hand.

```bash
# 1. Edit prisma/schema.prisma
npx prisma migrate dev --name <change>    # writes prisma/migrations/…

# 2. Regenerate and verify the schema dump
npm run db:schema-sql
npm run db:schema-sql:check

# 3. Apply to production (see scripts/migrate-prod-*.ts)
npm run db:check-drift:required           # must report every column present

# 4. Deploy
```

### Never run these against production

- `npm run db:push-turso` — executes `schema.sql`, which is `CREATE TABLE IF NOT
  EXISTS` only. Against an existing database every statement is a silent no-op and
  it still reports success. Bootstrap for an empty database only.
- `npm run db:reset` — destructive. `scripts/assert-local-db.ts` blocks it against
  a remote URL; treat that block as a hard requirement.

---

## Testing

```bash
npm test          # Vitest: unit + API route tests
npm run lint
npm run test:e2e  # Cypress, starts a dev server automatically
```

`tests/api/seed-guard.test.ts` asserts that the seed and destructive-command
scripts refuse to run against a remote database. If you add a script that writes,
add a case there.
