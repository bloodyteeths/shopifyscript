import React, { useEffect, useState } from "react";

export default function AppShell({ children }) {
  const [diag, setDiag] = useState({ ok: true });
  const [cfg, setCfg] = useState({ plan: "starter" });
  useEffect(() => {
    (async () => {
      try {
        const r = await fetch("/app/api/diagnostics");
        const j = await r.json();
        setDiag(j || { ok: false });
      } catch {
        setDiag({ ok: false });
      }
      try {
        const r2 = await fetch("/app/api/config");
        const j2 = await r2.json();
        if (j2?.ok) setCfg(j2.config || { plan: "starter" });
      } catch {}
    })();
  }, []);

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <nav style={{ width: 220, padding: 16, borderRight: "1px solid #eee" }}>
        <h3>Proofkit</h3>
        <div style={{ margin: "8px 0", fontSize: 12, opacity: 0.8 }}>
          Plan: {String(cfg?.plan || "starter")}
        </div>
        <ul style={{ listStyle: "none", padding: 0 }}>
          <li>
            <a href="/app/autopilot">Autopilot</a>
          </li>
          <li>
            <a href="/app/insights">Insights</a>
          </li>
          <li style={{ marginTop: 12 }}>
            <details>
              <summary>Advanced</summary>
              <ul style={{ listStyle: "none", paddingLeft: 12 }}>
                <li>
                  <a href="/app/canary">Canary</a>
                </li>
                <li>
                  <a href="/app/intent">Intent</a>
                </li>
                <li>
                  <a href="/app/overlays">Overlays</a>
                </li>
                {(cfg?.plan === "pro" || cfg?.plan === "growth") && (
                  <li>
                    <a href="/app/ai">AI Drafts</a>
                  </li>
                )}
                {cfg?.plan === "growth" && (
                  <li>
                    <a href="/app/audiences">Audiences</a>
                  </li>
                )}
                <li>
                  <a href="/app/billing">Billing</a>
                </li>
              </ul>
            </details>
          </li>
        </ul>
        {!diag.ok || diag.ai_ready === false || diag.sheets_ok === false ? (
          <div
            style={{
              marginTop: 16,
              padding: 8,
              border: "1px solid #f5c518",
              background: "#fffbea",
            }}
          >
            <strong>Diagnostics</strong>
            <div>AI ready: {String(!!diag.ai_ready)}</div>
            <div>Sheets OK: {String(!!diag.sheets_ok)}</div>
            <a href="/docs/CONSENT_MODE_V2.md" target="_blank" rel="noreferrer">
              Docs
            </a>
          </div>
        ) : null}
      </nav>
      <main style={{ flex: 1, padding: 16 }}>{children}</main>
    </div>
  );
}
