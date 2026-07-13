import React, { useEffect, useState } from "react";
import { api } from "../api/client.js";
import { useAuth } from "../context/AuthContext.jsx";
import { useBranchContext } from "../context/BranchContext.jsx";
import { useI18n } from "../context/LanguageContext.jsx";
import { useToast } from "../context/ToastContext.jsx";
import { branchDisplayName } from "../utils/displayLabels.js";

export default function Branches() {
  const { t, locale } = useI18n();
  const { refreshUser } = useAuth();
  const { reloadBranches, maxBranches, plan } = useBranchContext();
  const { showToast } = useToast();
  const [list, setList] = useState([]);
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [supaEdits, setSupaEdits] = useState({});
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const data = await api("/api/branches");
    setList(Array.isArray(data) ? data : []);
  };

  useEffect(() => {
    load().catch(() => {});
  }, []);

  useEffect(() => {
    const m = {};
    for (const b of list) {
      m[b.id] = b.supabaseId ?? "";
    }
    setSupaEdits(m);
  }, [list]);

  const atLimit = list.length >= maxBranches;

  const add = async (e) => {
    e.preventDefault();
    if (atLimit) {
      showToast(t("branches.limitReached"), "error");
      return;
    }
    setBusy(true);
    try {
      await api("/api/branches", { method: "POST", body: { name, address } });
      setName("");
      setAddress("");
      await load();
      await reloadBranches();
      await refreshUser?.();
      showToast(t("common.add"), "success");
    } catch (err) {
      showToast(err.message || "Failed", "error");
    } finally {
      setBusy(false);
    }
  };

  const saveSupabase = async (id) => {
    const v = supaEdits[id];
    try {
      await api(`/api/branches/${id}`, {
        method: "PATCH",
        body: { supabaseId: v != null && String(v).trim() ? String(v).trim() : null },
      });
      await load();
      showToast(t("branches.saveSupabase"), "success");
    } catch (err) {
      showToast(err.message || "Failed", "error");
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 640, width: "100%", marginInline: "auto" }}>
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "baseline", gap: 12 }}>
        <h1 style={{ margin: 0 }}>{t("branches.title")}</h1>
        <span style={{ color: "var(--muted)", fontSize: 14 }}>
          {t("branches.limit", { count: list.length, max: maxBranches })}
          {plan ? ` · ${plan}` : ""}
        </span>
      </div>

      <form className="card" onSubmit={add} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <strong>{t("branches.new")}</strong>
        {atLimit ? (
          <p style={{ margin: 0, fontSize: 13, color: "var(--danger)" }}>{t("branches.limitReached")}</p>
        ) : null}
        <input
          placeholder={t("branches.name")}
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={atLimit || busy}
          style={inp}
        />
        <input
          placeholder={t("branches.address")}
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          disabled={atLimit || busy}
          style={inp}
        />
        <button
          type="submit"
          className="btn-touch"
          disabled={atLimit || busy}
          style={{ background: "var(--accent)", color: "#fff", maxWidth: 200 }}
        >
          {t("common.add")}
        </button>
      </form>

      <p style={{ margin: 0, fontSize: 13, color: "var(--muted)" }}>{t("branches.supabaseHint")}</p>

      <ul className="card" style={{ listStyle: "none", margin: 0, padding: 0 }}>
        {list.map((b) => (
          <li
            key={b.id}
            style={{
              padding: "12px 0",
              borderBottom: "1px solid var(--border)",
            }}
          >
            <div style={{ fontWeight: 800 }}>{branchDisplayName(b, locale)}</div>
            {b.address ? <div style={{ color: "var(--muted)", fontSize: 14 }}>{b.address}</div> : null}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 10, alignItems: "center" }}>
              <input
                placeholder={t("branches.supabaseId")}
                value={supaEdits[b.id] ?? ""}
                onChange={(e) => setSupaEdits((prev) => ({ ...prev, [b.id]: e.target.value }))}
                style={{ ...inp, flex: 1, minWidth: 200 }}
              />
              <button type="button" className="btn-touch" style={{ background: "var(--surface2)" }} onClick={() => saveSupabase(b.id)}>
                {t("branches.saveSupabase")}
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

const inp = {
  padding: 12,
  borderRadius: 12,
  border: "1px solid var(--border)",
  background: "var(--bg)",
  color: "var(--text)",
};
