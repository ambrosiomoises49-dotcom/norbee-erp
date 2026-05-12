import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const session = await requireAdmin();
    const body = await request.json();

    const { name, description, costType, periodicity, defaultAmount } = body;

    if (!name) {
      return NextResponse.json(
        { message: "Nome da categoria obrigatório." },
        { status: 400 }
      );
    }

    const finalCostType = costType === "RECURRING" ? "RECURRING" : "ONE_TIME";
    const finalPeriodicity =
      finalCostType === "RECURRING" ? periodicity || "MONTHLY" : "NONE";

    const category = await prisma.costCategory.create({
      data: {
        companyId: session.companyId,
        name,
        description: description || null,
        isSystem: false,
        costType: finalCostType,
        periodicity: finalPeriodicity,
        defaultAmount:
          defaultAmount === "" || defaultAmount === undefined
            ? null
            : Number(defaultAmount),
      },
    });

    return NextResponse.json({
      message: "Categoria criada com sucesso.",
      category,
    });
  } catch (error) {
    console.error("ERRO API CATEGORIA CUSTOS POST:", error);

    return NextResponse.json(
      { message: "Erro ao criar categoria." },
      { status: 500 }
    );
  }
}