"use client";

import { useI18n } from "@/lib/i18n";
import { useEffect, useMemo, useState } from "react";
import {
  WalletCards,
  Search,
  Pencil,
  Trash2,
  Eye,
  X,
  ChevronLeft,
  ChevronRight,
  Tags,
  Building2,
  FileText,
  AlertCircle,
  CheckCircle2,
  Repeat,
  Store,
  Banknote,
} from "lucide-react";

type CostType = "ONE_TIME" | "RECURRING";
type CostPeriodicity = "NONE" | "WEEKLY" | "MONTHLY" | "QUARTERLY" | "ANNUAL";

type CostCategory = {
  id: string;
  name: string;
  description: string | null;
  isSystem: boolean;
  costType: CostType;
  periodicity: CostPeriodicity;
  defaultAmount: string | null;
};

type Cantina = {
  id: string;
  name: string;
  code: string;
};

type FinancialAccount = {
  id: string;
  name: string;
  type: "CASH" | "BANK" | "MOBILE_MONEY" | "CARD" | "OTHER";
  balance: string;
  currency: string | null;
  isDefault: boolean;
};

type Cost = {
  id: string;
  categoryId: string;
  cantinaId: string | null;
  description: string | null;
  amount: string;
  costDate: string;
  isAutomatic: boolean;
  paymentStatus: "PENDING" | "PAID" | "CANCELLED";
  paidAt: string | null;
  financialAccountId: string | null;
  referencePeriod: string | null;
  category: CostCategory;
  cantina?: Cantina | null;
  financialAccount?: FinancialAccount | null;
};

const ITEMS_PER_PAGE = 4;
const CATEGORY_ITEMS_PER_PAGE = 6;

export default function CustosClient() {
  const { t, lang } = useI18n();

  const [costs, setCosts] = useState<Cost[]>([]);
  const [categories, setCategories] = useState<CostCategory[]>([]);
  const [cantinas, setCantinas] = useState<Cantina[]>([]);
  const [accounts, setAccounts] = useState<FinancialAccount[]>([]);

  const [loading, setLoading] = useState(true);
  const [currency, setCurrency] = useState("EUR");
  const [saving, setSaving] = useState(false);

  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [categoryPage, setCategoryPage] = useState(1);

  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [costTypeFilter, setCostTypeFilter] = useState<"ALL" | CostType>("ALL");
  const [periodicityFilter, setPeriodicityFilter] = useState<
    "ALL" | CostPeriodicity
  >("ALL");
  const [cantinaFilter, setCantinaFilter] = useState("ALL");

  const [payModalOpen, setPayModalOpen] = useState(false);
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);

  const [deletingCost, setDeletingCost] = useState<Cost | null>(null);
  const [detailsCost, setDetailsCost] = useState<Cost | null>(null);
  const [editingCategory, setEditingCategory] = useState<CostCategory | null>(
    null
  );
  const [deletingCategory, setDeletingCategory] =
    useState<CostCategory | null>(null);

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [payForm, setPayForm] = useState({
    categoryId: "",
    cantinaId: "",
    amount: "",
    costDate: new Date().toISOString().slice(0, 10),
    referencePeriod: "",
    description: "",
    financialAccountId: "",
  });

  const [categoryForm, setCategoryForm] = useState({
    name: "",
    description: "",
    costType: "ONE_TIME" as CostType,
    periodicity: "NONE" as CostPeriodicity,
    defaultAmount: "",
  });

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

  async function loadCosts() {
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/custos");
      const data = await res.json();

      if (!res.ok) {
        setError(data.message || t("costLoadError"));
        return;
      }

      setCosts(data.costs || []);
      setCategories(data.categories || []);
      setCantinas(data.cantinas || []);
      setAccounts(data.financialAccounts || []);

      const defaultAccount = data.financialAccounts?.find(
        (account: FinancialAccount) => account.isDefault
      );

      if (defaultAccount) {
        setPayForm((prev) => ({
          ...prev,
          financialAccountId: prev.financialAccountId || defaultAccount.id,
        }));
      }
    } catch {
      setError(t("costLoadError"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
  const timeout = setTimeout(() => {
    void loadCosts();
    void loadCompanyCurrency();
  }, 0);

  return () => clearTimeout(timeout);
}, []);

  const filteredCosts = useMemo(() => {
    const q = search.toLowerCase().trim();

    return costs.filter((cost) => {
      const matchesSearch =
        !q ||
        (cost.description || "").toLowerCase().includes(q) ||
        cost.category.name.toLowerCase().includes(q) ||
        (cost.cantina?.name || "").toLowerCase().includes(q) ||
        (cost.referencePeriod || "").toLowerCase().includes(q);

      const matchesCategory =
        categoryFilter === "ALL" || cost.categoryId === categoryFilter;

      const matchesType =
        costTypeFilter === "ALL" || cost.category.costType === costTypeFilter;

      const matchesPeriodicity =
        periodicityFilter === "ALL" ||
        cost.category.periodicity === periodicityFilter;

      const matchesCantina =
        cantinaFilter === "ALL" ||
        (cantinaFilter === "GENERAL" && !cost.cantinaId) ||
        cost.cantinaId === cantinaFilter;

      return (
        matchesSearch &&
        matchesCategory &&
        matchesType &&
        matchesPeriodicity &&
        matchesCantina
      );
    });
  }, [
    costs,
    search,
    categoryFilter,
    costTypeFilter,
    periodicityFilter,
    cantinaFilter,
  ]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredCosts.length / ITEMS_PER_PAGE)
  );

  const paginatedCosts = filteredCosts.slice(
    (page - 1) * ITEMS_PER_PAGE,
    page * ITEMS_PER_PAGE
  );

  const categoryTotalPages = Math.max(
    1,
    Math.ceil(categories.length / CATEGORY_ITEMS_PER_PAGE)
  );

  const paginatedCategories = categories.slice(
    (categoryPage - 1) * CATEGORY_ITEMS_PER_PAGE,
    categoryPage * CATEGORY_ITEMS_PER_PAGE
  );

  const stats = useMemo(() => {
    const total = costs.reduce((sum, cost) => sum + Number(cost.amount || 0), 0);

    const recurring = costs
      .filter((cost) => cost.category.costType === "RECURRING")
      .reduce((sum, cost) => sum + Number(cost.amount || 0), 0);

    const oneTime = costs
      .filter((cost) => cost.category.costType === "ONE_TIME")
      .reduce((sum, cost) => sum + Number(cost.amount || 0), 0);

    return {
      total,
      recurring,
      oneTime,
      count: costs.length,
    };
  }, [costs]);

  function formatMoney(value: string | number) {
  const amount = Number(value || 0);

  const locale =
    lang === "fr" ? "fr-FR" : lang === "en" ? "en-GB" : "pt-PT";

  if (currency === "AOA") {
    return `${new Intl.NumberFormat(locale, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(Number.isFinite(amount) ? amount : 0)} Kz`;
  }

  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(amount) ? amount : 0);
}

  function resetPayForm() {
    const defaultAccount =
      accounts.find((account) => account.isDefault) || accounts[0];

    setPayForm({
      categoryId: "",
      cantinaId: "",
      amount: "",
      costDate: new Date().toISOString().slice(0, 10),
      referencePeriod: "",
      description: "",
      financialAccountId: defaultAccount?.id || "",
    });
  }

  function resetCategoryForm() {
    setCategoryForm({
      name: "",
      description: "",
      costType: "ONE_TIME",
      periodicity: "NONE",
      defaultAmount: "",
    });
  }

  function openPayModal() {
    resetPayForm();
    setPayModalOpen(true);
  }

  function openNewCategory() {
    setEditingCategory(null);
    resetCategoryForm();
  }

  function openEditCategory(category: CostCategory) {
    setEditingCategory(category);
    setCategoryForm({
      name: category.name,
      description: category.description || "",
      costType: category.costType,
      periodicity: category.periodicity,
      defaultAmount: category.defaultAmount ? String(category.defaultAmount) : "",
    });
  }

  function handlePayCategoryChange(categoryId: string) {
    const category = categories.find((item) => item.id === categoryId);

    setPayForm((prev) => ({
      ...prev,
      categoryId,
      amount: category?.defaultAmount ? String(category.defaultAmount) : "",
      description: category ? `${t("paymentOf")} ${category.name}` : "",
    }));
  }

  async function payCost(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setSaving(true);
    setError("");
    setMessage("");

    try {
      const res = await fetch("/api/custos", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payForm),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || t("payCostError"));
        return;
      }

      setMessage(data.message || t("costPaidSuccess"));
      setPayModalOpen(false);
      resetPayForm();
      await loadCosts();
    } catch {
      setError(t("payCostError"));
    } finally {
      setSaving(false);
    }
  }

  async function deleteCost() {
    if (!deletingCost) return;

    setSaving(true);
    setError("");
    setMessage("");

    try {
      const res = await fetch(`/api/custos/${deletingCost.id}`, {
        method: "DELETE",
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || t("deleteCostError"));
        return;
      }

      setMessage(data.message || t("costDeletedSuccess"));
      setDeletingCost(null);
      await loadCosts();
    } catch {
      setError(t("deleteCostError"));
    } finally {
      setSaving(false);
    }
  }

  async function saveCategory(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setSaving(true);
    setError("");
    setMessage("");

    try {
      const url = editingCategory
        ? `/api/custos/categories/${editingCategory.id}`
        : "/api/custos/categories";

      const method = editingCategory ? "PATCH" : "POST";

      const payload = {
        ...categoryForm,
        periodicity:
          categoryForm.costType === "RECURRING"
            ? categoryForm.periodicity
            : "NONE",
      };

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || t("saveCategoryError"));
        return;
      }

      setMessage(data.message || t("categorySavedSuccess"));
      setEditingCategory(null);
      resetCategoryForm();
      await loadCosts();
    } catch {
      setError(t("saveCategoryError"));
    } finally {
      setSaving(false);
    }
  }

  async function deleteCategory() {
    if (!deletingCategory) return;

    setSaving(true);
    setError("");
    setMessage("");

    try {
      const res = await fetch(`/api/custos/categories/${deletingCategory.id}`, {
        method: "DELETE",
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || t("deleteCategoryError"));
        return;
      }

      setMessage(data.message || t("categoryDeletedSuccess"));
      setDeletingCategory(null);
      await loadCosts();
    } catch {
      setError(t("deleteCategoryError"));
    } finally {
      setSaving(false);
    }
  }

  function costTypeLabel(type: CostType) {
    return type === "RECURRING" ? t("recurring") : t("oneTime");
  }

  function periodicityLabel(periodicity: CostPeriodicity) {
    if (periodicity === "WEEKLY") return t("weekly");
    if (periodicity === "MONTHLY") return t("monthly");
    if (periodicity === "QUARTERLY") return t("quarterly");
    if (periodicity === "ANNUAL") return t("yearly");
    return t("notRecurring");
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">
            {t("costManagement")}
          </h1>

          <p className="text-sm text-slate-500">
            {t("costManagementDescription")}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setCategoryModalOpen(true)}
            className="rounded-[14px] border border-[#123A5C] px-4 py-2.5 text-sm text-[#123A5C] font-semibold flex items-center gap-2 hover:bg-[#123A5C] hover:text-white"
          >
            <Tags size={16} />
            {t("categories")}
          </button>

          <button
            onClick={openPayModal}
            className="rounded-[14px] bg-[#123A5C] px-4 py-2.5 text-white text-sm font-semibold flex items-center gap-2 hover:bg-[#0B2540]"
          >
            <Banknote size={16} />
            {t("pay")}
          </button>
        </div>
      </div>

      {(error || message) && (
        <div
          className={`rounded-[16px] px-4 py-3 text-sm flex items-center gap-2 ${
            error ? "bg-red-50 text-red-600" : "bg-green-50 text-green-700"
          }`}
        >
          {error ? <AlertCircle size={17} /> : <CheckCircle2 size={17} />}
          {error || message}
        </div>
      )}

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
        <StatCard
          title={t("totalPaid")}
          value={formatMoney(stats.total)}
          icon={<WalletCards size={20} />}
          tone="blue"
        />

        <StatCard
          title={t("recurring")}
          value={formatMoney(stats.recurring)}
          icon={<Repeat size={20} />}
          tone="purple"
        />

        <StatCard
          title={t("oneTime")}
          value={formatMoney(stats.oneTime)}
          icon={<FileText size={20} />}
          tone="yellow"
        />

        <StatCard
          title={t("payments")}
          value={stats.count}
          icon={<CheckCircle2 size={20} />}
          tone="green"
        />
      </div>

      <div className="bg-white rounded-[22px] shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-4 border-b border-slate-100 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
            <div className="relative md:col-span-2">
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
                placeholder={t("searchCosts")}
                className="w-full rounded-[14px] border pl-10 pr-4 py-3 text-sm"
              />
            </div>

            <select
              value={categoryFilter}
              onChange={(e) => {
                setCategoryFilter(e.target.value);
                setPage(1);
              }}
              className="rounded-[14px] border px-4 py-3 text-sm"
            >
              <option value="ALL">{t("allCategories")}</option>

              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>

            <select
              value={costTypeFilter}
              onChange={(e) => {
                setCostTypeFilter(e.target.value as "ALL" | CostType);
                setPage(1);
              }}
              className="rounded-[14px] border px-4 py-3 text-sm"
            >
              <option value="ALL">{t("allTypes")}</option>
              <option value="ONE_TIME">{t("oneTime")}</option>
              <option value="RECURRING">{t("recurring")}</option>
            </select>

            <select
              value={periodicityFilter}
              onChange={(e) => {
                setPeriodicityFilter(e.target.value as "ALL" | CostPeriodicity);
                setPage(1);
              }}
              className="rounded-[14px] border px-4 py-3 text-sm"
            >
              <option value="ALL">{t("allPeriodicities")}</option>
              <option value="NONE">{t("notRecurring")}</option>
              <option value="WEEKLY">{t("weekly")}</option>
              <option value="MONTHLY">{t("monthly")}</option>
              <option value="QUARTERLY">{t("quarterly")}</option>
              <option value="ANNUAL">{t("yearly")}</option>
            </select>

            <select
              value={cantinaFilter}
              onChange={(e) => {
                setCantinaFilter(e.target.value);
                setPage(1);
              }}
              className="rounded-[14px] border px-4 py-3 text-sm"
            >
              <option value="ALL">{t("allApplications")}</option>
              <option value="GENERAL">{t("general")}</option>

              {cantinas.map((cantina) => (
                <option key={cantina.id} value={cantina.id}>
                  {cantina.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {loading ? (
          <div className="p-10 text-center text-slate-500">{t("loadingCosts")}</div>
        ) : paginatedCosts.length === 0 ? (
          <div className="p-10 text-center text-slate-500">{t("noPayments")}</div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1150px] text-left text-sm">
                <thead className="bg-slate-50 text-slate-500">
                  <tr>
                    <th className="px-5 py-3">{t("payment")}</th>
                    <th className="px-5 py-3">{t("category")}</th>
                    <th className="px-5 py-3">{t("type")}</th>
                    <th className="px-5 py-3">{t("application")}</th>
                    <th className="px-5 py-3">{t("period")}</th>
                    <th className="px-5 py-3">{t("date")}</th>
                    <th className="px-5 py-3">{t("account")}</th>
                    <th className="px-5 py-3">{t("amount")}</th>
                    <th className="px-5 py-3 text-right">{t("actions")}</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {paginatedCosts.map((cost) => (
                    <tr key={cost.id} className="hover:bg-slate-50">
                      <td className="px-5 py-3">
                        <p className="font-semibold text-slate-800">
                          {cost.description ||
                            `${t("paymentOf")} ${cost.category.name}`}
                        </p>

                        <p className="text-xs text-green-700 font-semibold">
                          {t("paid")}
                        </p>
                      </td>

                      <td className="px-5 py-3">{cost.category.name}</td>

                      <td className="px-5 py-3">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-semibold ${
                            cost.category.costType === "RECURRING"
                              ? "bg-purple-50 text-purple-700"
                              : "bg-slate-100 text-slate-700"
                          }`}
                        >
                          {costTypeLabel(cost.category.costType)}
                        </span>

                        <p className="text-xs text-slate-500 mt-1">
                          {periodicityLabel(cost.category.periodicity)}
                        </p>
                      </td>

                      <td className="px-5 py-3">
                        {cost.cantina ? (
                          <span className="inline-flex items-center gap-1">
                            <Store size={14} />
                            {cost.cantina.name} — {cost.cantina.code}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1">
                            <Building2 size={14} />
                            {t("general")}
                          </span>
                        )}
                      </td>

                      <td className="px-5 py-3">{cost.referencePeriod || "-"}</td>

                      <td className="px-5 py-3">{cost.costDate.slice(0, 10)}</td>

                      <td className="px-5 py-3">
                        {cost.financialAccount?.name || "-"}
                      </td>

                      <td className="px-5 py-3 font-black text-red-600">
                        {formatMoney(cost.amount)}
                      </td>

                      <td className="px-5 py-3">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => setDetailsCost(cost)}
                            className="p-2 rounded-xl hover:bg-slate-100 text-slate-600"
                            title={t("viewDetails")}
                          >
                            <Eye size={18} />
                          </button>

                          <button
                            onClick={() => setDeletingCost(cost)}
                            disabled={cost.isAutomatic}
                            className="p-2 rounded-xl hover:bg-red-50 text-red-600 disabled:opacity-30"
                            title={t("deletePayment")}
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
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

      {payModalOpen && (
        <Modal
          title={t("payCost")}
          onClose={() => {
            setPayModalOpen(false);
            resetPayForm();
          }}
          maxWidth="max-w-2xl"
        >
          <form
            onSubmit={payCost}
            className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-5"
          >
            <div>
              <label className="text-xs text-slate-500">
                {t("whatDoYouWantToPay")}
              </label>

              <select
                required
                value={payForm.categoryId}
                onChange={(e) => handlePayCategoryChange(e.target.value)}
                className="mt-1 w-full border rounded-[14px] px-4 py-3 text-sm"
              >
                <option value="">{t("chooseCategory")}</option>

                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name} — {costTypeLabel(category.costType)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs text-slate-500">
                {t("realPaidAmount")}
              </label>

              <input
                required
                type="number"
                value={payForm.amount}
                onChange={(e) =>
                  setPayForm({ ...payForm, amount: e.target.value })
                }
                className="mt-1 w-full border rounded-[14px] px-4 py-3 text-sm"
                placeholder="0"
              />
            </div>

            <div>
              <label className="text-xs text-slate-500">
                {t("application")}
              </label>

              <select
                value={payForm.cantinaId}
                onChange={(e) =>
                  setPayForm({ ...payForm, cantinaId: e.target.value })
                }
                className="mt-1 w-full border rounded-[14px] px-4 py-3 text-sm"
              >
                <option value="">{t("companyGeneral")}</option>

                {cantinas.map((cantina) => (
                  <option key={cantina.id} value={cantina.id}>
                    {cantina.name} — {cantina.code}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs text-slate-500">
                {t("financialAccount")}
              </label>

              <select
                required
                value={payForm.financialAccountId}
                onChange={(e) =>
                  setPayForm({
                    ...payForm,
                    financialAccountId: e.target.value,
                  })
                }
                className="mt-1 w-full border rounded-[14px] px-4 py-3 text-sm"
              >
                <option value="">{t("chooseAccount")}</option>

                {accounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.name} — {formatMoney(account.balance)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs text-slate-500">
                {t("paymentDate")}
              </label>

              <input
                type="date"
                value={payForm.costDate}
                onChange={(e) =>
                  setPayForm({ ...payForm, costDate: e.target.value })
                }
                className="mt-1 w-full border rounded-[14px] px-4 py-3 text-sm"
              />
            </div>

            <div>
              <label className="text-xs text-slate-500">
                {t("referencePeriod")}
              </label>

              <input
                value={payForm.referencePeriod}
                onChange={(e) =>
                  setPayForm({
                    ...payForm,
                    referencePeriod: e.target.value,
                  })
                }
                className="mt-1 w-full border rounded-[14px] px-4 py-3 text-sm"
                placeholder={t("referencePeriodExample")}
              />
            </div>

            <div className="md:col-span-2">
              <label className="text-xs text-slate-500">{t("note")}</label>

              <textarea
                value={payForm.description}
                onChange={(e) =>
                  setPayForm({ ...payForm, description: e.target.value })
                }
                className="mt-1 w-full border rounded-[14px] px-4 py-3 text-sm min-h-[90px]"
                placeholder={t("paymentNoteExample")}
              />
            </div>

            <div className="md:col-span-2 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setPayModalOpen(false);
                  resetPayForm();
                }}
                className="px-5 py-3 rounded-[16px] border"
              >
                {t("cancel")}
              </button>

              <button
                disabled={saving}
                className="px-5 py-3 rounded-[16px] bg-green-600 text-white font-bold disabled:opacity-50"
              >
                {saving ? t("paying") : t("confirmPayment")}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {categoryModalOpen && (
        <div className="fixed left-[200px] top-[110px] right-0 bottom-0 z-40 bg-[#F4F7FA] p-5 overflow-hidden">
          <div className="h-full bg-white rounded-[24px] shadow-xl flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <div>
                <h2 className="text-2xl font-bold text-slate-800">
                  {t("costCategories")}
                </h2>

                <p className="text-sm text-slate-500">
                  {t("costCategoriesDescription")}
                </p>
              </div>

              <button
                onClick={() => {
                  setCategoryModalOpen(false);
                  setEditingCategory(null);
                  resetCategoryForm();
                }}
                className="p-2 rounded-xl hover:bg-slate-100"
              >
                <X size={24} />
              </button>
            </div>

            <div className="flex-1 p-5 grid grid-cols-1 xl:grid-cols-[360px_1fr] gap-5 overflow-hidden">
              <form
                onSubmit={saveCategory}
                className="bg-slate-50 rounded-[22px] p-4 space-y-3 overflow-auto"
              >
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-slate-800">
                    {editingCategory ? t("editCategory") : t("newCategory")}
                  </h3>

                  {editingCategory && (
                    <button
                      type="button"
                      onClick={openNewCategory}
                      className="text-xs text-[#123A5C] font-bold"
                    >
                      {t("clear")}
                    </button>
                  )}
                </div>

                <input
                  required
                  value={categoryForm.name}
                  onChange={(e) =>
                    setCategoryForm({ ...categoryForm, name: e.target.value })
                  }
                  placeholder={t("categoryNameExample")}
                  className="w-full border rounded-[14px] px-4 py-3 text-sm"
                />

                <select
                  value={categoryForm.costType}
                  onChange={(e) => {
                    const value = e.target.value as CostType;

                    setCategoryForm({
                      ...categoryForm,
                      costType: value,
                      periodicity: value === "RECURRING" ? "MONTHLY" : "NONE",
                    });
                  }}
                  className="w-full border rounded-[14px] px-4 py-3 text-sm"
                >
                  <option value="ONE_TIME">{t("oneTimeNonRecurring")}</option>
                  <option value="RECURRING">{t("recurring")}</option>
                </select>

                <select
                  disabled={categoryForm.costType !== "RECURRING"}
                  value={categoryForm.periodicity}
                  onChange={(e) =>
                    setCategoryForm({
                      ...categoryForm,
                      periodicity: e.target.value as CostPeriodicity,
                    })
                  }
                  className="w-full border rounded-[14px] px-4 py-3 text-sm disabled:bg-slate-100"
                >
                  <option value="NONE">{t("withoutPeriodicity")}</option>
                  <option value="WEEKLY">{t("weekly")}</option>
                  <option value="MONTHLY">{t("monthly")}</option>
                  <option value="QUARTERLY">{t("quarterly")}</option>
                  <option value="ANNUAL">{t("yearly")}</option>
                </select>

                <input
                  type="number"
                  value={categoryForm.defaultAmount}
                  onChange={(e) =>
                    setCategoryForm({
                      ...categoryForm,
                      defaultAmount: e.target.value,
                    })
                  }
                  placeholder={t("optionalDefaultAmount")}
                  className="w-full border rounded-[14px] px-4 py-3 text-sm"
                />

                <textarea
                  value={categoryForm.description}
                  onChange={(e) =>
                    setCategoryForm({
                      ...categoryForm,
                      description: e.target.value,
                    })
                  }
                  placeholder={t("description")}
                  className="w-full border rounded-[14px] px-4 py-3 text-sm min-h-[110px]"
                />

                <button
                  disabled={saving}
                  className="w-full rounded-[16px] bg-[#123A5C] px-5 py-3 text-white font-bold disabled:opacity-50"
                >
                  {saving
                    ? t("saving")
                    : editingCategory
                    ? t("saveChanges")
                    : t("createCategory")}
                </button>
              </form>

              <div className="min-h-0 flex flex-col border rounded-[20px] overflow-hidden">
                <div className="overflow-x-auto flex-1">
                  <table className="w-full min-w-[850px] text-sm">
                    <thead className="bg-slate-50 text-slate-500">
                      <tr>
                        <th className="px-4 py-3 text-left">{t("category")}</th>
                        <th className="px-4 py-3 text-left">{t("type")}</th>
                        <th className="px-4 py-3 text-left">
                          {t("periodicity")}
                        </th>
                        <th className="px-4 py-3 text-left">
                          {t("defaultAmount")}
                        </th>
                        <th className="px-4 py-3 text-right">
                          {t("actions")}
                        </th>
                      </tr>
                    </thead>

                    <tbody className="divide-y">
                      {paginatedCategories.map((category) => (
                        <tr key={category.id} className="hover:bg-slate-50">
                          <td className="px-4 py-3">
                            <p className="font-semibold text-slate-800">
                              {category.name}
                            </p>

                            <p className="text-xs text-slate-500">
                              {category.description || "-"}
                            </p>
                          </td>

                          <td className="px-4 py-3">
                            <span
                              className={`px-3 py-1 rounded-full text-xs font-semibold ${
                                category.costType === "RECURRING"
                                  ? "bg-purple-50 text-purple-700"
                                  : "bg-slate-100 text-slate-700"
                              }`}
                            >
                              {costTypeLabel(category.costType)}
                            </span>
                          </td>

                          <td className="px-4 py-3">
                            {periodicityLabel(category.periodicity)}
                          </td>

                          <td className="px-4 py-3">
                            {category.defaultAmount
                              ? formatMoney(category.defaultAmount)
                              : "-"}
                          </td>

                          <td className="px-4 py-3">
                            <div className="flex justify-end gap-2">
                              <button
                                onClick={() => openEditCategory(category)}
                                disabled={category.isSystem}
                                className="p-2 rounded-xl hover:bg-blue-50 text-blue-600 disabled:opacity-30"
                              >
                                <Pencil size={17} />
                              </button>

                              <button
                                onClick={() => setDeletingCategory(category)}
                                disabled={category.isSystem}
                                className="p-2 rounded-xl hover:bg-red-50 text-red-600 disabled:opacity-30"
                              >
                                <Trash2 size={17} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <Pagination
                  page={categoryPage}
                  totalPages={categoryTotalPages}
                  t={t}
                  onPrev={() => setCategoryPage((p) => Math.max(1, p - 1))}
                  onNext={() =>
                    setCategoryPage((p) => Math.min(categoryTotalPages, p + 1))
                  }
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {detailsCost && (
        <Modal
          title={t("paymentDetails")}
          onClose={() => setDetailsCost(null)}
          maxWidth="max-w-xl"
        >
          <div className="mt-5 space-y-3 text-sm">
            <Detail label={t("description")} value={detailsCost.description || "-"} />
            <Detail label={t("category")} value={detailsCost.category.name} />
            <Detail
              label={t("type")}
              value={costTypeLabel(detailsCost.category.costType)}
            />
            <Detail
              label={t("periodicity")}
              value={periodicityLabel(detailsCost.category.periodicity)}
            />
            <Detail
              label={t("application")}
              value={
                detailsCost.cantina
                  ? `${detailsCost.cantina.name} — ${detailsCost.cantina.code}`
                  : t("companyGeneral")
              }
            />
            <Detail
              label={t("period")}
              value={detailsCost.referencePeriod || "-"}
            />
            <Detail label={t("date")} value={detailsCost.costDate.slice(0, 10)} />
            <Detail
              label={t("account")}
              value={detailsCost.financialAccount?.name || "-"}
            />
            <Detail label={t("amount")} value={formatMoney(detailsCost.amount)} strong />
          </div>
        </Modal>
      )}

      {deletingCost && (
        <Modal
          title={t("deletePaymentQuestion")}
          onClose={() => setDeletingCost(null)}
          maxWidth="max-w-md"
        >
          <p className="text-slate-600 mt-4">
            {t("deletePaymentConfirm")}{" "}
            <strong>{formatMoney(deletingCost.amount)}</strong>?
          </p>

          <p className="text-sm text-red-500 mt-3">
            {t("financialBalanceRestored")}
          </p>

          <div className="flex justify-end gap-3 mt-6">
            <button
              onClick={() => setDeletingCost(null)}
              className="px-5 py-3 rounded-[16px] border"
            >
              {t("cancel")}
            </button>

            <button
              onClick={deleteCost}
              disabled={saving}
              className="px-5 py-3 rounded-[16px] bg-red-600 text-white font-bold disabled:opacity-50"
            >
              {saving ? t("deleting") : t("delete")}
            </button>
          </div>
        </Modal>
      )}

      {deletingCategory && (
        <Modal
          title={t("deleteCategoryQuestion")}
          onClose={() => setDeletingCategory(null)}
          maxWidth="max-w-md"
        >
          <p className="text-slate-600 mt-4">
            {t("deleteCategoryConfirm")}{" "}
            <strong>{deletingCategory.name}</strong>?
          </p>

          <p className="text-sm text-red-500 mt-3">
            {t("deleteCategoryWarning")}
          </p>

          <div className="flex justify-end gap-3 mt-6">
            <button
              onClick={() => setDeletingCategory(null)}
              className="px-5 py-3 rounded-[16px] border"
            >
              {t("cancel")}
            </button>

            <button
              onClick={deleteCategory}
              disabled={saving}
              className="px-5 py-3 rounded-[16px] bg-red-600 text-white font-bold disabled:opacity-50"
            >
              {saving ? t("deleting") : t("delete")}
            </button>
          </div>
        </Modal>
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
  tone: "blue" | "green" | "yellow" | "purple";
}) {
  const styles = {
    blue: "bg-[#123A5C]/10 text-[#123A5C]",
    green: "bg-green-50 text-green-700",
    yellow: "bg-yellow-50 text-yellow-700",
    purple: "bg-purple-50 text-purple-700",
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
    <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100">
      <p className="text-sm text-slate-500">
        {t("page")} {page} {t("of")} {totalPages}
      </p>

      <div className="flex gap-2">
        <button
          type="button"
          disabled={page === 1}
          onClick={onPrev}
          className="px-4 py-2 rounded-xl border disabled:opacity-40"
        >
          <ChevronLeft size={17} />
        </button>

        <button
          type="button"
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

function Modal({
  title,
  children,
  onClose,
  maxWidth = "max-w-4xl",
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
  maxWidth?: string;
}) {
  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-6">
      <div
        className={`bg-white rounded-[24px] shadow-xl w-full ${maxWidth} p-6 overflow-auto max-h-[90vh]`}
      >
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

function Detail({
  label,
  value,
  strong,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4 border-b pb-2">
      <span className="text-slate-500">{label}</span>

      <span
        className={
          strong ? "font-black text-red-600" : "font-semibold text-slate-800"
        }
      >
        {value}
      </span>
    </div>
  );
}