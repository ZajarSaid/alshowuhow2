-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;

CREATE TABLE "new_Service" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "icon" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 999,
    "parentId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Service_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Service" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

INSERT INTO "new_Service" ("id","name","description","icon","active","featured","sortOrder","createdAt","updatedAt")
SELECT "id","name","description","icon","active","featured","sortOrder","createdAt","updatedAt" FROM "Service";

DROP TABLE "Service";
ALTER TABLE "new_Service" RENAME TO "Service";

PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "Service_parentId_idx" ON "Service"("parentId");