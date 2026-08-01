import React, { useEffect, useState } from "react";
import { Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { api } from "../../api/client.js";
import { useAuth } from "../../context/AuthContext.jsx";
import { useI18n } from "../../context/LanguageContext.jsx";
import { getPostAuthPath, isOnboardingComplete } from "../../lib/onboardingPath.js";
import { OnboardingShell } from "./OnboardingShell.jsx";

export default function OnboardingPayment() {
  const { user, loading, refreshUser } = useAuth();
  const { t } = useI18n();
  const nav = useNavigate();
  const [params] = useSearchParams();
  const [plans, setPlans] = useState([]);
  const [selected, setSelected] = useState("year");
  const [err, setErr] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [boot, setBoot] = useState(true);

  useEffect(() => {
    if (params.get("cancelled") === "1") {
      setErr(t("onboarding.paymentCancelled"));
    }
  }, [params, t]);

  useEffect(() => {
    if (!user || loading) return;
    if (isOnboardingComplete(user)) return;
    if (user.role !== "ADMIN") return;
    if (!user.onboarding?.profileDocsDone) {
      nav("/onboarding/profile", { replace: true });
      return;
    }
    api("/api/onboarding/status")
      .then((data) => {
        setPlans(data.onboarding?.plans || []);
        if (data.onboarding?.selectedPlanInterval) {
          setSelected(data.onboarding.selectedPlanInterval);
        }
      })
      .catch((e) => setErr(e.message || t("onboarding.loadFailed")))
      .finally(() => setBoot(false));
  }, [user, loading, nav, t]);

  if (loading || boot) {
    return (
      <div style={{ padding: 24, textAlign: "center" }}>{t("common.loading")}</div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  if (isOnboardingComplete(user)) {
    return <Navigate to={getPostAuthPath(user)} replace />;
  }
  if (user.role !== "ADMIN") return <Navigate to="/onboarding/pending" replace />;
  if (!user.onboarding?.profileDocsDone) {
    return <Navigate to="/onboarding/profile" replace />;
  }

  const startCheckout = async () => {
    setErr("");
    setSubmitting(true);
    try {
      const data = await api("/api/onboarding/checkout-session", {
        method: "POST",
        body: { planInterval: selected },
      });
      if (data.bypass) {
        await refreshUser();
        nav("/dashboard", { replace: true });
        return;
      }
      if (data.url) {
        window.location.href = data.url;
        return;
      }
      setErr(t("onboarding.paymentFailed"));
    } catch (x) {
      setErr(x.message || t("onboarding.paymentFailed"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <OnboardingShell
      stepKey="payment"
      title={t("onboarding.paymentTitle")}
      subtitle={t("onboarding.paymentSubtitle")}
    >
      <div className="mkt-onboarding-trial">{t("onboarding.trialBanner")}</div>
      <div className="mkt-onboarding-plans">
        {(plans.length
          ? plans
          : [
              { id: "month", amount: 150 },
              { id: "six", amount: 600 },
              { id: "year", amount: 1000 },
            ]
        ).map((p) => (
          <button
            key={p.id}
            type="button"
            className={`mkt-onboarding-plan${selected === p.id ? " is-selected" : ""}`}
            onClick={() => setSelected(p.id)}
          >
            <strong>{t(`onboarding.plan.${p.id}`)}</strong>
            <span className="mkt-onboarding-plan-price">
              {p.amount} {t("common.currency")}
            </span>
            <span className="mkt-onboarding-plan-note">{t(`onboarding.planNote.${p.id}`)}</span>
          </button>
        ))}
      </div>

      {err ? (
        <div className="mkt-error" role="alert">
          {err}
        </div>
      ) : null}

      <button
        type="button"
        className="mkt-btn mkt-btn-primary mkt-btn-block"
        disabled={submitting}
        onClick={startCheckout}
      >
        {submitting ? t("onboarding.redirectingStripe") : t("onboarding.payWithStripe")}
      </button>
      <p className="mkt-onboarding-hint" style={{ marginTop: 12 }}>
        {t("onboarding.stripeHint")}
      </p>
    </OnboardingShell>
  );
}
