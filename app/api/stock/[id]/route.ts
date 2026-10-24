import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { repairZeroCostTransferBatches } from "@/lib/fifo";

type ProductBody = {
  name?: string;
  internalCode?: string;
  barcode?: string;
  unit?: string;
  categoryId?: string | null;
  supplierId?: string | null;
  purchasePrice?: number | string;
  salePrice?: number | string;
  minStock?: number | string;
};

type TransactionClient = Omit<
  typeof prisma,
  "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends"
>;

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAdmin();
    const { id } = await params;

    const body = (await request.json()) as ProductBody;

    /*
     * ============================================================
     * VERIFICAR PRODUTO
     * ============================================================
     */

    const product = await prisma.product.findFirst({
      where: {
        id,
        companyId: session.companyId,
      },
    });

    if (!product) {
      return NextResponse.json(
        {
          message: "Produto não encontrado.",
        },
        {
          status: 404,
        }
      );
    }

    /*
     * ============================================================
     * ATUALIZAÇÃO + REPARAÇÃO FIFO
     *
     * Tudo acontece na mesma transação.
     *
     * A reparação NÃO altera todos os lotes.
     *
     * Só poderá alterar lotes:
     *
     * - desta empresa
     * - deste produto
     * - numa cantina
     * - sourceType = TRANSFER_IN
     * - remainingQuantity > 0
     * - unitCost = 0
     * - com lote central de origem válido
     * - cujo lote central tenha custo > 0
     *
     * ============================================================
     */

    const result = await prisma.$transaction(
      async (tx: TransactionClient) => {
        const updatedProduct =
          await tx.product.update({
            where: {
              id,
            },

            data: {
              name: body.name,

              internalCode:
                body.internalCode,

              barcode:
                body.barcode || null,

              unit:
                body.unit || "UN",

              categoryId:
                body.categoryId || null,

              supplierId:
                body.supplierId || null,

              purchasePrice:
                Number(
                  body.purchasePrice || 0
                ),

              salePrice:
                Number(
                  body.salePrice || 0
                ),

              minStock:
                Number(
                  body.minStock || 0
                ),
            },
          });

        /*
         * ========================================================
         * REPARAR EVENTUAIS TRANSFERÊNCIAS COM CUSTO ZERO
         *
         * Importante:
         *
         * Não utilizamos purchasePrice para inventar o custo.
         *
         * repairZeroCostTransferBatches procura o lote central
         * através de sourceId e copia o custo FIFO real da origem.
         *
         * Isto também permite reparar produtos que JÁ tiveram
         * o preço corrigido anteriormente.
         * ========================================================
         */

        const fifoRepair =
          await repairZeroCostTransferBatches({
            tx,
            companyId:
              session.companyId,

            productId:
              id,
          });

        return {
          updatedProduct,
          fifoRepair,
        };
      }
    );

    return NextResponse.json({
      message:
        "Produto atualizado com sucesso.",

      product:
        result.updatedProduct,

      fifoRepair:
        result.fifoRepair,
    });
  } catch (error) {
    console.error(
      "ERRO AO EDITAR PRODUTO:",
      error
    );

    return NextResponse.json(
      {
        message:
          "Erro ao editar produto.",
      },
      {
        status: 500,
      }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAdmin();
    const { id } = await params;

    const product =
      await prisma.product.findFirst({
        where: {
          id,
          companyId:
            session.companyId,
        },

        include: {
          saleItems: true,
          purchaseItems: true,
          transferItems: true,
          stockMovements: true,
        },
      });

    if (!product) {
      return NextResponse.json(
        {
          message:
            "Produto não encontrado.",
        },
        {
          status: 404,
        }
      );
    }

    const hasHistory =
      product.saleItems.length > 0 ||
      product.purchaseItems.length > 0 ||
      product.transferItems.length > 0 ||
      product.stockMovements.length > 0;

    /*
     * Se o produto possui histórico,
     * preservamos os relatórios.
     */
    if (hasHistory) {
      await prisma.product.update({
        where: {
          id,
        },

        data: {
          status: "INACTIVE",
        },
      });

      return NextResponse.json({
        message:
          "Produto já tem histórico. Ele foi desativado para preservar os relatórios.",
      });
    }

    /*
     * Produto sem histórico:
     * pode ser eliminado definitivamente.
     */
    await prisma.$transaction(
      async (tx: TransactionClient) => {
        await tx.centralStock.deleteMany({
          where: {
            productId: id,
            companyId:
              session.companyId,
          },
        });

        await tx.cantinaStock.deleteMany({
          where: {
            productId: id,
            companyId:
              session.companyId,
          },
        });

        await tx.product.delete({
          where: {
            id,
          },
        });
      }
    );

    return NextResponse.json({
      message:
        "Produto apagado definitivamente.",
    });
  } catch (error) {
    console.error(
      "ERRO AO APAGAR PRODUTO:",
      error
    );

    return NextResponse.json(
      {
        message:
          "Erro ao apagar produto.",
      },
      {
        status: 500,
      }
    );
  }
}