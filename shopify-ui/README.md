Proofkit Shopify UI (Remix)

Local dev

1) env
   - copy `.env.example` → `.env` and set vars

2) run

```
npm install
PORT=3003 npm run dev
```

Open http://localhost:3003/app/autopilot

UI-only preview route (no OAuth): server signs HMAC using env.

