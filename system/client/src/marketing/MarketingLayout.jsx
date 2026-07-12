import React, { useEffect, useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { useI18n } from "../context/LanguageContext.jsx";
import { useMarketingCopy } from "./copy.js";
import { IcodoNavBrand, IcodoLogo } from "./IcodoLogo.jsx";
import "./marketing.css";

export function MarketingLayout() {
  const { locale, setLocale } = useI18n();
  const c = useMarketingCopy(locale);
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setMenuOpen(false);
    window.scrollTo(0, 0);
  }, [location.pathname]);

  const navClass = ({ isActive }) => (isActive ? "is-active" : undefined);

  return (
    <div className="mkt" data-theme="light">
      <header className={`mkt-nav${scrolled ? " is-scrolled" : ""}`}>
        <div className="mkt-shell mkt-nav-inner">
          <Link to="/" className="mkt-brand" aria-label="i codo POS">
            <IcodoNavBrand posLabel={c.brandProduct} />
          </Link>

          <nav className="mkt-nav-links" aria-label="Main">
            <NavLink to="/" end className={navClass}>
              {c.nav.home}
            </NavLink>
            <NavLink to="/about" className={navClass}>
              {c.nav.about}
            </NavLink>
            <NavLink to="/contact" className={navClass}>
              {c.nav.contact}
            </NavLink>
          </nav>

          <div className="mkt-nav-actions">
            <button
              type="button"
              className="mkt-btn mkt-btn-ghost"
              style={{ minHeight: "2.5rem", padding: "0.4rem 0.75rem" }}
              onClick={() => setLocale(locale === "ar" ? "en" : "ar")}
            >
              {locale === "ar" ? "EN" : "ع"}
            </button>
            <Link to="/login" className="mkt-btn mkt-btn-ghost" style={{ minHeight: "2.5rem" }}>
              {c.nav.signIn}
            </Link>
            <Link to="/register" className="mkt-btn mkt-btn-primary" style={{ minHeight: "2.5rem" }}>
              {c.nav.signUp}
            </Link>
            <button
              type="button"
              className="mkt-nav-toggle"
              aria-label={c.nav.openMenu}
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((v) => !v)}
            >
              ☰
            </button>
          </div>
        </div>
        {menuOpen ? (
          <div className="mkt-shell mkt-nav-mobile">
            <NavLink to="/" end>
              {c.nav.home}
            </NavLink>
            <NavLink to="/about">{c.nav.about}</NavLink>
            <NavLink to="/contact">{c.nav.contact}</NavLink>
          </div>
        ) : null}
      </header>

      <Outlet />

      <footer className="mkt-footer">
        <div className="mkt-shell">
          <div className="mkt-footer-top">
            <div className="mkt-footer-brand">
              <Link to="/" className="mkt-brand mkt-brand-footer" aria-label="i codo">
                <IcodoLogo variant="dark" width={200} />
              </Link>
              <p className="mkt-footer-tagline">{c.footer.tagline}</p>
            </div>
            <div className="mkt-footer-cols">
              <div>
                <h4>{c.footer.product}</h4>
                <ul>
                  <li>
                    <Link to="/register">{c.nav.signUp}</Link>
                  </li>
                  <li>
                    <Link to="/login">{c.nav.signIn}</Link>
                  </li>
                  <li>
                    <a href="https://www.icodo.io/" target="_blank" rel="noreferrer">
                      icodo.io
                    </a>
                  </li>
                </ul>
              </div>
              <div>
                <h4>{c.footer.company}</h4>
                <ul>
                  <li>
                    <Link to="/about">{c.nav.about}</Link>
                  </li>
                  <li>
                    <Link to="/contact">{c.nav.contact}</Link>
                  </li>
                  <li>
                    <a href="mailto:hello@icodo.io">hello@icodo.io</a>
                  </li>
                </ul>
              </div>
            </div>
          </div>
          <div className="mkt-footer-bottom">
            <span>
              © {new Date().getFullYear()} i codo. {c.footer.rights}
            </span>
            <span>{c.footer.builtBy}</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
