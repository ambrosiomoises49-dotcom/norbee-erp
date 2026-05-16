"use client";

import { useRouter } from "next/navigation";
import { BrainCircuit } from "lucide-react";
import { useI18n } from "@/lib/i18n";

export default function ManagementAdviceButton() {
  const router = useRouter();
  const { t } = useI18n();

  return (
    <button
      type="button"
      onClick={() => router.push("/conseil-gestion")}
      className="flex items-center gap-3 rounded-[16px] px-4 py-3 hover:bg-slate-100"
    >
      <BrainCircuit size={22} />

      <span className="font-semibold">
        {t("managementAdvice")}
      </span>
    </button>
  );
}