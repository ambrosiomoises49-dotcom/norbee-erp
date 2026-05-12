"use client";
import currencyCodes from "currency-codes";
import { useI18n } from "@/lib/i18n";
import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

import {
  Bell,
  Settings,
  Languages,
  LogOut,
  Search,
  UserCircle2,
  CalendarDays,
  Boxes,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";

type Notification = {
  id: string;
  title: string;
  message: string;
  type: string;
  link: string | null;
  isRead: boolean;
  createdAt: string;
};

export default function Topbar() {
  const router = useRouter();
  const pathname = usePathname();

  const { lang, setLang, t } = useI18n();

  const notificationRef = useRef<HTMLDivElement | null>(null);
  const searchRef = useRef<HTMLDivElement | null>(null);
  const userRef = useRef<HTMLDivElement | null>(null);
  const settingsRef = useRef<HTMLDivElement | null>(null);

  

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [languageOpen, setLanguageOpen] = useState(false);
  const [currencyOpen, setCurrencyOpen] = useState(false);
  const [currentCurrency, setCurrentCurrency] = useState("EUR");
  const [userOpen, setUserOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  


  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const [search, setSearch] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);

  const pageTitles: Record<string, string> = {
    "/Dashboard": t("dashboard"),
    "/dashboard": t("dashboard"),
    "/vendas": t("sales"),
    "/cantinas": t("cantinas"),
    "/stock": t("stock"),
    "/stock-inteligente": t("intelligentStock"),
    "/compras": t("purchases"),
    "/custos": t("costs"),
    "/lucros": t("profits"),
    "/financas": t("finance"),
    "/rh": t("hr"),
    "/relatorios": t("reports"),
  };

  const searchablePages = [
    { label: t("dashboard"), href: "/Dashboard" },
    { label: t("sales"), href: "/vendas" },
    { label: t("cantinas"), href: "/cantinas" },
    { label: t("stock"), href: "/stock" },
    { label: t("intelligentStock"), href: "/stock-inteligente" },
    { label: t("purchases"), href: "/compras" },
    { label: t("costs"), href: "/custos" },
    { label: t("profits"), href: "/lucros" },
    { label: t("finance"), href: "/financas" },
    { label: t("hr"), href: "/rh" },
    { label: t("reports"), href: "/relatorios" },
  ];

  

  const title = useMemo(() => {
    return pageTitles[pathname] || pageTitles[pathname.toLowerCase()] || "";
  }, [pathname, lang]);

  const filteredPages = useMemo(() => {
    const q = search.toLowerCase().trim();

    if (!q) return [];

    return searchablePages.filter((page) =>
      page.label.toLowerCase().includes(q)
    );
  }, [search, lang]);

  async function loadNotifications() {
  try {
    const res = await fetch("/api/notifications", {
      cache: "no-store",
    });

    const data = await res.json();

    if (!res.ok) return;

    setNotifications(data.notifications || []);
    setUnreadCount(data.unreadCount || 0);
  } catch {
    // evita crash se a API falhar
  }
}

 useEffect(() => {
  const timeout = setTimeout(() => {
    void loadNotifications();
  }, 0);

  const interval = setInterval(() => {
    void loadNotifications();
  }, 30000);

  return () => {
    clearTimeout(timeout);
    clearInterval(interval);
  };
}, []);

  useEffect(() => {
    function handleClick(event: MouseEvent) {
      const target = event.target as Node;

      if (
        notificationRef.current &&
        !notificationRef.current.contains(target)
      ) {
        setNotificationsOpen(false);
      }

      if (searchRef.current && !searchRef.current.contains(target)) {
        setSearchOpen(false);
      }

      if (userRef.current && !userRef.current.contains(target)) {
        setUserOpen(false);
      }

      if (settingsRef.current && !settingsRef.current.contains(target)) {
          setSettingsOpen(false);
          setLanguageOpen(false);
          setCurrencyOpen(false);
              }
    }

    document.addEventListener("mousedown", handleClick);

    return () => {
      document.removeEventListener("mousedown", handleClick);
    };
  }, []);

  

  async function handleLogout() {
    await fetch("/api/auth/logout", {
      method: "POST",
    });

    router.push("/login");
    router.refresh();
  }

  async function openNotification(notification: Notification) {
    await fetch(`/api/notifications/${notification.id}/read`, {
      method: "PATCH",
    });

    setNotificationsOpen(false);

    await loadNotifications();

    if (notification.link) {
      router.push(notification.link);
    }
  }

  function notificationIcon(type: string) {
    if (type === "EVENT_REMINDER") {
      return <CalendarDays size={18} />;
    }

    if (type === "STOCK_LOW") {
      return <Boxes size={18} />;
    }

    if (type.includes("SUCCESS")) {
      return <CheckCircle2 size={18} />;
    }

    return <AlertCircle size={18} />;
  }

  function notificationColor(type: string) {
    if (type === "EVENT_REMINDER") {
      return "bg-blue-50 text-[#123A5C]";
    }

    if (type === "STOCK_LOW") {
      return "bg-red-50 text-red-600";
    }

    return "bg-slate-100 text-slate-600";
  }

  function formatDate(value: string) {
    return new Date(value).toLocaleString(lang === "fr" ? "fr-FR" : lang === "en" ? "en-GB" : "pt-PT", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function goToPage(href: string) {
    setSearch("");
    setSearchOpen(false);

    router.push(href);
  }

  const popularCurrencies = [
  "AOA",
  "EUR",
  "USD",
  "BRL",
  "GBP",
  
];

const allCurrencies = currencyCodes.data.map((item) => ({
  code: item.code,
  number: item.number,
  currency: item.currency,
}));

const currencyOptions = [
  ...popularCurrencies
    .map((code) =>
      allCurrencies.find((c) => c.code === code)
    )
    .filter(
      (
        item
      ): item is {
        code: string;
        number: string;
        currency: string;
      } => Boolean(item)
    ),

  ...allCurrencies.filter(
    (c) => !popularCurrencies.includes(c.code)
  ),
];
const [currencySearch, setCurrencySearch] = useState("");

const filteredCurrencies = currencyOptions.filter((item) =>
  `${item?.code} ${item?.currency}`
    .toLowerCase()
    .includes(currencySearch.toLowerCase())
);


async function changeCurrency(currency: string) {
  setCurrentCurrency(currency);
  setCurrencyOpen(false);
  setSettingsOpen(false);

  await fetch("/api/company/currency", {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ currency }),
  });
}

  return (
    <header className="h-[110px] bg-[#123A5C] text-white flex items-center justify-between px-10 gap-8 sticky top-0 z-30">
      <h2 className="text-3xl font-light min-w-[180px]">
        {title}
      </h2>

      <div className="flex-1 max-w-3xl" ref={searchRef}>
        <div className="relative">
          <Search
            size={22}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
          />

          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setSearchOpen(true);
            }}
            onFocus={() => setSearchOpen(true)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && filteredPages[0]) {
                goToPage(filteredPages[0].href);
              }
            }}
            placeholder={t("search")}
            className="w-full rounded-[18px] bg-white text-slate-800 py-3 pl-12 pr-4 outline-none focus:ring-2 focus:ring-[#F5C542]"
          />

          {searchOpen && search.trim() && (
            <div className="absolute left-0 right-0 mt-3 bg-white text-slate-800 rounded-[18px] shadow-xl z-50 overflow-hidden">
              {filteredPages.length === 0 ? (
                <div className="px-4 py-4 text-sm text-slate-500">
                  {t("noResult")}
                </div>
              ) : (
                filteredPages.map((page) => (
                  <button
                    key={page.href}
                    onClick={() => goToPage(page.href)}
                    className="w-full text-left px-4 py-3 hover:bg-slate-100 text-sm font-semibold"
                  >
                    {page.label}

                    <span className="block text-xs text-slate-500">
                      {page.href}
                    </span>
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-8">
        <div className="relative" ref={notificationRef}>
          <button
            type="button"
            onClick={() => {
              setNotificationsOpen((v) => !v);
              void loadNotifications();
            }}
            className="relative rounded-[18px] p-2 transition hover:bg-white/10"
          >
            <Bell size={32} />

            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs min-w-5 h-5 px-1 rounded-full flex items-center justify-center font-bold">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>

          {notificationsOpen && (
            <div className="absolute right-0 mt-4 w-[390px] bg-white text-slate-800 rounded-[22px] shadow-xl z-50 overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="font-black text-slate-800">
                    {t("notifications")}
                  </h3>

                  <p className="text-xs text-slate-500">
                    {unreadCount} {t("unread")}
                  </p>
                </div>

                <button
                  onClick={() => void loadNotifications()}
                  className="text-xs font-bold text-[#123A5C]"
                >
                  {t("update")}
                </button>
              </div>

              <div className="max-h-[420px] overflow-auto">
                {notifications.length === 0 ? (
                  <div className="p-6 text-center text-sm text-slate-500">
                    {t("noNotifications")}
                  </div>
                ) : (
                  notifications.map((notification) => (
                    <button
                      key={notification.id}
                      onClick={() => openNotification(notification)}
                      className={`w-full text-left px-5 py-4 border-b border-slate-100 hover:bg-slate-50 flex gap-3 ${
                        !notification.isRead
                          ? "bg-[#123A5C]/5"
                          : "bg-white"
                      }`}
                    >
                      <div
                        className={`w-10 h-10 rounded-[14px] flex items-center justify-center shrink-0 ${notificationColor(
                          notification.type
                        )}`}
                      >
                        {notificationIcon(notification.type)}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-bold text-sm text-slate-800 truncate">
                            {notification.title}
                          </p>

                          {!notification.isRead && (
                            <span className="w-2 h-2 rounded-full bg-red-600 shrink-0" />
                          )}
                        </div>

                        <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                          {notification.message}
                        </p>

                        <p className="text-[11px] text-slate-400 mt-2">
                          {formatDate(notification.createdAt)}
                        </p>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        <div className="relative" ref={settingsRef}>
  <button
    type="button"
    onClick={() => setSettingsOpen((v) => !v)}
    className="rounded-[18px] p-2 transition hover:bg-white/10"
  >
    <Settings size={36} />
  </button>

  {settingsOpen && (
    <div className="absolute right-0 mt-4 w-64 bg-white text-slate-800 rounded-[18px] shadow-lg z-50 overflow-hidden">
      <button
        onClick={() => {
          setLanguageOpen((v) => !v);
          setCurrencyOpen(false);
        }}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-100 text-left"
      >
        <span className="flex items-center gap-3">
          <Languages size={20} />
          {t("changeLanguage")}
        </span>

        <span className="text-xs font-bold uppercase">{lang}</span>
      </button>

      {languageOpen && (
        <div className="border-t border-slate-100">
          <button
            onClick={() => {
              setLang("pt");
              setSettingsOpen(false);
            }}
            className={`w-full flex items-center gap-3 px-8 py-3 hover:bg-slate-100 text-left ${
              lang === "pt" ? "bg-slate-100 font-bold" : ""
            }`}
          >
            Português
          </button>

          <button
            onClick={() => {
              setLang("fr");
              setSettingsOpen(false);
            }}
            className={`w-full flex items-center gap-3 px-8 py-3 hover:bg-slate-100 text-left ${
              lang === "fr" ? "bg-slate-100 font-bold" : ""
            }`}
          >
            Français
          </button>

          <button
            onClick={() => {
              setLang("en");
              setSettingsOpen(false);
            }}
            className={`w-full flex items-center gap-3 px-8 py-3 hover:bg-slate-100 text-left ${
              lang === "en" ? "bg-slate-100 font-bold" : ""
            }`}
          >
            English
          </button>
        </div>
      )}

      <button
        onClick={() => {
          setCurrencyOpen((v) => !v);
          setLanguageOpen(false);
        }}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-100 text-left"
      >
        <span className="flex items-center gap-3">
          <span className="text-lg font-black">¤</span>
          {t("changeCurrency")}
        </span>

        <span className="text-xs font-bold">{currentCurrency}</span>
      </button>

      {currencyOpen && (
  <div className="border-t border-slate-100">
    <div className="p-3">
      <input
        type="text"
        value={currencySearch}
        onChange={(e) =>
          setCurrencySearch(e.target.value)
        }
        placeholder={t("searchCurrency")}
        className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none"
      />
    </div>

    <div className="max-h-64 overflow-auto">
      {filteredCurrencies.map((item) => (
        <button
          key={item.code}
          onClick={() => changeCurrency(item.code)}
          className={`w-full flex items-center justify-between px-8 py-3 hover:bg-slate-100 text-left ${
            currentCurrency === item.code
              ? "bg-slate-100 font-bold"
              : ""
          }`}
        >
          <span>{item.code}</span>

          <span className="text-xs text-slate-500">
            {item.currency}
          </span>
        </button>
      ))}
    </div>
  </div>
)}
    </div>
  )}
</div>

        <div className="relative" ref={userRef}>
          <button
            type="button"
            onClick={() => setUserOpen((v) => !v)}
            className="w-14 h-14 rounded-full bg-white border-2 border-white flex items-center justify-center overflow-hidden"
          >
            <UserCircle2
              size={42}
              className="text-[#123A5C]"
            />
          </button>

          {userOpen && (
            <div className="absolute right-0 mt-4 w-56 bg-white text-slate-800 rounded-[18px] shadow-lg z-50 overflow-hidden">
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-100 text-left text-red-600"
              >
                <LogOut size={20} />
                <span>{t("logout")}</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}