import React from "react";
import { Link } from "react-router-dom";
import { useI18n } from "../../context/LanguageContext.jsx";
import { useMarketingCopy } from "../../marketing/copy.js";

export default function Pricing() {
  const { locale } = useI18n();
  const c = useMarketingCopy(locale);
  const pr = c.pricing;

  return (
    <>
      <section className="mkt-page-hero mkt-page-hero--premium mkt-page-hero--contact">
        <div className="mkt-page-hero-glow" aria-hidden="true" />
        <div className="mkt-shell">
          <div className="mkt-page-hero-stack">
            <span className="mkt-kicker">{pr.kicker}</span>
            <h1>{pr.title}</h1>
            <p className="mkt-lead">{pr.lead}</p>
          </div>
        </div>
      </section>

      <section className="mkt-section mkt-pricing-trial-section">
        <div className="mkt-shell">
          <div className="mkt-pricing-trial">
            <span className="mkt-pricing-trial-badge">{pr.trialBadge}</span>
            <div>
              <h2>{pr.trialTitle}</h2>
              <p>{pr.trialBody}</p>
            </div>
            <Link to="/register" className="mkt-btn mkt-btn-primary">
              {pr.ctaRegister}
            </Link>
          </div>
        </div>
      </section>

      <section className="mkt-section mkt-section-alt">
        <div className="mkt-shell">
          <div className="mkt-section-head">
            <span className="mkt-kicker">{pr.kicker}</span>
            <h2>{pr.title}</h2>
          </div>
          <div className="mkt-pricing-grid">
            {pr.plans.map((plan) => (
              <article
                key={plan.id}
                className={`mkt-price-card${plan.highlight ? " is-featured" : ""}`}
              >
                {plan.highlight ? <span className="mkt-price-badge">{pr.featured}</span> : null}
                <h3>{plan.name}</h3>
                <div className="mkt-price-amount">
                  <strong>{plan.price}</strong>
                  <span>{pr.currency}</span>
                </div>
                <p className="mkt-price-period">{plan.period}</p>
                <p className="mkt-price-note">{plan.note}</p>
                <ul className="mkt-price-features">
                  {plan.features.map((f) => (
                    <li key={f}>{f}</li>
                  ))}
                </ul>
                <Link
                  to="/register"
                  className={`mkt-btn ${plan.highlight ? "mkt-btn-primary" : "mkt-btn-ghost"}`}
                >
                  {pr.ctaRegister}
                </Link>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="mkt-section">
        <div className="mkt-shell">
          <div className="mkt-section-head">
            <span className="mkt-kicker">{pr.kicker}</span>
            <h2>{pr.includesTitle}</h2>
          </div>
          <ul className="mkt-pricing-includes">
            {pr.includes.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          <div className="mkt-pricing-cta">
            <h2>{pr.ctaTitle}</h2>
            <p>{pr.ctaBody}</p>
            <div className="mkt-page-cta-row">
              <Link to="/register" className="mkt-btn mkt-btn-primary">
                {pr.ctaRegister}
              </Link>
              <Link to="/contact" className="mkt-btn mkt-btn-ghost">
                {pr.ctaContact}
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
