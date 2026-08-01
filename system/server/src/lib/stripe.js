import Stripe from "stripe";
import { PLAN_INTERVALS } from "./onboarding.js";

export function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key || !String(key).trim()) return null;
  return new Stripe(String(key).trim());
}

export function stripeConfigured() {
  return Boolean(process.env.STRIPE_SECRET_KEY?.trim());
}

export function stripeBypassEnabled() {
  return (
    String(process.env.STRIPE_BYPASS_CHECKOUT || "")
      .toLowerCase()
      .trim() === "true"
  );
}

export function appPublicUrl() {
  const raw =
    process.env.APP_PUBLIC_URL ||
    process.env.CLIENT_URL ||
    process.env.VERCEL_PROJECT_PRODUCTION_URL ||
    "http://localhost:5173";
  const withProto = String(raw).startsWith("http")
    ? String(raw)
    : `https://${raw}`;
  return withProto.replace(/\/$/, "");
}

export function stripeCurrency() {
  return String(process.env.STRIPE_CURRENCY || "sar").toLowerCase();
}

export function buildCheckoutLineItem(planInterval) {
  const plan = PLAN_INTERVALS[planInterval];
  if (!plan) return null;
  const currency = stripeCurrency();
  const productName = `ICODO POS — ${plan.labelEn}`;
  return {
    quantity: 1,
    price_data: {
      currency,
      unit_amount: Math.round(plan.amount * 100),
      recurring: {
        interval: plan.interval,
        interval_count: plan.intervalCount,
      },
      product_data: {
        name: productName,
        description: "Point of sale subscription (3-month free trial)",
      },
    },
  };
}
