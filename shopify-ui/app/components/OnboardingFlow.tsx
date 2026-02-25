/**
 * Onboarding Flow Component
 * Progressive disclosure of features based on subscription tier
 * Guides users through setup and key features
 */

import React, { useState, useEffect } from 'react';
import {
  Card,
  InlineStack,
  BlockStack,
  Text,
  Button,
  Badge,
  Modal,
  ProgressBar,
  Icon,
  Banner,
  List,
  Tooltip,
  ButtonGroup,
  Frame,
  Toast,
  Box
} from '@shopify/polaris';
import {
  CheckIcon,
  CheckCircleIcon,
  AlertCircleIcon,
  ChevronRightIcon,
  ChevronLeftIcon,
  StarFilledIcon,
  PlayIcon,
  LightbulbIcon
} from '@shopify/polaris-icons';

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  component: React.ComponentType<any>;
  completed: boolean;
  required: boolean;
  tierRequired?: 'starter' | 'professional' | 'enterprise';
  estimatedTime: string;
  benefits: string[];
}

interface OnboardingFlowProps {
  isOpen: boolean;
  onClose: () => void;
  userTier: 'starter' | 'professional' | 'enterprise';
  onComplete: (completedSteps: string[]) => void;
  completedSteps?: string[];
}

// Onboarding step components
const WelcomeStep: React.FC<{ tier: string; onNext: () => void }> = ({ tier, onNext }) => (
  <BlockStack gap="400">
    <div style={{ textAlign: 'center' }}>
      <Icon source={StarFilledIcon} />
      <Text variant="headingLg" as="h2">Welcome to Ads Autopilot AI!</Text>
      <Text variant="bodyMd" as="p" tone="subdued">
        Let's get you set up with {tier} features in just a few steps.
      </Text>
    </div>

    <Card>
      <Box padding="400">
        <BlockStack gap="200">
          <Text as="h3" variant="headingMd">What you'll accomplish:</Text>
          <List type="bullet">
            <List.Item>Connect your advertising accounts</List.Item>
            <List.Item>Configure your first campaign</List.Item>
            <List.Item>Set up automated reporting</List.Item>
            {tier !== 'starter' && <List.Item>Explore advanced analytics</List.Item>}
            {tier === 'enterprise' && <List.Item>Build custom dashboards</List.Item>}
          </List>
        </BlockStack>
      </Box>
    </Card>

    <div style={{ textAlign: 'center' }}>
      <Button variant="primary" size="large" onClick={onNext}>
        Let's Get Started
      </Button>
      <div style={{ marginTop: '0.5rem' }}>
        <Text as="span" variant="bodySm" tone="subdued">Takes about 5-10 minutes</Text>
      </div>
    </div>
  </BlockStack>
);

const AccountSetupStep: React.FC<{ onNext: () => void; onPrev: () => void }> = ({ onNext, onPrev }) => (
  <BlockStack gap="400">
    <Text variant="headingLg" as="h2">Connect Your Accounts</Text>
    <Text as="p" variant="bodyMd">
      Connect your advertising platforms to start optimizing your campaigns.
    </Text>

    <Card>
      <Box padding="400">
        <BlockStack gap="400">
          <Banner tone="info">
            <p>Your account credentials are encrypted and stored securely. We never access your account without permission.</p>
          </Banner>

          <BlockStack gap="200">
            <Button fullWidth icon={PlayIcon}>
              Connect Google Ads Account
            </Button>
            <Button fullWidth icon={PlayIcon}>
              Connect Microsoft Ads Account
            </Button>
            <Button fullWidth icon={PlayIcon}>
              Connect Facebook Ads Account
            </Button>
          </BlockStack>

          <Text as="span" variant="bodySm" tone="subdued">
            You can skip this for now and connect accounts later in Settings.
          </Text>
        </BlockStack>
      </Box>
    </Card>

    <ButtonGroup>
      <Button onClick={onPrev}>Previous</Button>
      <Button variant="primary" onClick={onNext}>Continue</Button>
    </ButtonGroup>
  </BlockStack>
);

const CampaignSetupStep: React.FC<{ tier: string; onNext: () => void; onPrev: () => void }> = ({ tier, onNext, onPrev }) => (
  <BlockStack gap="400">
    <Text variant="headingLg" as="h2">Create Your First Campaign</Text>
    <Text as="p" variant="bodyMd">
      Start with our quick setup wizard or use advanced options.
    </Text>

    <Card>
      <Box padding="400">
        <BlockStack gap="400">
          <div>
            <Text as="h3" variant="headingMd">Quick Setup (Recommended)</Text>
            <Text as="p" variant="bodyMd" tone="subdued">
              Our AI will create optimized campaigns based on your business type.
            </Text>
          </div>

          <InlineStack gap="200">
            <Button variant="primary" icon={LightbulbIcon} onClick={() => {
              // This would trigger the autopilot quickstart
              console.log('Starting autopilot quickstart...');
            }}>
              Start Autopilot Setup
            </Button>
            <Tooltip content="AI-powered campaign creation with smart defaults">
              <Button variant="plain">What's this?</Button>
            </Tooltip>
          </InlineStack>

          {tier !== 'starter' && (
            <div style={{ marginTop: '1rem' }}>
              <Text as="h3" variant="headingMd">Advanced Setup</Text>
              <Text as="p" variant="bodyMd" tone="subdued">
                Full control over campaign settings and targeting.
              </Text>
              <Button onClick={() => {
                console.log('Opening advanced campaign builder...');
              }}>
                Advanced Campaign Builder
              </Button>
            </div>
          )}
        </BlockStack>
      </Box>
    </Card>

    <ButtonGroup>
      <Button onClick={onPrev}>Previous</Button>
      <Button variant="primary" onClick={onNext}>Continue</Button>
    </ButtonGroup>
  </BlockStack>
);

const AnalyticsSetupStep: React.FC<{ tier: string; onNext: () => void; onPrev: () => void }> = ({ tier, onNext, onPrev }) => (
  <BlockStack gap="400">
    <Text variant="headingLg" as="h2">Set Up Analytics & Reporting</Text>
    <Text as="p" variant="bodyMd">
      Configure your analytics preferences and automated reporting.
    </Text>

    <Card>
      <Box padding="400">
        <BlockStack gap="400">
          <div>
            <InlineStack gap="200" blockAlign="center">
              <Text as="h3" variant="headingMd">Automated Reports</Text>
              <Badge tone={tier === 'starter' ? undefined : tier === 'professional' ? 'info' : 'attention'}>
                {tier === 'starter' ? 'Monthly' : tier === 'professional' ? 'Weekly' : 'Daily'}
              </Badge>
            </InlineStack>
            <Text as="p" variant="bodyMd" tone="subdued">
              Get insights delivered to your inbox automatically.
            </Text>
          </div>

          <Button>Configure Email Preferences</Button>

          {tier !== 'starter' && (
            <div>
              <Text as="h3" variant="headingMd">Real-time Analytics</Text>
              <Text as="p" variant="bodyMd" tone="subdued">
                Track performance with live data updates.
              </Text>
              <Button>Enable Real-time Updates</Button>
            </div>
          )}

          {tier === 'enterprise' && (
            <div>
              <Text as="h3" variant="headingMd">Custom Dashboards</Text>
              <Text as="p" variant="bodyMd" tone="subdued">
                Create personalized analytics views.
              </Text>
              <Button>Build First Dashboard</Button>
            </div>
          )}
        </BlockStack>
      </Box>
    </Card>

    <ButtonGroup>
      <Button onClick={onPrev}>Previous</Button>
      <Button variant="primary" onClick={onNext}>Continue</Button>
    </ButtonGroup>
  </BlockStack>
);

const CompletionStep: React.FC<{ tier: string; onComplete: () => void }> = ({ tier, onComplete }) => (
  <BlockStack gap="400">
    <div style={{ textAlign: 'center' }}>
      <Icon source={CheckCircleIcon} />
      <Text variant="headingLg" as="h2">You're All Set!</Text>
      <Text as="p" variant="bodyMd" tone="subdued">
        Your Ads Autopilot AI {tier} account is ready to optimize your campaigns.
      </Text>
    </div>

    <Card>
      <Box padding="400">
        <BlockStack gap="400">
          <Text as="h3" variant="headingMd">Next Steps:</Text>
          <List type="bullet">
            <List.Item>Monitor your campaigns in the Dashboard</List.Item>
            <List.Item>Review AI suggestions in Insights</List.Item>
            <List.Item>Check your email for the first automated report</List.Item>
            {tier !== 'starter' && <List.Item>Explore advanced ROAS analytics</List.Item>}
            {tier === 'enterprise' && <List.Item>Set up custom performance dashboards</List.Item>}
          </List>
        </BlockStack>
      </Box>
    </Card>

    <Banner tone="success">
      <p>Need help? Access our knowledge base anytime or contact our {tier === 'enterprise' ? 'dedicated' : 'support'} team.</p>
    </Banner>

    <div style={{ textAlign: 'center' }}>
      <Button variant="primary" size="large" onClick={onComplete}>
        Go to Dashboard
      </Button>
    </div>
  </BlockStack>
);

export const OnboardingFlow: React.FC<OnboardingFlowProps> = ({
  isOpen,
  onClose,
  userTier,
  onComplete,
  completedSteps = []
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [localCompletedSteps, setLocalCompletedSteps] = useState<Set<string>>(
    new Set(completedSteps)
  );
  const [showToast, setShowToast] = useState(false);

  const steps: OnboardingStep[] = [
    {
      id: 'welcome',
      title: 'Welcome',
      description: 'Introduction to Ads Autopilot AI',
      component: WelcomeStep,
      completed: localCompletedSteps.has('welcome'),
      required: true,
      estimatedTime: '1 min',
      benefits: ['Understand your tier benefits', 'See what\'s possible']
    },
    {
      id: 'account_setup',
      title: 'Connect Accounts',
      description: 'Link your advertising platforms',
      component: AccountSetupStep,
      completed: localCompletedSteps.has('account_setup'),
      required: false,
      estimatedTime: '2 min',
      benefits: ['Start importing campaign data', 'Enable automation']
    },
    {
      id: 'campaign_setup',
      title: 'First Campaign',
      description: 'Create or import your campaigns',
      component: CampaignSetupStep,
      completed: localCompletedSteps.has('campaign_setup'),
      required: true,
      estimatedTime: '3 min',
      benefits: ['AI-powered optimization', 'Automated bidding']
    },
    {
      id: 'analytics_setup',
      title: 'Analytics & Reports',
      description: 'Configure reporting preferences',
      component: AnalyticsSetupStep,
      completed: localCompletedSteps.has('analytics_setup'),
      required: false,
      tierRequired: 'professional',
      estimatedTime: '2 min',
      benefits: ['Automated insights', 'Performance tracking']
    },
    {
      id: 'completion',
      title: 'Complete',
      description: 'You\'re ready to go!',
      component: CompletionStep,
      completed: false,
      required: true,
      estimatedTime: '1 min',
      benefits: ['Start optimizing', 'Access all features']
    }
  ];

  // Filter steps based on tier
  const availableSteps = steps.filter(step =>
    !step.tierRequired ||
    (step.tierRequired === 'starter') ||
    (step.tierRequired === 'professional' && userTier !== 'starter') ||
    (step.tierRequired === 'enterprise' && userTier === 'enterprise')
  );

  const currentStepData = availableSteps[currentStep];
  const progress = ((currentStep + 1) / availableSteps.length) * 100;

  const handleNext = () => {
    if (currentStepData) {
      const newCompleted = new Set(localCompletedSteps);
      newCompleted.add(currentStepData.id);
      setLocalCompletedSteps(newCompleted);
    }

    if (currentStep < availableSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = () => {
    const newCompleted = new Set(localCompletedSteps);
    newCompleted.add('completion');
    setLocalCompletedSteps(newCompleted);
    onComplete(Array.from(newCompleted));
    setShowToast(true);
    setTimeout(() => {
      onClose();
    }, 2000);
  };

  const handleSkipOnboarding = () => {
    onComplete(Array.from(localCompletedSteps));
    onClose();
  };

  if (!currentStepData) return null;

  const StepComponent = currentStepData.component;

  const toastMarkup = showToast ? (
    <Toast
      content="Onboarding completed! Welcome to Ads Autopilot AI."
      onDismiss={() => setShowToast(false)}
      duration={2000}
    />
  ) : null;

  return (
    <Frame>
      <Modal
        open={isOpen}
        onClose={onClose}
        title={`Getting Started - ${currentStepData.title}`}
        size="large"
        primaryAction={undefined}
        secondaryActions={[
          {
            content: 'Skip Setup',
            onAction: handleSkipOnboarding
          }
        ]}
      >
        <Modal.Section>
          <BlockStack gap="400">
            {/* Progress indicators */}
            <Card>
              <Box padding="400">
                <BlockStack gap="200">
                  <InlineStack align="space-between" blockAlign="center">
                    <Text as="h3" variant="headingMd">
                      Step {currentStep + 1} of {availableSteps.length}
                    </Text>
                    <Badge tone={userTier === 'starter' ? undefined : userTier === 'professional' ? 'info' : 'attention'}>
                      {`${userTier.toUpperCase()} PLAN`}
                    </Badge>
                  </InlineStack>
                  <ProgressBar progress={progress} size="small" />
                  <InlineStack align="space-between">
                    <Text as="span" variant="bodySm" tone="subdued">
                      {currentStepData.estimatedTime} estimated
                    </Text>
                    <Text as="span" variant="bodySm" tone="subdued">
                      {Math.round(progress)}% complete
                    </Text>
                  </InlineStack>
                </BlockStack>
              </Box>
            </Card>

            {/* Step navigation breadcrumb */}
            <Card>
              <Box padding="400">
                <InlineStack gap="200">
                  {availableSteps.map((step, index) => (
                    <React.Fragment key={step.id}>
                      <InlineStack blockAlign="center" gap="100">
                        <Icon
                          source={
                            localCompletedSteps.has(step.id) ? CheckCircleIcon :
                            index === currentStep ? AlertCircleIcon :
                            CheckIcon
                          }
                          tone={
                            localCompletedSteps.has(step.id) ? 'success' :
                            index === currentStep ? 'info' :
                            'subdued'
                          }
                        />
                        <Text
                          as="span"
                          variant="bodySm"
                          tone={index === currentStep ? undefined : 'subdued'}
                          fontWeight={index === currentStep ? 'semibold' : 'regular'}
                        >
                          {step.title}
                        </Text>
                      </InlineStack>
                      {index < availableSteps.length - 1 && (
                        <Icon source={ChevronRightIcon} tone="subdued" />
                      )}
                    </React.Fragment>
                  ))}
                </InlineStack>
              </Box>
            </Card>

            {/* Current step content */}
            <StepComponent
              tier={userTier}
              onNext={handleNext}
              onPrev={handlePrev}
              onComplete={handleComplete}
            />

            {/* Benefits sidebar */}
            {currentStepData.benefits.length > 0 && (
              <Card>
                <Box padding="400">
                  <BlockStack gap="200">
                    <Text as="h3" variant="headingMd">Benefits of this step:</Text>
                    <List type="bullet">
                      {currentStepData.benefits.map((benefit, index) => (
                        <List.Item key={index}>{benefit}</List.Item>
                      ))}
                    </List>
                  </BlockStack>
                </Box>
              </Card>
            )}
          </BlockStack>
        </Modal.Section>
      </Modal>
      {toastMarkup}
    </Frame>
  );
};

export default OnboardingFlow;
