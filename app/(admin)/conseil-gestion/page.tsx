import type { ReactNode } from "react";
import {
  Brain,
  AlertTriangle,
  Lightbulb,
  TrendingUp,
  Database,
  ShieldCheck,
  Activity,
  Target,
  Clock,
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
    return (
      <main className="min-h-[calc(100vh-110px)] bg-[#F4F7FA] p-6">
        <div className="rounded-[24px] border border-red-100 bg-red-50 p-6 text-red-700">
          Impossible de charger l’IA.
        </div>
      </main>
    );
  }

  const recommendations = data.reasoning.recommendation_explanation || [];
  const priorities = data.reasoning.priority_explanation || [];
  const memoryCategories = data.memorySummary.categories || {};

  const alertCount = data.alerts.length;
  const memoryCount = data.memorySummary.count || 0;
  const categoryCount = Object.keys(memoryCategories).length;

  const healthLabel =
    alertCount === 0 ? "Stable" : alertCount <= 2 ? "À surveiller" : "Risque élevé";

  const healthClass =
    alertCount === 0
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : alertCount <= 2
        ? "border-amber-200 bg-amber-50 text-amber-700"
        : "border-red-200 bg-red-50 text-red-700";

  return (
    <main className="min-h-[calc(100vh-110px)] bg-[#F4F7FA] p-4 md:p-6">
      <div className="flex min-h-[calc(100vh-142px)] flex-col gap-5">
        <section className="rounded-[26px] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex items-start gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[18px] bg-[#123A5C] text-white">
                <Brain size={30} />
              </div>

              <div>
                <p className="text-sm font-bold uppercase tracking-wide text-[#123A5C]">
                  Norbee Intelligence
                </p>

                <h1 className="mt-1 text-3xl font-black text-slate-900">
                  Conseil de Gestion IA
                </h1>

                <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-500">
                  Analyse intelligente connectée aux données réelles de ton ERP :
                  alertes, raisonnement, priorités et recommandations de gestion.
                </p>
              </div>
            </div>

            <div className={`rounded-[18px] border px-5 py-4 ${healthClass}`}>
              <p className="text-xs font-bold uppercase tracking-wide">
                État entreprise
              </p>
              <div className="mt-2 flex items-center gap-2">
                <ShieldCheck size={22} />
                <p className="text-2xl font-black">{healthLabel}</p>
              </div>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            icon={<AlertTriangle size={22} />}
            title="Alertes IA"
            value={alertCount}
            subtitle="Risques détectés"
            tone={alertCount > 0 ? "danger" : "success"}
          />

          <MetricCard
            icon={<Database size={22} />}
            title="Mémoires IA"
            value={memoryCount}
            subtitle="Historique analysé"
            tone="primary"
          />

          <MetricCard
            icon={<Activity size={22} />}
            title="Catégories IA"
            value={categoryCount}
            subtitle="Domaines suivis"
            tone="neutral"
          />

          <MetricCard
            icon={<Target size={22} />}
            title="Priorités"
            value={priorities.length}
            subtitle="Actions recommandées"
            tone="primary"
          />
        </section>

        <section className="grid flex-1 grid-cols-1 gap-5 xl:grid-cols-12">
          <div className="space-y-5 xl:col-span-7">
            <Panel
              title="Raisonnement principal"
              subtitle="Lecture stratégique générée à partir des données ERP."
              icon={<TrendingUp size={21} />}
            >
              <ReasoningItem
                label="Analyse générale"
                text={
                  data.reasoning.main_explanation ||
                  "Aucun raisonnement principal disponible."
                }
              />

              <ReasoningItem
                label="Interprétation du risque"
                text={
                  data.reasoning.risk_interpretation ||
                  "Aucune interprétation du risque disponible."
                }
              />

              <ReasoningItem
                label="Contexte mémoire"
                text={
                  data.reasoning.memory_context ||
                  "Aucun contexte mémoire disponible."
                }
              />
            </Panel>

            <Panel
              title="Recommandations IA"
              subtitle="Conseils opérationnels pour améliorer la gestion."
              icon={<Lightbulb size={21} />}
            >
              {recommendations.length > 0 ? (
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  {recommendations.map((item, index) => (
                    <RecommendationCard
                      key={`${item.recommendation || "recommendation"}-${index}`}
                      title={item.recommendation || "Recommandation"}
                      text={item.reason || "Aucune explication disponible."}
                    />
                  ))}
                </div>
              ) : (
                <EmptyState text="Aucune recommandation disponible." />
              )}
            </Panel>
          </div>

          <div className="space-y-5 xl:col-span-5">
            <Panel
              title="Synthèse IA"
              subtitle="Vue rapide de la situation."
              icon={<Brain size={21} />}
            >
              <MiniStatus
                label="Niveau d’alerte"
                value={alertCount === 0 ? "Normal" : "Attention"}
              />
              <MiniStatus
                label="Mémoire"
                value={memoryCount > 0 ? "Active" : "Initiale"}
              />
              <MiniStatus
                label="Recommandations"
                value={`${recommendations.length} suggestion(s)`}
              />
              <MiniStatus label="Dernière analyse" value="Temps réel" />
            </Panel>

            <Panel
              title="Alertes IA"
              subtitle="Signaux de risque détectés automatiquement."
              icon={<AlertTriangle size={21} />}
            >
              {data.alerts.length > 0 ? (
                <div className="space-y-3">
                  {data.alerts.slice(0, 4).map((alert, index) => (
                    <AlertCard
                      key={`${alert.title || "alert"}-${index}`}
                      title={alert.title || "Alerte IA"}
                      message={alert.message || "Aucun détail disponible."}
                      level={alert.level || "medium"}
                      type={alert.notification_type || "AI"}
                    />
                  ))}
                </div>
              ) : (
                <EmptyState text="Aucune alerte IA détectée." />
              )}
            </Panel>

            <Panel
              title="Priorités IA"
              subtitle="Actions à traiter en premier."
              icon={<Database size={21} />}
            >
              {priorities.length > 0 ? (
                <div className="space-y-3">
                  {priorities.slice(0, 4).map((item, index) => (
                    <ActionCard
                      key={`${item.title || "priority"}-${index}`}
                      title={item.title || "Priorité"}
                      text={item.reason || "Aucune explication disponible."}
                      index={index + 1}
                    />
                  ))}
                </div>
              ) : (
                <EmptyState text="Aucune priorité disponible." />
              )}
            </Panel>
          </div>
        </section>

        <section className="rounded-[26px] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-[16px] bg-slate-100 text-[#123A5C]">
              <Clock size={21} />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900">Prévisions IA</h2>
              <p className="text-sm text-slate-500">
                Module prêt pour Prophet, XGBoost et modèles de prévision.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <ForecastPlaceholder title="Prévision ventes" />
            <ForecastPlaceholder title="Prévision stock" />
            <ForecastPlaceholder title="Prévision bénéfice" />
          </div>
        </section>
      </div>
    </main>
  );
}

function MetricCard({
  icon,
  title,
  value,
  subtitle,
  tone,
}: {
  icon: ReactNode;
  title: string;
  value: number;
  subtitle: string;
  tone: "primary" | "success" | "danger" | "neutral";
}) {
  const toneClass = {
    primary: "bg-[#123A5C]/10 text-[#123A5C]",
    success: "bg-emerald-50 text-emerald-700",
    danger: "bg-red-50 text-red-700",
    neutral: "bg-slate-100 text-slate-700",
  }[tone];

  return (
    <div className="rounded-[22px] border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-slate-500">{title}</p>
          <h2 className="mt-2 text-3xl font-black text-slate-900">
            {formatValue(value)}
          </h2>
          <p className="mt-1 text-xs text-slate-400">{subtitle}</p>
        </div>

        <div className={`flex h-12 w-12 items-center justify-center rounded-[16px] ${toneClass}`}>
          {icon}
        </div>
      </div>
    </div>
  );
}

function Panel({
  title,
  subtitle,
  icon,
  children,
}: {
  title: string;
  subtitle?: string;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-5 flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[16px] bg-slate-100 text-[#123A5C]">
          {icon}
        </div>

        <div>
          <h2 className="text-lg font-black text-slate-900">{title}</h2>
          {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
        </div>
      </div>

      <div className="space-y-3">{children}</div>
    </div>
  );
}

function ReasoningItem({ label, text }: { label: string; text: string }) {
  return (
    <div className="rounded-[18px] border border-slate-100 bg-slate-50 p-4">
      <p className="text-xs font-bold uppercase tracking-wide text-[#123A5C]">
        {label}
      </p>
      <p className="mt-2 leading-relaxed text-slate-700">{text}</p>
    </div>
  );
}

function AlertCard({
  title,
  message,
  level,
  type,
}: {
  title: string;
  message: string;
  level: string;
  type: string;
}) {
  return (
    <div className="rounded-[18px] border border-red-100 bg-red-50 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-black text-red-800">{title}</p>
          <p className="mt-2 text-sm leading-relaxed text-red-700">{message}</p>
        </div>

        <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-red-700">
          {level}
        </span>
      </div>

      <p className="mt-3 text-xs font-semibold text-red-500">Type : {type}</p>
    </div>
  );
}

function ActionCard({
  title,
  text,
  index,
}: {
  title: string;
  text: string;
  index: number;
}) {
  return (
    <div className="flex gap-3 rounded-[18px] border border-slate-100 bg-slate-50 p-4">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#123A5C] text-sm font-black text-white">
        {index}
      </div>

      <div>
        <p className="font-black text-slate-800">{title}</p>
        <p className="mt-1 text-sm leading-relaxed text-slate-600">{text}</p>
      </div>
    </div>
  );
}

function RecommendationCard({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-[18px] border border-amber-100 bg-amber-50 p-4">
      <div className="flex items-start gap-3">
        <Lightbulb className="mt-0.5 text-amber-700" size={20} />
        <div>
          <p className="font-black text-slate-900">{title}</p>
          <p className="mt-2 text-sm leading-relaxed text-slate-700">{text}</p>
        </div>
      </div>
    </div>
  );
}

function MiniStatus({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-[18px] border border-slate-100 bg-slate-50 px-4 py-3">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="text-sm font-black text-slate-800">{value}</p>
    </div>
  );
}

function ForecastPlaceholder({ title }: { title: string }) {
  return (
    <div className="rounded-[18px] border border-dashed border-slate-200 bg-slate-50 p-5">
      <p className="font-black text-slate-800">{title}</p>
      <p className="mt-2 text-sm text-slate-500">À connecter au moteur ML.</p>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-[18px] border border-slate-100 bg-slate-50 p-6 text-center text-sm text-slate-500">
      {text}
    </div>
  );
}

function formatValue(value: number) {
  return new Intl.NumberFormat("pt-PT", {
    maximumFractionDigits: 0,
  }).format(value);
}