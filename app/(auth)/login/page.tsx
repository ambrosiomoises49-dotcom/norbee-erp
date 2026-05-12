"use client";
import { hasFlag } from "country-flag-icons";
import * as Flags from "country-flag-icons/react/3x2";
import { useMemo, useState } from "react";
import {
  User,
  Lock,
  LucideLanguages,
  LucideGlobe,
  LucideMail,
} from "lucide-react";

import styles from "./login.module.css";
import { useRouter } from "next/navigation";

import { useI18n } from "@/lib/i18n";

type Mode = "login" | "register" | "reset";



import countries from "world-countries";

type CountryCode = string;


const countryOptions = countries
  .filter((country) => country.cca2 && country.currencies)
  .map((country) => {
    const currencyCode = Object.keys(country.currencies ?? {})[0];
    const currencyData = country.currencies?.[currencyCode];

    return {
      code: country.cca2,
      name: country.name.common,
      currencyCode,
      currencyName: currencyData?.name ?? currencyCode,
      currencySymbol: currencyData?.symbol ?? currencyCode,
    };
  })
  .sort((a, b) => a.name.localeCompare(b.name));
  
const languageOptions = ["pt", "fr", "en"] as const;

function CountryFlag({ code }: { code: string }) {
  const FlagComponent =
    hasFlag(code) ? Flags[code as keyof typeof Flags] : null;

  if (!FlagComponent) return null;

  return <FlagComponent className={styles.flagIcon} />;
}

export default function LoginPage() {
  const router = useRouter();

  const { t, setLang } = useI18n();

  const [mode, setMode] = useState<Mode>("login");

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [redirecting, setRedirecting] = useState(false);
  const [hasRedirected, setHasRedirected] = useState(false);
  const [showCountrySuggestions, setShowCountrySuggestions] =
  useState(false);

  const redirectToDashboard = () => {
    if (redirecting || hasRedirected) return;

    setRedirecting(true);
    setHasRedirected(true);

    setTimeout(() => router.push("/Dashboard"), 500);
  };

  const [loginIdentifier, setLoginIdentifier] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [rememberPassword, setRememberPassword] = useState(false);

  const [companyName, setCompanyName] = useState("");
  const [country, setCountry] = useState<CountryCode>("PT");
  const [countrySearch, setCountrySearch] = useState("Portugal");

  const [language, setLanguageState] = useState<
    (typeof languageOptions)[number]
  >("pt");

  const [emailOrPhone, setEmailOrPhone] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regPasswordConfirm, setRegPasswordConfirm] = useState("");

  const selectedCountry = countryOptions.find(
  (item) => item.code === country
);

const currency = selectedCountry?.currencyCode ?? "EUR";


const filteredCountries = countryOptions
  .filter((item) =>
    `${item.name} ${item.code}`
      .toLowerCase()
      .includes(countrySearch.toLowerCase())
  )
  .slice(0, 8);
  const generatedIdentifier = useMemo(() => {
    const raw = companyName.trim().toLowerCase();

    const cleaned = raw
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

    return `admin@${cleaned}`;
  }, [companyName]);

  const [resetEmailOrPhone, setResetEmailOrPhone] = useState("");
  const [resetNewPassword, setResetNewPassword] = useState("");
  const [resetNewPasswordConfirm, setResetNewPasswordConfirm] =
    useState("");

  async function handleRegister(
    e: React.FormEvent<HTMLFormElement>
  ) {
    e.preventDefault();

    setError(null);

    if (!companyName.trim()) {
      return setError(t("companyNameRequired"));
    }

    if (!emailOrPhone.trim()) {
      return setError(t("emailRequired"));
    }

    if (regPassword.length < 6) {
      return setError(t("passwordMin"));
    }

    if (regPassword !== regPasswordConfirm) {
      return setError(t("passwordMismatch"));
    }

    if (!generatedIdentifier || generatedIdentifier === "admin@") {
      return setError(t("invalidCompanyName"));
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          companyName,
          identifier: generatedIdentifier,
          emailOrPhone,
          password: regPassword,
          country,
          currency,
          language,
        }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(data?.message || t("registerError"));
      }

      setLang(language);

      redirectToDashboard();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t("unknownError")
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleLogin(
    e: React.FormEvent<HTMLFormElement>
  ) {
    e.preventDefault();

    setError(null);

    if (!loginIdentifier.trim()) {
      return setError(t("identifierRequired"));
    }

    if (!loginPassword) {
      return setError(t("passwordRequired"));
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          identifier: loginIdentifier,
          password: loginPassword,
          rememberPassword,
        }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(data?.message || t("invalidIdentifier"));
      }

      redirectToDashboard();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t("unknownError")
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleReset(
    e: React.FormEvent<HTMLFormElement>
  ) {
    e.preventDefault();

    setError(null);

    if (!resetEmailOrPhone.trim()) {
      return setError(t("emailRequired"));
    }

    if (resetNewPassword.length < 6) {
      return setError(t("passwordMin"));
    }

    if (resetNewPassword !== resetNewPasswordConfirm) {
      return setError(t("passwordMismatch"));
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          emailOrPhone: resetEmailOrPhone,
          newPassword: resetNewPassword,
        }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(data?.message || t("resetError"));
      }

      setMode("login");

      setError(t("passwordUpdated"));

      setLoginIdentifier(generatedIdentifier);

      setResetEmailOrPhone("");
      setResetNewPassword("");
      setResetNewPasswordConfirm("");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t("unknownError")
      );
    } finally {
      setLoading(false);
    }
  }

  
  return (
    <main className={styles.loginPage}>
      <section
        className={`${styles.loginSection} ${
          redirecting ? styles.redirectAnim : ""
        }`}
      >
        <h1>
          {mode === "login"
            ? t("connectNorbee")
            : mode === "register"
            ? t("register")
            : t("recoverPassword")}
        </h1>

        {error && (
          <p
            style={{
              color: "#ffd0d0",
              fontSize: 12,
              marginBottom: 12,
              textAlign: "center",
            }}
          >
            {error}
          </p>
        )}

        {mode === "login" && (
          <form onSubmit={handleLogin}>
            <div className={styles.inputBox}>
              <input
                type="text"
                placeholder={t("identifier")}
                value={loginIdentifier}
                onChange={(e) =>
                  setLoginIdentifier(e.target.value)
                }
                disabled={loading || redirecting}
              />

              <User size={18} />
            </div>

            <div className={styles.inputBox}>
              <input
                type="password"
                placeholder={t("password")}
                value={loginPassword}
                onChange={(e) =>
                  setLoginPassword(e.target.value)
                }
                disabled={loading || redirecting}
              />

              <Lock size={18} />
            </div>

            <div className={styles.remenberForgot}>
              <label>
                <input
                  type="checkbox"
                  checked={rememberPassword}
                  onChange={(e) =>
                    setRememberPassword(e.target.checked)
                  }
                  disabled={loading || redirecting}
                />

                {t("rememberPassword")}
              </label>

              <a
                href="#"
                onClick={(e) => {
                  e.preventDefault();

                  setError(null);
                  setMode("reset");
                }}
              >
                {t("recoverPassword")}
              </a>
            </div>

            <button
              type="submit"
              className={styles.loginBtn}
              disabled={loading || redirecting}
            >
              {loading ? t("connecting") : t("connect")}
            </button>

            <div className={styles.registerLink}>
              <p>
                {t("noAccount")}{" "}
                <a
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();

                    setError(null);
                    setMode("register");
                  }}
                >
                  {t("register")}
                </a>
              </p>
            </div>
          </form>
        )}

        {mode === "register" && (
          <form onSubmit={handleRegister}>
        <div className={styles.inputBox}>
  <input
    type="text"
    placeholder={t("country") || "País"}
    value={countrySearch}
    onFocus={() => setShowCountrySuggestions(true)}
    onChange={(e) => {
      setCountrySearch(e.target.value);
      setShowCountrySuggestions(true);
    }}
    disabled={loading || redirecting}
  />

  {selectedCountry ? (
    <div className={styles.selectedFlag}>
      <CountryFlag code={selectedCountry.code} />
    </div>
  ) : (
    <LucideGlobe size={18} />
  )}

  {showCountrySuggestions &&
    countrySearch &&
    filteredCountries.length > 0 && (
      <div className={styles.countrySuggestions}>
        {filteredCountries.map((item) => (
          <button
            key={item.code}
            type="button"
            onClick={() => {
              setCountry(item.code);
              setCountrySearch(item.name);

              setShowCountrySuggestions(false);
            }}
          >
            <span>
              <CountryFlag code={item.code} />
              {item.name}
            </span>
          </button>
        ))}
      </div>
    )}
</div>


            <div className={styles.inputBox}>
              <select
                value={language}
                onChange={(e) => {
                  const value = e.target.value as
                    | "pt"
                    | "fr"
                    | "en";

                  setLanguageState(value);
                  setLang(value);
                }}
                disabled={loading || redirecting}
              >
                <option value="pt">Português</option>
                <option value="fr">Français</option>
                <option value="en">English</option>
              </select>

              <LucideLanguages size={18} />
            </div>

            <div className={styles.inputBox}>
              <input
                type="text"
                placeholder={t("company")}
                value={companyName}
                onChange={(e) =>
                  setCompanyName(e.target.value)
                }
                disabled={loading || redirecting}
              />

              <User size={18} />
            </div>

            <div className={styles.inputBox}>
              <input
                type="text"
                placeholder={t("identifier")}
                value={generatedIdentifier}
                readOnly
              />

              <User size={18} />
            </div>

            <div className={styles.inputBox}>
              <input
                type="text"
                placeholder={t("emailOrPhone")}
                value={emailOrPhone}
                onChange={(e) =>
                  setEmailOrPhone(e.target.value)
                }
                disabled={loading || redirecting}
              />

              <LucideMail size={18} />
            </div>

            <div className={styles.inputBox}>
              <input
                type="password"
                placeholder={t("password")}
                value={regPassword}
                onChange={(e) =>
                  setRegPassword(e.target.value)
                }
                disabled={loading || redirecting}
              />

              <Lock size={18} />
            </div>

            <div className={styles.inputBox}>
              <input
                type="password"
                placeholder={t("confirmPassword")}
                value={regPasswordConfirm}
                onChange={(e) =>
                  setRegPasswordConfirm(e.target.value)
                }
                disabled={loading || redirecting}
              />

              <Lock size={18} />
            </div>

            <button
              type="submit"
              className={styles.loginBtn}
              disabled={loading || redirecting}
            >
              {loading ? t("creating") : t("register")}
            </button>

            <div className={styles.registerLink}>
              <p>
                {t("alreadyHaveAccount")}{" "}
                <a
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();

                    setError(null);
                    setMode("login");
                    setLoginIdentifier(generatedIdentifier);
                  }}
                >
                  {t("connect")}
                </a>
              </p>
            </div>
          </form>
        )}

        {mode === "reset" && (
          <form onSubmit={handleReset}>
            <div className={styles.inputBox}>
              <input
                type="text"
                placeholder={t("emailOrPhone")}
                value={resetEmailOrPhone}
                onChange={(e) =>
                  setResetEmailOrPhone(e.target.value)
                }
                disabled={loading || redirecting}
              />

              <User size={18} />
            </div>

            <div className={styles.inputBox}>
              <input
                type="password"
                placeholder={t("newPassword")}
                value={resetNewPassword}
                onChange={(e) =>
                  setResetNewPassword(e.target.value)
                }
                disabled={loading || redirecting}
              />

              <Lock size={18} />
            </div>

            <div className={styles.inputBox}>
              <input
                type="password"
                placeholder={t("confirmPassword")}
                value={resetNewPasswordConfirm}
                onChange={(e) =>
                  setResetNewPasswordConfirm(
                    e.target.value
                  )
                }
                disabled={loading || redirecting}
              />

              <Lock size={18} />
            </div>

            <button
              type="submit"
              className={styles.loginBtn}
              disabled={loading || redirecting}
            >
              {loading
                ? t("updating")
                : t("changePassword")}
            </button>

            <div className={styles.registerLink}>
              <p>
                <a
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();

                    setError(null);
                    setMode("login");
                  }}
                >
                  {t("backLogin")}
                </a>
              </p>
            </div>
          </form>
        )}
      </section>
    </main>
  );
}