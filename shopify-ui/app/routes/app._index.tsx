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
import { backendFetch } from "../server/hmac.server";

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

    // Fetch Google Ads connection status and data
    let googleAdsData: {
      connected: boolean;
      connectionStatus: any;
      metrics: any;
      campaigns: any[];
    } = {
      connected: false,
      connectionStatus: null,
      metrics: null,
      campaigns: [],
    };

    try {
      // 1. Check connection status
      const connRes = await backendFetch(
        "/google-ads/connection-status",
        "GET",
        undefined,
        shopName,
      );

      const connJson = connRes.json;
      const isConnected = connRes.status === 200 && connJson?.ok && connJson?.connected === true;

      googleAdsData.connected = isConnected;
      googleAdsData.connectionStatus = connJson;

      if (isConnected) {
        // 2. Fetch metrics and campaigns in parallel (only if connected)
        const [metricsRes, campaignsRes] = await Promise.all([
          backendFetch(
            "/google-ads/metrics?dateRange=LAST_30_DAYS",
            "GET",
            undefined,
            shopName,
          ),
          backendFetch(
            "/google-ads/campaigns",
            "GET",
            undefined,
            shopName,
          ),
        ]);

        if (metricsRes.status === 200 && metricsRes.json?.ok) {
          googleAdsData.metrics = metricsRes.json.metrics || metricsRes.json;
        }

        if (campaignsRes.status === 200 && campaignsRes.json?.ok) {
          googleAdsData.campaigns = campaignsRes.json.campaigns || [];
        }
      }

      console.log(`Google Ads status for ${shopName}: connected=${isConnected}, campaigns=${googleAdsData.campaigns.length}`);
    } catch (gadsError) {
      console.error(`Google Ads data fetch error for ${shopName}:`, gadsError);
      // Non-blocking: dashboard still loads with empty Google Ads data
    }

    return json({
      message: "AI-powered Google Ads optimization on autopilot",
      timestamp: new Date().toISOString(),
      shopName: shopName,
      subscriptionInfo,
      planSelectionUrl,
      googleAds: googleAdsData,
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
  const { message, timestamp, shopName, subscriptionInfo, planSelectionUrl, googleAds } = useLoaderData<typeof loader>();
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

  // Helper to format metric values
  const formatMetricNumber = (val: number | null | undefined): string => {
    if (val == null) return "--";
    if (val >= 1000000) return `${(val / 1000000).toFixed(1)}M`;
    if (val >= 1000) return `${(val / 1000).toFixed(1)}K`;
    return val.toLocaleString();
  };

  const formatMetricCurrency = (val: number | null | undefined): string => {
    if (val == null) return "--";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(val);
  };

  const formatMetricPercent = (val: number | null | undefined): string => {
    if (val == null) return "--";
    return `${val.toFixed(2)}%`;
  };

  const formatMetricRoas = (val: number | null | undefined): string => {
    if (val == null) return "--";
    return `${val.toFixed(2)}x`;
  };

  // Extract metrics from loader data
  const gadsMetrics = googleAds?.metrics || null;
  const gadsCampaigns = googleAds?.campaigns || [];
  const gadsConnected = googleAds?.connected || false;
  const gadsCustomerId = googleAds?.connectionStatus?.customerId || googleAds?.connectionStatus?.customer_id || null;

  const renderGoogleAdsConnectionBanner = () => {
    if (gadsConnected) {
      return (
        <div style={{
          background: "#d1eddd",
          border: "1px solid #28a745",
          borderRadius: "8px",
          padding: "16px",
          marginBottom: "24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div style={{
              width: "24px",
              height: "24px",
              background: "#28a745",
              borderRadius: "4px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "white",
              fontSize: "12px",
              fontWeight: "bold"
            }}>✓</div>
            <div>
              <h3 style={{ margin: "0", fontSize: "16px", color: "#155724" }}>
                Google Ads Connected
              </h3>
              <p style={{ margin: "4px 0 0 0", fontSize: "14px", color: "#155724" }}>
                {gadsCustomerId ? `Customer ID: ${gadsCustomerId}` : "Your Google Ads account is linked and active"}
              </p>
            </div>
          </div>
          <Link
            to={buildAppUrl("/app/connect-google", shopContext)}
            style={{
              background: "transparent",
              color: "#155724",
              padding: "8px 16px",
              textDecoration: "none",
              borderRadius: "6px",
              border: "1px solid #28a745",
              fontSize: "14px",
              fontWeight: "bold",
            }}
          >
            Manage Connection
          </Link>
        </div>
      );
    }

    return (
      <div style={{
        background: "#fff3cd",
        border: "1px solid #ffc107",
        borderRadius: "8px",
        padding: "16px",
        marginBottom: "24px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div style={{
            width: "24px",
            height: "24px",
            background: "#ffc107",
            borderRadius: "4px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#856404",
            fontSize: "14px",
            fontWeight: "bold"
          }}>!</div>
          <div>
            <h3 style={{ margin: "0", fontSize: "16px", color: "#856404" }}>
              Connect Your Google Ads Account
            </h3>
            <p style={{ margin: "4px 0 0 0", fontSize: "14px", color: "#856404" }}>
              Connect your Google Ads account to see real performance data and enable AI optimization
            </p>
          </div>
        </div>
        <Link
          to={buildAppUrl("/app/connect-google", shopContext)}
          style={{
            background: "#ffc107",
            color: "#856404",
            padding: "10px 20px",
            textDecoration: "none",
            borderRadius: "6px",
            fontSize: "14px",
            fontWeight: "bold",
            whiteSpace: "nowrap",
          }}
        >
          Connect Google Ads
        </Link>
      </div>
    );
  };

  return (
    <div style={{ padding: "2rem" }}>
      {renderSubscriptionBanner()}
      {renderGoogleAdsConnectionBanner()}
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

      {/* Google Ads Performance Metrics */}
      {gadsConnected && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
            gap: "1rem",
            marginTop: "1.5rem",
            marginBottom: "1.5rem",
          }}
        >
          <div style={{
            border: "1px solid #e1e3e5",
            borderRadius: "8px",
            padding: "1.25rem",
            background: "white",
            textAlign: "center",
          }}>
            <div style={{ fontSize: "12px", color: "#666", marginBottom: "4px", textTransform: "uppercase", letterSpacing: "0.5px" }}>Impressions</div>
            <div style={{ fontSize: "24px", fontWeight: "bold", color: "#333" }}>
              {formatMetricNumber(gadsMetrics?.impressions)}
            </div>
            <div style={{ fontSize: "11px", color: "#999", marginTop: "4px" }}>Last 30 days</div>
          </div>
          <div style={{
            border: "1px solid #e1e3e5",
            borderRadius: "8px",
            padding: "1.25rem",
            background: "white",
            textAlign: "center",
          }}>
            <div style={{ fontSize: "12px", color: "#666", marginBottom: "4px", textTransform: "uppercase", letterSpacing: "0.5px" }}>Clicks</div>
            <div style={{ fontSize: "24px", fontWeight: "bold", color: "#333" }}>
              {formatMetricNumber(gadsMetrics?.clicks)}
            </div>
            <div style={{ fontSize: "11px", color: "#999", marginTop: "4px" }}>
              CTR: {formatMetricPercent(gadsMetrics?.ctr)}
            </div>
          </div>
          <div style={{
            border: "1px solid #e1e3e5",
            borderRadius: "8px",
            padding: "1.25rem",
            background: "white",
            textAlign: "center",
          }}>
            <div style={{ fontSize: "12px", color: "#666", marginBottom: "4px", textTransform: "uppercase", letterSpacing: "0.5px" }}>Conversions</div>
            <div style={{ fontSize: "24px", fontWeight: "bold", color: "#28a745" }}>
              {formatMetricNumber(gadsMetrics?.conversions)}
            </div>
            <div style={{ fontSize: "11px", color: "#999", marginTop: "4px" }}>Last 30 days</div>
          </div>
          <div style={{
            border: "1px solid #e1e3e5",
            borderRadius: "8px",
            padding: "1.25rem",
            background: "white",
            textAlign: "center",
          }}>
            <div style={{ fontSize: "12px", color: "#666", marginBottom: "4px", textTransform: "uppercase", letterSpacing: "0.5px" }}>Ad Spend</div>
            <div style={{ fontSize: "24px", fontWeight: "bold", color: "#333" }}>
              {formatMetricCurrency(gadsMetrics?.cost ?? gadsMetrics?.spend ?? gadsMetrics?.adSpend)}
            </div>
            <div style={{ fontSize: "11px", color: "#999", marginTop: "4px" }}>Last 30 days</div>
          </div>
          <div style={{
            border: "1px solid #28a745",
            borderRadius: "8px",
            padding: "1.25rem",
            background: "#f8fff9",
            textAlign: "center",
          }}>
            <div style={{ fontSize: "12px", color: "#666", marginBottom: "4px", textTransform: "uppercase", letterSpacing: "0.5px" }}>ROAS</div>
            <div style={{ fontSize: "24px", fontWeight: "bold", color: "#28a745" }}>
              {formatMetricRoas(gadsMetrics?.roas)}
            </div>
            <div style={{ fontSize: "11px", color: "#999", marginTop: "4px" }}>Return on ad spend</div>
          </div>
        </div>
      )}

      {/* Active Campaigns Summary */}
      {gadsConnected && gadsCampaigns.length > 0 && (
        <div style={{
          border: "1px solid #e1e3e5",
          borderRadius: "8px",
          padding: "1.25rem",
          background: "white",
          marginBottom: "1.5rem",
        }}>
          <div style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "12px",
          }}>
            <h3 style={{ margin: 0, fontSize: "16px", fontWeight: "bold" }}>
              Active Campaigns ({gadsCampaigns.length})
            </h3>
            <Link
              to={buildAppUrl("/app/ai-dashboard?tab=campaigns", shopContext)}
              style={{
                color: "#007bff",
                textDecoration: "none",
                fontSize: "14px",
              }}
            >
              View All →
            </Link>
          </div>
          <div style={{ display: "grid", gap: "8px" }}>
            {gadsCampaigns.slice(0, 5).map((campaign: any, idx: number) => (
              <div
                key={campaign.id || idx}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "10px 12px",
                  background: "#f8f9fa",
                  borderRadius: "6px",
                  fontSize: "14px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{
                    display: "inline-block",
                    width: "8px",
                    height: "8px",
                    borderRadius: "50%",
                    background: (campaign.status === "ENABLED" || campaign.status === "active") ? "#28a745" : "#ffc107",
                  }} />
                  <span style={{ fontWeight: "500" }}>{campaign.name || "Unnamed Campaign"}</span>
                </div>
                <div style={{ display: "flex", gap: "16px", fontSize: "13px", color: "#666" }}>
                  {campaign.impressions != null && <span>{formatMetricNumber(campaign.impressions)} imp</span>}
                  {campaign.clicks != null && <span>{formatMetricNumber(campaign.clicks)} clicks</span>}
                  {(campaign.cost != null || campaign.spend != null) && (
                    <span>{formatMetricCurrency(campaign.cost ?? campaign.spend)}</span>
                  )}
                </div>
              </div>
            ))}
            {gadsCampaigns.length > 5 && (
              <div style={{ textAlign: "center", fontSize: "13px", color: "#666", padding: "4px" }}>
                +{gadsCampaigns.length - 5} more campaigns
              </div>
            )}
          </div>
        </div>
      )}

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
        <strong>Status:</strong> Connected to backend
        {gadsConnected && " • Google Ads connected"}
        {!gadsConnected && " • Google Ads not connected"}
        {" "}• Last updated:{" "}
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
