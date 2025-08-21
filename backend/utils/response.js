import fs from "fs";

// Safe JSON response helper
export function json(res, status, obj) {
  try {
    res.status(status);
  } catch {}
  try {
    res.set("content-type", "application/json; charset=utf-8");
  } catch {}
  try {
    return res.send(JSON.stringify(obj));
  } catch {
    return res.end();
  }
}

// Access logging helper
export async function logAccess(req, status, note) {
  try {
    const ip =
      (req.headers["x-forwarded-for"] ||
        req.socket.remoteAddress ||
        req.ip ||
        "") + "";
    const ua = ((req.headers["user-agent"] || "") + "")
      .slice(0, 120)
      .replace(/\s+/g, " ");
    const line =
      [
        new Date().toISOString(),
        ip,
        ua,
        req.method,
        req.originalUrl || req.url || "",
        status,
        note || "",
      ].join(" | ") + "\n";
    await fs.promises.appendFile("/tmp/pk_access.log", line);
  } catch {}
}
