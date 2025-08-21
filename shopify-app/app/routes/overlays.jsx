import React, { useState } from "react";
import AppShell from "../components/AppShell.jsx";

export default function OverlaysPage() {
  const [targetType, setTargetType] = useState("products");
  const [ids, setIds] = useState("");
  const [channel, setChannel] = useState("google");
  const [fields, setFields] = useState({
    title: true,
    description: true,
    image_alt: false,
  });
  const [toast, setToast] = useState("");

  async function call(path, body) {
    const r = await fetch(path, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ nonce: Date.now(), ...body }),
    });
    const j = await r.json();
    if (j.ok) setToast("OK");
    else setToast("Error");
  }

  function parseIds() {
    return ids
      .split(",")
      .map((s) => Number(s.trim()))
      .filter(Boolean);
  }

  return (
    <AppShell>
      <div style={{ padding: 16 }}>
        <h1>Overlays</h1>
        {toast && <p>{toast}</p>}
        <div
          style={{
            display: "grid",
            gap: 8,
            gridTemplateColumns: "repeat(2,1fr)",
          }}
        >
          <select
            value={targetType}
            onChange={(e) => setTargetType(e.target.value)}
          >
            <option value="products">Products</option>
            <option value="collections">Collections</option>
          </select>
          <input
            placeholder={
              targetType === "products"
                ? "product IDs comma-separated"
                : "collection IDs comma-separated"
            }
            value={ids}
            onChange={(e) => setIds(e.target.value)}
          />
          <select value={channel} onChange={(e) => setChannel(e.target.value)}>
            <option value="google">Google</option>
            <option value="meta">Meta</option>
            <option value="tiktok">TikTok</option>
          </select>
          <label>
            <input
              type="checkbox"
              checked={fields.title}
              onChange={(e) =>
                setFields({ ...fields, title: e.target.checked })
              }
            />{" "}
            title
          </label>
          <label>
            <input
              type="checkbox"
              checked={fields.description}
              onChange={(e) =>
                setFields({ ...fields, description: e.target.checked })
              }
            />{" "}
            description
          </label>
          <label>
            <input
              type="checkbox"
              checked={fields.image_alt}
              onChange={(e) =>
                setFields({ ...fields, image_alt: e.target.checked })
              }
            />{" "}
            image_alt
          </label>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={() =>
                call(
                  "/app/api/overlays/apply",
                  targetType === "products"
                    ? { product_ids: parseIds(), channel, fields }
                    : { collection_ids: parseIds(), channel, fields },
                )
              }
            >
              Apply
            </button>
            <button
              onClick={() =>
                call(
                  "/app/api/overlays/revert",
                  targetType === "products"
                    ? { product_ids: parseIds(), channel }
                    : { collection_ids: parseIds(), channel },
                )
              }
            >
              Revert
            </button>
            <button
              onClick={() =>
                call("/app/api/overlays/bulk", {
                  select:
                    targetType === "products" ? "collection" : "collection",
                  value: parseIds()[0] || "",
                  channel,
                  fields,
                })
              }
            >
              Bulk Apply
            </button>
          </div>
        </div>
        <p style={{ marginTop: 16 }}>
          History is recorded to OVERLAY_HISTORY_* and visible via Sheets for
          now.
        </p>
      </div>
    </AppShell>
  );
}
