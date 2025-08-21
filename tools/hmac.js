#!/usr/bin/env node
const crypto = require("crypto");

const secret = process.env.HMAC_SECRET || "change_me";
const payload = process.argv.slice(2).join(" ");
if (!payload) {
  console.error('Usage: HMAC_SECRET=secret node tools/hmac.js "PAYLOAD"');
  process.exit(1);
}
const sig = crypto
  .createHmac("sha256", secret)
  .update(payload)
  .digest("base64")
  .replace(/=+$/, "");
process.stdout.write(encodeURIComponent(sig));
