import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

import { requireAdmin } from "@/lib/auth";

type ReportType =

  | "sales"

  | "purchases"

  | "stock"

  | "costs"

  | "finance"

  | "rh"

  | "profits"

  | "cantinas";

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

    const startDate = toDate(

      searchParams.get("startDate"),

      monthStart(today)

    );

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

      const rows = sales

        .map((sale) => ({

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

        .filter((row) =>

          q

            ? row.number.toLowerCase().includes(q) ||

              row.cantina.toLowerCase().includes(q)

            : true

        );

      const summary = {

        totalIncome: rows.reduce((s, r) => s + r.income, 0),

        totalExpense: 0,

        balance: rows.reduce((s, r) => s + r.income, 0),

        count: rows.length,

      };

      return NextResponse.json({ cantinas, rows, summary });

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

      const rows = purchases

        .map((purchase) => ({

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

        .filter((row) =>

          q

            ? row.number.toLowerCase().includes(q) ||

              row.description.toLowerCase().includes(q)

            : true

        );

      const summary = {

        totalIncome: 0,

        totalExpense: rows.reduce((s, r) => s + r.expense, 0),

        balance: -rows.reduce((s, r) => s + r.expense, 0),

        count: rows.length,

      };

      return NextResponse.json({ cantinas, rows, summary });

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

      const rows = stocks

        .map((stock) => {

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

              stock.quantity <= stock.product.minStock

                ? "STOCK_LOW"

                : "OK",

          };

        })

        .filter((row) =>

          q

            ? row.number.toLowerCase().includes(q) ||

              row.description.toLowerCase().includes(q)

            : true

        );

      const summary = {

        totalIncome: rows.reduce((s, r) => s + r.income, 0),

        totalExpense: 0,

        balance: rows.reduce((s, r) => s + r.total, 0),

        count: rows.length,

      };

      return NextResponse.json({ cantinas, rows, summary });

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

      const rows = costs

        .map((cost) => ({

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

        .filter((row) =>

          q

            ? row.description.toLowerCase().includes(q) ||

              row.cantina.toLowerCase().includes(q)

            : true

        );

      const summary = {

        totalIncome: 0,

        totalExpense: rows.reduce((s, r) => s + r.expense, 0),

        balance: -rows.reduce((s, r) => s + r.expense, 0),

        count: rows.length,

      };

      return NextResponse.json({ cantinas, rows, summary });

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

      const rows = transactions

        .map((tx) => {

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

        .filter((row) =>

          q

            ? row.description.toLowerCase().includes(q) ||

              row.method.toLowerCase().includes(q)

            : true

        );

      const summary = {

        totalIncome: rows.reduce((s, r) => s + r.income, 0),

        totalExpense: rows.reduce((s, r) => s + r.expense, 0),

        balance:

          rows.reduce((s, r) => s + r.income, 0) -

          rows.reduce((s, r) => s + r.expense, 0),

        count: rows.length,

      };

      return NextResponse.json({ cantinas, rows, summary });

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

      const rows = payments

        .map((payment) => ({

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

        .filter((row) =>

          q

            ? row.description.toLowerCase().includes(q) ||

              row.cantina.toLowerCase().includes(q)

            : true

        );

      const summary = {

        totalIncome: 0,

        totalExpense: rows.reduce((s, r) => s + r.expense, 0),

        balance: -rows.reduce((s, r) => s + r.expense, 0),

        count: rows.length,

      };

      return NextResponse.json({ cantinas, rows, summary });

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

        (s, sale) => s + Number(sale.totalAmount || 0),

        0

      );

      const merchandiseCost = sales.reduce((saleSum, sale) => {

        return (

          saleSum +

          sale.items.reduce(

            (itemSum, item) =>

              itemSum +

              Number(item.unitCost || 0) * Number(item.quantity || 0),

            0

          )

        );

      }, 0);

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

        (s, c) => s + Number(c.amount || 0),

        0

      );

      const grossProfit = totalSales - merchandiseCost;

      const netProfit = grossProfit - operatingCosts;

      const margin = totalSales > 0 ? (netProfit / totalSales) * 100 : 0;

      const rows = [

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

      const summary = {

        totalIncome: totalSales,

        totalExpense: merchandiseCost + operatingCosts,

        balance: netProfit,

        count: rows.length,

      };

      return NextResponse.json({ cantinas, rows, summary });

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

      const rows = data

        .map((cantina) => {

          const totalSales = cantina.sales.reduce(

            (s, sale) => s + Number(sale.totalAmount || 0),

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

        .filter((row) =>

          q

            ? row.cantina.toLowerCase().includes(q) ||

              row.number.toLowerCase().includes(q)

            : true

        );

      const summary = {

        totalIncome: rows.reduce((s, r) => s + r.income, 0),

        totalExpense: 0,

        balance: rows.reduce((s, r) => s + r.income, 0),

        count: rows.length,

      };

      return NextResponse.json({ cantinas, rows, summary });

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