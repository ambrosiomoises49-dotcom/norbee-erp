import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { consumeCantinaFifoForSale } from "@/lib/fifo";

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
  tx: Prisma.TransactionClient
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
    const body = await request.json();

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
      session.role === "ADMIN" ? body.cantinaId : session.cantinaId;

    if (!cantinaId) {
      return NextResponse.json(
        { message: "Escolha uma cantina para realizar a venda." },
        { status: 400 }
      );
    }

    const cantina = await prisma.cantina.findFirst({
      where: {
        id: cantinaId,
        companyId: session.companyId,
        status: "ACTIVE",
      },
    });

    if (!cantina) {
      return NextResponse.json(
        { message: "Cantina inválida ou inativa." },
        { status: 404 }
      );
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { message: "Nenhum produto na venda." },
        { status: 400 }
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      let subtotal = 0;

      const preparedItems: {
        productId: string;
        quantity: number;
        unitPrice: number;
        totalPrice: number;
        minStock: number;
        productName: string;
      }[] = [];

      for (const item of items) {
        const productId = item.productId;
        const quantity = Number(item.quantity || 0);

        if (!productId || quantity <= 0) {
          throw new Error("ITEM_INVALID");
        }

        const stock = await tx.cantinaStock.findUnique({
          where: {
            cantinaId_productId: {
              cantinaId,
              productId,
            },
          },
          include: {
            product: true,
          },
        });

        if (!stock || stock.quantity < quantity) {
          throw new Error(`STOCK_INSUFFICIENT:${stock?.product.name || ""}`);
        }

        const unitPrice = Number(stock.product.salePrice || 0);
        const totalPrice = unitPrice * quantity;

        subtotal += totalPrice;

        preparedItems.push({
          productId,
          quantity,
          unitPrice,
          totalPrice,
          minStock: stock.product.minStock,
          productName: stock.product.name,
        });
      }

      const discount = Math.max(0, Number(discountAmount || 0));

      if (discount > subtotal) {
        throw new Error("DISCOUNT_TOO_HIGH");
      }

      const totalAmount = subtotal - discount;
      const paid = Number(paidAmount || totalAmount);
      const changeAmount = paid - totalAmount;

      if (paid < totalAmount) {
        throw new Error("PAID_AMOUNT_LOW");
      }

      const sale = await tx.sale.create({
        data: {
          companyId: session.companyId,
          cantinaId,
          userId: session.userId,
          saleNumber: generateSaleNumber(),
          subtotal,
          taxAmount: 0,
          totalAmount,
          paidAmount: paid,
          changeAmount,
          paymentMethod: paymentMethod || "CASH",
          status: "COMPLETED",
          customerName: customerName || null,
          customerTaxId: customerTaxId || null,
          notes: notes || null,
        },
      });

      for (const item of preparedItems) {
        const fifoCost = await consumeCantinaFifoForSale({
          tx,
          companyId: session.companyId,
          productId: item.productId,
          cantinaId,
          quantity: item.quantity,
          saleItemId: null,
        });

        const unitCost = fifoCost.unitCost;
        const grossProfit = item.totalPrice - fifoCost.totalCost;

        const saleItem = await tx.saleItem.create({
          data: {
            saleId: sale.id,
            productId: item.productId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            unitCost,
            totalPrice: item.totalPrice,
            grossProfit,
          },
        });

        if (fifoCost.consumptionIds.length > 0) {
          await tx.stockBatchConsumption.updateMany({
            where: {
              id: {
                in: fifoCost.consumptionIds,
              },
              companyId: session.companyId,
            },
            data: {
              saleItemId: saleItem.id,
            },
          });
        }

        const updatedStock = await tx.cantinaStock.update({
          where: {
            cantinaId_productId: {
              cantinaId,
              productId: item.productId,
            },
          },
          data: {
            quantity: {
              decrement: item.quantity,
            },
          },
        });

        await tx.stockMovement.create({
          data: {
            companyId: session.companyId,
            productId: item.productId,
            userId: session.userId,
            cantinaId,
            type: "SALE_OUT",
            quantity: item.quantity,
            reason: "Venda POS FIFO",
            referenceId: sale.id,
          },
        });

        if (updatedStock.quantity <= item.minStock) {
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
                title: "Stock baixo na cantina",
                message: `${item.productName} está com stock baixo após venda.`,
                link: `/cantinas/${cantinaId}`,
              },
            });
          }
        }
      }

      const defaultAccount = await ensureDefaultAccount(session.companyId, tx);

      await tx.financeTransaction.create({
        data: {
          companyId: session.companyId,
          userId: session.userId,
          financialAccountId: defaultAccount.id,
          type: "INCOME",
          amount: totalAmount,
          description: `Venda ${sale.saleNumber}`,
          date: new Date(),
          referenceType: "SALE",
          referenceId: sale.id,
        },
      });

      await tx.financialAccount.update({
        where: {
          id: defaultAccount.id,
        },
        data: {
          balance: {
            increment: totalAmount,
          },
        },
      });

      return sale;
    });

    return NextResponse.json({
      message: "Venda registada com sucesso com FIFO.",
      sale: result,
    });
  } catch (error) {
    console.error(error);

    if (error instanceof Error) {
      if (error.message.startsWith("STOCK_INSUFFICIENT")) {
        const productName = error.message.split(":")[1];

        return NextResponse.json(
          { message: `Stock insuficiente para ${productName}.` },
          { status: 400 }
        );
      }

      if (error.message === "FIFO_STOCK_INSUFFICIENT") {
        return NextResponse.json(
          {
            message:
              "Stock FIFO insuficiente. Este produto tem quantidade na cantina, mas não tem lotes FIFO suficientes.",
          },
          { status: 400 }
        );
      }

      if (error.message === "PAID_AMOUNT_LOW") {
        return NextResponse.json(
          { message: "O valor pago é inferior ao total da venda." },
          { status: 400 }
        );
      }

      if (error.message === "DISCOUNT_TOO_HIGH") {
        return NextResponse.json(
          { message: "O desconto não pode ser superior ao subtotal." },
          { status: 400 }
        );
      }

      if (error.message === "ITEM_INVALID") {
        return NextResponse.json(
          { message: "Existe um item inválido na venda." },
          { status: 400 }
        );
      }
    }

    return NextResponse.json(
      { message: "Erro ao registar venda." },
      { status: 500 }
    );
  }
}