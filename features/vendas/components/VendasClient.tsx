"use client";
import { useEffect, useMemo, useState } from "react";
import { useI18n } from "@/lib/i18n";

import { useRouter } from "next/navigation";
import {
  Search,
  Barcode,
  ShoppingCart,
  Trash2,
  Plus,
  Minus,
  CreditCard,
  Banknote,
  Smartphone,
  ReceiptText,
  Store,
  CheckCircle2,
  XCircle,
  ArrowRight,
  Printer,
  ArrowLeft,
  FileText,
} from "lucide-react";

type ProductStock = {
  id: string;
  quantity: number;
  product: {
    id: string;
    name: string;
    internalCode: string;
    barcode: string | null;
    unit: string;
    salePrice: string;
    purchasePrice: string;
    minStock: number;
  };
};

type CartItem = {
  productId: string;
  name: string;
  code: string;
  unit: string;
  price: number;
  quantity: number;
  availableQuantity: number;
};

type Cantina = {
  id: string;
  name: string;
  code: string;
  location: string | null;
};

type SaleReport = {
  id: string;
  saleNumber: string;
  totalAmount: string;
  paymentMethod: string;
  createdAt: string;
  items?: unknown[];
};

type PaymentMethod = "CASH" | "CARD" | "MOBILE_MONEY" | "TRANSFER" | "OTHER";
type Role = "ADMIN" | "EMPLOYEE";
type PaymentStep = "none" | "method" | "cash" | "invoice";

export default function VendasClient() {
  const router = useRouter();
  const { t, lang } = useI18n();

  const [role, setRole] = useState<Role>("EMPLOYEE");
  const [products, setProducts] = useState<ProductStock[]>([]);
  const [cantinas, setCantinas] = useState<Cantina[]>([]);
  const [cantina, setCantina] = useState<Cantina | null>(null);
  const [selectedCantinaId, setSelectedCantinaId] = useState("");

  const [loading, setLoading] = useState(true);
  const [currency, setCurrency] = useState("EUR");
  const [selling, setSelling] = useState(false);

  const [search, setSearch] = useState("");
  const [barcode, setBarcode] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);

  const [paymentStep, setPaymentStep] = useState<PaymentStep>("none");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("CASH");
  const [paidAmount, setPaidAmount] = useState("");
  const [discount, setDiscount] = useState("");
  const [customerName, setCustomerName] = useState("");

  const [lastSaleId, setLastSaleId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [reportOpen, setReportOpen] = useState(false);
  const [reportStart, setReportStart] = useState("");
  const [reportEnd, setReportEnd] = useState("");
  const [reportPage, setReportPage] = useState(1);
  const [reportTotalPages, setReportTotalPages] = useState(1);
  const [reportSales, setReportSales] = useState<SaleReport[]>([]);

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

  async function loadProducts(cantinaId?: string) {
    setLoading(true);
    setError("");

    const params = new URLSearchParams();
    if (cantinaId) params.set("cantinaId", cantinaId);

    try {
      const res = await fetch(`/api/vendas/products?${params.toString()}`);
      const data = await res.json();

      if (!res.ok) {
        setError(data.message || t("errorLoadingProducts"));
        return;
      }

      setRole(data.role || "EMPLOYEE");
      setCantinas(data.cantinas || []);
      setProducts(data.products || []);
      setCantina(data.cantina || null);

      if (data.cantina?.id) {
        setSelectedCantinaId(data.cantina.id);
      }
    } catch {
      setError(t("errorLoadingProducts"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
  const timeout = setTimeout(() => {
    void loadProducts();
    void loadCompanyCurrency();
  }, 0);

  return () => clearTimeout(timeout);
}, []);

  const filteredProducts = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return [];

    return products.filter((item) => {
      const product = item.product;

      return (
        product.name.toLowerCase().includes(q) ||
        product.internalCode.toLowerCase().includes(q) ||
        (product.barcode || "").toLowerCase().includes(q)
      );
    });
  }, [products, search]);

  const subtotal = cart.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  const discountValue = Number(discount || 0);
  const total = Math.max(0, subtotal - discountValue);
  const paid = paymentMethod === "CASH" ? Number(paidAmount || 0) : total;
  const change = paid - total;
  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);

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

  function addToCart(stock: ProductStock) {
    const product = stock.product;

    setError("");
    setMessage("");

    setCart((prev) => {
      const existing = prev.find((item) => item.productId === product.id);

      if (existing) {
        if (existing.quantity + 1 > stock.quantity) {
          setError(t("quantityHigherThanStock"));
          return prev;
        }

        return prev.map((item) =>
          item.productId === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }

      return [
        ...prev,
        {
          productId: product.id,
          name: product.name,
          code: product.internalCode,
          unit: product.unit,
          price: Number(product.salePrice || 0),
          quantity: 1,
          availableQuantity: stock.quantity,
        },
      ];
    });

    setSearch("");
  }

  function removeFromCart(productId: string) {
    setCart((prev) => prev.filter((item) => item.productId !== productId));
  }

  function decreaseQuantity(productId: string) {
    setCart((prev) =>
      prev.map((item) =>
        item.productId === productId
          ? { ...item, quantity: Math.max(1, item.quantity - 1) }
          : item
      )
    );
  }

  function increaseQuantity(productId: string) {
    setCart((prev) =>
      prev.map((item) => {
        if (item.productId !== productId) return item;

        if (item.quantity + 1 > item.availableQuantity) {
          setError(t("quantityHigherThanStock"));
          return item;
        }

        return { ...item, quantity: item.quantity + 1 };
      })
    );
  }

  function handleBarcodeEnter(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key !== "Enter") return;
    e.preventDefault();

    const code = barcode.trim();
    if (!code) return;

    const found = products.find(
      (item) =>
        item.product.barcode === code || item.product.internalCode === code
    );

    if (!found) {
      setError(t("productNotFoundCantina"));
      return;
    }

    addToCart(found);
    setBarcode("");
  }

  function addNumber(value: string) {
    setPaidAmount((prev) => {
      if (value === "." && prev.includes(".")) return prev;
      return `${prev}${value}`;
    });
  }

  function cancelSale() {
    setCart([]);
    setPaidAmount("");
    setDiscount("");
    setCustomerName("");
    setPaymentStep("none");
    setError("");
    setMessage("");
  }

  function openPayment() {
    if (role === "ADMIN" && !selectedCantinaId) {
      setError(t("chooseCantinaBeforeSelling"));
      return;
    }

    if (cart.length === 0) {
      setError(t("noItemAdded"));
      return;
    }

    setError("");
    setPaymentStep("method");
  }

  function buildSalePayload(method: PaymentMethod) {
    return {
      cantinaId: selectedCantinaId,
      items: cart.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
      })),
      paymentMethod: method,
      paidAmount: method === "CASH" ? Number(paidAmount || 0) : total,
      
      customerName,
      customerTaxId: null,
      notes:
  discountValue > 0
    ? `${t("discount")}: ${formatMoney(discountValue)}`
    : null,
  }
  };
  async function submitSale(method: PaymentMethod) {
    setSelling(true);
    setError("");

    try {
      const amountPaid = method === "CASH" ? Number(paidAmount || 0) : total;

      if (method === "CASH" && amountPaid < total) {
        setError("O valor pago é inferior ao total.");
        return;
      }

      const salePayload = buildSalePayload(method);

      if (!navigator.onLine) {
        const existing = JSON.parse(
          localStorage.getItem("offline_sales") || "[]"
        );

        localStorage.setItem(
          "offline_sales",
          JSON.stringify([
            ...existing,
            {
              id: crypto.randomUUID(),
              createdAt: new Date().toISOString(),
              payload: salePayload,
            },
          ])
        );

        cancelSale();
        setMessage(
          t("offlineSaleSaved")
        );
        return;
      }

      const res = await fetch("/api/vendas", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(salePayload),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || t("errorFinishingSale"));
        return;
      }

      setLastSaleId(data.sale?.id || null);
      setMessage(t("saleRegisteredSuccess"));
      setPaymentStep("invoice");

      await loadProducts(selectedCantinaId);
    } catch {
      const salePayload = buildSalePayload(method);
      const existing = JSON.parse(localStorage.getItem("offline_sales") || "[]");

      localStorage.setItem(
        "offline_sales",
        JSON.stringify([
          ...existing,
          {
            id: crypto.randomUUID(),
            createdAt: new Date().toISOString(),
            payload: salePayload,
          },
        ])
      );

      cancelSale();
      setMessage(
        t("offlineSaleSaved")
      );
    } finally {
      setSelling(false);
    }
  }

  async function syncOfflineSales() {
    if (!navigator.onLine) return;

    const saved = JSON.parse(localStorage.getItem("offline_sales") || "[]");
    if (!saved.length) return;

    const remaining = [];

    for (const sale of saved) {
      try {
        const res = await fetch("/api/vendas", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(sale.payload),
        });

        if (!res.ok) remaining.push(sale);
      } catch {
        remaining.push(sale);
      }
    }

    localStorage.setItem("offline_sales", JSON.stringify(remaining));

    if (remaining.length === 0) {
      setMessage(t("offlineSalesSynced"));
      await loadProducts(selectedCantinaId);
    }
  }

  useEffect(() => {
  const timeout = setTimeout(() => {
    void syncOfflineSales();
  }, 0);

  window.addEventListener("online", syncOfflineSales);

  return () => {
    clearTimeout(timeout);
    window.removeEventListener("online", syncOfflineSales);
  };
}, [selectedCantinaId]);

  async function loadSalesReport(pageValue = 1) {
    const params = new URLSearchParams();

    params.set("page", String(pageValue));

    if (reportStart) params.set("start", reportStart);
    if (reportEnd) params.set("end", reportEnd);
    if (selectedCantinaId) params.set("cantinaId", selectedCantinaId);

    const res = await fetch(`/api/vendas/history?${params.toString()}`);
    const data = await res.json();

    if (res.ok) {
      setReportSales(data.sales || []);
      setReportPage(data.page || 1);
      setReportTotalPages(data.totalPages || 1);
    }
  }

  function finishWithoutInvoice() {
    cancelSale();
    setLastSaleId(null);
    setMessage(t("saleFinishedWithoutInvoice"));
  }

  function emitInvoice() {
  if (!lastSaleId) {
    alert(t("saleNotFoundForInvoice"));
    return;
  }

  router.push(`/facturas/${lastSaleId}`);
}

  return (
    <div className="min-h-screen lg:h-screen overflow-auto lg:overflow-hidden bg-[#F4F7FA] p-3">
      <div className="min-h-full lg:h-full grid grid-rows-[auto_1fr] gap-3">
        <div className="bg-white rounded-[18px] px-4 py-2 shadow-sm border border-slate-100 flex flex-col gap-2 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-[14px] bg-[#123A5C]/10 flex items-center justify-center">
              <Store className="text-[#123A5C]" size={22} />
            </div>

            <div>
              <h1 className="text-lg font-bold text-slate-800">
                {t("salesManagement")}
              </h1>
              <p className="text-[11px] text-slate-500">
                {t("posConnectedToStock")}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {role === "ADMIN" && (
              <select
                value={selectedCantinaId}
                onChange={(e) => {
                  const id = e.target.value;
                  setSelectedCantinaId(id);
                  cancelSale();
                  setSearch("");
                  setBarcode("");
                  void loadProducts(id);
                }}
                className="h-9 rounded-[12px] border px-3 text-xs text-[#123A5C] font-semibold bg-white"
              >
                <option value="">{t("chooseCantina")}</option>
                {cantinas.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} — {c.code}
                  </option>
                ))}
              </select>
            )}

            {cantina && (
              <div className="h-9 rounded-[12px] bg-[#123A5C] text-white px-3 flex flex-col justify-center">
                <p className="text-xs font-bold leading-tight">
                  {cantina.name}
                </p>
                <p className="text-[10px] text-white/70 leading-tight">
                  Código {cantina.code}
                </p>
              </div>
            )}

            <button
              onClick={cancelSale}
              className="h-9 rounded-[12px] bg-green-600 px-4 text-white text-xs font-bold flex items-center gap-2 hover:bg-green-700"
            >
              <Plus size={15} />
              {t("newSale")}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-[1fr_380px] gap-3 min-h-0">
          <section className="min-h-0 grid grid-rows-[auto_1fr_auto] gap-3">
            <div className="bg-white rounded-[18px] p-2 shadow-sm border border-slate-100">
              <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto_auto] gap-2">
                <div className="relative">
                  <Barcode
                    size={15}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    value={barcode}
                    onChange={(e) => setBarcode(e.target.value)}
                    onKeyDown={handleBarcodeEnter}
                    placeholder={t("codeOrBarcode")}
                    className="h-9 w-full rounded-[12px] border pl-9 pr-3 text-xs font-semibold"
                  />
                </div>

                <div className="relative">
                  <Search
                    size={15}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder={t("searchProduct")}
                    className="h-9 w-full rounded-[12px] border pl-9 pr-3 text-xs font-semibold"
                  />

                  {search.trim() && filteredProducts.length > 0 && (
                    <div className="absolute left-0 right-0 top-10 z-50 rounded-[14px] border bg-white shadow-xl max-h-72 overflow-auto">
                      {filteredProducts.map((stock) => (
                        <button
                          key={stock.id}
                          onClick={() => addToCart(stock)}
                          className="w-full px-4 py-3 text-left hover:bg-slate-50 border-b last:border-b-0"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <p className="text-sm font-bold text-slate-800">
                                {stock.product.name}
                              </p>
                              <p className="text-xs text-slate-500">
                                {stock.product.internalCode} · Stock:{" "}
                                {stock.quantity}
                              </p>
                            </div>

                            <p className="text-sm font-bold text-[#123A5C]">
                              {formatMoney(stock.product.salePrice)}
                            </p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {role === "ADMIN" && (
                  <button
                    onClick={() => router.push("/Dashboard")}
                    className="h-9 rounded-[12px] border px-3 text-xs font-bold flex items-center justify-center gap-2 bg-white text-[#123A5C] hover:bg-slate-50"
                  >
                    <ArrowLeft size={14} />
                    {t("back")}
                  </button>
                )}

                <button
                  onClick={() => {
                    setReportOpen(true);
                    void loadSalesReport(1);
                  }}
                  className="h-9 rounded-[12px] bg-[#123A5C] px-3 text-white text-xs font-bold flex items-center justify-center gap-2"
                >
                  <FileText size={14} />
                  {t("report")}
                </button>
              </div>
            </div>

            <div className="bg-white rounded-[18px] shadow-sm border border-slate-100 overflow-hidden min-h-[420px] lg:min-h-0 flex flex-col">
              <div className="px-4 py-2 bg-[#123A5C] text-white flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShoppingCart size={17} />
                  <h2 className="font-bold text-sm">{t("currentSale")}</h2>
                </div>

                <p className="text-xs text-white/80">
                  {t("items")}: <strong>{totalItems}</strong>
                </p>
              </div>

              {(error || message) && (
                <div className="px-4 pt-3">
                  {error && (
                    <div className="rounded-[12px] bg-red-50 border border-red-100 px-3 py-2 text-xs text-red-600">
                      {error}
                    </div>
                  )}

                  {message && (
                    <div className="rounded-[12px] bg-green-50 border border-green-100 px-3 py-2 text-xs text-green-700 flex items-center gap-2">
                      <CheckCircle2 size={15} />
                      {message}
                    </div>
                  )}
                </div>
              )}

              <div className="flex-1 overflow-auto">
                <table className="w-full min-w-[720px] text-sm">
                  <thead className="bg-slate-50 text-slate-500 sticky top-0">
                    <tr>
                      <th className="px-4 py-3 text-left">{t("product")}</th>
                      <th className="px-4 py-3 text-right">{t("price")}</th>
                      <th className="px-4 py-3 text-center">{t("quantity")}</th>
                      <th className="px-4 py-3 text-right">{t("total")}</th>
                      <th className="px-4 py-3"></th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {cart.length === 0 ? (
                      <tr>
                        <td
                          colSpan={5}
                          className="py-24 text-center text-slate-500"
                        >
                          {t("noItemsAdded")}
                        </td>
                      </tr>
                    ) : (
                      cart.map((item) => (
                        <tr key={item.productId} className="hover:bg-slate-50">
                          <td className="px-4 py-3">
                            <p className="font-semibold text-slate-800">
                              {item.name}
                            </p>
                            <p className="text-xs text-slate-500">
                              {item.code}
                            </p>
                          </td>

                          <td className="px-4 py-3 text-right">
                            {formatMoney(item.price)}
                          </td>

                          <td className="px-4 py-3">
                            <div className="flex justify-center items-center gap-2">
                              <button
                                onClick={() => decreaseQuantity(item.productId)}
                                className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center"
                              >
                                <Minus size={14} />
                              </button>

                              <span className="w-8 text-center font-bold">
                                {item.quantity}
                              </span>

                              <button
                                onClick={() => increaseQuantity(item.productId)}
                                className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center"
                              >
                                <Plus size={14} />
                              </button>
                            </div>
                          </td>

                          <td className="px-4 py-3 text-right font-bold text-[#123A5C]">
                            {formatMoney(item.quantity * item.price)}
                          </td>

                          <td className="px-4 py-3 text-right">
                            <button
                              onClick={() => removeFromCart(item.productId)}
                              className="text-red-600 p-2 hover:bg-red-50 rounded-xl"
                            >
                              <Trash2 size={16} />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              <div className="border-t bg-slate-50 px-4 py-3 flex justify-between items-center">
                <p className="text-sm text-slate-500">
                  {t("subtotal")}: <strong>{formatMoney(subtotal)}</strong>
                </p>

                <p className="text-2xl font-black text-[#123A5C]">
                  {formatMoney(total)}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <button
                onClick={openPayment}
                disabled={cart.length === 0}
                className="bg-green-600 text-white rounded-[16px] px-4 py-4 font-bold flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <ArrowRight size={20} />
                {t("continueSale")}
              </button>

              <button
                onClick={() => {
                  if (cart.length > 0) {
                    removeFromCart(cart[cart.length - 1].productId);
                  }
                }}
                className="bg-yellow-300 text-black rounded-[16px] px-4 py-4 font-bold flex items-center justify-center"
              >
                {t("removeItem")}
              </button>

              <button
                onClick={cancelSale}
                className="bg-red-500 text-white rounded-[16px] px-4 py-4 font-bold flex items-center justify-center gap-2"
              >
                <XCircle size={18} />
                {t("cancel")}
              </button>
            </div>
          </section>

          <aside className="min-h-0 bg-white rounded-[18px] shadow-sm border border-slate-100 overflow-hidden flex flex-col">
            <div className="bg-[#123A5C] text-white px-4 py-3">
              <h2 className="font-bold text-base">{t("saleSummary")}</h2>
              <p className="text-[11px] text-white/70">
                {t("totalDiscountCustomer")}
              </p>
            </div>

            <div className="p-4 flex-1 grid grid-rows-[auto_auto_auto_1fr] gap-3">
              <div className="rounded-[18px] bg-green-50 border border-green-100 p-4 text-center">
                <p className="text-xs text-green-700 font-semibold">{t("total")}</p>
                <p className="text-3xl font-black text-green-700">
                  {formatMoney(total)}
                </p>
              </div>

              <div>
                <label className="text-xs text-slate-500">{t("discount")}</label>
                <input
                  value={discount}
                  onChange={(e) => setDiscount(e.target.value)}
                  className="mt-1 h-11 w-full rounded-[14px] border px-3 text-right text-sm font-bold"
                  placeholder="0"
                />
              </div>

              <div>
                <label className="text-xs text-slate-500">
                  {t("customerName")}
                </label>
                <input
                  placeholder={t("customerName")}
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="mt-1 h-11 w-full border rounded-[14px] px-3 text-sm"
                />
              </div>

              <div className="rounded-[18px] bg-slate-50 border p-4">
                <p className="text-sm text-slate-500">{t("items")}</p>
                <p className="text-2xl font-black text-[#123A5C]">
                  {totalItems}
                </p>

                <p className="text-sm text-slate-500 mt-4">{t("subtotal")}</p>
                <p className="text-xl font-bold text-slate-800">
                  {formatMoney(subtotal)}
                </p>
              </div>
            </div>
          </aside>
        </div>
      </div>

      {paymentStep === "method" && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-6">
          <div className="bg-white rounded-[24px] shadow-xl w-full max-w-3xl p-6">
            <h2 className="text-2xl font-bold text-slate-800">
              {t("choosePaymentMethod")}
            </h2>

            <p className="text-slate-500 mt-1">
              {t("saleTotal")}: <strong>{formatMoney(total)}</strong>
            </p>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
              <PaymentButton
                title={t("cash")}

                icon={<Banknote size={28} />}
                onClick={() => {
                  setPaymentMethod("CASH");
                  setPaymentStep("cash");
                }}
              />

              <PaymentButton
                title={t("card")}
                icon={<CreditCard size={28} />}
                onClick={() => {
                  setPaymentMethod("CARD");
                  setPaidAmount(String(total));
                  void submitSale("CARD");
                }}
              />

              <PaymentButton
                title={t("mobileMoney")}
                icon={<Smartphone size={28} />}
                onClick={() => {
                  setPaymentMethod("MOBILE_MONEY");
                  setPaidAmount(String(total));
                  void submitSale("MOBILE_MONEY");
                }}
              />

              <PaymentButton
                title={t("transfer")}
                icon={<ReceiptText size={28} />}
                onClick={() => {
                  setPaymentMethod("TRANSFER");
                  setPaidAmount(String(total));
                  void submitSale("TRANSFER");
                }}
              />
            </div>

            <div className="flex justify-end mt-6">
              <button
                onClick={() => setPaymentStep("none")}
                className="px-5 py-3 rounded-[16px] border font-semibold"
              >
                {t("back")}
              </button>
            </div>
          </div>
        </div>
      )}

      {paymentStep === "cash" && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-6">
          <div className="bg-white rounded-[24px] shadow-xl w-full max-w-4xl p-6">
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-2xl font-bold text-slate-800">
                  {t("cashPayment")}
                </h2>
                <p className="text-slate-500 mt-1">
                  {t("enterReceivedAmount")}
                </p>
              </div>

              <div className="text-right">
                <p className="text-sm text-slate-500">{t("total")}</p>
                <p className="text-3xl font-black text-green-700">
                  {formatMoney(total)}
                </p>
              </div>
            </div>

            {error && (
              <div className="mt-4 rounded-[14px] bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-600">
                {error}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-[1fr_300px] gap-6 mt-6">
              <div className="space-y-4">
                <div>
                  <label className="text-sm text-slate-500">
                    {t("customerPays")}
                  </label>
                  <input
                    value={paidAmount}
                    onChange={(e) => setPaidAmount(e.target.value)}
                    className="mt-1 h-14 w-full rounded-[16px] border px-4 text-right text-2xl font-black"
                    placeholder="0"
                  />
                </div>

                <div>
                  <label className="text-sm text-slate-500">{t("change")}</label>
                  <div
                    className={`mt-1 h-14 w-full rounded-[16px] border px-4 flex items-center justify-end text-2xl font-black ${
                      change < 0 ? "text-red-600" : "text-green-700"
                    }`}
                  >
                    {formatMoney(change)}
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setPaymentStep("method")}
                    className="px-5 py-3 rounded-[16px] border font-semibold"
                  >
                    {t("back")}
                  </button>

                  <button
                    onClick={() => submitSale("CASH")}
                    disabled={selling}
                    className="flex-1 px-5 py-3 rounded-[16px] bg-green-600 text-white font-bold disabled:opacity-50"
                  >
                    {selling ? t("validating") : t("validatePayment")}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                {["1", "2", "3", "4", "5", "6", "7", "8", "9", ".", "0"].map(
                  (key) => (
                    <button
                      key={key}
                      onClick={() => addNumber(key)}
                      className="h-16 rounded-[16px] bg-slate-100 font-bold text-2xl hover:bg-slate-200"
                    >
                      {key}
                    </button>
                  )
                )}

                <button
                  onClick={() => setPaidAmount("")}
                  className="h-16 rounded-[16px] bg-red-50 text-red-600 font-bold text-xl"
                >
                  C
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {paymentStep === "invoice" && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-6">
          <div className="bg-white rounded-[24px] shadow-xl w-full max-w-xl p-6 text-center">
            <div className="mx-auto w-16 h-16 rounded-full bg-green-50 flex items-center justify-center mb-4">
              <CheckCircle2 className="text-green-600" size={34} />
            </div>

            <h2 className="text-2xl font-bold text-slate-800">
              {t("saleCompleted")}
            </h2>

            <p className="text-slate-500 mt-2">
              {t("doYouWantToEmitInvoice")}
            </p>

            <div className="grid grid-cols-2 gap-3 mt-6">
              <button
                onClick={finishWithoutInvoice}
                className="px-5 py-4 rounded-[16px] border font-semibold"
              >
                {t("doNotEmit")}
              </button>

              <button
                onClick={emitInvoice}
                className="px-5 py-4 rounded-[16px] bg-[#123A5C] text-white font-bold flex items-center justify-center gap-2"
              >
                <Printer size={18} />
                {t("emitInvoice")}
              </button>
            </div>
          </div>
        </div>
      )}

      {reportOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-6">
          <div className="bg-white rounded-[24px] shadow-xl w-full max-w-5xl p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-slate-800">
                {t("salesHistory")}
              </h2>

              <button
                onClick={() => setReportOpen(false)}
                className="rounded-xl px-4 py-2 border"
              >
                {t("close")}
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-5">
              <input
                type="date"
                value={reportStart}
                onChange={(e) => setReportStart(e.target.value)}
                className="border rounded-[14px] px-4 py-3 text-sm"
              />

              <input
                type="date"
                value={reportEnd}
                onChange={(e) => setReportEnd(e.target.value)}
                className="border rounded-[14px] px-4 py-3 text-sm"
              />

              <button
                onClick={() => loadSalesReport(1)}
                className="rounded-[14px] bg-[#123A5C] text-white font-bold"
              >
                {t("search")}
              </button>
            </div>

            <div className="mt-5 border rounded-[18px] overflow-hidden">
              <table className="w-full min-w-[800px] text-sm">
                <thead className="bg-slate-50 text-slate-500">
                  <tr>
                    <th className="px-4 py-3 text-left">{t("date")}</th>
                    <th className="px-4 py-3 text-left">{t("saleNumber")}</th>
                    <th className="px-4 py-3 text-left">{t("payment")}</th>
                    <th className="px-4 py-3 text-right">{t("total")}</th>
                    <th className="px-4 py-3 text-center">{t("items")}</th>
                     <th className="px-4 py-3 text-center">{t("details")}</th>
                  </tr>
                </thead>

                <tbody className="divide-y">
                  {reportSales.length === 0 ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="py-10 text-center text-slate-500"
                      >
                        {t("noSalesFound")}
                      </td>
                    </tr>
                  ) : (
                    reportSales.map((sale) => (
                      <tr key={sale.id}>
                        <td className="px-4 py-3">
                          {new Date(sale.createdAt).toLocaleString("pt-PT")}
                        </td>
                        <td className="px-4 py-3">{sale.saleNumber}</td>
                        <td className="px-4 py-3">{sale.paymentMethod}</td>
                        <td className="px-4 py-3 text-right font-bold">
                          {formatMoney(sale.totalAmount)}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {sale.items?.length || 0}
                        </td>
                        <td className="px-4 py-3 text-center">
                        <button
                          type="button"
                          onClick={() => router.push(`/facturas/${sale.id}`)}
                          className="rounded-xl bg-[#123A5C] px-3 py-2 text-xs font-semibold text-white hover:bg-[#0B2540]"
                        >
                          {t("view")}
                        </button>
                      </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex justify-between items-center mt-4">
              <p className="text-sm text-slate-500">
                {t("page")} {reportPage} {t("of")} {reportTotalPages}
              </p>

              <div className="flex gap-2">
                <button
                  disabled={reportPage === 1}
                  onClick={() => loadSalesReport(reportPage - 1)}
                  className="px-4 py-2 rounded-xl border disabled:opacity-40"
                >
                  {t("previous")}
                </button>

                <button
                  disabled={reportPage === reportTotalPages}
                  onClick={() => loadSalesReport(reportPage + 1)}
                  className="px-4 py-2 rounded-xl border disabled:opacity-40"
                >
                  {t("next")}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function PaymentButton({
  title,
  icon,
  onClick,
}: {
  title: string;
  icon: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="rounded-[20px] border border-slate-100 bg-slate-50 p-6 text-[#123A5C] hover:border-[#123A5C] hover:bg-white transition flex flex-col items-center justify-center gap-3"
    >
      {icon}
      <span className="font-bold">{title}</span>
    </button>
  );
}