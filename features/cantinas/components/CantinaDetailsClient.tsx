"use client";

import { useI18n } from "@/lib/i18n";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Store,
  Users,
  Wallet,
  ShoppingCart,
  Boxes,
  Download,
  PackageCheck,
  TrendingUp,
  FileText,
  CalendarDays,
  Layers,
  X,
  PackageSearch,
  ReceiptText,
} from "lucide-react";
import { useRouter } from "next/navigation";

type SaleItem = {
  id: string;
  quantity: number;
  totalPrice?: string;
  product?: { name: string };
};

type Sale = {
  id: string;
  saleNumber: string;
  totalAmount: string;
  paymentMethod: string;
  createdAt: string;
  items?: SaleItem[];
};

type Cost = {
  id: string;
  amount: string;
  description: string | null;
  costDate: string;
};

type Employee = {
  id: string;
  fullName: string;
  role: string;
  salary: string;
  status: string;
};

type StockLine = {
  id: string;
  quantity: number;
  product?: {
    name: string;
    internalCode: string;
  };
};

type StockMovement = {
  id: string;
  type:
    | "PURCHASE_IN"
    | "TRANSFER_OUT"
    | "TRANSFER_IN"
    | "SALE_OUT"
    | "ADJUSTMENT_IN"
    | "ADJUSTMENT_OUT"
    | "LOSS"
    | "RETURN";
  quantity: number;
  reason: string | null;
  referenceId: string | null;
  createdAt: string;
  product?: {
    name: string;
    internalCode: string;
  };
  user?: {
    name: string;
    identifier: string;
  } | null;
};

type CantinaDetails = {
  id: string;
  code: string;
  name: string;
  location: string | null;
  status: "ACTIVE" | "INACTIVE";
  openingCash: string;
  availableMachines: string | null;
  user?: {
    identifier: string;
    status: string;
    lastLoginAt: string | null;
  } | null;
  sales?: Sale[];
  costs?: Cost[];
  employees?: Employee[];
  cantinaStocks?: StockLine[];
  stockMovements?: StockMovement[];
  _count?: {
    sales: number;
    employees: number;
    costs: number;
    cantinaStocks: number;
  };
};

type ViewMode = "overview" | "daily" | "monthly" | "report";

const REPORT_ITEMS_PER_PAGE = 4;
const MONTH_ITEMS_PER_PAGE = 6;
const STOCK_TX_PER_PAGE = 7;
const STOCK_PRODUCTS_PER_PAGE = 15;

export default function CantinaDetailsClient({ id }: { id: string }) {
  const router = useRouter();
  const { t, lang } = useI18n();

  const [cantina, setCantina] = useState<CantinaDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [currency, setCurrency] = useState("EUR");
  const [viewMode, setViewMode] = useState<ViewMode>("overview");
  const [stockTransactionsOpen, setStockTransactionsOpen] = useState(false);
  const [stockProductsOpen, setStockProductsOpen] = useState(false);
  const [stockProductsPage, setStockProductsPage] = useState(1);

  const [dailyPage, setDailyPage] = useState<1 | 2>(1);
  const [reportStart, setReportStart] = useState("");
  const [reportEnd, setReportEnd] = useState("");
  const [reportPage, setReportPage] = useState(1);
  const [monthlyPage, setMonthlyPage] = useState(1);
  const [stockTxPage, setStockTxPage] = useState(1);

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
    // mantém moeda padrão se falhar
  }
}

  async function loadCantina() {
    setLoading(true);

    try {
      const res = await fetch(`/api/cantinas/${id}`);
      const data = await res.json();

      if (res.ok) {
        setCantina(data.cantina);
      }
    } finally {
      setLoading(false);
    }
  }

 useEffect(() => {
  const timeout = setTimeout(() => {
    void loadCantina();
    void loadCompanyCurrency();
  }, 0);

  return () => clearTimeout(timeout);
}, []);

  function locale() {
    if (lang === "fr") return "fr-FR";
    if (lang === "en") return "en-GB";
    return "pt-PT";
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

  const sales = cantina?.sales || [];
  const costs = cantina?.costs || [];
  const employees = cantina?.employees || [];
  const stocks = cantina?.cantinaStocks || [];
  const stockWithTransfers = useMemo(() => {
  return stocks.map((line) => {
    const totalTransferred = (cantina?.stockMovements || [])
      .filter(
        (movement) =>
          movement.type === "TRANSFER_IN" &&
          movement.product?.internalCode ===
            line.product?.internalCode
      )
      .reduce(
        (sum, movement) =>
          sum + Number(movement.quantity || 0),
        0
      );

    return {
      ...line,
      totalTransferred,
      remainingQuantity: Number(line.quantity || 0),
    };
  });
}, [cantina, stocks]);

const stockProductsTotalPages = Math.max(
  1,
  Math.ceil(
    stockWithTransfers.length / STOCK_PRODUCTS_PER_PAGE
  )
);

const paginatedStockProducts = stockWithTransfers.slice(
  (stockProductsPage - 1) * STOCK_PRODUCTS_PER_PAGE,
  stockProductsPage * STOCK_PRODUCTS_PER_PAGE
);
  

  const totalSales = sales.reduce(
    (sum, sale) => sum + Number(sale.totalAmount || 0),
    0
  );

  const totalCosts = costs.reduce(
    (sum, cost) => sum + Number(cost.amount || 0),
    0
  );

  const estimatedProfit = totalSales - totalCosts;

  const topProducts = useMemo(() => {
    const map = new Map<
      string,
      { name: string; quantity: number; total: number }
    >();

    sales.forEach((sale) => {
      sale.items?.forEach((item) => {
        const name = item.product?.name || t("unknownProduct");
        const current = map.get(name) || { name, quantity: 0, total: 0 };

        current.quantity += item.quantity || 0;
        current.total += Number(item.totalPrice || 0);

        map.set(name, current);
      });
    });

    return Array.from(map.values())
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5);
  }, [sales, lang]);

  const reportSales = useMemo(() => {
    if (!reportStart || !reportEnd) return [];

    return sales.filter((sale) => {
      const saleDay = sale.createdAt.slice(0, 10);
      return saleDay >= reportStart && saleDay <= reportEnd;
    });
  }, [sales, reportStart, reportEnd]);

  const reportTotalPages = Math.max(
    1,
    Math.ceil(reportSales.length / REPORT_ITEMS_PER_PAGE)
  );

  const paginatedReportSales = reportSales.slice(
    (reportPage - 1) * REPORT_ITEMS_PER_PAGE,
    reportPage * REPORT_ITEMS_PER_PAGE
  );

  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth();
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const visibleDays = dailyPage === 1 ? days.slice(0, 16) : days.slice(16);

  const monthlyRows = Array.from({ length: 12 }, (_, index) => {
  const monthSales = sales.filter(
    (sale) => new Date(sale.createdAt).getMonth() === index
  );

  const values = monthSales.map((sale) => Number(sale.totalAmount || 0));
  const total = values.reduce((a, b) => a + b, 0);

  const previousMonthSales =
    index > 0
      ? sales.filter(
          (sale) => new Date(sale.createdAt).getMonth() === index - 1
        )
      : [];

  const previousMonthTotal = previousMonthSales.reduce(
    (sum, sale) => sum + Number(sale.totalAmount || 0),
    0
  );

  let growth = 0;

  if (index > 0 && previousMonthTotal > 0) {
    growth =
      ((total - previousMonthTotal) / previousMonthTotal) * 100;
  }

  return {
    month: new Date(currentYear, index).toLocaleString(locale(), {
      month: "long",
    }),
    total,
    max: values.length ? Math.max(...values) : 0,
    min: values.length ? Math.min(...values) : 0,
    average: values.length ? total / values.length : 0,
    salesCount: values.length,
    growth: Number(growth.toFixed(2)),
  };
});

  const monthlyTotalPages = Math.max(
    1,
    Math.ceil(monthlyRows.length / MONTH_ITEMS_PER_PAGE)
  );

  const paginatedMonthlyRows = monthlyRows.slice(
    (monthlyPage - 1) * MONTH_ITEMS_PER_PAGE,
    monthlyPage * MONTH_ITEMS_PER_PAGE
  );

  const stockTransactions = useMemo(() => {
    return (cantina?.stockMovements || []).map((movement) => {
      const date = new Date(movement.createdAt);

      return {
        id: movement.id,
        date: date.toISOString().slice(0, 10),
        hour: date.toLocaleTimeString(locale(), {
          hour: "2-digit",
          minute: "2-digit",
        }),
        product: movement.product?.name || t("unknownProduct"),
        code: movement.product?.internalCode || "-",
        type: movement.type,
        quantity: movement.quantity,
        reason: movement.reason || "-",
        user: movement.user?.name || movement.user?.identifier || "-",
      };
    });
  }, [cantina, lang]);

  const stockTxTotalPages = Math.max(
    1,
    Math.ceil(stockTransactions.length / STOCK_TX_PER_PAGE)
  );

  const paginatedStockTransactions = stockTransactions.slice(
    (stockTxPage - 1) * STOCK_TX_PER_PAGE,
    stockTxPage * STOCK_TX_PER_PAGE
  );

  function isStockIn(type: string) {
    return ["PURCHASE_IN", "TRANSFER_IN", "ADJUSTMENT_IN", "RETURN"].includes(
      type
    );
  }

  function getMovementLabel(type: string) {
    return isStockIn(type) ? t("stockIn") : t("stockOut");
  }

  function downloadMonthlyReport(month: string) {
    const monthIndex = monthlyRows.findIndex((row) => row.month === month);

    if (monthIndex === -1 || !cantina) return;

    const selectedMonthSales = sales.filter(
      (sale) => new Date(sale.createdAt).getMonth() === monthIndex
    );

    const total = selectedMonthSales.reduce(
      (sum, sale) => sum + Number(sale.totalAmount || 0),
      0
    );

    const doc = new jsPDF("landscape", "mm", "a4");

    doc.setFontSize(18);
    doc.text(`${t("monthlyReport")} - ${cantina.name}`, 14, 15);

    doc.setFontSize(10);
    doc.text(`${t("cantina")}: ${cantina.name} (${cantina.code})`, 14, 24);
    doc.text(`${t("location")}: ${cantina.location || "-"}`, 14, 30);
    doc.text(`${t("month")}: ${month} ${currentYear}`, 14, 36);
    doc.text(`${t("totalSold")}: ${formatMoney(total)}`, 14, 42);
    doc.text(`${t("numberOfSales")}: ${selectedMonthSales.length}`, 14, 48);

    autoTable(doc, {
      startY: 56,
      head: [
        [
          t("date"),
          t("hour"),
          t("saleNumber"),
          t("method"),
          t("total"),
          t("items"),
        ],
      ],
      body: selectedMonthSales.map((sale) => [
        new Date(sale.createdAt).toLocaleDateString(locale()),
        new Date(sale.createdAt).toLocaleTimeString(locale(), {
          hour: "2-digit",
          minute: "2-digit",
        }),
        sale.saleNumber,
        sale.paymentMethod,
        formatMoney(sale.totalAmount),
        String(sale.items?.length || 0),
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

    doc.save(
      `relatorio-${cantina.code}-${month}-${currentYear}.pdf`
        .toLowerCase()
        .replaceAll(" ", "-")
    );
  }

  if (loading) {
    return (
      <div className="bg-white rounded-[20px] p-8 shadow-sm">
        {t("loadingCantinaDetails")}
      </div>
    );
  }

  if (!cantina) {
    return (
      <div className="bg-white rounded-[20px] p-8 shadow-sm">
        {t("cantinaNotFound")}
      </div>
    );
  }return (
    <div className="space-y-3">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <button
          onClick={() => router.push("/cantinas")}
          className="flex items-center gap-2 text-sm text-slate-600 hover:text-[#123A5C]"
        >
          <ArrowLeft size={17} />
          {t("backToCantinas")}
        </button>

        <div className="flex flex-wrap gap-2">
          <ActionButton
            active={viewMode === "overview"}
            onClick={() => setViewMode("overview")}
            title={t("overview")}
            icon={<Store size={15} />}
          />
          <ActionButton
            active={viewMode === "daily"}
            onClick={() => setViewMode("daily")}
            title={t("dailyTracking")}
            icon={<CalendarDays size={15} />}
          />
          <ActionButton
            active={viewMode === "monthly"}
            onClick={() => setViewMode("monthly")}
            title={t("monthlyTracking")}
            icon={<FileText size={15} />}
          />
          <ActionButton
            active={viewMode === "report"}
            onClick={() => setViewMode("report")}
            title={t("report")}
            icon={<ReceiptText size={15} />}
          />
        </div>
      </div>

      <div className="bg-white rounded-[20px] p-4 shadow-sm flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-[16px] bg-[#123A5C]/10 flex items-center justify-center">
            <Store className="text-[#123A5C]" size={26} />
          </div>

          <div>
            <h1 className="text-xl font-bold text-slate-800">{cantina.name}</h1>
            <p className="text-xs text-slate-500">
              {t("code")} {cantina.code} ·{" "}
              {cantina.location || t("noLocation")}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              {t("identifier")}: {cantina.user?.identifier || "-"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setStockTransactionsOpen(true)}
            className="inline-flex items-center gap-2 rounded-[14px] bg-[#123A5C] px-4 py-2 text-xs font-semibold text-white hover:bg-[#0B2540]"
          >
            <Layers size={15} />
            {t("stockTransactions")}
          </button>

          <span
            className={`px-3 py-2 rounded-full text-xs font-semibold ${
              cantina.status === "ACTIVE"
                ? "bg-green-50 text-green-700"
                : "bg-red-50 text-red-600"
            }`}
          >
            {cantina.status === "ACTIVE" ? t("active") : t("inactive")}
          </span>
        </div>
      </div>

      {viewMode === "overview" && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-2">
            <SmallCard
              icon={<ShoppingCart size={20} />}
              title={t("sales")}
              value={cantina._count?.sales || 0}
            />
            <SmallCard
              icon={<Users size={20} />}
              title={t("hr")}
              value={cantina._count?.employees || 0}
            />
            <SmallCard
              icon={<Wallet size={20} />}
              title={t("costs")}
              value={cantina._count?.costs || 0}
            />
            <button
                type="button"
                onClick={() => {
                  setStockProductsPage(1);
                  setStockProductsOpen(true);
                }}
                className="text-left"
              >
                <SmallCard
                  icon={<Boxes size={20} />}
                  title={t("stock")}
                  value={cantina._count?.cantinaStocks || 0}
                />
          </button>
            <SmallCard
              icon={<TrendingUp size={20} />}
              title={t("totalSold")}
              value={formatMoney(totalSales)}
            />
            <SmallCard
              icon={<PackageCheck size={20} />}
              title={t("estimatedProfit")}
              value={formatMoney(estimatedProfit)}
            />
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
            <CompactPanel title={t("top5Products")} icon={<TrendingUp size={16} />}>
              {topProducts.length === 0 ? (
                <Empty
                  icon={<PackageSearch size={34} />}
                  text={t("noProductSoldYet")}
                />
              ) : (
                <table className="w-full text-left text-xs">
                  <thead className="text-slate-500">
                    <tr>
                      <th className="py-2">{t("product")}</th>
                      <th>{t("qty")}</th>
                      <th>{t("total")}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {topProducts.map((product) => (
                      <tr key={product.name}>
                        <td className="py-2 font-medium">{product.name}</td>
                        <td>{product.quantity}</td>
                        <td>{formatMoney(product.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CompactPanel>

            <CompactPanel title={t("currentStock")} icon={<Boxes size={16} />}>
              {stocks.length === 0 ? (
                <Empty icon={<Boxes size={34} />} text={t("noStockProduct")} />
              ) : (
                <table className="w-full text-left text-xs">
                  <thead className="text-slate-500">
                    <tr>
                      <th className="py-2">{t("product")}</th>
                      <th>{t("code")}</th>
                      <th>{t("qty")}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {stocks.slice(0, 5).map((line) => (
                      <tr key={line.id}>
                        <td className="py-2 font-medium">{line.product?.name}</td>
                        <td>{line.product?.internalCode}</td>
                        <td>{line.quantity}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CompactPanel>

            <CompactPanel title={t("costs")} icon={<Wallet size={16} />}>
              {costs.length === 0 ? (
                <Empty icon={<Wallet size={34} />} text={t("noCostRecorded")} />
              ) : (
                <table className="w-full text-left text-xs">
                  <tbody className="divide-y">
                    {costs.slice(0, 5).map((cost) => (
                      <tr key={cost.id}>
                        <td className="py-2">{cost.description || t("cost")}</td>
                        <td>{cost.costDate.slice(0, 10)}</td>
                        <td className="font-semibold">{formatMoney(cost.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CompactPanel>

            <CompactPanel title={t("hr")} icon={<Users size={16} />}>
              {employees.length === 0 ? (
                <Empty
                  icon={<Users size={34} />}
                  text={t("noEmployeeLinked")}
                />
              ) : (
                <table className="w-full text-left text-xs">
                  <tbody className="divide-y">
                    {employees.slice(0, 5).map((employee) => (
                      <tr key={employee.id}>
                        <td className="py-2 font-medium">{employee.fullName}</td>
                        <td>{employee.role}</td>
                        <td>{formatMoney(employee.salary)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CompactPanel>
          </div>
        </>
      )}

      {viewMode === "report" && (
        <FullPanel
          title={t("salesReportByInterval")}
          icon={<ReceiptText size={18} />}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
            <div>
              <label className="text-xs text-slate-500">
                {t("startDate")}
              </label>
              <input
                type="date"
                value={reportStart}
                onChange={(e) => {
                  setReportStart(e.target.value);
                  setReportPage(1);
                }}
                className="mt-1 w-full border rounded-[14px] px-4 py-3 text-sm"
              />
            </div>

            <div>
              <label className="text-xs text-slate-500">
                {t("endDate")}
              </label>
              <input
                type="date"
                value={reportEnd}
                onChange={(e) => {
                  setReportEnd(e.target.value);
                  setReportPage(1);
                }}
                className="mt-1 w-full border rounded-[14px] px-4 py-3 text-sm"
              />
            </div>
          </div>

          {reportSales.length === 0 ? (
            <Empty
              icon={<ReceiptText size={42} />}
              text={t("noSaleFoundInPeriod")}
            />
          ) : (
            <>
              <div className="overflow-x-auto rounded-[18px] border">
                <table className="w-full min-w-[800px] text-left text-sm">
                  <thead className="bg-slate-50 text-slate-500">
                    <tr>
                      <th className="px-4 py-3">{t("hour")}</th>
                      <th className="px-4 py-3">{t("saleNumber")}</th>
                      <th className="px-4 py-3">{t("method")}</th>
                      <th className="px-4 py-3">{t("total")}</th>
                      <th className="px-4 py-3">{t("items")}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {paginatedReportSales.map((sale) => (
                      <tr key={sale.id}>
                        <td className="px-4 py-3">
                          {new Date(sale.createdAt).toLocaleTimeString(locale())}
                        </td>
                        <td className="px-4 py-3">{sale.saleNumber}</td>
                        <td className="px-4 py-3">{sale.paymentMethod}</td>
                        <td className="px-4 py-3 font-semibold">
                          {formatMoney(sale.totalAmount)}
                        </td>
                        <td className="px-4 py-3">{sale.items?.length || 0}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <Pagination
                page={reportPage}
                totalPages={reportTotalPages}
                t={t}
                onPrev={() => setReportPage((p) => Math.max(1, p - 1))}
                onNext={() =>
                  setReportPage((p) => Math.min(reportTotalPages, p + 1))
                }
              />
            </>
          )}
        </FullPanel>
      )}

      {viewMode === "daily" && (
        <FullPanel
          title={`${t("dailyTracking")} — ${new Date().toLocaleString(locale(), {
            month: "long",
          })}`}
          icon={<CalendarDays size={18} />}
        >
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setDailyPage(1)}
              className={`px-4 py-2 rounded-xl text-sm ${
                dailyPage === 1 ? "bg-[#123A5C] text-white" : "bg-slate-100"
              }`}
            >
              {t("days")} 1–16
            </button>
            <button
              onClick={() => setDailyPage(2)}
              className={`px-4 py-2 rounded-xl text-sm ${
                dailyPage === 2 ? "bg-[#123A5C] text-white" : "bg-slate-100"
              }`}
            >
              {t("days")} 17–{daysInMonth}
            </button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-3">
            {visibleDays.map((day) => {
              const daySales = sales.filter(
                (sale) => new Date(sale.createdAt).getDate() === day
              );
              const total = daySales.reduce(
                (sum, sale) => sum + Number(sale.totalAmount || 0),
                0
              );

              return (
                <div
                  key={day}
                  className="border rounded-[18px] p-3 hover:border-[#123A5C]"
                >
                  <p className="font-bold text-slate-800">
                    {t("day")} {day}
                  </p>
                  <p className="text-xs text-slate-500">
                    {daySales.length} {t("sales")}
                  </p>
                  <p className="text-sm font-semibold mt-2">
                    {formatMoney(total)}
                  </p>
                </div>
              );
            })}
          </div>
        </FullPanel>
      )}

      {viewMode === "monthly" && (
        <FullPanel
          title={`${t("monthlyTracking")} — ${currentYear}`}
          icon={<FileText size={18} />}
        >
          <div className="overflow-x-auto rounded-[18px] border">
            <table className="w-full min-w-[900px] text-left text-xs">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  <th className="px-4 py-3">{t("month")}</th>
                  <th className="px-4 py-3">{t("total")}</th>
                  <th className="px-4 py-3">{t("max")}</th>
                  <th className="px-4 py-3">{t("min")}</th>
                  <th className="px-4 py-3">{t("average")}</th>
                  <th className="px-4 py-3">{t("numberOfSales")}</th>
                  <th className="px-4 py-3">{t("growth")}</th>
                  <th className="px-4 py-3">PDF</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {paginatedMonthlyRows.map((row) => (
                  <tr key={row.month}>
                    <td className="px-4 py-2 font-semibold capitalize">
                      {row.month}
                    </td>
                    <td className="px-4 py-2">{formatMoney(row.total)}</td>
                    <td className="px-4 py-2">{formatMoney(row.max)}</td>
                    <td className="px-4 py-2">{formatMoney(row.min)}</td>
                    <td className="px-4 py-2">{formatMoney(row.average)}</td>
                    <td className="px-4 py-2">{row.salesCount}</td>
                    <td
                        className={`px-4 py-2 font-semibold ${
                        row.growth > 0
                       ? "text-green-600"
                        : row.growth < 0
                        ? "text-red-600"
                          : "text-slate-500"
                      }`}
                    >
                      {row.growth > 0 ? "+" : ""}
                      {row.growth.toFixed(2)}%
                    </td>
                    <td className="px-4 py-2">
                      <button
                        onClick={() => downloadMonthlyReport(row.month)}
                        className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-[#123A5C] text-white"
                      >
                        <Download size={14} />
                        PDF
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <Pagination
            page={monthlyPage}
            totalPages={monthlyTotalPages}
            t={t}
            onPrev={() => setMonthlyPage((p) => Math.max(1, p - 1))}
            onNext={() =>
              setMonthlyPage((p) => Math.min(monthlyTotalPages, p + 1))
            }
          />
        </FullPanel>
      )}
      {stockProductsOpen && (
  <div className="fixed left-[200px] top-[110px] right-0 bottom-0 z-40 bg-[#F4F7FA] p-5 overflow-hidden">
    <div className="h-full bg-white rounded-[24px] shadow-xl flex flex-col overflow-hidden">

      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">
            {t("cantinaStock")}
          </h2>

          <p className="text-sm text-slate-500 mt-1">
            {cantina.name} — {cantina.code}
          </p>
        </div>

        <button
          type="button"
          onClick={() => setStockProductsOpen(false)}
          className="p-2 rounded-xl hover:bg-slate-100 text-slate-500 hover:text-slate-800"
        >
          <X size={24} />
        </button>
      </div>

      <div className="flex-1 p-6 overflow-auto">
        {stockWithTransfers.length === 0 ? (
          <Empty
            icon={<Boxes size={46} />}
            text={t("noStockProduct")}
          />
        ) : (
          <>
            <div className="overflow-x-auto rounded-[18px] border">
              <table className="w-full min-w-[850px] text-left text-sm">

                <thead className="bg-slate-50 text-slate-500">
                  <tr>
                    <th className="px-5 py-4">
                      {t("product")}
                    </th>

                    <th className="px-5 py-4">
                      {t("code")}
                    </th>

                    <th className="px-5 py-4 text-right">
                      {t("totalTransferred")}
                    </th>

                    <th className="px-5 py-4 text-right">
                      {t("remainingQuantity")}
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {paginatedStockProducts.map((line) => (
                    <tr
                      key={line.id}
                      className="hover:bg-slate-50"
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">

                          <div className="w-9 h-9 rounded-[12px] bg-[#123A5C]/10 flex items-center justify-center">
                            <Boxes
                              size={17}
                              className="text-[#123A5C]"
                            />
                          </div>

                          <span className="font-semibold text-slate-800">
                            {line.product?.name ||
                              t("unknownProduct")}
                          </span>
                        </div>
                      </td>

                      <td className="px-5 py-4 text-slate-500">
                        {line.product?.internalCode || "-"}
                      </td>

                      <td className="px-5 py-4 text-right">
                        <span className="font-bold text-[#123A5C]">
                          {line.totalTransferred}
                        </span>
                      </td>

                      <td className="px-5 py-4 text-right">
                        <span
                          className={`inline-flex min-w-[70px] justify-center rounded-full px-3 py-1.5 text-sm font-bold ${
                            line.remainingQuantity > 0
                              ? "bg-green-50 text-green-700"
                              : "bg-red-50 text-red-600"
                          }`}
                        >
                          {line.remainingQuantity}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>

              </table>
            </div>

            <Pagination
              page={stockProductsPage}
              totalPages={stockProductsTotalPages}
              t={t}
              onPrev={() =>
                setStockProductsPage((page) =>
                  Math.max(1, page - 1)
                )
              }
              onNext={() =>
                setStockProductsPage((page) =>
                  Math.min(
                    stockProductsTotalPages,
                    page + 1
                  )
                )
              }
            />
          </>
        )}
      </div>
    </div>
  </div>
)}

      {stockTransactionsOpen && (
        <div className="fixed left-[200px] top-[110px] right-0 bottom-0 z-40 bg-[#F4F7FA] p-5 overflow-hidden">
          <div className="h-full bg-white rounded-[24px] shadow-xl flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <div>
                <h2 className="text-2xl font-bold text-slate-800">
                  {t("stockTransactions")}
                </h2>
                <p className="text-sm text-slate-500 mt-1">
                  {t("stockTransactionsDescription")}
                </p>
              </div>

              <button
                onClick={() => setStockTransactionsOpen(false)}
                className="p-2 rounded-xl hover:bg-slate-100 text-slate-500 hover:text-slate-800"
              >
                <X size={24} />
              </button>
            </div>

            <div className="flex-1 p-6 overflow-auto">
              {stockTransactions.length === 0 ? (
                <Empty
                  icon={<Layers size={46} />}
                  text={t("noStockTransactionFound")}
                />
              ) : (
                <>
                  <table className="w-full min-w-[900px] text-left text-sm">
                    <thead className="bg-slate-50 text-slate-500 sticky top-0">
                      <tr>
                        <th className="px-4 py-3">{t("date")}</th>
                        <th className="px-4 py-3">{t("hour")}</th>
                        <th className="px-4 py-3">{t("product")}</th>
                        <th className="px-4 py-3">{t("code")}</th>
                        <th className="px-4 py-3">{t("type")}</th>
                        <th className="px-4 py-3">{t("qty")}</th>
                        <th className="px-4 py-3">{t("reason")}</th>
                        <th className="px-4 py-3">{t("user")}</th>
                      </tr>
                    </thead>

                    <tbody className="divide-y">
                      {paginatedStockTransactions.map((tx) => (
                        <tr key={tx.id} className="hover:bg-slate-50">
                          <td className="px-4 py-3">{tx.date}</td>
                          <td className="px-4 py-3">{tx.hour}</td>
                          <td className="px-4 py-3 font-semibold">
                            {tx.product}
                          </td>
                          <td className="px-4 py-3">{tx.code}</td>

                          <td className="px-4 py-3">
                            <span
                              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                                isStockIn(tx.type)
                                  ? "bg-green-50 text-green-700"
                                  : "bg-red-50 text-red-600"
                              }`}
                            >
                              {getMovementLabel(tx.type)}
                            </span>
                          </td>

                          <td
                            className={`px-4 py-3 font-bold ${
                              isStockIn(tx.type)
                                ? "text-green-700"
                                : "text-red-600"
                            }`}
                          >
                            {isStockIn(tx.type) ? "+" : "-"}
                            {tx.quantity}
                          </td>

                          <td className="px-4 py-3">{tx.reason}</td>
                          <td className="px-4 py-3">{tx.user}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  <Pagination
                    page={stockTxPage}
                    totalPages={stockTxTotalPages}
                    t={t}
                    onPrev={() => setStockTxPage((p) => Math.max(1, p - 1))}
                    onNext={() =>
                      setStockTxPage((p) => Math.min(stockTxTotalPages, p + 1))
                    }
                  />
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}function SmallCard({
  icon,
  title,
  value,
}: {
  icon: React.ReactNode;
  title: string;
  value: number | string;
}) {
  return (
    <div className="bg-white rounded-[14px] p-2.5 shadow-sm flex items-center gap-2">
      <div className="w-9 h-9 rounded-[12px] bg-[#123A5C]/10 text-[#123A5C] flex items-center justify-center">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-[10px] text-slate-500">{title}</p>
        <h3 className="text-xs font-bold text-slate-800 truncate">{value}</h3>
      </div>
    </div>
  );
}

function ActionButton({
  title,
  active,
  onClick,
  icon,
}: {
  title: string;
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-[14px] border px-3 py-2 text-xs font-semibold flex items-center gap-2 ${
        active
          ? "bg-[#123A5C] text-white border-[#123A5C]"
          : "bg-white text-slate-700 hover:border-[#123A5C]"
      }`}
    >
      {icon}
      {title}
    </button>
  );
}

function CompactPanel({
  title,
  children,
  icon,
}: {
  title: string;
  children: React.ReactNode;
  icon?: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-[18px] p-4 shadow-sm min-h-[165px]">
      <div className="flex items-center gap-2 mb-3">
        {icon && <div className="text-[#123A5C]">{icon}</div>}
        <h2 className="text-sm font-bold text-slate-800">{title}</h2>
      </div>
      {children}
    </div>
  );
}

function FullPanel({
  title,
  children,
  icon,
}: {
  title: string;
  children: React.ReactNode;
  icon?: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-[22px] p-5 shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        {icon && <div className="text-[#123A5C]">{icon}</div>}
        <h2 className="text-lg font-bold text-slate-800">{title}</h2>
      </div>
      {children}
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
    <div className="flex items-center justify-between mt-4">
      <p className="text-sm text-slate-500">
        {t("page")} {page} {t("of")} {totalPages}
      </p>

      <div className="flex gap-2">
        <button
          onClick={onPrev}
          disabled={page === 1}
          className="px-4 py-2 rounded-xl border disabled:opacity-40"
        >
          {t("previous")}
        </button>

        <button
          onClick={onNext}
          disabled={page === totalPages}
          className="px-4 py-2 rounded-xl border disabled:opacity-40"
        >
          {t("next")}
        </button>
      </div>
    </div>
  );
}

function Empty({ text, icon }: { text: string; icon?: React.ReactNode }) {
  return (
    <div className="rounded-[16px] bg-slate-50 p-5 text-center text-slate-500 flex flex-col items-center gap-2 text-sm">
      {icon && <div className="text-slate-300">{icon}</div>}
      <p>{text}</p>
    </div>
  );
}