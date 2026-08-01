import { prisma } from "./prisma.js";

/** First three months free (Stripe subscription trial). */
export const TRIAL_DAYS = 90;

/** Plan intervals offered at Stripe checkout (amounts in major currency units). */
export const PLAN_INTERVALS = {
  month: {
    id: "month",
    amount: 150,
    interval: "month",
    intervalCount: 1,
    labelEn: "Monthly",
    labelAr: "شهري",
  },
  six: {
    id: "six",
    amount: 600,
    interval: "month",
    intervalCount: 6,
    labelEn: "6 months",
    labelAr: "٦ أشهر",
  },
  year: {
    id: "year",
    amount: 1000,
    interval: "year",
    intervalCount: 1,
    labelEn: "Yearly",
    labelAr: "سنوي",
  },
};

export const REQUIRED_DOC_TYPES = ["CR", "OWNER_ID"];
export const OPTIONAL_DOC_TYPES = ["VAT", "LICENSE", "IBAN"];
export const ALL_DOC_TYPES = [...REQUIRED_DOC_TYPES, ...OPTIONAL_DOC_TYPES];

export const GULF_COUNTRIES = [
  "QA",
  "SA",
  "AE",
  "KW",
  "BH",
  "OM",
];

export function onboardingStatusFromOrg(org) {
  const profileDocsDone = Boolean(org?.profileDocsDone);
  const paymentDone = Boolean(org?.paymentDone);
  let nextStep = "COMPLETE";
  if (!profileDocsDone) nextStep = "PROFILE";
  else if (!paymentDone) nextStep = "PAYMENT";
  return {
    profileDocsDone,
    paymentDone,
    complete: profileDocsDone && paymentDone,
    nextStep,
  };
}

export function clientOnboardingPayload(org, documentTypes = []) {
  const status = onboardingStatusFromOrg(org);
  return {
    ...status,
    legalName: org.legalName ?? "",
    country: org.country ?? "",
    city: org.city ?? "",
    addressText: org.addressText ?? "",
    crNumber: org.crNumber ?? "",
    licenseNumber: org.licenseNumber ?? "",
    ownerFullName: org.ownerFullName ?? "",
    ownerIdNumber: org.ownerIdNumber ?? "",
    ownerPhone: org.ownerPhone ?? "",
    vatNumber: org.vatNumber ?? "",
    taxNumber: org.taxNumber ?? "",
    iban: org.iban ?? "",
    authorizedPersonName: org.authorizedPersonName ?? "",
    termsAcceptedAt: org.termsAcceptedAt ?? null,
    selectedPlanInterval: org.selectedPlanInterval ?? null,
    documents: ALL_DOC_TYPES.map((docType) => ({
      docType,
      uploaded: documentTypes.includes(docType),
      required: REQUIRED_DOC_TYPES.includes(docType),
    })),
    plans: Object.values(PLAN_INTERVALS).map((p) => ({
      id: p.id,
      amount: p.amount,
      interval: p.interval,
      intervalCount: p.intervalCount,
    })),
  };
}

export async function markPaymentComplete(
  org,
  { stripeCustomerId, stripeSubscriptionId, planInterval, reference }
) {
  const amount = PLAN_INTERVALS[planInterval]?.amount ?? null;
  const updated = await prisma.organization.update({
    where: { id: org.id },
    data: {
      paymentDone: true,
      selectedPlanInterval: planInterval || org.selectedPlanInterval,
      plan: "PREMIUM",
      maxBranches: Math.max(org.maxBranches || 3, 10),
      ...(stripeCustomerId ? { stripeCustomerId } : {}),
      ...(stripeSubscriptionId ? { stripeSubscriptionId } : {}),
    },
  });

  if (reference) {
    const existing = await prisma.organizationPlanPurchase.findFirst({
      where: { organizationId: org.id, reference },
    });
    if (!existing) {
      await prisma.organizationPlanPurchase.create({
        data: {
          organizationId: org.id,
          plan: "PREMIUM",
          amount,
          currency: "SAR",
          reference,
          note: `Stripe checkout (${planInterval || "plan"}) — ${TRIAL_DAYS}-day trial`,
        },
      });
    }
  }
  return updated;
}
