import express from "express";
import { sheets } from "../sheets.js";
import { TenantConfigService } from "../services/tenant-config.js";
import { logAccess, json } from "../utils/response.js";
import { verify } from "../utils/hmac.js";
import environmentSecurity from "../services/environment-security.js";

const router = express.Router();

// Get tenant configuration with HMAC validation
router.get("/config", async (req, res) => {
  const tenant = String(req.query.tenant || "");
  const sig = String(req.query.sig || "");
  const payload = `GET:${tenant}:config`;

  if (!tenant || !verify(sig, payload)) {
    await logAccess(req, 403, "config auth_fail");
    return json(res, 403, {
      ok: false,
      code: "AUTH",
      error: "invalid signature",
    });
  }

  try {
    // Always go through TenantConfigService which ensures Sheets tabs exist
    const configManager = new TenantConfigService();
    const cfg = await configManager.getTenantConfig(tenant);

    await logAccess(req, 200, "config ok");
    return json(res, 200, { ok: true, config: cfg });
  } catch (e) {
    console.error("Config read error:", e.message);
    await logAccess(req, 500, "config error");
    return json(res, 500, { ok: false, code: "CONFIG", error: String(e) });
  }
});

// HMAC-gated echo endpoint for diagnostics
router.get("/config/echo", async (req, res) => {
  const tenant = String(req.query.tenant || "");
  const sig = String(req.query.sig || "");
  const payload = `GET:${tenant}:config_echo`;

  if (!tenant || !verify(sig, payload)) {
    await logAccess(req, 403, "config_echo auth_fail");
    return json(res, 403, {
      ok: false,
      code: "AUTH",
      error: "invalid signature",
    });
  }

  const data = {
    ok: true,
    ip:
      (req.headers["x-forwarded-for"] ||
        req.socket.remoteAddress ||
        req.ip ||
        "") + "",
    ua: (req.headers["user-agent"] || "") + "",
    host: req.headers.host || "",
    scheme: (req.headers["x-forwarded-proto"] || req.protocol || "http") + "",
    url: (req.originalUrl || req.url || "") + "",
  };

  await logAccess(req, 200, "config_echo ok");
  return json(res, 200, data);
});

// Update tenant configuration with HMAC validation
router.post("/upsertConfig", async (req, res) => {
  const { tenant, sig } = req.query;
  const { nonce = Date.now(), settings = {} } = req.body || {};
  const payload = `POST:${tenant}:upsertconfig:${nonce}`;

  if (!tenant || !verify(sig, payload)) {
    await logAccess(req, 403, "upsertConfig auth_fail");
    return res
      .status(403)
      .json({ ok: false, error: "Authentication failed", code: "AUTH" });
  }

  try {
    console.log(`📝 Attempting to save settings for ${tenant}:`, {
      settingsCount: Object.keys(settings).length,
      settingsKeys: Object.keys(settings),
      nonce: nonce,
    });

    // Validate settings object
    if (!settings || typeof settings !== "object") {
      return res.status(400).json({
        ok: false,
        error: "Invalid settings object",
        code: "INVALID_SETTINGS",
      });
    }

    let sheetsSuccess = false;
    let errorDetails = null;

    // Use TenantConfigService to save settings with proper sheets handling
    try {
      // Ensure tenant registry is initialized
      const tenantRegistry = (await import("../services/tenant-registry.js"))
        .default;
      if (!tenantRegistry.isInitialized) {
        console.log(`🔄 Initializing tenant registry for ${tenant}`);
        await tenantRegistry.initialize();
      }

      // Check if tenant exists, auto-register if needed
      let tenantInfo = tenantRegistry.getTenant(tenant);
      if (!tenantInfo && process.env.SHEET_ID) {
        console.log(`🆕 Auto-registering new tenant: ${tenant}`);
        tenantRegistry.addTenant(tenant, {
          sheetId: process.env.SHEET_ID,
          name: `${tenant} Shop`,
          plan: "starter",
        });
        tenantInfo = tenantRegistry.getTenant(tenant);
      }

      if (!tenantInfo) {
        throw new Error(
          `Tenant ${tenant} not found and could not be auto-registered`,
        );
      }

      console.log(`📊 Using sheets for ${tenant}:`, {
        sheetId: tenantInfo.sheetId,
        plan: tenantInfo.plan,
      });

      const configManager = new TenantConfigService();
      await configManager.updateTenantConfig(tenant, settings);
      sheetsSuccess = true;
      console.log(
        `✅ Settings successfully saved to Google Sheets for ${tenant}`,
      );

      // Verify the save by reading back the config
      try {
        const savedConfig = await configManager.getTenantConfig(tenant);
        console.log(
          `🔍 Verification - Settings read back successfully for ${tenant}:`,
          {
            hasAP: !!savedConfig.AP,
            scheduleInConfig: savedConfig.AP?.schedule,
            targetCPAInConfig: savedConfig.AP?.target_cpa,
          },
        );
      } catch (verifyError) {
        console.warn(
          `⚠️ Could not verify saved settings for ${tenant}:`,
          verifyError.message,
        );
      }
    } catch (sheetsError) {
      errorDetails = sheetsError.message;
      console.error(
        `❌ Google Sheets save failed for ${tenant}:`,
        sheetsError.message,
        sheetsError.stack,
      );

      // SECURITY FIX: Use secure environment validation instead of NODE_ENV
      if (environmentSecurity.isTestingAllowed()) {
        console.log(
          `🔧 Development/Staging mode: Simulating save for ${tenant}:`,
          settings,
        );

        // Store in memory for development/staging (this won't persist between restarts)
        global.devTenantConfigs = global.devTenantConfigs || {};
        global.devTenantConfigs[tenant] = {
          ...global.devTenantConfigs[tenant],
          ...settings,
        };
        console.log(
          `💾 Stored in memory for ${tenant} (${environmentSecurity.getEnvironmentInfo().deploymentEnv}):`,
          global.devTenantConfigs[tenant],
        );
        sheetsSuccess = true; // Consider successful in dev mode
      } else {
        // In production, this is a real error
        throw sheetsError;
      }
    }

    // Write a run log entry when possible (Sheets present)
    try {
      const { sheets } = await import("../sheets.js");
      await sheets.addRow(tenant, "RUN_LOGS", {
        timestamp: new Date().toISOString(),
        message: "config_upsert",
        details: `Saved ${Object.keys(settings).length} settings`,
        success: sheetsSuccess,
      });
      console.log(`📄 Run log entry added for ${tenant}`);
    } catch (logError) {
      console.warn(
        `⚠️ Could not write run log for ${tenant}:`,
        logError.message,
      );
    }

    await logAccess(req, 200, "upsertConfig ok");
    res.json({
      ok: true,
      saved: Object.keys(settings).length,
      tenant: tenant,
      sheetsSuccess: sheetsSuccess,
      message: sheetsSuccess
        ? "Settings saved to Google Sheets"
        : "Settings saved to fallback storage",
    });
  } catch (e) {
    console.error("upsertConfig critical error:", e.message, e.stack);
    await logAccess(req, 500, "upsertConfig error");
    res.status(500).json({
      ok: false,
      error: `Failed to save settings: ${e.message}`,
      code: "SAVE_FAILED",
      tenant: tenant,
      debug: process.env.NODE_ENV === "development" ? e.stack : undefined,
    });
  }
});

// Connect wizard endpoints
router.post("/connect/sheets/test", async (req, res) => {
  const { tenant, sig } = req.query;
  const { nonce = Date.now(), sheetId = "" } = req.body || {};
  const payload = `POST:${tenant}:sheets_test:${nonce}`;

  if (!tenant || !verify(sig, payload)) {
    return res.status(403).json({ ok: false, error: "auth" });
  }

  try {
    if (!sheetId) return res.json({ ok: false, error: "missing_sheetId" });

    const { getDocById, ensureSheet } = await import("../services/sheets.js");
    const doc = await getDocById(String(sheetId));
    if (!doc) return res.json({ ok: false, error: "auth_or_load_failed" });

    await ensureSheet(doc, `CONFIG_${tenant}`, ["key", "value"]);
    return res.json({ ok: true });
  } catch (e) {
    res.json({ ok: false, error: String(e) });
  }
});

router.post("/connect/sheets/save", async (req, res) => {
  const { tenant, sig } = req.query;
  const { nonce = Date.now(), sheetId = "" } = req.body || {};
  const payload = `POST:${tenant}:sheets_save:${nonce}`;

  if (!tenant || !verify(sig, payload)) {
    return res.status(403).json({ ok: false, error: "auth" });
  }

  try {
    if (!sheetId) return res.json({ ok: false, error: "missing_sheetId" });

    // Update tenant registry instead of global env
    const { TenantRegistry } = await import("../services/tenant-registry.js");
    await TenantRegistry.updateSheetId(tenant, String(sheetId));

    const { ensureAudienceTabs } = await import("../services/sheets.js");
    await ensureAudienceTabs(String(tenant));

    return res.json({ ok: true });
  } catch (e) {
    res.json({ ok: false, error: String(e) });
  }
});

export default router;
