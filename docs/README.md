# Proofkit SaaS (Backend + Shopify + WordPress + Ads Script)

This bundle removes the Google Apps Script Web App. Instead, you run **your own backend** (Node/Express).

- The Google Ads Script calls your backend for config and posts metrics.
- Your Shopify/WP apps manage pixels and can send settings to the backend.
- Storage can be Google Sheets (via service account) or later a DB.

## Folders

- backend/ — Express API with HMAC & Google Sheets support
- ads-script/ — Universal Ads Script (points to your backend)
- shopify-app/ — Skeleton service to send settings and a Web Pixel stub
- wordpress-plugin/ — Pixel injection + optional backend forward
- docs/ — onboarding/API/roadmap

See docs/ONBOARDING.md to run.
