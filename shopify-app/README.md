# Ads Autopilot AI - Shopify App (Legacy Structure)

This is a legacy Shopify app structure. For the main Shopify UI application, see `/shopify-ui` directory.

## Overview

This directory contains:
- Shopify Web Pixel extension for conversion tracking
- Legacy app structure and configuration files
- Extension documentation and setup guides

## Main Application

The primary Shopify app is located in `/shopify-ui` - use that for development.

## Web Pixel Extension

The Web Pixel extension provides privacy-compliant analytics and conversion tracking:

- **Location**: `extensions/pk-web-pixel/`
- **Documentation**: See `extensions/pk-web-pixel/README.md`
- **Setup Guide**: See `extensions/pk-web-pixel/MERCHANT_SETUP_GUIDE.md`

## Local Development (Legacy)

If you need to work with this legacy structure:

### 1. Environment Configuration

Create a `.env` file:

```env
SHOPIFY_API_KEY=your_shopify_api_key
SHOPIFY_API_SECRET=your_shopify_api_secret
APP_URL=http://localhost:3002
BACKEND_URL=http://localhost:3001/api
HMAC_SECRET=your_hmac_secret
TENANT_ID=adsautopilot
```

### 2. Installation & Run

```bash
npm install
npm run dev
```

### 3. Available Routes

- `/app` - Canary wizard (static)
- `/app/intent` - Intent blocks management
- `/app/overlays` - Overlay management
- `/app/canary` - Canary deployment wizard
- `/app/api/*` - API proxy routes (HMAC signing server-side)

## Security

All API requests are proxied through server-side routes that handle HMAC signing. No secrets are exposed to the browser.

## Migration Note

New development should use the `/shopify-ui` directory which contains the full-featured Remix-based Shopify app with:
- Intent OS Dashboard
- AI-powered optimization
- Advanced campaign management
- Modern architecture

## Support

- **Email**: support@adsautopilot.app
- **Documentation**: `/docs`
- **Web Pixel Guide**: `extensions/pk-web-pixel/README.md`
