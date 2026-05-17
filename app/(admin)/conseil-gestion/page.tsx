import AiWorkspace from "@/components/ai/AiWorkspace";

import { requireAdmin } from "@/lib/auth";
import { buildAiDashboardData } from "@/lib/ai/erp-ai";

async function getAiDashboard() {
  try {
    const session = await requireAdmin();
    const data = await buildAiDashboardData(session.companyId);

    return {
      success: true,
      alerts: data.alerts,
      reasoning: data.reasoning,
      memorySummary: data.memory_summary,
    };
  } catch (error) {
    console.error("ERRO PAGE IA:", error);
    return null;
  }
}

export default async function ConseilGestionPage() {
  const data = await getAiDashboard();

  if (!data?.success) {
    return (
      <main className="h-[calc(100vh-110px)] bg-[#F4F7FA] p-4">
        <div className="rounded-2xl border border-red-100 bg-red-50 p-5 text-sm font-semibold text-red-700">
          Impossible de charger l’IA.
        </div>
      </main>
    );
  }

  return (
    <AiWorkspace
      alerts={data.alerts || []}
      priorities={data.reasoning.priority_explanation || []}
      recommendations={data.reasoning.recommendation_explanation || []}
      reasoning={data.reasoning}
    />
  );
}