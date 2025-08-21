#!/usr/bin/env node

import crypto from "crypto";

const HMAC_SECRET =
  "f3a1c9d8b2e47a65c0fb19d7e3a9428c6de5b1a7c4f08923ab56d7e1c2f3a4b5";
const TENANT = "proofkit";

// HMAC signing function (matches backend implementation)
function sign(payload, secret = HMAC_SECRET) {
  return crypto
    .createHmac("sha256", secret)
    .update(payload)
    .digest("base64")
    .replace(/=+$/, "");
}

// Test different payload formats
console.log("HMAC Testing:");
console.log("=============");

const nonce = Date.now();
console.log("nonce:", nonce);

const payloads = [
  `GET:${TENANT}:config`,
  `POST:${TENANT}:upsertConfig`,
  `POST:${TENANT}:upsertconfig`,
  `POST:${TENANT}:upsertconfig:${nonce}`,
  `POST:${TENANT}:upsertConfig:${nonce}`,
];

payloads.forEach((payload) => {
  const signature = sign(payload);
  console.log(`${payload} => ${signature}`);
});

// Test the actual call
console.log("\nTesting with curl:");
const testPayload = `POST:${TENANT}:upsertconfig:${nonce}`;
const testSig = sign(testPayload);
console.log(`Payload: ${testPayload}`);
console.log(`Signature: ${testSig}`);
console.log(`\nCurl command:`);
console.log(
  `curl -X POST "http://localhost:3005/api/upsertConfig?tenant=${TENANT}&sig=${encodeURIComponent(testSig)}" -H "Content-Type: application/json" -d '{"nonce":${nonce},"settings":{"TEST":"value"}}'`,
);
