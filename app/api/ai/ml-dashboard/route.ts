import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/auth";

export async function GET() {
  try {
    const session = await requireAdmin();

    const aiUrl = process.env.NORBEE_AI_URL;
    const apiKey = process.env.NORBEE_AI_API_KEY;

    if (!aiUrl || !apiKey) {
      return NextResponse.json(
        {
          success: false,
          message: "Norbee AI não está configurada.",
        },
        { status: 500 }
      );
    }

    const response = await fetch(
      `${aiUrl}/api/ai/company-ml-analysis/${session.companyId}?days=30&periods=30`,
      {
        cache: "no-store",
        headers: {
          "x-api-key": apiKey,
        },
      }
    );

    const data = await response.json();

    if (!response.ok || data.status === "not_found") {
      return NextResponse.json(
        {
          success: false,
          message: "Erro ao carregar análise IA.",
          details: data,
        },
        {
          status: response.status,
        }
      );
    }

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error("ERRO IA DASHBOARD:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Erro de comunicação com Norbee AI.",
      },
      {
        status: 500,
      }
    );
  }
}