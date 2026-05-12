import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

import { requireAdmin } from "@/lib/auth";

export async function DELETE(

  request: Request,

  { params }: { params: Promise<{ id: string }> }

) {

  try {

    const session = await requireAdmin();

    const { id } = await params;

    const cost = await prisma.cost.findFirst({

      where: {

        id,

        companyId: session.companyId,

      },

    });

    if (!cost) {

      return NextResponse.json(

        { message: "Custo não encontrado." },

        { status: 404 }

      );

    }

    if (cost.isAutomatic) {

      return NextResponse.json(

        {

          message:

            "Este custo foi gerado automaticamente e não pode ser apagado aqui.",

        },

        { status: 400 }

      );

    }

    await prisma.$transaction(async (tx) => {

      await tx.financeTransaction.deleteMany({

        where: {

          companyId: session.companyId,

          referenceType: "COST",

          referenceId: cost.id,

        },

      });

      if (cost.financialAccountId) {

        await tx.financialAccount.update({

          where: { id: cost.financialAccountId },

          data: {

            balance: {

              increment: cost.amount,

            },

          },

        });

      }

      await tx.cost.delete({

        where: { id },

      });

    });

    return NextResponse.json({

      message: "Custo apagado e saldo reposto com sucesso.",

    });

  } catch (error) {

    console.error("ERRO API CUSTOS DELETE:", error);

    return NextResponse.json(

      { message: "Erro ao apagar custo." },

      { status: 500 }

    );

  }

}