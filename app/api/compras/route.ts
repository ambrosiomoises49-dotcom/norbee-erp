import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { createCentralBatch } from "@/lib/fifo";

type TransactionClient = Omit<
  typeof prisma,
  "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends"
>;

type FifoTx = Parameters<typeof createCentralBatch>[0]["tx"];

type PurchaseItemInput = {
  productId: string;
  quantity: number;
  unitCost: number;
  totalCost: number;
};

function generatePurchaseNumber() {
  return `CMP-${Date.now()}`;
}

/*
 * ============================================================
 * GET
 * ============================================================
 */

export async function GET() {
  try {
    const session = await requireAdmin();

    const [purchases, suppliers, products] = await Promise.all([
      prisma.purchase.findMany({
        where: {
          companyId: session.companyId,
        },

        include: {
          supplier: true,

          items: {
            include: {
              product: true,
            },
          },
        },

        orderBy: {
          createdAt: "desc",
        },
      }),

      prisma.supplier.findMany({
        where: {
          companyId: session.companyId,
          status: "ACTIVE",
        },

        orderBy: {
          name: "asc",
        },
      }),

      prisma.product.findMany({
        where: {
          companyId: session.companyId,
          status: "ACTIVE",
        },

        include: {
          centralStock: true,
        },

        orderBy: {
          name: "asc",
        },
      }),
    ]);

    return NextResponse.json({
      purchases,
      suppliers,
      products,
    });
  } catch {
    return NextResponse.json(
      {
        message: "Acesso não autorizado.",
      },
      {
        status: 401,
      }
    );
  }
}

/*
 * ============================================================
 * POST
 * ============================================================
 */

export async function POST(request: Request) {
  try {
    const session = await requireAdmin();
    const body = await request.json();

    const {
      supplierId,
      invoiceNumber,
      purchaseDate,
      transportCost,
      otherCosts,
      notes,
      items,
      status,
    } = body;

    /*
     * ========================================================
     * VALIDAR PRODUTOS
     * ========================================================
     */

    if (
      !items ||
      !Array.isArray(items) ||
      items.length === 0
    ) {
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

    const cleanItems: PurchaseItemInput[] =
      items
        .filter(
          (item: {
            productId?: string;
            quantity?: number | string;
            unitCost?: number | string;
          }) =>
            item.productId &&
            Number(item.quantity) > 0 &&
            Number(item.unitCost) >= 0
        )
        .map(
          (item: {
            productId: string;
            quantity: number | string;
            unitCost: number | string;
          }) => ({
            productId: item.productId,

            quantity:
              Number(item.quantity),

            unitCost:
              Number(item.unitCost),

            totalCost:
              Number(item.quantity) *
              Number(item.unitCost),
          })
        );

    if (cleanItems.length === 0) {
      return NextResponse.json(
        {
          message:
            "Os produtos da compra são inválidos.",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * ========================================================
     * TOTAIS
     * ========================================================
     */

    const subtotal =
      cleanItems.reduce(
        (
          sum: number,
          item: PurchaseItemInput
        ) =>
          sum +
          item.totalCost,
        0
      );

    const transport =
      Number(transportCost || 0);

    const others =
      Number(otherCosts || 0);

    const totalAmount =
      subtotal +
      transport +
      others;

    const extraCosts =
      transport +
      others;

    const purchaseNumber =
      generatePurchaseNumber();

    /*
     * O frontend já envia:
     *
     * RECEIVED = receber agora
     * PENDING  = receber depois
     */

    const finalStatus =
      status || "RECEIVED";

    const date =
      purchaseDate
        ? new Date(purchaseDate)
        : new Date();

    /*
     * ========================================================
     * TRANSAÇÃO
     * ========================================================
     */

    const purchase =
      await prisma.$transaction(
        async (
          tx: TransactionClient
        ) => {
          /*
           * ==================================================
           * CRIAR COMPRA + ITEMS
           * ==================================================
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

                purchaseDate:
                  date,

                subtotal,

                transportCost:
                  transport,

                otherCosts:
                  others,

                totalAmount,

                status:
                  finalStatus,

                notes:
                  notes || null,

                items: {
                  create:
                    cleanItems.map(
                      (
                        item: PurchaseItemInput
                      ) => ({
                        productId:
                          item.productId,

                        quantity:
                          item.quantity,

                        unitCost:
                          item.unitCost,

                        totalCost:
                          item.totalCost,
                      })
                    ),
                },
              },

              include: {
                items: true,
              },
            });

          /*
           * ==================================================
           * LOGÍSTICA
           *
           * APENAS QUANDO A MERCADORIA É RECEBIDA AGORA.
           *
           * PENDING:
           *
           * - não cria FIFO
           * - não aumenta stock
           * - não cria PURCHASE_IN
           *
           * Mas será paga mais abaixo normalmente.
           * ==================================================
           */

          if (
            finalStatus === "RECEIVED"
          ) {
            /*
             * Usamos os PurchaseItems que acabaram
             * de ser criados para obter o ID necessário
             * ao FIFO.
             */

            const purchaseItemMap =
              new Map(
                createdPurchase.items.map(
                  (item) => [
                    item.productId,
                    item,
                  ]
                )
              );

            for (
              const item of cleanItems
            ) {
              const purchaseItem =
                purchaseItemMap.get(
                  item.productId
                );

              if (!purchaseItem) {
                throw new Error(
                  `Item da compra não encontrado para o produto ${item.productId}.`
                );
              }

              /*
               * ==============================================
               * FIFO
               * ==============================================
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
               * ==============================================
               * STOCK CENTRAL
               *
               * Calculamos corretamente o custo médio
               * ponderado em vez de simplesmente substituir
               * avgCost pelo último preço.
               * ==============================================
               */

              const currentStock =
                await tx.centralStock.findUnique({
                  where: {
                    productId:
                      item.productId,
                  },
                });

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

                await tx.centralStock.update({
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
                });
              } else {
                await tx.centralStock.create({
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
                });
              }

              /*
               * ==============================================
               * ÚLTIMO PREÇO DE COMPRA
               * ==============================================
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
               * ==============================================
               * MOVIMENTO DE STOCK
               * ==============================================
               */

              await tx.stockMovement.create({
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

                  reason:
                    "Entrada por compra recebida com lote FIFO",

                  referenceId:
                    createdPurchase.id,
                },
              });
            }
          }

          /*
           * ==================================================
           * FINANCEIRO
           *
           * MUITO IMPORTANTE:
           *
           * EXECUTADO TANTO PARA:
           *
           * RECEIVED
           * como
           * PENDING
           *
           * A empresa paga a compra imediatamente,
           * mesmo quando a mercadoria chega depois.
           * ==================================================
           */

          await tx.financeTransaction.create({
            data: {
              companyId:
                session.companyId,

              userId:
                session.userId,

              type:
                "EXPENSE",

              amount:
                totalAmount,

              description:
                `Compra ${purchaseNumber}`,

              date,

              referenceType:
                "PURCHASE",

              referenceId:
                createdPurchase.id,
            },
          });

          /*
           * ==================================================
           * CUSTOS ADICIONAIS
           *
           * Também são registados imediatamente,
           * independentemente de a mercadoria já ter
           * chegado ou não.
           * ==================================================
           */

          if (extraCosts > 0) {
            const category =
              await tx.costCategory.upsert({
                where: {
                  companyId_name: {
                    companyId:
                      session.companyId,

                    name:
                      "Custos associados a compras",
                  },
                },

                update: {},

                create: {
                  companyId:
                    session.companyId,

                  name:
                    "Custos associados a compras",

                  description:
                    "Custos automáticos ligados a compras: transporte, descarga, taxas e outros encargos.",

                  isSystem:
                    true,
                },
              });

            await tx.cost.create({
              data: {
                companyId:
                  session.companyId,

                cantinaId:
                  null,

                categoryId:
                  category.id,

                description:
                  `Custos adicionais da compra ${purchaseNumber}`,

                amount:
                  extraCosts,

                costDate:
                  date,

                isAutomatic:
                  true,
              },
            });
          }

          return createdPurchase;
        },

        /*
         * ====================================================
         * TIMEOUT
         *
         * Mantemos 60 segundos para compras com listas grandes.
         * ====================================================
         */

        {
          maxWait:
            10_000,

          timeout:
            60_000,
        }
      );

    /*
     * ========================================================
     * RESPOSTA
     * ========================================================
     */

    return NextResponse.json({
      message:
        finalStatus === "RECEIVED"
          ? "Compra registada, paga e recebida com sucesso."
          : "Compra registada e paga com sucesso. A mercadoria está pendente de receção.",

      purchase,
    });
  } catch (error) {
    console.error(
      "ERRO AO REGISTAR COMPRA:",
      error
    );

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