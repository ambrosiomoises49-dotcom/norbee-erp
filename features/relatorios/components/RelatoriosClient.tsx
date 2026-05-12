"use client";

import { useI18n } from "@/lib/i18n";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

import { useEffect, useMemo, useState } from "react";
import {
  FileText,
  RefreshCw,
  Search,
  Store,
  Download,
  WalletCards,
  TrendingUp,
  TrendingDown,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  ShoppingCart,
  Boxes,
  Users,
  BarChart3,
  CreditCard,
  ClipboardList,
} from "lucide-react";

type ReportType =
  | "sales"
  | "purchases"
  | "stock"
  | "costs"
  | "finance"
  | "rh"
  | "profits"
  | "cantinas";

type Cantina = {
  id: string;
  name: string;
  code: string;
};

type Row = {
  id: string;
  date: string;
  number: string;
  cantina: string;
  description: string;
  method: string;
  income: number;
  expense: number;
  total: number;
  status: string;
};

type Summary = {
  totalIncome: number;
  totalExpense: number;
  balance: number;
  count: number;
};

const ITEMS_PER_PAGE = 4;

function defaultStartDate() {
  const date = new Date();
  return new Date(date.getFullYear(), date.getMonth(), 1)
    .toISOString()
    .slice(0, 10);
}

function defaultEndDate() {
  return new Date().toISOString().slice(0, 10);
}

export default function RelatoriosClient() {
  const { t, lang } = useI18n();

  const reportTypes: {
    type: ReportType;
    label: string;
    icon: React.ReactNode;
  }[] = [
    { type: "sales", label: t("sales"), icon: <ShoppingCart size={17} /> },
    {
      type: "purchases",
      label: t("purchases"),
      icon: <ClipboardList size={17} />,
    },
    { type: "stock", label: t("stock"), icon: <Boxes size={17} /> },
    { type: "costs", label: t("costs"), icon: <TrendingDown size={17} /> },
    { type: "finance", label: t("finance"), icon: <CreditCard size={17} /> },
    { type: "rh", label: t("hr"), icon: <Users size={17} /> },
    { type: "profits", label: t("profits"), icon: <BarChart3 size={17} /> },
    { type: "cantinas", label: t("cantinas"), icon: <Store size={17} /> },
  ];

  const [type, setType] = useState<ReportType>("sales");
  const [startDate, setStartDate] = useState(defaultStartDate());
  const [endDate, setEndDate] = useState(defaultEndDate());
  const [cantinaId, setCantinaId] = useState("ALL");
  const [q, setQ] = useState("");

  const [cantinas, setCantinas] = useState<Cantina[]>([]);
  const [rows, setRows] = useState<Row[]>([]);
  const [summary, setSummary] = useState<Summary>({
    totalIncome: 0,
    totalExpense: 0,
    balance: 0,
    count: 0,
  });

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

  async function loadReport() {
    setLoading(true);
    setError("");

    try {
      const params = new URLSearchParams();
      params.set("type", type);
      params.set("startDate", startDate);
      params.set("endDate", endDate);
      params.set("cantinaId", cantinaId);
      params.set("q", q);

      const res = await fetch(`/api/relatorios?${params.toString()}`);
      const data = await res.json();

      if (!res.ok) {
        setError(data.message || t("reportLoadError"));
        return;
      }

      setCantinas(data.cantinas || []);
      setRows(data.rows || []);
      setSummary(
        data.summary || {
          totalIncome: 0,
          totalExpense: 0,
          balance: 0,
          count: 0,
        }
      );
      setPage(1);
    } catch {
      setError(t("reportLoadError"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
  const timeout = setTimeout(() => {
    void loadReport();
    void loadCompanyCurrency();
  }, 0);

  return () => clearTimeout(timeout);
}, []);

  const totalPages = Math.max(1, Math.ceil(rows.length / ITEMS_PER_PAGE));

  const paginatedRows = rows.slice(
    (page - 1) * ITEMS_PER_PAGE,
    page * ITEMS_PER_PAGE
  );

  const currentReport = useMemo(
    () => reportTypes.find((item) => item.type === type),
    [type, lang]
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

  function formatDate(value: string) {
    return new Date(value).toLocaleDateString(
      lang === "fr" ? "fr-FR" : lang === "en" ? "en-GB" : "pt-PT"
    );
  }

  function selectedCantinaName() {
    if (cantinaId === "ALL") return t("allCantinas");
    return cantinas.find((c) => c.id === cantinaId)?.name || t("cantina");
  }

  function exportPDF() {
    const doc = new jsPDF("landscape", "mm", "a4");

    const reportName = currentReport?.label || t("reports");

    doc.setFontSize(16);
    doc.text(`${t("reportOf")} ${reportName}`, 14, 15);

    doc.setFontSize(10);
    doc.text(
      `${t("period")}: ${formatDate(startDate)} ${t("until").toLowerCase()} ${formatDate(endDate)}`,
      14,
      22
    );

    doc.text(`${t("cantina")}: ${selectedCantinaName()}`, 14, 28);

    doc.text(`${t("income")}: ${formatMoney(summary.totalIncome)}`, 14, 36);
    doc.text(`${t("expenses")}: ${formatMoney(summary.totalExpense)}`, 70, 36);
    doc.text(`${t("result")}: ${formatMoney(summary.balance)}`, 125, 36);
    doc.text(`${t("records")}: ${summary.count}`, 190, 36);

    autoTable(doc, {
      startY: 44,
      head: [
        [
          t("date"),
          t("reference"),
          t("cantinaAccount"),
          t("description"),
          t("methodType"),
          t("income"),
          t("expense"),
          t("total"),
          t("status"),
        ],
      ],
      body: rows.map((row) => [
        formatDate(row.date),
        row.number,
        row.cantina,
        row.description,
        row.method,
        row.income ? formatMoney(row.income) : "-",
        row.expense ? formatMoney(row.expense) : "-",
        formatMoney(row.total),
        row.status,
      ]),
      styles: {
        fontSize: 8,
        cellPadding: 2,
      },
      headStyles: {
        fillColor: [18, 58, 92],
        textColor: 255,
      },
    });

    doc.save(`relatorio-${type}-${startDate}-${endDate}.pdf`);
  }

  function statusClass(status: string) {
    const s = status.toLowerCase();

    if (
      s.includes("paid") ||
      s.includes("completed") ||
      s.includes("ativo") ||
      s.includes("active") ||
      s.includes("positivo") ||
      s.includes("ok") ||
      s.includes("received") ||
      s.includes("income")
    ) {
      return "bg-green-50 text-green-700";
    }

    if (
      s.includes("pending") ||
      s.includes("ordered") ||
      s.includes("stock_low")
    ) {
      return "bg-yellow-50 text-yellow-700";
    }

    if (
      s.includes("expense") ||
      s.includes("cancel") ||
      s.includes("negativo") ||
      s.includes("inactive")
    ) {
      return "bg-red-50 text-red-600";
    }

    return "bg-slate-100 text-slate-700";
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">
            {t("reports")}
          </h1>

          <p className="text-sm text-slate-500">
            {t("reportsDescription")}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={exportPDF}
            className="rounded-[14px] border border-[#123A5C] px-4 py-2.5 text-sm text-[#123A5C] font-semibold flex items-center gap-2 hover:bg-[#123A5C] hover:text-white"
          >
            <Download size={16} />
            {t("export")}
          </button>

          <button
            onClick={loadReport}
            className="rounded-[14px] bg-[#123A5C] px-4 py-2.5 text-white text-sm font-semibold flex items-center gap-2 hover:bg-[#0B2540]"
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
            {t("update")}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
        <StatCard
          title={t("income")}
          value={formatMoney(summary.totalIncome)}
          icon={<TrendingUp size={20} />}
          tone="green"
        />

        <StatCard
          title={t("expenses")}
          value={formatMoney(summary.totalExpense)}
          icon={<TrendingDown size={20} />}
          tone="red"
        />

        <StatCard
          title={t("result")}
          value={formatMoney(summary.balance)}
          icon={<WalletCards size={20} />}
          tone={summary.balance >= 0 ? "blue" : "red"}
        />

        <StatCard
          title={t("records")}
          value={summary.count}
          icon={<FileText size={20} />}
          tone="blue"
        />
      </div>

      <div className="bg-white rounded-[22px] p-4 shadow-sm border border-slate-100">
        <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-2">
          {reportTypes.map((item) => (
            <button
              key={item.type}
              onClick={() => {
                setType(item.type);
                setPage(1);
              }}
              className={`rounded-[14px] px-3 py-3 text-sm font-semibold flex items-center justify-center gap-2 transition ${
                type === item.type
                  ? "bg-[#123A5C] text-white"
                  : "bg-slate-50 text-slate-700 hover:bg-slate-100"
              }`}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-3 mt-4">
          <div>
            <label className="text-xs text-slate-500">{t("from")}</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="mt-1 w-full rounded-[14px] border px-4 py-3 text-sm"
            />
          </div>

          <div>
            <label className="text-xs text-slate-500">{t("until")}</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="mt-1 w-full rounded-[14px] border px-4 py-3 text-sm"
            />
          </div>

          <div>
            <label className="text-xs text-slate-500">{t("cantina")}</label>
            <select
              value={cantinaId}
              onChange={(e) => setCantinaId(e.target.value)}
              className="mt-1 w-full rounded-[14px] border px-4 py-3 text-sm"
            >
              <option value="ALL">{t("all")}</option>
              {cantinas.map((cantina) => (
                <option key={cantina.id} value={cantina.id}>
                  {cantina.name} — {cantina.code}
                </option>
              ))}
            </select>
          </div>

          <div className="relative md:col-span-2">
            <label className="text-xs text-slate-500">{t("search")}</label>
            <div className="relative mt-1">
              <Search
                size={17}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") void loadReport();
                }}
                placeholder={t("searchReport")}
                className="w-full rounded-[14px] border pl-10 pr-4 py-3 text-sm"
              />
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-[16px] bg-red-50 px-4 py-3 text-sm text-red-600 flex items-center gap-2">
          <AlertCircle size={17} />
          {error}
        </div>
      )}

      <div className="bg-white rounded-[24px] shadow-sm border border-slate-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              {currentReport?.icon}
              {t("reportOf")} {currentReport?.label}
            </h2>

            <p className="text-sm text-slate-500">
              {formatDate(startDate)} {t("until").toLowerCase()}{" "}
              {formatDate(endDate)} · {summary.count} {t("records")}
            </p>
          </div>

          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Store size={16} />
            {selectedCantinaName()}
          </div>
        </div>

        {loading ? (
          <div className="p-10 text-center text-slate-500">
            {t("loading")}
          </div>
        ) : paginatedRows.length === 0 ? (
          <div className="p-10 text-center text-slate-500">
            {t("noRecords")}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1150px] text-left text-sm">
                <thead className="bg-slate-50 text-slate-500">
                  <tr>
                    <th className="px-5 py-4">{t("date")}</th>
                    <th className="px-5 py-4">{t("reference")}</th>
                    <th className="px-5 py-4">{t("cantinaAccount")}</th>
                    <th className="px-5 py-4">{t("description")}</th>
                    <th className="px-5 py-4">{t("methodType")}</th>
                    <th className="px-5 py-4">{t("income")}</th>
                    <th className="px-5 py-4">{t("expense")}</th>
                    <th className="px-5 py-4">{t("total")}</th>
                    <th className="px-5 py-4">{t("status")}</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {paginatedRows.map((row) => (
                    <tr key={row.id} className="hover:bg-slate-50">
                      <td className="px-5 py-4">{formatDate(row.date)}</td>

                      <td className="px-5 py-4 font-semibold text-slate-800">
                        {row.number}
                      </td>

                      <td className="px-5 py-4">{row.cantina}</td>

                      <td className="px-5 py-4">{row.description}</td>

                      <td className="px-5 py-4">{row.method}</td>

                      <td className="px-5 py-4 font-semibold text-green-700">
                        {row.income ? formatMoney(row.income) : "-"}
                      </td>

                      <td className="px-5 py-4 font-semibold text-red-600">
                        {row.expense ? formatMoney(row.expense) : "-"}
                      </td>

                      <td
                        className={`px-5 py-4 font-black ${
                          row.total >= 0 ? "text-[#123A5C]" : "text-red-600"
                        }`}
                      >
                        {formatMoney(row.total)}
                      </td>

                      <td className="px-5 py-4">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-semibold ${statusClass(
                            row.status
                          )}`}
                        >
                          {row.status}
                        </span>
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