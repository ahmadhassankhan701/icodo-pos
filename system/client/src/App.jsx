import React, { useEffect } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./context/AuthContext.jsx";
import { useI18n } from "./context/LanguageContext.jsx";
import { AppLayout } from "./components/layout/AppLayout.jsx";
import { VerticalFeatureGate } from "./components/VerticalFeatureGate.jsx";
import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";
import { MarketingLayout } from "./marketing/MarketingLayout.jsx";
import Home from "./pages/marketing/Home.jsx";
import About from "./pages/marketing/About.jsx";
import Contact from "./pages/marketing/Contact.jsx";
import POS from "./pages/POS.jsx";
import Wholesale from "./pages/Wholesale.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Products from "./pages/Products.jsx";
import Categories from "./pages/Categories.jsx";
import Users from "./pages/Users.jsx";
import Permissions from "./pages/Permissions.jsx";
import Sync from "./pages/Sync.jsx";
import Branches from "./pages/Branches.jsx";
import Customers from "./pages/Customers.jsx";
import CustomerReceivables from "./pages/CustomerReceivables.jsx";
import CustomerAccountDetail from "./pages/CustomerAccountDetail.jsx";
import Zakat from "./pages/Zakat.jsx";
import Returns from "./pages/Returns.jsx";
import Purchases from "./pages/Purchases.jsx";
import Transfer from "./pages/Transfer.jsx";
import Count from "./pages/Count.jsx";
import Cash from "./pages/Cash.jsx";
import Audit from "./pages/Audit.jsx";
import SyncQueueStatus from "./pages/SyncQueueStatus.jsx";
import Alerts from "./pages/Alerts.jsx";
import Settings from "./pages/Settings.jsx";
import LoyaltyCoupons from "./pages/LoyaltyCoupons.jsx";
const loadReports = () => import("./pages/Reports.jsx");
const loadAppointments = () => import("./pages/Appointments.jsx");
const loadAccounting = () => import("./pages/Accounting.jsx");
const loadAutomations = () => import("./pages/Automations.jsx");
const loadCommissions = () => import("./pages/Commissions.jsx");
const loadDeliveryRouting = () => import("./pages/DeliveryRouting.jsx");
const loadHrLayout = () => import("./pages/hr/HrLayout.jsx");
const loadHrEmployees = () => import("./pages/hr/HrEmployees.jsx");
const loadHrPayrollList = () => import("./pages/hr/HrPayrollList.jsx");
const loadHrPayrollPeriod = () => import("./pages/hr/HrPayrollPeriod.jsx");
const loadHrLoans = () => import("./pages/hr/HrLoans.jsx");
const loadPlatformLayout = () => import("./components/layout/PlatformLayout.jsx");
const loadPlatformOrganizations = () => import("./pages/PlatformOrganizations.jsx");
const loadPlatformUsers = () => import("./pages/PlatformUsers.jsx");

const Reports = React.lazy(loadReports);
const Appointments = React.lazy(loadAppointments);
const Accounting = React.lazy(loadAccounting);
const Automations = React.lazy(loadAutomations);
const Commissions = React.lazy(loadCommissions);
const DeliveryRouting = React.lazy(loadDeliveryRouting);
const HrLayout = React.lazy(loadHrLayout);
const HrEmployees = React.lazy(loadHrEmployees);
const HrPayrollList = React.lazy(loadHrPayrollList);
const HrPayrollPeriod = React.lazy(loadHrPayrollPeriod);
const HrLoans = React.lazy(loadHrLoans);
const PlatformLayout = React.lazy(loadPlatformLayout);
const PlatformOrganizations = React.lazy(loadPlatformOrganizations);
const PlatformUsers = React.lazy(loadPlatformUsers);

function Protected({ children, roles, permission }) {
  const { user, loading, can } = useAuth();
  const { t } = useI18n();
  if (loading) {
    return (
      <div style={{ padding: 24, textAlign: "center" }}>
        {t("common.loading")}
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== "ADMIN") {
    if (roles && !roles.includes(user.role)) {
      return <Navigate to="/dashboard" replace />;
    }
    if (permission && !can(permission)) {
      return <Navigate to="/dashboard" replace />;
    }
  }
  return children;
}

function PublicHome() {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div style={{ padding: 24, textAlign: "center" }}>
        Loading...
      </div>
    );
  }
  if (user) {
    return (
      <Navigate to={user.isPlatformAdmin ? "/platform/organizations" : "/dashboard"} replace />
    );
  }
  return <Home />;
}

function ProtectedPlatform({ children }) {
  const { user, loading } = useAuth();
  const { t } = useI18n();
  if (loading) {
    return (
      <div style={{ padding: 24, textAlign: "center" }}>
        {t("common.loading")}
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  if (!user.isPlatformAdmin) return <Navigate to="/dashboard" replace />;
  return children;
}

export default function App() {
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return undefined;
    const preload = () => {
      // Warm up heavy chunks in idle time for faster first navigation.
      Promise.allSettled([
        loadDeliveryRouting(),
        loadReports(),
        loadAppointments(),
      ]);
      if (user.role === "ADMIN" || user.role === "MANAGER") {
        Promise.allSettled([loadAccounting(), loadAutomations(), loadCommissions()]);
      }
      if (user.isPlatformAdmin) {
        Promise.allSettled([loadPlatformLayout(), loadPlatformOrganizations(), loadPlatformUsers()]);
      }
    };
    const schedule = window.requestIdleCallback || ((cb) => window.setTimeout(cb, 1200));
    const cancel = window.cancelIdleCallback || window.clearTimeout;
    const taskId = schedule(preload);
    return () => cancel(taskId);
  }, [user]);

  const lazyFallback = (
    <div style={{ padding: 24, textAlign: "center" }}>
      Loading...
    </div>
  );

  return (
    <React.Suspense fallback={lazyFallback}>
      <Routes>
        <Route element={<MarketingLayout />}>
          <Route path="/" element={<PublicHome />} />
          <Route path="/about" element={<About />} />
          <Route path="/contact" element={<Contact />} />
        </Route>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route
          path="/platform"
          element={
            <Protected>
              <ProtectedPlatform>
                <PlatformLayout />
              </ProtectedPlatform>
            </Protected>
          }
        >
          <Route index element={<Navigate to="/platform/organizations" replace />} />
          <Route path="organizations" element={<PlatformOrganizations />} />
          <Route path="users" element={<PlatformUsers />} />
        </Route>
        <Route
          element={
            <Protected>
              <AppLayout />
            </Protected>
          }
        >
          <Route path="/pos" element={<Protected permission="pos"><POS /></Protected>} />
          <Route
            path="/wholesale"
            element={
              <Protected permission="wholesale">
                <VerticalFeatureGate feature="wholesale">
                  <Wholesale />
                </VerticalFeatureGate>
              </Protected>
            }
          />
          <Route path="/sync-queue" element={<SyncQueueStatus />} />
          <Route path="/alerts" element={<Alerts />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/print-settings" element={<Navigate to="/settings" replace />} />
          <Route
            path="/loyalty"
            element={
              <Protected roles={["ADMIN", "MANAGER", "CASHIER"]} permission="loyalty">
                <LoyaltyCoupons />
              </Protected>
            }
          />
          <Route
            path="/zakat"
            element={
              <Protected roles={["ADMIN", "MANAGER"]}>
                <Zakat />
              </Protected>
            }
          />
          <Route
            path="/reports"
            element={
              <Protected roles={["ADMIN", "MANAGER", "CASHIER"]} permission="reports">
                <Reports />
              </Protected>
            }
          />
          <Route
            path="/appointments"
            element={
              <Protected roles={["ADMIN", "MANAGER"]}>
                <VerticalFeatureGate feature="appointments">
                  <Appointments />
                </VerticalFeatureGate>
              </Protected>
            }
          />
          <Route
            path="/accounting"
            element={
              <Protected roles={["ADMIN", "MANAGER"]}>
                <Accounting />
              </Protected>
            }
          />
          <Route
            path="/automations"
            element={
              <Protected roles={["ADMIN", "MANAGER"]}>
                <Automations />
              </Protected>
            }
          />
          <Route
            path="/commissions"
            element={
              <Protected roles={["ADMIN", "MANAGER"]}>
                <Commissions />
              </Protected>
            }
          />
          <Route
            path="/delivery"
            element={
              <Protected roles={["ADMIN", "MANAGER"]}>
                <VerticalFeatureGate feature="delivery">
                  <DeliveryRouting />
                </VerticalFeatureGate>
              </Protected>
            }
          />
          <Route
            path="/hr"
            element={
              <Protected roles={["ADMIN", "MANAGER"]}>
                <HrLayout />
              </Protected>
            }
          >
            <Route index element={<Navigate to="/hr/employees" replace />} />
            <Route path="employees" element={<HrEmployees />} />
            <Route path="payroll" element={<HrPayrollList />} />
            <Route path="payroll/:periodId" element={<HrPayrollPeriod />} />
            <Route path="loans" element={<HrLoans />} />
          </Route>
          <Route
            path="/products"
            element={
              <Protected permission="productsView">
                <Products />
              </Protected>
            }
          />
          <Route
            path="/categories"
            element={
              <Protected permission="catalogEdit">
                <Categories />
              </Protected>
            }
          />
          <Route path="/customers" element={<Customers />} />
          <Route
            path="/customer-accounts"
            element={
              <VerticalFeatureGate feature="customerAccounts">
                <CustomerReceivables />
              </VerticalFeatureGate>
            }
          />
          <Route
            path="/customer-accounts/:customerId"
            element={
              <VerticalFeatureGate feature="customerAccounts">
                <CustomerAccountDetail />
              </VerticalFeatureGate>
            }
          />
          <Route
            path="/users"
            element={
              <Protected roles={["ADMIN"]}>
                <Users />
              </Protected>
            }
          />
          <Route
            path="/permissions"
            element={
              <Protected roles={["ADMIN"]}>
                <Permissions />
              </Protected>
            }
          />
          <Route
            path="/branches"
            element={
              <Protected roles={["ADMIN"]}>
                <Branches />
              </Protected>
            }
          />
          <Route
            path="/sync"
            element={
              <Protected roles={["ADMIN", "MANAGER"]}>
                <Sync />
              </Protected>
            }
          />
          <Route
            path="/returns"
            element={
              <Protected roles={["ADMIN", "MANAGER", "CASHIER"]} permission="refunds">
                <Returns />
              </Protected>
            }
          />
          <Route
            path="/purchases"
            element={
              <Protected roles={["ADMIN", "MANAGER", "CASHIER"]} permission="purchases">
                <Purchases />
              </Protected>
            }
          />
          <Route
            path="/transfer"
            element={
              <Protected roles={["ADMIN", "MANAGER", "CASHIER"]} permission="transfer">
                <Transfer />
              </Protected>
            }
          />
          <Route
            path="/count"
            element={
              <Protected roles={["ADMIN", "MANAGER", "CASHIER"]} permission="stockCount">
                <Count />
              </Protected>
            }
          />
          <Route
            path="/cash"
            element={
              <Protected permission="cashSession">
                <Cash />
              </Protected>
            }
          />
          <Route
            path="/audit"
            element={
              <Protected roles={["ADMIN", "MANAGER", "CASHIER"]} permission="audit">
                <Audit />
              </Protected>
            }
          />
        </Route>
        <Route
          path="*"
          element={<Navigate to={user ? "/dashboard" : "/"} replace />}
        />
      </Routes>
    </React.Suspense>
  );
}
