-- CreateEnum
CREATE TYPE "CostType" AS ENUM ('ONE_TIME', 'RECURRING');

-- CreateEnum
CREATE TYPE "CostPeriodicity" AS ENUM ('NONE', 'WEEKLY', 'MONTHLY', 'QUARTERLY', 'ANNUAL');

-- AlterTable
ALTER TABLE "Cost" ADD COLUMN     "costType" "CostType" NOT NULL DEFAULT 'ONE_TIME',
ADD COLUMN     "dueDate" TIMESTAMP(3),
ADD COLUMN     "periodicity" "CostPeriodicity" NOT NULL DEFAULT 'NONE',
ADD COLUMN     "referencePeriod" TEXT;

-- CreateIndex
CREATE INDEX "Cost_costType_idx" ON "Cost"("costType");

-- CreateIndex
CREATE INDEX "Cost_periodicity_idx" ON "Cost"("periodicity");
