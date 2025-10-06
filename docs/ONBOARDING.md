# Ads Autopilot AI - Onboarding Guide

Get started with Ads Autopilot AI in under 10 minutes. This guide walks you through setting up the backend, Google Ads integration, and Shopify/WordPress apps.

## Overview

Ads Autopilot AI consists of three main components:

1. **Backend API**: Node.js/Express server for configuration and metrics
2. **Google Ads Script**: Automated campaign optimization script
3. **Store Integration**: Shopify app or WordPress plugin for tracking

## Step 1: Backend Setup

### Prerequisites

- Node.js >= 18.0.0
- npm >= 8.0.0
- Google Sheets service account (optional, for data storage)

### Installation

```bash
cd backend
npm install
cp .env.example .env
```

### Configuration

Edit `.env` and set the following required variables:

```env
# Security
HMAC_SECRET=your_secure_random_secret_here

# Backend URLs
BACKEND_URL=http://localhost:3001
BACKEND_PUBLIC_URL=http://localhost:3001/api

# Shop Configuration
TENANT_ID=adsautopilot
TENANT_REGISTRY_JSON='{"adsautopilot":"your_sheet_id_here"}'

# Google Sheets Integration (Optional)
GOOGLE_SERVICE_EMAIL=service-account@project.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----..."
SHEET_ID=your_master_sheet_id_here
```

### Start the Server

```bash
npm run dev
```

Your backend API will be running on `http://localhost:3001`

## Step 2: Google Ads Integration

### Setup Google Ads Script

1. **Open Google Ads**
   - Navigate to: Tools & Settings → Bulk actions → Scripts
   - Click "+ New Script"

2. **Add the Script**
   - Paste contents from: `ads-script/master.gs`
   - Name it: "Ads Autopilot AI - Campaign Optimizer"

3. **Configure Variables**

   Set these constants at the top of the script:

   ```javascript
   const TENANT_ID = 'adsautopilot';
   const BACKEND_URL = 'https://yourdomain.com/api';  // Your production URL
   const SHARED_SECRET = 'your_hmac_secret_here';     // Same as HMAC_SECRET in backend .env
   ```

4. **Authorize & Test**
   - Click "Preview" to test the script
   - Click "Authorize" when prompted
   - Review the preview log for any errors
   - Run once manually to verify functionality

5. **Schedule Automation**
   - Click "Schedule" button
   - Set frequency: Hourly or Daily (recommended: Hourly)
   - Choose time range that works for your timezone
   - Save the schedule

## Step 3: Shopify Integration

### Option A: Full Shopify App (Recommended)

1. **Install Dependencies**
   ```bash
   cd shopify-ui
   npm install
   ```

2. **Configure Environment**
   ```bash
   cp .env.example .env
   # Edit .env with your Shopify app credentials
   ```

3. **Run Development Server**
   ```bash
   PORT=3003 npm run dev
   ```

4. **Install on Shopify Store**
   - Navigate to your Shopify Partners dashboard
   - Create app or use existing app
   - Install on development store
   - Configure Intent OS dashboard

### Option B: Web Pixel Extension (Quick Start)

1. **Navigate to Extensions**
   ```bash
   cd shopify-app/extensions/pk-web-pixel
   ```

2. **Deploy Web Pixel**
   - Follow the Web Pixel setup guide
   - Configure conversion tracking
   - Enable privacy-compliant tracking

## Step 4: WordPress Integration

### Install Plugin

1. **Upload Plugin**
   - Navigate to WordPress Admin → Plugins → Add New
   - Upload `wordpress-plugin/` folder or ZIP file
   - Activate the plugin

2. **Configure Settings**
   - Go to Settings → Ads Autopilot AI
   - Enter your backend URL
   - Set tenant ID (must match backend TENANT_ID)
   - Enter HMAC secret (must match backend HMAC_SECRET)
   - Save settings

3. **Verify Installation**
   - Check that tracking pixels are loading
   - Verify backend connection in plugin settings
   - Test conversion tracking

## Step 5: Verification

### Test Backend Connection

```bash
# Test health endpoint
curl http://localhost:3001/api/health

# Test config endpoint (with HMAC)
curl "http://localhost:3001/api/config?tenant=adsautopilot&sig=YOUR_HMAC_SIG"
```

### Test Google Ads Script

1. Run the script manually in Google Ads
2. Check the script logs for successful execution
3. Verify metrics are being posted to backend
4. Confirm no errors in the log output

### Test Store Integration

**Shopify:**
- Navigate to Intent OS dashboard
- Verify product data loading
- Test audience creation
- Check campaign configuration

**WordPress:**
- Visit your site frontend
- Check browser console for pixel loading
- Verify conversion events are tracked
- Test WooCommerce integration (if applicable)

## Troubleshooting

### Backend Issues

**Problem**: Backend won't start
- Check Node.js version: `node --version` (must be >= 18)
- Verify .env file exists and is configured
- Check for port conflicts on 3001

**Problem**: Google Sheets connection fails
- Verify service account email is correct
- Check private key format (must include BEGIN/END markers)
- Ensure Sheet ID is correct
- Verify service account has edit access to sheet

### Google Ads Script Issues

**Problem**: Script authorization fails
- Ensure you're logged into correct Google Ads account
- Check that account has necessary permissions
- Try removing and re-adding authorization

**Problem**: Backend communication fails
- Verify BACKEND_URL is accessible from internet
- Check SHARED_SECRET matches backend HMAC_SECRET
- Ensure HMAC signature is being generated correctly

### Store Integration Issues

**Shopify:**
- Verify OAuth credentials are correct
- Check Shopify API permissions
- Ensure App Bridge is properly initialized

**WordPress:**
- Check plugin is activated
- Verify backend URL is accessible
- Ensure settings are saved correctly
- Check PHP version compatibility (>= 7.4)

## Next Steps

1. **Configure Intent Blocks**
   - Create your first intent block in Intent OS dashboard
   - Set up UTM parameters for tracking
   - Configure conversion goals

2. **Set Up Audiences**
   - Create customer segments
   - Configure targeting rules
   - Upload to Google Ads

3. **Launch Campaigns**
   - Start with small test campaigns
   - Monitor performance in dashboard
   - Optimize based on AI recommendations

4. **Monitor Performance**
   - Check real-time analytics
   - Review conversion metrics
   - Adjust campaigns as needed

## Support

Need help? We're here for you:

- **Email**: support@adsautopilot.app
- **Documentation**: `/docs` folder
- **Privacy Questions**: privacy@adsautopilot.app
- **Response Time**: 24 hours maximum

## Additional Resources

- [API Documentation](./API.md)
- [Testing Guide](./TEST_PLAN.md)
- [Billing Integration](./BILLING_INTEGRATION.md)
- [Privacy Policy](./shopify-review/support/privacy-policy.md)
