// Single source of truth for turning a Turso auth token from the environment into
// something the client can actually use.
//
// Why this exists
// ---------------
// A Turso auth token is a JWT, and Turso rejects a malformed one at the HTTP
// layer with:
//
//   HTTP 400 {"error":"JWT error: Base64 error: Invalid symbol 32, offset 0."}
//
// Symbol 32 is ASCII space. A token pasted with one leading space - which is what
// copying out of a terminal, a dashboard or a chat window gives you - produces
// exactly that, and offset 0 means it is the very first character.
//
// The failure is close to undiagnosable. @libsql/client discards the response body
// and rethrows it as `LibsqlError: SERVER_ERROR: Server returned HTTP status 400`,
// so a stray space is indistinguishable from a wrong database, a wrong region or
// invalid SQL. A `SELECT 1` fails the same way, which is what made it look like a
// broken client rather than a dirty credential.
//
// This matters in production as much as on a laptop. DATABASE_AUTH_TOKEN is pasted
// into Vercel's environment-variable table by hand, and a leading space there
// would fail every query at runtime with the same opaque 400 and nothing in the
// logs to explain it.

/**
 * A JWT is three dot-separated base64url segments. Nothing else is a valid
 * Turso token, so anything else is a paste or copy-paste accident worth failing
 * on before it reaches the network.
 */
const JWT_SHAPE = /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/;

/**
 * Normalise a raw token and reject anything that cannot be one.
 *
 * Trims surrounding whitespace and unwraps a single layer of matching quotes,
 * both of which are paste artifacts: a JWT never legitimately begins or ends with
 * either. Returns `undefined` when no token was supplied, which is the normal
 * case for a local `file:` database.
 *
 * @param variableName Used in the error message so the caller knows which
 *   environment variable to fix. The token itself is never included.
 * @throws if a token was supplied but cannot be a JWT.
 */
export function cleanAuthToken(
  token: string | undefined,
  variableName = "TURSO_AUTH_TOKEN",
): string | undefined {
  if (token === undefined) return undefined;

  // `[\s\S]` rather than the `s` flag: this project targets ES2017, and `s` is
  // ES2018. Already trimmed above, so the only reason to span newlines here is a
  // quoted value copied with an embedded line break.
  const cleaned = token.trim().replace(/^(['"])([\s\S]*)\1$/, "$2").trim();
  if (cleaned === "") return undefined;

  if (!JWT_SHAPE.test(cleaned)) {
    // Say what is wrong without echoing the secret. The Turso error for this
    // names a byte offset and a symbol number, which is no help at all.
    const problems: string[] = [];
    if (token !== token.trim()) problems.push("surrounding whitespace");
    if (/^['"]/.test(token.trim())) problems.push("wrapping quotes");
    if (cleaned.split(".").length !== 3) {
      problems.push(`${cleaned.split(".").length} dot-separated segments, expected 3`);
    }

    throw new Error(
      `${variableName} does not look like a Turso auth token` +
        (problems.length ? ` (${problems.join("; ")})` : "") +
        ".\nA Turso token is a JWT: three base64url segments separated by dots. " +
        "Minted with `turso db tokens create --database <db-name>`. " +
        "Strip any whitespace or quotes, which are almost always the cause. " +
        "The token is not included in this message.",
    );
  }

  return cleaned;
}
