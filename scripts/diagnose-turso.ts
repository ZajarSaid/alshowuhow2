// Prints what the Turso HTTP API actually says.
//
// Why this exists
// ---------------
// @libsql/client turns every non-2xx response into
// `LibsqlError: SERVER_ERROR: Server returned HTTP status 400` and discards the
// response body. That body is the only place Turso's actual complaint lives, so
// a misconfigured URL, a malformed token and a genuine SQL problem all look
// identical from the outside. This talks to the HTTP API with plain fetch, so the
// raw status and body survive.
//
// Read-only: it issues `SELECT 1` and health checks. It never writes.
//
// Usage:
//   $env:TURSO_DATABASE_URL = "libsql://<db>.<location>.turso.io"
//   $env:TURSO_AUTH_TOKEN  = "<token>"
//   npm run db:diagnose-turso

import "dotenv/config";

const rawUrl = process.env.TURSO_DATABASE_URL ?? process.env.DATABASE_URL ?? "";
const token = process.env.TURSO_AUTH_TOKEN ?? process.env.DATABASE_AUTH_TOKEN ?? "";

// @libsql/client rewrites libsql: to https: before it builds a request
// (http.js: the HTTP client supports only "libsql:", "https:" and "http:"). Do
// the same so this probe hits the identical endpoint the failing scripts hit.
const base = rawUrl.replace(/^libsql:/, "https:").replace(/\/+$/, "");

console.log("=== configuration ===");
console.log(`TURSO_DATABASE_URL : ${rawUrl || "(unset)"}`);
console.log(`derived base URL   : ${base || "(unset)"}`);
console.log(`TURSO_AUTH_TOKEN   : ${token ? `${token.length} chars` : "(unset)"}`);
if (token) {
  // A Turso token is a JWT: three dot-separated base64url segments. Dots and
  // length catch the common paste failures - stray quotes, a truncated token, or
  // an API key pasted where a JWT belongs - without printing the secret.
  console.log(`  first 8 chars    : ${token.slice(0, 8)}...`);
  console.log(`  last 4 chars     : ...${token.slice(-4)}`);
  console.log(`  segments (dots)  : ${token.split(".").length} (a JWT has 3)`);
  console.log(
    `  leading/trailing space: ${
      token !== token.trim() ? "YES - will be rejected" : "no"
    }`,
  );
  console.log(`  wrapped in quotes : ${token.startsWith('"') || token.startsWith("'") ? "YES - will be rejected" : "no"}`);
}
console.log(`URL has ?tls=0      : ${base.includes("tls=0") ? "YES - will be rejected" : "no"}`);
console.log(`URL has a path      : ${new URL(base).pathname !== "/" ? `YES (${new URL(base).pathname}) - unusual` : "no"}`);
console.log();

async function probe(
  label: string,
  url: string,
  init: RequestInit & { auth?: boolean },
): Promise<void> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (init.auth && token) headers.Authorization = `Bearer ${token}`;

  let status = 0;
  let body = "";
  try {
    const res = await fetch(url, { ...init, headers });
    status = res.status;
    body = await res.text();
  } catch (e) {
    console.log(`${label}\n  request threw: ${(e as Error).message}\n`);
    return;
  }

  console.log(label);
  console.log(`  ${url}`);
  console.log(`  -> HTTP ${status}`);
  if (body) {
    // Cap it: an HTML error page from an edge proxy is the most likely shape and
    // the first line is the part that identifies it.
    const trimmed = body.length > 600 ? `${body.slice(0, 600)}…` : body;
    console.log(
      trimmed
        .split("\n")
        .map((l) => `  | ${l}`)
        .join("\n"),
    );
  } else {
    console.log("  (empty body)");
  }
  console.log();
}

async function main() {
  if (!base) {
    console.error("Set TURSO_DATABASE_URL (or DATABASE_URL) first.");
    process.exit(2);
  }

  // 1. Does the database host exist and is it reachable at all? No auth, so a
  //    failure here is a DNS/TLS/host problem rather than a token problem.
  await probe("[1] unauthenticated health check", `${base}/health`, {
    method: "GET",
    auth: false,
  });

  // 2. The exact request shape @libsql/client sends for `SELECT 1`.
  await probe("[2] authenticated SELECT 1 via /v2/pipeline", `${base}/v2/pipeline`, {
    method: "POST",
    auth: true,
    body: JSON.stringify({
      baton: null,
      requests: [{ type: "execute", stmt: { sql: "SELECT 1" } }],
    }),
  });

  // 3. Same without the baton field, in case the server rejects that field.
  await probe("[3] authenticated SELECT 1, no baton", `${base}/v2/pipeline`, {
    method: "POST",
    auth: true,
    body: JSON.stringify({ requests: [{ type: "execute", stmt: { sql: "SELECT 1" } }] }),
  });

  // 4. Proves whether the token is accepted at all, independent of SQL. A 401 or
  //    403 here means the credential is the problem; a 400 means the server is
  //    refusing the request shape or the token's format.
  await probe("[4] authenticated empty batch (token check only)", `${base}/v2/pipeline`, {
    method: "POST",
    auth: true,
    body: JSON.stringify({ baton: null, requests: [] }),
  });

  // 5. The decisive probe. It replicates the request shape @libsql/client builds,
  //    because BOTH failures went through the hrana *stream* API rather than a
  //    plain batch:
  //
  //      execute()        -> openStream() + stream.query()      (http.js)
  //      executeMultiple()-> openStream() + stream.sequence()   (http.js)
  //
  //    so even a one-statement `SELECT 1` is sent as open_stream, execute,
  //    close_stream pipelined into a single request. If [2] succeeds and this
  //    returns 400, Turso is rejecting the stream endpoint specifically, and the
  //    fix is to talk to /v2/pipeline directly instead of via @libsql/client.
  await probe("[5] stream-shaped request (what @libsql/client actually sends)", `${base}/v2/pipeline`, {
    method: "POST",
    auth: true,
    body: JSON.stringify({
      baton: null,
      requests: [
        { type: "open_stream" },
        { type: "execute", stmt: { sql: "SELECT 1", args: [] } },
        { type: "close_stream" },
      ],
    }),
  });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
