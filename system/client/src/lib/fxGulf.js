/**
 * Gulf FX vs SAR — mirror of server/src/lib/fxGulf.js for client display.
 */
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

export function currencyLabel(code, locale = "ar") {
  const labels = {
    SAR: { ar: "ر.س", en: "SAR" },
    QAR: { ar: "ر.ق", en: "QAR" },
    AED: { ar: "د.إ", en: "AED" },
    KWD: { ar: "د.ك", en: "KWD" },
    BHD: { ar: "د.ب", en: "BHD" },
    OMR: { ar: "ر.ع", en: "OMR" },
  };
  const row = labels[normalizeCurrency(code)] || labels.SAR;
  return locale === "en" ? row.en : row.ar;
}

export function sarToLocal(amountSar, currency) {
  const code = normalizeCurrency(currency);
  const rate = LOCAL_PER_SAR[code] ?? 1;
  const n = Number(amountSar) || 0;
  const decimals = code === "KWD" || code === "BHD" || code === "OMR" ? 3 : 2;
  return Number((n * rate).toFixed(decimals));
}

export function formatMoneySarAsLocal(amountSar, currency, locale = "ar") {
  const code = normalizeCurrency(currency);
  const local = sarToLocal(amountSar, code);
  const decimals = code === "KWD" || code === "BHD" || code === "OMR" ? 3 : 2;
  return `${local.toFixed(decimals)} ${currencyLabel(code, locale)}`;
}
