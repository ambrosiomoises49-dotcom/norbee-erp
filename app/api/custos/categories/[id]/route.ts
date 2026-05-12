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

    const category = await prisma.costCategory.findFirst({

      where: {

        id,

        companyId: session.companyId,

      },

    });

    if (!category) {

      return NextResponse.json(

        { message: "Categoria não encontrada." },

        { status: 404 }

      );

    }

    if (category.isSystem) {

      return NextResponse.json(

        { message: "Categoria do sistema não pode ser editada." },

        { status: 400 }

      );

    }

    const finalCostType =

      body.costType === "RECURRING" ? "RECURRING" : "ONE_TIME";

    const finalPeriodicity =

      finalCostType === "RECURRING" ? body.periodicity || "MONTHLY" : "NONE";

    const updated = await prisma.costCategory.update({

      where: { id },

      data: {

        name: body.name ?? undefined,

        description: body.description ?? undefined,

        costType: finalCostType,

        periodicity: finalPeriodicity,

        defaultAmount:

          body.defaultAmount === ""

            ? null

            : body.defaultAmount === undefined

            ? undefined

            : Number(body.defaultAmount),

      },

    });

    return NextResponse.json({

      message: "Categoria atualizada com sucesso.",

      category: updated,

    });

  } catch (error) {

    console.error("ERRO API CATEGORIA CUSTOS PATCH:", error);

    return NextResponse.json(

      { message: "Erro ao atualizar categoria." },

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

    const category = await prisma.costCategory.findFirst({

      where: {

        id,

        companyId: session.companyId,

      },

      include: {

        _count: {

          select: {

            costs: true,

          },

        },

      },

    });

    if (!category) {

      return NextResponse.json(

        { message: "Categoria não encontrada." },

        { status: 404 }

      );

    }

    if (category.isSystem) {

      return NextResponse.json(

        { message: "Categoria do sistema não pode ser apagada." },

        { status: 400 }

      );

    }

    if (category._count.costs > 0) {

      return NextResponse.json(

        {

          message:

            "Esta categoria já tem custos associados e não pode ser apagada.",

        },

        { status: 400 }

      );

    }

    await prisma.costCategory.delete({

      where: { id },

    });

    return NextResponse.json({

      message: "Categoria apagada com sucesso.",

    });

  } catch (error) {

    console.error("ERRO API CATEGORIA CUSTOS DELETE:", error);

    return NextResponse.json(

      { message: "Erro ao apagar categoria." },

      { status: 500 }

    );

  }

}