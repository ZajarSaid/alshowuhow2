// Single source of truth for "does this URL point at a remote database?".
//
// This rule used to be duplicated and the two copies disagreed:
// `src/lib/db.ts` tested only for `libsql`, while `scripts/assert-local-db.ts`
// tested for `libsql` or `https://`. A `https://` Turso URL is a perfectly valid
// remote target that `@prisma/adapter-libsql` handles, so that URL satisfied the
// destructive-command guard while silently falling through to the local-file
// branch in db.ts. Both now call these functions so the app and the scripts can
// never disagree about which database they are pointed at.

/**
 * Turso/libSQL is reachable over either `libsql:` or `https:`. Anything else -
 * including a `file:` URL or an unset variable - is a local database.
 */
export function isRemoteDatabaseUrl(url: string | undefined): url is string {
  if (!url) return false;
  return url.startsWith("libsql:") || url.startsWith("https://");
}

/**
 * True when the process runs on a platform whose filesystem is ephemeral, so a
 * local SQLite file written at runtime is unreachable on the next cold start.
 *
 * Scoped to Vercel because that is where the empty-database failure was
 * observed. Elsewhere a `file:` URL in production is a deliberate choice (a
 * self-hosted deployment with a mounted volume), so blocking it there would
 * break local `next build` and `next start` against dev.db for no benefit.
 */
export function hasEphemeralFilesystem(): boolean {
  return process.env.VERCEL === "1";
}

/**
 * Refuse to serve production traffic from an empty local database.
 *
 * Without this, `createDb()` fell back to `file:./dev.db` for any URL that was
 * not `libsql`. On Vercel the filesystem is ephemeral, so a missing or mistyped
 * DATABASE_URL produced a successful deploy that then served an empty database
 * with nothing in the logs to explain why.
 *
 * Note this is evaluated when the module is first imported, which happens during
 * `next build` too - so on an ephemeral platform a bad DATABASE_URL fails the
 * build instead of deploying. That is the intended outcome.
 */
export function assertProductionDatabaseUrl(
  url: string | undefined,
  options: { nodeEnv?: string; ephemeralFilesystem?: boolean } = {},
): void {
  const nodeEnv = options.nodeEnv ?? process.env.NODE_ENV;
  const ephemeral = options.ephemeralFilesystem ?? hasEphemeralFilesystem();

  if (nodeEnv === "production" && ephemeral && !isRemoteDatabaseUrl(url)) {
    throw new Error(
      "DATABASE_URL must be a libsql:// (or https://) Turso URL in production. " +
        "Refusing to fall back to a local SQLite file, which would serve an empty " +
        "database. Check the environment variables configured for this deployment.",
    );
  }
}