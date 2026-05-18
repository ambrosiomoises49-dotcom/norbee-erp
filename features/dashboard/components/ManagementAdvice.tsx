"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { BrainCircuit, Loader2 } from "lucide-react";
import { useI18n } from "@/lib/i18n";

type MlDashboardResponse = {
  success: boolean;
  data?: {
    proactive_monitoring?: {
      total_alerts?: number;
    };
    executive_decisions?: unknown[];
    fraud_ai?: {
      fraud_analysis?: {
        signals_count?: number;
      };
    };
  };
};

export default function ManagementAdviceButton() {
  const router = useRouter();
  const { t } = useI18n();

  const [aiUnreadCount, setAiUnreadCount] = useState(0);
  const [loadingCount, setLoadingCount] = useState(true);

  useEffect(() => {
    async function loadAiCount() {
      try {
        setLoadingCount(true);

        const response = await fetch("/api/ai/ml-dashboard", {
          cache: "no-store",
        });

        const json = (await response.json()) as MlDashboardResponse;

        if (!json.success || !json.data) return;

        const proactiveCount =
          json.data.proactive_monitoring?.total_alerts || 0;

        const executiveCount =
          json.data.executive_decisions?.length || 0;

        const fraudCount =
          json.data.fraud_ai?.fraud_analysis?.signals_count || 0;

        setAiUnreadCount(proactiveCount + executiveCount + fraudCount);
      } catch {
        setAiUnreadCount(0);
      } finally {
        setLoadingCount(false);
      }
    }

    void loadAiCount();
  }, []);

  return (
    <button
      type="button"
      onClick={() => router.push("/conseil-gestion")}
      className="relative flex w-full items-center gap-3 rounded-[16px] px-4 py-3 hover:bg-slate-100"
    >
      <div className="relative">
        {loadingCount ? (
          <Loader2 size={22} className="animate-spin text-[#123A5C]" />
        ) : (
          <BrainCircuit size={22} />
        )}

        {!loadingCount && aiUnreadCount > 0 && (
          <span className="absolute -right-3 -top-3 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1.5 text-[10px] font-black text-white">
            {aiUnreadCount > 99 ? "99+" : aiUnreadCount}
          </span>
        )}
      </div>

      <span className="font-semibold">{t("managementAdvice")}</span>

      {loadingCount && (
        <span className="ml-auto text-[11px] font-semibold text-slate-400">
          Analyse...
        </span>
      )}
    </button>
  );
}