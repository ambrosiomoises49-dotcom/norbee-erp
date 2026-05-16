import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { buildAiDashboardData } from "@/lib/ai/erp-ai";

export async function GET() {
  try {
    const session = await requireAdmin();

    const data = await buildAiDashboardData(session.companyId);

    return NextResponse.json(data);
  } catch (error) {
    console.error("ERRO API AI DASHBOARD:", error);

    return NextResponse.json(
      { message: "Erro ao carregar dashboard IA." },
      { status: 500 }
    );
  }
}