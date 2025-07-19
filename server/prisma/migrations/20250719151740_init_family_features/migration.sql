-- CreateTable
CREATE TABLE "drugs" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "combination" TEXT,
    "strength" TEXT,
    "dosageForm" TEXT,
    "manufacturer" TEXT,
    "price" DECIMAL,
    "sideEffects" TEXT,
    "alternatives" TEXT
);

-- CreateTable
CREATE TABLE "users" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "username" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "created_at" DATETIME DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME
);

-- CreateTable
CREATE TABLE "family_members" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "age" INTEGER,
    "photo" TEXT,
    "allergies" TEXT,
    "conditions" TEXT,
    "emergencyContact" TEXT,
    "emergencyPhone" TEXT,
    "role" TEXT NOT NULL DEFAULT 'member',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "family_medications" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "familyMemberId" INTEGER NOT NULL,
    "drugId" INTEGER NOT NULL,
    "dosage" TEXT,
    "frequency" TEXT,
    "startDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endDate" DATETIME,
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "cost" DECIMAL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "family_medications_familyMemberId_fkey" FOREIGN KEY ("familyMemberId") REFERENCES "family_members" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "family_medications_drugId_fkey" FOREIGN KEY ("drugId") REFERENCES "drugs" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "drugs_name_key" ON "drugs"("name");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
