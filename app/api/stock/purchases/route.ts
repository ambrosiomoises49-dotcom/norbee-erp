import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { createCentralBatch } from "@/lib/fifo";

type TransactionClient = Omit<
  typeof prisma,
  "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends"
>;

type FifoTx = Parameters<typeof createCentralBatch>[0]["tx"];

type Item = {
  productId: string;
  quantity: number | string;
  unitCost: number | string;
};

type CleanItem = {
  productId: string;
  quantity: number;
  unitCost: number;
};

type PurchaseBody = {
  supplierId?: string;
  invoiceNumber?: string;
  transportCost?: number | string;
  otherCosts?: number | string;
  notes?: string;

  // NOVO
  receiveNow?: boolean | string;

  items?: Item[];
};

async function ensureDefaultAccount(
  companyId: string,
  tx: TransactionClient
) {
  const existing = await tx.financialAccount.findFirst({
    where: {
      companyId,
      isDefault: true,
    },
  });

  if (existing) return existing;

  return tx.financialAccount.create({
    data: {
      companyId,
      name: "Caixa principal",
      type: "CASH",
      isDefault: true,
      balance: 0,
      status: "ACTIVE",
    },
  });
}

async function ensureCostCategory({
  companyId,
  name,
  description,
}: {
  companyId: string;
  name: string;
  description: string;
}) {
  const existing = await prisma.costCategory.findFirst({
    where: {
      companyId,
      name,
    },
  });

  if (existing) return existing;

  return prisma.costCategory.create({
    data: {
      companyId,
      name,
      description,
      isSystem: true,
      costType: "ONE_TIME",
      periodicity: "NONE",
      defaultAmount: null,
    },
  });
}

export async function POST(request: Request) {
  try {
    const session = await requireAdmin();
    const body = (await request.json()) as PurchaseBody;

    const {
      supplierId,
      invoiceNumber,
      transportCost,
      otherCosts,
      notes,

      // NOVO
      receiveNow,

      items,
    } = body;

    /*
     * =========================================================
     * NOVO
     *
     * O frontend atualmente envia:
     *
     * "true"
     * ou
     * "false"
     *
     * Mas aceitamos também boolean.
     * =========================================================
     */

    const shouldReceiveNow =
      receiveNow === true ||
      receiveNow === "true";

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        {
          message:
            "Adicione pelo menos um produto à compra.",
        },
        {
          status: 400,
        }
      );
    }

    const cleanItems: CleanItem[] = items.map(
      (item: Item) => ({
        productId: item.productId,
        quantity: Number(item.quantity || 0),
        unitCost: Number(item.unitCost || 0),
      })
    );

    const invalidItem = cleanItems.find(
      (item: CleanItem) =>
        !item.productId ||
        item.quantity <= 0 ||
        item.unitCost < 0
    );

    if (invalidItem) {
      return NextResponse.json(
        {
          message:
            "Existe um produto inválido na compra.",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * =========================================================
     * VALIDAR FORNECEDOR
     * =========================================================
     */

    if (supplierId) {
      const supplier = await prisma.supplier.findFirst({
        where: {
          id: supplierId,
          companyId: session.companyId,
          status: "ACTIVE",
        },
      });

      if (!supplier) {
        return NextResponse.json(
          {
            message:
              "Fornecedor inválido ou inativo.",
          },
          {
            status: 400,
          }
        );
      }
    }

    /*
     * =========================================================
     * VALIDAR PRODUTOS
     * =========================================================
     */

    for (const item of cleanItems) {
      const product = await prisma.product.findFirst({
        where: {
          id: item.productId,
          companyId: session.companyId,
          status: "ACTIVE",
        },
      });

      if (!product) {
        return NextResponse.json(
          {
            message:
              "Um dos produtos é inválido ou está inativo.",
          },
          {
            status: 400,
          }
        );
      }
    }

    const transport =
      Number(transportCost || 0);

    const others =
      Number(otherCosts || 0);

    const subtotal = cleanItems.reduce(
      (
        sum: number,
        item: CleanItem
      ) =>
        sum +
        item.quantity *
          item.unitCost,
      0
    );

    const totalAmount =
      subtotal +
      transport +
      others;

    const purchaseNumber =
      `COMP-${Date.now()}`;

    /*
     * =========================================================
     * CATEGORIAS DE CUSTOS
     * =========================================================
     */

    const merchandiseCategory =
      await ensureCostCategory({
        companyId:
          session.companyId,

        name:
          "Compra de mercadoria",

        description:
          "Valor principal das mercadorias compradas para stock.",
      });

    const transportCategory =
      transport > 0
        ? await ensureCostCategory({
            companyId:
              session.companyId,

            name:
              "Transporte de compra",

            description:
              "Custos de transporte associados às compras.",
          })
        : null;

    const otherPurchaseCategory =
      others > 0
        ? await ensureCostCategory({
            companyId:
              session.companyId,

            name:
              "Outros custos de compra",

            description:
              "Outros custos associados às compras.",
          })
        : null;

    /*
     * =========================================================
     * TRANSAÇÃO
     * =========================================================
     */

    const purchase =
      await prisma.$transaction(
        async (
          tx: TransactionClient
        ) => {
          const defaultAccount =
            await ensureDefaultAccount(
              session.companyId,
              tx
            );

          /*
           * ===================================================
           * CRIAÇÃO DA COMPRA
           *
           * ALTERAÇÃO:
           *
           * Receber agora  -> RECEIVED
           * Receber depois -> PENDING
           * ===================================================
           */

          const createdPurchase =
            await tx.purchase.create({
              data: {
                companyId:
                  session.companyId,

                supplierId:
                  supplierId || null,

                purchaseNumber,

                invoiceNumber:
                  invoiceNumber || null,

                subtotal,

                transportCost:
                  transport,

                otherCosts:
                  others,

                totalAmount,

                status:
                  shouldReceiveNow
                    ? "RECEIVED"
                    : "PENDING",

                notes:
                  notes || null,
              },
            });

          /*
           * ===================================================
           * PRODUTOS DA COMPRA
           * ===================================================
           */

          for (
            const item of cleanItems
          ) {
            const totalCost =
              item.quantity *
              item.unitCost;

            /*
             * PurchaseItem é SEMPRE criado.
             *
             * Mesmo quando a mercadoria ainda não chegou.
             */

            const purchaseItem =
              await tx.purchaseItem.create(
                {
                  data: {
                    purchaseId:
                      createdPurchase.id,

                    productId:
                      item.productId,

                    quantity:
                      item.quantity,

                    unitCost:
                      item.unitCost,

                    totalCost,
                  },
                }
              );

            /*
             * =================================================
             * NOVO
             *
             * Se a empresa escolheu:
             *
             * "RECEBER DEPOIS"
             *
             * paramos aqui para este produto.
             *
             * NÃO:
             *
             * - cria FIFO
             * - aumenta CentralStock
             * - cria PURCHASE_IN
             *
             * A compra continua existindo e sendo paga.
             * =================================================
             */

            if (!shouldReceiveNow) {
              continue;
            }

            /*
             * =================================================
             * FIFO
             * =================================================
             */

            await createCentralBatch({
              tx:
                tx as unknown as FifoTx,

              companyId:
                session.companyId,

              productId:
                item.productId,

              quantity:
                item.quantity,

              unitCost:
                item.unitCost,

              sourceType:
                "PURCHASE",

              sourceId:
                createdPurchase.id,

              purchaseItemId:
                purchaseItem.id,
            });

            /*
             * =================================================
             * STOCK CENTRAL
             * =================================================
             */

            const currentStock =
              await tx.centralStock.findUnique(
                {
                  where: {
                    productId:
                      item.productId,
                  },
                }
              );

            if (currentStock) {
              const oldQty =
                currentStock.quantity;

              const oldAvg =
                Number(
                  currentStock.avgCost ||
                    0
                );

              const newQty =
                oldQty +
                item.quantity;

              const newAvgCost =
                newQty > 0
                  ? (
                      oldQty *
                        oldAvg +
                      item.quantity *
                        item.unitCost
                    ) /
                    newQty
                  : item.unitCost;

              await tx.centralStock.update(
                {
                  where: {
                    productId:
                      item.productId,
                  },

                  data: {
                    quantity:
                      newQty,

                    avgCost:
                      newAvgCost,
                  },
                }
              );
            } else {
              await tx.centralStock.create(
                {
                  data: {
                    companyId:
                      session.companyId,

                    productId:
                      item.productId,

                    quantity:
                      item.quantity,

                    avgCost:
                      item.unitCost,
                  },
                }
              );
            }

            /*
             * =================================================
             * ATUALIZAR PREÇO DE COMPRA
             * =================================================
             */

            await tx.product.update({
              where: {
                id:
                  item.productId,
              },

              data: {
                purchasePrice:
                  item.unitCost,
              },
            });

            /*
             * =================================================
             * MOVIMENTO DE STOCK
             * =================================================
             */

            await tx.stockMovement.create(
              {
                data: {
                  companyId:
                    session.companyId,

                  productId:
                    item.productId,

                  userId:
                    session.userId,

                  cantinaId:
                    null,

                  type:
                    "PURCHASE_IN",

                  quantity:
                    item.quantity,

                  referenceId:
                    createdPurchase.id,

                  reason:
                    "Compra recebida de fornecedor com lote FIFO",
                },
              }
            );
          }

          /*
           * ===================================================
           * FINANCEIRO
           *
           * NÃO ALTERADO.
           *
           * MESMO UMA COMPRA PENDING É PAGA IMEDIATAMENTE.
           * ===================================================
           */

          if (subtotal > 0) {
            await tx.cost.create({
              data: {
                companyId:
                  session.companyId,

                categoryId:
                  merchandiseCategory.id,

                cantinaId:
                  null,

                description:
                  `Compra de mercadoria ${purchaseNumber}`,

                amount:
                  subtotal,

                costDate:
                  new Date(),

                isAutomatic:
                  true,

                paymentStatus:
                  "PAID",

                paidAt:
                  new Date(),

                financialAccountId:
                  defaultAccount.id,

                referencePeriod:
                  purchaseNumber,
              },
            });
          }

          /*
           * ===================================================
           * TRANSPORTE
           * ===================================================
           */

          if (
            transport > 0 &&
            transportCategory
          ) {
            await tx.cost.create({
              data: {
                companyId:
                  session.companyId,

                categoryId:
                  transportCategory.id,

                cantinaId:
                  null,

                description:
                  `Transporte da compra ${purchaseNumber}`,

                amount:
                  transport,

                costDate:
                  new Date(),

                isAutomatic:
                  true,

                paymentStatus:
                  "PAID",

                paidAt:
                  new Date(),

                financialAccountId:
                  defaultAccount.id,

                referencePeriod:
                  purchaseNumber,
              },
            });
          }

          /*
           * ===================================================
           * OUTROS CUSTOS
           * ===================================================
           */

          if (
            others > 0 &&
            otherPurchaseCategory
          ) {
            await tx.cost.create({
              data: {
                companyId:
                  session.companyId,

                categoryId:
                  otherPurchaseCategory.id,

                cantinaId:
                  null,

                description:
                  `Outros custos da compra ${purchaseNumber}`,

                amount:
                  others,

                costDate:
                  new Date(),

                isAutomatic:
                  true,

                paymentStatus:
                  "PAID",

                paidAt:
                  new Date(),

                financialAccountId:
                  defaultAccount.id,

                referencePeriod:
                  purchaseNumber,
              },
            });
          }

          /*
           * ===================================================
           * TRANSAÇÃO FINANCEIRA
           *
           * SEM ALTERAÇÃO.
           * ===================================================
           */

          await tx.financeTransaction.create(
            {
              data: {
                companyId:
                  session.companyId,

                userId:
                  session.userId,

                financialAccountId:
                  defaultAccount.id,

                type:
                  "EXPENSE",

                amount:
                  totalAmount,

                description:
                  `Compra ${purchaseNumber}`,

                date:
                  new Date(),

                referenceType:
                  "PURCHASE",

                referenceId:
                  createdPurchase.id,
              },
            }
          );

          /*
           * ===================================================
           * DEBITAR CONTA FINANCEIRA
           *
           * TAMBÉM SEM ALTERAÇÃO.
           * ===================================================
           */

          await tx.financialAccount.update(
            {
              where: {
                id:
                  defaultAccount.id,
              },

              data: {
                balance: {
                  decrement:
                    totalAmount,
                },
              },
            }
          );

          return createdPurchase;
        },

        /*
         * =====================================================
         * TIMEOUT
         *
         * MANTIDO COMO JÁ TINHAS.
         * =====================================================
         */

        {
          maxWait:
            10_000,

          timeout:
            60_000,
        }
      );

    /*
     * =========================================================
     * RESPOSTA
     * =========================================================
     */

    return NextResponse.json({
      message:
        shouldReceiveNow
          ? "Compra registada e mercadoria recebida com sucesso com FIFO e custos associados."
          : "Compra registada com sucesso. A mercadoria está pendente de receção e os custos foram pagos.",

      purchase,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "Erro ao registar compra.",
      },
      {
        status: 500,
      }
    );
  }
}