import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { transferBatchesFromCentralToCantina } from "@/lib/fifo";

type FifoTx = Parameters<typeof transferBatchesFromCentralToCantina>[0]["tx"];

type TransactionClient = Omit<
  typeof prisma,
  "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends"
>;

type Item = {
  productId: string;
  quantity: number | string;
};

type CleanItem = {
  productId: string;
  quantity: number;
};

type TransferBody = {
  destinationId?: string;
  notes?: string;
  items?: Item[];
};

export async function POST(request: Request) {
  try {
    const session = await requireAdmin();
    const body = (await request.json()) as TransferBody;

    const { destinationId, notes, items } = body;

    if (!destinationId || !items || items.length === 0) {
      return NextResponse.json(
        { message: "Cantina e produtos são obrigatórios." },
        { status: 400 }
      );
    }

    const destination = await prisma.cantina.findFirst({
      where: {
        id: destinationId,
        companyId: session.companyId,
        status: "ACTIVE",
      },
    });

    if (!destination) {
      return NextResponse.json(
        { message: "Cantina não encontrada ou inativa." },
        { status: 404 }
      );
    }

    const cleanItems: CleanItem[] = items.map((item: Item) => ({
      productId: item.productId,
      quantity: Number(item.quantity || 0),
    }));

    const invalidItem = cleanItems.find(
      (item: CleanItem) => !item.productId || item.quantity <= 0
    );

    if (invalidItem) {
      return NextResponse.json(
        { message: "Existe um produto inválido na transferência." },
        { status: 400 }
      );
    }

    const transferNumber = `TRF-${Date.now()}`;

    const transfer = await prisma.$transaction(
      async (tx: TransactionClient) => {
        for (const item of cleanItems) {
          const centralStock = await tx.centralStock.findUnique({
            where: {
              productId: item.productId,
            },
            include: {
              product: true,
            },
          });

          if (!centralStock || centralStock.quantity < item.quantity) {
            throw new Error(
              `Stock insuficiente para o produto ${
                centralStock?.product.name || ""
              }`
            );
          }
        }

        const createdTransfer = await tx.stockTransfer.create({
          data: {
            companyId: session.companyId,
            destinationId,
            responsibleId: session.userId,
            transferNumber,
            status: "COMPLETED",
            notes: notes || null,
            receivedAt: new Date(),
          },
        });

        for (const item of cleanItems) {
          const transferItem = await tx.stockTransferItem.create({
            data: {
              transferId: createdTransfer.id,
              productId: item.productId,
              quantity: item.quantity,
            },
          });

          await transferBatchesFromCentralToCantina({
  tx: tx as unknown as FifoTx,
  companyId: session.companyId,
  productId: item.productId,
  destinationId,
  quantity: item.quantity,
  transferItemId: transferItem.id,
});

          await tx.centralStock.update({
            where: {
              productId: item.productId,
            },
            data: {
              quantity: {
                decrement: item.quantity,
              },
            },
          });

          await tx.cantinaStock.upsert({
            where: {
              cantinaId_productId: {
                cantinaId: destinationId,
                productId: item.productId,
              },
            },
            update: {
              quantity: {
                increment: item.quantity,
              },
            },
            create: {
              companyId: session.companyId,
              cantinaId: destinationId,
              productId: item.productId,
              quantity: item.quantity,
            },
          });

          await tx.stockMovement.create({
            data: {
              companyId: session.companyId,
              productId: item.productId,
              userId: session.userId,
              cantinaId: null,
              type: "TRANSFER_OUT",
              quantity: item.quantity,
              referenceId: createdTransfer.id,
              reason: `Transferência para ${destination.name}`,
            },
          });

          await tx.stockMovement.create({
            data: {
              companyId: session.companyId,
              productId: item.productId,
              userId: session.userId,
              cantinaId: destinationId,
              type: "TRANSFER_IN",
              quantity: item.quantity,
              referenceId: createdTransfer.id,
              reason: "Entrada por transferência FIFO",
            },
          });

          const updatedCentral = await tx.centralStock.findUnique({
            where: {
              productId: item.productId,
            },
            include: {
              product: true,
            },
          });

          if (
            updatedCentral &&
            updatedCentral.quantity <= updatedCentral.product.minStock
          ) {
            const admins = await tx.user.findMany({
              where: {
                companyId: session.companyId,
                role: "ADMIN",
                status: "ACTIVE",
              },
              select: {
                id: true,
              },
            });

            for (const admin of admins) {
              await tx.notification.create({
                data: {
                  companyId: session.companyId,
                  userId: admin.id,
                  type: "STOCK_LOW",
                  title: "Stock baixo",
                  message: `O produto ${updatedCentral.product.name} está com stock baixo no armazém central.`,
                  link: "/stock",
                },
              });
            }
          }
        }

        return createdTransfer;
      },
      {
        maxWait: 10_000,
        timeout: 60_000,
      }
    );

    return NextResponse.json({
      message: "Transferência concluída com sucesso com FIFO.",
      transfer,
    });
  } catch (error) {
    console.error(error);

    if (error instanceof Error) {
      if (error.message === "STOCK_INSUFFICIENT") {
        return NextResponse.json(
          {
            message:
              "Stock FIFO insuficiente no armazém central. O produto tem stock central, mas não tem lotes FIFO suficientes. Faça uma nova entrada/compra ou migre o stock antigo.",
          },
          { status: 400 }
        );
      }

      return NextResponse.json({ message: error.message }, { status: 500 });
    }

    return NextResponse.json(
      { message: "Erro ao transferir stock." },
      { status: 500 }
    );
  }
}