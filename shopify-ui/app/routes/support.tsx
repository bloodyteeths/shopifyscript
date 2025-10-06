import type { MetaFunction, LoaderFunction } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { useState } from "react";

export const meta: MetaFunction = () => {
  return [
    { title: "Support - Ads Autopilot AI" },
    { name: "description", content: "Get tier-based support for Ads Autopilot AI - Email, priority, and phone support options" },
  ];
};

// Loader to detect subscription tier from session
export const loader: LoaderFunction = async ({ request }) => {
  try {
    const url = new URL(request.url);
    const tenant = url.searchParams.get("tenant");
    
    if (!tenant) {
      // Default to starter tier if no tenant
      return json({
        tier: "starter",
        contactMethods: {
          email_support: true,
          phone_support: false,
          priority_routing: false,
          support_email: "support@adsautopilot.com",
          guaranteed_response_hours: 24
        }
      });
    }

    // In production, this would check the subscription via API
    // For now, we'll determine tier based on tenant or use environment
    let tier = "starter";
    let contactMethods = {
      email_support: true,
      phone_support: false,
      priority_routing: false,
      support_email: "support@adsautopilot.com",
      guaranteed_response_hours: 24
    };

    // Check if billing enforcement is disabled (development mode)
    const billingActive = process.env.BILLING_ENFORCEMENT_ACTIVE === "true";
    if (!billingActive) {
      tier = "enterprise";
      contactMethods = {
        email_support: true,
        phone_support: true,
        priority_routing: true,
        support_email: "enterprise@adsautopilot.com",
        support_phone: "(307) 395-9830",
        guaranteed_response_hours: 6
      };
    }

    return json({
      tier,
      contactMethods
    });
  } catch (error) {
    console.error("Error loading support data:", error);
    // Fallback to starter tier on error
    return json({
      tier: "starter",
      contactMethods: {
        email_support: true,
        phone_support: false,
        priority_routing: false,
        support_email: "support@adsautopilot.com",
        guaranteed_response_hours: 24
      }
    });
  }
};

interface ContactFormData {
  subject: string;
  description: string;
  category: string;
  priority: string;
  customer_name: string;
  customer_email: string;
  customer_phone?: string;
}

export default function Support() {
  const { tier, contactMethods } = useLoaderData<typeof loader>();
  const [showContactForm, setShowContactForm] = useState(false);
  const [formData, setFormData] = useState<ContactFormData>({
    subject: "",
    description: "",
    category: "general",
    priority: "normal",
    customer_name: "",
    customer_email: "",
    customer_phone: ""
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState<{ success: boolean; message: string } | null>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitResult(null);

    try {
      // In production, this would call your support API
      console.log("Submitting support ticket:", formData);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      setSubmitResult({ 
        success: true, 
        message: "Support ticket created successfully! You'll receive an email confirmation shortly." 
      });
      setShowContactForm(false);
      setFormData({
        subject: "",
        description: "",
        category: "general", 
        priority: "normal",
        customer_name: "",
        customer_email: "",
        customer_phone: ""
      });
    } catch (error) {
      setSubmitResult({
        success: false,
        message: "Failed to create support ticket. Please try again or email us directly."
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getTierDisplayName = (tier: string) => {
    const tierNames = {
      starter: "Starter Plan",
      professional: "Professional Plan",
      enterprise: "Enterprise Plan"
    };
    return tierNames[tier as keyof typeof tierNames] || "Unknown Plan";
  };

  const getTierSupportLevel = (tier: string) => {
    const supportLevels = {
      starter: { 
        type: "Email Support", 
        response: "24 hours",
        description: "Email support during business hours",
        features: ["Email support", "Knowledge base access", "Community forum"]
      },
      professional: { 
        type: "Priority Email Support", 
        response: "12 hours",
        description: "Priority email support with faster response times",
        features: ["Priority email support", "Advanced troubleshooting", "Feature guidance", "Escalation options"]
      },
      enterprise: { 
        type: "Priority Phone & Email Support", 
        response: "6 hours",
        description: "Premium support with phone and email options",
        features: ["Priority phone support", "Priority email support", "Dedicated account manager", "SLA guarantees", "Custom integration support"]
      }
    };
    return supportLevels[tier as keyof typeof supportLevels] || supportLevels.starter;
  };

  const supportLevel = getTierSupportLevel(tier);

  return (
    <div style={{ fontFamily: "system-ui, sans-serif", lineHeight: "1.8", maxWidth: "800px", margin: "0 auto", padding: "2rem" }}>
      <h1>Ads Autopilot AI Support</h1>
      
      <p>Get help with Ads Autopilot AI - your AI-powered Google Ads optimization tool for Shopify stores.</p>

      {/* Current Plan Support Level */}
      <div style={{ 
        padding: "1.5rem", 
        background: tier === "enterprise" ? "#fef3e3" : tier === "professional" ? "#f0f9ff" : "#f8fafc", 
        border: `2px solid ${tier === "enterprise" ? "#f59e0b" : tier === "professional" ? "#3b82f6" : "#64748b"}`, 
        borderRadius: "8px", 
        marginBottom: "2rem" 
      }}>
        <h2 style={{ 
          margin: "0 0 1rem 0", 
          color: tier === "enterprise" ? "#92400e" : tier === "professional" ? "#1e40af" : "#475569" 
        }}>
          Your Support Level: {getTierDisplayName(tier)}
        </h2>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "1rem", alignItems: "start" }}>
          <div>
            <p style={{ margin: "0 0 0.5rem 0", fontWeight: "bold", fontSize: "1.1rem" }}>
              {supportLevel.type}
            </p>
            <p style={{ margin: "0 0 0.5rem 0", color: "#6b7280" }}>
              Response within {supportLevel.response}
            </p>
            <p style={{ margin: "0", color: "#6b7280", fontSize: "0.9rem" }}>
              {supportLevel.description}
            </p>
          </div>
          <div>
            <p style={{ margin: "0 0 0.5rem 0", fontWeight: "bold" }}>Included Features:</p>
            <ul style={{ margin: "0", paddingLeft: "1.5rem" }}>
              {supportLevel.features.map((feature, index) => (
                <li key={index} style={{ color: "#374151", marginBottom: "0.25rem" }}>{feature}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Contact Form or Show Form Button */}
      {!showContactForm ? (
        <div style={{ textAlign: "center", margin: "2rem 0" }}>
          <button
            onClick={() => setShowContactForm(true)}
            style={{
              padding: "1rem 2rem",
              backgroundColor: tier === "enterprise" ? "#f59e0b" : tier === "professional" ? "#3b82f6" : "#6366f1",
              color: "white",
              border: "none",
              borderRadius: "8px",
              fontSize: "1.1rem",
              fontWeight: "bold",
              cursor: "pointer"
            }}
          >
            Create Support Ticket
          </button>
          <p style={{ marginTop: "1rem", color: "#6b7280" }}>
            Get help with technical issues, billing questions, or general support
          </p>
        </div>
      ) : (
        <div style={{ 
          padding: "1.5rem", 
          border: "1px solid #e5e7eb", 
          borderRadius: "8px", 
          marginBottom: "2rem",
          backgroundColor: "#fafafa"
        }}>
          <h3>Create Support Ticket</h3>
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: "1rem" }}>
              <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "bold" }}>
                Your Name *
              </label>
              <input
                type="text"
                name="customer_name"
                value={formData.customer_name}
                onChange={handleInputChange}
                required
                style={{ width: "100%", padding: "0.75rem", border: "1px solid #d1d5db", borderRadius: "4px" }}
              />
            </div>

            <div style={{ marginBottom: "1rem" }}>
              <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "bold" }}>
                Email Address *
              </label>
              <input
                type="email"
                name="customer_email"
                value={formData.customer_email}
                onChange={handleInputChange}
                required
                style={{ width: "100%", padding: "0.75rem", border: "1px solid #d1d5db", borderRadius: "4px" }}
              />
            </div>

            {tier === "enterprise" && (
              <div style={{ marginBottom: "1rem" }}>
                <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "bold" }}>
                  Phone Number (for phone support)
                </label>
                <input
                  type="tel"
                  name="customer_phone"
                  value={formData.customer_phone}
                  onChange={handleInputChange}
                  style={{ width: "100%", padding: "0.75rem", border: "1px solid #d1d5db", borderRadius: "4px" }}
                />
              </div>
            )}

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
              <div>
                <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "bold" }}>
                  Category *
                </label>
                <select
                  name="category"
                  value={formData.category}
                  onChange={handleInputChange}
                  required
                  style={{ width: "100%", padding: "0.75rem", border: "1px solid #d1d5db", borderRadius: "4px" }}
                >
                  <option value="general">General</option>
                  <option value="technical">Technical</option>
                  <option value="billing">Billing</option>
                  {tier === "enterprise" && <option value="urgent">Urgent</option>}
                </select>
              </div>

              <div>
                <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "bold" }}>
                  Priority *
                </label>
                <select
                  name="priority"
                  value={formData.priority}
                  onChange={handleInputChange}
                  required
                  style={{ width: "100%", padding: "0.75rem", border: "1px solid #d1d5db", borderRadius: "4px" }}
                >
                  <option value="low">Low</option>
                  <option value="normal">Normal</option>
                  {["professional", "enterprise"].includes(tier) && <option value="high">High</option>}
                  {tier === "enterprise" && <option value="urgent">Urgent</option>}
                </select>
              </div>
            </div>

            <div style={{ marginBottom: "1rem" }}>
              <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "bold" }}>
                Subject *
              </label>
              <input
                type="text"
                name="subject"
                value={formData.subject}
                onChange={handleInputChange}
                required
                style={{ width: "100%", padding: "0.75rem", border: "1px solid #d1d5db", borderRadius: "4px" }}
                placeholder="Brief description of your issue"
              />
            </div>

            <div style={{ marginBottom: "1rem" }}>
              <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "bold" }}>
                Description *
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                required
                rows={5}
                style={{ width: "100%", padding: "0.75rem", border: "1px solid #d1d5db", borderRadius: "4px" }}
                placeholder="Please provide detailed information about your issue..."
              />
            </div>

            <div style={{ display: "flex", gap: "1rem" }}>
              <button
                type="submit"
                disabled={isSubmitting}
                style={{
                  padding: "0.75rem 1.5rem",
                  backgroundColor: tier === "enterprise" ? "#f59e0b" : tier === "professional" ? "#3b82f6" : "#6366f1",
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  fontSize: "1rem",
                  fontWeight: "bold",
                  cursor: isSubmitting ? "not-allowed" : "pointer",
                  opacity: isSubmitting ? 0.6 : 1
                }}
              >
                {isSubmitting ? "Creating Ticket..." : "Create Ticket"}
              </button>
              <button
                type="button"
                onClick={() => setShowContactForm(false)}
                style={{
                  padding: "0.75rem 1.5rem",
                  backgroundColor: "#6b7280",
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  fontSize: "1rem",
                  cursor: "pointer"
                }}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Submit Result */}
      {submitResult && (
        <div style={{ 
          padding: "1rem", 
          backgroundColor: submitResult.success ? "#dcfce7" : "#fee2e2",
          border: `1px solid ${submitResult.success ? "#16a34a" : "#dc2626"}`,
          borderRadius: "4px",
          marginBottom: "2rem"
        }}>
          <p style={{ 
            margin: "0", 
            color: submitResult.success ? "#166534" : "#991b1b",
            fontWeight: "bold"
          }}>
            {submitResult.message}
          </p>
        </div>
      )}

      <h2>Direct Contact Information</h2>

      <div style={{ display: "grid", gridTemplateColumns: tier === "enterprise" ? "1fr 1fr 1fr" : "1fr 1fr", gap: "2rem", margin: "2rem 0" }}>
        <div style={{ padding: "1.5rem", border: "1px solid #e5e7eb", borderRadius: "8px" }}>
          <h3>Email Support</h3>
          <p><strong>Email:</strong> {contactMethods.support_email}<br />
          <strong>Response Time:</strong> {contactMethods.guaranteed_response_hours} hours<br />
          <strong>Hours:</strong> Monday-Friday, 9 AM - 6 PM EST</p>
          <p>For all general inquiries, technical support, and account questions.</p>
        </div>

        {tier === "enterprise" && (
          <div style={{ padding: "1.5rem", border: "2px solid #f59e0b", borderRadius: "8px", backgroundColor: "#fef3e3" }}>
            <h3>Phone Support</h3>
            <p><strong>Phone:</strong> (307) 395-9830<br />
            <strong>Response Time:</strong> Immediate<br />
            <strong>Hours:</strong> Monday-Friday, 9 AM - 6 PM EST</p>
            <p>Priority phone support for urgent issues and dedicated account management.</p>
          </div>
        )}

        <div style={{ padding: "1.5rem", border: "1px solid #e5e7eb", borderRadius: "8px" }}>
          <h3>Billing & Accounts</h3>
          <p><strong>Email:</strong> billing@adsautopilot.com<br />
          <strong>Response Time:</strong> {tier === "enterprise" ? "4" : tier === "professional" ? "6" : "24"} hours<br />
          <strong>Hours:</strong> Monday-Friday, 9 AM - 6 PM EST</p>
          <p>For subscription issues, billing questions, refund requests, and plan changes.</p>
        </div>
      </div>

      <h2>Getting Started</h2>

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
        <li><strong>AI-Powered Optimization:</strong> Automated Google Ads campaign management</li>
        <li><strong>Smart Audience Targeting:</strong> Anonymous customer segmentation without PII</li>
        <li><strong>Performance Analytics:</strong> Real-time conversion tracking and insights</li>
        <li><strong>Google Sheets Integration:</strong> Export data and manage campaigns</li>
        <li><strong>Privacy-First:</strong> GDPR & CCPA compliant, no customer data collection</li>
      </ul>

      <h2>Documentation & Resources</h2>

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

      <h2>Pricing & Plans</h2>

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

      <h2>Technical Support</h2>

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

      <h2>Privacy & Security</h2>

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

      <h2>Performance & Optimization</h2>

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

      <h2>Training & Onboarding</h2>

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

      <h2>Updates & Maintenance</h2>

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
        <p><strong>Email:</strong> <a href="mailto:atanrikulu@e-listele.com">atanrikulu@e-listele.com</a><br />
        <strong>Response Time:</strong> 24 hours<br />
        <strong>Available:</strong> Monday-Friday, 9 AM - 6 PM EST</p>
        
        <div style={{ marginTop: "2rem" }}>
          <h4>Emergency Support</h4>
          <p>For critical issues affecting your campaigns:</p>
          <p><strong>Priority Email:</strong> <a href="mailto:atanrikulu@e-listele.com">atanrikulu@e-listele.com</a></p>
        </div>
      </div>

      <p style={{ textAlign: "center", marginTop: "2rem", color: "#666" }}>
        <strong>Ads Autopilot AI Support Team</strong><br />
        Helping you optimize your Google Ads campaigns with AI-powered automation
      </p>
    </div>
  );
}