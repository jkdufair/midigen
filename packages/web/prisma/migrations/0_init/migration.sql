-- CreateTable
CREATE TABLE "Gear" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "midiChannel" INTEGER NOT NULL,
    "color" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "EventType" (
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
    "isTimeSignatureCarrier" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "EventType_gearId_fkey" FOREIGN KEY ("gearId") REFERENCES "Gear" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

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

-- CreateTable
CREATE TABLE "Song" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "tempo" INTEGER NOT NULL,
    "timeSignature" TEXT NOT NULL,
    "key" TEXT,
    "tuning" JSONB,
    "sections" JSONB NOT NULL,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "GlobalNote" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'global',
    "content" TEXT NOT NULL DEFAULT '',
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "Gear_name_key" ON "Gear"("name");

-- CreateIndex
CREATE UNIQUE INDEX "EventType_slug_key" ON "EventType"("slug");

