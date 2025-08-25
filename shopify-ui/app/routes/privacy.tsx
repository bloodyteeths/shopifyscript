import type { MetaFunction } from "@remix-run/node";

export const meta: MetaFunction = () => {
  return [
    { title: "Privacy Policy - Ads Autopilot AI" },
    { name: "description", content: "Ads Autopilot AI Privacy Policy - Privacy-first conversion optimization for Shopify stores" },
  ];
};

export default function Privacy() {
  return (
    <div style={{ fontFamily: "system-ui, sans-serif", lineHeight: "1.8", maxWidth: "800px", margin: "0 auto", padding: "2rem" }}>
      <h1>Ads Autopilot AI Privacy Policy</h1>
      
      <p><strong>Effective Date:</strong> August 25, 2025<br />
      <strong>Last Updated:</strong> August 25, 2025<br />
      <strong>Version:</strong> 1.0</p>

      <h2>📋 Executive Summary</h2>
      
      <p>Ads Autopilot AI is committed to protecting your privacy and maintaining the highest standards of data protection. This Privacy Policy explains our privacy-by-design approach, minimal data collection practices, and your rights regarding any information we process.</p>

      <h3>Key Privacy Principles:</h3>
      <ul>
        <li>✅ <strong>Data Minimization:</strong> We collect only what's absolutely necessary</li>
        <li>✅ <strong>No Customer PII:</strong> We don't collect personal information from your customers</li>
        <li>✅ <strong>Merchant Control:</strong> You maintain full control over your data</li>
        <li>✅ <strong>Transparency:</strong> Clear documentation of all data handling practices</li>
        <li>✅ <strong>Compliance:</strong> GDPR, CCPA, and global privacy regulation compliance</li>
      </ul>

      <h2>🎯 Information We Collect</h2>

      <h3>Merchant Account Information</h3>
      <p><strong>When You Install Ads Autopilot AI:</strong></p>
      <ul>
        <li><strong>Store Information:</strong> Store name, domain, Shopify store ID</li>
        <li><strong>Contact Details:</strong> Email address for support and notifications</li>
        <li><strong>Authentication Data:</strong> OAuth tokens for secure API access</li>
        <li><strong>App Configuration:</strong> Settings and preferences you configure in Ads Autopilot AI</li>
      </ul>

      <p><strong>Purpose:</strong> To provide app functionality and support services<br />
      <strong>Legal Basis:</strong> Legitimate business interest and contractual necessity<br />
      <strong>Retention:</strong> Duration of your Ads Autopilot AI subscription plus 30 days</p>

      <h3>Product Catalog Data (Read-Only)</h3>
      <p><strong>What We Access:</strong></p>
      <ul>
        <li><strong>Product Information:</strong> Product titles, descriptions, categories, and variants</li>
        <li><strong>Collection Data:</strong> Product collection organization and structure</li>
        <li><strong>Metafield Data:</strong> Custom product attributes (when used for optimization)</li>
      </ul>

      <p><strong>How We Use It:</strong></p>
      <ul>
        <li>Display products in Ads Autopilot AI configuration interface</li>
        <li>Generate conversion optimization recommendations</li>
        <li>Configure product-specific advertising campaigns</li>
      </ul>

      <p><strong>What We DON'T Do:</strong></p>
      <ul>
        <li>❌ Store product data outside of your store</li>
        <li>❌ Share product information with third parties</li>
        <li>❌ Modify or update your product information</li>
        <li>❌ Use product data for competitive analysis</li>
      </ul>

      <h2>❌ Information We DON'T Collect</h2>

      <h3>Customer Personal Information</h3>
      <p><strong>We Explicitly Do NOT Collect:</strong></p>
      <ul>
        <li>❌ Customer names, emails, or contact information</li>
        <li>❌ Customer addresses or shipping information</li>
        <li>❌ Phone numbers or personal identifiers</li>
        <li>❌ Payment or credit card information</li>
        <li>❌ Purchase history or order details</li>
        <li>❌ Customer browsing behavior or preferences</li>
        <li>❌ Individual customer demographic data</li>
      </ul>

      <h2>🔒 How We Protect Your Information</h2>

      <h3>Technical Security Measures</h3>
      <p><strong>Encryption & Transport Security:</strong></p>
      <ul>
        <li><strong>HTTPS Everywhere:</strong> All data transmission encrypted with TLS 1.3</li>
        <li><strong>API Security:</strong> HMAC validation for all requests</li>
        <li><strong>Token Security:</strong> OAuth tokens encrypted and securely stored</li>
        <li><strong>Database Encryption:</strong> All stored data encrypted at rest</li>
      </ul>

      <h2>🛡️ Your Privacy Rights</h2>

      <h3>Data Access & Control</h3>
      <p><strong>Right to Access:</strong></p>
      <ul>
        <li>Request a copy of all data we have about your store</li>
        <li>Understand how your data is being used</li>
        <li>Receive data in a portable format (JSON/CSV)</li>
        <li>Access detailed data processing logs</li>
      </ul>

      <p><strong>Right to Deletion:</strong></p>
      <ul>
        <li>Request deletion of all your data when uninstalling the app</li>
        <li>Selective deletion of specific data categories</li>
        <li>Immediate deletion upon request (no retention period)</li>
        <li>Confirmation of deletion completion</li>
      </ul>

      <h2>🌐 Third-Party Integrations</h2>

      <h3>Google Services Integration</h3>
      <p><strong>Google Sheets API:</strong></p>
      <ul>
        <li><strong>Purpose:</strong> Store campaign configurations and export data</li>
        <li><strong>Data Shared:</strong> Campaign settings, audience configurations</li>
        <li><strong>Merchant Control:</strong> You control access and can revoke permissions anytime</li>
        <li><strong>Data Location:</strong> Stored in your Google Sheets (your Google account)</li>
      </ul>

      <p><strong>Google Ads API:</strong></p>
      <ul>
        <li><strong>Purpose:</strong> Optimize advertising campaigns based on Ads Autopilot AI insights</li>
        <li><strong>Data Shared:</strong> Campaign optimization scripts and audience segments</li>
        <li><strong>Merchant Control:</strong> You control Google Ads account access</li>
        <li><strong>Data Processing:</strong> Scripts run in your Google Ads account</li>
      </ul>

      <h2>🌍 International Data Transfers</h2>

      <h3>Regional Compliance</h3>
      <p><strong>GDPR Compliance (EU/UK):</strong></p>
      <ul>
        <li><strong>Legal Basis:</strong> Legitimate interest and contractual necessity</li>
        <li><strong>Data Subject Rights:</strong> Full implementation of all GDPR rights</li>
        <li><strong>Data Protection Officer:</strong> Available for privacy-related inquiries</li>
        <li><strong>Supervisory Authority:</strong> Cooperation with relevant data protection authorities</li>
      </ul>

      <p><strong>CCPA Compliance (California):</strong></p>
      <ul>
        <li><strong>Consumer Rights:</strong> Full implementation of CCPA rights</li>
        <li><strong>Do Not Sell:</strong> We do not sell personal information</li>
        <li><strong>Opt-Out Rights:</strong> Comprehensive opt-out mechanisms</li>
        <li><strong>Data Categories:</strong> Clear disclosure of all data categories collected</li>
      </ul>

      <h2>👶 Children's Privacy</h2>
      <p>Ads Autopilot AI is not intended for use by individuals under 13 years of age. We do not knowingly collect personal information from children. If you believe we have inadvertently collected such information, please contact us immediately.</p>

      <h2>🔄 Privacy Policy Updates</h2>
      <p>We may update this Privacy Policy from time to time. We will notify you of any material changes by email and through the Ads Autopilot AI app. Your continued use of Ads Autopilot AI after such modifications constitutes your acceptance of the updated Privacy Policy.</p>

      <h2>📞 Contact Information</h2>
      <p><strong>Privacy Questions:</strong> privacy@adsautopilotai.com<br />
      <strong>Data Subject Requests:</strong> dpo@adsautopilotai.com<br />
      <strong>Security Incidents:</strong> security@adsautopilotai.com<br />
      <strong>General Support:</strong> support@adsautopilotai.com</p>

      <h3>Data Subject Request Timeline:</h3>
      <ul>
        <li><strong>Acknowledgment:</strong> Within 48 hours</li>
        <li><strong>Processing:</strong> Within 30 days (GDPR) or 45 days (CCPA)</li>
        <li><strong>Complex Requests:</strong> Up to 60-90 days with regular updates</li>
        <li><strong>Verification:</strong> Identity verification required for sensitive requests</li>
      </ul>

      <hr style={{ margin: "3rem 0" }} />

      <p style={{ textAlign: "center", color: "#666" }}>
        <strong>This Privacy Policy is effective as of August 25, 2025, and will remain in effect except with respect to any changes in its provisions in the future, which will be in effect immediately after being posted on this page.</strong>
      </p>

      <p style={{ textAlign: "center", marginTop: "2rem" }}>
        <strong>Contact Information:</strong><br />
        <strong>Email:</strong> privacy@adsautopilotai.com<br />
        <strong>Support:</strong> support@adsautopilotai.com<br />
        <strong>Website:</strong> <a href="https://adsautopilotai.com/privacy">https://adsautopilotai.com/privacy</a>
      </p>
    </div>
  );
}