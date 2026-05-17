import { AlertTriangle, Lightbulb, Target } from "lucide-react";
import AiSidebar from "./AiSidebar";
import AiChatPanel from "./AiChatPanel";
import type { AiMessage, AiSidebarItem } from "./types";

export default function AiWorkspace({
  alerts,
  priorities,
  recommendations,
  reasoning,
}: {
  alerts: {
    title?: string;
    message?: string;
    level?: string;
  }[];
  priorities: {
    title?: string;
    reason?: string;
  }[];
  recommendations: {
    recommendation?: string;
    reason?: string;
  }[];
  reasoning: {
    main_explanation?: string;
    risk_interpretation?: string;
  };
}) {
  const unreadCount = alerts.length + priorities.length + recommendations.length;

  const healthLabel =
    alerts.length === 0
      ? "Stable"
      : alerts.length <= 2
        ? "À surveiller"
        : "Risque élevé";

  const initialMessages: AiMessage[] = [
    {
      role: "ai",
      type: "analysis",
      title: "Analyse générale",
      text:
        reasoning.main_explanation ||
        "J’analyse actuellement les données de l’entreprise.",
      meta: "Norbee IA · Maintenant",
    },
    {
      role: "ai",
      type: "risk",
      title: "Interprétation du risque",
      text:
        reasoning.risk_interpretation ||
        "Aucune interprétation du risque disponible.",
      meta: "Analyse stratégique",
    },
    ...alerts.map((alert) => ({
      role: "ai" as const,
      type: "alert" as const,
      title: alert.title || "Alerte IA",
      text: alert.message || "Aucun détail disponible.",
      meta: `Niveau : ${alert.level || "medium"}`,
    })),
    ...priorities.map((priority) => ({
      role: "ai" as const,
      type: "priority" as const,
      title: priority.title || "Priorité IA",
      text: priority.reason || "Aucune explication disponible.",
      meta: "Priorité de gestion",
    })),
    ...recommendations.map((rec) => ({
      role: "ai" as const,
      type: "recommendation" as const,
      title: rec.recommendation || "Recommandation IA",
      text: rec.reason || "Aucune explication disponible.",
      meta: "Conseil opérationnel",
    })),
  ];

  const sidebarItems: AiSidebarItem[] = [
    {
      icon: <AlertTriangle size={15} />,
      label: "Alerte critique",
      value: alerts[0]?.title || "Aucune alerte critique",
      danger: alerts.length > 0,
    },
    {
      icon: <Target size={15} />,
      label: "Priorité",
      value: priorities[0]?.title || "Aucune priorité urgente",
    },
    {
      icon: <Lightbulb size={15} />,
      label: "Conseil principal",
      value: recommendations[0]?.recommendation || "Aucun conseil urgent",
    },
  ];

  return (
    <main className="h-[calc(100vh-110px)] overflow-hidden bg-[#F4F7FA] p-4">
      <div className="grid h-full min-h-0 grid-cols-1 gap-4 xl:grid-cols-[300px_minmax(0,1fr)]">
        <AiSidebar
          unreadCount={unreadCount}
          healthLabel={healthLabel}
          metrics={[
            { label: "Alertes", value: alerts.length },
            { label: "Priorités", value: priorities.length },
            { label: "Conseils", value: recommendations.length },
          ]}
          items={sidebarItems}
        />

        <AiChatPanel
          unreadCount={unreadCount}
          initialMessages={initialMessages}
        />
      </div>
    </main>
  );
}