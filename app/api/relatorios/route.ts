import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

type SimpleSaleRow = {
  totalAmount: DecimalLike | number | null;
};
type ReportType =
  | "sales"
  | "purchases"
  | "stock"
  | "costs"
  | "finance"
  | "rh"
  | "profits"
  | "cantinas";

type DecimalLike = {
  toString(): string;
};

type SaleItemRow = {
  unitCost: DecimalLike | number | null;
  quantity: number | null;
};

type SaleRow = {
  id: string;
  createdAt: Date;
  saleNumber: string;
  paymentMethod: string;
  totalAmount: DecimalLike | number | null;
  status: string;
  items: SaleItemRow[];
  cantina?: {
    name: string;
    code: string;
  } | null;
};

type PurchaseRow = {
  id: string;
  createdAt: Date;
  purchaseNumber: string;
  invoiceNumber: string | null;
  totalAmount: DecimalLike | number | null;
  status: string;
  supplier?: {
    name: string;
  } | null;
};

type StockRow = {
  id: string;
  updatedAt: Date;
  quantity: number;
  avgCost: DecimalLike | number | null;
  product: {
    internalCode: string;
    name: string;
    minStock: number;
    category?: {
      name: string;
    } | null;
  };
};

type CostRow = {
  id: string;
  costDate: Date;
  referencePeriod: string | null;
  description: string | null;
  amount: DecimalLike | number | null;
  paymentStatus: string;
  category: {
    name: string;
  };
  cantina?: {
    name: string;
    code: string;
  } | null;
  financialAccount?: {
    name: string;
  } | null;
};

type FinanceRow = {
  id: string;
  date: Date;
  referenceType: string | null;
  description: string | null;
  amount: DecimalLike | number | null;
  type: "INCOME" | "EXPENSE";
  financialAccount?: {
    name: string;
  } | null;
};

type SalaryPaymentRow = {
  id: string;
  paymentDate: Date;
  referenceMonth: string;
  paymentMethod: string;
  amount: DecimalLike | number | null;
  status: string;
  employee?: {
    fullName: string;
    cantina?: {
      name: string;
      code: string;
    } | null;
  } | null;
};

type CantinaReportRow = {
  id: string;
  createdAt: Date;
  code: string;
  name: string;
  location: string | null;
  status: string;
  _count: {
    sales: number;
    employees: number;
    costs: number;
    cantinaStocks: number;
  };
  sales: SimpleSaleRow[];
};

type ReportRow = {
  id: string;
  date: Date;
  number: string;
  cantina: string;
  description: string;
  method: string;
  income: number;
  expense: number;
  total: number;
  status: string;
};

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

function toDate(value: string | null, fallback: Date) {
  return value ? new Date(value) : fallback;
}

function monthStart(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function nextDay(date: Date) {
  const d = new Date(date);
  d.setDate(d.getDate() + 1);
  return d;
}

export async function GET(req: Request) {
  try {
    const session = await requireAdmin();
    const { searchParams } = new URL(req.url);

    const type = (searchParams.get("type") || "sales") as ReportType;
    const today = new Date();

    const startDate = toDate(searchParams.get("startDate"), monthStart(today));
    const endDate = nextDay(toDate(searchParams.get("endDate"), today));
    const cantinaId = searchParams.get("cantinaId") || "ALL";
    const q = (searchParams.get("q") || "").toLowerCase().trim();

    const cantinas = await prisma.cantina.findMany({
      where: { companyId: session.companyId },
      select: { id: true, name: true, code: true },
      orderBy: { name: "asc" },
    });

    if (type === "sales") {
      const sales = await prisma.sale.findMany({
        where: {
          companyId: session.companyId,
          ...(cantinaId !== "ALL" ? { cantinaId } : {}),
          createdAt: { gte: startDate, lt: endDate },
        },
        include: {
          cantina: { select: { name: true, code: true } },
          items: true,
        },
        orderBy: { createdAt: "desc" },
      });

      const rows: ReportRow[] = sales
        .map((sale: SaleRow) => ({
          id: sale.id,
          date: sale.createdAt,
          number: sale.saleNumber,
          cantina: sale.cantina
            ? `${sale.cantina.name} — ${sale.cantina.code}`
            : "-",
          description: `${sale.items.length} item(ns)`,
          method: sale.paymentMethod,
          income: Number(sale.totalAmount || 0),
          expense: 0,
          total: Number(sale.totalAmount || 0),
          status: sale.status,
        }))
        .filter((row: ReportRow) =>
          q
            ? row.number.toLowerCase().includes(q) ||
              row.cantina.toLowerCase().includes(q)
            : true
        );

      const totalIncome = rows.reduce(
        (s: number, r: ReportRow) => s + r.income,
        0
      );

      return NextResponse.json({
        cantinas,
        rows,
        summary: {
          totalIncome,
          totalExpense: 0,
          balance: totalIncome,
          count: rows.length,
        },
      });
    }

    if (type === "purchases") {
      const purchases = await prisma.purchase.findMany({
        where: {
          companyId: session.companyId,
          createdAt: { gte: startDate, lt: endDate },
        },
        include: {
          supplier: true,
          items: true,
        },
        orderBy: { createdAt: "desc" },
      });

      const rows: ReportRow[] = purchases
        .map((purchase: PurchaseRow) => ({
          id: purchase.id,
          date: purchase.createdAt,
          number: purchase.purchaseNumber,
          cantina: "Armazém central",
          description: purchase.supplier?.name || "Compra",
          method: purchase.invoiceNumber || "-",
          income: 0,
          expense: Number(purchase.totalAmount || 0),
          total: Number(purchase.totalAmount || 0),
          status: purchase.status,
        }))
        .filter((row: ReportRow) =>
          q
            ? row.number.toLowerCase().includes(q) ||
              row.description.toLowerCase().includes(q)
            : true
        );

      const totalExpense = rows.reduce(
        (s: number, r: ReportRow) => s + r.expense,
        0
      );

      return NextResponse.json({
        cantinas,
        rows,
        summary: {
          totalIncome: 0,
          totalExpense,
          balance: -totalExpense,
          count: rows.length,
        },
      });
    }

    if (type === "stock") {
      const stocks = await prisma.centralStock.findMany({
        where: {
          companyId: session.companyId,
        },
        include: {
          product: {
            include: {
              category: true,
              supplier: true,
            },
          },
        },
        orderBy: {
          product: { name: "asc" },
        },
      });

      const rows: ReportRow[] = stocks
        .map((stock: StockRow) => {
          const value =
            Number(stock.quantity || 0) * Number(stock.avgCost || 0);

          return {
            id: stock.id,
            date: stock.updatedAt,
            number: stock.product.internalCode,
            cantina: "Armazém central",
            description: stock.product.name,
            method: stock.product.category?.name || "-",
            income: Number(stock.quantity || 0),
            expense: Number(stock.avgCost || 0),
            total: value,
            status:
              stock.quantity <= stock.product.minStock ? "STOCK_LOW" : "OK",
          };
        })
        .filter((row: ReportRow) =>
          q
            ? row.number.toLowerCase().includes(q) ||
              row.description.toLowerCase().includes(q)
            : true
        );

      return NextResponse.json({
        cantinas,
        rows,
        summary: {
          totalIncome: rows.reduce(
            (s: number, r: ReportRow) => s + r.income,
            0
          ),
          totalExpense: 0,
          balance: rows.reduce((s: number, r: ReportRow) => s + r.total, 0),
          count: rows.length,
        },
      });
    }

    if (type === "costs") {
      const costs = await prisma.cost.findMany({
        where: {
          companyId: session.companyId,
          ...(cantinaId !== "ALL" ? { cantinaId } : {}),
          costDate: { gte: startDate, lt: endDate },
        },
        include: {
          category: true,
          cantina: { select: { name: true, code: true } },
          financialAccount: true,
        },
        orderBy: { costDate: "desc" },
      });

      const rows: ReportRow[] = costs
        .map((cost: CostRow) => ({
          id: cost.id,
          date: cost.costDate,
          number: cost.referencePeriod || "-",
          cantina: cost.cantina
            ? `${cost.cantina.name} — ${cost.cantina.code}`
            : "Geral",
          description: cost.description || cost.category.name,
          method: cost.financialAccount?.name || "-",
          income: 0,
          expense: Number(cost.amount || 0),
          total: Number(cost.amount || 0),
          status: cost.paymentStatus,
        }))
        .filter((row: ReportRow) =>
          q
            ? row.description.toLowerCase().includes(q) ||
              row.cantina.toLowerCase().includes(q)
            : true
        );

      const totalExpense = rows.reduce(
        (s: number, r: ReportRow) => s + r.expense,
        0
      );

      return NextResponse.json({
        cantinas,
        rows,
        summary: {
          totalIncome: 0,
          totalExpense,
          balance: -totalExpense,
          count: rows.length,
        },
      });
    }

    if (type === "finance") {
      const transactions = await prisma.financeTransaction.findMany({
        where: {
          companyId: session.companyId,
          date: { gte: startDate, lt: endDate },
        },
        include: {
          financialAccount: true,
        },
        orderBy: { date: "desc" },
      });

      const rows: ReportRow[] = transactions
        .map((tx: FinanceRow) => {
          const amount = Number(tx.amount || 0);
          const isIncome = tx.type === "INCOME";

          return {
            id: tx.id,
            date: tx.date,
            number: tx.referenceType || "-",
            cantina: tx.financialAccount?.name || "-",
            description: tx.description || "Movimento financeiro",
            method: tx.type,
            income: isIncome ? amount : 0,
            expense: isIncome ? 0 : amount,
            total: amount,
            status: tx.type,
          };
        })
        .filter((row: ReportRow) =>
          q
            ? row.description.toLowerCase().includes(q) ||
              row.method.toLowerCase().includes(q)
            : true
        );

      const totalIncome = rows.reduce(
        (s: number, r: ReportRow) => s + r.income,
        0
      );

      const totalExpense = rows.reduce(
        (s: number, r: ReportRow) => s + r.expense,
        0
      );

      return NextResponse.json({
        cantinas,
        rows,
        summary: {
          totalIncome,
          totalExpense,
          balance: totalIncome - totalExpense,
          count: rows.length,
        },
      });
    }

    if (type === "rh") {
      const payments = await prisma.salaryPayment.findMany({
        where: {
          companyId: session.companyId,
          paymentDate: { gte: startDate, lt: endDate },
        },
        include: {
          employee: {
            include: {
              cantina: { select: { name: true, code: true } },
            },
          },
        },
        orderBy: { paymentDate: "desc" },
      });

      const rows: ReportRow[] = payments
        .map((payment: SalaryPaymentRow) => ({
          id: payment.id,
          date: payment.paymentDate,
          number: payment.referenceMonth,
          cantina: payment.employee?.cantina
            ? `${payment.employee.cantina.name} — ${payment.employee.cantina.code}`
            : "Geral",
          description: payment.employee?.fullName || "Salário",
          method: payment.paymentMethod,
          income: 0,
          expense: Number(payment.amount || 0),
          total: Number(payment.amount || 0),
          status: payment.status,
        }))
        .filter((row: ReportRow) =>
          q
            ? row.description.toLowerCase().includes(q) ||
              row.cantina.toLowerCase().includes(q)
            : true
        );

      const totalExpense = rows.reduce(
        (s: number, r: ReportRow) => s + r.expense,
        0
      );

      return NextResponse.json({
        cantinas,
        rows,
        summary: {
          totalIncome: 0,
          totalExpense,
          balance: -totalExpense,
          count: rows.length,
        },
      });
    }

    if (type === "profits") {
      const sales = await prisma.sale.findMany({
        where: {
          companyId: session.companyId,
          ...(cantinaId !== "ALL" ? { cantinaId } : {}),
          createdAt: { gte: startDate, lt: endDate },
          status: "COMPLETED",
        },
        include: { items: true },
      });

      const totalSales = sales.reduce(
        (s: number, sale: SimpleSaleRow) => s + Number(sale.totalAmount || 0),
        0
      );

      const merchandiseCost = sales.reduce(
        (saleSum: number, sale: SaleRow) =>
          saleSum +
          sale.items.reduce(
            (itemSum: number, item: SaleItemRow) =>
              itemSum +
              Number(item.unitCost || 0) * Number(item.quantity || 0),
            0
          ),
        0
      );

      const costs = await prisma.cost.findMany({
        where: {
          companyId: session.companyId,
          ...(cantinaId !== "ALL" ? { cantinaId } : {}),
          costDate: { gte: startDate, lt: endDate },
          paymentStatus: "PAID",
        },
        include: { category: true },
      });

      const operatingCosts = costs.reduce(
        (s: number, c: CostRow) => s + Number(c.amount || 0),
        0
      );

      const grossProfit = totalSales - merchandiseCost;
      const netProfit = grossProfit - operatingCosts;
      const margin = totalSales > 0 ? (netProfit / totalSales) * 100 : 0;

      const rows: ReportRow[] = [
        {
          id: "profit-summary",
          date: startDate,
          number: "LUCRO",
          cantina: cantinaId === "ALL" ? "Todas" : "Cantina filtrada",
          description: "Resumo de lucros do período",
          method: `${margin.toFixed(1)}%`,
          income: totalSales,
          expense: merchandiseCost + operatingCosts,
          total: netProfit,
          status: netProfit >= 0 ? "POSITIVO" : "NEGATIVO",
        },
      ];

      return NextResponse.json({
        cantinas,
        rows,
        summary: {
          totalIncome: totalSales,
          totalExpense: merchandiseCost + operatingCosts,
          balance: netProfit,
          count: rows.length,
        },
      });
    }

    if (type === "cantinas") {
      const data = await prisma.cantina.findMany({
        where: {
          companyId: session.companyId,
          ...(cantinaId !== "ALL" ? { id: cantinaId } : {}),
        },
        include: {
          _count: {
            select: {
              sales: true,
              employees: true,
              costs: true,
              cantinaStocks: true,
            },
          },
          sales: {
            where: {
              createdAt: { gte: startDate, lt: endDate },
            },
          },
        },
        orderBy: { name: "asc" },
      });

      const rows: ReportRow[] = data
        .map((cantina: CantinaReportRow) => {
          const totalSales = cantina.sales.reduce(
            (s: number, sale: SimpleSaleRow) => s + Number(sale.totalAmount || 0),
            0
          );

          return {
            id: cantina.id,
            date: cantina.createdAt,
            number: cantina.code,
            cantina: cantina.name,
            description: `${cantina._count.sales} vendas · ${cantina._count.employees} funcionários`,
            method: cantina.location || "-",
            income: totalSales,
            expense: 0,
            total: totalSales,
            status: cantina.status,
          };
        })
        .filter((row: ReportRow) =>
          q
            ? row.cantina.toLowerCase().includes(q) ||
              row.number.toLowerCase().includes(q)
            : true
        );

      const totalIncome = rows.reduce(
        (s: number, r: ReportRow) => s + r.income,
        0
      );

      return NextResponse.json({
        cantinas,
        rows,
        summary: {
          totalIncome,
          totalExpense: 0,
          balance: totalIncome,
          count: rows.length,
        },
      });
    }

    return NextResponse.json(
      { message: "Tipo de relatório inválido." },
      { status: 400 }
    );
  } catch (error) {
    console.error("ERRO API RELATÓRIOS:", error);

    return NextResponse.json(
      { message: "Erro ao gerar relatório." },
      { status: 500 }
    );
  }
}