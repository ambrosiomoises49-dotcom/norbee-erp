-- CreateEnum
CREATE TYPE "EventPriority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "EventStatus" AS ENUM ('PENDING', 'DONE', 'CANCELLED');

-- CreateEnum
CREATE TYPE "EventType" AS ENUM ('PURCHASE', 'SALARY', 'TRANSFER', 'COST', 'MEETING', 'MAINTENANCE', 'OTHER');

-- CreateTable
CREATE TABLE "Event" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "cantinaId" TEXT,
    "title" TEXT NOT NULL,
    "type" "EventType" NOT NULL,
    "description" TEXT,
    "eventDate" TIMESTAMP(3) NOT NULL,
    "priority" "EventPriority" NOT NULL DEFAULT 'NORMAL',
    "status" "EventStatus" NOT NULL DEFAULT 'PENDING',
    "reminder24Sent" BOOLEAN NOT NULL DEFAULT false,
    "reminder2Sent" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Event_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Event_companyId_idx" ON "Event"("companyId");

-- CreateIndex
CREATE INDEX "Event_eventDate_idx" ON "Event"("eventDate");

-- CreateIndex
CREATE INDEX "Event_status_idx" ON "Event"("status");

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_cantinaId_fkey" FOREIGN KEY ("cantinaId") REFERENCES "Cantina"("id") ON DELETE SET NULL ON UPDATE CASCADE;
