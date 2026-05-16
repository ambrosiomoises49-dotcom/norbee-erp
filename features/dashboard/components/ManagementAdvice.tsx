"use client";

import { useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18n";
import { BrainCircuit, X, ArrowRight } from "lucide-react";

export default function ManagementAdvice({
  onClose,
}: {
  onClose: () => void;
}) {
  const { t } = useI18n();
  const router = useRouter();

  function goToConseilGestion() {
    onClose();
    router.push("/conseil-gestion");
  }

  return (
    <div className="fixed bottom-0 left-[200px] right-0 top-[110px] z-40 overflow-hidden bg-[#F4F7FA] p-5">
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
            className="rounded-xl p-2 transition hover:bg-slate-100"
          >
            <X size={24} />
          </button>
        </div>

        <div className="flex flex-1 items-center justify-center overflow-auto p-8">
          <div className="w-full max-w-5xl rounded-[32px] border border-[#123A5C]/10 bg-gradient-to-br from-[#123A5C] via-[#174B73] to-[#F5C982] p-10 text-white shadow-2xl">
            <div className="flex flex-col gap-10 xl:flex-row xl:items-center xl:justify-between">
              <div className="max-w-2xl">
                <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold text-white/90">
                  <BrainCircuit size={18} />
                  Norbee Intelligence
                </div>

                <h1 className="text-4xl font-black leading-tight md:text-5xl">
                  {t("managementAdvice")}
                </h1>

                <p className="mt-5 text-lg leading-relaxed text-white/85">
                  {t("managementAdviceDescription")}
                </p>

                <div className="mt-8 grid grid-cols-1 gap-3 md:grid-cols-2">
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
                      className="rounded-[18px] border border-white/10 bg-white/10 px-5 py-4 backdrop-blur-sm"
                    >
                      <p className="font-semibold text-white">{item}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="w-full max-w-md rounded-[28px] bg-white p-8 text-slate-800 shadow-2xl">
                <div className="flex h-16 w-16 items-center justify-center rounded-[20px] bg-[#123A5C]/10 text-[#123A5C]">
                  <BrainCircuit size={34} />
                </div>

                <h2 className="mt-6 text-3xl font-black">
                  Norbee AI Dashboard
                </h2>

                <p className="mt-4 leading-relaxed text-slate-600">
                  {t("aiModuleDeployMessage")}
                </p>

                <div className="mt-8 space-y-3">
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
                      className="rounded-[16px] border border-slate-100 bg-slate-50 px-4 py-3"
                    >
                      <p className="text-sm font-semibold text-slate-700">
                        {item}
                      </p>
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={goToConseilGestion}
                  className="mt-8 flex w-full items-center justify-center gap-2 rounded-[18px] bg-[#123A5C] px-6 py-4 text-sm font-bold text-white transition hover:scale-[1.02] hover:bg-[#0F2F4B]"
                >
                  {t("openManagementAdvice")}
                  <ArrowRight size={18} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}