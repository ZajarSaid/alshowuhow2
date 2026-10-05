-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'CUSTOMER',
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Customer" (
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

-- CreateTable
CREATE TABLE "Vendor" (
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

-- CreateTable
CREATE TABLE "Service" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "icon" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "VendorService" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "vendorId" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    CONSTRAINT "VendorService_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "VendorService_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "VendorServiceArea" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "vendorId" TEXT NOT NULL,
    "zipCode" TEXT NOT NULL,
    CONSTRAINT "VendorServiceArea_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ServiceRequest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "customerId" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "zipCode" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "preferredContactMethod" TEXT NOT NULL DEFAULT 'email',
    "urgency" TEXT NOT NULL DEFAULT 'normal',
    "additionalNotes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'new',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ServiceRequest_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ServiceRequest_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "File" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "requestId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileType" TEXT NOT NULL,
    "storagePath" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "File_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "ServiceRequest" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Lead" (
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

-- CreateTable
CREATE TABLE "Project" (
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

-- CreateTable
CREATE TABLE "Payment" (
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

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Customer_userId_key" ON "Customer"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Vendor_userId_key" ON "Vendor"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "VendorService_vendorId_serviceId_key" ON "VendorService"("vendorId", "serviceId");

-- CreateIndex
CREATE UNIQUE INDEX "VendorServiceArea_vendorId_zipCode_key" ON "VendorServiceArea"("vendorId", "zipCode");

-- CreateIndex
CREATE UNIQUE INDEX "Project_leadId_key" ON "Project"("leadId");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_leadId_key" ON "Payment"("leadId");
