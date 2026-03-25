-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_EventType" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slug" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "gearId" TEXT NOT NULL,
    "messageType" TEXT NOT NULL,
    "ccNumber" INTEGER,
    "ccValue" INTEGER,
    "valueOffset" INTEGER,
    "instrumentOffset" INTEGER,
    "hasParameter" BOOLEAN NOT NULL DEFAULT false,
    "onSectionChange" BOOLEAN NOT NULL DEFAULT false,
    "onSongEnd" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "EventType_gearId_fkey" FOREIGN KEY ("gearId") REFERENCES "Gear" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_EventType" ("ccNumber", "ccValue", "createdAt", "gearId", "hasParameter", "id", "instrumentOffset", "label", "messageType", "slug", "updatedAt", "valueOffset") SELECT "ccNumber", "ccValue", "createdAt", "gearId", "hasParameter", "id", "instrumentOffset", "label", "messageType", "slug", "updatedAt", "valueOffset" FROM "EventType";
DROP TABLE "EventType";
ALTER TABLE "new_EventType" RENAME TO "EventType";
CREATE UNIQUE INDEX "EventType_slug_key" ON "EventType"("slug");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
