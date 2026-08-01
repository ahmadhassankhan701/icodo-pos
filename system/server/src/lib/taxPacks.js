/** Default GCC VAT / currency packs */
export const TAX_PACKS = {
  QA: { countryCode: "QA", currency: "QAR", standardRate: 0, labelEn: "Qatar", labelAr: "قطر" },
  SA: { countryCode: "SA", currency: "SAR", standardRate: 15, labelEn: "Saudi Arabia", labelAr: "السعودية" },
  AE: { countryCode: "AE", currency: "AED", standardRate: 5, labelEn: "UAE", labelAr: "الإمارات" },
  KW: { countryCode: "KW", currency: "KWD", standardRate: 0, labelEn: "Kuwait", labelAr: "الكويت" },
  BH: { countryCode: "BH", currency: "BHD", standardRate: 10, labelEn: "Bahrain", labelAr: "البحرين" },
  OM: { countryCode: "OM", currency: "OMR", standardRate: 5, labelEn: "Oman", labelAr: "عُمان" },
};

export const ALLOWED_TAX_RATES = [0, 5, 10, 15];

export function packForCountry(countryCode) {
  const code = String(countryCode || "QA").trim().toUpperCase();
  return TAX_PACKS[code] || TAX_PACKS.QA;
}

export function currencyLabel(currency, locale = "ar") {
  const map = {
    SAR: { ar: "ر.س", en: "SAR" },
    QAR: { ar: "ر.ق", en: "QAR" },
    AED: { ar: "د.إ", en: "AED" },
    KWD: { ar: "د.ك", en: "KWD" },
    BHD: { ar: "د.ب", en: "BHD" },
    OMR: { ar: "ر.ع", en: "OMR" },
  };
  const row = map[String(currency || "SAR").toUpperCase()] || map.SAR;
  return locale === "en" ? row.en : row.ar;
}

export function summarizeTaxSettings(row, org = null) {
  const rate = Number(row?.standardRate ?? 0);
  const currency = row?.currency || "QAR";
  return {
    enabled: row?.enabled !== false,
    countryCode: row?.countryCode || "QA",
    currency,
    currencyLabelAr: currencyLabel(currency, "ar"),
    currencyLabelEn: currencyLabel(currency, "en"),
    standardRate: rate,
    defaultTaxPercent: row?.enabled === false ? 0 : rate,
    pricesIncludeTax: Boolean(row?.pricesIncludeTax),
    vatNumber: org?.vatNumber || null,
    taxNumber: org?.taxNumber || null,
    allowedRates: ALLOWED_TAX_RATES,
    packs: Object.values(TAX_PACKS),
  };
}

export async function getOrCreateTaxSettings(prismaClient, organizationId) {
  const existing = await prismaClient.organizationTaxSettings.findUnique({
    where: { organizationId },
  });
  if (existing) return existing;

  const org = await prismaClient.organization.findUnique({
    where: { id: organizationId },
    select: { country: true },
  });
  const pack = packForCountry(org?.country || "QA");
  return prismaClient.organizationTaxSettings.create({
    data: {
      organizationId,
      countryCode: pack.countryCode,
      currency: pack.currency,
      standardRate: pack.standardRate,
      pricesIncludeTax: false,
      enabled: true,
    },
  });
}

/** Keep tax pack in sync when onboarding country changes */
export async function syncTaxPackFromCountry(prismaClient, organizationId, countryCode) {
  const pack = packForCountry(countryCode);
  await getOrCreateTaxSettings(prismaClient, organizationId);
  return prismaClient.organizationTaxSettings.update({
    where: { organizationId },
    data: {
      countryCode: pack.countryCode,
      currency: pack.currency,
      standardRate: pack.standardRate,
    },
  });
}

/** Resolve effective tax % for a sale (client override clamped to allowed rates). */
export function resolveSaleTaxPercent(clientTaxPercent, taxSettings) {
  const summary = summarizeTaxSettings(taxSettings);
  if (!summary.enabled) return 0;
  if (clientTaxPercent == null || String(clientTaxPercent).trim() === "") {
    return summary.defaultTaxPercent;
  }
  const n = Number(clientTaxPercent);
  if (!Number.isFinite(n) || n < 0) return summary.defaultTaxPercent;
  const rounded = Math.round(n * 100) / 100;
  if (ALLOWED_TAX_RATES.includes(rounded) || ALLOWED_TAX_RATES.includes(Math.round(rounded))) {
    return Math.min(100, Math.max(0, rounded));
  }
  // Allow custom but clamp 0–100 for edge cases
  return Math.min(100, Math.max(0, rounded));
}
