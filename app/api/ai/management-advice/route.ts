import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

export async function GET() {
  try {
    const session = await requireAuth();

    const company = await prisma.company.findUnique({
      where: { id: session.companyId },
      select: {
        id: true,
        currency: true,
        language: true,
      },
    });

    const products = await prisma.product.findMany({
      where: {
        companyId: session.companyId,
        status: "ACTIVE",
      },
      include: {
        category: true,
        centralStock: true,
        saleItems: {
          include: {
            sale: true,
          },
        },
      },
    });

    const now = new Date();

    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(now.getDate() - 7);

    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(now.getDate() - 30);

    const aiProducts = products.map((product) => {
      const salesLast7Days = product.saleItems
        .filter((item) => new Date(item.sale.createdAt) >= sevenDaysAgo)
        .reduce((sum, item) => sum + Number(item.quantity || 0), 0);

      const salesLast30Days = product.saleItems
        .filter((item) => new Date(item.sale.createdAt) >= thirtyDaysAgo)
        .reduce((sum, item) => sum + Number(item.quantity || 0), 0);

      return {
        id: product.id,
        name: product.name,
        internal_code: product.internalCode,
        category: product.category?.name || null,
        current_stock: Number(product.centralStock?.quantity || 0),
        min_stock: Number(product.minStock || 0),
        purchase_price: Number(product.purchasePrice || 0),
        sale_price: Number(product.salePrice || 0),
        sales_last_7_days: salesLast7Days,
        sales_last_30_days: salesLast30Days,
      };
    });

    const aiUrl = process.env.AI_SERVICE_URL;

    if (!aiUrl) {
      return NextResponse.json(
        { message: "AI_SERVICE_URL não configurado." },
        { status: 500 }
      );
    }

    const response = await fetch(`${aiUrl}/ai/business-analysis`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        company_id: session.companyId,
        currency: company?.currency || "AOA",
        lang: company?.language || "pt",
        products: aiProducts,
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { message: "Erro ao consultar IA.", error: result },
        { status: 500 }
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("ERRO IA:", error);

    return NextResponse.json(
      {
        message: "Erro interno ao executar análise IA.",
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}