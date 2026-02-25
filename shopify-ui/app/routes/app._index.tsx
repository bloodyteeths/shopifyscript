import React, { useState } from "react";
import type { LoaderFunctionArgs } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { useLoaderData, Link } from "@remix-run/react";
import { authenticate } from "../shopify.server";
import { checkTenantSetup } from "../utils/tenant.server";
import { useShopContext, buildAppUrl } from "../utils/navigation";
import { checkSubscriptionStatus, shouldRedirectToPlans, getPlanSelectionUrl, type SubscriptionInfo } from "../utils/subscription.server";
import { SkeletonCard, Toast } from "../components/LoadingStates";
import { AIStatusIndicator } from "../components/AIStatusIndicator";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  try {
    // Standard Shopify authentication following best practices
    const { session, admin } = await authenticate.admin(request);

    const shopName = session?.shop?.replace(".myshopify.com", "");

    if (!shopName) {
      throw new Error("Unable to determine shop name from Shopify session");
    }

    console.log(`Dashboard loaded for shop: ${shopName}`);

    // Check for post-subscription redirect parameters
    const url = new URL(request.url);
    const chargeId = url.searchParams.get('charge_id');
    const isPostSubscription = !!chargeId;
    
    if (isPostSubscription) {
      console.log(`Post-subscription redirect detected for ${shopName}, charge_id: ${chargeId}`);
    }

    // Check subscription status for feature access control (with error handling)
    let subscriptionInfo: SubscriptionInfo = {
      hasActivePayment: false,
      isInTrial: false,
      trialDaysRemaining: null,
      subscriptionTier: null,
      subscriptionStatus: 'checking',
      subscriptionId: null,
      currentPeriodEnd: null,
      needsSubscription: true
    };

    try {
      subscriptionInfo = await checkSubscriptionStatus(admin);

      console.log(`Subscription check for ${shopName}:`, {
        hasActivePayment: subscriptionInfo.hasActivePayment,
        isInTrial: subscriptionInfo.isInTrial,
        tier: subscriptionInfo.subscriptionTier,
        needsSubscription: subscriptionInfo.needsSubscription,
        isPostSubscription
      });

      // Sync tier with backend for rate limiting
      if (session?.accessToken && shopName) {
        try {
          const backendUrl = process.env.BACKEND_PUBLIC_URL || 'http://localhost:3005/api';
          const syncResponse = await fetch(`${backendUrl}/billing/shopify/sync-tier`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Tenant-ID': shopName
            },
            body: JSON.stringify({
              shop: session.shop,
              accessToken: session.accessToken
            })
          });

          if (syncResponse.ok) {
            const tierData = await syncResponse.json();
            if (process.env.NODE_ENV !== 'production') {
              console.log(`✅ Tier synced with backend for ${shopName}:`, tierData.tier);
            }
          } else {
            console.warn(`Failed to sync tier for ${shopName}:`, syncResponse.status);
          }
        } catch (tierSyncError) {
          console.error(`Tier sync error for ${shopName}:`, tierSyncError);
          // Non-blocking - continue even if tier sync fails
        }
      }

      // CRITICAL: Don't redirect if just returned from subscription selection
      if (subscriptionInfo.needsSubscription && !isPostSubscription) {
        console.log(`Redirecting ${shopName} to plan selection - no subscription found`);
        // Only redirect if NOT coming back from subscription
      } else if (isPostSubscription) {
        console.log(`Post-subscription: Allowing app access for ${shopName} (subscription may be processing)`);
      }

    } catch (subscriptionError) {
      console.error('Subscription check failed, allowing app access:', subscriptionError);
      // Allow app access if subscription check fails to prevent installation crashes
    }

    const appHandle = process.env.SHOPIFY_APP_HANDLE || "adsautopilot-autopilot";
    const planSelectionUrl = `https://admin.shopify.com/store/${shopName}/charges/${appHandle}/pricing_plans`;

    return json({
      message: "AI-powered Google Ads optimization on autopilot",
      timestamp: new Date().toISOString(),
      shopName: shopName,
      subscriptionInfo,
      planSelectionUrl
    });
    
  } catch (authError) {
    console.error("App index authentication error:", authError);
    console.error("Request URL:", request.url);
    
    // Redirect to auth with shop context if possible
    const url = new URL(request.url);
    const shop = url.searchParams.get('shop') || url.searchParams.get('host');
    const authUrl = shop ? `/auth/login?shop=${shop}` : '/auth/login';
    
    throw new Response(null, {
      status: 302,
      headers: { Location: authUrl }
    });
  }
};

export default function AppIndex() {
  const { message, timestamp, shopName, subscriptionInfo, planSelectionUrl } = useLoaderData<typeof loader>();
  const shopContext = useShopContext();
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [toast, setToast] = useState<{message: string; type: 'success' | 'error' | 'warning' | 'info'; visible: boolean}>({
    message: '',
    type: 'success',
    visible: false
  });

  // Simulate initial loading state
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setIsInitialLoad(false);
      if (subscriptionInfo?.hasActivePayment || subscriptionInfo?.isInTrial) {
        setToast({
          message: `Welcome back! Your ${subscriptionInfo.subscriptionTier?.toUpperCase()} plan is active.`,
          type: 'success',
          visible: true
        });
      }
    }, 800);
    return () => clearTimeout(timer);
  }, [subscriptionInfo]);

  // Show subscription prompt inline instead of broken redirect loop
  // Users can navigate to billing via the nav link or the inline CTA

  const renderSubscriptionBanner = () => {
    if (!subscriptionInfo) return null;

    // Only show banner for trial and active subscriptions (not for needsSubscription since they get redirected)
    if (subscriptionInfo.isInTrial) {
      return (
        <div style={{
          background: "#fff3cd",
          border: "1px solid #ffc107",
          borderRadius: "8px",
          padding: "16px",
          marginBottom: "24px",
        }}>
          <h3 style={{ margin: "0 0 8px 0", fontSize: "16px", color: "#856404" }}>
            Free Trial Active - {subscriptionInfo.subscriptionTier?.toUpperCase()} Plan
          </h3>
          <p style={{ margin: "0", fontSize: "14px", color: "#856404" }}>
            {subscriptionInfo.trialDaysRemaining} days remaining in your trial
          </p>
        </div>
      );
    }

    if (subscriptionInfo.hasActivePayment) {
      return (
        <div style={{
          background: "#d1eddd",
          border: "1px solid #28a745",
          borderRadius: "8px", 
          padding: "16px",
          marginBottom: "24px",
        }}>
          <h3 style={{ margin: "0 0 8px 0", fontSize: "16px", color: "#155724" }}>
            {subscriptionInfo.subscriptionTier?.toUpperCase()} Plan Active
          </h3>
          <p style={{ margin: "0", fontSize: "14px", color: "#155724" }}>
            Full access to all features
          </p>
        </div>
      );
    }

    // Show subscription CTA for users without a plan
    if (subscriptionInfo.needsSubscription) {
      return (
        <div style={{
          background: "#fff3cd",
          border: "1px solid #ffc107",
          borderRadius: "8px",
          padding: "24px",
          marginBottom: "24px",
          textAlign: "center",
        }}>
          <h3 style={{ margin: "0 0 12px 0", fontSize: "20px", color: "#856404" }}>
            Start Your 14-Day Free Trial
          </h3>
          <p style={{ margin: "0 0 16px 0", fontSize: "16px", color: "#856404" }}>
            Get AI-powered Google Ads optimization for your store. No credit card required to start.
          </p>
          <a
            href={planSelectionUrl}
            target="_top"
            style={{
              background: "#28a745",
              color: "white",
              padding: "14px 32px",
              textDecoration: "none",
              borderRadius: "8px",
              display: "inline-block",
              fontSize: "18px",
              fontWeight: "bold",
              boxShadow: "0 2px 8px rgba(40, 167, 69, 0.3)",
            }}
          >
            Choose a Plan
          </a>
        </div>
      );
    }

    return null;
  };

  const renderDataRetentionInfo = () => {
    if (!subscriptionInfo?.subscriptionTier) return null;
    
    const tier = subscriptionInfo.subscriptionTier.toLowerCase();
    const retentionDays = tier === 'starter' ? 7 : tier === 'professional' ? 30 : 90;
    const upgradeMessage = tier === 'starter' ? 'Upgrade to Professional for 30-day retention' : tier === 'professional' ? 'Upgrade to Enterprise for 90-day retention' : null;
    
    return (
      <div style={{
        background: tier === 'starter' ? "#fff3cd" : tier === 'professional' ? "#e7f3ff" : "#f8f9fa",
        border: tier === 'starter' ? "1px solid #ffc107" : tier === 'professional' ? "1px solid #007bff" : "1px solid #dee2e6",
        borderRadius: "8px",
        padding: "16px",
        marginBottom: "24px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
      }}>
        <div>
          <h4 style={{ margin: "0 0 4px 0", fontSize: "16px", color: tier === 'starter' ? "#856404" : tier === 'professional' ? "#004085" : "#495057" }}>
            Data Retention: {retentionDays} days
          </h4>
          <p style={{ margin: "0", fontSize: "14px", color: tier === 'starter' ? "#856404" : tier === 'professional' ? "#004085" : "#6c757d" }}>
            Your {tier.toUpperCase()} plan shows data from the last {retentionDays} days. Older data is automatically filtered.
          </p>
        </div>
        {upgradeMessage && (
          <a
            href={planSelectionUrl}
            target="_top"
            style={{
              background: "#007bff",
              color: "white",
              padding: "10px 16px",
              textDecoration: "none",
              borderRadius: "6px",
              fontSize: "14px",
              fontWeight: "bold",
              whiteSpace: "nowrap",
            }}
          >
            {upgradeMessage}
          </a>
        )}
      </div>
    );
  };

  return (
    <div style={{ padding: "2rem" }}>
      {renderSubscriptionBanner()}
      {renderDataRetentionInfo()}
      
      <div
        style={{
          background: "#e7f3ff",
          border: "1px solid #b3d7ff",
          borderRadius: "8px",
          padding: "16px",
          marginBottom: "24px",
          display: "flex",
          alignItems: "center",
          gap: "12px",
        }}
      >
        <div style={{ 
          width: "24px",
          height: "24px",
          background: "#007bff",
          borderRadius: "4px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "white",
          fontSize: "12px",
          fontWeight: "bold"
        }}>✓</div>
        <div>
          <h3 style={{ margin: "0", fontSize: "16px", color: "#0066cc" }}>
            Connected to {shopName}.myshopify.com
          </h3>
          <p style={{ margin: "4px 0 0 0", fontSize: "14px", color: "#666" }}>
            Your shop is automatically detected and configured
          </p>
        </div>
      </div>

      <h1>Ads Autopilot AI Dashboard</h1>
      <p>{message}</p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
          gap: "1rem",
          marginTop: "2rem",
        }}
      >
        {isInitialLoad ? (
          // Show skeleton loading states
          <>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </>
        ) : (
          // Show actual content
          <>
            <div
              style={{
                border: "1px solid #ddd",
                borderRadius: "8px",
                padding: "1.5rem",
                background: "#f8f9fa",
                transition: "transform 0.2s ease, box-shadow 0.2s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-2px)";
                e.currentTarget.style.boxShadow = "0 4px 12px rgba(0, 0, 0, 0.1)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "none";
              }}
            >
              <h3>Autopilot</h3>
              <p>Automated campaign management and optimization</p>
              <Link
                to={buildAppUrl("/app/autopilot", shopContext)}
                style={{
                  background: "#007bff",
                  color: "white",
                  padding: "12px 24px",
                  textDecoration: "none",
                  borderRadius: "6px",
                  display: "inline-block",
                  fontSize: "16px",
                  fontWeight: "bold",
                  boxShadow: "0 2px 8px rgba(0, 123, 255, 0.3)",
                  transition: "all 0.2s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-1px)";
                  e.currentTarget.style.boxShadow = "0 4px 12px rgba(0, 123, 255, 0.4)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = "0 2px 8px rgba(0, 123, 255, 0.3)";
                }}
              >
                Open Autopilot
              </Link>
            </div>

        <div
          style={{
            border: "1px solid #ddd",
            borderRadius: "8px",
            padding: "1.5rem",
            background: "#f8f9fa",
          }}
        >
          <h3>Advanced</h3>
          <p>Advanced settings and configuration</p>
          <Link
            to="/app/advanced"
            style={{
              background: "#6c757d",
              color: "white",
              padding: "12px 24px",
              textDecoration: "none",
              borderRadius: "6px",
              display: "inline-block",
              fontSize: "16px",
              fontWeight: "bold",
              boxShadow: "0 2px 8px rgba(108, 117, 125, 0.3)",
              transition: "all 0.2s ease",
            }}
          >
            Advanced Settings
          </Link>
        </div>

        <div
          style={{
            border: "1px solid #28a745",
            borderRadius: "8px",
            padding: "1.5rem",
            background: "#f8fff9",
            position: "relative",
          }}
        >
          <div style={{ position: "absolute", top: "8px", right: "8px" }}>
            <AIStatusIndicator shopName={shopName} compact={true} />
          </div>
          <h3>AI Dashboard</h3>
          <p>Manage AI-generated content and monitor automation</p>
          <Link
            to="/app/ai-dashboard"
            style={{
              background: "#28a745",
              color: "white",
              padding: "12px 24px",
              textDecoration: "none",
              borderRadius: "6px",
              display: "inline-block",
              fontSize: "16px",
              fontWeight: "bold",
              boxShadow: "0 2px 8px rgba(40, 167, 69, 0.3)",
              transition: "all 0.2s ease",
            }}
          >
            Open AI Dashboard
          </Link>
        </div>
          </>
        )}
      </div>

      <div
        style={{
          marginTop: "2rem",
          padding: "1rem",
          background: "#e9ecef",
          borderRadius: "4px",
          fontSize: "0.9rem",
          color: "#666",
        }}
      >
        <strong>Status:</strong> Connected to backend • Last updated:{" "}
        {new Date(timestamp).toLocaleString()}
      </div>

      {/* Professional Toast Notification */}
      <Toast
        message={toast.message}
        type={toast.type}
        isVisible={toast.visible}
        onClose={() => setToast(prev => ({ ...prev, visible: false }))}
      />
    </div>
  );
}
