import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

type TransactionClient = Omit<
  typeof prisma,
  "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends"
>;

type CostBody = {
  categoryId?: string;
  cantinaId?: string | null;
  amount?: number | string;
  costDate?: string;
  referencePeriod?: string;
  description?: string;
  financialAccountId?: string;
};

export async function GET() {
  try {
    const session = await requireAdmin();

    const [costs, categories, cantinas, financialAccounts] = await Promise.all([
      prisma.cost.findMany({
        where: { companyId: session.companyId },
        include: {
          category: true,
          cantina: {
            select: {
              id: true,
              name: true,
              code: true,
            },
          },
          financialAccount: true,
        },
        orderBy: {
          costDate: "desc",
        },
      }),

      prisma.costCategory.findMany({
        where: { companyId: session.companyId },
        orderBy: { name: "asc" },
      }),

      prisma.cantina.findMany({
        where: { companyId: session.companyId },
        select: {
          id: true,
          name: true,
          code: true,
        },
        orderBy: { name: "asc" },
      }),

      prisma.financialAccount.findMany({
        where: {
          companyId: session.companyId,
          status: "ACTIVE",
        },
        orderBy: { createdAt: "asc" },
      }),
    ]);

    return NextResponse.json({
      costs,
      categories,
      cantinas,
      financialAccounts,
    });
  } catch (error) {
    console.error("ERRO API CUSTOS GET:", error);

    return NextResponse.json(
      { message: "Erro ao carregar custos." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireAdmin();

    const body = (await request.json()) as CostBody;

    const {
      categoryId,
      cantinaId,
      amount,
      costDate,
      referencePeriod,
      description,
      financialAccountId,
    } = body;

    if (!categoryId || !amount || !financialAccountId) {
      return NextResponse.json(
        {
          message:
            "Categoria, valor e conta financeira são obrigatórios para pagar.",
        },
        { status: 400 }
      );
    }

    const amountValue = Number(amount);

    if (amountValue <= 0) {
      return NextResponse.json(
        { message: "O valor deve ser superior a zero." },
        { status: 400 }
      );
    }

    const category = await prisma.costCategory.findFirst({
      where: {
        id: categoryId,
        companyId: session.companyId,
      },
    });

    if (!category) {
      return NextResponse.json(
        { message: "Categoria inválida." },
        { status: 400 }
      );
    }

    const categoryName = category.name.toLowerCase();

    if (
      categoryName.includes("salario") ||
      categoryName.includes("salário") ||
      categoryName.includes("salary")
    ) {
      return NextResponse.json(
        { message: "Salários devem ser pagos no módulo RH." },
        { status: 400 }
      );
    }

    if (cantinaId) {
      const cantina = await prisma.cantina.findFirst({
        where: {
          id: cantinaId,
          companyId: session.companyId,
        },
      });

      if (!cantina) {
        return NextResponse.json(
          { message: "Cantina inválida." },
          { status: 400 }
        );
      }
    }

    const account = await prisma.financialAccount.findFirst({
      where: {
        id: financialAccountId,
        companyId: session.companyId,
        status: "ACTIVE",
      },
    });

    if (!account) {
      return NextResponse.json(
        { message: "Conta financeira inválida." },
        { status: 400 }
      );
    }

    const date = costDate ? new Date(costDate) : new Date();

    const result = await prisma.$transaction(
      async (tx: TransactionClient) => {
        const cost = await tx.cost.create({
          data: {
            companyId: session.companyId,
            categoryId,
            cantinaId: cantinaId || null,
            description: description || null,
            amount: amountValue,
            costDate: date,
            isAutomatic: false,
            paymentStatus: "PAID",
            paidAt: date,
            financialAccountId,
            referencePeriod: referencePeriod || null,
          },
          include: {
            category: true,
            cantina: true,
            financialAccount: true,
          },
        });

        await tx.financeTransaction.create({
          data: {
            companyId: session.companyId,
            userId: session.userId,
            financialAccountId,
            type: "EXPENSE",
            amount: amountValue,
            description:
              description ||
              `Pagamento de ${category.name}${
                referencePeriod ? ` — ${referencePeriod}` : ""
              }`,
            date,
            referenceType: "COST",
            referenceId: cost.id,
          },
        });

        await tx.financialAccount.update({
          where: { id: financialAccountId },
          data: {
            balance: {
              decrement: amountValue,
            },
          },
        });

        return cost;
      }
    );

    return NextResponse.json({
      message: "Custo pago e registado com sucesso.",
      cost: result,
    });
  } catch (error) {
    console.error("ERRO API CUSTOS POST:", error);

    return NextResponse.json(
      { message: "Erro ao pagar custo." },
      { status: 500 }
    );
  }
}