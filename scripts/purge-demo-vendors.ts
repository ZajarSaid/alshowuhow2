// Finds vendor accounts whose password is a known demo password, so they can be
// neutralised or removed. The demo password "vendor123" was a hardcoded fallback
// in prisma/seed.ts and is present in git history, so any production vendor still
// using it has a publicly known password and should not be left as-is.
//
// Password hashes are salted, so matching cannot be done in SQL: every candidate
// vendor has to be loaded and compared with bcrypt.
//
// Modes (default is --report, which changes nothing):
//   --report             list password matches and what would be lost. Read-only.
//   --rotate             set an unguessable random password and set status
//                        SUSPENDED. The vendor can no longer log in, but their
//                        leads, projects and payments are preserved.
//   --delete             remove the User row of each PASSWORD MATCH, which
//                        cascades to the Vendor and its VendorService /
//   --delete-all-vendors VendorServiceArea rows. Note Lead.vendorId is
//                        ON DELETE SET NULL, so leads are orphaned rather than
//                        deleted, and any Project/Payment on them survives.
//                        Removes EVERY vendor account regardless of password.
//                        For demo/vendor data that is known to be disposable.
//
// Admin accounts can never be affected by any mode: this script only selects
// from "Vendor", and no ADMIN user owns a Vendor row. The admin count is
// re-checked after every run as a hard guard.
//
// Usage:
//   Local (dev.db):  npm run vendor:purge-demo
//   Production:      TURSO_DATABASE_URL="libsql://..." TURSO_AUTH_TOKEN="..." \
//                    npm run vendor:purge-demo -- --rotate
//
// Override the passwords searched for with DEMO_PASSWORDS="vendor123,other123".

import { PrismaClient } from "@prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import { writeFileSync } from "fs";
import path from "path";
import "dotenv/config";

const DEMO_PASSWORDS = (process.env.DEMO_PASSWORDS ?? "vendor123")
  .split(",")
  .map((p) => p.trim())
  .filter(Boolean);

function createDb() {
  const url = process.env.TURSO_DATABASE_URL || process.env.DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN || process.env.DATABASE_AUTH_TOKEN;

  if (url && url.startsWith("libsql")) {
    return new PrismaClient({ adapter: new PrismaLibSql({ url, authToken }) });
  }
  const localFile =
    url && url.startsWith("file:")
      ? url.slice("file:".length)
      : path.join(process.cwd(), "dev.db");
  return new PrismaClient({ adapter: new PrismaLibSql({ url: `file:${localFile}` }) });
}

const db = createDb();

type Blast = {
  vendorServices: number;
  serviceAreas: number;
  leads: number;
  projects: number;
  payments: number;
  feedback: number;
};

async function blastRadius(vendorId: string): Promise<Blast> {
  // Lead has no back-relation to Project/Payment, so count those by lead id.
  const leads = await db.lead.findMany({ where: { vendorId }, select: { id: true } });
  const leadIds = leads.map((l) => l.id);

  const [vendorServices, serviceAreas, projects, payments, feedback] = await Promise.all([
    db.vendorService.count({ where: { vendorId } }),
    db.vendorServiceArea.count({ where: { vendorId } }),
    db.project.count({ where: { leadId: { in: leadIds } } }),
    db.payment.count({ where: { leadId: { in: leadIds } } }),
    db.customerFeedback.count({
      where: { serviceRequest: { leads: { some: { vendorId } } } },
    }),
  ]);

  return { vendorServices, serviceAreas, leads: leadIds.length, projects, payments, feedback };
}

async function main() {
  const sweepOrphans = process.argv.includes("--sweep-orphans");
  const deleteAll = process.argv.includes("--delete-all-vendors");
  const mode = deleteAll
    ? "--delete-all-vendors"
    : (["--rotate", "--delete"].find((m) => process.argv.includes(m)) ?? "--report");
  const isRemote = (process.env.TURSO_DATABASE_URL ?? "").startsWith("libsql");

  // Hard guard: record admins up front so we can prove they survived.
  const adminsBefore = await db.user.findMany({
    where: { role: "ADMIN" },
    select: { id: true, email: true },
    orderBy: { email: "asc" },
  });
  const adminVendorOverlap = await db.vendor.count({
    where: { user: { role: "ADMIN" } },
  });
  if (adminVendorOverlap > 0) {
    console.error(
      `ABORT: ${adminVendorOverlap} ADMIN user(s) own a Vendor row. ` +
        "This script can no longer guarantee admins are protected.",
    );
    process.exit(1);
  }

  if (sweepOrphans) {
    // Leads whose vendor was deleted. Lead.vendorId is ON DELETE SET NULL, so
    // removing a vendor orphans its leads instead of removing them, leaving a
    // WON project and a PAID payment attached to a vendor that no longer exists.
    // This removes that debris, plus feedback for requests that have no
    // remaining leads. Requests and customers are left alone: an inbound
    // request with no vendor assigned is a legitimate state.
    const orphans = await db.lead.findMany({ where: { vendorId: null }, select: { id: true, serviceRequestId: true } });
    const orphanLeadIds = orphans.map((l) => l.id);
    const requestIds = [...new Set(orphans.map((l) => l.serviceRequestId))];

    const projects = await db.project.count({ where: { leadId: { in: orphanLeadIds } } });
    const payments = await db.payment.count({ where: { leadId: { in: orphanLeadIds } } });

    // Only drop feedback for requests that will have zero leads left afterwards.
    const doomedRequests: string[] = [];
    for (const rid of requestIds) {
      const remaining = await db.lead.count({
        where: { serviceRequestId: rid, id: { notIn: orphanLeadIds } },
      });
      if (remaining === 0) doomedRequests.push(rid);
    }
    const feedback = await db.customerFeedback.count({
      where: { serviceRequestId: { in: doomedRequests } },
    });

    console.log(`Environment: ${isRemote ? "PRODUCTION (libsql)" : "local SQLite"}`);
    console.log("Sweeping orphaned vendor debris (leads with vendorId = null):\n");
    console.log(`  leads     ${orphans.length}`);
    console.log(`  projects  ${projects}`);
    console.log(`  payments  ${payments}`);
    console.log(`  feedback  ${feedback}  (requests left with no leads at all)\n`);
    console.log("Kept: every ServiceRequest, Customer, User and Service.\n");

    if (mode === "--report") {
      console.log("Report only. Nothing was changed. Re-run with --delete to sweep.");
      return;
    }

    if (payments) await db.payment.deleteMany({ where: { leadId: { in: orphanLeadIds } } });
    if (projects) await db.project.deleteMany({ where: { leadId: { in: orphanLeadIds } } });
    if (feedback) await db.customerFeedback.deleteMany({ where: { serviceRequestId: { in: doomedRequests } } });
    if (orphanLeadIds.length) await db.lead.deleteMany({ where: { id: { in: orphanLeadIds } } });

    const left = await db.lead.count({ where: { vendorId: null } });
    const adminsAfter = await db.user.count({ where: { role: "ADMIN" } });
    console.log(`Swept. Orphan leads remaining: ${left} (expected 0). Admins: ${adminsAfter}/${adminsBefore.length}.`);
    if (left > 0 || adminsAfter !== adminsBefore.length) process.exit(1);
    return;
  }

  const vendors = await db.vendor.findMany({
    include: { user: { select: { id: true, email: true, passwordHash: true } } },
    orderBy: { businessName: "asc" },
  });

  const matches: { vendor: (typeof vendors)[number]; matched: string }[] = [];
  for (const vendor of vendors) {
    if (deleteAll) {
      matches.push({ vendor, matched: "(any - --delete-all-vendors)" });
      continue;
    }
    for (const candidate of DEMO_PASSWORDS) {
      if (await bcrypt.compare(candidate, vendor.user.passwordHash)) {
        matches.push({ vendor, matched: candidate });
        break;
      }
    }
  }

  console.log(`Environment: ${isRemote ? "PRODUCTION (libsql)" : "local SQLite"}`);
  console.log(`Vendors checked: ${vendors.length}`);
  console.log(
    deleteAll
      ? `Selected for deletion (ALL vendors, no password filter): ${matches.length}\n`
      : `Matching a demo password (${DEMO_PASSWORDS.length} candidate(s)): ${matches.length}\n`,
  );
  if (deleteAll && matches.length > 0) {
    console.log("  *** every vendor account will be removed, whatever its password ***\n");
  }

  if (matches.length === 0) {
    console.log("Nothing to do.");
    return;
  }

  if (matches.length === 0) {
    console.log("Nothing to do.");
    return;
  }

  const report: unknown[] = [];
  for (const { vendor, matched } of matches) {
    const blast = await blastRadius(vendor.id);
    report.push({
      vendorId: vendor.id,
      businessName: vendor.businessName,
      email: vendor.user.email,
      status: vendor.status,
      createdAt: vendor.createdAt,
      matchedDemoPassword: matched,
      blastRadius: blast,
    });
    console.log(`  ${vendor.businessName}  <${vendor.user.email}>  [${vendor.status}]`);
    console.log(
      `     would lose: services=${blast.vendorServices} areas=${blast.serviceAreas} ` +
        `leads=${blast.leads} projects=${blast.projects} payments=${blast.payments} feedback=${blast.feedback}`,
    );
  }

  if (mode === "--report") {
    console.log("\nReport only. Nothing was changed.");
    console.log("Re-run with --rotate to disable them while keeping their data,");
    console.log("or with --delete to remove them and everything they own.");
    return;
  }

  // Always leave a recoverable trail before touching anything.
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backup = `purge-demo-backup-${stamp}.json`;
  const backupPath = path.join(process.cwd(), backup);
  writeFileSync(
    backupPath,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        environment: isRemote ? "production" : "local",
        mode,
        demoPasswordsSearched: DEMO_PASSWORDS,
        vendors: report,
      },
      null,
      2,
    ),
  );
  console.log(`\nBackup written to ${backup} - keep this until you are satisfied.`);

  let changed = 0;
  for (const { vendor } of matches) {
    if (mode === "--rotate") {
      // A fresh random password nobody knows, plus a suspension, so the account
      // is unusable while the lead history survives.
      const random = randomBytes(32).toString("hex");
      await db.user.update({
        where: { id: vendor.user.id },
        data: { passwordHash: await bcrypt.hash(random, 10) },
      });
      await db.vendor.update({ where: { id: vendor.id }, data: { status: "SUSPENDED" } });
      console.log(`  rotated + suspended: ${vendor.businessName}`);
    } else {
      await db.user.delete({ where: { id: vendor.user.id } });
      console.log(`  deleted: ${vendor.businessName}`);
    }
    changed++;
  }

  // Prove no demo-password account survived the run.
  const remaining = await db.vendor.findMany({
    include: { user: { select: { passwordHash: true } } },
  });
  let leaks = 0;
  for (const v of remaining) {
    for (const candidate of DEMO_PASSWORDS) {
      if (await bcrypt.compare(candidate, v.user.passwordHash)) {
        console.error(`  STILL MATCHING: ${v.businessName}`);
        leaks++;
        break;
      }
    }
  }

  // Prove every admin account survived, with the same ids and emails.
  const adminsAfter = await db.user.findMany({
    where: { role: "ADMIN" },
    select: { id: true, email: true },
    orderBy: { email: "asc" },
  });
  const adminsIntact =
    adminsAfter.length === adminsBefore.length &&
    adminsBefore.every((a, i) => a.id === adminsAfter[i].id && a.email === adminsAfter[i].email);

  console.log(`\nDone (${mode}). ${changed} vendor(s) processed, ${leaks} still matching.`);
  console.log(
    `Admins preserved: ${adminsIntact ? "YES" : "NO!"} ` +
      `(${adminsAfter.length}/${adminsBefore.length}) ` +
      adminsAfter.map((a) => a.email).join(", "),
  );
  console.log(`Vendors remaining: ${remaining.length}`);

  if (!adminsIntact) {
    console.error("FATAL: the admin account set changed. Investigate immediately.");
    process.exit(1);
  }
  if (leaks > 0) process.exit(1);
}

main()
  .catch((e) => {
    console.error("purge-demo-vendors failed:", e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
