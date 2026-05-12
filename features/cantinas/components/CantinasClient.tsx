"use client";

import { useI18n } from "@/lib/i18n";
import { useCallback, useEffect, useState } from "react";
import {
  Store,
  Plus,
  Power,
  Pencil,
  Eye,
  Trash2,
  ChevronLeft,
  ChevronRight,
  BarChart3,
} from "lucide-react";

import { useRouter } from "next/navigation";
import CantinaPerformanceComparison from "./CantinaPerformanceComparison";

export type Cantina = {
  id: string;
  code: string;
  name: string;
  location: string | null;
  openingDate: string | null;
  openingCash: string;
  availableMachines: string | null;
  status: "ACTIVE" | "INACTIVE";

  user?: {
    identifier: string;
    status: "ACTIVE" | "INACTIVE";
    lastLoginAt: string | null;
  } | null;

  _count?: {
    sales: number;
    employees: number;
    costs: number;
  };

  performance?: {
    currentMonthSales: number;
    currentMonthCosts: number;
    currentMonthProfit: number;
    growthPercent: number;
    monthlySales: number[];
    dailySales: Record<string, number>;
  };
};

const ITEMS_PER_PAGE = 3;

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export default function CantinasClient() {
  const { t } = useI18n();
  const router = useRouter();

  const [cantinas, setCantinas] = useState<Cantina[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [comparisonOpen, setComparisonOpen] = useState(false);
  const [error, setError] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [companySlug, setCompanySlug] = useState("millenor");

  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selectedCantina, setSelectedCantina] = useState<Cantina | null>(null);

  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [form, setForm] = useState({
    name: "",
    code: "",
    location: "",
    openingDate: "",
    openingCash: "",
    availableMachines: "",
    identifier: "",
    password: "",
  });

  const loadCantinas = useCallback(async () => {
    queueMicrotask(() => setLoading(true));
    setError("");

    try {
      const res = await fetch("/api/cantinas");
      const data = await res.json();

      if (!res.ok) {
        setError(data.message || t("cantinaLoadError"));
        return;
      }

      setCantinas(data.cantinas || []);

      if (data.companySlug) {
        setCompanySlug(data.companySlug);
      }
    } catch {
      setError(t("cantinaLoadError"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
  const timeout = setTimeout(() => {
    void loadCantinas();
  }, 0);

  return () => clearTimeout(timeout);
}, [loadCantinas]);

  function generateIdentifier(cantinaName: string) {
    const cantinaSlug = slugify(cantinaName);
    if (!cantinaSlug) return "";
    return `${cantinaSlug}@${companySlug}`;
  }

  function updateName(name: string) {
    setForm((prev) => ({
      ...prev,
      name,
      identifier: generateIdentifier(name),
    }));
  }

  function resetForm() {
    setForm({
      name: "",
      code: "",
      location: "",
      openingDate: "",
      openingCash: "",
      availableMachines: "",
      identifier: "",
      password: "",
    });
  }

  async function createCantina(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setCreating(true);

    if (!form.name.trim()) {
      setError(t("cantinaNameRequired"));
      setCreating(false);
      return;
    }

    if (!form.code.trim()) {
      setError(t("cantinaCodeRequired"));
      setCreating(false);
      return;
    }

    if (!form.identifier.trim()) {
      setError(t("cantinaIdentifierNotGenerated"));
      setCreating(false);
      return;
    }

    if (!form.password.trim()) {
      setError(t("cantinaPasswordRequired"));
      setCreating(false);
      return;
    }

    try {
      const res = await fetch("/api/cantinas", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || t("cantinaCreateError"));
        return;
      }

      resetForm();
      setCurrentPage(1);
      setModalOpen(false);
      await loadCantinas();
    } catch {
      setError(t("cantinaCreateError"));
    } finally {
      setCreating(false);
    }
  }

  async function toggleStatus(cantina: Cantina) {
    const nextStatus = cantina.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";

    try {
      await fetch(`/api/cantinas/${cantina.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          status: nextStatus,
        }),
      });

      await loadCantinas();
    } catch {
      setError(t("cantinaStatusError"));
    }
  }

  const totalPages = Math.max(1, Math.ceil(cantinas.length / ITEMS_PER_PAGE));

  const paginatedCantinas = cantinas.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  function openEditModal(cantina: Cantina) {
    setSelectedCantina(cantina);
    setForm({
      name: cantina.name,
      code: cantina.code,
      location: cantina.location || "",
      openingDate: cantina.openingDate
        ? cantina.openingDate.slice(0, 10)
        : "",
      openingCash: String(cantina.openingCash || ""),
      availableMachines: cantina.availableMachines || "",
      identifier: cantina.user?.identifier || "",
      password: "",
    });
    setEditOpen(true);
  }

  async function updateCantina(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!selectedCantina) return;

    setEditing(true);
    setError("");

    try {
      const res = await fetch(`/api/cantinas/${selectedCantina.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: form.name,
          location: form.location,
          openingDate: form.openingDate,
          openingCash: form.openingCash,
          availableMachines: form.availableMachines,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || t("cantinaEditError"));
        return;
      }

      setEditOpen(false);
      setSelectedCantina(null);
      await loadCantinas();
    } catch {
      setError(t("cantinaEditError"));
    } finally {
      setEditing(false);
    }
  }

  function openDeleteModal(cantina: Cantina) {
    setSelectedCantina(cantina);
    setDeleteOpen(true);
  }

  async function deleteCantina() {
    if (!selectedCantina) return;

    setDeleting(true);
    setError("");

    try {
      const res = await fetch(`/api/cantinas/${selectedCantina.id}`, {
        method: "DELETE",
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || t("cantinaDeleteError"));
        return;
      }

      setDeleteOpen(false);
      setSelectedCantina(null);
      await loadCantinas();
    } catch {
      setError(t("cantinaDeleteError"));
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">
            {t("allCantinas")}
          </h1>

          <p className="text-slate-500 mt-1">
            {t("cantinasDescription")}
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => setComparisonOpen(true)}
            disabled={cantinas.length === 0}
            className="rounded-[18px] border border-[#123A5C] px-5 py-3 text-[#123A5C] font-semibold hover:bg-[#123A5C] hover:text-white transition flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <BarChart3 size={20} />
            {t("compare")}
          </button>

          <button
            onClick={() => setModalOpen(true)}
            className="rounded-[18px] bg-[#123A5C] px-5 py-3 text-white font-semibold hover:bg-[#0B2540] flex items-center gap-2"
          >
            <Plus size={20} />
            {t("createCantina")}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-[20px] p-5 shadow-sm">
          <p className="text-sm text-slate-500">{t("total")}</p>
          <h2 className="text-3xl font-bold">{cantinas.length}</h2>
        </div>

        <div className="bg-white rounded-[20px] p-5 shadow-sm">
          <p className="text-sm text-slate-500">{t("activePlural")}</p>
          <h2 className="text-3xl font-bold text-green-600">
            {cantinas.filter((c) => c.status === "ACTIVE").length}
          </h2>
        </div>

        <div className="bg-white rounded-[20px] p-5 shadow-sm">
          <p className="text-sm text-slate-500">{t("inactivePlural")}</p>
          <h2 className="text-3xl font-bold text-red-500">
            {cantinas.filter((c) => c.status === "INACTIVE").length}
          </h2>
        </div>
      </div>

      <div className="bg-white rounded-[20px] shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-10 text-center text-slate-500">
            {t("loadingCantinas")}
          </div>
        ) : cantinas.length === 0 ? (
          <div className="p-10 text-center">
            <div className="flex justify-center mb-6">
              <div className="animate-cantinaMove rounded-full bg-red-500/10 p-8">
                <Store size={90} className="text-[#123A5C]" />
              </div>
            </div>

            <h2 className="text-xl font-bold text-slate-800">
              {t("noCantinaCreated")}
            </h2>

            <p className="text-slate-500 mt-2">
              {t("createFirstCantinaHint")}
            </p>

            <button
              onClick={() => setModalOpen(true)}
              className="mt-6 rounded-[18px] bg-[#123A5C] px-5 py-3 text-white font-semibold hover:bg-[#0B2540] inline-flex items-center gap-2"
            >
              <Plus size={20} />
              {t("createFirstCantina")}
            </button>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-left">
                <thead className="bg-slate-50 text-slate-500 text-sm">
                  <tr>
                    <th className="px-6 py-4">{t("cantina")}</th>
                    <th className="px-6 py-4">{t("location")}</th>
                    <th className="px-6 py-4">{t("identifier")}</th>
                    <th className="px-6 py-4">{t("status")}</th>
                    <th className="px-6 py-4">{t("sales")}</th>
                    <th className="px-6 py-4">{t("hr")}</th>
                    <th className="px-6 py-4 text-right">{t("actions")}</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {paginatedCantinas.map((cantina) => (
                    <tr key={cantina.id} className="hover:bg-slate-50">
                      <td className="px-6 py-4">
                        <p className="font-semibold text-slate-800">
                          {cantina.name}
                        </p>
                        <p className="text-sm text-slate-500">
                          {t("code")}: {cantina.code}
                        </p>
                      </td>

                      <td className="px-6 py-4 text-slate-600">
                        {cantina.location || "-"}
                      </td>

                      <td className="px-6 py-4 text-slate-600">
                        {cantina.user?.identifier || "-"}
                      </td>

                      <td className="px-6 py-4">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-semibold ${
                            cantina.status === "ACTIVE"
                              ? "bg-green-50 text-green-700"
                              : "bg-red-50 text-red-600"
                          }`}
                        >
                          {cantina.status === "ACTIVE"
                            ? t("active")
                            : t("inactive")}
                        </span>
                      </td>

                      <td className="px-6 py-4">
                        {cantina._count?.sales || 0}
                      </td>

                      <td className="px-6 py-4">
                        {cantina._count?.employees || 0}
                      </td>

                      <td className="px-6 py-4">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => router.push(`/cantinas/${cantina.id}`)}
                            className="p-2 rounded-xl hover:bg-slate-100 text-slate-600"
                            title={t("viewDetails")}
                          >
                            <Eye size={18} />
                          </button>

                          <button
                            onClick={() => openEditModal(cantina)}
                            className="p-2 rounded-xl hover:bg-slate-100 text-slate-600"
                            title={t("edit")}
                          >
                            <Pencil size={18} />
                          </button>

                          <button
                            onClick={() => toggleStatus(cantina)}
                            className="p-2 rounded-xl hover:bg-slate-100 text-slate-600"
                            title={t("activateDeactivate")}
                          >
                            <Power size={18} />
                          </button>

                          <button
                            onClick={() => openDeleteModal(cantina)}
                            className="p-2 rounded-xl hover:bg-red-50 text-red-600"
                            title={t("deletePermanently")}
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

            {totalPages > 1 && (
              <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100">
                <p className="text-sm text-slate-500">
                  {t("page")} {currentPage} {t("of")} {totalPages}
                </p>

                <div className="flex items-center gap-2">
                  <button
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage((p) => p - 1)}
                    className="p-2 rounded-xl border disabled:opacity-40"
                  >
                    <ChevronLeft size={18} />
                  </button>

                  {Array.from({ length: totalPages }).map((_, index) => (
                    <button
                      key={index}
                      onClick={() => setCurrentPage(index + 1)}
                      className={`px-3 py-2 rounded-xl border ${
                        currentPage === index + 1
                          ? "bg-[#123A5C] text-white"
                          : "bg-white text-slate-700"
                      }`}
                    >
                      {index + 1}
                    </button>
                  ))}

                  <button
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage((p) => p + 1)}
                    className="p-2 rounded-xl border disabled:opacity-40"
                  >
                    <ChevronRight size={18} />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {comparisonOpen && (
        <CantinaPerformanceComparison
          allCantinas={cantinas}
          listedCantinas={paginatedCantinas}
          onClose={() => setComparisonOpen(false)}
        />
      )}

      {modalOpen && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center px-4">
          <div className="bg-white rounded-[24px] shadow-xl p-6 w-full max-w-2xl">
            <h2 className="text-2xl font-bold text-slate-800">
              {t("createCantina")}
            </h2>

            <form
              onSubmit={createCantina}
              className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6"
            >
              <input
                required
                placeholder={t("cantinaName")}
                value={form.name}
                onChange={(e) => updateName(e.target.value)}
                className="border rounded-[14px] px-4 py-3"
              />

              <input
                required
                placeholder={t("internalCodeExample")}
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value })}
                className="border rounded-[14px] px-4 py-3"
              />

              <input
                placeholder={t("location")}
                value={form.location}
                onChange={(e) =>
                  setForm({ ...form, location: e.target.value })
                }
                className="border rounded-[14px] px-4 py-3"
              />

              <input
                type="date"
                value={form.openingDate}
                onChange={(e) =>
                  setForm({ ...form, openingDate: e.target.value })
                }
                className="border rounded-[14px] px-4 py-3"
              />

              <input
                type="number"
                placeholder={t("openingCash")}
                value={form.openingCash}
                onChange={(e) =>
                  setForm({ ...form, openingCash: e.target.value })
                }
                className="border rounded-[14px] px-4 py-3"
              />

              <input
                placeholder={t("availableMachines")}
                value={form.availableMachines}
                onChange={(e) =>
                  setForm({ ...form, availableMachines: e.target.value })
                }
                className="border rounded-[14px] px-4 py-3"
              />

              <input
                required
                readOnly
                placeholder={t("identifier")}
                value={form.identifier}
                className="border rounded-[14px] px-4 py-3 bg-slate-50"
              />

              <input
                required
                type="password"
                placeholder={t("cantinaPassword")}
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="border rounded-[14px] px-4 py-3"
              />

              {error && (
                <p className="md:col-span-2 text-red-600 text-sm">{error}</p>
              )}

              <div className="md:col-span-2 flex justify-end gap-3 mt-4">
                <button
                  type="button"
                  onClick={() => {
                    setModalOpen(false);
                    resetForm();
                  }}
                  className="px-5 py-3 rounded-[16px] border"
                >
                  {t("cancel")}
                </button>

                <button
                  type="submit"
                  disabled={creating}
                  className="px-5 py-3 rounded-[16px] bg-[#123A5C] text-white font-semibold disabled:opacity-60"
                >
                  {creating ? t("creating") : t("createCantina")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editOpen && selectedCantina && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center px-4">
          <div className="bg-white rounded-[24px] shadow-xl p-6 w-full max-w-2xl">
            <h2 className="text-2xl font-bold text-slate-800">
              {t("editCantina")}
            </h2>

            <form
              onSubmit={updateCantina}
              className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6"
            >
              <input
                required
                placeholder={t("cantinaName")}
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="border rounded-[14px] px-4 py-3"
              />

              <input
                readOnly
                placeholder={t("code")}
                value={form.code}
                className="border rounded-[14px] px-4 py-3 bg-slate-50"
              />

              <input
                placeholder={t("location")}
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
                className="border rounded-[14px] px-4 py-3"
              />

              <input
                type="date"
                value={form.openingDate}
                onChange={(e) =>
                  setForm({ ...form, openingDate: e.target.value })
                }
                className="border rounded-[14px] px-4 py-3"
              />

              <input
                type="number"
                placeholder={t("openingCash")}
                value={form.openingCash}
                onChange={(e) =>
                  setForm({ ...form, openingCash: e.target.value })
                }
                className="border rounded-[14px] px-4 py-3"
              />

              <input
                placeholder={t("availableMachines")}
                value={form.availableMachines}
                onChange={(e) =>
                  setForm({ ...form, availableMachines: e.target.value })
                }
                className="border rounded-[14px] px-4 py-3"
              />

              <input
                readOnly
                value={form.identifier}
                className="md:col-span-2 border rounded-[14px] px-4 py-3 bg-slate-50"
              />

              {error && (
                <p className="md:col-span-2 text-red-600 text-sm">{error}</p>
              )}

              <div className="md:col-span-2 flex justify-end gap-3 mt-4">
                <button
                  type="button"
                  onClick={() => setEditOpen(false)}
                  className="px-5 py-3 rounded-[16px] border"
                >
                  {t("cancel")}
                </button>

                <button
                  type="submit"
                  disabled={editing}
                  className="px-5 py-3 rounded-[16px] bg-[#123A5C] text-white font-semibold disabled:opacity-60"
                >
                  {editing ? t("saving") : t("saveChanges")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteOpen && selectedCantina && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center px-4">
          <div className="bg-white rounded-[24px] shadow-xl p-6 w-full max-w-md">
            <h2 className="text-2xl font-bold text-red-600">
              {t("deletePermanentlyQuestion")}
            </h2>

            <p className="text-slate-600 mt-3">
              {t("deleteCantinaConfirm")}{" "}
              <strong>{selectedCantina.name}</strong>{" "}
              {t("andAccessAccount")}.
            </p>

            <p className="text-sm text-red-500 mt-3">
              {t("actionCannotBeUndone")}
            </p>

            {error && <p className="text-red-600 text-sm mt-3">{error}</p>}

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setDeleteOpen(false)}
                className="px-5 py-3 rounded-[16px] border"
              >
                {t("cancel")}
              </button>

              <button
                onClick={deleteCantina}
                disabled={deleting}
                className="px-5 py-3 rounded-[16px] bg-red-600 text-white font-semibold disabled:opacity-60"
              >
                {deleting ? t("deleting") : t("deletePermanently")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}