import { Session, SessionStorage } from "@shopify/shopify-app-session-storage";
import { backendFetch } from "../server/hmac.server";
import { getServerShopName } from "./shop-config";

/**
 * Custom session storage that persists Shopify sessions to backend database
 * This solves the authentication persistence issue in serverless environments
 */
export class BackendSessionStorage implements SessionStorage {
  private getTenantId(): string {
    return getServerShopName() || "default";
  }

  async storeSession(session: Session): Promise<boolean> {
    try {
      const tenantId = this.getTenantId();
      
      console.log(`💾 Storing session ${session.id} for tenant: ${tenantId}`);
      
      const { status, json } = await backendFetch(
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
        tenantId
      );

      if (status === 200 && json?.ok) {
        console.log(`✅ Session stored successfully for ${tenantId}`);
        return true;
      } else {
        console.error(`❌ Failed to store session: ${json?.error || 'Unknown error'}`);
        return false;
      }
    } catch (error) {
      console.error("Backend session store error:", error);
      return false;
    }
  }

  async loadSession(id: string): Promise<Session | undefined> {
    try {
      const tenantId = this.getTenantId();
      
      console.log(`🔍 Loading session ${id} for tenant: ${tenantId}`);
      
      const { status, json } = await backendFetch(
        `/sessions/retrieve?sessionId=${encodeURIComponent(id)}`,
        "GET",
        undefined,
        tenantId
      );

      if (status === 200 && json?.ok && json?.sessionData) {
        const sessionData = json.sessionData;
        console.log(`✅ Session loaded successfully for ${tenantId}`);
        
        // Create Session object from stored data
        const session = new Session({
          id: sessionData.id,
          shop: sessionData.shop,
          state: sessionData.state,
          isOnline: sessionData.isOnline || false
        });

        // Set additional properties
        session.scope = sessionData.scope;
        session.expires = sessionData.expires;
        session.accessToken = sessionData.accessToken;
        session.userId = sessionData.userId;
        session.firstName = sessionData.firstName;
        session.lastName = sessionData.lastName;
        session.email = sessionData.email;
        session.accountOwner = sessionData.accountOwner;
        session.locale = sessionData.locale;
        session.collaborator = sessionData.collaborator;
        session.emailVerified = sessionData.emailVerified;

        return session;
      } else if (status === 404) {
        console.log(`🔍 Session ${id} not found for ${tenantId}`);
        return undefined;
      } else {
        console.error(`❌ Failed to load session: ${json?.error || 'Unknown error'}`);
        return undefined;
      }
    } catch (error) {
      console.error("Backend session load error:", error);
      return undefined;
    }
  }

  async deleteSession(id: string): Promise<boolean> {
    try {
      const tenantId = this.getTenantId();
      
      console.log(`🗑️ Deleting session ${id} for tenant: ${tenantId}`);
      
      const { status, json } = await backendFetch(
        `/sessions/delete?sessionId=${encodeURIComponent(id)}`,
        "DELETE",
        undefined,
        tenantId
      );

      if (status === 200 && json?.ok) {
        console.log(`✅ Session deleted successfully for ${tenantId}`);
        return json.deleted || false;
      } else {
        console.error(`❌ Failed to delete session: ${json?.error || 'Unknown error'}`);
        return false;
      }
    } catch (error) {
      console.error("Backend session delete error:", error);
      return false;
    }
  }

  async deleteSessions(ids: string[]): Promise<boolean> {
    try {
      let allDeleted = true;
      
      // Delete sessions one by one (could be optimized with batch endpoint)
      for (const id of ids) {
        const deleted = await this.deleteSession(id);
        if (!deleted) {
          allDeleted = false;
        }
      }
      
      return allDeleted;
    } catch (error) {
      console.error("Backend batch session delete error:", error);
      return false;
    }
  }

  async findSessionsByShop(shop: string): Promise<Session[]> {
    try {
      const tenantId = shop.replace(".myshopify.com", "");
      
      console.log(`🔍 Finding sessions for shop: ${shop} (tenant: ${tenantId})`);
      
      const { status, json } = await backendFetch(
        "/sessions/list",
        "GET",
        undefined,
        tenantId
      );

      if (status === 200 && json?.ok && json?.sessions) {
        const sessions: Session[] = [];
        
        for (const sessionInfo of json.sessions) {
          const session = await this.loadSession(sessionInfo.sessionId);
          if (session && session.shop === shop) {
            sessions.push(session);
          }
        }
        
        console.log(`✅ Found ${sessions.length} sessions for shop: ${shop}`);
        return sessions;
      } else {
        console.error(`❌ Failed to find sessions: ${json?.error || 'Unknown error'}`);
        return [];
      }
    } catch (error) {
      console.error("Backend find sessions error:", error);
      return [];
    }
  }
}