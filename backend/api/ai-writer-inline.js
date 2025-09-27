/**
 * Inline AI Writer for Vercel Serverless
 * No child process spawning - runs directly in the function
 */

import { validateRSA } from "../lib/validators.js";
import { getDoc, ensureSheet } from "../sheets.js";
import { getAIProvider } from "../lib/aiProvider.js";
import { createClient } from "@supabase/supabase-js";

/**
 * Get Supabase client
 */
function getSupabaseClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY;

  if (!url || !key) {
    console.warn("Supabase not configured - using Google Sheets only");
    return null;
  }

  return createClient(url, key);
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

    // Generate themes
    const themes = Array.from({ length: Math.max(1, Math.min(5, limit)) }).map(
      (_, i) => `Theme ${i + 1}`,
    );

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

        // Try AI generation with simple prompt
        try {
          const prompt = `Generate 5 Google Ads headlines (max 30 chars each) and 2 descriptions (max 90 chars each) for: ${theme}. Return as JSON with "headlines" and "descriptions" arrays.`;

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

        // Use fallback if AI failed
        if (headlines.length === 0 || descriptions.length === 0) {
          headlines = [
            `${theme} Solutions`,
            `Premium ${theme}`,
            `${theme} Services`,
            `${theme} Start Free`,
            `${theme} Trusted`,
          ];
          descriptions = [
            `${theme} - shop now with fast shipping and easy returns.`,
            `${theme} - compare options and find your best fit today.`,
          ];
        }

        // Validate RSA
        const v = validateRSA(headlines, descriptions);

        // Prepare data for storage
        const rsaData = {
          tenant,
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
              console.warn(`Failed to write to Supabase:`, error.message);
            } else {
              writtenToSupabase = true;
              console.log(`Written to Supabase: ${theme}`);
            }
          } catch (error) {
            console.warn(`Supabase write error:`, error.message);
          }
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