import React, { useState, useEffect } from "react";

interface AIStatusProps {
  shopName: string;
  compact?: boolean;
  showTokenUsage?: boolean;
}

interface AIStatus {
  overall: string;
  services: {
    aiProvider: {
      status: string;
      initialized: boolean;
    };
    tokenMonitor: {
      status: string;
      tenantsTracked: number;
    };
    automation: {
      status: string;
      totalTenants: number;
    };
  };
  tenant: {
    health: string;
    alerts: Array<{
      active: boolean;
      message: string;
      severity: string;
    }>;
  };
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

export function AIStatusIndicator({ shopName, compact = false, showTokenUsage = false }: AIStatusProps) {
  const [status, setStatus] = useState<AIStatus | null>(null);
  const [tokenUsage, setTokenUsage] = useState<TokenUsage | null>(null);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const fetchAIStatus = async () => {
    if (!shopName) return;

    setLoading(true);
    try {
      const { backendFetch } = await import("../server/hmac.server");

      // Fetch AI health status
      const healthResponse = await backendFetch("/ai/health", "GET", undefined, shopName);
      if (healthResponse.status >= 200 && healthResponse.status < 300) {
        const healthData = healthResponse.json;
        if (healthData.ok) {
          setStatus(healthData.health);
        }
      }

      // Fetch token usage if requested
      if (showTokenUsage) {
        const tokenResponse = await backendFetch("/ai/tokens/usage", "GET", undefined, shopName);
        if (tokenResponse.status >= 200 && tokenResponse.status < 300) {
          const tokenData = tokenResponse.json;
          if (tokenData.ok) {
            setTokenUsage(tokenData.usage);
          }
        }
      }
    } catch (error) {
      console.error("Failed to fetch AI status:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (shopName) {
      fetchAIStatus();
      // Auto-refresh every 30 seconds
      const interval = setInterval(fetchAIStatus, 30000);
      return () => clearInterval(interval);
    }
  }, [shopName, showTokenUsage]);

  const getStatusColor = (statusValue: string) => {
    switch (statusValue?.toLowerCase()) {
      case 'healthy':
      case 'active':
        return { bg: '#d1f2eb', color: '#0f5132', icon: '✅' };
      case 'degraded':
      case 'warning':
        return { bg: '#fef3c7', color: '#d97706', icon: '⚠️' };
      case 'unhealthy':
      case 'error':
      case 'inactive':
        return { bg: '#fef2f2', color: '#dc2626', icon: '❌' };
      default:
        return { bg: '#f8f9fa', color: '#6c757d', icon: '❓' };
    }
  };

  const getTokenUsageStatus = () => {
    if (!tokenUsage) return null;

    const dailyCost = tokenUsage.current?.daily?.cost || 0;
    const dailyBudget = tokenUsage.budget?.daily || 0;
    const usagePercent = dailyBudget > 0 ? (dailyCost / dailyBudget) * 100 : 0;

    if (usagePercent > 90) {
      return { status: 'critical', color: '#dc2626', message: 'Near budget limit' };
    } else if (usagePercent > 70) {
      return { status: 'warning', color: '#d97706', message: 'High usage' };
    } else {
      return { status: 'normal', color: '#28a745', message: 'Normal usage' };
    }
  };

  if (loading && !status) {
    return (
      <div style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        padding: compact ? '2px 6px' : '4px 8px',
        borderRadius: '12px',
        background: '#f8f9fa',
        color: '#6c757d',
        fontSize: compact ? '10px' : '12px',
        fontWeight: 'bold'
      }}>
        <span>⏳</span>
        {!compact && <span>Checking AI...</span>}
      </div>
    );
  }

  if (!status) {
    return (
      <div style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        padding: compact ? '2px 6px' : '4px 8px',
        borderRadius: '12px',
        background: '#f8f9fa',
        color: '#6c757d',
        fontSize: compact ? '10px' : '12px',
        fontWeight: 'bold'
      }}>
        <span>❓</span>
        {!compact && <span>AI Status Unknown</span>}
      </div>
    );
  }

  const overallStatus = getStatusColor(status.overall);
  const activeAlerts = status.tenant?.alerts?.filter(alert => alert.active) || [];
  const tokenStatus = getTokenUsageStatus();

  if (compact) {
    return (
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px',
          padding: '2px 6px',
          borderRadius: '12px',
          background: overallStatus.bg,
          color: overallStatus.color,
          fontSize: '10px',
          fontWeight: 'bold',
          cursor: expanded ? 'default' : 'pointer',
          position: 'relative'
        }}
        onClick={() => !expanded && setExpanded(true)}
        title={`AI Status: ${status.overall} • Click for details`}
      >
        <span>{overallStatus.icon}</span>
        <span>AI</span>
        {activeAlerts.length > 0 && (
          <span style={{
            background: '#dc2626',
            color: 'white',
            borderRadius: '50%',
            width: '12px',
            height: '12px',
            fontSize: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            {activeAlerts.length}
          </span>
        )}

        {/* Expanded details */}
        {expanded && (
          <div style={{
            position: 'absolute',
            top: '100%',
            right: 0,
            marginTop: '4px',
            background: 'white',
            border: '1px solid #e1e3e5',
            borderRadius: '6px',
            padding: '8px',
            minWidth: '200px',
            boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
            zIndex: 1000,
            fontSize: '11px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <strong>AI System Status</strong>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setExpanded(false);
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#6c757d',
                  fontSize: '12px'
                }}
              >
                ✕
              </button>
            </div>

            <div style={{ display: 'grid', gap: '4px', marginBottom: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Overall:</span>
                <span style={{ color: overallStatus.color, fontWeight: 'bold' }}>
                  {overallStatus.icon} {status.overall}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Provider:</span>
                <span style={{ color: getStatusColor(status.services?.aiProvider?.status).color }}>
                  {status.services?.aiProvider?.status || 'unknown'}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Automation:</span>
                <span style={{ color: getStatusColor(status.services?.automation?.status).color }}>
                  {status.services?.automation?.status || 'unknown'}
                </span>
              </div>
            </div>

            {showTokenUsage && tokenStatus && (
              <div style={{ marginBottom: '8px', paddingTop: '4px', borderTop: '1px solid #e1e3e5' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>Token Usage:</span>
                  <span style={{ color: tokenStatus.color, fontWeight: 'bold', fontSize: '10px' }}>
                    {tokenStatus.message}
                  </span>
                </div>
                {tokenUsage && (
                  <div style={{ fontSize: '10px', color: '#666', marginTop: '2px' }}>
                    ${tokenUsage.current?.daily?.cost?.toFixed(2) || '0.00'} / ${tokenUsage.budget?.daily || '0.00'} daily
                  </div>
                )}
              </div>
            )}

            {activeAlerts.length > 0 && (
              <div style={{ paddingTop: '4px', borderTop: '1px solid #e1e3e5' }}>
                <div style={{ fontWeight: 'bold', marginBottom: '4px', color: '#dc2626' }}>
                  Alerts ({activeAlerts.length}):
                </div>
                {activeAlerts.slice(0, 3).map((alert, index) => (
                  <div key={index} style={{ fontSize: '10px', color: '#dc2626', marginBottom: '2px' }}>
                    • {alert.message}
                  </div>
                ))}
                {activeAlerts.length > 3 && (
                  <div style={{ fontSize: '10px', color: '#666', fontStyle: 'italic' }}>
                    +{activeAlerts.length - 3} more alerts
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // Full status display
  return (
    <div style={{
      padding: '12px',
      border: '1px solid #e1e3e5',
      borderRadius: '6px',
      background: 'white'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
        <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 'bold' }}>AI System Status</h3>
        <button
          onClick={fetchAIStatus}
          disabled={loading}
          style={{
            background: '#f8f9fa',
            border: '1px solid #e1e3e5',
            borderRadius: '4px',
            padding: '4px 8px',
            cursor: loading ? 'not-allowed' : 'pointer',
            fontSize: '10px'
          }}
          title="Refresh AI status"
        >
          {loading ? '...' : ''}
        </button>
      </div>

      <div style={{ display: 'grid', gap: '8px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '12px' }}>Overall Health:</span>
          <span style={{
            padding: '2px 8px',
            borderRadius: '12px',
            fontSize: '10px',
            fontWeight: 'bold',
            background: overallStatus.bg,
            color: overallStatus.color
          }}>
            {overallStatus.icon} {status.overall}
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '11px' }}>
          <div>
            <div style={{ color: '#666', marginBottom: '2px' }}>AI Provider</div>
            <div style={{ color: getStatusColor(status.services?.aiProvider?.status).color, fontWeight: 'bold' }}>
              {status.services?.aiProvider?.status || 'unknown'}
            </div>
          </div>

          <div>
            <div style={{ color: '#666', marginBottom: '2px' }}>Automation</div>
            <div style={{ color: getStatusColor(status.services?.automation?.status).color, fontWeight: 'bold' }}>
              {status.services?.automation?.status || 'unknown'}
            </div>
          </div>
        </div>

        {showTokenUsage && tokenUsage && (
          <div style={{ paddingTop: '8px', borderTop: '1px solid #e1e3e5' }}>
            <div style={{ fontSize: '11px', color: '#666', marginBottom: '4px' }}>Token Usage (Daily)</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: '12px', fontWeight: 'bold' }}>
                ${tokenUsage.current?.daily?.cost?.toFixed(2) || '0.00'}
              </div>
              <div style={{ fontSize: '10px', color: '#666' }}>
                / ${tokenUsage.budget?.daily || '0.00'} limit
              </div>
            </div>
            {tokenStatus && (
              <div style={{ fontSize: '10px', color: tokenStatus.color, marginTop: '2px' }}>
                {tokenStatus.message}
              </div>
            )}
          </div>
        )}

        {activeAlerts.length > 0 && (
          <div style={{ paddingTop: '8px', borderTop: '1px solid #e1e3e5' }}>
            <div style={{ fontSize: '11px', color: '#dc2626', fontWeight: 'bold', marginBottom: '4px' }}>
              Active Alerts ({activeAlerts.length}):
            </div>
            <div style={{ maxHeight: '60px', overflowY: 'auto' }}>
              {activeAlerts.slice(0, 5).map((alert, index) => (
                <div key={index} style={{ fontSize: '10px', color: '#dc2626', marginBottom: '2px' }}>
                  • {alert.message}
                </div>
              ))}
              {activeAlerts.length > 5 && (
                <div style={{ fontSize: '10px', color: '#666', fontStyle: 'italic' }}>
                  +{activeAlerts.length - 5} more alerts
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
