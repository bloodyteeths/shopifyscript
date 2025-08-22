import { authenticate, extractShopFromRequest } from "../shopify.server";
import { backendFetch } from "../server/hmac.server";

/**
 * Enhanced authentication helper that checks backend database first
 * This reduces OAuth redirects and improves navigation reliability
 */
export async function getAuthenticatedShop(request: Request): Promise<{
  shopName: string;
  session?: any;
  fromCache?: boolean;
}> {
  // First, try to extract shop from request parameters
  const shopFromRequest = extractShopFromRequest(request);
  
  if (shopFromRequest) {
    // Check if we have a valid session in backend for this shop
    console.log(`🔍 Checking backend for existing session for shop: ${shopFromRequest}`);
    
    try {
      const { status, json } = await backendFetch(
        "/sessions/list",
        "GET",
        undefined,
        shopFromRequest
      );
      
      if (status === 200 && json?.ok && json?.sessions?.length > 0) {
        // Found existing session in backend
        const latestSession = json.sessions[0]; // Use most recent session
        console.log(`✅ Found existing session in backend for shop: ${shopFromRequest}`);
        
        return {
          shopName: shopFromRequest,
          session: latestSession,
          fromCache: true
        };
      }
    } catch (error) {
      console.log(`⚠️ Backend session check failed, proceeding with Shopify auth:`, error.message);
    }
  }

  // No cached session found, authenticate with Shopify
  console.log(`🔐 Authenticating with Shopify for shop: ${shopFromRequest || 'unknown'}`);
  
  try {
    const auth = await authenticate.admin(request);
    
    if (auth instanceof Response) {
      // Redirect response from Shopify auth
      throw new Error("Shopify authentication redirect required");
    }
    
    const { session } = auth as any;
    const shopName = session?.shop?.replace(".myshopify.com", "") || shopFromRequest;
    
    if (!shopName) {
      throw new Error("Unable to determine shop name from Shopify session");
    }
    
    // Store session in backend for future use
    if (session) {
      console.log(`💾 Storing new session in backend for shop: ${shopName}`);
      
      try {
        await backendFetch(
          "/sessions/store",
          "POST",
          {
            sessionId: session.id,
            sessionData: {
              id: session.id,
              shop: session.shop,
              state: session.state,
              isOnline: session.isOnline,
              scope: session.scope,
              expires: session.expires,
              accessToken: session.accessToken,
              userId: session.userId,
              firstName: session.firstName,
              lastName: session.lastName,
              email: session.email,
              accountOwner: session.accountOwner,
              locale: session.locale,
              collaborator: session.collaborator,
              emailVerified: session.emailVerified
            },
            nonce: Date.now()
          },
          shopName
        );
        
        console.log(`✅ Session cached in backend for future requests`);
      } catch (backendError) {
        console.warn(`⚠️ Failed to cache session in backend:`, backendError.message);
        // Continue anyway - we have the session from Shopify
      }
    }
    
    return {
      shopName,
      session,
      fromCache: false
    };
    
  } catch (authError) {
    console.error(`❌ Shopify authentication failed:`, authError.message);
    throw authError;
  }
}

/**
 * Clear cached session for a shop (for logout or session invalidation)
 */
export async function clearShopSession(shopName: string): Promise<void> {
  try {
    console.log(`🗑️ Clearing cached sessions for shop: ${shopName}`);
    
    const { status, json } = await backendFetch(
      "/sessions/list",
      "GET",
      undefined,
      shopName
    );
    
    if (status === 200 && json?.ok && json?.sessions?.length > 0) {
      // Delete all sessions for this shop
      for (const sessionInfo of json.sessions) {
        await backendFetch(
          `/sessions/delete?sessionId=${encodeURIComponent(sessionInfo.sessionId)}`,
          "DELETE",
          undefined,
          shopName
        );
      }
      
      console.log(`✅ Cleared ${json.sessions.length} cached sessions for shop: ${shopName}`);
    }
  } catch (error) {
    console.warn(`⚠️ Failed to clear cached sessions:`, error.message);
  }
}