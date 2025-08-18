import * as React from 'react'
import { json, type LoaderFunctionArgs, type ActionFunctionArgs } from '@remix-run/node'
import { useLoaderData, Form, useNavigation, useActionData } from '@remix-run/react'

// Simple tenant detection for development/production
async function getTenantFromRequest(request: Request): Promise<string> {
  // Method 1: Extract from shop parameter (Shopify app standard)
  const url = new URL(request.url);
  const shopParam = url.searchParams.get('shop');
  if (shopParam) {
    return shopParam.replace('.myshopify.com', '');
  }

  // Method 2: Extract from subdomain
  const host = request.headers.get('host') || '';
  if (host.includes('.proofkit.com')) {
    const subdomain = host.split('.')[0];
    if (subdomain && subdomain !== 'www' && subdomain !== 'app') {
      return subdomain;
    }
  }

  // Method 3: Development fallback
  if (process.env.NODE_ENV === 'development') {
    return process.env.DEFAULT_DEV_TENANT || 'dev-tenant';
  }

  // Production fallback - this should not happen
  throw new Error('Cannot determine tenant from request');
}

export async function loader({request}: LoaderFunctionArgs){
  try {
    // Extract tenant from Shopify session for production or use fallback for development
    let tenantId = 'dev-tenant'; // fallback
    
    // Try to get shop from URL parameters (Shopify embedded app)
    const url = new URL(request.url);
    const shopParam = url.searchParams.get('shop');
    if (shopParam) {
      tenantId = shopParam.replace('.myshopify.com', '');
    }
    
    // Check headers for Shopify shop domain
    const shopifyShop = request.headers.get('x-shopify-shop-domain');
    if (shopifyShop) {
      tenantId = shopifyShop.replace('.myshopify.com', '');
    }
    
    console.log(`🔍 Detected tenant: ${tenantId}`);
    
    const { backendFetch } = await import('../server/hmac.server')
    const cfg = await backendFetch('/config','GET', undefined, tenantId)
    const insights = await backendFetch('/insights?w=7d','GET', undefined, tenantId)
    const campaigns = await backendFetch('/campaigns','GET', undefined, tenantId) 
    const summary = await backendFetch('/summary','GET', undefined, tenantId)
    
    return json({ 
      cfg: cfg.json?.config||{}, 
      insights: insights.json||{},
      campaigns: campaigns.json||{},
      summary: summary.json||{},
      suggestions: generateSuggestions(insights.json, campaigns.json, summary.json),
      tenantId: tenantId
    })
  } catch (error) {
    console.error('Loader error:', error.message);
    return json({ 
      cfg: {}, 
      insights: {},
      campaigns: {},
      summary: {},
      suggestions: generateSuggestions({}, {}, {}),
      tenantId: 'dev-tenant'
    })
  }
}

function generateSuggestions(insights: any, campaigns: any, summary: any) {
  const currentCPA = insights?.kpi?.cpa || 25
  const currentCPC = insights?.kpi?.cpc || 0.5
  const currentConversions = insights?.kpi?.conversions || 10
  const currentCost = insights?.kpi?.cost || 100
  const currentClicks = insights?.kpi?.clicks || 200
  
  // Generate personalized options for each field
  const suggestions = {
    // CPA options (Cost Per Acquisition)
    targetCPA: {
      description: "How much you're willing to pay to get one customer",
      options: [
        { 
          value: Math.max(5, currentCPA * 0.8).toFixed(2), 
          label: "Conservative", 
          description: "20% lower than current - save money" 
        },
        { 
          value: currentCPA > 0 ? currentCPA.toFixed(2) : "25.00", 
          label: "Current Level", 
          description: "Keep current performance" 
        },
        { 
          value: Math.max(currentCPA * 1.3, 30).toFixed(2), 
          label: "Aggressive", 
          description: "Higher target - get more customers" 
        }
      ]
    },
    
    // ROAS options (Return on Ad Spend)
    targetROAS: {
      description: "For every $1 spent on ads, how much revenue you want back",
      options: [
        { 
          value: "4.0", 
          label: "High Return", 
          description: "Conservative - $4 back for every $1 spent" 
        },
        { 
          value: "3.0", 
          label: "Balanced", 
          description: "Moderate - $3 back for every $1 spent" 
        },
        { 
          value: "2.0", 
          label: "Growth Focus", 
          description: "Aggressive - $2 back, prioritize volume" 
        }
      ]
    },

    // Schedule options
    schedule: {
      description: "How often should ProofKit optimize your campaigns?",
      options: [
        { 
          value: "daily", 
          label: "Daily (Recommended)", 
          description: "Best for active campaigns with enough data" 
        },
        { 
          value: "weekdays_9_18", 
          label: "Business Hours", 
          description: "Monday-Friday, 9 AM to 6 PM only" 
        },
        { 
          value: "off", 
          label: "Manual Only", 
          description: "No automation - you'll run optimizations manually" 
        }
      ]
    },

    // Bid ceiling options
    bidCeiling: {
      description: "Maximum cost-per-click to prevent overspending",
      options: [
        { 
          value: Math.max(0.25, currentCPC * 0.8).toFixed(2), 
          label: "Conservative", 
          description: "Lower limit - save money on clicks" 
        },
        { 
          value: Math.max(0.5, currentCPC * 1.1).toFixed(2), 
          label: "Balanced", 
          description: "Slightly above current average" 
        },
        { 
          value: Math.max(1.0, currentCPC * 1.5).toFixed(2), 
          label: "Competitive", 
          description: "Higher limit - compete for top positions" 
        }
      ]
    },

    // Keywords suggestions
    keywords: {
      description: "Focus keywords for your business (examples based on common e-commerce terms)",
      options: [
        { 
          value: "buy online\nfree shipping\nbest price\ndiscount deals", 
          label: "Purchase Intent", 
          description: "Target customers ready to buy" 
        },
        { 
          value: "how to choose\nbest product\nproduct review\ncompare products", 
          label: "Research Phase", 
          description: "Target customers researching options" 
        },
        { 
          value: "[your brand name]\n[your product type]\n[your industry] specialist", 
          label: "Brand & Product", 
          description: "Target your specific brand and products" 
        }
      ]
    },

    // AI Behavior Instructions
    aiBehavior: {
      description: "Guide how the AI makes optimization decisions for your business",
      options: [
        {
          value: "Focus on profitable customers who spend more per transaction.\nPrioritize quality over quantity in traffic.\nAvoid competing aggressively on low-margin keywords.\nEmphasize premium product positioning in ad copy.",
          label: "Premium Business",
          description: "Target high-value customers, focus on profit margins"
        },
        {
          value: "Maximize reach and volume to grow brand awareness.\nTarget broad audiences with competitive pricing.\nBid aggressively on trending and seasonal keywords.\nOptimize for maximum clicks and impressions.",
          label: "Growth & Volume",
          description: "Scale quickly, prioritize reach and brand awareness"
        },
        {
          value: "Balance cost efficiency with steady growth.\nTarget customers with proven buying intent.\nMaintain consistent ad spend while improving performance.\nFocus on converting existing traffic better.",
          label: "Balanced Approach",
          description: "Steady, sustainable growth with controlled costs"
        }
      ]
    }
  }
  
  return suggestions
}

export async function action({request}: ActionFunctionArgs){
  try {
    // Extract tenant from Shopify session for production or use fallback for development
    let tenantId = 'dev-tenant'; // fallback
    
    // Try to get shop from URL parameters (Shopify embedded app)
    const url = new URL(request.url);
    const shopParam = url.searchParams.get('shop');
    if (shopParam) {
      tenantId = shopParam.replace('.myshopify.com', '');
    }
    
    // Check headers for Shopify shop domain
    const shopifyShop = request.headers.get('x-shopify-shop-domain');
    if (shopifyShop) {
      tenantId = shopifyShop.replace('.myshopify.com', '');
    }
    
    console.log(`🔧 Processing action for tenant: ${tenantId}`);
    
    const fd = await request.formData()
    const settings:any = {
      AP_SCHEDULE: String(fd.get('schedule')||'off'),
      AP_TARGET_CPA: String(fd.get('target_cpa')||''),
      AP_TARGET_ROAS: String(fd.get('target_roas')||''),
      AP_DESIRED_KEYWORDS_PIPE: String(fd.get('desired_keywords')||'').split(/\r?\n|,|[|]/).map(s=>s.trim()).filter(Boolean).join('|'),
      AP_PLAYBOOK_PROMPT: String(fd.get('playbook')||'')
    }
    
    // Always save settings first
    const { backendFetch } = await import('../server/hmac.server')
    await backendFetch('/upsertConfig','POST',{ nonce: Date.now(), settings }, tenantId)
  
    // Handle bid limits if provided
    if (fd.get('save_caps')==='1'){
      const caps_campaign = fd.getAll('caps_campaign') as string[]
      const caps_value = fd.getAll('caps_value') as string[]
      const items = caps_campaign.map((c,i)=>({ campaign:c, value:Number(caps_value[i]||0) })).filter(x=>!Number.isNaN(x.value))
      if (items.length){ await backendFetch('/cpc-ceilings/batch','POST',{ nonce: Date.now(), items }, tenantId) }
    }
    
    // Run optimization if requested (force=1 to bypass schedule gate)
    if (fd.get('run_optimization')==='1'){ 
      const tickResult = await backendFetch('/jobs/autopilot_tick?force=1','POST',{ nonce: Date.now() }, tenantId) 
      return json({ 
        ok: true, 
        tickResult: true,
        planned: tickResult.json?.planned || [],
        applied: tickResult.json?.applied || [],
        skipped: tickResult.json?.skipped || false,
        reason: tickResult.json?.reason || '',
        kpi: tickResult.json?.kpi || {},
        message: 'Settings saved and optimization completed!',
        tenantId: tenantId
      })
    }
    // SEO tools
    if (fd.get('seo_preview')==='1'){
      const ids = String(fd.get('product_ids')||'').split(/\s|,|\|/).map(s=>s.trim()).filter(Boolean)
      const strategy = String(fd.get('strategy')||'template')
      const templateTitle = String(fd.get('template_title')||'')
      const templateDescription = String(fd.get('template_description')||'')
      const r = await backendFetch('/shopify/seo/preview','POST',{ nonce: Date.now(), productIds: ids, strategy, templateTitle, templateDescription }, tenantId)
      return json({ ok:true, preview:r.json?.proposals||[], dry:true, tenantId })
    }
    if (fd.get('seo_apply')==='1'){
      const changes = JSON.parse(String(fd.get('changes_json')||'[]'))
      const r = await backendFetch('/shopify/seo/apply','POST',{ nonce: Date.now(), changes }, tenantId)
      return json({ ok: r.json?.ok, applied: r.json?.applied||0, tenantId })
    }
    if (fd.get('tags_apply')==='1'){
      const ids = String(fd.get('product_ids')||'').split(/\s|,|\|/).map(s=>s.trim()).filter(Boolean)
      const add = String(fd.get('tags_add')||'').split(/,|\|/).map(s=>s.trim()).filter(Boolean)
      const remove = String(fd.get('tags_remove')||'').split(/,|\|/).map(s=>s.trim()).filter(Boolean)
      const r = await backendFetch('/shopify/tags/batch','POST',{ nonce: Date.now(), productIds: ids, add, remove }, tenantId)
      return json({ ok:r.json?.ok, updated:r.json?.updated||0, tenantId })
    }
  
  // Default return for other actions (SEO, etc.)
  return json({ ok:true, message: 'Settings saved successfully!', tenantId: tenantId })
  } catch (error) {
    console.error('Action error:', error.message);
    return json({ ok: false, error: error.message }, { status: 500 })
  }
}

export default function Advanced(){
  const data = useLoaderData<typeof loader>() as any
  const actionData = useActionData<typeof action>()
  const cfg = data?.cfg||{}
  const suggestions = data?.suggestions || {}
  const insights = data?.insights || {}
  const nav = useNavigation()
  const caps = cfg?.CPC_CEILINGS || {}
  const capRows = Object.entries(caps).map(([campaign,value]:any)=>({campaign, value}))
  const [preview, setPreview] = React.useState<any[]>([])
  const [toast, setToast] = React.useState('')
  const [appliedSuggestions, setAppliedSuggestions] = React.useState<Set<string>>(new Set())
  const [buttonFeedback, setButtonFeedback] = React.useState<{[key: string]: string}>({})
  
  // State for field values and manual override
  const [targetCPAMode, setTargetCPAMode] = React.useState<'preset' | 'manual'>('preset')
  const [targetROASMode, setTargetROASMode] = React.useState<'preset' | 'manual'>('preset')
  const [scheduleMode, setScheduleMode] = React.useState<'preset' | 'manual'>('preset')
  const [keywordsMode, setKeywordsMode] = React.useState<'preset' | 'manual'>('preset')
  const [aiBehaviorMode, setAiBehaviorMode] = React.useState<'preset' | 'manual'>('preset')

  // Show success message after form submission with specific button feedback
  React.useEffect(() => {
    if (actionData?.tickResult && actionData?.ok) {
      // Run Optimization button response
      const planCount = actionData.planned?.length || 0
      const appliedCount = actionData.applied?.length || 0
      const skipped = actionData.skipped
      
      if (skipped) {
        setButtonFeedback(prev => ({
          ...prev,
          runOptimization: `⏸️ Skipped: ${actionData.reason || 'Not scheduled to run now'}`
        }))
      } else if (planCount > 0) {
        setButtonFeedback(prev => ({
          ...prev,
          runOptimization: `✅ Generated ${planCount} optimization${planCount !== 1 ? 's' : ''}, applied ${appliedCount}`
        }))
      } else {
        setButtonFeedback(prev => ({
          ...prev,
          runOptimization: `✅ Analysis complete - no optimizations needed right now`
        }))
      }
      setTimeout(() => setButtonFeedback(prev => ({ ...prev, runOptimization: '' })), 5000)
    } else if (actionData?.ok && nav.formData?.get('save_caps')) {
      // Bid Limits save button response
      setButtonFeedback(prev => ({
        ...prev,
        saveCaps: '✅ Bid limits saved!'
      }))
      setTimeout(() => setButtonFeedback(prev => ({ ...prev, saveCaps: '' })), 3000)
    } else if (actionData?.ok) {
      // Combined save & run button response (when no optimization data)
      setButtonFeedback(prev => ({
        ...prev,
        runOptimization: '✅ Settings saved & optimization completed!'
      }))
      setTimeout(() => setButtonFeedback(prev => ({ ...prev, runOptimization: '' })), 3000)
    } else if (actionData?.applied !== undefined) {
      setButtonFeedback(prev => ({
        ...prev,
        seoApply: `✅ Applied ${actionData.applied} SEO changes!`
      }))
      setTimeout(() => setButtonFeedback(prev => ({ ...prev, seoApply: '' })), 3000)
    } else if (actionData?.preview !== undefined) {
      // SEO Preview button response
      const previewCount = actionData.preview?.length || 0
      setButtonFeedback(prev => ({
        ...prev,
        seoPreview: `👁️ Generated ${previewCount} SEO preview${previewCount !== 1 ? 's' : ''}`
      }))
      setPreview(actionData.preview || [])
      setTimeout(() => setButtonFeedback(prev => ({ ...prev, seoPreview: '' })), 3000)
    } else if (actionData?.updated !== undefined) {
      setButtonFeedback(prev => ({
        ...prev,
        tagsApply: `✅ Updated ${actionData.updated} products!`
      }))
      setTimeout(() => setButtonFeedback(prev => ({ ...prev, tagsApply: '' })), 3000)
    }
  }, [actionData, nav.formData])

  const applySuggestion = (suggestion: any) => {
    const formElement = document.querySelector('form[method="post"]') as HTMLFormElement
    if (!formElement) return
    
    const field = formElement.querySelector(`[name="${suggestion.field}"]`) as HTMLInputElement | HTMLSelectElement
    if (field) {
      field.value = suggestion.recommendedValue
      setAppliedSuggestions(prev => new Set([...prev, suggestion.type]))
      setToast(`✨ Applied suggestion: ${suggestion.title}`)
      setTimeout(() => setToast(''), 3000)
    }
  }

  const helpStyle = {
    fontSize: '14px',
    color: '#666',
    marginTop: '4px',
    fontStyle: 'italic'
  }

  const sectionStyle = {
    border: '1px solid #e1e5e9',
    borderRadius: '8px',
    padding: '20px',
    marginBottom: '20px',
    backgroundColor: '#fafbfc'
  }

  const legendStyle = {
    fontSize: '18px',
    fontWeight: 'bold',
    color: '#333',
    marginBottom: '8px'
  }

  return (
    <div style={{maxWidth:920}}>
      <h1>⚙️ Advanced Settings</h1>
      <p style={{color: '#666', marginBottom: '24px'}}>
        Fine-tune your ProofKit automation and optimize your store's performance.
      </p>


      {/* Personalized Suggestions */}
      {suggestions.length > 0 && (
        <div style={{
          backgroundColor: '#fff3cd',
          border: '1px solid #ffeaa7',
          borderRadius: '8px',
          padding: '20px',
          marginBottom: '24px'
        }}>
          <h3 style={{
            fontSize: '18px',
            fontWeight: 'bold',
            color: '#856404',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            💡 Personalized Recommendations
            <span style={{
              fontSize: '14px',
              fontWeight: 'normal',
              color: '#666',
              marginLeft: '8px'
            }}>
              Based on your Google Ads performance
            </span>
          </h3>
          <div style={{display: 'grid', gap: '12px'}}>
            {suggestions.map((suggestion: any) => (
              <div key={suggestion.type} style={{
                backgroundColor: 'white',
                padding: '16px',
                borderRadius: '6px',
                border: '1px solid #f0c040',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <div>
                  <h4 style={{
                    fontSize: '16px',
                    fontWeight: 'bold',
                    marginBottom: '4px',
                    color: '#333'
                  }}>
                    {suggestion.title}
                  </h4>
                  <p style={{
                    fontSize: '14px',
                    color: '#666',
                    margin: '0'
                  }}>
                    {suggestion.description}
                  </p>
                  <span style={{
                    fontSize: '12px',
                    color: '#856404',
                    fontWeight: 'bold'
                  }}>
                    Recommended: {suggestion.recommendedValue}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => applySuggestion(suggestion)}
                  disabled={appliedSuggestions.has(suggestion.type)}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: appliedSuggestions.has(suggestion.type) ? '#6c757d' : '#ffc107',
                    color: appliedSuggestions.has(suggestion.type) ? 'white' : '#333',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: appliedSuggestions.has(suggestion.type) ? 'default' : 'pointer',
                    fontSize: '14px',
                    fontWeight: 'bold',
                    minWidth: '80px'
                  }}
                >
                  {appliedSuggestions.has(suggestion.type) ? '✅ Applied' : '✨ Apply'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Current Performance Overview */}
      {insights?.kpi && (
        <div style={{
          backgroundColor: '#f8f9fa',
          border: '1px solid #e1e5e9',
          borderRadius: '8px',
          padding: '20px',
          marginBottom: '24px'
        }}>
          <h3 style={{fontSize: '18px', fontWeight: 'bold', marginBottom: '12px', color: '#333'}}>
            📊 Current Performance (Last 7 Days)
          </h3>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
            gap: '16px'
          }}>
            <div style={{textAlign: 'center'}}>
              <div style={{fontSize: '24px', fontWeight: 'bold', color: '#007bff'}}>
                {insights.kpi.clicks || 0}
              </div>
              <div style={{fontSize: '12px', color: '#666'}}>Clicks</div>
            </div>
            <div style={{textAlign: 'center'}}>
              <div style={{fontSize: '24px', fontWeight: 'bold', color: '#28a745'}}>
                ${(insights.kpi.cost || 0).toFixed(2)}
              </div>
              <div style={{fontSize: '12px', color: '#666'}}>Spend</div>
            </div>
            <div style={{textAlign: 'center'}}>
              <div style={{fontSize: '24px', fontWeight: 'bold', color: '#ffc107'}}>
                ${(insights.kpi.cpc || 0).toFixed(2)}
              </div>
              <div style={{fontSize: '12px', color: '#666'}}>Avg CPC</div>
            </div>
            <div style={{textAlign: 'center'}}>
              <div style={{fontSize: '24px', fontWeight: 'bold', color: '#dc3545'}}>
                ${(insights.kpi.cpa || 0).toFixed(2)}
              </div>
              <div style={{fontSize: '12px', color: '#666'}}>CPA</div>
            </div>
          </div>
        </div>
      )}

      <Form method="post" style={{display:'grid', gap:20}}>
        
        {/* Automation Schedule */}
        <div style={sectionStyle}>
          <h3 style={legendStyle}>🕒 Automation Schedule</h3>
          <p style={helpStyle}>Choose how often ProofKit should optimize your campaigns</p>
          <div style={{marginTop: '12px'}}>
            
            <div style={{display: 'grid', gap: '8px'}}>
              {suggestions.schedule?.options.map((option: any, idx: number) => (
                <label key={idx} style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '16px',
                  border: '1px solid #ddd',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  backgroundColor: '#fafafa'
                }}>
                  <input 
                    type="radio" 
                    name="schedule" 
                    value={option.value}
                    defaultChecked={idx === 0}
                    style={{marginRight: '12px'}}
                  />
                  <div>
                    <strong>{option.label}</strong>
                    <div style={{fontSize: '12px', color: '#666', marginTop: '2px'}}>
                      {option.description}
                    </div>
                  </div>
                </label>
              ))}
            </div>
            
            <div style={helpStyle} style={{marginTop: '8px'}}>
              <strong>Tip:</strong> Start with "Daily" if you have active campaigns. You can change this anytime.
            </div>
          </div>
        </div>

        {/* Performance Targets */}
        <div style={sectionStyle}>
          <h3 style={legendStyle}>🎯 Performance Targets</h3>
          <p style={helpStyle}>Choose from personalized options or enter your own values</p>
          <div style={{display: 'grid', gap: '20px', marginTop: '12px'}}>
            
            {/* Target CPA Field */}
            <div>
              <label style={{display: 'block', fontWeight: 'bold', marginBottom: '8px'}}>
                💰 Target Cost Per Acquisition (CPA)
              </label>
              <div style={{...helpStyle, marginBottom: '8px'}}>
                {suggestions.targetCPA?.description}
              </div>
              
              <div style={{marginBottom: '8px'}}>
                <label style={{marginRight: '16px'}}>
                  <input 
                    type="radio" 
                    checked={targetCPAMode === 'preset'} 
                    onChange={() => setTargetCPAMode('preset')}
                    style={{marginRight: '6px'}}
                  />
                  Choose from suggestions
                </label>
                <label>
                  <input 
                    type="radio" 
                    checked={targetCPAMode === 'manual'} 
                    onChange={() => setTargetCPAMode('manual')}
                    style={{marginRight: '6px'}}
                  />
                  Enter manually
                </label>
              </div>

              {targetCPAMode === 'preset' ? (
                <div style={{display: 'grid', gap: '8px'}}>
                  {suggestions.targetCPA?.options.map((option: any, idx: number) => (
                    <label key={idx} style={{
                      display: 'flex',
                      alignItems: 'center',
                      padding: '12px',
                      border: '1px solid #ddd',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      backgroundColor: '#fafafa'
                    }}>
                      <input 
                        type="radio" 
                        name="target_cpa" 
                        value={option.value}
                        defaultChecked={idx === 1}
                        style={{marginRight: '12px'}}
                      />
                      <div>
                        <strong>${option.value}</strong> - {option.label}
                        <div style={{fontSize: '12px', color: '#666', marginTop: '2px'}}>
                          {option.description}
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              ) : (
                <input 
                  name="target_cpa" 
                  type="number" 
                  step="0.01" 
                  defaultValue={cfg?.AP?.target_cpa||''} 
                  placeholder="Enter your target CPA (e.g., 25.00)"
                  style={{
                    padding: '8px 12px',
                    borderRadius: '4px',
                    border: '1px solid #ddd',
                    width: '100%',
                    maxWidth: '300px'
                  }}
                />
              )}
            </div>

            {/* Target ROAS Field */}
            <div>
              <label style={{display: 'block', fontWeight: 'bold', marginBottom: '8px'}}>
                📈 Target Return on Ad Spend (ROAS)
              </label>
              <div style={{...helpStyle, marginBottom: '8px'}}>
                {suggestions.targetROAS?.description}
              </div>
              
              <div style={{marginBottom: '8px'}}>
                <label style={{marginRight: '16px'}}>
                  <input 
                    type="radio" 
                    checked={targetROASMode === 'preset'} 
                    onChange={() => setTargetROASMode('preset')}
                    style={{marginRight: '6px'}}
                  />
                  Choose from suggestions
                </label>
                <label>
                  <input 
                    type="radio" 
                    checked={targetROASMode === 'manual'} 
                    onChange={() => setTargetROASMode('manual')}
                    style={{marginRight: '6px'}}
                  />
                  Enter manually
                </label>
              </div>

              {targetROASMode === 'preset' ? (
                <div style={{display: 'grid', gap: '8px'}}>
                  {suggestions.targetROAS?.options.map((option: any, idx: number) => (
                    <label key={idx} style={{
                      display: 'flex',
                      alignItems: 'center',
                      padding: '12px',
                      border: '1px solid #ddd',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      backgroundColor: '#fafafa'
                    }}>
                      <input 
                        type="radio" 
                        name="target_roas" 
                        value={option.value}
                        defaultChecked={idx === 1}
                        style={{marginRight: '12px'}}
                      />
                      <div>
                        <strong>{option.value}x ROAS</strong> - {option.label}
                        <div style={{fontSize: '12px', color: '#666', marginTop: '2px'}}>
                          {option.description}
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              ) : (
                <input 
                  name="target_roas" 
                  type="number" 
                  step="0.01" 
                  defaultValue={cfg?.AP?.target_roas||''} 
                  placeholder="Enter your target ROAS (e.g., 4.0)"
                  style={{
                    padding: '8px 12px',
                    borderRadius: '4px',
                    border: '1px solid #ddd',
                    width: '100%',
                    maxWidth: '300px'
                  }}
                />
              )}
            </div>
          </div>
        </div>

        {/* Bid Limits */}
        <div style={sectionStyle}>
          <h3 style={legendStyle}>💳 Maximum Bid Limits</h3>
          <p style={helpStyle}>Set cost-per-click limits to control your ad spending</p>
          <div style={{marginTop: '12px'}}>
            
            {/* Quick Setup Options */}
            <div style={{marginBottom: '16px'}}>
              <h4 style={{fontSize: '16px', fontWeight: 'bold', marginBottom: '8px'}}>
                🚀 Quick Setup (Recommended)
              </h4>
              <div style={{display: 'grid', gap: '8px'}}>
                {suggestions.bidCeiling?.options.map((option: any, idx: number) => (
                  <button 
                    key={idx}
                    type="button"
                    onClick={() => {
                      // Set the "all campaigns" limit
                      const campaignInput = document.querySelector('input[name="caps_campaign"]') as HTMLInputElement
                      const valueInput = document.querySelector('input[name="caps_value"]') as HTMLInputElement
                      if (campaignInput && valueInput) {
                        campaignInput.value = '*'
                        valueInput.value = option.value
                        setToast(`✨ Set ${option.label} bid limit: $${option.value} for all campaigns`)
                        setTimeout(() => setToast(''), 3000)
                      }
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '16px',
                      border: '1px solid #ddd',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      backgroundColor: '#fafafa',
                      textAlign: 'left',
                      fontSize: '14px'
                    }}
                  >
                    <div>
                      <strong>${option.value} - {option.label}</strong>
                      <div style={{fontSize: '12px', color: '#666', marginTop: '2px'}}>
                        {option.description}
                      </div>
                    </div>
                    <span style={{fontSize: '12px', color: '#007bff', fontWeight: 'bold'}}>
                      ✨ Apply
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Manual Campaign-Specific Limits */}
            <div>
              <h4 style={{fontSize: '16px', fontWeight: 'bold', marginBottom: '8px'}}>
                🎯 Campaign-Specific Limits (Optional)
              </h4>
              <div style={{display:'grid', gridTemplateColumns:'1fr 140px', gap:8, marginBottom: '8px'}}>
                <strong>Campaign Name</strong>
                <strong>Max CPC ($)</strong>
              </div>
              {capRows.map((row,i)=>(
                <div key={i} style={{display:'grid', gridTemplateColumns:'1fr 140px', gap:8, marginBottom: '4px'}}>
                  <input 
                    name="caps_campaign" 
                    defaultValue={row.campaign} 
                    placeholder="Campaign name or * for all"
                    style={{padding: '8px', borderRadius: '4px', border: '1px solid #ddd'}}
                  />
                  <input 
                    name="caps_value" 
                    type="number" 
                    step="0.01" 
                    defaultValue={row.value}
                    style={{padding: '8px', borderRadius: '4px', border: '1px solid #ddd'}}
                  />
                </div>
              ))}
              <div style={{display:'grid', gridTemplateColumns:'1fr 140px', gap:8, marginBottom: '8px'}}>
                <input 
                  name="caps_campaign" 
                  placeholder="Campaign name (or * for all campaigns)"
                  style={{padding: '8px', borderRadius: '4px', border: '1px solid #ddd'}}
                />
                <input 
                  name="caps_value" 
                  type="number" 
                  step="0.01" 
                  placeholder="Max $"
                  style={{padding: '8px', borderRadius: '4px', border: '1px solid #ddd'}}
                />
              </div>
              <div style={helpStyle}>
                <strong>Examples:</strong> Use "*" for all campaigns, "Brand Campaign" for specific ones. Set to 0 to remove a limit.
              </div>
              <div style={{display: 'flex', alignItems: 'center', gap: '12px', marginTop: '12px'}}>
                <button 
                  type="submit" 
                  name="save_caps" 
                  value="1" 
                  disabled={nav.state!=='idle'} 
                  style={{
                    padding: '8px 16px',
                    backgroundColor: nav.state!=='idle' ? '#6c757d' : '#007bff',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: nav.state!=='idle' ? 'not-allowed' : 'pointer',
                    opacity: nav.state!=='idle' ? 0.7 : 1
                  }}
                >
                  {nav.state!=='idle' ? '⏳ Saving...' : '💾 Save Bid Limits'}
                </button>
                {buttonFeedback.saveCaps && (
                  <span style={{
                    color: '#155724',
                    fontSize: '14px',
                    fontWeight: 'bold',
                    padding: '4px 8px',
                    backgroundColor: '#d4edda',
                    borderRadius: '4px',
                    border: '1px solid #c3e6cb'
                  }}>
                    {buttonFeedback.saveCaps}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* SEO Optimization */}
        <div style={sectionStyle}>
          <h3 style={legendStyle}>🔍 SEO Optimization</h3>
          <p style={helpStyle}>Improve your product pages for search engines</p>
          <div style={{display:'grid', gap:12, marginTop: '12px'}}>
            <div>
              <label style={{display: 'block', fontWeight: 'bold', marginBottom: '4px'}}>
                Product IDs or Handles
              </label>
              <textarea 
                name="product_ids" 
                rows={3} 
                placeholder="Enter product IDs or handles, separated by spaces, commas, or |" 
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '4px',
                  border: '1px solid #ddd',
                  fontFamily: 'monospace',
                  fontSize: '14px'
                }}
              />
              <div style={helpStyle}>
                Example: "12345 67890" or "t-shirt-blue, sneakers-red"
              </div>
            </div>
            
            <div>
              <label style={{display: 'block', fontWeight: 'bold', marginBottom: '8px'}}>
                SEO Strategy
              </label>
              <label style={{marginRight: '20px'}}>
                <input type="radio" name="strategy" value="template" defaultChecked style={{marginRight: '6px'}} /> 
                📝 Template (Use your own patterns)
              </label>
              <label>
                <input type="radio" name="strategy" value="ai" style={{marginRight: '6px'}} /> 
                🤖 AI (Let AI write descriptions)
              </label>
            </div>
            
            <div>
              <label style={{display: 'block', fontWeight: 'bold', marginBottom: '4px'}}>
                Title Template
              </label>
              <input 
                name="template_title" 
                placeholder="{{title}} | Free Shipping | Your Store" 
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '4px',
                  border: '1px solid #ddd'
                }}
              />
              <div style={helpStyle}>
                Use {'{{title}}'} for product name, {'{{brand}}'} for brand name
              </div>
            </div>
            
            <div>
              <label style={{display: 'block', fontWeight: 'bold', marginBottom: '4px'}}>
                Description Template
              </label>
              <input 
                name="template_description" 
                placeholder="Discover {{title}} by {{brand}}. High quality, fast shipping." 
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '4px',
                  border: '1px solid #ddd'
                }}
              />
            </div>
            
            <div style={{display:'flex', gap:12, flexWrap: 'wrap', alignItems: 'center'}}>
              <button 
                type="submit" 
                name="seo_preview" 
                value="1" 
                disabled={nav.state!=='idle'}
                style={{
                  padding: '8px 16px',
                  backgroundColor: nav.state!=='idle' ? '#6c757d' : '#ffc107',
                  color: nav.state!=='idle' ? 'white' : '#333',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: nav.state!=='idle' ? 'not-allowed' : 'pointer',
                  opacity: nav.state!=='idle' ? 0.7 : 1
                }}
              >
                {nav.state!=='idle' ? '⏳ Loading...' : '👁️ Preview Changes'}
              </button>
              <button 
                type="submit" 
                name="seo_apply" 
                value="1" 
                disabled={nav.state!=='idle'}
                style={{
                  padding: '8px 16px',
                  backgroundColor: nav.state!=='idle' ? '#6c757d' : '#28a745',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: nav.state!=='idle' ? 'not-allowed' : 'pointer',
                  opacity: nav.state!=='idle' ? 0.7 : 1
                }}
              >
                {nav.state!=='idle' ? '⏳ Applying...' : '✅ Apply to Store'}
              </button>
              {buttonFeedback.seoPreview && (
                <span style={{
                  color: '#856404',
                  fontSize: '14px',
                  fontWeight: 'bold',
                  padding: '4px 8px',
                  backgroundColor: '#fff3cd',
                  borderRadius: '4px',
                  border: '1px solid #ffeaa7'
                }}>
                  {buttonFeedback.seoPreview}
                </span>
              )}
              {buttonFeedback.seoApply && (
                <span style={{
                  color: '#155724',
                  fontSize: '14px',
                  fontWeight: 'bold',
                  padding: '4px 8px',
                  backgroundColor: '#d4edda',
                  borderRadius: '4px',
                  border: '1px solid #c3e6cb'
                }}>
                  {buttonFeedback.seoApply}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Target Keywords */}
        <div style={sectionStyle}>
          <h3 style={legendStyle}>🔑 Target Keywords</h3>
          <p style={helpStyle}>Choose keyword categories that match your business or enter your own</p>
          <div style={{marginTop: '12px'}}>
            
            <div style={{marginBottom: '12px'}}>
              <label style={{marginRight: '16px'}}>
                <input 
                  type="radio" 
                  checked={keywordsMode === 'preset'} 
                  onChange={() => setKeywordsMode('preset')}
                  style={{marginRight: '6px'}}
                />
                Choose keyword category
              </label>
              <label>
                <input 
                  type="radio" 
                  checked={keywordsMode === 'manual'} 
                  onChange={() => setKeywordsMode('manual')}
                  style={{marginRight: '6px'}}
                />
                Enter my own keywords
              </label>
            </div>

            {keywordsMode === 'preset' ? (
              <div style={{display: 'grid', gap: '12px'}}>
                {suggestions.keywords?.options.map((option: any, idx: number) => (
                  <label key={idx} style={{
                    display: 'block',
                    padding: '16px',
                    border: '1px solid #ddd',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    backgroundColor: '#fafafa'
                  }}>
                    <div style={{display: 'flex', alignItems: 'flex-start', gap: '12px'}}>
                      <input 
                        type="radio" 
                        name="desired_keywords" 
                        value={option.value}
                        defaultChecked={idx === 0}
                        style={{marginTop: '4px'}}
                      />
                      <div>
                        <strong>{option.label}</strong>
                        <div style={{fontSize: '12px', color: '#666', marginTop: '4px', marginBottom: '8px'}}>
                          {option.description}
                        </div>
                        <div style={{
                          fontSize: '14px',
                          color: '#333',
                          backgroundColor: 'white',
                          padding: '8px',
                          borderRadius: '4px',
                          border: '1px solid #eee',
                          fontFamily: 'monospace',
                          whiteSpace: 'pre-line'
                        }}>
                          {option.value}
                        </div>
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            ) : (
              <textarea 
                name="desired_keywords" 
                rows={6} 
                placeholder="Enter your keywords, one per line:&#10;your product name&#10;your brand&#10;your industry terms&#10;competitor alternatives"
                defaultValue={(cfg?.AP?.desired_keywords||[]).join('\n')}
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '4px',
                  border: '1px solid #ddd',
                  fontFamily: 'monospace',
                  fontSize: '14px'
                }}
              />
            )}
            
            <div style={helpStyle}>
              These keywords help guide the autopilot's optimization decisions and negative keyword suggestions.
            </div>
          </div>
        </div>

        {/* AI Instructions */}
        <div style={sectionStyle}>
          <h3 style={legendStyle}>🤖 AI Behavior Instructions</h3>
          <p style={helpStyle}>Choose a business strategy or write custom instructions for the AI</p>
          <div style={{marginTop: '12px'}}>
            
            <div style={{marginBottom: '12px'}}>
              <label style={{marginRight: '16px'}}>
                <input 
                  type="radio" 
                  checked={aiBehaviorMode === 'preset'} 
                  onChange={() => setAiBehaviorMode('preset')}
                  style={{marginRight: '6px'}}
                />
                Choose business strategy
              </label>
              <label>
                <input 
                  type="radio" 
                  checked={aiBehaviorMode === 'manual'} 
                  onChange={() => setAiBehaviorMode('manual')}
                  style={{marginRight: '6px'}}
                />
                Write custom instructions
              </label>
            </div>

            {aiBehaviorMode === 'preset' ? (
              <div style={{display: 'grid', gap: '12px'}}>
                {suggestions.aiBehavior?.options.map((option: any, idx: number) => (
                  <label key={idx} style={{
                    display: 'block',
                    padding: '16px',
                    border: '1px solid #ddd',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    backgroundColor: '#fafafa'
                  }}>
                    <div style={{display: 'flex', alignItems: 'flex-start', gap: '12px'}}>
                      <input 
                        type="radio" 
                        name="playbook" 
                        value={option.value}
                        defaultChecked={idx === 2} // Default to "Balanced Approach"
                        style={{marginTop: '4px'}}
                      />
                      <div style={{flex: 1}}>
                        <div style={{display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px'}}>
                          <strong style={{fontSize: '16px'}}>{option.label}</strong>
                          <span style={{
                            fontSize: '12px',
                            color: '#007bff',
                            backgroundColor: '#e7f3ff',
                            padding: '2px 8px',
                            borderRadius: '12px'
                          }}>
                            {idx === 0 ? '💎 Premium' : idx === 1 ? '🚀 Growth' : '⚖️ Balanced'}
                          </span>
                        </div>
                        <div style={{fontSize: '13px', color: '#666', marginBottom: '10px'}}>
                          {option.description}
                        </div>
                        <div style={{
                          fontSize: '12px',
                          color: '#333',
                          backgroundColor: 'white',
                          padding: '10px',
                          borderRadius: '4px',
                          border: '1px solid #eee',
                          fontFamily: 'inherit',
                          whiteSpace: 'pre-line',
                          fontStyle: 'italic'
                        }}>
                          "{option.value}"
                        </div>
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            ) : (
              <textarea 
                name="playbook" 
                rows={8} 
                placeholder="Write specific instructions for the AI:&#10;&#10;• What type of customers should we focus on?&#10;• What's our competitive advantage?&#10;• Any products/keywords to avoid?&#10;• Special business rules or constraints?&#10;• Brand voice and messaging guidelines?"
                defaultValue={cfg?.AP?.playbook_prompt||''}
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '4px',
                  border: '1px solid #ddd',
                  fontFamily: 'inherit',
                  fontSize: '14px'
                }}
              />
            )}
            
            <div style={helpStyle} style={{marginTop: '8px'}}>
              These instructions help the AI understand your business goals and make better optimization decisions.
            </div>
          </div>
        </div>

        {/* Action Button */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: '16px',
          padding: '24px',
          borderTop: '2px solid #e1e5e9',
          marginTop: '20px'
        }}>
          <button 
            type="submit" 
            name="run_optimization" 
            value="1" 
            disabled={nav.state!=='idle'}
            style={{
              padding: '16px 32px',
              backgroundColor: nav.state!=='idle' ? '#6c757d' : '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: nav.state!=='idle' ? 'not-allowed' : 'pointer',
              fontSize: '18px',
              fontWeight: 'bold',
              opacity: nav.state!=='idle' ? 0.7 : 1,
              boxShadow: nav.state==='idle' ? '0 4px 12px rgba(40, 167, 69, 0.3)' : 'none',
              transition: 'all 0.2s ease'
            }}
          >
            {nav.state!=='idle' ? '⏳ Saving & Running...' : '💾 Save Settings & Run Optimization'}
          </button>
          {(buttonFeedback.saveSettings || buttonFeedback.runOptimization) && (
            <span style={{
              color: '#155724',
              fontSize: '16px',
              fontWeight: 'bold',
              padding: '8px 16px',
              backgroundColor: '#d4edda',
              borderRadius: '6px',
              border: '2px solid #c3e6cb',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
            }}>
              {buttonFeedback.runOptimization || buttonFeedback.saveSettings}
            </span>
          )}
        </div>
      </Form>

      {Array.isArray(preview) && preview.length>0 && (
        <div style={{
          marginTop: '24px',
          padding: '20px',
          backgroundColor: '#f8f9fa',
          borderRadius: '8px',
          border: '1px solid #e1e5e9'
        }}>
          <h3>👁️ SEO Preview</h3>
          <p style={helpStyle}>Here's how your product pages will look after optimization:</p>
          <div style={{overflowX: 'auto', marginTop: '12px'}}>
            <table style={{
              width:'100%',
              borderCollapse:'collapse',
              backgroundColor: 'white',
              borderRadius: '4px',
              overflow: 'hidden'
            }}>
              <thead>
                <tr style={{backgroundColor: '#f1f3f4'}}>
                  <th style={{padding: '12px', textAlign: 'left', borderBottom: '1px solid #ddd'}}>Product</th>
                  <th style={{padding: '12px', textAlign: 'left', borderBottom: '1px solid #ddd'}}>New Title</th>
                  <th style={{padding: '12px', textAlign: 'left', borderBottom: '1px solid #ddd'}}>New Description</th>
                  <th style={{padding: '12px', textAlign: 'left', borderBottom: '1px solid #ddd'}}>Image Alt Text</th>
                </tr>
              </thead>
              <tbody>
                {preview.map((p:any,i:number)=> (
                  <tr key={i} style={{borderBottom: '1px solid #eee'}}>
                    <td style={{padding: '12px', fontFamily: 'monospace', fontSize: '14px'}}>{p.productId}</td>
                    <td style={{padding: '12px'}}>{p.title}</td>
                    <td style={{padding: '12px'}}>{p.description}</td>
                    <td style={{padding: '12px', fontStyle: 'italic'}}>{p.images?.[0]?.altText||'(no alt text)'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}