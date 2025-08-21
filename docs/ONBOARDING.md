# Onboarding

1. Backend

```
cd backend
npm i
cp .env.example .env   # fill HMAC_SECRET, (optional) Google Sheets service account + SHEET_ID
npm run dev
```

2. Google Ads

- Open Google Ads → Bulk actions → Scripts → New
- Paste ads-script/master.gs
- Set TENANT_ID, BACKEND_URL (e.g., https://yourdomain.com/api), SHARED_SECRET = HMAC_SECRET from backend
- Preview → Authorize → Run once → Schedule daily/hourly

3. Shopify / WordPress

- Use shopify-app/ skeleton to build a proper OAuth app; or just use the Web Pixel extension for now.
- Install wordpress-plugin/ and fill backend URL, tenant, and secret.
