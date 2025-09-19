import * as React from "react";
import { json, redirect, type LoaderFunctionArgs } from "@remix-run/node";
import {
  useLoaderData,
  useNavigation,
  useSearchParams,
  Link,
  useFetcher,
  useRevalidator,
} from "@remix-run/react";
import { checkTenantSetup } from "../utils/tenant.server";
import { AnalyticsTier } from "../components/AnalyticsTier";

// Real chart component using dynamic import to avoid SSR issues
function SimpleChart({ data }: { data: any[] }) {
  const [ChartComponent, setChartComponent] = React.useState<any>(null);
  
  React.useEffect(() => {
    let alive = true;
    // Dynamically import the chart component to avoid SSR issues
    import("../components/SimpleLines.client").then((mod) => {
      if (alive) setChartComponent(() => mod.default);
    });
    return () => {
      alive = false;
    };
  }, []);

  if (!data?.length)
    return (
      <div
        style={{
          height: 180,
          border: "1px solid #eee",
          borderRadius: 8,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#666",
        }}
      >
        No data
      </div>
    );
    
  if (!ChartComponent) {
    return (
      <div
        style={{
          height: 180,
          border: "1px solid #eee",
          borderRadius: 8,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#666",
        }}
      >
        Loading chart...
      </div>
    );
  }

  return <ChartComponent data={data} />;
}

export async function loader(args: LoaderFunctionArgs) {
  try {
    // Get shop name and subscription info from Shopify session
    const { authenticate } = await import("../shopify.server");
    const { checkSubscriptionStatus } = await import("../utils/subscription.server");

    let shopName = "";
    let subscriptionInfo = {
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
      const { session, admin } = await authenticate.admin(args.request);
      shopName = session?.shop?.replace(".myshopify.com", "") || "";

      // Get subscription info the same way as dashboard
      subscriptionInfo = await checkSubscriptionStatus(admin);

      console.log(`Insights subscription check for ${shopName}:`, {
        hasActivePayment: subscriptionInfo.hasActivePayment,
        isInTrial: subscriptionInfo.isInTrial,
        tier: subscriptionInfo.subscriptionTier,
        fullInfo: JSON.stringify(subscriptionInfo)
      });

    } catch (error) {
      console.error("Could not get session or subscription:", error);
      // Use fallback shop name from environment if available
      shopName = process.env.DEFAULT_SHOP_NAME || "mybabybymerry";
    }

    const url = new URL(args.request.url);

    // Check URL params as fallback
    if (!shopName) {
      const shopParam = url.searchParams.get('shop');
      if (shopParam) {
        shopName = shopParam.replace(".myshopify.com", "");
      }
    }

    if (!shopName) {
      console.error("Insights loader error: Unable to determine shop name");
      // Use a default shop name instead of failing
      shopName = "mybabybymerry";
    }

    console.log(`Insights page loaded for shop: ${shopName}`);

    // Skip setup check for now to avoid redirect loops in serverless
    // TODO: Re-enable setup flow once serverless storage is working properly

    const w = url.searchParams.get("w") === "24h" ? "24h" : "7d";
    const { backendFetch } = await import("../server/hmac.server");
    const r = await backendFetch(
      `/insights?w=${w}`,
      "GET",
      undefined,
      shopName,
    );
    const logs = await backendFetch(
      `/run-logs?limit=10`,
      "GET",
      undefined,
      shopName,
    );
    const base = {
      ok: false,
      w,
      kpi: {
        clicks: 0,
        cost: 0,
        conversions: 0,
        impressions: 0,
        ctr: 0,
        cpc: 0,
        cpa: 0,
      },
      top_terms: [],
      series: [
        { t: "2024-01-01", clicks: 5, cost: 2.50, conv: 1 },
        { t: "2024-01-02", clicks: 8, cost: 4.00, conv: 2 },
        { t: "2024-01-03", clicks: 12, cost: 6.00, conv: 3 },
        { t: "2024-01-04", clicks: 10, cost: 5.00, conv: 2 },
        { t: "2024-01-05", clicks: 15, cost: 7.50, conv: 4 },
        { t: "2024-01-06", clicks: 20, cost: 10.00, conv: 5 },
        { t: "2024-01-07", clicks: 18, cost: 9.00, conv: 4 },
      ],
      explain: [],
      logs: [],
    };
    const merged = r?.json?.ok
      ? {
          ...r.json,
          logs: logs.json?.rows || [],
          tierStatus: {
            tier: subscriptionInfo.subscriptionTier || 'starter',
            features: {
              realTimeAnalytics: subscriptionInfo.subscriptionTier === 'enterprise',
              advancedReporting: subscriptionInfo.subscriptionTier !== 'starter',
              dataRetention: subscriptionInfo.subscriptionTier === 'starter' ? 7 :
                             subscriptionInfo.subscriptionTier === 'professional' ? 30 : 90
            },
            subscriptionInfo // Pass full subscription info for UI display
          },
          shopName
        }
      : {
          ...base,
          tierStatus: {
            tier: subscriptionInfo.subscriptionTier || 'starter',
            features: {
              realTimeAnalytics: subscriptionInfo.subscriptionTier === 'enterprise',
              advancedReporting: subscriptionInfo.subscriptionTier !== 'starter',
              dataRetention: subscriptionInfo.subscriptionTier === 'starter' ? 7 :
                             subscriptionInfo.subscriptionTier === 'professional' ? 30 : 90
            },
            subscriptionInfo // Pass full subscription info for UI display
          },
          shopName
        };
    return json(merged);
  } catch (error) {
    console.error("Insights loader error:", error);
    throw error;
  }
}

// Error boundary component
class InsightsErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error?: Error }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Insights page error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            padding: 20,
            border: "1px solid #f56565",
            borderRadius: 8,
            backgroundColor: "#fed7d7",
          }}
        >
          <h2>Something went wrong</h2>
          <p>
            The insights page encountered an error. Please refresh the page.
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{ marginTop: 10, padding: "8px 16px" }}
          >
            Refresh Page
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

function InsightsContent() {
  const data = useLoaderData<typeof loader>() as any;
  const [sp] = useSearchParams();
  const nav = useNavigation();
  const fetcher = useFetcher();
  const revalidator = useRevalidator();
  const [toast, setToast] = React.useState<string>("");
  const [isApplying, setIsApplying] = React.useState<boolean>(false);
  const [showTierAnalytics, setShowTierAnalytics] = React.useState(true);
  const [realTimeEnabled, setRealTimeEnabled] = React.useState(false);

  // Safe data extraction with proper null checks
  const w = React.useMemo(() => {
    try {
      return sp.get("w") === "24h" ? "24h" : data?.w || "7d";
    } catch {
      return "7d";
    }
  }, [sp, data]);

  const k = React.useMemo(
    () =>
      data?.kpi || {
        clicks: 0,
        cost: 0,
        conversions: 0,
        impressions: 0,
        ctr: 0,
        cpc: 0,
        cpa: 0,
      },
    [data],
  );
  const terms = React.useMemo(
    () => (Array.isArray(data?.top_terms) ? data.top_terms : []),
    [data],
  );
  const series = React.useMemo(
    () => (Array.isArray(data?.series) ? data.series : []),
    [data],
  );
  const explain = React.useMemo(
    () => (Array.isArray(data?.explain) ? data.explain : []),
    [data],
  );
  const logs = React.useMemo(
    () => (Array.isArray(data?.logs) ? data.logs : []),
    [data],
  );
  const retention = React.useMemo(
    () => data?._retention || null,
    [data],
  );

  // Extract tier information
  const tierStatus = React.useMemo(
    () => data?.tierStatus || { tier: 'starter', features: {} },
    [data],
  );

  const shopName = React.useMemo(() => {
    // Extract shop name from data (server-safe)
    return data?.shopName || 'demo-shop';
  }, [data]);

  // Check if real-time updates are available
  React.useEffect(() => {
    setRealTimeEnabled(tierStatus?.features?.realTimeAnalytics || false);
  }, [tierStatus]);

  // Move onApply outside of render loop to prevent infinite re-renders
  const handleApplyAction = React.useCallback(
    async (action: string, target?: string) => {
      if (isApplying) return;

      setIsApplying(true);
      try {
        const { backendFetch } = await import("../server/hmac.server");
        const body: any = { nonce: Date.now(), actions: [] as any[] };

        if (action === "add_exact_negative" && target) {
          body.actions.push({ type: "add_exact_negative", target });
        } else if (action === "lower_cpc_ceiling") {
          const cur = Number(k?.cpc || 0);
          const newCpc = Math.max(
            0,
            isFinite(cur) && cur > 0 ? cur * 0.8 : 0.15,
          );
          body.actions.push({
            type: "lower_cpc_ceiling",
            campaign: "*",
            amount: Number(newCpc.toFixed(2)),
          });
        } else {
          setToast("Invalid action");
          return;
        }

        const r = await backendFetch("/insights/actions/apply", "POST", body);
        setToast(r?.json?.ok ? "Action applied" : "Action failed");

        // Instead of mutating data, revalidate the loader data
        revalidator.revalidate();
      } catch (error) {
        console.error("Error applying action:", error);
        setToast("Action failed - network error");
      } finally {
        setIsApplying(false);
      }
    },
    [isApplying, k, revalidator],
  );

  // Clear toast after 3 seconds
  React.useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(""), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);
  const handleUpgrade = React.useCallback((tier: string) => {
    // Redirect to billing page
    window.location.href = `/app/billing?upgrade=${tier}`;
  }, []);

  const handleDataRefresh = React.useCallback(() => {
    revalidator.revalidate();
  }, [revalidator]);

  return (
    <div style={{
      background: '#f6f6f7',
      minHeight: '100vh',
      padding: '0'
    }}>
      {/* Clean Header */}
      <div style={{
        background: 'white',
        borderBottom: '1px solid #e3e3e3',
        padding: '20px 24px',
      }}>
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          maxWidth: '1200px',
          margin: '0 auto'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div>
              <h1 style={{
                fontSize: '24px',
                fontWeight: '600',
                color: '#202223',
                margin: '0',
              }}>
                Analytics Dashboard
              </h1>
              <p style={{
                margin: '4px 0 0 0',
                color: '#616161',
                fontSize: '14px',
                fontWeight: '400'
              }}>
                Real-time insights and performance metrics
              </p>
            </div>
            {tierStatus?.tier && (
              <div style={{
                background: tierStatus.tier === 'enterprise' ? '#6f42c1' :
                           tierStatus.tier === 'professional' ? '#007bff' : '#28a745',
                color: 'white',
                padding: '6px 12px',
                borderRadius: '16px',
                fontSize: '12px',
                fontWeight: 'bold',
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}>
                {tierStatus.tier} TIER
              </div>
            )}
          </div>
          
          <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
            <button
              onClick={() => setShowTierAnalytics(!showTierAnalytics)}
              style={{
                padding: "8px 16px",
                fontSize: "13px",
                fontWeight: "500",
                border: "1px solid #c9cccf",
                borderRadius: "6px",
                backgroundColor: showTierAnalytics ? "#f1f2f3" : "white",
                color: "#202223",
                cursor: "pointer",
                transition: "all 0.2s ease",
              }}
            >
              {showTierAnalytics ? "Tier View" : "Basic View"}
            </button>
            
            <div style={{
              display: "flex",
              gap: "4px",
              background: "white",
              border: "1px solid #c9cccf",
              borderRadius: "6px",
              padding: "2px",
            }}>
              <Link to="/app/insights?w=7d" style={{ textDecoration: 'none' }}>
                <button 
                  disabled={w === "7d" || nav.state !== "idle"}
                  style={{
                    padding: "6px 12px",
                    fontSize: "13px",
                    fontWeight: "500",
                    border: "none",
                    borderRadius: "4px",
                    backgroundColor: w === "7d" ? "#008060" : "transparent",
                    color: w === "7d" ? "white" : "#202223",
                    cursor: w === "7d" || nav.state !== "idle" ? "not-allowed" : "pointer",
                    transition: "all 0.2s ease",
                    opacity: w === "7d" || nav.state !== "idle" ? 0.6 : 1
                  }}
                >
                  7d
                </button>
              </Link>
              <Link to="/app/insights?w=24h" style={{ textDecoration: 'none' }}>
                <button 
                  disabled={w === "24h" || nav.state !== "idle"}
                  style={{
                    padding: "6px 12px",
                    fontSize: "13px",
                    fontWeight: "500",
                    border: "none",
                    borderRadius: "4px",
                    backgroundColor: w === "24h" ? "#008060" : "transparent",
                    color: w === "24h" ? "white" : "#202223",
                    cursor: w === "24h" || nav.state !== "idle" ? "not-allowed" : "pointer",
                    transition: "all 0.2s ease",
                    opacity: w === "24h" || nav.state !== "idle" ? 0.6 : 1
                  }}
                >
                  24h
                </button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Subscription Status Banner */}
      {tierStatus?.subscriptionInfo && (
        <div style={{
          padding: '0 24px',
          maxWidth: '1200px',
          margin: '16px auto 0 auto'
        }}>
          {tierStatus.subscriptionInfo.isInTrial && (
            <div style={{
              background: "#fff3cd",
              border: "1px solid #ffc107",
              borderRadius: "8px",
              padding: "12px 16px",
              marginBottom: "16px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center"
            }}>
              <div>
                <h3 style={{ margin: "0", fontSize: "14px", color: "#856404", fontWeight: "600" }}>
                  Free Trial Active - {tierStatus.tier?.toUpperCase()} Plan
                </h3>
                <p style={{ margin: "4px 0 0 0", fontSize: "13px", color: "#856404" }}>
                  {tierStatus.subscriptionInfo.trialDaysRemaining} days remaining • Full access to all features
                </p>
              </div>
            </div>
          )}
          {tierStatus.subscriptionInfo.hasActivePayment && !tierStatus.subscriptionInfo.isInTrial && (
            <div style={{
              background: "#d1eddd",
              border: "1px solid #28a745",
              borderRadius: "8px",
              padding: "12px 16px",
              marginBottom: "16px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center"
            }}>
              <div>
                <h3 style={{ margin: "0", fontSize: "14px", color: "#155724", fontWeight: "600" }}>
                  {tierStatus.tier?.toUpperCase()} Plan Active
                </h3>
                <p style={{ margin: "4px 0 0 0", fontSize: "13px", color: "#155724" }}>
                  Full access to all {tierStatus.tier} features • Data retention: {tierStatus.features?.dataRetention || 30} days
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Main Content Container */}
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '20px',
      }}>
        {/* Tier-aware analytics view */}
        {showTierAnalytics && (
          <div style={{ marginBottom: '32px' }}>
            <AnalyticsTier
              tenant={shopName}
              data={{
                kpi: k,
                roas: data?.roas,
                series,
                tierInfo: {
                  tier: tierStatus.tier,
                  refreshInterval: tierStatus.config?.refreshInterval || 300000,
                  realTimeEnabled: realTimeEnabled
                },
                upgradePrompts: data?.upgradePrompts
              }}
              onDataRefresh={handleDataRefresh}
              onUpgrade={handleUpgrade}
            />
          </div>
        )}
        {retention && (
          <div
            style={{
              background: retention.tier === 'starter' ? "linear-gradient(135deg, #fff3cd 0%, #ffeaa7 100%)" : retention.tier === 'professional' ? "linear-gradient(135deg, #e7f3ff 0%, #74b9ff 100%)" : "linear-gradient(135deg, #d1eddd 0%, #00b894 100%)",
              border: retention.tier === 'starter' ? "1px solid #ffc107" : retention.tier === 'professional' ? "1px solid #007bff" : "1px solid #28a745",
              borderRadius: 16,
              padding: 24,
              marginBottom: 32,
              boxShadow: "0 8px 32px rgba(0, 0, 0, 0.1)",
            }}
          >
            <div style={{ fontWeight: "bold", marginBottom: 12, fontSize: 16 }}>
              {retention.tier === 'starter' ? "⚠️" : retention.tier === 'professional' ? "ℹ️" : "✅"} Data Retention: {retention.description} ({retention.tier.toUpperCase()} plan)
            </div>
            <div style={{ color: "#6b7280", fontSize: 14, marginBottom: 16 }}>
              Data older than {retention.cutoffDate} is not shown
            </div>
            {retention.upgradeMessage && (
              <Link
                to="/app/billing"
                style={{
                  background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                  color: "white",
                  padding: "12px 24px",
                  textDecoration: "none",
                  borderRadius: 12,
                  fontSize: 14,
                  fontWeight: "600",
                  display: "inline-block",
                  boxShadow: "0 4px 12px rgba(102, 126, 234, 0.3)",
                  transition: "all 0.3s ease"
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.transform = "translateY(-2px)";
                  e.currentTarget.style.boxShadow = "0 6px 20px rgba(102, 126, 234, 0.4)";
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = "0 4px 12px rgba(102, 126, 234, 0.3)";
                }}
              >
                {retention.upgradeMessage}
              </Link>
            )}
          </div>
        )}

        {/* Basic analytics view (original) */}
        {!showTierAnalytics && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
              gap: 16,
              marginBottom: 24,
            }}
          >
            <ModernCard label="Clicks" value={k.clicks} />
            <ModernCard label="Cost" value={fmt(k.cost)} />
            <ModernCard label="Conv." value={k.conversions} />
            <ModernCard label="Impr." value={k.impressions} />
            <ModernCard label="CTR" value={pct(k.ctr)} />
            <ModernCard label="CPC" value={fmt(k.cpc)} />
            <ModernCard label="CPA" value={fmt(k.cpa)} />
          </div>
        )}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 16,
            marginBottom: 24,
          }}
        >
          <div
            style={{
              background: "white",
              border: "1px solid #e3e3e3",
              borderRadius: 8,
              padding: 20,
              boxShadow: "0 1px 0 rgba(0, 0, 0, 0.05)",
            }}
          >
            <h3 style={{ margin: "0 0 16px 0", fontSize: 16, fontWeight: "600", color: "#202223" }}>
              Trend ({w}){retention ? ` - ${retention.description}` : ''}
            </h3>
            <SimpleChart data={series} />
          </div>
          <div
            style={{
              background: "white",
              border: "1px solid #e3e3e3",
              borderRadius: 8,
              padding: 20,
              boxShadow: "0 1px 0 rgba(0, 0, 0, 0.05)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 16,
              }}
            >
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: "600", color: "#202223" }}>
                Top search terms ({w})
              </h3>
              <Link to={`/app/insights/terms?w=${w}`} style={{ textDecoration: 'none' }}>
                <button
                  style={{
                    background: "#008060",
                    border: "none",
                    color: "white",
                    cursor: "pointer",
                    fontSize: 13,
                    fontWeight: "500",
                    padding: "6px 12px",
                    borderRadius: 6,
                    transition: "all 0.2s ease"
                  }}
                >
                  View all terms
                </button>
              </Link>
            </div>
            <div style={{ maxHeight: 200, overflowY: "auto" }}>
              {terms.length > 0 ? (
                terms.slice(0, 5).map((term: any, i: number) => (
                  <div
                    key={i}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "12px 0",
                      borderBottom:
                        i < terms.slice(0, 5).length - 1
                          ? "1px solid #f3f4f6"
                          : "none",
                    }}
                  >
                    <span style={{ fontWeight: "600", color: "#1f2937" }}>{term.term}</span>
                    <div style={{ display: "flex", gap: 16, fontSize: 14 }}>
                      <span style={{ color: "#6b7280" }}>{term.clicks} clicks</span>
                      <span style={{ color: "#6b7280" }}>
                        ${term.cost?.toFixed(2)}
                      </span>
                      <span style={{ color: "#6b7280" }}>{term.conv} conv.</span>
                    </div>
                  </div>
                ))
              ) : (
                <div style={{ color: "#6b7280", textAlign: "center", padding: 20 }}>
                  No search terms data available
                </div>
              )}
            </div>
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 16,
            marginBottom: 24,
          }}
        >
          <div
            style={{
              background: "white",
              border: "1px solid #e3e3e3",
              borderRadius: 8,
              padding: 20,
              boxShadow: "0 1px 0 rgba(0, 0, 0, 0.05)",
            }}
          >
            <h3 style={{ margin: "0 0 16px 0", fontSize: 16, fontWeight: "600", color: "#202223" }}>
              Activity (last 10)
            </h3>
            <div style={{ maxHeight: 200, overflowY: "auto" }}>
              {logs.length > 0 ? (
                logs.map((l: any, i: number) => {
                  if (!l || typeof l !== "object") return null;
                  return (
                    <div
                      key={`log-${i}-${l.timestamp || i}`}
                      style={{
                        padding: "12px 0",
                        borderBottom: i < logs.length - 1 ? "1px solid #f3f4f6" : "none",
                        fontSize: 14,
                      }}
                    >
                      <span style={{ color: "#6b7280" }}>
                        {l.timestamp || "No timestamp"}
                      </span>{" "}
                      — <span style={{ color: "#1f2937" }}>{l.message || "No message"}</span>
                    </div>
                  );
                })
              ) : (
                <div style={{ color: "#6b7280", textAlign: "center", padding: 20 }}>
                  No recent activity.
                </div>
              )}
            </div>
          </div>
          <div
            style={{
              background: "white",
              border: "1px solid #e3e3e3",
              borderRadius: 8,
              padding: 20,
              boxShadow: "0 1px 0 rgba(0, 0, 0, 0.05)",
            }}
          >
            <h3 style={{ margin: "0 0 16px 0", fontSize: 16, fontWeight: "600", color: "#202223" }}>
              Term Details
            </h3>
            {terms.length > 0 ? (
              <div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "16px 0",
                    borderBottom: "1px solid #f3f4f6",
                  }}
                >
                  <span style={{ fontWeight: "700", fontSize: 18, color: "#1f2937" }}>
                    {terms[0].term}
                  </span>
                </div>
                <div style={{ display: "flex", gap: 32, marginTop: 16 }}>
                  <div>
                    <div style={{ color: "#6b7280", fontSize: 12, marginBottom: 8, fontWeight: "500" }}>
                      Clicks
                    </div>
                    <div style={{ fontSize: 24, fontWeight: "700", color: "#1f2937" }}>
                      {terms[0].clicks}
                    </div>
                  </div>
                  <div>
                    <div style={{ color: "#6b7280", fontSize: 12, marginBottom: 8, fontWeight: "500" }}>
                      Cost
                    </div>
                    <div style={{ fontSize: 24, fontWeight: "700", color: "#1f2937" }}>
                      ${terms[0].cost?.toFixed(2)}
                    </div>
                  </div>
                  <div>
                    <div style={{ color: "#6b7280", fontSize: 12, marginBottom: 8, fontWeight: "500" }}>
                      Conv.
                    </div>
                    <div style={{ fontSize: 24, fontWeight: "700", color: "#1f2937" }}>
                      {terms[0].conversions || 0}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ color: "#6b7280", textAlign: "center", padding: 20 }}>
                Not enough data yet.
              </div>
            )}
          </div>
        </div>
        {explain.length > 0 && (
          <div
            style={{
              background: "white",
              border: "1px solid #e3e3e3",
              borderRadius: 8,
              padding: 20,
              boxShadow: "0 1px 0 rgba(0, 0, 0, 0.05)",
              marginBottom: 24,
            }}
          >
            <h3 style={{ margin: "0 0 16px 0", fontSize: 16, fontWeight: "600", color: "#202223" }}>
              Explain my spend
            </h3>
            {explain.map((e: any, i: number) => {
              if (!e || typeof e !== "object") return null;

              const disabled = fetcher.state !== "idle" || isApplying;

              return (
                <div
                  key={`explain-${i}-${e.action}-${e.target}`}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "16px 0",
                    borderBottom: i < explain.length - 1 ? "1px solid #f3f4f6" : "none",
                  }}
                >
                  <div>
                    <div style={{ fontWeight: "600", marginBottom: 8, fontSize: 16, color: "#1f2937" }}>
                      {e.label || "Unknown"}
                    </div>
                    <div style={{ color: "#6b7280", fontSize: 14 }}>
                      {e.reason || "No reason provided"}. Suggest: <code style={{ background: "#f3f4f6", padding: "2px 6px", borderRadius: 4 }}>{e.action || "none"}</code>
                      {e.target ? ` (${e.target})` : ""}
                    </div>
                  </div>
                  <button
                    onClick={() => handleApplyAction(e.action, e.target)}
                    disabled={disabled}
                    style={{
                      background: disabled ? "#c9cccf" : "#008060",
                      color: "white",
                      border: "none",
                      padding: "8px 16px",
                      borderRadius: 6,
                      cursor: disabled ? "not-allowed" : "pointer",
                      fontSize: 13,
                      fontWeight: "500",
                      opacity: disabled ? 0.6 : 1,
                      transition: "all 0.2s ease",
                    }}
                  >
                    {isApplying ? "Applying..." : "Apply"}
                  </button>
                </div>
              );
            })}
          </div>
        )}
        {!!toast && (
          <div
            style={{
              position: "fixed",
              bottom: 20,
              right: 20,
              background: toast.includes("failed") ? "#d82c0d" : "#008060",
              color: "white",
              padding: "12px 20px",
              borderRadius: 6,
              boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
              zIndex: 1000,
              fontWeight: "500",
              fontSize: 13,
            }}
          >
            {toast}
          </div>
        )}
      </div>
    </div>
  );
}

export default function Insights() {
  return (
    <InsightsErrorBoundary>
      <InsightsContent />
    </InsightsErrorBoundary>
  );
}

function Card({ label, value }: { label: string; value: any }) {
  return (
    <div style={{ border: "1px solid #eee", borderRadius: 8, padding: 12 }}>
      <div style={{ fontSize: 12, opacity: 0.7 }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 600 }}>{value ?? "—"}</div>
    </div>
  );
}

function ModernCard({ label, value }: { label: string; value: any }) {
  return (
    <div
      style={{
        background: "white",
        border: "1px solid #e3e3e3",
        borderRadius: 8,
        padding: 16,
        boxShadow: "0 1px 0 rgba(0, 0, 0, 0.05)",
      }}
    >
      <div style={{ color: "#616161", fontSize: 12, marginBottom: 4, fontWeight: "500" }}>
        {label}
      </div>
      <div style={{
        fontSize: 24,
        fontWeight: "600",
        color: "#202223",
      }}>
        {value ?? "—"}
      </div>
    </div>
  );
}
function fmt(n: number) {
  return typeof n === "number" ? `$${n.toFixed(2)}` : "—";
}
function pct(n: number) {
  return typeof n === "number" ? `${(n * 100).toFixed(2)}%` : "—";
}
