# Intent OS - Conversion Rate Optimization System

## Overview

Intent OS is ProofKit's advanced conversion rate optimization engine that provides:

1. **Catalog Overlays** - Apply/revert metafield changes with versioning
2. **UTM-Driven Content** - Dynamic content swapping based on traffic source
3. **Intent Blocks** - Reusable content components for different user intents  
4. **AI Promo Drafts** - AI-generated promotional page drafts (never auto-publish)

All mutations are protected by the **PROMOTE flag** for safety.

## 🚀 Features

### 1. Metafield Overlay System
- **Versioned Overlays**: Apply catalog metafield changes with full version history
- **Safe Rollback**: Revert to any previous version instantly
- **Multi-Channel**: Support for web, mobile, email overlays
- **Audit Trail**: Complete history of all overlay actions

### 2. UTM-Driven Content Engine
- **Smart Detection**: Automatically detects UTM parameters from URL
- **Content Strategies**: Different content approaches for each intent:
  - `high-intent` - Urgent, conversion-focused messaging
  - `research` - Educational, trust-building content
  - `comparison` - Competitive advantages and differentiation
  - `retargeting` - Personalized re-engagement content
- **AI Generation**: Machine learning content variations
- **Performance Tracking**: Built-in analytics and conversion tracking

### 3. Intent Block Management
- **Reusable Components**: Create content blocks for different user intents
- **Dynamic Insertion**: Automatically insert appropriate content based on context
- **A/B Testing Ready**: Multiple variations for optimization
- **Easy Management**: Simple UI for content updates

### 4. AI Promo Page Drafts
- **Never Auto-Publish**: All AI content requires manual review
- **Industry Templates**: Pre-built templates for different verticals
- **Campaign Context**: Content generated based on campaign details
- **SEO Optimized**: Includes meta descriptions and structured content

## 🔧 Installation

### Backend Setup

1. **Service Installation**: The Intent OS service is automatically available in `/backend/services/intent-os.js`

2. **Environment Variables**:
```env
# Enable PROMOTE flag globally (use with caution)
INTENT_OS_GLOBAL_PROMOTE=false

# AI Provider for content generation
AI_PROVIDER=openai
OPENAI_API_KEY=your_key_here

# Or use Anthropic
AI_PROVIDER=anthropic
ANTHROPIC_API_KEY=your_key_here
```

3. **Routes**: Intent OS API endpoints are available at `/api/intent-os/*`

### Frontend Setup

1. **Shopify UI**: Access Intent OS dashboard at `/app/intent-os`

2. **Theme Integration**: Add the Shopify theme section:
   - Copy `shopify-theme-section-intent-os.liquid` to your theme's `sections/` directory
   - Rename to `intent-os-utm.liquid`
   - Add to your template: `{% section 'intent-os-utm' %}`

## 📋 API Reference

### Metafield Overlays

#### Apply Overlay
```http
POST /api/intent-os/apply-overlay
Content-Type: application/json

{
  "tenantId": "shop-domain.myshopify.com",
  "overlayConfig": {
    "selector": ".product-title",
    "channel": "web",
    "metafields": {
      "product.title": "Limited Edition - Original Title",
      "product.description": "URGENT: Only 5 left in stock!"
    },
    "description": "Black Friday urgency overlay"
  },
  "promote": true
}
```

#### Revert Overlay
```http
POST /api/intent-os/revert-overlay
Content-Type: application/json

{
  "tenantId": "shop-domain.myshopify.com",
  "targetVersion": 1692123456789,
  "promote": true
}
```

#### Get Overlay History
```http
GET /api/intent-os/overlay-history?tenantId=shop-domain.myshopify.com&limit=10
```

### UTM Content Generation

#### Generate Content
```http
POST /api/intent-os/utm-content
Content-Type: application/json

{
  "tenantId": "shop-domain.myshopify.com",
  "utmTerm": "high-intent",
  "productContext": {
    "category": "shoes",
    "discount": "25",
    "customer_count": "50000"
  }
}
```

#### Get Cached Content
```http
GET /api/intent-os/utm-content?tenantId=shop-domain.myshopify.com&utmTerm=high-intent
```

### Intent Blocks

#### Get Intent Blocks
```http
GET /api/intent-os/intent-blocks?tenantId=shop-domain.myshopify.com
```

#### Update Intent Block
```http
POST /api/intent-os/intent-blocks
Content-Type: application/json

{
  "tenantId": "shop-domain.myshopify.com",
  "intentKey": "summer-sale-2024",
  "blockData": {
    "hero_headline": "Summer Sale: 50% Off Everything!",
    "benefit_bullets": ["Free Shipping", "30-Day Returns", "Price Match Guarantee"],
    "proof_snippet": "Join 10,000+ happy customers",
    "cta_text": "Shop Sale Now",
    "url_target": "/collections/sale"
  },
  "promote": true
}
```

### Promo Drafts

#### Create Promo Draft
```http
POST /api/intent-os/promo-draft
Content-Type: application/json

{
  "tenantId": "shop-domain.myshopify.com",
  "promoConfig": {
    "campaign_name": "Black Friday 2024",
    "offer_details": "Up to 70% off sitewide + free shipping",
    "target_audience": "Fashion-conscious millennials",
    "industry": "ecommerce",
    "campaign_type": "sale"
  },
  "promote": true
}
```

#### Get Promo Drafts
```http
GET /api/intent-os/promo-drafts?tenantId=shop-domain.myshopify.com&limit=20
```

## 🎯 UTM Content Strategy Guide

### High-Intent Traffic (`utm_term=high-intent`)
**Goal**: Immediate conversion
**Strategy**: 
- Urgent headlines with scarcity
- Clear value propositions
- Strong CTAs with action words
- Social proof with numbers
- Countdown timers
- Limited-time offers

**Example**: "Only 3 Hours Left: 50% Off Everything + Free Shipping!"

### Research Traffic (`utm_term=research`)
**Goal**: Education and trust building
**Strategy**:
- Educational headlines
- Detailed benefit explanations
- Expert testimonials
- Comparison charts
- How-to content
- Trust signals

**Example**: "The Complete Guide to Choosing the Perfect Running Shoes"

### Comparison Traffic (`utm_term=comparison`)
**Goal**: Competitive differentiation
**Strategy**:
- Comparison-focused headlines
- Feature comparisons
- Competitive advantages
- Value propositions
- Third-party validation
- "Why choose us" content

**Example**: "See Why 95% Choose Us Over Competitors"

### Retargeting Traffic (`utm_term=retargeting`)
**Goal**: Re-engagement and conversion
**Strategy**:
- Personalized welcome back messages
- Abandoned cart reminders
- Special return offers
- Product recommendations
- Personal touches
- Incentives to complete

**Example**: "Welcome Back! Complete Your Order & Save 15%"

## 🛡️ PROMOTE Flag Safety System

The PROMOTE flag is a critical safety mechanism that prevents accidental changes to live systems.

### How It Works
1. **Default State**: All mutations are disabled by default
2. **Explicit Enable**: Must explicitly set `promote: true` in API calls
3. **Environment Override**: Can be globally enabled with `INTENT_OS_GLOBAL_PROMOTE=true`
4. **Per-Tenant Control**: Individual tenants can have PROMOTE enabled in their config

### Enabling PROMOTE Flag

#### Method 1: Environment Variable (Global)
```env
INTENT_OS_GLOBAL_PROMOTE=true
```

#### Method 2: Tenant Configuration
Add to tenant's configuration sheet:
```
key: INTENT_OS_PROMOTE
value: true
```

#### Method 3: API Request
Always include in mutation requests:
```json
{
  "promote": true
}
```

### Safety Warnings
- ⚠️ **Never enable globally in production** without proper testing
- ⚠️ **Always test overlays** in staging environment first
- ⚠️ **Monitor overlay history** for unexpected changes
- ⚠️ **Have rollback plan** ready before applying overlays

## 🔍 Monitoring & Analytics

### Built-in Tracking
Intent OS automatically tracks:
- Overlay applications and reverts
- UTM content variations shown
- CTA click-through rates
- Conversion rate improvements
- A/B test performance

### Google Analytics Integration
```javascript
// Automatic tracking events:
gtag('event', 'intent_os_view', {
  'utm_term': 'high-intent',
  'section_id': 'intent-os-section-123',
  'headline': 'Limited Time Offer'
});

gtag('event', 'intent_os_cta_click', {
  'utm_term': 'high-intent',
  'cta_text': 'Shop Now',
  'cta_type': 'primary'
});
```

### Custom Analytics
```javascript
// Send custom events to ProofKit
window.proofkit.track('intent_os_conversion', {
  utm_term: 'high-intent',
  conversion_value: 99.99,
  section_id: 'intent-os-section-123'
});
```

## 📊 Performance Optimization

### Caching Strategy
- **UTM Content**: Cached for 1 hour per UTM term
- **Intent Blocks**: Cached until manually updated
- **Overlay History**: Cached for 30 days
- **Active Overlays**: Real-time, no caching

### Content Delivery
- **Theme Section**: Rendered server-side for fast loading
- **Dynamic Content**: Minimal JavaScript for UTM detection
- **Image Optimization**: Lazy loading and responsive images
- **Critical CSS**: Inlined styles for above-the-fold content

### Best Practices
1. **Minimize Overlays**: Only overlay essential fields
2. **Test Performance**: Monitor page load times after overlays
3. **Content Length**: Keep dynamic content concise
4. **Image Sizes**: Optimize images for multiple device sizes
5. **Cache Warming**: Pre-generate common UTM variations

## 🧪 Testing Guide

### Local Testing
1. **Start Backend**: `npm run dev` in `/backend`
2. **Start Shopify UI**: `npm run dev` in `/shopify-ui`
3. **Set Environment**: Copy `.env.example` and configure
4. **Enable PROMOTE**: Set `INTENT_OS_GLOBAL_PROMOTE=true` for testing

### UTM Testing URLs
```
# High intent traffic
https://your-shop.com/?utm_term=high-intent

# Research traffic  
https://your-shop.com/?utm_term=research

# Comparison traffic
https://your-shop.com/?utm_term=comparison

# Retargeting traffic
https://your-shop.com/?utm_term=retargeting
```

### API Testing
```bash
# Test overlay application
curl -X POST https://your-backend.com/api/intent-os/apply-overlay \
  -H "Content-Type: application/json" \
  -d '{
    "tenantId": "test-shop.myshopify.com",
    "overlayConfig": {
      "selector": ".test-element",
      "channel": "web",
      "metafields": {"test": "value"}
    },
    "promote": true
  }'

# Test UTM content generation
curl -X POST https://your-backend.com/api/intent-os/utm-content \
  -H "Content-Type: application/json" \
  -d '{
    "tenantId": "test-shop.myshopify.com",
    "utmTerm": "high-intent",
    "productContext": {"category": "test"}
  }'
```

## 🚨 Troubleshooting

### Common Issues

#### 1. PROMOTE Flag Errors
**Error**: "Intent OS mutations require PROMOTE flag to be enabled"
**Solution**: 
- Check environment variable: `INTENT_OS_GLOBAL_PROMOTE=true`
- Include `"promote": true` in API requests
- Verify tenant configuration has `INTENT_OS_PROMOTE: true`

#### 2. UTM Content Not Showing
**Error**: Content doesn't change with UTM parameters
**Solution**:
- Verify theme section is properly installed
- Check browser developer tools for JavaScript errors
- Ensure UTM parameter format: `?utm_term=high-intent`
- Clear cache and test again

#### 3. AI Content Generation Fails
**Error**: AI provider initialization fails
**Solution**:
- Verify API keys are set correctly
- Check AI provider is supported (OpenAI, Anthropic, Google)
- Ensure sufficient API credits
- Check network connectivity

#### 4. Overlay History Not Loading
**Error**: Cannot load overlay history
**Solution**:
- Verify Google Sheets permissions
- Check tenant ID is correct
- Ensure sheet exists and has proper headers
- Check HMAC signature if required

### Debug Mode
Enable debug logging:
```env
LOG_LEVEL=debug
INTENT_OS_DEBUG=true
```

### Health Check
```http
GET /api/intent-os/status?tenantId=your-shop.myshopify.com
```

Response includes:
- Initialization status
- PROMOTE flag status
- AI provider status
- Available features

## 📚 Advanced Usage

### Custom UTM Terms
Add new UTM content strategies by extending the `utmContentMap` in `intent-os.js`:

```javascript
this.utmContentMap = {
  'high-intent': { urgency: 'high', social_proof: 'testimonials' },
  'research': { urgency: 'low', social_proof: 'reviews' },
  'comparison': { urgency: 'medium', social_proof: 'comparisons' },
  'custom-term': { urgency: 'medium', social_proof: 'custom' }
};
```

### Custom Templates
Add industry-specific templates:

```javascript
this.templates = {
  ecommerce: { /* existing template */ },
  saas: { /* existing template */ },
  services: { /* existing template */ },
  'custom-industry': {
    hero_headline: "Custom {product_name} for {industry}",
    benefit_bullets: "Custom Benefit 1|Custom Benefit 2|Custom Benefit 3",
    proof_snippet: "Trusted by {customer_count}+ {industry} professionals",
    cta_text: "Get Started",
    url_target: "/custom-signup"
  }
};
```

### Webhook Integration
Set up webhooks for real-time notifications:

```javascript
// In your webhook handler
app.post('/webhook/intent-os-overlay', (req, res) => {
  const { tenantId, action, version } = req.body;
  
  // Send notification to Slack, email, etc.
  notify(`Intent OS: ${action} overlay for ${tenantId} (v${version})`);
  
  res.json({ success: true });
});
```

## 🔐 Security Considerations

### Data Protection
- All API endpoints require HMAC validation
- Sensitive data is encrypted in transit
- No PII is stored in Intent OS logs
- Audit trails for all mutations

### Content Safety
- AI-generated content requires manual review
- XSS protection on all dynamic content
- Content sanitization before display
- Rate limiting on API endpoints

### Access Control
- PROMOTE flag prevents unauthorized changes
- Tenant isolation for all operations
- Role-based access in Shopify UI
- API key rotation support

## 📈 Roadmap

### Upcoming Features
- [ ] Visual overlay editor
- [ ] A/B testing framework
- [ ] Machine learning optimization
- [ ] Real-time personalization
- [ ] Multi-language support
- [ ] Advanced segmentation
- [ ] Conversion funnel analysis
- [ ] Automated optimization

### Integration Plans
- [ ] Shopify Plus features
- [ ] Google Ads integration
- [ ] Facebook Ads integration
- [ ] Email marketing platforms
- [ ] CRM systems
- [ ] Analytics platforms

## 🆘 Support

### Documentation
- [API Reference](./INTENT_OS_API.md)
- [Theme Integration Guide](./INTENT_OS_THEME.md)
- [Troubleshooting](./INTENT_OS_TROUBLESHOOTING.md)

### Community
- GitHub Issues: Report bugs and feature requests
- Discord: Real-time community support
- Documentation: Comprehensive guides and examples

### Enterprise Support
- Priority support for enterprise customers
- Custom integrations and development
- Advanced analytics and reporting
- Dedicated account management

---

**Intent OS** - Powered by ProofKit SaaS
*Conversion Rate Optimization Made Simple*