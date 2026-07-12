import React from "react";
import { Link } from "react-router-dom";
import { useI18n } from "../../context/LanguageContext.jsx";
import { useMarketingCopy } from "../../marketing/copy.js";
import { IcodoLogo } from "../../marketing/IcodoLogo.jsx";

export default function Home() {
  const { locale } = useI18n();
  const c = useMarketingCopy(locale);
  const h = c.home;

  return (
    <>
      <section className="mkt-hero">
        <div className="mkt-hero-glow mkt-hero-glow-a" aria-hidden="true" />
        <div className="mkt-hero-glow mkt-hero-glow-b" aria-hidden="true" />
        <div className="mkt-shell mkt-hero-grid">
          <div className="mkt-hero-copy">
            <div className="mkt-hero-brand">
              <IcodoLogo variant="dark" width={300} className="mkt-hero-logo-img" />
            </div>
            <h1>{h.headline}</h1>
            <p>{h.support}</p>
            <div className="mkt-hero-cta">
              <Link to="/register" className="mkt-btn mkt-btn-sky">
                {h.ctaPrimary}
              </Link>
              <Link
                to="/about"
                className="mkt-btn mkt-btn-ghost mkt-btn-on-dark"
              >
                {h.ctaSecondary}
              </Link>
            </div>
          </div>

          <div className="mkt-hero-stage" aria-hidden="true">
            <div className="mkt-pos-preview">
              <div className="mkt-pos-preview-bar">
                <span />
                <span />
                <span />
                <em>POS</em>
              </div>
              <div className="mkt-pos-preview-body">
                <div className="mkt-pos-preview-grid">
                  <i />
                  <i />
                  <i />
                  <i />
                  <i />
                  <i />
                </div>
                <div className="mkt-pos-preview-cart">
                  <b />
                  <b />
                  <b className="is-total" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mkt-section mkt-section-alt">
        <div className="mkt-shell">
          <span className="mkt-kicker">{h.kickerSolutions}</span>
          <h2>{h.solutionsTitle}</h2>
          <p className="mkt-lead">{h.solutionsLead}</p>
          <div className="mkt-grid-3">
            {h.features.map((f) => (
              <article key={f.icon} className="mkt-feature">
                <div className="mkt-feature-icon">{f.icon}</div>
                <h3>{f.title}</h3>
                <p>{f.body}</p>
              </article>
            ))}
          </div>
          <div className="mkt-stats">
            {h.stats.map((s) => (
              <div key={s.label} className="mkt-stat">
                <strong>{s.value}</strong>
                <span>{s.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mkt-section">
        <div className="mkt-shell">
          <span className="mkt-kicker">{h.kickerVerticals}</span>
          <h2>{h.verticalsTitle}</h2>
          <p className="mkt-lead">{h.verticalsLead}</p>
          <div className="mkt-verticals">
            {h.verticals.map((v) => (
              <span key={v} className="mkt-chip">
                {v}
              </span>
            ))}
          </div>
        </div>
      </section>

      <section className="mkt-cta-band">
        <div className="mkt-shell">
          <h2>{h.ctaTitle}</h2>
          <p>{h.ctaBody}</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem" }}>
            <Link to="/register" className="mkt-btn mkt-btn-primary">
              {h.ctaButton}
            </Link>
            <Link to="/contact" className="mkt-btn mkt-btn-ghost mkt-btn-on-dark">
              {h.ctaContact}
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
