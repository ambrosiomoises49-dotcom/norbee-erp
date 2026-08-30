import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { consumeCantinaFifoForSale } from "@/lib/fifo";

type TransactionClient = Omit<
  typeof prisma,
  "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends"
>;

type FifoTx = Parameters<typeof consumeCantinaFifoForSale>[0]["tx"];

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

  return `VD-${stamp}-${Math.floor(Math.random() * 9999)
    .toString()
    .padStart(4, "0")}`;
}

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

export async function POST(request: Request) {
  try {
    const session = await requireAuth();
    const body = (await request.json()) as SaleBody;

    const {
      items,
      paymentMethod,
      paidAmount,
      customerName,
      customerTaxId,
      notes,
      discountAmount,
    } = body;

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
        { status: 400 }
      );
    }

    /*
     * ========================================================
     * VALIDAR CANTINA
     * ========================================================
     */

    const cantina = await prisma.cantina.findFirst({
      where: {
        id: cantinaId,
        companyId: session.companyId,
        status: "ACTIVE",
      },
    });

    if (!cantina) {
      return NextResponse.json(
        {
          message: "Cantina inválida ou inativa.",
        },
        { status: 404 }
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
          message: "Nenhum produto na venda.",
        },
        { status: 400 }
      );
    }

    /*
     * ========================================================
     * NORMALIZAR PRODUTOS
     *
     * Normalmente o frontend já agrupa o mesmo produto.
     *
     * Mas fazemos também esta proteção no servidor.
     *
     * Exemplo:
     *
     * produto A = 5
     * produto A = 7
     *
     * passa a:
     *
     * produto A = 12
     * ========================================================
     */

    const normalizedMap = new Map<string, number>();

    for (const item of items) {
      const productId = String(
        item.productId || ""
      ).trim();

      const quantity = Number(
        item.quantity || 0
      );

      if (
        !productId ||
        !Number.isFinite(quantity) ||
        quantity <= 0
      ) {
        return NextResponse.json(
          {
            message:
              "Existe um item inválido na venda.",
          },
          { status: 400 }
        );
      }

      normalizedMap.set(
        productId,
        (normalizedMap.get(productId) || 0) +
          quantity
      );
    }

    const normalizedItems: NormalizedItem[] =
      Array.from(normalizedMap.entries()).map(
        ([productId, quantity]) => ({
          productId,
          quantity,
        })
      );

    /*
     * ========================================================
     * TRANSAÇÃO
     * ========================================================
     */

    const result = await prisma.$transaction(
      async (tx: TransactionClient) => {
        let subtotal = 0;

        /*
         * ====================================================
         * CARREGAR TODOS OS STOCKS NUMA ÚNICA QUERY
         *
         * Antes:
         *
         * 20 produtos = 20 findUnique()
         *
         * Agora:
         *
         * 20 produtos = 1 findMany()
         * ====================================================
         */

        const productIds = normalizedItems.map(
          (item) => item.productId
        );

        const stocks =
          await tx.cantinaStock.findMany({
            where: {
              cantinaId,

              productId: {
                in: productIds,
              },
            },

            include: {
              product: true,
            },
          });

        const stockMap = new Map(
          stocks.map((stock) => [
            stock.productId,
            stock,
          ])
        );

        const preparedItems: PreparedItem[] = [];

        /*
         * ====================================================
         * VALIDAR STOCK E PREPARAR VENDA
         * ====================================================
         */

        for (const item of normalizedItems) {
          const stock =
            stockMap.get(item.productId);

          if (
            !stock ||
            stock.quantity < item.quantity
          ) {
            throw new Error(
              `STOCK_INSUFFICIENT:${
                stock?.product.name || ""
              }`
            );
          }

          const unitPrice = Number(
            stock.product.salePrice || 0
          );

          const totalPrice =
            unitPrice * item.quantity;

          subtotal += totalPrice;

          preparedItems.push({
            productId:
              item.productId,

            quantity:
              item.quantity,

            unitPrice,

            totalPrice,

            minStock:
              stock.product.minStock,

            productName:
              stock.product.name,
          });
        }

        /*
         * ====================================================
         * DESCONTO / TOTAL
         * ====================================================
         */

        const discount = Math.max(
          0,
          Number(discountAmount || 0)
        );

        if (discount > subtotal) {
          throw new Error(
            "DISCOUNT_TOO_HIGH"
          );
        }

        const totalAmount =
          subtotal - discount;

        const paid =
          Number(
            paidAmount || totalAmount
          );

        const changeAmount =
          paid - totalAmount;

        if (paid < totalAmount) {
          throw new Error(
            "PAID_AMOUNT_LOW"
          );
        }

        /*
         * ====================================================
         * CRIAR VENDA
         *
         * ESTRUTURA ORIGINAL PRESERVADA
         * ====================================================
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

              subtotal,

              taxAmount: 0,

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
                notes || null,
            },
          });

        /*
         * Movimentos serão preparados
         * e inseridos juntos no final.
         */

        const stockMovements: StockMovementInput[] =
          [];

        /*
         * Guardamos apenas os produtos
         * que realmente ficaram com stock baixo.
         */

        const lowStockProducts = new Map<
          string,
          string
        >();

        /*
         * ====================================================
         * PROCESSAMENTO FIFO
         *
         * Esta parte continua produto por produto porque
         * consumeCantinaFifoForSale precisa garantir FIFO.
         *
         * NÃO ALTERAMOS ESSA LÓGICA.
         * ====================================================
         */

        for (const item of preparedItems) {
          /*
           * FIFO
           */

          const fifoCost =
            await consumeCantinaFifoForSale({
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
            });

          /*
           * CUSTO REAL FIFO
           */

          const unitCost =
            fifoCost.unitCost;

          const grossProfit =
            item.totalPrice -
            fifoCost.totalCost;

          /*
           * SaleItem
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
           * Relacionar consumos FIFO ao SaleItem
           */

          if (
            fifoCost.consumptionIds.length >
            0
          ) {
            await tx.stockBatchConsumption.updateMany({
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
            });
          }

          /*
           * ==================================================
           * DIMINUIR STOCK DA CANTINA
           * ==================================================
           */

          const updatedStock =
            await tx.cantinaStock.update({
              where: {
                cantinaId_productId: {
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
           * ==================================================
           * PREPARAR MOVIMENTO
           *
           * Em vez de stockMovement.create()
           * para cada produto.
           * ==================================================
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
           * ==================================================
           * DETECTAR STOCK BAIXO
           *
           * Ainda não criamos notificações.
           * ==================================================
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
         * ====================================================
         * MOVIMENTOS EM LOTE
         * ====================================================
         */

        if (
          stockMovements.length > 0
        ) {
          await tx.stockMovement.createMany({
            data:
              stockMovements,
          });
        }

        /*
         * ====================================================
         * NOTIFICAÇÕES
         *
         * Só procuramos os admins UMA VEZ.
         *
         * Antes essa query podia acontecer uma vez
         * para cada produto com stock baixo.
         * ====================================================
         */

        if (
          lowStockProducts.size > 0
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

          const notifications: LowStockNotificationInput[] =
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

          /*
           * Criar todas as notificações de uma vez.
           */

          if (
            notifications.length > 0
          ) {
            await tx.notification.createMany({
              data:
                notifications,
            });
          }
        }

        /*
         * ====================================================
         * FINANCEIRO
         *
         * LÓGICA ORIGINAL PRESERVADA.
         * ====================================================
         */

        const defaultAccount =
          await ensureDefaultAccount(
            session.companyId,
            tx
          );

        await tx.financeTransaction.create({
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
        });

        /*
         * Atualizar saldo.
         */

        await tx.financialAccount.update({
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
        });

        return sale;
      },

      /*
       * ======================================================
       * TIMEOUT DE SEGURANÇA
       *
       * Isto NÃO significa que a venda deve demorar 15 s.
       *
       * A otimização acima é que deve torná-la rápida.
       *
       * Este limite existe apenas para não matar uma venda
       * grande aos 5 segundos por alguns milissegundos.
       * ======================================================
       */

      {
        maxWait: 5_000,
        timeout: 15_000,
      }
    );

    /*
     * ========================================================
     * RESPOSTA
     *
     * MESMO FORMATO ORIGINAL.
     * ========================================================
     */

    return NextResponse.json({
      message:
        "Venda registada com sucesso com FIFO.",

      sale:
        result,
    });
  } catch (error) {
    console.error(
      "ERRO AO REGISTAR VENDA:",
      error
    );

    if (error instanceof Error) {
      /*
       * Stock normal insuficiente.
       */

      if (
        error.message.startsWith(
          "STOCK_INSUFFICIENT"
        )
      ) {
        const productName =
          error.message.split(":")[1];

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
       * Desconto inválido.
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
       * ======================================================
       * TIMEOUT
       *
       * Não mostramos detalhes técnicos Prisma ao cliente.
       * ======================================================
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
              "A venda contém muitos produtos e demorou mais do que o esperado. Nenhuma alteração foi aplicada. Tente novamente.",
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