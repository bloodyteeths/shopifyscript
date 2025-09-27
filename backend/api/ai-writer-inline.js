/**
 * Inline AI Writer for Vercel Serverless
 * No child process spawning - runs directly in the function
 */

import { validateRSA } from "../lib/validators.js";
import { getDoc, ensureSheet } from "../sheets.js";
import { getAIProvider } from "../lib/aiProvider.js";
import { createClient } from "@supabase/supabase-js";
import tenantConfigService from "../services/tenant-config.js";

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
    const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 second timeout

    const response = await fetch(storeUrl, {
      headers: {
        'User-Agent': 'ProofKit AI Bot/1.0'
      },
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      const html = await response.text();

      // Extract basic info from HTML (simple parsing)
      const titleMatch = html.match(/<title>(.*?)<\/title>/i);
      const descMatch = html.match(/<meta\s+name=["']description["']\s+content=["'](.*?)["']/i);

      return {
        storeTitle: titleMatch ? titleMatch[1].substring(0, 100) : '', // Limit length
        storeDescription: descMatch ? descMatch[1].substring(0, 200) : '', // Limit length
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
    websiteInfo: {}
  };

  // Fetch website information in parallel with other data
  const websitePromise = fetchWebsiteContext(tenant);

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
      // Get product categories from existing RSA assets
      const { data: rsaAssets } = await supabase
        .from('rsa_assets')
        .select('theme, headlines_pipe')
        .eq('tenant_id', tenant)  // Changed from 'tenant' to 'tenant_id'
        .limit(20);

      if (rsaAssets && rsaAssets.length > 0) {
        const themes = [...new Set(rsaAssets.map(r => r.theme))];
        context.products = themes.filter(t => t && t !== 'Theme 1' && !t.startsWith('Theme '));

        // Also extract successful headlines for learning
        const headlines = rsaAssets
          .flatMap(r => r.headlines_pipe ? r.headlines_pipe.split('|') : [])
          .filter(h => h && h.length > 0);

        if (headlines.length > 0) {
          context.successfulHeadlines = headlines.slice(0, 10);
        }
      }

      // Get top performing search terms with metrics
      const { data: searchTerms } = await supabase
        .from('search_terms')
        .select('search_term, conversions, clicks, cost, impressions')
        .eq('tenant_id', tenant)  // Changed to tenant_id - adjust if search_terms uses 'tenant'
        .gt('conversions', 0)
        .order('conversions', { ascending: false })
        .limit(10);

      if (searchTerms && searchTerms.length > 0) {
        context.topKeywords = searchTerms.map(st => st.search_term);

        // Calculate average performance metrics
        const totalImpressions = searchTerms.reduce((sum, st) => sum + (st.impressions || 0), 0);
        const totalClicks = searchTerms.reduce((sum, st) => sum + (st.clicks || 0), 0);
        const totalCost = searchTerms.reduce((sum, st) => sum + (st.cost || 0), 0);

        if (totalImpressions > 0) {
          context.performanceData.avgCTR = ((totalClicks / totalImpressions) * 100).toFixed(2);
        }
        if (totalClicks > 0) {
          context.performanceData.avgCPC = (totalCost / totalClicks).toFixed(2);
        }
      }
    } catch (error) {
      console.warn("Could not load Supabase context:", error.message);
    }
  }

  // Wait for website info
  context.websiteInfo = await websitePromise;
  if (context.websiteInfo.storeTitle) {
    context.businessName = context.websiteInfo.storeTitle.split(' - ')[0] || context.businessName;
  }

  return context;
}

/**
 * Generate contextual themes based on business data
 */
function generateContextualThemes(context, limit) {
  const themes = [];

  // If we have actual products/themes, use those
  if (context.products && context.products.length > 0) {
    themes.push(...context.products.slice(0, limit));
  }

  // If we have top keywords, create themes from them
  if (context.topKeywords && context.topKeywords.length > 0 && themes.length < limit) {
    const keywordThemes = context.topKeywords
      .slice(0, limit - themes.length)
      .map(kw => kw.charAt(0).toUpperCase() + kw.slice(1));
    themes.push(...keywordThemes);
  }

  // If still not enough, generate based on business type
  while (themes.length < limit) {
    const genericThemes = {
      ecommerce: ['Best Sellers', 'New Arrivals', 'Special Offers', 'Premium Collection', 'Customer Favorites'],
      saas: ['Free Trial', 'Premium Features', 'Enterprise Solution', 'Starter Plan', 'Professional Tools'],
      service: ['Professional Service', 'Expert Consultation', 'Quick Solutions', 'Trusted Service', 'Quality Results'],
      general: [`${context.businessName} Products`, `${context.businessName} Services`, `${context.businessName} Solutions`]
    };

    const typeThemes = genericThemes[context.businessType] || genericThemes.general;
    themes.push(typeThemes[themes.length % typeThemes.length]);
  }

  return themes.slice(0, limit);
}

/**
 * Simple inline AI writer that works in serverless
 */
export async function handleInlineAIWriter(tenant, limit = 5) {
  const results = [];
  const supabase = getSupabaseClient();

  try {
    // Initialize AI provider
    let ai;
    try {
      ai = await getAIProvider();
      console.log(`AI provider initialized: ${ai.provider}`);
    } catch (error) {
      console.error("AI provider initialization failed:", error);
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

        // Try AI generation with rich contextual prompt
        try {
          const prompt = `Generate 5 Google Ads headlines (max 30 chars each) and 2 descriptions (max 90 chars each) for a ${context.businessType} business.

Business: ${context.businessName}
${context.websiteInfo.storeDescription ? `Store Description: ${context.websiteInfo.storeDescription}` : ''}
Product/Service: ${theme}
${context.targetAudience ? `Target Audience: ${context.targetAudience}` : ''}

${context.topKeywords.length > 0 ? `Top Converting Keywords: ${context.topKeywords.slice(0, 5).join(', ')}` : ''}
${context.performanceData.avgCTR > 0 ? `Average CTR: ${context.performanceData.avgCTR}%` : ''}
${context.performanceData.avgCPC > 0 ? `Average CPC: $${context.performanceData.avgCPC}` : ''}
${context.successfulHeadlines?.length > 0 ? `Past Successful Headlines: ${context.successfulHeadlines.slice(0, 3).join(', ')}` : ''}

Requirements:
- Headlines MUST be 30 characters or less (count carefully!)
- Descriptions MUST be 90 characters or less (count carefully!)
- Learn from the successful keywords and headlines if provided
- Include strong call-to-action
- Make it specific to ${theme}

Return ONLY valid JSON with "headlines" array (5 items) and "descriptions" array (2 items).`;

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
          tenant_id: tenant,  // Changed from 'tenant' to 'tenant_id' to match database column
          theme,
          headlines_pipe: v.clipped.h.join("|"),
          descriptions_pipe: v.clipped.d.join("|"),
          rationale: "ai_generated_inline",
          source_url: "",
          approval_status: "approved",
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

    return {
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
    success: true,
    results,
    wrote: 0,
    provider: 'fallback'
  };
}