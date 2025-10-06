import React, { useState, useEffect } from "react";

interface MLInsights {
  timeOfDayTrends?: {
    highPerformanceHours?: number[];
    confidence?: number;
  };
  dayOfWeekTrends?: {
    highPerformanceDays?: number[];
    confidence?: number;
  };
  conversionPrediction?: {
    predictedCPA?: number;
    trend?: string;
    confidence?: number;
  };
  performanceForecasts?: {
    next7Days?: {
      cpa?: number;
      conversions?: number;
      confidence?: number;
    };
    next30Days?: {
      cpa?: number;
      conversions?: number;
      confidence?: number;
    };
  };
}

interface MLState {
  enabled: boolean;
  confidence: number;
  insights?: MLInsights;
  learningState?: {
    maturity: "beginner" | "intermediate" | "advanced";
    dataPoints: number;
  };
}

interface MLAutopilotDashboardProps {
  shopName: string;
  mlState?: MLState;
  onRefresh?: () => void;
}

export function MLAutopilotDashboard({ shopName, mlState, onRefresh }: MLAutopilotDashboardProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string>("");

  const refreshMLState = async () => {
    if (!onRefresh) return;
    setIsLoading(true);
    try {
      await onRefresh();
      setLastUpdated(new Date().toLocaleTimeString());
    } catch (error) {
      console.error("Failed to refresh ML state:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const getMaturityColor = (maturity?: string) => {
    switch (maturity) {
      case "advanced":
        return "#28a745";
      case "intermediate":
        return "#ffc107";
      case "beginner":
        return "#17a2b8";
      default:
        return "#6c757d";
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return "#28a745";
    if (confidence >= 0.6) return "#ffc107";
    if (confidence >= 0.4) return "#fd7e14";
    return "#dc3545";
  };

  const formatHour = (hour: number) => {
    const period = hour >= 12 ? "PM" : "AM";
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${displayHour}${period}`;
  };

  const getDayName = (day: number) => {
    const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    return days[day];
  };

  if (!mlState) {
    return (
      <div style={{
        background: "#f8f9fa",
        border: "1px solid #e9ecef",
        borderRadius: "8px",
        padding: "20px",
        marginTop: "16px"
      }}>
        <h3 style={{ margin: "0 0 12px 0", color: "#495057" }}>
          ML Autopilot Dashboard
        </h3>
        <p style={{ margin: 0, color: "#6c757d" }}>
          ML Autopilot is initializing. Run an autopilot tick to see insights.
        </p>
      </div>
    );
  }

  return (
    <div style={{
      background: "white",
      border: "1px solid #e9ecef",
      borderRadius: "8px",
      padding: "20px",
      marginTop: "16px",
      boxShadow: "0 2px 4px rgba(0,0,0,0.1)"
    }}>
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: "20px"
      }}>
        <h3 style={{ margin: 0, color: "#495057" }}>
          ML Autopilot Dashboard
        </h3>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          {lastUpdated && (
            <span style={{ fontSize: "12px", color: "#6c757d" }}>
              Updated: {lastUpdated}
            </span>
          )}
          <button
            onClick={refreshMLState}
            disabled={isLoading}
            style={{
              background: "#007bff",
              color: "white",
              border: "none",
              borderRadius: "4px",
              padding: "6px 12px",
              fontSize: "12px",
              cursor: isLoading ? "not-allowed" : "pointer",
              opacity: isLoading ? 0.6 : 1
            }}
          >
            {isLoading ? "Refreshing..." : "Refresh"}
          </button>
        </div>
      </div>

      {/* ML Status Overview */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
        gap: "16px",
        marginBottom: "24px"
      }}>
        <div style={{
          background: "#f8f9fa",
          border: "1px solid #e9ecef",
          borderRadius: "6px",
          padding: "12px"
        }}>
          <div style={{
            fontSize: "12px",
            color: "#6c757d",
            marginBottom: "4px"
          }}>
            ML Status
          </div>
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: "8px"
          }}>
            <span style={{
              width: "8px",
              height: "8px",
              borderRadius: "50%",
              background: mlState.enabled ? "#28a745" : "#dc3545"
            }}></span>
            <span style={{
              fontWeight: "bold",
              color: mlState.enabled ? "#28a745" : "#dc3545"
            }}>
              {mlState.enabled ? "ACTIVE" : "LEGACY MODE"}
            </span>
          </div>
        </div>

        <div style={{
          background: "#f8f9fa",
          border: "1px solid #e9ecef",
          borderRadius: "6px",
          padding: "12px"
        }}>
          <div style={{
            fontSize: "12px",
            color: "#6c757d",
            marginBottom: "4px"
          }}>
            Confidence Score
          </div>
          <div style={{
            fontSize: "18px",
            fontWeight: "bold",
            color: getConfidenceColor(mlState.confidence)
          }}>
            {(mlState.confidence * 100).toFixed(1)}%
          </div>
        </div>

        {mlState.learningState && (
          <div style={{
            background: "#f8f9fa",
            border: "1px solid #e9ecef",
            borderRadius: "6px",
            padding: "12px"
          }}>
            <div style={{
              fontSize: "12px",
              color: "#6c757d",
              marginBottom: "4px"
            }}>
              Learning Maturity
            </div>
            <div style={{
              fontSize: "14px",
              fontWeight: "bold",
              color: getMaturityColor(mlState.learningState.maturity),
              textTransform: "uppercase"
            }}>
              {mlState.learningState.maturity}
            </div>
            <div style={{
              fontSize: "11px",
              color: "#6c757d",
              marginTop: "2px"
            }}>
              {mlState.learningState.dataPoints} data points
            </div>
          </div>
        )}
      </div>

      {/* ML Insights */}
      {mlState.insights && (
        <div style={{ marginBottom: "20px" }}>
          <h4 style={{ margin: "0 0 12px 0", color: "#495057" }}>
            Performance Insights
          </h4>

          {/* Time of Day Insights */}
          {mlState.insights.timeOfDayTrends && (
            <div style={{
              background: "#e7f3ff",
              border: "1px solid #b3d9ff",
              borderRadius: "6px",
              padding: "12px",
              marginBottom: "12px"
            }}>
              <div style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "8px"
              }}>
                <span style={{ fontWeight: "bold", fontSize: "14px" }}>
                  Optimal Hours
                </span>
                <span style={{
                  fontSize: "12px",
                  color: "#0c5460",
                  background: "#d1ecf1",
                  padding: "2px 6px",
                  borderRadius: "3px"
                }}>
                  {((mlState.insights.timeOfDayTrends.confidence || 0) * 100).toFixed(0)}% confidence
                </span>
              </div>
              {mlState.insights.timeOfDayTrends.highPerformanceHours?.length ? (
                <div style={{ fontSize: "13px", color: "#0c5460" }}>
                  Best performing hours: {mlState.insights.timeOfDayTrends.highPerformanceHours
                    .map(formatHour)
                    .join(", ")}
                </div>
              ) : (
                <div style={{ fontSize: "13px", color: "#6c757d" }}>
                  Analyzing time patterns...
                </div>
              )}
            </div>
          )}

          {/* Day of Week Insights */}
          {mlState.insights.dayOfWeekTrends && (
            <div style={{
              background: "#fff3cd",
              border: "1px solid #ffeaa7",
              borderRadius: "6px",
              padding: "12px",
              marginBottom: "12px"
            }}>
              <div style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "8px"
              }}>
                <span style={{ fontWeight: "bold", fontSize: "14px" }}>
                  Optimal Days
                </span>
                <span style={{
                  fontSize: "12px",
                  color: "#856404",
                  background: "#ffeaa7",
                  padding: "2px 6px",
                  borderRadius: "3px"
                }}>
                  {((mlState.insights.dayOfWeekTrends.confidence || 0) * 100).toFixed(0)}% confidence
                </span>
              </div>
              {mlState.insights.dayOfWeekTrends.highPerformanceDays?.length ? (
                <div style={{ fontSize: "13px", color: "#856404" }}>
                  Best performing days: {mlState.insights.dayOfWeekTrends.highPerformanceDays
                    .map(getDayName)
                    .join(", ")}
                </div>
              ) : (
                <div style={{ fontSize: "13px", color: "#6c757d" }}>
                  Analyzing day-of-week patterns...
                </div>
              )}
            </div>
          )}

          {/* Conversion Prediction */}
          {mlState.insights.conversionPrediction && (
            <div style={{
              background: "#d4edda",
              border: "1px solid #c3e6cb",
              borderRadius: "6px",
              padding: "12px",
              marginBottom: "12px"
            }}>
              <div style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "8px"
              }}>
                <span style={{ fontWeight: "bold", fontSize: "14px" }}>
                  CPA Prediction
                </span>
                <span style={{
                  fontSize: "12px",
                  color: "#155724",
                  background: "#c3e6cb",
                  padding: "2px 6px",
                  borderRadius: "3px"
                }}>
                  {((mlState.insights.conversionPrediction.confidence || 0) * 100).toFixed(0)}% confidence
                </span>
              </div>
              <div style={{ fontSize: "13px", color: "#155724" }}>
                Predicted CPA: ${mlState.insights.conversionPrediction.predictedCPA?.toFixed(2) || 'N/A'}
                {mlState.insights.conversionPrediction.trend && (
                  <span style={{ marginLeft: "8px" }}>
                    (Trend: {mlState.insights.conversionPrediction.trend})
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Performance Forecasts */}
          {mlState.insights.performanceForecasts && (
            <div style={{
              background: "#f8d7da",
              border: "1px solid #f5c6cb",
              borderRadius: "6px",
              padding: "12px"
            }}>
              <div style={{ fontWeight: "bold", fontSize: "14px", marginBottom: "8px" }}>
                Performance Forecasts
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                {mlState.insights.performanceForecasts.next7Days && (
                  <div>
                    <div style={{ fontSize: "12px", color: "#721c24", fontWeight: "bold" }}>
                      Next 7 Days
                    </div>
                    <div style={{ fontSize: "13px", color: "#721c24" }}>
                      CPA: ${mlState.insights.performanceForecasts.next7Days.cpa?.toFixed(2) || 'N/A'}
                    </div>
                    <div style={{ fontSize: "13px", color: "#721c24" }}>
                      Conversions: {mlState.insights.performanceForecasts.next7Days.conversions?.toFixed(0) || 'N/A'}
                    </div>
                  </div>
                )}
                {mlState.insights.performanceForecasts.next30Days && (
                  <div>
                    <div style={{ fontSize: "12px", color: "#721c24", fontWeight: "bold" }}>
                      Next 30 Days
                    </div>
                    <div style={{ fontSize: "13px", color: "#721c24" }}>
                      CPA: ${mlState.insights.performanceForecasts.next30Days.cpa?.toFixed(2) || 'N/A'}
                    </div>
                    <div style={{ fontSize: "13px", color: "#721c24" }}>
                      Conversions: {mlState.insights.performanceForecasts.next30Days.conversions?.toFixed(0) || 'N/A'}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Manual Override Controls */}
      <div style={{
        borderTop: "1px solid #e9ecef",
        paddingTop: "16px"
      }}>
        <h4 style={{ margin: "0 0 12px 0", color: "#495057" }}>
          ⚙️ Manual Controls
        </h4>
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
          gap: "8px"
        }}>
          <button
            style={{
              background: mlState.enabled ? "#6c757d" : "#28a745",
              color: "white",
              border: "none",
              borderRadius: "4px",
              padding: "8px 12px",
              fontSize: "12px",
              cursor: "pointer"
            }}
            onClick={() => {
              // This would toggle ML mode - in real implementation would call API
              alert(`This would ${mlState.enabled ? 'disable' : 'enable'} ML Autopilot`);
            }}
          >
            {mlState.enabled ? "Switch to Legacy" : "Enable ML Mode"}
          </button>

          <button
            style={{
              background: "#17a2b8",
              color: "white",
              border: "none",
              borderRadius: "4px",
              padding: "8px 12px",
              fontSize: "12px",
              cursor: "pointer"
            }}
            onClick={() => {
              alert("This would force retrain the ML models with latest data");
            }}
          >
            Retrain Models
          </button>

          <button
            style={{
              background: "#dc3545",
              color: "white",
              border: "none",
              borderRadius: "4px",
              padding: "8px 12px",
              fontSize: "12px",
              cursor: "pointer"
            }}
            onClick={() => {
              alert("This would reset all ML learning data");
            }}
          >
            Reset Learning
          </button>
        </div>
      </div>

      {/* Debug Information */}
      {process.env.NODE_ENV === 'development' && (
        <details style={{ marginTop: "16px" }}>
          <summary style={{
            cursor: "pointer",
            fontSize: "12px",
            color: "#6c757d",
            userSelect: "none"
          }}>
            Debug: Raw ML State
          </summary>
          <pre style={{
            background: "#f8f9fa",
            border: "1px solid #e9ecef",
            borderRadius: "4px",
            padding: "8px",
            fontSize: "10px",
            marginTop: "8px",
            overflow: "auto",
            maxHeight: "200px"
          }}>
            {JSON.stringify(mlState, null, 2)}
          </pre>
        </details>
      )}
    </div>
  );
}
