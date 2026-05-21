import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

const monthLabels = [
  "january",
  "february",
  "march",
  "april",
  "may",
  "june",
  "july",
  "august",
  "september",
  "october",
  "november",
  "december",
];

type DecimalLike = {
  toString(): string;
};

type SaleItemRow = {
  unitCost: DecimalLike | number | null;
  quantity: number | null;
};

type SaleRow = {
  totalAmount: DecimalLike | number | null;
  items: SaleItemRow[];
};

type CostRow = {
  amount: DecimalLike | number | null;
  category: {
    name: string;
  };
};

type ProfitRow = {
  month: number;
  monthName: string;
  label: string;
  totalSales: number;
  merchandiseCost: number;
  grossProfit: number;
  transport: number;
  salaries: number;
  otherCosts: number;
  netProfit: number;
  margin: number;
};

type ProfitSummary = {
  totalSales: number;
  merchandiseCost: number;
  grossProfit: number;
  transport: number;
  salaries: number;
  otherCosts: number;
  netProfit: number;
};

export async function GET(req: Request) {
  try {
    const session = await requireAdmin();

    const { searchParams } = new URL(req.url);

    const year =
      Number(searchParams.get("year")) || new Date().getFullYear();

    const cantinaId = searchParams.get("cantinaId") || "ALL";

    const cantinas = await prisma.cantina.findMany({
      where: {
        companyId: session.companyId,
      },
      select: {
        id: true,
        name: true,
        code: true,
      },
      orderBy: {
        name: "asc",
      },
    });

    const rows: ProfitRow[] = [];

    for (let month = 0; month < 12; month++) {
      const start = new Date(year, month, 1);

      const end = new Date(year, month + 1, 1);

      const sales = await prisma.sale.findMany({
        where: {
          companyId: session.companyId,

          ...(cantinaId !== "ALL" ? { cantinaId } : {}),

          createdAt: {
            gte: start,
            lt: end,
          },

          status: "COMPLETED",
        },

        include: {
          items: true,
        },
      });

      const totalSales = sales.reduce(
        (sum: number, sale: SaleRow) =>
          sum + Number(sale.totalAmount || 0),
        0
      );

      const merchandiseCost = sales.reduce(
        (saleSum: number, sale: SaleRow) => {
          const itemsCost = sale.items.reduce(
            (itemSum: number, item: SaleItemRow) =>
              itemSum +
              Number(item.unitCost || 0) *
                Number(item.quantity || 0),
            0
          );

          return saleSum + itemsCost;
        },
        0
      );

      const costs = await prisma.cost.findMany({
        where: {
          companyId: session.companyId,

          ...(cantinaId !== "ALL" ? { cantinaId } : {}),

          costDate: {
            gte: start,
            lt: end,
          },

          paymentStatus: "PAID",
        },

        include: {
          category: true,
        },
      });

      let transport = 0;
      let salaries = 0;
      let otherCosts = 0;

      costs.forEach((cost: CostRow) => {
        const name = cost.category.name.toLowerCase();

        const value = Number(cost.amount || 0);

        if (
  name.includes("transporte") ||
  name.includes("transport")
) {
  transport += value;

} else if (
  name.includes("salario") ||
  name.includes("salário") ||
  name.includes("salary")
) {
  salaries += value;

} else if (
  name.includes("mercadoria") ||
  name.includes("achat stock") ||
  name.includes("achat marchandises") ||
  name.includes("purchase") ||
  name.includes("stock")
) {
  // ignorer achat marchandises
}
else {
  otherCosts += value;
}
      });

      const grossProfit = totalSales - merchandiseCost;

      const netProfit =
        grossProfit - transport - salaries - otherCosts ;

      const margin =
        totalSales > 0 ? (netProfit / totalSales) * 100 : 0;

      rows.push({
        month,
        monthName: monthLabels[month],
        label: `${monthLabels[month]} ${year}`,
        totalSales,
        merchandiseCost,
        grossProfit,
        transport,
        salaries,
        otherCosts,
        netProfit,
        margin,
      });
    }

    const summary = rows.reduce(
      (acc: ProfitSummary, row: ProfitRow) => {
        acc.totalSales += row.totalSales;
        acc.merchandiseCost += row.merchandiseCost;
        acc.grossProfit += row.grossProfit;
        acc.transport += row.transport;
        acc.salaries += row.salaries;
        acc.otherCosts += row.otherCosts;
        acc.netProfit += row.netProfit;

        return acc;
      },
      {
        totalSales: 0,
        merchandiseCost: 0,
        grossProfit: 0,
        transport: 0,
        salaries: 0,
        otherCosts: 0,
        netProfit: 0,
      }
    );

    const summaryMargin =
      summary.totalSales > 0
        ? (summary.netProfit / summary.totalSales) * 100
        : 0;

    const topMonths = [...rows]
      .sort((a: ProfitRow, b: ProfitRow) => b.netProfit - a.netProfit)
      .slice(0, 3);

    return NextResponse.json({
      year,
      cantinaId,
      cantinas,
      rows,
      summary: {
        ...summary,
        margin: summaryMargin,
      },
      topMonths,
    });
  } catch (error) {
    console.error("ERRO API LUCROS:", error);

    return NextResponse.json(
      { message: "Erro ao calcular lucros." },
      { status: 500 }
    );
  }
}