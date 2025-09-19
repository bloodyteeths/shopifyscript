import React, { useState, useEffect } from "react";
import type { LoaderFunctionArgs, ActionFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { 
  useLoaderData, 
  useActionData, 
  Form, 
  useNavigation, 
  useFetcher,
  useRevalidator,
  Link
} from "@remix-run/react";
import { boundary } from "@shopify/shopify-app-remix/server";
import { authenticate } from "../shopify.server";

// Types
interface ReportSettings {
  tier: string;
  frequency: {
    current: string;
    available: string[];
    nextScheduled: string;
  };
  reportTypes: {
    insights: boolean;
    custom: boolean;
    available: string[];
  };
  deliveryOptions: {
    email: boolean;
    dashboard: boolean;
    api: boolean;
  };
  features: {
    weeklyReports: boolean;
    dailyReports: boolean;
    customReports: boolean;
    realTimeData: boolean;
    advancedMetrics: boolean;
    exportFormats: string[];
  };
}

interface ReportHistory {
  id: string;
  tenant: string;
  type: string;
  status: string;
  generatedAt: string;
  sentAt: string;
  generationTime: number;
  emailSent: boolean;
  downloadUrl?: string;
}

// Loader - fetch report settings and history
export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const shop = session.shop.replace(".myshopify.com", "");

  try {
    // Fetch report settings
    const settingsResponse = await fetch(
      `${process.env.BACKEND_URL}/api/reports/settings?tenant=${shop}`,
      {
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
    
    const settingsData = await settingsResponse.json();
    
    // Fetch report history
    const historyResponse = await fetch(
      `${process.env.BACKEND_URL}/api/reports/history?tenant=${shop}&limit=10`,
      {
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
    
    const historyData = await historyResponse.json();

    // Fetch scheduler status
    const statusResponse = await fetch(
      `${process.env.BACKEND_URL}/api/reports/schedule/status?tenant=${shop}`,
      {
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
    
    const statusData = await statusResponse.json();

    return json({
      settings: settingsData.settings || {},
      history: historyData.history || [],
      schedulerStatus: statusData.scheduler || {},
      tenant: shop,
    });

  } catch (error) {
    console.error("Failed to load reports data:", error);
    return json({
      settings: {},
      history: [],
      schedulerStatus: {},
      tenant: shop,
      error: "Failed to load reports data"
    });
  }
};

// Action - handle form submissions
export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const shop = session.shop.replace(".myshopify.com", "");
  const formData = await request.formData();
  const action = formData.get("action") as string;

  try {
    switch (action) {
      case "generate": {
        const reportType = formData.get("reportType") as string || "insights";
        const email = formData.get("email") as string;
        const format = formData.get("format") as string || "email";

        const params = new URLSearchParams({
          tenant: shop,
          type: reportType,
          format
        });

        if (email) params.append("email", email);

        const response = await fetch(
          `${process.env.BACKEND_URL}/api/reports/generate?${params}`,
          {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            },
          }
        );

        const data = await response.json();
        return json({ success: data.ok, message: data.message || "Report generated", data });
      }

      case "test": {
        const email = formData.get("email") as string;
        
        if (!email) {
          return json({ success: false, message: "Email address required for test" });
        }

        const response = await fetch(
          `${process.env.BACKEND_URL}/api/reports/test`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ tenant: shop, email, type: "insights" })
          }
        );

        const data = await response.json();
        return json({ 
          success: data.ok, 
          message: data.ok ? "Test report sent successfully!" : "Test failed",
          data 
        });
      }

      case "updateSettings": {
        const frequency = formData.get("frequency") as string;
        
        const response = await fetch(
          `${process.env.BACKEND_URL}/api/reports/settings`,
          {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              tenant: shop,
              settings: { frequency }
            })
          }
        );

        const data = await response.json();
        return json({ 
          success: data.ok, 
          message: data.ok ? "Settings updated!" : "Failed to update settings" 
        });
      }

      default:
        return json({ success: false, message: "Unknown action" });
    }
  } catch (error) {
    console.error("Action error:", error);
    return json({ success: false, message: "Operation failed" });
  }
};

// Component
export default function ReportsPage() {
  const { settings, history, schedulerStatus, tenant, error } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const revalidator = useRevalidator();
  const generateFetcher = useFetcher();
  
  const [testEmail, setTestEmail] = useState("");
  const [generateEmail, setGenerateEmail] = useState("");

  // Auto-refresh data periodically
  useEffect(() => {
    const interval = setInterval(() => {
      revalidator.revalidate();
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, [revalidator]);

  const isLoading = navigation.state === "loading" || navigation.state === "submitting";
  const tierColors = {
    starter: "#28a745",
    professional: "#007bff", 
    enterprise: "#ffc107"
  };

  if (error) {
    return (
      <div style={{ padding: "20px" }}>
        <div style={{ 
          background: "#f8d7da", 
          color: "#721c24", 
          padding: "15px", 
          borderRadius: "4px",
          marginBottom: "20px"
        }}>
          <strong>Error:</strong> {error}
        </div>
        <Link 
          to="/app" 
          style={{ 
            color: "#007bff", 
            textDecoration: "none" 
          }}
        >
          ← Back to Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div style={{ padding: "20px", maxWidth: "1200px" }}>
      <div style={{ marginBottom: "30px" }}>
        <h1>Automated Reports</h1>
        <p style={{ color: "#666", marginBottom: "20px" }}>
          Manage your automated insights reports and delivery settings
        </p>

        {/* Tier Badge */}
        <div 
          style={{
            display: "inline-block",
            background: tierColors[settings.tier as keyof typeof tierColors] || "#6c757d",
            color: "white",
            padding: "4px 12px",
            borderRadius: "20px",
            fontSize: "12px",
            fontWeight: "600",
            textTransform: "uppercase",
            marginBottom: "20px"
          }}
        >
          {settings.tier} Plan
        </div>
      </div>

      {/* Action Result */}
      {actionData && (
        <div 
          style={{ 
            background: actionData.success ? "#d4edda" : "#f8d7da",
            color: actionData.success ? "#155724" : "#721c24",
            padding: "15px",
            borderRadius: "4px",
            marginBottom: "20px",
            border: `1px solid ${actionData.success ? "#c3e6cb" : "#f5c6cb"}`
          }}
        >
          <strong>{actionData.success ? "Success:" : "Error:"}</strong> {actionData.message}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "30px" }}>
        {/* Left Column - Settings & Actions */}
        <div>
          {/* Report Settings */}
          <div style={{ 
            background: "white", 
            border: "1px solid #ddd", 
            borderRadius: "8px", 
            padding: "20px", 
            marginBottom: "20px" 
          }}>
            <h2 style={{ marginTop: 0, marginBottom: "15px" }}>Report Settings</h2>
            
            <div style={{ marginBottom: "15px" }}>
              <strong>Current Frequency:</strong> 
              <span style={{ 
                background: "#e9ecef", 
                padding: "2px 8px", 
                borderRadius: "4px", 
                marginLeft: "8px",
                textTransform: "capitalize" 
              }}>
                {settings.frequency?.current || "Not set"}
              </span>
            </div>

            <div style={{ marginBottom: "15px" }}>
              <strong>Next Scheduled:</strong> 
              <span style={{ marginLeft: "8px", color: "#666" }}>
                {settings.frequency?.nextScheduled 
                  ? new Date(settings.frequency.nextScheduled).toLocaleString()
                  : "Not scheduled"
                }
              </span>
            </div>

            <div style={{ marginBottom: "15px" }}>
              <strong>Available Features:</strong>
              <div style={{ marginTop: "8px" }}>
                {settings.features && Object.entries(settings.features).map(([key, value]) => (
                  <div key={key} style={{ marginBottom: "4px" }}>
                    <span style={{ 
                      color: value ? "#28a745" : "#dc3545",
                      marginRight: "8px" 
                    }}>
                      {value ? "✓" : "✗"}
                    </span>
                    <span style={{ textTransform: "capitalize" }}>
                      {key.replace(/([A-Z])/g, " $1").toLowerCase()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Generate Report */}
          <div style={{ 
            background: "white", 
            border: "1px solid #ddd", 
            borderRadius: "8px", 
            padding: "20px", 
            marginBottom: "20px" 
          }}>
            <h2 style={{ marginTop: 0, marginBottom: "15px" }}>Generate Report Now</h2>
            
            <Form method="post">
              <input type="hidden" name="action" value="generate" />
              
              <div style={{ marginBottom: "15px" }}>
                <label style={{ display: "block", marginBottom: "5px", fontWeight: "500" }}>
                  Report Type:
                </label>
                <select 
                  name="reportType"
                  style={{ 
                    width: "100%", 
                    padding: "8px", 
                    border: "1px solid #ddd", 
                    borderRadius: "4px" 
                  }}
                >
                  <option value="insights">Insights Report</option>
                  {settings.reportTypes?.custom && (
                    <option value="custom">Custom Report</option>
                  )}
                </select>
              </div>

              <div style={{ marginBottom: "15px" }}>
                <label style={{ display: "block", marginBottom: "5px", fontWeight: "500" }}>
                  Email Address:
                </label>
                <input 
                  type="email"
                  name="email"
                  value={generateEmail}
                  onChange={(e) => setGenerateEmail(e.target.value)}
                  placeholder="your@email.com"
                  style={{ 
                    width: "100%", 
                    padding: "8px", 
                    border: "1px solid #ddd", 
                    borderRadius: "4px" 
                  }}
                />
              </div>

              <button 
                type="submit"
                disabled={isLoading}
                style={{
                  background: "#007bff",
                  color: "white",
                  border: "none",
                  padding: "10px 20px",
                  borderRadius: "4px",
                  cursor: isLoading ? "not-allowed" : "pointer",
                  opacity: isLoading ? 0.6 : 1
                }}
              >
                {isLoading ? "Generating..." : "Generate & Send Report"}
              </button>
            </Form>
          </div>

          {/* Test Email */}
          <div style={{ 
            background: "white", 
            border: "1px solid #ddd", 
            borderRadius: "8px", 
            padding: "20px" 
          }}>
            <h2 style={{ marginTop: 0, marginBottom: "15px" }}>Test Email Delivery</h2>
            <p style={{ color: "#666", marginBottom: "15px", fontSize: "14px" }}>
              Send a test report to verify email delivery is working properly.
            </p>
            
            <Form method="post">
              <input type="hidden" name="action" value="test" />
              
              <div style={{ marginBottom: "15px" }}>
                <label style={{ display: "block", marginBottom: "5px", fontWeight: "500" }}>
                  Test Email Address:
                </label>
                <input 
                  type="email"
                  name="email"
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                  placeholder="test@email.com"
                  required
                  style={{ 
                    width: "100%", 
                    padding: "8px", 
                    border: "1px solid #ddd", 
                    borderRadius: "4px" 
                  }}
                />
              </div>

              <button 
                type="submit"
                disabled={isLoading || !testEmail}
                style={{
                  background: "#28a745",
                  color: "white",
                  border: "none",
                  padding: "10px 20px",
                  borderRadius: "4px",
                  cursor: (isLoading || !testEmail) ? "not-allowed" : "pointer",
                  opacity: (isLoading || !testEmail) ? 0.6 : 1
                }}
              >
                {isLoading ? "Sending..." : "Send Test Report"}
              </button>
            </Form>
          </div>
        </div>

        {/* Right Column - Status & History */}
        <div>
          {/* Scheduler Status */}
          <div style={{ 
            background: "white", 
            border: "1px solid #ddd", 
            borderRadius: "8px", 
            padding: "20px", 
            marginBottom: "20px" 
          }}>
            <h2 style={{ marginTop: 0, marginBottom: "15px" }}>Scheduler Status</h2>
            
            <div style={{ marginBottom: "10px" }}>
              <strong>Status:</strong> 
              <span style={{ 
                color: schedulerStatus.status === "running" ? "#28a745" : "#dc3545",
                marginLeft: "8px",
                fontWeight: "500"
              }}>
                {schedulerStatus.status === "running" ? "Active" : "Inactive"}
              </span>
            </div>

            {schedulerStatus.metrics && (
              <div>
                <div style={{ marginBottom: "5px" }}>
                  <strong>Reports Generated:</strong> {schedulerStatus.metrics.reportsGenerated || 0}
                </div>
                <div style={{ marginBottom: "5px" }}>
                  <strong>Emails Sent:</strong> {schedulerStatus.metrics.emailsSent || 0}
                </div>
                <div style={{ marginBottom: "5px" }}>
                  <strong>Last Execution:</strong> 
                  <span style={{ marginLeft: "4px", fontSize: "14px", color: "#666" }}>
                    {schedulerStatus.metrics.lastExecution 
                      ? new Date(schedulerStatus.metrics.lastExecution).toLocaleString()
                      : "Never"
                    }
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Report History */}
          <div style={{ 
            background: "white", 
            border: "1px solid #ddd", 
            borderRadius: "8px", 
            padding: "20px" 
          }}>
            <h2 style={{ marginTop: 0, marginBottom: "15px" }}>Recent Reports</h2>
            
            {history.length === 0 ? (
              <p style={{ color: "#666", fontStyle: "italic" }}>No reports generated yet</p>
            ) : (
              <div>
                {history.map((report: ReportHistory) => (
                  <div 
                    key={report.id}
                    style={{
                      border: "1px solid #eee",
                      borderRadius: "4px",
                      padding: "12px",
                      marginBottom: "10px",
                      background: "#f8f9fa"
                    }}
                  >
                    <div style={{ 
                      display: "flex", 
                      justifyContent: "space-between", 
                      alignItems: "flex-start",
                      marginBottom: "8px" 
                    }}>
                      <span style={{ 
                        fontWeight: "500",
                        textTransform: "capitalize" 
                      }}>
                        {report.type} Report
                      </span>
                      <span style={{
                        background: report.status === "completed" ? "#d4edda" : "#f8d7da",
                        color: report.status === "completed" ? "#155724" : "#721c24",
                        padding: "2px 6px",
                        borderRadius: "4px",
                        fontSize: "12px",
                        textTransform: "capitalize"
                      }}>
                        {report.status}
                      </span>
                    </div>
                    
                    <div style={{ fontSize: "14px", color: "#666" }}>
                      <div>Generated: {new Date(report.generatedAt).toLocaleString()}</div>
                      <div>Generation Time: {report.generationTime}ms</div>
                      <div>
                        Email: {report.emailSent ? (
                          <span style={{ color: "#28a745" }}>✓ Sent</span>
                        ) : (
                          <span style={{ color: "#dc3545" }}>✗ Failed</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Upgrade Prompt for Starter */}
      {settings.tier === "starter" && (
        <div style={{ 
          background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
          color: "white",
          padding: "20px",
          borderRadius: "8px",
          marginTop: "30px",
          textAlign: "center"
        }}>
          <h3 style={{ marginTop: 0 }}>Upgrade to Professional</h3>
          <p style={{ marginBottom: "15px" }}>
            Get weekly reports, real-time analytics, and advanced ROAS tracking
          </p>
          <Link 
            to="/app/billing"
            style={{
              background: "white",
              color: "#667eea",
              padding: "10px 24px",
              borderRadius: "4px",
              textDecoration: "none",
              fontWeight: "500",
              display: "inline-block"
            }}
          >
            Upgrade Now
          </Link>
        </div>
      )}

      {/* Enterprise Custom Reports */}
      {settings.tier === "enterprise" && (
        <div style={{ 
          background: "white", 
          border: "1px solid #ddd", 
          borderRadius: "8px", 
          padding: "20px",
          marginTop: "30px"
        }}>
          <h2 style={{ marginTop: 0, marginBottom: "15px" }}>Enterprise Custom Reports</h2>
          <p style={{ color: "#666", marginBottom: "15px" }}>
            Create custom reports with advanced analytics and forecasting
          </p>
          
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "15px" }}>
            <div style={{ border: "1px solid #eee", padding: "15px", borderRadius: "4px" }}>
              <h4 style={{ marginTop: 0, marginBottom: "8px" }}>Executive Summary</h4>
              <p style={{ fontSize: "14px", color: "#666", marginBottom: "10px" }}>
                High-level KPIs and strategic insights
              </p>
              <button style={{
                background: "#ffc107",
                color: "#212529",
                border: "none",
                padding: "6px 12px",
                borderRadius: "4px",
                fontSize: "12px",
                cursor: "pointer"
              }}>
                Generate
              </button>
            </div>
            
            <div style={{ border: "1px solid #eee", padding: "15px", borderRadius: "4px" }}>
              <h4 style={{ marginTop: 0, marginBottom: "8px" }}>Customer Lifecycle</h4>
              <p style={{ fontSize: "14px", color: "#666", marginBottom: "10px" }}>
                Detailed customer journey and lifetime value analysis
              </p>
              <button style={{
                background: "#ffc107",
                color: "#212529",
                border: "none",
                padding: "6px 12px",
                borderRadius: "4px",
                fontSize: "12px",
                cursor: "pointer"
              }}>
                Generate
              </button>
            </div>
            
            <div style={{ border: "1px solid #eee", padding: "15px", borderRadius: "4px" }}>
              <h4 style={{ marginTop: 0, marginBottom: "8px" }}>Performance Benchmarks</h4>
              <p style={{ fontSize: "14px", color: "#666", marginBottom: "10px" }}>
                Compare performance against industry benchmarks
              </p>
              <button style={{
                background: "#ffc107",
                color: "#212529",
                border: "none",
                padding: "6px 12px",
                borderRadius: "4px",
                fontSize: "12px",
                cursor: "pointer"
              }}>
                Generate
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Back to Dashboard */}
      <div style={{ marginTop: "30px", textAlign: "center" }}>
        <Link 
          to="/app" 
          style={{ 
            color: "#007bff", 
            textDecoration: "none",
            fontSize: "14px"
          }}
        >
          ← Back to Dashboard
        </Link>
      </div>
    </div>
  );
}

export const ErrorBoundary = boundary.error(({ error }) => {
  console.error(error);
  return <div>Something went wrong with the reports page</div>;
});

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};