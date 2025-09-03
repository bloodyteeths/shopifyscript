/**
 * Supabase Test Endpoint
 * Tests connection and data operations
 */

import express from "express";
import { json } from "../utils/response.js";
import { verify } from "../utils/hmac.js";
import { supabase, isSupabaseEnabled, testSupabaseConnection } from "../services/supabase-client.js";

const router = express.Router();

// GET /api/supabase/test - Test Supabase connection
router.get("/test", async (req, res) => {
  const { tenant, sig } = req.query;
  const payload = `GET:${tenant}:supabase_test`;

  if (!tenant || !verify(sig, payload)) {
    return res.status(403).json({ ok: false, error: "auth" });
  }

  try {
    const enabled = isSupabaseEnabled();
    const connection = await testSupabaseConnection();
    
    const result = {
      ok: true,
      supabase_enabled: enabled,
      connection_test: connection,
      environment: {
        SUPABASE_URL: process.env.SUPABASE_URL ? '✅ Set' : '❌ Missing',
        SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ? '✅ Set' : '❌ Missing',
        SUPABASE_ENABLED: process.env.SUPABASE_ENABLED
      }
    };

    if (enabled && connection.connected) {
      // Test writing data
      try {
        const { data, error } = await supabase
          .from('tenant_configs')
          .upsert({
            tenant_id: tenant,
            config_key: 'test_connection',
            config_value: { 
              test: true, 
              timestamp: new Date().toISOString(),
              status: 'connection_verified'
            }
          });

        if (error) {
          result.write_test = { success: false, error: error.message };
        } else {
          result.write_test = { success: true, message: 'Data write successful' };
        }
      } catch (writeError) {
        result.write_test = { success: false, error: writeError.message };
      }
    }

    res.json(result);
    
  } catch (error) {
    res.status(500).json({
      ok: false,
      error: error.message,
      supabase_enabled: isSupabaseEnabled()
    });
  }
});

// GET /api/supabase/tables - List created tables
router.get("/tables", async (req, res) => {
  const { tenant, sig } = req.query;
  const payload = `GET:${tenant}:supabase_tables`;

  if (!tenant || !verify(sig, payload)) {
    return res.status(403).json({ ok: false, error: "auth" });
  }

  try {
    if (!supabase) {
      return res.json({
        ok: false,
        error: "Supabase not configured",
        enabled: isSupabaseEnabled()
      });
    }

    // Check each table
    const tables = [
      'tenant_configs',
      'tenant_metrics', 
      'search_terms',
      'run_logs',
      'tenant_subscriptions',
      'campaign_configs',
      'rsa_assets'
    ];
    
    const tableStatus = {};
    
    for (const table of tables) {
      try {
        const { data, error } = await supabase
          .from(table)
          .select('count')
          .limit(1);
          
        tableStatus[table] = {
          exists: !error,
          error: error?.message || null
        };
      } catch (err) {
        tableStatus[table] = {
          exists: false,
          error: err.message
        };
      }
    }

    res.json({
      ok: true,
      supabase_enabled: isSupabaseEnabled(),
      tables: tableStatus,
      summary: {
        total: tables.length,
        created: Object.values(tableStatus).filter(t => t.exists).length,
        failed: Object.values(tableStatus).filter(t => !t.exists).length
      }
    });
    
  } catch (error) {
    res.status(500).json({
      ok: false,
      error: error.message
    });
  }
});

export default router;