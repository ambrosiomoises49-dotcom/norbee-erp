import { Bot, User } from "lucide-react";
import type { AiMessage as AiMessageType } from "./types";

export default function AiMessage({ message }: { message: AiMessageType }) {
  const isUser = message.role === "user";

  if (isUser) {
    return (
      <div className="flex justify-end gap-3">
        <div className="max-w-[74%] rounded-[20px] bg-[#123A5C] px-4 py-3 text-white shadow-sm">
          <p className="text-sm font-black">{message.title}</p>
          <p className="mt-1 text-sm leading-relaxed">{message.text}</p>
          {message.meta && (
            <p className="mt-2 text-[11px] text-white/60">{message.meta}</p>
          )}
        </div>

        <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-200 text-slate-600">
          <User size={16} />
        </div>
      </div>
    );
  }

  const styles = {
    analysis: "border-slate-200 bg-white text-slate-800",
    risk: "border-amber-100 bg-amber-50 text-amber-900",
    alert: "border-red-100 bg-red-50 text-red-800",
    priority: "border-blue-100 bg-blue-50 text-blue-900",
    recommendation: "border-emerald-100 bg-emerald-50 text-emerald-900",
    decision: "border-purple-100 bg-purple-50 text-purple-900",
    error: "border-red-100 bg-red-50 text-red-800",
    loading: "border-slate-200 bg-white text-slate-500",
    user: "border-slate-200 bg-white text-slate-800",
  }[message.type];

  return (
    <div className="flex items-start gap-3">
      <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#123A5C]/10 text-[#123A5C]">
        <Bot size={16} />
      </div>

      <div className={`max-w-[76%] rounded-[20px] border px-4 py-3 shadow-sm ${styles}`}>
        <p className="text-sm font-black">{message.title}</p>
        <p className="mt-1 text-sm leading-relaxed">{message.text}</p>
        {message.meta && (
          <p className="mt-2 text-[11px] opacity-60">{message.meta}</p>
        )}
      </div>
    </div>
  );
}