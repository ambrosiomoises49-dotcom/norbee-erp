-- CreateEnum
CREATE TYPE "FinancialAccountType" AS ENUM ('CASH', 'BANK', 'MOBILE_MONEY', 'CARD', 'OTHER');

-- AlterTable
ALTER TABLE "FinanceTransaction" ADD COLUMN     "financialAccountId" TEXT;

-- CreateTable
CREATE TABLE "FinancialAccount" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "FinancialAccountType" NOT NULL DEFAULT 'CASH',
    "balance" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "currency" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "status" "Status" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FinancialAccount_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FinancialAccount_companyId_idx" ON "FinancialAccount"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "FinancialAccount_companyId_name_key" ON "FinancialAccount"("companyId", "name");

-- CreateIndex
CREATE INDEX "FinanceTransaction_financialAccountId_idx" ON "FinanceTransaction"("financialAccountId");

-- CreateIndex
CREATE INDEX "StockMovement_cantinaId_idx" ON "StockMovement"("cantinaId");

-- AddForeignKey
ALTER TABLE "FinanceTransaction" ADD CONSTRAINT "FinanceTransaction_financialAccountId_fkey" FOREIGN KEY ("financialAccountId") REFERENCES "FinancialAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinancialAccount" ADD CONSTRAINT "FinancialAccount_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
