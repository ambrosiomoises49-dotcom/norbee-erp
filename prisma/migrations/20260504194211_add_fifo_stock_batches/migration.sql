-- CreateTable
CREATE TABLE "StockBatch" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "purchaseItemId" TEXT,
    "transferItemId" TEXT,
    "cantinaId" TEXT,
    "initialQuantity" INTEGER NOT NULL,
    "remainingQuantity" INTEGER NOT NULL,
    "unitCost" DECIMAL(15,2) NOT NULL,
    "sourceType" TEXT NOT NULL,
    "sourceId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StockBatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockBatchConsumption" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "saleItemId" TEXT,
    "quantity" INTEGER NOT NULL,
    "unitCost" DECIMAL(15,2) NOT NULL,
    "totalCost" DECIMAL(15,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StockBatchConsumption_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StockBatch_companyId_idx" ON "StockBatch"("companyId");

-- CreateIndex
CREATE INDEX "StockBatch_productId_idx" ON "StockBatch"("productId");

-- CreateIndex
CREATE INDEX "StockBatch_cantinaId_idx" ON "StockBatch"("cantinaId");

-- CreateIndex
CREATE INDEX "StockBatch_createdAt_idx" ON "StockBatch"("createdAt");

-- CreateIndex
CREATE INDEX "StockBatchConsumption_companyId_idx" ON "StockBatchConsumption"("companyId");

-- CreateIndex
CREATE INDEX "StockBatchConsumption_batchId_idx" ON "StockBatchConsumption"("batchId");

-- CreateIndex
CREATE INDEX "StockBatchConsumption_saleItemId_idx" ON "StockBatchConsumption"("saleItemId");

-- AddForeignKey
ALTER TABLE "StockBatch" ADD CONSTRAINT "StockBatch_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockBatch" ADD CONSTRAINT "StockBatch_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockBatch" ADD CONSTRAINT "StockBatch_cantinaId_fkey" FOREIGN KEY ("cantinaId") REFERENCES "Cantina"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockBatchConsumption" ADD CONSTRAINT "StockBatchConsumption_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockBatchConsumption" ADD CONSTRAINT "StockBatchConsumption_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "StockBatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;
