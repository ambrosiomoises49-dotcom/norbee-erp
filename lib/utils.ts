export function looksLikeEmail(value: string) {
  // simples
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

// Quando o recovery for telefone e recoveryEmail é obrigatório no schema,
// criamos um dummy email garantido para não quebrar e permitir reset por telefone.
export function dummyRecoveryEmail(identifier: string) {
  // admin@slug -> slug
  const slug = identifier.replace(/^admin@/i, "");
  return `recovery-${slug}-${Date.now()}@dummy.local`;
}

export function formatMoney(
  value: number | string,
  currency = "EUR",
  locale = "pt-PT"
) {
  const amount =
    typeof value === "string" ? Number(value) : value;

  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(amount) ? amount : 0);
}