"use client";

import { useI18n } from "@/lib/i18n";
import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Plus,
  X,
  Pencil,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Clock,
  Store,
} from "lucide-react";

type EventType =
  | "PURCHASE"
  | "SALARY"
  | "TRANSFER"
  | "COST"
  | "MEETING"
  | "MAINTENANCE"
  | "OTHER";

type EventPriority = "LOW" | "NORMAL" | "HIGH" | "URGENT";
type EventStatus = "PENDING" | "DONE" | "CANCELLED";

type Cantina = {
  id: string;
  name: string;
  code: string;
};

type EventItem = {
  id: string;
  title: string;
  type: EventType;
  description: string | null;
  eventDate: string;
  priority: EventPriority;
  status: EventStatus;
  color: string;
  cantinaId: string | null;
  cantina?: Cantina | null;
};

const COLORS = [
  "#123A5C",
  "#16A34A",
  "#DC2626",
  "#F59E0B",
  "#7C3AED",
  "#0891B2",
  "#DB2777",
  "#475569",
];

function localDateKey(date: Date | string) {
  const d = typeof date === "string" ? new Date(date) : date;

  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatDateInput(date: Date) {
  const local = new Date(date);
  local.setMinutes(local.getMinutes() - local.getTimezoneOffset());
  return local.toISOString().slice(0, 16);
}

export default function EventsCalendar({ onClose }: { onClose: () => void }) {
  const { t, lang } = useI18n();

  const today = new Date();

  const [currentDate, setCurrentDate] = useState(
    new Date(today.getFullYear(), today.getMonth(), 1)
  );

  const [events, setEvents] = useState<EventItem[]>([]);
  const [cantinas, setCantinas] = useState<Cantina[]>([]);
  const [selectedDay, setSelectedDay] = useState<Date>(today);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<EventItem | null>(null);
  const [deletingEvent, setDeletingEvent] = useState<EventItem | null>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [form, setForm] = useState({
    title: "",
    type: "OTHER" as EventType,
    description: "",
    eventDate: formatDateInput(new Date()),
    cantinaId: "",
    priority: "NORMAL" as EventPriority,
    status: "PENDING" as EventStatus,
    color: "#123A5C",
  });

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const typeLabels: Record<EventType, string> = {
    PURCHASE: t("eventTypePurchase"),
    SALARY: t("eventTypeSalary"),
    TRANSFER: t("eventTypeTransfer"),
    COST: t("eventTypeCost"),
    MEETING: t("eventTypeMeeting"),
    MAINTENANCE: t("eventTypeMaintenance"),
    OTHER: t("eventTypeOther"),
  };

  const priorityLabels: Record<EventPriority, string> = {
    LOW: t("priorityLow"),
    NORMAL: t("priorityNormal"),
    HIGH: t("priorityHigh"),
    URGENT: t("priorityUrgent"),
  };

  const statusLabels: Record<EventStatus, string> = {
    PENDING: t("statusPending"),
    DONE: t("statusDone"),
    CANCELLED: t("statusCancelled"),
  };

  function getLocale() {
    if (lang === "fr") return "fr-FR";
    if (lang === "en") return "en-GB";
    return "pt-PT";
  }

  async function loadEvents() {
    setLoading(true);
    setError("");

    try {
      const params = new URLSearchParams();
      params.set("year", String(year));
      params.set("month", String(month));

      const res = await fetch(`/api/events?${params.toString()}`);
      const data = await res.json();

      if (!res.ok) {
        setError(data.message || t("eventLoadError"));
        return;
      }

      setEvents(data.events || []);
      setCantinas(data.cantinas || []);
    } catch {
      setError(t("eventLoadError"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
  const timeout = setTimeout(() => {
    void loadEvents();
  }, 0);

  return () => clearTimeout(timeout);
}, [year, month]);

  const days = useMemo(() => {
    const firstDay = new Date(year, month, 1);
    const startWeekDay = firstDay.getDay();
    const start = new Date(year, month, 1 - startWeekDay);

    return Array.from({ length: 42 }, (_, index) => {
      const d = new Date(start);
      d.setDate(start.getDate() + index);
      return d;
    });
  }, [year, month]);

  const selectedDayEvents = useMemo(() => {
    const key = localDateKey(selectedDay);

    return events
      .filter((event) => localDateKey(event.eventDate) === key)
      .sort(
        (a, b) =>
          new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime()
      );
  }, [events, selectedDay]);

  function eventsForDay(day: Date) {
    const key = localDateKey(day);
    return events.filter((event) => localDateKey(event.eventDate) === key);
  }

  function resetForm(date?: Date) {
    const baseDate = date || new Date();

    setForm({
      title: "",
      type: "OTHER",
      description: "",
      eventDate: formatDateInput(baseDate),
      cantinaId: "",
      priority: "NORMAL",
      status: "PENDING",
      color: "#123A5C",
    });
  }

  function openNewEvent(date?: Date) {
    setEditingEvent(null);
    resetForm(date || selectedDay);
    setModalOpen(true);
  }

  function openEditEvent(event: EventItem) {
    setEditingEvent(event);

    setForm({
      title: event.title,
      type: event.type,
      description: event.description || "",
      eventDate: formatDateInput(new Date(event.eventDate)),
      cantinaId: event.cantinaId || "",
      priority: event.priority,
      status: event.status,
      color: event.color || "#123A5C",
    });

    setModalOpen(true);
  }

  async function saveEvent(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setSaving(true);
    setError("");
    setMessage("");

    try {
      const url = editingEvent ? `/api/events/${editingEvent.id}` : "/api/events";
      const method = editingEvent ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || t("eventSaveError"));
        return;
      }

      setMessage(data.message || t("eventSavedSuccess"));
      setModalOpen(false);
      setEditingEvent(null);
      resetForm();
      await loadEvents();
    } catch {
      setError(t("eventSaveError"));
    } finally {
      setSaving(false);
    }
  }

  async function deleteEvent() {
    if (!deletingEvent) return;

    setSaving(true);
    setError("");
    setMessage("");

    try {
      const res = await fetch(`/api/events/${deletingEvent.id}`, {
        method: "DELETE",
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || t("eventDeleteError"));
        return;
      }

      setMessage(data.message || t("eventDeletedSuccess"));
      setDeletingEvent(null);
      await loadEvents();
    } catch {
      setError(t("eventDeleteError"));
    } finally {
      setSaving(false);
    }
  }

  async function markAsDone(event: EventItem) {
    setSaving(true);
    setError("");

    try {
      const res = await fetch(`/api/events/${event.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          status: "DONE",
        }),
      });

      if (res.ok) {
        await loadEvents();
      }
    } finally {
      setSaving(false);
    }
  }

  function changeMonth(direction: number) {
    setCurrentDate(new Date(year, month + direction, 1));
  }

  function isToday(day: Date) {
    return localDateKey(day) === localDateKey(today);
  }

  function isSelected(day: Date) {
    return localDateKey(day) === localDateKey(selectedDay);
  }

  function formatHour(value: string) {
    return new Date(value).toLocaleTimeString(getLocale(), {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function monthLabel() {
    return currentDate.toLocaleString(getLocale(), {
      month: "long",
      year: "numeric",
    });
  }

  function selectedDayLabel() {
    return selectedDay.toLocaleDateString(getLocale(), {
      weekday: "long",
      day: "2-digit",
      month: "long",
    });
  }

  function statusClass(status: EventStatus) {
    if (status === "DONE") return "bg-green-50 text-green-700";
    if (status === "CANCELLED") return "bg-red-50 text-red-600";
    return "bg-yellow-50 text-yellow-700";
  }

  const weekDays = [
    t("sundayShort"),
    t("mondayShort"),
    t("tuesdayShort"),
    t("wednesdayShort"),
    t("thursdayShort"),
    t("fridayShort"),
    t("saturdayShort"),
  ];  return (
    <div className="fixed left-[200px] top-[110px] right-0 bottom-0 z-40 bg-[#F4F7FA] p-5 overflow-hidden">
      <div className="h-full bg-white rounded-[24px] shadow-xl flex flex-col overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
              <CalendarDays size={24} />
              {t("eventsAgenda")}
            </h2>
            <p className="text-sm text-slate-500">
              {t("eventsAgendaDescription")}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => openNewEvent()}
              className="rounded-[14px] bg-[#123A5C] px-4 py-2.5 text-sm font-semibold text-white flex items-center gap-2"
            >
              <Plus size={16} />
              {t("newEvent")}
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-xl hover:bg-slate-100 text-slate-600"
            >
              <X size={24} />
            </button>
          </div>
        </div>

        {(error || message) && (
          <div
            className={`mx-5 mt-4 rounded-[16px] px-4 py-3 text-sm flex items-center gap-2 ${
              error ? "bg-red-50 text-red-600" : "bg-green-50 text-green-700"
            }`}
          >
            {error ? <AlertCircle size={17} /> : <CheckCircle2 size={17} />}
            {error || message}
          </div>
        )}

        <div className="flex-1 min-h-0 grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-4 p-5 overflow-hidden">
          <div className="min-h-0 bg-slate-50 rounded-[22px] border border-slate-100 flex flex-col overflow-hidden">
            <div className="px-4 py-3 flex items-center justify-between border-b bg-white">
              <button
                onClick={() => changeMonth(-1)}
                className="p-2 rounded-xl hover:bg-slate-100"
              >
                <ChevronLeft size={20} />
              </button>

              <h3 className="text-lg font-black text-slate-800 capitalize">
                {monthLabel()}
              </h3>

              <button
                onClick={() => changeMonth(1)}
                className="p-2 rounded-xl hover:bg-slate-100"
              >
                <ChevronRight size={20} />
              </button>
            </div>

            <div className="grid grid-cols-7 bg-white border-b text-xs font-bold text-slate-500">
              {weekDays.map((day) => (
                <div key={day} className="p-3 text-center">
                  {day}
                </div>
              ))}
            </div>

            <div className="flex-1 grid grid-cols-7 auto-rows-fr min-h-0">
              {days.map((day) => {
                const dayEvents = eventsForDay(day);
                const outMonth = day.getMonth() !== month;

                return (
                  <button
                    key={localDateKey(day)}
                    onClick={() => setSelectedDay(day)}
                    onDoubleClick={() => openNewEvent(day)}
                    className={`relative min-h-[95px] border border-slate-100 p-2 text-left overflow-hidden hover:bg-white ${
                      outMonth ? "bg-slate-100/60 text-slate-400" : "bg-white"
                    } ${isSelected(day) ? "ring-2 ring-[#123A5C] z-10" : ""}`}
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-sm font-bold ${
                          isToday(day)
                            ? "bg-[#123A5C] text-white rounded-full px-2 py-1"
                            : ""
                        }`}
                      >
                        {day.getDate()}
                      </span>

                      {dayEvents.length > 0 && (
                        <span className="text-[10px] text-slate-400">
                          {dayEvents.length}
                        </span>
                      )}
                    </div>

                    <div className="mt-2 space-y-1">
                      {dayEvents.slice(0, 3).map((event) => (
                        <div
                          key={event.id}
                          className="truncate rounded-md px-2 py-1 text-[11px] font-semibold text-white"
                          style={{
                            backgroundColor: event.color || "#123A5C",
                            opacity: event.status === "DONE" ? 0.55 : 1,
                          }}
                        >
                          {formatHour(event.eventDate)} · {event.title}
                        </div>
                      ))}

                      {dayEvents.length > 3 && (
                        <p className="text-[11px] text-slate-500 font-semibold">
                          + {dayEvents.length - 3} {t("moreEvents")}
                        </p>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="min-h-0 bg-white rounded-[22px] border border-slate-100 flex flex-col overflow-hidden">
            <div className="p-4 border-b">
              <p className="text-xs text-slate-500">{t("selectedDay")}</p>
              <h3 className="text-lg font-black text-slate-800 capitalize">
                {selectedDayLabel()}
              </h3>
            </div>

            <div className="flex-1 overflow-auto p-4 space-y-3">
              {loading ? (
                <p className="text-sm text-slate-500">{t("loading")}</p>
              ) : selectedDayEvents.length === 0 ? (
                <div className="rounded-[18px] bg-slate-50 p-5 text-center text-sm text-slate-500">
                  {t("noEventThisDay")}
                </div>
              ) : (
                selectedDayEvents.map((event) => (
                  <div
                    key={event.id}
                    className="rounded-[18px] border border-slate-100 overflow-hidden"
                  >
                    <div
                      className="h-2"
                      style={{ backgroundColor: event.color || "#123A5C" }}
                    />

                    <div className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-black text-slate-800">
                            {event.title}
                          </p>

                          <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                            <Clock size={13} />
                            {formatHour(event.eventDate)} ·{" "}
                            {typeLabels[event.type]}
                          </p>

                          {event.cantina && (
                            <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                              <Store size={13} />
                              {event.cantina.name} — {event.cantina.code}
                            </p>
                          )}
                        </div>

                        <span
                          className={`px-2 py-1 rounded-full text-[11px] font-bold ${statusClass(
                            event.status
                          )}`}
                        >
                          {statusLabels[event.status]}
                        </span>
                      </div>

                      {event.description && (
                        <p className="text-sm text-slate-600 mt-3">
                          {event.description}
                        </p>
                      )}

                      <div className="flex items-center justify-between mt-4">
                        <span className="text-xs font-semibold text-slate-500">
                          {t("priority")}: {priorityLabels[event.priority]}
                        </span>

                        <div className="flex gap-2">
                          {event.status !== "DONE" && (
                            <button
                              onClick={() => markAsDone(event)}
                              className="p-2 rounded-xl hover:bg-green-50 text-green-700"
                              title={t("markAsDone")}
                            >
                              <CheckCircle2 size={17} />
                            </button>
                          )}

                          <button
                            onClick={() => openEditEvent(event)}
                            className="p-2 rounded-xl hover:bg-blue-50 text-blue-600"
                            title={t("edit")}
                          >
                            <Pencil size={17} />
                          </button>

                          <button
                            onClick={() => setDeletingEvent(event)}
                            className="p-2 rounded-xl hover:bg-red-50 text-red-600"
                            title={t("delete")}
                          >
                            <Trash2 size={17} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            <button
              onClick={() => openNewEvent(selectedDay)}
              className="m-4 rounded-[14px] bg-[#123A5C] px-4 py-3 text-sm font-bold text-white"
            >
              {t("createEventThisDay")}
            </button>
          </div>
        </div>
      </div>

      {modalOpen && (
        <Modal
          title={editingEvent ? t("editEvent") : t("newEvent")}
          onClose={() => {
            setModalOpen(false);
            setEditingEvent(null);
            resetForm();
          }}
        >
          <form
            onSubmit={saveEvent}
            className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-5"
          >
            <Input
              label={t("title")}
              value={form.title}
              required
              onChange={(value) => setForm({ ...form, title: value })}
            />

            <div>
              <label className="text-xs text-slate-500">{t("type")}</label>
              <select
                value={form.type}
                onChange={(e) =>
                  setForm({ ...form, type: e.target.value as EventType })
                }
                className="mt-1 w-full border rounded-[14px] px-4 py-3 text-sm"
              >
                {Object.entries(typeLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs text-slate-500">
                {t("dateAndTime")}
              </label>
              <input
                type="datetime-local"
                value={form.eventDate}
                onChange={(e) =>
                  setForm({ ...form, eventDate: e.target.value })
                }
                className="mt-1 w-full border rounded-[14px] px-4 py-3 text-sm"
                required
              />
            </div>

            <div>
              <label className="text-xs text-slate-500">{t("cantina")}</label>
              <select
                value={form.cantinaId}
                onChange={(e) =>
                  setForm({ ...form, cantinaId: e.target.value })
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
              <label className="text-xs text-slate-500">{t("priority")}</label>
              <select
                value={form.priority}
                onChange={(e) =>
                  setForm({
                    ...form,
                    priority: e.target.value as EventPriority,
                  })
                }
                className="mt-1 w-full border rounded-[14px] px-4 py-3 text-sm"
              >
                {Object.entries(priorityLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            {editingEvent && (
              <div>
                <label className="text-xs text-slate-500">{t("status")}</label>
                <select
                  value={form.status}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      status: e.target.value as EventStatus,
                    })
                  }
                  className="mt-1 w-full border rounded-[14px] px-4 py-3 text-sm"
                >
                  {Object.entries(statusLabels).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="md:col-span-2">
              <label className="text-xs text-slate-500">
                {t("eventColor")}
              </label>
              <div className="flex flex-wrap gap-2 mt-2">
                {COLORS.map((color) => (
                  <button
                    type="button"
                    key={color}
                    onClick={() => setForm({ ...form, color })}
                    className={`w-9 h-9 rounded-full border-4 ${
                      form.color === color ? "border-slate-900" : "border-white"
                    } shadow`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>

            <div className="md:col-span-2">
              <label className="text-xs text-slate-500">
                {t("description")}
              </label>
              <textarea
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
                className="mt-1 w-full border rounded-[14px] px-4 py-3 text-sm min-h-[100px]"
                placeholder={t("eventDescriptionPlaceholder")}
              />
            </div>

            <div className="md:col-span-2 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setModalOpen(false);
                  setEditingEvent(null);
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
                {saving ? t("saving") : t("saveEvent")}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {deletingEvent && (
        <Modal
          title={t("deleteEventQuestion")}
          onClose={() => setDeletingEvent(null)}
          maxWidth="max-w-md"
        >
          <p className="text-slate-600 mt-4">
            {t("deleteEventConfirm")} <strong>{deletingEvent.title}</strong>?
          </p>

          <div className="flex justify-end gap-3 mt-6">
            <button
              onClick={() => setDeletingEvent(null)}
              className="px-5 py-3 rounded-[16px] border"
            >
              {t("cancel")}
            </button>

            <button
              onClick={deleteEvent}
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

function Modal({
  title,
  children,
  onClose,
  maxWidth = "max-w-3xl",
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