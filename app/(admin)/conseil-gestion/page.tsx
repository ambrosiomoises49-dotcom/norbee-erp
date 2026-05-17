import {
  AlertTriangle,
  Bot,
  Brain,
  CheckCircle2,
  Lightbulb,
  Send,
  ShieldCheck,
  Target,
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
        <div className="rounded-2xl border border-red-100 bg-red-50 p-5 text-sm font-semibold text-red-700">
          Impossible de charger l’IA.
        </div>
      </main>
    );
  }

  const alerts = data.alerts || [];
  const reasoning = data.reasoning;
  const recommendations = reasoning.recommendation_explanation || [];
  const priorities = reasoning.priority_explanation || [];

  const unreadCount = alerts.length + recommendations.length + priorities.length;

  const healthLabel =
    alerts.length === 0 ? "Stable" : alerts.length <= 2 ? "À surveiller" : "Risque élevé";

  const messages = [
    {
      type: "analysis",
      title: "Analyse générale",
      text:
        reasoning.main_explanation ||
        "J’analyse actuellement les données de l’entreprise.",
      meta: "Norbee IA · Maintenant",
    },
    {
      type: "risk",
      title: "Interprétation du risque",
      text:
        reasoning.risk_interpretation ||
        "Aucune interprétation du risque disponible.",
      meta: "Analyse stratégique",
    },
    ...alerts.map((alert) => ({
      type: "alert",
      title: alert.title || "Alerte IA",
      text: alert.message || "Aucun détail disponible.",
      meta: `Niveau : ${alert.level || "medium"}`,
    })),
    ...priorities.map((priority) => ({
      type: "priority",
      title: priority.title || "Priorité IA",
      text: priority.reason || "Aucune explication disponible.",
      meta: "Priorité de gestion",
    })),
    ...recommendations.map((rec) => ({
      type: "recommendation",
      title: rec.recommendation || "Recommandation IA",
      text: rec.reason || "Aucune explication disponible.",
      meta: "Conseil opérationnel",
    })),
  ];

  return (
    <main className="min-h-[calc(100vh-110px)] bg-[#F4F7FA] p-4">
      <div className="grid min-h-[calc(100vh-142px)] grid-cols-1 gap-4 xl:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="flex flex-col gap-3 rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-[#123A5C] text-white">
              <Brain size={25} />
              {unreadCount > 0 && (
                <span className="absolute -right-2 -top-2 flex h-6 min-w-6 items-center justify-center rounded-full bg-red-600 px-1.5 text-[11px] font-black text-white">
                  {unreadCount}
                </span>
              )}
            </div>

            <div>
              <h1 className="text-xl font-black leading-tight text-slate-900">
                Conseil IA
              </h1>
              <p className="text-[11px] font-bold uppercase tracking-wide text-[#123A5C]">
                Norbee Intelligence
              </p>
            </div>
          </div>

          <div className="mt-2 rounded-2xl border border-slate-100 bg-slate-50 p-3">
            <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
              État entreprise
            </p>

            <div className="mt-2 flex items-center gap-2">
              <ShieldCheck size={18} className="text-[#123A5C]" />
              <p className="text-lg font-black text-slate-900">{healthLabel}</p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <MiniMetric label="Alertes" value={alerts.length} />
            <MiniMetric label="Priorités" value={priorities.length} />
            <MiniMetric label="Conseils" value={recommendations.length} />
          </div>

          <div className="mt-2 space-y-2">
            <SideItem
              icon={<AlertTriangle size={15} />}
              label="Alerte critique"
              value={alerts[0]?.title || "Aucune alerte critique"}
              danger={alerts.length > 0}
            />

            <SideItem
              icon={<Target size={15} />}
              label="Priorité"
              value={priorities[0]?.title || "Aucune priorité urgente"}
            />

            <SideItem
              icon={<Lightbulb size={15} />}
              label="Conseil principal"
              value={recommendations[0]?.recommendation || "Aucun conseil urgent"}
            />
          </div>

          <div className="mt-auto rounded-2xl border border-dashed border-slate-200 bg-white p-3">
            <p className="text-xs font-black text-slate-800">
              Prochaine étape
            </p>
            <p className="mt-1 text-xs leading-relaxed text-slate-500">
              Activer le vrai chat conversationnel avec mémoire, questions libres et réponses en temps réel.
            </p>
          </div>
        </aside>

        <section className="flex min-h-[calc(100vh-142px)] flex-col overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
          <header className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <div className="flex items-center gap-3">
              <div className="relative flex h-11 w-11 items-center justify-center rounded-2xl bg-[#123A5C]/10 text-[#123A5C]">
                <Bot size={23} />
                {unreadCount > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1.5 text-[10px] font-black text-white">
                    {unreadCount}
                  </span>
                )}
              </div>

              <div>
                <h2 className="text-lg font-black text-slate-900">
                  Messages IA
                </h2>
                <p className="text-xs text-slate-500">
                  Alertes, recommandations et conseils de gestion.
                </p>
              </div>
            </div>

            <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
              Actif
            </span>
          </header>

          <div className="flex-1 overflow-auto bg-[#F7F7F7] px-5 py-4">
            <div className="mx-auto max-w-4xl space-y-3">
              {messages.map((message, index) => (
                <AiMessage
                  key={`${message.title}-${index}`}
                  type={message.type}
                  title={message.title}
                  text={message.text}
                  meta={message.meta}
                />
              ))}

              <UserMessage text="Je pourrai bientôt poser une question directe ici, par exemple : quels produits dois-je acheter cette semaine ?" />
            </div>
          </div>

          <footer className="border-t border-slate-100 bg-white p-4">
            <div className="mx-auto flex max-w-4xl items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2">
              <input
                disabled
                placeholder="Écris ta question à l’IA..."
                className="min-w-0 flex-1 bg-transparent text-sm text-slate-500 outline-none placeholder:text-slate-400"
              />

              <button
                type="button"
                disabled
                className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#123A5C] text-white opacity-50"
              >
                <Send size={17} />
              </button>
            </div>

            <p className="mt-2 text-center text-[11px] text-slate-400">
              Chat conversationnel en préparation : mémoire ERP, analyse temps réel et réponses naturelles.
            </p>
          </footer>
        </section>
      </div>
    </main>
  );
}

function MiniMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50 p-2 text-center">
      <p className="text-lg font-black text-slate-900">{value}</p>
      <p className="text-[10px] font-semibold text-slate-500">{label}</p>
    </div>
  );
}

function SideItem({
  icon,
  label,
  value,
  danger,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  danger?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3">
      <div className="flex items-center gap-2">
        <div
          className={`flex h-8 w-8 items-center justify-center rounded-xl ${
            danger ? "bg-red-50 text-red-600" : "bg-[#123A5C]/10 text-[#123A5C]"
          }`}
        >
          {icon}
        </div>

        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
            {label}
          </p>
          <p className="truncate text-xs font-black text-slate-800">{value}</p>
        </div>
      </div>
    </div>
  );
}

function AiMessage({
  type,
  title,
  text,
  meta,
}: {
  type: string;
  title: string;
  text: string;
  meta: string;
}) {
  const styles = {
    analysis: "border-slate-200 bg-white text-slate-800",
    risk: "border-amber-100 bg-amber-50 text-amber-900",
    alert: "border-red-100 bg-red-50 text-red-800",
    priority: "border-blue-100 bg-blue-50 text-blue-900",
    recommendation: "border-emerald-100 bg-emerald-50 text-emerald-900",
  }[type] || "border-slate-200 bg-white text-slate-800";

  return (
    <div className="flex items-start gap-3">
      <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#123A5C]/10 text-[#123A5C]">
        <Bot size={16} />
      </div>

      <div className={`max-w-[82%] rounded-2xl border px-4 py-3 shadow-sm ${styles}`}>
        <p className="text-sm font-black">{title}</p>
        <p className="mt-1 text-sm leading-relaxed">{text}</p>
        <p className="mt-2 text-[11px] opacity-60">{meta}</p>
      </div>
    </div>
  );
}

function UserMessage({ text }: { text: string }) {
  return (
    <div className="flex justify-end gap-3">
      <div className="max-w-[78%] rounded-2xl bg-[#123A5C] px-4 py-3 text-white shadow-sm">
        <p className="text-sm font-black">Moi</p>
        <p className="mt-1 text-sm leading-relaxed">{text}</p>
      </div>

      <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-200 text-slate-600">
        <User size={16} />
      </div>
    </div>
  );
}