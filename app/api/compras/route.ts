import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

function generatePurchaseNumber() {
  return `CMP-${Date.now()}`;
}

export async function GET() {
  try {
    const session = await requireAdmin();

    const [purchases, suppliers, products] = await Promise.all([
      prisma.purchase.findMany({
        where: { companyId: session.companyId },
        include: {
          supplier: true,
          items: {
            include: {
              product: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      }),

      prisma.supplier.findMany({
        where: {
          companyId: session.companyId,
          status: "ACTIVE",
        },
        orderBy: { name: "asc" },
      }),

      prisma.product.findMany({
        where: {
          companyId: session.companyId,
          status: "ACTIVE",
        },
        include: {
          centralStock: true,
        },
        orderBy: { name: "asc" },
      }),
    ]);

    return NextResponse.json({
      purchases,
      suppliers,
      products,
    });
  } catch {
    return NextResponse.json(
      { message: "Acesso não autorizado." },
      { status: 401 }
    );
  }
}

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

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { message: "Adicione pelo menos um produto à compra." },
        { status: 400 }
      );
    }

    const cleanItems = items
      .filter(
        (item) =>
          item.productId &&
          Number(item.quantity) > 0 &&
          Number(item.unitCost) >= 0
      )
      .map((item) => ({
        productId: item.productId,
        quantity: Number(item.quantity),
        unitCost: Number(item.unitCost),
        totalCost: Number(item.quantity) * Number(item.unitCost),
      }));

    if (cleanItems.length === 0) {
      return NextResponse.json(
        { message: "Os produtos da compra são inválidos." },
        { status: 400 }
      );
    }

    const subtotal = cleanItems.reduce((sum, item) => sum + item.totalCost, 0);
    const transport = Number(transportCost || 0);
    const others = Number(otherCosts || 0);
    const totalAmount = subtotal + transport + others;
    const extraCosts = transport + others;

    const purchaseNumber = generatePurchaseNumber();
    const finalStatus = status || "RECEIVED";
    const date = purchaseDate ? new Date(purchaseDate) : new Date();

    const purchase = await prisma.$transaction(async (tx) => {
      const createdPurchase = await tx.purchase.create({
        data: {
          companyId: session.companyId,
          supplierId: supplierId || null,
          purchaseNumber,
          invoiceNumber: invoiceNumber || null,
          purchaseDate: date,
          subtotal,
          transportCost: transport,
          otherCosts: others,
          totalAmount,
          status: finalStatus,
          notes: notes || null,
          items: {
            create: cleanItems.map((item) => ({
              productId: item.productId,
              quantity: item.quantity,
              unitCost: item.unitCost,
              totalCost: item.totalCost,
            })),
          },
        },
        include: {
          items: true,
        },
      });

      if (finalStatus === "RECEIVED") {
        for (const item of cleanItems) {
          await tx.centralStock.upsert({
            where: {
              productId: item.productId,
            },
            update: {
              quantity: {
                increment: item.quantity,
              },
              avgCost: item.unitCost,
            },
            create: {
              companyId: session.companyId,
              productId: item.productId,
              quantity: item.quantity,
              avgCost: item.unitCost,
            },
          });

          await tx.product.update({
            where: {
              id: item.productId,
            },
            data: {
              purchasePrice: item.unitCost,
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
              referenceId: createdPurchase.id,
            },
          });
        }

        await tx.financeTransaction.create({
          data: {
            companyId: session.companyId,
            userId: session.userId,
            type: "EXPENSE",
            amount: totalAmount,
            description: `Compra ${purchaseNumber}`,
            date,
            referenceType: "PURCHASE",
            referenceId: createdPurchase.id,
          },
        });

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

          await tx.cost.create({
            data: {
              companyId: session.companyId,
              cantinaId: null,
              categoryId: category.id,
              description: `Custos adicionais da compra ${purchaseNumber}`,
              amount: extraCosts,
              costDate: date,
              isAutomatic: true,
            },
          });
        }
      }

      return createdPurchase;
    });

    return NextResponse.json({
      message: "Compra registada com sucesso.",
      purchase,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { message: "Erro ao registar compra." },
      { status: 500 }
    );
  }
}