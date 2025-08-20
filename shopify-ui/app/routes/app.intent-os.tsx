import { json, type LoaderFunctionArgs } from '@remix-run/node';
import { useLoaderData, Link } from '@remix-run/react';

export const loader = async ({ request }: LoaderFunctionArgs) => {
  return json({
    tenantId: process.env.TENANT_ID || 'proofkit',
    launchDate: 'Q1 2026'
  });
};

export default function IntentOSComingSoon() {
  const { tenantId, launchDate } = useLoaderData<typeof loader>();

  return (
    <div style={{ padding: '3rem 2rem', maxWidth: '800px', margin: '0 auto', textAlign: 'center' }}>
      
      {/* Hero Section */}
      <div style={{ marginBottom: '3rem' }}>
        <h1 style={{ fontSize: '48px', marginBottom: '1rem', color: '#333' }}>
          🚀 Smart Website Features
        </h1>
        <p style={{ fontSize: '24px', color: '#666', marginBottom: '2rem' }}>
          Advanced conversion optimization tools coming soon!
        </p>
        <div style={{
          display: 'inline-block',
          padding: '8px 16px',
          background: '#fff3cd',
          borderRadius: '6px',
          border: '1px solid #ffeaa7',
          fontSize: '16px',
          fontWeight: 'bold',
          color: '#856404'
        }}>
          📅 Expected Launch: {launchDate}
        </div>
      </div>

      {/* Feature Preview */}
      <div style={{ 
        border: '1px solid #e1e5e9', 
        borderRadius: '12px', 
        padding: '2rem',
        marginBottom: '3rem',
        background: '#f8f9fa'
      }}>
        <h2 style={{ marginBottom: '2rem', color: '#333' }}>What's Coming</h2>
        
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
          gap: '1.5rem',
          textAlign: 'left'
        }}>
          
          <div style={{ 
            padding: '1.5rem', 
            border: '1px solid #28a745', 
            borderRadius: '8px',
            background: '#fff'
          }}>
            <h3 style={{ color: '#28a745', marginBottom: '1rem' }}>⏰ Stock Urgency</h3>
            <p style={{ color: '#666', fontSize: '14px' }}>
              Automatically show "Only X left!" messages on low-stock products to create buying urgency.
            </p>
          </div>

          <div style={{ 
            padding: '1.5rem', 
            border: '1px solid #007bff', 
            borderRadius: '8px',
            background: '#fff'
          }}>
            <h3 style={{ color: '#007bff', marginBottom: '1rem' }}>🎁 Welcome Offers</h3>
            <p style={{ color: '#666', fontSize: '14px' }}>
              Show special discounts to first-time visitors to convert them into customers.
            </p>
          </div>

          <div style={{ 
            padding: '1.5rem', 
            border: '1px solid #ffc107', 
            borderRadius: '8px',
            background: '#fff'
          }}>
            <h3 style={{ color: '#856404', marginBottom: '1rem' }}>🎯 Smart Content</h3>
            <p style={{ color: '#666', fontSize: '14px' }}>
              Show different headlines and messages based on how visitors found your store.
            </p>
          </div>

          <div style={{ 
            padding: '1.5rem', 
            border: '1px solid #dc3545', 
            borderRadius: '8px',
            background: '#fff'
          }}>
            <h3 style={{ color: '#dc3545', marginBottom: '1rem' }}>💨 Exit Intent</h3>
            <p style={{ color: '#666', fontSize: '14px' }}>
              Catch visitors before they leave with last-chance offers and incentives.
            </p>
          </div>

        </div>
      </div>

      {/* Current Focus */}
      <div style={{ 
        border: '1px solid #007bff', 
        borderRadius: '12px', 
        padding: '2rem',
        marginBottom: '3rem',
        background: '#e7f3ff'
      }}>
        <h2 style={{ color: '#0c5460', marginBottom: '1rem' }}>🎯 Our Current Focus</h2>
        <p style={{ fontSize: '18px', color: '#0c5460', marginBottom: '2rem' }}>
          We're focusing on perfecting your <strong>Google Ads optimization</strong> first. 
          Once that's delivering amazing results, we'll add these website optimization features.
        </p>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
          <Link 
            to="/app/autopilot"
            style={{ 
              padding: '1rem',
              background: '#fff',
              border: '1px solid #007bff',
              borderRadius: '6px',
              textDecoration: 'none',
              color: '#007bff',
              fontWeight: 'bold',
              display: 'block'
            }}
          >
            🤖 Use Autopilot Now
          </Link>
          
          <Link 
            to="/app/advanced"
            style={{ 
              padding: '1rem',
              background: '#fff',
              border: '1px solid #28a745',
              borderRadius: '6px',
              textDecoration: 'none',
              color: '#28a745',
              fontWeight: 'bold',
              display: 'block'
            }}
          >
            ⚙️ Configure Settings
          </Link>
          
          <Link 
            to="/app/insights"
            style={{ 
              padding: '1rem',
              background: '#fff',
              border: '1px solid #ffc107',
              borderRadius: '6px',
              textDecoration: 'none',
              color: '#856404',
              fontWeight: 'bold',
              display: 'block'
            }}
          >
            📊 View Performance
          </Link>
        </div>
      </div>

      {/* Why We're Waiting */}
      <div style={{ 
        padding: '1.5rem',
        background: '#f1f3f4',
        borderRadius: '8px',
        textAlign: 'left'
      }}>
        <h3 style={{ marginBottom: '1rem', color: '#333' }}>💡 Why We're Building This Step by Step</h3>
        <ul style={{ color: '#666', lineHeight: '1.6', paddingLeft: '20px' }}>
          <li><strong>Better Product:</strong> Perfect your Google Ads optimization first, then add website features</li>
          <li><strong>Faster Launch:</strong> Get you making money sooner with proven Google Ads automation</li>
          <li><strong>Customer-Driven:</strong> Build website features based on what you actually need</li>
          <li><strong>Quality Focus:</strong> Each feature gets our full attention instead of rushing everything</li>
        </ul>
      </div>

      {/* Interest Form */}
      <div style={{ 
        marginTop: '3rem',
        padding: '2rem',
        background: '#fff',
        border: '1px solid #e1e5e9',
        borderRadius: '8px'
      }}>
        <h3 style={{ marginBottom: '1rem', color: '#333' }}>
          📬 Want to know when Smart Website features launch?
        </h3>
        <p style={{ color: '#666', marginBottom: '1.5rem' }}>
          We'll email you as soon as these conversion optimization tools are ready.
        </p>
        
        <div style={{ 
          display: 'flex', 
          gap: '1rem', 
          justifyContent: 'center',
          alignItems: 'center',
          flexWrap: 'wrap'
        }}>
          <input 
            type="email" 
            placeholder="your@email.com"
            style={{
              padding: '12px 16px',
              borderRadius: '6px',
              border: '1px solid #ddd',
              fontSize: '16px',
              minWidth: '250px'
            }}
          />
          <button 
            style={{
              padding: '12px 24px',
              backgroundColor: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontSize: '16px',
              fontWeight: 'bold',
              cursor: 'pointer'
            }}
          >
            📧 Notify Me
          </button>
        </div>
      </div>
    </div>
  );
}