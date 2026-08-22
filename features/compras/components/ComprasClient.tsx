"use client";

import { useI18n } from "@/lib/i18n";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useCallback } from "react";
import {
  ShoppingCart,
  Plus,
  PackageSearch,
  Search,
  Trash2,
  Eye,
  X,
  ChevronLeft,
  ChevronRight,
  FileText,
  CheckCircle2,
  Clock,
  Pencil,
  RefreshCcw,
  PackagePlus,
} from "lucide-react";

type Supplier = { id: string; name: string };

type Product = {
  id: string;
  name: string;
  internalCode: string;
  barcode: string | null;
  purchasePrice: string;
  salePrice: string;
  centralStock?: { quantity: number; avgCost: string } | null;
};

type PurchaseItem = {
  id: string;
  quantity: number;
  unitCost: string;
  totalCost: string;
  product: Product;
};

type Purchase = {
  id: string;
  purchaseNumber: string;
  invoiceNumber: string | null;
  purchaseDate: string;
  subtotal: string;
  transportCost: string;
  otherCosts: string;
  totalAmount: string;
  status: "PENDING" | "RECEIVED" | "CANCELLED";
  notes: string | null;
  supplier?: Supplier | null;
  items: PurchaseItem[];
};

type PurchaseLine = {
  productId: string;
  productName: string;
  internalCode: string;
  quantity: string;
  unitCost: string;
};

const ITEMS_PER_PAGE = 5;
const LINES_PER_PAGE = 5;

export default function ComprasClient() {
  const { t, lang } = useI18n();
  const router = useRouter();

  const [currency, setCurrency] = useState("EUR");

  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [search, setSearch] = useState("");
  const [productSearch, setProductSearch] = useState("");

  const [page, setPage] = useState(1);
  const [linePage, setLinePage] = useState(1);

  const [createOpen, setCreateOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState<Purchase | null>(null);
  const [editingPurchase, setEditingPurchase] = useState<Purchase | null>(null);
  const [deletingPurchase, setDeletingPurchase] = useState<Purchase | null>(null);
  const [statusPurchase, setStatusPurchase] = useState<Purchase | null>(null);

  const [newStatus, setNewStatus] = useState<"PENDING" | "RECEIVED" | "CANCELLED">("PENDING");

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [form, setForm] = useState({
    supplierId: "",
    invoiceNumber: "",
    purchaseDate: new Date().toISOString().slice(0, 10),
    transportCost: "",
    otherCosts: "",
    notes: "",
    status: "RECEIVED",
  });

  const [lines, setLines] = useState<PurchaseLine[]>([]);

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

  async function loadPurchases() {
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/compras");
      const data = await res.json();

      if (!res.ok) {
        setError(data.message || t("purchaseLoadError"));
        return;
      }

      setPurchases(data.purchases || []);
      setSuppliers(data.suppliers || []);
      setProducts(data.products || []);
    } catch {
      setError(t("purchaseLoadError"));
    } finally {
      setLoading(false);
    }
  }

 useEffect(() => {
  const timeout = setTimeout(() => {
    void loadPurchases();
    void loadCompanyCurrency();
  }, 0);

  return () => clearTimeout(timeout);
}, []);

  const filteredPurchases = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return purchases;

    return purchases.filter((purchase) => {
      return (
        purchase.purchaseNumber.toLowerCase().includes(q) ||
        (purchase.invoiceNumber || "").toLowerCase().includes(q) ||
        (purchase.supplier?.name || "").toLowerCase().includes(q)
      );
    });
  }, [purchases, search]);

  const totalPages = Math.max(1, Math.ceil(filteredPurchases.length / ITEMS_PER_PAGE));
  const paginatedPurchases = filteredPurchases.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  const filteredProducts = useMemo(() => {
    const q = productSearch.toLowerCase().trim();
    if (!q) return [];

    return products.filter((product) => {
      return (
        product.name.toLowerCase().includes(q) ||
        product.internalCode.toLowerCase().includes(q) ||
        (product.barcode || "").toLowerCase().includes(q)
      );
    });
  }, [products, productSearch]);

  const lineTotalPages = Math.max(1, Math.ceil(lines.length / LINES_PER_PAGE));
  const paginatedLines = lines.slice((linePage - 1) * LINES_PER_PAGE, linePage * LINES_PER_PAGE);

  const subtotal = lines.reduce(
    (sum, line) => sum + Number(line.quantity || 0) * Number(line.unitCost || 0),
    0
  );

  const transportCost = Number(form.transportCost || 0);
  const otherCosts = Number(form.otherCosts || 0);
  const totalAmount = subtotal + transportCost + otherCosts;

  const stats = useMemo(() => {
    const total = purchases.length;
    const received = purchases.filter((p) => p.status === "RECEIVED").length;
    const pending = purchases.filter((p) => p.status === "PENDING").length;
    const totalValue = purchases.reduce((sum, purchase) => sum + Number(purchase.totalAmount || 0), 0);

    return { total, received, pending, totalValue };
  }, [purchases]);

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

  function resetForm() {
    setForm({
      supplierId: "",
      invoiceNumber: "",
      purchaseDate: new Date().toISOString().slice(0, 10),
      transportCost: "",
      otherCosts: "",
      notes: "",
      status: "RECEIVED",
    });

    setLines([]);
    setProductSearch("");
    setLinePage(1);
  }

  function addProduct(product: Product) {
    setError("");

    setLines((prev) => {
      const exists = prev.find((line) => line.productId === product.id);

      if (exists) {
        return prev.map((line) =>
          line.productId === product.id
            ? { ...line, quantity: String(Number(line.quantity || 0) + 1) }
            : line
        );
      }

      return [
        ...prev,
        {
          productId: product.id,
          productName: product.name,
          internalCode: product.internalCode,
          quantity: "1",
          unitCost: String(product.purchasePrice || 0),
        },
      ];
    });

    setProductSearch("");
  }

  function updateLine(productId: string, field: "quantity" | "unitCost", value: string) {
    setLines((prev) =>
      prev.map((line) => (line.productId === productId ? { ...line, [field]: value } : line))
    );
  }

  function removeLine(productId: string) {
    setLines((prev) => prev.filter((line) => line.productId !== productId));
  }

  async function createPurchase(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setSaving(true);
    setError("");
    setMessage("");

    if (lines.length === 0) {
      setError(t("addAtLeastOneProduct"));
      setSaving(false);
      return;
    }

    try {
      const res = await fetch("/api/compras", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          receiveNow: form.status === "RECEIVED",
          items: lines.map((line) => ({
            productId: line.productId,
            quantity: Number(line.quantity || 0),
            unitCost: Number(line.unitCost || 0),
          })),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || t("purchaseCreateError"));
        return;
      }

      setMessage(t("purchaseCreated"));
      setCreateOpen(false);
      resetForm();
      await loadPurchases();
    } catch {
      setError(t("purchaseCreateError"));
    } finally {
      setSaving(false);
    }
  }

  function openEditPurchase(purchase: Purchase) {
    setEditingPurchase(purchase);

    setForm({
      supplierId: purchase.supplier?.id || "",
      invoiceNumber: purchase.invoiceNumber || "",
      purchaseDate: purchase.purchaseDate.slice(0, 10),
      transportCost: String(purchase.transportCost || ""),
      otherCosts: String(purchase.otherCosts || ""),
      notes: purchase.notes || "",
      status: purchase.status,
    });
  }

  async function updatePurchase(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!editingPurchase) return;

    setSaving(true);
    setError("");
    setMessage("");

    try {
      const res = await fetch(`/api/compras/${editingPurchase.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          invoiceNumber: form.invoiceNumber,
          notes: form.notes,
          status: form.status,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || t("purchaseUpdateError"));
        return;
      }

      setMessage(data.message || t("purchaseUpdated"));
      setEditingPurchase(null);
      resetForm();
      await loadPurchases();
    } catch {
      setError(t("purchaseUpdateError"));
    } finally {
      setSaving(false);
    }
  }

  async function deletePurchase() {
    if (!deletingPurchase) return;

    setSaving(true);
    setError("");
    setMessage("");

    try {
      const res = await fetch(`/api/compras/${deletingPurchase.id}`, {
        method: "DELETE",
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || t("purchaseDeleteError"));
        return;
      }

      setMessage(data.message || t("purchaseDeleted"));
      setDeletingPurchase(null);
      await loadPurchases();
    } catch {
      setError(t("purchaseDeleteError"));
    } finally {
      setSaving(false);
    }
  }

  async function updatePurchaseStatus() {
    if (!statusPurchase) return;

    setSaving(true);
    setError("");
    setMessage("");

    try {
      const res = await fetch(`/api/compras/${statusPurchase.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || t("statusUpdateError"));
        return;
      }

      setMessage(data.message || t("statusUpdated"));
      setStatusPurchase(null);
      await loadPurchases();
    } catch {
      setError(t("statusUpdateError"));
    } finally {
      setSaving(false);
    }
  }

  function statusLabel(status: Purchase["status"]) {
    if (status === "RECEIVED") return t("received");
    if (status === "PENDING") return t("pending");
    return t("cancelled");
  }

  function statusClass(status: Purchase["status"]) {
    if (status === "RECEIVED") return "bg-green-50 text-green-700";
    if (status === "PENDING") return "bg-yellow-50 text-yellow-700";
    return "bg-red-50 text-red-600";
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">
            {t("purchaseManagement")}
          </h1>
          <p className="text-sm text-slate-500">
            {t("purchaseManagementDescription")}
          </p>
        </div>

        <button
          onClick={() => router.push("/stock?tab=purchase")}
          className="rounded-[16px] bg-[#123A5C] px-5 py-3 text-white font-semibold flex items-center gap-2 hover:bg-[#0B2540]"
        >
          <Plus size={19} />
          {t("newPurchase")}
        </button>
      </div>

      {(error || message) && (
        <div
          className={`rounded-[16px] px-4 py-3 text-sm ${
            error ? "bg-red-50 text-red-600" : "bg-green-50 text-green-700"
          }`}
        >
          {error || message}
        </div>
      )}

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
        <StatCard title={t("purchases")} value={stats.total} icon={<ShoppingCart size={20} />} />
        <StatCard title={t("receivedPlural")} value={stats.received} icon={<CheckCircle2 size={20} />} />
        <StatCard title={t("pendingPlural")} value={stats.pending} icon={<Clock size={20} />} />
        <StatCard title={t("totalValue")} value={formatMoney(stats.totalValue)} icon={<FileText size={20} />} />
      </div>

      <div className="bg-white rounded-[22px] shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-4 border-b border-slate-100">
          <div className="relative max-w-xl">
            <Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />

            <input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder={t("searchPurchase")}
              className="w-full rounded-[14px] border pl-10 pr-4 py-3 text-sm"
            />
          </div>
        </div>

        {loading ? (
          <div className="p-10 text-center text-slate-500">{t("loadingPurchases")}</div>
        ) : paginatedPurchases.length === 0 ? (
          <div className="p-10 text-center text-slate-500">{t("noPurchases")}</div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-left text-sm">
                <thead className="bg-slate-50 text-slate-500">
                  <tr>
                    <th className="px-5 py-3">{t("purchase")}</th>
                    <th className="px-5 py-3">{t("supplier")}</th>
                    <th className="px-5 py-3">{t("date")}</th>
                    <th className="px-5 py-3">{t("items")}</th>
                    <th className="px-5 py-3">{t("total")}</th>
                    <th className="px-5 py-3">{t("status")}</th>
                    <th className="px-5 py-3 text-right">{t("actions")}</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {paginatedPurchases.map((purchase) => (
                    <tr key={purchase.id} className="hover:bg-slate-50">
                      <td className="px-5 py-3">
                        <p className="font-semibold text-slate-800">{purchase.purchaseNumber}</p>
                        <p className="text-xs text-slate-500">
                          {t("invoice")}: {purchase.invoiceNumber || "-"}
                        </p>
                      </td>

                      <td className="px-5 py-3">{purchase.supplier?.name || "-"}</td>
                      <td className="px-5 py-3">{purchase.purchaseDate.slice(0, 10)}</td>
                      <td className="px-5 py-3">{purchase.items.length}</td>
                      <td className="px-5 py-3 font-bold text-[#123A5C]">{formatMoney(purchase.totalAmount)}</td>

                      <td className="px-5 py-3">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${statusClass(purchase.status)}`}>
                          {statusLabel(purchase.status)}
                        </span>
                      </td>

                      <td className="px-5 py-3">
                        <div className="flex justify-end gap-2">
                          <button onClick={() => setDetailsOpen(purchase)} className="p-2 rounded-xl hover:bg-slate-100 text-slate-600" title={t("viewDetails")}>
                            <Eye size={18} />
                          </button>

                          <button onClick={() => openEditPurchase(purchase)} disabled={purchase.status === "RECEIVED"} className="p-2 rounded-xl hover:bg-blue-50 text-blue-600 disabled:opacity-30" title={t("editPurchase")}>
                            <Pencil size={18} />
                          </button>

                          <button
                            onClick={() => {
                              setStatusPurchase(purchase);
                              setNewStatus(purchase.status);
                            }}
                            disabled={purchase.status === "RECEIVED"}
                            className="p-2 rounded-xl hover:bg-yellow-50 text-yellow-600 disabled:opacity-30"
                            title={t("changeStatus")}
                          >
                            <RefreshCcw size={18} />
                          </button>

                          <button onClick={() => setDeletingPurchase(purchase)} disabled={purchase.status === "RECEIVED"} className="p-2 rounded-xl hover:bg-red-50 text-red-600 disabled:opacity-30" title={t("deletePurchase")}>
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <Pagination page={page} totalPages={totalPages} t={t} onPrev={() => setPage((p) => Math.max(1, p - 1))} onNext={() => setPage((p) => Math.min(totalPages, p + 1))} />
          </>
        )}
      </div>

      {createOpen && (
        <div className="fixed left-[200px] top-[110px] right-0 bottom-0 z-40 bg-[#F4F7FA] p-5 overflow-hidden">
          <div className="h-full bg-white rounded-[24px] shadow-xl flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <div>
                <h2 className="text-2xl font-bold text-slate-800">{t("newPurchase")}</h2>
                <p className="text-sm text-slate-500">{t("newPurchaseDescription")}</p>
              </div>

              <button
                onClick={() => {
                  setCreateOpen(false);
                  resetForm();
                }}
                className="p-2 rounded-xl hover:bg-slate-100"
              >
                <X size={24} />
              </button>
            </div>

            <form onSubmit={createPurchase} className="flex-1 p-5 grid grid-cols-1 xl:grid-cols-[360px_1fr] gap-5 overflow-hidden">
              <div className="bg-slate-50 rounded-[22px] p-4 space-y-3 overflow-auto">
                <select value={form.supplierId} onChange={(e) => setForm({ ...form, supplierId: e.target.value })} className="w-full border rounded-[14px] px-4 py-3 text-sm">
                  <option value="">{t("supplier")}</option>
                  {suppliers.map((supplier) => (
                    <option key={supplier.id} value={supplier.id}>{supplier.name}</option>
                  ))}
                </select>

                <input value={form.invoiceNumber} onChange={(e) => setForm({ ...form, invoiceNumber: e.target.value })} placeholder={t("invoiceNumber")} className="w-full border rounded-[14px] px-4 py-3 text-sm" />

                <input type="date" value={form.purchaseDate} onChange={(e) => setForm({ ...form, purchaseDate: e.target.value })} className="w-full border rounded-[14px] px-4 py-3 text-sm" />

                <input type="number" value={form.transportCost} onChange={(e) => setForm({ ...form, transportCost: e.target.value })} placeholder={t("transportCost")} className="w-full border rounded-[14px] px-4 py-3 text-sm" />

                <input type="number" value={form.otherCosts} onChange={(e) => setForm({ ...form, otherCosts: e.target.value })} placeholder={t("otherCosts")} className="w-full border rounded-[14px] px-4 py-3 text-sm" />

                <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="w-full border rounded-[14px] px-4 py-3 text-sm">
                  <option value="RECEIVED">{t("receivedNow")}</option>
                  <option value="PENDING">{t("pending")}</option>
                </select>

                <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder={t("notes")} className="w-full border rounded-[14px] px-4 py-3 text-sm min-h-[90px]" />

                <div className="rounded-[18px] bg-white border p-4">
                  <p className="text-sm text-slate-500">{t("subtotal")}</p>
                  <p className="text-xl font-bold text-slate-800">{formatMoney(subtotal)}</p>

                  <p className="text-sm text-slate-500 mt-3">{t("total")}</p>
                  <p className="text-2xl font-black text-[#123A5C]">{formatMoney(totalAmount)}</p>
                </div>

                <button disabled={saving} className="w-full rounded-[16px] bg-[#123A5C] px-5 py-3 text-white font-bold disabled:opacity-50">
                  {saving ? t("registering") : t("registerPurchase")}
                </button>
              </div>

              <div className="min-h-0 flex flex-col gap-4">
                <div className="relative">
                  <PackageSearch size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />

                  <input value={productSearch} onChange={(e) => setProductSearch(e.target.value)} placeholder={t("searchProductNameCodeBarcode")} className="w-full border rounded-[14px] pl-10 pr-4 py-3 text-sm" />

                  {productSearch.trim() && filteredProducts.length > 0 && (
                    <div className="absolute left-0 right-0 top-12 z-50 rounded-[18px] bg-white border shadow-xl max-h-72 overflow-auto">
                      {filteredProducts.map((product) => (
                        <button key={product.id} type="button" onClick={() => addProduct(product)} className="w-full px-4 py-3 text-left border-b last:border-b-0 hover:bg-slate-50">
                          <div className="flex justify-between gap-3">
                            <div>
                              <p className="font-bold text-slate-800">{product.name}</p>
                              <p className="text-xs text-slate-500">
                                {product.internalCode} · {t("currentStock")}: {product.centralStock?.quantity || 0}
                              </p>
                            </div>

                            <p className="font-bold text-[#123A5C]">{formatMoney(product.purchasePrice)}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex-1 overflow-auto border rounded-[20px]">
                  <table className="w-full min-w-[800px] text-sm">
                    <thead className="bg-slate-50 text-slate-500">
                      <tr>
                        <th className="px-4 py-3 text-left">{t("product")}</th>
                        <th className="px-4 py-3">{t("qty")}</th>
                        <th className="px-4 py-3">{t("unitCost")}</th>
                        <th className="px-4 py-3">{t("total")}</th>
                        <th className="px-4 py-3"></th>
                      </tr>
                    </thead>

                    <tbody className="divide-y">
                      {paginatedLines.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="py-16">
                            <div className="flex flex-col items-center justify-center gap-3 text-slate-500">
                              <div className="animate-pulse rounded-full bg-[#123A5C]/10 p-6 scale-[0.35] origin-center">
                                <PackagePlus size={100} className="text-[#123A5C]" />
                              </div>
                              <p>{t("noProductAdded")}</p>
                              <p className="text-xs">{t("searchProductToAdd")}</p>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        paginatedLines.map((line) => (
                          <tr key={line.productId}>
                            <td className="px-4 py-3">
                              <p className="font-semibold text-slate-800">{line.productName}</p>
                              <p className="text-xs text-slate-500">{line.internalCode}</p>
                            </td>

                            <td className="px-4 py-3">
                              <input type="number" value={line.quantity} onChange={(e) => updateLine(line.productId, "quantity", e.target.value)} className="w-24 border rounded-[12px] px-3 py-2" />
                            </td>

                            <td className="px-4 py-3">
                              <input type="number" value={line.unitCost} onChange={(e) => updateLine(line.productId, "unitCost", e.target.value)} className="w-32 border rounded-[12px] px-3 py-2" />
                            </td>

                            <td className="px-4 py-3 font-bold text-[#123A5C]">
                              {formatMoney(Number(line.quantity || 0) * Number(line.unitCost || 0))}
                            </td>

                            <td className="px-4 py-3 text-right">
                              <button type="button" onClick={() => removeLine(line.productId)} className="p-2 rounded-xl hover:bg-red-50 text-red-600">
                                <Trash2 size={17} />
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                <Pagination page={linePage} totalPages={lineTotalPages} t={t} onPrev={() => setLinePage((p) => Math.max(1, p - 1))} onNext={() => setLinePage((p) => Math.min(lineTotalPages, p + 1))} />
              </div>
            </form>
          </div>
        </div>
      )}

      {editingPurchase && (
        <Modal title={t("editPurchase")} onClose={() => setEditingPurchase(null)}>
          <form onSubmit={updatePurchase} className="space-y-4 mt-5">
            <input value={form.invoiceNumber} onChange={(e) => setForm({ ...form, invoiceNumber: e.target.value })} placeholder={t("invoiceNumber")} className="w-full border rounded-[14px] px-4 py-3 text-sm" />

            <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="w-full border rounded-[14px] px-4 py-3 text-sm">
              <option value="PENDING">{t("pending")}</option>
              <option value="RECEIVED">{t("received")}</option>
              <option value="CANCELLED">{t("cancelled")}</option>
            </select>

            <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder={t("notes")} className="w-full border rounded-[14px] px-4 py-3 text-sm min-h-[100px]" />

            <div className="flex justify-end gap-3">
              <button type="button" onClick={() => setEditingPurchase(null)} className="px-5 py-3 rounded-[16px] border">{t("cancel")}</button>
              <button disabled={saving} className="px-5 py-3 rounded-[16px] bg-[#123A5C] text-white font-bold disabled:opacity-50">
                {saving ? t("saving") : t("saveChanges")}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {statusPurchase && (
        <Modal title={t("changeStatus")} onClose={() => setStatusPurchase(null)}>
          <p className="text-sm text-slate-500 mt-2">
            {t("purchase")}: <strong>{statusPurchase.purchaseNumber}</strong>
          </p>

          <select value={newStatus} onChange={(e) => setNewStatus(e.target.value as "PENDING" | "RECEIVED" | "CANCELLED")} className="mt-5 w-full border rounded-[14px] px-4 py-3 text-sm">
            <option value="PENDING">{t("pending")}</option>
            <option value="RECEIVED">{t("received")}</option>
            <option value="CANCELLED">{t("cancelled")}</option>
          </select>

          <p className="text-xs text-yellow-600 mt-3">{t("receivedStockWarning")}</p>

          <div className="flex justify-end gap-3 mt-6">
            <button onClick={() => setStatusPurchase(null)} className="px-5 py-3 rounded-[16px] border">{t("cancel")}</button>
            <button onClick={updatePurchaseStatus} disabled={saving} className="px-5 py-3 rounded-[16px] bg-[#123A5C] text-white font-bold disabled:opacity-50">
              {saving ? t("updating") : t("update")}
            </button>
          </div>
        </Modal>
      )}

      {deletingPurchase && (
        <Modal title={t("deletePurchaseQuestion")} onClose={() => setDeletingPurchase(null)}>
          <p className="text-slate-600 mt-3">
            {t("deletePurchaseConfirm")} <strong>{deletingPurchase.purchaseNumber}</strong>?
          </p>

          <p className="text-sm text-red-500 mt-3">{t("deletePurchaseWarning")}</p>

          <div className="flex justify-end gap-3 mt-6">
            <button onClick={() => setDeletingPurchase(null)} className="px-5 py-3 rounded-[16px] border">{t("cancel")}</button>
            <button onClick={deletePurchase} disabled={saving} className="px-5 py-3 rounded-[16px] bg-red-600 text-white font-bold disabled:opacity-50">
              {saving ? t("deleting") : t("delete")}
            </button>
          </div>
        </Modal>
      )}

      {detailsOpen && (
        <Modal title={detailsOpen.purchaseNumber} onClose={() => setDetailsOpen(null)}>
          <p className="text-sm text-slate-500">
            {t("supplier")}: {detailsOpen.supplier?.name || "-"}
          </p>

          <div className="mt-5 border rounded-[18px] overflow-hidden">
            <table className="w-full min-w-[700px] text-sm">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  <th className="px-4 py-3 text-left">{t("product")}</th>
                  <th className="px-4 py-3">{t("qty")}</th>
                  <th className="px-4 py-3">{t("unitCost")}</th>
                  <th className="px-4 py-3">{t("total")}</th>
                </tr>
              </thead>

              <tbody className="divide-y">
                {detailsOpen.items.map((item) => (
                  <tr key={item.id}>
                    <td className="px-4 py-3 font-semibold">{item.product.name}</td>
                    <td className="px-4 py-3">{item.quantity}</td>
                    <td className="px-4 py-3">{formatMoney(item.unitCost)}</td>
                    <td className="px-4 py-3 font-bold text-[#123A5C]">{formatMoney(item.totalCost)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Modal>
      )}
    </div>
  );
}

function StatCard({ title, value, icon }: { title: string; value: string | number; icon: React.ReactNode }) {
  return (
    <div className="bg-white rounded-[18px] p-4 shadow-sm border border-slate-100 flex items-center gap-3">
      <div className="w-10 h-10 rounded-[14px] bg-[#123A5C]/10 text-[#123A5C] flex items-center justify-center">
        {icon}
      </div>

      <div>
        <p className="text-xs text-slate-500">{title}</p>
        <p className="text-lg font-black text-slate-800">{value}</p>
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
    <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100">
      <p className="text-sm text-slate-500">
        {t("page")} {page} {t("of")} {totalPages}
      </p>

      <div className="flex gap-2">
        <button type="button" disabled={page === 1} onClick={onPrev} className="px-4 py-2 rounded-xl border disabled:opacity-40">
          <ChevronLeft size={17} />
        </button>

        <button type="button" disabled={page === totalPages} onClick={onNext} className="px-4 py-2 rounded-xl border disabled:opacity-40">
          <ChevronRight size={17} />
        </button>
      </div>
    </div>
  );
}

function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-6">
      <div className="bg-white rounded-[24px] shadow-xl w-full max-w-4xl p-6 overflow-auto max-h-[90vh]">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-slate-800">{title}</h2>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-slate-100">
            <X size={22} />
          </button>
        </div>

        {children}
      </div>
    </div>
  );
}