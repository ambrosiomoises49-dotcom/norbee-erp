"use client";

import { useRef, useState } from "react";
import { Bot } from "lucide-react";
import AiMessage from "./AiMessage";
import AiChatInput from "./AiChatInput";
import type { AiMessage as AiMessageType } from "./types";

type AiChatResponse = {
  success: boolean;
  data?: {
    answer: string;
    recommendations?: string[];
    intent?: string;
  };
  message?: string;
};

export default function AiChatPanel({
  initialMessages,
  unreadCount,
}: {
  initialMessages: AiMessageType[];
  unreadCount: number;
}) {
  const [messages, setMessages] = useState<AiMessageType[]>(initialMessages);
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  function scrollToBottom() {
    setTimeout(() => {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 50);
  }

  async function sendQuestion() {
    const cleanQuestion = question.trim();
    if (!cleanQuestion || loading) return;

    setMessages((current) => [
      ...current,
      {
        role: "user",
        type: "user",
        title: "Moi",
        text: cleanQuestion,
        meta: "Question envoyée",
      },
    ]);

    setQuestion("");
    setLoading(true);
    scrollToBottom();

    try {
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          question: cleanQuestion,
          lang: "fr",
          days: 30,
        }),
      });

      const json = (await response.json()) as AiChatResponse;

      if (!response.ok || !json.success || !json.data) {
        setMessages((current) => [
          ...current,
          {
            role: "ai",
            type: "error",
            title: "Erreur IA",
            text: json.message || "Impossible d’obtenir une réponse de Norbee AI.",
            meta: "Erreur",
          },
        ]);
        return;
      }

      const recommendations = json.data.recommendations || [];

      setMessages((current) => [
        ...current,
        {
          role: "ai",
          type: "analysis",
          title: "Norbee AI",
          text: json.data?.answer || "Aucune réponse disponible.",
          meta: json.data?.intent ? `Intent : ${json.data.intent}` : "Réponse IA",
        },
        ...recommendations.map((item) => ({
          role: "ai" as const,
          type: "recommendation" as const,
          title: "Recommandation",
          text: item,
          meta: "Conseil opérationnel",
        })),
      ]);
    } catch {
      setMessages((current) => [
        ...current,
        {
          role: "ai",
          type: "error",
          title: "Erreur IA",
          text: "Erreur de communication avec Norbee AI.",
          meta: "Connexion",
        },
      ]);
    } finally {
      setLoading(false);
      scrollToBottom();
    }
  }

  return (
    <section className="flex h-full min-h-0 flex-col overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
      <header className="flex shrink-0 items-center justify-between border-b border-slate-100 px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="relative flex h-11 w-11 items-center justify-center rounded-2xl bg-[#123A5C]/10 text-[#123A5C]">
            <Bot size={23} />
            {unreadCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1.5 text-[10px] font-black text-white">
                {unreadCount}
              </span>
            )}
          </div>

          <div>
            <h2 className="text-lg font-black text-slate-900">Messages IA</h2>
            <p className="text-xs text-slate-500">
              Analyse, recommandations et chat conversationnel.
            </p>
          </div>
        </div>

        <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
          Actif
        </span>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto bg-[#F7F8FA] px-5 py-4">
        <div className="mx-auto max-w-5xl space-y-3">
          {messages.map((message, index) => (
            <AiMessage key={`${message.title}-${index}`} message={message} />
          ))}

          {loading && (
            <AiMessage
              message={{
                role: "ai",
                type: "loading",
                title: "Norbee AI",
                text: "Analyse en cours...",
                meta: "Traitement",
              }}
            />
          )}

          <div ref={bottomRef} />
        </div>
      </div>

      <AiChatInput
        value={question}
        loading={loading}
        onChange={setQuestion}
        onSend={sendQuestion}
      />
    </section>
  );
}