import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

type TransactionClient = Omit<
  typeof prisma,
  "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends"
>;

type FinanceTransactionType = "INCOME" | "EXPENSE";
type FinancialAccountTypeValue = "CASH" | "BANK" | "MOBILE_MONEY" | "OTHER";

type FinanceBody = {
  type?: FinanceTransactionType;
  amount?: number | string;
  description?: string | null;
  date?: string;
  financialAccountId?: string | null;
};

async function ensureDefaultAccount(companyId: string) {
  const existing = await prisma.financialAccount.findFirst({
    where: {
      companyId,
      isDefault: true,
    },
  });

  if (existing) return existing;

  return prisma.financialAccount.create({
    data: {
      companyId,
      name: "Caixa principal",
      type: "CASH" as FinancialAccountTypeValue,
      isDefault: true,
      balance: 0,
      status: "ACTIVE",
    },
  });
}

export async function GET(request: Request) {
  try {
    const session = await requireAdmin();
    const { searchParams } = new URL(request.url);

    const type = searchParams.get("type");
    const referenceType = searchParams.get("referenceType");
    const accountId = searchParams.get("accountId");
    const start = searchParams.get("start");
    const end = searchParams.get("end");

    await ensureDefaultAccount(session.companyId);

    const [accounts, transactions] = await Promise.all([
      prisma.financialAccount.findMany({
        where: {
          companyId: session.companyId,
          status: "ACTIVE",
        },
        orderBy: {
          createdAt: "asc",
        },
      }),

      prisma.financeTransaction.findMany({
        where: {
          companyId: session.companyId,
          ...(type && type !== "ALL"
            ? { type: type as FinanceTransactionType }
            : {}),
          ...(referenceType && referenceType !== "ALL"
            ? { referenceType }
            : {}),
          ...(accountId && accountId !== "ALL"
            ? { financialAccountId: accountId }
            : {}),
          date: {
            ...(start ? { gte: new Date(start) } : {}),
            ...(end ? { lte: new Date(`${end}T23:59:59`) } : {}),
          },
        },
        include: {
          financialAccount: true,
          user: {
            select: {
              name: true,
              identifier: true,
            },
          },
        },
        orderBy: {
          date: "desc",
        },
      }),
    ]);

    return NextResponse.json({
      accounts,
      transactions,
    });
  } catch (error) {
    console.error("ERRO API FINANCAS GET:", error);

    return NextResponse.json(
      { message: "Erro ao carregar finanças." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireAdmin();
    const body = (await request.json()) as FinanceBody;

    const { type, amount, description, date, financialAccountId } = body;

    if (!type || !amount) {
      return NextResponse.json(
        { message: "Tipo e valor são obrigatórios." },
        { status: 400 }
      );
    }

    if (!["INCOME", "EXPENSE"].includes(type)) {
      return NextResponse.json(
        { message: "Tipo inválido." },
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

    const account =
      financialAccountId ||
      (await ensureDefaultAccount(session.companyId)).id;

    const transaction = await prisma.$transaction(
      async (tx: TransactionClient) => {
        const created = await tx.financeTransaction.create({
          data: {
            companyId: session.companyId,
            userId: session.userId,
            financialAccountId: account,
            type,
            amount: amountValue,
            description: description || null,
            date: date ? new Date(date) : new Date(),
            referenceType: "MANUAL",
            referenceId: null,
          },
        });

        await tx.financialAccount.update({
          where: { id: account },
          data: {
            balance:
              type === "INCOME"
                ? { increment: amountValue }
                : { decrement: amountValue },
          },
        });

        return created;
      }
    );

    return NextResponse.json({
      message: "Transação registada com sucesso.",
      transaction,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { message: "Erro ao registar transação." },
      { status: 500 }
    );
  }
}