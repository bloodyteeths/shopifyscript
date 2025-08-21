import { useState, useEffect } from "react";
import {
  Page,
  Card,
  Layout,
  Button,
  ButtonGroup,
  Stack,
  TextStyle,
  Banner,
  Form,
  FormLayout,
  TextField,
  Checkbox,
  Select,
  TextContainer,
  List,
  Spinner,
  Badge,
  Icon,
} from "@shopify/polaris";
import { CheckmarkIcon, AlertIcon } from "@shopify/polaris-icons";
import ErrorBoundary from "../components/ErrorBoundary";
import LoadingState from "../components/LoadingState";
import ProgressIndicator from "../components/ProgressIndicator";
import AccessibleModal from "../components/AccessibleModal";

interface WizardStep {
  id: string;
  title: string;
  description: string;
  component: React.ComponentType<any>;
  isComplete: boolean;
  isActive: boolean;
}

interface SafeRunConfig {
  dailyBudgetCap: string;
  cpcCeiling: string;
  scheduleStart: string;
  scheduleEnd: string;
  scheduleDays: string;
  canaryLabel: string;
  exclusions: string;
}

export default function FunnelWizard() {
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [safeRunConfig, setSafeRunConfig] = useState<SafeRunConfig>({
    dailyBudgetCap: "25.00",
    cpcCeiling: "2.50",
    scheduleStart: "09:00",
    scheduleEnd: "17:00",
    scheduleDays: "MONDAY,TUESDAY,WEDNESDAY,THURSDAY,FRIDAY",
    canaryLabel: "PROOFKIT_AUTOMATED",
    exclusions: "",
  });

  const [previewResults, setPreviewResults] = useState<any>(null);
  const [aiDrafts, setAiDrafts] = useState<any[]>([]);
  const [intentPreviewOpen, setIntentPreviewOpen] = useState(false);
  const [audienceConfig, setAudienceConfig] = useState({
    listId: "",
    mode: "OBSERVE",
    bidModifier: "",
  });
  const [promoteEnabled, setPromoteEnabled] = useState(false);

  const steps: WizardStep[] = [
    {
      id: "safe-run",
      title: "Safe First Run",
      description: "Set budget caps and schedule limits for your first test",
      component: SafeRunStep,
      isComplete: completedSteps.has(0),
      isActive: currentStep === 0,
    },
    {
      id: "script-preview",
      title: "Script Preview",
      description: "Test your configuration without making live changes",
      component: ScriptPreviewStep,
      isComplete: completedSteps.has(1),
      isActive: currentStep === 1,
    },
    {
      id: "ai-drafts",
      title: "AI Drafts",
      description: "Generate and validate RSA ad copy (optional)",
      component: AiDraftsStep,
      isComplete: completedSteps.has(2),
      isActive: currentStep === 2,
    },
    {
      id: "intent-preview",
      title: "Intent Blocks",
      description: "Preview dynamic content based on traffic source",
      component: IntentPreviewStep,
      isComplete: completedSteps.has(3),
      isActive: currentStep === 3,
    },
    {
      id: "audience-setup",
      title: "Audience Setup",
      description: "Upload audience lists and configure targeting",
      component: AudienceSetupStep,
      isComplete: completedSteps.has(4),
      isActive: currentStep === 4,
    },
    {
      id: "go-live",
      title: "Go Live",
      description: "Enable PROMOTE and run your first automation",
      component: GoLiveStep,
      isComplete: completedSteps.has(5),
      isActive: currentStep === 5,
    },
  ];

  const currentStepData = steps[currentStep];
  const progress = (completedSteps.size / steps.length) * 100;

  const completeStep = (stepIndex: number) => {
    setCompletedSteps((prev) => new Set(prev).add(stepIndex));
  };

  const nextStep = () => {
    if (currentStep < steps.length - 1) {
      completeStep(currentStep);
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  // Step Components
  function SafeRunStep() {
    return (
      <Card>
        <Card.Section>
          <Stack vertical>
            <TextStyle variation="strong">Configure Safe Limits</TextStyle>
            <p>
              Set conservative limits for your first automation run to ensure
              safety.
            </p>

            <Form>
              <FormLayout>
                <FormLayout.Group>
                  <TextField
                    label="Daily Budget Cap"
                    value={safeRunConfig.dailyBudgetCap}
                    onChange={(value) =>
                      setSafeRunConfig((prev) => ({
                        ...prev,
                        dailyBudgetCap: value,
                      }))
                    }
                    prefix="$"
                    type="number"
                    step="0.01"
                    helpText="Maximum daily spend per campaign"
                    data-testid="wizard-budget-cap"
                  />

                  <TextField
                    label="CPC Ceiling"
                    value={safeRunConfig.cpcCeiling}
                    onChange={(value) =>
                      setSafeRunConfig((prev) => ({
                        ...prev,
                        cpcCeiling: value,
                      }))
                    }
                    prefix="$"
                    type="number"
                    step="0.01"
                    helpText="Maximum cost per click"
                    data-testid="wizard-cpc-ceiling"
                  />
                </FormLayout.Group>

                <FormLayout.Group>
                  <TextField
                    label="Schedule Start"
                    value={safeRunConfig.scheduleStart}
                    onChange={(value) =>
                      setSafeRunConfig((prev) => ({
                        ...prev,
                        scheduleStart: value,
                      }))
                    }
                    type="time"
                    helpText="When ads should start showing"
                    data-testid="wizard-schedule-start"
                  />

                  <TextField
                    label="Schedule End"
                    value={safeRunConfig.scheduleEnd}
                    onChange={(value) =>
                      setSafeRunConfig((prev) => ({
                        ...prev,
                        scheduleEnd: value,
                      }))
                    }
                    type="time"
                    helpText="When ads should stop showing"
                    data-testid="wizard-schedule-end"
                  />
                </FormLayout.Group>

                <TextField
                  label="Exclusions (Campaign Names)"
                  value={safeRunConfig.exclusions}
                  onChange={(value) =>
                    setSafeRunConfig((prev) => ({ ...prev, exclusions: value }))
                  }
                  placeholder="campaign1,campaign2,campaign3"
                  helpText="Comma-separated list of campaigns to exclude from automation"
                  multiline
                  data-testid="wizard-exclusions"
                />
              </FormLayout>
            </Form>
          </Stack>
        </Card.Section>
      </Card>
    );
  }

  function ScriptPreviewStep() {
    const [previewLoading, setPreviewLoading] = useState(false);
    const [secondPreviewResults, setSecondPreviewResults] = useState<any>(null);

    const runPreview = async (isSecondRun = false) => {
      setPreviewLoading(true);
      setError("");

      try {
        const response = await fetch("/api/script-preview", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            config: safeRunConfig,
            isSecondRun,
          }),
        });

        const results = await response.json();

        if (isSecondRun) {
          setSecondPreviewResults(results);
        } else {
          setPreviewResults(results);
        }
      } catch (error) {
        setError(
          "Preview failed: " +
            (error instanceof Error ? error.message : "Unknown error"),
        );
      } finally {
        setPreviewLoading(false);
      }
    };

    return (
      <Card>
        <Card.Section>
          <Stack vertical>
            <TextStyle variation="strong">
              Script Preview (No Live Changes)
            </TextStyle>
            <p>
              Test your configuration to see what changes the script would make.
            </p>

            <ButtonGroup>
              <Button
                primary
                loading={previewLoading}
                onClick={() => runPreview(false)}
                data-testid="preview-run"
              >
                Run Preview
              </Button>

              {previewResults && (
                <Button
                  onClick={() => runPreview(true)}
                  data-testid="preview-run-second"
                >
                  Run Second Preview (Idempotency Test)
                </Button>
              )}
            </ButtonGroup>

            {previewResults && (
              <Card sectioned>
                <Stack vertical>
                  <TextStyle variation="strong">
                    First Preview Results:
                  </TextStyle>
                  <List>
                    {previewResults.mutations?.map(
                      (mutation: any, index: number) => (
                        <List.Item key={index}>
                          <Badge
                            status={
                              mutation.type === "error" ? "critical" : "success"
                            }
                          >
                            {mutation.type}
                          </Badge>{" "}
                          {mutation.description}
                        </List.Item>
                      ),
                    ) || <List.Item>No mutations planned</List.Item>}
                  </List>
                </Stack>
              </Card>
            )}

            {secondPreviewResults && (
              <Card sectioned>
                <Stack vertical>
                  <TextStyle variation="strong">
                    Second Preview Results (Should be empty):
                  </TextStyle>
                  {secondPreviewResults.mutations?.length === 0 ? (
                    <Banner status="success">
                      ✓ Idempotency test passed - no duplicate mutations planned
                    </Banner>
                  ) : (
                    <Banner status="critical">
                      ✗ Idempotency test failed - unexpected mutations found
                    </Banner>
                  )}
                </Stack>
              </Card>
            )}
          </Stack>
        </Card.Section>
      </Card>
    );
  }

  function AiDraftsStep() {
    const [draftsLoading, setDraftsLoading] = useState(false);

    const generateDrafts = async () => {
      setDraftsLoading(true);
      setError("");

      try {
        const response = await fetch("/api/ai-drafts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "rsa",
            count: 3,
            validate: true,
          }),
        });

        const results = await response.json();
        setAiDrafts(results.drafts || []);
      } catch (error) {
        setError(
          "Draft generation failed: " +
            (error instanceof Error ? error.message : "Unknown error"),
        );
      } finally {
        setDraftsLoading(false);
      }
    };

    return (
      <Card>
        <Card.Section>
          <Stack vertical>
            <TextStyle variation="strong">
              AI-Generated RSA Drafts (Optional)
            </TextStyle>
            <p>
              Generate responsive search ad copy with 30/90 character
              validation.
            </p>

            <Button
              primary
              loading={draftsLoading}
              onClick={generateDrafts}
              data-testid="generate-ai-drafts"
            >
              Generate RSA Drafts
            </Button>

            {aiDrafts.length > 0 && (
              <Card sectioned>
                <Stack vertical>
                  <TextStyle variation="strong">Generated Drafts:</TextStyle>
                  {aiDrafts.map((draft, index) => (
                    <Card key={index} sectioned>
                      <Stack vertical spacing="tight">
                        <TextStyle variation="strong">
                          Headlines ({draft.headlines?.length || 0}):
                        </TextStyle>
                        {draft.headlines?.map((headline: string, i: number) => (
                          <p key={i}>
                            <Badge
                              status={
                                headline.length <= 30 ? "success" : "critical"
                              }
                            >
                              {headline.length}/30
                            </Badge>{" "}
                            {headline}
                          </p>
                        )) || <p>No headlines generated</p>}

                        <TextStyle variation="strong">
                          Descriptions ({draft.descriptions?.length || 0}):
                        </TextStyle>
                        {draft.descriptions?.map((desc: string, i: number) => (
                          <p key={i}>
                            <Badge
                              status={
                                desc.length <= 90 ? "success" : "critical"
                              }
                            >
                              {desc.length}/90
                            </Badge>{" "}
                            {desc}
                          </p>
                        )) || <p>No descriptions generated</p>}
                      </Stack>
                    </Card>
                  ))}
                </Stack>
              </Card>
            )}
          </Stack>
        </Card.Section>
      </Card>
    );
  }

  function IntentPreviewStep() {
    const utmTerms = ["high-intent", "research", "comparison", "retargeting"];

    return (
      <Card>
        <Card.Section>
          <Stack vertical>
            <TextStyle variation="strong">Intent Block Preview</TextStyle>
            <p>
              Preview how your content changes based on traffic source (UTM
              parameters).
            </p>

            <Stack>
              {utmTerms.map((term) => (
                <Button
                  key={term}
                  outline
                  url={`/app/intent-preview?utm_term=${term}`}
                  external
                  data-testid={`intent-preview-${term}`}
                >
                  Preview: utm_term={term}
                </Button>
              ))}
            </Stack>

            <Banner status="info">
              <p>
                Intent blocks automatically adapt your content based on how
                visitors arrive at your site. Try the preview links above to see
                different messaging for different audience intents.
              </p>
            </Banner>
          </Stack>
        </Card.Section>
      </Card>
    );
  }

  function AudienceSetupStep() {
    const [uploadInstructions, setUploadInstructions] = useState(false);

    return (
      <Card>
        <Card.Section>
          <Stack vertical>
            <TextStyle variation="strong">Audience Setup (Optional)</TextStyle>
            <p>Configure audience targeting for your campaigns.</p>

            <Button
              outline
              onClick={() => setUploadInstructions(true)}
              data-testid="audience-upload-help"
            >
              Show Upload Instructions
            </Button>

            <FormLayout>
              <TextField
                label="User List ID"
                value={audienceConfig.listId}
                onChange={(value) =>
                  setAudienceConfig((prev) => ({ ...prev, listId: value }))
                }
                placeholder="123456789"
                helpText="Paste the User List ID from Google Ads"
                data-testid="audience-list-id"
              />

              <Select
                label="Targeting Mode"
                value={audienceConfig.mode}
                onChange={(value) =>
                  setAudienceConfig((prev) => ({ ...prev, mode: value }))
                }
                options={[
                  { label: "Observe (Recommended)", value: "OBSERVE" },
                  { label: "Target", value: "TARGET" },
                  { label: "Exclude", value: "EXCLUDE" },
                ]}
                helpText="Start with OBSERVE to collect data before targeting"
                data-testid="audience-mode"
              />

              {audienceConfig.mode === "TARGET" && (
                <TextField
                  label="Bid Modifier"
                  value={audienceConfig.bidModifier}
                  onChange={(value) =>
                    setAudienceConfig((prev) => ({
                      ...prev,
                      bidModifier: value,
                    }))
                  }
                  placeholder="1.25"
                  type="number"
                  step="0.01"
                  helpText="Bid multiplier for this audience (e.g., 1.25 = +25%)"
                  data-testid="audience-bid-modifier"
                />
              )}
            </FormLayout>

            <Modal
              open={uploadInstructions}
              onClose={() => setUploadInstructions(false)}
              title="Audience Upload Instructions"
              data-testid="audience-instructions-modal"
            >
              <Modal.Section>
                <TextContainer>
                  <p>
                    <strong>Step 1:</strong> Export your audience CSV from
                    ProofKit
                  </p>
                  <p>
                    <strong>Step 2:</strong> In Google Ads, go to Tools &
                    Settings → Audience Manager
                  </p>
                  <p>
                    <strong>Step 3:</strong> Click + and select "Customer list"
                  </p>
                  <p>
                    <strong>Step 4:</strong> Upload your CSV file
                  </p>
                  <p>
                    <strong>Step 5:</strong> After processing, copy the User
                    List ID
                  </p>
                  <p>
                    <strong>Step 6:</strong> Paste the ID in the field above
                  </p>
                </TextContainer>
              </Modal.Section>
            </Modal>
          </Stack>
        </Card.Section>
      </Card>
    );
  }

  function GoLiveStep() {
    const [scheduleWindow, setScheduleWindow] = useState({
      startTime: "",
      duration: "60",
    });

    const enablePromote = async () => {
      setLoading(true);
      setError("");

      try {
        const response = await fetch("/api/promote/enable", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            scheduleWindow: scheduleWindow.startTime
              ? {
                  start: scheduleWindow.startTime,
                  durationMinutes: parseInt(scheduleWindow.duration),
                }
              : null,
          }),
        });

        if (response.ok) {
          setPromoteEnabled(true);
          completeStep(currentStep);
        } else {
          throw new Error("Failed to enable PROMOTE");
        }
      } catch (error) {
        setError(
          "Failed to go live: " +
            (error instanceof Error ? error.message : "Unknown error"),
        );
      } finally {
        setLoading(false);
      }
    };

    return (
      <Card>
        <Card.Section>
          <Stack vertical>
            <TextStyle variation="strong">Go Live!</TextStyle>
            <p>
              Enable PROMOTE to allow live changes to your Google Ads account.
            </p>

            {!promoteEnabled && (
              <Banner status="warning">
                <p>
                  <strong>Important:</strong> Enabling PROMOTE will allow the
                  script to make live changes to your Google Ads account based
                  on your configuration.
                </p>
              </Banner>
            )}

            {promoteEnabled && (
              <Banner status="success">
                <p>
                  <Icon source={CheckmarkIcon} color="success" /> PROMOTE is now
                  enabled! Your automation is active.
                </p>
              </Banner>
            )}

            <FormLayout>
              <TextField
                label="Schedule Window Start (Optional)"
                value={scheduleWindow.startTime}
                onChange={(value) =>
                  setScheduleWindow((prev) => ({ ...prev, startTime: value }))
                }
                type="datetime-local"
                helpText="When to start the automation (leave empty for immediate)"
                data-testid="promote-schedule-start"
              />

              <Select
                label="Window Duration"
                value={scheduleWindow.duration}
                onChange={(value) =>
                  setScheduleWindow((prev) => ({ ...prev, duration: value }))
                }
                options={[
                  { label: "30 minutes", value: "30" },
                  { label: "60 minutes", value: "60" },
                  { label: "120 minutes", value: "120" },
                  { label: "Indefinite", value: "0" },
                ]}
                helpText="How long to keep PROMOTE enabled"
                data-testid="promote-duration"
              />
            </FormLayout>

            <Button
              primary
              loading={loading}
              onClick={enablePromote}
              disabled={promoteEnabled}
              data-testid="promote-toggle"
            >
              {promoteEnabled ? "PROMOTE Enabled" : "Enable PROMOTE & Go Live"}
            </Button>
          </Stack>
        </Card.Section>
      </Card>
    );
  }

  return (
    <ErrorBoundary>
      <Page
        title="ProofKit Setup Wizard"
        subtitle={`Step ${currentStep + 1} of ${steps.length}: ${currentStepData.title}`}
        breadcrumbs={[{ content: "Settings", url: "/app/settings" }]}
        data-testid="wizard-page"
      >
        <Layout>
          <Layout.Section>
            <Card>
              <Card.Section>
                <ProgressIndicator
                  steps={steps.map((step, index) => ({
                    ...step,
                    isComplete: completedSteps.has(index),
                    isActive: index === currentStep,
                  }))}
                  currentStep={currentStep}
                  onStepClick={(stepIndex) => {
                    if (
                      completedSteps.has(stepIndex) ||
                      stepIndex <= currentStep
                    ) {
                      setCurrentStep(stepIndex);
                    }
                  }}
                  testId="wizard-progress"
                />
              </Card.Section>
            </Card>
          </Layout.Section>

          <Layout.Section>
            {error && (
              <Banner status="critical" onDismiss={() => setError("")}>
                {error}
              </Banner>
            )}

            <Stack vertical>
              <Card>
                <Card.Section>
                  <Stack vertical>
                    <div>
                      <TextStyle variation="strong" element="h2">
                        {currentStepData.title}
                      </TextStyle>
                      <p>{currentStepData.description}</p>
                    </div>
                  </Stack>
                </Card.Section>
              </Card>

              <currentStepData.component />

              <Card>
                <Card.Section>
                  <Stack distribution="equalSpacing">
                    <Button
                      outline
                      onClick={prevStep}
                      disabled={currentStep === 0}
                      data-testid="wizard-prev"
                    >
                      Previous
                    </Button>

                    <Button
                      primary
                      onClick={nextStep}
                      disabled={currentStep === steps.length - 1}
                      data-testid="wizard-next"
                    >
                      {currentStep === steps.length - 1
                        ? "Complete"
                        : "Next Step"}
                    </Button>
                  </Stack>
                </Card.Section>
              </Card>
            </Stack>
          </Layout.Section>
        </Layout>
      </Page>
    </ErrorBoundary>
  );
}
