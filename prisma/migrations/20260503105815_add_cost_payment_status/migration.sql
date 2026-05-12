-- CreateEnum
CREATE TYPE "CostPaymentStatus" AS ENUM ('PENDING', 'PAID', 'CANCELLED');

-- AlterTable
ALTER TABLE "Cost" ADD COLUMN     "financialAccountId" TEXT,
ADD COLUMN     "paidAt" TIMESTAMP(3),
ADD COLUMN     "paymentStatus" "CostPaymentStatus" NOT NULL DEFAULT 'PENDING';

-- CreateIndex
CREATE INDEX "Cost_paymentStatus_idx" ON "Cost"("paymentStatus");

-- CreateIndex
CREATE INDEX "Cost_financialAccountId_idx" ON "Cost"("financialAccountId");

-- AddForeignKey
ALTER TABLE "Cost" ADD CONSTRAINT "Cost_financialAccountId_fkey" FOREIGN KEY ("financialAccountId") REFERENCES "FinancialAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;
