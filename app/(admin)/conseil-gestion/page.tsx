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
  Send,
  Bot,
  User,
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
      <main className="min-h-[calc(100vh-110px)] bg-[#F4F7FA] p-4">
        <div className="rounded-[20px] border border-red-100 bg-red-50 p-5 text-red-700">
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
    <main className="min-h-[calc(100vh-110px)] bg-[#F4F7FA] p-4">
      <div className="grid min-h-[calc(100vh-142px)] grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(360px,0.65fr)]">
        <section className="space-y-4 overflow-hidden">
          <div className="rounded-[22px] border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] bg-[#123A5C] text-white">
                  <Brain size={24} />
                </div>

                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-[#123A5C]">
                    Norbee Intelligence
                  </p>

                  <h1 className="mt-1 text-2xl font-black text-slate-900">
                    Conseil de Gestion IA
                  </h1>

                  <p className="mt-1 max-w-2xl text-xs leading-relaxed text-slate-500">
                    Analyse connectée aux données réelles du ERP : alertes,
                    raisonnement, priorités et recommandations.
                  </p>
                </div>
              </div>

              <div className={`rounded-[14px] border px-4 py-3 ${healthClass}`}>
                <p className="text-[11px] font-bold uppercase tracking-wide">
                  État entreprise
                </p>
                <div className="mt-1 flex items-center gap-2">
                  <ShieldCheck size={18} />
                  <p className="text-lg font-black">{healthLabel}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
            <MetricCard
              icon={<AlertTriangle size={18} />}
              title="Alertes"
              value={alertCount}
              subtitle="Risques"
              tone={alertCount > 0 ? "danger" : "success"}
            />
            <MetricCard
              icon={<Database size={18} />}
              title="Mémoires"
              value={memoryCount}
              subtitle="Historique"
              tone="primary"
            />
            <MetricCard
              icon={<Activity size={18} />}
              title="Catégories"
              value={categoryCount}
              subtitle="Domaines"
              tone="neutral"
            />
            <MetricCard
              icon={<Target size={18} />}
              title="Priorités"
              value={priorities.length}
              subtitle="Actions"
              tone="primary"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
            <div className="space-y-4 xl:col-span-7">
              <Panel
                title="Raisonnement principal"
                subtitle="Lecture stratégique générée par l’IA."
                icon={<TrendingUp size={18} />}
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
                subtitle="Conseils opérationnels."
                icon={<Lightbulb size={18} />}
              >
                {recommendations.length > 0 ? (
                  <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                    {recommendations.slice(0, 4).map((item, index) => (
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

            <div className="space-y-4 xl:col-span-5">
              <Panel title="Synthèse IA" icon={<Brain size={18} />}>
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
              </Panel>

              <Panel title="Alertes IA" icon={<AlertTriangle size={18} />}>
                {data.alerts.length > 0 ? (
                  <div className="space-y-2">
                    {data.alerts.slice(0, 3).map((alert, index) => (
                      <AlertCard
                        key={`${alert.title || "alert"}-${index}`}
                        title={alert.title || "Alerte IA"}
                        message={alert.message || "Aucun détail disponible."}
                        level={alert.level || "medium"}
                      />
                    ))}
                  </div>
                ) : (
                  <EmptyState text="Aucune alerte IA détectée." />
                )}
              </Panel>

              <Panel title="Priorités IA" icon={<Database size={18} />}>
                {priorities.length > 0 ? (
                  <div className="space-y-2">
                    {priorities.slice(0, 3).map((item, index) => (
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
          </div>
        </section>

        <aside className="flex min-h-[calc(100vh-142px)] flex-col rounded-[24px] border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-[16px] bg-[#123A5C]/10 text-[#123A5C]">
                <Bot size={22} />
              </div>

              <div>
                <h2 className="text-lg font-black text-slate-900">
                  Assistant IA
                </h2>
                <p className="text-xs text-slate-500">
                  Bientôt conversationnel avec mémoire ERP.
                </p>
              </div>
            </div>
          </div>

          <div className="flex-1 space-y-3 overflow-auto p-4">
            <ChatBubble
              role="ai"
              text="Bonjour Moisés. Je peux déjà analyser ton ERP : stock, ventes, coûts, risques et priorités."
            />

            <ChatBubble
              role="user"
              text="Que dois-je surveiller en priorité aujourd’hui ?"
            />

            <ChatBubble
              role="ai"
              text={
                priorities[0]?.reason ||
                recommendations[0]?.reason ||
                "Je vais bientôt pouvoir répondre en temps réel avec les données complètes de l’entreprise."
              }
            />

            <div className="rounded-[18px] border border-dashed border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                Prochaine étape
              </p>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                Connexion du chat au moteur Norbee AI pour poser des questions
                naturelles sur les ventes, le stock, les bénéfices et les risques.
              </p>
            </div>
          </div>

          <div className="border-t border-slate-100 p-4">
            <div className="flex items-center gap-2 rounded-[18px] border border-slate-200 bg-slate-50 px-3 py-2">
              <input
                disabled
                placeholder="Écris ta question à l’IA..."
                className="min-w-0 flex-1 bg-transparent text-sm text-slate-500 outline-none placeholder:text-slate-400"
              />

              <button
                type="button"
                disabled
                className="flex h-10 w-10 items-center justify-center rounded-[14px] bg-[#123A5C] text-white opacity-50"
              >
                <Send size={17} />
              </button>
            </div>

            <p className="mt-2 text-center text-[11px] text-slate-400">
              Chat IA bientôt activé avec FastAPI, mémoire et raisonnement.
            </p>
          </div>
        </aside>
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
    <div className="rounded-[18px] border border-slate-200 bg-white p-3 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold text-slate-500">{title}</p>
          <h2 className="mt-1 text-xl font-black text-slate-900">
            {formatValue(value)}
          </h2>
          <p className="text-[11px] text-slate-400">{subtitle}</p>
        </div>

        <div
          className={`flex h-9 w-9 items-center justify-center rounded-[12px] ${toneClass}`}
        >
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
    <div className="rounded-[20px] border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[13px] bg-slate-100 text-[#123A5C]">
          {icon}
        </div>

        <div>
          <h2 className="text-sm font-black text-slate-900">{title}</h2>
          {subtitle && <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>}
        </div>
      </div>

      <div className="space-y-2">{children}</div>
    </div>
  );
}

function ReasoningItem({ label, text }: { label: string; text: string }) {
  return (
    <div className="rounded-[15px] border border-slate-100 bg-slate-50 p-3">
      <p className="text-[11px] font-bold uppercase tracking-wide text-[#123A5C]">
        {label}
      </p>
      <p className="mt-1.5 text-sm leading-relaxed text-slate-700">{text}</p>
    </div>
  );
}

function AlertCard({
  title,
  message,
  level,
}: {
  title: string;
  message: string;
  level: string;
}) {
  return (
    <div className="rounded-[15px] border border-red-100 bg-red-50 p-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-black text-red-800">{title}</p>
          <p className="mt-1 text-xs leading-relaxed text-red-700">{message}</p>
        </div>

        <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-bold text-red-700">
          {level}
        </span>
      </div>
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
    <div className="flex gap-2 rounded-[15px] border border-slate-100 bg-slate-50 p-3">
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#123A5C] text-xs font-black text-white">
        {index}
      </div>

      <div>
        <p className="text-sm font-black text-slate-800">{title}</p>
        <p className="mt-0.5 text-xs leading-relaxed text-slate-600">{text}</p>
      </div>
    </div>
  );
}

function RecommendationCard({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-[15px] border border-amber-100 bg-amber-50 p-3">
      <div className="flex items-start gap-2">
        <Lightbulb className="mt-0.5 text-amber-700" size={16} />
        <div>
          <p className="text-sm font-black text-slate-900">{title}</p>
          <p className="mt-1 text-xs leading-relaxed text-slate-700">{text}</p>
        </div>
      </div>
    </div>
  );
}

function MiniStatus({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-[15px] border border-slate-100 bg-slate-50 px-3 py-2.5">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="text-xs font-black text-slate-800">{value}</p>
    </div>
  );
}

function ChatBubble({ role, text }: { role: "ai" | "user"; text: string }) {
  const isAi = role === "ai";

  return (
    <div className={`flex gap-2 ${isAi ? "justify-start" : "justify-end"}`}>
      {isAi && (
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#123A5C]/10 text-[#123A5C]">
          <Bot size={16} />
        </div>
      )}

      <div
        className={`max-w-[82%] rounded-[18px] px-4 py-3 text-sm leading-relaxed ${
          isAi
            ? "bg-slate-100 text-slate-700"
            : "bg-[#123A5C] text-white"
        }`}
      >
        {text}
      </div>

      {!isAi && (
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-200 text-slate-600">
          <User size={16} />
        </div>
      )}
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-[15px] border border-slate-100 bg-slate-50 p-4 text-center text-xs text-slate-500">
      {text}
    </div>
  );
}

function formatValue(value: number) {
  return new Intl.NumberFormat("pt-PT", {
    maximumFractionDigits: 0,
  }).format(value);
}