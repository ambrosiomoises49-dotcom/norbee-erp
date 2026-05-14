import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

type TransactionClient = Omit<
  typeof prisma,
  "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends"
>;

type SalaryPaymentBody = {
  employeeId?: string;
  amount?: number | string;
  referenceMonth?: string;
  paymentDate?: string;
  paymentMethod?: string;
  financialAccountId?: string;
  notes?: string | null;
};

async function ensureSalaryCategory(companyId: string) {
  const existing = await prisma.costCategory.findFirst({
    where: {
      companyId,
      name: "Salários",
    },
  });

  if (existing) return existing;

  return prisma.costCategory.create({
    data: {
      companyId,
      name: "Salários",
      description: "Pagamentos de salários dos funcionários.",
      isSystem: true,
      costType: "RECURRING",
      periodicity: "MONTHLY",
      defaultAmount: null,
    },
  });
}

export async function POST(request: Request) {
  try {
    const session = await requireAdmin();
    const body = (await request.json()) as SalaryPaymentBody;

    const {
      employeeId,
      amount,
      referenceMonth,
      paymentDate,
      paymentMethod,
      financialAccountId,
      notes,
    } = body;

    if (!employeeId || !amount || !referenceMonth || !financialAccountId) {
      return NextResponse.json(
        {
          message:
            "Funcionário, valor, mês de referência e conta financeira são obrigatórios.",
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

    const employee = await prisma.employee.findFirst({
      where: {
        id: employeeId,
        companyId: session.companyId,
      },
      include: {
        cantina: true,
      },
    });

    if (!employee) {
      return NextResponse.json(
        { message: "Funcionário não encontrado." },
        { status: 404 }
      );
    }

    if (employee.status !== "ACTIVE") {
      return NextResponse.json(
        { message: "Este funcionário não está ativo." },
        { status: 400 }
      );
    }

    const existingPayment = await prisma.salaryPayment.findFirst({
      where: {
        companyId: session.companyId,
        employeeId,
        referenceMonth,
        status: "PAID",
      },
    });

    if (existingPayment) {
      return NextResponse.json(
        { message: "Este salário já foi pago para o mês selecionado." },
        { status: 409 }
      );
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

    const date = paymentDate ? new Date(paymentDate) : new Date();

    const salaryCategory = await ensureSalaryCategory(session.companyId);

    const result = await prisma.$transaction(
      async (tx: TransactionClient) => {
        const salaryPayment = await tx.salaryPayment.create({
          data: {
            companyId: session.companyId,
            employeeId,
            amount: amountValue,
            paymentDate: date,
            referenceMonth,
            paymentMethod:
  (paymentMethod as
    | "CASH"
    | "CARD"
    | "TRANSFER"
    | "MOBILE_MONEY"
    | "OTHER") || "CASH",
            status: "PAID",
            notes: notes || null,
          },
          include: {
            employee: {
              include: {
                cantina: true,
              },
            },
          },
        });

        const cost = await tx.cost.create({
          data: {
            companyId: session.companyId,
            cantinaId: employee.cantinaId || null,
            categoryId: salaryCategory.id,
            description: `Salário de ${employee.fullName} — ${referenceMonth}`,
            amount: amountValue,
            costDate: date,
            isAutomatic: true,
            paymentStatus: "PAID",
            paidAt: date,
            financialAccountId,
            referencePeriod: referenceMonth,
          },
        });

        await tx.financeTransaction.create({
          data: {
            companyId: session.companyId,
            userId: session.userId,
            financialAccountId,
            type: "EXPENSE",
            amount: amountValue,
            description: `Pagamento de salário: ${employee.fullName} — ${referenceMonth}`,
            date,
            referenceType: "SALARY",
            referenceId: salaryPayment.id,
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

        return { salaryPayment, cost };
      }
    );

    return NextResponse.json({
      message: "Salário pago com sucesso.",
      result,
    });
  } catch (error) {
    console.error("ERRO API RH PAY:", error);

    return NextResponse.json(
      { message: "Erro ao pagar salário." },
      { status: 500 }
    );
  }
}