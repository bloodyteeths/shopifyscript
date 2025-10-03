/**
 * Inline AI Writer for Vercel Serverless
 * No child process spawning - runs directly in the function
 */

import { validateRSA } from "../lib/validators.js";
import { getDoc, ensureSheet } from "../sheets.js";
import { getAIProvider } from "../lib/aiProvider.js";
import { createClient } from "@supabase/supabase-js";
import tenantConfigService from "../services/tenant-config.js";
import { WebsiteScraperService } from "../services/website-scraper.js";
import { CompetitorIntelligenceService } from "../services/competitor-intelligence.js";

/**
 * Get Supabase client
 */
function getSupabaseClient() {
  const url = process.env.SUPABASE_URL;
  // Use SERVICE_ROLE_KEY for write permissions (same as other backend services)
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  // Debug log to check configuration
  if (!url || !key) {
    console.warn("Supabase not configured:", {
      hasUrl: !!url,
      hasServiceKey: !!key,
      hasAnonKey: !!process.env.SUPABASE_ANON_KEY,
      hint: "Check SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in Vercel env"
    });
    return null;
  }

  console.log("Initializing Supabase client with service role key");

  // Use service role key for backend operations
  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });
}

/**
 * Fetch website content to understand products and branding
 */
async function fetchWebsiteContext(tenant) {
  try {
    // Construct the Shopify store URL
    const storeUrl = `https://${tenant}.myshopify.com`;

    console.log(`Fetching website context from ${storeUrl}`);

    // Add reasonable timeout for website fetch
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

    const response = await fetch(storeUrl, {
      headers: {
        'User-Agent': 'ProofKit AI Bot/1.0'
      },
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      const html = await response.text();

      // Extract comprehensive info from HTML
      const titleMatch = html.match(/<title>(.*?)<\/title>/i);
      const descMatch = html.match(/<meta\s+name=["']description["']\s+content=["'](.*?)["']/i);

      // Extract product names from structured data or product listings
      const productMatches = html.match(/product['"]:[\s]*{[^}]*"name"[\s]*:[\s]*["']([^"']+)["']/gi) || [];
      const products = productMatches.slice(0, 5).map(match => {
        const nameMatch = match.match(/"name"[\s]*:[\s]*["']([^"']+)["']/i);
        return nameMatch ? nameMatch[1] : null;
      }).filter(Boolean);

      // Extract price ranges if available
      const priceMatches = html.match(/\$[\d,]+\.?\d*/g) || [];
      const prices = [...new Set(priceMatches)].slice(0, 10);

      // Extract any promotional text
      const promoPatterns = [
        /sale|discount|off|save|free shipping|limited time/gi,
        /\d+%\s*off/gi
      ];

      const promotions = [];
      promoPatterns.forEach(pattern => {
        const matches = html.match(pattern) || [];
        promotions.push(...matches);
      });

      // Extract collection/category names
      const collectionMatches = html.match(/\/collections\/([a-z0-9-]+)/gi) || [];
      const collections = [...new Set(collectionMatches.map(m =>
        m.replace('/collections/', '').replace(/-/g, ' ')
      ))].slice(0, 5);

      return {
        storeTitle: titleMatch ? titleMatch[1].substring(0, 100) : '',
        storeDescription: descMatch ? descMatch[1].substring(0, 300) : '',
        products: products,
        priceRange: prices.length > 0 ? { min: Math.min(...prices.map(p => parseFloat(p.replace(/[$,]/g, '')))), max: Math.max(...prices.map(p => parseFloat(p.replace(/[$,]/g, ''))))} : null,
        promotions: [...new Set(promotions)].slice(0, 3),
        collections: collections,
        websiteAvailable: true
      };
    }
  } catch (error) {
    if (error.name === 'AbortError') {
      console.warn("Website fetch timeout for", tenant);
    } else {
      console.warn("Could not fetch website:", error.message);
    }
  }

  return { websiteAvailable: false };
}

/**
 * Get business context for AI generation
 */
async function getBusinessContext(tenant, supabase) {
  const context = {
    businessName: tenant,
    products: [],
    topKeywords: [],
    businessType: 'general',
    targetAudience: '',
    uniqueSellingPoints: [],
    performanceData: {
      avgCTR: 0,
      avgCPC: 0,
      topCampaigns: [],
      bestPerformingAds: []
    },
    websiteInfo: {},
    competitorInsights: null,
    websiteAnalysis: null
  };

  // Initialize advanced services (with timeout protection for Vercel)
  let websiteScraper, competitorIntel;
  try {
    websiteScraper = new WebsiteScraperService();
    console.log('✅ WebsiteScraperService initialized');
  } catch (err) {
    console.error('❌ WebsiteScraperService init failed:', err.message, err.stack);
    websiteScraper = null;
  }

  try {
    competitorIntel = new CompetitorIntelligenceService();
    console.log('✅ CompetitorIntelligenceService initialized');
  } catch (err) {
    console.error('❌ CompetitorIntelligenceService init failed:', err.message, err.stack);
    competitorIntel = null;
  }

  // Fetch comprehensive website analysis (products, USPs, testimonials, offers)
  // Add 8-second timeout for Vercel serverless
  const websitePromise = websiteScraper
    ? Promise.race([
        websiteScraper.initialize()
          .then(() => websiteScraper.scrapeWebsite(`https://${tenant}.myshopify.com`, {
            tenant: tenant,
            extractProducts: true,
            extractTestimonials: true,
            extractOffers: true,
            extractUSPs: true,
            depth: 2,
            maxPages: 10
          }))
          .then(analysis => {
            console.log('📊 Website analysis complete:', {
              products: analysis?.products?.length || 0,
              testimonials: analysis?.testimonials?.length || 0,
              offers: analysis?.offers?.length || 0,
              usps: analysis?.usps?.length || 0
            });
            return analysis;
          }),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Website scraper timeout')), 8000)
        )
      ]).catch(err => {
        console.warn('⚠️ Website scraper failed, using basic fetch:', err.message);
        return fetchWebsiteContext(tenant);
      })
    : fetchWebsiteContext(tenant);

  try {
    // Try to get config from tenant service
    const config = await tenantConfigService.getTenantConfig(tenant);

    if (config) {
      context.businessName = config.business_name || tenant;
      context.businessType = config.business_type || 'ecommerce';
      context.targetAudience = config.target_audience || '';
      context.uniqueSellingPoints = config.unique_selling_points || [];
    }
  } catch (error) {
    console.warn("Could not load tenant config:", error.message);
  }

  // Try to get performance data from Supabase
  if (supabase) {
    try {
      console.log(`🔍 Fetching performance data for tenant: ${tenant}`);

      // Set tenant context for RLS (even with service role, good practice)
      try {
        const { error: rlsError } = await supabase.rpc('set_config', {
          parameter: 'app.current_tenant_id',
          value: tenant
        });

        if (rlsError) {
          console.warn('RLS set_config failed (may not exist):', rlsError.message);
        }
      } catch (rlsErr) {
        console.warn('RLS set_config threw an error:', rlsErr.message);
        // Ignore errors - service role can bypass RLS anyway
      }

      // Get ACTUAL campaign performance data from Google Ads
      // Use ALL_TIME or LAST_7_DAYS period data, and remove conversion filter
      const { data: campaigns, error: campaignError } = await supabase
        .from('tenant_metrics')
        .select('campaign_name, impressions, clicks, conversions, cost_micros, ctr')
        .eq('tenant_id', tenant)
        .eq('entity_type', 'campaign')
        .in('period', ['ALL_TIME', 'LAST_7_DAYS', 'LAST_30_DAYS'])
        .gt('impressions', 0)  // At least some traffic
        .order('impressions', { ascending: false })
        .limit(50);

      if (campaignError) {
        console.error('❌ Campaign query error:', campaignError);
      }

      console.log(`📊 Campaign query returned ${campaigns?.length || 0} results`);

      if (campaigns && campaigns.length > 0) {
        // Extract high-performing campaign themes
        context.topCampaigns = campaigns.slice(0, 5).map(c => c.campaign_name);
        console.log(`✅ Top campaigns: ${context.topCampaigns.join(', ')}`);

        // Find patterns in successful campaigns
        const campaignWords = campaigns
          .map(c => c.campaign_name.toLowerCase().split(/[\s-_]+/))
          .flat()
          .filter(word => word.length > 3 && !['campaign', 'search', 'shopping'].includes(word));

        // Count word frequency to identify successful themes
        const wordFreq = {};
        campaignWords.forEach(word => {
          wordFreq[word] = (wordFreq[word] || 0) + 1;
        });

        // Get top product/theme words
        context.products = Object.entries(wordFreq)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([word]) => word.charAt(0).toUpperCase() + word.slice(1));
      }

      // Get ACTUAL ad performance data
      const { data: adGroups } = await supabase
        .from('tenant_metrics')
        .select('ad_group_name, campaign_name, clicks, conversions, ctr')
        .eq('tenant_id', tenant)
        .eq('entity_type', 'ad_group')
        .in('period', ['ALL_TIME', 'LAST_7_DAYS', 'LAST_30_DAYS'])
        .gt('clicks', 0)  // At least some clicks
        .order('clicks', { ascending: false })
        .limit(20);

      console.log(`📊 Ad group query returned ${adGroups?.length || 0} results`);

      if (adGroups && adGroups.length > 0) {
        context.performanceData.bestPerformingAds = adGroups.slice(0, 5).map(ag => ({
          name: ag.ad_group_name,
          campaign: ag.campaign_name,
          ctr: ag.ctr,
          conversions: ag.conversions
        }));
        console.log(`✅ Best ad groups: ${context.performanceData.bestPerformingAds.map(a => a.name).join(', ')}`);

      }

      // Get top performing search terms with REAL data
      const { data: searchTerms } = await supabase
        .from('search_terms')
        .select('search_term, conversions, clicks, cost_micros, impressions')
        .eq('tenant_id', tenant)
        .gt('clicks', 0)  // At least some clicks
        .order('clicks', { ascending: false })
        .limit(50);

      console.log(`📊 Search terms query returned ${searchTerms?.length || 0} results`);

      if (searchTerms && searchTerms.length > 0) {
        // Get the ACTUAL converting keywords
        context.topKeywords = searchTerms.slice(0, 10).map(st => st.search_term);
        console.log(`✅ Top keywords: ${context.topKeywords.slice(0, 5).join(', ')}...`);

        // Get high-conversion rate terms for quality signals
        const highConversionTerms = searchTerms
          .filter(st => {
            const convRate = st.clicks > 0 ? (st.conversions / st.clicks) * 100 : 0;
            return convRate > 5; // 5%+ conversion rate
          })
          .map(st => st.search_term);

        if (highConversionTerms.length > 0) {
          context.highValueKeywords = highConversionTerms;
        }

        // Calculate REAL performance metrics
        const totalImpressions = searchTerms.reduce((sum, st) => sum + (st.impressions || 0), 0);
        const totalClicks = searchTerms.reduce((sum, st) => sum + (st.clicks || 0), 0);
        const totalCostMicros = searchTerms.reduce((sum, st) => sum + (st.cost_micros || 0), 0);
        const totalConversions = searchTerms.reduce((sum, st) => sum + (st.conversions || 0), 0);

        if (totalImpressions > 0) {
          context.performanceData.avgCTR = ((totalClicks / totalImpressions) * 100).toFixed(2);
        }
        if (totalClicks > 0) {
          // Convert micros to dollars
          context.performanceData.avgCPC = (totalCostMicros / 1000000 / totalClicks).toFixed(2);
          context.performanceData.avgConversionRate = ((totalConversions / totalClicks) * 100).toFixed(2);
        }

        console.log(`📊 Performance data loaded: ${totalClicks} clicks, ${totalConversions} conversions, ${context.topKeywords.length} keywords`);
      }
    } catch (error) {
      console.warn("Could not load Supabase context:", error.message);
    }
  }

  // Wait for website analysis
  context.websiteAnalysis = await websitePromise;

  // Extract comprehensive website data
  if (context.websiteAnalysis) {
    context.websiteInfo = context.websiteAnalysis; // Keep backward compatibility

    if (context.websiteAnalysis.storeTitle) {
      context.businessName = context.websiteAnalysis.storeTitle.split(' - ')[0] || context.businessName;
    }

    // Extract products
    if (context.websiteAnalysis.products && context.websiteAnalysis.products.length > 0) {
      context.products = context.websiteAnalysis.products;
      console.log(`✅ Found ${context.products.length} products from website`);
    }

    // Extract USPs
    if (context.websiteAnalysis.usps && context.websiteAnalysis.usps.length > 0) {
      context.uniqueSellingPoints = context.websiteAnalysis.usps;
      console.log(`✅ Found ${context.uniqueSellingPoints.length} USPs from website`);
    }
  }

  // Get competitor intelligence (with timeout for Vercel)
  if (competitorIntel) {
    try {
      console.log('🕵️ Analyzing competitors...');

      // Add 10-second timeout for competitor analysis
      const competitorPromise = Promise.race([
        competitorIntel.identifyCompetitors(tenant, {
          industry: context.businessType,
          keywords: context.topKeywords.slice(0, 10),
          targetAudience: context.targetAudience
        }),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Competitor analysis timeout')), 10000)
        )
      ]);

      const competitors = await competitorPromise;

      if (competitors && competitors.length > 0) {
        // Analyze top 2 competitors only (for speed)
        const competitorAnalyses = await Promise.race([
          Promise.all(
            competitors.slice(0, 2).map(comp =>
              competitorIntel.analyzeLandingPage(tenant, comp).catch(err => {
                console.warn(`Failed to analyze ${comp.domain || comp.name}:`, err.message);
                return null;
              })
            )
          ),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Landing page analysis timeout')), 8000)
          )
        ]).catch(() => []);

        context.competitorInsights = {
          competitors: competitors.slice(0, 5),
          analyses: competitorAnalyses.filter(Boolean),
          totalFound: competitors.length
        };

        console.log(`✅ Analyzed ${competitorAnalyses.filter(Boolean).length} competitors`);
      }
    } catch (error) {
      console.warn('⚠️ Competitor analysis failed:', error.message);
    }
  }

  return context;
}

/**
 * Generate contextual themes based on REAL performance data
 */
function generateContextualThemes(context, limit) {
  const themes = [];
  const usedThemes = new Set();

  // 1. Use actual high-performing campaign names/themes
  if (context.topCampaigns && context.topCampaigns.length > 0) {
    context.topCampaigns.forEach(campaign => {
      // Extract meaningful part of campaign name
      const cleanName = campaign.replace(/campaign|search|shopping/gi, '').trim();
      if (cleanName && !usedThemes.has(cleanName.toLowerCase())) {
        themes.push(cleanName);
        usedThemes.add(cleanName.toLowerCase());
      }
    });
  }

  // 2. Use actual product categories from successful ads
  if (context.products && context.products.length > 0) {
    context.products.forEach(product => {
      if (!usedThemes.has(product.toLowerCase()) && themes.length < limit) {
        themes.push(product);
        usedThemes.add(product.toLowerCase());
      }
    });
  }

  // 3. Use high-converting keywords as themes
  if (context.highValueKeywords && context.highValueKeywords.length > 0 && themes.length < limit) {
    context.highValueKeywords.slice(0, limit - themes.length).forEach(keyword => {
      // Clean up keyword for use as theme
      const cleanKeyword = keyword
        .split(' ')
        .map(w => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ');
      if (!usedThemes.has(cleanKeyword.toLowerCase())) {
        themes.push(cleanKeyword);
        usedThemes.add(cleanKeyword.toLowerCase());
      }
    });
  }

  // 4. Extract themes from best performing ad groups
  if (context.performanceData.bestPerformingAds && themes.length < limit) {
    context.performanceData.bestPerformingAds.forEach(ad => {
      if (ad.name && !usedThemes.has(ad.name.toLowerCase()) && themes.length < limit) {
        themes.push(ad.name);
        usedThemes.add(ad.name.toLowerCase());
      }
    });
  }

  // 5. ONLY use generic themes if we have NO real data
  if (themes.length === 0) {
    console.warn('⚠️ No performance data available, using fallback themes');
    // At least try to be specific to the business
    themes.push(
      `${context.businessName} Sale`,
      `${context.businessName} Deals`,
      `Premium ${context.businessName}`,
      `${context.businessName} Offers`,
      `Shop ${context.businessName}`
    );
  }

  return themes.slice(0, limit);
}

/**
 * Simple inline AI writer that works in serverless
 */
export async function handleInlineAIWriter(tenant, limit = 5) {
  const results = [];
  const supabase = getSupabaseClient();

  // Log AI operation start
  let aiLogger;
  try {
    const { getAILoggerService } = await import("../services/ai-logger.js");
    aiLogger = getAILoggerService();
    if (aiLogger && typeof aiLogger.logAIOperation === 'function') {
      aiLogger.logAIOperation(tenant, 'ai_writer', 'info', `Starting AI writer for ${limit} themes`);
    }
  } catch (e) {
    console.warn("AI logger not available:", e.message);
  }

  try {
    // Initialize AI provider
    let ai;
    try {
      ai = await getAIProvider();
      console.log(`AI provider initialized: ${ai.provider}`);
      if (aiLogger && typeof aiLogger.logAIOperation === 'function') {
        aiLogger.logAIOperation(tenant, 'ai_writer', 'info', `AI provider: ${ai.provider}`);
      }
    } catch (error) {
      console.error("AI provider initialization failed:", error);
      if (aiLogger && typeof aiLogger.logAIOperation === 'function') {
        aiLogger.logAIOperation(tenant, 'ai_writer', 'error', `Provider init failed: ${error.message}`);
      }
      // Use fallback content
      return generateFallbackContent(tenant, limit);
    }

    // Get business context
    const context = await getBusinessContext(tenant, supabase);
    console.log(`Business context loaded: ${context.businessName}, type: ${context.businessType}`);

    // Generate contextual themes instead of generic "Theme 1", "Theme 2"
    const themes = generateContextualThemes(context, limit);

    // Try to get Google Sheets doc
    let doc, rsa;
    try {
      doc = await getDoc();
      if (doc) {
        rsa = await ensureSheet(doc, `RSA_ASSETS_DEFAULT_${tenant}`, [
          "headlines_pipe",
          "descriptions_pipe",
          "theme",
          "rationale",
          "source_url",
          "approval_status",
        ]);
      }
    } catch (error) {
      console.warn("Google Sheets unavailable:", error.message);
    }

    for (const theme of themes) {
      try {
        let headlines, descriptions;

        // Try AI generation with performance-driven prompt
        try {
          const prompt = `You are an expert Google Ads copywriter with access to COMPREHENSIVE MARKET INTELLIGENCE. Write HIGH-CONVERTING ad copy based on deep analysis.

🏪 BUSINESS INTELLIGENCE:
- Store: ${context.businessName}
- Theme: ${theme}
- Type: ${context.businessType}
${context.websiteInfo.storeDescription ? `- About: ${context.websiteInfo.storeDescription}` : ''}

${context.products.length > 0 ? `📦 PRODUCTS (from website):
${context.products.slice(0, 5).map(p => `  • ${p}`).join('\n')}` : ''}

${context.uniqueSellingPoints.length > 0 ? `💎 UNIQUE SELLING POINTS:
${context.uniqueSellingPoints.slice(0, 3).map(usp => `  • ${usp}`).join('\n')}` : ''}

${context.websiteAnalysis?.testimonials?.length > 0 ? `⭐ CUSTOMER TESTIMONIALS (use for social proof):
${context.websiteAnalysis.testimonials.slice(0, 2).map(t => `  • "${t.text?.substring(0, 80)}..."`).join('\n')}` : ''}

${context.websiteAnalysis?.offers?.length > 0 ? `🎁 ACTIVE OFFERS:
${context.websiteAnalysis.offers.slice(0, 3).map(o => `  • ${o}`).join('\n')}` : ''}

📊 ACTUAL PERFORMANCE DATA:
${context.topKeywords.length > 0 ? `✅ TOP CONVERTING KEYWORDS:
${context.topKeywords.slice(0, 7).map(kw => `  • "${kw}"`).join('\n')}` : ''}

${context.highValueKeywords?.length > 0 ? `🔥 HIGH-CONVERSION KEYWORDS (>5% conv rate):
${context.highValueKeywords.slice(0, 5).map(kw => `  • "${kw}"`).join('\n')}` : ''}

${context.performanceData.avgCTR > 0 ? `📈 CURRENT PERFORMANCE:
  • CTR: ${context.performanceData.avgCTR}% (must beat this)
  • CPC: $${context.performanceData.avgCPC}
  • Conv Rate: ${context.performanceData.avgConversionRate || 'N/A'}%` : ''}

${context.performanceData.bestPerformingAds?.length > 0 ? `🏆 BEST PERFORMING ADS:
${context.performanceData.bestPerformingAds.slice(0, 3).map(ad =>
  `  • ${ad.name}: ${ad.conversions} conversions, ${ad.ctr}% CTR`).join('\n')}` : ''}

${context.competitorInsights?.analyses?.length > 0 ? `🕵️ COMPETITOR INTELLIGENCE:
${context.competitorInsights.analyses.slice(0, 2).map((comp, i) =>
  `  Competitor ${i+1}:
    ${comp.adCopy?.length > 0 ? `• Ad Copy: "${comp.adCopy[0]?.substring(0, 50)}..."` : ''}
    ${comp.offers?.length > 0 ? `• Offers: ${comp.offers[0]}` : ''}
    ${comp.usps?.length > 0 ? `• USPs: ${comp.usps[0]}` : ''}`).join('\n')}

DIFFERENTIATION STRATEGY: Use our USPs and offers to OUTPERFORM competitors` : ''}

🎯 COPYWRITING STRATEGY:
1. Lead with the strongest USP or offer for "${theme}"
2. Use EXACT high-converting keywords naturally
3. Include social proof elements from testimonials
4. Create urgency with active offers
5. Differentiate from competitor messaging
6. Use power words: Save, Free, Now, Get, Best, Exclusive, Trusted
7. Match the brand voice from website analysis

📏 CHARACTER LIMITS (STRICT):
- Headlines: MAX 30 characters each
- Descriptions: MAX 90 characters each

🎨 OUTPUT:
Write 5 headlines and 2 descriptions optimized to BEAT ${context.performanceData.avgCTR || '2'}% CTR.
Focus on "${theme}" - make it compelling, data-driven, and differentiated from competitors.

Return ONLY valid JSON: {"headlines": [...], "descriptions": [...]}`;

          const response = await ai.generateText(prompt);

          // Try to parse response
          try {
            const parsed = JSON.parse(response);
            headlines = parsed.headlines || [];
            descriptions = parsed.descriptions || [];
          } catch {
            // If not JSON, use fallback
            headlines = [];
            descriptions = [];
          }
        } catch (aiError) {
          console.warn(`AI generation failed for ${theme}:`, aiError.message);
          headlines = [];
          descriptions = [];
        }

        // Use contextual fallback if AI failed
        if (headlines.length === 0 || descriptions.length === 0) {
          // Generate more relevant fallback content based on business type
          if (context.businessType === 'ecommerce') {
            headlines = [
              `${theme} - Shop Now`,
              `Best ${theme} Deals`,
              `${theme} Sale Today`,
              `Quality ${theme}`,
              `${theme} Free Ship`,
            ];
            descriptions = [
              `Shop ${theme} at ${context.businessName}. Fast shipping & easy returns.`,
              `Best ${theme} selection. Quality guaranteed. Shop now & save.`,
            ];
          } else if (context.businessType === 'saas') {
            headlines = [
              `${theme} Software`,
              `Try ${theme} Free`,
              `${theme} Solution`,
              `${theme} Platform`,
              `${theme} for Teams`,
            ];
            descriptions = [
              `${theme} by ${context.businessName}. Start free trial. No credit card.`,
              `Professional ${theme} solution. Trusted by thousands. Try free.`,
            ];
          } else {
            headlines = [
              `${theme} Services`,
              `${theme} Experts`,
              `Professional ${theme}`,
              `${theme} Solutions`,
              `Trusted ${theme}`,
            ];
            descriptions = [
              `${theme} services by ${context.businessName}. Get started today.`,
              `Expert ${theme} solutions. Professional service guaranteed.`,
            ];
          }
        }

        // Validate RSA
        const v = validateRSA(headlines, descriptions);

        // Prepare data for storage
        const rsaData = {
          tenant: tenant,  // Some tables have 'tenant' column
          tenant_id: tenant,  // Some tables have 'tenant_id' column - including both for compatibility
          asset_type: "rsa",  // Added required asset_type field
          asset_text: `${theme} - ${v.clipped.h[0]}`, // Added required asset_text field
          theme,
          headlines_pipe: v.clipped.h.join("|"),
          descriptions_pipe: v.clipped.d.join("|"),
          rationale: "ai_generated_inline",
          source_url: "",
          approval_status: "approved",
          active: true,  // Added active field for fetching
          created_at: new Date().toISOString()
        };

        let writtenToSupabase = false;
        let writtenToSheets = false;

        // Try to write to Supabase FIRST (primary storage)
        if (supabase) {
          try {
            const { data, error } = await supabase
              .from('rsa_assets')
              .insert(rsaData);

            if (error) {
              // Log more detailed error information
              console.error(`Failed to write to Supabase for theme "${theme}":`, {
                message: error.message,
                code: error.code,
                details: error.details,
                hint: error.hint
              });

              // Check for common issues
              if (error.message?.includes('Invalid API') || error.code === '401') {
                console.error('⚠️ Supabase API key issue - check SUPABASE_SERVICE_ROLE_KEY env variable');
              }
            } else {
              writtenToSupabase = true;
              console.log(`✅ Written to Supabase: ${theme}`);
            }
          } catch (error) {
            console.error(`Supabase write error for theme "${theme}":`, error.message);
          }
        } else {
          console.warn('⚠️ Supabase client not initialized - check SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
        }

        // Also write to Google Sheets (dual-write pattern for backup)
        if (rsa) {
          try {
            await rsa.addRow({
              headlines_pipe: v.clipped.h.join("|"),
              descriptions_pipe: v.clipped.d.join("|"),
              theme,
              rationale: "ai_generated_inline",
              source_url: "",
              approval_status: "approved",
            });
            writtenToSheets = true;
            console.log(`Written to Sheets: ${theme}`);
          } catch (error) {
            console.warn(`Failed to write to Sheets:`, error.message);
          }
        }

        const written = writtenToSupabase || writtenToSheets;

        results.push({
          theme,
          headlines: v.clipped.h,
          descriptions: v.clipped.d,
          written,
          writtenToSupabase,
          writtenToSheets,
          source: headlines[0]?.includes(theme) ? 'ai' : 'fallback'
        });

      } catch (error) {
        console.error(`Failed to process theme ${theme}:`, error);
        results.push({
          theme,
          error: error.message,
          headlines: [`${theme} Solutions`],
          descriptions: [`${theme} - professional services and solutions.`]
        });
      }
    }

    const supabaseWrites = results.filter(r => r.writtenToSupabase).length;
    const sheetWrites = results.filter(r => r.writtenToSheets).length;

    // Log completion
    if (aiLogger && typeof aiLogger.logAIOperation === 'function') {
      aiLogger.logAIOperation(tenant, 'ai_writer', 'success',
        `Generated ${results.length} themes, wrote ${supabaseWrites} to Supabase, ${sheetWrites} to Sheets`);
    }

    return {
      ok: true,
      success: true,
      results,
      wrote: results.filter(r => r.written).length,
      wroteToSupabase: supabaseWrites,
      wroteToSheets: sheetWrites,
      storage: supabaseWrites > 0 ? 'supabase_primary' : (sheetWrites > 0 ? 'sheets_only' : 'none'),
      provider: ai?.provider || 'fallback'
    };

  } catch (error) {
    console.error("Inline AI writer error:", error);
    return generateFallbackContent(tenant, limit);
  }
}

/**
 * Generate fallback content when AI is unavailable
 */
function generateFallbackContent(tenant, limit) {
  const themes = Array.from({ length: Math.max(1, Math.min(5, limit)) }).map(
    (_, i) => `Theme ${i + 1}`,
  );

  const results = themes.map(theme => ({
    theme,
    headlines: [
      `${theme} Solutions`,
      `Premium ${theme}`,
      `${theme} Services`,
      `${theme} Start Free`,
      `${theme} Trusted`,
    ],
    descriptions: [
      `${theme} - shop now with fast shipping and easy returns.`,
      `${theme} - compare options and find your best fit today.`,
    ],
    written: false,
    source: 'fallback'
  }));

  return {
    ok: true,
    success: true,
    results,
    wrote: 0,
    provider: 'fallback'
  };
}
