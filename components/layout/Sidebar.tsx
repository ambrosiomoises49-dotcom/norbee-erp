"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { useI18n } from "@/lib/i18n";

import {
  LayoutDashboard,
  TrendingUp,
  Store,
  Boxes,
  ShoppingCart,
  WalletCards,
  BarChart3,
  CreditCard,
  ClipboardList,
  FileText,
  BrainCircuit,
} from "lucide-react";

export default function Sidebar() {
  const pathname = usePathname();

  const { t } = useI18n();

  const menuItems = [
    {
      label: t("dashboard"),
      href: "/Dashboard",
      icon: LayoutDashboard,
    },

    {
      label: t("sales"),
      href: "/vendas",
      icon: TrendingUp,
    },

    {
      label: t("cantinas"),
      href: "/cantinas",
      icon: Store,
    },

    {
      label: t("stock"),
      href: "/stock",
      icon: Boxes,
    },

    {
      label: t("purchases"),
      href: "/compras",
      icon: ShoppingCart,
    },

    {
      label: t("costs"),
      href: "/custos",
      icon: WalletCards,
    },

    {
      label: t("profits"),
      href: "/lucros",
      icon: BarChart3,
    },

    {
      label: t("finance"),
      href: "/financas",
      icon: CreditCard,
    },

    {
      label: t("hr"),
      href: "/rh",
      icon: ClipboardList,
    },

    {
      label: t("reports"),
      href: "/relatorios",
      icon: FileText,
    },

    {
      label: t("intelligentStock"),
      href: "/stock-inteligente",
      icon: BrainCircuit,
    },
  ];

  return (
    <aside className="w-[200px] min-h-screen bg-[#123A5C] text-white">
      <div className="h-[110px] flex items-center gap-4 px-7 border-b border-white/10">
        <div className="size-17 rounded-full overflow-hidden shrink-0">
  <img
    src="/logo_norbee1.png"
    alt="Norbee"
    className="w-full h-full object-cover"
  />
</div>

        <h1 className="text-2xl font-semibold tracking-wide">
          Norbee
        </h1>
      </div>

      <nav className="pt-6">
        {menuItems.map((item) => {
          const Icon = item.icon;

          const isActive =
            pathname === item.href ||
            pathname.startsWith(item.href + "/");

          return (
            <Link
              key={item.href}
              href={item.href}
              className={[
                "flex items-center gap-4 px-8 py-4 text-lg cursor-pointer transition-all duration-200",
                "hover:bg-[#F5C542] hover:text-[#0B2540]",
                "hover:rounded-l-[18px]",
                isActive
                  ? "bg-[#F5C542] text-[#0B2540] rounded-l-[18px]"
                  : "text-white",
              ].join(" ")}
            >
              <Icon size={22} />

              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}