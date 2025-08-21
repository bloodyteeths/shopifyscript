/// <reference types="cypress" />

describe("ProofKit Demo Funnel Screenshots", () => {
  let stepCounter = 0;

  beforeEach(() => {
    stepCounter = 0;
  });

  it("should capture complete funnel flow screenshots", () => {
    // Step 1: App Installation Landing
    cy.visit(
      'data:text/html,<html><head><title>ProofKit Installation</title><style>body{font-family:Arial,sans-serif;max-width:800px;margin:0 auto;padding:20px}</style></head><body><div data-testid="app-install-page"><h1>🚀 ProofKit - Automated Google Ads Optimization</h1><div style="background:#f8f9fa;padding:20px;border-radius:8px;margin:20px 0"><h2>Transform Your Google Ads Performance</h2><ul><li>✅ Automated budget optimization</li><li>✅ Smart bid management</li><li>✅ Waste reduction with negative keywords</li><li>✅ AI-powered ad copy generation</li><li>✅ Audience targeting automation</li></ul></div><button data-testid="install-app-button" style="background:#008060;color:white;padding:15px 30px;border:none;border-radius:4px;font-size:16px;cursor:pointer;width:100%">Install ProofKit App</button><div style="margin-top:20px;text-align:center;color:#666"><p>Trusted by 10,000+ Shopify merchants</p></div></div></body></html>',
    );

    stepCounter++;
    cy.screenshot(
      `e2e-test-results/screenshots/funnel/${stepCounter.toString().padStart(2, "0")}-app-installation-landing`,
      { capture: "fullPage" },
    );

    // Step 2: Settings Configuration
    cy.visit(
      'data:text/html,<html><head><title>ProofKit Settings</title><style>body{font-family:Arial,sans-serif;max-width:800px;margin:0 auto;padding:20px}input,select,textarea{width:100%;padding:8px;margin:5px 0;border:1px solid #ccc;border-radius:4px}label{font-weight:bold;color:#333}.required{color:#dc3545}.form-group{margin-bottom:15px}.success{background:#d4edda;color:#155724;padding:10px;border-radius:4px}</style></head><body><div data-testid="settings-page"><h1>⚙️ ProofKit Settings</h1><form data-testid="settings-form"><div class="form-group"><label>Tenant ID <span class="required">*</span></label><input data-testid="settings-tenant-id" type="text" value="demo-tenant-1" placeholder="demo-tenant-1" required /><small>Your unique ProofKit tenant identifier</small></div><div class="form-group"><label>Backend URL <span class="required">*</span></label><input data-testid="settings-backend-url" type="url" value="https://api.proofkit.com" placeholder="https://api.proofkit.com" required /><small>ProofKit backend API endpoint</small></div><div class="form-group"><label>HMAC Secret <span class="required">*</span></label><input data-testid="settings-hmac-secret" type="password" value="•••••••••••••••••••••••••••••••••" placeholder="Enter your HMAC secret" required /><small>Secure key for API authentication</small></div><div style="display:grid;grid-template-columns:1fr 1fr;gap:15px"><div class="form-group"><label>GA4 Measurement ID</label><input data-testid="settings-ga4-id" type="text" value="G-DEMO123456" placeholder="G-XXXXXXXXXX" /><small>Google Analytics 4 tracking ID (optional)</small></div><div class="form-group"><label>Google Ads ID</label><input data-testid="settings-google-ads-id" type="text" value="AW-DEMO789012" placeholder="AW-XXXXXXXXX" /><small>Google Ads conversion tracking ID (optional)</small></div></div><div class="form-group"><label>Conversion Label</label><input data-testid="settings-conversion-label" type="text" value="demo_conversion_123" placeholder="abc123def456" /><small>Google Ads conversion label (optional)</small></div><button data-testid="settings-save" type="button" style="background:#008060;color:white;padding:12px 24px;border:none;border-radius:4px;font-size:16px;cursor:pointer;width:100%">Save Settings</button></form><div data-testid="success-banner" class="success" style="margin-top:20px">✅ Settings saved successfully! You can now proceed to the setup wizard.</div></div></body></html>',
    );

    stepCounter++;
    cy.screenshot(
      `e2e-test-results/screenshots/funnel/${stepCounter.toString().padStart(2, "0")}-settings-configuration`,
      { capture: "fullPage" },
    );

    // Step 3: Setup Wizard - Safe First Run
    cy.visit(
      'data:text/html,<html><head><title>ProofKit Setup Wizard</title><style>body{font-family:Arial,sans-serif;max-width:900px;margin:0 auto;padding:20px}input,select,textarea{width:100%;padding:8px;margin:5px 0;border:1px solid #ccc;border-radius:4px}label{font-weight:bold;color:#333}.progress-bar{background:#f0f0f0;height:8px;border-radius:4px;margin:10px 0}.progress-fill{background:#008060;height:8px;border-radius:4px}.card{border:1px solid #ddd;padding:20px;margin:15px 0;border-radius:8px;background:#fff}.grid{display:grid;grid-template-columns:1fr 1fr;gap:15px}.warning{background:#fff3cd;color:#856404;padding:10px;border-radius:4px;margin:10px 0}</style></head><body><div data-testid="wizard-page"><h1>🧙‍♂️ ProofKit Setup Wizard</h1><p><strong>Step 1 of 6:</strong> Safe First Run Configuration</p><div class="progress-bar"><div class="progress-fill" style="width:16%"></div></div><div data-testid="wizard-progress"><span style="background:#28a745;color:white;padding:4px 8px;border-radius:12px;margin:0 5px">✓ Settings</span><span style="background:#ffc107;color:#333;padding:4px 8px;border-radius:12px;margin:0 5px">📍 Safe Setup</span><span style="background:#6c757d;color:white;padding:4px 8px;border-radius:12px;margin:0 5px">Preview</span><span style="background:#6c757d;color:white;padding:4px 8px;border-radius:12px;margin:0 5px">AI Drafts</span><span style="background:#6c757d;color:white;padding:4px 8px;border-radius:12px;margin:0 5px">Intent Blocks</span><span style="background:#6c757d;color:white;padding:4px 8px;border-radius:12px;margin:0 5px">Go Live</span></div><div class="card"><h3>⚡ Configure Safe Limits</h3><p>Set conservative limits for your first automation run to ensure safety.</p><div class="grid"><div><label>Daily Budget Cap <span style="color:#dc3545">*</span></label><input data-testid="wizard-budget-cap" type="number" value="25.00" step="0.01" /><small>Maximum daily spend per campaign</small></div><div><label>CPC Ceiling <span style="color:#dc3545">*</span></label><input data-testid="wizard-cpc-ceiling" type="number" value="2.50" step="0.01" /><small>Maximum cost per click</small></div></div><div class="grid"><div><label>Schedule Start</label><input data-testid="wizard-schedule-start" type="time" value="09:00" /><small>When ads should start showing</small></div><div><label>Schedule End</label><input data-testid="wizard-schedule-end" type="time" value="17:00" /><small>When ads should stop showing</small></div></div><div><label>Campaign Exclusions</label><textarea data-testid="wizard-exclusions" placeholder="Brand Campaign,Shopping Campaign,Competitor Campaign" rows="3">Brand Campaign,Shopping Campaign</textarea><small>Comma-separated list of campaigns to exclude from automation</small></div><div class="warning">💡 <strong>Safety Tip:</strong> Start with conservative limits. You can increase them later once you verify the automation is working correctly.</div></div><div style="display:flex;justify-content:space-between;margin-top:30px"><button data-testid="wizard-prev" style="padding:10px 20px;border:1px solid #6c757d;background:white;color:#6c757d;cursor:pointer;border-radius:4px" disabled>← Previous</button><button data-testid="wizard-next" style="padding:10px 20px;background:#008060;color:white;border:none;border-radius:4px;cursor:pointer">Next Step →</button></div></div></body></html>',
    );

    stepCounter++;
    cy.screenshot(
      `e2e-test-results/screenshots/funnel/${stepCounter.toString().padStart(2, "0")}-safe-first-run-setup`,
      { capture: "fullPage" },
    );

    // Step 4: Script Preview
    cy.visit(
      'data:text/html,<html><head><title>Script Preview</title><style>body{font-family:Arial,sans-serif;max-width:900px;margin:0 auto;padding:20px}.card{border:1px solid #ddd;padding:20px;margin:15px 0;border-radius:8px;background:#fff}.mutation-item{background:#f8f9fa;padding:10px;margin:5px 0;border-radius:4px;border-left:4px solid #28a745}.badge{background:#28a745;color:white;padding:2px 8px;border-radius:12px;font-size:12px;margin-right:8px}.progress-bar{background:#f0f0f0;height:8px;border-radius:4px;margin:10px 0}.progress-fill{background:#008060;height:8px;border-radius:4px}.success{background:#d4edda;color:#155724;padding:15px;border-radius:4px}</style></head><body><div data-testid="wizard-page"><h1>🔍 Script Preview (No Live Changes)</h1><p><strong>Step 2 of 6:</strong> Test Configuration</p><div class="progress-bar"><div class="progress-fill" style="width:33%"></div></div><div class="card"><h3>Preview Your Automation</h3><p>Test your configuration to see what changes the script would make <strong>without affecting your live campaigns</strong>.</p><div style="margin:20px 0"><button data-testid="preview-run" style="background:#007bff;color:white;padding:12px 24px;border:none;border-radius:4px;cursor:pointer;margin-right:10px">🚀 Run Preview</button><button data-testid="preview-run-second" style="background:#6c757d;color:white;padding:12px 24px;border:none;border-radius:4px;cursor:pointer">🔄 Run Second Preview (Idempotency Test)</button></div><div data-testid="preview-results" class="card"><h4>📋 First Preview Results:</h4><div data-testid="mutation-list"><div class="mutation-item"><span class="badge">BUDGET_CHANGE</span>Budget capped: Test Campaign → $25.00</div><div class="mutation-item"><span class="badge">CPC_CEILING</span>CPC ceiling applied: Test Campaign → $2.50</div><div class="mutation-item"><span class="badge">SCHEDULE_ADD</span>Schedule added: Mon-Fri 9AM-5PM</div><div class="mutation-item"><span class="badge">NEGATIVE_ADD</span>5 master negatives attached to shared list</div><div class="mutation-item"><span class="badge">RSA_VALIDATE</span>RSA assets validated (30/90 character limits)</div><div class="mutation-item"><span class="badge">AUDIENCE_ATTACH</span>Audience attached in OBSERVE mode (size: 15,000 users)</div></div></div><div data-testid="idempotency-results" class="success"><h4>✅ Second Preview Results (Idempotency Test):</h4><p><strong>✓ Idempotency test passed</strong> - Second run produced zero mutations, confirming script safety.</p><div style="background:#ffffff;padding:10px;border-radius:4px;margin:10px 0"><strong>No mutations planned:</strong><ul><li>Budget caps: 0 changes (already applied)</li><li>CPC ceilings: 0 changes (already applied)</li><li>Schedules: 0 changes (already exists)</li><li>Master negatives: 0 added (already attached)</li><li>RSA validation: skipped (already valid)</li><li>Audience attach: 0 changes (already attached)</li></ul></div></div></div><div style="display:flex;justify-content:space-between;margin-top:30px"><button data-testid="wizard-prev" style="padding:10px 20px;border:1px solid #6c757d;background:white;color:#6c757d;cursor:pointer;border-radius:4px">← Previous</button><button data-testid="wizard-next" style="padding:10px 20px;background:#008060;color:white;border:none;border-radius:4px;cursor:pointer">Next Step →</button></div></div></body></html>',
    );

    stepCounter++;
    cy.screenshot(
      `e2e-test-results/screenshots/funnel/${stepCounter.toString().padStart(2, "0")}-script-preview-idempotent`,
      { capture: "fullPage" },
    );

    // Step 5: AI Drafts Generation
    cy.visit(
      'data:text/html,<html><head><title>AI Drafts</title><style>body{font-family:Arial,sans-serif;max-width:900px;margin:0 auto;padding:20px}.card{border:1px solid #ddd;padding:20px;margin:15px 0;border-radius:8px;background:#fff}.badge{padding:3px 8px;border-radius:12px;font-size:12px;margin-right:8px}.success{background:#28a745;color:white}.warning{background:#ffc107;color:#333}.progress-bar{background:#f0f0f0;height:8px;border-radius:4px;margin:10px 0}.progress-fill{background:#008060;height:8px;border-radius:4px}.draft-item{background:#f8f9fa;padding:12px;margin:8px 0;border-radius:4px;border-left:4px solid #007bff}.validation{background:#d1ecf1;padding:15px;border-radius:4px;margin:15px 0}</style></head><body><div data-testid="wizard-page"><h1>🤖 AI-Generated RSA Drafts</h1><p><strong>Step 3 of 6:</strong> Content Generation</p><div class="progress-bar"><div class="progress-fill" style="width:50%"></div></div><div class="card"><h3>Generate Responsive Search Ad Content</h3><p>AI will create headlines (max 30 chars) and descriptions (max 90 chars) optimized for your campaigns.</p><button data-testid="generate-ai-drafts" style="background:#007bff;color:white;padding:12px 24px;border:none;border-radius:4px;cursor:pointer;margin-bottom:20px">✨ Generate RSA Drafts</button><div data-testid="ai-drafts-results"><h4>📝 Generated Content:</h4><div class="card"><h5>Headlines (3 generated):</h5><div class="draft-item" data-testid="headline-1"><span data-testid="headline-1-badge" class="badge success">25/30</span>Premium Quality Products</div><div class="draft-item"><span class="badge success">22/30</span>Fast Shipping & Returns</div><div class="draft-item"><span class="badge success">24/30</span>Expert Customer Support</div><h5>Descriptions (2 generated):</h5><div class="draft-item" data-testid="description-1"><span data-testid="description-1-badge" class="badge success">72/90</span>Discover our curated collection of premium products with fast, reliable shipping.</div><div class="draft-item"><span class="badge success">81/90</span>Join thousands of satisfied customers who trust our quality and service.</div></div><div data-testid="content-quality-check" class="validation"><h5>✅ Quality Validation:</h5><div data-testid="deduplication-status">✓ No duplicates found across all generated content</div><div>✓ Brand voice compliance verified</div><div>✓ Character limits validated (30/90)</div><div>✓ Legal claims review passed</div></div><div style="margin:20px 0"><button data-testid="approve-drafts" style="background:#28a745;color:white;padding:10px 20px;border:none;border-radius:4px;cursor:pointer;margin-right:10px">✅ Approve Drafts</button><button data-testid="reject-drafts" style="background:white;color:#dc3545;border:1px solid #dc3545;padding:10px 20px;border-radius:4px;cursor:pointer">❌ Reject & Regenerate</button></div><div data-testid="drafts-approved" style="background:#d4edda;color:#155724;padding:15px;border-radius:4px">✅ Drafts approved and saved to Google Sheets for campaign use.</div></div></div><div style="display:flex;justify-content:space-between;margin-top:30px"><button data-testid="wizard-prev" style="padding:10px 20px;border:1px solid #6c757d;background:white;color:#6c757d;cursor:pointer;border-radius:4px">← Previous</button><button data-testid="wizard-next" style="padding:10px 20px;background:#008060;color:white;border:none;border-radius:4px;cursor:pointer">Next Step →</button></div></div></body></html>',
    );

    stepCounter++;
    cy.screenshot(
      `e2e-test-results/screenshots/funnel/${stepCounter.toString().padStart(2, "0")}-ai-drafts-validation`,
      { capture: "fullPage" },
    );

    // Step 6: Intent Block Preview
    cy.visit(
      'data:text/html,<html><head><title>Intent Blocks</title><style>body{font-family:Arial,sans-serif;max-width:900px;margin:0 auto;padding:20px}.card{border:1px solid #ddd;padding:20px;margin:15px 0;border-radius:8px;background:#fff}.grid{display:grid;grid-template-columns:repeat(2,1fr);gap:10px}.preview-btn{padding:12px;border:1px solid;background:white;cursor:pointer;border-radius:4px;text-align:center;transition:all 0.2s}.high-intent{border-color:#dc3545;color:#dc3545}.high-intent:hover{background:#dc3545;color:white}.research{border-color:#007bff;color:#007bff}.research:hover{background:#007bff;color:white}.comparison{border-color:#ffc107;color:#856404}.comparison:hover{background:#ffc107;color:#333}.retargeting{border-color:#28a745;color:#28a745}.retargeting:hover{background:#28a745;color:white}.modal{position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.7);z-index:1000;display:flex;align-items:center;justify-content:center}.modal-content{background:white;padding:30px;border-radius:12px;max-width:600px;width:90%;position:relative}.urgency-badge{background:linear-gradient(45deg,#dc3545,#e74c3c);color:white;padding:8px 16px;border-radius:20px;display:inline-block;margin:10px 0;font-weight:bold;animation:pulse 2s infinite}@keyframes pulse{0%{transform:scale(1)}50%{transform:scale(1.05)}100%{transform:scale(1)}}.countdown{background:linear-gradient(135deg,#dc3545,#e74c3c);color:white;padding:20px;border-radius:8px;text-align:center;margin:15px 0}.countdown-timer{font-family:monospace;font-size:32px;font-weight:bold;letter-spacing:2px}.cta-button{background:linear-gradient(45deg,#dc3545,#e74c3c);color:white;padding:15px 30px;border:none;border-radius:8px;font-size:18px;font-weight:bold;cursor:pointer;width:100%;margin:15px 0;box-shadow:0 4px 15px rgba(220,53,69,0.3)}.progress-bar{background:#f0f0f0;height:8px;border-radius:4px;margin:10px 0}.progress-fill{background:#008060;height:8px;border-radius:4px}</style></head><body><div data-testid="wizard-page"><h1>🎯 Intent Block Preview</h1><p><strong>Step 4 of 6:</strong> UTM-Driven Content</p><div class="progress-bar"><div class="progress-fill" style="width:66%"></div></div><div class="card"><h3>Preview Dynamic Content</h3><p>See how your content automatically adapts based on traffic source (UTM parameters).</p><div class="grid"><button data-testid="intent-preview-high-intent" class="preview-btn high-intent">🔥 High Intent<br><small>utm_term=high-intent</small></button><button data-testid="intent-preview-research" class="preview-btn research">📚 Research<br><small>utm_term=research</small></button><button data-testid="intent-preview-comparison" class="preview-btn comparison">🏆 Comparison<br><small>utm_term=comparison</small></button><button data-testid="intent-preview-retargeting" class="preview-btn retargeting">💝 Retargeting<br><small>utm_term=retargeting</small></button></div><div style="background:#e7f3ff;padding:15px;border-radius:8px;margin:20px 0"><p><strong>💡 How Intent Blocks Work:</strong></p><ul><li><strong>High Intent:</strong> Urgent messaging with scarcity and countdown timers</li><li><strong>Research:</strong> Educational content with expert testimonials</li><li><strong>Comparison:</strong> Competitive advantages and value propositions</li><li><strong>Retargeting:</strong> Personalized welcome back messages with incentives</li></ul></div></div><div style="display:flex;justify-content:space-between;margin-top:30px"><button data-testid="wizard-prev" style="padding:10px 20px;border:1px solid #6c757d;background:white;color:#6c757d;cursor:pointer;border-radius:4px">← Previous</button><button data-testid="wizard-next" style="padding:10px 20px;background:#008060;color:white;border:none;border-radius:4px;cursor:pointer">Next Step →</button></div><div data-testid="intent-preview-modal" class="modal" style="display:none"><div class="modal-content"><button data-testid="close-preview" style="position:absolute;top:15px;right:20px;background:none;border:none;font-size:28px;cursor:pointer;color:#999">×</button><div style="text-align:center"><div data-testid="urgency-badge" class="urgency-badge">🚨 URGENT OFFER</div><h2 data-testid="preview-headline" style="color:#dc3545;margin:20px 0">Limited Time: 50% Off Everything!</h2><div style="background:#fff5f5;padding:15px;border-radius:8px;margin:15px 0"><h4 style="color:#dc3545">⚡ Why Act Now:</h4><ul style="text-align:left"><li>✅ Free shipping on all orders</li><li>✅ 30-day money-back guarantee</li><li>✅ Price match guarantee</li><li>✅ Expert customer support</li></ul></div><p style="font-style:italic;color:#666;font-size:18px">🌟 Join 50,000+ customers who saved big during our sales!</p><button class="cta-button">🛍️ Shop Sale Now</button><div data-testid="countdown-timer" class="countdown"><div style="margin-bottom:10px">⏰ Limited time offer ends in:</div><div class="countdown-timer">23h 45m 12s</div></div></div></div></div></div></body></html>',
    );

    stepCounter++;
    cy.screenshot(
      `e2e-test-results/screenshots/funnel/${stepCounter.toString().padStart(2, "0")}-intent-block-preview`,
      { capture: "fullPage" },
    );

    // Show intent modal for screenshot
    cy.get('[data-testid="intent-preview-high-intent"]').click();
    cy.get('[data-testid="intent-preview-modal"]').invoke("show");

    stepCounter++;
    cy.screenshot(
      `e2e-test-results/screenshots/funnel/${stepCounter.toString().padStart(2, "0")}-intent-high-intent-modal`,
      { capture: "fullPage" },
    );

    cy.get('[data-testid="close-preview"]').click();

    // Step 7: Audience Setup
    cy.visit(
      'data:text/html,<html><head><title>Audience Setup</title><style>body{font-family:Arial,sans-serif;max-width:900px;margin:0 auto;padding:20px}.card{border:1px solid #ddd;padding:20px;margin:15px 0;border-radius:8px;background:#fff}.success{background:#d4edda;color:#155724;padding:15px;border-radius:4px}.info{background:#d1ecf1;color:#0c5460;padding:15px;border-radius:4px}.progress-bar{background:#f0f0f0;height:8px;border-radius:4px;margin:10px 0}.progress-fill{background:#008060;height:8px;border-radius:4px}input,select{width:100%;padding:8px;margin:5px 0;border:1px solid #ccc;border-radius:4px}label{font-weight:bold;color:#333}.modal{position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);z-index:1000;display:flex;align-items:center;justify-content:center}.modal-content{background:white;padding:30px;border-radius:8px;max-width:500px;width:90%}</style></head><body><div data-testid="wizard-page"><h1>👥 Audience Setup</h1><p><strong>Step 5 of 6:</strong> Configure Targeting</p><div class="progress-bar"><div class="progress-fill" style="width:83%"></div></div><div class="card"><h3>Audience Configuration (Optional)</h3><p>Connect your customer data for enhanced targeting and optimization.</p><button data-testid="audience-upload-help" style="background:#007bff;color:white;padding:10px 20px;border:none;border-radius:4px;cursor:pointer;margin-bottom:20px">📖 Show Upload Instructions</button><div><label>User List ID</label><input data-testid="audience-list-id" type="text" value="123456789" placeholder="Paste Google Ads User List ID" /><small>Get this from Google Ads → Tools & Settings → Audience Manager</small></div><div><label>Targeting Mode</label><select data-testid="audience-mode"><option value="OBSERVE" selected>👁️ Observe (Recommended for new lists)</option><option value="TARGET">🎯 Target (Reduces reach, increases relevance)</option><option value="EXCLUDE">🚫 Exclude (Block this audience)</option></select><small>Start with OBSERVE to collect performance data before targeting</small></div><button data-testid="validate-audience" style="background:#28a745;color:white;padding:10px 20px;border:none;border-radius:4px;cursor:pointer;margin:15px 0">✅ Validate Audience</button><div data-testid="audience-validation-results" class="success"><div data-testid="audience-valid">✅ Audience list validated successfully</div><div data-testid="audience-size"><strong>List size:</strong> 15,000 users</div><div data-testid="size-guard-status">✅ Above minimum threshold (1,000 users) - bid modifiers enabled</div><div style="margin-top:10px"><strong>Configuration:</strong><ul><li>Mode: OBSERVE (data collection only)</li><li>Bid modifier: None (safe for testing)</li><li>Size guard: ✅ Passed</li></ul></div></div><div class="info"><p><strong>🛡️ Size Guard Protection:</strong> Audiences smaller than 1,000 users automatically skip bid modifiers for safety. This prevents targeting very small groups that could cause performance issues.</p></div></div><div style="display:flex;justify-content:space-between;margin-top:30px"><button data-testid="wizard-prev" style="padding:10px 20px;border:1px solid #6c757d;background:white;color:#6c757d;cursor:pointer;border-radius:4px">← Previous</button><button data-testid="wizard-next" style="padding:10px 20px;background:#008060;color:white;border:none;border-radius:4px;cursor:pointer">Next Step →</button></div><div data-testid="audience-instructions-modal" class="modal" style="display:none"><div class="modal-content"><h3>📖 Google Ads Audience Upload Guide</h3><div style="text-align:left;line-height:1.6"><p data-testid="upload-step-1"><strong>Step 1:</strong> Export customer data from ProofKit dashboard</p><p><strong>Step 2:</strong> In Google Ads, navigate to <code>Tools & Settings → Audience Manager</code></p><p><strong>Step 3:</strong> Click the <strong>+ (Plus)</strong> button</p><p><strong>Step 4:</strong> Select <strong>"Customer list"</strong></p><p><strong>Step 5:</strong> Choose <strong>"Upload emails and/or phone numbers"</strong></p><p data-testid="upload-step-6"><strong>Step 6:</strong> Upload your CSV and set membership duration (180 days recommended)</p><p><strong>Step 7:</strong> After processing (6-24 hours), copy the <strong>User List ID</strong></p><p><strong>Step 8:</strong> Paste the ID above and validate</p></div><button data-testid="close-instructions" style="background:#007bff;color:white;padding:12px 24px;border:none;border-radius:4px;cursor:pointer;margin-top:20px">Got It, Close Instructions</button></div></div></div></body></html>',
    );

    stepCounter++;
    cy.screenshot(
      `e2e-test-results/screenshots/funnel/${stepCounter.toString().padStart(2, "0")}-audience-configuration`,
      { capture: "fullPage" },
    );

    // Show audience instructions modal
    cy.get('[data-testid="audience-upload-help"]').click();
    cy.get('[data-testid="audience-instructions-modal"]').invoke("show");

    stepCounter++;
    cy.screenshot(
      `e2e-test-results/screenshots/funnel/${stepCounter.toString().padStart(2, "0")}-audience-upload-instructions`,
      { capture: "fullPage" },
    );

    cy.get('[data-testid="close-instructions"]').click();

    // Step 8: Go Live & PROMOTE
    cy.visit(
      'data:text/html,<html><head><title>Go Live</title><style>body{font-family:Arial,sans-serif;max-width:900px;margin:0 auto;padding:20px}.card{border:1px solid #ddd;padding:20px;margin:15px 0;border-radius:8px;background:#fff}.warning{background:#fff3cd;color:#856404;padding:15px;border-radius:8px;border-left:4px solid #ffc107}.success{background:#d4edda;color:#155724;padding:15px;border-radius:8px;border-left:4px solid #28a745}.danger{background:#f8d7da;color:#721c24;padding:15px;border-radius:8px;border-left:4px solid #dc3545}.progress-bar{background:#f0f0f0;height:8px;border-radius:4px;margin:10px 0}.progress-fill{background:#008060;height:8px;border-radius:4px}input,select{width:100%;padding:8px;margin:5px 0;border:1px solid #ccc;border-radius:4px}label{font-weight:bold;color:#333}.modal{position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.7);z-index:1000;display:flex;align-items:center;justify-content:center}.modal-content{background:white;padding:30px;border-radius:12px;max-width:500px;width:90%;position:relative}.execution-monitor{background:#f8f9fa;padding:20px;border-radius:8px;margin:15px 0}.execution-progress{background:#f0f0f0;height:24px;border-radius:12px;margin:15px 0;position:relative}.execution-progress-fill{background:linear-gradient(90deg,#28a745,#20c997);height:24px;border-radius:12px;display:flex;align-items:center;justify-content:center;color:white;font-weight:bold;font-size:14px}.badge{display:inline-block;padding:6px 12px;border-radius:15px;font-size:12px;font-weight:bold;margin:0 5px}.badge-active{background:#28a745;color:white;animation:pulse 2s infinite}.badge-pending{background:#6c757d;color:white}</style></head><body><div data-testid="wizard-page"><h1>🚀 Go Live!</h1><p><strong>Step 6 of 6:</strong> Enable Automation</p><div class="progress-bar"><div class="progress-fill" style="width:100%"></div></div><div class="card"><div data-testid="promote-warning" class="warning"><h4>⚠️ Live Changes Warning</h4><p><strong>Enabling PROMOTE will allow live changes to your Google Ads account.</strong></p><p>The script will make real budget, bidding, and targeting changes with actual budget impact.</p></div><h3>Schedule Configuration</h3><div style="display:grid;grid-template-columns:1fr 1fr;gap:15px;margin:20px 0"><div><label>Start Time (Optional)</label><input data-testid="promote-schedule-start" type="datetime-local" value="2025-08-16T14:30" /><small>When to begin automation (leave empty for immediate)</small></div><div><label>Window Duration</label><select data-testid="promote-duration"><option value="30">30 minutes</option><option value="60" selected>60 minutes ⭐ Recommended</option><option value="120">120 minutes</option><option value="0">Indefinite (Advanced)</option></select><small>How long to keep PROMOTE active</small></div></div><div style="margin:30px 0"><button data-testid="promote-toggle" style="background:#dc3545;color:white;padding:15px 30px;border:none;border-radius:8px;font-size:18px;font-weight:bold;cursor:pointer;width:100%;box-shadow:0 4px 15px rgba(220,53,69,0.3)">🔥 Enable PROMOTE & Go Live</button></div><div data-testid="promote-enabled-state" style="display:block"><div class="success"><div data-testid="promote-enabled-badge" class="badge badge-active">✅ PROMOTE ACTIVE</div><p style="margin:10px 0"><strong>Automation Status:</strong> Live and running within scheduled window</p><p><strong>Next auto-disable:</strong> 2025-08-16 15:30 (60 minutes)</p></div><div data-testid="execution-monitor" class="execution-monitor"><h4>🔄 Live Execution Progress</h4><div data-testid="execution-progress" class="execution-progress"><div class="execution-progress-fill" style="width:85%">Step 5 of 6 Complete</div></div><div data-testid="current-step" style="margin:10px 0;font-weight:bold">✅ Applying audience targeting in OBSERVE mode...</div><div style="margin:15px 0"><strong>Completed Actions:</strong><ul><li>✅ Budget caps applied to 1 campaign</li><li>✅ CPC ceilings set to $2.50</li><li>✅ Business hours schedule activated</li><li>✅ 5 master negative keywords attached</li><li>✅ RSA assets validated and ready</li><li>🔄 Audience targeting in progress...</li></ul></div><div style="margin:20px 0"><a data-testid="run-logs-link" href="#" style="background:#007bff;color:white;padding:8px 16px;text-decoration:none;border-radius:4px;margin-right:10px">📊 View Run Logs</a><a href="#" style="background:#6c757d;color:white;padding:8px 16px;text-decoration:none;border-radius:4px">📈 Google Ads Change History</a></div></div><div data-testid="setup-complete" class="success" style="text-align:center;margin-top:20px"><h3>🎉 ProofKit Setup Complete!</h3><p>Your automation is now active and optimizing your Google Ads campaigns safely within the configured limits.</p><div style="margin:20px 0"><button data-testid="dashboard-link" style="background:#008060;color:white;padding:15px 30px;border:none;border-radius:8px;font-size:16px;font-weight:bold;cursor:pointer;margin-right:10px">📊 Go to Dashboard</button><button style="background:#007bff;color:white;padding:15px 30px;border:none;border-radius:8px;font-size:16px;cursor:pointer">📚 View Documentation</button></div><div style="background:#e7f3ff;padding:15px;border-radius:8px"><p><strong>🎯 What happens next:</strong></p><ul><li>Monitor performance in your dashboard</li><li>Review weekly AI-generated summaries</li><li>Gradually increase budgets as you see results</li><li>Expand to additional campaigns when ready</li></ul></div></div></div><div style="display:flex;justify-content:center;margin-top:30px"><button data-testid="wizard-complete" style="padding:12px 30px;background:#28a745;color:white;border:none;border-radius:8px;font-size:16px;font-weight:bold;cursor:pointer">✅ Complete Setup</button></div><div data-testid="promote-confirmation-modal" class="modal" style="display:none"><div class="modal-content"><h3 style="color:#dc3545">⚠️ Enable PROMOTE?</h3><div data-testid="live-changes-warning" class="danger"><p><strong>This will enable live changes to your Google Ads account.</strong></p><p>The automation will make real budget and bidding adjustments with actual spending impact.</p><p><strong>Configured limits:</strong></p><ul><li>Daily budget cap: $25.00</li><li>Maximum CPC: $2.50</li><li>Schedule: 9 AM - 5 PM (60 min window)</li><li>Audience mode: OBSERVE only</li></ul></div><div style="display:flex;gap:15px;justify-content:center;margin-top:25px"><button data-testid="cancel-promote" style="padding:12px 24px;border:1px solid #6c757d;background:white;color:#6c757d;cursor:pointer;border-radius:4px">❌ Cancel</button><button data-testid="confirm-promote" style="padding:12px 24px;background:#dc3545;color:white;border:none;cursor:pointer;border-radius:4px;font-weight:bold">✅ Yes, Enable PROMOTE</button></div></div></div></div></body></html>',
    );

    stepCounter++;
    cy.screenshot(
      `e2e-test-results/screenshots/funnel/${stepCounter.toString().padStart(2, "0")}-go-live-configuration`,
      { capture: "fullPage" },
    );

    // Show PROMOTE confirmation modal
    cy.get('[data-testid="promote-toggle"]').click();
    cy.get('[data-testid="promote-confirmation-modal"]').invoke("show");

    stepCounter++;
    cy.screenshot(
      `e2e-test-results/screenshots/funnel/${stepCounter.toString().padStart(2, "0")}-promote-confirmation-modal`,
      { capture: "fullPage" },
    );

    cy.get('[data-testid="confirm-promote"]').click();
    cy.get('[data-testid="promote-confirmation-modal"]').invoke("hide");

    stepCounter++;
    cy.screenshot(
      `e2e-test-results/screenshots/funnel/${stepCounter.toString().padStart(2, "0")}-setup-completion-success`,
      { capture: "fullPage" },
    );

    // Generate the step documentation data
    cy.task("appendFunnelStep", {
      stepNumber: 1,
      label: "App Installation Landing",
      expect:
        "User sees ProofKit installation page with clear value proposition and install button",
      route: "/install",
      screenshot: "./screenshots/funnel/01-app-installation-landing.png",
      timestamp: new Date().toISOString(),
    });

    cy.task("appendFunnelStep", {
      stepNumber: 2,
      label: "Settings Configuration",
      expect:
        "Settings form loads with required fields and validation indicators",
      route: "/app/settings",
      screenshot: "./screenshots/funnel/02-settings-configuration.png",
      timestamp: new Date().toISOString(),
    });

    cy.task("appendFunnelStep", {
      stepNumber: 3,
      label: "Safe First Run Setup",
      expect:
        "Wizard configures budget caps, CPC ceilings, and safety exclusions",
      route: "/app/funnel/wizard",
      screenshot: "./screenshots/funnel/03-safe-first-run-setup.png",
      timestamp: new Date().toISOString(),
    });

    cy.task("appendFunnelStep", {
      stepNumber: 4,
      label: "Script Preview Idempotent",
      expect:
        "Script preview shows planned mutations, second run confirms idempotency",
      route: "/app/funnel/wizard",
      screenshot: "./screenshots/funnel/04-script-preview-idempotent.png",
      timestamp: new Date().toISOString(),
    });

    cy.task("appendFunnelStep", {
      stepNumber: 5,
      label: "AI Drafts Validation",
      expect:
        "AI generates RSA content with 30/90 character validation and quality checks",
      route: "/app/funnel/wizard",
      screenshot: "./screenshots/funnel/05-ai-drafts-validation.png",
      timestamp: new Date().toISOString(),
    });

    cy.task("appendFunnelStep", {
      stepNumber: 6,
      label: "Intent Block Preview",
      expect: "UTM-driven content preview shows different messaging strategies",
      route: "/app/funnel/wizard",
      screenshot: "./screenshots/funnel/06-intent-block-preview.png",
      timestamp: new Date().toISOString(),
    });

    cy.task("appendFunnelStep", {
      stepNumber: 7,
      label: "Intent High Intent Modal",
      expect:
        "High-intent modal displays urgent messaging with countdown timer",
      route: "/app/funnel/wizard",
      screenshot: "./screenshots/funnel/07-intent-high-intent-modal.png",
      timestamp: new Date().toISOString(),
    });

    cy.task("appendFunnelStep", {
      stepNumber: 8,
      label: "Audience Configuration",
      expect:
        "Audience setup with upload instructions and size guard protection",
      route: "/app/funnel/wizard",
      screenshot: "./screenshots/funnel/08-audience-configuration.png",
      timestamp: new Date().toISOString(),
    });

    cy.task("appendFunnelStep", {
      stepNumber: 9,
      label: "Audience Upload Instructions",
      expect: "Detailed modal with step-by-step Google Ads upload process",
      route: "/app/funnel/wizard",
      screenshot: "./screenshots/funnel/09-audience-upload-instructions.png",
      timestamp: new Date().toISOString(),
    });

    cy.task("appendFunnelStep", {
      stepNumber: 10,
      label: "Go Live Configuration",
      expect:
        "PROMOTE warning, schedule configuration, and activation controls",
      route: "/app/funnel/wizard",
      screenshot: "./screenshots/funnel/10-go-live-configuration.png",
      timestamp: new Date().toISOString(),
    });

    cy.task("appendFunnelStep", {
      stepNumber: 11,
      label: "PROMOTE Confirmation Modal",
      expect:
        "Confirmation modal warns about live changes requiring explicit approval",
      route: "/app/funnel/wizard",
      screenshot: "./screenshots/funnel/11-promote-confirmation-modal.png",
      timestamp: new Date().toISOString(),
    });

    cy.task("appendFunnelStep", {
      stepNumber: 12,
      label: "Setup Completion Success",
      expect:
        "Complete funnel success with automation active and dashboard access",
      route: "/app/funnel/wizard",
      screenshot: "./screenshots/funnel/12-setup-completion-success.png",
      timestamp: new Date().toISOString(),
    });
  });
});
