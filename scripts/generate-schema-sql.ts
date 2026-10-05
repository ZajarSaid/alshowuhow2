// Generates prisma/schema.sql from prisma/schema.prisma so the DDL that gets
// pushed to production can never drift from the schema the app actually queries.
//
// Historically schema.sql was hand-edited alongside schema.prisma, and the two
// did drift (see commit 52c8fac, which added a column to schema.prisma but missed
// it in schema.sql). Because scripts/push-to-turso.ts deploys schema.sql while
// the app reads schema.prisma, that drift fails silently and only in production.
//
// Usage:
//   npx tsx scripts/generate-schema-sql.ts          # write prisma/schema.sql
//   npx tsx scripts/generate-schema-sql.ts --check  # exit 1 if it is out of date

import { execFileSync } from "child_process";
import { readFileSync, writeFileSync } from "fs";
import path from "path";

const ROOT = process.cwd();
const SCHEMA_FILE = path.join(ROOT, "prisma", "schema.prisma");
const SQL_FILE = path.join(ROOT, "prisma", "schema.sql");

// Prisma's own bookkeeping table. It is not in the datamodel (Prisma manages it),
// but a hand-provisioned production database still needs it to exist before
// `prisma migrate deploy` can record anything.
const MIGRATIONS_TABLE = `CREATE TABLE IF NOT EXISTS "_prisma_migrations" (
    "id"                    TEXT PRIMARY KEY NOT NULL,
    "checksum"              TEXT NOT NULL,
    "finished_at"           DATETIME,
    "migration_name"        TEXT NOT NULL,
    "logs"                  TEXT,
    "rolled_back_at"        DATETIME,
    "started_at"            DATETIME NOT NULL DEFAULT current_timestamp,
    "applied_steps_count"   INTEGER UNSIGNED NOT NULL DEFAULT 0
);`;

function generate() {
  const raw = execFileSync(
    "npx",
    ["prisma", "migrate", "diff", "--from-empty", "--to-schema", SCHEMA_FILE, "--script"],
    { cwd: ROOT, encoding: "utf8", maxBuffer: 32 * 1024 * 1024, stdio: ["ignore", "pipe", "inherit"] },
  );

  // Drop Prisma's `-- CreateTable` / `-- CreateIndex` annotations. Comments must
  // not sit at the start of a statement: scripts/push-to-turso.ts skips any
  // statement beginning with "--", which would silently discard the statement.
  const body = raw
    .split("\n")
    .filter((line) => !/^--/.test(line.trim()))
    .join("\n");

  // Make every statement idempotent so re-pushing to an existing database is safe.
  const idempotent = body
    .replace(/^CREATE TABLE /gm, "CREATE TABLE IF NOT EXISTS ")
    .replace(/^CREATE UNIQUE INDEX /gm, "CREATE UNIQUE INDEX IF NOT EXISTS ")
    .replace(/^CREATE INDEX /gm, "CREATE INDEX IF NOT EXISTS ")
    .trim();

  return (
    [
      "-- GENERATED FILE - DO NOT EDIT BY HAND.",
      "-- Source of truth: prisma/schema.prisma",
      "-- Regenerate: npm run db:schema-sql      (verify: npm run db:schema-sql:check)",
      "",
      MIGRATIONS_TABLE + ";",
      "",
      idempotent + ";",
      "",
    ].join("\n")
  );
}

const next = generate();
const check = process.argv.includes("--check");

if (check) {
  const current = readFileSync(SQL_FILE, "utf-8");
  if (current.trim() !== next.trim()) {
    console.error(
      "\nprisma/schema.sql is OUT OF DATE with prisma/schema.prisma.\n\n" +
        "Production is deployed from schema.sql, so shipping without regenerating it\n" +
        "means production runs a schema the app does not expect.\n\n" +
        "Fix: npm run db:schema-sql\n",
    );
    process.exit(1);
  }
  console.log("schema.sql is up to date with schema.prisma");
} else {
  writeFileSync(SQL_FILE, next);
  const count = next.split(";").filter((s) => s.trim().length > 0).length;
  console.log(`Wrote prisma/schema.sql (${count} statements) from prisma/schema.prisma`);
}
