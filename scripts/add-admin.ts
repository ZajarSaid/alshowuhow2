import { PrismaClient } from "@prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import bcrypt from "bcryptjs";
import path from "node:path";
import "dotenv/config";
import { cleanAuthToken } from "../src/lib/db-credentials";

// Idempotent admin provisioning — safe to run on any environment (local SQLite
// or production Turso). It never deletes or alters non-admin data, and
// re-running simply refreshes the role, status and password hash.
//
//   Local (dev.db):        npm run admin:add
//   Production (Turso):
//     TURSO_DATABASE_URL="libsql://..." TURSO_AUTH_TOKEN="..." \
//     SEED_ADMIN_PASSWORD="..." npm run admin:add
//
// SEED_ADMIN_PASSWORD is REQUIRED. An earlier version of this script fell back
// to a hardcoded default when the variable was unset, which quietly provisioned
// administrators with a publicly known password. The same flaw had already been
// removed from prisma/seed.ts; this script missed that fix. For a deployment
// whose success criterion is "the admins can log in", a silent fallback like
// that is the worst possible failure mode, so it now aborts instead.
//
// SEED_ADMIN_EMAILS accepts a comma-separated list. Both canonical admins share
// one password, so provisioning them together guarantees they stay in sync.

function createDb() {
  const url = process.env.TURSO_DATABASE_URL || process.env.DATABASE_URL;

  if (url && url.startsWith("libsql")) {
    const adapter = new PrismaLibSql({
      url,
      authToken: cleanAuthToken(
        process.env.TURSO_AUTH_TOKEN || process.env.DATABASE_AUTH_TOKEN,
      ),
    });
    return new PrismaClient({ adapter });
  }

  const adapter = new PrismaLibSql({
    url: `file:${path.join(process.cwd(), "dev.db")}`,
  });
  return new PrismaClient({ adapter });
}

const DEFAULT_ADMINS = ["cammccain9d@gmail.com", "nyc.aljoseph@gmail.com"];

// SEED_ADMIN_EMAILS replaces the list outright when set. Otherwise both
// canonical admins are always provisioned, plus SEED_ADMIN_EMAIL if it names
// someone else. The earlier version preferred SEED_ADMIN_EMAIL, and since .env
// sets it to a single address this silently provisioned only one administrator
// while reporting success.
const explicit = process.env.SEED_ADMIN_EMAILS;
const legacy = process.env.SEED_ADMIN_EMAIL;

const parseEmails = (value: string) =>
  value
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

const TARGETS = explicit
  ? [...new Set(parseEmails(explicit))]
  : [...new Set([...DEFAULT_ADMINS, ...parseEmails(legacy ?? "")])];

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    console.error(
      `${name} is required. Refusing to provision an administrator with a ` +
        `guessable password. Set it and re-run.`,
    );
    process.exit(1);
  }
  return value;
}

const PASSWORD = requireEnv("SEED_ADMIN_PASSWORD");

const db = createDb();

async function main() {
  console.log(`Provisioning ${TARGETS.length} administrator account(s)...`);

  // One hash reused for every account, so they cannot drift apart.
  const passwordHash = await bcrypt.hash(PASSWORD, 10);

  for (const email of TARGETS) {
    const existing = await db.user.findUnique({ where: { email } });
    if (existing) {
      await db.user.update({
        where: { email },
        data: { role: "ADMIN", status: "ACTIVE", passwordHash },
      });
      console.log(`  updated  ${email}  → role=ADMIN status=ACTIVE`);
    } else {
      await db.user.create({
        data: { email, passwordHash, role: "ADMIN", status: "ACTIVE" },
      });
      console.log(`  created  ${email}  → role=ADMIN status=ACTIVE`);
    }
  }

  // Verify against the database rather than trusting the write. This proves the
  // stored hash actually accepts the supplied password, which is the thing that
  // has to be true at the end of a deployment.
  console.log("\nVerifying the stored hashes accept the supplied password...");
  const failures: string[] = [];

  for (const email of TARGETS) {
    const user = await db.user.findUnique({ where: { email } });
    if (!user) {
      failures.push(`${email}: missing`);
      continue;
    }
    if (user.role !== "ADMIN" || user.status !== "ACTIVE") {
      failures.push(`${email}: role=${user.role} status=${user.status}`);
    }
    if (!(await bcrypt.compare(PASSWORD, user.passwordHash))) {
      failures.push(`${email}: password does not match the stored hash`);
    }
  }

  const rawUrl = process.env.TURSO_DATABASE_URL || process.env.DATABASE_URL;
  const shownUrl = rawUrl?.startsWith("libsql") ? rawUrl.replace(/^.*@/, "***@") : "local dev.db";
  console.log(`Target DB: ${shownUrl}`);

  if (failures.length > 0) {
    console.error("\nFAILED verification:");
    for (const f of failures) console.error(`  - ${f}`);
    process.exit(1);
  }

  console.log(`\nOK: ${TARGETS.length} administrator(s) verified.`);
  // The password is deliberately never printed.
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
