import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { createCentralBatch } from "@/lib/fifo";

type AdminSession = {
  userId: string;
  companyId: string;
  role: "ADMIN" | "EMPLOYEE";
  cantinaId?: string | null;
  identifier: string;
};

type TransactionClient = Omit<
  typeof prisma,
  "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends"
>;

type FifoTx = Parameters<typeof createCentralBatch>[0]["tx"];

type DecimalValue = {
  toString(): string;
};

type PurchaseItem = {
  id: string;
  productId: string;
  quantity: number;
  unitCost: DecimalValue | number;
};

type PurchaseData = {
  id: string;
  purchaseNumber: string;
  purchaseDate: Date;
  totalAmount: DecimalValue;
  transportCost?: DecimalValue | number | null;
  otherCosts?: DecimalValue | number | null;
  items: PurchaseItem[];
};

/*
 * ============================================================
 * RECEBER FISICAMENTE UMA COMPRA PENDENTE
 *
 * IMPORTANTE:
 *
 * Esta função NÃO mexe no financeiro.
 *
 * O pagamento já foi registado no momento em que a compra
 * foi criada.
 *
 * Aqui fazemos apenas:
 *
 * - FIFO
 * - CentralStock
 * - purchasePrice
 * - PURCHASE_IN
 * ============================================================
 */

async function receivePurchase(
  tx: TransactionClient,
  purchase: PurchaseData,
  session: AdminSession
) {
  for (const item of purchase.items) {
    /*
     * --------------------------------------------------------
     * 1. CRIAR LOTE FIFO
     * --------------------------------------------------------
     */

    await createCentralBatch({
      tx: tx as unknown as FifoTx,

      companyId: session.companyId,

      productId: item.productId,

      quantity: item.quantity,

      unitCost: Number(item.unitCost),

      sourceType: "PURCHASE",

      sourceId: purchase.id,

      purchaseItemId: item.id,
    });

    /*
     * --------------------------------------------------------
     * 2. STOCK CENTRAL
     *
     * Mantemos o cálculo do custo médio.
     * --------------------------------------------------------
     */

    const currentStock = await tx.centralStock.findUnique({
      where: {
        productId: item.productId,
      },
    });

    if (currentStock) {
      const oldQty = currentStock.quantity;

      const oldAvg = Number(
        currentStock.avgCost || 0
      );

      const newQty =
        oldQty + item.quantity;

      const unitCost =
        Number(item.unitCost);

      const newAvgCost =
        newQty > 0
          ? (
              oldQty * oldAvg +
              item.quantity * unitCost
            ) / newQty
          : unitCost;

      await tx.centralStock.update({
        where: {
          productId: item.productId,
        },

        data: {
          quantity: newQty,
          avgCost: newAvgCost,
        },
      });
    } else {
      await tx.centralStock.create({
        data: {
          companyId: session.companyId,

          productId: item.productId,

          quantity: item.quantity,

          avgCost: Number(
            item.unitCost
          ),
        },
      });
    }

    /*
     * --------------------------------------------------------
     * 3. ATUALIZAR PREÇO DE COMPRA DO PRODUTO
     * --------------------------------------------------------
     */

    await tx.product.update({
      where: {
        id: item.productId,
      },

      data: {
        purchasePrice:
          Number(item.unitCost),
      },
    });

    /*
     * --------------------------------------------------------
     * 4. MOVIMENTO DE STOCK
     * --------------------------------------------------------
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
          "Receção de compra pendente com lote FIFO",

        referenceId:
          purchase.id,
      },
    });
  }

  /*
   * ==========================================================
   * MUITO IMPORTANTE
   *
   * NÃO EXISTE AQUI:
   *
   * financeTransaction.create()
   * cost.create()
   * financialAccount.update()
   *
   * porque a compra já foi paga quando foi criada.
   * ==========================================================
   */
}

/*
 * ============================================================
 * GET
 * ============================================================
 */

export async function GET(
  request: Request,
  {
    params,
  }: {
    params: Promise<{
      id: string;
    }>;
  }
) {
  try {
    const session =
      (await requireAdmin()) as AdminSession;

    const { id } =
      await params;

    const purchase =
      await prisma.purchase.findFirst({
        where: {
          id,

          companyId:
            session.companyId,
        },

        include: {
          supplier: true,

          items: {
            include: {
              product: true,
            },
          },
        },
      });

    if (!purchase) {
      return NextResponse.json(
        {
          message:
            "Compra não encontrada.",
        },
        {
          status: 404,
        }
      );
    }

    return NextResponse.json({
      purchase,
    });
  } catch {
    return NextResponse.json(
      {
        message:
          "Acesso não autorizado.",
      },
      {
        status: 401,
      }
    );
  }
}

/*
 * ============================================================
 * PATCH
 * ============================================================
 */

export async function PATCH(
  request: Request,
  {
    params,
  }: {
    params: Promise<{
      id: string;
    }>;
  }
) {
  try {
    const session =
      (await requireAdmin()) as AdminSession;

    const { id } =
      await params;

    const body =
      await request.json();

    /*
     * --------------------------------------------------------
     * Buscar compra
     * --------------------------------------------------------
     */

    const purchase =
      await prisma.purchase.findFirst({
        where: {
          id,

          companyId:
            session.companyId,
        },

        include: {
          items: true,
        },
      });

    if (!purchase) {
      return NextResponse.json(
        {
          message:
            "Compra não encontrada.",
        },
        {
          status: 404,
        }
      );
    }

    /*
     * --------------------------------------------------------
     * Compra já recebida
     * --------------------------------------------------------
     */

    if (
      purchase.status ===
      "RECEIVED"
    ) {
      return NextResponse.json(
        {
          message:
            "Esta compra já foi recebida e já atualizou o stock. Não pode ser editada.",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * ========================================================
     * PENDING → RECEIVED
     *
     * Aqui recebemos fisicamente a mercadoria.
     *
     * NÃO fazemos novo pagamento.
     * ========================================================
     */

    if (
      body.status ===
      "RECEIVED"
    ) {
      const updatedPurchase =
        await prisma.$transaction(
          async (
            tx: TransactionClient
          ) => {
            /*
             * Primeiro:
             * recebemos fisicamente os produtos.
             */

            await receivePurchase(
              tx,
              purchase,
              session
            );

            /*
             * Só depois de todo o stock ter sido
             * processado alteramos para RECEIVED.
             *
             * Assim, se alguma operação falhar,
             * a transação inteira faz rollback.
             */

            const updated =
              await tx.purchase.update({
                where: {
                  id,
                },

                data: {
                  status:
                    "RECEIVED",

                  invoiceNumber:
                    body.invoiceNumber ??
                    purchase.invoiceNumber,

                  notes:
                    body.notes ??
                    purchase.notes,
                },

                include: {
                  items: true,
                },
              });

            return updated;
          },

          /*
           * Mantemos um timeout maior para
           * compras com muitos produtos.
           */

          {
            maxWait: 10_000,
            timeout: 60_000,
          }
        );

      return NextResponse.json({
        message:
          "Compra recebida com sucesso. Stock e lotes FIFO atualizados sem novo débito financeiro.",

        purchase:
          updatedPurchase,
      });
    }

    /*
     * ========================================================
     * OUTRAS ALTERAÇÕES
     *
     * PENDING continua PENDING
     * ou CANCELLED
     *
     * Não mexemos em stock nem financeiro.
     * ========================================================
     */

    const updatedPurchase =
      await prisma.purchase.update({
        where: {
          id,
        },

        data: {
          invoiceNumber:
            body.invoiceNumber ??
            undefined,

          notes:
            body.notes ??
            undefined,

          status:
            body.status ??
            undefined,
        },
      });

    return NextResponse.json({
      message:
        "Compra atualizada com sucesso.",

      purchase:
        updatedPurchase,
    });
  } catch (error) {
    console.error(
      "ERRO AO ATUALIZAR COMPRA:",
      error
    );

    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "Erro ao atualizar compra.",
      },
      {
        status: 500,
      }
    );
  }
}

/*
 * ============================================================
 * DELETE
 * ============================================================
 */

export async function DELETE(
  request: Request,
  {
    params,
  }: {
    params: Promise<{
      id: string;
    }>;
  }
) {
  try {
    const session =
      (await requireAdmin()) as AdminSession;

    const { id } =
      await params;

    const purchase =
      await prisma.purchase.findFirst({
        where: {
          id,

          companyId:
            session.companyId,
        },
      });

    if (!purchase) {
      return NextResponse.json(
        {
          message:
            "Compra não encontrada.",
        },
        {
          status: 404,
        }
      );
    }

    /*
     * Compra recebida não pode ser apagada.
     */

    if (
      purchase.status ===
      "RECEIVED"
    ) {
      return NextResponse.json(
        {
          message:
            "Compra recebida não pode ser apagada, porque já atualizou o stock.",
        },
        {
          status: 400,
        }
      );
    }

    await prisma.purchase.delete({
      where: {
        id,
      },
    });

    return NextResponse.json({
      message:
        "Compra apagada com sucesso.",
    });
  } catch (error) {
    console.error(
      "ERRO AO APAGAR COMPRA:",
      error
    );

    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "Erro ao apagar compra.",
      },
      {
        status: 500,
      }
    );
  }
}