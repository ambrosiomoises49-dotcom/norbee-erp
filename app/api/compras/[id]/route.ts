import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

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


type PurchaseItem = {
  productId: string;
  quantity: number;
  unitCost: DecimalValue | number;
};
type DecimalValue = {
  toString(): string;
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

async function receivePurchase(
  tx: TransactionClient,
  purchase: PurchaseData,
  session: AdminSession
) {
  for (const item of purchase.items) {
    await tx.centralStock.upsert({
      where: {
        productId: item.productId,
      },
      update: {
        quantity: {
          increment: item.quantity,
        },
        avgCost: Number(item.unitCost),
      },
      create: {
        companyId: session.companyId,
        productId: item.productId,
        quantity: item.quantity,
        avgCost: Number(item.unitCost),
      },
    });

    await tx.product.update({
      where: {
        id: item.productId,
      },
      data: {
        purchasePrice: Number(item.unitCost),
      },
    });

    await tx.stockMovement.create({
      data: {
        companyId: session.companyId,
        productId: item.productId,
        userId: session.userId,
        cantinaId: null,
        type: "PURCHASE_IN",
        quantity: item.quantity,
        reason: "Entrada por compra",
        referenceId: purchase.id,
      },
    });
  }

  await tx.financeTransaction.create({
    data: {
      companyId: session.companyId,
      userId: session.userId,
      type: "EXPENSE",
      amount: Number(purchase.totalAmount),
      description: `Compra ${purchase.purchaseNumber}`,
      date: purchase.purchaseDate,
      referenceType: "PURCHASE",
      referenceId: purchase.id,
    },
  });

  const extraCosts =
    Number(purchase.transportCost || 0) +
    Number(purchase.otherCosts || 0);

  if (extraCosts > 0) {
    const category = await tx.costCategory.upsert({
      where: {
        companyId_name: {
          companyId: session.companyId,
          name: "Custos associados a compras",
        },
      },
      update: {},
      create: {
        companyId: session.companyId,
        name: "Custos associados a compras",
        description:
          "Custos automáticos ligados a compras: transporte, descarga, taxas e outros encargos.",
        isSystem: true,
      },
    });

    const existingCost = await tx.cost.findFirst({
      where: {
        companyId: session.companyId,
        isAutomatic: true,
        description: `Custos adicionais da compra ${purchase.purchaseNumber}`,
      },
    });

    if (!existingCost) {
      await tx.cost.create({
        data: {
          companyId: session.companyId,
          cantinaId: null,
          categoryId: category.id,
          description: `Custos adicionais da compra ${purchase.purchaseNumber}`,
          amount: extraCosts,
          costDate: purchase.purchaseDate,
          isAutomatic: true,
        },
      });
    }
  }
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = (await requireAdmin()) as AdminSession;
    const { id } = await params;

    const purchase = await prisma.purchase.findFirst({
      where: {
        id,
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
    });

    if (!purchase) {
      return NextResponse.json(
        { message: "Compra não encontrada." },
        { status: 404 }
      );
    }

    return NextResponse.json({ purchase });
  } catch {
    return NextResponse.json(
      { message: "Acesso não autorizado." },
      { status: 401 }
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = (await requireAdmin()) as AdminSession;
    const { id } = await params;
    const body = await request.json();

    const purchase = await prisma.purchase.findFirst({
      where: {
        id,
        companyId: session.companyId,
      },
      include: {
        items: true,
      },
    });

    if (!purchase) {
      return NextResponse.json(
        { message: "Compra não encontrada." },
        { status: 404 }
      );
    }

    if (purchase.status === "RECEIVED") {
      return NextResponse.json(
        {
          message:
            "Esta compra já foi recebida e já atualizou o stock. Não pode ser editada.",
        },
        { status: 400 }
      );
    }

    if (body.status === "RECEIVED") {
      const updatedPurchase = await prisma.$transaction(
        async (tx: TransactionClient) => {
          const updated = await tx.purchase.update({
            where: { id },
            data: {
              status: "RECEIVED",
              invoiceNumber:
                body.invoiceNumber ?? purchase.invoiceNumber,
              notes: body.notes ?? purchase.notes,
            },
            include: {
              items: true,
            },
          });

          await receivePurchase(tx, updated, session);

          return updated;
        }
      );

      return NextResponse.json({
        message:
          "Compra recebida, stock atualizado e custos adicionais registados.",
        purchase: updatedPurchase,
      });
    }

    const updatedPurchase = await prisma.purchase.update({
      where: { id },
      data: {
        invoiceNumber: body.invoiceNumber ?? undefined,
        notes: body.notes ?? undefined,
        status: body.status ?? undefined,
      },
    });

    return NextResponse.json({
      message: "Compra atualizada com sucesso.",
      purchase: updatedPurchase,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { message: "Erro ao atualizar compra." },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = (await requireAdmin()) as AdminSession;
    const { id } = await params;

    const purchase = await prisma.purchase.findFirst({
      where: {
        id,
        companyId: session.companyId,
      },
    });

    if (!purchase) {
      return NextResponse.json(
        { message: "Compra não encontrada." },
        { status: 404 }
      );
    }

    if (purchase.status === "RECEIVED") {
      return NextResponse.json(
        {
          message:
            "Compra recebida não pode ser apagada, porque já atualizou o stock.",
        },
        { status: 400 }
      );
    }

    await prisma.purchase.delete({
      where: { id },
    });

    return NextResponse.json({
      message: "Compra apagada com sucesso.",
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { message: "Erro ao apagar compra." },
      { status: 500 }
    );
  }
}