import React, { useCallback, useEffect, useState } from "react";
import { api } from "../api/client.js";
import { useI18n } from "../context/LanguageContext.jsx";

function formatMoney(value, currency, locale) {
  if (value == null) return "—";
  try {
    return new Intl.NumberFormat(locale === "ar" ? "ar-SA" : "en-US", {
      style: "currency",
      currency: currency || "SAR",
      maximumFractionDigits: 2,
    }).format(Number(value));
  } catch {
    return `${Number(value).toFixed(2)} ${currency || "SAR"}`;
  }
}

export default function Plan() {
  const { t, locale } = useI18n();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setData(await api("/api/plan"));
    } catch (requestError) {
      setData(null);
      setError(requestError.message || t("plan.loadFailed"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    load();
  }, [load]);

  const current = data?.current;
  const purchases = Array.isArray(data?.purchases) ? data.purchases : [];
  const planName = current?.plan || "FREE";
  const isPremium = planName === "PREMIUM";

  return (
    <div className="plan-page">
      <header className="plan-page__header">
        <div>
          <h1>{t("plan.title")}</h1>
          <p>{t("plan.intro")}</p>
        </div>
        <button
          type="button"
          className="btn-touch plan-page__refresh"
          onClick={load}
          disabled={loading}
        >
          {t("pos.refresh")}
        </button>
      </header>

      {error ? <div className="card plan-page__error">{error}</div> : null}

      {loading && !current ? (
        <div className="card plan-page__loading">{t("common.loading")}</div>
      ) : current ? (
        <>
          <section className={`plan-current${isPremium ? " plan-current--premium" : ""}`}>
            <div className="plan-current__copy">
              <span className="plan-current__eyebrow">{t("plan.currentPlan")}</span>
              <div className="plan-current__name-row">
                <h2>{t(`plan.name.${planName}`)}</h2>
                <span className="plan-current__badge">
                  {isPremium ? t("plan.activePremium") : t("plan.active")}
                </span>
              </div>
              <p>{current.name}</p>
            </div>

            <div className="plan-current__mark" aria-hidden="true">
              <svg
                width="34"
                height="34"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="m3 8 4 9h10l4-9-5 3-4-6-4 6-5-3Z" />
                <path d="M7 20h10" />
              </svg>
            </div>

            <div className="plan-current__stats">
              <div>
                <span>{t("plan.branches")}</span>
                <strong>
                  {current.branchCount} / {current.maxBranches}
                </strong>
              </div>
              <div>
                <span>{t("plan.users")}</span>
                <strong>{current.userCount}</strong>
              </div>
              <div>
                <span>{t("plan.memberSince")}</span>
                <strong>{new Date(current.createdAt).toLocaleDateString()}</strong>
              </div>
            </div>
          </section>

          {current.atBranchLimit ? (
            <div className="card" style={{ color: "var(--danger)", fontSize: 14 }}>
              {t("plan.branchLimitReached", {
                max: String(current.maxBranches),
                count: String(current.branchCount),
              })}
            </div>
          ) : (
            <div className="card" style={{ color: "var(--muted)", fontSize: 14 }}>
              {t("plan.branchesRemaining", {
                n: String(current.branchesRemaining ?? Math.max(0, current.maxBranches - current.branchCount)),
              })}
            </div>
          )}

          <section className="card plan-history">
            <div className="plan-history__head">
              <div>
                <h2>{t("plan.historyTitle")}</h2>
                <p>{t("plan.historyIntro")}</p>
              </div>
              <span>{t("plan.purchaseCount", { count: purchases.length })}</span>
            </div>

            <div className="plan-history__table-wrap">
              <table className="plan-history__table">
                <thead>
                  <tr>
                    <th>{t("plan.date")}</th>
                    <th>{t("plan.plan")}</th>
                    <th>{t("plan.amount")}</th>
                    <th>{t("plan.reference")}</th>
                    <th>{t("plan.note")}</th>
                  </tr>
                </thead>
                <tbody>
                  {purchases.length === 0 ? (
                    <tr>
                      <td colSpan={5}>
                        <div className="plan-history__empty">
                          <span aria-hidden="true">◇</span>
                          <strong>{t("plan.emptyTitle")}</strong>
                          <p>{t("plan.emptyHint")}</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    purchases.map((purchase) => (
                      <tr key={purchase.id}>
                        <td className="plan-history__date">
                          {new Date(purchase.purchasedAt).toLocaleString()}
                        </td>
                        <td>
                          <span className="plan-history__plan">
                            {t(`plan.name.${purchase.plan}`)}
                          </span>
                        </td>
                        <td>
                          {formatMoney(purchase.amount, purchase.currency, locale)}
                        </td>
                        <td>{purchase.reference || "—"}</td>
                        <td>{purchase.note || "—"}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </>
      ) : null}
    </div>
  );
}
