import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { consumeCantinaFifoForSale } from "@/lib/fifo";

type TransactionClient = Omit<
  typeof prisma,
  "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends"
>;

type FifoTx =
  Parameters<typeof consumeCantinaFifoForSale>[0]["tx"];

type PaymentMethodValue =
  | "CASH"
  | "CARD"
  | "TRANSFER"
  | "MOBILE_MONEY"
  | "OTHER";

type SaleBodyItem = {
  productId?: string;
  quantity?: number | string;
};

type SaleBody = {
  cantinaId?: string | null;
  items?: SaleBodyItem[];
  paymentMethod?: PaymentMethodValue;
  paidAmount?: number | string;
  customerName?: string;
  customerTaxId?: string;
  notes?: string;
  discountAmount?: number | string;

  // Proteção contra venda duplicada
  clientRequestId?: string;
};

type NormalizedItem = {
  productId: string;
  quantity: number;
};

type PreparedItem = {
  productId: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  minStock: number;
  productName: string;
};

type StockMovementInput = {
  companyId: string;
  productId: string;
  userId: string;
  cantinaId: string;
  type: "SALE_OUT";
  quantity: number;
  reason: string;
  referenceId: string;
};

type LowStockNotificationInput = {
  companyId: string;
  userId: string;
  type: "STOCK_LOW";
  title: string;
  message: string;
  link: string;
};

function generateSaleNumber() {
  const date = new Date();

  const stamp = date
    .toISOString()
    .replace(/[-:.TZ]/g, "")
    .slice(0, 14);

  const random = Math.floor(
    Math.random() * 9999
  )
    .toString()
    .padStart(4, "0");

  return `VD-${stamp}-${random}`;
}

async function ensureDefaultAccount(
  companyId: string,
  tx: TransactionClient
) {
  const existing =
    await tx.financialAccount.findFirst({
      where: {
        companyId,
        isDefault: true,
        status: "ACTIVE",
      },
    });

  if (existing) {
    return existing;
  }

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

export async function POST(
  request: Request
) {
  /*
   * Guardamos estes dois valores fora do try
   * para conseguirmos recuperar de uma colisão
   * de idempotência no catch.
   */
  let retryCompanyId: string | null =
    null;

  let retryClientRequestId:
    | string
    | null = null;

  try {
    const session =
      await requireAuth();

    retryCompanyId =
      session.companyId;

    const body =
      (await request.json()) as SaleBody;

    const {
      items,
      paymentMethod,
      paidAmount,
      customerName,
      customerTaxId,
      notes,
      discountAmount,
      clientRequestId,
    } = body;

    /*
     * ========================================================
     * IDEMPOTENCY KEY
     * ========================================================
     */

    const normalizedClientRequestId =
      String(
        clientRequestId || ""
      ).trim();

    /*
     * Todas as novas vendas têm de chegar
     * com um identificador único criado pelo POS.
     */
    if (
      !normalizedClientRequestId
    ) {
      return NextResponse.json(
        {
          message:
            "O ponto de venda precisa ser atualizado antes de registar novas vendas.",
        },
        {
          status: 409,
        }
      );
    }

    /*
     * UUID normal tem muito menos de 100 caracteres.
     * Isto evita entradas absurdas ou malformadas.
     */
    if (
      normalizedClientRequestId.length >
      100
    ) {
      return NextResponse.json(
        {
          message:
            "Identificador da venda inválido.",
        },
        {
          status: 400,
        }
      );
    }

    retryClientRequestId =
      normalizedClientRequestId;

    /*
     * ========================================================
     * VERIFICAR SE ESTA VENDA JÁ FOI REGISTADA
     * ========================================================
     *
     * Exemplo:
     *
     * POS envia venda
     * servidor grava
     * resposta HTTP perde-se
     * POS reenvia
     *
     * Neste segundo pedido devolvemos a venda
     * existente e NÃO mexemos em stock/caixa.
     */

    const existingSale =
      await prisma.sale.findFirst({
        where: {
          companyId:
            session.companyId,

          clientRequestId:
            normalizedClientRequestId,
        },
      });

    if (existingSale) {
      return NextResponse.json({
        message:
          "Venda já registada anteriormente.",

        sale:
          existingSale,

        duplicate:
          true,
      });
    }

    /*
     * ========================================================
     * CANTINA
     * ========================================================
     */

    const cantinaId =
      session.role === "ADMIN"
        ? body.cantinaId
        : session.cantinaId;

    if (!cantinaId) {
      return NextResponse.json(
        {
          message:
            "Escolha uma cantina para realizar a venda.",
        },
        {
          status: 400,
        }
      );
    }

    const cantina =
      await prisma.cantina.findFirst({
        where: {
          id:
            cantinaId,

          companyId:
            session.companyId,

          status:
            "ACTIVE",
        },
      });

    if (!cantina) {
      return NextResponse.json(
        {
          message:
            "Cantina inválida ou inativa.",
        },
        {
          status: 404,
        }
      );
    }

    /*
     * ========================================================
     * VALIDAR CARRINHO
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
            "Nenhum produto na venda.",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * ========================================================
     * NORMALIZAR PRODUTOS
     * ========================================================
     *
     * Se o mesmo produto vier duas vezes:
     *
     * A = 2
     * A = 3
     *
     * passa a:
     *
     * A = 5
     */

    const normalizedMap =
      new Map<string, number>();

    for (const item of items) {
      const productId =
        String(
          item.productId || ""
        ).trim();

      const quantity =
        Number(
          item.quantity || 0
        );

      if (
        !productId ||
        !Number.isFinite(
          quantity
        ) ||
        quantity <= 0
      ) {
        return NextResponse.json(
          {
            message:
              "Existe um item inválido na venda.",
          },
          {
            status: 400,
          }
        );
      }

      normalizedMap.set(
        productId,

        (
          normalizedMap.get(
            productId
          ) || 0
        ) + quantity
      );
    }

    const normalizedItems:
      NormalizedItem[] =
      Array.from(
        normalizedMap.entries()
      ).map(
        ([
          productId,
          quantity,
        ]) => ({
          productId,
          quantity,
        })
      );

    /*
     * ========================================================
     * TRANSAÇÃO ATÓMICA
     * ========================================================
     */

    const result =
      await prisma.$transaction(
        async (
          tx: TransactionClient
        ) => {
          let subtotal = 0;

          /*
           * ==================================================
           * CARREGAR STOCK
           * ==================================================
           */

          const productIds =
            normalizedItems.map(
              (item) =>
                item.productId
            );

          const stocks =
            await tx.cantinaStock.findMany({
              where: {
                cantinaId,

                productId: {
                  in:
                    productIds,
                },
              },

              include: {
                product:
                  true,
              },
            });

          const stockMap =
            new Map(
              stocks.map(
                (stock) => [
                  stock.productId,
                  stock,
                ]
              )
            );

          const preparedItems:
            PreparedItem[] = [];

          /*
           * ==================================================
           * VALIDAR STOCK
           * ==================================================
           */

          for (
            const item of normalizedItems
          ) {
            const stock =
              stockMap.get(
                item.productId
              );

            if (
              !stock ||
              stock.quantity <
                item.quantity
            ) {
              throw new Error(
                `STOCK_INSUFFICIENT:${
                  stock?.product
                    .name || ""
                }`
              );
            }

            const unitPrice =
              Number(
                stock.product
                  .salePrice || 0
              );

            const totalPrice =
              unitPrice *
              item.quantity;

            subtotal +=
              totalPrice;

            preparedItems.push({
              productId:
                item.productId,

              quantity:
                item.quantity,

              unitPrice,

              totalPrice,

              minStock:
                stock.product
                  .minStock,

              productName:
                stock.product
                  .name,
            });
          }

          /*
           * ==================================================
           * DESCONTO
           * ==================================================
           */

          const discount =
            Math.max(
              0,
              Number(
                discountAmount ||
                  0
              )
            );

          if (
            discount > subtotal
          ) {
            throw new Error(
              "DISCOUNT_TOO_HIGH"
            );
          }

          const totalAmount =
            subtotal -
            discount;

          const paid =
            Number(
              paidAmount ||
                totalAmount
            );

          if (
            !Number.isFinite(
              paid
            )
          ) {
            throw new Error(
              "PAID_AMOUNT_INVALID"
            );
          }

          const changeAmount =
            paid -
            totalAmount;

          if (
            paid <
            totalAmount
          ) {
            throw new Error(
              "PAID_AMOUNT_LOW"
            );
          }

          /*
           * ==================================================
           * CRIAR VENDA
           * ==================================================
           *
           * clientRequestId possui UNIQUE no banco.
           *
           * Esta é a proteção definitiva contra dois requests
           * concorrentes com a mesma venda.
           */

          const sale =
            await tx.sale.create({
              data: {
                companyId:
                  session.companyId,

                cantinaId,

                userId:
                  session.userId,

                saleNumber:
                  generateSaleNumber(),

                clientRequestId:
                  normalizedClientRequestId,

                subtotal,

                taxAmount:
                  0,

                totalAmount,

                paidAmount:
                  paid,

                changeAmount,

                paymentMethod:
                  paymentMethod ||
                  "CASH",

                status:
                  "COMPLETED",

                customerName:
                  customerName ||
                  null,

                customerTaxId:
                  customerTaxId ||
                  null,

                notes:
                  notes ||
                  null,
              },
            });

          const stockMovements:
            StockMovementInput[] =
            [];

          const lowStockProducts =
            new Map<
              string,
              string
            >();

          /*
           * ==================================================
           * FIFO + SALE ITEMS + STOCK
           * ==================================================
           */

          for (
            const item of preparedItems
          ) {
            /*
             * Consumir FIFO.
             */
            const fifoCost =
              await consumeCantinaFifoForSale(
                {
                  tx:
                    tx as unknown as FifoTx,

                  companyId:
                    session.companyId,

                  productId:
                    item.productId,

                  cantinaId,

                  quantity:
                    item.quantity,

                  saleItemId:
                    null,
                }
              );

            /*
             * Custo FIFO real.
             */
            const unitCost =
              fifoCost.unitCost;

            const grossProfit =
              item.totalPrice -
              fifoCost.totalCost;

            /*
             * Item da venda.
             */
            const saleItem =
              await tx.saleItem.create({
                data: {
                  saleId:
                    sale.id,

                  productId:
                    item.productId,

                  quantity:
                    item.quantity,

                  unitPrice:
                    item.unitPrice,

                  unitCost,

                  totalPrice:
                    item.totalPrice,

                  grossProfit,
                },
              });

            /*
             * Ligar consumos FIFO
             * ao SaleItem.
             */
            if (
              fifoCost
                .consumptionIds
                .length > 0
            ) {
              await tx.stockBatchConsumption.updateMany(
                {
                  where: {
                    id: {
                      in:
                        fifoCost.consumptionIds,
                    },

                    companyId:
                      session.companyId,
                  },

                  data: {
                    saleItemId:
                      saleItem.id,
                  },
                }
              );
            }

            /*
             * Diminuir stock físico
             * da cantina.
             */
            const updatedStock =
              await tx.cantinaStock.update({
                where: {
                  cantinaId_productId:
                    {
                      cantinaId,

                      productId:
                        item.productId,
                    },
                },

                data: {
                  quantity: {
                    decrement:
                      item.quantity,
                  },
                },
              });

            /*
             * Movimento de stock.
             */
            stockMovements.push({
              companyId:
                session.companyId,

              productId:
                item.productId,

              userId:
                session.userId,

              cantinaId,

              type:
                "SALE_OUT",

              quantity:
                item.quantity,

              reason:
                "Venda POS FIFO",

              referenceId:
                sale.id,
            });

            /*
             * Stock baixo.
             */
            if (
              updatedStock.quantity <=
              item.minStock
            ) {
              lowStockProducts.set(
                item.productId,
                item.productName
              );
            }
          }

          /*
           * ==================================================
           * MOVIMENTOS DE STOCK EM LOTE
           * ==================================================
           */

          if (
            stockMovements.length >
            0
          ) {
            await tx.stockMovement.createMany(
              {
                data:
                  stockMovements,
              }
            );
          }

          /*
           * ==================================================
           * NOTIFICAÇÕES DE STOCK BAIXO
           * ==================================================
           */

          if (
            lowStockProducts.size >
            0
          ) {
            const admins =
              await tx.user.findMany({
                where: {
                  companyId:
                    session.companyId,

                  role:
                    "ADMIN",

                  status:
                    "ACTIVE",
                },

                select: {
                  id: true,
                },
              });

            const notifications:
              LowStockNotificationInput[] =
              [];

            for (
              const productName of lowStockProducts.values()
            ) {
              for (
                const admin of admins
              ) {
                notifications.push({
                  companyId:
                    session.companyId,

                  userId:
                    admin.id,

                  type:
                    "STOCK_LOW",

                  title:
                    "Stock baixo na cantina",

                  message:
                    `${productName} está com stock baixo após venda.`,

                  link:
                    `/cantinas/${cantinaId}`,
                });
              }
            }

            if (
              notifications.length >
              0
            ) {
              await tx.notification.createMany(
                {
                  data:
                    notifications,
                }
              );
            }
          }

          /*
           * ==================================================
           * FINANCEIRO
           * ==================================================
           */

          const defaultAccount =
            await ensureDefaultAccount(
              session.companyId,
              tx
            );

          /*
           * Criar entrada financeira
           * exatamente UMA vez.
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
                  "INCOME",

                amount:
                  totalAmount,

                description:
                  `Venda ${sale.saleNumber}`,

                date:
                  new Date(),

                referenceType:
                  "SALE",

                referenceId:
                  sale.id,
              },
            }
          );

          /*
           * Incrementar caixa
           * exatamente UMA vez.
           */
          await tx.financialAccount.update(
            {
              where: {
                id:
                  defaultAccount.id,
              },

              data: {
                balance: {
                  increment:
                    totalAmount,
                },
              },
            }
          );

          return sale;
        },

        {
          maxWait:
            5_000,

          timeout:
            15_000,
        }
      );

    /*
     * ========================================================
     * SUCESSO
     * ========================================================
     */

    return NextResponse.json({
      message:
        "Venda registada com sucesso com FIFO.",

      sale:
        result,

      duplicate:
        false,
    });
  } catch (error) {
    /*
     * ========================================================
     * RECUPERAÇÃO DE IDEMPOTÊNCIA
     * ========================================================
     *
     * Cenário:
     *
     * request A chega
     * request B chega quase simultaneamente
     *
     * A cria clientRequestId
     * B tenta criar o mesmo clientRequestId
     *
     * UNIQUE no PostgreSQL rejeita B.
     *
     * Aqui procuramos a venda criada por A
     * e devolvemos como sucesso.
     */

    if (
      retryCompanyId &&
      retryClientRequestId
    ) {
      try {
        const existingSaleAfterError =
          await prisma.sale.findFirst({
            where: {
              companyId:
                retryCompanyId,

              clientRequestId:
                retryClientRequestId,
            },
          });

        if (
          existingSaleAfterError
        ) {
          return NextResponse.json({
            message:
              "Venda já registada anteriormente.",

            sale:
              existingSaleAfterError,

            duplicate:
              true,
          });
        }
      } catch (
        recoveryError
      ) {
        console.error(
          "ERRO AO RECUPERAR VENDA IDEMPOTENTE:",
          recoveryError
        );
      }
    }

    console.error(
      "ERRO AO REGISTAR VENDA:",
      error
    );

    if (
      error instanceof Error
    ) {
      /*
       * Stock normal insuficiente.
       */
      if (
        error.message.startsWith(
          "STOCK_INSUFFICIENT"
        )
      ) {
        const productName =
          error.message.split(
            ":"
          )[1];

        return NextResponse.json(
          {
            message:
              `Stock insuficiente para ${
                productName ||
                "este produto"
              }.`,
          },
          {
            status: 400,
          }
        );
      }

      /*
       * FIFO insuficiente.
       */
      if (
        error.message ===
        "FIFO_STOCK_INSUFFICIENT"
      ) {
        return NextResponse.json(
          {
            message:
              "Stock FIFO insuficiente. Este produto tem quantidade na cantina, mas não tem lotes FIFO suficientes.",
          },
          {
            status: 400,
          }
        );
      }

      /*
       * Valor recebido inválido.
       */
      if (
        error.message ===
        "PAID_AMOUNT_INVALID"
      ) {
        return NextResponse.json(
          {
            message:
              "O valor pago é inválido.",
          },
          {
            status: 400,
          }
        );
      }

      /*
       * Pagamento insuficiente.
       */
      if (
        error.message ===
        "PAID_AMOUNT_LOW"
      ) {
        return NextResponse.json(
          {
            message:
              "O valor pago é inferior ao total da venda.",
          },
          {
            status: 400,
          }
        );
      }

      /*
       * Desconto superior ao subtotal.
       */
      if (
        error.message ===
        "DISCOUNT_TOO_HIGH"
      ) {
        return NextResponse.json(
          {
            message:
              "O desconto não pode ser superior ao subtotal.",
          },
          {
            status: 400,
          }
        );
      }

      /*
       * Item inválido.
       */
      if (
        error.message ===
        "ITEM_INVALID"
      ) {
        return NextResponse.json(
          {
            message:
              "Existe um item inválido na venda.",
          },
          {
            status: 400,
          }
        );
      }

      /*
       * Timeout.
       */
      const lowerMessage =
        error.message.toLowerCase();

      if (
        lowerMessage.includes(
          "expired transaction"
        ) ||
        lowerMessage.includes(
          "transaction api error"
        ) ||
        lowerMessage.includes(
          "timeout"
        )
      ) {
        return NextResponse.json(
          {
            message:
              "A venda demorou mais do que o esperado. Verifique o histórico antes de tentar novamente.",
          },
          {
            status: 503,
          }
        );
      }
    }

    return NextResponse.json(
      {
        message:
          "Erro ao registar venda.",
      },
      {
        status: 500,
      }
    );
  }
}