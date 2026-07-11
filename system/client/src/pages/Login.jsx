import React, { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { useI18n } from "../context/LanguageContext.jsx";
import { AuthShell } from "../marketing/AuthShell.jsx";
import { useMarketingCopy } from "../marketing/copy.js";

export default function Login() {
  const { login, user, loading } = useAuth();
  const { t, locale } = useI18n();
  const c = useMarketingCopy(locale);
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [organizationSlug, setOrganizationSlug] = useState("");
  const [err, setErr] = useState("");
  const [dbUrlInfo, setDbUrlInfo] = useState(null);

  if (loading) {
    return (
      <div style={{ padding: 24, textAlign: "center" }}>
        {t("common.loading")}
      </div>
    );
  }
  if (user) {
    return (
      <Navigate to={user.isPlatformAdmin ? "/platform/organizations" : "/pos"} replace />
    );
  }

  const submit = async (e) => {
    e.preventDefault();
    setErr("");
    setDbUrlInfo(null);
    try {
      const loggedIn = await login(
        email,
        password,
        organizationSlug.trim() ? organizationSlug.trim() : undefined
      );
      nav(loggedIn?.isPlatformAdmin ? "/platform/organizations" : "/pos", { replace: true });
    } catch (x) {
      setErr(x.message || t("login.failed"));
      const info = x?.data?.urlInfo;
      setDbUrlInfo(info && typeof info === "object" ? info : null);
    }
  };

  return (
    <AuthShell title={c.auth.signInTitle} subtitle={c.auth.signInSub}>
      <form className="mkt-form" onSubmit={submit}>
        <div className="mkt-field">
          <label htmlFor="login-email">{t("login.email")}</label>
          <input
            id="login-email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            required
            autoComplete="username"
          />
        </div>
        <div className="mkt-field">
          <label htmlFor="login-slug">{t("login.orgSlug")}</label>
          <input
            id="login-slug"
            value={organizationSlug}
            onChange={(e) => setOrganizationSlug(e.target.value)}
            type="text"
            autoComplete="organization"
            placeholder="default"
          />
        </div>
        <div className="mkt-field">
          <label htmlFor="login-password">{t("login.password")}</label>
          <input
            id="login-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            required
            autoComplete="current-password"
          />
        </div>
        {err ? <div className="mkt-error">{err}</div> : null}
        {dbUrlInfo ? (
          <div
            style={{
              marginBottom: 12,
              padding: 12,
              fontSize: 13,
              lineHeight: 1.45,
              color: "var(--mkt-muted)",
              background: "#fff",
              border: "1px solid var(--mkt-line)",
              borderRadius: "0.65rem",
            }}
          >
            <strong style={{ color: "var(--mkt-ink)", display: "block", marginBottom: 6 }}>
              {t("login.dbDiagnostics")}
            </strong>
            {dbUrlInfo.hint ? <div style={{ marginBottom: 8 }}>{dbUrlInfo.hint}</div> : null}
            {dbUrlInfo.databaseUrlSet && dbUrlInfo.host ? (
              <div style={{ fontSize: 12, fontFamily: "ui-monospace, monospace" }}>
                {t("login.dbHost")}: {String(dbUrlInfo.host)} — {t("login.dbPort")}:{" "}
                {String(dbUrlInfo.port ?? "—")}
              </div>
            ) : null}
          </div>
        ) : null}
        <button type="submit" className="mkt-btn mkt-btn-primary mkt-btn-block">
          {t("login.submit")}
        </button>
        <p className="mkt-auth-link">
          {c.auth.noAccount}{" "}
          <Link to="/register">{c.auth.createOne}</Link>
        </p>
      </form>
    </AuthShell>
  );
}
