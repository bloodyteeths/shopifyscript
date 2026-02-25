/**
 * Help Tooltips Component
 * Contextual help system with tier-specific guidance
 * Provides in-app assistance and feature explanations
 */

import React, { useState } from 'react';
import {
  Tooltip,
  Button,
  Icon,
  Popover,
  BlockStack,
  InlineStack,
  Box,
  Text,
  Card,
  Badge,
  Link,
  ActionList,
  Modal,
  List
} from '@shopify/polaris';
import {
  QuestionCircleIcon,
  InfoIcon,
  ExternalIcon,
  PlayCircleIcon,
  StarFilledIcon,
  LockIcon,
} from '@shopify/polaris-icons';

interface HelpContent {
  title: string;
  content: string;
  actions?: Array<{
    label: string;
    url?: string;
    action?: () => void;
    external?: boolean;
  }>;
  videoUrl?: string;
  relatedFeatures?: string[];
  tierRequired?: 'starter' | 'professional' | 'enterprise';
  upgradePrompt?: {
    title: string;
    message: string;
    upgradeUrl: string;
  };
}

interface TooltipHelpProps {
  helpKey: string;
  children?: React.ReactNode;
  activator?: React.ReactNode;
  preferredPosition?: 'above' | 'below' | 'mostSpace';
  userTier?: 'starter' | 'professional' | 'enterprise';
}

// Help content database
const HELP_CONTENT: Record<string, HelpContent> = {
  // Campaign Management
  'campaign_budget': {
    title: 'Campaign Budget Settings',
    content: 'Set daily or total budget limits for your campaigns. Ads Autopilot AI will automatically optimize spending within your budget constraints.',
    actions: [
      { label: 'Budget Best Practices', url: '/help/budget-optimization' },
      { label: 'Watch Tutorial', action: () => console.log('Play budget tutorial') }
    ],
    videoUrl: '/tutorials/budget-setup.mp4',
    relatedFeatures: ['bid_management', 'roas_targets']
  },

  'autopilot_mode': {
    title: 'Autopilot Campaign Optimization',
    content: 'Let AI automatically adjust bids, budgets, and targeting based on your performance goals. Monitor performance while AI handles the optimization.',
    actions: [
      { label: 'Autopilot Guide', url: '/help/autopilot' },
      { label: 'Performance Goals', url: '/help/setting-goals' }
    ],
    relatedFeatures: ['bid_strategies', 'negative_keywords', 'budget_pacing']
  },

  'roas_tracking': {
    title: 'ROAS (Return on Ad Spend)',
    content: 'Track revenue generated for every dollar spent on advertising. Higher ROAS means more profitable campaigns.',
    actions: [
      { label: 'ROAS Calculator', action: () => console.log('Open ROAS calculator') },
      { label: 'Industry Benchmarks', url: '/help/roas-benchmarks' }
    ],
    tierRequired: 'professional',
    upgradePrompt: {
      title: 'Advanced ROAS Analytics',
      message: 'Get detailed ROAS tracking, attribution modeling, and profit analysis with Professional plan.',
      upgradeUrl: '/billing?feature=roas'
    }
  },

  'real_time_analytics': {
    title: 'Real-time Performance Data',
    content: 'Monitor campaign performance with live data updates every 30 seconds. Spot trends and issues immediately.',
    actions: [
      { label: 'Dashboard Tour', action: () => console.log('Start dashboard tour') }
    ],
    tierRequired: 'professional',
    upgradePrompt: {
      title: 'Real-time Analytics',
      message: 'Access live performance data and instant alerts with Professional or Enterprise plans.',
      upgradeUrl: '/billing?feature=realtime'
    }
  },

  'custom_dashboards': {
    title: 'Custom Performance Dashboards',
    content: 'Build personalized analytics views with drag-and-drop widgets. Focus on the metrics that matter most to your business.',
    actions: [
      { label: 'Dashboard Builder', action: () => console.log('Open dashboard builder') },
      { label: 'Template Gallery', url: '/dashboards/templates' }
    ],
    tierRequired: 'enterprise',
    upgradePrompt: {
      title: 'Custom Dashboards',
      message: 'Create unlimited custom dashboards with advanced widgets and data sources. Available in Enterprise plan.',
      upgradeUrl: '/billing?feature=dashboards'
    }
  },

  'negative_keywords': {
    title: 'Negative Keyword Management',
    content: 'Prevent your ads from showing for irrelevant searches. Save money and improve relevance by excluding unwanted terms.',
    actions: [
      { label: 'Keyword Research', url: '/help/keyword-research' },
      { label: 'Auto-suggestions', action: () => console.log('Show keyword suggestions') }
    ],
    relatedFeatures: ['search_terms', 'match_types', 'bid_modifiers']
  },

  'campaign_limits': {
    title: 'Campaign Limits by Plan',
    content: 'Your current plan supports specific campaign limits. Starter: 5 campaigns, Professional: 25 campaigns, Enterprise: Unlimited.',
    actions: [
      { label: 'View Plan Details', url: '/billing/plans' },
      { label: 'Upgrade Plan', url: '/billing?upgrade=true' }
    ]
  },

  'support_tiers': {
    title: 'Support Level Information',
    content: 'Get help based on your subscription tier. Starter: Email support, Professional: Priority email + phone, Enterprise: Dedicated account manager.',
    actions: [
      { label: 'Contact Support', url: '/support' },
      { label: 'Knowledge Base', url: '/help', external: true }
    ]
  },

  'data_retention': {
    title: 'Data Retention Policies',
    content: 'Historical data storage varies by plan. Starter: 90 days, Professional: 2 years, Enterprise: Unlimited retention.',
    actions: [
      { label: 'Export Data', action: () => console.log('Start data export') },
      { label: 'Retention Policy', url: '/help/data-retention' }
    ]
  },

  'ai_optimization': {
    title: 'AI Campaign Optimization',
    content: 'Machine learning algorithms continuously improve your campaign performance by analyzing patterns and making strategic adjustments.',
    actions: [
      { label: 'AI Features Guide', url: '/help/ai-features' },
      { label: 'Optimization History', action: () => console.log('Show optimization log') }
    ],
    videoUrl: '/tutorials/ai-optimization.mp4'
  },

  'bid_strategies': {
    title: 'Smart Bidding Strategies',
    content: 'Automated bidding uses machine learning to optimize for conversions, conversion value, or target ROAS across your campaigns.',
    actions: [
      { label: 'Bidding Guide', url: '/help/bidding-strategies' },
      { label: 'Strategy Comparison', action: () => console.log('Compare strategies') }
    ],
    relatedFeatures: ['target_cpa', 'target_roas', 'maximize_conversions']
  }
};

// Smart Help Suggestions based on context
const CONTEXTUAL_HELP: Record<string, string[]> = {
  '/dashboard': ['roas_tracking', 'real_time_analytics', 'campaign_limits'],
  '/autopilot': ['autopilot_mode', 'ai_optimization', 'bid_strategies'],
  '/insights': ['roas_tracking', 'negative_keywords', 'data_retention'],
  '/support': ['support_tiers', 'campaign_limits'],
  '/billing': ['campaign_limits', 'support_tiers', 'data_retention']
};

export const TooltipHelp: React.FC<TooltipHelpProps> = ({
  helpKey,
  children,
  activator,
  preferredPosition = 'above',
  userTier = 'starter'
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);

  const helpContent = HELP_CONTENT[helpKey];

  if (!helpContent) {
    console.warn(`Help content not found for key: ${helpKey}`);
    return <>{children}</>;
  }

  // Check if feature requires higher tier
  const needsUpgrade = helpContent.tierRequired &&
    ((helpContent.tierRequired === 'professional' && userTier === 'starter') ||
     (helpContent.tierRequired === 'enterprise' && userTier !== 'enterprise'));

  const activatorButton = (activator || (
    <Button
      variant="monochromePlain"
      icon={QuestionCircleIcon}
      onClick={() => setIsOpen(!isOpen)}
      accessibilityLabel={`Help for ${helpContent.title}`}
    />
  )) as React.ReactElement;

  const popoverContent = (
    <Card>
      <Box padding="400">
        <BlockStack gap="200">
          <InlineStack blockAlign="center" gap="200">
            <Text variant="headingMd" as="h3">{helpContent.title}</Text>
            {needsUpgrade && (
              <Badge tone="attention" icon={LockIcon}>
                {helpContent.tierRequired?.toUpperCase()}
              </Badge>
            )}
          </InlineStack>

          <Text variant="bodyMd" as="p">{helpContent.content}</Text>

          {needsUpgrade && helpContent.upgradePrompt && (
            <Card background="bg-surface-secondary">
              <Box padding="400">
                <BlockStack gap="200">
                  <InlineStack blockAlign="center" gap="200">
                    <Icon source={StarFilledIcon} />
                    <Text variant="headingSm" as="h4">{helpContent.upgradePrompt.title}</Text>
                  </InlineStack>
                  <Text variant="bodySm" as="span">{helpContent.upgradePrompt.message}</Text>
                  <Button size="slim" variant="primary" url={helpContent.upgradePrompt.upgradeUrl}>
                    Upgrade Now
                  </Button>
                </BlockStack>
              </Box>
            </Card>
          )}

          {(helpContent.actions || helpContent.videoUrl || helpContent.relatedFeatures) && (
            <BlockStack gap="200">
              {helpContent.videoUrl && (
                <Button
                  size="slim"
                  icon={PlayCircleIcon}
                  onClick={() => console.log(`Play video: ${helpContent.videoUrl}`)}
                >
                  Watch Tutorial
                </Button>
              )}

              {helpContent.actions && (
                <InlineStack gap="200">
                  {helpContent.actions.map((action, index) => (
                    <Button
                      key={index}
                      size="slim"
                      variant="plain"
                      url={action.url}
                      onClick={action.action}
                      external={action.external}
                      icon={action.external ? ExternalIcon : undefined}
                    >
                      {action.label}
                    </Button>
                  ))}
                </InlineStack>
              )}

              <Button size="slim" variant="plain" onClick={() => setShowDetailModal(true)}>
                Learn More
              </Button>
            </BlockStack>
          )}
        </BlockStack>
      </Box>
    </Card>
  );

  const detailModal = showDetailModal ? (
    <Modal
      open={showDetailModal}
      onClose={() => setShowDetailModal(false)}
      title={helpContent.title}
      primaryAction={{
        content: 'Got it',
        onAction: () => setShowDetailModal(false)
      }}
    >
      <Modal.Section>
        <BlockStack gap="400">
          <Text variant="bodyLg" as="p">{helpContent.content}</Text>

          {helpContent.relatedFeatures && helpContent.relatedFeatures.length > 0 && (
            <div>
              <Text variant="headingMd" as="h3">Related Features:</Text>
              <List type="bullet">
                {helpContent.relatedFeatures.map((feature, index) => (
                  <List.Item key={index}>
                    <Button variant="plain" onClick={() => console.log(`Show help for ${feature}`)}>
                      {feature.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </Button>
                  </List.Item>
                ))}
              </List>
            </div>
          )}

          {helpContent.actions && (
            <div>
              <Text variant="headingMd" as="h3">Quick Actions:</Text>
              <InlineStack gap="200">
                {helpContent.actions.map((action, index) => (
                  <Button
                    key={index}
                    variant={index === 0 ? "primary" : undefined}
                    url={action.url}
                    onClick={action.action}
                    external={action.external}
                  >
                    {action.label}
                  </Button>
                ))}
              </InlineStack>
            </div>
          )}
        </BlockStack>
      </Modal.Section>
    </Modal>
  ) : null;

  return (
    <>
      <Popover
        active={isOpen}
        activator={activatorButton}
        onClose={() => setIsOpen(false)}
        preferredPosition={preferredPosition}
        fullWidth
      >
        {popoverContent}
      </Popover>
      {children}
      {detailModal}
    </>
  );
};

// Quick help button for common questions
export const QuickHelp: React.FC<{
  currentPath?: string;
  userTier?: 'starter' | 'professional' | 'enterprise';
}> = ({
  currentPath = '/',
  userTier = 'starter'
}) => {
  const [isOpen, setIsOpen] = useState(false);

  // Get contextual help suggestions
  const suggestions = CONTEXTUAL_HELP[currentPath] || ['campaign_budget', 'autopilot_mode', 'support_tiers'];

  const activator = (
    <Button
      icon={QuestionCircleIcon}
      onClick={() => setIsOpen(!isOpen)}
    >
      Quick Help
    </Button>
  );

  const actionListItems = suggestions.map(helpKey => {
    const content = HELP_CONTENT[helpKey];
    if (!content) return null;

    const needsUpgrade = content.tierRequired &&
      ((content.tierRequired === 'professional' && userTier === 'starter') ||
       (content.tierRequired === 'enterprise' && userTier !== 'enterprise'));

    return {
      content: (
        <InlineStack blockAlign="center" align="space-between">
          <Text variant="bodyMd" as="span">{content.title}</Text>
          {needsUpgrade && (
            <Badge tone="attention" icon={LockIcon}>
              {content.tierRequired?.toUpperCase()}
            </Badge>
          )}
        </InlineStack>
      ) as unknown as string,
      onAction: () => console.log(`Show help for ${helpKey}`)
    };
  }).filter(Boolean);

  return (
    <Popover
      active={isOpen}
      activator={activator}
      onClose={() => setIsOpen(false)}
      preferredPosition="below"
    >
      <ActionList
        items={actionListItems as any}
        actionRole="menuitem"
      />
    </Popover>
  );
};

// Inline help text component
export const InlineHelp: React.FC<{
  helpKey: string;
  userTier?: 'starter' | 'professional' | 'enterprise';
}> = ({ helpKey, userTier = 'starter' }) => {
  const helpContent = HELP_CONTENT[helpKey];

  if (!helpContent) return null;

  const needsUpgrade = helpContent.tierRequired &&
    ((helpContent.tierRequired === 'professional' && userTier === 'starter') ||
     (helpContent.tierRequired === 'enterprise' && userTier !== 'enterprise'));

  return (
    <InlineStack blockAlign="center" gap="200">
      <Icon source={InfoIcon} tone="subdued" />
      <Text variant="bodySm" as="span" tone="subdued">
        {helpContent.content}
      </Text>
      {needsUpgrade && (
        <Link url={helpContent.upgradePrompt?.upgradeUrl}>
          Upgrade for this feature
        </Link>
      )}
    </InlineStack>
  );
};

// Help system utilities
export const getHelpContent = (helpKey: string): HelpContent | null => {
  return HELP_CONTENT[helpKey] || null;
};

export const getContextualHelp = (path: string): string[] => {
  return CONTEXTUAL_HELP[path] || [];
};

export default TooltipHelp;
