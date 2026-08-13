import React, { useEffect, useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { useI18n } from "../context/LanguageContext.jsx";
import { useMarketingCopy } from "./copy.js";
import { IcodoNavBrand, IcodoLogo } from "./IcodoLogo.jsx";
import { LanguageSwitcher } from "../components/LanguageSwitcher.jsx";
import "./marketing.css";

export function MarketingLayout() {
  const { locale } = useI18n();
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

  useEffect(() => {
    if (!menuOpen) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [menuOpen]);

  const navClass = ({ isActive }) => (isActive ? "is-active" : undefined);

  return (
    <div className="mkt" data-theme="light">
      <header className={`mkt-nav${scrolled ? " is-scrolled" : ""}${menuOpen ? " is-menu-open" : ""}`}>
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
            <NavLink to="/pricing" className={navClass}>
              {c.nav.pricing}
            </NavLink>
            <NavLink to="/contact" className={navClass}>
              {c.nav.contact}
            </NavLink>
          </nav>

          <div className="mkt-nav-actions">
            <div className="mkt-nav-actions-desktop">
              <LanguageSwitcher variant="compact" className="mkt-lang-switch" />
              <Link to="/login" className="mkt-btn mkt-btn-ghost mkt-nav-cta">
                {c.nav.signIn}
              </Link>
              <Link to="/register" className="mkt-btn mkt-btn-primary mkt-nav-cta">
                {c.nav.signUp}
              </Link>
            </div>
            <button
              type="button"
              className="mkt-nav-toggle"
              aria-label={menuOpen ? c.nav.closeMenu || c.nav.openMenu : c.nav.openMenu}
              aria-expanded={menuOpen}
              aria-controls="mkt-mobile-drawer"
              onClick={() => setMenuOpen((v) => !v)}
            >
              {menuOpen ? "✕" : "☰"}
            </button>
          </div>
        </div>

        {menuOpen ? (
          <>
            <button
              type="button"
              className="mkt-nav-backdrop"
              aria-label={c.nav.closeMenu || c.nav.openMenu}
              onClick={() => setMenuOpen(false)}
            />
            <div id="mkt-mobile-drawer" className="mkt-nav-drawer" role="dialog" aria-modal="true">
              <nav className="mkt-nav-drawer-links" aria-label="Main">
                <NavLink to="/" end className={navClass} onClick={() => setMenuOpen(false)}>
                  {c.nav.home}
                </NavLink>
                <NavLink to="/about" className={navClass} onClick={() => setMenuOpen(false)}>
                  {c.nav.about}
                </NavLink>
                <NavLink to="/pricing" className={navClass} onClick={() => setMenuOpen(false)}>
                  {c.nav.pricing}
                </NavLink>
                <NavLink to="/contact" className={navClass} onClick={() => setMenuOpen(false)}>
                  {c.nav.contact}
                </NavLink>
              </nav>
              <div className="mkt-nav-drawer-actions">
                <LanguageSwitcher variant="compact" className="mkt-lang-switch mkt-lang-switch--drawer" />
                <Link
                  to="/login"
                  className="mkt-btn mkt-btn-ghost mkt-btn-block"
                  onClick={() => setMenuOpen(false)}
                >
                  {c.nav.signIn}
                </Link>
                <Link
                  to="/register"
                  className="mkt-btn mkt-btn-primary mkt-btn-block"
                  onClick={() => setMenuOpen(false)}
                >
                  {c.nav.signUp}
                </Link>
              </div>
            </div>
          </>
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
                    <Link to="/pricing">{c.nav.pricing}</Link>
                  </li>
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
                    <Link to="/privacy">{c.nav.privacy}</Link>
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
            <div className="mkt-footer-bottom-links">
              <Link to="/privacy">{c.nav.privacy}</Link>
              <span>{c.footer.builtBy}</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
