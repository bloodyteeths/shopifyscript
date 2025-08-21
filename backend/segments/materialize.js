import fs from "fs";
import path from "path";
import crypto from "crypto";
import { getDoc, ensureSheet } from "../sheets.js";

export async function listSegments(tenant) {
  const doc = await getDoc();
  if (!doc) return [];
  const sh = await ensureSheet(doc, `AUDIENCE_SEGMENTS_${tenant}`, [
    "segment_key",
    "logic_sqlish",
    "lookback_days",
    "refresh_freq",
    "target_use",
    "bidding_hint",
  ]);
  const rows = await sh.getRows();
  return rows
    .map((r) => ({
      segment_key: String(r.segment_key || "").trim(),
      logic_sqlish: String(r.logic_sqlish || "").trim(),
      lookback_days: Number(r.lookback_days || 0),
      refresh_freq: String(r.refresh_freq || "").trim(),
      target_use: String(r.target_use || "").trim(),
      bidding_hint: String(r.bidding_hint || "").trim(),
    }))
    .filter((s) => s.segment_key);
}

function normalizeEmail(email) {
  return String(email || "")
    .trim()
    .toLowerCase();
}
function normalizePhone(phone) {
  return String(phone || "").replace(/\D+/g, "");
}
function sha256(s) {
  return crypto.createHash("sha256").update(s).digest("hex");
}

function evalSqlish(row, expr) {
  if (!expr) return true;
  // extremely small parser: supports AND/OR of simple field op value, NOW-Xd for days offsets
  const tokens = expr.replace(/\s+/g, " ").trim().split(" ");
  // Evaluate as left-associative sequence with AND/OR
  function evalAtom(i) {
    const field = tokens[i] || "";
    const op = tokens[i + 1] || "";
    let value = tokens[i + 2] || "";
    if (/^NOW-\d+d$/i.test(value)) {
      const d = Number(value.match(/NOW-(\d+)d/i)[1] || "0");
      const then = new Date(Date.now() - d * 24 * 3600 * 1000);
      value = then.toISOString();
    }
    const rv = String(row[field] || "");
    switch (op) {
      case "=":
        return rv == value;
      case "!=":
        return rv != value;
      case ">":
        return rv > value;
      case ">=":
        return rv >= value;
      case "<":
        return rv < value;
      case "<=":
        return rv <= value;
      default:
        return false;
    }
  }
  let i = 0;
  let acc = evalAtom(0);
  i += 3;
  while (i < tokens.length) {
    const join = (tokens[i] || "").toUpperCase();
    i += 1;
    const part = evalAtom(i);
    i += 3;
    if (join === "AND") acc = acc && part;
    else if (join === "OR") acc = acc || part;
    else return acc;
  }
  return acc;
}

async function readSeeds(doc, tenant) {
  const sh = await ensureSheet(doc, `AUDIENCE_SEEDS_${tenant}`, [
    "customer_id",
    "email",
    "phone",
    "first_name",
    "last_name",
    "country",
    "zip",
    "consent_status",
    "last_order_at",
  ]);
  const rows = await sh.getRows();
  return rows.map((r) => ({
    email: String(r.email || "").trim(),
    phone: String(r.phone || "").trim(),
    first_name: String(r.first_name || "").trim(),
    last_name: String(r.last_name || "").trim(),
    country: String(r.country || "").trim(),
    zip: String(r.zip || "").trim(),
    consent_status: String(r.consent_status || "").trim(),
    last_order_at: String(r.last_order_at || "").trim(),
  }));
}

export async function buildSegments(tenant, segments, format) {
  const doc = await getDoc();
  if (!doc) return { built: [], skipped: segments };
  const seeds = await readSeeds(doc, tenant);
  const dir = path.resolve(process.cwd(), "storage", "audiences", tenant);
  fs.mkdirSync(dir, { recursive: true });
  const out = [];
  for (const segKey of segments) {
    const segs = await listSegments(tenant);
    const seg = segs.find((s) => s.segment_key === segKey);
    if (!seg) {
      out.push({ segment: segKey, rows: 0, url: "" });
      continue;
    }
    // filter seeds
    const look = Number(seg.lookback_days || 0);
    const lookTs = look > 0 ? Date.now() - look * 24 * 3600 * 1000 : 0;
    const filtered = seeds
      .filter(
        (r) => (r.consent_status || "granted").toLowerCase() === "granted",
      )
      .filter((r) => {
        if (!lookTs || !r.last_order_at) return true;
        const t = Date.parse(r.last_order_at);
        return isFinite(t) ? t >= lookTs : true;
      })
      .filter((r) => evalSqlish(r, seg.logic_sqlish));
    const ts = new Date().toISOString().replace(/[:.]/g, "-");
    const file = path.resolve(
      dir,
      `${seg.segment_key}-${ts}.${format === "API" ? "API" : "UI"}.csv`,
    );
    let header = "";
    let lines = [];
    if (format === "API") {
      header = "Email_SHA256,Phone_SHA256,Country,Zip";
      lines = filtered.map((r) =>
        [
          sha256(normalizeEmail(r.email)),
          sha256(normalizePhone(r.phone)),
          r.country || "",
          r.zip || "",
        ].join(","),
      );
    } else {
      header = "Email,Phone,First Name,Last Name,Country,Zip";
      lines = filtered.map((r) =>
        [
          normalizeEmail(r.email),
          normalizePhone(r.phone),
          r.first_name || "",
          r.last_name || "",
          r.country || "",
          r.zip || "",
        ].join(","),
      );
    }
    fs.writeFileSync(file, header + "\n" + lines.join("\n"), "utf8");
    const rel = `storage/audiences/${tenant}/${path.basename(file)}`;
    const shExp = await ensureSheet(doc, `AUDIENCE_EXPORT_${tenant}`, [
      "file_name",
      "segment_key",
      "format",
      "row_count",
      "last_built_at",
      "storage_url",
    ]);
    await shExp.addRow({
      file_name: path.basename(file),
      segment_key: seg.segment_key,
      format: format === "API" ? "CM_API_HASHED" : "CM_UI_UNHASHED",
      row_count: lines.length,
      last_built_at: new Date().toISOString(),
      storage_url: rel,
    });
    out.push({ segment: seg.segment_key, rows: lines.length, url: rel });
  }
  return { built: out, skipped: [] };
}
