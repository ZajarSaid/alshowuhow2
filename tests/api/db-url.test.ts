import { describe, it, expect } from "vitest";
import { assertProductionDatabaseUrl, isRemoteDatabaseUrl } from "@/lib/db-url";

describe("isRemoteDatabaseUrl", () => {
  it("treats both Turso URL schemes as remote", () => {
    expect(isRemoteDatabaseUrl("libsql://db.turso.io")).toBe(true);
    expect(isRemoteDatabaseUrl("https://db.turso.io")).toBe(true);
  });

  it("treats a local file and an unset value as local", () => {
    expect(isRemoteDatabaseUrl("file:./dev.db")).toBe(false);
    expect(isRemoteDatabaseUrl(undefined)).toBe(false);
    expect(isRemoteDatabaseUrl("")).toBe(false);
  });
});

describe("assertProductionDatabaseUrl", () => {
  // This is the guard added after noticing that a missing or mistyped
  // DATABASE_URL deployed successfully against Vercel's ephemeral filesystem
  // and then served an empty database with nothing in the logs.
  const vercel = { nodeEnv: "production", ephemeralFilesystem: true };

  it("throws when serving on an ephemeral filesystem without a Turso URL", () => {
    expect(() => assertProductionDatabaseUrl("file:./dev.db", vercel)).toThrow(/DATABASE_URL/);
    expect(() => assertProductionDatabaseUrl(undefined, vercel)).toThrow(/DATABASE_URL/);
  });

  it("accepts a Turso URL on an ephemeral filesystem", () => {
    expect(() => assertProductionDatabaseUrl("libsql://db.turso.io", vercel)).not.toThrow();
    expect(() => assertProductionDatabaseUrl("https://db.turso.io", vercel)).not.toThrow();
  });

  it("does not restrict development", () => {
    expect(() =>
      assertProductionDatabaseUrl("file:./dev.db", {
        nodeEnv: "development",
        ephemeralFilesystem: true,
      }),
    ).not.toThrow();
  });

  // `next build` imports every route module with NODE_ENV=production, so an
  // unscoped guard broke local builds against dev.db.
  it("does not restrict production builds on a persistent filesystem", () => {
    expect(() =>
      assertProductionDatabaseUrl("file:./dev.db", {
        nodeEnv: "production",
        ephemeralFilesystem: false,
      }),
    ).not.toThrow();
  });

  it("does not leak a credential into the error message", () => {
    let message = "";
    try {
      assertProductionDatabaseUrl("file:./dev.db?authToken=sup3r-s3cret", vercel);
    } catch (err) {
      message = (err as Error).message;
    }
    expect(message).not.toContain("sup3r-s3cret");
  });
});