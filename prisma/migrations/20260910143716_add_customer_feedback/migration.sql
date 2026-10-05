-- CreateTable
CREATE TABLE "CustomerFeedback" (
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

-- CreateIndex
CREATE UNIQUE INDEX "CustomerFeedback_serviceRequestId_key" ON "CustomerFeedback"("serviceRequestId");
