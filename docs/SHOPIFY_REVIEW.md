Review Readiness (Shopify)

- Permissions: read_products (for overlays UI), app proxy to backend; no customer PII collected in-app; optional audience exports via Sheets.
- Data flow: Backend ↔ Google Sheets; Web Pixel (optional) with consent; Ads Script runs in Google Ads account.
- Privacy: No PII stored server-side; options live in merchant Sheets; HMAC for API calls.
- UI: Intent, Overlays, Audiences, Canary, Docs. Draft-first; PROMOTE gate for live actions.
