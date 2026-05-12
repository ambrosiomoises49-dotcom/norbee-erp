"use client";

import { useI18n } from "@/lib/i18n";
import { useEffect, useState } from "react";

import {
  CalendarDays,
  BrainCircuit,
  RefreshCw,
  WalletCards,
  ShoppingCart,
  Boxes,
  TrendingUp,
  AlertTriangle,
  Users,
  Store,
  CreditCard,
} from "lucide-react";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

import EventsCalendar from "@/features/dashboard/components/EventsCalendar";
import ManagementAdvice from "@/features/dashboard/components/ManagementAdvice";

type DashboardData = {
  cards: {
    cashBalance: number;
    salesMonthTotal: number;
    salesTodayTotal: number;
    stockValue: number;
    potentialProfit: number;
    netProfit: number;
    lowStockCount: number;
    activeEmployees: number;
  };

  bestCantina: {
    id: string;
    name: string;
    code: string;
    total: number;
    salesCount: number;
  } | null;

  cantinaRanking: {
    id: string;
    name: string;
    code: string;
    total: number;
    salesCount: number;
  }[];

  lowStockRows: {
    id: string;
    productName: string;
    quantity: number;
    minStock: number;
  }[];

  events: {
    id: string;
    title: string;
    eventDate: string;
    type: string;
    priority: string;
  }[];

  transactions: {
    id: string;
    type: string;
    amount: string;
    description: string | null;
    date: string;
  }[];

  purchases: {
    id: string;
    purchaseNumber: string;
    totalAmount: string;
    status: string;
    createdAt: string;
  }[];

  monthlyChart: {
    month: string;
    vendas: number;
  }[];
};

export default function DashboardClient() {
  const { t, lang } = useI18n();

  const [eventsOpen, setEventsOpen] = useState(false);
  const [adviceOpen, setAdviceOpen] = useState(false);

  const [data, setData] = useState<DashboardData | null>(null);

  const [loading, setLoading] = useState(true);
  const [currency, setCurrency] = useState("EUR");

  async function loadCompanyCurrency() {
  try {
    const res = await fetch("/api/company/currency", {
      cache: "no-store",
    });

    const json = await res.json();

    if (res.ok && json.currency) {
      setCurrency(json.currency);
    }
  } catch {
    // mantém moeda padrão
  }
}

  async function loadDashboard() {
    setLoading(true);

    try {
      const res = await fetch("/api/dashboard");

      const json = await res.json();

      if (res.ok) {
        setData(json);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
  const timeout = setTimeout(() => {
    void loadDashboard();
    void loadCompanyCurrency();
  }, 0);

  return () => clearTimeout(timeout);
}, []);

  function formatMoney(value: number | string) {
  const amount = Number(value || 0);

  const locale =
    lang === "fr" ? "fr-FR" : lang === "en" ? "en-GB" : "pt-PT";

  if (currency === "AOA") {
    return `${new Intl.NumberFormat(locale, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(Number.isFinite(amount) ? amount : 0)} Kz`;
  }

  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(amount) ? amount : 0);
}

  function formatDate(value: string) {
    return new Date(value).toLocaleString(
      lang === "fr" ? "fr-FR" : lang === "en" ? "en-GB" : "pt-PT",
      {
        day: "2-digit",
        month: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      }
    );
  }

  if (!data && loading) {
    return (
      <div className="bg-white rounded-[22px] p-8 shadow-sm text-slate-500">
        {t("loading")}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">
            {t("dashboard")}
          </h1>

          <p className="text-sm text-slate-500">
            {t("dashboardOverview")}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setEventsOpen(true)}
            className="rounded-[14px] bg-[#123A5C] px-4 py-2.5 text-sm font-semibold text-white flex items-center gap-2"
          >
            <CalendarDays size={16} />
            {t("events")}
          </button>

          <button
            onClick={() => setAdviceOpen(true)}
            className="rounded-[14px] border border-[#123A5C] px-4 py-2.5 text-sm font-semibold text-[#123A5C] flex items-center gap-2 hover:bg-[#123A5C] hover:text-white"
          >
            <BrainCircuit size={16} />
            {t("managementAdvice")}
          </button>

          <button
            onClick={loadDashboard}
            className="rounded-[14px] bg-white border px-4 py-2.5 text-sm font-semibold text-slate-700 flex items-center gap-2"
          >
            <RefreshCw
              size={16}
              className={loading ? "animate-spin" : ""}
            />

            {t("update")}
          </button>
        </div>
      </div>

      {data && (
        <>
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
            <StatCard
              title={t("currentCash")}
              value={formatMoney(data.cards.cashBalance)}
              icon={<WalletCards size={20} />}
              tone="blue"
            />

            <StatCard
              title={t("monthSales")}
              value={formatMoney(data.cards.salesMonthTotal)}
              icon={<ShoppingCart size={20} />}
              tone="green"
            />

            <StatCard
              title={t("netProfit")}
              value={formatMoney(data.cards.netProfit)}
              icon={<TrendingUp size={20} />}
              tone={
                data.cards.netProfit >= 0 ? "green" : "red"
              }
            />

            <StatCard
              title={t("stock")}
              value={formatMoney(data.cards.stockValue)}
              icon={<Boxes size={20} />}
              tone="blue"
            />

            <StatCard
              title={t("potentialProfit")}
              value={formatMoney(data.cards.potentialProfit)}
              icon={<TrendingUp size={20} />}
              tone={
                data.cards.potentialProfit >= 0
                  ? "green"
                  : "red"
              }
            />

            <StatCard
              title={t("todaySales")}
              value={formatMoney(data.cards.salesTodayTotal)}
              icon={<CreditCard size={20} />}
              tone="green"
            />

            <StatCard
              title={t("lowStock")}
              value={data.cards.lowStockCount}
              icon={<AlertTriangle size={20} />}
              tone={
                data.cards.lowStockCount > 0
                  ? "red"
                  : "green"
              }
            />

            <StatCard
              title={t("employees")}
              value={data.cards.activeEmployees}
              icon={<Users size={20} />}
              tone="blue"
            />
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
            <div className="xl:col-span-2 bg-white rounded-[22px] p-4 shadow-sm border border-slate-100">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-bold text-slate-800">
                  {t("salesEvolution")}
                </h2>
              </div>

              <div className="h-[270px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.monthlyChart}>
                    <CartesianGrid strokeDasharray="3 3" />

                    <XAxis dataKey="month" />

                    <YAxis />

                    <Tooltip
                      formatter={(value) =>
                        formatMoney(Number(value))
                      }
                    />

                    <Bar
                      dataKey="vendas"
                      name={t("sales")}
                      fill="#123A5C"
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white rounded-[22px] p-4 shadow-sm border border-slate-100">
              <div className="flex items-center gap-2 mb-4">
                <Store
                  size={18}
                  className="text-[#123A5C]"
                />

                <h2 className="font-bold text-slate-800">
                  {t("bestCantina")}
                </h2>
              </div>

              {data.bestCantina ? (
                <div className="rounded-[20px] bg-[#123A5C]/5 border border-[#123A5C]/10 p-5">
                  <p className="text-sm text-slate-500">
                    {t("topMonth")}
                  </p>

                  <h3 className="text-xl font-black text-slate-800 mt-1">
                    {data.bestCantina.name}
                  </h3>

                  <p className="text-sm text-slate-500">
                    {t("code")} {data.bestCantina.code}
                  </p>

                  <p className="text-2xl font-black text-green-700 mt-4">
                    {formatMoney(data.bestCantina.total)}
                  </p>

                  <p className="text-xs text-slate-500">
                    {data.bestCantina.salesCount}{" "}
                    {t("sales")}
                  </p>
                </div>
              ) : (
                <p className="text-sm text-slate-500">
                  {t("noSales")}
                </p>
              )}
            </div>
          </div>

        </>
      )}

      {eventsOpen && (
        <EventsCalendar
          onClose={() => setEventsOpen(false)}
        />
      )}

      {adviceOpen && (
        <ManagementAdvice
          onClose={() => setAdviceOpen(false)}
        />
      )}
    </div>
  );
}

function StatCard({
  title,
  value,
  icon,
  tone,
}: {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  tone: "blue" | "green" | "red";
}) {
  const styles = {
    blue: "bg-[#123A5C]/10 text-[#123A5C]",
    green: "bg-green-50 text-green-700",
    red: "bg-red-50 text-red-600",
  };

  return (
    <div className="bg-white rounded-[18px] p-4 shadow-sm border border-slate-100 flex items-center gap-3 min-w-0">
      <div
        className={`w-10 h-10 rounded-[14px] flex items-center justify-center shrink-0 ${styles[tone]}`}
      >
        {icon}
      </div>

      <div className="min-w-0">
        <p className="text-xs text-slate-500 truncate">
          {title}
        </p>

        <p className="text-base xl:text-lg font-black text-slate-800 truncate">
          {value}
        </p>
      </div>
    </div>
  );
}

function Panel({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-[22px] p-4 shadow-sm border border-slate-100 min-h-[250px]">
      <div className="flex items-center gap-2 mb-4">
        <div className="text-[#123A5C]">
          {icon}
        </div>

        <h2 className="font-bold text-slate-800">
          {title}
        </h2>
      </div>

      {children}
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <div className="rounded-[16px] bg-slate-50 p-5 text-center text-sm text-slate-500">
      {text}
    </div>
  );
}