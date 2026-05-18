import AiWorkspace from "@/components/ai/AiWorkspace";

import { requireAdmin } from "@/lib/auth";
import { buildAiDashboardData } from "@/lib/ai/erp-ai";

async function getAiDashboard() {
  try {
    const session = await requireAdmin();

    const legacyData = await buildAiDashboardData(session.companyId);

    const aiUrl = process.env.NORBEE_AI_URL;
    const apiKey = process.env.NORBEE_AI_API_KEY;

    let advancedData = null;

    if (aiUrl && apiKey) {
      const response = await fetch(
        `${aiUrl}/api/ai/company-ml-analysis/${session.companyId}?days=30&periods=30`,
        {
          cache: "no-store",
          headers: {
            "x-api-key": apiKey,
          },
        }
      );

      if (response.ok) {
        advancedData = await response.json();
      }
    }

    return {
      success: true,
      alerts: legacyData.alerts || [],
      reasoning: legacyData.reasoning,
      memorySummary: legacyData.memory_summary,
      advancedData,
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
      advancedData={data.advancedData}
    />
  );
}