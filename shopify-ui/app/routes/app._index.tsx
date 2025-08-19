import { json } from '@remix-run/node';
import { useLoaderData, Link } from '@remix-run/react';
import * as React from 'react';
import ShopSetupBanner from '../components/ShopSetupBanner';
import { isShopSetupNeeded } from '../utils/shop-config';

export const loader = async () => {
  return json({
    message: 'AI-powered Google Ads optimization on autopilot',
    timestamp: new Date().toISOString()
  });
};

export default function AppIndex() {
  const { message, timestamp } = useLoaderData<typeof loader>();
  const [showSetupBanner, setShowSetupBanner] = React.useState(false);

  // Check if setup is needed on client side
  React.useEffect(() => {
    setShowSetupBanner(isShopSetupNeeded());
  }, []);

  const handleSetupComplete = (shopName: string) => {
    setShowSetupBanner(false);
  };

  return (
    <div style={{ padding: '2rem' }}>
      {/* Shop Setup Banner - only shows if needed */}
      {showSetupBanner && (
        <ShopSetupBanner 
          onSetupComplete={handleSetupComplete}
          showOnlyIfNeeded={true}
        />
      )}

      <h1>🚀 Ads Autopilot AI Dashboard</h1>
      <p>{message}</p>
      
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
        gap: '1rem',
        marginTop: '2rem'
      }}>
        <div style={{ 
          border: '1px solid #ddd', 
          borderRadius: '8px', 
          padding: '1.5rem',
          background: '#f8f9fa'
        }}>
          <h3>🤖 Autopilot</h3>
          <p>Automated campaign management and optimization</p>
          <Link to="/app/autopilot" style={{ 
            background: '#007bff', 
            color: 'white', 
            padding: '12px 24px', 
            textDecoration: 'none',
            borderRadius: '6px',
            display: 'inline-block',
            fontSize: '16px',
            fontWeight: 'bold',
            boxShadow: '0 2px 8px rgba(0, 123, 255, 0.3)',
            transition: 'all 0.2s ease'
          }}>
            🤖 Open Autopilot
          </Link>
        </div>

        <div style={{ 
          border: '1px solid #ddd', 
          borderRadius: '8px', 
          padding: '1.5rem',
          background: '#f8f9fa'
        }}>
          <h3>📊 Insights</h3>
          <p>Performance analytics and campaign insights</p>
          <Link to="/app/insights" style={{ 
            background: '#28a745', 
            color: 'white', 
            padding: '12px 24px', 
            textDecoration: 'none',
            borderRadius: '6px',
            display: 'inline-block',
            fontSize: '16px',
            fontWeight: 'bold',
            boxShadow: '0 2px 8px rgba(40, 167, 69, 0.3)',
            transition: 'all 0.2s ease'
          }}>
            📊 View Insights
          </Link>
        </div>

        <div style={{ 
          border: '1px solid #ddd', 
          borderRadius: '8px', 
          padding: '1.5rem',
          background: '#f8f9fa',
          opacity: 0.7,
          position: 'relative'
        }}>
          <h3>💡 Smart Website Features</h3>
          <p>Advanced conversion optimization tools</p>
          <div style={{
            position: 'absolute',
            top: '8px',
            right: '8px',
            background: '#fff3cd',
            color: '#856404',
            padding: '4px 8px',
            borderRadius: '12px',
            fontSize: '12px',
            fontWeight: 'bold'
          }}>
            Coming Q1 2026
          </div>
          <Link to="/app/intent-os" style={{ 
            background: '#6c757d', 
            color: 'white', 
            padding: '10px 20px', 
            textDecoration: 'none',
            borderRadius: '6px',
            display: 'inline-block',
            fontSize: '14px',
            fontWeight: 'bold',
            opacity: 0.8,
            transition: 'all 0.2s ease'
          }}>
            💡 Preview Features
          </Link>
        </div>

        <div style={{ 
          border: '1px solid #ddd', 
          borderRadius: '8px', 
          padding: '1.5rem',
          background: '#f8f9fa'
        }}>
          <h3>⚙️ Advanced</h3>
          <p>Advanced settings and configuration</p>
          <Link to="/app/advanced" style={{ 
            background: '#6c757d', 
            color: 'white', 
            padding: '12px 24px', 
            textDecoration: 'none',
            borderRadius: '6px',
            display: 'inline-block',
            fontSize: '16px',
            fontWeight: 'bold',
            boxShadow: '0 2px 8px rgba(108, 117, 125, 0.3)',
            transition: 'all 0.2s ease'
          }}>
            ⚙️ Advanced Settings
          </Link>
        </div>
      </div>

      <div style={{ 
        marginTop: '2rem', 
        padding: '1rem', 
        background: '#e9ecef', 
        borderRadius: '4px',
        fontSize: '0.9rem',
        color: '#666'
      }}>
        <strong>Status:</strong> Connected to backend • Last updated: {new Date(timestamp).toLocaleString()}
      </div>
    </div>
  );
}