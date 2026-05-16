import type { ReactNode } from "react";
import {
  Brain,
  AlertTriangle,
  Lightbulb,
  TrendingUp,
  Database,
} from "lucide-react";

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
    return <div className="p-6">Impossible de charger l’IA.</div>;
  }

  const recommendations = data.reasoning.recommendation_explanation || [];
  const priorities = data.reasoning.priority_explanation || [];

  return (
    <div className="space-y-6 p-6">
      <div className="rounded-3xl bg-gradient-to-r from-[#123A5C] to-[#F5C982] p-6 text-white">
        <div className="flex items-center gap-3">
          <Brain size={32} />
          <h1 className="text-3xl font-black">Conseil de Gestion IA</h1>
        </div>

        <p className="mt-2 text-white/80">
          Analyse intelligente connectée aux données réelles de ton ERP.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card title="Alertes IA" value={data.alerts.length} />
        <Card title="Mémoires IA" value={data.memorySummary.count || 0} />
        <Card title="Catégories IA" value={Object.keys(data.memorySummary.categories || {}).length} />
      </div>

      <Panel title="Raisonnement IA" icon={<TrendingUp size={20} />}>
        <p className="rounded-xl bg-slate-50 p-3 text-slate-700">
          {data.reasoning.main_explanation ||
            "Aucun raisonnement principal disponible."}
        </p>

        <p className="rounded-xl bg-slate-50 p-3 text-slate-700">
          {data.reasoning.risk_interpretation ||
            "Aucune interprétation du risque disponible."}
        </p>

        <p className="rounded-xl bg-slate-50 p-3 text-slate-500">
          {data.reasoning.memory_context ||
            "Aucun contexte mémoire disponible."}
        </p>
      </Panel>

      <Panel title="Alertes IA" icon={<AlertTriangle size={20} />}>
        {data.alerts.length > 0 ? (
          data.alerts.map((alert, index) => (
            <div
              key={`${alert.title}-${index}`}
              className="rounded-xl bg-red-50 p-3 text-red-700"
            >
              <p className="font-bold">{alert.title}</p>
              <p className="text-sm">{alert.message}</p>
              <p className="mt-1 text-xs">Niveau : {alert.level}</p>
            </div>
          ))
        ) : (
          <p className="rounded-xl bg-slate-50 p-3 text-slate-500">
            Aucune alerte IA détectée.
          </p>
        )}
      </Panel>

      <Panel title="Priorités IA" icon={<Database size={20} />}>
        {priorities.length > 0 ? (
          priorities.map((item, index) => (
            <div
              key={`${item.title}-${index}`}
              className="rounded-xl bg-slate-50 p-3 text-slate-700"
            >
              <p className="font-bold">{item.title || "Priorité"}</p>
              <p className="text-sm">{item.reason}</p>
            </div>
          ))
        ) : (
          <p className="rounded-xl bg-slate-50 p-3 text-slate-500">
            Aucune priorité disponible.
          </p>
        )}
      </Panel>

      <Panel title="Recommandations IA" icon={<Lightbulb size={20} />}>
        {recommendations.length > 0 ? (
          recommendations.map((item, index) => (
            <div
              key={`${item.recommendation}-${index}`}
              className="rounded-xl bg-yellow-50 p-3 text-slate-700"
            >
              <p className="font-bold">
                {item.recommendation || "Recommandation"}
              </p>
              <p className="text-sm">{item.reason}</p>
            </div>
          ))
        ) : (
          <p className="rounded-xl bg-slate-50 p-3 text-slate-500">
            Aucune recommandation disponible.
          </p>
        )}
      </Panel>
    </div>
  );
}

function Card({ title, value }: { title: string; value: number }) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
      <p className="text-sm text-slate-500">{title}</p>
      <h2 className="mt-2 text-2xl font-black text-slate-800">
        {formatValue(value)}
      </h2>
    </div>
  );
}

function Panel({
  title,
  icon,
  children,
}: {
  title: string;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center gap-2 text-[#123A5C]">
        {icon}
        <h2 className="text-lg font-black">{title}</h2>
      </div>

      <div className="space-y-3">{children}</div>
    </div>
  );
}

function formatValue(value: number) {
  return new Intl.NumberFormat("pt-PT", {
    maximumFractionDigits: 0,
  }).format(value);
}