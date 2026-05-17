"use client";

import { Send } from "lucide-react";

export default function AiChatInput({
  value,
  loading,
  onChange,
  onSend,
}: {
  value: string;
  loading: boolean;
  onChange: (value: string) => void;
  onSend: () => void;
}) {
  return (
    <div className="border-t border-slate-100 bg-white px-5 py-4">
      <div className="mx-auto flex max-w-5xl items-center gap-2 rounded-[18px] border border-slate-200 bg-slate-50 px-4 py-3">
        <input
          value={value}
          disabled={loading}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") onSend();
          }}
          placeholder="Écris ta question à l’IA..."
          className="min-w-0 flex-1 bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
        />

        <button
          type="button"
          onClick={onSend}
          disabled={loading || !value.trim()}
          className="flex h-10 w-10 items-center justify-center rounded-[14px] bg-[#123A5C] text-white transition disabled:opacity-45"
        >
          <Send size={17} />
        </button>
      </div>
    </div>
  );
}