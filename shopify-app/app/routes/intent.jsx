import React, { useEffect, useState } from "react";
import AppShell from "../components/AppShell.jsx";

export default function IntentPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    intent_key: "",
    hero_headline: "",
    benefit_bullets_pipe: "",
    proof_snippet: "",
    cta_text: "",
    url_target: "",
  });
  const [toast, setToast] = useState("");

  async function load() {
    setLoading(true);
    const r = await fetch("/app/api/intent/list");
    const j = await r.json();
    setRows(j.rows || []);
    setLoading(false);
  }
  useEffect(() => {
    load();
  }, []);

  async function upsert() {
    const nonce = Date.now();
    const r = await fetch("/app/api/intent/upsert", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ nonce, rows: [form] }),
    });
    const j = await r.json();
    if (j.ok) {
      setToast("Saved");
      setForm({
        intent_key: "",
        hero_headline: "",
        benefit_bullets_pipe: "",
        proof_snippet: "",
        cta_text: "",
        url_target: "",
      });
      load();
    }
  }
  async function del(k) {
    const nonce = Date.now();
    const r = await fetch("/app/api/intent/delete", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ nonce, intent_keys: [k] }),
    });
    const j = await r.json();
    if (j.ok) {
      setToast("Deleted");
      load();
    }
  }

  return (
    <AppShell>
      <div style={{ padding: 16 }}>
        <h1>Intent Blocks</h1>
        {toast && <p>{toast}</p>}
        <div
          style={{
            display: "grid",
            gap: 8,
            gridTemplateColumns: "repeat(2,1fr)",
          }}
        >
          <input
            placeholder="intent_key"
            value={form.intent_key}
            onChange={(e) => setForm({ ...form, intent_key: e.target.value })}
          />
          <input
            placeholder="hero_headline"
            value={form.hero_headline}
            onChange={(e) =>
              setForm({ ...form, hero_headline: e.target.value })
            }
          />
          <input
            placeholder="benefit_bullets_pipe"
            value={form.benefit_bullets_pipe}
            onChange={(e) =>
              setForm({ ...form, benefit_bullets_pipe: e.target.value })
            }
          />
          <input
            placeholder="proof_snippet"
            value={form.proof_snippet}
            onChange={(e) =>
              setForm({ ...form, proof_snippet: e.target.value })
            }
          />
          <input
            placeholder="cta_text"
            value={form.cta_text}
            onChange={(e) => setForm({ ...form, cta_text: e.target.value })}
          />
          <input
            placeholder="url_target"
            value={form.url_target}
            onChange={(e) => setForm({ ...form, url_target: e.target.value })}
          />
          <button onClick={upsert} disabled={loading}>
            Save
          </button>
        </div>
        <table
          border="1"
          cellPadding="6"
          style={{ marginTop: 16, width: "100%" }}
        >
          <thead>
            <tr>
              <th>intent_key</th>
              <th>hero</th>
              <th>bullets</th>
              <th>cta</th>
              <th>url</th>
              <th>actions</th>
            </tr>
          </thead>
          <tbody>
            {(rows || []).map((r) => (
              <tr key={r.intent_key}>
                <td>{r.intent_key}</td>
                <td>{r.hero_headline}</td>
                <td>{r.benefit_bullets_pipe}</td>
                <td>{r.cta_text}</td>
                <td>{r.url_target}</td>
                <td>
                  <button
                    onClick={() =>
                      setForm({
                        intent_key: r.intent_key,
                        hero_headline: r.hero_headline,
                        benefit_bullets_pipe: r.benefit_bullets_pipe,
                        proof_snippet: r.proof_snippet,
                        cta_text: r.cta_text,
                        url_target: r.url_target,
                      })
                    }
                  >
                    Edit
                  </button>
                  <button onClick={() => del(r.intent_key)}>Delete</button>
                  <a
                    href={`/?utm_term=${encodeURIComponent(r.intent_key)}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Preview
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AppShell>
  );
}
