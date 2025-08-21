import React, { useEffect, useState } from "react";
import AppShell from "../components/AppShell.jsx";

export default function Autopilot() {
  const [diag, setDiag] = useState({ ok: true });
  const [mode, setMode] = useState("protect");
  const [budget, setBudget] = useState("3.00");
  const [cpc, setCpc] = useState("0.20");
  const [url, setUrl] = useState("");
  const [toast, setToast] = useState("");
  const [summary, setSummary] = useState(null);
  const [sheetId, setSheetId] = useState("");
  const [sheetOk, setSheetOk] = useState(false);
  const [showScript, setShowScript] = useState(false);
  const [scriptCode, setScriptCode] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch("/app/api/diagnostics");
        const j = await r.json();
        setDiag(j);
      } catch {}
      try {
        const r2 = await fetch("/app/api/config");
        const j2 = await r2.json();
        if (j2?.ok) setUrl(j2.config?.default_final_url || "");
      } catch {}
    })();
  }, []);

  async function run() {
    const body = {
      nonce: Date.now(),
      mode,
      daily_budget: Number(budget || 3),
      cpc_ceiling: Number(cpc || 0.2),
      final_url: url,
      start_in_minutes: 2,
      duration_minutes: 60,
    };
    const r = await fetch("/app/api/autopilot/quickstart", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    const j = await r.json();
    if (j.ok) {
      setToast("Autopilot scheduled");
      setSummary(j);
    } else {
      setToast(j.code === "SHEETS" ? "Connect Google Sheets first" : "Failed");
    }
  }

  return (
    <AppShell>
      <h1>Autopilot</h1>
      {!diag.sheets_ok && (
        <div
          style={{
            padding: 8,
            background: "#ffecec",
            border: "1px solid #fcc",
          }}
        >
          Sheets not connected. Please configure service account and Sheet ID.
        </div>
      )}
      {!diag.ai_ready && (
        <div
          style={{
            padding: 8,
            background: "#fffbea",
            border: "1px solid #f5c518",
          }}
        >
          AI drafts off (optional). You can enable later.
        </div>
      )}
      {toast && <p>{toast}</p>}
      <div style={{ display: "grid", gap: 12, maxWidth: 740 }}>
        {!diag.sheets_ok && (
          <section style={{ border: "1px solid #eee", padding: 12 }}>
            <h3>Connect Sheets</h3>
            <input
              value={sheetId}
              onChange={(e) => setSheetId(e.target.value)}
              placeholder="Google Sheet ID"
              style={{ width: "100%" }}
            />
            <div style={{ marginTop: 8, display: "flex", gap: 8 }}>
              <button
                onClick={async () => {
                  const r = await fetch("/app/api/connect/sheets/test", {
                    method: "POST",
                    headers: { "content-type": "application/json" },
                    body: JSON.stringify({ nonce: Date.now(), sheetId }),
                  });
                  const j = await r.json();
                  setSheetOk(!!j.ok);
                  setToast(j.ok ? "Sheet OK" : "Failed to access sheet");
                }}
              >
                Test
              </button>
              <button
                disabled={!sheetOk}
                onClick={async () => {
                  const r = await fetch("/app/api/connect/sheets/save", {
                    method: "POST",
                    headers: { "content-type": "application/json" },
                    body: JSON.stringify({ nonce: Date.now(), sheetId }),
                  });
                  const j = await r.json();
                  if (j.ok) {
                    setToast("Saved");
                    setDiag({ ...diag, sheets_ok: true });
                  }
                }}
              >
                Save
              </button>
            </div>
          </section>
        )}
        <section style={{ border: "1px solid #eee", padding: 12 }}>
          <h3>Goal</h3>
          <label>
            <input
              type="radio"
              name="goal"
              value="protect"
              checked={mode === "protect"}
              onChange={() => setMode("protect")}
            />{" "}
            Protect my budget
          </label>
          <br />
          <label>
            <input
              type="radio"
              name="goal"
              value="grow"
              checked={mode === "grow"}
              onChange={() => setMode("grow")}
            />{" "}
            Grow sales
          </label>
          <br />
          <label>
            <input
              type="radio"
              name="goal"
              value="scale"
              checked={mode === "scale"}
              onChange={() => setMode("scale")}
            />{" "}
            Scale efficiently
          </label>
        </section>
        <section style={{ border: "1px solid #eee", padding: 12 }}>
          <h3>Budget & CPC</h3>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              type="number"
              step="0.01"
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
              placeholder="$ per day"
            />
            <input
              type="number"
              step="0.01"
              value={cpc}
              onChange={(e) => setCpc(e.target.value)}
              placeholder="Max CPC"
            />
          </div>
        </section>
        <section style={{ border: "1px solid #eee", padding: 12 }}>
          <h3>Landing URL</h3>
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://example.com"
            style={{ width: "100%" }}
          />
        </section>
        <section style={{ border: "1px solid #eee", padding: 12 }}>
          <h3>Review</h3>
          <ul>
            <li>Seed campaign if empty</li>
            <li>Add safe RSA defaults (if AI enabled)</li>
            <li>Cap budget and CPC ceiling</li>
            <li>Schedule business hours</li>
            <li>Attach master negatives</li>
          </ul>
        </section>
        <div>
          <button onClick={run} disabled={!diag.sheets_ok}>
            Enable Autopilot
          </button>
          <button
            style={{ marginLeft: 8 }}
            onClick={async () => {
              const r = await fetch("/app/api/ads-script/raw");
              const j = await r.json();
              if (j.ok) {
                setScriptCode(j.code || "");
                setShowScript(true);
              }
            }}
          >
            Copy Script
          </button>
        </div>
        {showScript && (
          <section style={{ border: "1px solid #eee", padding: 12 }}>
            <h3>Google Ads Script</h3>
            <textarea
              readOnly
              value={scriptCode}
              style={{ width: "100%", height: 240 }}
            />
            <div style={{ marginTop: 8 }}>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(scriptCode);
                  setToast("Copied");
                }}
              >
                Copy
              </button>
            </div>
            <ol>
              <li>
                Google Ads → Tools → Bulk actions → Scripts → + New script
              </li>
              <li>Paste, Authorize, then Preview first</li>
              <li>If ok, Run once, then Schedule daily</li>
            </ol>
          </section>
        )}
        {summary && (
          <section style={{ border: "1px solid #eee", padding: 12 }}>
            <h3>Scheduled</h3>
            <div>Plan: {summary.plan}</div>
            <div>
              Window: {new Date(summary.scheduled.start).toLocaleTimeString()} →{" "}
              {new Date(summary.scheduled.end).toLocaleTimeString()}
            </div>
            <div>Accepted drafts: {summary.accepted}</div>
            {summary.warnings?.length > 0 && (
              <div>Warnings: {summary.warnings.join(", ")}</div>
            )}
            <div style={{ marginTop: 8 }}>
              Next: Open Google Ads → Tools → Scripts → Preview.
            </div>
          </section>
        )}
      </div>
    </AppShell>
  );
}
