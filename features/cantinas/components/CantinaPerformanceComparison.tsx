"use client";

import { useI18n } from "@/lib/i18n";
import { useEffect, useMemo, useState } from "react";
import {
  X,
  BarChart3,
  FileText,
  Trophy,
  Network,
  MousePointerClick,
  ChevronDown,
} from "lucide-react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from "recharts";
import type { Cantina } from "./CantinasClient";

type PerformanceCantina = Cantina & {
  performance?: {
    currentMonthSales?: number;
    currentMonthCosts?: number;
    currentMonthProfit?: number;
    growthPercent?: number;
    monthlySales?: number[];
    dailySales?: Record<string, number>;
  };
};

type Props = {
  allCantinas: PerformanceCantina[];
  listedCantinas: PerformanceCantina[];
  onClose: () => void;
};

type Scope = "top3" | "all" | "manual";
type ViewMode = "chart" | "report";
type ChartType = "bar" | "line" | "area";
type PeriodMode = "year" | "month";

const colors = [
  "#3797ea",
  "#e8d49d",
  "#60ed94",
  "#f36d6d",
  "#2563EB",
  "#f1a20e",
  "#aa7fd2",
  "#5af8f2",
  "#0891B2",
  "#f17bc6",
];

function getDaysInMonth(year: number, monthIndex: number) {
  return new Date(year, monthIndex + 1, 0).getDate();
}

function getDailyKey(year: number, monthIndex: number, day: number) {
  const month = String(monthIndex + 1).padStart(2, "0");
  const dayValue = String(day).padStart(2, "0");
  return `${year}-${month}-${dayValue}`;
}

export default function CantinaPerformanceComparison({
  allCantinas,
  onClose,
}: Props) {
  const { t, lang } = useI18n();

  const [scope, setScope] = useState<Scope>("top3");
  const [viewMode, setViewMode] = useState<ViewMode>("chart");
  const [chartType, setChartType] = useState<ChartType>("bar");
  const [periodMode, setPeriodMode] = useState<PeriodMode>("year");

  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());

  const [manualOpen, setManualOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [confirmedManualIds, setConfirmedManualIds] = useState<string[]>([]);
  const [currency, setCurrency] = useState("EUR");

  useEffect(() => {
  const timeout = setTimeout(async () => {
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
  }, 0);

  return () => clearTimeout(timeout);
}, []);

  const locale = lang === "fr" ? "fr-FR" : lang === "en" ? "en-GB" : "pt-PT";

  const months = useMemo(
    () =>
      Array.from({ length: 12 }, (_, index) =>
        new Date(2026, index).toLocaleString(locale, { month: "short" })
      ),
    [locale]
  );

  const allPerformanceData = useMemo(() => {
    return allCantinas.map((cantina) => {
      const vendasMes = cantina.performance?.currentMonthSales ?? 0;
      const custosMes = cantina.performance?.currentMonthCosts ?? 0;
      const lucroBruto =
        cantina.performance?.currentMonthProfit ?? vendasMes - custosMes;
      const crescimento = cantina.performance?.growthPercent ?? 0;

      return {
        id: cantina.id,
        cantina: cantina.name,
        status: cantina.status,
        vendasMes,
        custosMes,
        lucroBruto,
        crescimento,
        monthlySales: cantina.performance?.monthlySales ?? Array(12).fill(0),
        dailySales: cantina.performance?.dailySales ?? {},
      };
    });
  }, [allCantinas]);

  const selectedCantinas = useMemo(() => {
    if (scope === "top3") {
      return [...allPerformanceData]
        .sort((a, b) => b.vendasMes - a.vendasMes)
        .slice(0, 3);
    }

    if (scope === "all") {
      return allPerformanceData;
    }

    return allPerformanceData.filter((item) =>
      confirmedManualIds.includes(item.id)
    );
  }, [scope, allPerformanceData, confirmedManualIds]);

  const selectedCantinaNames = selectedCantinas.map((item) => item.cantina);

  const chartData = useMemo(() => {
    if (periodMode === "year") {
      return months.map((month, monthIndex) => {
        const row: Record<string, string | number> = { period: month };

        selectedCantinas.forEach((cantina) => {
          row[cantina.cantina] = cantina.monthlySales[monthIndex] ?? 0;
        });

        return row;
      });
    }

    const days = getDaysInMonth(selectedYear, selectedMonth);

    return Array.from({ length: days }).map((_, index) => {
      const day = index + 1;
      const key = getDailyKey(selectedYear, selectedMonth, day);
      const row: Record<string, string | number> = { period: String(day) };

      selectedCantinas.forEach((cantina) => {
        row[cantina.cantina] = cantina.dailySales[key] ?? 0;
      });

      return row;
    });
  }, [periodMode, selectedCantinas, selectedYear, selectedMonth, months]);

  function toggleSelected(id: string) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  }

  function confirmManualComparison() {
    setConfirmedManualIds(selectedIds);
    setScope("manual");
    setManualOpen(false);
  }

  function formatMoney(value: string | number) {
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

  function chartTypeLabel(type: ChartType) {
    if (type === "bar") return t("barChart");
    if (type === "line") return t("lineChart");
    return t("areaChart");
  }

  return (
    <div className="fixed left-[200px] top-[110px] right-0 bottom-0 z-40 bg-[#F4F7FA] p-5 overflow-hidden">
      <div className="h-full bg-white rounded-[24px] shadow-xl flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div>
            <h2 className="text-2xl font-bold text-slate-800">
              {t("performanceComparison")}
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              {t("performanceComparisonDescription")}
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-slate-100 text-slate-500 hover:text-slate-800"
          >
            <X size={24} />
          </button>
        </div>

        <div className="p-5 border-b border-slate-100">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <button
              onClick={() => setScope("top3")}
              className={`rounded-[18px] border px-4 py-3 text-left transition ${
                scope === "top3"
                  ? "border-[#123A5C] bg-[#123A5C] text-white shadow"
                  : "border-slate-200 bg-white text-slate-700 hover:border-[#123A5C]"
              }`}
            >
              <div className="flex items-center gap-3">
                <Trophy size={22} />
                <h3 className="font-bold">{t("top3Sales")}</h3>
              </div>
              <p className="text-sm opacity-80 mt-1">
                {t("top3SalesDescription")}
              </p>
            </button>

            <button
              onClick={() => setScope("all")}
              className={`rounded-[18px] border px-4 py-3 text-left transition ${
                scope === "all"
                  ? "border-[#123A5C] bg-[#123A5C] text-white shadow"
                  : "border-slate-200 bg-white text-slate-700 hover:border-[#123A5C]"
              }`}
            >
              <div className="flex items-center gap-3">
                <Network size={22} />
                <h3 className="font-bold">{t("allCantinas")}</h3>
              </div>
              <p className="text-sm opacity-80 mt-1">
                {t("allCantinasComparisonDescription")}
              </p>
            </button>

            <div className="relative">
              <button
                onClick={() => setManualOpen((v) => !v)}
                className={`w-full rounded-[18px] border px-4 py-3 text-left transition ${
                  scope === "manual"
                    ? "border-[#123A5C] bg-[#123A5C] text-white shadow"
                    : "border-slate-200 bg-white text-slate-700 hover:border-[#123A5C]"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <MousePointerClick size={22} />
                    <h3 className="font-bold">{t("manualChoice")}</h3>
                  </div>
                  <ChevronDown size={18} />
                </div>

                <p className="text-sm opacity-80 mt-1">
                  {t("manualChoiceDescription")}
                </p>
              </button>

              {manualOpen && (
                <div className="absolute right-0 mt-2 w-full bg-white border border-slate-200 rounded-[18px] shadow-xl z-50 p-4">
                  <div className="max-h-52 overflow-y-auto space-y-2">
                    {allCantinas.map((cantina) => (
                      <label
                        key={cantina.id}
                        className="flex items-center gap-3 rounded-[12px] px-3 py-2 hover:bg-slate-50 cursor-pointer text-slate-700"
                      >
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(cantina.id)}
                          onChange={() => toggleSelected(cantina.id)}
                          className="h-4 w-4"
                        />
                        <span className="text-sm font-medium">
                          {cantina.name}
                        </span>
                      </label>
                    ))}
                  </div>

                  <button
                    onClick={confirmManualComparison}
                    disabled={selectedIds.length === 0}
                    className="mt-4 w-full rounded-[14px] bg-[#123A5C] px-4 py-3 text-white font-semibold disabled:opacity-40"
                  >
                    {t("compareSelected")}
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setViewMode("chart")}
                className={`px-5 py-3 rounded-[16px] font-semibold flex items-center gap-2 transition ${
                  viewMode === "chart"
                    ? "bg-[#F5C542] text-[#0B2540]"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                <BarChart3 size={18} />
                {t("chart")}
              </button>

              <button
                onClick={() => setViewMode("report")}
                className={`px-5 py-3 rounded-[16px] font-semibold flex items-center gap-2 transition ${
                  viewMode === "report"
                    ? "bg-[#F5C542] text-[#0B2540]"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                <FileText size={18} />
                {t("report")}
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setPeriodMode("year")}
                className={`px-4 py-2 rounded-[14px] text-sm font-semibold ${
                  periodMode === "year"
                    ? "bg-[#123A5C] text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {t("yearly")}
              </button>

              <button
                onClick={() => setPeriodMode("month")}
                className={`px-4 py-2 rounded-[14px] text-sm font-semibold ${
                  periodMode === "month"
                    ? "bg-[#123A5C] text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {t("byDay")}
              </button>

              {periodMode === "month" && (
                <>
                  <select
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(Number(e.target.value))}
                    className="px-3 py-2 rounded-[14px] border border-slate-200 text-sm text-slate-700"
                  >
                    {months.map((month, index) => (
                      <option key={month} value={index}>
                        {month}
                      </option>
                    ))}
                  </select>

                  <input
                    type="number"
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(Number(e.target.value))}
                    className="w-24 px-3 py-2 rounded-[14px] border border-slate-200 text-sm text-slate-700"
                  />
                </>
              )}
            </div>

            {viewMode === "chart" && (
              <div className="flex gap-2">
                {(["bar", "line", "area"] as ChartType[]).map((type) => (
                  <button
                    key={type}
                    onClick={() => setChartType(type)}
                    className={`px-3 py-2 rounded-[12px] text-sm ${
                      chartType === type
                        ? "bg-[#123A5C] text-white"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {chartTypeLabel(type)}
                  </button>
                ))}
              </div>
            )}

            <p className="text-sm text-slate-500">
              {selectedCantinas.length} {t("cantinasCount")}
            </p>
          </div>
        </div>

        <div className="flex-1 p-5 overflow-hidden">
          {selectedCantinas.length === 0 ? (
            <div className="h-full flex items-center justify-center rounded-[20px] bg-slate-50 text-slate-500">
              {t("noCantinaSelectedForComparison")}
            </div>
          ) : viewMode === "chart" ? (
            <div className="h-[260px] rounded-[20px] bg-slate-50 p-4">
              <ResponsiveContainer width="100%" height="100%">
                {chartType === "bar" ? (
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="period" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    {selectedCantinaNames.map((name, index) => (
                      <Bar
                        key={name}
                        dataKey={name}
                        name={name}
                        fill={colors[index % colors.length]}
                      />
                    ))}
                  </BarChart>
                ) : chartType === "line" ? (
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="period" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    {selectedCantinaNames.map((name, index) => (
                      <Line
                        key={name}
                        type="monotone"
                        dataKey={name}
                        name={name}
                        stroke={colors[index % colors.length]}
                        strokeWidth={3}
                      />
                    ))}
                  </LineChart>
                ) : (
                  <AreaChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="period" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    {selectedCantinaNames.map((name, index) => (
                      <Area
                        key={name}
                        type="monotone"
                        dataKey={name}
                        name={name}
                        stroke={colors[index % colors.length]}
                        fill={colors[index % colors.length]}
                        fillOpacity={0.2}
                      />
                    ))}
                  </AreaChart>
                )}
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-full overflow-auto border border-slate-100 rounded-[20px]">
              <table className="w-full min-w-[900px] text-left">
                <thead className="bg-slate-50 text-slate-500 text-sm sticky top-0">
                  <tr>
                    <th className="px-5 py-4">{t("cantina")}</th>
                    <th className="px-5 py-4">{t("monthSales")}</th>
                    <th className="px-5 py-4">{t("costs")}</th>
                    <th className="px-5 py-4">{t("grossProfit")}</th>
                    <th className="px-5 py-4">{t("growth")}</th>
                    <th className="px-5 py-4">{t("status")}</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {selectedCantinas.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50">
                      <td className="px-5 py-4 font-semibold text-slate-800">
                        {item.cantina}
                      </td>
                      <td className="px-5 py-4 text-slate-700">
                        {formatMoney(item.vendasMes)}
                      </td>
                      <td className="px-5 py-4 text-slate-700">
                        {formatMoney(item.custosMes)}
                      </td>
                      <td className="px-5 py-4 font-semibold text-green-600">
                        {formatMoney(item.lucroBruto)}
                      </td>
                      <td className="px-5 py-4 text-blue-600">
                        {item.crescimento}%
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-semibold ${
                            item.status === "ACTIVE"
                              ? "bg-green-50 text-green-700"
                              : "bg-red-50 text-red-600"
                          }`}
                        >
                          {item.status === "ACTIVE" ? t("active") : t("inactive")}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}