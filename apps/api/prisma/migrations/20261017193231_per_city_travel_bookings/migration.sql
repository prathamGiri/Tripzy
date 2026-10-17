-- CreateTable
CREATE TABLE "Booking" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tripId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "origin" TEXT NOT NULL DEFAULT '',
    "optionId" TEXT,
    "snapshot" TEXT NOT NULL,
    "reference" TEXT,
    "link" TEXT,
    "bookedById" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Booking_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Booking_bookedById_fkey" FOREIGN KEY ("bookedById") REFERENCES "Member" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_GenerationJob" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tripId" TEXT NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'generate',
    "status" TEXT NOT NULL,
    "stage" TEXT NOT NULL,
    "error" TEXT,
    "planId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "GenerationJob_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_GenerationJob" ("createdAt", "error", "id", "planId", "stage", "status", "tripId", "updatedAt") SELECT "createdAt", "error", "id", "planId", "stage", "status", "tripId", "updatedAt" FROM "GenerationJob";
DROP TABLE "GenerationJob";
ALTER TABLE "new_GenerationJob" RENAME TO "GenerationJob";
CREATE INDEX "GenerationJob_tripId_idx" ON "GenerationJob"("tripId");
CREATE TABLE "new_Plan" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tripId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "isCurrent" BOOLEAN NOT NULL DEFAULT true,
    "source" TEXT NOT NULL,
    "document" TEXT NOT NULL,
    "stayId" TEXT NOT NULL,
    "transportId" TEXT NOT NULL DEFAULT '',
    "transportIds" TEXT NOT NULL DEFAULT '{}',
    "changes" TEXT NOT NULL DEFAULT '{}',
    "stale" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Plan_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Plan" ("createdAt", "document", "id", "isCurrent", "source", "stayId", "transportId", "tripId", "version") SELECT "createdAt", "document", "id", "isCurrent", "source", "stayId", "transportId", "tripId", "version" FROM "Plan";
DROP TABLE "Plan";
ALTER TABLE "new_Plan" RENAME TO "Plan";
CREATE INDEX "Plan_tripId_isCurrent_idx" ON "Plan"("tripId", "isCurrent");
CREATE TABLE "new_Swap" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "planId" TEXT NOT NULL,
    "slotId" TEXT NOT NULL,
    "altId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Swap_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Swap_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Swap" ("altId", "id", "memberId", "planId", "slotId") SELECT "altId", "id", "memberId", "planId", "slotId" FROM "Swap";
DROP TABLE "Swap";
ALTER TABLE "new_Swap" RENAME TO "Swap";
CREATE UNIQUE INDEX "Swap_planId_slotId_key" ON "Swap"("planId", "slotId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "Booking_tripId_kind_origin_key" ON "Booking"("tripId", "kind", "origin");
