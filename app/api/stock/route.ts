import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

type TransactionClient = Omit<
  typeof prisma,
  "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends"
>;

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
  initialQuantity?: number | string;
};

export async function GET() {
  try {
    const session = await requireAdmin();

    const [products, categories, suppliers, cantinas] = await Promise.all([
      prisma.product.findMany({
        where: { companyId: session.companyId },
        include: {
          category: true,
          supplier: true,
          centralStock: true,
        },
        orderBy: { createdAt: "desc" },
      }),

      prisma.category.findMany({
        where: { companyId: session.companyId },
        orderBy: { name: "asc" },
      }),

      prisma.supplier.findMany({
        where: { companyId: session.companyId },
        orderBy: { name: "asc" },
      }),

      prisma.cantina.findMany({
        where: {
          companyId: session.companyId,
          status: "ACTIVE",
        },
        orderBy: { name: "asc" },
      }),
    ]);

    return NextResponse.json({
      products,
      categories,
      suppliers,
      cantinas,
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
    const body = (await request.json()) as ProductBody;

    const {
      name,
      internalCode,
      barcode,
      unit,
      categoryId,
      supplierId,
      purchasePrice,
      salePrice,
      minStock,
      initialQuantity,
    } = body;

    if (!name || !internalCode) {
      return NextResponse.json(
        { message: "Nome e código interno são obrigatórios." },
        { status: 400 }
      );
    }

    const existing = await prisma.product.findFirst({
      where: {
        companyId: session.companyId,
        internalCode,
      },
    });

    if (existing) {
      return NextResponse.json(
        { message: "Já existe um produto com este código interno." },
        { status: 409 }
      );
    }

    const quantity = Number(initialQuantity || 0);
    const purchasePriceValue = Number(purchasePrice || 0);
    const salePriceValue = Number(salePrice || 0);
    const minStockValue = Number(minStock || 0);

    const product = await prisma.$transaction(
      async (tx: TransactionClient) => {
        const createdProduct = await tx.product.create({
          data: {
            companyId: session.companyId,
            name,
            internalCode,
            barcode: barcode || null,
            unit: unit || "UN",
            categoryId: categoryId || null,
            supplierId: supplierId || null,
            purchasePrice: purchasePriceValue,
            salePrice: salePriceValue,
            minStock: minStockValue,
            status: "ACTIVE",
          },
        });

        await tx.centralStock.create({
          data: {
            companyId: session.companyId,
            productId: createdProduct.id,
            quantity,
            avgCost: purchasePriceValue,
          },
        });

        if (quantity > 0) {
          await tx.stockMovement.create({
            data: {
              companyId: session.companyId,
              productId: createdProduct.id,
              userId: session.userId,
              type: "ADJUSTMENT_IN",
              quantity,
              reason: "Stock inicial do produto",
            },
          });
        }

        if (quantity <= minStockValue) {
          await tx.notification.create({
            data: {
              companyId: session.companyId,
              userId: session.userId,
              type: "STOCK_LOW",
              title: "Stock baixo",
              message: `O produto ${name} está com stock baixo.`,
              link: "/stock",
            },
          });
        }

        return createdProduct;
      }
    );

    return NextResponse.json({
      message: "Produto criado com sucesso.",
      product,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { message: "Erro ao criar produto." },
      { status: 500 }
    );
  }
}