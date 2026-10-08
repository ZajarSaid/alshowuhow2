import { describe, it, expect } from "vitest";
import { cleanAuthToken } from "@/lib/db-credentials";

// Three real-shaped but entirely fake JWTs, used only for shape checks.
const JWT = "eyJhbGciOiJIUzI1NiJ9.eyJleHAiOjE3MDAwMDAwMDB9.c2lnbmF0dXJlLXBsYWNlaG9sZGVy";

describe("cleanAuthToken", () => {
  // The bug this exists for: a leading space made Turso answer
  // `400 JWT error: Base64 error: Invalid symbol 32, offset 0.`
  it("strips a leading space", () => {
    expect(cleanAuthToken(` ${JWT}`)).toBe(JWT);
  });

  it("strips trailing whitespace and newlines", () => {
    expect(cleanAuthToken(`${JWT}\n`)).toBe(JWT);
    expect(cleanAuthToken(`  ${JWT}  `)).toBe(JWT);
    expect(cleanAuthToken(`${JWT}\r\n`)).toBe(JWT);
  });

  it("unwraps quotes left behind by copying out of a shell or .env line", () => {
    expect(cleanAuthToken(`"${JWT}"`)).toBe(JWT);
    expect(cleanAuthToken(`'${JWT}'`)).toBe(JWT);
  });

  it("handles the combination that actually occurred", () => {
    expect(cleanAuthToken(`  "${JWT}"  `)).toBe(JWT);
  });

  it("leaves a clean token untouched", () => {
    expect(cleanAuthToken(JWT)).toBe(JWT);
  });

  it("treats an absent or empty token as absent", () => {
    // A local `file:` database has no token, so this must not throw.
    expect(cleanAuthToken(undefined)).toBeUndefined();
    expect(cleanAuthToken("")).toBeUndefined();
    expect(cleanAuthToken("   ")).toBeUndefined();
  });

  it("rejects a truncated or otherwise malformed token", () => {
    expect(() => cleanAuthToken("eyJhbGciOiJIUzI1NiJ9")).toThrow(/does not look like/);
    expect(() => cleanAuthToken("not-a-jwt")).toThrow(/does not look like/);
    expect(() => cleanAuthToken("a.b.c.d")).toThrow(/4 dot-separated segments/);
  });

  it("names the variable so the caller knows what to fix", () => {
    expect(() => cleanAuthToken("nope", "DATABASE_AUTH_TOKEN")).toThrow(
      /DATABASE_AUTH_TOKEN/,
    );
  });

  it("does not leak the credential into the error message", () => {
    let message = "";
    try {
      cleanAuthToken("sup3r-s3cret-with spaces", "TURSO_AUTH_TOKEN");
    } catch (err) {
      message = (err as Error).message;
    }
    expect(message).not.toContain("sup3r-s3cret");
  });
});
