import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { buildAiDashboardData } from "@/lib/ai/erp-ai";

export async function GET() {
  try {
    const session = await requireAdmin();

    const data = await buildAiDashboardData(session.companyId);

    return NextResponse.json({
      success: true,
      message: "Analyse IA exécutée avec succès.",
      alertsCount: data.alerts.length,
    });
  } catch (error) {
    console.error("ERRO API AI SYNC ALERTS:", error);

    return NextResponse.json(
      { message: "Erro ao executar análise IA." },
      { status: 500 }
    );
  }
}