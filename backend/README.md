# Proofkit Backend (Node/Express)

This replaces the earlier Google Apps Script Web App. It powers BOTH your Shopify app and WordPress plugin, and serves the Google Ads Script.

## Shop Name System

The backend now uses a manual shop name system instead of automatic tenant detection. The default shop name is "proofkit" but can be customized via environment variables.

## Endpoints

- GET /api/config?tenant=SHOP_NAME&sig=HMAC
  - payload to sign: `GET:{shop_name}:config`
- POST /api/metrics?tenant=SHOP_NAME&sig=HMAC
  - payload to sign: `POST:{shop_name}:metrics:{nonce}`
- POST /api/upsertConfig?tenant=SHOP_NAME&sig=HMAC
  - payload to sign: `POST:{shop_name}:upsertconfig:{nonce}`
- GET /api/ads-script/raw?tenant=SHOP_NAME&sig=HMAC
  - payload to sign: `GET:{shop_name}:script_raw`

## Configuration

### Environment Variables

Set these in your `.env` file:

```env
# Shop Configuration
TENANT_ID=proofkit
TENANT_REGISTRY_JSON='{"proofkit":"1vqcqkLxY4r3tWowi6GMsoRbSJG5x4XY7QKg2mTe54rU"}'

# Backend URLs
BACKEND_URL=http://localhost:3001
BACKEND_PUBLIC_URL=http://localhost:3001/api

# Google Sheets Integration
GOOGLE_SERVICE_EMAIL=service-account@project.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----..."
SHEET_ID=your_master_sheet_id_here

# Security
HMAC_SECRET=your_hmac_secret_here
```

### Multiple Shop Support

To support multiple shops, update the TENANT_REGISTRY_JSON:

```env
TENANT_REGISTRY_JSON='{"shop1":"sheet_id_1","shop2":"sheet_id_2","proofkit":"sheet_id_default"}'
```

## Storage

- Uses Google Sheets if you set GOOGLE_SERVICE_EMAIL, GOOGLE_PRIVATE_KEY, and TENANT_REGISTRY_JSON in `.env`.
- Falls back to in-memory store for quick testing.

## Getting Started

```bash
npm install
cp .env.example .env   # fill in your values
npm run dev
```

The server will start on port 3001 (or your specified PORT) and serve API endpoints for configuration management and Google Ads script generation.
