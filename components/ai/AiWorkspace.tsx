import { AlertTriangle, BrainCircuit, Lightbulb, ShieldAlert, Target } from "lucide-react";
import AiSidebar from "./AiSidebar";
import AiChatPanel from "./AiChatPanel";
import type { AiMessage, AiSidebarItem } from "./types";

type AdvancedData = {
  executive_summary?: string;
  risk_score?: {
    score?: number;
    level?: string;
    label?: string;
  };
  proactive_monitoring?: {
    total_alerts?: number;
    high_count?: number;
    medium_count?: number;
    alerts?: {
      title?: string;
      message?: string;
      level?: string;
      action?: string;
    }[];
  };
  executive_decisions?: {
    title?: string;
    action?: string;
    reason?: string;
    priority?: string;
  }[];
  supply_ai?: {
    purchase_recommendations?: {
      recommendations?: {
        product_name?: string;
        recommended_purchase_quantity?: number;
        reason?: string;
      }[];
    };
    transfer_recommendations?: {
      recommendations?: {
        product_name?: string;
        target_cantina_name?: string;
        action?: string;
      }[];
    };
  };
  pricing_ai?: {
    pricing_recommendations?: {
      recommendations?: {
        product_name?: string;
        decision?: string;
        suggested_change_percent?: number;
        reason?: string;
      }[];
    };
  };
  fraud_ai?: {
    fraud_analysis?: {
      fraud_score?: number;
      risk_level?: string;
      signals?: {
        title?: string;
        message?: string;
        level?: string;
        action?: string;
      }[];
    };
  };
  multi_agent?: {
    executive_summary?: string;
  };
};

export default function AiWorkspace({
  alerts,
  priorities,
  recommendations,
  reasoning,
  advancedData,
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
  advancedData?: AdvancedData | null;
}) {
  const proactiveAlerts = advancedData?.proactive_monitoring?.alerts || [];
  const executiveDecisions = advancedData?.executive_decisions || [];
  const supplyPurchases =
    advancedData?.supply_ai?.purchase_recommendations?.recommendations || [];
  const supplyTransfers =
    advancedData?.supply_ai?.transfer_recommendations?.recommendations || [];
  const pricingRecommendations =
    advancedData?.pricing_ai?.pricing_recommendations?.recommendations || [];
  const fraudSignals = advancedData?.fraud_ai?.fraud_analysis?.signals || [];

  const unreadCount =
    alerts.length +
    priorities.length +
    recommendations.length +
    proactiveAlerts.length +
    executiveDecisions.length +
    fraudSignals.length;

  const healthLabel =
    advancedData?.risk_score?.label ||
    (alerts.length === 0
      ? "Stable"
      : alerts.length <= 2
        ? "À surveiller"
        : "Risque élevé");

  const initialMessages: AiMessage[] = [
    {
      role: "ai",
      type: "analysis",
      title: "Résumé exécutif IA",
      text:
        advancedData?.executive_summary ||
        reasoning.main_explanation ||
        "J’analyse actuellement les données de l’entreprise.",
      meta: "Norbee Intelligence",
    },
    {
      role: "ai",
      type: "risk",
      title: "Score de risque",
      text: advancedData?.risk_score
        ? `Score : ${advancedData.risk_score.score}/100 — ${advancedData.risk_score.label}`
        : reasoning.risk_interpretation || "Aucune interprétation du risque disponible.",
      meta: "Analyse stratégique",
    },

    ...proactiveAlerts.map((alert) => ({
      role: "ai" as const,
      type: "alert" as const,
      title: alert.title || "Alerte proactive",
      text: `${alert.message || "Aucun détail disponible."}${
        alert.action ? ` Action : ${alert.action}` : ""
      }`,
      meta: `Niveau : ${alert.level || "medium"}`,
    })),

    ...executiveDecisions.map((decision) => ({
      role: "ai" as const,
      type: "decision" as const,
      title: decision.title || "Décision exécutive",
      text: decision.action || decision.reason || "Aucune action disponible.",
      meta: `Priorité : ${decision.priority || "medium"}`,
    })),

    ...supplyPurchases.slice(0, 5).map((item) => ({
      role: "ai" as const,
      type: "recommendation" as const,
      title: `Supply AI — Acheter ${item.product_name || "produit"}`,
      text: `Quantité recommandée : ${item.recommended_purchase_quantity || 0}. ${
        item.reason || ""
      }`,
      meta: "Optimisation achats",
    })),

    ...supplyTransfers.slice(0, 5).map((item) => ({
      role: "ai" as const,
      type: "recommendation" as const,
      title: `Supply AI — Transfert ${item.product_name || "produit"}`,
      text: item.action || `Transférer vers ${item.target_cantina_name || "cantina cible"}.`,
      meta: "Optimisation stock",
    })),

    ...pricingRecommendations.slice(0, 5).map((item) => ({
      role: "ai" as const,
      type: "priority" as const,
      title: `Pricing AI — ${item.product_name || "Produit"}`,
      text: `${item.decision || "keep_price"} ${
        item.suggested_change_percent
          ? `(${item.suggested_change_percent}%)`
          : ""
      }. ${item.reason || ""}`,
      meta: "Optimisation prix",
    })),

    ...fraudSignals.slice(0, 5).map((signal) => ({
      role: "ai" as const,
      type: "alert" as const,
      title: signal.title || "Signal fraude",
      text: `${signal.message || ""} ${signal.action ? `Action : ${signal.action}` : ""}`,
      meta: `Fraud AI · ${signal.level || "medium"}`,
    })),
  ];

  const sidebarItems: AiSidebarItem[] = [
    {
      icon: <AlertTriangle size={15} />,
      label: "Alerte critique",
      value:
        proactiveAlerts[0]?.title ||
        alerts[0]?.title ||
        "Aucune alerte critique",
      danger: proactiveAlerts.length > 0 || alerts.length > 0,
    },
    {
      icon: <Target size={15} />,
      label: "Décision",
      value:
        executiveDecisions[0]?.title ||
        priorities[0]?.title ||
        "Aucune priorité urgente",
    },
    {
      icon: <Lightbulb size={15} />,
      label: "Conseil",
      value:
        pricingRecommendations[0]?.product_name ||
        recommendations[0]?.recommendation ||
        "Aucun conseil urgent",
    },
    {
      icon: <ShieldAlert size={15} />,
      label: "Fraud AI",
      value:
        advancedData?.fraud_ai?.fraud_analysis?.risk_level ||
        "Aucun signal élevé",
      danger: advancedData?.fraud_ai?.fraud_analysis?.risk_level === "high",
    },
  ];

  return (
    <main className="h-[calc(100vh-110px)] overflow-hidden bg-[#F4F7FA] p-4">
      <div className="grid h-full min-h-0 grid-cols-1 gap-4 xl:grid-cols-[320px_minmax(0,1fr)]">
        <AiSidebar
          unreadCount={unreadCount}
          healthLabel={healthLabel}
          metrics={[
            {
              label: "Alertes",
              value: advancedData?.proactive_monitoring?.total_alerts || alerts.length,
            },
            {
              label: "Décisions",
              value: executiveDecisions.length,
            },
            {
              label: "Fraude",
              value: fraudSignals.length,
            },
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