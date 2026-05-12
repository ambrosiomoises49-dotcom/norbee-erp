// app/api/ai/management-advice/route.ts

import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { callAI } from "@/lib/ai";
import { prisma } from "@/lib/prisma";

export async function POST() {
  try {
    const session = await requireAuth();

    const [sales, stocks, costs] = await Promise.all([
      prisma.sale.findMany({
        where: { companyId: session.companyId },
        take: 100,
        orderBy: { createdAt: "desc" },
      }),
      prisma.centralStock.findMany({
        where: { companyId: session.companyId },
        take: 100,
        include: { product: true },
      }),
      prisma.cost.findMany({
        where: { companyId: session.companyId },
        take: 100,
        orderBy: { costDate: "desc" },
      }),
    ]);

    const result = await callAI<{
      summary: string;
      risks: string[];
      recommendations: string[];
    }>({
      path: "/management-advice",
      body: {
        companyId: session.companyId,
        sales,
        stocks,
        costs,
      },
    });

    if (!result) {
      return NextResponse.json({
        enabled: false,
        summary: "A IA ainda não está ativada.",
        risks: [],
        recommendations: [],
      });
    }

    return NextResponse.json({
      enabled: true,
      ...result,
    });
  } catch (error) {
    return NextResponse.json(
      {
        message: "Erro ao consultar IA.",
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}