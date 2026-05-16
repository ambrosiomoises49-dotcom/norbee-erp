"use client";

import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n";
import {
  BrainCircuit,
  X,
  AlertTriangle,
  Lightbulb,
  Database,
  TrendingUp,
  ShieldCheck,
  Activity,
  Sparkles,
  Target,
  Clock,
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

export default function ManagementAdvice({
  onClose,
}: {
  onClose: () => void;
}) {
  const { t } = useI18n();

  const [data, setData] = useState<AiDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState("");

  async function loadAiDashboard() {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/ai/dashboard", {
        cache: "no-store",
      });

      const json = (await response.json()) as AiDashboardData & {
        message?: string;
      };

      if (!response.ok) {
        setError(json.message || t("aiLoadError"));
        return;
      }

      setData(json);
    } catch {
      setError(t("aiContactError"));
    } finally {
      setLoading(false);
    }
  }

  async function analyzeNow() {
    setAnalyzing(true);
    setError("");

    try {
      const response = await fetch("/api/ai/sync-alerts", {
        cache: "no-store",
      });

      const json = (await response.json()) as {
        message?: string;
      };

      if (!response.ok) {
        setError(json.message || t("aiAnalysisError"));
        return;
      }

      await loadAiDashboard();
    } catch {
      setError(t("aiAnalysisContactError"));
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

  const recommendations = reasoning?.recommendation_explanation || [];
  const priorities = reasoning?.priority_explanation || [];
  const memoryCategories = memorySummary?.categories || {};

  const alertCount = alerts.length;
  const memoryCount = memorySummary?.count || 0;
  const categoryCount = Object.keys(memoryCategories).length;

  const healthLabel =
    alertCount === 0
      ? t("aiStatusStable")
      : alertCount <= 2
        ? t("aiStatusWatch")
        : t("aiStatusRisk");

  const healthClass =
    alertCount === 0
      ? "bg-emerald-50 text-emerald-700 border-emerald-100"
      : alertCount <= 2
        ? "bg-amber-50 text-amber-700 border-amber-100"
        : "bg-red-50 text-red-700 border-red-100";

  return (
    <div className="fixed left-[200px] top-[110px] right-0 bottom-0 z-40 overflow-hidden bg-[#F4F7FA] p-5">
      <div className="flex h-full flex-col overflow-hidden rounded-[24px] bg-white shadow-xl">
        <div className="flex items-center justify-between border-b px-6 py-4">
          <div>
            <h2 className="flex items-center gap-2 text-2xl font-bold text-slate-800">
              <BrainCircuit size={26} />
              {t("managementAdvice")}
            </h2>

            <p className="text-sm text-slate-500">
              {t("managementAdviceDescription")}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 hover:bg-slate-100"
          >
            <X size={24} />
          </button>
        </div>

        <div className="flex-1 overflow-auto p-6">
          {error && (
            <div className="mb-5 rounded-[16px] border border-red-100 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
              {error}
            </div>
          )}

          {loading ? (
            <div className="rounded-[24px] border border-slate-100 bg-white p-10 text-center text-slate-500 shadow-sm">
              {t("aiLoading")}
            </div>
          ) : !data ? (
            <div className="rounded-[24px] border border-slate-100 bg-white p-10 text-center text-slate-500 shadow-sm">
              {t("aiNoData")}
            </div>
          ) : (
            <div className="space-y-6">
              <section className="relative overflow-hidden rounded-[32px] bg-gradient-to-r from-[#123A5C] via-[#174B73] to-[#F5C982] p-6 text-white shadow-sm">
                <div className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-white/10 blur-2xl" />

                <div className="relative flex flex-col gap-6 xl:flex-row xl:items-center xl:justify-between">
                  <div>
                    <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold text-white/90">
                      <Sparkles size={16} />
                      Norbee Intelligence
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15">
                        <BrainCircuit size={34} />
                      </div>

                      <div>
                        <h1 className="text-3xl font-black">
                          {t("managementAdvice")}
                        </h1>
                        <p className="mt-1 text-sm text-white/80">
                          {t("managementAdviceDescription")}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className={`rounded-2xl border px-5 py-4 ${healthClass}`}>
                    <p className="text-xs font-bold uppercase tracking-wide">
                      {t("aiBusinessStatus")}
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
                  title={t("aiAlerts")}
                  value={alertCount}
                  subtitle={t("aiDetectedRisks")}
                  tone={alertCount > 0 ? "danger" : "success"}
                />

                <MetricCard
                  icon={<Database size={22} />}
                  title={t("aiMemories")}
                  value={memoryCount}
                  subtitle={t("aiAnalyzedHistory")}
                  tone="primary"
                />

                <MetricCard
                  icon={<Activity size={22} />}
                  title={t("aiCategories")}
                  value={categoryCount}
                  subtitle={t("aiTrackedDomains")}
                  tone="warning"
                />

                <MetricCard
                  icon={<Target size={22} />}
                  title={t("aiPriorities")}
                  value={priorities.length}
                  subtitle={t("aiRecommendedActions")}
                  tone="primary"
                />
              </section>

              <section className="grid grid-cols-1 gap-5 xl:grid-cols-3">
                <div className="xl:col-span-2">
                  <Panel
                    title={t("aiMainReasoning")}
                    subtitle={t("aiMainReasoningDescription")}
                    icon={<TrendingUp size={21} />}
                  >
                    <ReasoningItem
                      label={t("aiGeneralAnalysis")}
                      text={
                        reasoning?.main_explanation ||
                        t("aiNoMainReasoning")
                      }
                    />

                    <ReasoningItem
                      label={t("aiRiskInterpretation")}
                      text={
                        reasoning?.risk_interpretation ||
                        t("aiNoRiskInterpretation")
                      }
                    />

                    <ReasoningItem
                      label={t("aiMemoryContext")}
                      text={
                        reasoning?.memory_context ||
                        t("aiNoMemoryContext")
                      }
                    />
                  </Panel>
                </div>

                <Panel
                  title={t("aiSummary")}
                  subtitle={t("aiSummaryDescription")}
                  icon={<BrainCircuit size={21} />}
                >
                  <MiniStatus
                    label={t("aiAlertLevel")}
                    value={
                      alertCount === 0
                        ? t("aiNormal")
                        : t("aiAttention")
                    }
                  />

                  <MiniStatus
                    label={t("aiMemory")}
                    value={memoryCount > 0 ? t("aiActive") : t("aiInitial")}
                  />

                  <MiniStatus
                    label={t("aiRecommendations")}
                    value={`${recommendations.length} ${t("aiSuggestions")}`}
                  />

                  <MiniStatus label={t("aiLastAnalysis")} value={t("aiRealtime")} />
                </Panel>
              </section>

              <section className="grid grid-cols-1 gap-5 xl:grid-cols-2">
                <Panel
                  title={t("aiAlerts")}
                  subtitle={t("aiAlertsDescription")}
                  icon={<AlertTriangle size={21} />}
                >
                  {alerts.length > 0 ? (
                    alerts.map((alert, index) => (
                      <AlertCard
                        key={`${alert.title || "alert"}-${index}`}
                        title={alert.title || t("aiAlert")}
                        message={alert.message || t("aiNoDetails")}
                        level={alert.level || "medium"}
                        type={alert.notification_type || "AI"}
                      />
                    ))
                  ) : (
                    <EmptyState text={t("aiNoAlerts")} />
                  )}
                </Panel>

                <Panel
                  title={t("aiPriorities")}
                  subtitle={t("aiPrioritiesDescription")}
                  icon={<Database size={21} />}
                >
                  {priorities.length > 0 ? (
                    priorities.map((item, index) => (
                      <ActionCard
                        key={`${item.title || "priority"}-${index}`}
                        title={item.title || t("aiPriority")}
                        text={item.reason || t("aiNoExplanation")}
                        index={index + 1}
                      />
                    ))
                  ) : (
                    <EmptyState text={t("aiNoPriorities")} />
                  )}
                </Panel>
              </section>

              <Panel
                title={t("aiRecommendations")}
                subtitle={t("aiRecommendationsDescription")}
                icon={<Lightbulb size={21} />}
              >
                {recommendations.length > 0 ? (
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    {recommendations.map((item, index) => (
                      <RecommendationCard
                        key={`${item.recommendation || "recommendation"}-${index}`}
                        title={item.recommendation || t("aiRecommendation")}
                        text={item.reason || t("aiNoExplanation")}
                      />
                    ))}
                  </div>
                ) : (
                  <EmptyState text={t("aiNoRecommendations")} />
                )}
              </Panel>

              <Panel
                title={t("aiForecasts")}
                subtitle={t("aiForecastsDescription")}
                icon={<Clock size={21} />}
              >
                <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                  <ForecastPlaceholder title={t("salesAnalysis")} />
                  <ForecastPlaceholder title={t("stockPrediction")} />
                  <ForecastPlaceholder title={t("profitForecast")} />
                </div>
              </Panel>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={analyzeNow}
                  disabled={analyzing}
                  className="rounded-[16px] bg-[#123A5C] px-5 py-3 text-sm font-bold text-white shadow-sm disabled:opacity-60"
                >
                  {analyzing ? t("aiAnalyzing") : t("aiAnalyzeNow")}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function MetricCard({
  icon,
  title,
  value,
  subtitle,
  tone,
}: {
  icon: React.ReactNode;
  title: string;
  value: number;
  subtitle: string;
  tone: "primary" | "success" | "danger" | "warning";
}) {
  const toneClass = {
    primary: "bg-[#123A5C]/10 text-[#123A5C]",
    success: "bg-emerald-50 text-emerald-700",
    danger: "bg-red-50 text-red-700",
    warning: "bg-amber-50 text-amber-700",
  }[tone];

  return (
    <div className="rounded-[24px] border border-slate-100 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <h2 className="mt-2 text-3xl font-black text-slate-900">
            {formatValue(value)}
          </h2>
          <p className="mt-1 text-xs text-slate-400">{subtitle}</p>
        </div>

        <div
          className={`flex h-12 w-12 items-center justify-center rounded-2xl ${toneClass}`}
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
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-[26px] border border-slate-100 bg-white p-5 shadow-sm">
      <div className="mb-5 flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#123A5C]/10 text-[#123A5C]">
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
    <div className="rounded-2xl bg-slate-50 p-4">
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
    <div className="rounded-2xl border border-red-100 bg-red-50 p-4">
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
    <div className="flex gap-3 rounded-2xl bg-slate-50 p-4">
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
    <div className="rounded-2xl border border-amber-100 bg-amber-50 p-4">
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
    <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="text-sm font-black text-slate-800">{value}</p>
    </div>
  );
}

function ForecastPlaceholder({ title }: { title: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-5">
      <p className="font-black text-slate-800">{title}</p>
      <p className="mt-2 text-sm text-slate-500">
        À connecter au moteur ML.
      </p>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-6 text-center text-sm text-slate-500">
      {text}
    </div>
  );
}

function formatValue(value: number) {
  return new Intl.NumberFormat("pt-PT", {
    maximumFractionDigits: 0,
  }).format(value);
}