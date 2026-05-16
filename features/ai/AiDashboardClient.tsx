"use client";

import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { useTranslations } from "next-intl";

import {
  Brain,
  AlertTriangle,
  Lightbulb,
  ShieldAlert,
  RefreshCw,
  Activity,
  Database,
} from "lucide-react";

type AiAlert = {
  notification_type?: string;
  level?: string;
  title?: string;
  message?: string;
};

type AiReasoning = {
  main_explanation?: string;
  risk_interpretation?: string;
  memory_context?: string;

  priority_explanation?: {
    title?: string;
    reason?: string;
  }[];

  recommendation_explanation?: {
    recommendation?: string;
    reason?: string;
  }[];
};

type AiMemorySummary = {
  summary?: string;
  count?: number;
  categories?: Record<string, number>;
};

type AiDashboardData = {
  alerts?: AiAlert[];
  reasoning?: AiReasoning;
  memory_summary?: AiMemorySummary;
};

export default function AiDashboardClient() {
  const t = useTranslations();

  const [data, setData] = useState<AiDashboardData | null>(null);

  const [loading, setLoading] = useState<boolean>(true);

  const [analyzing, setAnalyzing] = useState<boolean>(false);

  const [error, setError] = useState<string>("");

  async function loadAiDashboard() {
    setLoading(true);

    setError("");

    try {
      const res = await fetch("/api/ai/dashboard", {
        cache: "no-store",
      });

      const json = (await res.json()) as AiDashboardData & {
        message?: string;
      };

      if (!res.ok) {
        setError(
          json.message ||
            t?.("ai.errors.loadDashboard") ||
            "Erreur lors du chargement de l’IA."
        );

        return;
      }

      setData(json);
    } catch {
      setError(
        t?.("ai.errors.server") ||
          "Impossible de contacter le moteur IA."
      );
    } finally {
      setLoading(false);
    }
  }

  async function analyzeNow() {
    setAnalyzing(true);

    setError("");

    try {
      const res = await fetch("/api/ai/sync-alerts", {
        cache: "no-store",
      });

      const json = (await res.json()) as {
        message?: string;
      };

      if (!res.ok) {
        setError(
          json.message ||
            t?.("ai.errors.analysis") ||
            "Erreur lors de l’analyse IA."
        );

        return;
      }

      await loadAiDashboard();
    } catch {
      setError(
        t?.("ai.errors.analysisServer") ||
          "Impossible de lancer l’analyse IA."
      );
    } finally {
      setAnalyzing(false);
    }
  }

  useEffect(() => {
    const init = async () => {
      await loadAiDashboard();
    };

    init();
  }, []);

  const alerts = data?.alerts || [];

  const reasoning = data?.reasoning;

  const memorySummary = data?.memory_summary;

  return (
    <div className="space-y-5">
      <div className="rounded-[24px] bg-gradient-to-r from-[#123A5C] via-[#174B73] to-[#F5C982] p-6 text-white shadow-sm">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <Brain size={32} />

              <h1 className="text-3xl font-black">
                {t?.("ai.dashboard.title") ||
                  "Conseil de Gestion IA"}
              </h1>
            </div>

            <p className="mt-2 text-sm text-white/80">
              {t?.("ai.dashboard.description") ||
                "Analyse intelligente de l’entreprise : risques, priorités, recommandations, prévisions et mémoire IA."}
            </p>
          </div>

          <button
            type="button"
            onClick={analyzeNow}
            disabled={analyzing}
            className="flex items-center gap-2 rounded-[16px] bg-white px-5 py-3 text-sm font-bold text-[#123A5C] disabled:opacity-60"
          >
            <RefreshCw
              size={18}
              className={analyzing ? "animate-spin" : ""}
            />

            {analyzing
              ? t?.("ai.dashboard.analyzing") ||
                "Analyse en cours..."
              : t?.("ai.dashboard.analyzeNow") ||
                "Analyser maintenant"}
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-[16px] border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      )}

      {loading ? (
        <div className="rounded-[22px] bg-white p-10 text-center text-slate-500">
          {t?.("ai.dashboard.loading") ||
            "Chargement de l’intelligence artificielle..."}
        </div>
      ) : !data ? (
        <div className="rounded-[22px] bg-white p-10 text-center text-slate-500">
          {t?.("ai.dashboard.noData") ||
            "Aucune donnée IA disponible."}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <StatCard
              icon={<AlertTriangle size={22} />}
              title={
                t?.("ai.dashboard.alerts") || "Alertes IA"
              }
              value={alerts.length}
            />

            <StatCard
              icon={<Database size={22} />}
              title={
                t?.("ai.dashboard.memories") ||
                "Mémoires enregistrées"
              }
              value={memorySummary?.count || 0}
            />

            <StatCard
              icon={<Activity size={22} />}
              title={t?.("ai.dashboard.status") || "État IA"}
              value={t?.("ai.dashboard.active") || "Active"}
            />
          </div>

          <Panel
            icon={<Brain size={20} />}
            title={
              t?.("ai.dashboard.reasoning") ||
              "Raisonnement principal"
            }
          >
            <p className="leading-relaxed text-slate-700">
              {reasoning?.main_explanation ||
                t?.("ai.dashboard.noReasoning") ||
                "Aucune explication principale disponible."}
            </p>

            <p className="mt-3 text-sm font-semibold text-[#123A5C]">
              {reasoning?.risk_interpretation || ""}
            </p>

            <p className="mt-2 text-sm text-slate-500">
              {reasoning?.memory_context || ""}
            </p>
          </Panel>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <Panel
              icon={<ShieldAlert size={20} />}
              title={
                t?.("ai.dashboard.risks") ||
                "Risques et alertes"
              }
            >
              {alerts.length === 0 ? (
                <Empty
                  text={
                    t?.("ai.dashboard.noAlerts") ||
                    "Aucune alerte IA détectée."
                  }
                />
              ) : (
                <div className="space-y-3">
                  {alerts.map((alert, index) => (
                    <div
                      key={`${alert.title || "alert"}-${index}`}
                      className="rounded-[18px] border border-slate-100 bg-slate-50 p-4"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <h3 className="font-bold text-slate-800">
                          {alert.title ||
                            t?.("ai.dashboard.alert") ||
                            "Alerte IA"}
                        </h3>

                        <span
                          className={`rounded-full px-3 py-1 text-xs font-bold ${levelClass(
                            alert.level
                          )}`}
                        >
                          {alert.level || "medium"}
                        </span>
                      </div>

                      <p className="mt-2 text-sm text-slate-600">
                        {alert.message ||
                          t?.("ai.dashboard.noDetails") ||
                          "Aucun détail disponible."}
                      </p>

                      <p className="mt-2 text-xs text-slate-400">
                        Type :{" "}
                        {alert.notification_type || "AI"}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </Panel>

            <Panel
              icon={<Lightbulb size={20} />}
              title={
                t?.("ai.dashboard.priorities") ||
                "Priorités expliquées"
              }
            >
              {reasoning?.priority_explanation?.length ? (
                <div className="space-y-3">
                  {reasoning.priority_explanation.map(
                    (item, index) => (
                      <div
                        key={`${item.title || "priority"}-${index}`}
                        className="rounded-[18px] border border-slate-100 p-4"
                      >
                        <h3 className="font-bold text-slate-800">
                          {item.title ||
                            t?.("ai.dashboard.priority") ||
                            "Priorité"}
                        </h3>

                        <p className="mt-2 text-sm text-slate-600">
                          {item.reason ||
                            t?.("ai.dashboard.noExplanation") ||
                            "Aucune explication disponible."}
                        </p>
                      </div>
                    )
                  )}
                </div>
              ) : (
                <Empty
                  text={
                    t?.("ai.dashboard.noPriorities") ||
                    "Aucune priorité expliquée."
                  }
                />
              )}
            </Panel>
          </div>

          <Panel
            icon={<Lightbulb size={20} />}
            title={
              t?.("ai.dashboard.recommendations") ||
              "Recommandations IA"
            }
          >
            {reasoning?.recommendation_explanation?.length ? (
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {reasoning.recommendation_explanation.map(
                  (item, index) => (
                    <div
                      key={`${item.recommendation || "recommendation"}-${index}`}
                      className="rounded-[18px] border border-slate-100 bg-slate-50 p-4"
                    >
                      <h3 className="font-bold text-slate-800">
                        {item.recommendation ||
                          t?.("ai.dashboard.recommendation") ||
                          "Recommandation"}
                      </h3>

                      <p className="mt-2 text-sm text-slate-600">
                        {item.reason ||
                          t?.("ai.dashboard.noExplanation") ||
                          "Aucune explication disponible."}
                      </p>
                    </div>
                  )
                )}
              </div>
            ) : (
              <Empty
                text={
                  t?.("ai.dashboard.noRecommendations") ||
                  "Aucune recommandation disponible."
                }
              />
            )}
          </Panel>
        </>
      )}
    </div>
  );
}

function StatCard({
  icon,
  title,
  value,
}: {
  icon: ReactNode;
  title: string;
  value: string | number;
}) {
  return (
    <div className="flex items-center gap-4 rounded-[20px] border border-slate-100 bg-white p-5 shadow-sm">
      <div className="flex h-12 w-12 items-center justify-center rounded-[16px] bg-[#123A5C]/10 text-[#123A5C]">
        {icon}
      </div>

      <div>
        <p className="text-sm text-slate-500">{title}</p>

        <h2 className="text-2xl font-black text-slate-800">
          {value}
        </h2>
      </div>
    </div>
  );
}

function Panel({
  icon,
  title,
  children,
}: {
  icon: ReactNode;
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-[22px] border border-slate-100 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center gap-2 text-[#123A5C]">
        {icon}

        <h2 className="text-lg font-black text-slate-800">
          {title}
        </h2>
      </div>

      {children}
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <div className="rounded-[18px] bg-slate-50 p-6 text-center text-sm text-slate-500">
      {text}
    </div>
  );
}

function levelClass(level?: string) {
  const value = String(level || "").toLowerCase();

  if (value === "critical") {
    return "bg-red-100 text-red-700";
  }

  if (value === "high") {
    return "bg-orange-100 text-orange-700";
  }

  if (value === "medium") {
    return "bg-yellow-100 text-yellow-700";
  }

  return "bg-blue-100 text-blue-700";
}