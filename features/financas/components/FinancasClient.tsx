"use client";

import { useI18n } from "@/lib/i18n";
import { useEffect, useMemo, useState } from "react";
import {
  CreditCard,
  Plus,
  Search,
  TrendingUp,
  TrendingDown,
  Wallet,
  Pencil,
  Trash2,
  Eye,
  X,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  AlertCircle,
  Filter,
  Building2,
  Users,
  Store,
  WalletCards,
} from "lucide-react";
import { useRouter } from "next/navigation";

type FinanceType = "INCOME" | "EXPENSE";

type FinancialAccount = {
  id: string;
  name: string;
  type: "CASH" | "BANK" | "MOBILE_MONEY" | "CARD" | "OTHER";
  balance: string;
  currency: string | null;
  isDefault: boolean;
};

type FinanceTransaction = {
  id: string;
  type: FinanceType;
  amount: string;
  description: string | null;
  date: string;
  referenceType: string | null;
  referenceId: string | null;
  createdAt: string;
  financialAccount?: FinancialAccount | null;
  user?: {
    name: string;
    identifier: string;
  } | null;
};

const ITEMS_PER_PAGE = 3;

export default function FinancasClient() {
  const { t, lang } = useI18n();
  const router = useRouter();

  const [accounts, setAccounts] = useState<FinancialAccount[]>([]);
  const [transactions, setTransactions] = useState<FinanceTransaction[]>([]);

  const [loading, setLoading] = useState(true);
  const [currency, setCurrency] = useState("EUR");
  const [saving, setSaving] = useState(false);

  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const [typeFilter, setTypeFilter] = useState("ALL");
  const [originFilter, setOriginFilter] = useState("ALL");
  const [accountFilter, setAccountFilter] = useState("ALL");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [accountModalOpen, setAccountModalOpen] = useState(false);

  const [editingTransaction, setEditingTransaction] =
    useState<FinanceTransaction | null>(null);
  const [deletingTransaction, setDeletingTransaction] =
    useState<FinanceTransaction | null>(null);
  const [detailsTransaction, setDetailsTransaction] =
    useState<FinanceTransaction | null>(null);

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [form, setForm] = useState({
    type: "INCOME" as FinanceType,
    amount: "",
    description: "",
    date: new Date().toISOString().slice(0, 10),
    financialAccountId: "",
  });

  const [accountForm, setAccountForm] = useState({
    name: "",
    type: "CASH",
    balance: "",
    currency: "AOA",
    isDefault: false,
  });

  async function loadCompanyCurrency() {
  try {
    const res = await fetch("/api/company/currency", {
      cache: "no-store",
    });

    const data = await res.json();

    if (res.ok && data.currency) {
      setCurrency(data.currency);
      setAccountForm((prev) => ({
        ...prev,
        currency: prev.currency || data.currency,
      }));
    }
  } catch {
    // mantém moeda padrão
  }
}

  async function loadTransactions() {
    setLoading(true);
    setError("");

    const params = new URLSearchParams();

    if (typeFilter !== "ALL") params.set("type", typeFilter);
    if (originFilter !== "ALL") params.set("referenceType", originFilter);
    if (accountFilter !== "ALL") params.set("accountId", accountFilter);
    if (startDate) params.set("start", startDate);
    if (endDate) params.set("end", endDate);

    try {
      const res = await fetch(`/api/financas?${params.toString()}`);
      const data = await res.json();

      if (!res.ok) {
        setError(data.message || t("financeLoadError"));
        return;
      }

      setAccounts(data.accounts || []);
      setTransactions(data.transactions || []);

      const defaultAccount = data.accounts?.find(
        (account: FinancialAccount) => account.isDefault
      );

      if (defaultAccount) {
        setForm((prev) => ({
          ...prev,
          financialAccountId: prev.financialAccountId || defaultAccount.id,
        }));
      }
    } catch {
      setError(t("financeLoadError"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
  const timeout = setTimeout(() => {
    void loadTransactions();
    void loadCompanyCurrency();
  }, 0);

  return () => clearTimeout(timeout);
}, []);

  const mainAccount =
    accounts.find((account) => account.isDefault) || accounts[0] || null;

  const otherAccounts = accounts.filter(
    (account) => account.id !== mainAccount?.id
  );

  const filteredTransactions = useMemo(() => {
    const q = search.toLowerCase().trim();

    if (!q) return transactions;

    return transactions.filter((tx) => {
      return (
        (tx.description || "").toLowerCase().includes(q) ||
        (tx.referenceType || "").toLowerCase().includes(q) ||
        (tx.financialAccount?.name || "").toLowerCase().includes(q) ||
        (tx.user?.name || "").toLowerCase().includes(q) ||
        (tx.user?.identifier || "").toLowerCase().includes(q)
      );
    });
  }, [transactions, search]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredTransactions.length / ITEMS_PER_PAGE)
  );

  const paginatedTransactions = filteredTransactions.slice(
    (page - 1) * ITEMS_PER_PAGE,
    page * ITEMS_PER_PAGE
  );

  const stats = useMemo(() => {
    const income = transactions
      .filter((tx) => tx.type === "INCOME")
      .reduce((sum, tx) => sum + Number(tx.amount || 0), 0);

    const expense = transactions
      .filter((tx) => tx.type === "EXPENSE")
      .reduce((sum, tx) => sum + Number(tx.amount || 0), 0);

    const balance = accounts.reduce(
      (sum, account) => sum + Number(account.balance || 0),
      0
    );

    return {
      income,
      expense,
      balance,
      total: transactions.length,
    };
  }, [transactions, accounts]);

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
    const defaultAccount = accounts.find((account) => account.isDefault);

    setForm({
      type: "INCOME",
      amount: "",
      description: "",
      date: new Date().toISOString().slice(0, 10),
      financialAccountId: defaultAccount?.id || accounts[0]?.id || "",
    });
  }

  function openNewTransaction() {
    setEditingTransaction(null);
    resetForm();
    setModalOpen(true);
  }

  function openEditTransaction(tx: FinanceTransaction) {
    setEditingTransaction(tx);
    setForm({
      type: tx.type,
      amount: String(tx.amount || ""),
      description: tx.description || "",
      date: tx.date.slice(0, 10),
      financialAccountId: tx.financialAccount?.id || "",
    });
    setModalOpen(true);
  }

  async function saveTransaction(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setSaving(true);
    setError("");
    setMessage("");

    try {
      const url = editingTransaction
        ? `/api/financas/${editingTransaction.id}`
        : "/api/financas";

      const method = editingTransaction ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || t("transactionSaveError"));
        return;
      }

      setMessage(data.message || t("transactionSavedSuccess"));
      setModalOpen(false);
      setEditingTransaction(null);
      resetForm();
      await loadTransactions();
    } catch {
      setError(t("transactionSaveError"));
    } finally {
      setSaving(false);
    }
  }

  async function createAccount(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setSaving(true);
    setError("");
    setMessage("");

    try {
      const res = await fetch("/api/financas/accounts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(accountForm),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || t("accountCreateError"));
        return;
      }

      setMessage(t("financialAccountCreatedSuccess"));
      setAccountModalOpen(false);
      setAccountForm({
        name: "",
        type: "CASH",
        balance: "",
        currency: "AOA",
        isDefault: false,
      });
      await loadTransactions();
    } catch {
      setError(t("accountCreateError"));
    } finally {
      setSaving(false);
    }
  }

  async function deleteTransaction() {
    if (!deletingTransaction) return;

    setSaving(true);
    setError("");
    setMessage("");

    try {
      const res = await fetch(`/api/financas/${deletingTransaction.id}`, {
        method: "DELETE",
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || t("transactionDeleteError"));
        return;
      }

      setMessage(data.message || t("transactionDeletedSuccess"));
      setDeletingTransaction(null);
      await loadTransactions();
    } catch {
      setError(t("transactionDeleteError"));
    } finally {
      setSaving(false);
    }
  }

  function typeLabel(type: FinanceType) {
    return type === "INCOME" ? t("income") : t("expense");
  }

  function originLabel(origin: string | null) {
    if (!origin) return t("manual");
    if (origin === "SALE") return t("sale");
    if (origin === "PURCHASE") return t("purchase");
    if (origin === "COST") return t("cost");
    if (origin === "SALARY") return t("salary");
    if (origin === "MANUAL") return t("manual");
    return origin;
  }

  function accountTypeLabel(type: FinancialAccount["type"]) {
    if (type === "CASH") return t("cashRegister");
    if (type === "BANK") return t("bank");
    if (type === "MOBILE_MONEY") return t("mobileMoney");
    if (type === "CARD") return t("card");
    return t("other");
  }

  function canModify(tx: FinanceTransaction) { 
  
    return tx.referenceType === "MANUAL";
  }
  
  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">
            {t("financialManagement")}
          </h1>

          <p className="text-sm text-slate-500">
            {t("financialManagementDescription")}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => router.push("/rh")}
            className="rounded-[14px] border px-4 py-2.5 text-sm font-semibold text-[#123A5C] hover:bg-[#123A5C] hover:text-white flex items-center gap-2"
          >
            <Users size={16} />
            {t("payHr")}
          </button>

          <button
            onClick={() => router.push("/cantinas")}
            className="rounded-[14px] border px-4 py-2.5 text-sm font-semibold text-[#123A5C] hover:bg-[#123A5C] hover:text-white flex items-center gap-2"
          >
            <Store size={16} />
            {t("cantinas")}
          </button>

          <button
            onClick={() => router.push("/custos")}
            className="rounded-[14px] border px-4 py-2.5 text-sm font-semibold text-[#123A5C] hover:bg-[#123A5C] hover:text-white flex items-center gap-2"
          >
            <Building2 size={16} />
            {t("rentCosts")}
          </button>

          <button
            onClick={() => setAccountModalOpen(true)}
            className="rounded-[14px] border px-4 py-2.5 text-sm font-semibold text-[#123A5C] hover:bg-[#123A5C] hover:text-white flex items-center gap-2"
          >
            <WalletCards size={16} />
            {t("newAccount")}
          </button>

          <button
            onClick={openNewTransaction}
            className="rounded-[14px] bg-[#123A5C] px-4 py-2.5 text-white text-sm font-semibold flex items-center gap-2 hover:bg-[#0B2540]"
          >
            <Plus size={16} />
            {t("newTransaction")}
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

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-3">
        <StatCard
          title={t("income")}
          value={formatMoney(stats.income)}
          icon={<TrendingUp size={20} />}
          tone="green"
        />

        <StatCard
          title={t("expenses")}
          value={formatMoney(stats.expense)}
          icon={<TrendingDown size={20} />}
          tone="red"
        />

        <StatCard
          title={t("availableBalance")}
          value={formatMoney(stats.balance)}
          icon={<Wallet size={20} />}
          tone={stats.balance >= 0 ? "blue" : "red"}
        />

        <StatCard
          title={t("transactions")}
          value={stats.total}
          icon={<CreditCard size={20} />}
          tone="blue"
        />

        <StatCard
          title={mainAccount ? mainAccount.name : t("mainCashRegister")}
          value={formatMoney(mainAccount?.balance || 0)}
          icon={<WalletCards size={20} />}
          tone="blue"
        />
      </div>

      {otherAccounts.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
          {otherAccounts.map((account) => (
            <div
              key={account.id}
              className="bg-white rounded-[18px] p-4 shadow-sm border border-slate-100"
            >
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="font-bold text-slate-800">{account.name}</p>
                  <p className="text-xs text-slate-500">
                    {accountTypeLabel(account.type)}
                  </p>
                </div>

                {account.isDefault && (
                  <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">
                    {t("main")}
                  </span>
                )}
              </div>

              <p className="mt-3 text-2xl font-black text-[#123A5C]">
                {formatMoney(account.balance)}
              </p>
            </div>
          ))}
        </div>
      )}

      <div className="bg-white rounded-[22px] shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-4 border-b border-slate-100 space-y-3">
          <div className="flex items-center gap-2 text-[#123A5C] font-bold">
            <Filter size={17} />
            {t("financialFilters")}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
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
                placeholder={t("search")}
                className="w-full rounded-[14px] border pl-10 pr-4 py-3 text-sm"
              />
            </div>

            <select
              value={typeFilter}
              onChange={(e) => {
                setTypeFilter(e.target.value);
                setPage(1);
              }}
              className="rounded-[14px] border px-4 py-3 text-sm"
            >
              <option value="ALL">{t("allTypes")}</option>
              <option value="INCOME">{t("income")}</option>
              <option value="EXPENSE">{t("expenses")}</option>
            </select>

            <select
              value={originFilter}
              onChange={(e) => {
                setOriginFilter(e.target.value);
                setPage(1);
              }}
              className="rounded-[14px] border px-4 py-3 text-sm"
            >
              <option value="ALL">{t("allOrigins")}</option>
              <option value="SALE">{t("sales")}</option>
              <option value="PURCHASE">{t("purchases")}</option>
              <option value="COST">{t("costs")}</option>
              <option value="SALARY">{t("salaries")}</option>
              <option value="MANUAL">{t("manualPlural")}</option>
            </select>

            <select
              value={accountFilter}
              onChange={(e) => {
                setAccountFilter(e.target.value);
                setPage(1);
              }}
              className="rounded-[14px] border px-4 py-3 text-sm"
            >
              <option value="ALL">{t("allAccounts")}</option>
              {accounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name}
                </option>
              ))}
            </select>

            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setPage(1);
              }}
              className="rounded-[14px] border px-4 py-3 text-sm"
            />

            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setPage(1);
              }}
              className="rounded-[14px] border px-4 py-3 text-sm"
            />
          </div>

          <div className="flex justify-end">
            <button
              onClick={() => loadTransactions()}
              className="rounded-[14px] bg-[#123A5C] px-5 py-2.5 text-sm font-bold text-white"
            >
              {t("applyFilters")}
            </button>
          </div>
        </div>

        {loading ? (
          <div className="p-10 text-center text-slate-500">
            {t("loadingFinances")}
          </div>
        ) : paginatedTransactions.length === 0 ? (
          <div className="p-10 text-center text-slate-500">
            {t("noTransactionFound")}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1050px] text-left text-sm">
                <thead className="bg-slate-50 text-slate-500">
                  <tr>
                    <th className="px-5 py-3">{t("description")}</th>
                    <th className="px-5 py-3">{t("account")}</th>
                    <th className="px-5 py-3">{t("type")}</th>
                    <th className="px-5 py-3">{t("origin")}</th>
                    <th className="px-5 py-3">{t("date")}</th>
                    <th className="px-5 py-3">{t("amount")}</th>
                    <th className="px-5 py-3 text-right">{t("actions")}</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {paginatedTransactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-slate-50">
                      <td className="px-5 py-3">
                        <p className="font-semibold text-slate-800">
                          {tx.description || t("transactionWithoutDescription")}
                        </p>
                        <p className="text-xs text-slate-500">
                          {tx.user?.name || tx.user?.identifier || "-"}
                        </p>
                      </td>

                      <td className="px-5 py-3">
                        {tx.financialAccount?.name || "-"}
                      </td>

                      <td className="px-5 py-3">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-semibold ${
                            tx.type === "INCOME"
                              ? "bg-green-50 text-green-700"
                              : "bg-red-50 text-red-600"
                          }`}
                        >
                          {typeLabel(tx.type)}
                        </span>
                      </td>

                      <td className="px-5 py-3">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-semibold ${
                            tx.referenceType === "MANUAL"
                              ? "bg-slate-100 text-slate-700"
                              : "bg-blue-50 text-blue-700"
                          }`}
                        >
                          {originLabel(tx.referenceType)}
                        </span>
                      </td>

                      <td className="px-5 py-3">{tx.date.slice(0, 10)}</td>

                      <td
                        className={`px-5 py-3 font-black ${
                          tx.type === "INCOME"
                            ? "text-green-700"
                            : "text-red-600"
                        }`}
                      >
                        {tx.type === "INCOME" ? "+" : "-"}
                        {formatMoney(tx.amount)}
                      </td>

                      <td className="px-5 py-3">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => setDetailsTransaction(tx)}
                            className="p-2 rounded-xl hover:bg-slate-100 text-slate-600"
                            title={t("viewDetails")}
                          >
                            <Eye size={18} />
                          </button>

                          <button
                            onClick={() => openEditTransaction(tx)}
                            disabled={!canModify(tx)}
                            className="p-2 rounded-xl hover:bg-blue-50 text-blue-600 disabled:opacity-30"
                            title={t("edit")}
                          >
                            <Pencil size={18} />
                          </button>

                          <button
                            onClick={() => setDeletingTransaction(tx)}
                            disabled={!canModify(tx)}
                            className="p-2 rounded-xl hover:bg-red-50 text-red-600 disabled:opacity-30"
                            title={t("delete")}
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
      </div>{modalOpen && (
        <Modal
          title={
            editingTransaction
              ? t("editTransaction")
              : t("newTransaction")
          }
          onClose={() => {
            setModalOpen(false);
            setEditingTransaction(null);
            resetForm();
          }}
          maxWidth="max-w-xl"
        >
          <form onSubmit={saveTransaction} className="space-y-4 mt-5">
            <select
              value={form.financialAccountId}
              onChange={(e) =>
                setForm({ ...form, financialAccountId: e.target.value })
              }
              className="w-full border rounded-[14px] px-4 py-3 text-sm"
              required
            >
              <option value="">{t("chooseFinancialAccount")}</option>
              {accounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name}
                </option>
              ))}
            </select>

            <select
              value={form.type}
              onChange={(e) =>
                setForm({ ...form, type: e.target.value as FinanceType })
              }
              className="w-full border rounded-[14px] px-4 py-3 text-sm"
            >
              <option value="INCOME">{t("income")}</option>
              <option value="EXPENSE">{t("expense")}</option>
            </select>

            <input
              required
              type="number"
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
              className="w-full border rounded-[14px] px-4 py-3 text-sm"
              placeholder={t("amount")}
            />

            <input
              type="date"
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
              className="w-full border rounded-[14px] px-4 py-3 text-sm"
            />

            <textarea
              value={form.description}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
              className="w-full border rounded-[14px] px-4 py-3 text-sm min-h-[100px]"
              placeholder={t("description")}
            />

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setModalOpen(false);
                  setEditingTransaction(null);
                  resetForm();
                }}
                className="px-5 py-3 rounded-[16px] border"
              >
                {t("cancel")}
              </button>

              <button
                disabled={saving}
                className="px-5 py-3 rounded-[16px] bg-[#123A5C] text-white font-bold disabled:opacity-50"
              >
                {saving ? t("saving") : t("save")}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {accountModalOpen && (
        <Modal
          title={t("newFinancialAccount")}
          onClose={() => setAccountModalOpen(false)}
          maxWidth="max-w-xl"
        >
          <form onSubmit={createAccount} className="space-y-4 mt-5">
            <input
              required
              value={accountForm.name}
              onChange={(e) =>
                setAccountForm({ ...accountForm, name: e.target.value })
              }
              className="w-full border rounded-[14px] px-4 py-3 text-sm"
              placeholder={t("accountNameExample")}
            />

            <select
              value={accountForm.type}
              onChange={(e) =>
                setAccountForm({ ...accountForm, type: e.target.value })
              }
              className="w-full border rounded-[14px] px-4 py-3 text-sm"
            >
              <option value="CASH">{t("cashRegister")}</option>
              <option value="BANK">{t("bank")}</option>
              <option value="MOBILE_MONEY">{t("mobileMoney")}</option>
              <option value="CARD">{t("card")}</option>
              <option value="OTHER">{t("other")}</option>
            </select>

            <input
              type="number"
              value={accountForm.balance}
              onChange={(e) =>
                setAccountForm({ ...accountForm, balance: e.target.value })
              }
              className="w-full border rounded-[14px] px-4 py-3 text-sm"
              placeholder={t("initialBalance")}
            />

            <input
              value={accountForm.currency}
              onChange={(e) =>
                setAccountForm({ ...accountForm, currency: e.target.value })
              }
              className="w-full border rounded-[14px] px-4 py-3 text-sm"
              placeholder={t("currencyExample")}
            />

            <label className="flex items-center gap-3 text-sm">
              <input
                type="checkbox"
                checked={accountForm.isDefault}
                onChange={(e) =>
                  setAccountForm({
                    ...accountForm,
                    isDefault: e.target.checked,
                  })
                }
              />
              {t("setAsMainAccount")}
            </label>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setAccountModalOpen(false)}
                className="px-5 py-3 rounded-[16px] border"
              >
                {t("cancel")}
              </button>

              <button
                disabled={saving}
                className="px-5 py-3 rounded-[16px] bg-[#123A5C] text-white font-bold disabled:opacity-50"
              >
                {saving ? t("creating") : t("createAccount")}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {detailsTransaction && (
        <Modal
          title={t("transactionDetails")}
          onClose={() => setDetailsTransaction(null)}
          maxWidth="max-w-xl"
        >
          <div className="mt-5 space-y-3 text-sm">
            <Detail
              label={t("description")}
              value={detailsTransaction.description || "-"}
            />
            <Detail
              label={t("account")}
              value={detailsTransaction.financialAccount?.name || "-"}
            />
            <Detail
              label={t("type")}
              value={typeLabel(detailsTransaction.type)}
            />
            <Detail
              label={t("origin")}
              value={originLabel(detailsTransaction.referenceType)}
            />
            <Detail
              label={t("date")}
              value={detailsTransaction.date.slice(0, 10)}
            />
            <Detail
              label={t("amount")}
              value={formatMoney(detailsTransaction.amount)}
              strong
            />
          </div>
        </Modal>
      )}

      {deletingTransaction && (
        <Modal
          title={t("deleteTransactionQuestion")}
          onClose={() => setDeletingTransaction(null)}
          maxWidth="max-w-md"
        >
          <p className="text-slate-600 mt-4">
            {t("deleteTransactionConfirm")}{" "}
            <strong>{formatMoney(deletingTransaction.amount)}</strong>?
          </p>

          <p className="text-sm text-red-500 mt-3">
            {t("onlyManualTransactionsCanBeDeleted")}
          </p>

          <div className="flex justify-end gap-3 mt-6">
            <button
              onClick={() => setDeletingTransaction(null)}
              className="px-5 py-3 rounded-[16px] border"
            >
              {t("cancel")}
            </button>

            <button
              onClick={deleteTransaction}
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
  tone: "green" | "red" | "blue";
}) {
  const styles = {
    green: "bg-green-50 text-green-700",
    red: "bg-red-50 text-red-600",
    blue: "bg-[#123A5C]/10 text-[#123A5C]",
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

          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-slate-100"
          >
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
          strong ? "font-black text-[#123A5C]" : "font-semibold text-slate-800"
        }
      >
        {value}
      </span>
    </div>
  );
}