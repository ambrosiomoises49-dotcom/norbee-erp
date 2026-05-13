import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

type TransactionClient = Omit<
  typeof prisma,
  "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends"
>;

type FinancialAccountTypeValue = "CASH" | "BANK" | "MOBILE_MONEY" | "OTHER";

type CreateFinancialAccountBody = {
  name?: string;
  type?: FinancialAccountTypeValue;
  balance?: number | string;
  currency?: string | null;
  isDefault?: boolean;
};

export async function POST(request: Request) {
  try {
    const session = await requireAdmin();
    const body = (await request.json()) as CreateFinancialAccountBody;

    const { name, type, balance, currency, isDefault } = body;

    if (!name) {
      return NextResponse.json(
        { message: "Nome da conta obrigatório." },
        { status: 400 }
      );
    }

    const created = await prisma.$transaction(
      async (tx: TransactionClient) => {
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
      }
    );

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