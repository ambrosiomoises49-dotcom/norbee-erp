import { prisma } from "@/lib/prisma";

type Tx =
  | Omit<
      typeof prisma,
      "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends"
    >
  | typeof prisma;

type StockBatchRow = {
  id: string;
  productId: string;
  cantinaId: string | null;
  remainingQuantity: number;
  unitCost: unknown;
  createdAt: Date;
  product: {
    name: string;
    internalCode: string;
    salePrice: unknown;
  };
  cantina?: {
    name: string;
  } | null;
};

type PotentialProfitRow = {
  batchId: string;
  productId: string;
  productName: string;
  internalCode: string;
  cantinaId: string | null;
  cantinaName: string;
  quantity: number;
  unitCost: number;
  salePrice: number;
  stockValue: number;
  potentialRevenue: number;
  potentialProfit: number;
  margin: number;
  createdAt: Date;
};

export async function createCentralBatch({
  tx,
  companyId,
  productId,
  quantity,
  unitCost,
  sourceType,
  sourceId,
  purchaseItemId,
}: {
  tx: Tx;
  companyId: string;
  productId: string;
  quantity: number;
  unitCost: number;
  sourceType: string;
  sourceId?: string | null;
  purchaseItemId?: string | null;
}) {
  if (quantity <= 0) return null;

  return tx.stockBatch.create({
    data: {
      companyId,
      productId,
      cantinaId: null,
      initialQuantity: quantity,
      remainingQuantity: quantity,
      unitCost,
      sourceType,
      sourceId: sourceId || null,
      purchaseItemId: purchaseItemId || null,
    },
  });
}

export async function transferBatchesFromCentralToCantina({
  tx,
  companyId,
  productId,
  destinationId,
  quantity,
  transferItemId,
}: {
  tx: Tx;
  companyId: string;
  productId: string;
  destinationId: string;
  quantity: number;
  transferItemId?: string | null;
}) {
  let remaining = quantity;

  const batches = await tx.stockBatch.findMany({
    where: {
      companyId,
      productId,
      cantinaId: null,
      remainingQuantity: {
        gt: 0,
      },
    },
    orderBy: {
      createdAt: "asc",
    },
  });

  const available = batches.reduce(
    (sum: number, batch: { remainingQuantity: number }) =>
      sum + batch.remainingQuantity,
    0
  );

  if (available < quantity) {
    throw new Error("STOCK_INSUFFICIENT");
  }

  for (const batch of batches) {
    if (remaining <= 0) break;

    const used = Math.min(batch.remainingQuantity, remaining);

    await tx.stockBatch.update({
      where: { id: batch.id },
      data: {
        remainingQuantity: {
          decrement: used,
        },
      },
    });

    await tx.stockBatch.create({
      data: {
        companyId,
        productId,
        cantinaId: destinationId,
        initialQuantity: used,
        remainingQuantity: used,
        unitCost: batch.unitCost,
        sourceType: "TRANSFER_IN",
        sourceId: batch.id,
        transferItemId: transferItemId || null,
      },
    });

    remaining -= used;
  }
}

export async function consumeCantinaFifoForSale({
  tx,
  companyId,
  productId,
  cantinaId,
  quantity,
  saleItemId,
}: {
  tx: Tx;
  companyId: string;
  productId: string;
  cantinaId: string;
  quantity: number;
  saleItemId?: string | null;
}) {
  let remaining = quantity;
  let totalCost = 0;

  const consumptionIds: string[] = [];

  const batches = await tx.stockBatch.findMany({
    where: {
      companyId,
      productId,
      cantinaId,
      remainingQuantity: {
        gt: 0,
      },
    },
    orderBy: {
      createdAt: "asc",
    },
  });

  const available = batches.reduce(
    (sum: number, batch: { remainingQuantity: number }) =>
      sum + batch.remainingQuantity,
    0
  );

  if (available < quantity) {
    throw new Error("FIFO_STOCK_INSUFFICIENT");
  }

  for (const batch of batches) {
    if (remaining <= 0) break;

    const used = Math.min(batch.remainingQuantity, remaining);
    const unitCost = Number(batch.unitCost);
    const lineCost = used * unitCost;

    await tx.stockBatch.update({
      where: { id: batch.id },
      data: {
        remainingQuantity: {
          decrement: used,
        },
      },
    });

    const consumption = await tx.stockBatchConsumption.create({
      data: {
        companyId,
        batchId: batch.id,
        saleItemId: saleItemId || null,
        quantity: used,
        unitCost,
        totalCost: lineCost,
      },
    });

    consumptionIds.push(consumption.id);
    totalCost += lineCost;
    remaining -= used;
  }

  return {
    totalCost,
    unitCost: quantity > 0 ? totalCost / quantity : 0,
    consumptionIds,
  };
}

export async function getPotentialStockProfit({
  tx,
  companyId,
  cantinaId,
}: {
  tx: Tx;
  companyId: string;
  cantinaId?: string | null;
}) {
  const batches = await tx.stockBatch.findMany({
    where: {
      companyId,
      ...(cantinaId !== undefined ? { cantinaId } : {}),
      remainingQuantity: {
        gt: 0,
      },
    },
    include: {
      product: true,
      cantina: true,
    },
    orderBy: {
      createdAt: "asc",
    },
  });

  const rows: PotentialProfitRow[] = batches.map((batch: StockBatchRow) => {
    const unitCost = Number(batch.unitCost);
    const salePrice = Number(batch.product.salePrice || 0);
    const quantity = batch.remainingQuantity;

    const stockValue = quantity * unitCost;
    const potentialRevenue = quantity * salePrice;
    const potentialProfit = potentialRevenue - stockValue;

    const margin =
      potentialRevenue > 0 ? (potentialProfit / potentialRevenue) * 100 : 0;

    return {
      batchId: batch.id,
      productId: batch.productId,
      productName: batch.product.name,
      internalCode: batch.product.internalCode,
      cantinaId: batch.cantinaId,
      cantinaName: batch.cantina?.name || "Stock central",
      quantity,
      unitCost,
      salePrice,
      stockValue,
      potentialRevenue,
      potentialProfit,
      margin,
      createdAt: batch.createdAt,
    };
  });

  const summary = rows.reduce(
    (
      acc: {
        quantity: number;
        stockValue: number;
        potentialRevenue: number;
        potentialProfit: number;
      },
      row: PotentialProfitRow
    ) => {
      acc.quantity += row.quantity;
      acc.stockValue += row.stockValue;
      acc.potentialRevenue += row.potentialRevenue;
      acc.potentialProfit += row.potentialProfit;

      return acc;
    },
    {
      quantity: 0,
      stockValue: 0,
      potentialRevenue: 0,
      potentialProfit: 0,
    }
  );

  return {
    rows,
    summary: {
      ...summary,
      margin:
        summary.potentialRevenue > 0
          ? (summary.potentialProfit / summary.potentialRevenue) * 100
          : 0,
    },
  };
}