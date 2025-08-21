# Proofkit Shopify (Remix skeleton)

Local dev

1. env

```
SHOPIFY_API_KEY=changeme
SHOPIFY_API_SECRET=changeme
APP_URL=http://localhost:3002
BACKEND_URL=http://localhost:3001/api
HMAC_SECRET=change_me
TENANT_ID=TENANT_123
```

2. run

```
npm install
npm run dev
```

Routes

- /app (static canary wizard)
- /app/intent, /app/overlays, /app/canary
- /app/api/\* proxies sign HMAC server-side (no secrets in browser)
