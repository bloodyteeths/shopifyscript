# Backend API (HMAC)

- GET /api/config?tenant=ID&sig=HMAC (payload `GET:{tenant}:config`)
- POST /api/metrics?tenant=ID&sig=HMAC (payload `POST:{tenant}:metrics:{nonce}`)
- POST /api/upsertConfig?tenant=ID&sig=HMAC (payload `POST:{tenant}:upsertconfig:{nonce}`)

HMAC: base64( HMAC_SHA256(payload, HMAC_SECRET) ) without '=' padding.
