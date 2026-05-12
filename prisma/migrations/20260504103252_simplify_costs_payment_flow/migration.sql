-- AlterTable
ALTER TABLE "CostCategory" ADD COLUMN     "costType" "CostType" NOT NULL DEFAULT 'ONE_TIME',
ADD COLUMN     "defaultAmount" DECIMAL(15,2),
ADD COLUMN     "periodicity" "CostPeriodicity" NOT NULL DEFAULT 'NONE';
