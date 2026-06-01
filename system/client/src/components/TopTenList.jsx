import React from "react";

/**
 * Ranked list for dashboard "top 10" widgets.
 * @param {{ title: string, rows: Array<{ rank?: number, name: string, value: string, sub?: string }>, emptyLabel: string, metricLabel: string }}
 */
export function TopTenList({ title, rows, emptyLabel, metricLabel }) {
  return (
    <div className="card" style={{ minHeight: 280 }}>
      <div style={{ fontWeight: 800, marginBottom: 12 }}>{title}</div>
      {!rows?.length ? (
        <div style={{ color: "var(--muted)", fontSize: 14 }}>{emptyLabel}</div>
      ) : (
        <ol
          style={{
            margin: 0,
            padding: 0,
            listStyle: "none",
            display: "flex",
            flexDirection: "column",
            gap: 8,
          }}
        >
          {rows.map((row, i) => (
            <li
              key={`${row.name}-${i}`}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "10px 12px",
                background: "var(--surface2)",
                borderRadius: 0,
                border: "1px solid var(--border)",
              }}
            >
              <span
                style={{
                  flexShrink: 0,
                  width: 28,
                  height: 28,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: 800,
                  fontSize: 13,
                  background: i < 3 ? "var(--accent)" : "var(--surface)",
                  color: i < 3 ? "#fff" : "var(--text)",
                }}
              >
                {row.rank ?? i + 1}
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontWeight: 600,
                    fontSize: 14,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                  title={row.name}
                >
                  {row.name}
                </div>
                {row.sub ? (
                  <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>{row.sub}</div>
                ) : null}
              </div>
              <div style={{ textAlign: "end", flexShrink: 0 }}>
                <div style={{ fontWeight: 800, fontSize: 14 }}>{row.value}</div>
                <div style={{ fontSize: 11, color: "var(--muted)" }}>{metricLabel}</div>
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
