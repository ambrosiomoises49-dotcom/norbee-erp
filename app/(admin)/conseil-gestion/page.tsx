import type { ReactNode } from "react";
import {
  Brain,
  AlertTriangle,
  Lightbulb,
  TrendingUp,
  Database,
  ShieldCheck,
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
      <main className="min-h-[calc(100vh-110px)] bg-[#F4F7FA] p-3">
        <div className="rounded-[18px] border border-red-100 bg-red-50 p-4 text-red-700">
          Impossible de charger l’IA.
        </div>
      </main>
    );
  }

  const alerts = data.alerts || [];
  const reasoning = data.reasoning;
  const recommendations = reasoning.recommendation_explanation || [];
  const priorities = reasoning.priority_explanation || [];

  const alertCount = alerts.length;
  const unreadAiMessages = alertCount + recommendations.length + priorities.length;

  const healthLabel =
    alertCount === 0 ? "Stable" : alertCount <= 2 ? "À surveiller" : "Risque élevé";

  const healthClass =
    alertCount === 0
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : alertCount <= 2
        ? "border-amber-200 bg-amber-50 text-amber-700"
        : "border-red-200 bg-red-50 text-red-700";

  const aiMessages = [
    ...alerts.map((alert) => ({
      role: "ai" as const,
      tone: "danger" as const,
      title: alert.title || "Alerte IA",
      text: alert.message || "Aucun détail disponible.",
      meta: `Niveau : ${alert.level || "medium"}`,
    })),
    ...priorities.map((priority) => ({
      role: "ai" as const,
      tone: "primary" as const,
      title: priority.title || "Priorité IA",
      text: priority.reason || "Aucune explication disponible.",
      meta: "Priorité de gestion",
    })),
    ...recommendations.map((recommendation) => ({
      role: "ai" as const,
      tone: "success" as const,
      title: recommendation.recommendation || "Recommandation IA",
      text: recommendation.reason || "Aucune explication disponible.",
      meta: "Conseil opérationnel",
    })),
  ];

  return (
    <main className="min-h-[calc(100vh-110px)] bg-[#F4F7FA] p-3 md:p-4">
      <div className="grid min-h-[calc(100vh-138px)] grid-cols-1 gap-3 xl:grid-cols-[minmax(0,1.45fr)_minmax(360px,0.55fr)]">
        <section className="space-y-3 overflow-hidden">
          <div className="grid grid-cols-1 gap-3 xl:grid-cols-[minmax(0,1fr)_180px_145px_145px_145px]">
            <div className="rounded-[18px] border border-slate-200 bg-white p-3 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-[15px] bg-[#123A5C] text-white">
                  <Brain size={23} />
                </div>

                <div>
                  <h1 className="text-xl font-black text-slate-900">
                    Conseil de Gestion IA
                  </h1>
                  <p className="mt-0.5 text-[11px] font-bold uppercase tracking-wide text-[#123A5C]">
                    Norbee Intelligence
                  </p>
                </div>
              </div>
            </div>

            <CompactStatus
              label="État entreprise"
              value={healthLabel}
              icon={<ShieldCheck size={17} />}
              className={healthClass}
            />

            <CompactMetric
              title="Messages IA"
              value={unreadAiMessages}
              icon={<Bot size={17} />}
              tone="primary"
            />

            <CompactMetric
              title="Alertes"
              value={alertCount}
              icon={<AlertTriangle size={17} />}
              tone={alertCount > 0 ? "danger" : "success"}
            />

            <CompactMetric
              title="Priorités"
              value={priorities.length}
              icon={<Target size={17} />}
              tone="neutral"
            />
          </div>

          <div className="grid grid-cols-1 gap-3 xl:grid-cols-12">
            <div className="space-y-3 xl:col-span-7">
              <Panel
                title="Raisonnement principal"
                icon={<TrendingUp size={17} />}
              >
                <ReasoningItem
                  label="Analyse générale"
                  text={
                    reasoning.main_explanation ||
                    "Aucun raisonnement principal disponible."
                  }
                />

                <ReasoningItem
                  label="Interprétation du risque"
                  text={
                    reasoning.risk_interpretation ||
                    "Aucune interprétation du risque disponible."
                  }
                />

                <ReasoningItem
                  label="Contexte mémoire"
                  text={
                    reasoning.memory_context ||
                    "Aucun contexte mémoire disponible."
                  }
                />
              </Panel>

              <Panel
                title="Recommandations principales"
                icon={<Lightbulb size={17} />}
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

            <div className="space-y-3 xl:col-span-5">
              <Panel title="Alertes IA" icon={<AlertTriangle size={17} />}>
                {alerts.length > 0 ? (
                  <div className="space-y-2">
                    {alerts.slice(0, 3).map((alert, index) => (
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

              <Panel title="Priorités IA" icon={<Database size={17} />}>
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

        <aside className="flex min-h-[calc(100vh-138px)] flex-col rounded-[22px] border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 p-3">
            <div className="flex items-center gap-3">
              <div className="relative flex h-10 w-10 items-center justify-center rounded-[14px] bg-[#123A5C]/10 text-[#123A5C]">
                <Bot size={21} />
                {unreadAiMessages > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1.5 text-[10px] font-black text-white">
                    {unreadAiMessages}
                  </span>
                )}
              </div>

              <div>
                <h2 className="text-base font-black text-slate-900">
                  Messages IA
                </h2>
                <p className="text-[11px] text-slate-500">
                  Conseils, alertes et recommandations.
                </p>
              </div>
            </div>

            <span className="rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-bold text-emerald-700">
              Actif
            </span>
          </div>

          <div className="flex-1 space-y-2 overflow-auto bg-[#EFEFEF] p-3">
            <ChatBubble
              role="ai"
              title="Synthèse automatique"
              text={
                reasoning.main_explanation ||
                "J’analyse actuellement les données de l’entreprise."
              }
              meta="Norbee IA"
              tone="primary"
            />

            {aiMessages.length > 0 ? (
              aiMessages.map((message, index) => (
                <ChatBubble
                  key={`${message.title}-${index}`}
                  role={message.role}
                  title={message.title}
                  text={message.text}
                  meta={message.meta}
                  tone={message.tone}
                />
              ))
            ) : (
              <ChatBubble
                role="ai"
                title="Aucune urgence"
                text="Je n’ai détecté aucune alerte critique pour le moment."
                meta="Norbee IA"
                tone="success"
              />
            )}

            <ChatBubble
              role="user"
              title="Moi"
              text="Je pourrai bientôt poser des questions directement ici."
              meta="Préparation du chat conversationnel"
              tone="neutral"
            />
          </div>

          <div className="border-t border-slate-100 bg-white p-3">
            <div className="flex items-center gap-2 rounded-[16px] border border-slate-200 bg-slate-50 px-3 py-2">
              <input
                disabled
                placeholder="Écris ta question à l’IA..."
                className="min-w-0 flex-1 bg-transparent text-sm text-slate-500 outline-none placeholder:text-slate-400"
              />

              <button
                type="button"
                disabled
                className="flex h-9 w-9 items-center justify-center rounded-[13px] bg-[#123A5C] text-white opacity-50"
              >
                <Send size={16} />
              </button>
            </div>

            <p className="mt-2 text-center text-[10px] text-slate-400">
              Le chat conversationnel sera connecté au moteur Norbee AI.
            </p>
          </div>
        </aside>
      </div>
    </main>
  );
}

function CompactStatus({
  label,
  value,
  icon,
  className,
}: {
  label: string;
  value: string;
  icon: ReactNode;
  className: string;
}) {
  return (
    <div className={`rounded-[18px] border p-3 shadow-sm ${className}`}>
      <p className="text-[10px] font-bold uppercase tracking-wide">{label}</p>
      <div className="mt-1 flex items-center gap-2">
        {icon}
        <p className="text-sm font-black">{value}</p>
      </div>
    </div>
  );
}

function CompactMetric({
  title,
  value,
  icon,
  tone,
}: {
  title: string;
  value: number;
  icon: ReactNode;
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
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-[11px] font-semibold text-slate-500">{title}</p>
          <p className="text-lg font-black text-slate-900">{formatValue(value)}</p>
        </div>

        <div className={`flex h-9 w-9 items-center justify-center rounded-[12px] ${toneClass}`}>
          {icon}
        </div>
      </div>
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
    <div className="rounded-[18px] border border-slate-200 bg-white p-3 shadow-sm">
      <div className="mb-2.5 flex items-center gap-2">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[11px] bg-slate-100 text-[#123A5C]">
          {icon}
        </div>

        <h2 className="text-sm font-black text-slate-900">{title}</h2>
      </div>

      <div className="space-y-2">{children}</div>
    </div>
  );
}

function ReasoningItem({ label, text }: { label: string; text: string }) {
  return (
    <div className="rounded-[13px] border border-slate-100 bg-slate-50 p-3">
      <p className="text-[10px] font-bold uppercase tracking-wide text-[#123A5C]">
        {label}
      </p>
      <p className="mt-1 text-xs leading-relaxed text-slate-700">{text}</p>
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
    <div className="rounded-[13px] border border-red-100 bg-red-50 p-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs font-black text-red-800">{title}</p>
          <p className="mt-1 text-[11px] leading-relaxed text-red-700">
            {message}
          </p>
        </div>

        <span className="rounded-full bg-white px-2 py-0.5 text-[9px] font-bold text-red-700">
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
    <div className="flex gap-2 rounded-[13px] border border-slate-100 bg-slate-50 p-3">
      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#123A5C] text-[10px] font-black text-white">
        {index}
      </div>

      <div>
        <p className="text-xs font-black text-slate-800">{title}</p>
        <p className="mt-0.5 text-[11px] leading-relaxed text-slate-600">
          {text}
        </p>
      </div>
    </div>
  );
}

function RecommendationCard({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-[13px] border border-amber-100 bg-amber-50 p-3">
      <div className="flex items-start gap-2">
        <Lightbulb className="mt-0.5 text-amber-700" size={14} />
        <div>
          <p className="text-xs font-black text-slate-900">{title}</p>
          <p className="mt-1 text-[11px] leading-relaxed text-slate-700">
            {text}
          </p>
        </div>
      </div>
    </div>
  );
}

function ChatBubble({
  role,
  title,
  text,
  meta,
  tone,
}: {
  role: "ai" | "user";
  title: string;
  text: string;
  meta: string;
  tone: "primary" | "success" | "danger" | "neutral";
}) {
  const isAi = role === "ai";

  const toneClass = {
    primary: "border-slate-200 bg-white text-slate-800",
    success: "border-emerald-100 bg-emerald-50 text-emerald-800",
    danger: "border-red-100 bg-red-50 text-red-800",
    neutral: "border-[#123A5C] bg-[#123A5C] text-white",
  }[tone];

  return (
    <div className={`flex gap-2 ${isAi ? "justify-start" : "justify-end"}`}>
      {isAi && (
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#123A5C]/10 text-[#123A5C]">
          <Bot size={15} />
        </div>
      )}

      <div className={`max-w-[86%] rounded-[16px] border px-3 py-2 shadow-sm ${toneClass}`}>
        <p className="text-xs font-black">{title}</p>
        <p className="mt-1 text-xs leading-relaxed">{text}</p>
        <p className={`mt-1 text-[10px] ${isAi ? "text-slate-400" : "text-white/70"}`}>
          {meta}
        </p>
      </div>

      {!isAi && (
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-200 text-slate-600">
          <User size={15} />
        </div>
      )}
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-[13px] border border-slate-100 bg-slate-50 p-3 text-center text-xs text-slate-500">
      {text}
    </div>
  );
}

function formatValue(value: number) {
  return new Intl.NumberFormat("pt-PT", {
    maximumFractionDigits: 0,
  }).format(value);
}