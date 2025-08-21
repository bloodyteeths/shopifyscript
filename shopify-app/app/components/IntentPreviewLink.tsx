import { useState } from "react";
import {
  Button,
  Modal,
  Card,
  Stack,
  TextStyle,
  Badge,
  Banner,
} from "@shopify/polaris";

interface IntentPreviewLinkProps {
  utmTerm: string;
  children?: React.ReactNode;
}

export default function IntentPreviewLink({
  utmTerm,
  children,
}: IntentPreviewLinkProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [previewContent, setPreviewContent] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const openPreview = async () => {
    setLoading(true);
    setModalOpen(true);

    try {
      // Fetch preview content for this UTM term
      const response = await fetch(`/api/intent-preview?utm_term=${utmTerm}`);
      const content = await response.json();
      setPreviewContent(content);
    } catch (error) {
      console.error("Failed to load preview:", error);
      setPreviewContent({ error: "Failed to load preview content" });
    } finally {
      setLoading(false);
    }
  };

  const getIntentDescription = (term: string) => {
    switch (term) {
      case "high-intent":
        return "Urgent, conversion-focused messaging with scarcity and strong CTAs";
      case "research":
        return "Educational, trust-building content with detailed benefits";
      case "comparison":
        return "Competitive advantages and differentiation messaging";
      case "retargeting":
        return "Personalized welcome back messages with incentives";
      default:
        return "Default content for general visitors";
    }
  };

  const getIntentColor = (term: string) => {
    switch (term) {
      case "high-intent":
        return "critical";
      case "research":
        return "info";
      case "comparison":
        return "warning";
      case "retargeting":
        return "success";
      default:
        return "default";
    }
  };

  return (
    <>
      <Button
        outline
        onClick={openPreview}
        data-testid={`intent-preview-${utmTerm}`}
      >
        {children || `Preview: utm_term=${utmTerm}`}
      </Button>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={`Intent Preview: ${utmTerm}`}
        large
      >
        <Modal.Section>
          <Stack vertical>
            <Banner status={getIntentColor(utmTerm) as any}>
              <p>
                <strong>Intent Strategy:</strong>{" "}
                {getIntentDescription(utmTerm)}
              </p>
            </Banner>

            {loading ? (
              <Card sectioned>
                <p>Loading preview content...</p>
              </Card>
            ) : previewContent?.error ? (
              <Card sectioned>
                <Banner status="critical">Error: {previewContent.error}</Banner>
              </Card>
            ) : previewContent ? (
              <Card sectioned>
                <Stack vertical spacing="loose">
                  <div>
                    <TextStyle variation="strong">Hero Headline</TextStyle>
                    <p
                      style={{
                        fontSize: "1.5rem",
                        fontWeight: "bold",
                        color:
                          utmTerm === "high-intent"
                            ? "#d32f2f"
                            : utmTerm === "comparison"
                              ? "#1976d2"
                              : utmTerm === "retargeting"
                                ? "#f57c00"
                                : "inherit",
                      }}
                    >
                      {previewContent.headline ||
                        "Sample headline for " + utmTerm}
                    </p>
                  </div>

                  {previewContent.urgencyBadge && (
                    <div>
                      <Badge status={getIntentColor(utmTerm) as any}>
                        {previewContent.urgencyBadge}
                      </Badge>
                    </div>
                  )}

                  <div>
                    <TextStyle variation="strong">Benefits</TextStyle>
                    <ul>
                      {(
                        previewContent.benefits || [
                          `Benefit 1 for ${utmTerm} traffic`,
                          `Benefit 2 for ${utmTerm} traffic`,
                          `Benefit 3 for ${utmTerm} traffic`,
                        ]
                      ).map((benefit: string, index: number) => (
                        <li key={index}>{benefit}</li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <TextStyle variation="strong">Social Proof</TextStyle>
                    <p style={{ fontStyle: "italic" }}>
                      {previewContent.socialProof ||
                        `Social proof message for ${utmTerm} visitors`}
                    </p>
                  </div>

                  <div>
                    <Button primary size="large" fullWidth>
                      {previewContent.ctaText || `CTA for ${utmTerm}`}
                    </Button>
                  </div>

                  {utmTerm === "high-intent" && (
                    <div
                      style={{
                        background: "linear-gradient(135deg, #ff4444, #ff6666)",
                        color: "white",
                        padding: "1rem",
                        borderRadius: "8px",
                        textAlign: "center",
                      }}
                    >
                      <p>
                        <strong>Limited time offer ends in:</strong>
                      </p>
                      <p
                        style={{ fontSize: "1.5rem", fontFamily: "monospace" }}
                      >
                        23h 45m 12s
                      </p>
                    </div>
                  )}
                </Stack>
              </Card>
            ) : (
              <Card sectioned>
                <p>
                  Click preview to see how content adapts for {utmTerm} traffic.
                </p>
              </Card>
            )}

            <Card sectioned>
              <Stack vertical spacing="tight">
                <TextStyle variation="strong">Implementation Notes:</TextStyle>
                <ul style={{ fontSize: "0.9rem", color: "#666" }}>
                  <li>
                    Content automatically adapts based on UTM parameters in the
                    URL
                  </li>
                  <li>
                    No additional configuration needed - works with any UTM
                    source
                  </li>
                  <li>
                    Tracks conversion rates by intent type for optimization
                  </li>
                  <li>Supports A/B testing different content variations</li>
                </ul>
              </Stack>
            </Card>
          </Stack>
        </Modal.Section>
      </Modal>
    </>
  );
}
