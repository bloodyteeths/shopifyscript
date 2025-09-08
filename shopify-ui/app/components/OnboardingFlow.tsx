/**
 * Onboarding Flow Component
 * Progressive disclosure of features based on subscription tier
 * Guides users through setup and key features
 */

import React, { useState, useEffect } from 'react';
import {
  Card,
  Stack,
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
  Toast
} from '@shopify/polaris';
import {
  ChecklistMajor,
  CircleTickMajor,
  CircleAlertMajor,
  ChevronRightMinor,
  ChevronLeftMinor,
  StarFilledMinor,
  PlayMajor,
  TipsMajor
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
  <Stack vertical spacing="loose">
    <div style={{ textAlign: 'center' }}>
      <Icon source={StarFilledMinor} />
      <Text variant="headingLg" as="h2">Welcome to ProofKit!</Text>
      <Text variant="bodyMd" color="subdued">
        Let's get you set up with {tier} features in just a few steps.
      </Text>
    </div>
    
    <Card sectioned>
      <Stack vertical spacing="tight">
        <Text variant="headingMd">What you'll accomplish:</Text>
        <List type="bullet">
          <List.Item>Connect your advertising accounts</List.Item>
          <List.Item>Configure your first campaign</List.Item>
          <List.Item>Set up automated reporting</List.Item>
          {tier !== 'starter' && <List.Item>Explore advanced analytics</List.Item>}
          {tier === 'enterprise' && <List.Item>Build custom dashboards</List.Item>}
        </List>
      </Stack>
    </Card>
    
    <div style={{ textAlign: 'center' }}>
      <Button primary size="large" onClick={onNext}>
        Let's Get Started
      </Button>
      <div style={{ marginTop: '0.5rem' }}>
        <Text variant="bodySm" color="subdued">Takes about 5-10 minutes</Text>
      </div>
    </div>
  </Stack>
);

const AccountSetupStep: React.FC<{ onNext: () => void; onPrev: () => void }> = ({ onNext, onPrev }) => (
  <Stack vertical spacing="loose">
    <Text variant="headingLg" as="h2">Connect Your Accounts</Text>
    <Text variant="bodyMd">
      Connect your advertising platforms to start optimizing your campaigns.
    </Text>
    
    <Card sectioned>
      <Stack vertical spacing="loose">
        <Banner status="info">
          <p>Your account credentials are encrypted and stored securely. We never access your account without permission.</p>
        </Banner>
        
        <Stack vertical spacing="tight">
          <Button fullWidth outline icon={PlayMajor}>
            Connect Google Ads Account
          </Button>
          <Button fullWidth outline icon={PlayMajor}>
            Connect Microsoft Ads Account
          </Button>
          <Button fullWidth outline icon={PlayMajor}>
            Connect Facebook Ads Account
          </Button>
        </Stack>
        
        <Text variant="bodySm" color="subdued">
          You can skip this for now and connect accounts later in Settings.
        </Text>
      </Stack>
    </Card>
    
    <ButtonGroup>
      <Button onClick={onPrev}>Previous</Button>
      <Button primary onClick={onNext}>Continue</Button>
    </ButtonGroup>
  </Stack>
);

const CampaignSetupStep: React.FC<{ tier: string; onNext: () => void; onPrev: () => void }> = ({ tier, onNext, onPrev }) => (
  <Stack vertical spacing="loose">
    <Text variant="headingLg" as="h2">Create Your First Campaign</Text>
    <Text variant="bodyMd">
      Start with our quick setup wizard or use advanced options.
    </Text>
    
    <Card sectioned>
      <Stack vertical spacing="loose">
        <div>
          <Text variant="headingMd">Quick Setup (Recommended)</Text>
          <Text variant="bodyMd" color="subdued">
            Our AI will create optimized campaigns based on your business type.
          </Text>
        </div>
        
        <Stack>
          <Button primary icon={TipsMajor} onClick={() => {
            // This would trigger the autopilot quickstart
            console.log('Starting autopilot quickstart...');
          }}>
            Start Autopilot Setup
          </Button>
          <Tooltip content="AI-powered campaign creation with smart defaults">
            <Button plain monochrome>What's this?</Button>
          </Tooltip>
        </Stack>
        
        {tier !== 'starter' && (
          <div style={{ marginTop: '1rem' }}>
            <Text variant="headingMd">Advanced Setup</Text>
            <Text variant="bodyMd" color="subdued">
              Full control over campaign settings and targeting.
            </Text>
            <Button outline onClick={() => {
              console.log('Opening advanced campaign builder...');
            }}>
              Advanced Campaign Builder
            </Button>
          </div>
        )}
      </Stack>
    </Card>
    
    <ButtonGroup>
      <Button onClick={onPrev}>Previous</Button>
      <Button primary onClick={onNext}>Continue</Button>
    </ButtonGroup>
  </Stack>
);

const AnalyticsSetupStep: React.FC<{ tier: string; onNext: () => void; onPrev: () => void }> = ({ tier, onNext, onPrev }) => (
  <Stack vertical spacing="loose">
    <Text variant="headingLg" as="h2">Set Up Analytics & Reporting</Text>
    <Text variant="bodyMd">
      Configure your analytics preferences and automated reporting.
    </Text>
    
    <Card sectioned>
      <Stack vertical spacing="loose">
        <div>
          <Stack horizontal alignment="center">
            <Text variant="headingMd">Automated Reports</Text>
            <Badge status={tier === 'starter' ? 'default' : tier === 'professional' ? 'info' : 'attention'}>
              {tier === 'starter' ? 'Monthly' : tier === 'professional' ? 'Weekly' : 'Daily'}
            </Badge>
          </Stack>
          <Text variant="bodyMd" color="subdued">
            Get insights delivered to your inbox automatically.
          </Text>
        </div>
        
        <Button outline>Configure Email Preferences</Button>
        
        {tier !== 'starter' && (
          <div>
            <Text variant="headingMd">Real-time Analytics</Text>
            <Text variant="bodyMd" color="subdued">
              Track performance with live data updates.
            </Text>
            <Button outline>Enable Real-time Updates</Button>
          </div>
        )}
        
        {tier === 'enterprise' && (
          <div>
            <Text variant="headingMd">Custom Dashboards</Text>
            <Text variant="bodyMd" color="subdued">
              Create personalized analytics views.
            </Text>
            <Button outline>Build First Dashboard</Button>
          </div>
        )}
      </Stack>
    </Card>
    
    <ButtonGroup>
      <Button onClick={onPrev}>Previous</Button>
      <Button primary onClick={onNext}>Continue</Button>
    </ButtonGroup>
  </Stack>
);

const CompletionStep: React.FC<{ tier: string; onComplete: () => void }> = ({ tier, onComplete }) => (
  <Stack vertical spacing="loose">
    <div style={{ textAlign: 'center' }}>
      <Icon source={CircleTickMajor} />
      <Text variant="headingLg" as="h2">You're All Set!</Text>
      <Text variant="bodyMd" color="subdued">
        Your ProofKit {tier} account is ready to optimize your campaigns.
      </Text>
    </div>
    
    <Card sectioned>
      <Stack vertical spacing="loose">
        <Text variant="headingMd">Next Steps:</Text>
        <List type="bullet">
          <List.Item>Monitor your campaigns in the Dashboard</List.Item>
          <List.Item>Review AI suggestions in Insights</List.Item>
          <List.Item>Check your email for the first automated report</List.Item>
          {tier !== 'starter' && <List.Item>Explore advanced ROAS analytics</List.Item>}
          {tier === 'enterprise' && <List.Item>Set up custom performance dashboards</List.Item>}
        </List>
      </Stack>
    </Card>
    
    <Banner status="success">
      <p>Need help? Access our knowledge base anytime or contact our {tier === 'enterprise' ? 'dedicated' : 'support'} team.</p>
    </Banner>
    
    <div style={{ textAlign: 'center' }}>
      <Button primary size="large" onClick={onComplete}>
        Go to Dashboard
      </Button>
    </div>
  </Stack>
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
      description: 'Introduction to ProofKit',
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
      content="Onboarding completed! Welcome to ProofKit."
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
        large
        primaryAction={undefined}
        secondaryActions={[
          {
            content: 'Skip Setup',
            onAction: handleSkipOnboarding
          }
        ]}
      >
        <Modal.Section>
          <Stack vertical spacing="loose">
            {/* Progress indicators */}
            <Card sectioned>
              <Stack vertical spacing="tight">
                <Stack distribution="equalSpacing" alignment="center">
                  <Text variant="headingMd">
                    Step {currentStep + 1} of {availableSteps.length}
                  </Text>
                  <Badge status={userTier === 'starter' ? 'default' : userTier === 'professional' ? 'info' : 'attention'}>
                    {userTier.toUpperCase()} PLAN
                  </Badge>
                </Stack>
                <ProgressBar progress={progress} size="small" />
                <Stack distribution="equalSpacing">
                  <Text variant="bodySm" color="subdued">
                    {currentStepData.estimatedTime} estimated
                  </Text>
                  <Text variant="bodySm" color="subdued">
                    {Math.round(progress)}% complete
                  </Text>
                </Stack>
              </Stack>
            </Card>

            {/* Step navigation breadcrumb */}
            <Card sectioned>
              <Stack>
                {availableSteps.map((step, index) => (
                  <React.Fragment key={step.id}>
                    <Stack alignment="center" spacing="extraTight">
                      <Icon 
                        source={
                          localCompletedSteps.has(step.id) ? CircleTickMajor :
                          index === currentStep ? CircleAlertMajor :
                          ChecklistMajor
                        }
                        color={
                          localCompletedSteps.has(step.id) ? 'success' :
                          index === currentStep ? 'highlight' :
                          'subdued'
                        }
                      />
                      <Text 
                        variant="bodySm" 
                        color={index === currentStep ? 'default' : 'subdued'}
                        fontWeight={index === currentStep ? 'semibold' : 'regular'}
                      >
                        {step.title}
                      </Text>
                    </Stack>
                    {index < availableSteps.length - 1 && (
                      <Icon source={ChevronRightMinor} color="subdued" />
                    )}
                  </React.Fragment>
                ))}
              </Stack>
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
              <Card sectioned>
                <Stack vertical spacing="tight">
                  <Text variant="headingMd">Benefits of this step:</Text>
                  <List type="bullet">
                    {currentStepData.benefits.map((benefit, index) => (
                      <List.Item key={index}>{benefit}</List.Item>
                    ))}
                  </List>
                </Stack>
              </Card>
            )}
          </Stack>
        </Modal.Section>
      </Modal>
      {toastMarkup}
    </Frame>
  );
};

export default OnboardingFlow;