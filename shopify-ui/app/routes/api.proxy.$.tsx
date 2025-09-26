import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import crypto from "crypto";
import { authenticate } from "../shopify.server";

/**
 * Generic API proxy route for backend calls
 * Handles HMAC authentication and forwards requests to backend
 */

export async function loader({ request, params }: LoaderFunctionArgs) {
  return handleProxyRequest(request, params, "GET");
}

export async function action({ request, params }: ActionFunctionArgs) {
  const method = request.method;
  return handleProxyRequest(request, params, method);
}

async function handleProxyRequest(
  request: Request,
  params: any,
  method: string
) {
  try {
    // Get the path from the wildcard parameter
    const proxyPath = params["*"] || "";

    // Try to get shop name from Shopify session first
    let tenant = request.headers.get("X-Tenant-ID");

    if (!tenant) {
      try {
        // Attempt to get shop from Shopify session
        const { session } = await authenticate.admin(request);
        if (session?.shop) {
          tenant = session.shop.replace(".myshopify.com", "");
        }
      } catch (e) {
        // Not authenticated or no session, fall back to header/env
      }
    }

    // Fall back to environment variable or default
    if (!tenant) {
      tenant = process.env.TENANT_ID || "proofkit";
    }

    // Backend configuration from environment (required for multi-tenant)
    // In production, use the actual backend URL
    const backendUrl = process.env.BACKEND_PUBLIC_URL ||
                      (process.env.NODE_ENV === "production" ? "https://ads-autopilot-backend.vercel.app/api" : "http://localhost:3005/api");

    // HMAC secret must be set in production
    const hmacSecret = process.env.HMAC_SECRET ||
                      (process.env.NODE_ENV === "production" ? "" : "f3a1c9d8b2e47a65c0fb19d7e3a9428c6de5b1a7c4f08923ab56d7e1c2f3a4b5");

    if (!hmacSecret && process.env.NODE_ENV === "production") {
      console.error("HMAC_SECRET not set in production!");
      return json({ ok: false, error: "Configuration error" }, { status: 500 });
    }

    // Log configuration in development
    if (process.env.NODE_ENV !== "production") {
      console.log("Proxy config:", { tenant, backendUrl, proxyPath });
    }


    // Generate HMAC for authentication (matching backend's base64 format)
    const timestamp = Date.now();
    const payload = JSON.stringify({ tenant, timestamp });
    const hmac = crypto.createHmac("sha256", hmacSecret)
      .update(payload)
      .digest("base64")
      .replace(/=+$/, ""); // Remove trailing equals like backend does

    // Get request body early for ai_writer special handling
    let body: string | undefined;
    let parsedBody: any = {};
    if (method !== "GET" && method !== "HEAD") {
      try {
        body = await request.text();
        if (body) {
          parsedBody = JSON.parse(body);
        }
      } catch (e) {
        // No body or unable to read/parse body
      }
    }

    // Special handling for endpoints that need sig in query params
    let fullUrl;
    let headers: HeadersInit;

    // Check if this is an AI endpoint that needs query param authentication
    const needsQueryAuth = proxyPath === "jobs/ai_writer" || proxyPath.startsWith("ai/");

    if (needsQueryAuth) {
      let aiPayload;
      let sig;

      if (proxyPath === "jobs/ai_writer") {
        // ai_writer needs special nonce-based payload
        const nonce = parsedBody.nonce || Date.now();
        aiPayload = `POST:${tenant}:ai_writer:${nonce}`;

        // Include the nonce in the body if not already present
        if (!parsedBody.nonce) {
          parsedBody.nonce = nonce;
        }
      } else if (proxyPath === "ai/drafts") {
        // ai/drafts uses simple payload format
        aiPayload = `GET:${tenant}:ai_drafts`;
      } else {
        // Other AI endpoints - construct payload based on path
        const pathParts = proxyPath.split('/');
        const endpoint = pathParts[pathParts.length - 1];
        aiPayload = `${method}:${tenant}:${endpoint}`;
      }

      // Generate signature for the specific payload
      sig = crypto.createHmac("sha256", hmacSecret)
        .update(aiPayload)
        .digest("base64")
        .replace(/=+$/, "");

      // Build URL with sig and tenant in query params
      const requestUrl = new URL(request.url);
      const queryParams = new URLSearchParams(requestUrl.search);
      queryParams.set("tenant", tenant);
      queryParams.set("sig", sig);

      fullUrl = `${backendUrl}/${proxyPath}?${queryParams.toString()}`;

      // These endpoints only use query param auth, no headers needed
      headers = {
        "Content-Type": "application/json"
      };

      // Log for debugging
      if (process.env.NODE_ENV !== "production") {
        console.log(`AI endpoint request (${proxyPath}):`, {
          url: fullUrl,
          tenant,
          payload: aiPayload,
          sig
        });
      }
    } else {
      // Build backend URL normally
      const url = `${backendUrl}/${proxyPath}`;
      // Copy query parameters if any
      const requestUrl = new URL(request.url);
      const queryString = requestUrl.search;
      fullUrl = url + queryString;

      // Prepare headers for backend request (normal HMAC auth)
      headers = {
        "X-HMAC-Signature": hmac,
        "X-Tenant-ID": tenant,
        "X-Timestamp": timestamp.toString(),
        "Content-Type": "application/json"
      };
    }

    // Make the request to backend
    const backendResponse = await fetch(fullUrl, {
      method,
      headers,
      ...(body ? { body: JSON.stringify(parsedBody) } : {})
    });

    // Get response from backend
    const responseData = await backendResponse.text();

    // Log response for debugging
    if (!backendResponse.ok) {
      console.error(`Backend error (${backendResponse.status}):`, responseData);
    }

    // Try to parse as JSON
    let jsonResponse;
    try {
      jsonResponse = JSON.parse(responseData);
    } catch (e) {
      // Not JSON, return as text
      return new Response(responseData, {
        status: backendResponse.status,
        headers: {
          "Content-Type": "text/plain"
        }
      });
    }

    // Return JSON response
    return json(jsonResponse, {
      status: backendResponse.status,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-cache"
      }
    });

  } catch (error) {
    console.error("Proxy error:", error);

    // Return error response
    return json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Proxy request failed"
      },
      {
        status: 500,
        headers: {
          "Content-Type": "application/json"
        }
      }
    );
  }
}