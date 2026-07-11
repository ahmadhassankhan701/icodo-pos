import React from "react";
import { Link } from "react-router-dom";
import { useI18n } from "../context/LanguageContext.jsx";
import { useMarketingCopy } from "./copy.js";
import { IcodoNavBrand, IcodoLogo } from "./IcodoLogo.jsx";
import "./marketing.css";

/** Shared chrome for Sign in / Sign up — same shell width as marketing pages */
export function AuthShell({ title, subtitle, children }) {
  const { locale, setLocale } = useI18n();
  const c = useMarketingCopy(locale);

  return (
    <div className="mkt" data-theme="light">
      <header className="mkt-nav">
        <div className="mkt-shell mkt-nav-inner">
          <Link to="/" className="mkt-brand" aria-label="i codo POS">
            <IcodoNavBrand posLabel={c.brandProduct} />
          </Link>
          <div className="mkt-nav-actions">
            <button
              type="button"
              className="mkt-btn mkt-btn-ghost"
              style={{ minHeight: "2.5rem", padding: "0.4rem 0.75rem" }}
              onClick={() => setLocale(locale === "ar" ? "en" : "ar")}
            >
              {locale === "ar" ? "EN" : "ع"}
            </button>
            <Link to="/" className="mkt-btn mkt-btn-ghost" style={{ minHeight: "2.5rem" }}>
              {c.auth.backHome}
            </Link>
          </div>
        </div>
      </header>

      <div className="mkt-auth-wrap">
        <div className="mkt-shell mkt-auth">
          <div className="mkt-auth-panel">
            <div className="mkt-auth-card">
              <h1>{title}</h1>
              <p className="mkt-auth-sub">{subtitle}</p>
              {children}
            </div>
          </div>
          <div className="mkt-auth-visual" aria-hidden="true">
            <IcodoLogo variant="dark" height={140} className="mkt-auth-logo" />
            <h2>{c.auth.visualTitle}</h2>
            <p>{c.auth.visualBody}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
