import React, { useEffect, useState } from "react";
import AppShell from "../components/AppShell.jsx";

export default function Insights() {
  const [stats, setStats] = useState(null);
  useEffect(() => {
    (async () => {
      try {
        const r = await fetch("/app/api/summary");
        const j = await r.json();
        setStats(j?.ok ? j : null);
      } catch {}
    })();
  }, []);
  const k = stats?.kpis || { spend: 0, clicks: 0, conv: 0, cpa: 0 };
  return (
    <AppShell>
      <h1>Insights</h1>
      {!stats && <p>Not enough data yet.</p>}
      {stats && (
        <div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4,1fr)",
              gap: 12,
            }}
          >
            <div style={{ border: "1px solid #eee", padding: 12 }}>
              <div>Spend</div>
              <strong>${k.spend?.toFixed?.(2) || k.spend}</strong>
            </div>
            <div style={{ border: "1px solid #eee", padding: 12 }}>
              <div>Clicks</div>
              <strong>{k.clicks}</strong>
            </div>
            <div style={{ border: "1px solid #eee", padding: 12 }}>
              <div>Conversions</div>
              <strong>{k.conv}</strong>
            </div>
            <div style={{ border: "1px solid #eee", padding: 12 }}>
              <div>CPA</div>
              <strong>${k.cpa?.toFixed?.(2) || k.cpa}</strong>
            </div>
          </div>
          <h3 style={{ marginTop: 16 }}>Top Search Terms (7d)</h3>
          <table border="1" cellPadding="6" style={{ width: "100%" }}>
            <thead>
              <tr>
                <th>Term</th>
                <th>Clicks</th>
                <th>Cost</th>
              </tr>
            </thead>
            <tbody>
              {(stats.top_terms || []).map((t, i) => (
                <tr key={i}>
                  <td>{t.term}</td>
                  <td>{t.clicks}</td>
                  <td>${(t.cost || 0).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AppShell>
  );
}
