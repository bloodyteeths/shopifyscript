# Proofkit Backend (Node/Express)

This replaces the earlier Google Apps Script Web App. It powers BOTH your Shopify app and WordPress plugin, and serves the Google Ads Script.

## Endpoints
- GET  /api/config?tenant=ID&sig=HMAC
  - payload to sign: `GET:{tenant}:config`
- POST /api/metrics?tenant=ID&sig=HMAC
  - payload to sign: `POST:{tenant}:metrics:{nonce}`
- POST /api/upsertConfig?tenant=ID&sig=HMAC
  - payload to sign: `POST:{tenant}:upsertconfig:{nonce}`

## Storage
- Uses Google Sheets if you set GOOGLE_SERVICE_EMAIL, GOOGLE_PRIVATE_KEY, SHEET_ID in `.env`.
- Falls back to in-memory store for quick testing.

Run:
```
npm i
cp .env.example .env   # fill values
npm run dev
```
