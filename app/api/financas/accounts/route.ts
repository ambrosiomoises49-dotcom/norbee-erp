import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const session = await requireAdmin();
    const body = await request.json();

    const { name, type, balance, currency, isDefault } = body;

    if (!name) {
      return NextResponse.json(
        { message: "Nome da conta obrigatório." },
        { status: 400 }
      );
    }

    const created = await prisma.$transaction(async (tx) => {
      if (isDefault) {
        await tx.financialAccount.updateMany({
          where: {
            companyId: session.companyId,
          },
          data: {
            isDefault: false,
          },
        });
      }

      return tx.financialAccount.create({
        data: {
          companyId: session.companyId,
          name,
          type: type || "CASH",
          balance: Number(balance || 0),
          currency: currency || null,
          isDefault: Boolean(isDefault),
          status: "ACTIVE",
        },
      });
    });

    return NextResponse.json({
      message: "Conta financeira criada com sucesso.",
      account: created,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { message: "Erro ao criar conta financeira." },
      { status: 500 }
    );
  }
}