import React, { useState, useEffect } from "react";
import { authenticatedFetch } from "../utils/ai-client";
import { SystemOverview } from "./AIDashboard/SystemOverview";
import { UserDashboard } from "./AIDashboard/UserDashboard";
import { CampaignManager } from "./AIDashboard/CampaignManager";
import { AIContentStudio } from "./AIDashboard/AIContentStudio";
import { PerformanceInsights } from "./AIDashboard/PerformanceInsights";
import { Tabs, Page, Layout, Card, Text, Button, Badge, BlockStack, InlineStack } from "@shopify/polaris";

interface AIDraft {
  theme: string;
  headlines: string[];
  descriptions: string[];
  source: string;
  type?: string;
  lint: {
    ok: boolean;
    errors: string[];
  };
}

interface AIProviderStatus {
  status: string;
  initialized: boolean;
  provider?: string;
  model?: string;
}

interface TokenUsage {
  current: {
    daily: {
      cost: number;
      tokens: number;
    };
    monthly: {
      cost: number;
      tokens: number;
    };
  };
  budget: {
    daily: number;
    monthly: number;
    alert_threshold: number;
  };
}

interface AIActivity {
  timestamp: string;
  operation: string;
  status: string;
  details: string;
}

interface AIDashboardProps {
  shopName: string;
  subscriptionTier?: string;
  hasFeatureAccess?: boolean;
}

export function AIDashboard({ shopName, subscriptionTier = "starter", hasFeatureAccess = false }: AIDashboardProps) {
  const [drafts, setDrafts] = useState<AIDraft[]>([]);
  const [providerStatus, setProviderStatus] = useState<AIProviderStatus | null>(null);
  const [tokenUsage, setTokenUsage] = useState<TokenUsage | null>(null);
  const [activities, setActivities] = useState<AIActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Fix hydration issue - use array instead of Set for initial state
  const [selectedDraftIndices, setSelectedDraftIndices] = useState<number[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);

  // State for tab navigation
  const [selectedTab, setSelectedTab] = useState(0);
  const [showAdminView, setShowAdminView] = useState(false);

  // Fetch AI drafts
  const fetchDrafts = async () => {
    try {
      console.log("Fetching drafts for shop:", shopName);
      const response = await authenticatedFetch("/ai/drafts", "GET", undefined, shopName);

      if (response.ok) {
        const data = await response.json();
        console.log("Drafts API response:", data);

        if (data.ok) {
          const allDrafts = [
            ...data.rsa_default.map((d: any) => ({ ...d, type: 'default' })),
            ...data.library.map((d: any) => ({ ...d, type: 'library' }))
          ];
          console.log(`Setting ${allDrafts.length} drafts in UI:`, allDrafts);
          setDrafts(allDrafts);
        } else {
          console.log("API returned ok:false", data);
        }
      } else {
        console.error("Drafts API request failed:", response.status);
      }
    } catch (err) {
      console.error("Failed to fetch drafts:", err);
    }
  };

  // Fetch AI provider status
  const fetchProviderStatus = async () => {
    try {
      // Ensure authenticatedFetch is available
      if (typeof authenticatedFetch !== 'function') {
        console.error("authenticatedFetch is not a function");
        setProviderStatus({
          status: 'error',
          initialized: false,
          provider: 'unknown',
          model: 'unknown'
        });
        return;
      }

      const response = await authenticatedFetch("/ai/provider/status", "GET", undefined, shopName);

      if (response && response.ok) {
        const data = await response.json();
        if (data && data.ok && data.status) {
          setProviderStatus(data.status);
        } else if (data && data.ok && data.config) {
          // Handle alternate response format from provider/status
          setProviderStatus({
            status: data.config.configured ? 'healthy' : 'not_configured',
            initialized: data.config.configured,
            provider: data.config.provider || 'gemini',
            model: data.config.model || 'gemini-2.5-flash'
          });
        } else {
          // Set default status if response is malformed
          setProviderStatus({
            status: 'unknown',
            initialized: false,
            provider: 'unknown',
            model: 'unknown'
          });
        }
      } else {
        // Set offline status if request failed
        console.error("Provider status request failed:", response?.status);
        setProviderStatus({
          status: 'offline',
          initialized: false,
          provider: 'unknown',
          model: 'unknown'
        });
      }
    } catch (err) {
      console.error("Failed to fetch AI provider status:", err);
      // Set error status on exception
      setProviderStatus({
        status: 'error',
        initialized: false,
        provider: 'unknown',
        model: 'unknown'
      });
    }
  };

  // Fetch token usage
  const fetchTokenUsage = async () => {
    try {
      const response = await authenticatedFetch("/ai/tokens/usage", "GET", undefined, shopName);

      if (response.ok) {
        const data = await response.json();
        if (data.ok) {
          setTokenUsage(data.usage);
        }
      }
    } catch (err) {
      console.error("Failed to fetch token usage:", err);
    }
  };

  // Fetch AI activity logs
  const fetchActivities = async () => {
    try {
      const response = await authenticatedFetch("/ai/logs?limit=10", "GET", undefined, shopName);

      if (response.ok) {
        const data = await response.json();
        if (data.ok) {
          setActivities(data.logs || []);
        }
      }
    } catch (err) {
      console.error("Failed to fetch activities:", err);
    }
  };

  // Accept selected drafts
  const acceptDrafts = async () => {
    const selectedDraftsList = selectedDraftIndices.map(index => drafts[index]);

    try {
      const response = await authenticatedFetch("/ai/accept", "POST", {
        items: selectedDraftsList.map(draft => ({
          theme: draft.theme,
          headlines_pipe: draft.headlines.join("|"),
          descriptions_pipe: draft.descriptions.join("|"),
          source: draft.source || "accepted"
        }))
      }, shopName);

      if (response.ok) {
        const data = await response.json();
        if (data.ok && data.accepted > 0) {
          setError(null);
          setSelectedDraftIndices([]);
          await fetchDrafts(); // Refresh drafts
          // Show success message
        } else {
          setError(data.error || "Failed to accept drafts");
        }
      }
    } catch (err) {
      setError("Error accepting drafts: " + (err instanceof Error ? err.message : String(err)));
    }
  };

  // Reject selected drafts (remove from selection)
  const rejectDrafts = () => {
    setSelectedDraftIndices([]);
  };

  // Trigger AI writer job
  const triggerAIWriter = async () => {
    if (!hasFeatureAccess) {
      setError("AI Writer requires Professional+ subscription");
      return;
    }

    // Prevent multiple simultaneous requests
    if (isGenerating) {
      console.log("AI generation already in progress");
      return;
    }

    try {
      setError(null);
      setIsGenerating(true); // Set generating state immediately
      console.log("Triggering AI writer for shop:", shopName);

      const response = await authenticatedFetch("/jobs/ai_writer", "POST", {
        dryRun: false,
        limit: 5
      }, shopName);

      const responseText = await response.text();
      console.log("AI Writer Response:", responseText);

      let data;
      try {
        data = JSON.parse(responseText);
      } catch (e) {
        console.error("Failed to parse response:", responseText);
        setError("AI Writer triggered but response was not valid JSON");
        // Still refresh to see if anything changed
        setTimeout(() => {
          fetchDrafts();
          fetchActivities();
        }, 2000);
        return;
      }

      if (response.ok && data.ok) {
        setError(null);

        // Check if it's still processing
        if (data.status === "processing") {
          setIsGenerating(true);
          console.log("AI Writer is still processing:", data);

          // Start polling for new drafts every 3 seconds
          let pollCount = 0;
          const maxPolls = 20; // Poll for up to 60 seconds

          const pollInterval = setInterval(async () => {
            pollCount++;
            console.log(`Polling for drafts (${pollCount}/${maxPolls})...`);

            // Fetch drafts directly and check the response
            try {
              const response = await authenticatedFetch("/ai/drafts", "GET", undefined, shopName);
              if (response.ok) {
                const data = await response.json();
                if (data.ok) {
                  const newDrafts = [
                    ...data.rsa_default.map((d: any) => ({ ...d, type: 'default' })),
                    ...data.library.map((d: any) => ({ ...d, type: 'library' }))
                  ];

                  console.log(`Poll result: ${newDrafts.length} drafts found`);

                  // Always update drafts if we have any
                  if (newDrafts.length > 0) {
                    console.log(`Updating UI with ${newDrafts.length} drafts`);
                    setDrafts(newDrafts);
                    clearInterval(pollInterval);
                    setIsGenerating(false);

                    // Refresh other data
                    fetchActivities();
                    // Only fetch provider status if function exists
                    if (typeof fetchProviderStatus === 'function') {
                      fetchProviderStatus();
                    }
                  }
                }
              }
            } catch (err) {
              console.error("Polling error:", err);
            }

            // Stop after max attempts
            if (pollCount >= maxPolls) {
              clearInterval(pollInterval);
              setIsGenerating(false);
              console.log("Stopped polling - max attempts reached");
              // Final fetch attempt
              fetchDrafts();
            }
          }, 3000);
        } else {
          // Immediate completion
          console.log("AI Writer completed:", data);

          // If themes were written, refresh drafts immediately
          if (data.wrote && data.wrote > 0) {
            console.log(`AI Writer completed: ${data.wrote} themes written`);
            // Immediately fetch drafts
            fetchDrafts();
            fetchActivities();
            // Only fetch provider status if function exists
            if (typeof fetchProviderStatus === 'function') {
              fetchProviderStatus();
            }
            setIsGenerating(false);

            // Also do a delayed fetch to catch any slow database writes
            setTimeout(() => {
              console.log("Doing delayed fetch to ensure all data is loaded");
              fetchDrafts();
            }, 2000);
          } else {
            setIsGenerating(false);
          }

          // Show any messages from the server
          if (data.message && !data.error) {
            console.log("Server message:", data.message);
          }
        }
      } else {
        setError(data.error || data.message || "Failed to trigger AI writer");
        setIsGenerating(false);
      }
    } catch (err) {
      console.error("Error triggering AI writer:", err);
      setError("Error triggering AI writer: " + (err instanceof Error ? err.message : String(err)));
      setIsGenerating(false); // Reset generating state on error
    }
  };

  useEffect(() => {
    // Only run on client side to prevent hydration issues
    if (typeof window === 'undefined') return;

    const loadData = async () => {
      setLoading(true);
      try {
        await Promise.all([
          fetchDrafts(),
          fetchProviderStatus(),
          fetchTokenUsage(),
          fetchActivities()
        ]);
      } catch (err) {
        setError("Failed to load AI dashboard data");
      } finally {
        setLoading(false);
      }
    };

    if (shopName) {
      loadData();
    }
  }, [shopName]);

  const toggleDraftSelection = (index: number) => {
    const newSelection = [...selectedDraftIndices];
    const indexPos = newSelection.indexOf(index);
    if (indexPos > -1) {
      newSelection.splice(indexPos, 1);
    } else {
      newSelection.push(index);
    }
    setSelectedDraftIndices(newSelection);
  };

  if (loading) {
    return (
      <div style={{ padding: "20px", textAlign: "center" }}>
        <div style={{ fontSize: "16px", color: "#666" }}>Loading AI Dashboard...</div>
      </div>
    );
  }

  const tabs = [
    {
      id: 'dashboard',
      content: 'Dashboard',
      accessibilityLabel: 'Dashboard',
      panelID: 'dashboard-panel',
    },
    {
      id: 'campaigns',
      content: 'Campaigns',
      accessibilityLabel: 'Campaign Manager',
      panelID: 'campaigns-panel',
    },
    {
      id: 'content',
      content: 'AI Content Studio',
      accessibilityLabel: 'Content Studio',
      panelID: 'content-panel',
    },
    {
      id: 'insights',
      content: 'Insights',
      accessibilityLabel: 'Performance Insights',
      panelID: 'insights-panel',
    },
  ];

  // Show user-friendly view by default
  if (!showAdminView) {
    return (
      <Page
        title="AI Campaign Center"
        subtitle="Manage your Google Ads campaigns with AI-powered optimization"
        primaryAction={{
          content: 'Admin View',
          onAction: () => setShowAdminView(true),
        }}
      >
        <Layout>
          <Layout.Section>
            <Card>
              <Tabs tabs={tabs} selected={selectedTab} onSelect={setSelectedTab}>
                <div style={{ paddingTop: "16px" }}>
                  {selectedTab === 0 && (
                    <UserDashboard shopName={shopName} hasFeatureAccess={hasFeatureAccess} />
                  )}
                  {selectedTab === 1 && (
                    <CampaignManager shopName={shopName} hasFeatureAccess={hasFeatureAccess} />
                  )}
                  {selectedTab === 2 && (
                    <AIContentStudio shopName={shopName} hasFeatureAccess={hasFeatureAccess} />
                  )}
                  {selectedTab === 3 && (
                    <PerformanceInsights shopName={shopName} hasFeatureAccess={hasFeatureAccess} />
                  )}
                </div>
              </Tabs>
            </Card>
          </Layout.Section>
        </Layout>
      </Page>
    );
  }

  // Admin view with system monitoring
  return (
    <div style={{ padding: "20px" }}>
      {/* Switch back to user view button */}
      <div style={{ marginBottom: "16px" }}>
        <Button onClick={() => setShowAdminView(false)}>← Back to User View</Button>
      </div>
      {/* System Overview Component */}
      <div style={{ marginBottom: "32px" }}>
        <SystemOverview shopName={shopName} hasFeatureAccess={hasFeatureAccess} />
      </div>

      <div style={{ marginBottom: "24px" }}>
        <h1 style={{ margin: "0 0 8px 0", fontSize: "24px", fontWeight: "bold" }}>AI System Management</h1>
        <p style={{ margin: 0, color: "#666", fontSize: "14px" }}>
          Review system health, monitor automation status, and manage technical configurations
        </p>
      </div>

      {error && (
        <div style={{
          background: "#fff2f2",
          border: "1px solid #fecaca",
          borderRadius: "6px",
          padding: "12px",
          marginBottom: "16px",
          color: "#dc2626"
        }}>
          {error}
        </div>
      )}

      {isGenerating && (
        <div style={{
          background: "#fff3cd",
          border: "1px solid #ffeaa7",
          borderRadius: "6px",
          padding: "12px",
          marginBottom: "16px",
          color: "#856404",
          display: "flex",
          alignItems: "center",
          gap: "12px"
        }}>
          <span style={{ fontSize: "20px" }}>⏳</span>
          <div>
            <strong>AI is generating content...</strong>
            <p style={{ margin: "4px 0 0 0", fontSize: "12px" }}>
              This may take 30-60 seconds as the AI analyzes your store, fetches performance data, and creates optimized content.
            </p>
          </div>
        </div>
      )}

      {/* AI Provider Status */}
      <section style={{
        background: "#f8f9fa",
        border: "1px solid #e1e3e5",
        borderRadius: "8px",
        padding: "16px",
        marginBottom: "20px"
      }}>
        <h2 style={{ margin: "0 0 12px 0", fontSize: "18px", fontWeight: "bold" }}>AI System Status</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px" }}>
          <div>
            <div style={{ fontSize: "12px", color: "#666", marginBottom: "4px" }}>Provider Status</div>
            <div style={{
              padding: "4px 8px",
              borderRadius: "12px",
              fontSize: "12px",
              fontWeight: "bold",
              background: providerStatus?.status === "healthy" ? "#d1f2eb" : "#fef2f2",
              color: providerStatus?.status === "healthy" ? "#0f5132" : "#dc2626",
              display: "inline-block"
            }}>
              {providerStatus?.status || "Unknown"}
            </div>
          </div>

          {tokenUsage && (
            <>
              <div>
                <div style={{ fontSize: "12px", color: "#666", marginBottom: "4px" }}>Daily Usage</div>
                <div style={{ fontSize: "16px", fontWeight: "bold" }}>
                  ${tokenUsage.current?.daily?.cost?.toFixed(2) || "0.00"}
                  <span style={{ fontSize: "12px", color: "#666", marginLeft: "4px" }}>
                    / ${tokenUsage.budget?.daily || "0.00"}
                  </span>
                </div>
              </div>

              <div>
                <div style={{ fontSize: "12px", color: "#666", marginBottom: "4px" }}>Monthly Usage</div>
                <div style={{ fontSize: "16px", fontWeight: "bold" }}>
                  ${tokenUsage.current?.monthly?.cost?.toFixed(2) || "0.00"}
                  <span style={{ fontSize: "12px", color: "#666", marginLeft: "4px" }}>
                    / ${tokenUsage.budget?.monthly || "0.00"}
                  </span>
                </div>
              </div>
            </>
          )}
        </div>
      </section>

      {/* AI Actions */}
      <section style={{
        background: "white",
        border: "1px solid #e1e3e5",
        borderRadius: "8px",
        padding: "16px",
        marginBottom: "20px"
      }}>
        <h2 style={{ margin: "0 0 12px 0", fontSize: "18px", fontWeight: "bold" }}>AI Actions</h2>
        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
          <button
            onClick={triggerAIWriter}
            disabled={!hasFeatureAccess || isGenerating}
            style={{
              background: !hasFeatureAccess ? "#6c757d" : isGenerating ? "#ffc107" : "#28a745",
              color: isGenerating ? "#000" : "white",
              padding: "8px 16px",
              border: "none",
              borderRadius: "4px",
              cursor: hasFeatureAccess && !isGenerating ? "pointer" : "not-allowed",
              fontSize: "14px",
              minWidth: "180px",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px"
            }}
            title={!hasFeatureAccess ? "Requires Professional+ subscription" : isGenerating ? "AI is generating content..." : "Generate new AI content"}
          >
            {isGenerating ? (
              <>
                <span>⏳</span>
                <span>Generating Content...</span>
              </>
            ) : (
              "Generate New Content"
            )}
          </button>

          <button
            onClick={() => {
              fetchDrafts();
              fetchActivities();
              fetchTokenUsage();
            }}
            style={{
              background: "#007bff",
              color: "white",
              padding: "8px 16px",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
              fontSize: "14px"
            }}
          >
            Refresh Data
          </button>
        </div>
      </section>

      {/* AI Drafts */}
      <section style={{
        background: "white",
        border: "1px solid #e1e3e5",
        borderRadius: "8px",
        padding: "16px",
        marginBottom: "20px"
      }}>
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "16px"
        }}>
          <h2 style={{ margin: 0, fontSize: "18px", fontWeight: "bold" }}>
            AI Generated Drafts ({drafts.length})
          </h2>

          {selectedDraftIndices.length > 0 && (
            <div style={{ display: "flex", gap: "8px" }}>
              <button
                onClick={() => alert("Drafts are already saved in your account and ready to use in campaigns!")}
                style={{
                  background: "#28a745",
                  color: "white",
                  padding: "6px 12px",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                  fontSize: "12px"
                }}
                title="Drafts are automatically saved"
              >
                ✓ Saved ({selectedDraftIndices.length})
              </button>
              <button
                onClick={rejectDrafts}
                style={{
                  background: "#dc3545",
                  color: "white",
                  padding: "6px 12px",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                  fontSize: "12px"
                }}
              >
                Reject
              </button>
            </div>
          )}
        </div>

        {drafts.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px", color: "#666" }}>
            <p>No AI drafts available</p>
            <p style={{ fontSize: "12px" }}>Generate content using the "Generate New Content" button above</p>
          </div>
        ) : (
          <div style={{ display: "grid", gap: "12px" }}>
            {drafts.map((draft, index) => (
              <div
                key={index}
                style={{
                  border: selectedDraftIndices.includes(index) ? "2px solid #007bff" : "1px solid #e1e3e5",
                  borderRadius: "6px",
                  padding: "12px",
                  cursor: "pointer",
                  transition: "all 0.2s ease"
                }}
                onClick={() => toggleDraftSelection(index)}
              >
                <div style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "8px"
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <input
                      type="checkbox"
                      checked={selectedDraftIndices.includes(index)}
                      onChange={() => toggleDraftSelection(index)}
                      style={{ margin: 0 }}
                    />
                    <strong style={{ fontSize: "14px" }}>{draft.theme || "Untitled"}</strong>
                    <span style={{
                      background: draft.type === "default" ? "#e6f3ff" : "#f0f8f0",
                      color: draft.type === "default" ? "#0c5460" : "#155724",
                      padding: "2px 8px",
                      borderRadius: "12px",
                      fontSize: "10px",
                      fontWeight: "bold"
                    }}>
                      {draft.type || "library"}
                    </span>
                  </div>

                  <div style={{
                    padding: "2px 8px",
                    borderRadius: "12px",
                    fontSize: "10px",
                    fontWeight: "bold",
                    background: draft.lint?.ok ? "#d1f2eb" : "#fef2f2",
                    color: draft.lint?.ok ? "#0f5132" : "#dc2626"
                  }}>
                    {draft.lint?.ok ? "Valid" : "Issues"}
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", fontSize: "12px" }}>
                  <div>
                    <div style={{ fontWeight: "bold", marginBottom: "4px", color: "#007bff" }}>
                      Headlines ({draft.headlines?.length || 0})
                    </div>
                    <div style={{ maxHeight: "60px", overflowY: "auto" }}>
                      {draft.headlines?.slice(0, 3).map((headline, i) => (
                        <div key={i} style={{ color: "#666", marginBottom: "2px" }}>
                          {headline}
                        </div>
                      ))}
                      {(draft.headlines?.length || 0) > 3 && (
                        <div style={{ color: "#999", fontStyle: "italic" }}>
                          +{(draft.headlines?.length || 0) - 3} more...
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <div style={{ fontWeight: "bold", marginBottom: "4px", color: "#28a745" }}>
                      Descriptions ({draft.descriptions?.length || 0})
                    </div>
                    <div style={{ maxHeight: "60px", overflowY: "auto" }}>
                      {draft.descriptions?.slice(0, 2).map((desc, i) => (
                        <div key={i} style={{ color: "#666", marginBottom: "2px" }}>
                          {desc}
                        </div>
                      ))}
                      {(draft.descriptions?.length || 0) > 2 && (
                        <div style={{ color: "#999", fontStyle: "italic" }}>
                          +{(draft.descriptions?.length || 0) - 2} more...
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {!draft.lint?.ok && draft.lint?.errors && (
                  <div style={{ marginTop: "8px", fontSize: "11px", color: "#dc2626" }}>
                    Issues: {draft.lint.errors.join(", ")}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* AI Activity Log */}
      <section style={{
        background: "white",
        border: "1px solid #e1e3e5",
        borderRadius: "8px",
        padding: "16px"
      }}>
        <h2 style={{ margin: "0 0 12px 0", fontSize: "18px", fontWeight: "bold" }}>Recent AI Activity</h2>

        {activities.length === 0 ? (
          <div style={{ textAlign: "center", padding: "20px", color: "#666" }}>
            <p>No recent AI activity</p>
          </div>
        ) : (
          <div style={{ display: "grid", gap: "8px" }}>
            {activities.slice(0, 10).map((activity, index) => (
              <div
                key={index}
                style={{
                  padding: "8px 12px",
                  background: "#f8f9fa",
                  borderRadius: "4px",
                  fontSize: "12px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center"
                }}
              >
                <div>
                  <strong>{activity.operation || "AI Operation"}</strong>
                  <span style={{ marginLeft: "8px", color: "#666" }}>
                    {activity.details || "No details available"}
                  </span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{
                    padding: "2px 8px",
                    borderRadius: "12px",
                    fontSize: "10px",
                    fontWeight: "bold",
                    background: activity.status === "success" ? "#d1f2eb" : "#fef2f2",
                    color: activity.status === "success" ? "#0f5132" : "#dc2626"
                  }}>
                    {activity.status || "unknown"}
                  </span>
                  <span style={{ color: "#999", fontSize: "11px" }}>
                    {activity.timestamp ? new Date(activity.timestamp).toLocaleString() : "No timestamp"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}