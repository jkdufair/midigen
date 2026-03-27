-- CreateTable
CREATE TABLE "GearTemplate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "midiChannel" INTEGER NOT NULL,
    "color" TEXT,
    "eventTypes" JSONB NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
