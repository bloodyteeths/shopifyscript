/**
 * Emergency Control Endpoints
 * Provides immediate kill switches and safety controls for production
 */

import express from "express";
import { json, logAccess } from "../utils/response.js";
import { verify } from "../utils/hmac.js";

const router = express.Router();

// Emergency state tracking (in-memory for immediate response)
let emergencyState = {
  globalPromoteDisabled: false,
  billingDisabled: false,
  maintenanceMode: false,
  scriptExecutionBlocked: false,
  lastUpdated: null,
  reason: null,
  updatedBy: null
};

/**
 * Get current emergency status
 * No authentication required for monitoring purposes
 */
router.get("/status", (req, res) => {
  logAccess(req, "emergency_status_check");
  
  res.json({
    ok: true,
    emergency: emergencyState,
    environment: {
      globalPromoteGate: process.env.GLOBAL_PROMOTE_GATE,
      billingEnforcementActive: process.env.BILLING_ENFORCEMENT_ACTIVE,
      supabaseEnabled: process.env.SUPABASE_ENABLED
    },
    timestamp: new Date().toISOString()
  });
});

/**
 * CRITICAL: Disable all PROMOTE operations globally
 * This immediately stops all Google Ads Script mutations
 */
router.post("/disable-promote", async (req, res) => {
  try {
    const { tenant, sig, reason, emergency_key } = req.body;
    
    // For emergency operations, allow either HMAC auth OR emergency key
    const payload = `POST:${tenant}:disable_promote`;
    const isHmacValid = tenant && verify(sig, payload);
    const isEmergencyKeyValid = emergency_key === process.env.EMERGENCY_ACCESS_KEY;
    
    if (!isHmacValid && !isEmergencyKeyValid) {
      return res.status(403).json({ 
        ok: false, 
        error: "auth_required",
        message: "HMAC signature or emergency key required" 
      });
    }

    emergencyState.globalPromoteDisabled = true;
    emergencyState.lastUpdated = new Date().toISOString();
    emergencyState.reason = reason || "Emergency promote disable";
    emergencyState.updatedBy = tenant || "emergency_key";

    // Log critical action
    console.error("🚨 EMERGENCY: Global PROMOTE disabled", {
      reason,
      updatedBy: emergencyState.updatedBy,
      timestamp: emergencyState.lastUpdated
    });

    logAccess(req, "emergency_promote_disabled", { 
      reason, 
      globalState: emergencyState 
    });

    res.json({
      ok: true,
      action: "global_promote_disabled",
      message: "All script mutations immediately disabled",
      state: emergencyState
    });

  } catch (error) {
    console.error("Emergency disable-promote failed:", error);
    res.status(500).json({
      ok: false,
      error: "emergency_action_failed"
    });
  }
});

/**
 * Re-enable PROMOTE operations (with confirmation)
 */
router.post("/enable-promote", async (req, res) => {
  try {
    const { tenant, sig, confirmation, reason } = req.body;
    const payload = `POST:${tenant}:enable_promote`;
    
    if (!tenant || !verify(sig, payload)) {
      return res.status(403).json({ ok: false, error: "auth" });
    }

    if (confirmation !== "ENABLE_SCRIPT_MUTATIONS") {
      return res.status(400).json({
        ok: false,
        error: "confirmation_required",
        message: "Must provide confirmation: 'ENABLE_SCRIPT_MUTATIONS'"
      });
    }

    emergencyState.globalPromoteDisabled = false;
    emergencyState.lastUpdated = new Date().toISOString();
    emergencyState.reason = reason || "Re-enabled after emergency";
    emergencyState.updatedBy = tenant;

    console.log("✅ Global PROMOTE re-enabled", {
      reason,
      updatedBy: tenant,
      timestamp: emergencyState.lastUpdated
    });

    logAccess(req, "emergency_promote_enabled", { 
      reason,
      globalState: emergencyState 
    });

    res.json({
      ok: true,
      action: "global_promote_enabled", 
      message: "Script mutations re-enabled",
      state: emergencyState
    });

  } catch (error) {
    console.error("Emergency enable-promote failed:", error);
    res.status(500).json({
      ok: false,
      error: "emergency_action_failed"
    });
  }
});

/**
 * Disable billing enforcement (for emergency access)
 */
router.post("/disable-billing", async (req, res) => {
  try {
    const { tenant, sig, reason, emergency_key } = req.body;
    const payload = `POST:${tenant}:disable_billing`;
    
    const isHmacValid = tenant && verify(sig, payload);
    const isEmergencyKeyValid = emergency_key === process.env.EMERGENCY_ACCESS_KEY;
    
    if (!isHmacValid && !isEmergencyKeyValid) {
      return res.status(403).json({ ok: false, error: "auth" });
    }

    emergencyState.billingDisabled = true;
    emergencyState.lastUpdated = new Date().toISOString();
    emergencyState.reason = reason || "Emergency billing disable";
    emergencyState.updatedBy = tenant || "emergency_key";

    console.error("🚨 EMERGENCY: Billing enforcement disabled", {
      reason,
      updatedBy: emergencyState.updatedBy
    });

    res.json({
      ok: true,
      action: "billing_disabled",
      message: "Billing enforcement temporarily disabled",
      state: emergencyState
    });

  } catch (error) {
    console.error("Emergency disable-billing failed:", error);
    res.status(500).json({
      ok: false,
      error: "emergency_action_failed"
    });
  }
});

/**
 * Enable maintenance mode (blocks most operations)
 */
router.post("/maintenance-mode", async (req, res) => {
  try {
    const { tenant, sig, enable, reason } = req.body;
    const payload = `POST:${tenant}:maintenance_mode`;
    
    if (!tenant || !verify(sig, payload)) {
      return res.status(403).json({ ok: false, error: "auth" });
    }

    emergencyState.maintenanceMode = enable === true;
    emergencyState.lastUpdated = new Date().toISOString();
    emergencyState.reason = reason || `Maintenance mode ${enable ? 'enabled' : 'disabled'}`;
    emergencyState.updatedBy = tenant;

    const action = enable ? "enabled" : "disabled";
    console.log(`🔧 Maintenance mode ${action}`, {
      reason,
      updatedBy: tenant
    });

    res.json({
      ok: true,
      action: `maintenance_mode_${action}`,
      message: `Maintenance mode ${action}`,
      state: emergencyState
    });

  } catch (error) {
    console.error("Maintenance mode toggle failed:", error);
    res.status(500).json({
      ok: false,
      error: "emergency_action_failed"
    });
  }
});

/**
 * Complete system reset (clears all emergency states)
 */
router.post("/reset-all", async (req, res) => {
  try {
    const { tenant, sig, confirmation } = req.body;
    const payload = `POST:${tenant}:reset_all`;
    
    if (!tenant || !verify(sig, payload)) {
      return res.status(403).json({ ok: false, error: "auth" });
    }

    if (confirmation !== "RESET_ALL_EMERGENCY_STATES") {
      return res.status(400).json({
        ok: false,
        error: "confirmation_required",
        message: "Must provide confirmation: 'RESET_ALL_EMERGENCY_STATES'"
      });
    }

    const previousState = { ...emergencyState };
    
    emergencyState = {
      globalPromoteDisabled: false,
      billingDisabled: false,
      maintenanceMode: false,
      scriptExecutionBlocked: false,
      lastUpdated: new Date().toISOString(),
      reason: "Complete emergency reset",
      updatedBy: tenant
    };

    console.log("🔄 Emergency states reset", {
      previousState,
      newState: emergencyState,
      updatedBy: tenant
    });

    res.json({
      ok: true,
      action: "emergency_reset_complete",
      message: "All emergency states cleared",
      previousState,
      currentState: emergencyState
    });

  } catch (error) {
    console.error("Emergency reset failed:", error);
    res.status(500).json({
      ok: false,
      error: "emergency_action_failed"
    });
  }
});

/**
 * Health check that includes emergency state
 */
router.get("/health", (req, res) => {
  const isHealthy = !emergencyState.globalPromoteDisabled && 
                    !emergencyState.maintenanceMode &&
                    !emergencyState.scriptExecutionBlocked;

  res.status(isHealthy ? 200 : 503).json({
    ok: isHealthy,
    status: isHealthy ? "healthy" : "degraded",
    emergency: emergencyState,
    checks: {
      promoteOperational: !emergencyState.globalPromoteDisabled,
      billingOperational: !emergencyState.billingDisabled,
      maintenanceMode: emergencyState.maintenanceMode,
      scriptExecutionAllowed: !emergencyState.scriptExecutionBlocked
    },
    timestamp: new Date().toISOString()
  });
});

/**
 * Middleware to check emergency states
 * Used by other routes to respect emergency controls
 */
export function checkEmergencyState(req, res, next) {
  // Check maintenance mode
  if (emergencyState.maintenanceMode) {
    return res.status(503).json({
      ok: false,
      error: "maintenance_mode",
      message: "System is currently in maintenance mode",
      emergency: emergencyState
    });
  }

  // Check if billing is emergency-disabled
  if (emergencyState.billingDisabled && req.path.includes('/billing/')) {
    console.log("⚠️ Billing operation bypassed due to emergency disable");
  }

  // Add emergency state to request for downstream use
  req.emergencyState = emergencyState;
  next();
}

/**
 * Check if PROMOTE operations should be blocked
 */
export function checkPromoteGate(req, res, next) {
  const globalGateFromEnv = process.env.GLOBAL_PROMOTE_GATE === "false";
  const emergencyDisabled = emergencyState.globalPromoteDisabled;
  
  if (globalGateFromEnv || emergencyDisabled) {
    const reason = emergencyDisabled ? "Emergency disable" : "Environment gate";
    
    return res.json({
      ok: true,
      promote_blocked: true,
      reason: reason,
      message: "All script mutations blocked for safety",
      emergency_state: emergencyState,
      env_gate: globalGateFromEnv
    });
  }
  
  next();
}

export default router;