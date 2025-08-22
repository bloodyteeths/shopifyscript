import express from "express";
import { verify } from "../utils/hmac.js";

const router = express.Router();

// In-memory session storage for now - should be replaced with your actual database
const sessionStore = new Map();

/**
 * Store Shopify session data
 * POST /api/sessions/store
 */
router.post("/sessions/store", async (req, res) => {
  try {
    const { tenant, sig } = req.query;
    const { sessionId, sessionData } = req.body;

    if (!tenant || !sig) {
      return res
        .status(400)
        .json({ ok: false, error: "Missing tenant or signature" });
    }

    if (!sessionId || !sessionData) {
      return res
        .status(400)
        .json({ ok: false, error: "Missing sessionId or sessionData" });
    }

    // Verify HMAC signature
    const payload = `POST:${tenant}:session_store:${Date.now()}`;
    if (!verify(payload.substring(0, payload.lastIndexOf(":")), sig)) {
      return res.status(401).json({ ok: false, error: "Invalid signature" });
    }

    // Store session data with tenant prefix
    const key = `${tenant}:${sessionId}`;
    sessionStore.set(key, {
      ...sessionData,
      storedAt: new Date().toISOString(),
      tenant,
    });

    console.log(
      `✅ Stored session for tenant: ${tenant}, sessionId: ${sessionId}`,
    );

    res.json({ ok: true, message: "Session stored successfully" });
  } catch (error) {
    console.error("Session store error:", error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

/**
 * Retrieve Shopify session data
 * GET /api/sessions/retrieve
 */
router.get("/sessions/retrieve", async (req, res) => {
  try {
    const { tenant, sig, sessionId } = req.query;

    if (!tenant || !sig) {
      return res
        .status(400)
        .json({ ok: false, error: "Missing tenant or signature" });
    }

    if (!sessionId) {
      return res.status(400).json({ ok: false, error: "Missing sessionId" });
    }

    // Verify HMAC signature
    const payload = `GET:${tenant}:session_retrieve`;
    if (!verify(payload, sig)) {
      return res.status(401).json({ ok: false, error: "Invalid signature" });
    }

    // Retrieve session data
    const key = `${tenant}:${sessionId}`;
    const sessionData = sessionStore.get(key);

    if (!sessionData) {
      return res.status(404).json({ ok: false, error: "Session not found" });
    }

    console.log(
      `✅ Retrieved session for tenant: ${tenant}, sessionId: ${sessionId}`,
    );

    res.json({ ok: true, sessionData });
  } catch (error) {
    console.error("Session retrieve error:", error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

/**
 * Delete Shopify session data
 * DELETE /api/sessions/delete
 */
router.delete("/sessions/delete", async (req, res) => {
  try {
    const { tenant, sig, sessionId } = req.query;

    if (!tenant || !sig) {
      return res
        .status(400)
        .json({ ok: false, error: "Missing tenant or signature" });
    }

    if (!sessionId) {
      return res.status(400).json({ ok: false, error: "Missing sessionId" });
    }

    // Verify HMAC signature
    const payload = `DELETE:${tenant}:session_delete`;
    if (!verify(payload, sig)) {
      return res.status(401).json({ ok: false, error: "Invalid signature" });
    }

    // Delete session data
    const key = `${tenant}:${sessionId}`;
    const existed = sessionStore.delete(key);

    console.log(
      `✅ Deleted session for tenant: ${tenant}, sessionId: ${sessionId}, existed: ${existed}`,
    );

    res.json({ ok: true, deleted: existed });
  } catch (error) {
    console.error("Session delete error:", error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

/**
 * List all sessions for a tenant (for debugging)
 * GET /api/sessions/list
 */
router.get("/sessions/list", async (req, res) => {
  try {
    const { tenant, sig } = req.query;

    if (!tenant || !sig) {
      return res
        .status(400)
        .json({ ok: false, error: "Missing tenant or signature" });
    }

    // Verify HMAC signature
    const payload = `GET:${tenant}:session_list`;
    if (!verify(payload, sig)) {
      return res.status(401).json({ ok: false, error: "Invalid signature" });
    }

    // Find all sessions for this tenant
    const tenantSessions = [];
    for (const [key, value] of sessionStore.entries()) {
      if (key.startsWith(`${tenant}:`)) {
        tenantSessions.push({
          sessionId: key.substring(tenant.length + 1),
          storedAt: value.storedAt,
          shop: value.shop,
          isOnline: value.isOnline,
        });
      }
    }

    console.log(
      `✅ Listed ${tenantSessions.length} sessions for tenant: ${tenant}`,
    );

    res.json({ ok: true, sessions: tenantSessions });
  } catch (error) {
    console.error("Session list error:", error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

export default router;
