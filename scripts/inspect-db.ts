import "dotenv/config";
import { createClient } from "@libsql/client";
import { cleanAuthToken } from "../src/lib/db-credentials";

const url = process.env.TURSO_DATABASE_URL || process.env.DATABASE_URL;
if (!url) {
  console.error("Set TURSO_DATABASE_URL (or DATABASE_URL) to a libsql:// URL");
  process.exit(1);
}
const authToken = cleanAuthToken(
  process.env.TURSO_AUTH_TOKEN || process.env.DATABASE_AUTH_TOKEN,
);

// Read-only inventory: what tables exist and how many rows each holds.
//
// This exists because "the deployed site has no data" is ambiguous on its own. A
// zero vendor count in production is expected - demo vendors are seed-only - but
// a zero *Service* count means the push or the seed never landed. This tells the
// two apart without guessing, and without writing anything.
//
// Usage:
//   $env:TURSO_DATABASE_URL = "libsql://<db>.<location>.turso.io"
//   $env:TURSO_AUTH_TOKEN  = "<token>"
//   npm run db:inspect

const client = createClient({ url, authToken });

async function main() {
  console.log(`Target: ${url}\n`);

  const { rows } = await client.execute(
    "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name",
  );

  if (rows.length === 0) {
    console.error("This database has NO tables at all.");
    console.error("The schema was never pushed. Run: npm run db:push-turso");
    process.exit(1);
  }

  console.log(`Tables: ${rows.length}\n`);

  const summary: { table: string; count: number }[] = [];

  for (const row of rows) {
    // The table name comes from sqlite_master, not from user input, and is
    // double-quoted for the identifier.
    const table = String(row.name);
    try {
      const count = await client.execute(`SELECT COUNT(*) AS c FROM "${table}"`);
      const n = Number(count.rows[0]?.c ?? 0);
      summary.push({ table, count: n });
    } catch (e) {
      summary.push({ table, count: -1 });
      console.log(`  ${table.padEnd(22)} ERROR: ${(e as Error).message}`);
    }
  }

  console.log();
  const width = Math.max(...summary.map((s) => s.table.length));
  for (const { table, count } of summary) {
    const label = count === -1 ? "error" : String(count);
    console.log(`  ${table.padEnd(width)}  ${label.padStart(7)}`);
  }

  const empty = summary.filter((s) => s.count === 0).map((s) => s.table);
  const missing = [
    "User",
    "Customer",
    "Vendor",
    "Service",
    "VendorService",
    "VendorServiceArea",
    "ServiceRequest",
    "File",
    "Lead",
    "Project",
    "Payment",
    "Notification",
    "CustomerFeedback",
  ].filter((t) => !summary.some((s) => s.table === t));

  console.log();
  if (missing.length) {
    console.log(`MISSING TABLES (${missing.length}): ${missing.join(", ")}`);
    console.log("  The schema is incomplete. Run: npm run db:push-turso");
  } else {
    console.log("All 13 application tables exist.");
  }

  if (empty.length) {
    console.log(`\nEMPTY TABLES (${empty.length}): ${empty.join(", ")}`);
  }

  const admins = summary.find((s) => s.table === "User");
  if (admins && admins.count === 0) {
    console.log(
      "\nWARNING: the User table is empty, so nobody can sign in - not even an admin.\n" +
        "  Create one with: npm run admin:add",
    );
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => client.close());
