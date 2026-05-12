"use client";

import { useI18n } from "@/lib/i18n";
import { BrainCircuit, X } from "lucide-react";

export default function ManagementAdvice({
  onClose,
}: {
  onClose: () => void;
}) {
  const { t } = useI18n();

  return (
    <div className="fixed left-[200px] top-[110px] right-0 bottom-0 z-40 bg-[#F4F7FA] p-5 overflow-hidden">
      <div className="h-full bg-white rounded-[24px] shadow-xl flex flex-col overflow-hidden">
        <div className="px-6 py-4 border-b flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
              <BrainCircuit size={26} />
              {t("managementAdvice")}
            </h2>

            <p className="text-sm text-slate-500">
              {t("managementAdviceDescription")}
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-slate-100"
          >
            <X size={24} />
          </button>
        </div>

        <div className="flex-1 p-8 overflow-auto">
          <div className="max-w-3xl rounded-[24px] bg-[#123A5C]/5 border border-[#123A5C]/10 p-8">
            <h3 className="text-xl font-black text-slate-800">
              {t("aiManagementPreparing")}
            </h3>

            <p className="text-slate-600 mt-3">
              {t("aiManagementPreparingDescription")}
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-6">
              {[
                t("salesAnalysis"),
                t("purchaseSuggestions"),
                t("lowMarginAlerts"),
                t("slowProducts"),
                t("profitForecast"),
                t("cantinaComparison"),
              ].map((item) => (
                <div
                  key={item}
                  className="rounded-[16px] bg-white border p-4 font-semibold text-slate-700"
                >
                  {item}
                </div>
              ))}
            </div>

            <div className="mt-8 rounded-[20px] bg-white border border-slate-100 p-6">
              <h4 className="text-lg font-black text-slate-800">
                {t("futureCapabilities")}
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
                {[
                  t("stockPrediction"),
                  t("predictiveAlerts"),
                  t("advancedStatistics"),
                  t("behaviorAnalysis"),
                  t("automaticRecommendations"),
                  t("businessIntelligence"),
                ].map((item) => (
                  <div
                    key={item}
                    className="rounded-[14px] bg-slate-50 border border-slate-100 p-4 text-sm font-semibold text-slate-700"
                  >
                    {item}
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-6 rounded-[20px] bg-amber-50 border border-amber-100 p-5">
              <p className="text-sm text-amber-700 font-medium">
                {t("aiModuleDeployMessage")}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}