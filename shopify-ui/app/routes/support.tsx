import type { MetaFunction } from "@remix-run/node";

export const meta: MetaFunction = () => {
  return [
    { title: "Support - Ads Autopilot AI" },
    { name: "description", content: "Get help with Ads Autopilot AI - Contact information, documentation, and support resources" },
  ];
};

export default function Support() {
  return (
    <div style={{ fontFamily: "system-ui, sans-serif", lineHeight: "1.8", maxWidth: "800px", margin: "0 auto", padding: "2rem" }}>
      <h1>Ads Autopilot AI Support</h1>
      
      <p>Get help with Ads Autopilot AI - your AI-powered Google Ads optimization tool for Shopify stores.</p>

      <h2>📞 Contact Information</h2>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2rem", margin: "2rem 0" }}>
        <div style={{ padding: "1.5rem", border: "1px solid #e5e7eb", borderRadius: "8px" }}>
          <h3>🎯 General Support</h3>
          <p><strong>Email:</strong> support@adsautopilotai.com<br />
          <strong>Response Time:</strong> 24 hours<br />
          <strong>Hours:</strong> Monday-Friday, 9 AM - 6 PM EST</p>
          <p>For general questions about using Ads Autopilot AI, account issues, billing questions, and technical support.</p>
        </div>

        <div style={{ padding: "1.5rem", border: "1px solid #e5e7eb", borderRadius: "8px" }}>
          <h3>🔒 Privacy & Security</h3>
          <p><strong>Email:</strong> privacy@adsautopilotai.com<br />
          <strong>Response Time:</strong> 48 hours<br />
          <strong>Hours:</strong> Monday-Friday, 9 AM - 6 PM EST</p>
          <p>For privacy policy questions, data subject requests, and security concerns.</p>
        </div>

        <div style={{ padding: "1.5rem", border: "1px solid #e5e7eb", borderRadius: "8px" }}>
          <h3>⚖️ Legal & Compliance</h3>
          <p><strong>Email:</strong> legal@adsautopilotai.com<br />
          <strong>Response Time:</strong> 72 hours<br />
          <strong>Hours:</strong> Monday-Friday, 9 AM - 6 PM EST</p>
          <p>For terms of service questions, legal compliance issues, and contract matters.</p>
        </div>

        <div style={{ padding: "1.5rem", border: "1px solid #e5e7eb", borderRadius: "8px" }}>
          <h3>💳 Billing & Accounts</h3>
          <p><strong>Email:</strong> billing@adsautopilotai.com<br />
          <strong>Response Time:</strong> 24 hours<br />
          <strong>Hours:</strong> Monday-Friday, 9 AM - 6 PM EST</p>
          <p>For subscription issues, billing questions, refund requests, and plan changes.</p>
        </div>
      </div>

      <h2>🚀 Getting Started</h2>

      <h3>Quick Setup Guide (5 Minutes)</h3>
      <ol>
        <li><strong>Install the App:</strong> Install Ads Autopilot AI from the Shopify App Store</li>
        <li><strong>Connect Google Ads:</strong> Authorize your Google Ads account integration</li>
        <li><strong>Configure Audiences:</strong> Set up your customer segmentation preferences</li>
        <li><strong>Enable Autopilot:</strong> Turn on automated campaign optimization</li>
        <li><strong>Monitor Results:</strong> Track your conversion rate improvements</li>
      </ol>

      <h3>Key Features</h3>
      <ul>
        <li><strong>🤖 AI-Powered Optimization:</strong> Automated Google Ads campaign management</li>
        <li><strong>👥 Smart Audience Targeting:</strong> Anonymous customer segmentation without PII</li>
        <li><strong>📊 Performance Analytics:</strong> Real-time conversion tracking and insights</li>
        <li><strong>📝 Google Sheets Integration:</strong> Export data and manage campaigns</li>
        <li><strong>🔒 Privacy-First:</strong> GDPR & CCPA compliant, no customer data collection</li>
      </ul>

      <h2>📚 Documentation & Resources</h2>

      <h3>Setup Guides</h3>
      <ul>
        <li><strong>Initial Setup:</strong> Complete walkthrough of app installation and configuration</li>
        <li><strong>Google Ads Integration:</strong> Step-by-step guide to connect your Google Ads account</li>
        <li><strong>Audience Configuration:</strong> How to set up customer segmentation and targeting</li>
        <li><strong>Campaign Optimization:</strong> Best practices for automated campaign management</li>
      </ul>

      <h3>Troubleshooting</h3>
      <ul>
        <li><strong>Connection Issues:</strong> Resolving Google Ads and Shopify integration problems</li>
        <li><strong>Performance Questions:</strong> Understanding campaign optimization metrics</li>
        <li><strong>Billing Issues:</strong> Common subscription and payment questions</li>
        <li><strong>Account Problems:</strong> Login, access, and configuration troubleshooting</li>
      </ul>

      <h2>💰 Pricing & Plans</h2>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1rem", margin: "2rem 0" }}>
        <div style={{ padding: "1.5rem", border: "1px solid #e5e7eb", borderRadius: "8px", textAlign: "center" }}>
          <h3>Free Plan</h3>
          <p style={{ fontSize: "2rem", fontWeight: "bold", color: "#10b981" }}>$0</p>
          <p>per month</p>
          <ul style={{ textAlign: "left", marginTop: "1rem" }}>
            <li>Up to 1,000 monthly sessions</li>
            <li>Basic campaign optimization</li>
            <li>Email support</li>
            <li>Standard analytics</li>
          </ul>
        </div>

        <div style={{ padding: "1.5rem", border: "2px solid #3b82f6", borderRadius: "8px", textAlign: "center", position: "relative" }}>
          <div style={{ position: "absolute", top: "-10px", left: "50%", transform: "translateX(-50%)", backgroundColor: "#3b82f6", color: "white", padding: "0.25rem 1rem", borderRadius: "12px", fontSize: "0.875rem" }}>
            Popular
          </div>
          <h3>Pro Plan</h3>
          <p style={{ fontSize: "2rem", fontWeight: "bold", color: "#3b82f6" }}>$29</p>
          <p>per month</p>
          <ul style={{ textAlign: "left", marginTop: "1rem" }}>
            <li>Unlimited sessions</li>
            <li>Advanced AI optimization</li>
            <li>Priority support</li>
            <li>Advanced analytics</li>
            <li>Google Sheets integration</li>
          </ul>
        </div>

        <div style={{ padding: "1.5rem", border: "1px solid #e5e7eb", borderRadius: "8px", textAlign: "center" }}>
          <h3>Enterprise</h3>
          <p style={{ fontSize: "2rem", fontWeight: "bold", color: "#8b5cf6" }}>$99</p>
          <p>per month</p>
          <ul style={{ textAlign: "left", marginTop: "1rem" }}>
            <li>Everything in Pro</li>
            <li>Multiple store management</li>
            <li>Dedicated account manager</li>
            <li>Custom integrations</li>
            <li>SLA guarantees</li>
          </ul>
        </div>
      </div>

      <h2>🔧 Technical Support</h2>

      <h3>System Requirements</h3>
      <ul>
        <li><strong>Shopify Plan:</strong> Any Shopify plan (Basic, Shopify, Advanced, Plus)</li>
        <li><strong>Google Ads Account:</strong> Active Google Ads account with API access</li>
        <li><strong>Browser:</strong> Modern browser (Chrome, Firefox, Safari, Edge)</li>
        <li><strong>Permissions:</strong> Shopify admin access to install apps</li>
      </ul>

      <h3>Common Integration Questions</h3>
      <ul>
        <li><strong>Google Ads API:</strong> We use read/write access to optimize your campaigns</li>
        <li><strong>Google Sheets:</strong> Optional integration for data export and management</li>
        <li><strong>Shopify Data:</strong> We only read product catalog data (no customer PII)</li>
        <li><strong>Privacy Compliance:</strong> Fully GDPR and CCPA compliant by design</li>
      </ul>

      <h2>🛡️ Privacy & Security</h2>

      <h3>Data Protection</h3>
      <ul>
        <li><strong>No Customer PII:</strong> We never collect personal information from your customers</li>
        <li><strong>Minimal Data Collection:</strong> Only store configuration and campaign settings</li>
        <li><strong>Your Data Control:</strong> You own and control all your optimization data</li>
        <li><strong>Secure Infrastructure:</strong> Enterprise-grade security with encryption</li>
      </ul>

      <h3>Compliance</h3>
      <ul>
        <li><strong>GDPR Compliant:</strong> Full compliance with EU privacy regulations</li>
        <li><strong>CCPA Compliant:</strong> California privacy law compliance</li>
        <li><strong>SOC 2 Type II:</strong> Audited security and privacy controls</li>
        <li><strong>Data Processing Agreements:</strong> Available for enterprise customers</li>
      </ul>

      <h2>📈 Performance & Optimization</h2>

      <h3>Expected Results</h3>
      <ul>
        <li><strong>Conversion Rate:</strong> Average 15-25% improvement in first 30 days</li>
        <li><strong>Setup Time:</strong> Complete setup in under 5 minutes</li>
        <li><strong>Time to Value:</strong> See optimization results within 24 hours</li>
        <li><strong>Campaign Management:</strong> Automated optimization saves 5-10 hours/week</li>
      </ul>

      <h3>Best Practices</h3>
      <ul>
        <li><strong>Audience Segmentation:</strong> Set up detailed customer segments for better targeting</li>
        <li><strong>Campaign Budgets:</strong> Start with conservative budgets and scale based on performance</li>
        <li><strong>Regular Monitoring:</strong> Review optimization reports weekly</li>
        <li><strong>A/B Testing:</strong> Use built-in testing features to optimize campaigns</li>
      </ul>

      <h2>🎓 Training & Onboarding</h2>

      <h3>Available Resources</h3>
      <ul>
        <li><strong>Video Tutorials:</strong> Step-by-step setup and optimization guides</li>
        <li><strong>Webinar Series:</strong> Monthly training sessions with Q&A</li>
        <li><strong>Best Practices Guide:</strong> Comprehensive optimization strategies</li>
        <li><strong>Case Studies:</strong> Real customer success stories and results</li>
      </ul>

      <h3>Enterprise Support</h3>
      <p>Enterprise customers receive:</p>
      <ul>
        <li><strong>Dedicated Account Manager:</strong> Personal support and optimization guidance</li>
        <li><strong>Custom Training:</strong> Tailored training sessions for your team</li>
        <li><strong>Implementation Support:</strong> Hands-on help with complex setups</li>
        <li><strong>Performance Reviews:</strong> Regular optimization strategy sessions</li>
      </ul>

      <h2>🔄 Updates & Maintenance</h2>

      <h3>Service Updates</h3>
      <ul>
        <li><strong>Automatic Updates:</strong> New features and improvements deployed continuously</li>
        <li><strong>Maintenance Windows:</strong> Scheduled maintenance with advance notice</li>
        <li><strong>Security Patches:</strong> Immediate deployment of critical updates</li>
        <li><strong>Feature Announcements:</strong> Email notifications for major new features</li>
      </ul>

      <h3>Service Status</h3>
      <ul>
        <li><strong>Uptime Target:</strong> 99.9% service availability</li>
        <li><strong>Status Page:</strong> Real-time service status and incident reports</li>
        <li><strong>Performance Monitoring:</strong> 24/7 monitoring of all systems</li>
        <li><strong>Incident Response:</strong> Rapid response to any service issues</li>
      </ul>

      <hr style={{ margin: "3rem 0" }} />

      <div style={{ textAlign: "center", backgroundColor: "#f3f4f6", padding: "2rem", borderRadius: "8px" }}>
        <h3>Need Help Right Now?</h3>
        <p style={{ marginBottom: "1rem" }}>Contact our support team for immediate assistance</p>
        <p><strong>Email:</strong> <a href="mailto:support@adsautopilotai.com">support@adsautopilotai.com</a><br />
        <strong>Response Time:</strong> 24 hours<br />
        <strong>Available:</strong> Monday-Friday, 9 AM - 6 PM EST</p>
        
        <div style={{ marginTop: "2rem" }}>
          <h4>Emergency Support</h4>
          <p>For critical issues affecting your campaigns:</p>
          <p><strong>Priority Email:</strong> <a href="mailto:urgent@adsautopilotai.com">urgent@adsautopilotai.com</a></p>
        </div>
      </div>

      <p style={{ textAlign: "center", marginTop: "2rem", color: "#666" }}>
        <strong>Ads Autopilot AI Support Team</strong><br />
        Helping you optimize your Google Ads campaigns with AI-powered automation
      </p>
    </div>
  );
}