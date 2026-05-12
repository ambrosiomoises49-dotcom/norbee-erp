"use client";

import { useI18n } from "@/lib/i18n";
import { useEffect, useMemo, useState } from "react";
import {
  ClipboardList,
  Plus,
  Search,
  Pencil,
  Trash2,
  Eye,
  X,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  AlertCircle,
  Banknote,
  Users,
  Store,
  Building2,
  Wallet,
  CalendarDays,
} from "lucide-react";

type EmployeeStatus = "ACTIVE" | "INACTIVE" | "ON_LEAVE";
type PaymentMethod = "CASH" | "CARD" | "MOBILE_MONEY" | "TRANSFER" | "OTHER";
type SalaryPaymentStatus = "PENDING" | "PAID" | "DELAYED";

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

type SalaryPayment = {
  id: string;
  employeeId: string;
  amount: string;
  paymentDate: string;
  referenceMonth: string;
  paymentMethod: PaymentMethod;
  status: SalaryPaymentStatus;
  notes: string | null;
  employee?: Employee;
};

type Employee = {
  id: string;
  cantinaId: string | null;
  fullName: string;
  idNumber: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  role: string;
  salary: string;
  hireDate: string | null;
  status: EmployeeStatus;
  notes: string | null;
  createdAt: string;
  cantina?: Cantina | null;
  salaryPayments?: SalaryPayment[];
};

const ITEMS_PER_PAGE = 5;
const PAYMENTS_PER_PAGE = 5;

function getCurrentReferenceMonth() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

export default function RHClient() {
  const { t, lang } = useI18n();

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [cantinas, setCantinas] = useState<Cantina[]>([]);
  const [payments, setPayments] = useState<SalaryPayment[]>([]);
  const [accounts, setAccounts] = useState<FinancialAccount[]>([]);

  const [loading, setLoading] = useState(true);
  const [currency, setCurrency] = useState("EUR");
  const [saving, setSaving] = useState(false);

  const [search, setSearch] = useState("");
  const [employeePage, setEmployeePage] = useState(1);
  const [paymentPage, setPaymentPage] = useState(1);

  const [statusFilter, setStatusFilter] = useState<"ALL" | EmployeeStatus>(
    "ALL"
  );
  const [cantinaFilter, setCantinaFilter] = useState("ALL");
  const [referenceMonth, setReferenceMonth] = useState(
    getCurrentReferenceMonth()
  );

  const [employeeModalOpen, setEmployeeModalOpen] = useState(false);
  const [payModalOpen, setPayModalOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);

  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [deletingEmployee, setDeletingEmployee] = useState<Employee | null>(
    null
  );
  const [detailsEmployee, setDetailsEmployee] = useState<Employee | null>(null);

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [employeeForm, setEmployeeForm] = useState({
    fullName: "",
    idNumber: "",
    phone: "",
    email: "",
    address: "",
    role: "",
    salary: "",
    hireDate: "",
    cantinaId: "",
    status: "ACTIVE" as EmployeeStatus,
    notes: "",
  });

  const [payForm, setPayForm] = useState({
    employeeId: "",
    amount: "",
    referenceMonth: getCurrentReferenceMonth(),
    paymentDate: new Date().toISOString().slice(0, 10),
    paymentMethod: "CASH" as PaymentMethod,
    financialAccountId: "",
    notes: "",
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

  async function loadRH() {
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/rh");
      const data = await res.json();

      if (!res.ok) {
        setError(data.message || t("rhLoadError"));
        return;
      }

      setEmployees(data.employees || []);
      setCantinas(data.cantinas || []);
      setPayments(data.salaryPayments || []);
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
      setError(t("rhLoadError"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
  const timeout = setTimeout(() => {
    void loadRH();
    void loadCompanyCurrency();
  }, 0);

  return () => clearTimeout(timeout);
}, []);

  const filteredEmployees = useMemo(() => {
    const q = search.toLowerCase().trim();

    return employees.filter((employee) => {
      const matchesSearch =
        !q ||
        employee.fullName.toLowerCase().includes(q) ||
        employee.role.toLowerCase().includes(q) ||
        (employee.phone || "").toLowerCase().includes(q) ||
        (employee.email || "").toLowerCase().includes(q) ||
        (employee.cantina?.name || "").toLowerCase().includes(q);

      const matchesStatus =
        statusFilter === "ALL" || employee.status === statusFilter;

      const matchesCantina =
        cantinaFilter === "ALL" ||
        (cantinaFilter === "GENERAL" && !employee.cantinaId) ||
        employee.cantinaId === cantinaFilter;

      return matchesSearch && matchesStatus && matchesCantina;
    });
  }, [employees, search, statusFilter, cantinaFilter]);

  const employeeTotalPages = Math.max(
    1,
    Math.ceil(filteredEmployees.length / ITEMS_PER_PAGE)
  );

  const paginatedEmployees = filteredEmployees.slice(
    (employeePage - 1) * ITEMS_PER_PAGE,
    employeePage * ITEMS_PER_PAGE
  );

  const filteredPayments = useMemo(() => {
    return payments.filter((payment) => {
      if (!referenceMonth) return true;
      return payment.referenceMonth === referenceMonth;
    });
  }, [payments, referenceMonth]);

  const paymentTotalPages = Math.max(
    1,
    Math.ceil(filteredPayments.length / PAYMENTS_PER_PAGE)
  );

  const paginatedPayments = filteredPayments.slice(
    (paymentPage - 1) * PAYMENTS_PER_PAGE,
    paymentPage * PAYMENTS_PER_PAGE
  );

  const stats = useMemo(() => {
    const active = employees.filter((e) => e.status === "ACTIVE");

    const payroll = active.reduce(
      (sum, e) => sum + Number(e.salary || 0),
      0
    );

    const paidThisMonth = payments
      .filter(
        (p) =>
          p.referenceMonth === referenceMonth &&
          p.status === "PAID"
      )
      .reduce((sum, p) => sum + Number(p.amount || 0), 0);

    const paidEmployeeIds = new Set(
      payments
        .filter(
          (p) =>
            p.referenceMonth === referenceMonth &&
            p.status === "PAID"
        )
        .map((p) => p.employeeId)
    );

    const pendingCount = active.filter(
      (e) => !paidEmployeeIds.has(e.id)
    ).length;

    return {
      activeCount: active.length,
      payroll,
      paidThisMonth,
      pendingCount,
      totalEmployees: employees.length,
    };
  }, [employees, payments, referenceMonth]);

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

  function statusLabel(status: EmployeeStatus) {
    if (status === "ACTIVE") return t("active");
    if (status === "ON_LEAVE") return t("leave");
    return t("inactive");
  }

  function statusClass(status: EmployeeStatus) {
    if (status === "ACTIVE")
      return "bg-green-50 text-green-700";

    if (status === "ON_LEAVE")
      return "bg-yellow-50 text-yellow-700";

    return "bg-red-50 text-red-600";
  }

  function paymentMethodLabel(method: PaymentMethod) {
    if (method === "CASH") return t("cash");
    if (method === "CARD") return t("card");
    if (method === "MOBILE_MONEY") return t("mobileMoney");
    if (method === "TRANSFER") return t("transfer");
    return t("other");
  }function paymentStatusLabel(status: SalaryPaymentStatus) {
    if (status === "PAID") return t("paid");
    if (status === "DELAYED") return t("delayed");
    return t("pending");
  }

  function paymentStatusClass(status: SalaryPaymentStatus) {
    if (status === "PAID")
      return "bg-green-50 text-green-700";

    if (status === "DELAYED")
      return "bg-red-50 text-red-600";

    return "bg-yellow-50 text-yellow-700";
  }

  function resetEmployeeForm() {
    setEmployeeForm({
      fullName: "",
      idNumber: "",
      phone: "",
      email: "",
      address: "",
      role: "",
      salary: "",
      hireDate: "",
      cantinaId: "",
      status: "ACTIVE",
      notes: "",
    });
  }

  function resetPayForm() {
    const defaultAccount = accounts.find((a) => a.isDefault);

    setPayForm({
      employeeId: "",
      amount: "",
      referenceMonth: getCurrentReferenceMonth(),
      paymentDate: new Date().toISOString().slice(0, 10),
      paymentMethod: "CASH",
      financialAccountId:
        defaultAccount?.id || accounts[0]?.id || "",
      notes: "",
    });
  }

  function openNewEmployee() {
    setEditingEmployee(null);
    resetEmployeeForm();
    setEmployeeModalOpen(true);
  }

  function openEditEmployee(employee: Employee) {
    setEditingEmployee(employee);

    setEmployeeForm({
      fullName: employee.fullName,
      idNumber: employee.idNumber || "",
      phone: employee.phone || "",
      email: employee.email || "",
      address: employee.address || "",
      role: employee.role,
      salary: employee.salary,
      hireDate: employee.hireDate
        ? employee.hireDate.slice(0, 10)
        : "",
      cantinaId: employee.cantinaId || "",
      status: employee.status,
      notes: employee.notes || "",
    });

    setEmployeeModalOpen(true);
  }

  async function saveEmployee(
    e: React.FormEvent<HTMLFormElement>
  ) {
    e.preventDefault();

    setSaving(true);
    setError("");
    setMessage("");

    try {
      const url = editingEmployee
        ? `/api/rh/${editingEmployee.id}`
        : "/api/rh";

      const method = editingEmployee ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(employeeForm),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || t("employeeSaveError"));
        return;
      }

      setMessage(
        data.message || t("employeeSavedSuccess")
      );

      setEmployeeModalOpen(false);
      setEditingEmployee(null);
      resetEmployeeForm();

      await loadRH();
    } catch {
      setError(t("employeeSaveError"));
    } finally {
      setSaving(false);
    }
  }

  async function deleteEmployee() {
    if (!deletingEmployee) return;

    setSaving(true);
    setError("");
    setMessage("");

    try {
      const res = await fetch(
        `/api/rh/${deletingEmployee.id}`,
        {
          method: "DELETE",
        }
      );

      const data = await res.json();

      if (!res.ok) {
        setError(
          data.message || t("employeeDeleteError")
        );
        return;
      }

      setMessage(
        data.message || t("employeeDeletedSuccess")
      );

      setDeletingEmployee(null);

      await loadRH();
    } catch {
      setError(t("employeeDeleteError"));
    } finally {
      setSaving(false);
    }
  }

  function openPayModal(employee?: Employee) {
    resetPayForm();

    if (employee) {
      setPayForm((prev) => ({
        ...prev,
        employeeId: employee.id,
        amount: employee.salary,
      }));
    }

    setPayModalOpen(true);
  }

  async function registerPayment(
    e: React.FormEvent<HTMLFormElement>
  ) {
    e.preventDefault();

    setSaving(true);
    setError("");
    setMessage("");

    try {
      const res = await fetch("/api/rh/pay", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payForm),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || t("paymentError"));
        return;
      }

      setMessage(
        data.message || t("salaryPaidSuccess")
      );

      setPayModalOpen(false);

      resetPayForm();

      await loadRH();
    } catch {
      setError(t("paymentError"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">
            {t("humanResources")}
          </h1>

          <p className="text-sm text-slate-500">
            {t("humanResourcesDescription")}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setHistoryOpen(true)}
            className="rounded-[14px] border px-4 py-2.5 text-sm font-semibold text-[#123A5C] hover:bg-[#123A5C] hover:text-white flex items-center gap-2"
          >
            <CalendarDays size={16} />
            {t("salaryHistory")}
          </button>

          <button
            onClick={() => openPayModal()}
            className="rounded-[14px] border px-4 py-2.5 text-sm font-semibold text-[#123A5C] hover:bg-[#123A5C] hover:text-white flex items-center gap-2"
          >
            <Wallet size={16} />
            {t("paySalary")}
          </button>

          <button
            onClick={openNewEmployee}
            className="rounded-[14px] bg-[#123A5C] px-4 py-2.5 text-white text-sm font-semibold flex items-center gap-2 hover:bg-[#0B2540]"
          >
            <Plus size={16} />
            {t("newEmployee")}
          </button>
        </div>
      </div>

      {(error || message) && (
        <div
          className={`rounded-[16px] px-4 py-3 text-sm flex items-center gap-2 ${
            error
              ? "bg-red-50 text-red-600"
              : "bg-green-50 text-green-700"
          }`}
        >
          {error ? (
            <AlertCircle size={17} />
          ) : (
            <CheckCircle2 size={17} />
          )}

          {error || message}
        </div>
      )}

      <div className="grid grid-cols-2 xl:grid-cols-5 gap-3">
        <StatCard
          title={t("activeEmployees")}
          value={stats.activeCount}
          icon={<Users size={20} />}
          tone="blue"
        />

        <StatCard
          title={t("monthlyPayroll")}
          value={formatMoney(stats.payroll)}
          icon={<Banknote size={20} />}
          tone="green"
        />

        <StatCard
          title={t("paidThisMonth")}
          value={formatMoney(stats.paidThisMonth)}
          icon={<Wallet size={20} />}
          tone="green"
        />

        <StatCard
          title={t("pendingPayments")}
          value={stats.pendingCount}
          icon={<AlertCircle size={20} />}
          tone="red"
        />

        <StatCard
          title={t("employees")}
          value={stats.totalEmployees}
          icon={<ClipboardList size={20} />}
          tone="blue"
        />
      </div>

      <div className="bg-white rounded-[22px] shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-4 border-b border-slate-100 space-y-3">
          <div className="flex items-center gap-2 text-[#123A5C] font-bold">
            <Search size={17} />
            {t("employeeFilters")}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="relative">
              <Search
                size={17}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <input
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setEmployeePage(1);
                }}
                placeholder={t("searchEmployee")}
                className="w-full rounded-[14px] border pl-10 pr-4 py-3 text-sm"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(
                  e.target.value as
                    | "ALL"
                    | EmployeeStatus
                );

                setEmployeePage(1);
              }}
              className="rounded-[14px] border px-4 py-3 text-sm"
            >
              <option value="ALL">
                {t("allStatuses")}
              </option>

              <option value="ACTIVE">
                {t("active")}
              </option>

              <option value="ON_LEAVE">
                {t("leave")}
              </option>

              <option value="INACTIVE">
                {t("inactive")}
              </option>
            </select>

            <select
              value={cantinaFilter}
              onChange={(e) => {
                setCantinaFilter(e.target.value);
                setEmployeePage(1);
              }}
              className="rounded-[14px] border px-4 py-3 text-sm"
            >
              <option value="ALL">
                {t("allCantinas")}
              </option>

              <option value="GENERAL">
                {t("generalAdministration")}
              </option>

              {cantinas.map((cantina) => (
                <option
                  key={cantina.id}
                  value={cantina.id}
                >
                  {cantina.name}
                </option>
              ))}
            </select>

            <input
              type="month"
              value={referenceMonth}
              onChange={(e) =>
                setReferenceMonth(e.target.value)
              }
              className="rounded-[14px] border px-4 py-3 text-sm"
            />
          </div>
        </div>{loading ? (
          <div className="p-10 text-center text-slate-500">
            {t("loadingHr")}
          </div>
        ) : paginatedEmployees.length === 0 ? (
          <div className="p-10 text-center text-slate-500">
            {t("noEmployeeFound")}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1150px] text-left text-sm">
                <thead className="bg-slate-50 text-slate-500">
                  <tr>
                    <th className="px-5 py-3">{t("employee")}</th>
                    <th className="px-5 py-3">{t("application")}</th>
                    <th className="px-5 py-3">{t("role")}</th>
                    <th className="px-5 py-3">{t("baseSalary")}</th>
                    <th className="px-5 py-3">{t("status")}</th>
                    <th className="px-5 py-3">{t("monthlyPayment")}</th>
                    <th className="px-5 py-3 text-right">{t("actions")}</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {paginatedEmployees.map((employee) => {
                    const paid = payments.find(
                      (p) =>
                        p.employeeId === employee.id &&
                        p.referenceMonth === referenceMonth &&
                        p.status === "PAID"
                    );

                    return (
                      <tr key={employee.id} className="hover:bg-slate-50">
                        <td className="px-5 py-3">
                          <p className="font-semibold text-slate-800">
                            {employee.fullName}
                          </p>
                          <p className="text-xs text-slate-500">
                            {employee.phone || employee.email || "-"}
                          </p>
                        </td>

                        <td className="px-5 py-3">
                          {employee.cantina ? (
                            <span className="inline-flex items-center gap-1">
                              <Store size={14} />
                              {employee.cantina.name} — {employee.cantina.code}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1">
                              <Building2 size={14} />
                              {t("general")}
                            </span>
                          )}
                        </td>

                        <td className="px-5 py-3">{employee.role}</td>

                        <td className="px-5 py-3 font-black text-[#123A5C]">
                          {formatMoney(employee.salary)}
                        </td>

                        <td className="px-5 py-3">
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-semibold ${statusClass(
                              employee.status
                            )}`}
                          >
                            {statusLabel(employee.status)}
                          </span>
                        </td>

                        <td className="px-5 py-3">
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-semibold ${
                              paid
                                ? "bg-green-50 text-green-700"
                                : "bg-yellow-50 text-yellow-700"
                            }`}
                          >
                            {paid ? t("paid") : t("pending")}
                          </span>
                        </td>

                        <td className="px-5 py-3">
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => setDetailsEmployee(employee)}
                              className="p-2 rounded-xl hover:bg-slate-100 text-slate-600"
                              title={t("viewDetails")}
                            >
                              <Eye size={18} />
                            </button>

                            <button
                              onClick={() => openPayModal(employee)}
                              disabled={employee.status !== "ACTIVE" || !!paid}
                              className="p-2 rounded-xl hover:bg-green-50 text-green-700 disabled:opacity-30"
                              title={t("paySalary")}
                            >
                              <Banknote size={18} />
                            </button>

                            <button
                              onClick={() => openEditEmployee(employee)}
                              className="p-2 rounded-xl hover:bg-blue-50 text-blue-600"
                              title={t("editEmployee")}
                            >
                              <Pencil size={18} />
                            </button>

                            <button
                              onClick={() => setDeletingEmployee(employee)}
                              className="p-2 rounded-xl hover:bg-red-50 text-red-600"
                              title={t("removeEmployee")}
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <Pagination
              page={employeePage}
              totalPages={employeeTotalPages}
              t={t}
              onPrev={() => setEmployeePage((p) => Math.max(1, p - 1))}
              onNext={() =>
                setEmployeePage((p) => Math.min(employeeTotalPages, p + 1))
              }
            />
          </>
        )}
      </div>

      {employeeModalOpen && (
        <Modal
          title={editingEmployee ? t("editEmployee") : t("newEmployee")}
          onClose={() => {
            setEmployeeModalOpen(false);
            setEditingEmployee(null);
            resetEmployeeForm();
          }}
          maxWidth="max-w-3xl"
        >
          <form
            onSubmit={saveEmployee}
            className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-5"
          >
            <Input
              label={t("fullName")}
              required
              value={employeeForm.fullName}
              onChange={(value) =>
                setEmployeeForm({ ...employeeForm, fullName: value })
              }
            />

            <Input
              label={t("identityDocument")}
              value={employeeForm.idNumber}
              onChange={(value) =>
                setEmployeeForm({ ...employeeForm, idNumber: value })
              }
            />

            <Input
              label={t("phone")}
              value={employeeForm.phone}
              onChange={(value) =>
                setEmployeeForm({ ...employeeForm, phone: value })
              }
            />

            <Input
              label={t("email")}
              value={employeeForm.email}
              onChange={(value) =>
                setEmployeeForm({ ...employeeForm, email: value })
              }
            />

            <Input
              label={t("role")}
              required
              value={employeeForm.role}
              onChange={(value) =>
                setEmployeeForm({ ...employeeForm, role: value })
              }
            />

            <Input
              label={t("baseSalary")}
              type="number"
              value={employeeForm.salary}
              onChange={(value) =>
                setEmployeeForm({ ...employeeForm, salary: value })
              }
            />

            <div>
              <label className="text-xs text-slate-500">
                {t("application")}
              </label>
              <select
                value={employeeForm.cantinaId}
                onChange={(e) =>
                  setEmployeeForm({
                    ...employeeForm,
                    cantinaId: e.target.value,
                  })
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
                {t("hireDate")}
              </label>
              <input
                type="date"
                value={employeeForm.hireDate}
                onChange={(e) =>
                  setEmployeeForm({
                    ...employeeForm,
                    hireDate: e.target.value,
                  })
                }
                className="mt-1 w-full border rounded-[14px] px-4 py-3 text-sm"
              />
            </div>

            <div>
              <label className="text-xs text-slate-500">
                {t("status")}
              </label>
              <select
                value={employeeForm.status}
                onChange={(e) =>
                  setEmployeeForm({
                    ...employeeForm,
                    status: e.target.value as EmployeeStatus,
                  })
                }
                className="mt-1 w-full border rounded-[14px] px-4 py-3 text-sm"
              >
                <option value="ACTIVE">{t("active")}</option>
                <option value="ON_LEAVE">{t("leave")}</option>
                <option value="INACTIVE">{t("inactive")}</option>
              </select>
            </div>

            <Input
              label={t("address")}
              value={employeeForm.address}
              onChange={(value) =>
                setEmployeeForm({ ...employeeForm, address: value })
              }
            />

            <div className="md:col-span-2">
              <label className="text-xs text-slate-500">{t("notes")}</label>
              <textarea
                value={employeeForm.notes}
                onChange={(e) =>
                  setEmployeeForm({
                    ...employeeForm,
                    notes: e.target.value,
                  })
                }
                className="mt-1 w-full border rounded-[14px] px-4 py-3 text-sm min-h-[90px]"
              />
            </div>

            <div className="md:col-span-2 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setEmployeeModalOpen(false);
                  setEditingEmployee(null);
                  resetEmployeeForm();
                }}
                className="px-5 py-3 rounded-[16px] border"
              >
                {t("cancel")}
              </button>

              <button
                disabled={saving}
                className="px-5 py-3 rounded-[16px] bg-[#123A5C] text-white font-bold disabled:opacity-50"
              >
                {saving ? t("saving") : t("saveEmployee")}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {payModalOpen && (
        <Modal
          title={t("paySalary")}
          onClose={() => {
            setPayModalOpen(false);
            resetPayForm();
          }}
          maxWidth="max-w-2xl"
        >
          <form
            onSubmit={registerPayment}
            className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-5"
          >
            <div>
              <label className="text-xs text-slate-500">{t("employee")}</label>
              <select
                required
                value={payForm.employeeId}
                onChange={(e) =>
                  setPayForm({
                    ...payForm,
                    employeeId: e.target.value,
                    amount:
                      employees.find((emp) => emp.id === e.target.value)
                        ?.salary || "",
                  })
                }
                className="mt-1 w-full border rounded-[14px] px-4 py-3 text-sm"
              >
                <option value="">{t("chooseEmployee")}</option>
                {employees
                  .filter((employee) => employee.status === "ACTIVE")
                  .map((employee) => (
                    <option key={employee.id} value={employee.id}>
                      {employee.fullName} — {formatMoney(employee.salary)}
                    </option>
                  ))}
              </select>
            </div>

            <Input
              label={t("realPaidAmount")}
              type="number"
              required
              value={payForm.amount}
              onChange={(value) => setPayForm({ ...payForm, amount: value })}
            />

            <div>
              <label className="text-xs text-slate-500">
                {t("referenceMonth")}
              </label>
              <input
                type="month"
                required
                value={payForm.referenceMonth}
                onChange={(e) =>
                  setPayForm({
                    ...payForm,
                    referenceMonth: e.target.value,
                  })
                }
                className="mt-1 w-full border rounded-[14px] px-4 py-3 text-sm"
              />
            </div>

            <div>
              <label className="text-xs text-slate-500">
                {t("paymentDate")}
              </label>
              <input
                type="date"
                value={payForm.paymentDate}
                onChange={(e) =>
                  setPayForm({ ...payForm, paymentDate: e.target.value })
                }
                className="mt-1 w-full border rounded-[14px] px-4 py-3 text-sm"
              />
            </div>

            <div>
              <label className="text-xs text-slate-500">{t("method")}</label>
              <select
                value={payForm.paymentMethod}
                onChange={(e) =>
                  setPayForm({
                    ...payForm,
                    paymentMethod: e.target.value as PaymentMethod,
                  })
                }
                className="mt-1 w-full border rounded-[14px] px-4 py-3 text-sm"
              >
                <option value="CASH">{t("cash")}</option>
                <option value="CARD">{t("card")}</option>
                <option value="MOBILE_MONEY">{t("mobileMoney")}</option>
                <option value="TRANSFER">{t("transfer")}</option>
                <option value="OTHER">{t("other")}</option>
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

            <div className="md:col-span-2">
              <label className="text-xs text-slate-500">{t("notes")}</label>
              <textarea
                value={payForm.notes}
                onChange={(e) =>
                  setPayForm({ ...payForm, notes: e.target.value })
                }
                className="mt-1 w-full border rounded-[14px] px-4 py-3 text-sm min-h-[90px]"
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
      )}{historyOpen && (
        <div className="fixed left-[200px] top-[110px] right-0 bottom-0 z-40 bg-[#F4F7FA] p-5 overflow-hidden">
          <div className="h-full bg-white rounded-[24px] shadow-xl flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <div>
                <h2 className="text-2xl font-bold text-slate-800">
                  {t("salaryHistory")}
                </h2>
                <p className="text-sm text-slate-500">
                  {t("salaryHistoryDescription")}
                </p>
              </div>

              <button onClick={() => setHistoryOpen(false)} className="p-2 rounded-xl hover:bg-slate-100">
                <X size={24} />
              </button>
            </div>

            <div className="p-5 flex-1 flex flex-col overflow-hidden">
              <div className="mb-4 max-w-xs">
                <input
                  type="month"
                  value={referenceMonth}
                  onChange={(e) => {
                    setReferenceMonth(e.target.value);
                    setPaymentPage(1);
                  }}
                  className="w-full rounded-[14px] border px-4 py-3 text-sm"
                />
              </div>

              <div className="flex-1 overflow-x-auto border rounded-[20px]">
                <table className="w-full min-w-[1000px] text-left text-sm">
                  <thead className="bg-slate-50 text-slate-500">
                    <tr>
                      <th className="px-5 py-3">{t("employee")}</th>
                      <th className="px-5 py-3">{t("application")}</th>
                      <th className="px-5 py-3">{t("month")}</th>
                      <th className="px-5 py-3">{t("date")}</th>
                      <th className="px-5 py-3">{t("method")}</th>
                      <th className="px-5 py-3">{t("amount")}</th>
                      <th className="px-5 py-3">{t("status")}</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y">
                    {paginatedPayments.map((payment) => (
                      <tr key={payment.id} className="hover:bg-slate-50">
                        <td className="px-5 py-3 font-semibold">
                          {payment.employee?.fullName || "-"}
                        </td>

                        <td className="px-5 py-3">
                          {payment.employee?.cantina
                            ? `${payment.employee.cantina.name} — ${payment.employee.cantina.code}`
                            : t("general")}
                        </td>

                        <td className="px-5 py-3">{payment.referenceMonth}</td>
                        <td className="px-5 py-3">{payment.paymentDate.slice(0, 10)}</td>
                        <td className="px-5 py-3">{paymentMethodLabel(payment.paymentMethod)}</td>
                        <td className="px-5 py-3 font-black text-red-600">{formatMoney(payment.amount)}</td>

                        <td className="px-5 py-3">
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${paymentStatusClass(payment.status)}`}>
                            {paymentStatusLabel(payment.status)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <Pagination
                page={paymentPage}
                totalPages={paymentTotalPages}
                t={t}
                onPrev={() => setPaymentPage((p) => Math.max(1, p - 1))}
                onNext={() => setPaymentPage((p) => Math.min(paymentTotalPages, p + 1))}
              />
            </div>
          </div>
        </div>
      )}

      {detailsEmployee && (
        <Modal title={t("employeeDetails")} onClose={() => setDetailsEmployee(null)} maxWidth="max-w-xl">
          <div className="mt-5 space-y-3 text-sm">
            <Detail label={t("name")} value={detailsEmployee.fullName} />
            <Detail label={t("role")} value={detailsEmployee.role} />
            <Detail label={t("salary")} value={formatMoney(detailsEmployee.salary)} strong />
            <Detail
              label={t("application")}
              value={
                detailsEmployee.cantina
                  ? `${detailsEmployee.cantina.name} — ${detailsEmployee.cantina.code}`
                  : t("companyGeneral")
              }
            />
            <Detail label={t("phone")} value={detailsEmployee.phone || "-"} />
            <Detail label={t("email")} value={detailsEmployee.email || "-"} />
            <Detail label={t("status")} value={statusLabel(detailsEmployee.status)} />
            <Detail
              label={t("hireDate")}
              value={detailsEmployee.hireDate ? detailsEmployee.hireDate.slice(0, 10) : "-"}
            />
            <Detail label={t("notes")} value={detailsEmployee.notes || "-"} />
          </div>
        </Modal>
      )}

      {deletingEmployee && (
        <Modal title={t("removeEmployeeQuestion")} onClose={() => setDeletingEmployee(null)} maxWidth="max-w-md">
          <p className="text-slate-600 mt-4">
            {t("removeEmployeeConfirm")} <strong>{deletingEmployee.fullName}</strong>?
          </p>

          <p className="text-sm text-red-500 mt-3">
            {t("removeEmployeeWarning")}
          </p>

          <div className="flex justify-end gap-3 mt-6">
            <button onClick={() => setDeletingEmployee(null)} className="px-5 py-3 rounded-[16px] border">
              {t("cancel")}
            </button>

            <button
              onClick={deleteEmployee}
              disabled={saving}
              className="px-5 py-3 rounded-[16px] bg-red-600 text-white font-bold disabled:opacity-50"
            >
              {saving ? t("removing") : t("confirm")}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}function StatCard({
  title,
  value,
  icon,
  tone,
}: {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  tone: "blue" | "green" | "yellow" | "red";
}) {
  const styles = {
    blue: "bg-[#123A5C]/10 text-[#123A5C]",
    green: "bg-green-50 text-green-700",
    yellow: "bg-yellow-50 text-yellow-700",
    red: "bg-red-50 text-red-600",
  };

  return (
    <div className="bg-white rounded-[18px] p-4 shadow-sm border border-slate-100 flex items-center gap-3 min-w-0">
      <div className={`w-10 h-10 rounded-[14px] flex items-center justify-center shrink-0 ${styles[tone]}`}>
        {icon}
      </div>

      <div className="min-w-0">
        <p className="text-xs text-slate-500 truncate">{title}</p>
        <p className="text-base xl:text-lg font-black text-slate-800 truncate">{value}</p>
      </div>
    </div>
  );
}

function Input({
  label,
  value,
  onChange,
  type = "text",
  required = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label className="text-xs text-slate-500">{label}</label>
      <input
        required={required}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full border rounded-[14px] px-4 py-3 text-sm"
      />
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
      <div className={`bg-white rounded-[24px] shadow-xl w-full ${maxWidth} p-6 overflow-auto max-h-[90vh]`}>
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

      <span className={strong ? "font-black text-[#123A5C]" : "font-semibold text-slate-800"}>
        {value}
      </span>
    </div>
  );
}