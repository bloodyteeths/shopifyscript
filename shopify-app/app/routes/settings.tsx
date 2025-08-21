import { useState, useEffect } from "react";
import {
  Card,
  Form,
  FormLayout,
  TextField,
  Button,
  Banner,
  Spinner,
  Layout,
  Page,
} from "@shopify/polaris";

interface SettingsFormData {
  tenantId: string;
  backendUrl: string;
  hmacSecret: string;
  ga4MeasurementId: string;
  googleAdsId: string;
  conversionLabel: string;
}

export default function Settings() {
  const [formData, setFormData] = useState<SettingsFormData>({
    tenantId: "",
    backendUrl: "",
    hmacSecret: "",
    ga4MeasurementId: "",
    googleAdsId: "",
    conversionLabel: "",
  });

  const [loading, setLoading] = useState(false);
  const [saveStatus, setSaveStatus] = useState<
    "idle" | "saving" | "success" | "error"
  >("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [initialLoading, setInitialLoading] = useState(true);

  // Load existing settings on mount
  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setInitialLoading(true);
      const response = await fetch("/api/settings");
      if (response.ok) {
        const data = await response.json();
        setFormData(data);
      }
    } catch (error) {
      console.error("Failed to load settings:", error);
    } finally {
      setInitialLoading(false);
    }
  };

  const handleInputChange =
    (field: keyof SettingsFormData) => (value: string) => {
      setFormData((prev) => ({ ...prev, [field]: value }));
      setSaveStatus("idle"); // Reset save status when user types
    };

  const handleSave = async () => {
    if (!formData.tenantId || !formData.backendUrl || !formData.hmacSecret) {
      setErrorMessage("Tenant ID, Backend URL, and HMAC Secret are required");
      setSaveStatus("error");
      return;
    }

    setLoading(true);
    setSaveStatus("saving");
    setErrorMessage("");

    try {
      // Optimistic update
      setSaveStatus("success");

      // Save to Shopify metafields
      const metafieldsResponse = await fetch("/api/metafields", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          "proofkit.tenant_id": formData.tenantId,
          "proofkit.backend_url": formData.backendUrl,
          "proofkit.secret_key": formData.hmacSecret,
          "proofkit.ga4_measurement_id": formData.ga4MeasurementId,
          "proofkit.google_ads_id": formData.googleAdsId,
          "proofkit.conversion_label": formData.conversionLabel,
        }),
      });

      if (!metafieldsResponse.ok) {
        throw new Error("Failed to save to Shopify metafields");
      }

      // Upsert to backend
      const configResponse = await fetch("/api/upsert-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenant: formData.tenantId,
          config: {
            enabled: true,
            label: "PROOFKIT_AUTOMATED",
            backend_url: formData.backendUrl,
            hmac_secret: formData.hmacSecret,
            ga4_measurement_id: formData.ga4MeasurementId,
            google_ads_id: formData.googleAdsId,
            conversion_label: formData.conversionLabel,
          },
        }),
      });

      if (!configResponse.ok) {
        throw new Error("Failed to save to backend");
      }

      setSaveStatus("success");
    } catch (error) {
      console.error("Save failed:", error);
      setErrorMessage(error instanceof Error ? error.message : "Save failed");
      setSaveStatus("error");
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) {
    return (
      <Page title="Settings">
        <Layout>
          <Layout.Section>
            <Card>
              <div style={{ textAlign: "center", padding: "2rem" }}>
                <Spinner size="large" />
                <p>Loading settings...</p>
              </div>
            </Card>
          </Layout.Section>
        </Layout>
      </Page>
    );
  }

  return (
    <Page
      title="ProofKit Settings"
      subtitle="Configure your connection to ProofKit backend and tracking"
      primaryAction={{
        content: "Continue to Setup Wizard",
        url: "/app/funnel/wizard",
        disabled:
          !formData.tenantId || !formData.backendUrl || !formData.hmacSecret,
      }}
    >
      <Layout>
        <Layout.Section>
          {saveStatus === "success" && (
            <Banner status="success" onDismiss={() => setSaveStatus("idle")}>
              Settings saved successfully! You can now proceed to the setup
              wizard.
            </Banner>
          )}

          {saveStatus === "error" && (
            <Banner status="critical" onDismiss={() => setSaveStatus("idle")}>
              {errorMessage || "Failed to save settings. Please try again."}
            </Banner>
          )}

          <Card>
            <Form onSubmit={handleSave}>
              <FormLayout>
                <FormLayout.Group>
                  <TextField
                    label="Tenant ID"
                    value={formData.tenantId}
                    onChange={handleInputChange("tenantId")}
                    placeholder="demo-tenant-1"
                    helpText="Your unique ProofKit tenant identifier"
                    requiredIndicator
                    data-testid="settings-tenant-id"
                    autoComplete="off"
                  />

                  <TextField
                    label="Backend URL"
                    value={formData.backendUrl}
                    onChange={handleInputChange("backendUrl")}
                    placeholder="https://api.proofkit.com"
                    helpText="ProofKit backend API endpoint"
                    requiredIndicator
                    data-testid="settings-backend-url"
                    autoComplete="off"
                  />
                </FormLayout.Group>

                <TextField
                  label="HMAC Secret"
                  value={formData.hmacSecret}
                  onChange={handleInputChange("hmacSecret")}
                  type="password"
                  helpText="Secure key for API authentication"
                  requiredIndicator
                  data-testid="settings-hmac-secret"
                  autoComplete="off"
                />

                <FormLayout.Group>
                  <TextField
                    label="GA4 Measurement ID"
                    value={formData.ga4MeasurementId}
                    onChange={handleInputChange("ga4MeasurementId")}
                    placeholder="G-XXXXXXXXXX"
                    helpText="Google Analytics 4 tracking ID (optional)"
                    data-testid="settings-ga4-id"
                    autoComplete="off"
                  />

                  <TextField
                    label="Google Ads ID"
                    value={formData.googleAdsId}
                    onChange={handleInputChange("googleAdsId")}
                    placeholder="AW-XXXXXXXXX"
                    helpText="Google Ads conversion tracking ID (optional)"
                    data-testid="settings-google-ads-id"
                    autoComplete="off"
                  />
                </FormLayout.Group>

                <TextField
                  label="Conversion Label"
                  value={formData.conversionLabel}
                  onChange={handleInputChange("conversionLabel")}
                  placeholder="abc123def456"
                  helpText="Google Ads conversion label (optional)"
                  data-testid="settings-conversion-label"
                  autoComplete="off"
                />

                <Button
                  submit
                  primary
                  loading={loading}
                  disabled={
                    !formData.tenantId ||
                    !formData.backendUrl ||
                    !formData.hmacSecret
                  }
                  data-testid="settings-save"
                >
                  {saveStatus === "saving" ? "Saving..." : "Save Settings"}
                </Button>
              </FormLayout>
            </Form>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
