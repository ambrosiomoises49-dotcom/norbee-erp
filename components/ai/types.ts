
import type { ReactNode } from "react";

export type AiMessageType =
  | "analysis"
  | "risk"
  | "alert"
  | "priority"
  | "recommendation"
  | "decision"
  | "user"
  | "error"
  | "loading";

export type AiMessage = {
  id?: string;
  role: "ai" | "user";
  type: AiMessageType;
  title: string;
  text: string;
  meta?: string;
};

export type AiSidebarMetric = {
  label: string;
  value: number;
};

export type AiSidebarItem = {
  label: string;
  value: string;
  icon: ReactNode;
  danger?: boolean;
};

export type AiSidebarProps = {
  unreadCount: number;
  healthLabel: string;
  metrics: AiSidebarMetric[];
  items: AiSidebarItem[];
};