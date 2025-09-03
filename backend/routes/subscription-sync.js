/**
 * Subscription Sync Endpoints
 * Syncs subscription data from Shopify to Supabase
 */

import express from "express";
import { json } from "../utils/response.js";
import { verify } from "../utils/hmac.js";
import { supabase, isSupabaseEnabled } from "../services/supabase-client.js";

const router = express.Router();

// POST /api/subscription/sync - Sync subscription from Shopify to Supabase
router.post("/sync", async (req, res) => {
  const { tenant, sig } = req.query;
  const { 
    subscriptionId, 
    tier, 
    status, 
    shopDomain,
    currentPeriodStart,
    currentPeriodEnd,
    trialEndsAt 
  } = req.body || {};
  
  const payload = `POST:${tenant}:subscription_sync`;

  if (!tenant || !verify(sig, payload)) {
    return res.status(403).json({ ok: false, error: "auth" });
  }

  try {
    if (!isSupabaseEnabled()) {
      return res.json({
        ok: true,
        message: "Supabase not enabled, subscription sync skipped",
        supabase_enabled: false
      });
    }

    if (!supabase) {
      return res.status(500).json({
        ok: false,
        error: "Supabase client not initialized"
      });
    }

    // Upsert subscription data to Supabase
    const subscriptionData = {
      tenant_id: tenant,
      shop_domain: shopDomain,
      subscription_id: subscriptionId,
      tier: tier || 'starter',
      status: status || 'active',
      current_period_start: currentPeriodStart ? new Date(currentPeriodStart) : new Date(),
      current_period_end: currentPeriodEnd ? new Date(currentPeriodEnd) : null,
      trial_ends_at: trialEndsAt ? new Date(trialEndsAt) : null,
      updated_at: new Date()
    };

    console.log(`💾 Syncing subscription to Supabase for ${tenant}:`, subscriptionData);

    const { data, error } = await supabase
      .from('tenant_subscriptions')
      .upsert(subscriptionData, { onConflict: 'tenant_id' });

    if (error) {
      console.error(`❌ Subscription sync failed for ${tenant}:`, error);
      return res.status(500).json({
        ok: false,
        error: `Supabase sync failed: ${error.message}`
      });
    }

    console.log(`✅ Subscription synced to Supabase for ${tenant}`);

    res.json({
      ok: true,
      message: "Subscription synced successfully",
      tenant,
      tier,
      status
    });

  } catch (error) {
    console.error("Subscription sync error:", error);
    res.status(500).json({
      ok: false,
      error: error.message
    });
  }
});

// GET /api/subscription/status - Get subscription status from Supabase
router.get("/status", async (req, res) => {
  const { tenant, sig } = req.query;
  const payload = `GET:${tenant}:subscription_status`;

  if (!tenant || !verify(sig, payload)) {
    return res.status(403).json({ ok: false, error: "auth" });
  }

  try {
    if (!isSupabaseEnabled() || !supabase) {
      return res.json({
        ok: true,
        subscription: null,
        source: "supabase_disabled"
      });
    }

    const { data, error } = await supabase
      .from('tenant_subscriptions')
      .select('*')
      .eq('tenant_id', tenant)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
      return res.status(500).json({
        ok: false,
        error: error.message
      });
    }

    res.json({
      ok: true,
      subscription: data || null,
      source: "supabase",
      found: !!data
    });

  } catch (error) {
    res.status(500).json({
      ok: false,
      error: error.message
    });
  }
});

export default router;