import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

function normalizeCode(code: string) {
  return code.trim().padStart(3, "0");
}

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function monthRange(year: number, monthIndex: number) {
  return {
    gte: new Date(year, monthIndex, 1),
    lt: new Date(year, monthIndex + 1, 1),
  };
}

export async function GET() {
  try {
    const session = await requireAdmin();
    const year = new Date().getFullYear();
    const currentMonth = new Date().getMonth();
    const previousMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const previousYear = currentMonth === 0 ? year - 1 : year;

    const company = await prisma.company.findUnique({
      where: { id: session.companyId },
      select: { slug: true },
    });

    const cantinas = await prisma.cantina.findMany({
      where: { companyId: session.companyId },
      include: {
        user: {
          select: {
            identifier: true,
            status: true,
            lastLoginAt: true,
          },
        },
        _count: {
          select: {
            sales: true,
            employees: true,
            costs: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const cantinaIds = cantinas.map((c) => c.id);

    const [sales, costs] = await Promise.all([
      prisma.sale.findMany({
        where: {
          companyId: session.companyId,
          cantinaId: { in: cantinaIds },
          status: "COMPLETED",
          createdAt: {
            gte: new Date(year, 0, 1),
            lt: new Date(year + 1, 0, 1),
          },
        },
        select: {
          cantinaId: true,
          totalAmount: true,
          createdAt: true,
        },
      }),

      prisma.cost.findMany({
        where: {
          companyId: session.companyId,
          cantinaId: { in: cantinaIds },
          costDate: {
            gte: new Date(year, 0, 1),
            lt: new Date(year + 1, 0, 1),
          },
        },
        select: {
          cantinaId: true,
          amount: true,
          costDate: true,
        },
      }),
    ]);

    const cantinasWithPerformance = cantinas.map((cantina) => {
      const cantinaSales = sales.filter((s) => s.cantinaId === cantina.id);
      const cantinaCosts = costs.filter((c) => c.cantinaId === cantina.id);

      const monthlySales = Array.from({ length: 12 }, (_, monthIndex) =>
        cantinaSales
          .filter((sale) => sale.createdAt.getMonth() === monthIndex)
          .reduce((sum, sale) => sum + Number(sale.totalAmount), 0)
      );

      const currentMonthSales = monthlySales[currentMonth] || 0;

      const previousMonthSales = cantinaSales
        .filter(
          (sale) =>
            sale.createdAt.getFullYear() === previousYear &&
            sale.createdAt.getMonth() === previousMonth
        )
        .reduce((sum, sale) => sum + Number(sale.totalAmount), 0);

      const currentMonthCosts = cantinaCosts
        .filter((cost) => cost.costDate.getMonth() === currentMonth)
        .reduce((sum, cost) => sum + Number(cost.amount), 0);

      const currentMonthProfit = currentMonthSales - currentMonthCosts;

      const growthPercent =
        previousMonthSales > 0
          ? Number(
              (
                ((currentMonthSales - previousMonthSales) /
                  previousMonthSales) *
                100
              ).toFixed(2)
            )
          : 0;

      const dailySales: Record<string, number> = {};

      cantinaSales.forEach((sale) => {
        const key = sale.createdAt.toISOString().slice(0, 10);
        dailySales[key] = (dailySales[key] || 0) + Number(sale.totalAmount);
      });

      return {
        ...cantina,
        performance: {
          currentMonthSales,
          currentMonthCosts,
          currentMonthProfit,
          growthPercent,
          monthlySales,
          dailySales,
        },
      };
    });

    return NextResponse.json({
      companySlug: company?.slug || "millenor",
      cantinas: cantinasWithPerformance,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { message: "Acesso não autorizado." },
      { status: 401 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireAdmin();

    const {
      name,
      code,
      location,
      openingDate,
      openingCash,
      availableMachines,
      password,
    } = await request.json();

    if (!name || !code || !password) {
      return NextResponse.json(
        { message: "Nome, código e senha são obrigatórios." },
        { status: 400 }
      );
    }

    const company = await prisma.company.findUnique({
      where: { id: session.companyId },
      select: { slug: true },
    });

    if (!company) {
      return NextResponse.json(
        { message: "Empresa não encontrada." },
        { status: 404 }
      );
    }

    const normalizedCode = normalizeCode(code);
    const cantinaSlug = slugify(name);
    const identifier = `${cantinaSlug}@${company.slug}`;

    if (!cantinaSlug) {
      return NextResponse.json(
        { message: "Nome da cantina inválido." },
        { status: 400 }
      );
    }

    const existingCantina = await prisma.cantina.findFirst({
      where: {
        companyId: session.companyId,
        code: normalizedCode,
      },
    });

    if (existingCantina) {
      return NextResponse.json(
        { message: "Já existe uma cantina com este código." },
        { status: 409 }
      );
    }

    const existingUser = await prisma.user.findUnique({
      where: { identifier },
    });

    if (existingUser) {
      return NextResponse.json(
        { message: "Esta identificação já está em uso. Altere o nome da cantina." },
        { status: 409 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const result = await prisma.$transaction(async (tx) => {
      const cantina = await tx.cantina.create({
        data: {
          companyId: session.companyId,
          code: normalizedCode,
          name,
          location: location || null,
          openingDate: openingDate ? new Date(openingDate) : null,
          openingCash:
            openingCash === "" || openingCash === null || openingCash === undefined
              ? 0
              : openingCash,
          availableMachines: availableMachines || null,
          status: "ACTIVE",
        },
      });

      const user = await tx.user.create({
        data: {
          companyId: session.companyId,
          cantinaId: cantina.id,
          name: `Conta ${name}`,
          identifier,
          passwordHash,
          role: "EMPLOYEE",
          status: "ACTIVE",
        },
      });

      return { cantina, user };
    });

    return NextResponse.json({
      message: "Cantina criada com sucesso.",
      cantina: result.cantina,
      userIdentifier: result.user.identifier,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { message: "Erro ao criar cantina." },
      { status: 500 }
    );
  }
}