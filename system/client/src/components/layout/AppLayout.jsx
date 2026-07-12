import React, { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext.jsx";
import { useI18n } from "../../context/LanguageContext.jsx";
import { formatUserBranchLine } from "../../utils/displayLabels.js";
import { OfflineBanner } from "../OfflineBanner.jsx";
import { useAlertsBadgeCount } from "../../hooks/useAlertsBadgeCount.js";
import { isVerticalFeatureEnabled } from "../../lib/verticalFeatures.js";
import { SidebarIcon } from "../SidebarIcon.jsx";

const NAV_SECTION_IDS = ["dashboard", "inventory", "profile", "admin"];

/** Which sidebar section owns the current route (for auto-expand). */
function navSectionForPath(pathname) {
  const p = pathname || "";
  if (p.startsWith("/dashboard") || p.startsWith("/alerts") || p.startsWith("/sync-queue")) {
    return "dashboard";
  }
  if (p.startsWith("/products") || p.startsWith("/cash")) return "inventory";
  if (
    p.startsWith("/customer-accounts") ||
    p.startsWith("/audit") ||
    p.startsWith("/customers") ||
    p.startsWith("/loyalty")
  ) {
    return "profile";
  }
  if (p.startsWith("/users") || p.startsWith("/branches") || p.startsWith("/platform")) {
    return "admin";
  }
  return "";
}

function initialOpenSections(pathname) {
  const open = {};
  NAV_SECTION_IDS.forEach((id) => {
    open[id] = false;
  });
  const sec = navSectionForPath(pathname);
  if (sec) open[sec] = true;
  else open.dashboard = true;
  return open;
}

const sidebarLinkClass = ({ isActive }) =>
  `app-sidebar-link${isActive ? " is-active" : ""}`;

function SidebarNavSection({ sectionId, title, icon, expanded, onToggle, t, children }) {
  const visible = React.Children.toArray(children).some(
    (c) => c != null && typeof c !== "boolean",
  );
  if (!visible) return null;
  const panelId = `sidebar-nav-${sectionId}`;
  const hint = expanded ? t("nav.collapseSection", { title }) : t("nav.expandSection", { title });
  return (
    <div className={`app-sidebar-nav-section${expanded ? " is-open" : ""}`}>
      <button
        type="button"
        className="app-sidebar-nav-heading app-sidebar-nav-heading--toggle"
        id={`${panelId}-btn`}
        aria-expanded={expanded}
        aria-controls={panelId}
        onClick={onToggle}
        title={hint}
      >
        <span className="app-sidebar-heading-main">
          {icon ? <SidebarIcon name={icon} /> : null}
          <span>{title}</span>
        </span>
        <span className="app-sidebar-nav-chevron" aria-hidden>
          <SidebarIcon name="chevron" size={14} />
        </span>
      </button>
      <div
        id={panelId}
        className="app-sidebar-nav-panel"
        role="region"
        aria-labelledby={`${panelId}-btn`}
        hidden={!expanded}
      >
        {children}
      </div>
    </div>
  );
}

export function AppLayout() {
  const { user, logout, isAdmin, isManager, isPlatformAdmin } = useAuth();
  const bv = user?.businessVertical;
  const { t, locale } = useI18n();
  const nav = useNavigate();
  const location = useLocation();
  const { count: alertsBadge } = useAlertsBadgeCount();

  const isPosRoute = location.pathname === "/pos";

  const [openSections, setOpenSections] = useState(() =>
    initialOpenSections(typeof window !== "undefined" ? window.location.pathname : ""),
  );

  useEffect(() => {
    const sec = navSectionForPath(location.pathname);
    if (sec) {
      setOpenSections((prev) => ({ ...prev, [sec]: true }));
    }
  }, [location.pathname]);

  const toggleNavSection = (id) => {
    setOpenSections((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="app-layout-shell">
      <aside className="app-sidebar" aria-label={t("nav.brand")}>
        <div className="app-sidebar-header">
          <div className="app-sidebar-brand">
            <img src="/favicon.png" alt="i codo" className="app-sidebar-favicon" width={36} height={36} />
            <span className="app-sidebar-brand-text">i codo</span>
          </div>
        </div>

        <nav className="app-sidebar-nav">
          <SidebarNavSection
            sectionId="dashboard"
            title={t("nav.section.dashboard")}
            icon="dashboard"
            expanded={Boolean(openSections.dashboard)}
            onToggle={() => toggleNavSection("dashboard")}
            t={t}
          >
            <NavLink to="/dashboard" className={sidebarLinkClass}>
              <SidebarIcon name="analytics" />
              <span>{t("nav.analytics")}</span>
            </NavLink>
            <NavLink to="/alerts" className={sidebarLinkClass}>
              <SidebarIcon name="bell" />
              <span className="app-sidebar-link-row">
                <span>{t("nav.notifications")}</span>
                {alertsBadge > 0 ? (
                  <span className="app-sidebar-badge" title={t("nav.notifications")}>
                    {alertsBadge > 99 ? "99+" : alertsBadge}
                  </span>
                ) : null}
              </span>
            </NavLink>
            <NavLink to="/sync-queue" className={sidebarLinkClass}>
              <SidebarIcon name="sync" />
              <span>{t("nav.offlineSync")}</span>
            </NavLink>
          </SidebarNavSection>

          <NavLink to="/pos" className={sidebarLinkClass} end>
            <SidebarIcon name="pos" />
            <span>{t("nav.pos")}</span>
          </NavLink>

          <SidebarNavSection
            sectionId="inventory"
            title={t("nav.section.inventory")}
            icon="inventory"
            expanded={Boolean(openSections.inventory)}
            onToggle={() => toggleNavSection("inventory")}
            t={t}
          >
            <NavLink to="/products" className={sidebarLinkClass}>
              <SidebarIcon name="products" />
              <span>{t("nav.products")}</span>
            </NavLink>
            <NavLink to="/cash" className={sidebarLinkClass}>
              <SidebarIcon name="funds" />
              <span>{t("nav.funds")}</span>
            </NavLink>
          </SidebarNavSection>

          <SidebarNavSection
            sectionId="profile"
            title={t("nav.section.profile")}
            icon="profile"
            expanded={Boolean(openSections.profile)}
            onToggle={() => toggleNavSection("profile")}
            t={t}
          >
            {isVerticalFeatureEnabled("customerAccounts", bv) ? (
              <NavLink to="/customer-accounts" className={sidebarLinkClass}>
                <SidebarIcon name="accounts" />
                <span>{t("nav.accounts")}</span>
              </NavLink>
            ) : null}
            {isManager ? (
              <NavLink to="/audit" className={sidebarLinkClass}>
                <SidebarIcon name="audit" />
                <span>{t("nav.auditLogs")}</span>
              </NavLink>
            ) : null}
            <NavLink to="/customers" className={sidebarLinkClass}>
              <SidebarIcon name="customers" />
              <span>{t("nav.customers")}</span>
            </NavLink>
            {isManager ? (
              <NavLink to="/loyalty" className={sidebarLinkClass}>
                <SidebarIcon name="coupons" />
                <span>{t("nav.coupons")}</span>
              </NavLink>
            ) : null}
          </SidebarNavSection>

          <SidebarNavSection
            sectionId="admin"
            title={t("nav.section.administration")}
            icon="admin"
            expanded={Boolean(openSections.admin)}
            onToggle={() => toggleNavSection("admin")}
            t={t}
          >
            {isPlatformAdmin ? (
              <NavLink to="/platform/organizations" className={sidebarLinkClass}>
                <SidebarIcon name="platform" />
                <span>{t("nav.platform")}</span>
              </NavLink>
            ) : null}
            {isAdmin ? (
              <NavLink to="/users" className={sidebarLinkClass}>
                <SidebarIcon name="users" />
                <span>{t("nav.users")}</span>
              </NavLink>
            ) : null}
            {isAdmin ? (
              <NavLink to="/branches" className={sidebarLinkClass}>
                <SidebarIcon name="branches" />
                <span>{t("nav.branches")}</span>
              </NavLink>
            ) : null}
          </SidebarNavSection>

          <NavLink to="/settings" className={sidebarLinkClass}>
            <SidebarIcon name="settings" />
            <span>{t("nav.settings")}</span>
          </NavLink>
        </nav>

        <div className="app-sidebar-footer">
          <div className="app-sidebar-user">{formatUserBranchLine(user, locale, t("nav.allBranches"))}</div>
          <button
            type="button"
            className="app-sidebar-logout"
            onClick={() => {
              logout();
              nav("/login");
            }}
          >
            <SidebarIcon name="logout" />
            <span>{t("nav.logout")}</span>
          </button>
        </div>
      </aside>

      <div className="app-main-wrap">
        <OfflineBanner />
        <main className={`app-main-content${isPosRoute ? " app-main-content--pos-wide" : ""}`}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
