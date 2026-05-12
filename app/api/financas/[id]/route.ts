import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAdmin();
    const { id } = await params;
    const body = await request.json();

    const transaction = await prisma.financeTransaction.findFirst({
      where: {
        id,
        companyId: session.companyId,
      },
    });

    if (!transaction) {
      return NextResponse.json(
        { message: "Transação não encontrada." },
        { status: 404 }
      );
    }

    if (transaction.referenceType !== "MANUAL") {
      return NextResponse.json(
        {
          message:
            "Esta transação foi gerada automaticamente e não pode ser editada aqui.",
        },
        { status: 400 }
      );
    }

    const oldAmount = Number(transaction.amount || 0);
    const newAmount =
      body.amount === undefined || body.amount === ""
        ? oldAmount
        : Number(body.amount);

    const oldType = transaction.type;
    const newType = body.type ?? oldType;

    const oldAccountId = transaction.financialAccountId;
    const newAccountId = body.financialAccountId ?? oldAccountId;

    const updated = await prisma.$transaction(async (tx) => {
      if (oldAccountId) {
        await tx.financialAccount.update({
          where: { id: oldAccountId },
          data: {
            balance:
              oldType === "INCOME"
                ? { decrement: oldAmount }
                : { increment: oldAmount },
          },
        });
      }

      if (newAccountId) {
        await tx.financialAccount.update({
          where: { id: newAccountId },
          data: {
            balance:
              newType === "INCOME"
                ? { increment: newAmount }
                : { decrement: newAmount },
          },
        });
      }

      return tx.financeTransaction.update({
        where: { id },
        data: {
          type: newType,
          amount: newAmount,
          description: body.description ?? undefined,
          date: body.date ? new Date(body.date) : undefined,
          financialAccountId: newAccountId,
        },
      });
    });

    return NextResponse.json({
      message: "Transação atualizada com sucesso.",
      transaction: updated,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { message: "Erro ao atualizar transação." },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAdmin();
    const { id } = await params;

    const transaction = await prisma.financeTransaction.findFirst({
      where: {
        id,
        companyId: session.companyId,
      },
    });

    if (!transaction) {
      return NextResponse.json(
        { message: "Transação não encontrada." },
        { status: 404 }
      );
    }

    if (transaction.referenceType !== "MANUAL") {
      return NextResponse.json(
        {
          message:
            "Esta transação foi gerada automaticamente e não pode ser apagada aqui.",
        },
        { status: 400 }
      );
    }

    await prisma.$transaction(async (tx) => {
      if (transaction.financialAccountId) {
        await tx.financialAccount.update({
          where: { id: transaction.financialAccountId },
          data: {
            balance:
              transaction.type === "INCOME"
                ? { decrement: transaction.amount }
                : { increment: transaction.amount },
          },
        });
      }

      await tx.financeTransaction.delete({
        where: { id },
      });
    });

    return NextResponse.json({
      message: "Transação apagada com sucesso.",
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { message: "Erro ao apagar transação." },
      { status: 500 }
    );
  }
}