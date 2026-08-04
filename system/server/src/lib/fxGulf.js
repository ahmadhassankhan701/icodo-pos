/**
 * Gulf FX vs SAR (billing source of truth).
 * Pegs / published mid rates for display conversion only — Stripe always charges SAR.
 */
export const SAR_PER_UNIT = {
  SAR: 1,
  QAR: 1, // QAR is pegged ~1:1 with SAR for retail display
  AED: 1.02, // ~1 AED ≈ 1.02 SAR (inverse used below)
  KWD: 12.25,
  BHD: 9.95,
  OMR: 9.75,
};

/** How many local units equal 1 SAR (approx). */
export const LOCAL_PER_SAR = {
  SAR: 1,
  QAR: 1,
  AED: 0.98,
  KWD: 0.082,
  BHD: 0.1,
  OMR: 0.103,
};

export function normalizeCurrency(code) {
  const c = String(code || "SAR").trim().toUpperCase();
  return LOCAL_PER_SAR[c] != null ? c : "SAR";
}

export function currencyFromCountry(countryCode) {
  const map = {
    SA: "SAR",
    QA: "QAR",
    AE: "AED",
    KW: "KWD",
    BH: "BHD",
    OM: "OMR",
  };
  return map[String(countryCode || "SA").toUpperCase()] || "SAR";
}

/** Convert SAR plan amount → local major units for display. */
export function sarToLocal(amountSar, currency) {
  const code = normalizeCurrency(currency);
  const rate = LOCAL_PER_SAR[code] ?? 1;
  const n = Number(amountSar) || 0;
  const decimals = code === "KWD" || code === "BHD" || code === "OMR" ? 3 : 2;
  const local = n * rate;
  return Number(local.toFixed(decimals));
}

export function formatLocalAmount(amountSar, currency, locale = "ar") {
  const code = normalizeCurrency(currency);
  const local = sarToLocal(amountSar, code);
  const labels = {
    SAR: { ar: "ر.س", en: "SAR" },
    QAR: { ar: "ر.ق", en: "QAR" },
    AED: { ar: "د.إ", en: "AED" },
    KWD: { ar: "د.ك", en: "KWD" },
    BHD: { ar: "د.ب", en: "BHD" },
    OMR: { ar: "ر.ع", en: "OMR" },
  };
  const label = labels[code]?.[locale === "en" ? "en" : "ar"] || code;
  const decimals = code === "KWD" || code === "BHD" || code === "OMR" ? 3 : 2;
  return { amount: local, code, label, formatted: `${local.toFixed(decimals)} ${label}` };
}

export function planDisplayPayload(plan, countryOrCurrency) {
  const currency =
    String(countryOrCurrency || "").length === 2
      ? currencyFromCountry(countryOrCurrency)
      : normalizeCurrency(countryOrCurrency);
  const amountSar = Number(plan.amount) || 0;
  const local = formatLocalAmount(amountSar, currency, "en");
  return {
    id: plan.id,
    amountSar,
    amountLocal: local.amount,
    currencyLocal: local.code,
    currencyCharge: "SAR",
    interval: plan.interval,
    intervalCount: plan.intervalCount,
    labelEn: plan.labelEn,
    labelAr: plan.labelAr,
  };
}
