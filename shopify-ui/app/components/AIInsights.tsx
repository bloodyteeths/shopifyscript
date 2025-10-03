/**
 * AI Insights Component
 * Displays AI-generated recommendations and performance insights
 */

import * as React from "react";
import { authenticatedFetch } from "../utils/ai-client";

interface AIInsightsProps {
  shopName: string;
  period: string;
  onRefresh?: () => void;
}

interface Insight {
  id: string;
  type: string;
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  impact?: string;
  effort?: string;
  actions?: string[];
  expectedSavings?: string;
  campaign?: string;
  data?: any[];
}

interface AIInsightsData {
  overview: any[];
  recommendations: Insight[];
  costOptimization: {
    totalWaste: number;
    suggestions: any[];
    quickWins: any[];
  };
  performance: {
    insights: any[];
    topPerformers: any[];
    underperformers: any[];
  };
  trends: {
    insights: any[];
  };
  timestamp: string;
  period: string;
}

const priorityColors = {
  high: { bg: '#fee2e2', border: '#dc2626', text: '#dc2626' },
  medium: { bg: '#fef3c7', border: '#d97706', text: '#d97706' },
  low: { bg: '#e0f2fe', border: '#0369a1', text: '#0369a1' }
};

export function AIInsights({ shopName, period, onRefresh }: AIInsightsProps) {
  const [insights, setInsights] = React.useState<AIInsightsData | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [expandedRecommendations, setExpandedRecommendations] = React.useState<Set<string>>(new Set());
  // Load AI insights on component mount and when period changes
  React.useEffect(() => {
    if (shopName && period) {
      loadInsights();
    }
  }, [shopName, period]);

  const loadInsights = async () => {
    if (loading) return;

    setLoading(true);
    setError(null);

    try {
      const response = await authenticatedFetch(
        `/ai/insights?period=${period}`,
        "GET",
        undefined,
        shopName
      );

      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          setInsights(result.data);
        } else {
          throw new Error('Failed to load AI insights');
        }
      } else {
        throw new Error(`HTTP ${response.status}: Failed to fetch AI insights`);
      }

    } catch (err) {
      console.error('Error loading AI insights:', err);
      setError(err instanceof Error ? err.message : 'Failed to load AI insights');
    } finally {
      setLoading(false);
    }
  };

  const toggleRecommendation = (id: string) => {
    const newExpanded = new Set(expandedRecommendations);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedRecommendations(newExpanded);
  };

  if (loading) {
    return (
      <div style={{
        background: 'white',
        border: '1px solid #e3e3e3',
        borderRadius: '8px',
        padding: '32px',
        textAlign: 'center',
        marginBottom: '24px'
      }}>
        <div style={{ color: '#666', marginBottom: '16px' }}>🤖 Generating AI insights...</div>
        <div style={{
          width: '32px',
          height: '32px',
          border: '3px solid #f3f4f6',
          borderTop: '3px solid #008060',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
          margin: '0 auto'
        }}></div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        background: 'white',
        border: '1px solid #f87171',
        borderRadius: '8px',
        padding: '24px',
        marginBottom: '24px'
      }}>
        <h3 style={{ color: '#dc2626', margin: '0 0 12px 0', fontSize: '16px', fontWeight: '600' }}>
          AI Insights Unavailable
        </h3>
        <p style={{ color: '#666', margin: '0 0 16px 0', fontSize: '14px' }}>
          {error}
        </p>
        <button
          onClick={loadInsights}
          style={{
            background: '#008060',
            color: 'white',
            border: 'none',
            padding: '8px 16px',
            borderRadius: '6px',
            fontSize: '13px',
            cursor: 'pointer'
          }}
        >
          Retry
        </button>
      </div>
    );
  }

  if (!insights) {
    return null;
  }

  const highPriorityCount = insights.recommendations?.filter(r => r.priority === 'high').length || 0;
  const totalSavings = insights.costOptimization?.totalWaste || 0;

  return (
    <div style={{ marginBottom: '32px' }}>
      {/* AI Insights Header */}
      <div style={{
        background: 'white',
        border: '1px solid #e3e3e3',
        borderRadius: '8px',
        padding: '24px',
        marginBottom: '16px',
        boxShadow: '0 1px 0 rgba(0, 0, 0, 0.05)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <h2 style={{
              fontSize: '20px',
              fontWeight: '600',
              color: '#202223',
              margin: '0 0 8px 0',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              🤖 AI-Powered Insights
            </h2>
            <p style={{ color: '#616161', margin: '0', fontSize: '14px' }}>
              Generated {new Date(insights.timestamp).toLocaleString()} • {period} period
            </p>
          </div>
          <button
            onClick={loadInsights}
            disabled={loading}
            style={{
              background: loading ? '#c9cccf' : '#008060',
              color: 'white',
              border: 'none',
              padding: '8px 16px',
              borderRadius: '6px',
              fontSize: '13px',
              fontWeight: '500',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.6 : 1
            }}
          >
            {loading ? 'Refreshing...' : 'Refresh Insights'}
          </button>
        </div>

        {/* Quick Stats */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '16px'
        }}>
          <div style={{
            background: '#f6f6f7',
            padding: '16px',
            borderRadius: '6px',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '24px', fontWeight: '700', color: '#202223', marginBottom: '4px' }}>
              {insights.recommendations?.length || 0}
            </div>
            <div style={{ fontSize: '12px', color: '#616161', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Total Recommendations
            </div>
          </div>

          {highPriorityCount > 0 && (
            <div style={{
              background: '#fee2e2',
              padding: '16px',
              borderRadius: '6px',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '24px', fontWeight: '700', color: '#dc2626', marginBottom: '4px' }}>
                {highPriorityCount}
              </div>
              <div style={{ fontSize: '12px', color: '#dc2626', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                High Priority Issues
              </div>
            </div>
          )}

          {totalSavings > 0 && (
            <div style={{
              background: '#d1eddd',
              padding: '16px',
              borderRadius: '6px',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '24px', fontWeight: '700', color: '#28a745', marginBottom: '4px' }}>
                ${totalSavings.toFixed(0)}
              </div>
              <div style={{ fontSize: '12px', color: '#28a745', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Potential Savings
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Recommendations Section */}
      {insights.recommendations && insights.recommendations.length > 0 && (
        <div style={{
          background: 'white',
          border: '1px solid #e3e3e3',
          borderRadius: '8px',
          padding: '24px',
          marginBottom: '16px',
          boxShadow: '0 1px 0 rgba(0, 0, 0, 0.05)'
        }}>
          <h3 style={{
            fontSize: '16px',
            fontWeight: '600',
            color: '#202223',
            margin: '0 0 16px 0'
          }}>
            Actionable Recommendations
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {insights.recommendations.slice(0, 5).map((recommendation) => {
              const isExpanded = expandedRecommendations.has(recommendation.id);
              const colors = priorityColors[recommendation.priority];

              return (
                <div
                  key={recommendation.id}
                  style={{
                    border: `1px solid ${colors.border}`,
                    borderRadius: '8px',
                    padding: '16px',
                    background: colors.bg
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                        <span style={{
                          fontSize: '12px',
                          fontWeight: '700',
                          color: colors.text,
                          background: 'rgba(255, 255, 255, 0.7)',
                          padding: '2px 8px',
                          borderRadius: '12px',
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px'
                        }}>
                          {recommendation.priority} PRIORITY
                        </span>
                      </div>
                      <h4 style={{
                        fontSize: '16px',
                        fontWeight: '600',
                        color: '#202223',
                        margin: '0 0 8px 0'
                      }}>
                        {recommendation.title}
                      </h4>
                      <p style={{ color: '#666', margin: '0', fontSize: '14px' }}>
                        {recommendation.description}
                      </p>
                    </div>

                    <button
                      onClick={() => toggleRecommendation(recommendation.id)}
                      style={{
                        background: 'rgba(255, 255, 255, 0.8)',
                        border: `1px solid ${colors.border}`,
                        color: colors.text,
                        padding: '6px 12px',
                        borderRadius: '4px',
                        fontSize: '12px',
                        cursor: 'pointer',
                        fontWeight: '500'
                      }}
                    >
                      {isExpanded ? 'Hide Details' : 'Show Details'}
                    </button>
                  </div>

                  {isExpanded && (
                    <div style={{
                      background: 'rgba(255, 255, 255, 0.5)',
                      padding: '16px',
                      borderRadius: '6px',
                      marginTop: '12px'
                    }}>
                      {recommendation.actions && recommendation.actions.length > 0 && (
                        <div style={{ marginBottom: '12px' }}>
                          <strong style={{ color: '#202223', fontSize: '14px' }}>Action Items:</strong>
                          <ul style={{ margin: '8px 0', paddingLeft: '20px' }}>
                            {recommendation.actions.map((action, index) => (
                              <li key={index} style={{ color: '#666', fontSize: '14px', marginBottom: '4px' }}>
                                {action}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      <div style={{ display: 'flex', gap: '16px', fontSize: '13px' }}>
                        {recommendation.impact && (
                          <div>
                            <strong style={{ color: '#202223' }}>Impact:</strong>{' '}
                            <span style={{ color: '#666' }}>{recommendation.impact}</span>
                          </div>
                        )}
                        {recommendation.effort && (
                          <div>
                            <strong style={{ color: '#202223' }}>Effort:</strong>{' '}
                            <span style={{ color: '#666' }}>{recommendation.effort}</span>
                          </div>
                        )}
                        {recommendation.expectedSavings && (
                          <div>
                            <strong style={{ color: '#28a745' }}>Expected Savings:</strong>{' '}
                            <span style={{ color: '#28a745' }}>{recommendation.expectedSavings}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {insights.recommendations.length > 5 && (
            <div style={{ textAlign: 'center', marginTop: '16px' }}>
              <p style={{ color: '#666', fontSize: '14px' }}>
                Showing 5 of {insights.recommendations.length} recommendations
              </p>
            </div>
          )}
        </div>
      )}

      {/* Performance Insights */}
      {insights.performance?.insights && insights.performance.insights.length > 0 && (
        <div style={{
          background: 'white',
          border: '1px solid #e3e3e3',
          borderRadius: '8px',
          padding: '24px',
          marginBottom: '16px',
          boxShadow: '0 1px 0 rgba(0, 0, 0, 0.05)'
        }}>
          <h3 style={{
            fontSize: '16px',
            fontWeight: '600',
            color: '#202223',
            margin: '0 0 16px 0'
          }}>
            Performance Analysis
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {insights.performance.insights.map((insight, index) => (
              <div
                key={index}
                style={{
                  padding: '16px',
                  background: '#f6f6f7',
                  borderRadius: '6px',
                  borderLeft: '4px solid #008060'
                }}
              >
                <div style={{
                  fontSize: '14px',
                  fontWeight: '600',
                  color: '#202223',
                  marginBottom: '8px'
                }}>
                  {insight.title}
                </div>
                <div style={{ color: '#666', fontSize: '14px', marginBottom: '8px' }}>
                  {insight.description}
                </div>
                {insight.action && (
                  <div style={{
                    fontSize: '13px',
                    color: '#008060',
                    fontWeight: '500'
                  }}>
                    💡 {insight.action}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick Wins */}
      {insights.costOptimization?.quickWins && insights.costOptimization.quickWins.length > 0 && (
        <div style={{
          background: 'white',
          border: '1px solid #e3e3e3',
          borderRadius: '8px',
          padding: '24px',
          boxShadow: '0 1px 0 rgba(0, 0, 0, 0.05)'
        }}>
          <h3 style={{
            fontSize: '16px',
            fontWeight: '600',
            color: '#202223',
            margin: '0 0 16px 0'
          }}>
            ⚡ Quick Wins
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px' }}>
            {insights.costOptimization.quickWins.map((win, index) => (
              <div
                key={index}
                style={{
                  padding: '16px',
                  background: '#e7f3ff',
                  border: '1px solid #90caf9',
                  borderRadius: '6px'
                }}
              >
                <div style={{
                  fontSize: '14px',
                  fontWeight: '600',
                  color: '#1976d2',
                  marginBottom: '8px'
                }}>
                  {win.title}
                </div>
                <div style={{ color: '#666', fontSize: '14px', marginBottom: '12px' }}>
                  {win.description}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                  <span style={{ color: '#666' }}>
                    <strong>Effort:</strong> {win.effort}
                  </span>
                  <span style={{ color: '#1976d2' }}>
                    <strong>Impact:</strong> {win.impact}
                  </span>
                  <span style={{ color: '#666' }}>
                    <strong>Time:</strong> {win.timeToImplement}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Add CSS animation for loading spinner
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = `
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
  `;
  document.head.appendChild(style);
}
