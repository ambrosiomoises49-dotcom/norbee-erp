import { Brain, ShieldCheck } from "lucide-react";
import type { AiSidebarProps } from "./types";

export default function AiSidebar({
  unreadCount,
  healthLabel,
  metrics,
  items,
}: AiSidebarProps) {
  return (
    <aside className="flex h-full min-h-0 flex-col rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm">
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

      <div className="mt-5 rounded-2xl border border-slate-100 bg-slate-50 p-3">
        <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
          État entreprise
        </p>

        <div className="mt-2 flex items-center gap-2">
          <ShieldCheck size={18} className="text-[#123A5C]" />
          <p className="text-lg font-black text-slate-900">{healthLabel}</p>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2">
        {metrics.map((metric) => (
          <div
            key={metric.label}
            className="rounded-xl border border-slate-100 bg-slate-50 p-2 text-center"
          >
            <p className="text-lg font-black text-slate-900">{metric.value}</p>
            <p className="text-[10px] font-semibold text-slate-500">
              {metric.label}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-4 space-y-2 overflow-hidden">
        {items.map((item) => (
          <div
            key={item.label}
            className="rounded-2xl border border-slate-100 bg-slate-50 p-3"
          >
            <div className="flex items-center gap-2">
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-xl ${
                  item.danger
                    ? "bg-red-50 text-red-600"
                    : "bg-[#123A5C]/10 text-[#123A5C]"
                }`}
              >
                {item.icon}
              </div>

              <div className="min-w-0">
                <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
                  {item.label}
                </p>
                <p className="truncate text-xs font-black text-slate-800">
                  {item.value}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-auto rounded-2xl border border-dashed border-slate-200 bg-white p-3">
        <p className="text-xs font-black text-slate-800">Mode intelligent</p>
        <p className="mt-1 text-xs leading-relaxed text-slate-500">
          La discussion devient le centre de pilotage de l’entreprise.
        </p>
      </div>
    </aside>
  );
}