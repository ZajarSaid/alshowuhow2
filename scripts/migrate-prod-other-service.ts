import { createClient } from "@libsql/client";

// Idempotent prod (Turso) migration for the customer "Other" service:
//   1. ServiceRequest.otherServiceText — free-text when the customer picks "Other"
//   2. Service.isCatchAll — explicit catch-all flag on the "Other" category
//   3. A top-level, featured, active "Other" Service row so it shows in /request
//
// Safe to re-run: every step checks for existence first and is a no-op when
// already applied. Existing request/vendor data is never touched.

const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;

if (!url || !url.startsWith("libsql")) {
  console.error("Set TURSO_DATABASE_URL to a libsql:// URL");
  process.exit(1);
}
if (!authToken) {
  console.error("Set TURSO_AUTH_TOKEN");
  process.exit(1);
}

const client = createClient({ url, authToken });

const OTHER_SERVICE_NAME = "Other";
const OTHER_ICON = "📋";
const OTHER_DESCRIPTION = "Any service not listed above — tell us what you need";
const OTHER_SORT_ORDER = 7;

async function columnExists(table: string, column: string): Promise<boolean> {
  const res = await client.execute(`PRAGMA table_info("${table}")`);
  return res.rows.some((r) => r.name === column);
}

async function main() {
  console.log("Connected to prod Turso:", url);

  // 1. otherServiceText column
  if (await columnExists("ServiceRequest", "otherServiceText")) {
    console.log("OK  ServiceRequest.otherServiceText already exists");
  } else {
    await client.execute(
      `ALTER TABLE "ServiceRequest" ADD COLUMN "otherServiceText" TEXT`,
    );
    console.log("ADD ServiceRequest.otherServiceText");
  }

  // 2. isCatchAll flag
  if (await columnExists("Service", "isCatchAll")) {
    console.log("OK  Service.isCatchAll already exists");
  } else {
    await client.execute(`ALTER TABLE "Service" ADD COLUMN "isCatchAll" BOOLEAN NOT NULL DEFAULT false`);
    console.log("ADD Service.isCatchAll");
  }

  // 3. The "Other" category row.
  // Look for an existing top-level (parentId IS NULL) row of that name. A
  // historical orphan duplicate may already exist (inactive) — reuse it rather
  // than creating a second one, so service pickers never show "Other" twice.
  const existing = await client.execute(
    `SELECT id, name, active, featured, parentId, sortOrder
       FROM "Service"
      WHERE name = ? AND parentId IS NULL
      ORDER BY createdAt ASC`,
    [OTHER_SERVICE_NAME],
  );

  if (existing.rows.length === 0) {
    await client.execute(
      `INSERT INTO "Service" (id, name, description, icon, active, featured, sortOrder, parentId, isCatchAll, createdAt, updatedAt)
       VALUES (lower(hex(randomblob(16))), ?, ?, ?, 1, 1, ?, NULL, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      [OTHER_SERVICE_NAME, OTHER_DESCRIPTION, OTHER_ICON, OTHER_SORT_ORDER],
    );
    console.log(`ADD Service "${OTHER_SERVICE_NAME}" (featured, top-level, catch-all)`);
  } else {
    const target = existing.rows[0];
    await client.execute(
      `UPDATE "Service"
          SET active = 1, featured = 1, parentId = NULL, isCatchAll = 1,
              icon = COALESCE(icon, ?), sortOrder = ?, updatedAt = CURRENT_TIMESTAMP
        WHERE id = ?`,
      [OTHER_ICON, OTHER_SORT_ORDER, String(target.id)],
    );
    console.log(
      `OK  Service "${OTHER_SERVICE_NAME}" already exists — reactivated (id=${String(target.id)})`,
    );
  }

  // Deactivate any *extra* top-level "Other" duplicates so the picker shows one.
  const all = await client.execute(
    `SELECT id FROM "Service" WHERE name = ? AND parentId IS NULL`,
    [OTHER_SERVICE_NAME],
  );
  const keep = String(all.rows[0].id);
  for (const row of all.rows.slice(1)) {
    await client.execute(`UPDATE "Service" SET active = 0, updatedAt = CURRENT_TIMESTAMP WHERE id = ?`, [
      String(row.id),
    ]);
    console.log(`DEACTIVATE duplicate "${OTHER_SERVICE_NAME}" (${String(row.id)})`);
  }

  const services = await client.execute(
    `SELECT id, name, active, featured, sortOrder FROM "Service" WHERE parentId IS NULL ORDER BY sortOrder, name`,
  );
  console.log(`\nTop-level Service rows (${services.rows.length}):`);
  for (const s of services.rows) {
    console.log(
      `  - ${String(s.name)} | active=${s.active} | featured=${s.featured} | sortOrder=${s.sortOrder}${String(s.id) === keep ? "   <- Other (active)" : ""}`,
    );
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await client.close();
  });
