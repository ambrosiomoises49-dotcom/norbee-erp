import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

import { requireAdmin } from "@/lib/auth";

import { getPotentialStockProfit } from "@/lib/fifo";

export async function GET(req: Request) {
  try {
    const session = await requireAdmin();

    const { searchParams } = new URL(req.url);

    const cantinaIdParam = searchParams.get("cantinaId");

    let cantinaId: string | null | undefined;

    if (!cantinaIdParam || cantinaIdParam === "ALL") {
      cantinaId = undefined;
    } else if (cantinaIdParam === "CENTRAL") {
      cantinaId = null;
    } else {
      cantinaId = cantinaIdParam;
    }

    const data = await getPotentialStockProfit({
      tx: prisma,
      companyId: session.companyId,
      cantinaId,
    });

    return NextResponse.json(data);
  } catch (error) {
    console.error("ERRO API POTENTIAL PROFIT:", error);

    return NextResponse.json(
      { message: "Erro ao calcular lucro potencial." },
      { status: 500 }
    );
  }
}