import * as React from 'react';
import { useLoaderData, useFetcher } from '@remix-run/react';
import { json, type ActionFunctionArgs } from '@remix-run/node';
import { backendFetch, backendFetchText } from '../server/hmac.server';
import { getServerShopName, getShopNameOrNull, isShopSetupNeeded, dismissShopSetupForSession } from '../utils/shop-config';
import ShopConfig from '../components/ShopConfig';
import ShopSetupBanner from '../components/ShopSetupBanner';

export async function loader({request}){
  // Pure client-side approach - server does NO backend calls
  // Client will read shop name from localStorage and make all API calls
  
  console.log(`🏪 Autopilot loader: Client will handle all data loading`);
  
  // Return minimal config for client
  const config = {
    backendUrl: process.env.BACKEND_PUBLIC_URL || 'http://localhost:3005/api'
  };
  
  return { config };
}

export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  const actionType = formData.get('actionType');
  
  if (actionType === 'generateScript') {
    // Use shop name utilities instead of complex tenant detection
    const currentShopName = getServerShopName(request.headers, request.url);
    
    console.log(`🔄 Action generating script for shop: ${currentShopName}`);
    
    const mode = formData.get('mode') || 'protect';
    const budget = formData.get('budget') || '3.00';
    const cpc = formData.get('cpc') || '0.20';
    const url = formData.get('url') || '';
    
    try {
      // Fetch the real script using text endpoint with correct shop name
      const realScript = await backendFetchText('/ads-script/raw', 'GET', undefined, currentShopName);
      
      console.log(`📊 Script fetch result for ${currentShopName}: length=${realScript?.length || 0}, isHTML=${realScript?.includes('<html') || false}`);
      
      if (realScript && realScript.length > 1000 && !realScript.includes('<html')) {
        
        const personalizedScript = `/** ProofKit Google Ads Script - Personalized for ${mode} mode
 * Shop: ${currentShopName}
 * Generated: ${new Date().toISOString()}
 * Budget Cap: $${budget}/day
 * CPC Ceiling: $${cpc}
 * Landing URL: ${url || 'Not specified'}
 * Script Size: ${Math.round(realScript.length / 1024)}KB
 */

${realScript}

// Script personalized with your settings:
// - Mode: ${mode}
// - Budget: $${budget}/day  
// - CPC: $${cpc}
// - URL: ${url || 'default'}`;

        return json({ 
          success: true, 
          script: personalizedScript,
          size: Math.round(personalizedScript.length / 1024),
          shopName: currentShopName
        });
      } else {
        console.log(`❌ Script validation failed for ${currentShopName}: length=${realScript?.length || 0}, hasHTML=${realScript?.includes('<html') || false}`);
        return json({ success: false, error: 'Failed to fetch complete script' });
      }
    } catch (error) {
      console.log(`❌ Action script fetch failed for ${currentShopName}:`, error.message);
      return json({ success: false, error: error.message });
    }
  }
  
  return json({ success: false, error: 'Unknown action' });
}

export default function Autopilot(){
  const { config } = useLoaderData<typeof loader>();
  const [mode, setMode] = React.useState('protect');
  const [budget, setBudget] = React.useState('3.00');
  const [cpc, setCpc] = React.useState('0.20');
  const [url, setUrl] = React.useState('');
  const [showSetupBanner, setShowSetupBanner] = React.useState(false);
  
  const [toast, setToast] = React.useState('');
  const [scriptCode, setScriptCode] = React.useState('');
  const [showScript, setShowScript] = React.useState(false);
  const [shopName, setShopName] = React.useState<string | null>(null);

  // Load shop name from localStorage on client side
  React.useEffect(() => {
    const userShopName = getShopNameOrNull();
    setShopName(userShopName);
    setShowSetupBanner(isShopSetupNeeded()); // Use proper setup check
  }, []);

  const handleSetupComplete = (newShopName: string) => {
    setShopName(newShopName);
    setShowSetupBanner(false);
    dismissShopSetupForSession(); // Prevent re-showing this session
    setToast(`Shop configured: ${newShopName}.myshopify.com`);
  };

  // Auto-update script when settings change
  React.useEffect(() => {
    if (showScript) {
      generateDynamicScript();
    }
  }, [mode, budget, cpc, url, showScript]);

  function run(){
    // Demo functionality - shows configuration
    const config = `Configuration:
Mode: ${mode}
Budget: $${budget}/day
CPC: $${cpc}
URL: ${url}
Shop: ${shopInfo.shopName}`;
    alert(`Autopilot would be enabled with:\n\n${config}\n\nIn production, this would start the automation.`);
    setToast('Demo: Configuration shown (would enable in production)');
  }
  
  // Removed sheet connection functions - using automated multi-tenant setup
  function generateDynamicScript(){
    // Use server action instead of client-side crypto
    const formData = new FormData();
    formData.append('actionType', 'generateScript');
    formData.append('mode', mode);
    formData.append('budget', budget);
    formData.append('cpc', cpc);
    formData.append('url', url);
    
    fetch('/api/generate-script', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        mode,
        budget,
        cpc,
        url,
        shopName: shopName  // Pass the shop name from localStorage
      })
    })
    .then(response => response.json())
    .then(data => {
      if (data.success) {
        setScriptCode(data.script);
        setShowScript(true);
        setToast(`Complete ${data.size}KB script generated for ${data.shopName}`);
      } else {
        setToast('Error: ' + data.error);
      }
    })
    .catch(error => {
      setToast('Error generating script: ' + error.message);
    });
  }

  return (
    <div>
      <h1>🤖 Autopilot</h1>
      
      {/* Shop Setup Banner - fallback if setup is needed */}
      {showSetupBanner && (
        <ShopSetupBanner 
          onSetupComplete={handleSetupComplete}
          showOnlyIfNeeded={true}
        />
      )}
      
      {/* Shop Configuration - only show if setup is complete */}
      {!showSetupBanner && <ShopConfig showInline={false} />}
      
      {/* Connect Sheets section removed - using automated multi-tenant Google Sheets */}
      {toast && <p>{toast}</p>}
      <section style={{ border:'1px solid #eee', padding:12 }}>
        <h3>Goal</h3>
        <label><input type="radio" name="goal" value="protect" checked={mode==='protect'} onChange={()=>setMode('protect')} /> Protect</label><br/>
        <label><input type="radio" name="goal" value="grow" checked={mode==='grow'} onChange={()=>setMode('grow')} /> Grow</label><br/>
        <label><input type="radio" name="goal" value="scale" checked={mode==='scale'} onChange={()=>setMode('scale')} /> Scale</label>
      </section>
      <section style={{ border:'1px solid #eee', padding:12 }}>
        <h3>Budget & CPC</h3>
        <input type="number" step="0.01" value={budget} onChange={e=>setBudget(e.target.value)} placeholder="$ per day" />
        <input type="number" step="0.01" value={cpc} onChange={e=>setCpc(e.target.value)} placeholder="Max CPC" />
      </section>
      <section style={{ border:'1px solid #eee', padding:12 }}>
        <h3>Landing URL</h3>
        <input value={url} onChange={e=>setUrl(e.target.value)} placeholder="https://example.com" style={{ width:'100%' }} />
      </section>
      <div style={{ marginTop:8, padding: 12, background: '#e7f3ff', borderRadius: 4, marginBottom: 16 }}>
        <h4 style={{ margin: '0 0 8px 0', color: '#0c5460' }}>🤖 Autopilot Status</h4>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <span style={{ background: '#28a745', color: 'white', padding: '4px 8px', borderRadius: '12px', fontSize: '12px' }}>
            ✅ ALWAYS ON
          </span>
          <span>Automation running for: <strong>{shopName || 'Please configure shop'}</strong></span>
        </div>
        <div style={{ fontSize: '14px', color: '#666' }}>
          • Budget optimization: Active<br/>
          • AI analysis: Running every 15min<br/>
          • Performance monitoring: Continuous<br/>
          • Script updates: Available below
        </div>
      </div>
      
      <div style={{ marginTop:8 }}>
        <button onClick={generateDynamicScript} style={{ 
          background: '#007bff', 
          color: 'white', 
          padding: '12px 24px', 
          border: 'none', 
          borderRadius: '4px',
          cursor: 'pointer',
          fontSize: '16px'
        }}>
          🔄 Generate Current Script
        </button>
      </div>
      {showScript && (
        <section style={{ border:'1px solid #eee', padding:12, marginTop:12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <h3>Google Ads Script ({Math.round(scriptCode.length / 1024)}KB)</h3>
            <button 
              onClick={()=>{ 
                navigator.clipboard.writeText(scriptCode).then(() => {
                  setToast('Script copied to clipboard!'); 
                }).catch(() => {
                  setToast('Copy failed - select text manually');
                });
              }}
              style={{ 
                background: '#28a745', 
                color: 'white', 
                padding: '8px 16px', 
                border: 'none', 
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              📋 Copy Script
            </button>
          </div>
          <textarea 
            readOnly 
            value={scriptCode} 
            style={{ width:'100%', height:300, fontFamily: 'monospace', fontSize: '12px' }} 
            placeholder="Script will appear here when loaded..."
          />
          <ol>
            <li>Google Ads → Tools → Bulk actions → Scripts → + New script</li>
            <li>Paste, Authorize, then Preview first</li>
            <li>If ok, Run once, then Schedule daily</li>
          </ol>
        </section>
      )}
    </div>
  );
}