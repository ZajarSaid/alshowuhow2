-- Change the ServiceRequest column DEFAULTS to the upper-case convention used
-- by every other status column in this schema.
--
-- SQLite cannot ALTER a column default in place, so the table is rebuilt: copy
-- the rows into a new table with the new definition, drop the old one, rename.
-- The copy preserves values verbatim, so normalise the enum values afterwards -
-- a data-only UPDATE in migration 20260928000003 is not enough, because rows
-- inserted afterwards still took the old 'new' / 'normal' defaults.

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ServiceRequest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "customerId" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "zipCode" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "preferredContactMethod" TEXT NOT NULL DEFAULT 'email',
    "urgency" TEXT NOT NULL DEFAULT 'NORMAL',
    "additionalNotes" TEXT,
    "otherServiceText" TEXT,
    "status" TEXT NOT NULL DEFAULT 'NEW',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "matchedVendors" JSONB,
    CONSTRAINT "ServiceRequest_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ServiceRequest_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_ServiceRequest" ("additionalNotes", "createdAt", "customerId", "description", "id", "matchedVendors", "otherServiceText", "preferredContactMethod", "serviceId", "status", "updatedAt", "urgency", "zipCode") SELECT "additionalNotes", "createdAt", "customerId", "description", "id", "matchedVendors", "otherServiceText", "preferredContactMethod", "serviceId", "status", "updatedAt", "urgency", "zipCode" FROM "ServiceRequest";
DROP TABLE "ServiceRequest";
ALTER TABLE "new_ServiceRequest" RENAME TO "ServiceRequest";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;


-- Normalise any values that predate the rebuild.
UPDATE "ServiceRequest" SET "status" = UPPER("status") WHERE "status" <> UPPER("status");
UPDATE "ServiceRequest" SET "urgency" = UPPER("urgency") WHERE "urgency" <> UPPER("urgency");
