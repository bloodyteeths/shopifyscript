import { json } from '@remix-run/node';
import { useLoaderData, Link } from '@remix-run/react';

export const loader = async () => {
  return json({
    message: 'Welcome to ProofKit!',
    timestamp: new Date().toISOString()
  });
};

export default function AppIndex() {
  const { message, timestamp } = useLoaderData<typeof loader>();

  return (
    <div style={{ padding: '2rem' }}>
      <h1>🚀 ProofKit Dashboard</h1>
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
          <Link to="/local/autopilot" style={{ 
            background: '#007bff', 
            color: 'white', 
            padding: '0.5rem 1rem', 
            textDecoration: 'none',
            borderRadius: '4px',
            display: 'inline-block'
          }}>
            Open Autopilot
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
            padding: '0.5rem 1rem', 
            textDecoration: 'none',
            borderRadius: '4px',
            display: 'inline-block'
          }}>
            View Insights
          </Link>
        </div>

        <div style={{ 
          border: '1px solid #ddd', 
          borderRadius: '8px', 
          padding: '1.5rem',
          background: '#f8f9fa'
        }}>
          <h3>🎯 Intent OS</h3>
          <p>Intent-based content optimization</p>
          <Link to="/app/intent-os" style={{ 
            background: '#ffc107', 
            color: '#333', 
            padding: '0.5rem 1rem', 
            textDecoration: 'none',
            borderRadius: '4px',
            display: 'inline-block'
          }}>
            Configure Intent OS
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
            padding: '0.5rem 1rem', 
            textDecoration: 'none',
            borderRadius: '4px',
            display: 'inline-block'
          }}>
            Advanced Settings
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