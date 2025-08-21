#!/usr/bin/env node

/**
 * ProofKit Backend - PROMOTE Gate Middleware
 *
 * Critical production safety middleware that enforces PROMOTE=TRUE
 * before allowing any mutations that could affect live Google Ads accounts.
 *
 * This middleware provides the final safety net for all backend endpoints
 * that could trigger mutations in production advertising accounts.
 */

import { readConfigFromSheets } from "../sheets.js";
import logger from "../services/logger.js";

/**
 * PROMOTE gate validation middleware
 * Blocks mutations when PROMOTE=FALSE for production safety
 */
export function promoteGateMiddleware() {
  return async (req, res, next) => {
    try {
      // Extract tenant from request
      const tenant = req.query.tenant || req.body.tenant;

      if (!tenant) {
        logger.warn("PROMOTE Gate: No tenant specified", {
          method: req.method,
          path: req.path,
        });
        return res.status(400).json({
          ok: false,
          code: "PROMOTE_GATE_ERROR",
          error: "Tenant required for PROMOTE gate validation",
        });
      }

      // Get configuration for tenant
      const config = await readConfigFromSheets(String(tenant));

      if (!config) {
        logger.error("PROMOTE Gate: Could not load config", {
          tenant,
          method: req.method,
          path: req.path,
        });
        return res.status(500).json({
          ok: false,
          code: "PROMOTE_GATE_CONFIG_ERROR",
          error: "Could not load tenant configuration",
        });
      }

      // Check PROMOTE flag
      const promoteEnabled =
        config.PROMOTE === true ||
        String(config.PROMOTE).toLowerCase() === "true";

      if (!promoteEnabled) {
        logger.warn("PROMOTE Gate: BLOCKED - PROMOTE=FALSE", {
          tenant,
          method: req.method,
          path: req.path,
          promote: config.PROMOTE,
          userAgent: req.get("User-Agent"),
        });

        return res.status(403).json({
          ok: false,
          code: "PROMOTE_GATE_BLOCKED",
          error: "PROMOTE gate active - Live mutations blocked for safety",
          message:
            "To enable live changes, set PROMOTE=TRUE in tenant configuration",
          promote: config.PROMOTE,
          timestamp: new Date().toISOString(),
        });
      }

      // PROMOTE gate passed - log and continue
      logger.info("PROMOTE Gate: PASSED", {
        tenant,
        method: req.method,
        path: req.path,
        promote: config.PROMOTE,
      });

      // Attach config to request for downstream use
      req.promoteConfig = config;
      req.promoteValidated = true;

      next();
    } catch (error) {
      logger.error("PROMOTE Gate: Validation error", {
        error: error.message,
        stack: error.stack,
        method: req.method,
        path: req.path,
      });

      return res.status(500).json({
        ok: false,
        code: "PROMOTE_GATE_ERROR",
        error: "PROMOTE gate validation failed",
        message: error.message,
      });
    }
  };
}

/**
 * PROMOTE gate validation for specific mutation types
 * Provides granular control over different types of mutations
 */
export function promoteGateForMutation(mutationType) {
  return async (req, res, next) => {
    try {
      const tenant = req.query.tenant || req.body.tenant;

      if (!tenant) {
        return res.status(400).json({
          ok: false,
          code: "PROMOTE_GATE_ERROR",
          error: "Tenant required for mutation validation",
        });
      }

      const config = await readConfigFromSheets(String(tenant));

      if (!config) {
        return res.status(500).json({
          ok: false,
          code: "PROMOTE_GATE_CONFIG_ERROR",
          error: "Could not load tenant configuration",
        });
      }

      // Check PROMOTE flag
      const promoteEnabled =
        config.PROMOTE === true ||
        String(config.PROMOTE).toLowerCase() === "true";

      // Additional checks for specific mutation types
      let blocked = false;
      let reason = "";

      if (!promoteEnabled) {
        blocked = true;
        reason = "PROMOTE=FALSE";
      }

      // Mutation-specific safety checks
      if (mutationType === "NEGATIVE_KEYWORDS") {
        const reservedTerms = ["proofkit", "brand", "competitor"];
        const terms = req.body.terms || [];

        for (const term of terms) {
          const termLower = String(term).toLowerCase();
          if (reservedTerms.some((reserved) => termLower.includes(reserved))) {
            blocked = true;
            reason = `Reserved keyword protection: ${term}`;
            break;
          }
        }
      }

      if (mutationType === "BUDGET_CHANGES") {
        const changes = req.body.changes || [];
        const maxBudgetIncrease = 10.0; // 10x increase limit

        for (const change of changes) {
          const oldAmount = Number(change.oldAmount || 0);
          const newAmount = Number(change.newAmount || 0);

          if (newAmount > oldAmount * maxBudgetIncrease) {
            blocked = true;
            reason = `Budget increase too large: ${oldAmount} → ${newAmount}`;
            break;
          }
        }
      }

      if (blocked) {
        logger.warn("PROMOTE Gate: MUTATION BLOCKED", {
          tenant,
          mutationType,
          reason,
          method: req.method,
          path: req.path,
        });

        return res.status(403).json({
          ok: false,
          code: "PROMOTE_GATE_MUTATION_BLOCKED",
          error: `${mutationType} mutation blocked for safety`,
          reason: reason,
          promote: config.PROMOTE,
          timestamp: new Date().toISOString(),
        });
      }

      logger.info("PROMOTE Gate: MUTATION APPROVED", {
        tenant,
        mutationType,
        method: req.method,
        path: req.path,
      });

      req.promoteConfig = config;
      req.promoteValidated = true;
      req.mutationType = mutationType;

      next();
    } catch (error) {
      logger.error("PROMOTE Gate: Mutation validation error", {
        error: error.message,
        mutationType,
        method: req.method,
        path: req.path,
      });

      return res.status(500).json({
        ok: false,
        code: "PROMOTE_GATE_ERROR",
        error: "Mutation validation failed",
        message: error.message,
      });
    }
  };
}

/**
 * Get PROMOTE gate status for a tenant
 * Used for health checks and status reporting
 */
export async function getPromoteGateStatus(tenant) {
  try {
    const config = await readConfigFromSheets(String(tenant));

    if (!config) {
      return {
        ok: false,
        error: "Could not load configuration",
        promote: null,
        timestamp: new Date().toISOString(),
      };
    }

    const promoteEnabled =
      config.PROMOTE === true ||
      String(config.PROMOTE).toLowerCase() === "true";

    return {
      ok: true,
      promote: promoteEnabled,
      promoteRaw: config.PROMOTE,
      label: config.label || "PROOFKIT_AUTOMATED",
      enabled: config.enabled,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    logger.error("PROMOTE Gate: Status check error", {
      error: error.message,
      tenant,
    });

    return {
      ok: false,
      error: error.message,
      promote: null,
      timestamp: new Date().toISOString(),
    };
  }
}

/**
 * PROMOTE gate bypass for specific operations
 * ONLY use for read-only operations or emergency procedures
 */
export function promoteGateBypass(reason) {
  return (req, res, next) => {
    logger.warn("PROMOTE Gate: BYPASSED", {
      reason,
      method: req.method,
      path: req.path,
      userAgent: req.get("User-Agent"),
    });

    req.promoteValidated = true;
    req.promoteBypass = reason;

    next();
  };
}

export default {
  promoteGateMiddleware,
  promoteGateForMutation,
  getPromoteGateStatus,
  promoteGateBypass,
};
