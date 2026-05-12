"use client";

import { useI18n } from "@/lib/i18n";
import { useEffect, useMemo, useState } from "react";

import {
  Boxes,
  TrendingUp,
  WalletCards,
  Percent,
  RefreshCw,
  Search,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

type Row = {
  batchId: string;
  productId: string;
  productName: string;
  internalCode: string;
  cantinaId: string | null;
  cantinaName: string;
  quantity: number;
  unitCost: number;
  salePrice: number;
  stockValue: number;
  potentialRevenue: number;
  potentialProfit: number;
  margin: number;
  createdAt: string;
};

type Summary = {
  quantity: number;
  stockValue: number;
  potentialRevenue: number;
  potentialProfit: number;
  margin: number;
};

const ITEMS_PER_PAGE = 6;

export default function StockInteligenteClient() {
  const { t,lang } = useI18n();

  const [rows, setRows] = useState<Row[]>([]);
  const [summary, setSummary] = useState<Summary>({
    quantity: 0,
    stockValue: 0,
    potentialRevenue: 0,
    potentialProfit: 0,
    margin: 0,
  });

  const [loading, setLoading] = useState(true);
  const [currency, setCurrency] = useState("EUR");
  const [search, setSearch] = useState("");
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

  async function load() {
    setLoading(true);

    try {
      const res = await fetch("/api/stock/potential-profit");
      const data = await res.json();

      if (res.ok) {
        setRows(data.rows || []);
        setSummary(
          data.summary || {
            quantity: 0,
            stockValue: 0,
            potentialRevenue: 0,
            potentialProfit: 0,
            margin: 0,
          }
        );
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
  const timeout = setTimeout(() => {
    void load();
    void loadCompanyCurrency();
  }, 0);

  return () => clearTimeout(timeout);
}, []);
  const filteredRows = useMemo(() => {
    const q = search.toLowerCase().trim();

    if (!q) return rows;

    return rows.filter(
      (row) =>
        row.productName.toLowerCase().includes(q) ||
        row.internalCode.toLowerCase().includes(q) ||
        row.cantinaName.toLowerCase().includes(q)
    );
  }, [rows, search]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredRows.length / ITEMS_PER_PAGE)
  );

  const paginatedRows = filteredRows.slice(
    (page - 1) * ITEMS_PER_PAGE,
    page * ITEMS_PER_PAGE
  );

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

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">
            {t("intelligentStock")}
          </h1>

          <p className="text-sm text-slate-500">
            {t("intelligentStockDescription")}
          </p>
        </div>

        <button
          onClick={load}
          className="rounded-[14px] bg-[#123A5C] px-4 py-2.5 text-white text-sm font-semibold flex items-center gap-2 hover:bg-[#0B2540]"
        >
          <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
          {t("update")}
        </button>
      </div>

      <div className="grid grid-cols-2 xl:grid-cols-5 gap-3">
        <StatCard
          title={t("quantity")}
          value={summary.quantity}
          icon={<Boxes size={20} />}
          tone="blue"
        />

        <StatCard
          title={t("stockValue")}
          value={formatMoney(summary.stockValue)}
          icon={<WalletCards size={20} />}
          tone="blue"
        />

        <StatCard
          title={t("potentialRevenue")}
          value={formatMoney(summary.potentialRevenue)}
          icon={<TrendingUp size={20} />}
          tone="green"
        />

        <StatCard
          title={t("potentialProfit")}
          value={formatMoney(summary.potentialProfit)}
          icon={<TrendingUp size={20} />}
          tone={summary.potentialProfit >= 0 ? "green" : "red"}
        />

        <StatCard
          title={t("potentialMargin")}
          value={formatPercent(summary.margin)}
          icon={<Percent size={20} />}
          tone={summary.margin >= 0 ? "blue" : "red"}
        />
      </div>

      <div className="bg-white rounded-[24px] shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-4 border-b border-slate-100">
          <div className="relative max-w-md">
            <Search
              size={17}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />

            <input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder={t("searchProductCodeCantina")}
              className="w-full rounded-[14px] border pl-10 pr-4 py-3 text-sm"
            />
          </div>
        </div>

        {loading ? (
          <div className="p-10 text-center text-slate-500">
            {t("loadingIntelligentStock")}
          </div>
        ) : paginatedRows.length === 0 ? (
          <div className="p-10 text-center text-slate-500">
            {t("noFifoBatch")}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1150px] text-left text-sm">
                <thead className="bg-slate-50 text-slate-500">
                  <tr>
                    <th className="px-5 py-4">{t("product")}</th>
                    <th className="px-5 py-4">{t("location")}</th>
                    <th className="px-5 py-4">{t("qty")}</th>
                    <th className="px-5 py-4">{t("fifoCost")}</th>
                    <th className="px-5 py-4">{t("salePrice")}</th>
                    <th className="px-5 py-4">{t("stockValue")}</th>
                    <th className="px-5 py-4">{t("potentialRevenue")}</th>
                    <th className="px-5 py-4">{t("potentialProfit")}</th>
                    <th className="px-5 py-4">{t("margin")}</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {paginatedRows.map((row) => (
                    <tr key={row.batchId} className="hover:bg-slate-50">
                      <td className="px-5 py-4">
                        <p className="font-bold text-slate-800">
                          {row.productName}
                        </p>

                        <p className="text-xs text-slate-500">
                          {row.internalCode}
                        </p>
                      </td>

                      <td className="px-5 py-4">{row.cantinaName}</td>

                      <td className="px-5 py-4 font-bold">{row.quantity}</td>

                      <td className="px-5 py-4">{formatMoney(row.unitCost)}</td>

                      <td className="px-5 py-4">{formatMoney(row.salePrice)}</td>

                      <td className="px-5 py-4">{formatMoney(row.stockValue)}</td>

                      <td className="px-5 py-4">
                        {formatMoney(row.potentialRevenue)}
                      </td>

                      <td
                        className={`px-5 py-4 font-black ${
                          row.potentialProfit >= 0
                            ? "text-green-700"
                            : "text-red-600"
                        }`}
                      >
                        {formatMoney(row.potentialProfit)}
                      </td>

                      <td
                        className={`px-5 py-4 font-bold ${
                          row.margin >= 0 ? "text-[#123A5C]" : "text-red-600"
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
              t={t}
              onPrev={() => setPage((p) => Math.max(1, p - 1))}
              onNext={() => setPage((p) => Math.min(totalPages, p + 1))}
            />
          </>
        )}
      </div>
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