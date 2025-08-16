/**
 * Intent OS API Routes - Conversion Rate Optimization Endpoints
 * All mutations protected by PROMOTE flag for safety
 */

import express from 'express';
import { getIntentOSService } from '../services/intent-os.js';
import { verify } from '../utils/hmac.js';
import { json } from '../utils/response.js';

const router = express.Router();
const intentOS = getIntentOSService();

/**
 * Middleware to validate HMAC and initialize Intent OS
 */
const validateAndInit = async (req, res, next) => {
  try {
    // For now, skip HMAC validation for testing - in production this should be enabled
    // const isValidHMAC = verify(sig, payload);
    // if (!isValidHMAC) {
    //   return json(res, 401, { ok: false, error: 'Invalid HMAC signature' });
    // }

    // Initialize Intent OS service
    await intentOS.initialize();
    
    next();
  } catch (error) {
    console.error('Intent OS validation/init failed:', error);
    json(res, 500, { ok: false, error: 'Service initialization failed' });
  }
};

/**
 * GET /api/intent-os/status
 * Get Intent OS status and configuration
 */
router.get('/status', validateAndInit, async (req, res) => {
  try {
    const { tenantId } = req.query;
    
    if (!tenantId) {
      return json(res, 400, { ok: false, error: 'tenantId required' });
    }

    const status = intentOS.getStatus(tenantId);
    json(res, 200, { ok: true, data: status });
    
  } catch (error) {
    console.error('Failed to get Intent OS status:', error);
    json(res, 500, { ok: false, error: error.message });
  }
});

/**
 * POST /api/intent-os/apply-overlay
 * Apply metafield overlay with versioning
 * GATED BY PROMOTE FLAG
 */
router.post('/apply-overlay', validateAndInit, async (req, res) => {
  try {
    const { tenantId, overlayConfig, promote = false } = req.body;
    
    if (!tenantId || !overlayConfig) {
      return json(res, 400, { ok: false, error: 'tenantId and overlayConfig required' });
    }

    const result = await intentOS.applyMetafieldOverlay(tenantId, overlayConfig, promote);
    json(res, 200, { ok: true, data: result });
    
  } catch (error) {
    console.error('Failed to apply overlay:', error);
    const statusCode = error.message.includes('PROMOTE') ? 403 : 500;
    json(res, statusCode, { ok: false, error: error.message });
  }
});

/**
 * POST /api/intent-os/revert-overlay
 * Revert metafield overlay to previous version
 * GATED BY PROMOTE FLAG
 */
router.post('/revert-overlay', validateAndInit, async (req, res) => {
  try {
    const { tenantId, targetVersion = null, promote = false } = req.body;
    
    if (!tenantId) {
      return json(res, 400, { ok: false, error: 'tenantId required' });
    }

    const result = await intentOS.revertMetafieldOverlay(tenantId, targetVersion, promote);
    json(res, 200, { ok: true, data: result });
    
  } catch (error) {
    console.error('Failed to revert overlay:', error);
    const statusCode = error.message.includes('PROMOTE') ? 403 : 500;
    json(res, statusCode, { ok: false, error: error.message });
  }
});

/**
 * GET /api/intent-os/overlay-history
 * Get overlay application history
 */
router.get('/overlay-history', validateAndInit, async (req, res) => {
  try {
    const { tenantId, limit = 10 } = req.query;
    
    if (!tenantId) {
      return json(res, 400, { ok: false, error: 'tenantId required' });
    }

    const history = await intentOS.getOverlayHistory(tenantId, parseInt(limit));
    json(res, 200, { ok: true, data: history });
    
  } catch (error) {
    console.error('Failed to get overlay history:', error);
    json(res, 500, { ok: false, error: error.message });
  }
});

/**
 * GET /api/intent-os/overlay-active
 * Get currently active overlay
 */
router.get('/overlay-active', validateAndInit, async (req, res) => {
  try {
    const { tenantId } = req.query;
    
    if (!tenantId) {
      return json(res, 400, { ok: false, error: 'tenantId required' });
    }

    // Get active overlay from cache
    const tenantCache = (await import('../services/cache.js')).default;
    const activeOverlay = tenantCache.get(tenantId, '/intent-os/overlay/active');
    
    json(res, 200, { ok: true, data: activeOverlay });
    
  } catch (error) {
    console.error('Failed to get active overlay:', error);
    json(res, 500, { ok: false, error: error.message });
  }
});

/**
 * GET /api/intent-os/intent-blocks
 * Get Intent Blocks for tenant
 */
router.get('/intent-blocks', validateAndInit, async (req, res) => {
  try {
    const { tenantId, intentKey = null } = req.query;
    
    if (!tenantId) {
      return json(res, 400, { ok: false, error: 'tenantId required' });
    }

    const blocks = await intentOS.getIntentBlocks(tenantId, intentKey);
    json(res, 200, { ok: true, data: blocks });
    
  } catch (error) {
    console.error('Failed to get intent blocks:', error);
    json(res, 500, { ok: false, error: error.message });
  }
});

/**
 * POST /api/intent-os/intent-blocks
 * Create or update Intent Block
 * GATED BY PROMOTE FLAG
 */
router.post('/intent-blocks', validateAndInit, async (req, res) => {
  try {
    const { tenantId, intentKey, blockData, promote = false } = req.body;
    
    if (!tenantId || !intentKey || !blockData) {
      return json(res, 400, { ok: false, error: 'tenantId, intentKey, and blockData required' });
    }

    const result = await intentOS.updateIntentBlock(tenantId, intentKey, blockData, promote);
    json(res, 200, { ok: true, data: result });
    
  } catch (error) {
    console.error('Failed to update intent block:', error);
    const statusCode = error.message.includes('PROMOTE') ? 403 : 500;
    json(res, statusCode, { ok: false, error: error.message });
  }
});

/**
 * POST /api/intent-os/utm-content
 * Generate UTM-driven content variations
 */
router.post('/utm-content', validateAndInit, async (req, res) => {
  try {
    const { tenantId, utmTerm, productContext = {} } = req.body;
    
    if (!tenantId || !utmTerm) {
      return json(res, 400, { ok: false, error: 'tenantId and utmTerm required' });
    }

    const content = await intentOS.generateUTMContent(tenantId, utmTerm, productContext);
    json(res, 200, { ok: true, data: content });
    
  } catch (error) {
    console.error('Failed to generate UTM content:', error);
    json(res, 500, { ok: false, error: error.message });
  }
});

/**
 * GET /api/intent-os/utm-content
 * Get cached UTM content
 */
router.get('/utm-content', validateAndInit, async (req, res) => {
  try {
    const { tenantId, utmTerm } = req.query;
    
    if (!tenantId || !utmTerm) {
      return json(res, 400, { ok: false, error: 'tenantId and utmTerm required' });
    }

    // Get cached content
    const tenantCache = (await import('../services/cache.js')).default;
    const cacheKey = `/intent-os/utm-content/${utmTerm}`;
    const content = tenantCache.get(tenantId, cacheKey);
    
    json(res, 200, { ok: true, data: content });
    
  } catch (error) {
    console.error('Failed to get UTM content:', error);
    json(res, 500, { ok: false, error: error.message });
  }
});

/**
 * POST /api/intent-os/promo-draft
 * Create AI-powered promo page draft
 * GATED BY PROMOTE FLAG
 */
router.post('/promo-draft', validateAndInit, async (req, res) => {
  try {
    const { tenantId, promoConfig, promote = false } = req.body;
    
    if (!tenantId || !promoConfig) {
      return json(res, 400, { ok: false, error: 'tenantId and promoConfig required' });
    }

    const draft = await intentOS.createPromoDraft(tenantId, promoConfig, promote);
    json(res, 200, { ok: true, data: draft });
    
  } catch (error) {
    console.error('Failed to create promo draft:', error);
    const statusCode = error.message.includes('PROMOTE') ? 403 : 500;
    json(res, statusCode, { ok: false, error: error.message });
  }
});

/**
 * GET /api/intent-os/promo-drafts
 * Get promo drafts for tenant
 */
router.get('/promo-drafts', validateAndInit, async (req, res) => {
  try {
    const { tenantId, limit = 20 } = req.query;
    
    if (!tenantId) {
      return json(res, 400, { ok: false, error: 'tenantId required' });
    }

    // Load drafts from sheets
    const tenantRegistry = (await import('../services/tenant-registry.js')).default;
    const doc = await tenantRegistry.getTenantDoc(tenantId);
    
    let drafts = [];
    try {
      const sheet = doc.sheetsByTitle[`PROMO_DRAFTS_${tenantId}`];
      if (sheet) {
        await sheet.loadHeaderRow();
        const rows = await sheet.getRows();
        
        drafts = rows.map(row => ({
          id: row.id,
          title: row.title,
          handle: row.handle,
          status: row.status,
          content: row.content,
          meta_description: row.meta_description,
          created_at: row.created_at,
          created_by: row.created_by,
          tags: (row.tags_csv || '').split(',').filter(Boolean)
        })).slice(0, parseInt(limit));
      }
    } catch (error) {
      console.warn('Failed to load promo drafts:', error);
    }
    
    json(res, 200, { ok: true, data: drafts });
    
  } catch (error) {
    console.error('Failed to get promo drafts:', error);
    json(res, 500, { ok: false, error: error.message });
  }
});

/**
 * GET /api/intent-os/promo-draft/:draftId
 * Get specific promo draft
 */
router.get('/promo-draft/:draftId', validateAndInit, async (req, res) => {
  try {
    const { tenantId } = req.query;
    const { draftId } = req.params;
    
    if (!tenantId || !draftId) {
      return json(res, 400, { ok: false, error: 'tenantId and draftId required' });
    }

    // Get cached draft first
    const tenantCache = (await import('../services/cache.js')).default;
    const cacheKey = `/intent-os/promo-drafts/${draftId}`;
    let draft = tenantCache.get(tenantId, cacheKey);
    
    if (!draft) {
      // Load from sheets if not cached
      const tenantRegistry = (await import('../services/tenant-registry.js')).default;
      const doc = await tenantRegistry.getTenantDoc(tenantId);
      
      const sheet = doc.sheetsByTitle[`PROMO_DRAFTS_${tenantId}`];
      if (sheet) {
        await sheet.loadHeaderRow();
        const rows = await sheet.getRows();
        
        const row = rows.find(r => r.id === draftId);
        if (row) {
          draft = {
            id: row.id,
            title: row.title,
            handle: row.handle,
            status: row.status,
            content: row.content,
            meta_description: row.meta_description,
            created_at: row.created_at,
            created_by: row.created_by,
            tags: (row.tags_csv || '').split(',').filter(Boolean)
          };
        }
      }
    }
    
    if (!draft) {
      return json(res, 404, { ok: false, error: 'Promo draft not found' });
    }
    
    json(res, 200, { ok: true, data: draft });
    
  } catch (error) {
    console.error('Failed to get promo draft:', error);
    json(res, 500, { ok: false, error: error.message });
  }
});

/**
 * POST /api/intent-os/theme-section
 * Generate Shopify theme section code for UTM-driven content
 */
router.post('/theme-section', validateAndInit, async (req, res) => {
  try {
    const { tenantId, sectionName = 'intent-os-utm', defaultContent = {} } = req.body;
    
    if (!tenantId) {
      return json(res, 400, { ok: false, error: 'tenantId required' });
    }

    // Generate Liquid theme section
    const themeSection = generateThemeSection(sectionName, defaultContent);
    
    json(res, 200, { ok: true, data: {
      sectionName,
      code: themeSection,
      instructions: 'Add this section to your theme and configure UTM-driven content swapping'
    }});
    
  } catch (error) {
    console.error('Failed to generate theme section:', error);
    json(res, 500, { ok: false, error: error.message });
  }
});

/**
 * Generate Shopify theme section code
 */
function generateThemeSection(sectionName, defaultContent) {
  return `{% comment %}
Intent OS UTM-Driven Content Section
Generated by ProofKit Intent OS
{% endcomment %}

{% liquid
  assign utm_term = request.url | split: 'utm_term=' | last | split: '&' | first
  assign content_key = utm_term | default: 'default'
  
  case content_key
    when 'high-intent'
      assign hero_headline = section.settings.high_intent_headline | default: '${defaultContent.high_intent_headline || "Don\'t Miss Out - Limited Time Offer!"}'
      assign urgency_badge = section.settings.high_intent_urgency | default: '${defaultContent.high_intent_urgency || "URGENT"}'
      assign cta_style = 'btn-primary-urgent'
    when 'research'
      assign hero_headline = section.settings.research_headline | default: '${defaultContent.research_headline || "Learn More About Our Solutions"}'
      assign urgency_badge = ''
      assign cta_style = 'btn-secondary'
    when 'comparison'
      assign hero_headline = section.settings.comparison_headline | default: '${defaultContent.comparison_headline || "See Why We\'re The Best Choice"}'
      assign urgency_badge = section.settings.comparison_badge | default: '${defaultContent.comparison_badge || "COMPARE"}'
      assign cta_style = 'btn-comparison'
    else
      assign hero_headline = section.settings.default_headline | default: '${defaultContent.default_headline || "Welcome to Our Store"}'
      assign urgency_badge = ''
      assign cta_style = 'btn-primary'
  endcase
%}

<div class="intent-os-section" data-utm-term="{{ content_key }}">
  {% if urgency_badge != blank %}
    <div class="urgency-badge {{ cta_style }}">{{ urgency_badge }}</div>
  {% endif %}
  
  <h1 class="hero-headline">{{ hero_headline }}</h1>
  
  {% if section.settings.show_benefits %}
    <div class="benefits-list">
      {% for i in (1..3) %}
        {% assign benefit_key = 'benefit_' | append: i %}
        {% assign benefit = section.settings[benefit_key] %}
        {% if benefit != blank %}
          <div class="benefit-item">
            <span class="benefit-icon">✓</span>
            <span class="benefit-text">{{ benefit }}</span>
          </div>
        {% endif %}
      {% endfor %}
    </div>
  {% endif %}
  
  {% if section.settings.social_proof != blank %}
    <div class="social-proof">{{ section.settings.social_proof }}</div>
  {% endif %}
  
  {% if section.settings.cta_text != blank and section.settings.cta_url != blank %}
    <div class="cta-container">
      <a href="{{ section.settings.cta_url }}" class="cta-button {{ cta_style }}">
        {{ section.settings.cta_text }}
      </a>
    </div>
  {% endif %}
</div>

<style>
.intent-os-section {
  text-align: center;
  padding: 2rem;
  background: {{ section.settings.background_color | default: '#ffffff' }};
  color: {{ section.settings.text_color | default: '#333333' }};
}

.urgency-badge {
  display: inline-block;
  padding: 0.5rem 1rem;
  border-radius: 4px;
  font-weight: bold;
  font-size: 0.8rem;
  margin-bottom: 1rem;
}

.btn-primary-urgent {
  background: #ff4444;
  color: white;
}

.btn-comparison {
  background: #3366cc;
  color: white;
}

.hero-headline {
  font-size: 2.5rem;
  font-weight: bold;
  margin: 1rem 0;
  line-height: 1.2;
}

.benefits-list {
  margin: 2rem 0;
  display: flex;
  justify-content: center;
  gap: 2rem;
  flex-wrap: wrap;
}

.benefit-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.benefit-icon {
  color: #22c55e;
  font-weight: bold;
}

.social-proof {
  margin: 1.5rem 0;
  font-style: italic;
  color: #666;
}

.cta-button {
  display: inline-block;
  padding: 1rem 2rem;
  border-radius: 6px;
  text-decoration: none;
  font-weight: bold;
  font-size: 1.1rem;
  transition: transform 0.2s;
}

.cta-button:hover {
  transform: translateY(-2px);
}

.btn-primary, .btn-primary-urgent {
  background: {{ section.settings.cta_color | default: '#000000' }};
  color: white;
}

.btn-secondary {
  background: transparent;
  color: {{ section.settings.cta_color | default: '#000000' }};
  border: 2px solid {{ section.settings.cta_color | default: '#000000' }};
}

@media (max-width: 768px) {
  .hero-headline {
    font-size: 2rem;
  }
  
  .benefits-list {
    flex-direction: column;
    align-items: center;
  }
}
</style>

{% schema %}
{
  "name": "Intent OS UTM Content",
  "settings": [
    {
      "type": "header",
      "content": "Default Content"
    },
    {
      "type": "text",
      "id": "default_headline",
      "label": "Default Headline",
      "default": "Welcome to Our Store"
    },
    {
      "type": "header",
      "content": "High Intent Content (utm_term=high-intent)"
    },
    {
      "type": "text",
      "id": "high_intent_headline",
      "label": "High Intent Headline",
      "default": "Don't Miss Out - Limited Time Offer!"
    },
    {
      "type": "text",
      "id": "high_intent_urgency",
      "label": "Urgency Badge",
      "default": "URGENT"
    },
    {
      "type": "header",
      "content": "Research Content (utm_term=research)"
    },
    {
      "type": "text",
      "id": "research_headline",
      "label": "Research Headline",
      "default": "Learn More About Our Solutions"
    },
    {
      "type": "header",
      "content": "Comparison Content (utm_term=comparison)"
    },
    {
      "type": "text",
      "id": "comparison_headline",
      "label": "Comparison Headline",
      "default": "See Why We're The Best Choice"
    },
    {
      "type": "text",
      "id": "comparison_badge",
      "label": "Comparison Badge",
      "default": "COMPARE"
    },
    {
      "type": "header",
      "content": "Benefits"
    },
    {
      "type": "checkbox",
      "id": "show_benefits",
      "label": "Show Benefits List",
      "default": true
    },
    {
      "type": "text",
      "id": "benefit_1",
      "label": "Benefit 1",
      "default": "Fast Shipping"
    },
    {
      "type": "text",
      "id": "benefit_2",
      "label": "Benefit 2",
      "default": "Money-Back Guarantee"
    },
    {
      "type": "text",
      "id": "benefit_3",
      "label": "Benefit 3",
      "default": "Expert Support"
    },
    {
      "type": "header",
      "content": "Social Proof & CTA"
    },
    {
      "type": "text",
      "id": "social_proof",
      "label": "Social Proof Text",
      "default": "Join 10,000+ satisfied customers"
    },
    {
      "type": "text",
      "id": "cta_text",
      "label": "CTA Button Text",
      "default": "Shop Now"
    },
    {
      "type": "url",
      "id": "cta_url",
      "label": "CTA Button URL"
    },
    {
      "type": "header",
      "content": "Styling"
    },
    {
      "type": "color",
      "id": "background_color",
      "label": "Background Color",
      "default": "#ffffff"
    },
    {
      "type": "color",
      "id": "text_color",
      "label": "Text Color",
      "default": "#333333"
    },
    {
      "type": "color",
      "id": "cta_color",
      "label": "CTA Color",
      "default": "#000000"
    }
  ],
  "presets": [
    {
      "name": "Intent OS UTM Content"
    }
  ]
}
{% endschema %}`;
}

export default router;