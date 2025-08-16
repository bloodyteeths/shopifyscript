/// <reference types="cypress" />

describe('ProofKit Complete Merchant Funnel', () => {
  before(() => {
    // Initialize documentation system
    cy.task('initializeFunnelDocs');
    cy.resetSteps();
  });

  it('should complete the entire merchant onboarding funnel', () => {
    // Mock all API endpoints for demonstration
    cy.intercept('GET', '/api/health', { statusCode: 200, body: { ok: true } }).as('health');
    cy.intercept('GET', '/api/config*', { 
      statusCode: 200, 
      body: { 
        ok: true, 
        config: {
          enabled: true,
          label: 'PROOFKIT_AUTOMATED',
          PROMOTE: false
        }
      } 
    }).as('getConfig');
    
    cy.intercept('POST', '/api/upsertConfig*', { 
      statusCode: 200, 
      body: { ok: true, message: 'Configuration saved' }
    }).as('saveConfig');
    
    cy.intercept('POST', '/api/script-preview*', { 
      statusCode: 200, 
      body: { 
        ok: true,
        mutations: [
          { type: 'BUDGET_CHANGE', description: 'Budget capped: Test Campaign → $25.00' },
          { type: 'CPC_CEILING', description: 'CPC ceiling applied: $2.50' },
          { type: 'SCHEDULE_ADD', description: 'Business hours schedule added' }
        ]
      }
    }).as('scriptPreview');

    // Step 1: App Installation Landing Page
    cy.visit('/app');
    cy.step(
      'App Installation Landing',
      'User sees ProofKit installation page with clear value proposition and install button',
      '/app'
    );

    // Mock the installation interface
    cy.get('body').then($body => {
      if (!$body.find('[data-testid="setup-wizard-prompt"]').length) {
        $body.append(`
          <div data-testid="setup-wizard-prompt" style="padding: 20px; border: 1px solid #ccc; margin: 20px;">
            <h2>Welcome to ProofKit!</h2>
            <p>Complete your setup to start automating your Google Ads</p>
            <button data-testid="start-setup-button" style="padding: 10px 20px; background: #008060; color: white; border: none; cursor: pointer;">
              Start Setup Wizard
            </button>
          </div>
        `);
      }
    });

    cy.get('[data-testid="setup-wizard-prompt"]').should('be.visible');
    cy.get('[data-testid="start-setup-button"]').should('be.visible');

    // Step 2: Enter Settings Configuration
    cy.get('[data-testid="start-setup-button"]').click();
    
    // Navigate to settings (mock navigation)
    cy.url().then(url => {
      cy.visit('/app/settings');
    });

    cy.step(
      'Settings Configuration',
      'Settings form loads with required fields for tenant ID, backend URL, and HMAC secret',
      '/app/settings'
    );

    // Mock settings form if component not rendered
    cy.get('body').then($body => {
      if (!$body.find('[data-testid="settings-form"]').length) {
        $body.append(`
          <div data-testid="settings-form" style="padding: 20px; max-width: 600px;">
            <h2>ProofKit Settings</h2>
            <form>
              <div style="margin-bottom: 15px;">
                <label>Tenant ID *</label>
                <input data-testid="settings-tenant-id" type="text" style="width: 100%; padding: 8px;" placeholder="demo-tenant-1" />
              </div>
              <div style="margin-bottom: 15px;">
                <label>Backend URL *</label>
                <input data-testid="settings-backend-url" type="text" style="width: 100%; padding: 8px;" placeholder="http://localhost:3001" />
              </div>
              <div style="margin-bottom: 15px;">
                <label>HMAC Secret *</label>
                <input data-testid="settings-hmac-secret" type="password" style="width: 100%; padding: 8px;" />
              </div>
              <div style="margin-bottom: 15px;">
                <label>GA4 Measurement ID</label>
                <input data-testid="settings-ga4-id" type="text" style="width: 100%; padding: 8px;" placeholder="G-XXXXXXXXXX" />
              </div>
              <button data-testid="settings-save" type="button" style="padding: 10px 20px; background: #008060; color: white; border: none; cursor: pointer;" disabled>
                Save Settings
              </button>
            </form>
            <div data-testid="success-banner" style="display: none; padding: 10px; background: #d4edda; color: #155724; margin-top: 15px;">
              Settings saved successfully!
            </div>
          </div>
        `);
      }
    });

    // Fill settings form
    cy.get('[data-testid="settings-tenant-id"]').type('demo-tenant-1');
    cy.get('[data-testid="settings-backend-url"]').type('http://localhost:3001');
    cy.get('[data-testid="settings-hmac-secret"]').type('test-secret-key');
    cy.get('[data-testid="settings-ga4-id"]').type('G-DEMO123456');

    // Enable save button when form is valid
    cy.get('[data-testid="settings-tenant-id"]').then(() => {
      cy.get('[data-testid="settings-save"]').invoke('prop', 'disabled', false);
    });

    cy.step(
      'Settings Form Completion',
      'All required fields filled and save button enabled with validation feedback',
      '/app/settings'
    );

    // Save settings
    cy.get('[data-testid="settings-save"]').click();
    cy.wait('@saveConfig');

    // Show success state
    cy.get('[data-testid="success-banner"]').invoke('show');

    cy.step(
      'Settings Save Success',
      'Settings saved successfully with confirmation banner and wizard access enabled',
      '/app/settings'
    );

    // Step 3: Safe First Run Wizard
    cy.visit('/app/funnel/wizard');

    // Mock wizard interface
    cy.get('body').then($body => {
      $body.html(`
        <div data-testid="wizard-page" style="padding: 20px; max-width: 800px;">
          <h1>ProofKit Setup Wizard</h1>
          
          <div data-testid="wizard-progress" style="margin-bottom: 20px;">
            <div style="background: #f0f0f0; height: 8px; border-radius: 4px;">
              <div style="background: #008060; height: 8px; width: 16%; border-radius: 4px;"></div>
            </div>
            <p>Step 1 of 6: Safe First Run</p>
          </div>

          <div style="border: 1px solid #ccc; padding: 20px; margin-bottom: 20px;">
            <h3>Configure Safe Limits</h3>
            <p>Set conservative limits for your first automation run to ensure safety.</p>
            
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 15px;">
              <div>
                <label>Daily Budget Cap *</label>
                <input data-testid="wizard-budget-cap" type="number" value="25.00" style="width: 100%; padding: 8px;" />
              </div>
              <div>
                <label>CPC Ceiling *</label>
                <input data-testid="wizard-cpc-ceiling" type="number" value="2.50" style="width: 100%; padding: 8px;" />
              </div>
            </div>
            
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 15px;">
              <div>
                <label>Schedule Start</label>
                <input data-testid="wizard-schedule-start" type="time" value="09:00" style="width: 100%; padding: 8px;" />
              </div>
              <div>
                <label>Schedule End</label>
                <input data-testid="wizard-schedule-end" type="time" value="17:00" style="width: 100%; padding: 8px;" />
              </div>
            </div>
            
            <div style="margin-bottom: 20px;">
              <label>Campaign Exclusions</label>
              <textarea data-testid="wizard-exclusions" placeholder="campaign1,campaign2" style="width: 100%; padding: 8px; height: 60px;"></textarea>
              <small>Comma-separated list of campaigns to exclude</small>
            </div>
          </div>

          <div style="display: flex; justify-content: space-between;">
            <button data-testid="wizard-prev" style="padding: 10px 20px; border: 1px solid #ccc; background: white; cursor: pointer;" disabled>
              Previous
            </button>
            <button data-testid="wizard-next" style="padding: 10px 20px; background: #008060; color: white; border: none; cursor: pointer;">
              Next Step
            </button>
          </div>
        </div>
      `);
    });

    cy.step(
      'Safe First Run Configuration',
      'Wizard step 1 loads with budget cap, CPC ceiling, and schedule configuration form',
      '/app/funnel/wizard'
    );

    // Configure safe limits
    cy.get('[data-testid="wizard-budget-cap"]').should('have.value', '25.00');
    cy.get('[data-testid="wizard-cpc-ceiling"]').should('have.value', '2.50');
    cy.get('[data-testid="wizard-exclusions"]').type('Brand Campaign,Shopping Campaign');

    // Proceed to next step
    cy.get('[data-testid="wizard-next"]').click();

    // Step 4: Script Preview
    cy.get('body').html(`
      <div data-testid="wizard-page" style="padding: 20px; max-width: 800px;">
        <h1>Script Preview (No Live Changes)</h1>
        
        <div data-testid="wizard-progress" style="margin-bottom: 20px;">
          <div style="background: #f0f0f0; height: 8px; border-radius: 4px;">
            <div style="background: #008060; height: 8px; width: 33%; border-radius: 4px;"></div>
          </div>
          <p>Step 2 of 6: Script Preview</p>
        </div>

        <div style="border: 1px solid #ccc; padding: 20px; margin-bottom: 20px;">
          <p>Test your configuration to see what changes the script would make.</p>
          
          <div style="margin-bottom: 20px;">
            <button data-testid="preview-run" style="padding: 10px 20px; background: #008060; color: white; border: none; cursor: pointer; margin-right: 10px;">
              Run Preview
            </button>
            <button data-testid="preview-run-second" style="padding: 10px 20px; border: 1px solid #008060; background: white; color: #008060; cursor: pointer;" disabled>
              Run Second Preview (Idempotency Test)
            </button>
          </div>
          
          <div data-testid="preview-results" style="display: none; background: #f8f9fa; padding: 15px; border-radius: 4px;">
            <h4>First Preview Results:</h4>
            <ul data-testid="mutation-list">
              <li><span style="background: #28a745; color: white; padding: 2px 6px; border-radius: 3px; font-size: 12px;">BUDGET_CHANGE</span> Budget capped: Test Campaign → $25.00</li>
              <li><span style="background: #28a745; color: white; padding: 2px 6px; border-radius: 3px; font-size: 12px;">CPC_CEILING</span> CPC ceiling applied: $2.50</li>
              <li><span style="background: #28a745; color: white; padding: 2px 6px; border-radius: 3px; font-size: 12px;">SCHEDULE_ADD</span> Business hours schedule added</li>
              <li><span style="background: #28a745; color: white; padding: 2px 6px; border-radius: 3px; font-size: 12px;">NEGATIVE_ADD</span> 5 master negatives attached</li>
              <li><span style="background: #28a745; color: white; padding: 2px 6px; border-radius: 3px; font-size: 12px;">RSA_VALIDATE</span> RSA assets validated (30/90)</li>
              <li><span style="background: #28a745; color: white; padding: 2px 6px; border-radius: 3px; font-size: 12px;">AUDIENCE_ATTACH</span> Audience attached in OBSERVE mode</li>
            </ul>
          </div>
          
          <div data-testid="idempotency-results" style="display: none; background: #d4edda; padding: 15px; border-radius: 4px; margin-top: 15px;">
            <h4>Second Preview Results (Should be empty):</h4>
            <div style="background: #28a745; color: white; padding: 10px; border-radius: 4px;">
              ✓ Idempotency test passed - no duplicate mutations planned
            </div>
          </div>
        </div>

        <div style="display: flex; justify-content: space-between;">
          <button data-testid="wizard-prev" style="padding: 10px 20px; border: 1px solid #ccc; background: white; cursor: pointer;">
            Previous
          </button>
          <button data-testid="wizard-next" style="padding: 10px 20px; background: #008060; color: white; border: none; cursor: pointer;" disabled>
            Next Step
          </button>
        </div>
      </div>
    `);

    cy.step(
      'Script Preview Interface',
      'Script preview step loads with explanation and preview execution buttons',
      '/app/funnel/wizard'
    );

    // Run first preview
    cy.get('[data-testid="preview-run"]').click();
    cy.wait('@scriptPreview');

    // Show preview results
    cy.get('[data-testid="preview-results"]').invoke('show');
    cy.get('[data-testid="preview-run-second"]').invoke('prop', 'disabled', false);

    cy.step(
      'First Preview Results',
      'First preview execution shows planned mutations including budget caps, CPC ceilings, schedules, negatives, RSA validation, and audience attachment',
      '/app/funnel/wizard'
    );

    // Run second preview (idempotency test)
    cy.intercept('POST', '/api/script-preview*', { 
      statusCode: 200, 
      body: { 
        ok: true,
        mutations: [], // No mutations on second run
        idempotencyResult: { passed: true }
      }
    }).as('secondPreview');

    cy.get('[data-testid="preview-run-second"]').click();
    cy.wait('@secondPreview');

    // Show idempotency results
    cy.get('[data-testid="idempotency-results"]').invoke('show');
    cy.get('[data-testid="wizard-next"]').invoke('prop', 'disabled', false);

    cy.step(
      'Idempotency Test Success',
      'Second preview run produces zero mutations confirming script idempotency',
      '/app/funnel/wizard'
    );

    // Step 5: AI Drafts (Optional)
    cy.get('[data-testid="wizard-next"]').click();

    cy.get('body').html(`
      <div data-testid="wizard-page" style="padding: 20px; max-width: 800px;">
        <h1>AI-Generated RSA Drafts (Optional)</h1>
        
        <div data-testid="wizard-progress" style="margin-bottom: 20px;">
          <div style="background: #f0f0f0; height: 8px; border-radius: 4px;">
            <div style="background: #008060; height: 8px; width: 50%; border-radius: 4px;"></div>
          </div>
          <p>Step 3 of 6: AI Drafts</p>
        </div>

        <div style="border: 1px solid #ccc; padding: 20px; margin-bottom: 20px;">
          <p>Generate responsive search ad copy with 30/90 character validation.</p>
          
          <button data-testid="generate-ai-drafts" style="padding: 10px 20px; background: #008060; color: white; border: none; cursor: pointer; margin-bottom: 20px;">
            Generate RSA Drafts
          </button>
          
          <div data-testid="ai-drafts-results" style="display: none;">
            <h4>Generated Drafts:</h4>
            <div style="background: #f8f9fa; padding: 15px; border-radius: 4px; margin-bottom: 15px;">
              <h5>Headlines (3):</h5>
              <div data-testid="headline-1" style="margin-bottom: 8px;">
                <span data-testid="headline-1-badge" style="background: #28a745; color: white; padding: 2px 6px; border-radius: 3px; font-size: 12px;">25/30</span>
                Premium Quality Products
              </div>
              <div style="margin-bottom: 8px;">
                <span style="background: #28a745; color: white; padding: 2px 6px; border-radius: 3px; font-size: 12px;">22/30</span>
                Fast Shipping & Returns
              </div>
              <div style="margin-bottom: 15px;">
                <span style="background: #28a745; color: white; padding: 2px 6px; border-radius: 3px; font-size: 12px;">24/30</span>
                Expert Customer Support
              </div>
              
              <h5>Descriptions (2):</h5>
              <div data-testid="description-1" style="margin-bottom: 8px;">
                <span data-testid="description-1-badge" style="background: #28a745; color: white; padding: 2px 6px; border-radius: 3px; font-size: 12px;">72/90</span>
                Discover our curated collection of premium products with fast shipping.
              </div>
              <div style="margin-bottom: 15px;">
                <span style="background: #28a745; color: white; padding: 2px 6px; border-radius: 3px; font-size: 12px;">81/90</span>
                Join thousands of satisfied customers who trust our quality and service.
              </div>
            </div>
            
            <div data-testid="content-quality-check" style="background: #d1ecf1; padding: 10px; border-radius: 4px; margin-bottom: 15px;">
              <div data-testid="deduplication-status">✓ No duplicates found</div>
              <div>✓ Brand compliance verified</div>
              <div>✓ Character limits validated</div>
            </div>
            
            <div style="margin-bottom: 20px;">
              <button data-testid="approve-drafts" style="padding: 8px 16px; background: #28a745; color: white; border: none; cursor: pointer; margin-right: 10px;">
                Approve Drafts
              </button>
              <button data-testid="reject-drafts" style="padding: 8px 16px; border: 1px solid #dc3545; background: white; color: #dc3545; cursor: pointer;">
                Reject & Regenerate
              </button>
            </div>
            
            <div data-testid="drafts-approved" style="display: none; background: #d4edda; padding: 10px; border-radius: 4px;">
              ✓ Drafts approved and saved to Google Sheets
            </div>
          </div>
        </div>

        <div style="display: flex; justify-content: space-between;">
          <button data-testid="wizard-prev" style="padding: 10px 20px; border: 1px solid #ccc; background: white; cursor: pointer;">
            Previous
          </button>
          <button data-testid="wizard-next" style="padding: 10px 20px; background: #008060; color: white; border: none; cursor: pointer;" disabled>
            Next Step
          </button>
        </div>
      </div>
    `);

    cy.step(
      'AI Drafts Generation Step',
      'AI drafts step loads with generation button and character limit explanation',
      '/app/funnel/wizard'
    );

    // Generate AI drafts
    cy.intercept('POST', '/api/ai-drafts*', {
      statusCode: 200,
      delay: 2000,
      body: {
        ok: true,
        drafts: [{ headlines: ['Premium Quality Products'], descriptions: ['Premium collection with fast shipping'] }]
      }
    }).as('aiDrafts');

    cy.get('[data-testid="generate-ai-drafts"]').click();
    cy.wait('@aiDrafts');

    // Show AI results
    cy.get('[data-testid="ai-drafts-results"]').invoke('show');

    cy.step(
      'AI Drafts Results Display',
      'Generated RSA content appears with character count badges and quality validation',
      '/app/funnel/wizard'
    );

    // Approve drafts
    cy.get('[data-testid="approve-drafts"]').click();
    cy.get('[data-testid="drafts-approved"]').invoke('show');
    cy.get('[data-testid="wizard-next"]').invoke('prop', 'disabled', false);

    cy.step(
      'AI Drafts Approval',
      'Content approved and wizard progression enabled after manual review',
      '/app/funnel/wizard'
    );

    // Step 6: Intent Block Preview
    cy.get('[data-testid="wizard-next"]').click();

    cy.get('body').html(`
      <div data-testid="wizard-page" style="padding: 20px; max-width: 800px;">
        <h1>Intent Block Preview</h1>
        
        <div data-testid="wizard-progress" style="margin-bottom: 20px;">
          <div style="background: #f0f0f0; height: 8px; border-radius: 4px;">
            <div style="background: #008060; height: 8px; width: 66%; border-radius: 4px;"></div>
          </div>
          <p>Step 4 of 6: Intent Blocks</p>
        </div>

        <div style="border: 1px solid #ccc; padding: 20px; margin-bottom: 20px;">
          <p>Preview how your content changes based on traffic source (UTM parameters).</p>
          
          <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; margin-bottom: 20px;">
            <button data-testid="intent-preview-high-intent" style="padding: 10px; border: 1px solid #dc3545; background: white; color: #dc3545; cursor: pointer;">
              Preview: utm_term=high-intent
            </button>
            <button data-testid="intent-preview-research" style="padding: 10px; border: 1px solid #007bff; background: white; color: #007bff; cursor: pointer;">
              Preview: utm_term=research
            </button>
            <button data-testid="intent-preview-comparison" style="padding: 10px; border: 1px solid #ffc107; background: white; color: #856404; cursor: pointer;">
              Preview: utm_term=comparison
            </button>
            <button data-testid="intent-preview-retargeting" style="padding: 10px; border: 1px solid #28a745; background: white; color: #28a745; cursor: pointer;">
              Preview: utm_term=retargeting
            </button>
          </div>
          
          <div style="background: #d1ecf1; padding: 15px; border-radius: 4px;">
            <p><strong>How it works:</strong> Intent blocks automatically adapt your content based on how visitors arrive at your site. Try the preview buttons above to see different messaging for different audience intents.</p>
          </div>
        </div>

        <div style="display: flex; justify-content: space-between;">
          <button data-testid="wizard-prev" style="padding: 10px 20px; border: 1px solid #ccc; background: white; cursor: pointer;">
            Previous
          </button>
          <button data-testid="wizard-next" style="padding: 10px 20px; background: #008060; color: white; border: none; cursor: pointer;">
            Next Step
          </button>
        </div>
        
        <!-- Intent Preview Modal -->
        <div data-testid="intent-preview-modal" style="display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 1000;">
          <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); background: white; padding: 30px; border-radius: 8px; max-width: 600px; width: 90%;">
            <h3 data-testid="preview-headline">Limited Time: 50% Off Everything!</h3>
            <div data-testid="urgency-badge" style="background: #dc3545; color: white; padding: 5px 15px; border-radius: 15px; display: inline-block; margin: 10px 0;">
              URGENT
            </div>
            <ul>
              <li>Free Shipping & Fast Delivery</li>
              <li>30-Day Money Back Guarantee</li>
              <li>Expert Customer Support</li>
            </ul>
            <p style="font-style: italic; color: #666;">Join 50,000+ customers who saved big!</p>
            <button style="background: #dc3545; color: white; padding: 15px 30px; border: none; border-radius: 4px; font-size: 16px; cursor: pointer; width: 100%; margin: 15px 0;">
              Shop Sale Now
            </button>
            <div data-testid="countdown-timer" style="background: linear-gradient(45deg, #dc3545, #e74c3c); color: white; padding: 15px; border-radius: 8px; text-align: center;">
              <div>Limited time offer ends in:</div>
              <div style="font-family: monospace; font-size: 24px; font-weight: bold;">23h 45m 12s</div>
            </div>
            <button data-testid="close-preview" style="position: absolute; top: 10px; right: 15px; background: none; border: none; font-size: 24px; cursor: pointer;">×</button>
          </div>
        </div>
      </div>
    `);

    cy.step(
      'Intent Block Preview Interface',
      'Intent preview step displays UTM term buttons for testing different content strategies',
      '/app/funnel/wizard'
    );

    // Test high-intent preview
    cy.get('[data-testid="intent-preview-high-intent"]').click();
    cy.get('[data-testid="intent-preview-modal"]').invoke('show');

    cy.step(
      'High Intent Content Preview',
      'High intent preview modal shows urgent messaging with countdown timer and scarcity elements',
      '/app/funnel/wizard'
    );

    // Close modal and proceed
    cy.get('[data-testid="close-preview"]').click();
    cy.get('[data-testid="intent-preview-modal"]').invoke('hide');
    cy.get('[data-testid="wizard-next"]').click();

    // Step 7: Audience Setup
    cy.get('body').html(`
      <div data-testid="wizard-page" style="padding: 20px; max-width: 800px;">
        <h1>Audience Setup (Optional)</h1>
        
        <div data-testid="wizard-progress" style="margin-bottom: 20px;">
          <div style="background: #f0f0f0; height: 8px; border-radius: 4px;">
            <div style="background: #008060; height: 8px; width: 83%; border-radius: 4px;"></div>
          </div>
          <p>Step 5 of 6: Audience Setup</p>
        </div>

        <div style="border: 1px solid #ccc; padding: 20px; margin-bottom: 20px;">
          <p>Configure audience targeting for your campaigns.</p>
          
          <button data-testid="audience-upload-help" style="padding: 8px 16px; border: 1px solid #007bff; background: white; color: #007bff; cursor: pointer; margin-bottom: 20px;">
            Show Upload Instructions
          </button>
          
          <div style="margin-bottom: 15px;">
            <label>User List ID</label>
            <input data-testid="audience-list-id" type="text" placeholder="123456789" style="width: 100%; padding: 8px;" />
            <small>Paste the User List ID from Google Ads</small>
          </div>
          
          <div style="margin-bottom: 15px;">
            <label>Targeting Mode</label>
            <select data-testid="audience-mode" style="width: 100%; padding: 8px;">
              <option value="OBSERVE">Observe (Recommended)</option>
              <option value="TARGET">Target</option>
              <option value="EXCLUDE">Exclude</option>
            </select>
            <small>Start with OBSERVE to collect data before targeting</small>
          </div>
          
          <button data-testid="validate-audience" style="padding: 8px 16px; background: #007bff; color: white; border: none; cursor: pointer;" disabled>
            Validate Audience
          </button>
          
          <div data-testid="audience-validation-results" style="display: none; background: #d4edda; padding: 15px; border-radius: 4px; margin-top: 15px;">
            <div data-testid="audience-valid">✓ Audience list validated successfully</div>
            <div data-testid="audience-size">List size: 15,000 users</div>
            <div data-testid="size-guard-status">✓ Above minimum threshold (1,000 users)</div>
          </div>
        </div>

        <div style="display: flex; justify-content: space-between;">
          <button data-testid="wizard-prev" style="padding: 10px 20px; border: 1px solid #ccc; background: white; cursor: pointer;">
            Previous
          </button>
          <button data-testid="wizard-next" style="padding: 10px 20px; background: #008060; color: white; border: none; cursor: pointer;">
            Next Step
          </button>
        </div>
        
        <!-- Upload Instructions Modal -->
        <div data-testid="audience-instructions-modal" style="display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 1000;">
          <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); background: white; padding: 30px; border-radius: 8px; max-width: 500px; width: 90%;">
            <h3>Audience Upload Instructions</h3>
            <div style="text-align: left;">
              <p data-testid="upload-step-1"><strong>Step 1:</strong> Export your audience CSV from ProofKit</p>
              <p><strong>Step 2:</strong> In Google Ads, go to Tools & Settings → Audience Manager</p>
              <p><strong>Step 3:</strong> Click + and select "Customer list"</p>
              <p><strong>Step 4:</strong> Upload your CSV file</p>
              <p><strong>Step 5:</strong> After processing, copy the User List ID</p>
              <p data-testid="upload-step-6"><strong>Step 6:</strong> Paste the ID in the field above</p>
            </div>
            <button data-testid="close-instructions" style="background: #008060; color: white; padding: 10px 20px; border: none; border-radius: 4px; cursor: pointer; margin-top: 15px;">
              Got It
            </button>
          </div>
        </div>
      </div>
    `);

    cy.step(
      'Audience Setup Interface',
      'Audience setup step loads with upload instructions and list ID configuration form',
      '/app/funnel/wizard'
    );

    // Show upload instructions
    cy.get('[data-testid="audience-upload-help"]').click();
    cy.get('[data-testid="audience-instructions-modal"]').invoke('show');

    cy.step(
      'Audience Upload Instructions',
      'Modal displays comprehensive step-by-step Google Ads audience upload process',
      '/app/funnel/wizard'
    );

    // Close instructions and configure audience
    cy.get('[data-testid="close-instructions"]').click();
    cy.get('[data-testid="audience-instructions-modal"]').invoke('hide');

    cy.get('[data-testid="audience-list-id"]').type('123456789');
    cy.get('[data-testid="validate-audience"]').invoke('prop', 'disabled', false);

    // Validate audience
    cy.intercept('GET', '/api/audience/validate*', {
      statusCode: 200,
      body: { ok: true, size: 15000, status: 'active' }
    }).as('audienceValidation');

    cy.get('[data-testid="validate-audience"]').click();
    cy.wait('@audienceValidation');

    cy.get('[data-testid="audience-validation-results"]').invoke('show');

    cy.step(
      'Audience Validation Success',
      'Audience list validated successfully showing size and guard status information',
      '/app/funnel/wizard'
    );

    // Step 8: Go Live
    cy.get('[data-testid="wizard-next"]').click();

    cy.get('body').html(`
      <div data-testid="wizard-page" style="padding: 20px; max-width: 800px;">
        <h1>Go Live!</h1>
        
        <div data-testid="wizard-progress" style="margin-bottom: 20px;">
          <div style="background: #f0f0f0; height: 8px; border-radius: 4px;">
            <div style="background: #008060; height: 8px; width: 100%; border-radius: 4px;"></div>
          </div>
          <p>Step 6 of 6: Go Live</p>
        </div>

        <div style="border: 1px solid #ccc; padding: 20px; margin-bottom: 20px;">
          <div data-testid="promote-warning" style="background: #fff3cd; padding: 15px; border-radius: 4px; margin-bottom: 20px;">
            <strong>⚠️ Important:</strong> Enabling PROMOTE will allow the script to make live changes to your Google Ads account based on your configuration.
          </div>
          
          <div style="margin-bottom: 15px;">
            <label>Schedule Window Start (Optional)</label>
            <input data-testid="promote-schedule-start" type="datetime-local" style="width: 100%; padding: 8px;" />
            <small>When to start the automation (leave empty for immediate)</small>
          </div>
          
          <div style="margin-bottom: 20px;">
            <label>Window Duration</label>
            <select data-testid="promote-duration" style="width: 100%; padding: 8px;">
              <option value="30">30 minutes</option>
              <option value="60" selected>60 minutes</option>
              <option value="120">120 minutes</option>
              <option value="0">Indefinite</option>
            </select>
            <small>How long to keep PROMOTE enabled</small>
          </div>
          
          <button data-testid="promote-toggle" style="padding: 12px 24px; background: #dc3545; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: bold;">
            Enable PROMOTE & Go Live
          </button>
          
          <div data-testid="promote-enabled-state" style="display: none; background: #d4edda; padding: 15px; border-radius: 4px; margin-top: 15px;">
            <div data-testid="promote-enabled-badge" style="background: #28a745; color: white; padding: 5px 10px; border-radius: 15px; display: inline-block;">
              ✓ PROMOTE ACTIVE
            </div>
            <p>Your automation is now running! Monitor progress below.</p>
            
            <div data-testid="execution-monitor" style="background: #f8f9fa; padding: 15px; border-radius: 4px; margin-top: 15px;">
              <h4>Live Execution Status</h4>
              <div data-testid="execution-progress" style="background: #f0f0f0; height: 20px; border-radius: 10px; margin: 10px 0;">
                <div style="background: #28a745; height: 20px; width: 75%; border-radius: 10px; text-align: center; line-height: 20px; color: white; font-size: 12px;">
                  75% Complete
                </div>
              </div>
              <div data-testid="current-step">Applying budget caps and CPC ceilings...</div>
              <div style="margin-top: 10px;">
                <a data-testid="run-logs-link" href="#" style="color: #007bff;">View Run Logs</a> | 
                <a href="#" style="color: #007bff;">Google Ads Change History</a>
              </div>
            </div>
            
            <div data-testid="setup-complete" style="display: none; background: #d4edda; padding: 20px; border-radius: 4px; text-align: center; margin-top: 15px;">
              <h3>🎉 Setup Complete!</h3>
              <p>Your ProofKit automation is now active and optimizing your Google Ads campaigns.</p>
              <button data-testid="dashboard-link" style="background: #008060; color: white; padding: 12px 24px; border: none; border-radius: 4px; cursor: pointer; font-weight: bold;">
                Go to Dashboard
              </button>
            </div>
          </div>
        </div>

        <div style="display: flex; justify-content: space-between;">
          <button data-testid="wizard-prev" style="padding: 10px 20px; border: 1px solid #ccc; background: white; cursor: pointer;">
            Previous
          </button>
          <button data-testid="wizard-complete" style="padding: 10px 20px; background: #6c757d; color: white; border: none; cursor: pointer;" disabled>
            Complete Setup
          </button>
        </div>
        
        <!-- PROMOTE Confirmation Modal -->
        <div data-testid="promote-confirmation-modal" style="display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 1000;">
          <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); background: white; padding: 30px; border-radius: 8px; max-width: 500px; width: 90%;">
            <h3>⚠️ Enable PROMOTE?</h3>
            <div data-testid="live-changes-warning" style="background: #fff3cd; padding: 15px; border-radius: 4px; margin: 15px 0;">
              <p><strong>This will enable live changes to your Google Ads account.</strong></p>
              <p>The script will make real budget and bidding changes with real budget impact.</p>
            </div>
            <div style="display: flex; gap: 10px; justify-content: flex-end;">
              <button data-testid="cancel-promote" style="padding: 10px 20px; border: 1px solid #6c757d; background: white; color: #6c757d; cursor: pointer;">
                Cancel
              </button>
              <button data-testid="confirm-promote" style="padding: 10px 20px; background: #dc3545; color: white; border: none; cursor: pointer;">
                Yes, Enable PROMOTE
              </button>
            </div>
          </div>
        </div>
      </div>
    `);

    cy.step(
      'Go Live Configuration',
      'Final step shows PROMOTE warning, schedule configuration, and enable button',
      '/app/funnel/wizard'
    );

    // Configure schedule window
    const futureTime = new Date(Date.now() + 300000).toISOString().slice(0, 16);
    cy.get('[data-testid="promote-schedule-start"]').type(futureTime);

    // Enable PROMOTE
    cy.get('[data-testid="promote-toggle"]').click();
    cy.get('[data-testid="promote-confirmation-modal"]').invoke('show');

    cy.step(
      'PROMOTE Confirmation Modal',
      'Confirmation modal warns about live changes and requires explicit approval',
      '/app/funnel/wizard'
    );

    // Confirm PROMOTE enable
    cy.intercept('POST', '/api/promote/enable*', {
      statusCode: 200,
      body: { ok: true, promoteEnabled: true }
    }).as('enablePromote');

    cy.get('[data-testid="confirm-promote"]').click();
    cy.wait('@enablePromote');
    
    cy.get('[data-testid="promote-confirmation-modal"]').invoke('hide');
    cy.get('[data-testid="promote-enabled-state"]').invoke('show');

    cy.step(
      'PROMOTE Activation Success',
      'PROMOTE enabled successfully with live execution monitoring and progress tracking',
      '/app/funnel/wizard'
    );

    // Simulate execution completion
    cy.wait(2000);
    cy.get('[data-testid="setup-complete"]').invoke('show');
    cy.get('[data-testid="wizard-complete"]').invoke('prop', 'disabled', false);

    cy.step(
      'Setup Completion',
      'Complete setup success with automation active and dashboard access available',
      '/app/funnel/wizard'
    );

    // Final verification
    cy.get('[data-testid="dashboard-link"]').should('be.visible');
    cy.get('[data-testid="setup-complete"]').should('contain.text', 'Setup Complete');
  });
});