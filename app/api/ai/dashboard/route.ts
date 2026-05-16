import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

export async function GET() {
  try {
    const session = await requireAdmin();

    const [totalSales, totalCosts, centralStocks, cantinas, employees] =
      await Promise.all([
        prisma.sale.aggregate({
          where: {
            companyId: session.companyId,
            status: "COMPLETED",
          },
          _sum: {
            totalAmount: true,
          },
        }),

        prisma.cost.aggregate({
          where: {
            companyId: session.companyId,
            paymentStatus: "PAID",
          },
          _sum: {
            amount: true,
          },
        }),

        prisma.centralStock.findMany({
          where: {
            companyId: session.companyId,
          },
          include: {
            product: {
              select: {
                minStock: true,
              },
            },
          },
        }),

        prisma.cantina.count({
          where: {
            companyId: session.companyId,
          },
        }),

        prisma.employee.count({
          where: {
            companyId: session.companyId,
          },
        }),
      ]);

    const lowStock = centralStocks.filter(
      (stock) => stock.quantity <= stock.product.minStock
    ).length;

    const sales = Number(totalSales._sum.totalAmount || 0);
    const costs = Number(totalCosts._sum.amount || 0);
    const profit = sales - costs;

    return NextResponse.json({
      success: true,
      metrics: {
        sales,
        costs,
        profit,
        lowStock,
        cantinas,
        employees,
      },
      reasoning: [
        profit > 0
          ? "A empresa está lucrativa."
          : "A empresa está em perda.",
        lowStock > 0
          ? `${lowStock} produtos estão com stock baixo.`
          : "O stock está estável.",
      ],
      recommendations: [
        "Reforçar os produtos mais vendidos.",
        "Reduzir custos operacionais.",
        "Transferir stock para cantinas com maior procura.",
      ],
    });
  } catch (error) {
    console.error("AI DASHBOARD ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Erro IA dashboard.",
      },
      { status: 500 }
    );
  }
}