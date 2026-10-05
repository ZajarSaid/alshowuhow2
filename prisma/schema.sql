-- GENERATED FILE - DO NOT EDIT BY HAND.
-- Source of truth: prisma/schema.prisma
-- Regenerate: npm run db:schema-sql      (verify: npm run db:schema-sql:check)

CREATE TABLE IF NOT EXISTS "_prisma_migrations" (
    "id"                    TEXT PRIMARY KEY NOT NULL,
    "checksum"              TEXT NOT NULL,
    "finished_at"           DATETIME,
    "migration_name"        TEXT NOT NULL,
    "logs"                  TEXT,
    "rolled_back_at"        DATETIME,
    "started_at"            DATETIME NOT NULL DEFAULT current_timestamp,
    "applied_steps_count"   INTEGER UNSIGNED NOT NULL DEFAULT 0
);;

CREATE TABLE IF NOT EXISTS "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'CUSTOMER',
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

CREATE TABLE IF NOT EXISTS "Customer" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "preferredContact" TEXT NOT NULL DEFAULT 'email',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Customer_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "Vendor" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "businessName" TEXT NOT NULL,
    "contactName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "website" TEXT,
    "description" TEXT,
    "logo" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "licenseInformation" TEXT,
    "insuranceInformation" TEXT,
    "yearsInBusiness" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Vendor_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "Service" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "icon" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 999,
    "parentId" TEXT,
    "isCatchAll" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Service_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Service" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "VendorService" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "vendorId" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    CONSTRAINT "VendorService_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "VendorService_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "VendorServiceArea" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "vendorId" TEXT NOT NULL,
    "zipCode" TEXT NOT NULL,
    CONSTRAINT "VendorServiceArea_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "ServiceRequest" (
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

CREATE TABLE IF NOT EXISTS "File" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "requestId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileType" TEXT NOT NULL,
    "storagePath" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "File_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "ServiceRequest" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "Lead" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "serviceRequestId" TEXT NOT NULL,
    "vendorId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'NEW',
    "assignedAt" DATETIME,
    "sentAt" DATETIME,
    "contactedAt" DATETIME,
    "closedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Lead_serviceRequestId_fkey" FOREIGN KEY ("serviceRequestId") REFERENCES "ServiceRequest" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Lead_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "Project" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "leadId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "estimatedValue" REAL,
    "finalValue" REAL,
    "wonDate" DATETIME,
    "lostReason" TEXT,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Project_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "Payment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "vendorId" TEXT,
    "leadId" TEXT,
    "projectId" TEXT,
    "paymentType" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "paymentDate" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Payment_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "Notification" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "CustomerFeedback" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "serviceRequestId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "hearAbout" TEXT NOT NULL,
    "useAgain" TEXT NOT NULL,
    "recommend" TEXT NOT NULL,
    "comment" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CustomerFeedback_serviceRequestId_fkey" FOREIGN KEY ("serviceRequestId") REFERENCES "ServiceRequest" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "User_email_key" ON "User"("email");

CREATE UNIQUE INDEX IF NOT EXISTS "Customer_userId_key" ON "Customer"("userId");

CREATE UNIQUE INDEX IF NOT EXISTS "Vendor_userId_key" ON "Vendor"("userId");

CREATE INDEX IF NOT EXISTS "Service_parentId_idx" ON "Service"("parentId");

CREATE UNIQUE INDEX IF NOT EXISTS "VendorService_vendorId_serviceId_key" ON "VendorService"("vendorId", "serviceId");

CREATE UNIQUE INDEX IF NOT EXISTS "VendorServiceArea_vendorId_zipCode_key" ON "VendorServiceArea"("vendorId", "zipCode");

CREATE UNIQUE INDEX IF NOT EXISTS "Project_leadId_key" ON "Project"("leadId");

CREATE UNIQUE INDEX IF NOT EXISTS "Payment_leadId_key" ON "Payment"("leadId");

CREATE UNIQUE INDEX IF NOT EXISTS "CustomerFeedback_serviceRequestId_key" ON "CustomerFeedback"("serviceRequestId");;
