import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

import { requireAdmin } from "@/lib/auth";

export async function POST(

  request: Request,

  { params }: { params: Promise<{ id: string }> }

) {

  try {

    const session = await requireAdmin();

    const { id } = await params;

    const body = await request.json();

    const { financialAccountId } = body;

    if (!financialAccountId) {

      return NextResponse.json(

        { message: "Escolha a conta financeira para pagamento." },

        { status: 400 }

      );

    }

    const cost = await prisma.cost.findFirst({

      where: {

        id,

        companyId: session.companyId,

      },

      include: {

        category: true,

      },

    });

    if (!cost) {

      return NextResponse.json(

        { message: "Custo não encontrado." },

        { status: 404 }

      );

    }

    if (cost.paymentStatus === "PAID") {

      return NextResponse.json(

        { message: "Este custo já foi pago." },

        { status: 400 }

      );

    }

    const categoryName = cost.category.name.toLowerCase();

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

    const result = await prisma.$transaction(async (tx) => {

      const paidCost = await tx.cost.update({

        where: { id },

        data: {

          paymentStatus: "PAID",

          paidAt: new Date(),

          financialAccountId,

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

          amount: cost.amount,

          description:

            cost.description || `Pagamento de custo: ${cost.category.name}`,

          date: new Date(),

          referenceType: "COST",

          referenceId: cost.id,

        },

      });

      await tx.financialAccount.update({

        where: { id: financialAccountId },

        data: {

          balance: {

            decrement: cost.amount,

          },

        },

      });

      return paidCost;

    });

    return NextResponse.json({

      message: "Custo pago com sucesso.",

      cost: result,

    });

  } catch (error) {

    console.error("ERRO API PAGAR CUSTO:", error);

    return NextResponse.json(

      { message: "Erro ao pagar custo." },

      { status: 500 }

    );

  }

}