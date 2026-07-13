import React, { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext.jsx";
import { useI18n } from "../../context/LanguageContext.jsx";
import { useTheme } from "../../context/ThemeContext.jsx";
import { useBranchContext } from "../../context/BranchContext.jsx";
import { formatUserBranchLine, branchDisplayName } from "../../utils/displayLabels.js";
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
  if (p.startsWith("/products") || p.startsWith("/categories") || p.startsWith("/cash")) return "inventory";
  if (
    p.startsWith("/customer-accounts") ||
    p.startsWith("/audit") ||
    p.startsWith("/customers") ||
    p.startsWith("/loyalty")
  ) {
    return "profile";
  }
  if (p.startsWith("/users") || p.startsWith("/branches") || p.startsWith("/platform") || p.startsWith("/permissions")) {
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
  const { user, logout, isAdmin, isManager, isPlatformAdmin, can } = useAuth();
  const { isDark } = useTheme();
  const {
    branches,
    activeBranchId,
    setActiveBranchId,
    canSwitchBranch,
  } = useBranchContext();
  const bv = user?.businessVertical;
  const { t, locale } = useI18n();
  const sidebarLogoSrc = isDark
    ? "/icodo-icon-dark.png?v=2"
    : "/icodo-sidebar-light.png?v=2";
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
            <img
              src={sidebarLogoSrc}
              alt="Icodo"
              className={`app-sidebar-logo${isDark ? " app-sidebar-logo--dark" : " app-sidebar-logo--light"}`}
              decoding="async"
            />
          </div>
          {canSwitchBranch ? (
            <label className="app-sidebar-branch">
              <span className="app-sidebar-branch-label">{t("branchContext.label")}</span>
              <select
                value={activeBranchId || ""}
                onChange={(e) => setActiveBranchId(e.target.value)}
                aria-label={t("branchContext.pick")}
              >
                {branches.length === 0 ? (
                  <option value="">{t("branchContext.pick")}</option>
                ) : null}
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {branchDisplayName(b, locale)}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
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

          {can("pos") ? (
            <NavLink to="/pos" className={sidebarLinkClass} end>
              <SidebarIcon name="pos" />
              <span>{t("nav.pos")}</span>
            </NavLink>
          ) : null}

          <SidebarNavSection
            sectionId="inventory"
            title={t("nav.section.inventory")}
            icon="inventory"
            expanded={Boolean(openSections.inventory)}
            onToggle={() => toggleNavSection("inventory")}
            t={t}
          >
            {can("productsView") ? (
              <NavLink to="/products" className={sidebarLinkClass}>
                <SidebarIcon name="products" />
                <span>{t("nav.products")}</span>
              </NavLink>
            ) : null}
            {can("catalogEdit") ? (
              <NavLink to="/categories" className={sidebarLinkClass}>
                <SidebarIcon name="categories" />
                <span>{t("nav.categories")}</span>
              </NavLink>
            ) : null}
            {can("cashSession") ? (
              <NavLink to="/cash" className={sidebarLinkClass}>
                <SidebarIcon name="funds" />
                <span>{t("nav.funds")}</span>
              </NavLink>
            ) : null}
          </SidebarNavSection>

          <SidebarNavSection
            sectionId="profile"
            title={t("nav.section.profile")}
            icon="profile"
            expanded={Boolean(openSections.profile)}
            onToggle={() => toggleNavSection("profile")}
            t={t}
          >
            {can("receivables") && isVerticalFeatureEnabled("customerAccounts", bv) ? (
              <NavLink to="/customer-accounts" className={sidebarLinkClass}>
                <SidebarIcon name="accounts" />
                <span>{t("nav.accounts")}</span>
              </NavLink>
            ) : null}
            {can("audit") ? (
              <NavLink to="/audit" className={sidebarLinkClass}>
                <SidebarIcon name="audit" />
                <span>{t("nav.auditLogs")}</span>
              </NavLink>
            ) : null}
            {can("customers") ? (
              <NavLink to="/customers" className={sidebarLinkClass}>
                <SidebarIcon name="customers" />
                <span>{t("nav.customers")}</span>
              </NavLink>
            ) : null}
            {can("loyalty") ? (
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
              <NavLink to="/permissions" className={sidebarLinkClass}>
                <SidebarIcon name="audit" />
                <span>{t("nav.permissions")}</span>
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
          <div className="app-sidebar-user">
            {formatUserBranchLine(user, locale)}
            {user?.role ? (
              <div className="app-sidebar-role">{t(`role.${user.role}`)}</div>
            ) : null}
          </div>
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
