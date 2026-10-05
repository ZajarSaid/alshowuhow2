import { describe, it, expect } from "vitest";
import { execFileSync } from "child_process";
import { rmSync } from "fs";
import path from "path";

const ROOT = path.resolve(__dirname, "..", "..");
const FAKE_PROD_URL = "libsql://user:pass@fake-prod-db.turso.io?authToken=sup3r-s3cret-token";

function run(script: string, env: Record<string, string>) {
  try {
    const stdout = execFileSync("npx", ["tsx", script], {
      cwd: ROOT,
      env: { ...process.env, ...env },
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      timeout: 120_000,
    });
    return { code: 0, output: stdout };
  } catch (err) {
    const e = err as { status?: number; stdout?: string; stderr?: string };
    return { code: e.status ?? 1, output: `${e.stdout ?? ""}${e.stderr ?? ""}` };
  }
}

describe("demo data must never reach production", () => {
  it("prisma/seed.ts refuses to run against a libsql:// database", () => {
    const { code, output } = run("prisma/seed.ts", { DATABASE_URL: FAKE_PROD_URL });

    expect(code).not.toBe(0);
    expect(output).toContain("REFUSING TO SEED A PRODUCTION DATABASE");
  });

  it("never leaks the auth token when it refuses", () => {
    const { output } = run("prisma/seed.ts", { DATABASE_URL: FAKE_PROD_URL });

    expect(output).not.toContain("sup3r-s3cret-token");
    expect(output).not.toContain("user:pass");
  });

  it("does not actually delete anything when it refuses", () => {
    const { output } = run("prisma/seed.ts", { DATABASE_URL: FAKE_PROD_URL });

    expect(output).not.toContain("Seeding database...");
    expect(output).not.toContain("Seed complete!");
  });

  it("accepts the explicit --allow-prod opt-in as a distinct path", () => {
    const { code, output } = run("prisma/seed.ts", { DATABASE_URL: FAKE_PROD_URL });

    expect(output).toContain("--allow-prod");
    expect(code).toBe(1);
  });

  it("allows seeding a local SQLite database", () => {
    // A scratch file, never ./dev.db: seeding is destructive, and this suite
    // must not overwrite the developer's local data.
    const scratch = path.join(ROOT, "dev.db.seed-guard-scratch");

    // A brand-new SQLite file has no tables, so give the scratch database the
    // same schema the real one has before seeding into it.
    execFileSync("npx", ["prisma", "migrate", "deploy"], {
      cwd: ROOT,
      env: { ...process.env, DATABASE_URL: `file:${scratch}` },
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      timeout: 180_000,
    });

    const { code, output } = run("prisma/seed.ts", {
      DATABASE_URL: `file:${scratch}`,
      SEED_ADMIN_PASSWORD: "test-admin-pw",
      SEED_VENDOR_PASSWORD: "test-vendor-pw",
    });
    rmSync(scratch, { force: true });
    rmSync(`${scratch}-journal`, { force: true });
    rmSync(`${scratch}-wal`, { force: true });
    rmSync(`${scratch}-shm`, { force: true });

    expect(code).toBe(0);
    expect(output).toContain("Seed complete!");
  });

  it("scripts/assert-local-db.ts blocks destructive commands on a remote database", () => {
    const { code, output } = run("scripts/assert-local-db.ts", {
      DATABASE_URL: "libsql://fake-prod-db.turso.io?authToken=sup3r-s3cret-token",
    });

    expect(code).not.toBe(0);
    expect(output).toContain("REFUSING TO RUN A DESTRUCTIVE DATABASE COMMAND");
    expect(output).not.toContain("sup3r-s3cret-token");
  });

  it("scripts/assert-local-db.ts allows a local SQLite database", () => {
    const { code } = run("scripts/assert-local-db.ts", { DATABASE_URL: "file:./dev.db" });

    expect(code).toBe(0);
  });

  it("the local dev database is gitignored so it can never be committed to prod", () => {
    const out = execFileSync("git", ["check-ignore", "dev.db"], { cwd: ROOT, encoding: "utf8" });

    expect(out.trim()).toContain("dev.db");
  });
});
