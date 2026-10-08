import "dotenv/config";
import { createClient } from "@libsql/client";
import { cleanAuthToken } from "../src/lib/db-credentials";

const url = process.env.TURSO_DATABASE_URL;
const authToken = cleanAuthToken(process.env.TURSO_AUTH_TOKEN);

if (!url || !url.startsWith("libsql")) {
  console.error("Set TURSO_DATABASE_URL to a libsql:// URL");
  process.exit(1);
}
if (!authToken) {
  console.error("Set TURSO_AUTH_TOKEN");
  process.exit(1);
}

const client = createClient({ url, authToken });

async function columnExists(table: string, column: string): Promise<boolean> {
  const res = await client.execute(`PRAGMA table_info("${table}")`);
  return res.rows.some((r) => r.name === column);
}

async function indexExists(name: string): Promise<boolean> {
  const res = await client.execute(
    `SELECT name FROM sqlite_master WHERE type='index' AND name=?`,
    [name],
  );
  return res.rows.length > 0;
}

async function main() {
  console.log("Connected to prod Turso:", url);

  const wanted = [
    {
      column: "featured",
      ddl: `ALTER TABLE "Service" ADD COLUMN "featured" BOOLEAN NOT NULL DEFAULT false`,
    },
    {
      column: "sortOrder",
      ddl: `ALTER TABLE "Service" ADD COLUMN "sortOrder" INTEGER NOT NULL DEFAULT 999`,
    },
    {
      column: "parentId",
      ddl: `ALTER TABLE "Service" ADD COLUMN "parentId" TEXT`,
    },
  ];

  for (const { column, ddl } of wanted) {
    if (await columnExists("Service", column)) {
      console.log(`OK  Service.${column} already exists`);
    } else {
      await client.execute(ddl);
      console.log(`ADD Service.${column}`);
    }
  }

  if (await indexExists("Service_parentId_idx")) {
    console.log("OK  Service_parentId_idx already exists");
  } else {
    await client.execute(
      `CREATE INDEX IF NOT EXISTS "Service_parentId_idx" ON "Service"("parentId")`,
    );
    console.log("ADD Service_parentId_idx");
  }

  const services = await client.execute(
    `SELECT id, name, parentId, active, featured, sortOrder FROM "Service" ORDER BY sortOrder, name`,
  );
  console.log(`\nCurrent Service rows (${services.rows.length}):`);
  for (const s of services.rows) {
    console.log(
      `  - ${String(s.name)} | parentId=${s.parentId ?? "—"} | active=${s.active} | featured=${s.featured} | sortOrder=${s.sortOrder}`,
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
