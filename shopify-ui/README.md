# Ads Autopilot AI - Shopify App (Remix)

AI-powered Google Ads automation platform for Shopify stores. Intelligent campaign management, automated optimization, and privacy-first analytics.

## Features

- **AI Dashboard**: Complete Google Ads campaign control center
- **Audience Management**: Smart customer segmentation without PII collection
- **Campaign Automation**: AI-powered optimization and budget management
- **Privacy-First**: GDPR/CCPA compliant by design
- **Google Ads Integration**: Seamless campaign synchronization and script generation

## Local Development

### Prerequisites

- Node.js >= 18.0.0
- npm >= 8.0.0

### Setup

1. **Environment Configuration**
   ```bash
   cp .env.example .env
   # Edit .env and set your variables
   ```

2. **Install & Run**
   ```bash
   npm install
   PORT=3003 npm run dev
   ```

3. **Access the App**
   ```
   http://localhost:3003/app/autopilot
   ```

### UI Preview Mode

The app includes a UI-only preview route (no OAuth required). The server automatically signs HMAC requests using environment variables for local testing.

## Project Structure

```
shopify-ui/
├── app/
│   ├── routes/          # Remix routes and API endpoints
│   ├── components/      # React components (Polaris UI)
│   ├── services/        # Business logic and API services
│   └── styles/          # CSS and styling
├── public/              # Static assets
└── package.json         # Dependencies
```

## Key Technologies

- **Remix**: Full-stack React framework
- **Shopify Polaris**: UI component library
- **Shopify App Bridge**: Native Shopify admin integration
- **React**: Component-based UI
- **TypeScript**: Type-safe development

## Support

- **Email**: support@adsautopilot.app
- **Documentation**: `/docs`
- **Privacy**: privacy@adsautopilot.app
