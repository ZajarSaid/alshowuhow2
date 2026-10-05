// Guards destructive local-only database commands (e.g. `prisma migrate reset`)
// against accidentally running against a remote/production database.
//
// Destructive commands must never be one mistyped environment variable away from
// wiping production, so they are chained after this check in package.json.

const url = process.env.DATABASE_URL || "";

if (url.startsWith("libsql") || url.startsWith("https://")) {
  const target = url.replace(/\?.*$/, "").replace(/:\/\/[^@]*@/, "://***@");
  console.error(
    "\nREFUSING TO RUN A DESTRUCTIVE DATABASE COMMAND.\n\n" +
      `  DATABASE_URL = ${target}\n\n` +
      "This command drops and recreates the schema. It is only ever safe against\n" +
      "a local SQLite file, and it must never run against production.\n\n" +
      "To work on a local database, set DATABASE_URL to file:./dev.db (or unset\n" +
      "it) before running this command.\n",
  );
  process.exit(1);
}
