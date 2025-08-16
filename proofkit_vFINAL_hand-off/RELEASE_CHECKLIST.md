# Release Checklist — vFINAL

1) Run one-button smoke
```bash
chmod +x tools/smoke.sh && ./tools/smoke.sh
# Expect: SMOKE_OK
```

2) Canary dry run
- Open `/app/canary`, configure a tiny window, PROMOTE remains FALSE → preview shows no mutations.

3) Canary live window
- Schedule Promote Window (60–120 min), then preview and run.
- Verify idempotency (second preview no-op).

4) Tag release
```bash
npm run release:vFINAL
```

5) Submit apps
- Shopify: complete listing + assets; attach review checklist evidence.
- WordPress: upload zip with plugin; respond to reviewer notes.
