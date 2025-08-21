# Shopify Review Checklist (Proofkit)

- ✅ Embedded app (Polaris + App Bridge)
- ✅ Clear value prop and screenshots
- ✅ Permissions explained (with data flow diagram)
- ✅ Privacy policy + support email
- ✅ HMAC server-side proxy (no secrets in browser)
- ✅ Performance (no blocking calls, paginate lists)
- ✅ Web Pixel guidance (Consent Mode v2)
- ✅ Billing (tiers page/plan placeholders acceptable for review)

**Docs to attach:**

- `docs/assets/dataflow.png` – how the app talks to backend and Google Ads Script / Sheets.
- Link to your privacy policy and ToS.
- Support email inbox.

**QA before submit:**

- Install on a dev store; navigate `/app/intent`, `/app/overlays`, `/app/audiences`, `/app/canary`.
- Run the Canary Wizard on a throwaway campaign; ensure Promote Window flips on/off and logs appear.
