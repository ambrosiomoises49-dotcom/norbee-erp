"use client";

import { useI18n } from "@/lib/i18n";
import { useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  WalletCards,
  RefreshCw,
  Store,
  ChevronLeft,
  ChevronRight,
  Trophy,
  Percent,
  AlertCircle,
  Table2,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts";

type Cantina = {
  id: string;
  name: string;
  code: string;
};

type ProfitRow = {
  month: number;
  monthName: string;
  label: string;
  totalSales: number;
  merchandiseCost: number;
  grossProfit: number;
  transport: number;
  salaries: number;
  otherCosts: number;
  netProfit: number;
  margin: number;
};

type Summary = {
  totalSales: number;
  merchandiseCost: number;
  grossProfit: number;
  transport: number;
  salaries: number;
  otherCosts: number;
  netProfit: number;
  margin: number;
};

type ViewMode = "chart" | "table";

const ITEMS_PER_PAGE = 6;

export default function LucrosClient() {
  const { t, lang } = useI18n();

  const [year, setYear] = useState(new Date().getFullYear());
  const [cantinaId, setCantinaId] = useState("ALL");
  const [viewMode, setViewMode] = useState<ViewMode>("chart");

  const [cantinas, setCantinas] = useState<Cantina[]>([]);
  const [rows, setRows] = useState<ProfitRow[]>([]);
  const [summary, setSummary] = useState<Summary>({
    totalSales: 0,
    merchandiseCost: 0,
    grossProfit: 0,
    transport: 0,
    salaries: 0,
    otherCosts: 0,
    netProfit: 0,
    margin: 0,
  });

  const [topMonths, setTopMonths] = useState<ProfitRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [currency, setCurrency] = useState("EUR");
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);

  async function loadCompanyCurrency() {
  try {
    const res = await fetch("/api/company/currency", {
      cache: "no-store",
    });

    const data = await res.json();

    if (res.ok && data.currency) {
      setCurrency(data.currency);
    }
  } catch {
    // mantém moeda padrão
  }
}

  async function loadProfits() {
    setLoading(true);
    setError("");

    try {
      const params = new URLSearchParams();
      params.set("year", String(year));
      params.set("cantinaId", cantinaId);

      const res = await fetch(`/api/lucros?${params.toString()}`);
      const data = await res.json();

      if (!res.ok) {
        setError(data.message || t("profitLoadError"));
        return;
      }

      setCantinas(data.cantinas || []);
      setRows(data.rows || []);
      setSummary(
        data.summary || {
          totalSales: 0,
          merchandiseCost: 0,
          grossProfit: 0,
          transport: 0,
          salaries: 0,
          otherCosts: 0,
          netProfit: 0,
          margin: 0,
        }
      );
      setTopMonths(data.topMonths || []);
      setPage(1);
    } catch {
      setError(t("profitLoadError"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
  const timeout = setTimeout(() => {
    void loadProfits();
    void loadCompanyCurrency();
  }, 0);

  return () => clearTimeout(timeout);
}, []);
  const totalPages = Math.max(1, Math.ceil(rows.length / ITEMS_PER_PAGE));

  const paginatedRows = rows.slice(
    (page - 1) * ITEMS_PER_PAGE,
    page * ITEMS_PER_PAGE
  );

  const chartData = useMemo(() => {
    return rows.map((row) => ({
      month: t(row.monthName).slice(0, 3),
      vendas: row.totalSales,
      lucro: row.netProfit,
      margem: Number(row.margin.toFixed(1)),
    }));
  }, [rows]);

 function formatMoney(value: number) {
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

  function formatPercent(value: number) {
    return `${Number(value || 0).toFixed(1)}%`;
  }

  function selectedCantinaName() {
    if (cantinaId === "ALL") return t("allCantinas");
    return cantinas.find((c) => c.id === cantinaId)?.name || t("cantina");
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">
            {t("profitAnalysis")}
          </h1>
          <p className="text-sm text-slate-500">
            {t("profitAnalysisDescription")}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setViewMode("chart")}
            className={`rounded-[14px] px-4 py-2.5 text-sm font-semibold flex items-center gap-2 ${
              viewMode === "chart"
                ? "bg-[#123A5C] text-white"
                : "bg-white border text-[#123A5C] hover:bg-slate-50"
            }`}
          >
            <BarChart3 size={16} />
            {t("chart")}
          </button>

          <button
            onClick={() => setViewMode("table")}
            className={`rounded-[14px] px-4 py-2.5 text-sm font-semibold flex items-center gap-2 ${
              viewMode === "table"
                ? "bg-[#123A5C] text-white"
                : "bg-white border text-[#123A5C] hover:bg-slate-50"
            }`}
          >
            <Table2 size={16} />
            {t("table")}
          </button>

          <input
            type="number"
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="rounded-[14px] border px-4 py-2.5 text-sm w-28"
          />

          <select
            value={cantinaId}
            onChange={(e) => setCantinaId(e.target.value)}
            className="rounded-[14px] border px-4 py-2.5 text-sm min-w-[220px]"
          >
            <option value="ALL">{t("allCantinas")}</option>
            {cantinas.map((cantina) => (
              <option key={cantina.id} value={cantina.id}>
                {cantina.name} — {cantina.code}
              </option>
            ))}
          </select>

          <button
            onClick={loadProfits}
            className="rounded-[14px] bg-[#123A5C] px-4 py-2.5 text-white text-sm font-semibold flex items-center gap-2 hover:bg-[#0B2540]"
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
            {t("update")}
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-[16px] bg-red-50 px-4 py-3 text-sm text-red-600 flex items-center gap-2">
          <AlertCircle size={17} />
          {error}
        </div>
      )}

      {viewMode === "chart" && (
        <>
          <div className="grid grid-cols-2 xl:grid-cols-5 gap-3">
            <StatCard
              title={t("turnover")}
              value={formatMoney(summary.totalSales)}
              icon={<WalletCards size={20} />}
              tone="blue"
            />

            <StatCard
              title={t("grossProfit")}
              value={formatMoney(summary.grossProfit)}
              icon={<TrendingUp size={20} />}
              tone={summary.grossProfit >= 0 ? "green" : "red"}
            />

            <StatCard
              title={t("costsAndSalaries")}
              value={formatMoney(
                summary.transport + summary.salaries + summary.otherCosts 
              )}
              icon={<TrendingDown size={20} />}
              tone="red"
            />

            <StatCard
              title={t("netProfit")}
              value={formatMoney(summary.netProfit)}
              icon={<BarChart3 size={20} />}
              tone={summary.netProfit >= 0 ? "green" : "red"}
            />

            <StatCard
              title={t("netMargin")}
              value={formatPercent(summary.margin)}
              icon={<Percent size={20} />}
              tone={summary.margin >= 0 ? "blue" : "red"}
            />
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
            <div className="xl:col-span-2 bg-white rounded-[22px] p-4 shadow-sm border border-slate-100">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-bold text-slate-800">
                  {t("monthlyProfitEvolution")}
                </h2>
                <span className="text-xs text-slate-500">{year}</span>
              </div>

              <div className="h-[260px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip formatter={(value) => formatMoney(Number(value))} />
                    <Legend />
                    <Bar dataKey="vendas" name={t("turnover")} fill="#123A5C" />
                    <Bar dataKey="lucro" name={t("netProfit")} fill="#16A34A" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="bg-white rounded-[22px] p-4 shadow-sm border border-slate-100">
              <div className="flex items-center gap-2 mb-4">
                <Trophy size={18} className="text-yellow-600" />
                <h2 className="font-bold text-slate-800">
                  {t("topMonths")}
                </h2>
              </div>

              <div className="space-y-3">
                {topMonths.length === 0 ? (
                  <p className="text-sm text-slate-500">
                    {t("noDataAvailable")}
                  </p>
                ) : (
                  topMonths.map((row, index) => (
                    <div
                      key={row.month}
                      className="rounded-[18px] border border-slate-100 p-3 bg-slate-50"
                    >
                      <div className="flex items-center justify-between">
                        <p className="font-bold text-slate-800">
                          #{index + 1} {t(row.monthName)}
                        </p>

                        <span className="text-xs font-bold text-green-700">
                          {formatPercent(row.margin)}
                        </span>
                      </div>

                      <p className="text-sm text-slate-500 mt-1">
                        {t("netProfit")}
                      </p>

                      <p className="text-lg font-black text-green-700">
                        {formatMoney(row.netProfit)}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {viewMode === "table" && (
        <div className="bg-white rounded-[24px] shadow-sm border border-slate-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-800">
                {t("monthlyProfitTable")}
              </h2>

              <p className="text-sm text-slate-500">
                {t("profitTableDescription")}
              </p>
            </div>

            <div className="flex items-center gap-2 text-sm text-slate-500">
              <Store size={16} />
              {selectedCantinaName()}
            </div>
          </div>

          {loading ? (
            <div className="p-10 text-center text-slate-500">
              {t("loadingProfits")}
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1250px] text-left text-sm">
                  <thead className="bg-slate-50 text-slate-500">
                    <tr>
                      <th className="px-5 py-4">{t("month")}</th>
                      <th className="px-5 py-4">{t("turnover")}</th>
                      <th className="px-5 py-4">{t("purchase")}</th>
                      <th className="px-5 py-4">{t("grossProfit")}</th>
                      <th className="px-5 py-4">{t("transport")}</th>
                      <th className="px-5 py-4">{t("salaries")}</th>
                      <th className="px-5 py-4">{t("otherCosts")}</th>
                      <th className="px-5 py-4">{t("netProfit")}</th>
                      <th className="px-5 py-4">{t("margin")}</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {paginatedRows.map((row) => (
                      <tr key={row.month} className="hover:bg-slate-50">
                        <td className="px-5 py-4 font-bold text-slate-800">
                          {row.label}
                        </td>

                        <td className="px-5 py-4">
                          {formatMoney(row.totalSales)}
                        </td>

                        <td className="px-5 py-4">
                          {formatMoney(row.merchandiseCost)}
                        </td>

                        <td
                          className={`px-5 py-4 font-bold ${
                            row.grossProfit >= 0
                              ? "text-green-700"
                              : "text-red-600"
                          }`}
                        >
                          {formatMoney(row.grossProfit)}
                        </td>

                        <td className="px-5 py-4">
                          {formatMoney(row.transport)}
                        </td>

                        <td className="px-5 py-4">
                          {formatMoney(row.salaries)}
                        </td>

                        <td className="px-5 py-4">
                          {formatMoney(row.otherCosts)}
                        </td>

                        <td
                          className={`px-5 py-4 font-black ${
                            row.netProfit >= 0
                              ? "text-green-700"
                              : "text-red-600"
                          }`}
                        >
                          {formatMoney(row.netProfit)}
                        </td>

                        <td
                          className={`px-5 py-4 font-bold ${
                            row.margin >= 0
                              ? "text-[#123A5C]"
                              : "text-red-600"
                          }`}
                        >
                          {formatPercent(row.margin)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <Pagination
                page={page}
                totalPages={totalPages}
                onPrev={() => setPage((p) => Math.max(1, p - 1))}
                onNext={() => setPage((p) => Math.min(totalPages, p + 1))}
                t={t}
              />
            </>
          )}
        </div>
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
        <p className="text-xs text-slate-500 truncate">{title}</p>

        <p className="text-base xl:text-lg font-black text-slate-800 truncate">
          {value}
        </p>
      </div>
    </div>
  );
}

function Pagination({
  page,
  totalPages,
  onPrev,
  onNext,
  t,
}: {
  page: number;
  totalPages: number;
  onPrev: () => void;
  onNext: () => void;
  t: (key: string) => string;
}) {
  return (
    <div className="flex items-center justify-between px-5 py-4 border-t border-slate-100">
      <p className="text-sm text-slate-500">
        {t("page")} {page} {t("of")} {totalPages}
      </p>

      <div className="flex gap-2">
        <button
          disabled={page === 1}
          onClick={onPrev}
          className="px-4 py-2 rounded-xl border disabled:opacity-40"
        >
          <ChevronLeft size={17} />
        </button>

        <button
          disabled={page === totalPages}
          onClick={onNext}
          className="px-4 py-2 rounded-xl border disabled:opacity-40"
        >
          <ChevronRight size={17} />
        </button>
      </div>
    </div>
  );
}