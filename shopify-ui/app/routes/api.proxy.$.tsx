import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import crypto from "crypto";

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

    // Get tenant from headers or use default
    const tenant = request.headers.get("X-Tenant-ID") || process.env.TENANT_ID || "proofkit";

    // Backend configuration
    const backendUrl = process.env.BACKEND_PUBLIC_URL || "http://localhost:3005/api";
    const hmacSecret = process.env.HMAC_SECRET || "f3a1c9d8b2e47a65c0fb19d7e3a9428c6de5b1a7c4f08923ab56d7e1c2f3a4b5";

    // Generate HMAC for authentication
    const timestamp = Date.now();
    const payload = JSON.stringify({ tenant, timestamp });
    const hmac = crypto.createHmac("sha256", hmacSecret).update(payload).digest("hex");

    // Build backend URL
    const url = `${backendUrl}/${proxyPath}`;

    // Copy query parameters if any
    const requestUrl = new URL(request.url);
    const queryString = requestUrl.search;
    const fullUrl = url + queryString;

    // Prepare headers for backend request
    const headers: HeadersInit = {
      "X-HMAC-Signature": hmac,
      "X-Tenant-ID": tenant,
      "X-Timestamp": timestamp.toString(),
      "Content-Type": "application/json"
    };

    // Get request body if it's not a GET request
    let body: string | undefined;
    if (method !== "GET" && method !== "HEAD") {
      try {
        body = await request.text();
      } catch (e) {
        // No body or unable to read body
      }
    }

    // Make the request to backend
    const backendResponse = await fetch(fullUrl, {
      method,
      headers,
      ...(body ? { body } : {})
    });

    // Get response from backend
    const responseData = await backendResponse.text();

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